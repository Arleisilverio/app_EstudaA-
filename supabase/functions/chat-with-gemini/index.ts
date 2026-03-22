// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { subjectId, query, action, documentIds } = await req.json();
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Embedding da pergunta
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "text-embedding-3-small", input: query })
    });
    const embData = await embRes.json();
    const queryEmbedding = embData.data[0].embedding;

    // 2. Busca no Banco (Filtro por Matéria)
    const { data: chunks, error: matchError } = await supabase.rpc('match_document_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.15, // Reduzido para capturar qualquer relação
      match_count: 15,       // Aumentado para dar mais base à IA
      filter_subject_id: subjectId
    });

    if (matchError) throw matchError;

    // Se não houver chunks, a IA deve saber que não tem material
    const hasContext = chunks && chunks.length > 0;
    const contextText = hasContext 
      ? chunks.map(c => `[FONTE: ${c.metadata.document_name}] ${c.content}`).join("\n\n") 
      : "AVISO CRÍTICO: NENHUM MATERIAL ENCONTRADO NO BANCO DE DADOS PARA ESTA MATÉRIA.";

    // 3. Prompt Ultra-Restrito
    let systemPrompt = `Você é o Professor Virtual do Estuda AÍ.
    Sua ÚNICA fonte de conhecimento são os fragmentos de texto fornecidos abaixo.
    
    REGRAS INEGOCIÁVEIS:
    1. Se o contexto disser "NENHUM MATERIAL ENCONTRADO", responda: "Não há materiais de estudo carregados para esta matéria. Por favor, faça o upload de um PDF primeiro."
    2. NÃO use seu conhecimento geral. Se a resposta não estiver nos fragmentos, diga que o material não aborda o tema.
    3. Para QUIZ: Use apenas os fatos presentes nos textos para criar as perguntas.
    4. Para RESUMO: Sintetize apenas o que está escrito nos arquivos.`;

    if (action === 'quiz') {
      systemPrompt += `\n\nTAREFA: Gere um JSON com 10 questões baseadas nos textos. Estrutura: {"questions": [...]}`;
    }

    // 4. Resposta do GPT-4o mini
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `MATERIAIS DISPONÍVEIS:\n${contextText}\n\nSOLICITAÇÃO: ${query}` }
        ],
        temperature: 0.1 // Quase zero para evitar qualquer "criatividade"
      })
    });

    const result = await response.json();
    let finalContent = result.choices?.[0]?.message?.content;

    if (action === 'quiz') {
      finalContent = finalContent.replace(/```json/g, "").replace(/```/g, "").trim();
    }

    return new Response(JSON.stringify({ 
      text: finalContent,
      isQuiz: action === 'quiz',
      isSummary: action === 'summary',
      sources: chunks ? [...new Set(chunks.map(c => c.metadata.document_name))] : []
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: "Falha na consulta. Verifique se há arquivos na matéria." }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})