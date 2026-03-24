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

    if (downloadError) throw new Error("Erro ao baixar o arquivo do servidor.");

    const fileArrayBuffer = await fileBlob.arrayBuffer();
    const uint8Array = new Uint8Array(fileArrayBuffer);
    
    let extractedText = "";

    // 3. Extração de Texto
    if (doc.name.toLowerCase().endsWith('.pdf')) {
      try {
        const pdfExtract = new PDFExtract();
        const data = await pdfExtract.extractBuffer(uint8Array);
        // Extração robusta preservando espaços e quebras
        extractedText = data.pages
          .map(page => page.content.map(item => item.str).join(" "))
          .join("\n\n");
      } catch (e) {
        throw new Error("Este PDF está protegido ou é uma imagem escaneada sem texto.");
      }
    } else {
      extractedText = new TextDecoder().decode(uint8Array);
    }

    // 4. Limpeza Inteligente (Preserva acentos e símbolos jurídicos)
    let cleanText = extractedText
      .replace(/\s+/g, " ")
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "") // Remove apenas caracteres de controle lixo
      .trim();
    
    if (cleanText.length < 50) {
      throw new Error("O documento parece não ter texto legível (pode ser uma imagem).");
    }

    // 5. Divisão em Blocos (Chunks)
    const chunks: string[] = [];
    const chunkSize = 1200; // Blocos maiores para melhor contexto
    const overlap = 200;   // Sobreposição para não perder sentido entre blocos
    
    for (let i = 0; i < cleanText.length; i += (chunkSize - overlap)) {
      chunks.push(cleanText.substring(i, i + chunkSize));
    }

    // 6. Gerar Embeddings (Padrão 1536 para máxima precisão)
    const batchSize = 20;
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

      if (!embRes.ok) throw new Error("Falha na comunicação com o cérebro da IA.");
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

    // 7. Finaliza com Sucesso
    await supabase.from('documents').update({ status: 'ready' }).eq('id', doc.id);

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error(`[${functionName}] Erro Crítico:`, err.message);
    if (currentDocId) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
      await supabase.from('documents').update({ status: 'error' }).eq('id', currentDocId);
    }
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 200, // Retornamos 200 para o app tratar a mensagem de erro amigavelmente
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})