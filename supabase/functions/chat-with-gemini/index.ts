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

    // 1. Embedding da pergunta
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query })
    });
    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 2. Busca Semântica (Threshold reduzido para 0.2 para ser mais abrangente)
    const { data: chunks, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.2, 
      match_count: 8,
      filter_subject_id: subjectId
    });

    if (matchError) throw matchError;

    const contextText = chunks?.map(c => `[Documento: ${c.metadata.document_name}] ${c.content}`).join("\n\n") || "Nenhum conteúdo relevante encontrado nos materiais.";

    // 3. Prompt
    let systemPrompt = `Você é o Professor Virtual do Estuda AÍ. 
    Responda SEMPRE em Português do Brasil.
    Use EXCLUSIVAMENTE o contexto fornecido para responder.
    
    DIRETRIZES:
    - Se não souber, diga que o material não cobre esse ponto.
    - Cite o nome do documento usado.
    - Use negrito e listas para clareza.`;

    if (action === 'quiz') {
      systemPrompt += `\nTAREFA: Gere um SIMULADO com 10 QUESTÕES (A-D) em JSON. Retorne APENAS o JSON puro.`;
    } else if (action === 'summary') {
      systemPrompt += `\nTAREFA: Resuma os pontos chave do material em tópicos estruturados.`;
    }

    // 4. Geração
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `MATERIAIS DE ESTUDO:\n${contextText}\n\nPERGUNTA: ${query}` }
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
      sources: [...new Set(chunks?.map(c => c.metadata.document_name))]
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})