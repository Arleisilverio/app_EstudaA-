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

    // ETAPA 5: CONSULTA (QUERY EMBEDDING)
    console.log(`[${functionName}] Gerando embedding para a pergunta do usuário.`);
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query })
    });
    
    const embData = await embRes.json();
    const queryEmbedding = embData.data[0].embedding;

    // Busca Vetorial (Top 5 chunks mais relevantes)
    // Aumentamos o threshold para 0.4 para garantir fidelidade (Etapa 5)
    const { data: chunks, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.4, 
      match_count: 6,
      filter_subject_id: subjectId
    });

    if (matchError) throw matchError;

    const hasContext = chunks && chunks.length > 0;
    
    // ETAPA 6: RESPOSTA DA IA (REGRAS INEGOCIÁVEIS)
    const contextText = hasContext 
      ? chunks.map(c => `[FONTE: ${c.metadata.document_name}] ${c.content}`).join("\n\n") 
      : "NENHUMA INFORMAÇÃO ENCONTRADA NA BASE DE DADOS.";

    let systemPrompt = `Você é o Professor Virtual do Estuda AÍ.
    
    REGRAS DE OURO (ETAPA 6):
    1. Responda APENAS com base no contexto fornecido abaixo.
    2. Se o contexto disser "NENHUMA INFORMAÇÃO ENCONTRADA", responda exatamente: "Não encontrei informações na base enviada para responder a essa pergunta."
    3. PROIBIDO usar conhecimento geral ou inventar fatos.
    4. Se a informação estiver incompleta no contexto, diga que o material não detalha o assunto.
    5. Mantenha um tom didático e profissional.`;

    if (action === 'quiz') {
      systemPrompt += `\n\nTAREFA: Gere um simulado de 10 questões baseado EXCLUSIVAMENTE nos textos. Retorne apenas o JSON: {"questions": [...]}`;
    }

    console.log(`[${functionName}] Enviando para IA com ${chunks?.length || 0} chunks de contexto.`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `CONTEXTO RECUPERADO:\n${contextText}\n\nPERGUNTA DO ESTUDANTE: ${query}` }
        ],
        temperature: 0.1 // Baixa temperatura para evitar alucinações
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
      sources: chunks ? [...new Set(chunks.map(c => c.metadata.document_name))] : [],
      debug: {
        chunkCount: chunks?.length || 0,
        threshold: 0.4
      }
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error(`[${functionName}] ERRO TÉCNICO:`, err.message);
    return new Response(JSON.stringify({ error: "Erro no processamento da consulta RAG." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})