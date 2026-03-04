import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const functionName = "delete-account";
  console.log(`[${functionName}] Solicitação de exclusão de conta recebida.`);

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Não autorizado', { status: 401, headers: corsHeaders })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ""
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ""
    
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE)

    // Pegamos o token do usuário para identificar quem está pedindo
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error(`[${functionName}] Erro ao validar usuário:`, authError);
      return new Response('Usuário inválido', { status: 401, headers: corsHeaders })
    }

    console.log(`[${functionName}] Excluindo usuário: ${user.id}`);

    // Exclui o usuário do Auth. 
    // Como as tabelas do banco possuem 'ON DELETE CASCADE', 
    // os registros em 'profiles', 'exams', 'quiz_history', etc, serão apagados automaticamente.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id)

    if (deleteError) {
      throw deleteError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error(`[${functionName}] Erro fatal:`, err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})