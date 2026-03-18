"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, GraduationCap, Loader2, Info, Zap, X, BookOpen, Menu, CheckSquare, Square, FileText } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import QuizComponent from './QuizComponent';
import { cn } from "@/lib/utils";

interface ProfessorChatProps {
  subjectId: string;
}

const ProfessorChat = ({ subjectId }: ProfessorChatProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<null | { text: string; sources: string[]; isQuiz?: boolean; isSummary?: boolean }>(null);
  const [currentQuiz, setCurrentQuiz] = useState<any[] | null>(null);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [pendingAction, setPendingAction] = useState<'quiz' | 'summary' | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (response || isLoading || currentQuiz) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [response, isLoading, currentQuiz]);

  useEffect(() => {
    if (subjectId) fetchDocuments();
  }, [subjectId]);

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('documents')
      .select('id, name')
      .eq('subject_id', subjectId)
      .eq('status', 'ready');
    if (data) {
      setAvailableDocs(data);
      setSelectedDocs(data.map(d => d.id));
    }
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const startActionWithFiles = (type: 'quiz' | 'summary') => {
    if (availableDocs.length === 0) {
      toast.error("Suba materiais primeiro para validar com a IA.");
      return;
    }
    setPendingAction(type);
    setShowFileSelector(true);
  };

  const handleAction = async (actionType: 'chat' | 'quiz' | 'summary', customQuery?: string) => {
    const textToSearch = customQuery || query;
    if (!textToSearch.trim() && actionType === 'chat') return;

    setIsLoading(true);
    setResponse(null);
    if (actionType === 'quiz') setCurrentQuiz(null);
    setShowFileSelector(false);

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-gemini', {
        body: { 
          subjectId, 
          query: textToSearch, 
          action: actionType,
          documentIds: actionType === 'chat' ? [] : selectedDocs
        }
      });

      if (error) throw new Error(error.message || "Falha na comunicação");
      
      if (data.isQuiz) {
        try {
          const parsed = JSON.parse(data.text.trim());
          setCurrentQuiz(parsed.questions);
        } catch (e) {
          toast.error("Erro ao gerar simulado de teste.");
        }
      } else {
        setResponse(data);
      }

      if (actionType === 'chat') setQuery("");
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsLoading(false);
      setPendingAction(null);
    }
  };

  const handleFinishQuiz = () => {
    setCurrentQuiz(null);
    setResponse(null);
    setQuery("");
  };

  return (
    <div className="mt-10 space-y-6">
      <div className="flex items-center justify-between border-t border-study-primary/10 pt-10">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-study-dark dark:text-white flex items-center gap-2">
            Validação da IA
            <Sparkles className="text-study-primary" size={20} />
          </h2>
          <p className="text-[10px] text-study-medium font-bold uppercase tracking-widest">Teste as respostas do seu Professor Virtual</p>
        </div>

        {!currentQuiz && !isLoading && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl border-study-primary/20 bg-study-primary/10 text-study-primary gap-2 font-bold h-10">
                <Menu size={18} /> Testar IA
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-white dark:bg-zinc-900 border-study-light/20 shadow-2xl p-2">
              <DropdownMenuItem onClick={() => startActionWithFiles('quiz')} className="rounded-xl flex items-center gap-3 p-3 cursor-pointer">
                <div className="bg-study-primary p-2 rounded-lg text-white"><GraduationCap size={18} /></div>
                <div className="flex flex-col"><span className="font-bold text-sm">Gerar Simulado</span><span className="text-[10px] text-study-medium uppercase">Validar Questões</span></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => startActionWithFiles('summary')} className="rounded-xl flex items-center gap-3 p-3 cursor-pointer mt-1">
                <div className="bg-blue-500 p-2 rounded-lg text-white"><BookOpen size={18} /></div>
                <div className="flex flex-col"><span className="font-bold text-sm">Gerar Resumo</span><span className="text-[10px] text-study-medium uppercase">Validar Conteúdo</span></div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="wait">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <Loader2 className="animate-spin text-study-primary" size={40} />
              <p className="text-[10px] font-bold uppercase text-study-medium animate-pulse">A IA está processando seu material...</p>
            </div>
          )}

          {currentQuiz && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <Badge className="bg-study-primary text-white font-black">MODO TESTE PROFESSOR</Badge>
                <Button variant="ghost" size="sm" onClick={handleFinishQuiz} className="text-study-medium h-7 gap-1 text-[10px]"><X size={12} /> FECHAR</Button>
              </div>
              <QuizComponent questions={currentQuiz} onClose={handleFinishQuiz} subjectId={subjectId} />
            </div>
          )}

          {response && !isLoading && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <Card className="border-2 border-study-primary/20 shadow-none bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden">
                <CardContent className="p-6">
                  <div className="prose prose-sm prose-study max-w-none dark:prose-invert">
                    {response.text.split('\n').map((line, i) => <p key={i} className="text-study-dark dark:text-zinc-200 leading-relaxed mb-3">{line}</p>)}
                  </div>
                  <div className="mt-6 pt-4 border-t border-study-light/30 flex items-center gap-2">
                    <Info size={12} className="text-study-primary" />
                    <span className="text-[9px] font-bold text-study-medium uppercase tracking-widest">Baseado em: {response.sources.join(', ')}</span>
                  </div>
                </CardContent>
              </Card>
              <Button onClick={() => setResponse(null)} variant="ghost" className="w-full text-study-medium text-xs font-bold uppercase tracking-widest">Limpar Resposta</Button>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} className="h-4" />
      </div>

      {!currentQuiz && (
        <div className="space-y-3">
          <form onSubmit={(e) => { e.preventDefault(); handleAction('chat'); }} className="relative group">
            <Input
              placeholder="Pergunte à IA para validar seu material..."
              className="pl-4 pr-12 py-7 rounded-2xl border-study-primary/20 shadow-lg bg-white dark:bg-zinc-800 text-sm focus-visible:ring-study-primary/20 transition-all dark:text-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" size="icon" className="absolute right-2 top-2 bottom-2 bg-study-primary text-white rounded-xl" disabled={isLoading || !query.trim()}>
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            </Button>
          </form>
          <div className="flex items-center gap-2 px-2">
            <Zap size={14} className="text-study-primary" />
            <p className="text-[9px] font-bold text-study-medium uppercase">Use para verificar se a IA entendeu os conceitos principais.</p>
          </div>
        </div>
      )}

      <Dialog open={showFileSelector} onOpenChange={setShowFileSelector}>
        <DialogContent className="rounded-3xl max-w-[90vw] sm:max-w-md bg-white dark:bg-zinc-900 border-none">
          <DialogHeader><DialogTitle className="text-xl font-black">Validar Material Específico</DialogTitle></DialogHeader>
          <div className="py-4 space-y-3 max-h-[40vh] overflow-y-auto pr-2">
            {availableDocs.map((doc) => (
              <button key={doc.id} onClick={() => toggleDoc(doc.id)} className={cn("w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all", selectedDocs.includes(doc.id) ? "border-study-primary bg-study-primary/5" : "border-study-light/20 opacity-60")}>
                <div className="flex items-center gap-3"><FileText size={18} className="text-study-primary" /><span className="text-xs font-bold text-study-dark dark:text-zinc-200 truncate max-w-[150px]">{doc.name}</span></div>
                {selectedDocs.includes(doc.id) ? <CheckSquare className="text-study-primary" size={18} /> : <Square className="text-study-medium" size={18} />}
              </button>
            ))}
          </div>
          <DialogFooter><Button onClick={() => handleAction(pendingAction!)} disabled={selectedDocs.length === 0} className="w-full bg-study-primary text-white rounded-xl py-6 font-bold uppercase tracking-widest">Iniciar Validação</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfessorChat;