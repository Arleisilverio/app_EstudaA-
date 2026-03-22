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

    // 1. Buscar metadados do documento
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) throw new Error("Documento não encontrado.");

    // 2. Baixar o arquivo do Storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.file_path);

    if (downloadError) throw new Error("Erro ao baixar arquivo.");

    // 3. Extração de Texto
    // Convertemos o binário para texto e limpamos caracteres de controle que quebram o RAG
    const fileArrayBuffer = await fileBlob.arrayBuffer();
    const rawText = new TextDecoder().decode(fileArrayBuffer);
    
    // Limpeza agressiva de caracteres não-imprimíveis (comum em PDFs binários)
    const fullText = rawText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ");
    
    if (fullText.length < 20) {
      throw new Error("O conteúdo extraído é muito curto. Verifique se o arquivo contém texto legível.");
    }

    // 4. Divisão em partes (Chunking)
    const chunks: string[] = [];
    const chunkSize = 800;
    const overlap = 150;

    for (let i = 0; i < fullText.length; i += (chunkSize - overlap)) {
      const chunk = fullText.substring(i, i + chunkSize).trim();
      if (chunk.length > 50) chunks.push(chunk);
    }

    console.log(`[${functionName}] Gerando embeddings para ${chunks.length} partes.`);

    // 5. Gerar Embeddings e Salvar
    for (const chunk of chunks) {
      const embRes = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: "text-embedding-3-small", input: chunk })
      });

      if (!embRes.ok) continue;

      const embData = await embRes.json();
      const embedding = embData.data[0].embedding;

      await supabase.from('document_chunks').insert({
        document_id: doc.id,
        content: chunk,
        embedding: embedding,
        metadata: { subject_id: doc.subject_id, document_name: doc.name }
      });
    }

    // 6. Marcar como pronto
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
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})