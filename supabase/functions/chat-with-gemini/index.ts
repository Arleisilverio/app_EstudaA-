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

    console.log(`[chat-with-gemini] Iniciando. Matéria: ${subjectId}`);

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: 'Configuração GEMINI_API_KEY ausente.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Buscar metadados dos documentos no banco
    const { data: documents, error: dbError } = await supabaseClient
      .from('documents')
      .select('name, file_path')
      .eq('subject_id', subjectId)

    if (dbError) throw dbError

    // Preparar as "partes" da mensagem para o Gemini
    const parts = []

    // 2. Processar cada documento (Suporta PDF e Texto)
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        console.log(`[chat-with-gemini] Lendo: ${doc.name}`);
        
        const { data, error: storageError } = await supabaseClient
          .storage
          .from('documents')
          .download(doc.file_path)
        
        if (!storageError && data) {
          const arrayBuffer = await data.arrayBuffer()
          const base64Data = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
          
          // Determinar o tipo MIME (PDF ou Texto)
          const isPdf = doc.name.toLowerCase().endsWith('.pdf')
          const mimeType = isPdf ? 'application/pdf' : 'text/plain'

          parts.push({
            inlineData: {
              data: base64Data,
              mimeType: mimeType
            }
          })
        }
      }
    }

    // 3. Adicionar a instrução e a pergunta do aluno
    let instruction = "Você é um Professor Virtual acadêmico. "
    if (action === 'quiz') instruction += "Gere um simulado de 5 questões com gabarito."
    else if (action === 'summary') instruction += "Gere um resumo detalhado em tópicos."
    else instruction += "Responda de forma didática baseada nos arquivos fornecidos."

    parts.push({ text: `INSTRUÇÃO: ${instruction}\n\nPERGUNTA DO ALUNO: ${query}` })

    // 4. Chamar o Gemini
    console.log(`[chat-with-gemini] Enviando ${parts.length} partes para o Gemini...`);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }]
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[chat-with-gemini] Erro Google API:", result);
      throw new Error(result.error?.message || "Erro na API do Google");
    }

    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text

    if (!aiText) {
      return new Response(JSON.stringify({ 
        text: "O material enviado é muito complexo ou está protegido. Tente usar arquivos PDF com texto selecionável ou arquivos .txt.",
        sources: []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ 
      text: aiText,
      sources: documents?.map(d => d.name) || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error(`[chat-with-gemini] ERRO: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})