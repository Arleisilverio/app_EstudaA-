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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log(`[chat-with-gemini] Iniciando. Matéria: ${subjectId}`);

    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY não configurada.");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 1. Buscar arquivos
    const { data: documents, error: dbError } = await supabase
      .from('documents')
      .select('name, file_path')
      .eq('subject_id', subjectId)

    if (dbError) throw dbError

    const parts = []

    // 2. Processar Documentos
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        console.log(`[chat-with-gemini] Lendo: ${doc.name}`);
        const { data: fileBlob } = await supabase.storage.from('documents').download(doc.file_path)

        if (fileBlob) {
          const arrayBuffer = await fileBlob.arrayBuffer()
          const base64 = encodeBase64(new Uint8Array(arrayBuffer))
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
    const prompt = `Você é o Professor Virtual do Estuda AÍ.
    Ação: ${action || 'chat'}
    Contexto: Responda em Português-BR com base nos documentos.
    Pergunta: ${query}`;

    parts.push({ text: prompt })

    // 4. Chamada à API (Usando v1 e gemini-1.5-flash-latest para maior compatibilidade)
    console.log("[chat-with-gemini] Chamando Gemini API...");
    
    // Tentamos primeiro a v1 que é mais estável
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
      console.error("[chat-with-gemini] Erro detalhado:", result);
      // Se o erro for de modelo não encontrado, avisamos o usuário para verificar a chave
      return new Response(JSON.stringify({ 
        text: `Erro de configuração na IA: ${result.error?.message || 'Modelo não suportado'}. Verifique se sua chave de API tem acesso ao Gemini 1.5 Flash.`,
        sources: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text

    return new Response(JSON.stringify({ 
      text: aiResponse || "O professor não conseguiu formular uma resposta agora.",
      sources: documents?.map(d => d.name) || []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (err) {
    console.error(`[chat-with-gemini] Erro: ${err.message}`);
    return new Response(JSON.stringify({ text: "Erro no servidor da IA. Tente novamente." }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })
  }
})