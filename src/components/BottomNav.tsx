"use client";

import React from 'react';
import { ClipboardCheck, CalendarDays, Ticket, LayoutGrid, GraduationCap } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';

const BottomNav = () => {
  const location = useLocation();
  const { isProfessor, isAdmin } = useAuth();

  const items = [
    { label: 'Início', icon: LayoutGrid, path: '/' },
    { label: 'Provas', icon: ClipboardCheck, path: '/exams' },
    { label: 'Grade', icon: CalendarDays, path: '/schedule' },
    { label: 'Eventos', icon: Ticket, path: '/events' },
  ];

  // Adiciona o Portal se for professor ou admin
  if (isProfessor || isAdmin) {
    items.push({ label: 'Portal', icon: GraduationCap, path: '/professor-portal' });
  }

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-2 sm:left-4 right-2 sm:right-4 h-16 sm:h-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl flex items-center justify-around px-1 sm:px-2 border border-study-light/20 dark:border-white/10 z-50 transition-colors">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.label}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-0.5 sm:gap-1 transition-all duration-300 px-0.5 min-w-[45px] sm:min-w-[64px]",
              isActive 
                ? "text-study-primary scale-105 sm:scale-110" 
                : "text-gray-400 dark:text-zinc-500 hover:text-study-medium dark:hover:text-zinc-300"
            )}
          >
            <item.icon size={18} className="sm:size-[24px]" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tight sm:tracking-wider text-center line-clamp-1">{item.label}</span>
            {isActive && (
              <div className="h-0.5 sm:h-1 w-4 sm:w-6 bg-study-primary rounded-full mt-0.5 animate-in fade-in zoom-in duration-300" />
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNav;