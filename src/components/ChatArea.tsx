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
    // Alterado de 5 para 1 conforme solicitado para redução de custos
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
    <div className="flex flex-col gap-6 flex-1 w-full max-w-3xl mx-auto pb-20">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-study-dark dark:text-white flex items-center gap-2">
          Professor Virtual
          <Sparkles className="text-study-primary" size={20} />
        </h2>
        <p className="text-study-medium dark:text-zinc-400">Consultando apenas o material oficial desta matéria.</p>
      </div>

      {!currentQuiz && !isLoading && (
        <div className="w-full">
          <Button 
            variant="outline" 
            onClick={() => handleAction('quiz', "Gere um simulado interativo sobre a matéria.")}
            className="w-full h-auto py-6 rounded-2xl border-study-primary/20 bg-study-primary/5 hover:bg-study-primary/10 dark:bg-zinc-900/40 dark:border-zinc-800 flex items-center gap-3 group transition-all"
          >
            <div className="bg-study-primary p-3 rounded-xl text-white">
              <GraduationCap size={24} />
            </div>
            <div className="text-left">
              <p className="font-bold text-study-dark dark:text-zinc-100 text-lg">Gerar Simulado</p>
              <p className="text-xs text-study-medium dark:text-zinc-500">10 questões sobre o conteúdo dos arquivos (Máx 1/dia)</p>
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
            placeholder="Tire suas dúvidas sobre o conteúdo..."
            className="pl-12 pr-24 py-8 rounded-2xl border-none shadow-study bg-white dark:bg-zinc-900 text-lg focus-visible:ring-2 focus-visible:ring-study-primary/20 transition-all dark:text-white"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button 
            type="submit"
            className="absolute right-2 top-2 bottom-2 bg-study-primary hover:bg-study-dark text-white rounded-xl px-6 transition-all"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
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
            <p className="text-study-medium font-medium animate-pulse">O professor está preparando o material...</p>
          </motion.div>
        )}

        {currentQuiz && !isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-study-primary uppercase tracking-widest text-xs">Simulado em Andamento</h3>
              <Button variant="ghost" size="sm" onClick={handleFinishQuiz} className="text-study-medium h-7 gap-1">
                <X size={14} /> Cancelar
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
              <CardContent className="p-8">
                <div className="prose prose-study max-w-none dark:prose-invert">
                  {response.text.split('\n').map((line, i) => (
                    <p key={i} className="text-study-dark dark:text-zinc-200 leading-relaxed mb-4">
                      {line}
                    </p>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-study-light/30 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-study-medium dark:text-zinc-400 mb-3">
                    <Info size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Fontes:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {response.sources.map((source, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-study-light/30 dark:bg-zinc-800/50 text-study-primary text-xs font-medium border border-study-light/50 dark:border-zinc-700">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button onClick={() => setResponse(null)} variant="ghost" className="w-full text-study-medium">Limpar Chat</Button>
          </motion.div>
        )}

        {!response && !isLoading && !currentQuiz && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center opacity-40"
          >
            <Sparkles size={48} className="text-study-medium mb-4" />
            <p className="text-lg font-medium text-study-dark dark:text-zinc-300">Pronto para uma nova ação!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatArea;