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

    console.log(`[${functionName}] Iniciando limpeza profunda do documento: ${documentId}`);
    
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !doc) throw new Error("Documento não encontrado.");

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.file_path);

    if (downloadError) throw new Error("Falha ao recuperar arquivo.");

    const fileArrayBuffer = await fileBlob.arrayBuffer();
    const rawText = new TextDecoder().decode(fileArrayBuffer);
    
    // --- LIMPEZA PROFUNDA (Deep Cleaning) ---
    let cleanText = rawText
      // 1. Remove caracteres de controle e lixo binário (ASCII 0-31 e outros)
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
      // 2. Remove sequências repetitivas de símbolos que parecem "lixo de slide" (ex: ********* ou ---------)
      .replace(/([*#\-_=]){3,}/g, " ")
      // 3. Remove URLs e caminhos de arquivos que poluem o contexto
      .replace(/(https?:\/\/[^\s]+)/g, "")
      // 4. Normaliza espaços e quebras de linha
      .replace(/\s+/g, " ")
      // 5. Remove caracteres especiais isolados que não formam palavras
      .replace(/\s[^a-zA-Z0-9áéíóúàèìòùâêîôûãõçÁÉÍÓÚÀÈÌÒÙÂÊÎÔÛÃÕÇ]\s/g, " ")
      .trim();
    
    // Diagnóstico de qualidade
    console.log(`[${functionName}] Amostra do texto limpo: ${cleanText.substring(0, 100)}...`);

    if (cleanText.length < 30) {
      console.warn(`[${functionName}] Texto insuficiente após limpeza.`);
      throw new Error("O arquivo contém apenas imagens ou o texto está ilegível.");
    }

    // CHUNKING (Divisão em blocos)
    // Para slides, blocos menores (600 chars) funcionam melhor para não misturar assuntos de slides diferentes
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    const chunks: string[] = [];
    let currentChunk = "";
    const targetSize = 600; 

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > targetSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += " " + sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

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

    return new Response(JSON.stringify({ success: true, inserted: successCount }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    console.error(`[${functionName}] Erro:`, err.message);
    if (currentDocId) {
      const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
      await supabase.from('documents').update({ status: 'error' }).eq('id', currentDocId);
    }
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
})