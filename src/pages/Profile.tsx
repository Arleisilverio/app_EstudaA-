"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Save, User, BookOpen, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";
import { showSuccess, showError } from "@/utils/toast";
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

    setSaving(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    const filePath = fileName;

    const uploadFn = async () => {
      // 1. Sobe para o Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;

      // 2. Pega a URL pública
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      // 3. Salva no perfil imediatamente para persistir
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      return publicUrl;
    };

    toast.promise(uploadFn(), {
      loading: 'Enviando imagem...',
      success: (url) => {
        setProfile(prev => ({ ...prev, avatar_url: url }));
        setSaving(false);
        return "Foto atualizada com sucesso!";
      },
      error: (err) => {
        setSaving(false);
        console.error(err);
        return "Erro ao subir imagem. Verifique se o bucket 'avatars' é público.";
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
      loading: 'Salvando perfil...',
      success: () => {
        setSaving(false);
        return "Perfil atualizado!";
      },
      error: () => {
        setSaving(false);
        return "Erro ao salvar.";
      }
    });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando perfil...</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-32">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-study-dark dark:text-white mb-6">Meu Perfil</h1>
        
        <div className="flex flex-col items-center mb-8 relative">
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-white dark:border-zinc-800 shadow-study overflow-hidden">
              <AvatarImage src={profile.avatar_url} className="object-cover w-full h-full" />
              <AvatarFallback className="bg-study-primary text-white text-3xl">
                {profile.name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 bg-study-primary text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-study-dark transition-colors z-20">
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
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-full z-10">
                <Loader2 className="animate-spin text-white" size={32} />
              </div>
            )}
          </div>
          <p className="mt-4 text-study-medium font-medium dark:text-zinc-400 text-xs">
            {user?.email}
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden">
            <CardHeader className="bg-study-light/20 dark:bg-zinc-800/50 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-study-dark dark:text-zinc-200">
                <User size={18} className="text-study-primary" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-study-medium">Nome Visível</Label>
                <Input 
                  id="name" 
                  value={profile.name || ""} 
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="rounded-xl border-study-light dark:border-zinc-800 bg-transparent"
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course" className="text-study-medium">Curso</Label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-study-light" size={18} />
                  <Input 
                    id="course" 
                    value={profile.course || ""} 
                    onChange={(e) => setProfile({...profile, course: e.target.value})}
                    className="pl-10 rounded-xl border-study-light dark:border-zinc-800 bg-transparent"
                    placeholder="Ex: Direito, Medicina..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period" className="text-study-medium">Turma/Período</Label>
                  <Input 
                    id="period" 
                    value={profile.period || ""} 
                    onChange={(e) => setProfile({...profile, period: e.target.value})}
                    className="rounded-xl border-study-light dark:border-zinc-800 bg-transparent"
                    placeholder="Ex: 7º Período"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year" className="text-study-medium">Conclusão</Label>
                  <Input 
                    id="year" 
                    value={profile.completion_year || ""} 
                    onChange={(e) => setProfile({...profile, completion_year: e.target.value})}
                    className="rounded-xl border-study-light dark:border-zinc-800 bg-transparent"
                    placeholder="Ex: 2026"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-study-primary hover:bg-study-dark text-white rounded-2xl py-8 text-lg font-bold shadow-lg flex gap-2"
          >
            {saving ? <Loader2 className="animate-spin" /> : <Save size={20} />} 
            Salvar Alterações
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;