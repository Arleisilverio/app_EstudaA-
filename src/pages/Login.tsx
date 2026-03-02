"use client";

import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { Bird, ShieldCheck } from 'lucide-react';

const LoginPage = () => {
  const { session, loading } = useAuth();

  if (loading) return null;
  if (session) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-[#FAF6F1] dark:bg-zinc-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="bg-study-primary inline-flex p-4 rounded-3xl text-white mb-6 shadow-lg">
            <Bird size={48} />
          </div>
          <h1 className="text-4xl font-black text-study-dark dark:text-white mb-2">Estuda AÍ</h1>
          <p className="text-study-medium dark:text-zinc-400 font-medium italic">Seu futuro começa aqui.</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] shadow-study dark:shadow-none border border-study-light/20 dark:border-white/5">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(221.2, 83.2%, 53.3%)',
                    brandAccent: 'hsl(221.2, 83.2%, 43.3%)',
                    inputBackground: 'transparent',
                    inputText: 'inherit',
                    inputPlaceholder: 'hsl(215.4, 16.3%, 46.9%)',
                    inputBorder: 'hsl(214.3, 31.8%, 91.4%)',
                    inputBorderFocus: 'hsl(221.2, 83.2%, 53.3%)',
                    inputBorderHover: 'hsl(221.2, 83.2%, 53.3%)',
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
                sign_up: {
                  email_label: 'Endereço de e-mail',
                  password_label: 'Crie uma senha',
                  email_input_placeholder: 'Seu melhor e-mail',
                  password_input_placeholder: 'Mínimo 6 caracteres',
                  button_label: 'Criar conta gratuita',
                  loading_button_label: 'Criando conta...',
                  social_provider_text: 'Entrar com {{provider}}',
                  link_text: 'Não tem uma conta? Cadastre-se agora',
                  confirmation_text: 'Verifique seu e-mail para confirmar o cadastro',
                },
                sign_in: {
                  email_label: 'E-mail',
                  password_label: 'Sua senha',
                  email_input_placeholder: 'seu@email.com',
                  password_input_placeholder: 'Sua senha secreta',
                  button_label: 'Entrar no aplicativo',
                  loading_button_label: 'Entrando...',
                  social_provider_text: 'Entrar com {{provider}}',
                  link_text: 'Já tem uma conta? Faça login',
                },
                forgotten_password: {
                  email_label: 'E-mail',
                  password_label: 'Senha',
                  email_input_placeholder: 'seu@email.com',
                  button_label: 'Enviar instruções de recuperação',
                  loading_button_label: 'Enviando instruções...',
                  link_text: 'Esqueceu sua senha?',
                  confirmation_text: 'Verifique seu e-mail para o link de recuperação',
                },
                update_password: {
                  password_label: 'Nova senha',
                  password_input_placeholder: 'Sua nova senha',
                  button_label: 'Atualizar senha',
                  loading_button_label: 'Atualizando...',
                  confirmation_text: 'Sua senha foi atualizada com sucesso',
                }
              },
            }}
            theme="light"
            providers={[]}
          />
          
          <div className="mt-8 pt-6 border-t border-study-light/20 dark:border-white/5 text-center">
            <Link 
              to="/terms" 
              className="inline-flex items-center gap-2 text-xs font-bold text-study-medium hover:text-study-primary transition-colors uppercase tracking-widest"
            >
              <ShieldCheck size={14} />
              Termos de Uso e Privacidade
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;