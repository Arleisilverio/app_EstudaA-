// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const functionName = "process-document";
  let currentDocId = null;

  try {
    const { documentId } = await req.json();
    currentDocId = documentId;
    
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? "";
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? "";
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? "";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // ETAPA 1: VALIDAÇÃO DE UPLOAD
    console.log(`[${functionName}] Iniciando validação do documento: ${documentId}`);
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) {
      console.error(`[${functionName}] Erro: Documento não encontrado no banco.`);
      throw new Error("Documento não encontrado.");
    }

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.file_path);

    if (downloadError) {
      console.error(`[${functionName}] Erro no download do Storage:`, downloadError);
      throw new Error("Falha ao recuperar arquivo do storage.");
    }

    // Extração e Limpeza
    const fileArrayBuffer = await fileBlob.arrayBuffer();
    const rawText = new TextDecoder().decode(fileArrayBuffer);
    
    // Limpeza profunda: remove caracteres de controle e normaliza espaços
    const cleanText = rawText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    if (cleanText.length < 50) {
      console.warn(`[${functionName}] Texto extraído insuficiente (${cleanText.length} chars).`);
      throw new Error("O arquivo parece estar vazio ou é uma imagem sem OCR.");
    }

    // ETAPA 2: PROCESSAMENTO (CHUNKING SEMÂNTICO)
    // Dividimos por sentenças para não quebrar o contexto no meio de uma explicação
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    const chunks: string[] = [];
    let currentChunk = "";
    const targetSize = 800; // Alinhado com a Etapa 2 (500-1000)

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > targetSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += " " + sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    console.log(`[${functionName}] Texto processado em ${chunks.length} chunks.`);

    // ETAPA 3 & 4: EMBEDDINGS E ARMAZENAMENTO
    let successCount = 0;
    for (const chunk of chunks) {
      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: "text-embedding-3-small", input: chunk })
      });

      if (!embRes.ok) {
        console.error(`[${functionName}] Falha ao gerar embedding para chunk.`);
        continue;
      }

      const embData = await embRes.json();
      const embedding = embData.data[0].embedding;

      const { error: insertError } = await supabase.from('document_chunks').insert({
        document_id: doc.id,
        content: chunk,
        embedding: embedding,
        metadata: { subject_id: doc.subject_id, document_name: doc.name }
      });

      if (!insertError) successCount++;
    }

    console.log(`[${functionName}] Sucesso: ${successCount}/${chunks.length} chunks armazenados.`);

    await supabase.from('documents').update({ status: 'ready' }).eq('id', doc.id);

    return new Response(JSON.stringify({ 
      success: true, 
      chunks: chunks.length,
      inserted: successCount 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    console.error(`[${functionName}] MODO DIAGNÓSTICO ATIVADO:`, err.message);
    if (currentDocId) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
      await supabase.from('documents').update({ status: 'error' }).eq('id', currentDocId);
    }
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})