"use client";

import React, { useEffect, useState } from 'react';
import { Bell, Loader2, User, LogOut, Settings2, ShieldCheck, GraduationCap } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import NotificationList from './NotificationList';
import { useNavigate } from 'react-router-dom';
import { addDays, format, parseISO, differenceInDays, startOfDay, setYear, isBefore, addYears } from 'date-fns';
import { toast } from "sonner";

const CACHE_KEY = 'cached_profile_header';

const HomeHeader = () => {
  const { user, signOut, isAdmin, isProfessor } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        setProfile(JSON.parse(cached));
        setLoading(false);
      }
      
      fetchData();
      fetchNotifications();
    }
  }, [user, isProfessor]);

  const fetchData = async () => {
    try {
      if (isProfessor) {
        // Se for professor, buscamos dados da tabela de professores e o nome da matéria
        const { data: profData } = await supabase
          .from('professors')
          .select('name, avatar_url, subject_id, subjects(name)')
          .eq('user_id', user?.id)
          .maybeSingle();
        
        if (profData) {
          const formatted = {
            name: profData.name,
            avatar_url: profData.avatar_url,
            display_info: (profData as any).subjects?.name || "Professor"
          };
          setProfile(formatted);
          localStorage.setItem(CACHE_KEY, JSON.stringify(formatted));
        }
      } else {
        // Se for aluno/admin, buscamos do perfil padrão
        const { data: profileData } = await supabase
          .from('profiles')
          .select('name, course, period, avatar_url')
          .eq('id', user?.id)
          .single();
        
        if (profileData) {
          const formatted = {
            name: profileData.name,
            avatar_url: profileData.avatar_url,
            display_info: profileData.course ? `${profileData.period || ''} • ${profileData.course}` : "Estudante"
          };
          setProfile(formatted);
          localStorage.setItem(CACHE_KEY, JSON.stringify(formatted));
        }
      }
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const today = startOfDay(new Date());
      const tomorrowStr = format(addDays(today, 1), 'yyyy-MM-dd');
      const alerts: any[] = [];

      const { data: exams } = await supabase
        .from('exams')
        .select('id, subject, date, time')
        .eq('date', tomorrowStr);

      if (exams) {
        exams.forEach(exam => {
          alerts.push({ id: exam.id, subject: exam.subject, date: exam.date, type: 'exam' });
        });
      }

      const { data: bdays } = await supabase.from('profiles').select('id, name, birthday, avatar_url');
      if (bdays) {
        bdays.forEach(p => {
          if (p.birthday) {
            const [_, month, day] = p.birthday.split('-');
            let bdayThisYear = setYear(new Date(), today.getFullYear());
            bdayThisYear.setMonth(parseInt(month) - 1);
            bdayThisYear.setDate(parseInt(day));
            bdayThisYear = startOfDay(bdayThisYear);
            if (isBefore(bdayThisYear, today) && differenceInDays(today, bdayThisYear) > 0) {
              bdayThisYear = addYears(bdayThisYear, 1);
            }
            const diff = differenceInDays(bdayThisYear, today);
            if (diff >= 0 && diff <= 4) {
              alerts.push({ id: `bday-${p.id}`, subject: p.name || "Estudante", date: bdayThisYear.toISOString(), type: 'birthday' });
            }
          }
        });
      }
      alerts.sort((a, b) => differenceInDays(parseISO(a.date), today) - differenceInDays(parseISO(b.date), today));
      setNotifications(alerts);
    } catch (err) {
      console.error("Erro nas notificações:", err);
    }
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem(CACHE_KEY);
      await signOut();
      toast.success("Até logo!");
      navigate('/login');
    } catch (error) {
      toast.error("Erro ao sair.");
    }
  };

  return (
    <div className="flex items-center justify-between p-3 sm:p-4 bg-white dark:bg-zinc-900 rounded-[1.5rem] sm:rounded-[2rem] shadow-study mx-3 sm:mx-4 mt-4 sm:mt-6 border border-study-light/10 dark:border-white/5 transition-all">
      <div 
        onClick={() => navigate(isProfessor ? '/settings' : '/profile')}
        className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 cursor-pointer group"
      >
        <div className="relative shrink-0">
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-study-primary to-blue-300 dark:to-blue-600 shadow-md">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-white dark:border-zinc-900 shadow-sm transition-transform duration-300 group-hover:scale-105">
              {loading && !profile ? (
                <div className="flex items-center justify-center w-full h-full bg-study-light/20">
                  <Loader2 className="animate-spin text-study-primary" size={14} />
                </div>
              ) : (
                <>
                  <AvatarImage src={profile?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-study-primary text-white text-base sm:text-lg font-bold">
                    {profile?.name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full shadow-sm" />
        </div>
        
        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-base font-black text-study-dark dark:text-white leading-tight tracking-tight truncate">
            Olá, {profile?.name?.split(' ')[0] || "Usuário"}!
          </h2>
          <p className="text-[8px] sm:text-[9px] text-study-medium dark:text-zinc-400 font-bold mt-0.5 uppercase tracking-wider truncate">
            {profile?.display_info || user?.email}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 sm:gap-2 ml-1 sm:ml-2">
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2 sm:p-2.5 bg-study-light/10 dark:bg-zinc-800 rounded-xl shadow-sm text-study-dark dark:text-white hover:bg-study-primary hover:text-white transition-all group shrink-0">
              <Bell size={16} className="sm:size-[18px]" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-1.5 h-1.5 bg-red-500 border-2 border-white dark:border-zinc-900 rounded-full animate-pulse" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 bg-transparent border-none shadow-none" align="end" sideOffset={12}>
            <NotificationList notifications={notifications} />
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 sm:p-2.5 bg-study-light/10 dark:bg-zinc-800 rounded-xl shadow-sm text-study-dark dark:text-white hover:bg-study-primary hover:text-white transition-all shrink-0">
              <Settings2 size={16} className="sm:size-[18px]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-2xl bg-white dark:bg-zinc-950 border-study-light/20 p-2 shadow-2xl">
            <DropdownMenuLabel className="text-[10px] font-black text-study-medium uppercase tracking-widest px-3 py-2">
              Menu da Conta
            </DropdownMenuLabel>
            <DropdownMenuItem 
              onSelect={() => navigate(isProfessor ? '/settings' : '/profile')}
              className="rounded-xl flex items-center gap-3 p-3 cursor-pointer hover:bg-study-primary/10 group"
            >
              <div className="bg-study-primary/10 p-2 rounded-lg text-study-primary group-hover:bg-study-primary group-hover:text-white transition-colors">
                <User size={16} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">{isProfessor ? 'Perfil Docente' : 'Meu Perfil'}</span>
                <span className="text-[9px] text-study-medium font-bold uppercase">Editar dados e fotos</span>
              </div>
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onSelect={() => navigate('/settings')}
              className="rounded-xl flex items-center gap-3 p-3 cursor-pointer hover:bg-study-primary/10 group mt-1"
            >
              <div className="bg-study-light/20 p-2 rounded-lg text-study-medium group-hover:bg-study-primary group-hover:text-white transition-colors">
                <Settings2 size={16} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">Ajustes</span>
                <span className="text-[9px] text-study-medium font-bold uppercase">Preferências do app</span>
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-2 bg-study-light/10" />
            
            <DropdownMenuItem 
              onSelect={handleLogout}
              className="rounded-xl flex items-center gap-3 p-3 cursor-pointer hover:bg-red-500/10 group text-red-500"
            >
              <div className="bg-red-500/10 p-2 rounded-lg group-hover:bg-red-500 group-hover:text-white transition-colors">
                <LogOut size={16} />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm">Sair</span>
                <span className="text-[9px] opacity-70 font-bold uppercase">Encerrar sessão</span>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default HomeHeader;