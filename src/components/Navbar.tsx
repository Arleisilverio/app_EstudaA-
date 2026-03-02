"use client";

import React from 'react';
import { Bird, User, LogOut, History, Settings } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
          <div className="bg-study-primary p-2 rounded-xl text-white">
            <Bird size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-bold text-study-dark leading-none">Estuda AÍ</span>
            <span className="text-[10px] text-study-medium font-medium uppercase tracking-wider">Seu assistente de estudo com IA</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <Avatar className="h-9 w-9 border-2 border-study-light cursor-pointer transition-transform hover:scale-105">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-study-light text-study-primary font-bold">JD</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg">
                <User size={16} /> Perfil
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg">
                <Link to="/history">
                  <History size={16} /> Histórico
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg">
                <Settings size={16} /> Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg text-red-600 focus:text-red-600">
                <LogOut size={16} /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Navbar;