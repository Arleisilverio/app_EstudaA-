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

const TECH_ADMIN_EMAIL = 'arlei85@hotmail.com';
const CONTENT_ADMIN_EMAIL = 'arleisilverio41@gmail.com';

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
    if (email === TECH_ADMIN_EMAIL) return 'tech_admin';
    if (email === CONTENT_ADMIN_EMAIL) return 'content_admin';
    return 'student';
  };

  useEffect(() => {
    // Timeout de segurança: se o Supabase não responder em 5 segundos, libera o app
    const safetyTimeout = setTimeout(() => {
      if (loading) setLoading(false);
    }, 5000);

    // Get initial session
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

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setRole(determineRole(currentUser?.email));
      setLoading(false);
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