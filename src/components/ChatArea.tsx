"use client";

import React, { useState } from 'react';
import { Send, Sparkles, BookOpen, ListChecks, GraduationCap, Loader2, Info, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";

const ChatArea = () => {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<null | { text: string; sources: string[] }>(null);

  const handleQuickAction = (action: string) => {
    setQuery(action);
    handleAsk();
  };

  const handleAsk = (e?: React.FormEvent) => {
    e?.preventDefault();
    const currentQuery = query.trim();
    if (!currentQuery && !query) return;

    setIsLoading(true);
    setResponse(null);

    // Simulação de resposta da IA
    setTimeout(() => {
      setResponse({
        text: "De acordo com os documentos enviados, a Biologia Celular estuda a estrutura e função das células, que são as unidades básicas da vida.\n\nPrincipais pontos identificados:\n1. A membrana plasmática controla o que entra e sai da célula.\n2. O núcleo contém o material genético (DNA).\n3. As mitocôndrias são responsáveis pela respiração celular e produção de ATP.\n\nEste conteúdo é fundamental para entender processos fisiológicos complexos e a base da genética moderna.",
        sources: ["Biologia_Celular.pdf", "Notas_Aula_01.txt"]
      });
      setIsLoading(false);
    }, 2000);
  };

  return (
    <div className="flex flex-col gap-6 flex-1 w-full max-w-3xl mx-auto pb-10">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-study-dark dark:text-white flex items-center gap-2">
          Pergunte ao Estuda AÍ
          <Sparkles className="text-study-primary" size={20} />
        </h2>
        <p className="text-study-medium dark:text-zinc-400">Faça perguntas complexas com base nos seus arquivos carregados.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Button 
          variant="outline" 
          onClick={() => handleQuickAction("Gere um resumo detalhado dos meus documentos")}
          className="h-auto py-4 rounded-2xl border-study-primary/20 bg-study-primary/5 hover:bg-study-primary/10 flex items-center gap-3 group transition-all"
        >
          <div className="bg-study-primary p-2 rounded-xl text-white">
            <BookOpen size={18} />
          </div>
          <div className="text-left">
            <p className="font-bold text-study-dark dark:text-zinc-100 text-sm">Gerar Resumo</p>
            <p className="text-[10px] text-study-medium dark:text-zinc-400">Síntese inteligente</p>
          </div>
        </Button>

        <Button 
          variant="outline" 
          onClick={() => handleQuickAction("Gere um simulado com 10 questões sobre este conteúdo")}
          className="h-auto py-4 rounded-2xl border-study-primary/20 bg-study-primary/5 hover:bg-study-primary/10 flex items-center gap-3 group transition-all"
        >
          <div className="bg-study-primary p-2 rounded-xl text-white">
            <GraduationCap size={18} />
          </div>
          <div className="text-left">
            <p className="font-bold text-study-dark dark:text-zinc-100 text-sm">Gerar Simulado</p>
            <p className="text-[10px] text-study-medium dark:text-zinc-400">Teste seus conhecimentos</p>
          </div>
        </Button>
      </div>

      <form onSubmit={handleAsk} className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <Zap className="text-study-medium group-focus-within:text-study-primary transition-colors" size={20} />
        </div>
        <Input
          placeholder="Digite sua pergunta sobre o conteúdo..."
          className="pl-12 pr-24 py-8 rounded-2xl border-none shadow-study bg-white dark:bg-zinc-900 text-lg focus-visible:ring-2 focus-visible:ring-study-primary/20 transition-all dark:text-white"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button 
          type="submit"
          className="absolute right-2 top-2 bottom-2 bg-study-primary hover:bg-study-dark text-white rounded-xl px-6 transition-all"
          disabled={isLoading}
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
            <p className="text-study-medium font-medium animate-pulse">Analisando documentos e gerando resposta...</p>
          </motion.div>
        )}

        {response && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <Card className="border-none shadow-study bg-white dark:bg-zinc-900 overflow-hidden rounded-2xl">
              <CardContent className="p-8">
                <div className="prose prose-study max-w-none">
                  {response.text.split('\n').map((line, i) => (
                    <p key={i} className="text-study-dark dark:text-zinc-200 leading-relaxed mb-4">
                      {line}
                    </p>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-study-light/30 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-study-medium dark:text-zinc-400 mb-3">
                    <Info size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">Fontes utilizadas:</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {response.sources.map((source, i) => (
                      <span key={i} className="px-3 py-1 rounded-full bg-study-light/30 dark:bg-zinc-800 text-study-primary text-xs font-medium border border-study-light/50 dark:border-zinc-700">
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button variant="outline" className="h-auto py-4 rounded-xl border-study-light dark:border-zinc-800 hover:bg-study-light/20 flex flex-col gap-2 group transition-all">
                <div className="bg-study-light dark:bg-zinc-800 p-2 rounded-lg group-hover:bg-white dark:group-hover:bg-zinc-700 transition-colors">
                  <BookOpen size={20} className="text-study-primary" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-study-dark dark:text-zinc-200 text-sm">Novo Resumo</p>
                  <p className="text-[10px] text-study-medium">Refinar contexto</p>
                </div>
              </Button>
              <Button variant="outline" className="h-auto py-4 rounded-xl border-study-light dark:border-zinc-800 hover:bg-study-light/20 flex flex-col gap-2 group transition-all">
                <div className="bg-study-light dark:bg-zinc-800 p-2 rounded-lg group-hover:bg-white dark:group-hover:bg-zinc-700 transition-colors">
                  <ListChecks size={20} className="text-study-primary" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-study-dark dark:text-zinc-200 text-sm">Criar Questões</p>
                  <p className="text-[10px] text-study-medium">5-10 perguntas</p>
                </div>
              </Button>
              <Button variant="outline" className="h-auto py-4 rounded-xl border-study-light dark:border-zinc-800 hover:bg-study-light/20 flex flex-col gap-2 group transition-all">
                <div className="bg-study-light dark:bg-zinc-800 p-2 rounded-lg group-hover:bg-white dark:group-hover:bg-zinc-700 transition-colors">
                  <GraduationCap size={20} className="text-study-primary" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-study-dark dark:text-zinc-200 text-sm">Simulado</p>
                  <p className="text-[10px] text-study-medium">Teste completo</p>
                </div>
              </Button>
            </div>
          </motion.div>
        )}

        {!response && !isLoading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center opacity-40"
          >
            <div className="bg-study-light/50 dark:bg-zinc-800 p-6 rounded-full mb-4">
              <BookOpen size={48} className="text-study-medium" />
            </div>
            <p className="text-lg font-medium text-study-dark dark:text-zinc-300">Pronto para começar!</p>
            <p className="text-sm text-study-medium">Seus arquivos já estão indexados na base.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatArea;