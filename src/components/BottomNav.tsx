"use client";

import React, { useState, useEffect } from 'react';
import { ClipboardCheck, CalendarDays, Ticket, LayoutGrid, GraduationCap, Settings2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import { motion } from "framer-motion";

const BottomNav = () => {
  const location = useLocation();
  const { isProfessor, isAdmin } = useAuth();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      setIsVisible(false);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsVisible(true);
      }, 250);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, []);

  const profItems = [
    { label: 'Portal', icon: GraduationCap, path: '/professor-portal' },
    { label: 'Ajustes', icon: Settings2, path: '/settings' },
  ];

  const studentItems = [
    { label: 'Início', icon: LayoutGrid, path: '/' },
    { label: 'Provas', icon: ClipboardCheck, path: '/exams' },
    { label: 'Grade', icon: CalendarDays, path: '/schedule' },
    { label: 'Eventos', icon: Ticket, path: '/events' },
  ];

  if (isAdmin) {
    studentItems.push({ label: 'Portal', icon: GraduationCap, path: '/professor-portal' });
  }

  const isProfPill = isProfessor && !isAdmin;
  const items = isProfPill ? profItems : studentItems;

  return (
    <motion.div 
      initial={{ y: 0, opacity: 1 }}
      animate={{ 
        y: isVisible ? 0 : 120,
        opacity: isVisible ? 1 : 0 
      }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={cn(
        "fixed bottom-4 sm:bottom-6 left-0 right-0 z-50 flex justify-center px-4 transition-all pointer-events-none"
      )}
    >
      <div className={cn(
        "h-14 sm:h-20 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-lg shadow-2xl flex items-center justify-around border border-study-light/20 dark:border-white/10 pointer-events-auto",
        isProfPill 
          ? "w-[240px] sm:w-[280px] rounded-full sm:rounded-[2.5rem] px-4" 
          : "w-full max-w-md sm:max-w-lg rounded-[1.2rem] sm:rounded-[2.5rem] px-2"
      )}>
        {items.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.label}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 sm:gap-1 transition-all duration-300 flex-1 min-w-0",
                isActive 
                  ? "text-study-primary scale-105 sm:scale-110" 
                  : "text-gray-400 dark:text-zinc-500 hover:text-study-medium"
              )}
            >
              <item.icon size={isActive ? 18 : 16} className="sm:size-[24px]" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[7px] sm:text-[9px] font-bold uppercase tracking-tight sm:tracking-wider text-center truncate w-full">
                {item.label}
              </span>
              {isActive && <div className="h-0.5 sm:h-1 w-4 sm:w-6 bg-study-primary rounded-full mt-0.5 animate-in fade-in zoom-in duration-300" />}
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
};

export default BottomNav;