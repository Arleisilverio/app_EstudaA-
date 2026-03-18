"use client";

import React, { useState, useEffect } from 'react';
import { GraduationCap, Upload, FileText, CheckCircle, Loader2, Save, User as UserIcon, BookOpen, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';

const ProfessorPortal = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [professorData, setProfessorData] = useState({
    name: '',
    subject_id: '',
    avatar_url: '',
    phone_number: ''
  });

  useEffect(() => {
    fetchProfessorData();
    fetchSubjects();
  }, [user]);

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
        name: data.name,
        subject_id: data.subject_id,
        avatar_url: data.avatar_url,
        phone_number: data.phone_number || ''
      });
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `prof-avatar-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `announcements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('announcements')
        .getPublicUrl(filePath);

      setProfessorData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Foto carregada! Salve o perfil para confirmar.");
    } catch (err) {
      toast.error("Erro no upload da foto.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.from('professors').upsert({
        user_id: user?.id,
        ...professorData
      }, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success("Perfil do professor atualizado!");
    } catch (err) {
      toast.error("Erro ao salvar perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !professorData.subject_id) {
      if (!professorData.subject_id) toast.error("Selecione sua matéria antes de subir arquivos.");
      return;
    }

    const toastId = toast.loading("Subindo arquivo para a base da IA...");
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${professorData.subject_id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('documents').insert([{
        name: file.name,
        file_path: filePath,
        subject_id: professorData.subject_id,
        user_id: user?.id,
        status: 'ready'
      }]);

      if (dbError) throw dbError;
      toast.success("Documento adicionado à base de estudos!", { id: toastId });
    } catch (err) {
      toast.error("Erro no upload do documento.", { id: toastId });
    }
  };

  const currentSubjectName = subjects.find(s => s.id === professorData.subject_id)?.name;

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-study-primary" size={48} /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-32">
      <Navbar />
      
      <main className="p-6 space-y-8">
        {/* Header do Professor */}
        <div className="flex flex-col items-center gap-4 py-8 bg-study-primary/5 rounded-[2.5rem] border border-study-primary/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <GraduationCap size={80} />
          </div>
          
          <div className="relative">
            <Avatar className="h-28 w-28 border-4 border-study-primary/20 shadow-xl">
              <AvatarImage src={professorData.avatar_url} className="object-cover" />
              <AvatarFallback className="bg-study-primary text-white text-3xl font-black">
                {professorData.name?.substring(0, 2).toUpperCase() || 'P'}
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 bg-study-primary text-white p-2 rounded-full cursor-pointer shadow-lg border-2 border-white dark:border-zinc-900 hover:scale-110 transition-transform">
              {uploadingPhoto ? <Loader2 className="animate-spin" size={16} /> : <Camera size={16} />}
              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
            </label>
          </div>

          <div className="text-center z-10">
            <h1 className="text-2xl font-black text-study-dark dark:text-white leading-tight">
              {professorData.name || "Seu Nome"}
            </h1>
            <div className="flex flex-col items-center gap-1 mt-2">
              <Badge className="bg-study-primary text-white font-bold px-4 py-1">Professor(a)</Badge>
              {currentSubjectName && (
                <p className="text-xs font-black text-study-primary uppercase tracking-widest mt-1">
                  Matéria: {currentSubjectName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Configurações do Professor */}
        <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-study-medium flex items-center gap-2">
              <UserIcon size={18} className="text-study-primary" /> Dados Profissionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase ml-1">Nome de Exibição</Label>
              <Input 
                value={professorData.name} 
                onChange={e => setProfessorData({...professorData, name: e.target.value})}
                placeholder="Ex: Prof. Arlei"
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-bold uppercase ml-1">Disciplina que Leciona</Label>
              <Select 
                value={professorData.subject_id} 
                onValueChange={v => setProfessorData({...professorData, subject_id: v})}
              >
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="Escolha sua disciplina" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {subjects.map(s => <SelectItem key={s.id} value={s.id} className="rounded-xl">{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} className="w-full bg-study-primary text-white rounded-xl py-6 font-bold shadow-lg active:scale-95 transition-all">
              {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />} Salvar Perfil
            </Button>
          </CardContent>
        </Card>

        {/* Upload de Material */}
        <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-study-primary/10 border-b border-study-primary/10">
            <CardTitle className="text-sm font-black uppercase tracking-widest text-study-primary flex items-center gap-2">
              <Upload size={18} /> Alimentar Base de Dados IA
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <div className="text-center mb-8 px-4">
              <p className="text-[11px] text-study-medium font-bold uppercase leading-relaxed">
                Os arquivos enviados aqui alimentam o Professor Virtual da sua disciplina.
              </p>
            </div>
            
            <label className="border-2 border-dashed border-study-primary/30 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 bg-study-primary/5 hover:bg-study-primary/10 transition-all cursor-pointer group">
              <div className="bg-white dark:bg-zinc-800 p-5 rounded-full shadow-xl group-hover:scale-110 transition-transform">
                <FileText className="text-study-primary" size={40} />
              </div>
              <div className="space-y-2 text-center">
                <span className="text-sm font-black uppercase text-study-dark dark:text-white">Subir PDF da Matéria</span>
                <div className="flex flex-col gap-1">
                  <p className="text-[9px] text-study-medium font-bold uppercase tracking-widest">Base de Conhecimento Ativa</p>
                  <Badge variant="outline" className="w-fit mx-auto border-study-primary/20 text-study-primary bg-white/50">Apenas PDF</Badge>
                </div>
              </div>
              <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
            </label>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfessorPortal;