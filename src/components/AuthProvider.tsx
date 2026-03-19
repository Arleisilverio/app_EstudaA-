"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
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

  const fetchUserRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', userId)
        .maybeSingle();
      
      if (data?.user_role) {
        setRole(data.user_role as UserRole);
      }
    } catch (err) {
      console.error("Erro ao buscar role:", err);
    }
  };

  useEffect(() => {
    // Busca inicial da sessão de forma imediata
    const initAuth = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        await fetchUserRole(initialSession.user.id);
      }
      
      // Libera o carregamento inicial
      setLoading(false);
    };

    initAuth();

    // Escuta mudanças de estado sem resetar o 'loading' global para true
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await fetchUserRole(currentSession.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setRole('student');
      }
      
      // Garante que o loading inicial seja finalizado
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
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