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
    
    // Buscando a chave com o nome exato configurado nos segredos
    const GEMINI_API_KEY = Deno.env.get('Gemini API Key') || Deno.env.get('GEMINI_API_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log(`[chat-with-gemini] Processando matéria: ${subjectId}`);

    if (!GEMINI_API_KEY) {
      console.error("[chat-with-gemini] ERRO: Chave Gemini API Key não encontrada nos Segredos.");
      throw new Error("Configuração incompleta: Chave de API não encontrada.");
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 1. Buscar documentos da matéria
    const { data: documents, error: dbError } = await supabase
      .from('documents')
      .select('name, file_path')
      .eq('subject_id', subjectId)

    if (dbError) throw dbError

    const parts = []

    // 2. Anexar arquivos ao contexto da IA
    if (documents && documents.length > 0) {
      for (const doc of documents) {
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

    // 3. Definir o comportamento do Professor
    const instruction = `Você é o Professor Virtual do sistema Estuda AÍ.
    Sua tarefa é: ${action === 'summary' ? 'Gerar um resumo didático' : action === 'quiz' ? 'Criar um simulado de 5 questões' : 'Responder a dúvida do aluno'}.
    
    IMPORTANTE:
    - Baseie-se prioritariamente nos documentos anexados.
    - Se a informação não estiver neles, use seu conhecimento acadêmico.
    - Responda de forma clara e organizada em Português-BR.
    
    PERGUNTA/COMANDO: ${query}`;

    parts.push({ text: instruction })

    // 4. Chamada para a API do Google (Versão Estável v1)
    console.log("[chat-with-gemini] Enviando para Gemini 1.5 Flash...");
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: parts }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        }
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[chat-with-gemini] Erro na API do Google:", JSON.stringify(result));
      return new Response(JSON.stringify({ 
        text: "Desculpe, tive um problema técnico ao acessar meu banco de conhecimentos. Por favor, tente novamente em alguns segundos.",
        sources: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    const aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text

    return new Response(JSON.stringify({ 
      text: aiResponse || "Não consegui gerar uma resposta para essa dúvida agora.",
      sources: documents?.map(d => d.name) || []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (err) {
    console.error(`[chat-with-gemini] Erro Crítico: ${err.message}`);
    return new Response(JSON.stringify({ 
      text: "Ocorreu um erro interno. Verifique se os arquivos foram enviados corretamente.",
      error: err.message 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })
  }
})