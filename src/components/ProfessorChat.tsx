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

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  isSummary?: boolean;
}

interface ProfessorChatProps {
  subjectId: string;
}

const ProfessorChat = ({ subjectId }: ProfessorChatProps) => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<any[] | null>(null);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [pendingAction, setPendingAction] = useState<'quiz' | 'summary' | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, currentQuiz]);

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

  const handleAction = async (actionType: 'chat' | 'quiz' | 'summary', customQuery?: string) => {
    const textToSearch = customQuery || query;
    if (!textToSearch.trim() && actionType === 'chat') return;

    if (actionType !== 'quiz') {
      setMessages(prev => [...prev, { role: 'user', text: textToSearch }]);
    }

    setIsLoading(true);
    setShowFileSelector(false);
    if (actionType === 'chat') setQuery("");

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
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          text: data.text, 
          sources: data.sources,
          isSummary: data.isSummary 
        }]);
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsLoading(false);
      setPendingAction(null);
    }
  };

  return (
    <div className="mt-10 space-y-6">
      <div className="flex items-center justify-between border-t border-study-primary/10 pt-10 px-2">
        <div className="space-y-1">
          <h2 className="text-xl font-black text-study-dark dark:text-white flex items-center gap-2">
            Validação da IA
            <Sparkles className="text-study-primary" size={20} />
          </h2>
          <p className="text-[10px] font-bold uppercase text-study-medium">Teste o Professor Virtual</p>
        </div>

        {!currentQuiz && !isLoading && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-xl border-study-primary/20 bg-study-primary/10 text-study-primary h-10 px-4 font-bold">
                <Menu size={18} className="mr-2" /> Ações
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-white dark:bg-zinc-900 p-2 shadow-2xl">
              <DropdownMenuItem onClick={() => { setPendingAction('quiz'); setShowFileSelector(true); }} className="rounded-xl flex items-center gap-3 p-3 cursor-pointer">
                <div className="bg-study-primary p-2 rounded-lg text-white"><GraduationCap size={18} /></div>
                <div className="flex flex-col"><span className="font-bold text-sm">Gerar Simulado</span><span className="text-[10px] text-study-medium uppercase">Testar IA</span></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setPendingAction('summary'); setShowFileSelector(true); }} className="rounded-xl flex items-center gap-3 p-3 cursor-pointer mt-1">
                <div className="bg-blue-500 p-2 rounded-lg text-white"><BookOpen size={18} /></div>
                <div className="flex flex-col"><span className="font-bold text-sm">Gerar Resumo</span><span className="text-[10px] text-study-medium uppercase">Validar Conteúdo</span></div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex flex-col gap-4 px-2 min-h-[200px]">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn("max-w-[85%] flex flex-col", msg.role === 'user' ? "self-end" : "self-start")}
            >
              <div className={cn(
                "p-4 rounded-2xl shadow-sm text-sm border",
                msg.role === 'user' 
                  ? "bg-study-primary text-zinc-900 border-study-primary/20 rounded-tr-none" 
                  : "bg-white dark:bg-zinc-800 text-study-dark dark:text-zinc-100 border-study-light/10 rounded-tl-none"
              )}>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {msg.text.split('\n').map((line, i) => <p key={i} className="mb-2 last:mb-0">{line}</p>)}
                </div>
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <div className="self-start bg-zinc-800/50 p-3 rounded-2xl flex gap-2">
              <Loader2 className="animate-spin text-study-primary" size={14} />
              <span className="text-[10px] font-bold uppercase text-study-medium">IA Processando...</span>
            </div>
          )}

          {currentQuiz && (
            <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto">
              <div className="w-full max-w-xl">
                <QuizComponent questions={currentQuiz} onClose={() => setCurrentQuiz(null)} subjectId={subjectId} />
              </div>
            </div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} className="h-2" />
      </div>

      {!currentQuiz && (
        <div className="space-y-3 px-2">
          <form onSubmit={(e) => { e.preventDefault(); handleAction('chat'); }} className="relative">
            <Input
              placeholder="Digite sua dúvida aqui..."
              className="pl-4 pr-12 py-7 rounded-2xl border-study-primary/20 bg-white dark:bg-zinc-800 text-sm shadow-md"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <Button type="submit" size="icon" className="absolute right-2 top-2 bottom-2 bg-study-primary text-white rounded-xl" disabled={isLoading || !query.trim()}>
              <Send size={18} />
            </Button>
          </form>
        </div>
      )}

      <Dialog open={showFileSelector} onOpenChange={setShowFileSelector}>
        <DialogContent className="rounded-3xl max-w-[90vw] sm:max-w-md bg-white dark:bg-zinc-900 border-none">
          <DialogHeader><DialogTitle className="text-xl font-black">Validar Materiais</DialogTitle></DialogHeader>
          <div className="py-4 space-y-2 max-h-[40vh] overflow-y-auto">
            {availableDocs.map((doc) => (
              <button key={doc.id} onClick={() => toggleDoc(doc.id)} className={cn("w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all", selectedDocs.includes(doc.id) ? "border-study-primary bg-study-primary/5" : "border-study-light/20 opacity-60")}>
                <div className="flex items-center gap-2"><FileText size={16} className="text-study-primary" /><span className="text-xs font-bold truncate max-w-[150px]">{doc.name}</span></div>
                {selectedDocs.includes(doc.id) ? <CheckSquare className="text-study-primary" size={18} /> : <Square className="text-study-medium" size={18} />}
              </button>
            ))}
          </div>
          <DialogFooter><Button onClick={() => handleAction(pendingAction!)} className="w-full bg-study-primary text-white rounded-xl py-6 font-bold uppercase">Iniciar Validação</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfessorChat;