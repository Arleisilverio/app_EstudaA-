"use client";

import React from 'react';
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { History as HistoryIcon, Search, Calendar, MessageSquare, ExternalLink } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Link } from 'react-router-dom';

const HistoryPage = () => {
  const historyItems = [
    { id: '1', query: "O que é mitocôndria?", date: "22 Mai, 2024 • 14:30", category: "Biologia" },
    { id: '2', query: "Resumo da Revolução Francesa", date: "21 Mai, 2024 • 10:15", category: "História" },
    { id: '3', query: "Cálculo de derivadas simples", date: "20 Mai, 2024 • 16:45", category: "Matemática" },
    { id: '4', query: "Principais leis da termodinâmica", date: "19 Mai, 2024 • 09:20", category: "Física" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="container py-8 max-w-4xl mx-auto flex-1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-study-dark flex items-center gap-3">
              <HistoryIcon className="text-study-primary" size={28} />
              Histórico de Estudos
            </h1>
            <p className="text-study-medium mt-1">Revisite suas dúvidas e respostas anteriores.</p>
          </div>
          
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-study-medium" size={18} />
            <Input placeholder="Buscar no histórico..." className="pl-10 rounded-xl border-study-light focus-visible:ring-study-primary/20" />
          </div>
        </div>

        <div className="grid gap-4">
          {historyItems.map((item) => (
            <Card key={item.id} className="border-none shadow-study bg-white hover:shadow-lg transition-all group overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-6">
                  <div className="flex gap-4 items-center">
                    <div className="bg-study-light/50 p-3 rounded-xl text-study-primary group-hover:bg-study-primary group-hover:text-white transition-colors">
                      <MessageSquare size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-study-dark text-lg mb-1">{item.query}</h3>
                      <div className="flex items-center gap-3 text-xs text-study-medium">
                        <span className="flex items-center gap-1 font-semibold text-study-primary uppercase tracking-tighter">
                          {item.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> {item.date}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <Button asChild variant="ghost" className="rounded-xl hover:bg-study-light/30 text-study-primary gap-2">
                    <Link to="/">
                      Reabrir <ExternalLink size={16} />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default HistoryPage;