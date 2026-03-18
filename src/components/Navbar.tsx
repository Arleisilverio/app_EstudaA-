"use client";

import React, { useState, useEffect } from 'react';
import { Bird, ChevronLeft } from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isHome = location.pathname === '/';
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleScroll = () => {
      // Esconde imediatamente ao detectar movimento
      setIsVisible(false);
      
      // Cancela o timeout anterior
      clearTimeout(timeout);
      
      // Define que voltará a ser visível após 250ms sem movimento
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

  return (
    <motion.header 
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : -100 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container flex h-16 items-center gap-4 px-4 sm:px-8">
        {!isHome && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate('/')}
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
    </motion.header>
  );
};

export default Navbar;