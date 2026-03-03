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
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') || Deno.env.get('OpenAI API Key');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ text: "Erro: Chave ausente.", sources: [] }), { headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 1. Buscar documentos para contexto
    const { data: documents } = await supabase.from('documents').select('name, file_path').eq('subject_id', subjectId)
    let contextText = "";
    if (documents) {
      for (const doc of documents) {
        const { data: fileBlob } = await supabase.storage.from('documents').download(doc.file_path)
        if (fileBlob) {
          const text = await fileBlob.text();
          contextText += `\n--- Doc: ${doc.name} ---\n${text.substring(0, 10000)}\n`;
        }
      }
    }

    // 2. Configurar o comportamento do GPT
    let systemPrompt = `Você é o Professor Virtual do Estuda AÍ. Responda em Português-BR.`;
    
    if (action === 'quiz') {
      systemPrompt += `
      Sua tarefa é gerar um SIMULADO DE 10 QUESTÕES sobre o tema.
      REGRAS OBRIGATÓRIAS:
      1. Retorne APENAS um objeto JSON puro, sem textos antes ou depois.
      2. O JSON deve ter a estrutura: {"questions": [{"id": 1, "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]}
      3. Cada questão deve ter 4 alternativas.
      4. Apenas UMA alternativa correta.
      5. Baseie-se no contexto fornecido.`;
    } else {
      systemPrompt += `\nTarefa: ${action === 'summary' ? 'Resumir material' : 'Tirar dúvidas'}.\nContexto: ${contextText}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: query }],
        temperature: 0.7
      })
    })

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    // Se for quiz, tentamos limpar o conteúdo de possíveis blocos de código markdown
    let finalContent = content;
    if (action === 'quiz') {
      finalContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    return new Response(JSON.stringify({ 
      text: finalContent,
      isQuiz: action === 'quiz',
      sources: documents?.map(d => d.name) || []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ text: "Erro: " + err.message }), { headers: corsHeaders })
  }
})