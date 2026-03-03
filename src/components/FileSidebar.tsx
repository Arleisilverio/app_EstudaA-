"use client";

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, File, Loader2, ChevronLeft } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useParams, useNavigate } from 'react-router-dom';

interface Document {
  id: string;
  name: string;
  status: string;
  subject_id: string;
}

const FileSidebar = () => {
  const { isAdmin, user } = useAuth();
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [subjectName, setSubjectName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (subjectId) {
      fetchSubjectInfo();
      fetchDocuments();
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

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !isAdmin) return;

    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('documents')
        .insert([{
          name: file.name,
          file_path: filePath,
          subject_id: subjectId,
          user_id: user?.id,
          status: 'ready'
        }]);

      if (dbError) throw dbError;

      showSuccess("Documento adicionado à base!");
      fetchDocuments();
    } catch (err) {
      console.error(err);
      showError("Erro ao enviar arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  const removeDoc = async (id: string) => {
    if (!isAdmin) return;
    try {
      const { error } = await supabase.from('documents').delete().eq('id', id);
      if (error) throw error;
      setDocuments(docs => docs.filter(d => d.id !== id));
      showSuccess("Documento removido");
    } catch (err) {
      showError("Erro ao remover");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full lg:max-w-xs">
      <div className="flex flex-col gap-1">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-xs font-bold text-study-primary uppercase tracking-wider hover:opacity-70 mb-2"
        >
          <ChevronLeft size={14} /> Voltar para Home
        </button>
        <h2 className="text-2xl font-black text-study-dark dark:text-white leading-tight">
          {subjectName || "Carregando..."}
        </h2>
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
                <p className="text-xs font-bold text-study-dark dark:text-zinc-200 uppercase tracking-wide">Selecionar Arquivo</p>
                <p className="text-[10px] text-study-medium dark:text-zinc-500 font-medium">PDF, DOCX ou TXT</p>
              </div>
              <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} accept=".pdf,.docx,.txt" />
            </label>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-study bg-white dark:bg-zinc-900 flex-1 min-h-[400px] rounded-[2rem]">
        <CardHeader className="border-b border-study-light/30 dark:border-zinc-800">
          <CardTitle className="text-base flex items-center gap-2 text-study-dark dark:text-zinc-100">
            <FileText size={16} className="text-study-primary" />
            Base de Conhecimento
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] px-4 py-4">
            <div className="flex flex-col gap-3">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-study-primary" /></div>
              ) : documents.length === 0 ? (
                <div className="text-center py-10 opacity-40">
                  <File className="mx-auto text-study-light dark:text-zinc-800 mb-2" size={32} />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-study-medium">Nenhum arquivo ainda</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="group relative flex items-center gap-3 p-3 rounded-2xl bg-study-light/10 dark:bg-zinc-800/20 border border-study-light/10 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800 transition-all shadow-sm">
                    <div className="bg-study-primary/10 p-2 rounded-xl">
                      <FileText size={18} className="text-study-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-study-dark dark:text-zinc-200 truncate">{doc.name}</p>
                      <p className="text-[9px] text-green-600 dark:text-green-500 font-black uppercase tracking-tighter">Indexado</p>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => removeDoc(doc.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
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