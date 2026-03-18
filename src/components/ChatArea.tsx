"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, GraduationCap, Loader2, Info, Zap, X, BookOpen, Menu } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import QuizComponent from './QuizComponent';
import { useAuth } from '@/components/AuthProvider';

const ChatArea = () => {
  const { subjectId } = useParams();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<null | { text: string; sources: string[]; isQuiz?: boolean; isSummary?: boolean }>(null);
  const [currentQuiz, setCurrentQuiz] = useState<any[] | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (response || isLoading || currentQuiz) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [response, isLoading, currentQuiz]);

  const checkDailyLimit = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { count, error } = await supabase
      .from('quiz_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('subject_id', subjectId)
      .gte('created_at', today);

    if (error) return true;
    return (count || 0) < 1;
  };

  const handleAction = async (actionType: 'chat' | 'quiz' | 'summary', customQuery?: string) => {
    const textToSearch = customQuery || query;
    if (!textToSearch.trim() && actionType === 'chat') return;

    if (actionType === 'quiz') {
      const canCreate = await checkDailyLimit();
      if (!canCreate) {
        toast.error("Limite atingido! Você só pode gerar 1 simulado por dia nesta matéria.");
        return;
      }
    }

    setIsLoading(true);
    setResponse(null);
    if (actionType === 'quiz') setCurrentQuiz(null);

    try {
      const { data, error } = await supabase.functions.invoke('chat-with-gemini', {
        body: { 
          subjectId, 
          query: textToSearch, 
          action: actionType 
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
        setResponse(data);
      }

      if (actionType === 'chat') setQuery("");
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishQuiz = () => {
    setCurrentQuiz(null);
    setResponse(null);
    setQuery("");
  };

  return (
    <div className="flex flex-col min-h-full w-full max-w-3xl mx-auto relative">
      <div className="flex items-center justify-between mb-8 px-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold text-study-dark dark:text-white flex items-center gap-2">
            Professor Virtual
            <Sparkles className="text-study-primary" size={20} />
          </h2>
          <p className="text-study-medium dark:text-zinc-400 text-sm">Consultando apenas o material oficial.</p>
        </div>

        {!currentQuiz && !isLoading && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full h-12 w-12 border-study-primary/20 bg-study-primary/10 text-study-primary shadow-lg hover:bg-study-primary hover:text-white transition-all">
                <Menu size={24} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-white dark:bg-zinc-900 border-study-light/20 shadow-2xl p-2">
              <DropdownMenuItem 
                onClick={() => handleAction('quiz', "Gere um simulado sobre a matéria.")}
                className="rounded-xl flex items-center gap-3 p-3 cursor-pointer hover:bg-study-primary/10"
              >
                <div className="bg-study-primary p-2 rounded-lg text-white">
                  <GraduationCap size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Gerar Simulado</span>
                  <span className="text-[10px] text-study-medium font-bold uppercase">Teste seu conhecimento</span>
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleAction('summary', "Gere um resumo estruturado da matéria.")}
                className="rounded-xl flex items-center gap-3 p-3 cursor-pointer mt-1 hover:bg-study-primary/10"
              >
                <div className="bg-blue-500 p-2 rounded-lg text-white">
                  <BookOpen size={18} />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Gerar Resumo</span>
                  <span className="text-[10px] text-study-medium font-bold uppercase">Pontos mais importantes</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex-1 space-y-6 px-4 pb-32">
        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <Loader2 className="animate-spin text-study-primary" size={48} />
              <p className="text-study-medium font-medium text-sm animate-pulse">Consultando base de dados...</p>
            </motion.div>
          )}

          {currentQuiz && !isLoading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-study-primary uppercase tracking-widest text-[10px]">Simulado Ativo</h3>
                <Button variant="ghost" size="sm" onClick={handleFinishQuiz} className="text-study-medium h-7 gap-1 text-[10px]">
                  <X size={12} /> Cancelar
                </Button>
              </div>
              <QuizComponent 
                questions={currentQuiz} 
                onClose={handleFinishQuiz} 
                subjectId={subjectId!}
              />
            </div>
          )}

          {response && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <Card className="border-none shadow-study bg-white dark:bg-zinc-900 overflow-hidden rounded-3xl">
                <CardContent className="p-6 sm:p-10">
                  {response.isSummary && (
                    <div className="mb-6 pb-4 border-b border-study-light/30 flex items-center gap-2">
                      <div className="bg-blue-500 p-2 rounded-xl text-white">
                        <BookOpen size={20} />
                      </div>
                      <h3 className="font-black text-study-dark dark:text-white uppercase tracking-wider">Resumo Pedagógico</h3>
                    </div>
                  )}

                  <div className="prose prose-study max-w-none dark:prose-invert text-sm sm:text-base">
                    {response.text.split('\n').map((line, i) => (
                      <p key={i} className="text-study-dark dark:text-zinc-200 leading-relaxed mb-4">
                        {line}
                      </p>
                    ))}
                  </div>

                  <div className="mt-8 pt-6 border-t border-study-light/30 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-study-medium dark:text-zinc-400 mb-3">
                      <Info size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Fontes analisadas:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {response.sources.map((source, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-study-light/30 dark:bg-zinc-800/50 text-study-primary text-[10px] font-bold border border-study-light/50 dark:border-zinc-700">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Button onClick={() => setResponse(null)} variant="ghost" className="w-full text-study-medium text-xs hover:bg-study-light/10">Limpar esta resposta</Button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={bottomRef} className="h-4" />
      </div>

      {!currentQuiz && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-40">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleAction('chat'); }} 
            className="max-w-3xl mx-auto relative group"
          >
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Zap className="text-study-medium group-focus-within:text-study-primary transition-colors" size={20} />
            </div>
            <Input
              placeholder="Pergunte algo sobre o material..."
              className="pl-12 pr-14 sm:pr-24 py-7 rounded-[2rem] border-none shadow-2xl bg-white dark:bg-zinc-900 text-base focus-visible:ring-2 focus-visible:ring-study-primary/20 transition-all dark:text-white"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button 
              type="submit"
              size="icon"
              className="absolute right-2 top-2 bottom-2 aspect-square bg-study-primary hover:bg-study-dark text-white rounded-full transition-all"
              disabled={isLoading || !query.trim()}
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={20} />}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ChatArea;