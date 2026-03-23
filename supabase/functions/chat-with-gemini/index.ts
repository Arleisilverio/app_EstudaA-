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

    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query })
    });
    
    const embData = await embRes.json();
    const queryEmbedding = embData.data[0].embedding;

    // Busca Vetorial mais abrangente (threshold menor e mais chunks)
    const { data: chunks, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.20, // Mais tolerante
      match_count: 15, // Mais contexto
      filter_subject_id: subjectId
    });

    if (matchError) throw matchError;

    const contextText = chunks && chunks.length > 0 
      ? chunks.map(c => `[FONTE: ${c.metadata.document_name}] ${c.content}`).join("\n\n") 
      : "NENHUM MATERIAL ENCONTRADO PARA ESTA DÚVIDA.";

    let systemPrompt = `Você é o Professor Virtual do Estuda AÍ, um assistente jurídico especializado.
    
    REGRAS DE OURO:
    1. Responda com base no CONTEXTO fornecido.
    2. Se o contexto for vago, tente interpretar o sentido jurídico mas avise que o material é resumido.
    3. Use uma linguagem didática e profissional.
    4. Para Quizzes: Gere 10 questões desafiadoras com base no material.`;

    if (action === 'quiz') {
      systemPrompt += `\n\nRetorne APENAS JSON: {"questions": [{"id": 1, "question": "...", "options": ["...", "..."], "correctIndex": 0, "explanation": "..."}]}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `CONTEXTO DOS MATERIAIS:\n${contextText}\n\nPERGUNTA DO ALUNO: ${query}` }
        ],
        temperature: 0.3
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