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

    // 1. Busca Embeddings da Pergunta (Padrão 1536)
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        model: "text-embedding-3-small", 
        input: query || "Resumo geral do material",
        dimensions: 1536 
      })
    });
    
    const embData = await embRes.json();
    const queryEmbedding = embData.data[0].embedding;

    // 2. Busca Vetorial (RAG) - Aumentamos o limite para 20 trechos
    const { data: matchChunks, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.1, // Mais sensível para encontrar conteúdo
      match_count: 20,
      filter_subject_id: subjectId
    });

    if (matchError) throw matchError;
    
    if (matchChunks && matchChunks.length > 0) {
      // Filtra por documentos específicos se solicitado
      const filteredChunks = documentIds && documentIds.length > 0
        ? matchChunks.filter(c => documentIds.includes(c.document_id))
        : matchChunks;

      contextText = filteredChunks.map(c => `[FONTE: ${c.metadata.document_name}] ${c.content}`).join("\n\n");
      sources = [...new Set(filteredChunks.map(c => c.metadata.document_name))];
    }

    // 3. Prompt do Professor Virtual
    let systemPrompt = `Você é o Professor Virtual do Estuda AÍ, especialista em Direito.
    
    REGRAS DE OURO:
    1. Responda SEMPRE em Português do Brasil.
    2. Use o CONTEXTO fornecido para embasar sua resposta.
    3. Se o contexto parecer insuficiente, tente extrair o máximo de lógica jurídica possível dele antes de dizer que não sabe.
    4. Para RESUMOS: Use tópicos, negrito e uma linguagem didática.
    5. Para SIMULADOS: Gere 10 questões de múltipla escolha com gabarito comentado.`;

    if (action === 'quiz') {
      systemPrompt += `\n\nRETORNE APENAS JSON: {"questions": [{"id": 1, "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctIndex": 0, "explanation": "..."}]}`;
    }

    const userMessage = action === 'summary' 
      ? `Gere um resumo completo e estruturado de todo o material disponível no contexto.`
      : action === 'quiz'
      ? `Gere um simulado de 10 questões de nível acadêmico sobre este material.`
      : query;

    // 4. Chamada para o GPT-4o-mini (Mais rápido e preciso para RAG)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `CONTEXTO EXTRAÍDO DOS MATERIAIS:\n${contextText || "AVISO: Nenhum texto legível foi encontrado nos arquivos."}\n\nPERGUNTA DO ALUNO: ${userMessage}` }
        ],
        temperature: 0.4
      })
    });

    const result = await response.json();
    let finalContent = result.choices?.[0]?.message?.content || "Não consegui processar sua dúvida agora.";

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
    return new Response(JSON.stringify({ error: "Erro na consulta ao Professor Virtual." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})