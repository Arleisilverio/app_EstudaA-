"use client";

import React from 'react';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";

const weeklySchedule = [
  {
    day: "Segunda-feira",
    subjects: [
      { time: "08:20 - 10:00", name: "Direito Societário", room: "Sala 302", color: "bg-blue-500" },
      { time: "10:15 - 12:00", name: "Processual Civil III", room: "Sala 302", color: "bg-indigo-500" },
    ]
  },
  {
    day: "Terça-feira",
    subjects: [
      { time: "08:20 - 10:00", name: "Direito do Trabalho", room: "Auditório B", color: "bg-cyan-500" },
      { time: "10:15 - 12:00", name: "Filosofia Jurídica", room: "Sala 105", color: "bg-blue-600" },
    ]
  },
  {
    day: "Quarta-feira",
    subjects: [
      { time: "08:20 - 12:00", name: "Prática Jurídica I", room: "NPJ - Bloco C", color: "bg-violet-500" },
    ]
  },
  {
    day: "Quinta-feira",
    subjects: [
      { time: "08:20 - 10:00", name: "Agentes Públicos", room: "Sala 302", color: "bg-blue-400" },
      { time: "10:15 - 12:00", name: "Direito Tributário", room: "Sala 302", color: "bg-indigo-400" },
    ]
  },
  {
    day: "Sexta-feira",
    subjects: [
      { time: "08:20 - 10:00", name: "Direito do Trabalho", room: "Auditório B", color: "bg-cyan-500" },
      { time: "10:15 - 12:00", name: "Ética Profissional", room: "Sala 201", color: "bg-blue-700" },
    ]
  }
];

const SchedulePage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-32">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-study-primary/10 p-3 rounded-2xl">
            <CalendarDays className="text-study-primary" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-study-dark dark:text-white">Grade</h1>
            <p className="text-study-medium text-sm font-medium">Horário Completo</p>
          </div>
        </div>

        <div className="space-y-8">
          {weeklySchedule.map((dayPlan, idx) => (
            <section key={idx} className="space-y-3">
              <div className="flex items-center gap-2 ml-1">
                <div className="w-2 h-2 rounded-full bg-study-primary" />
                <h2 className="text-sm font-black text-study-dark dark:text-zinc-200 uppercase tracking-widest">
                  {dayPlan.day}
                </h2>
              </div>
              
              <div className="grid gap-3">
                {dayPlan.subjects.map((item, sIdx) => (
                  <Card key={sIdx} className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[1.5rem] overflow-hidden">
                    <CardContent className="p-0 flex h-20">
                      <div className={`w-3 ${item.color}`} />
                      <div className="flex-1 p-4 flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-bold text-study-dark dark:text-zinc-100 text-sm">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 text-[10px] font-bold text-study-medium dark:text-zinc-400 uppercase">
                              <Clock size={12} className="text-study-primary" /> {item.time}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold text-study-medium dark:text-zinc-400 uppercase">
                              <MapPin size={12} className="text-study-primary" /> {item.room}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SchedulePage;