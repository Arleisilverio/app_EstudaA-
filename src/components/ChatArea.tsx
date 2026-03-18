"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, GraduationCap, Loader2, Info, Zap, X, BookOpen, Menu, CheckSquare, Square, FileText, User } from 'lucide-react';
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
  const { user } = useAuth();
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

  const startActionWithFiles = (type: 'quiz' | 'summary') => {
    if (availableDocs.length === 0) {
      toast.error("Nenhum material disponível para esta matéria ainda.");
      return;
    }
    setPendingAction(type);
    setShowFileSelector(true);
  };

  return (
    <div className="flex flex-col min-h-full w-full max-w-3xl mx-auto relative px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-study-dark dark:text-white flex items-center gap-2">
            Professor Virtual
            <Sparkles className="text-study-primary" size={20} />
          </h2>
          <p className="text-study-medium dark:text-zinc-400 text-xs font-medium uppercase tracking-widest">IA Baseada no seu Material</p>
        </div>

        {!currentQuiz && !isLoading && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-10 w-10 border-study-primary/20 bg-study-primary/10 text-study-primary">
                <Menu size={20} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-white dark:bg-zinc-900 p-2 shadow-2xl">
              <DropdownMenuItem onClick={() => startActionWithFiles('quiz')} className="rounded-xl flex items-center gap-3 p-3 cursor-pointer">
                <div className="bg-study-primary p-2 rounded-lg text-white"><GraduationCap size={16} /></div>
                <div className="flex flex-col"><span className="font-bold text-sm">Gerar Simulado</span><span className="text-[10px] text-study-medium uppercase">Validar Conhecimento</span></div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => startActionWithFiles('summary')} className="rounded-xl flex items-center gap-3 p-3 cursor-pointer mt-1">
                <div className="bg-blue-500 p-2 rounded-lg text-white"><BookOpen size={16} /></div>
                <div className="flex flex-col"><span className="font-bold text-sm">Gerar Resumo</span><span className="text-[10px] text-study-medium uppercase">Tópicos Principais</span></div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-4 pb-32">
        <AnimatePresence>
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "max-w-[85%] flex flex-col gap-1",
                msg.role === 'user' ? "self-end items-end" : "self-start items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-2xl shadow-sm text-sm sm:text-base leading-relaxed",
                msg.role === 'user' 
                  ? "bg-study-primary text-zinc-900 rounded-tr-none font-medium" 
                  : "bg-white dark:bg-zinc-900 text-study-dark dark:text-zinc-100 rounded-tl-none border border-study-light/10"
              )}>
                {msg.isSummary && (
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-study-light/20">
                    <BookOpen size={16} className="text-study-primary" />
                    <span className="text-xs font-black uppercase tracking-widest text-study-primary">Resumo do Material</span>
                  </div>
                )}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {msg.text.split('\n').map((line, i) => (
                    <p key={i} className="mb-2 last:mb-0">{line}</p>
                  ))}
                </div>
                
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-study-light/20 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-study-medium tracking-tighter">
                      <FileText size={12} className="text-study-primary" />
                      Extraído de:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((s, i) => (
                        <span key={i} className="text-[9px] font-bold uppercase bg-study-light/20 dark:bg-zinc-800 px-2.5 py-1 rounded-lg text-study-medium border border-study-light/10">
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
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-study-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <span className="w-1.5 h-1.5 bg-study-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-1.5 h-1.5 bg-study-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
              <span className="text-[10px] font-black uppercase text-study-medium tracking-widest">IA Analisando...</span>
            </motion.div>
          )}

          {currentQuiz && (
            <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm p-4 flex items-center justify-center overflow-y-auto">
              <div className="w-full max-w-xl">
                <QuizComponent questions={currentQuiz} onClose={() => setCurrentQuiz(null)} subjectId={subjectId!} />
              </div>
            </div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} className="h-4" />
      </div>

      {!currentQuiz && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-40">
          <form onSubmit={(e) => { e.preventDefault(); handleAction('chat'); }} className="max-w-3xl mx-auto relative">
            <Input
              placeholder="Pergunte ao Professor Virtual..."
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

      <Dialog open={showFileSelector} onOpenChange={setShowFileSelector}>
        <DialogContent className="rounded-[2.5rem] max-w-[90vw] sm:max-w-md bg-white dark:bg-zinc-900 border-none shadow-2xl">
          <DialogHeader><DialogTitle className="text-xl font-black">Selecionar Materiais</DialogTitle></DialogHeader>
          <div className="py-4 space-y-3 max-h-[40vh] overflow-y-auto">
            {availableDocs.map((doc) => (
              <button key={doc.id} onClick={() => toggleDoc(doc.id)} className={cn("w-full flex items-center justify-between p-4 rounded-2xl border-2", selectedDocs.includes(doc.id) ? "border-study-primary bg-study-primary/5" : "border-study-light/20 opacity-60")}>
                <div className="flex items-center gap-3"><FileText size={18} className="text-study-primary" /><span className="text-xs font-bold truncate max-w-[200px]">{doc.name}</span></div>
                {selectedDocs.includes(doc.id) ? <CheckSquare className="text-study-primary" size={20} /> : <Square className="text-study-medium" size={20} />}
              </button>
            ))}
          </div>
          <DialogFooter><Button onClick={() => handleAction(pendingAction!)} disabled={selectedDocs.length === 0} className="w-full bg-study-primary text-white rounded-xl py-6 font-bold uppercase tracking-widest">Iniciar {pendingAction === 'quiz' ? 'Simulado' : 'Resumo'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChatArea;