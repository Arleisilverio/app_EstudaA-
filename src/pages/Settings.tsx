"use client";

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldAlert, Trash2, ChevronRight, LogOut, ExternalLink, Loader2, UserPlus, GraduationCap, X, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";

// E-mails com permissão total de administrador
const ADMIN_EMAILS = ['arlei85@hotmail.com', 'arlei.se.silverio85@gmail.com'];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { signOut, isAdmin: authIsAdmin, isProfessor, user, role } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [authorizedEmails, setAuthorizedEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);

  // Considera admin se tiver o cargo no banco OU se for um dos e-mails mestres
  const isAdmin = authIsAdmin || (user?.email && ADMIN_EMAILS.includes(user.email));

  useEffect(() => {
    if (isAdmin) fetchAuthorizedEmails();
  }, [isAdmin]);

  const fetchAuthorizedEmails = async () => {
    setLoadingEmails(true);
    try {
      const { data } = await supabase
        .from('authorized_professor_emails')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) setAuthorizedEmails(data);
    } catch (err) {
      console.error("Erro ao carregar e-mails:", err);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleAuthorizeEmail = async () => {
    if (!newEmail.includes('@')) return showError("Digite um e-mail válido");
    
    const { error } = await supabase
      .from('authorized_professor_emails')
      .insert([{ email: newEmail.trim().toLowerCase(), added_by: user?.id }]);
    
    if (error) {
      showError("Erro ao autorizar. Talvez o e-mail já esteja na lista.");
    } else {
      showSuccess("Professor autorizado com sucesso!");
      setNewEmail("");
      fetchAuthorizedEmails();
    }
  };

  const handleRemoveAuth = async (email: string) => {
    const { error } = await supabase
      .from('authorized_professor_emails')
      .delete()
      .eq('email', email);
    
    if (!error) {
      showSuccess("Autorização removida");
      fetchAuthorizedEmails();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      showSuccess("Até logo!");
      navigate("/login");
    } catch (error) {
      showError("Erro ao sair");
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase.functions.invoke('delete-account');
      if (error) throw error;
      showSuccess("Sua conta foi excluída.");
      await signOut();
      navigate("/login");
    } catch (error: any) {
      showError("Erro ao excluir conta.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-40">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-study-primary/10 p-3 rounded-2xl">
              <SettingsIcon className="text-study-primary" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-study-dark dark:text-white">Ajustes</h1>
              <p className="text-study-medium text-sm font-medium">Configurações e Gestão</p>
            </div>
          </div>

          {/* Badge de Nível de Acesso */}
          <div className="flex flex-col items-end gap-1">
             {isAdmin ? (
               <Badge className="bg-study-primary text-zinc-900 border-none font-black flex gap-1 animate-pulse">
                 <ShieldCheck size={12} /> ADMIN
               </Badge>
             ) : isProfessor ? (
               <Badge className="bg-blue-500 text-white border-none font-black flex gap-1">
                 <GraduationCap size={12} /> PROFESSOR
               </Badge>
             ) : (
               <Badge variant="outline" className="text-study-medium border-study-light/30">ESTUDANTE</Badge>
             )}
          </div>
        </div>

        <div className="space-y-10">
          {/* SEÇÃO DO PROFESSOR (Visível para professores e admins) */}
          {(isAdmin || isProfessor) && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold text-study-primary uppercase tracking-widest ml-1">Portal Exclusivo</h2>
              <Button 
                onClick={() => navigate('/professor-portal')}
                className="w-full bg-study-primary/10 hover:bg-study-primary/20 text-study-primary rounded-3xl py-8 h-auto flex items-center justify-between px-6 border border-study-primary/20"
              >
                <div className="flex items-center gap-4">
                  <GraduationCap size={32} />
                  <div className="text-left">
                    <span className="font-black text-lg block">Portal do Professor</span>
                    <span className="text-[10px] uppercase font-bold opacity-70">Gerenciar Matérias e Arquivos</span>
                  </div>
                </div>
                <ChevronRight />
              </Button>
            </section>
          )}

          {/* SEÇÃO DE ADMINISTRAÇÃO (Apenas para Administradores) */}
          {isAdmin && (
            <section className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <h2 className="text-xs font-bold text-study-medium uppercase tracking-widest">Autorizar Professores</h2>
                <Badge variant="outline" className="text-[9px] border-study-primary text-study-primary">CONTROLE DE ACESSO</Badge>
              </div>
              <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Email do professor..." 
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                      className="rounded-xl h-12 bg-zinc-800/50 border-zinc-700 text-white"
                    />
                    <Button onClick={handleAuthorizeEmail} className="bg-study-primary h-12 w-12 p-0 rounded-xl shrink-0">
                      <UserPlus size={20} className="text-zinc-900" />
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                    {loadingEmails ? (
                      <div className="flex justify-center py-4"><Loader2 className="animate-spin text-study-primary" size={20} /></div>
                    ) : authorizedEmails.length > 0 ? (
                      authorizedEmails.map(auth => (
                        <div key={auth.email} className="flex items-center justify-between p-3.5 bg-zinc-800/40 rounded-2xl border border-white/5 group">
                          <span className="text-xs font-bold text-zinc-300 truncate flex-1">{auth.email}</span>
                          <button 
                            onClick={() => handleRemoveAuth(auth.email)} 
                            className="text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-colors opacity-60 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-6 text-[10px] text-study-medium uppercase font-bold opacity-40">Nenhum professor autorizado</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </section>
          )}

          <FeedbackSection />

          <section className="space-y-3">
            <h2 className="text-xs font-bold text-study-medium uppercase tracking-widest ml-1">Legal e Suporte</h2>
            <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                <button 
                  onClick={() => navigate('/terms')}
                  className="w-full flex items-center justify-between p-4 px-6 border-b border-white/5 hover:bg-study-light/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl">
                      <ShieldAlert size={18} className="text-green-600" />
                    </div>
                    <span className="font-bold text-study-dark dark:text-zinc-200 text-sm">Legal e Privacidade</span>
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
                    <span className="font-bold text-study-dark dark:text-zinc-200 text-sm">Suporte e Desenvolvedor</span>
                  </div>
                  <ChevronRight size={18} className="text-study-medium" />
                </button>
              </CardContent>
            </Card>
          </section>

          <section className="space-y-3">
            <h2 className="text-xs font-bold text-red-500 uppercase tracking-widest ml-1">Gerenciamento de Conta</h2>
            <Card className="border-2 border-red-100 dark:border-red-900/20 shadow-none bg-red-50/30 dark:bg-red-900/5 rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 px-6 text-red-600 border-b border-red-100/50 dark:border-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <Trash2 size={18} />
                        <span className="font-bold text-sm">Excluir Minha Conta</span>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl border-none bg-zinc-900 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-xl font-bold">Excluir conta permanentemente?</AlertDialogTitle>
                      <AlertDialogDescription className="text-zinc-400">
                        Isso removerá todo o seu progresso, simulados e documentos. Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="rounded-xl bg-zinc-800 border-none text-white">Manter conta</AlertDialogCancel>
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
                    <span className="font-bold text-sm">Sair do Aplicativo</span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      <footer className="mt-10 text-center pb-32">
        <p className="text-[9px] font-bold text-study-medium/50 uppercase tracking-[0.2em]">
          Estuda AÍ • 2026
        </p>
      </footer>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;