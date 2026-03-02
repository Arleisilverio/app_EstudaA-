"use client";

import React, { useState } from 'react';
import { Upload, FileText, Trash2, File, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { showSuccess } from "@/utils/toast";

interface Document {
  id: string;
  name: string;
  type: string;
  status: 'indexed' | 'processing';
}

const FileSidebar = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([
    { id: '1', name: 'Biologia_Celular.pdf', type: 'pdf', status: 'indexed' },
    { id: '2', name: 'Resumo_Historia.docx', type: 'docx', status: 'indexed' },
    { id: '3', name: 'Notas_Aula_01.txt', type: 'txt', status: 'processing' },
  ]);

  const handleUpload = () => {
    setIsUploading(true);
    // Simulação de upload
    setTimeout(() => {
      setIsUploading(false);
      showSuccess("Arquivo enviado com sucesso!");
    }, 2000);
  };

  const removeDoc = (id: string) => {
    setDocuments(docs => docs.filter(d => d.id !== id));
  };

  return (
    <div className="flex flex-col gap-6 w-full lg:max-w-xs">
      <Card className="border-none shadow-study bg-white dark:bg-zinc-900 overflow-hidden">
        <CardHeader className="bg-study-light/30 dark:bg-zinc-800/50">
          <CardTitle className="text-lg flex items-center gap-2 text-study-dark dark:text-zinc-100">
            <Upload size={18} className="text-study-primary" />
            Enviar Documentos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div 
            className="border-2 border-dashed border-study-light dark:border-zinc-800 rounded-xl p-6 flex flex-col items-center justify-center gap-3 bg-study-light/10 dark:bg-zinc-800/30 hover:bg-study-light/20 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
            onClick={handleUpload}
          >
            <div className="bg-white dark:bg-zinc-800 p-3 rounded-full shadow-sm">
              {isUploading ? <Loader2 className="animate-spin text-study-primary" /> : <Upload className="text-study-primary" />}
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-study-dark dark:text-zinc-200">Clique ou arraste</p>
              <p className="text-xs text-study-medium dark:text-zinc-500">PDF, DOCX ou TXT</p>
            </div>
          </div>
          <Button 
            className="w-full mt-4 bg-study-primary hover:bg-study-dark text-white rounded-xl py-6 dark:text-zinc-900 font-bold"
            onClick={handleUpload}
            disabled={isUploading}
          >
            Selecionar Arquivo
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-study bg-white dark:bg-zinc-900 flex-1 min-h-[400px]">
        <CardHeader className="border-b border-study-light/30 dark:border-zinc-800">
          <CardTitle className="text-lg flex items-center gap-2 text-study-dark dark:text-zinc-100">
            <FileText size={18} className="text-study-primary" />
            Base de Dados
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] px-4 py-4">
            <div className="flex flex-col gap-3">
              {documents.length === 0 ? (
                <div className="text-center py-10">
                  <File className="mx-auto text-study-light dark:text-zinc-800 mb-2" size={32} />
                  <p className="text-sm text-study-medium dark:text-zinc-500">Nenhum arquivo ainda.</p>
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="group relative flex items-center gap-3 p-3 rounded-xl bg-study-light/10 dark:bg-zinc-800/20 border border-study-light/20 dark:border-zinc-800 hover:border-study-medium/30 transition-all">
                    <div className="bg-white dark:bg-zinc-800 p-2 rounded-lg shadow-sm">
                      <FileText size={20} className="text-study-medium dark:text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-study-dark dark:text-zinc-200 truncate">{doc.name}</p>
                      {doc.status === 'processing' ? (
                        <div className="mt-1">
                          <p className="text-[10px] text-study-medium dark:text-zinc-500 mb-1">Indexando...</p>
                          <Progress value={45} className="h-1 bg-study-light dark:bg-zinc-800" />
                        </div>
                      ) : (
                        <p className="text-[10px] text-green-600 dark:text-green-500 font-semibold uppercase tracking-wider">Pronto</p>
                      )}
                    </div>
                    <button 
                      onClick={() => removeDoc(doc.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
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