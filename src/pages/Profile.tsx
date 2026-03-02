"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Save, User, BookOpen, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from "sonner";

const ProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: "",
    course: "",
    period: "",
    completion_year: "",
    avatar_url: ""
  });

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (data) setProfile(data);
    setLoading(false);
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    setSaving(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const uploadFn = async () => {
      // 1. Upload do arquivo
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { 
          cacheControl: '3600',
          upsert: true 
        });
      
      if (uploadError) throw uploadError;

      // 2. Obter URL Pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Adicionar timestamp para evitar cache do navegador
      const finalUrl = `${publicUrl}?t=${Date.now()}`;

      // 3. Atualizar tabela de perfis
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: finalUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      return finalUrl;
    };

    toast.promise(uploadFn(), {
      loading: 'Enviando sua foto...',
      success: (url) => {
        setProfile(prev => ({ ...prev, avatar_url: url }));
        setSaving(false);
        return "Foto atualizada!";
      },
      error: (err) => {
        setSaving(false);
        console.error("Erro completo do upload:", err);
        return "Falha no upload. Verifique as permissões do Storage.";
      }
    });
  };

  const handleSave = () => {
    setSaving(true);
    
    const saveFn = async () => {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          ...profile,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
    };

    toast.promise(saveFn(), {
      loading: 'Salvando dados...',
      success: () => {
        setSaving(false);
        return "Perfil salvo com sucesso!";
      },
      error: () => {
        setSaving(false);
        return "Erro ao salvar informações.";
      }
    });
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
      <Loader2 className="animate-spin text-study-primary" size={48} />
      <p className="text-study-medium font-medium">Carregando perfil...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-32">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-study-dark dark:text-white mb-8">Meu Perfil</h1>
        
        <div className="flex flex-col items-center mb-10 relative">
          <div className="relative">
            <div className="p-1 rounded-full border-2 border-study-primary/20 bg-white dark:bg-zinc-900 shadow-xl">
              <Avatar className="h-32 w-32 border-4 border-white dark:border-zinc-800 overflow-hidden">
                <AvatarImage src={profile.avatar_url} className="object-cover w-full h-full" />
                <AvatarFallback className="bg-study-primary text-white text-3xl font-bold">
                  {profile.name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <label className="absolute bottom-1 right-1 bg-study-primary text-white p-2.5 rounded-full cursor-pointer shadow-lg hover:bg-study-dark transition-all active:scale-90 z-20 border-2 border-white dark:border-zinc-900">
              <Camera size={20} />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleAvatarChange}
                disabled={saving}
              />
            </label>
            {saving && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center rounded-full z-10 m-1">
                <Loader2 className="animate-spin text-white" size={32} />
              </div>
            )}
          </div>
          <p className="mt-4 text-study-medium font-bold dark:text-zinc-400 text-xs uppercase tracking-widest">
            {user?.email}
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
            <CardHeader className="bg-study-light/20 dark:bg-zinc-800/50 pb-4 border-b border-study-light/10 dark:border-white/5">
              <CardTitle className="text-lg flex items-center gap-2 text-study-dark dark:text-zinc-100">
                <div className="bg-study-primary/10 p-2 rounded-lg">
                  <User size={18} className="text-study-primary" />
                </div>
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-study-medium font-bold text-xs uppercase ml-1">Nome Completo</Label>
                <Input 
                  id="name" 
                  value={profile.name || ""} 
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="rounded-2xl border-study-light/50 dark:border-zinc-800 bg-transparent h-12 focus-visible:ring-study-primary/20"
                  placeholder="Como quer ser chamado?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course" className="text-study-medium font-bold text-xs uppercase ml-1">Curso / Graduação</Label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-study-light" size={18} />
                  <Input 
                    id="course" 
                    value={profile.course || ""} 
                    onChange={(e) => setProfile({...profile, course: e.target.value})}
                    className="pl-10 rounded-2xl border-study-light/50 dark:border-zinc-800 bg-transparent h-12 focus-visible:ring-study-primary/20"
                    placeholder="Ex: Direito, Medicina..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period" className="text-study-medium font-bold text-xs uppercase ml-1">Período</Label>
                  <Input 
                    id="period" 
                    value={profile.period || ""} 
                    onChange={(e) => setProfile({...profile, period: e.target.value})}
                    className="rounded-2xl border-study-light/50 dark:border-zinc-800 bg-transparent h-12 focus-visible:ring-study-primary/20"
                    placeholder="Ex: 7º Período"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year" className="text-study-medium font-bold text-xs uppercase ml-1">Ano de Conclusão</Label>
                  <Input 
                    id="year" 
                    value={profile.completion_year || ""} 
                    onChange={(e) => setProfile({...profile, completion_year: e.target.value})}
                    className="rounded-2xl border-study-light/50 dark:border-zinc-800 bg-transparent h-12 focus-visible:ring-study-primary/20"
                    placeholder="Ex: 2026"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-study-primary hover:bg-study-dark text-white rounded-[1.5rem] py-8 text-lg font-bold shadow-lg flex gap-2 transition-all active:scale-[0.98]"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} 
            Salvar Perfil
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;