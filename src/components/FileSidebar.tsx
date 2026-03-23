"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Upload, FileText, Trash2, Loader2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useParams } from 'react-router-dom';
import { toast } from "sonner";
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
  subject_id: string;
  file_path: string;
}

const FileSidebar = () => {
  const { isAdmin, isProfessor, user } = useAuth();
  const { subjectId } = useParams();
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [loading, setLoading] = useState(true);

  const CACHE_KEY = `cached_docs_${subjectId}`;
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const canManage = isAdmin || isProfessor;

  useEffect(() => {
    if (subjectId) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setDocuments(JSON.parse(cached));
        setLoading(false);
      }
      fetchSubjectInfo();
      fetchDocuments();

      const channel = supabase
        .channel(`docs-realtime-${subjectId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'documents',
          filter: `subject_id=eq.${subjectId}`
        }, () => fetchDocuments())
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [subjectId]);

  const fetchSubjectInfo = async () => {
    const { data } = await supabase.from('subjects').select('name').eq('id', subjectId).single();
    if (data) setSubjectName(data.name);
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      if (data) {
        setDocuments(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.error("Erro ao carregar docs:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canManage) return;

    setIsUploading(true);
    const toastId = toast.loading("Enviando e processando material...");
    let createdDocId: string | null = null;
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${subjectId}-${Date.now()}.${fileExt}`;
      
      // 1. Upload para Storage
      const { error: uploadError } = await supabase.storage.from('documents').upload(fileName, file);
      if (uploadError) throw uploadError;

      // 2. Criar registro no banco (status processing)
      const { data: doc, error: insertError } = await supabase.from('documents').insert([{
        name: file.name,
        file_path: fileName,
        subject_id: subjectId,
        user_id: user?.id,
        status: 'processing'
      }]).select().single();

      if (insertError) throw insertError;
      createdDocId = doc.id;

      // 3. Chamar Edge Function para processar RAG (Embeddings)
      const { error: processError } = await supabase.functions.invoke('process-document', {
        body: { documentId: doc.id }
      });

      if (processError) throw processError;

      toast.success("Material pronto para estudo!", { id: toastId });
      fetchDocuments();
    } catch (err: any) {
      console.error("Erro no upload/processamento:", err);
      toast.error("Falha no processamento: " + err.message, { id: toastId });
      
      // SEGURANÇA: Se a chamada falhou, forçamos o status de erro no banco para parar o loader
      if (createdDocId) {
        await supabase.from('documents').update({ status: 'error' }).eq('id', createdDocId);
        fetchDocuments();
      }
    } finally {
      setIsUploading(false);
      if (event.target) event.target.value = '';
    }
  };

  const confirmDelete = async () => {
    if (!docToDelete) return;
    try {
      await supabase.from('documents').delete().eq('id', docToDelete.id);
      await supabase.storage.from('documents').remove([docToDelete.file_path]);
      toast.success("Documento removido.");
      fetchDocuments();
    } catch (err) {
      toast.error("Erro ao remover.");
    } finally {
      setDocToDelete(null);
    }
  };

  const startLongPress = (doc: Document) => {
    if (!canManage) return;
    longPressTimer.current = setTimeout(() => {
      if (navigator.vibrate) navigator.vibrate(50);
      setDocToDelete(doc);
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ready': return { label: 'Disponível', color: 'text-green-500', icon: CheckCircle2 };
      case 'processing': return { label: 'Lendo...', color: 'text-study-primary', icon: Loader2 };
      case 'error': return { label: 'Erro', color: 'text-red-500', icon: AlertCircle };
      default: return { label: 'Pendente', color: 'text-study-medium', icon: Clock };
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full lg:max-w-xs">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-study-dark dark:text-white leading-tight">{subjectName || "Matéria"}</h2>
        <p className="text-[10px] text-study-medium font-bold uppercase tracking-widest">Base de Conhecimento da IA</p>
      </div>

      {canManage && (
        <Card className="border-none shadow-study bg-white dark:bg-zinc-900 overflow-hidden rounded-[2rem]">
          <CardHeader className="bg-study-light/30 dark:bg-zinc-800/50">
            <CardTitle className="text-base flex items-center gap-2 text-study-dark dark:text-zinc-100">
              <Upload size={16} className="text-study-primary" /> Adicionar PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <label className="border-2 border-dashed border-study-light dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 bg-study-light/10 dark:bg-zinc-800/30 hover:bg-study-light/20 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
              <div className="bg-white dark:bg-zinc-800 p-3 rounded-full shadow-sm">
                {isUploading ? <Loader2 className="animate-spin text-study-primary" /> : <Upload className="text-study-primary" />}
              </div>
              <p className="text-[10px] font-bold text-study-dark dark:text-zinc-200 uppercase text-center px-2">
                {isUploading ? "Processando..." : "Clique para selecionar arquivo"}
              </p>
              <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} accept=".pdf,.docx,.txt" />
            </label>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-study bg-white dark:bg-zinc-900 flex-1 min-h-[400px] rounded-[2rem] flex flex-col">
        <CardHeader className="border-b border-study-light/30 dark:border-zinc-800">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-study-medium flex items-center gap-2">
            <FileText size={16} /> Arquivos Analisados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <ScrollArea className="h-[400px] px-4 py-4">
            <div className="flex flex-col gap-3">
              {loading && documents.length === 0 ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-study-primary" /></div>
              ) : documents.length === 0 ? (
                <div className="text-center py-10 opacity-30 text-[10px] font-black uppercase">Nenhum arquivo</div>
              ) : (
                documents.map((doc) => {
                  const statusInfo = getStatusInfo(doc.status);
                  const Icon = statusInfo.icon;
                  return (
                    <div 
                      key={doc.id} 
                      className="relative flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-study-light/5 dark:bg-zinc-800/30 border border-study-light/10 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800 transition-all select-none touch-none active:scale-95"
                      onPointerDown={() => startLongPress(doc)}
                      onPointerUp={cancelLongPress}
                      onPointerLeave={cancelLongPress}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="bg-study-primary/10 p-2 rounded-xl shrink-0">
                          <FileText size={18} className="text-study-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-study-dark dark:text-zinc-200 truncate pr-1">{doc.name}</p>
                          <div className={cn("flex items-center gap-1 mt-0.5", statusInfo.color)}>
                            <Icon size={10} className={doc.status === 'processing' ? 'animate-spin' : ''} />
                            <span className="text-[9px] font-black uppercase tracking-tighter">{statusInfo.label}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <AlertDialogContent className="rounded-3xl bg-zinc-900 text-white border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Material?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Remover permanentemente o arquivo <strong>{docToDelete?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="rounded-xl bg-zinc-800 border-none text-white">Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 text-white rounded-xl font-bold">Sim, excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FileSidebar;