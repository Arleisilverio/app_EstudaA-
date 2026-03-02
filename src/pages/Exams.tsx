"use client";

import React from 'react';
import { ClipboardCheck, Calendar, BookOpen, AlertCircle, Clock } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";

const exams = [
  {
    id: '1',
    subject: 'Direito Administrativo',
    date: '15 Jun, 2024',
    time: '19:00',
    content: 'Atos Administrativos, Poderes da Administração e Licitações (Lei 14.133).',
    observations: 'Levar Vade Mecum atualizado.',
    status: 'Próxima'
  },
  {
    id: '2',
    subject: 'Direito Penal',
    date: '22 Jun, 2024',
    time: '20:45',
    content: 'Teoria do Crime: Tipicidade, Ilicitude e Culpabilidade.',
    observations: 'Foco nos artigos 13 a 25 do CP.',
    status: 'Agendada'
  }
];

const ExamsPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-32">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-study-primary/10 p-3 rounded-2xl">
            <ClipboardCheck className="text-study-primary" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-study-dark dark:text-white">Provas</h1>
            <p className="text-study-medium text-sm font-medium">Cronograma de avaliações</p>
          </div>
        </div>

        <div className="space-y-4">
          {exams.map((exam) => (
            <Card key={exam.id} className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden group">
              <CardContent className="p-0">
                <div className="bg-study-light/20 dark:bg-zinc-800/50 px-6 py-4 flex justify-between items-center border-b border-study-light/30 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-study-primary" />
                    <span className="text-sm font-bold text-study-dark dark:text-zinc-200">{exam.date}</span>
                  </div>
                  <Badge className="bg-study-primary/10 text-study-primary hover:bg-study-primary/20 border-none rounded-full px-3">
                    {exam.status}
                  </Badge>
                </div>
                
                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-study-dark dark:text-zinc-100 mb-1">{exam.subject}</h3>
                    <div className="flex items-center gap-2 text-study-medium text-xs font-medium">
                      <Clock size={14} /> {exam.time} • Sala 302
                    </div>
                  </div>

                  <div className="bg-study-light/10 dark:bg-zinc-800/30 rounded-2xl p-4 border border-study-light/20 dark:border-zinc-800">
                    <p className="text-sm text-study-dark dark:text-zinc-300 leading-relaxed">
                      {exam.content}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ExamsPage;