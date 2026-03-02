"use client";

import React from 'react';
import { Bird } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-8">
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <div className="bg-study-primary p-2 rounded-xl text-white">
            <Bird size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-study-dark dark:text-white leading-none">Estuda AÍ</span>
            <span className="text-[10px] text-study-medium dark:text-zinc-400 font-medium uppercase tracking-wider">Seu assistente de estudo com IA</span>
          </div>
        </Link>

        {/* Removido o DropdownMenu e Avatar "JD" conforme solicitado */}
      </div>
    </header>
  );
};

export default Navbar;