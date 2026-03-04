"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Save, User, Loader2, History, Trash2, Award, Cake } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/BottomNav";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from "sonner";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const ProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [profile, setProfile] = useState({
    name: "",
    course: "",
    period: "",
    completion_year: "",
    avatar_url: "",
    birthday: ""
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchQuizHistory();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
    if (data) setProfile({
      ...data,
      birthday: data.birthday || ""
    });
    setLoading(false);
  };

  const fetchQuizHistory = async () => {
    const { data } = await supabase
      .from('quiz_history')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    if (data) setQuizHistory(data);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!user) return;
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('announcements')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      toast.success("Foto de perfil atualizada!");
      setTimeout(() => fetchProfile(), 500);
    } catch (error: any) {
      console.error("Erro upload:", error);
      toast.error("Erro ao carregar imagem: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    if (!confirm("Excluir este simulado do histórico?")) return;
    const { error } = await supabase.from('quiz_history').delete().eq('id', id);
    if (!error) {
      setQuizHistory(prev => prev.filter(item => item.id !== id));
      toast.success("Histórico removido.");
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').upsert({ 
      id: user.id, 
      ...profile, 
      updated_at: new Date().toISOString() 
    });
    if (!error) toast.success("Perfil atualizado!");
    else toast.error("Erro ao salvar perfil");
    setSaving(false);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-study-primary" size={48} /></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-40">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-study-dark dark:text-white mb-8">Meu Perfil</h1>
        
        <div className="flex flex-col items-center mb-10">
          <div className="relative group">
            <div className="p-1 rounded-full bg-gradient-to-tr from-study-primary to-blue-300 shadow-xl">
              <Avatar className="h-32 w-32 border-4 border-white dark:border-zinc-900 overflow-hidden">
                {uploading ? (
                  <div className="flex items-center justify-center w-full h-full bg-study-light/20">
                    <Loader2 className="animate-spin text-study-primary" size={32} />
                  </div>
                ) : (
                  <>
                    <AvatarImage src={profile.avatar_url} className="object-cover" />
                    <AvatarFallback className="bg-study-primary text-white text-3xl font-bold">
                      {profile.name?.substring(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
            </div>
            <label className="absolute bottom-1 right-1 bg-study-primary text-white p-2.5 rounded-full cursor-pointer shadow-lg border-2 border-white hover:scale-110 transition-transform active:scale-95">
              <Camera size={20} />
              <input 
                type="file" 
                className="hidden" 
                accept="image/*" 
                onChange={handleAvatarUpload} 
                disabled={uploading}
              />
            </label>
          </div>
          <p className="mt-4 text-study-medium font-bold text-xs uppercase tracking-widest">{user?.email}</p>
        </div>

        <div className="space-y-8">
          <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem]">
            <CardHeader className="bg-study-light/20 pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <User size={18} className="text-study-primary" /> Informações Acadêmicas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase ml-1">Nome Completo</Label>
                <Input 
                  value={profile.name} 
                  onChange={e => setProfile({...profile, name: e.target.value})} 
                  className="rounded-xl" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase ml-1">Data de Nascimento</Label>
                <div className="relative">
                  <Input 
                    type="date"
                    value={profile.birthday} 
                    onChange={e => setProfile({...profile, birthday: e.target.value})} 
                    className="rounded-xl pl-10" 
                  />
                  <Cake className="absolute left-3 top-1/2 -translate-y-1/2 text-study-primary" size={18} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase ml-1">Curso</Label>
                <Input 
                  value={profile.course} 
                  onChange={e => setProfile({...profile, course: e.target.value})} 
                  className="rounded-xl" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase ml-1">Período</Label>
                  <Input 
                    value={profile.period} 
                    onChange={e => setProfile({...profile, period: e.target.value})} 
                    placeholder="Ex: 5º Período" 
                    className="rounded-xl" 
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase ml-1">Ano Conclusão</Label>
                  <Input 
                    value={profile.completion_year} 
                    onChange={e => setProfile({...profile, completion_year: e.target.value})} 
                    placeholder="Ex: 2026" 
                    className="rounded-xl" 
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} className="w-full bg-study-primary rounded-xl mt-2 font-bold py-6">
                {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                Salvar Dados
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <h2 className="text-lg font-black text-study-dark dark:text-white flex items-center gap-2 px-2">
              <History className="text-study-primary" size={20} /> Histórico de Simulados
            </h2>
            
            {quizHistory.length === 0 ? (
              <p className="text-center py-10 text-study-medium text-sm">Você ainda não realizou simulados.</p>
            ) : (
              quizHistory.map((quiz) => (
                <Card key={quiz.id} className="border-none shadow-sm bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden group">
                  <div className="p-5 flex items-center justify-between">
                    <div className="flex gap-4">
                      <div className="bg-study-primary/10 p-3 rounded-2xl">
                        <Award className="text-study-primary" size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-study-dark dark:text-white text-sm">{quiz.subject_name}</h3>
                        <p className="text-[10px] text-study-medium font-bold uppercase">
                          {format(new Date(quiz.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <Badge className={cn(
                        "rounded-full px-3",
                        (quiz.score / quiz.total_questions) >= 0.7 ? "bg-green-500" : "bg-red-500"
                      )}>
                        {quiz.score}/{quiz.total_questions} Acertos
                      </Badge>
                      <button onClick={() => deleteHistoryItem(quiz.id)} className="text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;