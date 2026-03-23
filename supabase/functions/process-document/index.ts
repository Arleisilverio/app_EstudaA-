// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { PDFExtract } from "https://esm.sh/pdf.js-extract@0.2.1"

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

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) throw new Error("Documento não encontrado.");

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.file_path);

    if (downloadError) throw new Error("Erro ao baixar arquivo.");

    const fileArrayBuffer = await fileBlob.arrayBuffer();
    const uint8Array = new Uint8Array(fileArrayBuffer);
    
    let extractedText = "";

    if (doc.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfExtract = new PDFExtract();
        const data = await pdfExtract.extractBuffer(uint8Array);
        // Extração limpa de texto por página
        extractedText = data.pages
          .map(page => page.content.map(item => item.str).join(" "))
          .join("\n\n");
      } catch (e) {
        console.error(`[${functionName}] Erro na extração do PDF:`, e);
        throw new Error("Este PDF parece ser uma imagem ou está protegido. Não foi possível extrair o texto.");
      }
    } else {
      extractedText = new TextDecoder().decode(uint8Array);
    }

    // Limpeza rigorosa: remove caracteres não imprimíveis e excesso de espaços
    let cleanText = extractedText.replace(/[^\x20-\x7E\u00A0-\u00FF\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    
    if (cleanText.length < 20) {
      throw new Error("O documento não contém texto legível suficiente para análise (pode ser uma imagem escaneada).");
    }

    const chunks: string[] = [];
    const targetSize = 1000;
    for (let i = 0; i < cleanText.length; i += targetSize) {
      const chunk = cleanText.substring(i, i + targetSize).trim();
      if (chunk) chunks.push(chunk);
    }

    const batchSize = 50;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const currentBatch = chunks.slice(i, i + batchSize);
      
      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model: "text-embedding-3-small", 
          input: currentBatch,
          dimensions: 768 
        })
      });

      if (!embRes.ok) throw new Error("Falha na API de Inteligência Artificial.");
      const embData = await embRes.json();

      const inserts = currentBatch.map((chunk, idx) => ({
        document_id: doc.id,
        content: chunk,
        embedding: embData.data[idx].embedding,
        metadata: { subject_id: doc.subject_id, document_name: doc.name }
      }));

      const { error: insertError } = await supabase.from('document_chunks').insert(inserts);
      if (insertError) throw insertError;
    }

    await supabase.from('documents').update({ status: 'ready' }).eq('id', doc.id);

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error(`[${functionName}] Erro:`, err.message);
    if (currentDocId) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
      await supabase.from('documents').update({ status: 'error' }).eq('id', currentDocId);
    }
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})