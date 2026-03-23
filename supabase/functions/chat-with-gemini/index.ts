// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const functionName = "chat-with-gemini";

  try {
    const { subjectId, query, action } = await req.json();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Gerar embedding da pergunta
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query })
    });
    
    const embData = await embRes.json();
    const queryEmbedding = embData.data[0].embedding;

    // Busca Vetorial
    const { data: chunks, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.35, // Reduzi levemente para ser mais tolerante a ruídos de slides
      match_count: 8, // Aumentei a quantidade de contexto para compensar slides curtos
      filter_subject_id: subjectId
    });

    if (matchError) throw matchError;

    const hasContext = chunks && chunks.length > 0;
    const contextText = hasContext 
      ? chunks.map(c => `[FONTE: ${c.metadata.document_name}] ${c.content}`).join("\n\n") 
      : "NENHUMA INFORMAÇÃO ENCONTRADA.";

    let systemPrompt = `Você é o Professor Virtual do Estuda AÍ.
    
    DIRETRIZES DE RESPOSTA:
    1. Use APENAS o contexto fornecido.
    2. O contexto pode conter ruídos de formatação (caracteres estranhos de slides). IGNORE-OS e foque no sentido das palavras.
    3. Se o contexto for insuficiente, diga: "O material disponível não detalha esse ponto específico."
    4. PROIBIDO inventar leis ou doutrinas.
    5. Se for um simulado (quiz), gere 10 questões de múltipla escolha com justificativa baseada no texto.`;

    if (action === 'quiz') {
      systemPrompt += `\n\nRetorne APENAS o JSON: {"questions": [{"id": 1, "question": "...", "options": ["...", "..."], "correctIndex": 0, "explanation": "..."}]}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `CONTEXTO:\n${contextText}\n\nPERGUNTA: ${query}` }
        ],
        temperature: 0.2
      })
    });

    const result = await response.json();
    let finalContent = result.choices?.[0]?.message?.content;

    if (action === 'quiz' && finalContent) {
      finalContent = finalContent.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    return new Response(JSON.stringify({ 
      text: finalContent,
      isQuiz: action === 'quiz',
      sources: chunks ? [...new Set(chunks.map(c => c.metadata.document_name))] : []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Erro na consulta." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})