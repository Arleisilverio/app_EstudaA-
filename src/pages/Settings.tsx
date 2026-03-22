"use client";

import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, ShieldAlert, Trash2, ChevronRight, LogOut, ExternalLink, Loader2, UserPlus, GraduationCap, X, ShieldCheck, Camera, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { toast } from 'sonner';

const ADMIN_EMAILS = ['arlei85@hotmail.com', 'arlei.se.silverio85@gmail.com'];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { signOut, isAdmin: authIsAdmin, isProfessor, user } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [authorizedEmails, setAuthorizedEmails] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  
  const [subjects, setSubjects] = useState<any[]>([]);
  const [savingProf, setSavingProf] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [professorData, setProfessorData] = useState({
    name: '',
    subject_id: '',
    avatar_url: ''
  });

  const isAdmin = authIsAdmin || (user?.email && ADMIN_EMAILS.includes(user.email));

  useEffect(() => {
    if (isAdmin) fetchAuthorizedEmails();
    if (isProfessor || isAdmin) {
      fetchSubjects();
      fetchProfessorData();
    }
  }, [isAdmin, isProfessor]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    if (data) setSubjects(data);
  };

  const fetchProfessorData = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('professors')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setProfessorData({
        name: data.name || '',
        subject_id: data.subject_id || '',
        avatar_url: data.avatar_url || ''
      });
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `prof-avatar-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('announcements')
        .getPublicUrl(filePath);

      setProfessorData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Foto carregada!");
    } catch (err: any) {
      toast.error("Erro no upload da foto.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfessorProfile = async () => {
    if (!professorData.name || !professorData.subject_id) {
      return toast.error("Nome e Matéria são obrigatórios.");
    }

    setSavingProf(true);
    try {
      const { error } = await supabase.from('professors').upsert({
        user_id: user?.id,
        name: professorData.name,
        subject_id: professorData.subject_id,
        avatar_url: professorData.avatar_url
      }, { onConflict: 'user_id' });

      if (error) throw error;
      showSuccess("Perfil docente atualizado com sucesso!");
    } catch (err: any) {
      showError("Erro ao salvar perfil.");
    } finally {
      setSavingProf(false);
    }
  };

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
    const emailToAuth = newEmail.trim().toLowerCase();
    if (!emailToAuth.includes('@')) return showError("Digite um e-mail válido");
    
    setIsSavingEmail(true);
    try {
      const { error } = await supabase
        .from('authorized_professor_emails')
        .insert([{ email: emailToAuth, added_by: user?.id }]);
      
      if (error) {
        if (error.code === '23505') throw new Error("Este e-mail já está autorizado.");
        throw error;
      }

      showSuccess("Professor autorizado com sucesso!");
      setNewEmail("");
      fetchAuthorizedEmails();
    } catch (err: any) {
      showError(err.message || "Erro ao autorizar e-mail.");
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleRemoveAuth = async (email: string) => {
    const { error } = await supabase.from('authorized_professor_emails').delete().eq('email', email);
    if (!error) {
      showSuccess("Autorização removida.");
      fetchAuthorizedEmails();
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Até logo!");
      navigate('/login');
    } catch (error) {
      toast.error("Erro ao sair.");
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
    <div className="min-h-screen bg-background flex flex-col max-w-md md:max-w-4xl lg:max-w-5xl mx-auto relative pb-40">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-10">
            {(isProfessor || isAdmin) && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold text-study-primary uppercase tracking-widest ml-1">Perfil do Professor</h2>
                <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
                  <CardContent className="pt-6 space-y-6">
                    <div className="flex flex-col items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-20 w-20 border-2 border-study-primary/20">
                          <AvatarImage src={professorData.avatar_url} className="object-cover" />
                          <AvatarFallback className="bg-study-primary text-white font-black">
                            {professorData.name?.substring(0,2).toUpperCase() || "P"}
                          </AvatarFallback>
                        </Avatar>
                        <label className="absolute bottom-0 right-0 bg-study-primary text-white p-1.5 rounded-full cursor-pointer shadow-lg border-2 border-white dark:border-zinc-900">
                          {uploadingPhoto ? <Loader2 className="animate-spin" size={12} /> : <Camera size={12} />}
                          <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                        </label>
                      </div>
                      <p className="text-[10px] font-bold text-study-medium uppercase">Sua foto profissional</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-bold uppercase ml-1">Nome de Exibição</Label>
                        <Input 
                          value={professorData.name} 
                          onChange={e => setProfessorData({...professorData, name: e.target.value})} 
                          placeholder="Ex: Prof. Arlei"
                          className="rounded-xl h-11 bg-zinc-800/30 border-zinc-700 text-white" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-black uppercase ml-1">Disciplina Vinculada</Label>
                        <Select value={professorData.subject_id} onValueChange={v => setProfessorData({...professorData, subject_id: v})}>
                          <SelectTrigger className="rounded-xl h-11 bg-zinc-800/30 border-zinc-700 text-white">
                            <SelectValue placeholder="Selecione sua matéria" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {subjects.map(s => <SelectItem key={s.id} value={s.id} className="rounded-xl">{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleSaveProfessorProfile} disabled={savingProf} className="w-full bg-study-primary text-zinc-900 rounded-xl font-bold h-12">
                        {savingProf ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={16} />} Salvar Dados Docentes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {isAdmin && (
              <section className="space-y-3">
                <div className="flex items-center justify-between ml-1">
                  <h2 className="text-xs font-bold text-study-medium uppercase tracking-widest">Autorizar Professores</h2>
                  <Badge variant="outline" className="text-[9px] border-study-primary text-study-primary">CONTROLE</Badge>
                </div>
                <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Email do professor..." 
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        className="rounded-xl h-12 bg-zinc-800/50 border-zinc-700 text-white"
                        disabled={isSavingEmail}
                      />
                      <Button onClick={handleAuthorizeEmail} disabled={isSavingEmail} className="bg-study-primary h-12 w-12 p-0 rounded-xl shrink-0">
                        {isSavingEmail ? <Loader2 className="animate-spin text-zinc-900" /> : <UserPlus size={20} className="text-zinc-900" />}
                      </Button>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {loadingEmails ? (
                        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-study-primary" size={20} /></div>
                      ) : (
                        authorizedEmails.map(auth => (
                          <div key={auth.email} className="flex items-center justify-between p-3.5 bg-zinc-800/40 rounded-2xl border border-white/5 group">
                            <span className="text-xs font-bold text-zinc-300 truncate flex-1">{auth.email}</span>
                            <button onClick={() => handleRemoveAuth(auth.email)} className="text-red-500 p-2 hover:bg-red-500/10 rounded-xl transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>

          <div className="space-y-10">
            <FeedbackSection />

            <section className="space-y-3">
              <h2 className="text-xs font-bold text-study-medium uppercase tracking-widest ml-1">Legal e Suporte</h2>
              <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                  <button onClick={() => navigate('/terms')} className="w-full flex items-center justify-between p-4 px-6 border-b border-white/5 hover:bg-study-light/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl"><ShieldAlert size={18} className="text-green-600" /></div>
                      <span className="font-bold text-zinc-200 text-sm">Legal e Privacidade</span>
                    </div>
                    <ChevronRight size={18} className="text-study-medium" />
                  </button>
                  <button onClick={() => navigate('/support')} className="w-full flex items-center justify-between p-4 px-6 hover:bg-study-light/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl"><ExternalLink size={18} className="text-blue-600" /></div>
                      <span className="font-bold text-zinc-200 text-sm">Suporte e Desenvolvedor</span>
                    </div>
                    <ChevronRight size={18} className="text-study-medium" />
                  </button>
                </CardContent>
              </Card>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-bold text-red-500 uppercase tracking-widest ml-1">Gerenciamento</h2>
              <Card className="border-2 border-red-100 dark:border-red-900/20 bg-red-900/5 rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="w-full flex items-center justify-between p-4 px-6 text-red-600 hover:bg-red-900/10 transition-colors">
                        <div className="flex items-center gap-3"><Trash2 size={18} /><span className="font-bold text-sm">Excluir Minha Conta</span></div>
                        <ChevronRight size={18} />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl bg-zinc-900 text-white">
                      <AlertDialogHeader><AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle><AlertDialogDescription className="text-zinc-400">Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
                      <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                        <AlertDialogCancel className="rounded-xl bg-zinc-800 border-none text-white">Manter conta</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting} className="bg-red-600 text-white rounded-xl font-bold">{isDeleting ? <Loader2 className="animate-spin" /> : "Sim, excluir tudo"}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </section>
          </div>
        </div>
      </div>

      <footer className="mt-10 text-center pb-32">
        <p className="text-[9px] font-bold text-study-medium/50 uppercase tracking-[0.2em]">Estuda AÍ • 2026</p>
      </footer>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;