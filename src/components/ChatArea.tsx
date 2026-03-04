"use client";

import React, { useState, useEffect, useRef } from 'react';
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
  const bottomRef = useRef<HTMLDivElement>(null);

  // Rolar para baixo sempre que houver uma nova resposta
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

  const handleAction = async (actionType: 'chat' | 'quiz', customQuery?: string) => {
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
      {/* Cabeçalho do Chat */}
      <div className="space-y-2 mb-8 px-4">
        <h2 className="text-2xl font-bold text-study-dark dark:text-white flex items-center gap-2">
          Professor Virtual
          <Sparkles className="text-study-primary" size={20} />
        </h2>
        <p className="text-study-medium dark:text-zinc-400 text-sm">Consultando apenas o material oficial desta matéria.</p>
      </div>

      {/* Área de Conteúdo (Mensagens e Quiz) */}
      <div className="flex-1 space-y-6 px-4 pb-32">
        {!currentQuiz && !isLoading && !response && (
          <div className="w-full">
            <Button 
              variant="outline" 
              onClick={() => handleAction('quiz', "Gere um simulado sobre a matéria.")}
              className="w-full h-auto py-5 rounded-2xl border-study-primary/20 bg-study-primary/5 hover:bg-study-primary/10 dark:bg-zinc-900/40 dark:border-zinc-800 flex items-center gap-4 group transition-all"
            >
              <div className="bg-study-primary p-3 rounded-xl text-white shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <GraduationCap size={24} />
              </div>
              <div className="text-left">
                <p className="font-black text-study-dark dark:text-zinc-100 text-lg">Gerar Simulado da Matéria</p>
                <p className="text-[10px] text-study-medium font-bold uppercase">Baseado nos seus PDFs</p>
              </div>
            </Button>
          </div>
        )}

        <AnimatePresence mode="wait">
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 gap-4"
            >
              <Loader2 className="animate-spin text-study-primary" size={48} />
              <p className="text-study-medium font-medium text-sm">Analisando documentos...</p>
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
              <Card className="border-none shadow-study bg-white dark:bg-zinc-900 overflow-hidden rounded-2xl">
                <CardContent className="p-6 sm:p-8">
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
                      <span className="text-[10px] font-bold uppercase tracking-wider">Fontes utilizadas:</span>
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
              <Button onClick={() => setResponse(null)} variant="ghost" className="w-full text-study-medium text-xs">Limpar esta resposta</Button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Elemento invisível para controle de scroll */}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* BARRA DE ENTRADA FIXA (ESTILO WHATSAPP) */}
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
              placeholder="Pergunte ao professor..."
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