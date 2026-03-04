"use client";

import React from 'react';
import { Ticket, Calendar, MapPin, Users, Star, ArrowRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const mockEvents = [
  {
    id: '1',
    title: "Congresso de Direito Constitucional",
    date: "15 Mar, 2026",
    time: "09:00",
    location: "Auditório Central",
    category: "Acadêmico",
    image: "https://images.unsplash.com/photo-1475721027187-4024733923f7?q=80&w=800&auto=format&fit=crop"
  },
  {
    id: '2',
    title: "Workshop: IA no Mundo Jurídico",
    date: "22 Mar, 2026",
    time: "14:30",
    location: "Laboratório de Tecnologia",
    category: "Tecnologia",
    image: "https://images.unsplash.com/photo-1591115765373-520b7a0808a5?q=80&w=800&auto=format&fit=crop"
  }
];

const EventsPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-32">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-study-primary/10 p-3 rounded-2xl">
            <Ticket className="text-study-primary" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-study-dark dark:text-white">Eventos</h1>
            <p className="text-study-medium text-sm font-medium">Mural de acontecimentos</p>
          </div>
        </div>

        <div className="space-y-6">
          {mockEvents.map((event) => (
            <Card key={event.id} className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden group cursor-pointer">
              <div className="aspect-[21/9] relative overflow-hidden">
                <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <Badge className="absolute top-4 left-4 bg-white/90 text-study-primary hover:bg-white rounded-full border-none shadow-sm">
                  {event.category}
                </Badge>
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg font-black text-study-dark dark:text-white mb-4 leading-tight">{event.title}</h3>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-study-medium uppercase">
                    <Calendar size={14} className="text-study-primary" /> {event.date}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-study-medium uppercase">
                    <MapPin size={14} className="text-study-primary" /> {event.location}
                  </div>
                </div>

                <Button className="w-full bg-study-primary hover:bg-study-dark text-white rounded-2xl py-6 font-bold flex gap-2">
                  Garantir Vaga <ArrowRight size={18} />
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Seção de Convite */}
          <div className="bg-study-primary/5 dark:bg-zinc-800/30 rounded-[2rem] p-8 border-2 border-dashed border-study-primary/20 text-center">
            <div className="bg-white dark:bg-zinc-900 w-14 h-14 rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
              <Star className="text-study-primary fill-study-primary" size={28} />
            </div>
            <h4 className="font-black text-study-dark dark:text-white mb-2">Sugerir Evento</h4>
            <p className="text-xs text-study-medium dark:text-zinc-400 font-medium leading-relaxed">
              Viu algo legal ou quer organizar um grupo de estudo? Avise a gente!
            </p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default EventsPage;