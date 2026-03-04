"use client";

import React, { useState } from 'react';
import { Settings as SettingsIcon, ShieldAlert, Trash2, ChevronRight, LogOut, ExternalLink, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import BottomNav from "@/components/BottomNav";
import { showError, showSuccess } from "@/utils/toast";
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import FeedbackSection from '@/components/FeedbackSection';

const SettingsPage = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleLogout = async () => {
    try {
      showSuccess("Saindo da conta...");
      await signOut();
      navigate("/login");
    } catch (error) {
      showError("Erro ao sair da conta");
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account');

      if (error) throw error;

      showSuccess("Conta excluída com sucesso.");
      await signOut();
      navigate("/login");
    } catch (error: any) {
      console.error("Erro ao excluir conta:", error);
      showError("Não foi possível excluir sua conta agora.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-40">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-study-primary/10 p-3 rounded-2xl">
            <SettingsIcon className="text-study-primary" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-study-dark dark:text-white">Ajustes</h1>
            <p className="text-study-medium text-sm font-medium">Configurações do aplicativo</p>
          </div>
        </div>

        <div className="space-y-10">
          {/* Nova Seção de Feedback */}
          <FeedbackSection />

          {/* Legal e Suporte */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-study-medium uppercase tracking-widest ml-1">Legal e Suporte</h2>
            <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                <button 
                  onClick={() => navigate('/terms')}
                  className="w-full flex items-center justify-between p-4 px-6 border-b border-study-light/20 dark:border-zinc-800 hover:bg-study-light/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl">
                      <ShieldAlert size={18} className="text-green-600" />
                    </div>
                    <span className="font-bold text-study-dark dark:text-zinc-200">Termos de Uso</span>
                  </div>
                  <ChevronRight size={18} className="text-study-medium" />
                </button>
                <button 
                  onClick={() => navigate('/support')}
                  className="w-full flex items-center justify-between p-4 px-6 hover:bg-study-light/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
                      <ExternalLink size={18} className="text-blue-600" />
                    </div>
                    <span className="font-bold text-study-dark dark:text-zinc-200">Ajuda e Suporte</span>
                  </div>
                  <ChevronRight size={18} className="text-study-medium" />
                </button>
              </CardContent>
            </Card>
          </section>

          {/* Zona de Perigo */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-red-500 uppercase tracking-widest ml-1">Gerenciamento de Conta</h2>
            <Card className="border-2 border-red-100 dark:border-red-900/20 shadow-none bg-red-50/30 dark:bg-red-900/5 rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 px-6 text-red-600 border-b border-red-100/50 dark:border-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <Trash2 size={18} />
                        <span className="font-bold">Excluir Minha Conta</span>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl border-none bg-zinc-900 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-xl font-bold">Tem certeza absoluta?</AlertDialogTitle>
                      <AlertDialogDescription className="text-zinc-400">
                        Esta ação é **irreversível**. Todos os seus dados, históricos de simulados, provas agendadas e documentos enviados serão excluídos permanentemente de nossos servidores.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="rounded-xl bg-zinc-800 border-none text-white hover:bg-zinc-700">Não, manter conta</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteAccount}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
                      >
                        {isDeleting ? <Loader2 className="animate-spin" /> : "Sim, excluir tudo"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 px-6 text-study-medium hover:bg-study-light/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LogOut size={18} />
                    <span className="font-bold">Sair do Aplicativo</span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      <footer className="absolute bottom-32 left-0 right-0 text-center">
        <p className="text-[9px] font-bold text-study-medium/50 uppercase tracking-[0.2em]">
          Estuda AÍ • Versão 1.2.26 • 2026
        </p>
      </footer>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;