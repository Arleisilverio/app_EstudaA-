"use client";

import React, { useState, useEffect } from 'react';
import { Send, Sparkles, GraduationCap, Loader2, Info, Zap, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
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
  const [response, setResponse] = useState<null | { text: string; sources: string[]; isQuiz?: boolean }>(null);
  const [currentQuiz, setCurrentQuiz] = useState<any[] | null>(null);

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

  const handleAction = async (actionType: 'chat' | 'quiz', customQuery?: string) => {
    const textToSearch = customQuery || query;
    if (!textToSearch.trim() && actionType === 'chat') return;

    if (actionType === 'quiz') {
      const canCreate = await checkDailyLimit();
      if (!canCreate) {
        toast.error("Limite atingido! Você só pode gerar 1 simulado por dia nesta matéria durante o desenvolvimento.");
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

      if (error) {
        console.error("Função erro:", error);
        throw new Error(error.message || "Falha na comunicação com o servidor");
      }
      
      if (!data) throw new Error("Servidor não retornou dados");

      if (data.isQuiz) {
        try {
          const jsonString = data.text.trim();
          const parsed = JSON.parse(jsonString);
          if (parsed.questions && Array.isArray(parsed.questions)) {
            setCurrentQuiz(parsed.questions);
          } else {
            throw new Error("Formato de quiz inválido");
          }
        } catch (e) {
          console.error("Erro parse quiz:", e, data.text);
          toast.error("A IA gerou um formato inválido. Tente novamente.");
        }
      } else {
        setResponse(data);
      }

      if (actionType === 'chat') setQuery("");
    } catch (err: any) {
      console.error("Erro geral processamento:", err);
      toast.error(`Erro: ${err.message || "Não foi possível processar."}`);
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
    <div className="flex flex-col gap-6 flex-1 w-full max-w-3xl mx-auto pb-20 px-4">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-study-dark dark:text-white flex items-center gap-2">
          Professor Virtual
          <Sparkles className="text-study-primary" size={20} />
        </h2>
        <p className="text-study-medium dark:text-zinc-400 text-sm">Consultando apenas o material oficial desta matéria.</p>
      </div>

      {!currentQuiz && !isLoading && (
        <div className="w-full">
          <Button 
            variant="outline" 
            onClick={() => handleAction('quiz', "Gere um simulado interativo sobre a matéria.")}
            className="w-full h-auto py-5 px-4 sm:px-6 rounded-2xl border-study-primary/20 bg-study-primary/5 hover:bg-study-primary/10 dark:bg-zinc-900/40 dark:border-zinc-800 flex items-center gap-4 group transition-all overflow-hidden"
          >
            <div className="bg-study-primary p-2.5 sm:p-3 rounded-xl text-white shrink-0 shadow-sm group-hover:scale-110 transition-transform">
              <GraduationCap size={22} className="sm:size-[24px]" />
            </div>
            <div className="text-left min-w-0">
              <p className="font-black text-study-dark dark:text-zinc-100 text-base sm:text-lg tracking-tight">Gerar Simulado</p>
            </div>
          </Button>
        </div>
      )}

      {!currentQuiz && (
        <form 
          onSubmit={(e) => { e.preventDefault(); handleAction('chat'); }} 
          className="relative group"
        >
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Zap className="text-study-medium group-focus-within:text-study-primary transition-colors" size={20} />
          </div>
          <Input
            placeholder="Tire suas dúvidas..."
            className="pl-12 pr-14 sm:pr-24 py-7 sm:py-8 rounded-2xl border-none shadow-study bg-white dark:bg-zinc-900 text-base sm:text-lg focus-visible:ring-2 focus-visible:ring-study-primary/20 transition-all dark:text-white"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button 
            type="submit"
            className="absolute right-1.5 top-1.5 bottom-1.5 bg-study-primary hover:bg-study-dark text-white rounded-xl px-4 sm:px-6 transition-all"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            <span className="ml-2 hidden sm:inline">Perguntar</span>
          </Button>
        </form>
      )}

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <Loader2 className="animate-spin text-study-primary" size={48} />
            <p className="text-study-medium font-medium animate-pulse text-sm">O professor está preparando o material...</p>
          </motion.div>
        )}

        {currentQuiz && !isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-study-primary uppercase tracking-widest text-[10px]">Simulado em Andamento</h3>
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
        ) : response && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="border-none shadow-study bg-white dark:bg-zinc-900 overflow-hidden rounded-2xl">
              <CardContent className="p-5 sm:p-8">
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
                    <span className="text-[10px] font-bold uppercase tracking-wider">Fontes:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {response.sources.map((source, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-full bg-study-light/30 dark:bg-zinc-800/50 text-study-primary text-[10px] font-medium border border-study-light/50 dark:border-zinc-700">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button onClick={() => setResponse(null)} variant="ghost" className="w-full text-study-medium text-xs">Limpar Chat</Button>
          </motion.div>
        )}

        {!response && !isLoading && !currentQuiz && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center opacity-40"
          >
            <Sparkles size={40} className="text-study-medium mb-4" />
            <p className="text-sm font-medium text-study-dark dark:text-zinc-300">Pronto para uma nova ação!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatArea;