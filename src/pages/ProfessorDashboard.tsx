"use client";

import React from 'react';
import HomeHeader from "@/components/HomeHeader";
import SubjectGrid from "@/components/SubjectGrid";
import BottomNav from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GraduationCap, ClipboardCheck, FileText, Sparkles, Plus, Settings2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ProfessorDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative pb-40">
      <HomeHeader />
      
      <div className="px-4 mt-8 space-y-8">
        {/* Header do Portal */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-study-dark dark:text-white flex items-center gap-2">
              Portal Docente <GraduationCap className="text-study-primary" size={28} />
            </h1>
            <p className="text-study-medium text-xs font-bold uppercase tracking-widest">Gestão Acadêmica e IA</p>
          </div>
          <Button 
            onClick={() => navigate('/settings')}
            variant="outline" 
            className="rounded-xl border-study-primary/20 bg-study-primary/5 text-study-primary gap-2"
          >
            <Settings2 size={18} /> Perfil Profissional
          </Button>
        </div>

        {/* Ações Rápidas */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            onClick={() => navigate('/exams')}
            className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] cursor-pointer hover:scale-[1.02] transition-transform active:scale-95"
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="bg-study-primary/10 p-4 rounded-2xl text-study-primary">
                <ClipboardCheck size={32} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-study-dark dark:text-white">Agendar Provas</h3>
                <p className="text-[10px] text-study-medium uppercase font-bold">Reflete para os alunos</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate('/schedule')}
            className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] cursor-pointer hover:scale-[1.02] transition-transform active:scale-95"
          >
            <CardContent className="p-6 flex flex-col items-center text-center gap-3">
              <div className="bg-blue-500/10 p-4 rounded-2xl text-blue-500">
                <FileText size={32} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-study-dark dark:text-white">Grade Horária</h3>
                <p className="text-[10px] text-study-medium uppercase font-bold">Organize sua semana</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Seção de Matérias para Upload */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-study-medium uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={14} className="text-study-primary" /> Suas Matérias e Materiais
            </h2>
          </div>
          <p className="text-[11px] text-study-medium italic px-1">
            Selecione uma matéria abaixo para subir PDFs e validar o Professor Virtual (RAG).
          </p>
          <SubjectGrid />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfessorDashboard;