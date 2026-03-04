"use client";

import React, { useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import NotificationList from './NotificationList';
import { differenceInDays, parseISO, startOfDay, addYears, setYear, isBefore } from 'date-fns';

const HomeHeader = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, course, period, avatar_url')
        .eq('id', user?.id)
        .single();
      
      if (profileData) setProfile(profileData);

      const today = startOfDay(new Date());
      const currentYear = today.getFullYear();

      // 1. Buscar Provas
      const { data: examsData } = await supabase
        .from('exams')
        .select('id, subject, date, time')
        .order('date', { ascending: true });

      let allAlerts: any[] = [];

      if (examsData) {
        const examAlerts = examsData.filter(exam => {
          const examDate = startOfDay(parseISO(exam.date));
          const diff = differenceInDays(examDate, today);
          return diff >= 0 && diff <= 2;
        }).map(exam => ({ ...exam, type: 'exam' }));
        
        allAlerts = [...examAlerts];
      }

      // 2. Buscar Aniversários (Todos os perfis que têm birthday preenchido)
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, name, birthday')
        .not('birthday', 'is', null);

      if (allProfiles) {
        const birthdayAlerts = allProfiles.filter(p => {
          if (!p.birthday) return false;
          
          const bDate = parseISO(p.birthday);
          // Normaliza o ano para o ano atual para comparar a proximidade
          let nextBirthday = setYear(bDate, currentYear);
          
          // Se o aniversário deste ano já passou, verifica o do próximo ano
          if (isBefore(nextBirthday, today)) {
            nextBirthday = addYears(nextBirthday, 1);
          }

          const diff = differenceInDays(nextBirthday, today);
          // Regra: Notificar se faltam 5 dias ou menos
          return diff >= 0 && diff <= 5;
        }).map(p => ({
          id: `bday-${p.id}`,
          subject: p.name, // Usamos o campo subject para o nome no componente de lista
          date: p.birthday,
          type: 'birthday'
        }));

        allAlerts = [...allAlerts, ...birthdayAlerts];
      }
      
      setNotifications(allAlerts);
    } catch (err) {
      console.error("Erro ao carregar notificações:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-6 bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-study mx-4 mt-6 border border-study-light/10 dark:border-white/5 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-4">
        <div className="relative group cursor-pointer">
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-study-primary to-blue-300 dark:to-blue-600 shadow-lg">
            <Avatar className="h-16 w-16 border-4 border-white dark:border-zinc-900 shadow-sm transition-transform duration-300 group-hover:scale-105">
              {loading ? (
                <div className="flex items-center justify-center w-full h-full bg-study-light/20">
                  <Loader2 className="animate-spin text-study-primary" size={20} />
                </div>
              ) : (
                <>
                  <AvatarImage src={profile?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-study-primary text-white text-xl font-bold">
                    {profile?.name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full shadow-sm" />
        </div>
        
        <div>
          <h2 className="text-xl font-black text-study-dark dark:text-white leading-none tracking-tight">
            Olá, {profile?.name?.split(' ')[0] || "Estudante"}!
          </h2>
          <p className="text-[11px] text-study-medium dark:text-zinc-400 font-bold mt-1.5 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-study-primary animate-pulse" />
            {profile?.course ? `${profile.period || ''} • ${profile.course}` : user?.email}
          </p>
        </div>
      </div>
      
      <Popover>
        <PopoverTrigger asChild>
          <button className="relative p-3.5 bg-study-light/10 dark:bg-zinc-800 rounded-2xl shadow-sm text-study-dark dark:text-white hover:bg-study-primary hover:text-white transition-all duration-300 group">
            <Bell size={22} className={notifications.length > 0 ? "group-hover:animate-bounce" : ""} />
            {notifications.length > 0 && (
              <span className="absolute top-3.5 right-3.5 w-2.5 h-2.5 bg-red-500 border-2 border-white dark:border-zinc-900 rounded-full animate-pulse" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 bg-transparent border-none shadow-none" align="end" sideOffset={12}>
          <NotificationList notifications={notifications} />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default HomeHeader;