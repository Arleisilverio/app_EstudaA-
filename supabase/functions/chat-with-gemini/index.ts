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

  const functionName = "chat-with-gemini";
  console.log(`[${functionName}] Recebendo nova requisição`);

  try {
    const { subjectId, query, action } = await req.json()
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "Chave de API não configurada." }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 1. Buscar metadados dos documentos
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('name, file_path')
      .eq('subject_id', subjectId);

    if (docsError) throw docsError;

    // 2. Baixar conteúdos
    let contextText = "";
    if (documents && documents.length > 0) {
      const downloadPromises = documents.map(async (doc) => {
        try {
          const { data: fileBlob, error: downloadError } = await supabase.storage.from('documents').download(doc.file_path)
          if (downloadError) return null;
          const text = await fileBlob.text();
          return `\n--- FONTE: ${doc.name} ---\n${text.substring(0, 8000)}\n`;
        } catch (e) {
          return null;
        }
      });

      const results = await Promise.all(downloadPromises);
      contextText = results.filter(r => r !== null).join("");
    }

    // 3. Definir Prompts Otimizados
    const numDocs = documents?.length || 0;
    
    let systemPrompt = `Você é o Professor Especialista do Estuda AÍ. 
    Seu objetivo é auxiliar o aluno com base nos documentos fornecidos.
    
    DIRETRIZES:
    - Se houver muito conteúdo, foque nos conceitos mais importantes para provas.
    - Seja direto e acadêmico.`;
    
    if (action === 'quiz') {
      const quizTask = numDocs <= 1 
        ? "Gere um SIMULADO DE EXATAMENTE 10 QUESTÕES de nível INTERMEDIÁRIO PARA AVANÇADO." 
        : `Gere um SIMULADO ABRANGENTE de nível INTERMEDIÁRIO PARA AVANÇADO. Como há múltiplas fontes (${numDocs}), você deve decidir a quantidade ideal de questões (entre 10 e 20) para cobrir os pontos essenciais.`;

      systemPrompt += `
      TAREFA: ${quizTask} em formato JSON puro.
      - NÃO gere perguntas de "O que é...". Gere perguntas de "Como se aplica...", "Analise o caso...", ou "Identifique a exceção...".
      - Dificuldade: As perguntas não devem ser óbvias. Foque em interpretação e análise crítica do material.
      - Distratores (opções incorretas): Devem ser plausíveis e baseados em erros comuns do conteúdo, desafiando o aluno a pensar.
      - Não escreva nada além do JSON.
      
      ESTRUTURA JSON:
      {
        "questions": [
          {
            "id": 1,
            "question": "Pergunta desafiadora baseada no texto...",
            "options": ["A", "B", "C", "D"],
            "correctIndex": 0,
            "explanation": "Explicação detalhada da lógica da questão."
          }
        ]
      }`;
    }

    // 4. Chamada OpenAI
    const model = action === 'quiz' ? "gpt-4o-mini" : "gpt-4o";

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "system", content: `CONTEXTO DAS FONTES PARA O SIMULADO:\n${contextText || "Use seus conhecimentos gerais avançados sobre o tema."}` },
          { role: "user", content: query }
        ],
        temperature: 0.5
      })
    })

    if (!response.ok) throw new Error("Erro na API da OpenAI");

    const result = await response.json()
    let finalContent = result.choices?.[0]?.message?.content

    if (action === 'quiz') {
      finalContent = finalContent.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    return new Response(JSON.stringify({ 
      text: finalContent,
      isQuiz: action === 'quiz',
      sources: documents?.map(d => d.name) || []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error(`[${functionName}] Erro:`, err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})