// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { subjectId, query, action, documentIds } = await req.json();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Gerar embedding da pergunta do usuário
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query })
    });
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 2. Busca Semântica (Retrieval)
    // Usamos a função RPC match_document_chunks definida no banco
    const { data: chunks, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.3,
      match_count: 6,
      filter_subject_id: subjectId
    });

    if (matchError) throw matchError;

    const contextText = chunks?.map(c => `[Fonte: ${c.metadata.document_name}] ${c.content}`).join("\n\n") || "Nenhum conteúdo relevante encontrado.";

    // 3. Configurar Prompt do Professor Virtual
    let systemPrompt = `Você é o Professor Virtual do Estuda AÍ. 
    Sua missão é ensinar e tirar dúvidas baseando-se EXCLUSIVAMENTE no contexto fornecido.
    
    REGRAS CRÍTICAS:
    1. Se a resposta não estiver no contexto, diga educadamente que não encontrou essa informação nos materiais.
    2. Cite sempre o nome do documento de onde extraiu a informação.
    3. Seja didático, use tópicos e negrito para facilitar a leitura.`;

    if (action === 'quiz') {
      systemPrompt += `\nTAREFA: Gere um SIMULADO com 10 QUESTÕES de múltipla escolha (A a D) em formato JSON. 
      Inclua 'question', 'options' (array), 'correctIndex' (0-3) e 'explanation'. 
      Retorne APENAS o JSON.`;
    } else if (action === 'summary') {
      systemPrompt += `\nTAREFA: Crie um resumo estruturado com os pontos mais importantes do material.`;
    }

    // 4. Chamada OpenAI
    const model = action === 'quiz' ? "gpt-4o-mini" : "gpt-4o";
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `CONTEXTO DOS MATERIAIS:\n${contextText}\n\nPERGUNTA/AÇÃO: ${query}` }
        ],
        temperature: 0.4
      })
    });

    const result = await response.json();
    let finalContent = result.choices?.[0]?.message?.content;

    if (action === 'quiz') {
      finalContent = finalContent.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    return new Response(JSON.stringify({ 
      text: finalContent,
      isQuiz: action === 'quiz',
      isSummary: action === 'summary',
      sources: [...new Set(chunks?.map(c => c.metadata.document_name))]
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})