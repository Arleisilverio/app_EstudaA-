"use client";

import React, { useEffect, useState } from 'react';
import { Bell, Loader2, Settings } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import NotificationList from './NotificationList';
import { useNavigate } from 'react-router-dom';

const HomeHeader = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
      setNotifications([]); 
    } catch (err) {
      console.error("Erro ao carregar perfil:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 sm:p-6 bg-white dark:bg-zinc-900 rounded-[2rem] shadow-study mx-4 mt-6 border border-study-light/10 dark:border-white/5 transition-all duration-500 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="relative group shrink-0">
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
          onClick={() => navigate('/settings')}
          className="p-2.5 sm:p-3 bg-study-light/10 dark:bg-zinc-800 rounded-xl sm:rounded-2xl shadow-sm text-study-dark dark:text-white hover:bg-study-primary hover:text-white transition-all duration-300 shrink-0"
        >
          <Settings size={20} />
        </button>
      </div>
    </div>
  );
};

export default HomeHeader;