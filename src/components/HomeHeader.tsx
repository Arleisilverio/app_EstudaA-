"use client";

import React from 'react';
import { Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const HomeHeader = () => {
  return (
    <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-900 rounded-3xl shadow-study mx-4 mt-6 border border-study-light/10 dark:border-white/5 transition-colors">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16 border-4 border-study-light dark:border-zinc-800 shadow-sm">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="bg-study-primary text-white text-xl font-bold">AS</AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-study-dark dark:text-white leading-none">Arlei Silverio</h2>
          <p className="text-sm text-study-medium dark:text-zinc-400 font-medium mt-1">7º Período - Direito</p>
          <div className="flex gap-1 mt-2">
            <div className="h-1 w-8 bg-study-primary rounded-full" />
            <div className="h-1 w-4 bg-study-light dark:bg-zinc-800 rounded-full" />
          </div>
        </div>
      </div>
      
      <button className="relative p-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-study text-study-dark dark:text-white hover:bg-study-light/20 dark:hover:bg-zinc-700 transition-colors border border-study-light/20 dark:border-white/5">
        <Bell size={24} />
        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-study-primary border-2 border-white dark:border-zinc-800 rounded-full animate-pulse" />
      </button>
    </div>
  );
};

export default HomeHeader;