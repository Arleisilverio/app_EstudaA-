"use client";

import React, { useState, useEffect } from 'react';
import { GraduationCap, Upload, FileText, CheckCircle, Loader2, Save, User as UserIcon, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';

const ProfessorPortal = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

    const toastId = toast.loading("Subindo arquivo...");
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${professorData.subject_id}-${Date.now()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

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
      toast.error("Erro no upload.", { id: toastId });
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-study-primary" size={48} /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-32">
      <Navbar />
      
      <main className="p-6 space-y-8">
        {/* Header do Professor */}
        <div className="flex flex-col items-center gap-4 py-6 bg-study-primary/5 rounded-[2.5rem] border border-study-primary/10">
          <Avatar className="h-24 w-24 border-4 border-study-primary/20">
            <AvatarImage src={professorData.avatar_url} />
            <AvatarFallback className="bg-study-primary text-white text-2xl font-black">
              {professorData.name.substring(0, 2).toUpperCase() || 'P'}
            </AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h1 className="text-2xl font-black text-study-dark dark:text-white">{professorData.name || "Seu Nome"}</h1>
            <Badge className="bg-study-primary text-white mt-1">Professor do Portal</Badge>
          </div>
        </div>

        {/* Configurações do Professor */}
        <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem]">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <UserIcon size={18} className="text-study-primary" /> Seus Dados Profissionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Nome Completo</Label>
              <Input 
                value={professorData.name} 
                onChange={e => setProfessorData({...professorData, name: e.target.value})}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <Label>Sua Matéria</Label>
              <Select 
                value={professorData.subject_id} 
                onValueChange={v => setProfessorData({...professorData, subject_id: v})}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione sua disciplina" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSaveProfile} disabled={saving} className="w-full bg-study-primary text-white rounded-xl py-6 font-bold">
              {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />} Salvar Perfil
            </Button>
          </CardContent>
        </Card>

        {/* Upload de Material */}
        <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-study-primary/10">
            <CardTitle className="text-sm flex items-center gap-2">
              <Upload size={18} className="text-study-primary" /> Central de Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <p className="text-xs text-study-medium font-medium">Os arquivos enviados aqui alimentam diretamente a IA da sua disciplina.</p>
            </div>
            
            <label className="border-2 border-dashed border-study-light rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 bg-study-light/5 hover:bg-study-light/10 transition-colors cursor-pointer group">
              <div className="bg-white dark:bg-zinc-800 p-4 rounded-full shadow-lg group-hover:scale-110 transition-transform">
                <FileText className="text-study-primary" size={32} />
              </div>
              <div className="space-y-1 text-center">
                <span className="text-sm font-black uppercase text-study-dark">Selecionar Arquivo PDF</span>
                <p className="text-[10px] text-study-medium font-bold uppercase">Base de Conhecimento IA</p>
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