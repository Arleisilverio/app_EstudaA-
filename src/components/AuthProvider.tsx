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
      const { data, error } = await supabase
        .from('profiles')
        .select('user_role')
        .eq('id', userId)
        .maybeSingle();
      
      if (data) {
        setRole(data.user_role as UserRole);
      }
    } catch (err) {
      console.error("Erro ao buscar role:", err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        
        if (currentUser) {
          await fetchUserRole(currentUser.id);
        }
      } catch (error) {
        console.error("Auth init error:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        await fetchUserRole(currentUser.id);
      } else {
        setRole('student');
      }
      
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'SIGNED_OUT') {
        setLoading(false);
      }
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