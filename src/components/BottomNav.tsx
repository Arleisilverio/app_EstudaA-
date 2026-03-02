"use client";

import React from 'react';
import { User, ClipboardCheck, Calendar, Settings } from 'lucide-react';
import { cn } from "@/lib/utils";

const items = [
  { label: 'Perfil', icon: User, active: true },
  { label: 'Provas', icon: ClipboardCheck, active: false },
  { label: 'Grade Horária', icon: Calendar, active: false },
  { label: 'Configurar', icon: Settings, active: false },
];

const BottomNav = () => {
  return (
    <div className="fixed bottom-6 left-4 right-4 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-around px-4 border border-study-light/20 z-50">
      {items.map((item) => (
        <button 
          key={item.label}
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 px-2",
            item.active ? "text-study-primary scale-110" : "text-gray-400 hover:text-study-medium"
          )}
        >
          <item.icon size={26} strokeWidth={item.active ? 2.5 : 2} />
          <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
          {item.active && (
            <div className="h-1 w-6 bg-study-primary rounded-full mt-0.5" />
          )}
        </button>
      ))}
    </div>
  );
};

export default BottomNav;