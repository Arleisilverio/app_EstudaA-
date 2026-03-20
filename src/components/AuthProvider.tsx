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
  const [role, setRole] = useState<UserRole>('student');
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
        setRole(data.user_role as UserRole);
      }
    } catch (err) {
      console.error("Erro ao buscar role:", err);
    }
  };

  const checkSession = async () => {
    // Inicia um timeout de segurança para não travar o usuário na tela de loading
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setLoading(false);
      console.warn("Auth: Timeout de segurança atingido. Forçando renderização.");
    }, 4000);

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        // Busca a role mas não bloqueia o setLoading(false) se demorar
        fetchUserRole(currentSession.user.id).finally(() => {
          setLoading(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
        });
      } else {
        setSession(null);
        setUser(null);
        setLoading(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }
    } catch (error) {
      console.error("Erro ao verificar sessão:", error);
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        await fetchUserRole(currentSession.user.id);
      } else {
        setSession(null);
        setUser(null);
        setRole('student');
      }
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkSession();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', checkSession);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', checkSession);
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