"use client";

import React from 'react';
import { ChevronLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const TermsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF6F1] flex flex-col max-w-md mx-auto relative">
      <div className="p-6 flex items-center gap-4 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(-1)}
          className="rounded-full"
        >
          <ChevronLeft size={24} />
        </Button>
        <h1 className="text-xl font-bold text-study-dark">Termos de Uso</h1>
      </div>

      <ScrollArea className="flex-1 p-6">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="bg-study-primary/10 p-4 rounded-3xl mb-4">
            <ShieldCheck className="text-study-primary" size={40} />
          </div>
          <p className="text-sm text-study-medium font-medium italic">Última atualização: 24 de Maio, 2024</p>
        </div>

        <div className="prose prose-sm prose-study max-w-none space-y-6 text-study-dark/80">
          <section>
            <h3 className="text-study-dark font-bold text-lg">1. Aceitação dos Termos</h3>
            <p>Ao acessar o Estuda AÍ, você concorda em cumprir estes termos de serviço e todas as leis e regulamentos aplicáveis.</p>
          </section>

          <section>
            <h3 className="text-study-dark font-bold text-lg">2. Uso da Inteligência Artificial</h3>
            <p>As respostas geradas são baseadas em processamento de linguagem natural. Recomendamos sempre validar as informações com fontes acadêmicas oficiais.</p>
          </section>

          <section>
            <h3 className="text-study-dark font-bold text-lg">3. Privacidade e Dados</h3>
            <p>Seus documentos são processados de forma segura e utilizados exclusivamente para gerar o contexto das suas respostas personalizadas.</p>
          </section>

          <section>
            <h3 className="text-study-dark font-bold text-lg">4. Limitação de Responsabilidade</h3>
            <p>O Estuda AÍ é uma ferramenta de apoio ao estudo e não substitui as diretrizes de professores ou instituições de ensino.</p>
          </section>
        </div>
        
        <div className="h-20" /> {/* Espaçamento final */}
      </ScrollArea>
    </div>
  );
};

export default TermsPage;