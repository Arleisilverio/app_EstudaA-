"use client";

import React from 'react';
import { User, ClipboardCheck, CalendarDays, Settings, LayoutGrid } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Link, useLocation } from 'react-router-dom';

const items = [
  { label: 'Início', icon: LayoutGrid, path: '/' },
  { label: 'Perfil', icon: User, path: '/profile' },
  { label: 'Provas', icon: ClipboardCheck, path: '/exams' },
  { label: 'Grade', icon: CalendarDays, path: '/schedule' },
  { label: 'Ajustes', icon: Settings, path: '/settings' },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <div className="fixed bottom-6 left-4 right-4 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-around px-2 border border-study-light/20 z-50">
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.label}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 transition-all duration-300 px-1 min-w-[64px]",
              isActive ? "text-study-primary scale-110" : "text-gray-400 hover:text-study-medium"
            )}
          >
            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-center">{item.label}</span>
            {isActive && (
              <div className="h-1 w-6 bg-study-primary rounded-full mt-0.5 animate-in fade-in zoom-in duration-300" />
            )}
          </Link>
        );
      })}
    </div>
  );
};

export default BottomNav;