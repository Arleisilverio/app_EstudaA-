"use client";

import React from 'react';
import { Bell } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const HomeHeader = () => {
  return (
    <div className="flex items-center justify-between p-6 bg-white rounded-3xl shadow-study mx-4 mt-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-16 w-16 border-4 border-study-light shadow-sm">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="bg-study-primary text-white text-xl font-bold">AS</AvatarFallback>
          </Avatar>
        </div>
        <div>
          <h2 className="text-xl font-bold text-study-dark leading-none">Arlei Silverio</h2>
          <p className="text-sm text-study-medium font-medium mt-1">7º Período - Direito</p>
          <div className="flex gap-1 mt-2">
            <div className="h-1 w-8 bg-study-primary rounded-full" />
            <div className="h-1 w-4 bg-study-light rounded-full" />
          </div>
        </div>
      </div>
      
      <button className="relative p-3 bg-white rounded-2xl shadow-study text-study-dark hover:bg-study-light/20 transition-colors">
        <Bell size={24} />
        <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-[#8B5E3C] border-2 border-white rounded-full" />
      </button>
    </div>
  );
};

export default HomeHeader;