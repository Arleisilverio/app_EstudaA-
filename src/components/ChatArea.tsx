"use client";

import React, { useState } from 'react';
import { Send, Sparkles, BookOpen, GraduationCap, Loader2, Info, Zap, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from '@/integrations/supabase/client';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import QuizComponent from './QuizComponent';

const ChatArea = () => {
  const { subjectId } = useParams();
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<null | { text: string; sources: string[]; isQuiz?: boolean }>(null);
  const [currentQuiz, setCurrentQuiz] = useState<any[] | null>(null);

  const handleAction = async (actionType: 'chat' | 'summary' | 'quiz', customQuery?: string) => {
    const textToSearch = customQuery || query;
    if (!textToSearch.trim() && actionType === 'chat') return;

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

      if (error) throw error;
      
      setResponse(data);
      
      if (data.isQuiz) {
        try {
          const parsed = JSON.parse(data.text);
          setCurrentQuiz(parsed.questions || []);
        } catch (e) {
          console.error("Erro ao processar JSON do simulado:", e);
          toast.error("O professor gerou o simulado em formato incorreto. Tente novamente.");
        }
      }

      if (actionType === 'chat') setQuery("");
    } catch (err: any) {
      console.error("Erro na IA:", err);
      toast.error("Erro ao processar sua solicitação.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 flex-1 w-full max-w-3xl mx-auto pb-20">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-study-dark dark:text-white flex items-center gap-2">
          Pergunte ao Professor Virtual
          <Sparkles className="text-study-primary" size={20} />
        </h2>
        <p className="text-study-medium dark:text-zinc-400">Respostas baseadas exclusivamente no material desta matéria.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          onClick={() => handleAction('summary', "Por favor, gere um resumo completo de todo o material disponível.")}
          className="h-auto py-4 rounded-2xl border-study-primary/20 bg-study-primary/5 hover:bg-study-primary/10 dark:bg-zinc-900/40 dark:border-zinc-800 flex items-center gap-3 group transition-all"
        >
          <div className="bg-study-primary p-2 rounded-xl text-white">
            <BookOpen size={18} />
          </div>
          <div className="text-left">
            <p className="font-bold text-study-dark dark:text-zinc-100 text-sm">Gerar Resumo</p>
            <p className="text-[10px] text-study-medium dark:text-zinc-500">Síntese inteligente</p>
          </div>
        </Button>

        <Button 
          variant="outline" 
          onClick={() => handleAction('quiz', "Gere um simulado com 10 questões sobre a matéria conforme as regras de JSON estabelecidas.")}
          className="h-auto py-4 rounded-2xl border-study-primary/20 bg-study-primary/5 hover:bg-study-primary/10 dark:bg-zinc-900/40 dark:border-zinc-800 flex items-center gap-3 group transition-all"
        >
          <div className="bg-study-primary p-2 rounded-xl text-white">
            <GraduationCap size={18} />
          </div>
          <div className="text-left">
            <p className="font-bold text-study-dark dark:text-zinc-100 text-sm">Gerar Simulado</p>
            <p className="text-[10px] text-study-medium dark:text-zinc-500">10 questões interativas</p>
          </div>
        </Button>
      </div>

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

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="relative">
              <Loader2 className="animate-spin text-study-primary" size={48} />
              <Sparkles className="absolute top-0 right-0 text-study-medium animate-pulse" size={16} />
            </div>
            <p className="text-study-medium font-medium animate-pulse dark:text-zinc-400">O professor está preparando o material...</p>
          </motion.div>
        )}

        {currentQuiz && !isLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-black text-study-primary uppercase tracking-widest text-xs">Simulado Disponível</h3>
              <Button variant="ghost" size="sm" onClick={() => setCurrentQuiz(null)} className="text-study-medium h-7 gap-1">
                <X size={14} /> Fechar
              </Button>
            </div>
            <QuizComponent questions={currentQuiz} onClose={() => setCurrentQuiz(null)} />
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
                    <span className="text-xs font-bold uppercase tracking-wider">Base de conhecimento utilizada:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {response.sources.length > 0 ? (
                      response.sources.map((source, i) => (
                        <span key={i} className="px-3 py-1 rounded-full bg-study-light/30 dark:bg-zinc-800/50 text-study-primary text-xs font-medium border border-study-light/50 dark:border-zinc-700">
                          {source}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-study-medium italic">Nenhum arquivo encontrado. Resposta baseada em conhecimentos gerais.</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {!response && !isLoading && !currentQuiz && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center opacity-40"
          >
            <div className="bg-study-light/50 dark:bg-zinc-800 p-6 rounded-full mb-4">
              <Sparkles size={48} className="text-study-medium dark:text-zinc-400" />
            </div>
            <p className="text-lg font-medium text-study-dark dark:text-zinc-300">Professor Online!</p>
            <p className="text-sm text-study-medium dark:text-zinc-500">Envie um arquivo ou faça uma pergunta sobre a matéria.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatArea;