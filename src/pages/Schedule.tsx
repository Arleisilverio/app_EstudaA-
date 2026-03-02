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
    seg: { subject: "DIREITO SOCIETÁRIO" },
    ter: { subject: "Direito Trabalho" },
    qua: { subject: "Processual Civil III" },
    qui: { subject: "Agentes Públicos" },
    sex: { subject: "Direito Trabalho" },
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
            <p className="text-study-medium text-sm font-medium">Horário Semestral</p>
          </div>
        </div>

        <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="min-w-[600px]">
                <Table>
                  <TableHeader className="bg-study-light/30 dark:bg-zinc-800/50">
                    <TableRow className="border-study-light/30 dark:border-zinc-800">
                      <TableHead className="font-bold text-study-primary">HORA</TableHead>
                      <TableHead className="text-center">SEG</TableHead>
                      <TableHead className="text-center">TER</TableHead>
                      <TableHead className="text-center">QUA</TableHead>
                      <TableHead className="text-center">QUI</TableHead>
                      <TableHead className="text-center">SEX</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scheduleData.map((row, idx) => (
                      <TableRow key={idx} className="border-study-light/20 dark:border-zinc-800">
                        <TableCell className="font-bold text-study-dark dark:text-zinc-200 bg-study-light/10 dark:bg-zinc-800/20">
                          {row.time}
                        </TableCell>
                        {[row.seg, row.ter, row.qua, row.qui, row.sex].map((cell, i) => (
                          <TableCell key={i} className="p-4 text-center">
                            {cell && <span className="text-[10px] font-bold dark:text-zinc-400">{cell.subject}</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default SchedulePage;