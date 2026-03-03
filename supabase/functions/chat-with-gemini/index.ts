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
    console.log(`[${functionName}] Matéria: ${subjectId}, Ação: ${action}`);
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!OPENAI_API_KEY) {
      console.error(`[${functionName}] Erro: OPENAI_API_KEY não configurada`);
      return new Response(JSON.stringify({ error: "Chave de API não configurada." }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // 1. Buscar Documentos
    console.log(`[${functionName}] Buscando documentos da matéria...`);
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('name, file_path')
      .eq('subject_id', subjectId);

    if (docsError) {
      console.error(`[${functionName}] Erro ao buscar documentos:`, docsError);
      throw docsError;
    }

    let contextText = "";
    if (documents && documents.length > 0) {
      console.log(`[${functionName}] Processando ${documents.length} documentos`);
      for (const doc of documents) {
        try {
          const { data: fileBlob, error: downloadError } = await supabase.storage.from('documents').download(doc.file_path)
          if (downloadError) {
            console.warn(`[${functionName}] Falha ao baixar ${doc.name}:`, downloadError);
            continue;
          }
          if (fileBlob) {
            const text = await fileBlob.text();
            contextText += `\n--- CONTEÚDO DO ARQUIVO: ${doc.name} ---\n${text.substring(0, 15000)}\n`;
          }
        } catch (e) {
          console.error(`[${functionName}] Erro inesperado ao ler ${doc.name}:`, e);
        }
      }
    } else {
      console.log(`[${functionName}] Nenhum documento encontrado para esta matéria.`);
    }

    // 2. Definir Prompts
    let systemPrompt = `Você é o Professor Especialista do Estuda AÍ. 
    SUA FONTE ÚNICA DE VERDADE É O "CONTEXTO DOS DOCUMENTOS" ABAIXO.
    
    DIRETRIZES:
    - Se o usuário pedir um SIMULADO, você DEVE criar EXATAMENTE 10 questões de múltipla escolha.
    - Se não houver contexto suficiente para 10 questões, use seu conhecimento geral MAS PRIORIZE o que estiver nos arquivos.
    - É PROIBIDO retornar qualquer texto antes ou depois do JSON se for um simulado.`;
    
    if (action === 'quiz') {
      systemPrompt += `
      TAREFA: Gere um SIMULADO DE 10 QUESTÕES em formato JSON puro.
      ESTRUTURA JSON OBRIGATÓRIA:
      {
        "questions": [
          {
            "id": 1,
            "question": "Texto da questão",
            "options": ["A", "B", "C", "D"],
            "correctIndex": 0,
            "explanation": "Explicação curta"
          }
        ]
      }`;
    }

    console.log(`[${functionName}] Chamando OpenAI...`);
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "system", content: `CONTEXTO DOS DOCUMENTOS:\n${contextText || "Base de dados vazia. Use seus conhecimentos gerais para ajudar o aluno."}` },
          { role: "user", content: query }
        ],
        temperature: 0.3
      })
    })

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${functionName}] Erro na API da OpenAI:`, errorText);
      throw new Error("Erro na comunicação com a IA");
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content
    console.log(`[${functionName}] Resposta recebida da OpenAI`);

    let finalContent = content;
    if (action === 'quiz') {
      // Limpeza agressiva de markdown/blocos de código
      finalContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    return new Response(JSON.stringify({ 
      text: finalContent,
      isQuiz: action === 'quiz',
      sources: documents?.map(d => d.name) || []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error(`[${functionName}] Erro crítico:`, err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})