"use client";

import React from 'react';
import { ChevronLeft, ShieldCheck, Lock, Eye, FileWarning, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative overflow-hidden">
      {/* Background Decorative */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-study-primary/10 to-transparent pointer-events-none" />

      <div className="p-6 flex items-center gap-4 border-b bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full hover:bg-study-light/20"
        >
          <ChevronLeft size={24} />
        </Button>
        <h1 className="text-xl font-bold text-study-dark dark:text-white">Legal e Privacidade</h1>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="bg-study-primary/10 p-5 rounded-[2rem] mb-4 shadow-inner">
            <ShieldCheck className="text-study-primary" size={48} />
          </div>
          <h2 className="text-2xl font-black text-study-dark dark:text-white mb-2">Compromisso Estuda AÍ</h2>
          <p className="text-xs text-study-medium font-bold uppercase tracking-widest italic">Versão 1.2 • Fevereiro, 2026</p>
        </div>

        <div className="space-y-8 pb-20">
          <section className="space-y-3">
            <div className="flex items-center gap-3 text-study-primary">
              <Lock size={20} />
              <h3 className="font-bold text-lg">1. Proteção de Dados (LGPD)</h3>
            </div>
            <p className="text-sm text-study-dark/80 dark:text-zinc-400 leading-relaxed">
              O Estuda AÍ respeita a Lei Geral de Proteção de Dados. Suas informações de perfil (nome, curso e data de aniversário) são utilizadas exclusivamente para personalização da experiência e alertas na comunidade. Não vendemos nem compartilhamos seus dados com terceiros.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3 text-study-primary">
              <Eye size={20} />
              <h3 className="font-bold text-lg">2. Seus Documentos e IA</h3>
            </div>
            <p className="text-sm text-study-dark/80 dark:text-zinc-400 leading-relaxed">
              Os arquivos enviados para a base de conhecimento são processados pela API da OpenAI (GPT-4) de forma privada. Estes documentos servem para embasar as respostas do Professor Virtual e não são utilizados para treinamento de modelos públicos de IA.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3 text-study-primary">
              <FileWarning size={20} />
              <h3 className="font-bold text-lg">3. Isenção de Responsabilidade</h3>
            </div>
            <p className="text-sm text-study-dark/80 dark:text-zinc-400 leading-relaxed">
              A inteligência artificial pode gerar respostas imprecisas ("alucinações"). O Estuda AÍ é uma ferramenta de **apoio** e não substitui a bibliografia oficial indicada pelos professores nem as orientações da sua instituição de ensino. Sempre valide informações críticas.
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-3 text-study-primary">
              <Scale size={20} />
              <h3 className="font-bold text-lg">4. Conduta na Comunidade</h3>
            </div>
            <p className="text-sm text-study-dark/80 dark:text-zinc-400 leading-relaxed">
              Ao utilizar o Mural de Feedback e interagir com as funções sociais, você concorda em manter um comportamento respeitoso. Conteúdos ofensivos ou impróprios serão removidos pelos administradores e podem levar à exclusão da conta.
            </p>
          </section>

          <section className="p-4 bg-study-light/10 dark:bg-zinc-800 rounded-2xl border border-study-light/20">
            <h4 className="font-bold text-study-dark dark:text-zinc-200 text-sm mb-2">Exclusão de Dados</h4>
            <p className="text-xs text-study-medium leading-relaxed">
              Você tem total controle sobre seus dados. A qualquer momento, pode utilizar a função "Excluir Minha Conta" nas configurações para remover permanentemente todos os seus registros de nossos servidores.
            </p>
          </section>
        </div>
      </ScrollArea>
    </div>
  );
};

export default TermsPage;