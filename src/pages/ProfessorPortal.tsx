"use client";

import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, Upload, FileText, Loader2, ShieldCheck, Settings2, Trash2, CheckCircle2, Clock, AlertCircle, LogOut, BookOpen, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';
import BottomNav from '@/components/BottomNav';
import ProfessorChat from '@/components/ProfessorChat';
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";

const ProfessorPortal = () => {
  const { user, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [activeSubjectId, setActiveSubjectId] = useState<string>("");
  
  const [professorData, setProfessorData] = useState({
    name: '',
    subject_id: '',
    subject_name: '',
    avatar_url: ''
  });

  const [docToDelete, setDocToDelete] = useState<{ id: string, path: string, name: string } | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initPortal = async () => {
      setLoading(true);
      await fetchProfessorData();
      if (isAdmin) {
        await fetchAllSubjects();
      }
      setLoading(false);
    };
    initPortal();
  }, [user, isAdmin]);

  useEffect(() => {
    if (activeSubjectId) {
      fetchDocuments();
      const channel = supabase
        .channel(`prof-docs-${activeSubjectId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'documents',
          filter: `subject_id=eq.${activeSubjectId}`
        }, () => fetchDocuments())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [activeSubjectId]);

  const fetchAllSubjects = async () => {
    const { data } = await supabase.from('subjects').select('id, name').order('name');
    if (data) setAllSubjects(data);
  };

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('subject_id', activeSubjectId)
      .order('created_at', { ascending: false });
    if (data) setDocuments(data);
  };

  const fetchProfessorData = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('professors')
      .select('*, subjects(name)')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (data) {
      setProfessorData({
        name: data.name || '',
        subject_id: data.subject_id || '',
        subject_name: (data.subjects as any)?.name || '',
        avatar_url: data.avatar_url || ''
      });
      // Define a matéria do professor como ativa inicialmente
      setActiveSubjectId(data.subject_id);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!activeSubjectId) {
      toast.error("Selecione uma matéria primeiro.");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Enviando e processando material...");
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${activeSubjectId}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: doc, error: insertError } = await supabase.from('documents').insert([{
        name: file.name,
        file_path: fileName,
        subject_id: activeSubjectId,
        user_id: user?.id,
        status: 'processing'
      }]).select().single();

      if (insertError) throw insertError;

      // Dispara o processamento RAG
      await supabase.functions.invoke('process-document', {
        body: { documentId: doc.id }
      });

      toast.success("Material adicionado com sucesso!", { id: toastId });
      fetchDocuments();
    } catch (err: any) {
      toast.error("Erro ao subir arquivo.", { id: toastId });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    try {
      await supabase.from('documents').delete().eq('id', docToDelete.id);
      await supabase.storage.from('documents').remove([docToDelete.path]);
      toast.success("Material removido.");
      fetchDocuments();
    } catch (err) {
      toast.error("Erro ao remover.");
    } finally {
      setDocToDelete(null);
    }
  };

  const startLongPress = (doc: any) => {
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setDocToDelete({ id: doc.id, path: doc.file_path, name: doc.name });
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-study-primary" size={48} /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-40 px-0 sm:px-4">
      <Navbar />
      
      <main className="p-4 sm:p-6 space-y-6">
        {/* Cabeçalho de Identidade */}
        <div className="flex flex-col items-center gap-4 py-8 bg-study-primary/5 rounded-[2.5rem] border border-study-primary/10 relative overflow-hidden shadow-inner">
          <div className="absolute top-0 right-0 p-4 opacity-5"><GraduationCap size={100} /></div>
          <Avatar className="h-24 w-24 border-4 border-study-primary/20 shadow-2xl">
            <AvatarImage src={professorData.avatar_url} className="object-cover" />
            <AvatarFallback className="bg-study-primary text-white text-3xl font-black">{professorData.name?.substring(0, 2).toUpperCase() || 'P'}</AvatarFallback>
          </Avatar>
          <div className="text-center z-10 px-4 flex flex-col items-center gap-1">
            <h1 className="text-xl font-black text-study-dark dark:text-white truncate max-w-[280px]">
              {isAdmin ? "Portal de Gestão" : (professorData.name || "Professor")}
            </h1>
            <Badge className="bg-study-primary/20 text-study-primary border-study-primary/30 font-bold px-4 py-0.5 text-[10px]">
              {isAdmin ? "MODO ADMINISTRADOR" : "MODO PROFESSOR"}
            </Badge>
          </div>
        </div>

        {/* Seletor de Matéria para Admin */}
        {isAdmin && (
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase ml-1 text-study-medium">Gerenciar Disciplina:</Label>
            <Select value={activeSubjectId} onValueChange={setActiveSubjectId}>
              <SelectTrigger className="rounded-2xl h-14 bg-white dark:bg-zinc-900 border-study-primary/20 shadow-study">
                <SelectValue placeholder="Selecione uma matéria..." />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {allSubjects.map(s => (
                  <SelectItem key={s.id} value={s.id} className="rounded-xl">{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {activeSubjectId ? (
          <>
            <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-study-primary/5 border-b border-study-primary/10 p-6">
                <CardTitle className="text-xs font-black uppercase tracking-widest text-study-primary flex items-center gap-2">
                  <Upload size={18} /> {isAdmin ? "Adicionar Material p/ Professor" : "Novo Material Didático"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <label className="border-2 border-dashed border-study-primary/30 rounded-[2rem] p-10 flex flex-col items-center justify-center gap-3 bg-study-primary/5 hover:bg-study-primary/10 transition-all cursor-pointer group text-center">
                  <div className="bg-white dark:bg-zinc-800 p-3 rounded-2xl shadow-lg">
                    <FileText className="text-study-primary w-7 h-7" />
                  </div>
                  <span className="text-xs font-black uppercase text-study-dark dark:text-white">
                    {uploading ? "Processando..." : "Subir PDF de Aula"}
                  </span>
                  <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={uploading} />
                </label>
              </CardContent>
            </Card>

            <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-zinc-800/20 p-6">
                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-study-medium">
                  Materiais da Disciplina
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-48 w-full">
                  {documents.length === 0 ? (
                    <div className="p-10 text-center text-[10px] font-bold uppercase opacity-20">Nenhum arquivo postado</div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {documents.map((doc) => (
                        <div 
                          key={doc.id} 
                          className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors gap-4 active:scale-95 select-none touch-none"
                          onPointerDown={() => startLongPress(doc)}
                          onPointerUp={cancelLongPress}
                          onPointerLeave={cancelLongPress}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <FileText size={18} className="text-study-primary shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-zinc-200 truncate pr-2">{doc.name}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <CheckCircle2 size={10} className={doc.status === 'ready' ? "text-green-500" : "text-study-medium"} />
                                <span className="text-[8px] font-black uppercase text-study-medium">{doc.status === 'ready' ? 'Ativo' : 'Lendo'}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-[8px] font-bold text-study-medium/30 uppercase">Segure p/ apagar</div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="px-1">
              <ProfessorChat subjectId={activeSubjectId} />
            </div>
          </>
        ) : (
          <div className="p-10 text-center bg-zinc-800/30 rounded-[2rem] border-2 border-dashed border-zinc-700">
            <BookOpen className="mx-auto mb-4 text-study-medium" size={32} />
            <p className="text-xs font-bold text-study-medium uppercase">
              {isAdmin ? "Selecione uma matéria acima para gerenciar os materiais." : "Vincule uma matéria em 'Ajustes' para ativar o Portal."}
            </p>
          </div>
        )}
      </main>

      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="rounded-3xl bg-zinc-900 text-white border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="text-red-500" size={20} /> Excluir Material?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Deseja remover permanentemente o arquivo <strong>{docToDelete?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl bg-zinc-800 border-none text-white hover:bg-zinc-700">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">
              Sim, excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default ProfessorPortal;