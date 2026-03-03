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

    // 1. Buscar TODOS os documentos da matéria para servir de base única
    const { data: documents } = await supabase.from('documents').select('name, file_path').eq('subject_id', subjectId)
    let contextText = "";
    
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        try {
          const { data: fileBlob } = await supabase.storage.from('documents').download(doc.file_path)
          if (fileBlob) {
            const text = await fileBlob.text();
            // Limite alto para cobrir o máximo de conteúdo possível
            contextText += `\n--- CONTEÚDO DO ARQUIVO: ${doc.name} ---\n${text.substring(0, 30000)}\n`;
          }
        } catch (e) {
          console.error(`Erro ao processar ${doc.name}`);
        }
      }
    }

    // 2. Comportamento rigoroso focado na BASE DE CONHECIMENTOS
    let systemPrompt = `Você é o Professor Especialista do Estuda AÍ. 
    SUA FONTE ÚNICA DE VERDADE É O "CONTEXTO DOS DOCUMENTOS" ABAIXO.
    
    DIRETRIZES:
    - Se o usuário pedir um SIMULADO, você deve criar 10 questões de múltipla escolha.
    - Cada questão deve ser baseada em fatos, conceitos ou dados PRESENTES nos documentos fornecidos.
    - É PROIBIDO usar conhecimentos externos à base fornecida.
    - Se não houver conteúdo suficiente para 10 questões, crie o máximo possível mantendo a qualidade.`;
    
    if (action === 'quiz') {
      systemPrompt += `
      TAREFA: Gere um SIMULADO DE 10 QUESTÕES (JSON).
      REGRAS DO JSON:
      - Retorne APENAS o JSON puro, sem textos explicativos fora do bloco.
      - Estrutura: {"questions": [{"id": 1, "question": "...", "options": ["Opção 1", "Opção 2", "Opção 3", "Opção 4"], "correctIndex": 0, "explanation": "Explicação baseada no texto..."}]}
      - O "correctIndex" é a posição da resposta correta (0 a 3).
      - A "explanation" deve ser clara e educativa.`;
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "system", content: `CONTEXTO DOS DOCUMENTOS (BASE DE CONHECIMENTO):\n${contextText || "Nenhum documento disponível. Avise ao usuário para fazer upload de arquivos primeiro."}` },
      { role: "user", content: query }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: messages,
        temperature: 0.2 // Baixa temperatura para evitar alucinações
      })
    })

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content

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
    return new Response(JSON.stringify({ text: "Erro ao gerar simulado: " + err.message }), { headers: corsHeaders })
  }
})