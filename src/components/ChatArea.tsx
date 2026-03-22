"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, GraduationCap, Loader2, Info, Zap, X, BookOpen, Menu, CheckSquare, Square, FileText, User, AlertTriangle, ShieldCheck } from 'lucide-react';
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
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import QuizComponent from './QuizComponent';
import { useAuth } from '@/components/AuthProvider';
import { cn } from "@/lib/utils";

interface Message {
  role: 'user' | 'assistant';
  text: string;
  sources?: string[];
  isSummary?: boolean;
}

const ChatArea = () => {
  const { subjectId } = useParams();
  const { user, isAdmin, isProfessor } = useAuth();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<any[] | null>(null);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [selectedDocs, setSelectedDocs] = useState<string[]>([]);
  const [showFileSelector, setShowFileSelector] = useState(false);
  const [pendingAction, setPendingAction] = useState<'quiz' | 'summary' | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const CACHE_KEY = `cached_docs_${subjectId}`;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, currentQuiz]);

  useEffect(() => {
    if (subjectId) {
      fetchDocuments();
    }
  }, [subjectId]);

  const fetchDocuments = async () => {
    try {
      const { data } = await supabase
        .from('documents')
        .select('id, name')
        .eq('subject_id', subjectId)
        .eq('status', 'ready');
      
      if (data) {
        setAvailableDocs(data);
        setSelectedDocs(data.map(d => d.id));
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    } catch (err) {
      console.error("Erro ao carregar docs no chat:", err);
    }
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
          if (!parsed.questions || parsed.questions.length < 1) throw new Error("Quiz vazio");
          setCurrentQuiz(parsed.questions);
        } catch (e) {
          toast.error("Erro ao gerar simulado. Tente novamente.");
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
    <div className="flex flex-col min-h-full w-full max-w-3xl mx-auto relative px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-study-dark dark:text-white flex items-center gap-2">
            Professor Virtual
            <Sparkles className="text-study-primary" size={20} />
          </h2>
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-green-500" />
            <p className="text-[10px] text-study-medium dark:text-zinc-400 font-black uppercase tracking-widest">
              Base de Conhecimento Oficial
            </p>
          </div>
        </div>

        {!currentQuiz && !isLoading && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-study-primary/20 bg-study-primary/10 text-study-primary">
                <Menu size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-white dark:bg-zinc-900 p-2 shadow-2xl">
              <DropdownMenuItem onClick={() => { setPendingAction('quiz'); setShowFileSelector(true); }} className="rounded-xl flex items-center gap-3 p-3 cursor-pointer">
                <div className="bg-study-primary p-2 rounded-lg text-white"><GraduationCap size={16} /></div>
                <div className="flex flex-col"><span className="font-bold text-sm">Gerar Simulado</span><span className="text-[10px] text-study-medium uppercase">10 Questões do Material</span></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setPendingAction('summary'); setShowFileSelector(true); }} className="rounded-xl flex items-center gap-3 p-3 cursor-pointer mt-1">
                <div className="bg-blue-500 p-2 rounded-lg text-white"><BookOpen size={16} /></div>
                <div className="flex flex-col"><span className="font-bold text-sm">Gerar Resumo</span><span className="text-[10px] text-study-medium uppercase">Tópicos Principais</span></div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-4 pb-32">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-60">
            <div className="bg-study-primary/10 p-6 rounded-[2.5rem]">
              <GraduationCap size={48} className="text-study-primary" />
            </div>
            <div className="max-w-xs">
              <p className="text-sm font-bold text-study-dark dark:text-white">Olá! Sou sua IA de estudos.</p>
              <p className="text-xs text-study-medium mt-1">Minhas respostas são baseadas exclusivamente nos materiais que seu professor disponibilizou aqui.</p>
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "max-w-[90%] flex flex-col gap-1",
                msg.role === 'user' ? "self-end items-end" : "self-start items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-2xl shadow-sm text-sm sm:text-base leading-relaxed",
                msg.role === 'user' 
                  ? "bg-study-primary text-zinc-900 rounded-tr-none font-medium" 
                  : "bg-white dark:bg-zinc-900 text-study-dark dark:text-zinc-100 rounded-tl-none border border-study-light/10"
              )}>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {msg.text.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0">{line}</p>
                  ))}
                </div>
                
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-study-light/20">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-study-medium tracking-tighter mb-2">
                      <FileText size={10} className="text-study-primary" />
                      Baseado em:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((s, i) => (
                        <span key={i} className="text-[8px] font-bold uppercase bg-study-light/20 dark:bg-zinc-800 px-2 py-0.5 rounded-md text-study-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="self-start flex items-center gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-study-light/10 shadow-sm">
              <Loader2 className="animate-spin text-study-primary" size={16} />
              <span className="text-[10px] font-black uppercase text-study-medium tracking-widest">Consultando Material...</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} className="h-4" />
      </div>

      {!currentQuiz && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-40">
          <form onSubmit={(e) => { e.preventDefault(); handleAction('chat'); }} className="max-w-3xl mx-auto relative">
            <Input
              placeholder="Tire sua dúvida sobre o material..."
              className="pl-4 pr-14 py-7 rounded-[2rem] border-none shadow-2xl bg-white dark:bg-zinc-900 text-sm focus-visible:ring-2 focus-visible:ring-study-primary/20 transition-all dark:text-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <Button 
              type="submit"
              size="icon"
              className="absolute right-2 top-2 bottom-2 aspect-square bg-study-primary hover:bg-study-dark text-white rounded-full transition-all"
              disabled={isLoading || !query.trim()}
            >
              <Send size={20} />
            </Button>
          </form>
        </div>
      )}

      {currentQuiz && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm p-4 overflow-y-auto flex flex-col items-center">
          <div className="w-full max-w-xl py-10">
            <QuizComponent questions={currentQuiz} onClose={() => setCurrentQuiz(null)} subjectId={subjectId!} />
          </div>
        </div>
      )}

      <Dialog open={showFileSelector} onOpenChange={setShowFileSelector}>
        <DialogContent className="rounded-[2.5rem] max-w-[90vw] sm:max-w-md bg-white dark:bg-zinc-900 border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black flex items-center gap-2">
              <GraduationCap className="text-study-primary" /> 
              {pendingAction === 'quiz' ? 'Gerar Simulado' : 'Gerar Resumo'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-study-primary/10 p-4 rounded-2xl border border-study-primary/20 flex gap-3">
              <Info className="text-study-primary shrink-0" size={20} />
              <p className="text-[11px] font-bold text-study-dark dark:text-zinc-300 leading-tight">
                {pendingAction === 'quiz' 
                  ? "A IA criará 10 questões baseadas nos materiais selecionados abaixo."
                  : "A IA criará um resumo estruturado dos materiais selecionados."}
              </p>
            </div>

            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
              {availableDocs.map((doc) => (
                <button 
                  key={doc.id} 
                  onClick={() => setSelectedDocs(prev => prev.includes(doc.id) ? prev.filter(id => id !== doc.id) : [...prev, doc.id])} 
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all", 
                    selectedDocs.includes(doc.id) 
                      ? "border-study-primary bg-study-primary/5" 
                      : "border-study-light/20 opacity-60"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <FileText size={18} className="text-study-primary" />
                    <span className="text-xs font-bold truncate max-w-[200px]">{doc.name}</span>
                  </div>
                  {selectedDocs.includes(doc.id) ? <CheckSquare className="text-study-primary" size={20} /> : <Square className="text-study-medium" size={20} />}
                </button>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={() => handleAction(pendingAction!)} 
              disabled={selectedDocs.length === 0 || isLoading} 
              className="w-full bg-study-primary text-white rounded-xl py-6 font-bold uppercase tracking-widest flex gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : <Zap size={18} />}
              Iniciar {pendingAction === 'quiz' ? 'Simulado' : 'Resumo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatArea;