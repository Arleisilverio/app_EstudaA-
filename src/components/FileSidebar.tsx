"use client";

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, File, Loader2, Pencil, Save, X, CheckCircle2, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useParams } from 'react-router-dom';
import { toast } from "sonner";

interface Document {
  id: string;
  name: string;
  status: string;
  subject_id: string;
  file_path: string;
}

const FileSidebar = () => {
  const { isAdmin, user } = useAuth();
  const { subjectId } = useParams();
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const N8N_WEBHOOK_URL = "https://n8n.motoboot.com.br/webhook-test/estuda_ai";

  useEffect(() => {
    if (subjectId) {
      fetchSubjectInfo();
      fetchDocuments();

      const channel = supabase
        .channel(`docs-${subjectId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'documents',
          filter: `subject_id=eq.${subjectId}`
        }, () => {
          fetchDocuments();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [subjectId]);

  const fetchSubjectInfo = async () => {
    const { data } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', subjectId)
      .single();
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
      setDocuments(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const triggerN8nProcess = async (doc: Document) => {
    setIsProcessing(doc.id);
    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_document',
          document_id: doc.id,
          file_path: doc.file_path,
          subject_id: doc.subject_id,
          subject_name: subjectName,
          user_email: user?.email
        })
      });

      if (response.ok) {
        toast.success("n8n: Processamento iniciado!");
      } else {
        throw new Error();
      }
    } catch (err) {
      toast.error("Erro ao comunicar com n8n");
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!isAdmin) {
      toast.error("Apenas administradores podem enviar arquivos.");
      return;
    }

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${subjectId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: newDoc, error: dbError } = await supabase
        .from('documents')
        .insert([{
          name: file.name,
          file_path: filePath,
          subject_id: subjectId,
          user_id: user?.id,
          status: 'ready'
        }])
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success("Documento adicionado!");
      
      // Opcional: Já dispara o n8n logo após o upload
      if (newDoc) triggerN8nProcess(newDoc);

    } catch (err: any) {
      toast.error("Erro ao enviar");
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const startEditing = (doc: Document) => {
    setEditingId(doc.id);
    setEditName(doc.name);
  };

  const saveRename = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await supabase.from('documents').update({ name: editName }).eq('id', id);
      setEditingId(null);
      toast.success("Renomeado");
    } catch (err) {
      toast.error("Erro ao renomear");
    }
  };

  const removeDoc = async (id: string) => {
    if (!confirm("Excluir este documento?")) return;
    try {
      const { data: doc } = await supabase.from('documents').select('file_path').eq('id', id).single();
      await supabase.from('documents').delete().eq('id', id);
      if (doc?.file_path) {
        await supabase.storage.from('documents').remove([doc.file_path]);
      }
      toast.success("Removido");
    } catch (err) {
      toast.error("Erro ao remover");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full lg:max-w-xs">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-study-dark dark:text-white leading-tight">
          {subjectName || "Carregando..."}
        </h2>
        <p className="text-[10px] text-study-medium font-bold uppercase tracking-widest">Matéria Selecionada</p>
      </div>

      {isAdmin && (
        <Card className="border-none shadow-study bg-white dark:bg-zinc-900 overflow-hidden rounded-[2rem]">
          <CardHeader className="bg-study-light/30 dark:bg-zinc-800/50">
            <CardTitle className="text-base flex items-center gap-2 text-study-dark dark:text-zinc-100">
              <Upload size={16} className="text-study-primary" />
              Upload de Conteúdo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <label className="border-2 border-dashed border-study-light dark:border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 bg-study-light/10 dark:bg-zinc-800/30 hover:bg-study-light/20 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
              <div className="bg-white dark:bg-zinc-800 p-3 rounded-full shadow-sm">
                {isUploading ? <Loader2 className="animate-spin text-study-primary" /> : <Upload className="text-study-primary" />}
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-study-dark dark:text-zinc-200 uppercase tracking-wide">
                  {isUploading ? "Enviando..." : "Adicionar Arquivo"}
                </p>
                <p className="text-[10px] text-study-medium dark:text-zinc-500 font-medium">PDF, DOCX ou TXT</p>
              </div>
              <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} accept=".pdf,.docx,.txt" />
            </label>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-study bg-white dark:bg-zinc-900 flex-1 min-h-[400px] rounded-[2rem] flex flex-col">
        <CardHeader className="border-b border-study-light/30 dark:border-zinc-800">
          <CardTitle className="text-base flex items-center gap-2 text-study-dark dark:text-zinc-100">
            <FileText size={16} className="text-study-primary" />
            Base de Conhecimento
          </CardTitle>
          <p className="text-[10px] text-study-medium font-bold uppercase tracking-widest mt-1">Fontes de Dados da IA</p>
        </CardHeader>
        <CardContent className="p-0 flex-1">
          <ScrollArea className="h-[400px] px-4 py-4">
            <div className="flex flex-col gap-3">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-study-primary" /></div>
              ) : documents.length === 0 ? (
                <div className="text-center py-10 opacity-40">
                  <File className="mx-auto text-study-light dark:text-zinc-800 mb-2" size={32} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-study-medium">Base vazia</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="group relative flex flex-col gap-2 p-3 rounded-2xl bg-study-light/10 dark:bg-zinc-800/20 border border-study-light/10 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800 transition-all shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-study-primary/10 p-2 rounded-xl h-fit shrink-0">
                          <FileText size={18} className="text-study-primary" />
                        </div>
                        <div className="min-w-0">
                          {editingId === doc.id ? (
                            <div className="flex items-center gap-1">
                              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-7 text-xs rounded-lg" autoFocus />
                              <button onClick={() => saveRename(doc.id)} className="text-green-500 p-1"><Save size={14} /></button>
                              <button onClick={() => setEditingId(null)} className="text-red-400 p-1"><X size={14} /></button>
                            </div>
                          ) : (
                            <>
                              <p className="text-xs font-bold text-study-dark dark:text-zinc-200 truncate">{doc.name}</p>
                              <div className="flex items-center gap-1">
                                <CheckCircle2 size={10} className="text-green-500" />
                                <p className="text-[9px] text-green-600 dark:text-green-500 font-black uppercase tracking-tighter">Pronto</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {isAdmin && !editingId && (
                        <button 
                          onClick={() => triggerN8nProcess(doc)}
                          disabled={isProcessing === doc.id}
                          className="shrink-0 p-1.5 bg-study-primary/10 text-study-primary rounded-lg hover:bg-study-primary hover:text-white transition-colors"
                          title="Processar com n8n"
                        >
                          {isProcessing === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                        </button>
                      )}
                    </div>

                    {isAdmin && !editingId && (
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-1 border-t border-study-light/20 pt-1">
                        <button onClick={() => startEditing(doc)} className="p-1.5 text-study-medium hover:text-study-primary hover:bg-study-light/30 rounded-lg"><Pencil size={12} /></button>
                        <button onClick={() => removeDoc(doc.id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileSidebar;