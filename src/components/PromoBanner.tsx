"use client";

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

const PromoBanner = () => {
  return (
    <div className="relative mx-4 mt-6 h-48 rounded-[2.5rem] overflow-hidden shadow-lg group cursor-pointer">
      <img 
        src="https://images.unsplash.com/photo-1505664194779-8beaceb93744?q=80&w=2070&auto=format&fit=crop" 
        alt="Estudo" 
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-study-dark/80 via-study-dark/40 to-transparent" />
      
      <div className="absolute inset-0 p-8 flex flex-col justify-center">
        <h1 className="text-4xl font-light text-white leading-tight">
          Estuda <span className="font-bold italic">AÍ</span>
        </h1>
        <p className="text-white/90 text-lg mt-1 font-medium italic">Nova Prova Disponível!</p>
        
        <Button className="mt-4 w-fit bg-study-primary hover:bg-study-dark text-white rounded-full px-6 py-5 gap-2 shadow-lg transition-all active:scale-95">
          Acesse Agora <ArrowRight size={18} />
        </Button>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
        <div className="w-6 h-1.5 bg-white rounded-full" />
        <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
        <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
        <div className="w-1.5 h-1.5 bg-white/40 rounded-full" />
      </div>
    </div>
  );
};

export default PromoBanner;