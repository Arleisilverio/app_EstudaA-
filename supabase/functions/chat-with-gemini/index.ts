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

    console.log(`[chat-with-gemini] Iniciando requisição. Matéria: ${subjectId}, Ação: ${action}`);

    if (!GEMINI_API_KEY) {
      console.error("[chat-with-gemini] ERRO: GEMINI_API_KEY não encontrada nos Secrets.");
      return new Response(JSON.stringify({ error: 'Chave de API ausente.' }), {
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
        // Filtro simples: Apenas ler arquivos que pareçam texto
        if (!doc.name.toLowerCase().endsWith('.txt') && !doc.name.toLowerCase().endsWith('.md')) {
          console.log(`[chat-with-gemini] Pulando arquivo não-texto: ${doc.name}`);
          continue;
        }

        const { data, error: storageError } = await supabaseClient
          .storage
          .from('documents')
          .download(doc.file_path)
        
        if (!storageError && data) {
          const text = await data.text()
          // Limitar o tamanho do texto para não estourar o limite do prompt
          contextText += `--- ARQUIVO: ${doc.name} ---\n${text.substring(0, 10000)}\n\n`
        }
      }
    }

    console.log(`[chat-with-gemini] Contexto extraído (${contextText.length} caracteres).`);

    // 2. Instruções do Professor
    let systemInstruction = "Você é um Professor Virtual acadêmico. "
    if (action === 'quiz') systemInstruction += "Gere 5 questões de múltipla escolha com gabarito."
    else if (action === 'summary') systemInstruction += "Crie um resumo em tópicos."
    else systemInstruction += "Responda de forma didática baseada no conteúdo fornecido."

    const prompt = `MATERIAL DE ESTUDO:\n${contextText || "Nenhum arquivo de texto encontrado. Responda com base em conhecimentos gerais de estudante."}\n\nPERGUNTA DO ALUNO: ${query}\n\nINSTRUÇÃO: ${systemInstruction}`

    // 3. Chamada ao Google Gemini
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
        ]
      })
    })

    const geminiData = await response.json()

    if (!response.ok) {
      console.error("[chat-with-gemini] Erro Google:", geminiData);
      return new Response(JSON.stringify({ error: geminiData.error?.message || "Erro no Google" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      })
    }

    const aiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiResponse) {
      const reason = geminiData.promptFeedback?.blockReason || "Filtro de segurança do Google";
      console.warn(`[chat-with-gemini] Resposta bloqueada. Motivo: ${reason}`);
      return new Response(JSON.stringify({ 
        text: `O Professor Virtual não pôde responder este tópico específico (Motivo: ${reason}). Tente perguntar de outra forma ou verifique se o material é legível.`,
        sources: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log("[chat-with-gemini] Resposta gerada com sucesso.");
    return new Response(JSON.stringify({ 
      text: aiResponse,
      sources: documents?.map(d => d.name) || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(`[chat-with-gemini] Erro Crítico: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})