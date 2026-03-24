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
    
    console.log(`[${functionName}] Iniciando processamento do documento: ${documentId}`);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? "";
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? "";
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? "";

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Busca o documento
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) throw new Error("Documento não encontrado no banco.");

    // 2. Baixa o arquivo
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.file_path);

    if (downloadError) throw new Error(`Erro ao baixar do storage: ${downloadError.message}`);

    const fileArrayBuffer = await fileBlob.arrayBuffer();
    
    // 3. Extração de Texto (Motor Simplificado e Robusto)
    let extractedText = "";
    
    if (doc.name.toLowerCase().endsWith('.pdf')) {
      // Usando um decodificador de texto como fallback para PDFs que são puramente texto
      // ou processando via API se necessário. Para garantir, vamos tentar decodificar o básico.
      extractedText = new TextDecoder("utf-8", { fatal: false }).decode(new Uint8Array(fileArrayBuffer));
      
      // Limpeza de caracteres não-imprimíveis comuns em PDFs
      extractedText = extractedText.replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, " ");
    } else {
      extractedText = new TextDecoder().decode(new Uint8Array(fileArrayBuffer));
    }

    // 4. Limpeza e Validação
    let cleanText = extractedText
      .replace(/\s+/g, " ")
      .trim();
    
    console.log(`[${functionName}] Texto extraído. Tamanho: ${cleanText.length} caracteres.`);

    if (cleanText.length < 50) {
      // Se falhou a extração direta, vamos tentar uma limpeza mais leve
      cleanText = extractedText.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôûÂÊÎÔÛãõÃÕçÇ\s.,;?!()-]/g, " ");
      if (cleanText.length < 50) throw new Error("O documento parece não conter texto legível (pode ser uma imagem/scanner).");
    }

    // 5. Chunking (Blocos menores para melhor precisão)
    const chunks: string[] = [];
    const chunkSize = 800;
    const overlap = 150;
    
    for (let i = 0; i < cleanText.length; i += (chunkSize - overlap)) {
      const chunk = cleanText.substring(i, i + chunkSize);
      if (chunk.length > 10) chunks.push(chunk);
    }

    console.log(`[${functionName}] Gerando ${chunks.length} blocos de conhecimento.`);

    // 6. Embeddings e Insert
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const currentBatch = chunks.slice(i, i + batchSize);
      
      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: "text-embedding-3-small", 
          input: currentBatch,
          dimensions: 1536 
        })
      });

      const embData = await embRes.json();
      if (!embData.data) throw new Error("Erro na API de Embeddings da OpenAI.");

      const inserts = currentBatch.map((chunk, idx) => ({
        document_id: doc.id,
        content: chunk,
        embedding: embData.data[idx].embedding,
        metadata: { subject_id: doc.subject_id, document_name: doc.name }
      }));

      const { error: insertError } = await supabase.from('document_chunks').insert(inserts);
      if (insertError) console.error(`[${functionName}] Erro ao inserir chunks:`, insertError);
    }

    await supabase.from('documents').update({ status: 'ready' }).eq('id', doc.id);
    console.log(`[${functionName}] Documento processado com sucesso!`);

    return new Response(JSON.stringify({ success: true, chunks: chunks.length }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error(`[${functionName}] ERRO CRÍTICO:`, err.message);
    if (currentDocId) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
      await supabase.from('documents').update({ status: 'error' }).eq('id', currentDocId);
    }
    return new Response(JSON.stringify({ error: err.message }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})