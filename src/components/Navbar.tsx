"use client";

import React from 'react';
import { Bird, ChevronLeft } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';

  // Forçamos a volta para a home para garantir que o botão sempre funcione
  const handleBack = () => {
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4 px-4 sm:px-8">
        {!isHome && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBack}
            className="rounded-full hover:bg-study-light/20 text-study-dark dark:text-white"
          >
            <ChevronLeft size={24} />
          </Button>
        )}
        
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <div className="bg-study-primary p-2 rounded-xl text-white">
            <Bird size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-study-dark dark:text-white leading-none">Estuda AÍ</span>
            <span className="text-[10px] text-study-medium dark:text-zinc-400 font-medium uppercase tracking-wider">Seu assistente de estudo com IA</span>
          </div>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;