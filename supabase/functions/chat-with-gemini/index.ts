// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Função auxiliar para Base64 segura (sem estourar a memória)
function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { subjectId, query, action } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log(`[chat-with-gemini] Solicitação recebida. Matéria: ${subjectId}`);

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada nos Secrets do Supabase.");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 1. Buscar arquivos no banco
    const { data: documents, error: dbError } = await supabase
      .from('documents')
      .select('name, file_path')
      .eq('subject_id', subjectId)

    if (dbError) throw dbError
    console.log(`[chat-with-gemini] Encontrados ${documents?.length || 0} arquivos.`);

    const parts = []

    // 2. Baixar e codificar arquivos
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        console.log(`[chat-with-gemini] Baixando: ${doc.name}`);
        const { data: fileData, error: storageError } = await supabase
          .storage
          .from('documents')
          .download(doc.file_path)

        if (storageError) {
          console.error(`[chat-with-gemini] Erro ao baixar ${doc.name}:`, storageError);
          continue;
        }

        const buffer = await fileData.arrayBuffer()
        const base64 = arrayBufferToBase64(buffer)
        const isPdf = doc.name.toLowerCase().endsWith('.pdf')

        parts.push({
          inlineData: {
            data: base64,
            mimeType: isPdf ? "application/pdf" : "text/plain"
          }
        })
      }
    }

    // 3. Prompt de Sistema
    const systemPrompt = `Você é o Professor Virtual do Estuda AÍ. 
    REGRAS:
    - Use exclusivamente os documentos fornecidos para responder.
    - Se não houver documentos ou se a resposta não estiver neles, use seu conhecimento geral, mas avise o aluno.
    - Responda sempre em Português do Brasil.
    - Se a ação for 'quiz', gere 5 questões. Se for 'summary', gere um resumo.
    
    AÇÃO: ${action || 'chat'}
    PERGUNTA: ${query}`;

    parts.push({ text: systemPrompt })

    // 4. Chamada ao Google Gemini 1.5 Flash
    console.log("[chat-with-gemini] Enviando dados para o Google Gemini...");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    })

    const result = await response.json()

    // LOG DE ERRO CRÍTICO: Ver o que o Google respondeu se der erro
    if (!response.ok) {
      console.error("[chat-with-gemini] Erro na API do Google:", JSON.stringify(result));
      return new Response(JSON.stringify({ 
        text: `Erro na IA do Google: ${result.error?.message || 'Erro desconhecido'}.`,
        sources: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiResponse) {
      console.error("[chat-with-gemini] Resposta vazia. Debug:", JSON.stringify(result));
      return new Response(JSON.stringify({ 
        text: "A IA processou os arquivos mas não conseguiu gerar uma resposta. Isso pode acontecer se o arquivo for muito grande ou se a pergunta for contra as políticas de segurança da Google.",
        sources: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    console.log("[chat-with-gemini] Sucesso!");
    return new Response(JSON.stringify({ 
      text: aiResponse,
      sources: documents?.map(d => d.name) || []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (err) {
    console.error(`[chat-with-gemini] Erro inesperado: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 500 
    })
  }
})