"use client";

import React from 'react';
import HomeHeader from "@/components/HomeHeader";
import PromoBanner from "@/components/PromoBanner";
import SubjectGrid from "@/components/SubjectGrid";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Bot } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative overflow-x-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-study-primary/5 dark:bg-study-primary/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
      <div className="absolute bottom-40 left-0 w-48 h-48 bg-study-primary/5 rounded-full -translate-x-1/2 blur-2xl" />
      
      <div className="relative z-10 flex flex-col h-full">
        <HomeHeader />
        
        {/* Atalho Admin Flutuante (Apenas para você) */}
        {isAdmin && (
          <div className="px-4 mt-4">
            <Button 
              onClick={() => navigate('/admin/professors')}
              className="w-full bg-study-primary/10 border-2 border-study-primary/30 text-study-primary hover:bg-study-primary hover:text-white rounded-2xl py-6 flex items-center justify-between group transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="bg-study-primary p-2 rounded-xl text-white">
                  <Bot size={20} />
                </div>
                <div className="text-left">
                  <p className="font-black text-sm uppercase tracking-tight">Painel de Curadoria</p>
                  <p className="text-[10px] font-bold opacity-70">Gerenciar Professores n8n</p>
                </div>
              </div>
              <div className="bg-study-primary/20 p-1.5 rounded-lg group-hover:bg-white/20">
                <span className="text-[10px] font-black">ABRIR</span>
              </div>
            </Button>
          </div>
        )}

        <div className="flex-1">
          <PromoBanner />
          <SubjectGrid />
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;