"use client";

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Bird } from 'lucide-react';

const ResetPassword = () => {
  return (
    <div className="min-h-screen bg-[#FAF6F1] dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="bg-study-primary inline-flex p-4 rounded-3xl text-white mb-6 shadow-lg">
            <Bird size={48} />
          </div>
          <h1 className="text-3xl font-black text-study-dark dark:text-white mb-2">Nova Senha</h1>
          <p className="text-study-medium dark:text-zinc-400 font-medium">Digite sua nova senha de acesso abaixo.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-study dark:shadow-none border border-study-light/20 dark:border-white/5">
          <Auth
            supabaseClient={supabase}
            view="update_password"
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(221.2, 83.2%, 53.3%)',
                    brandAccent: 'hsl(221.2, 83.2%, 43.3%)',
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
                  password_label: 'Nova Senha',
                  password_input_placeholder: 'No mínimo 6 caracteres',
                  button_label: 'Salvar Nova Senha',
                  loading_button_label: 'Salvando...',
                  confirmation_text: 'Sua senha foi atualizada com sucesso!',
                }
              },
            }}
            theme="light"
          />
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;