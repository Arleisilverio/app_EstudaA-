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

    let contextText = "";
    let sources = [];

    // LÓGICA DE CONTEXTO: Se houver IDs de documentos, priorizamos eles
    if (documentIds && documentIds.length > 0) {
      console.log(`[chat-with-gemini] Buscando conteúdo direto dos documentos: ${documentIds.join(', ')}`);
      const { data: chunks, error: fetchError } = await supabase
        .from('document_chunks')
        .select('content, metadata')
        .in('document_id', documentIds)
        .limit(25); // Pegamos uma boa fatia do material

      if (fetchError) throw fetchError;
      
      if (chunks && chunks.length > 0) {
        contextText = chunks.map(c => `[FONTE: ${c.metadata.document_name}] ${c.content}`).join("\n\n");
        sources = [...new Set(chunks.map(c => c.metadata.document_name))];
      }
    } 
    
    // Se não houver contexto ainda (ou for chat comum), fazemos a busca vetorial
    if (!contextText) {
      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: "text-embedding-3-small", 
          input: query || "Resumo do material",
          dimensions: 768 
        })
      });
      
      const embData = await embRes.json();
      const queryEmbedding = embData.data[0].embedding;

      const { data: matchChunks, error: matchError } = await supabase.rpc('match_document_chunks', {
        query_embedding: queryEmbedding,
        match_threshold: 0.15,
        match_count: 15,
        filter_subject_id: subjectId
      });

      if (matchError) throw matchError;
      
      if (matchChunks && matchChunks.length > 0) {
        contextText = matchChunks.map(c => `[FONTE: ${c.metadata.document_name}] ${c.content}`).join("\n\n");
        sources = [...new Set(matchChunks.map(c => c.metadata.document_name))];
      }
    }

    let systemPrompt = `Você é o Professor Virtual do Estuda AÍ. Sua missão é auxiliar alunos de Direito.
    
    DIRETRIZES:
    1. Use EXCLUSIVAMENTE o contexto fornecido para responder.
    2. Se o aluno pedir um RESUMO, crie tópicos organizados e didáticos.
    3. Se o aluno pedir um QUIZ, gere 10 questões de múltipla escolha (A, B, C, D) com explicações.
    4. Nunca diga "Como posso ajudar?" se houver um comando de resumo ou quiz pendente. Execute a tarefa.`;

    if (action === 'quiz') {
      systemPrompt += `\n\nIMPORTANTE: Retorne APENAS um objeto JSON puro no formato: {"questions": [{"id": 1, "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctIndex": 0, "explanation": "..."}]}`;
    }

    const userMessage = action === 'summary' 
      ? `Por favor, gere um resumo detalhado e estruturado do material fornecido no contexto.`
      : action === 'quiz'
      ? `Gere um simulado de 10 questões sobre o material fornecido.`
      : query;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `CONTEXTO DO MATERIAL:\n${contextText || "Nenhum material específico encontrado."}\n\nSOLICITAÇÃO: ${userMessage}` }
        ],
        temperature: 0.3
      })
    });

    const result = await response.json();
    let finalContent = result.choices?.[0]?.message?.content || "Desculpe, não consegui processar essa solicitação.";

    if (action === 'quiz' && finalContent) {
      finalContent = finalContent.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    return new Response(JSON.stringify({ 
      text: finalContent,
      isQuiz: action === 'quiz',
      isSummary: action === 'summary',
      sources: sources
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Erro na consulta." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})