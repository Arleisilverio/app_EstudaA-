"use client";

import React, { useEffect, useState } from 'react';
import { Bell, Loader2, User, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import NotificationList from './NotificationList';
import { useNavigate } from 'react-router-dom';
import { addDays, format, parseISO, differenceInDays, startOfDay, setYear, isBefore, addYears } from 'date-fns';
import { toast } from "sonner";

const HomeHeader = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchNotifications();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('name, course, period, avatar_url')
        .eq('id', user?.id)
        .single();
      
      if (profileData) setProfile(profileData);
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
      await signOut();
      toast.success("Até logo!");
      navigate('/login');
    } catch (error) {
      toast.error("Erro ao sair.");
    }
  };

  return (
    <div className="flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-study mx-4 mt-6 border border-study-light/10 dark:border-white/5 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
      <div 
        onClick={() => navigate('/profile')}
        className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 cursor-pointer group"
      >
        <div className="relative shrink-0">
          <div className="p-0.5 rounded-full bg-gradient-to-tr from-study-primary to-blue-300 dark:to-blue-600 shadow-md">
            <Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 sm:border-4 border-white dark:border-zinc-900 shadow-sm transition-transform duration-300 group-hover:scale-105">
              {loading ? (
                <div className="flex items-center justify-center w-full h-full bg-study-light/20">
                  <Loader2 className="animate-spin text-study-primary" size={16} />
                </div>
              ) : (
                <>
                  <AvatarImage src={profile?.avatar_url} className="object-cover" />
                  <AvatarFallback className="bg-study-primary text-white text-lg sm:text-xl font-bold">
                    {profile?.name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </>
              )}
            </Avatar>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-green-500 border-2 border-white dark:border-zinc-900 rounded-full shadow-sm" />
        </div>
        
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-black text-study-dark dark:text-white leading-tight tracking-tight truncate">
            Olá, {profile?.name?.split(' ')[0] || "Estudante"}!
          </h2>
          <p className="text-[10px] sm:text-[11px] text-study-medium dark:text-zinc-400 font-bold mt-1 uppercase tracking-wider flex items-center gap-1.5 truncate">
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-study-primary animate-pulse" />
            <span className="truncate">{profile?.course ? `${profile.period || ''} • ${profile.course}` : user?.email}</span>
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-2">
        <Popover>
          <PopoverTrigger asChild>
            <button className="relative p-2.5 sm:p-3 bg-study-light/10 dark:bg-zinc-800 rounded-xl sm:rounded-2xl shadow-sm text-study-dark dark:text-white hover:bg-study-primary hover:text-white transition-all duration-300 group shrink-0">
              <Bell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 border-2 border-white dark:border-zinc-900 rounded-full animate-pulse" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="p-0 bg-transparent border-none shadow-none" align="end" sideOffset={12}>
            <NotificationList notifications={notifications} />
          </PopoverContent>
        </Popover>

        <button 
          onClick={() => navigate('/profile')}
          className="p-2.5 sm:p-3 bg-study-light/10 dark:bg-zinc-800 rounded-xl sm:rounded-2xl shadow-sm text-study-dark dark:text-white hover:bg-study-primary hover:text-white transition-all duration-300 shrink-0"
        >
          <User size={20} />
        </button>

        <button 
          onClick={handleLogout}
          className="p-2.5 sm:p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl sm:rounded-2xl shadow-sm transition-all duration-300 shrink-0"
          title="Sair"
        >
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );
};

export default HomeHeader;