// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const functionName = "chat-with-ai";

  try {
    const { subjectId, query, action, documentIds } = await req.json();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log(`[${functionName}] Processando pergunta para matéria: ${subjectId}`);

    // 1. Gerar Embedding da pergunta do usuário
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query })
    });
    
    if (!embeddingResponse.ok) throw new Error("Falha ao gerar embedding da pergunta.");
    
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 2. Busca Semântica no Banco de Dados
    // Aumentamos o match_count para 10 para dar mais contexto à IA
    // Ajustamos o threshold para 0.3 para filtrar melhor o conteúdo irrelevante
    const { data: chunks, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3, 
      match_count: 10,
      filter_subject_id: subjectId
    });

    if (matchError) throw matchError;

    const contextText = chunks && chunks.length > 0 
      ? chunks.map(c => `[Fonte: ${c.metadata.document_name}] ${c.content}`).join("\n\n") 
      : "Não foram encontrados trechos específicos nos documentos carregados para esta pergunta.";

    // 3. Configuração do Prompt do Professor Virtual
    let systemPrompt = `Você é o Professor Virtual do Estuda AÍ, um assistente acadêmico especializado.
    Responda SEMPRE em Português do Brasil de forma clara, didática e profissional.
    
    REGRAS DE OURO:
    1. Use EXCLUSIVAMENTE o contexto dos documentos fornecidos abaixo para responder.
    2. Se a resposta não estiver nos documentos, diga educadamente: "Desculpe, mas não encontrei essa informação nos materiais de estudo desta matéria."
    3. Sempre cite o nome do documento de onde tirou a informação.
    4. Use formatação Markdown (negrito, listas, tabelas) para facilitar a leitura.
    5. Se o usuário pedir um resumo, foque nos conceitos fundamentais.`;

    if (action === 'quiz') {
      systemPrompt += `\n\nTAREFA: Gere um SIMULADO com 10 QUESTÕES de múltipla escolha (A a D). 
      Retorne APENAS um objeto JSON puro com a estrutura: {"questions": [{"id": 1, "question": "...", "options": ["...", "..."], "correctIndex": 0, "explanation": "..."}]}`;
    } else if (action === 'summary') {
      systemPrompt += `\n\nTAREFA: Crie um resumo estruturado em tópicos dos pontos mais importantes do material fornecido.`;
    }

    // 4. Chamada para o GPT-4o mini
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `CONTEXTO DOS MATERIAIS:\n${contextText}\n\nPERGUNTA DO ALUNO: ${query}` }
        ],
        temperature: 0.4, // Baixa temperatura para evitar invenções
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || "Erro na API da OpenAI");
    }

    const result = await response.json();
    let finalContent = result.choices?.[0]?.message?.content;

    // Limpeza de JSON se for quiz
    if (action === 'quiz') {
      finalContent = finalContent.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    return new Response(JSON.stringify({ 
      text: finalContent,
      isQuiz: action === 'quiz',
      isSummary: action === 'summary',
      sources: chunks ? [...new Set(chunks.map(c => c.metadata.document_name))] : []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error(`[${functionName}] Erro:`, err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})