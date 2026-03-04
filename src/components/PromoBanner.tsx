"use client";

import React, { useEffect, useState } from 'react';
import { ArrowRight, Settings2, Trash2, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import AnnouncementManager from './AnnouncementManager';
import { toast } from "sonner";
import { useNavigate } from 'react-router-dom';

const PromoBanner = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [emblaRef] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 5000 })]);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .order('order_index', { ascending: true })
        .limit(10);
      
      if (error) throw error;
      setAnnouncements(data || []);
    } catch (error) {
      console.error("Erro mural:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (link: string, e: React.MouseEvent) => {
    // Impedimos que o evento se propague para outros elementos
    e.preventDefault();
    e.stopPropagation();
    
    if (!link || link === '#' || link.trim() === '') return;

    const targetLink = link.trim();

    // Verifica se é um link externo (começa com http ou parece uma URL de domínio)
    const isExternal = targetLink.startsWith('http') || targetLink.includes('.');
    const isInternalRoute = targetLink.startsWith('/');

    if (isExternal && !isInternalRoute) {
      // Garante que a URL tenha o protocolo para o window.open funcionar
      const url = targetLink.startsWith('http') ? targetLink : `https://${targetLink}`;
      
      // Abre em nova aba
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      // Se win for null, o bloqueador de popups pode ter agido
      if (!win) {
        window.location.href = url; // Fallback para a mesma aba se bloqueado
      }
    } else {
      // Navegação interna do React Router
      navigate(targetLink);
    }
  };

  const deleteAnnouncement = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Remover este aviso do mural?")) return;

    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      toast.success("Aviso removido");
      fetchAnnouncements();
    } catch (error) {
      toast.error("Erro ao remover");
    }
  };

  if (loading) return (
    <div className="mx-4 mt-6 aspect-[16/9] sm:aspect-[21/9] bg-study-light/20 rounded-[2rem] flex items-center justify-center">
      <Loader2 className="animate-spin text-study-primary" />
    </div>
  );

  return (
    <div className="relative group">
      <div className="overflow-hidden mx-4 mt-6 rounded-[2rem] shadow-lg" ref={emblaRef}>
        <div className="flex">
          {announcements.length === 0 ? (
            <div className="flex-[0_0_100%] aspect-[16/9] sm:aspect-[21/9] relative bg-study-dark overflow-hidden">
               <img 
                src="https://images.unsplash.com/photo-1505664194779-8beaceb93744?q=80&w=2070&auto=format&fit=crop" 
                className="absolute inset-0 w-full h-full object-cover opacity-50"
                alt="Placeholder"
              />
              <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-8">
                <h1 className="text-2xl sm:text-3xl font-black text-white italic">Bem-vindo!</h1>
                <p className="text-white/80 font-medium text-xs sm:text-sm">Configure seus avisos no ícone de ajustes.</p>
              </div>
            </div>
          ) : (
            announcements.map((slide) => (
              <div 
                key={slide.id} 
                className="flex-[0_0_100%] aspect-[16/9] sm:aspect-[21/9] relative overflow-hidden group/slide cursor-pointer" 
                onClick={(e) => handleNavigation(slide.button_link, e)}
              >
                <img src={slide.image_url} alt={slide.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/slide:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                
                <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-center">
                  <h1 className="text-xl sm:text-3xl font-black text-white leading-tight drop-shadow-md line-clamp-2">
                    {slide.title}
                  </h1>
                  {slide.subtitle && <p className="text-white/90 text-xs sm:text-sm mt-1 font-bold italic drop-shadow-sm line-clamp-1">{slide.subtitle}</p>}
                  
                  <div className="mt-4">
                    <Button 
                      className="w-fit bg-study-primary hover:bg-study-dark text-white rounded-full px-5 py-3 h-auto text-[10px] sm:text-xs font-black uppercase tracking-widest gap-2 shadow-lg transition-all active:scale-95 pointer-events-none"
                    >
                      {slide.button_text} <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>

                {isAdmin && (
                  <button 
                    onClick={(e) => deleteAnnouncement(slide.id, e)}
                    className="absolute top-4 right-4 p-2 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-100 sm:opacity-0 group-hover/slide:opacity-100 transition-opacity z-20"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {isAdmin && (
        <button 
          onClick={() => setIsManagerOpen(true)}
          className="absolute -top-2 -right-1 p-2.5 bg-study-primary text-white rounded-full shadow-lg border-2 border-white dark:border-zinc-900 hover:scale-110 transition-transform z-30"
        >
          <Settings2 size={20} />
        </button>
      )}

      {announcements.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-20 flex-wrap justify-center max-w-[80%]">
          {announcements.map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 bg-white/40 rounded-full" />
          ))}
        </div>
      )}

      <AnnouncementManager 
        isOpen={isManagerOpen} 
        onClose={() => setIsManagerOpen(false)} 
        onRefresh={fetchAnnouncements}
      />
    </div>
  );
};

export default PromoBanner;