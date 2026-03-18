"use client";

import React, { useState, useEffect } from 'react';
import { GraduationCap, Upload, FileText, Loader2, ShieldCheck, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import ProfessorChat from '@/components/ProfessorChat';
import { useNavigate } from 'react-router-dom';

const ProfessorPortal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [professorData, setProfessorData] = useState({
    name: '',
    subject_id: '',
    avatar_url: ''
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
        name: data.name || '',
        subject_id: data.subject_id || '',
        avatar_url: data.avatar_url || ''
      });
    }
    setLoading(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!professorData.subject_id) {
      toast.error("Você precisa vincular uma matéria ao seu perfil nos Ajustes antes de subir arquivos.");
      navigate('/settings');
      return;
    }

    const toastId = toast.loading("Subindo material para a IA...");
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${professorData.subject_id}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

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
      toast.success("Documento adicionado à base de conhecimento!", { id: toastId });
    } catch (err: any) {
      toast.error("Erro ao subir arquivo.", { id: toastId });
    } finally {
      event.target.value = '';
    }
  };

  const currentSubjectName = subjects.find(s => s.id === professorData.subject_id)?.name;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-study-primary" size={48} /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-40">
      <Navbar />
      
      <main className="p-6 space-y-8">
        {/* Header de Boas Vindas */}
        <div className="flex flex-col items-center gap-4 py-8 bg-study-primary/5 rounded-[2.5rem] border border-study-primary/10 relative overflow-hidden shadow-inner">
          <div className="absolute top-0 right-0 p-4 opacity-5"><GraduationCap size={100} /></div>
          
          <div className="relative">
            <Avatar className="h-28 w-28 border-4 border-study-primary/20 shadow-2xl">
              <AvatarImage src={professorData.avatar_url} className="object-cover" />
              <AvatarFallback className="bg-study-primary text-white text-3xl font-black">{professorData.name?.substring(0, 2).toUpperCase() || 'P'}</AvatarFallback>
            </Avatar>
          </div>

          <div className="text-center z-10 px-4">
            <h1 className="text-2xl font-black text-study-dark dark:text-white leading-tight">
              {professorData.name || "Professor"}
            </h1>
            <div className="flex flex-col items-center gap-1 mt-2">
              <Badge className="bg-study-primary text-zinc-900 font-bold px-4 py-1 flex gap-1"><ShieldCheck size={14} /> MODO PROFESSOR</Badge>
              {currentSubjectName ? (
                <p className="text-[10px] font-black text-study-primary uppercase tracking-[0.2em] mt-2">Disciplina: {currentSubjectName}</p>
              ) : (
                <Button 
                  variant="link" 
                  onClick={() => navigate('/settings')}
                  className="text-[10px] font-bold text-red-500 uppercase p-0 h-auto mt-2 animate-pulse"
                >
                  <Settings2 size={10} className="mr-1" /> Configure sua matéria nos Ajustes
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Gestão de Arquivos */}
        <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-study-primary/5 border-b border-study-primary/10">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-study-primary flex items-center gap-2">
              <Upload size={18} /> Alimentar Base da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8">
            <label className="border-2 border-dashed border-study-primary/30 rounded-[2rem] p-10 flex flex-col items-center justify-center gap-4 bg-study-primary/5 hover:bg-study-primary/10 transition-all cursor-pointer group text-center">
              <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl shadow-xl group-hover:scale-110 transition-transform"><FileText className="text-study-primary" size={32} /></div>
              <div>
                <span className="text-sm font-black uppercase text-study-dark dark:text-white">Subir PDF Didático</span>
                <p className="text-[9px] text-study-medium font-bold uppercase tracking-widest mt-1">O material será lido pelo Professor Virtual</p>
              </div>
              <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
            </label>
          </CardContent>
        </Card>

        {/* IA de Validação */}
        {professorData.subject_id && (
          <ProfessorChat subjectId={professorData.subject_id} />
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfessorPortal;