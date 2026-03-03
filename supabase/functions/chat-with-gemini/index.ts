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
    
    // Tenta pegar a chave conforme o nome que você salvou no Supabase
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('OpenAI API Key');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log(`[chat-with-ai] Iniciando consulta OpenAI para matéria: ${subjectId}`);

    if (!OPENAI_API_KEY) {
      console.error("[chat-with-ai] ERRO: OPENAI_API_KEY não encontrada nos segredos.");
      return new Response(JSON.stringify({ 
        text: "Erro de configuração: A chave da OpenAI não foi detectada. Verifique os segredos da Edge Function.",
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
    
    // 2. Extração de texto (Nota: GPT-4o via API não lê binários de PDF, apenas texto)
    if (documents && documents.length > 0) {
      console.log(`[chat-with-ai] Lendo ${documents.length} documentos...`);
      for (const doc of documents) {
        try {
          const { data: fileBlob } = await supabase.storage.from('documents').download(doc.file_path)
          if (fileBlob) {
            const text = await fileBlob.text();
            // Limite de 15k caracteres por documento para evitar estourar o contexto
            contextText += `\n--- Documento: ${doc.name} ---\n${text.substring(0, 15000)}\n`;
          }
        } catch (fileErr) {
          console.error(`[chat-with-ai] Erro ao ler arquivo ${doc.name}:`, fileErr);
        }
      }
    }

    // 3. Prompt do Sistema
    const messages = [
      {
        role: "system",
        content: `Você é o Professor Virtual do Estuda AÍ.
        Sua tarefa é: ${action === 'summary' ? 'Resumir o material' : action === 'quiz' ? 'Gerar um simulado de 5 questões' : 'Responder a dúvida'}.
        
        INSTRUÇÕES:
        - Responda SEMPRE em Português-BR.
        - Utilize o contexto abaixo fornecido pelo aluno.
        - Se o contexto for ilegível ou estiver vazio, use sua base de conhecimento acadêmico para ajudar.
        
        CONTEXTO:
        ${contextText || "Nenhum documento processável encontrado."}`
      },
      {
        role: "user",
        content: query
      }
    ];

    // 4. Chamada OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.7
      })
    })

    const result = await response.json()

    if (!response.ok) {
      console.error("[chat-with-ai] Erro na OpenAI API:", result);
      return new Response(JSON.stringify({ 
        text: `Erro da OpenAI: ${result.error?.message || "Erro desconhecido"}`,
        sources: []
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    const aiResponse = result.choices?.[0]?.message?.content

    return new Response(JSON.stringify({ 
      text: aiResponse || "Não recebi uma resposta válida da IA.",
      sources: documents?.map(d => d.name) || []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })

  } catch (err) {
    console.error(`[chat-with-ai] Erro Crítico: ${err.message}`);
    return new Response(JSON.stringify({ 
      text: "Ocorreu um erro interno no servidor ao processar sua pergunta.",
      error: err.message 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
      status: 200 
    })
  }
})