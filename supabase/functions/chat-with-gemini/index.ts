// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    if (!GEMINI_API_KEY) {
      console.error("[chat-with-gemini] ERRO: GEMINI_API_KEY não encontrada nos Secrets.");
      return new Response(JSON.stringify({ error: 'Configuração ausente: GEMINI_API_KEY' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Buscar documentos
    const { data: documents, error: dbError } = await supabaseClient
      .from('documents')
      .select('name, file_path')
      .eq('subject_id', subjectId)

    if (dbError) throw dbError

    let contextText = ""
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        const { data, error: storageError } = await supabaseClient
          .storage
          .from('documents')
          .download(doc.file_path)
        
        if (!storageError && data) {
          const text = await data.text()
          contextText += `--- ARQUIVO: ${doc.name} ---\n${text}\n\n`
        }
      }
    }

    // 2. Prompt
    let systemInstruction = "Você é um Professor Virtual acadêmico especializado. "
    if (action === 'quiz') systemInstruction += "Gere 5 questões de múltipla escolha com 4 alternativas e gabarito no final."
    else if (action === 'summary') systemInstruction += "Crie um resumo detalhado em tópicos do material fornecido."
    else systemInstruction += "Responda as dúvidas com base no material fornecido. Seja didático."

    const prompt = `CONTEÚDO DE ESTUDO:\n${contextText || "Sem arquivos."}\n\nSOLICITAÇÃO DO ALUNO: ${query}\n\nINSTRUÇÃO: ${systemInstruction}`

    // 3. Chamada Gemini com tratamento de erro detalhado
    console.log(`[chat-with-gemini] Enviando solicitação para o Gemini para a matéria ${subjectId}`);
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      })
    })

    const geminiData = await response.json()

    if (!response.ok) {
      console.error("[chat-with-gemini] Erro na API do Gemini:", geminiData);
      return new Response(JSON.stringify({ 
        error: geminiData.error?.message || "Erro na comunicação com o Google Gemini" 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      })
    }

    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiResponse) {
      console.warn("[chat-with-gemini] Resposta vazia ou bloqueada pelo filtro de segurança:", geminiData);
      return new Response(JSON.stringify({ 
        text: "O Professor Virtual não pôde gerar uma resposta para este conteúdo por motivos de segurança ou falta de contexto.",
        sources: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ 
      text: aiResponse,
      sources: documents?.map(d => d.name) || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.log(`[chat-with-gemini] Erro Crítico: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})