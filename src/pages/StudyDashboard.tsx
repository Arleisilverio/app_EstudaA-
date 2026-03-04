"use client";

import React from 'react';
import Navbar from "@/components/Navbar";
import FileSidebar from "@/components/FileSidebar";
import ChatArea from "@/components/ChatArea";
import { MadeWithDyad } from "@/components/made-with-dyad";

const StudyDashboard = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Navbar />
      
      <main className="container flex-1 py-6 sm:py-8 flex flex-col lg:flex-row gap-6 lg:gap-10 px-4 sm:px-8">
        <aside className="w-full lg:w-auto shrink-0">
          <FileSidebar />
        </aside>
        
        <section className="flex-1 min-w-0">
          <ChatArea />
        </section>
      </main>
      
      <footer className="py-6 border-t bg-white/50 dark:bg-zinc-900/50">
        <div className="container flex flex-col items-center gap-2 px-4">
          <p className="text-[10px] sm:text-xs text-study-medium text-center">© 2026 Estuda AÍ - Seu assistente acadêmico inteligente</p>
          <MadeWithDyad />
        </div>
      </footer>
    </div>
  );
};

export default StudyDashboard;