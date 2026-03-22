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

    // 1. Buscar metadados
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) throw new Error("Documento não encontrado no banco.");

    // 2. Baixar arquivo
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.file_path);

    if (downloadError) throw new Error("Erro ao baixar arquivo do Storage.");

    // 3. Extrair texto
    // Nota: Para PDFs complexos, o ideal é uma biblioteca de parsing. 
    // Aqui tentamos extrair o texto bruto disponível.
    const fullText = await fileBlob.text();
    
    if (!fullText || fullText.length < 10) {
      throw new Error("O arquivo parece estar vazio ou é um PDF protegido/imagem.");
    }

    // 4. Chunking
    const chunks: string[] = [];
    const chunkSize = 800; // Reduzido para melhor precisão
    const overlap = 150;

    for (let i = 0; i < fullText.length; i += (chunkSize - overlap)) {
      const chunk = fullText.substring(i, i + chunkSize).trim();
      if (chunk.length > 20) chunks.push(chunk);
    }

    console.log(`[${functionName}] Processando ${chunks.length} partes para: ${doc.name}`);

    // 5. Gerar Embeddings em lotes (Batching)
    for (const chunk of chunks) {
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: "text-embedding-3-small", input: chunk })
      });

      if (!embeddingResponse.ok) continue;

      const embeddingData = await embeddingResponse.json();
      const embedding = embeddingData.data[0].embedding;

      await supabase.from('document_chunks').insert({
        document_id: doc.id,
        content: chunk,
        embedding: embedding,
        metadata: { subject_id: doc.subject_id, document_name: doc.name }
      });
    }

    // 6. Finalizar
    await supabase.from('documents').update({ status: 'ready' }).eq('id', doc.id);

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error(`[${functionName}] Erro Crítico:`, err.message);
    
    // Se falhar, marca como erro no banco para o usuário saber
    if (currentDocId) {
      const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? "";
      const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? "";
      const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
      await supabase.from('documents').update({ status: 'error' }).eq('id', currentDocId);
    }

    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})