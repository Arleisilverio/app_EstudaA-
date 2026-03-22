"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'professor' | 'student';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: UserRole;
  isAdmin: boolean;
  isProfessor: boolean;
  signOut: () => Promise<void>;
};

const ADMIN_EMAILS = ['arlei85@hotmail.com', 'arlei.se.silverio85@gmail.com'];
const ROLE_CACHE_KEY = 'study_ai_user_role';

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  role: 'student',
  isAdmin: false,
  isProfessor: false,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Inicializa a role a partir do cache para evitar "modo fantasma"
  const [role, setRole] = useState<UserRole>(() => {
    const cached = localStorage.getItem(ROLE_CACHE_KEY);
    return (cached as UserRole) || 'student';
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', userId)
        .maybeSingle();
      
      if (error) throw error;
      if (data?.user_role) {
        const newRole = data.user_role as UserRole;
        setRole(newRole);
        localStorage.setItem(ROLE_CACHE_KEY, newRole);
      }
    } catch (err) {
      console.error("Auth: Erro ao sincronizar role:", err);
    }
  };

  const checkSession = async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Timeout de segurança reduzido para 3s (mais agressivo)
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        setLoading(false);
        console.warn("Auth: Timeout atingido. Liberando UI.");
      }
    }, 3000);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        
        // Libera o loading assim que a sessão é confirmada
        // A role será atualizada em background
        setLoading(false);
        fetchUserRole(currentSession.user.id);
      } else {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    } catch (error) {
      console.error("Auth: Erro crítico de sessão:", error);
      setLoading(false);
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log(`Auth Event: ${event}`);
      
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        fetchUserRole(currentSession.user.id);
      } else {
        setSession(null);
        setUser(null);
        setRole('student');
        localStorage.removeItem(ROLE_CACHE_KEY);
      }
      setLoading(false);
    });

    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };

    window.addEventListener('visibilitychange', handleSync);
    window.addEventListener('focus', handleSync);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('visibilitychange', handleSync);
      window.removeEventListener('focus', handleSync);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    setSession(null);
    setUser(null);
    setRole('student');
  };

  const isAdmin = role === 'admin' || (user?.email ? ADMIN_EMAILS.includes(user.email) : false);
  const isProfessor = role === 'professor';

  return (
    <AuthContext.Provider value={{ session, user, loading, role, isAdmin, isProfessor, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);