"use client";

import React, { useState, useEffect } from 'react';
import { Upload, FileText, Trash2, File, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useParams } from 'react-router-dom';

interface Document {
  id: string;
  name: string;
  status: string;
  subject_id: string;
}

const FileSidebar = () => {
  const { isAdmin, user } = useAuth();
  const { subjectId } = useParams();
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, [subjectId]);

  const fetchDocuments = async () => {
    try {
      let query = supabase.from('documents').select('*');
      if (subjectId) {
        query = query.eq('subject_id', subjectId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
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
      {isAdmin && (
        <Card className="border-none shadow-study bg-white dark:bg-zinc-900 overflow-hidden">
          <CardHeader className="bg-study-light/30 dark:bg-zinc-800/50">
            <CardTitle className="text-lg flex items-center gap-2 text-study-dark dark:text-zinc-100">
              <Upload size={18} className="text-study-primary" />
              Enviar Documentos (Admin)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <label className="border-2 border-dashed border-study-light dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-study-light/10 dark:bg-zinc-800/30 hover:bg-study-light/20 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer">
              <div className="bg-white dark:bg-zinc-800 p-3 rounded-full shadow-sm">
                {isUploading ? <Loader2 className="animate-spin text-study-primary" /> : <Upload className="text-study-primary" />}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-study-dark dark:text-zinc-200">Clique para enviar</p>
                <p className="text-xs text-study-medium dark:text-zinc-500">PDF, DOCX ou TXT</p>
              </div>
              <input type="file" className="hidden" onChange={handleUpload} disabled={isUploading} />
            </label>
          </CardContent>
        </Card>
      )}

      <Card className="border-none shadow-study bg-white dark:bg-zinc-900 flex-1 min-h-[400px]">
        <CardHeader className="border-b border-study-light/30 dark:border-zinc-800">
          <CardTitle className="text-lg flex items-center gap-2 text-study-dark dark:text-zinc-100">
            <FileText size={18} className="text-study-primary" />
            Conteúdo Disponível
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] px-4 py-4">
            <div className="flex flex-col gap-3">
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-study-primary" /></div>
              ) : documents.length === 0 ? (
                <div className="text-center py-10">
                  <File className="mx-auto text-study-light dark:text-zinc-800 mb-2" size={32} />
                  <p className="text-sm text-study-medium dark:text-zinc-500">Nenhum arquivo nesta matéria.</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="group relative flex items-center gap-3 p-3 rounded-xl bg-study-light/10 dark:bg-zinc-800/20 border border-study-light/20 dark:border-zinc-800 hover:border-study-medium/30 transition-all">
                    <div className="bg-white dark:bg-zinc-800 p-2 rounded-lg shadow-sm">
                      <FileText size={20} className="text-study-medium dark:text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-study-dark dark:text-zinc-200 truncate">{doc.name}</p>
                      <p className="text-[10px] text-green-600 dark:text-green-500 font-semibold uppercase tracking-wider">Disponível para Estudo</p>
                    </div>
                    {isAdmin && (
                      <button 
                        onClick={() => removeDoc(doc.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
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