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

    console.log(`[${functionName}] Iniciando RAG para: ${query}`);

    // 1. Gerar Embedding da pergunta
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query })
    });
    
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 2. Busca Semântica (Threshold reduzido para 0.25 para garantir resultados)
    const { data: chunks, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.25, 
      match_count: 8,
      filter_subject_id: subjectId
    });

    if (matchError) throw matchError;

    const contextText = chunks && chunks.length > 0 
      ? chunks.map(c => `[Arquivo: ${c.metadata.document_name}] ${c.content}`).join("\n\n") 
      : "Nenhum conteúdo específico encontrado nos arquivos.";

    // 3. Prompt Simplificado (Modo Recuperação)
    let systemPrompt = `Você é o Professor Virtual. 
    Responda SEMPRE com base nos documentos fornecidos abaixo.
    Se a informação não estiver nos documentos, avise que o material não cobre esse ponto.
    
    CONTEÚDO DOS ARQUIVOS:
    ${contextText}`;

    if (action === 'quiz') {
      systemPrompt += `\n\nTAREFA: Gere um JSON com 10 questões de múltipla escolha sobre o conteúdo acima. Estrutura: {"questions": [{"id": 1, "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]}`;
    } else if (action === 'summary') {
      systemPrompt += `\n\nTAREFA: Resuma os pontos principais do conteúdo acima em tópicos.`;
    }

    // 4. Chamada GPT-4o mini
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        temperature: 0.3
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
      sources: chunks ? [...new Set(chunks.map(c => c.metadata.document_name))] : []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error(`[${functionName}] Erro:`, err.message);
    return new Response(JSON.stringify({ error: "Erro no sistema de IA. Verifique os arquivos." }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})