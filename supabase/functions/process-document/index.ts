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

    if (!OPENAI_API_KEY) throw new Error("Configuração ausente: OPENAI_API_KEY");

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    console.log(`[${functionName}] Processando documento: ${documentId}`);
    
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) throw new Error("Documento não encontrado no banco.");

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.file_path);

    if (downloadError) throw new Error("Erro ao baixar arquivo do Storage.");

    const fileArrayBuffer = await fileBlob.arrayBuffer();
    const uint8Array = new Uint8Array(fileArrayBuffer);
    
    let extractedText = "";

    // Se for PDF, usamos o extrator. Se for texto, usamos o decoder simples.
    if (doc.name.toLowerCase().endsWith('.pdf')) {
      console.log(`[${functionName}] Extraindo texto de PDF...`);
      try {
        // Nota: Em Edge Functions, a extração de PDF pode ser pesada. 
        // Usamos uma abordagem compatível com Deno.
        const pdfExtract = new PDFExtract();
        const data = await pdfExtract.extractBuffer(uint8Array);
        extractedText = data.pages
          .map(page => page.content.map(item => item.str).join(" "))
          .join("\n\n");
      } catch (e) {
        console.error(`[${functionName}] Erro no parser de PDF:`, e);
        // Fallback para tentativa de leitura bruta se o parser falhar
        extractedText = new TextDecoder().decode(uint8Array).replace(/[^\x20-\x7E\u00A0-\u00FF]/g, " ");
      }
    } else {
      extractedText = new TextDecoder().decode(uint8Array);
    }

    // --- LIMPEZA ---
    let cleanText = extractedText
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
      .replace(/([*#\-_=]){3,}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    if (cleanText.length < 20) {
      throw new Error("O documento parece estar vazio ou contém apenas imagens (sem texto extraível).");
    }

    // CHUNKING
    const chunks: string[] = [];
    const targetSize = 800;
    for (let i = 0; i < cleanText.length; i += targetSize) {
      chunks.push(cleanText.substring(i, i + targetSize));
    }

    // EMBEDDINGS
    let successCount = 0;
    for (const chunk of chunks) {
      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: "text-embedding-3-small", input: chunk })
      });

      if (!embRes.ok) continue;

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

    await supabase.from('documents').update({ status: 'ready' }).eq('id', doc.id);

    return new Response(JSON.stringify({ success: true, chunks: successCount }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error(`[${functionName}] Erro Crítico:`, err.message);
    if (currentDocId) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
      await supabase.from('documents').update({ status: 'error' }).eq('id', currentDocId);
    }
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 200, // Retornamos 200 com o erro no corpo para o front tratar melhor
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})