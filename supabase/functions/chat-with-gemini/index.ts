// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { encodeBase64 } from "https://deno.land/std@0.203.0/encoding/base64.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // 1. Lidar com o CORS (Pré-vôo)
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { subjectId, query, action } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log(`[chat-with-gemini] Iniciando processamento para Matéria: ${subjectId}`);

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 2. Buscar arquivos da matéria
    const { data: documents, error: dbError } = await supabase
      .from('documents')
      .select('name, file_path')
      .eq('subject_id', subjectId)

    if (dbError) throw dbError
    console.log(`[chat-with-gemini] Arquivos encontrados: ${documents?.length || 0}`);

    const parts = []

    // 3. Baixar e Codificar (Otimizado para arquivos grandes)
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        console.log(`[chat-with-gemini] Processando: ${doc.name}`);
        
        const { data: fileBlob, error: storageError } = await supabase
          .storage
          .from('documents')
          .download(doc.file_path)

        if (storageError) {
          console.error(`[chat-with-gemini] Erro no download de ${doc.name}:`, storageError);
          continue;
        }

        // Usando Uint8Array e encodeBase64 nativo do Deno para velocidade máxima
        const arrayBuffer = await fileBlob.arrayBuffer()
        const uint8Array = new Uint8Array(arrayBuffer)
        const base64 = encodeBase64(uint8Array)
        
        const isPdf = doc.name.toLowerCase().endsWith('.pdf')

        parts.push({
          inlineData: {
            data: base64,
            mimeType: isPdf ? "application/pdf" : "text/plain"
          }
        })
      }
    }

    // 4. Instrução do Professor
    const systemPrompt = `Você é o Professor Virtual do Estuda AÍ. 
    Seu objetivo é auxiliar o aluno com base nos materiais fornecidos.
    
    DIRETRIZES:
    - Responda de forma completa e didática.
    - Use os PDFs fornecidos como fonte primária de verdade.
    - Se a informação não estiver nos PDFs, use seu conhecimento geral mas mencione isso.
    - Ação atual: ${action || 'chat'} (se 'quiz', gere 5 questões. se 'summary', gere um resumo em tópicos).
    
    PERGUNTA DO ALUNO: ${query}`;

    parts.push({ text: systemPrompt })

    // 5. Chamada ao Google Gemini (Flash 1.5 é o melhor para contextos longos)
    console.log("[chat-with-gemini] Enviando payload para o Gemini...");
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 4096,
        }
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[chat-with-gemini] Erro na API do Google:", JSON.stringify(result));
      return new Response(JSON.stringify({ 
        text: `Erro na comunicação com a IA: ${result.error?.message || 'Tente novamente em instantes.'}`,
        sources: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiResponse) {
      console.warn("[chat-with-gemini] Resposta vazia recebida.");
      return new Response(JSON.stringify({ 
        text: "O professor virtual analisou os documentos mas não conseguiu gerar uma resposta. Tente refazer a pergunta de forma mais específica.",
        sources: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    console.log("[chat-with-gemini] Sucesso!");
    return new Response(JSON.stringify({ 
      text: aiResponse,
      sources: documents?.map(d => d.name) || []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (err) {
    console.error(`[chat-with-gemini] Erro Inesperado: ${err.message}`);
    return new Response(JSON.stringify({ 
      text: "Ocorreu um erro no processamento do servidor. Certifique-se de que o arquivo não está corrompido.",
      error: err.message 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 // Retornamos 200 para mostrar a mensagem amigável no chat
    })
  }
})