// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { encodeBase64 } from "https://deno.land/std@0.203.0/encoding/base64.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { subjectId, query, action } = await req.json()
    
    // Tenta pegar a chave de várias formas possíveis (Supabase às vezes normaliza nomes)
    const GEMINI_API_KEY = Deno.env.get('Gemini API Key') || 
                           Deno.env.get('GEMINI_API_KEY') || 
                           Deno.env.get('gemini_api_key');
                           
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ 
        text: "Erro: Chave 'Gemini API Key' não encontrada nos segredos da função. Verifique o nome no painel do Supabase.",
        sources: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 1. Buscar documentos
    const { data: documents, error: dbError } = await supabase
      .from('documents')
      .select('name, file_path')
      .eq('subject_id', subjectId)

    if (dbError) throw dbError

    const parts = []
    let totalSize = 0;

    // 2. Anexar arquivos (com verificação de tamanho)
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        const { data: fileBlob } = await supabase.storage.from('documents').download(doc.file_path)

        if (fileBlob) {
          const arrayBuffer = await fileBlob.arrayBuffer()
          const uint8 = new Uint8Array(arrayBuffer)
          
          // Se o arquivo codificado passar de ~18MB, a Google vai rejeitar
          if (uint8.length > 15 * 1024 * 1024) {
             console.warn(`[chat-with-gemini] Arquivo ${doc.name} ignorado por ser grande demais para o chat direto.`);
             continue;
          }

          const base64 = encodeBase64(uint8)
          const isPdf = doc.name.toLowerCase().endsWith('.pdf')

          parts.push({
            inlineData: {
              data: base64,
              mimeType: isPdf ? "application/pdf" : "text/plain"
            }
          })
        }
      }
    }

    // 3. Prompt
    const instruction = `Você é o Professor Virtual do Estuda AÍ.
    Objetivo: ${action === 'summary' ? 'Resumir material' : action === 'quiz' ? 'Gerar 5 questões' : 'Responder dúvida'}.
    Responda em Português-BR usando os documentos anexados como base prioritária.
    
    PERGUNTA: ${query}`;

    parts.push({ text: instruction })

    // 4. Chamada para a API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[chat-with-gemini] Erro Google API:", result);
      const errorMsg = result.error?.message || "Erro desconhecido na API do Google.";
      
      // Se for erro de tamanho, damos uma explicação melhor
      if (errorMsg.includes("request is too large") || response.status === 413) {
        return new Response(JSON.stringify({ 
          text: "O arquivo PDF é muito grande (muitas imagens ou páginas complexas) para ser processado via chat direto. Tente enviar um arquivo menor ou em formato texto.",
          sources: []
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
      }

      return new Response(JSON.stringify({ 
        text: `O Professor Virtual teve um erro técnico: ${errorMsg}`,
        sources: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text

    return new Response(JSON.stringify({ 
      text: aiResponse || "Não consegui gerar uma resposta.",
      sources: documents?.map(d => d.name) || []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (err) {
    console.error(`[chat-with-gemini] Erro Crítico: ${err.message}`);
    return new Response(JSON.stringify({ text: `Erro interno: ${err.message}` }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })
  }
})