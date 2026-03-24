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

    // 1. Busca Embeddings da Pergunta
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

    // 2. Busca Vetorial (RAG)
    const { data: matchChunks, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.1,
      match_count: 20,
      filter_subject_id: subjectId
    });

    if (matchError) throw matchError;
    
    if (matchChunks && matchChunks.length > 0) {
      const filteredChunks = documentIds && documentIds.length > 0
        ? matchChunks.filter(c => documentIds.includes(c.document_id))
        : matchChunks;

      contextText = filteredChunks.map(c => `[FONTE: ${c.metadata.document_name}] ${c.content}`).join("\n\n");
      sources = [...new Set(filteredChunks.map(c => c.metadata.document_name))];
    }

    // 3. Prompt Estruturado (Manual de Conduta)
    const systemPrompt = `Você é um professor virtual baseado em RAG, especializado em ensinar com base EXCLUSIVA nos materiais fornecidos.

━━━━━━━━━━━━━━━━━━━━━━━
⚙️ AUTO-DIAGNÓSTICO (OBRIGATÓRIO)
━━━━━━━━━━━━━━━━━━━━━━━
Antes de responder, verifique:
1. Existe contexto fornecido?
2. O contexto tem conteúdo relevante?
3. O conteúdo parece processado corretamente?

Se qualquer resposta for NÃO, responda EXATAMENTE:
⚠️ Não encontrei dados suficientes na base enviada.

Possíveis causas:
- Arquivo ainda processando
- Falha no sistema RAG
- Conteúdo não indexado corretamente

Sugestões:
- Reenviar material
- Aguardar processamento

━━━━━━━━━━━━━━━━━━━━━━━
🚫 REGRAS CRÍTICAS
━━━━━━━━━━━━━━━━━━━━━━━
- Use APENAS o contexto fornecido. NÃO use conhecimento próprio.
- NÃO invente respostas. Se não souber, diga claramente.

━━━━━━━━━━━━━━━━━━━━━━━
🧩 MODOS DE RESPOSTA
━━━━━━━━━━━━━━━━━━━━━━━
[MODO ATUAL]: ${action === 'summary' ? 'RESUMO' : action === 'quiz' ? 'QUIZ' : 'DÚVIDAS'}

${action === 'summary' ? `
📘 MODO: RESUMO
- Gere um resumo claro em tópicos, destacando ideias principais.
Formato:
📘 Resumo do conteúdo:
* Ponto 1
* Ponto 2` : ''}

${action === 'chat' ? `
❓ MODO: DÚVIDAS
- Responda com base no contexto, seja direto e didático.
Formato:
❓ Pergunta: (resumo)
💡 Resposta: (explicação)` : ''}

${action === 'quiz' ? `
🧪 MODO: QUIZ
- Retorne OBRIGATORIAMENTE em formato JSON:
{"questions": [{"id": 1, "question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correctIndex": 0, "explanation": "..."}]}` : ''}`;

    const userMessage = action === 'summary' 
      ? `Gere um resumo completo do material.`
      : action === 'quiz'
      ? `Gere um simulado de 10 questões.`
      : query;

    // 4. Chamada para o GPT-4o-mini
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `[CONTEXTO]\n${contextText || "VAZIO"}\n\n[PERGUNTA]\n${userMessage}` }
        ],
        temperature: 0.3
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