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

    // 3. Definir Prompts Otimizados com a nova lógica de questões
    const numDocs = documents?.length || 0;
    
    let systemPrompt = `Você é o Professor Especialista do Estuda AÍ. 
    Seu objetivo é auxiliar o aluno com base nos documentos fornecidos.
    
    DIRETRIZES:
    - Se houver muito conteúdo, foque nos conceitos mais importantes para provas.
    - Seja direto e acadêmico.`;
    
    if (action === 'quiz') {
      // Lógica de quantidade de questões solicitada pelo usuário
      const quizTask = numDocs <= 1 
        ? "Gere um SIMULADO DE EXATAMENTE 10 QUESTÕES de múltipla escolha." 
        : `Gere um SIMULADO ABRANGENTE de múltipla escolha. Como há múltiplas fontes (${numDocs}), você deve decidir a quantidade ideal de questões (entre 10 e 20) para cobrir os pontos essenciais de cada documento fornecido.`;

      systemPrompt += `
      TAREFA: ${quizTask} em formato JSON puro.
      - Não escreva nada além do JSON.
      - Use o contexto das fontes para criar questões variadas.
      - Se houver múltiplas fontes, você DEVE garantir que existam questões abordando o conteúdo de cada uma delas.
      
      ESTRUTURA JSON:
      {
        "questions": [
          {
            "id": 1,
            "question": "Pergunta baseada no texto...",
            "options": ["A", "B", "C", "D"],
            "correctIndex": 0,
            "explanation": "Explicação do porquê a alternativa está correta."
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
          { role: "system", content: `CONTEXTO DAS FONTES:\n${contextText || "Use seus conhecimentos gerais."}` },
          { role: "user", content: query }
        ],
        temperature: 0.4
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