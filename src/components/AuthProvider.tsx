"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'tech_admin' | 'content_admin' | 'student';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  role: UserRole;
  isAdmin: boolean;
  signOut: () => Promise<void>;
};

// Listas de e-mails com permissões especiais
const TECH_ADMIN_EMAILS = ['arlei85@hotmail.com', 'arlei.se.silverio85@gmail.com'];
const CONTENT_ADMIN_EMAILS = ['arleisilverio41@gmail.com', 'yasmim.dambroski@hotmail.com'];

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  role: 'student',
  isAdmin: false,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole>('student');

  const determineRole = (email?: string): UserRole => {
    if (!email) return 'student';
    if (TECH_ADMIN_EMAILS.includes(email)) return 'tech_admin';
    if (CONTENT_ADMIN_EMAILS.includes(email)) return 'content_admin';
    return 'student';
  };

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      if (loading) setLoading(false);
    }, 5000);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setRole(determineRole(currentUser?.email));
      setLoading(false);
      clearTimeout(safetyTimeout);
    }).catch(() => {
      setLoading(false);
      clearTimeout(safetyTimeout);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setRole(determineRole(currentUser?.email));
      setLoading(false);

      if (event === 'PASSWORD_RECOVERY') {
        window.location.href = '/reset-password';
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isAdmin = role === 'tech_admin' || role === 'content_admin';

  return (
    <AuthContext.Provider value={{ session, user, loading, role, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);