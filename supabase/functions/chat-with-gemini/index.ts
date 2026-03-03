// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { subjectId, query, action } = await req.json()
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')

    if (!GEMINI_API_KEY) {
      throw new Error('Chave de API do Gemini não configurada.')
    }

    // Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Buscar metadados dos documentos da matéria
    const { data: documents, error: dbError } = await supabaseClient
      .from('documents')
      .select('name, file_path')
      .eq('subject_id', subjectId)

    if (dbError) throw dbError

    // 2. Tentar ler conteúdo dos arquivos
    let contextText = ""
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        const { data, error: storageError } = await supabaseClient
          .storage
          .from('documents')
          .download(doc.file_path)
        
        if (!storageError && data) {
          const text = await data.text()
          contextText += `--- INÍCIO DO ARQUIVO: ${doc.name} ---\n${text}\n--- FIM DO ARQUIVO ---\n\n`
        }
      }
    }

    // 3. Preparar o Prompt para o Gemini
    let systemInstruction = "Você é um Professor Virtual acadêmico especializado e didático. "
    
    if (action === 'quiz') {
      systemInstruction += "Gere um simulado com exatamente 5 questões de múltipla escolha sobre o conteúdo fornecido. Cada questão deve ter 4 alternativas (A, B, C, D) e indicar a resposta correta no final de cada questão. Use um tom encorajador."
    } else if (action === 'summary') {
      systemInstruction += "Crie um resumo estruturado, usando tópicos e negrito para destacar conceitos fundamentais do material fornecido."
    } else {
      systemInstruction += "Responda as dúvidas do aluno com base EXCLUSIVAMENTE nos documentos fornecidos. Se a resposta não estiver nos documentos, diga gentilmente que não encontrou essa informação no material de estudo atual."
    }

    const prompt = `
Contexto de Estudo:
${contextText || "Nenhum documento disponível para esta matéria ainda."}

Pergunta/Solicitação do Aluno:
${query}

Instrução do Professor:
${systemInstruction}
    `

    // 4. Chamada para a API do Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    })

    const geminiData = await response.json()
    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Desculpe, tive um problema ao processar sua resposta."

    return new Response(JSON.stringify({ 
      text: aiResponse,
      sources: documents?.map(d => d.name) || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.log(`[chat-with-gemini] Error: ${error.message}`)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})