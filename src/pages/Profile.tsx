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
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) setProfile(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload para o bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Pegar a URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile({ ...profile, avatar_url: publicUrl });
      showSuccess("Imagem carregada! Clique em salvar para confirmar.");
    } catch (err: any) {
      console.error(err);
      showError("Erro ao subir imagem. Certifique-se que o bucket 'avatars' existe e é público.");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user?.id,
          ...profile,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      showSuccess("Perfil atualizado com sucesso!");
    } catch (err: any) {
      showError("Erro ao salvar perfil");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando perfil...</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-32">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-study-dark dark:text-white mb-6">Meu Perfil</h1>
        
        <div className="flex flex-col items-center mb-8 relative">
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-white dark:border-zinc-800 shadow-study">
              <AvatarImage src={profile.avatar_url} className="object-cover" />
              <AvatarFallback className="bg-study-primary text-white text-3xl">
                {profile.name?.substring(0, 2).toUpperCase() || "..."}
              </AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 bg-study-primary text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-study-dark transition-colors">
              <Camera size={20} />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleAvatarChange}
                disabled={saving}
              />
            </label>
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
            className="w-full bg-study-primary hover:bg-study-dark text-white dark:text-zinc-900 rounded-2xl py-8 text-lg font-bold shadow-lg flex gap-2"
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