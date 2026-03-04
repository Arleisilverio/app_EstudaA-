"use client";

import React from 'react';
import Navbar from "@/components/Navbar";
import FileSidebar from "@/components/FileSidebar";
import ChatArea from "@/components/ChatArea";
import { MadeWithDyad } from "@/components/made-with-dyad";

const StudyDashboard = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="container flex-1 py-8 flex flex-col lg:flex-row gap-10">
        <aside className="w-full lg:w-auto">
          <FileSidebar />
        </aside>
        
        <section className="flex-1">
          <ChatArea />
        </section>
      </main>
      
      <footer className="py-6 border-t bg-white/50 dark:bg-zinc-900/50">
        <div className="container flex flex-col items-center gap-2">
          <p className="text-xs text-study-medium">© 2026 Estuda AÍ - Seu assistente acadêmico inteligente</p>
          <MadeWithDyad />
        </div>
      </footer>
    </div>
  );
};

export default StudyDashboard;