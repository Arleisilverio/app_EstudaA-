"use client";

import React from 'react';
import { CalendarDays, Clock } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import BottomNav from "@/components/BottomNav";

const scheduleData = [
  {
    time: "08:20",
    seg: { subject: "DIREITO SOCIETÁRIO", professor: "WILIAN ROQUE BORGES" },
    ter: { subject: "Direito Individual e Coletivo do Trabalho", professor: "RAFAEL CARMEZIM NASSIF" },
    qua: null,
    qui: { subject: "Agentes Públicos e Responsabilização Administrativ", professor: "PAOLA NERY FERRARI" },
    sex: { subject: "Direito Individual e Coletivo do Trabalho", professor: "RAFAEL CARMEZIM NASSIF" },
  },
  {
    time: "09:10",
    seg: { subject: "DIREITO SOCIETÁRIO", professor: "WILIAN ROQUE BORGES" },
    ter: { subject: "Direito Individual e Coletivo do Trabalho", professor: "RAFAEL CARMEZIM NASSIF" },
    qua: null,
    qui: { subject: "Agentes Públicos e Responsabilização Administrativ", professor: "PAOLA NERY FERRARI" },
    sex: { subject: "Direito Individual e Coletivo do Trabalho", professor: "RAFAEL CARMEZIM NASSIF" },
  },
  {
    time: "10:20",
    seg: { subject: "Procedimentos nos Tribunais", professor: "CAROLINA BELOMO DE SOUZA" },
    ter: null,
    qua: null,
    qui: { subject: "Procedimentos nos Tribunais", professor: "CAROLINA BELOMO DE SOUZA" },
    sex: { subject: "Desenv. Socioem. e de Carreira", professor: "EUGENIO PEREIRA DE PAULA JUNIOR" },
  },
  {
    time: "11:10",
    seg: { subject: "Procedimentos nos Tribunais", professor: "CAROLINA BELOMO DE SOUZA" },
    ter: null,
    qua: null,
    qui: { subject: "Procedimentos nos Tribunais", professor: "CAROLINA BELOMO DE SOUZA" },
    sex: { subject: "Desenv. Socioem. e de Carreira", professor: "EUGENIO PEREIRA DE PAULA JUNIOR" },
  }
];

const SchedulePage = () => {
  return (
    <div className="min-h-screen bg-[#FAF6F1] flex flex-col max-w-md mx-auto relative pb-32">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-study-primary/10 p-3 rounded-2xl">
            <CalendarDays className="text-study-primary" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-study-dark">Grade</h1>
            <p className="text-study-medium text-sm font-medium">Horário Semestral</p>
          </div>
        </div>

        <Card className="border-none shadow-study bg-white rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <Table>
                <TableHeader className="bg-study-light/30">
                  <TableRow className="hover:bg-transparent border-study-light/30">
                    <TableHead className="w-[80px] font-bold text-study-primary text-center">HORA</TableHead>
                    <TableHead className="font-bold text-study-primary text-center">SEG</TableHead>
                    <TableHead className="font-bold text-study-primary text-center">TER</TableHead>
                    <TableHead className="font-bold text-study-primary text-center">QUA</TableHead>
                    <TableHead className="font-bold text-study-primary text-center">QUI</TableHead>
                    <TableHead className="font-bold text-study-primary text-center">SEX</TableHead>
                    <TableHead className="font-bold text-study-primary text-center">SÁB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduleData.map((row, idx) => (
                    <TableRow key={idx} className="border-study-light/20 hover:bg-study-light/5">
                      <TableCell className="font-bold text-study-dark text-center bg-study-light/10">
                        <div className="flex flex-col items-center gap-1">
                          <Clock size={12} className="text-study-medium" />
                          {row.time}
                        </div>
                      </TableCell>
                      {[row.seg, row.ter, row.qua, row.qui, row.sex, null].map((cell, i) => (
                        <TableCell key={i} className="min-w-[140px] p-4 align-top">
                          {cell ? (
                            <div className="flex flex-col gap-2">
                              <span className="text-[11px] font-black text-study-dark uppercase leading-tight">
                                {cell.subject}
                              </span>
                              <span className="text-[9px] font-medium text-study-medium uppercase">
                                {cell.professor}
                              </span>
                            </div>
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <div className="w-1 h-1 bg-study-light rounded-full" />
                            </div>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="mt-6 flex gap-2 items-center justify-center p-4 bg-study-light/10 rounded-2xl border border-study-light/20">
          <div className="w-2 h-2 bg-study-primary rounded-full animate-pulse" />
          <p className="text-[10px] font-bold text-study-medium uppercase tracking-widest">Semestre Atual: 2024.1</p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default SchedulePage;