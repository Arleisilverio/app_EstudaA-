"use client";

import React, { useEffect, useState } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Bird, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    // Escuta mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'USER_UPDATED') {
        setIsSuccess(true);
      }
      if (event === 'SIGNED_IN' && isSuccess) {
        // Se o usuário entrar logo após atualizar, manda pra home em 2 segundos
        setTimeout(() => navigate('/'), 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, isSuccess]);

  return (
    <div className="min-h-screen bg-[#FAF6F1] dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="bg-study-primary inline-flex p-4 rounded-3xl text-white mb-6 shadow-lg">
            <Bird size={48} />
          </div>
          <h1 className="text-3xl font-black text-study-dark dark:text-white mb-2">
            {isSuccess ? "Senha Alterada!" : "Nova Senha"}
          </h1>
          <p className="text-study-medium dark:text-zinc-400 font-medium">
            {isSuccess 
              ? "Sua nova senha foi salva com sucesso." 
              : "Digite sua nova senha de acesso abaixo."}
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-study dark:shadow-none border border-study-light/20 dark:border-white/5">
          {!isSuccess ? (
            <Auth
              supabaseClient={supabase}
              view="update_password"
              showLinks={false}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: 'hsl(43, 100%, 59%)',
                      brandAccent: 'hsl(43, 100%, 49%)',
                      inputBackground: 'transparent',
                      inputText: 'inherit',
                    },
                    radii: {
                      buttonBorderRadius: '1rem',
                      inputBorderRadius: '1rem',
                    }
                  },
                },
              }}
              localization={{
                variables: {
                  update_password: {
                    password_label: 'Crie uma nova senha segura',
                    password_input_placeholder: 'No mínimo 6 caracteres',
                    button_label: 'Atualizar Minha Senha',
                    loading_button_label: 'Salvando nova senha...',
                  }
                },
              }}
              theme="light"
            />
          ) : (
            <div className="flex flex-col items-center py-4 space-y-6">
              <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-full text-green-600">
                <CheckCircle2 size={48} />
              </div>
              <p className="text-center text-sm text-study-medium">
                Você já pode acessar o aplicativo com sua nova senha.
              </p>
              <Button asChild className="w-full bg-study-primary text-white rounded-xl py-6 font-bold">
                <Link to="/login">Ir para o Login</Link>
              </Button>
            </div>
          )}
          
          {!isSuccess && (
            <div className="mt-8 text-center">
              <Link to="/login" className="text-xs font-bold text-study-primary uppercase tracking-widest hover:underline">
                Voltar para o Login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;