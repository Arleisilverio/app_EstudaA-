"use client";

import React, { useState, useEffect } from 'react';
import HomeHeader from "@/components/HomeHeader";
import SubjectGrid from "@/components/SubjectGrid";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { GraduationCap, ClipboardCheck, FileText, Sparkles, Settings2, Camera, Save, Loader2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ProfessorDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [professorData, setProfessorData] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form de Setup
  const [formData, setFormData] = useState({
    name: '',
    subject_id: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (user) {
      checkProfessorProfile();
      fetchSubjects();
    }
  }, [user]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    if (data) setSubjects(data);
  };

  const checkProfessorProfile = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('professors')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (!data || !data.name || !data.subject_id) {
        setSetupRequired(true);
      } else {
        setProfessorData(data);
        setSetupRequired(false);
      }
    } catch (err) {
      console.error("Erro ao validar perfil docente:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success("Sessão encerrada.");
      navigate('/login');
    } catch (error) {
      toast.error("Erro ao sair.");
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `prof-avatar-${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('announcements')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Foto carregada!");
    } catch (err) {
      toast.error("Erro no upload.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveSetup = async () => {
    if (!formData.name || !formData.subject_id) {
      return toast.error("Preencha seu nome e selecione sua matéria.");
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('professors').upsert({
        user_id: user?.id,
        name: formData.name,
        subject_id: formData.subject_id,
        avatar_url: formData.avatar_url
      }, { onConflict: 'user_id' });

      if (error) throw error;

      toast.success("Perfil configurado! Bem-vindo ao Portal.");
      checkProfessorProfile();
    } catch (err) {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-study-primary" size={40} />
    </div>
  );

  // TELA DE SETUP OBRIGATÓRIO
  if (setupRequired) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="bg-study-primary/10 inline-flex p-4 rounded-3xl text-study-primary mb-4">
            <GraduationCap size={48} />
          </div>
          <h1 className="text-2xl font-black text-white">Configuração Docente</h1>
          <p className="text-study-medium text-sm font-medium mt-2">
            Olá, Professor! Antes de acessar o portal, precisamos configurar sua identidade acadêmica.
          </p>
        </div>

        <Card className="w-full border-none shadow-2xl bg-zinc-900 rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 space-y-6">
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <Avatar className="h-24 w-24 border-4 border-study-primary/20">
                  <AvatarImage src={formData.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-study-primary text-white text-2xl font-black">
                    {formData.name?.substring(0,2).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 bg-study-primary text-zinc-900 p-2 rounded-full cursor-pointer shadow-lg border-2 border-zinc-900 hover:scale-110 transition-transform">
                  {uploading ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              </div>
              <p className="text-[10px] font-black text-study-medium uppercase tracking-widest">Sua Foto Profissional</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase ml-1 text-study-medium">Nome de Exibição</Label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ex: Prof. Arlei Silvério"
                  className="rounded-xl h-12 bg-zinc-800 border-zinc-700 text-white" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-black uppercase ml-1 text-study-medium">Sua Disciplina</Label>
                <Select value={formData.subject_id} onValueChange={v => setFormData({...formData, subject_id: v})}>
                  <SelectTrigger className="rounded-xl h-12 bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder={subjects.length === 0 ? "Nenhuma matéria disponível" : "Selecione sua matéria"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    {subjects.length === 0 ? (
                      <div className="p-4 text-center text-xs text-study-medium italic">
                        Contate o administrador para cadastrar as matérias.
                      </div>
                    ) : (
                      subjects.map(s => <SelectItem key={s.id} value={s.id} className="rounded-xl">{s.name}</SelectItem>)
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col gap-3 pt-2">
                <Button onClick={handleSaveSetup} disabled={saving || uploading || subjects.length === 0} className="w-full bg-study-primary text-zinc-900 rounded-xl font-black h-14 text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                  {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />} Finalizar e Entrar
                </Button>
                
                <Button onClick={handleLogout} variant="ghost" className="w-full text-study-medium hover:text-red-500 font-bold gap-2">
                  <LogOut size={18} /> Sair do Aplicativo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // DASHBOARD LIBERADO
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative pb-40">
      <HomeHeader />
      
      <div className="px-4 mt-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-study-dark dark:text-white flex items-center gap-2">
              Portal Docente <GraduationCap className="text-study-primary" size={28} />
            </h1>
            <p className="text-study-medium text-xs font-bold uppercase tracking-widest">
              Gestão Acadêmica e IA
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card onClick={() => navigate('/exams')} className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] cursor-pointer hover:scale-[1.02] transition-transform active:scale-95">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="bg-study-primary/10 p-4 rounded-2xl text-study-primary"><ClipboardCheck size={32} /></div>
              <div><h3 className="font-bold text-sm text-study-dark dark:text-white">Agendar Provas</h3><p className="text-[10px] text-study-medium uppercase font-bold">Reflete para os alunos</p></div>
            </CardContent>
          </Card>
          <Card onClick={() => navigate('/schedule')} className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] cursor-pointer hover:scale-[1.02] transition-transform active:scale-95">
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="bg-blue-500/10 p-4 rounded-2xl text-blue-500"><FileText size={32} /></div>
              <div><h3 className="font-bold text-sm text-study-dark dark:text-white">Grade Horária</h3><p className="text-[10px] text-study-medium uppercase font-bold">Organize sua semana</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-study-medium uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={14} className="text-study-primary" /> Suas Matérias e Materiais
            </h2>
          </div>
          <p className="text-[11px] text-study-medium italic px-1">
            Selecione uma matéria abaixo para subir PDFs e validar o Professor Virtual (RAG).
          </p>
          <SubjectGrid filterId={professorData?.subject_id} />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfessorDashboard;