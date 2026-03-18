"use client";

import React, { useState, useEffect } from 'react';
import { GraduationCap, Upload, FileText, Loader2, ShieldCheck, Settings2, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import ProfessorChat from '@/components/ProfessorChat';
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";

const ProfessorPortal = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [professorData, setProfessorData] = useState({
    name: '',
    subject_id: '',
    avatar_url: ''
  });

  useEffect(() => {
    fetchProfessorData();
    fetchSubjects();
  }, [user]);

  useEffect(() => {
    if (professorData.subject_id) {
      fetchDocuments();
      
      const channel = supabase
        .channel('prof-docs-realtime')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'documents',
          filter: `subject_id=eq.${professorData.subject_id}`
        }, () => fetchDocuments())
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [professorData.subject_id]);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    if (data) setSubjects(data);
  };

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('subject_id', professorData.subject_id)
      .order('created_at', { ascending: false });
    if (data) setDocuments(data);
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
      toast.error("Vincule uma matéria ao seu perfil nos Ajustes primeiro.");
      navigate('/settings');
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Enviando material...");
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${professorData.subject_id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('documents').insert([{
        name: file.name,
        file_path: fileName,
        subject_id: professorData.subject_id,
        user_id: user?.id,
        status: 'ready'
      }]);

      if (dbError) throw dbError;
      toast.success("Material adicionado com sucesso!", { id: toastId });
      fetchDocuments();
    } catch (err: any) {
      toast.error("Erro ao subir arquivo.", { id: toastId });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const removeDoc = async (id: string, path: string) => {
    if (!confirm("Excluir este material permanentemente?")) return;
    try {
      await supabase.from('documents').delete().eq('id', id);
      await supabase.storage.from('documents').remove([path]);
      toast.success("Material removido.");
      fetchDocuments();
    } catch (err) {
      toast.error("Erro ao remover.");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircle2 size={12} className="text-green-500" />;
      case 'processing': return <Loader2 size={12} className="text-study-primary animate-spin" />;
      default: return <AlertCircle size={12} className="text-study-medium" />;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-study-primary" size={48} /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-40 px-0 sm:px-4">
      <Navbar />
      
      <main className="p-4 sm:p-6 space-y-8">
        <div className="flex flex-col items-center gap-4 py-8 bg-study-primary/5 rounded-[2rem] sm:rounded-[2.5rem] border border-study-primary/10 relative overflow-hidden shadow-inner">
          <div className="absolute top-0 right-0 p-4 opacity-5"><GraduationCap size={100} /></div>
          <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-4 border-study-primary/20 shadow-2xl">
            <AvatarImage src={professorData.avatar_url} className="object-cover" />
            <AvatarFallback className="bg-study-primary text-white text-3xl font-black">{professorData.name?.substring(0, 2).toUpperCase() || 'P'}</AvatarFallback>
          </Avatar>
          <div className="text-center z-10 px-4">
            <h1 className="text-xl sm:text-2xl font-black text-study-dark dark:text-white truncate max-w-[280px]">{professorData.name || "Professor"}</h1>
            <Badge className="bg-study-primary text-zinc-900 font-bold px-4 py-1 mt-2"><ShieldCheck size={14} className="mr-1" /> MODO PROFESSOR</Badge>
          </div>
        </div>

        <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-study-primary/5 border-b border-study-primary/10 p-4 sm:p-6">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-study-primary flex items-center gap-2">
              <Upload size={18} /> Novo Material Didático
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 sm:pt-8 p-4 sm:p-8">
            <label className="border-2 border-dashed border-study-primary/30 rounded-[1.5rem] sm:rounded-[2rem] p-6 sm:p-10 flex flex-col items-center justify-center gap-3 bg-study-primary/5 hover:bg-study-primary/10 transition-all cursor-pointer group text-center">
              <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl shadow-lg">
                <FileText className="text-study-primary w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <span className="text-xs font-black uppercase text-study-dark dark:text-white">{uploading ? "Processando..." : "Subir PDF de Aula"}</span>
              <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </CardContent>
        </Card>

        <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
          <CardHeader className="border-b border-white/5 bg-zinc-800/20 p-4 sm:p-6">
            <CardTitle className="text-[10px] font-black uppercase tracking-widest text-study-medium">Materiais na Base de Conhecimento</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-48 w-full">
              {documents.length === 0 ? (
                <div className="p-10 text-center text-[10px] font-bold uppercase opacity-20">Nenhum arquivo postado</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {documents.map((doc) => (
                    <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors gap-4">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText size={18} className="text-study-primary shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-zinc-200 truncate pr-2" title={doc.name}>{doc.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {getStatusIcon(doc.status)}
                            <span className="text-[8px] font-black uppercase text-study-medium truncate">{doc.status === 'ready' ? 'Ativo' : 'Lendo'}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeDoc(doc.id, doc.file_path)} 
                        className="p-2 text-study-medium hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {professorData.subject_id ? (
          <div className="px-1">
            <ProfessorChat subjectId={professorData.subject_id} />
          </div>
        ) : (
          <div className="p-10 text-center bg-zinc-800/30 rounded-3xl border-2 border-dashed border-zinc-700">
            <Settings2 className="mx-auto mb-4 text-study-medium" size={32} />
            <p className="text-xs font-bold text-study-medium uppercase">Vincule uma matéria em "Ajustes" para ativar o Chat.</p>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfessorPortal;