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
      return new Response(JSON.stringify({ text: "Erro: Chave de API não configurada.", sources: [] }), { headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 1. Buscar documentos para contexto
    const { data: documents } = await supabase.from('documents').select('name, file_path').eq('subject_id', subjectId)
    let contextText = "";
    
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        try {
          const { data: fileBlob } = await supabase.storage.from('documents').download(doc.file_path)
          if (fileBlob) {
            const text = await fileBlob.text();
            // Aumentamos o limite de extração para garantir mais base de conhecimento
            contextText += `\n--- INÍCIO DO DOCUMENTO: ${doc.name} ---\n${text.substring(0, 20000)}\n--- FIM DO DOCUMENTO: ${doc.name} ---\n`;
          }
        } catch (e) {
          console.error(`Erro ao ler ${doc.name}`);
        }
      }
    }

    // 2. Definir o comportamento RESTRETO da IA
    let systemPrompt = `Você é o Professor Virtual do Estuda AÍ. 
    REGRAS DE OURO (NÃO PODEM SER QUEBRADAS):
    1. Responda EXCLUSIVAMENTE com base no "CONTEXTO DOS DOCUMENTOS" fornecido abaixo.
    2. É TERMINANTEMENTE PROIBIDO inventar informações ou usar conhecimentos externos (da sua base de treinamento) que não estejam explicitamente citados no material fornecido.
    3. Se o material fornecido estiver vazio ou não contiver a resposta para a pergunta, diga: "Desculpe, mas não encontrei essa informação nos materiais desta matéria disponibilizados pelo professor."
    4. Se for solicitado um resumo, resuma apenas o que está nos documentos.
    5. Se for solicitado um simulado, todas as questões devem ser extraídas de fatos presentes nos documentos.`;
    
    if (action === 'quiz') {
      systemPrompt += `
      TAREFA: Gere um SIMULADO DE 10 QUESTÕES baseado ÚNICAMENTE no material.
      REGRAS DO JSON:
      - Retorne APENAS o JSON puro.
      - Estrutura: {"questions": [{"id": 1, "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}]}
      - A "explanation" deve citar em qual documento/trecho a resposta se baseia.
      - Se não houver material suficiente para 10 questões de qualidade, gere quantas for possível (mínimo 1) ou informe a falta de material.`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "system", content: `CONTEXTO DOS DOCUMENTOS:\n${contextText || "Nenhum documento disponível."}` },
      { role: "user", content: query }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.1 // Temperatura baixa para garantir fidelidade ao texto e evitar "criatividade"
      })
    })

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

    let finalContent = content;
    if (action === 'quiz') {
      // Limpeza de blocos de código markdown se o GPT os incluir
      finalContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    return new Response(JSON.stringify({ 
      text: finalContent,
      isQuiz: action === 'quiz',
      sources: documents?.map(d => d.name) || []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ text: "Erro interno: " + err.message }), { headers: corsHeaders })
  }
})