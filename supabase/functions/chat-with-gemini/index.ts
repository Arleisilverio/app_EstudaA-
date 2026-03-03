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
    
    // Pegando a chave da OpenAI (pode ser "OpenAI API Key" ou "OPENAI_API_KEY")
    const OPENAI_API_KEY = Deno.env.get('OpenAI API Key') || Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ 
        text: "Erro: Chave 'OpenAI API Key' não encontrada nos segredos do Supabase.",
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

    let contextText = "";
    
    // 2. Tentar extrair texto dos documentos
    // Nota: O GPT não lê PDFs binários diretamente via Chat API como o Gemini.
    // Para PDFs complexos, precisaríamos de um OCR ou processamento prévio.
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        const { data: fileBlob } = await supabase.storage.from('documents').download(doc.file_path)
        if (fileBlob) {
          const text = await fileBlob.text();
          // Limitamos o tamanho do texto para não estourar o limite de tokens
          contextText += `\n--- Documento: ${doc.name} ---\n${text.substring(0, 10000)}\n`;
        }
      }
    }

    // 3. Preparar as mensagens para o GPT
    const messages = [
      {
        role: "system",
        content: `Você é o Professor Virtual do Estuda AÍ. 
        Seu objetivo é: ${action === 'summary' ? 'Resumir o material' : action === 'quiz' ? 'Gerar um simulado' : 'Tirar dúvidas'}.
        Responda sempre em Português-BR.
        
        CONTEXTO DOS DOCUMENTOS DO ALUNO:
        ${contextText || "Nenhum documento encontrado para esta matéria. Use seu conhecimento geral acadêmico."}`
      },
      {
        role: "user",
        content: query
      }
    ];

    // 4. Chamada para a API da OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o", // Modelo mais potente da OpenAI
        messages: messages,
        temperature: 0.7
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[chat-with-ai] Erro OpenAI:", result);
      return new Response(JSON.stringify({ 
        text: `Erro na OpenAI: ${result.error?.message || "Erro desconhecido"}`,
        sources: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    const aiResponse = result.choices?.[0]?.message?.content

    return new Response(JSON.stringify({ 
      text: aiResponse || "Não consegui gerar uma resposta.",
      sources: documents?.map(d => d.name) || []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (err) {
    console.error(`[chat-with-ai] Erro Crítico: ${err.message}`);
    return new Response(JSON.stringify({ text: `Erro interno no servidor: ${err.message}` }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })
  }
})