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
        extractedText = data.pages
          .map(page => page.content.map(item => item.str).join(" "))
          .join("\n\n");
      } catch (e) {
        extractedText = new TextDecoder().decode(uint8Array).replace(/[^\x20-\x7E\u00A0-\u00FF]/g, " ");
      }
    } else {
      extractedText = new TextDecoder().decode(uint8Array);
    }

    let cleanText = extractedText.replace(/\s+/g, " ").trim();
    
    if (cleanText.length < 10) throw new Error("Documento sem texto extraível.");

    // CHUNKING (Blocos maiores para melhor contexto)
    const chunks: string[] = [];
    const targetSize = 1000;
    for (let i = 0; i < cleanText.length; i += targetSize) {
      chunks.push(cleanText.substring(i, i + targetSize));
    }

    // BATCH EMBEDDINGS (MUITO MAIS RÁPIDO)
    console.log(`[${functionName}] Gerando embeddings para ${chunks.length} blocos...`);
    const embRes = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: "text-embedding-3-small", input: chunks })
    });

    if (!embRes.ok) throw new Error("Falha na API de Embeddings");
    const embData = await embRes.json();

    // Inserção em massa
    const inserts = chunks.map((chunk, idx) => ({
      document_id: doc.id,
      content: chunk,
      embedding: embData.data[idx].embedding,
      metadata: { subject_id: doc.subject_id, document_name: doc.name }
    }));

    const { error: insertError } = await supabase.from('document_chunks').insert(inserts);
    if (insertError) throw insertError;

    await supabase.from('documents').update({ status: 'ready' }).eq('id', doc.id);

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
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