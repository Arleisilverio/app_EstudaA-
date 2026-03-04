"use client";

import React, { useState, useEffect } from 'react';
import { Camera, Save, User, Loader2, History, Trash2, Award, Cake } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const DAYS = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
const MONTHS = [
  { val: "01", label: "Janeiro" }, { val: "02", label: "Fevereiro" },
  { val: "03", label: "Março" }, { val: "04", label: "Abril" },
  { val: "05", label: "Maio" }, { val: "06", label: "Junho" },
  { val: "07", label: "Julho" }, { val: "08", label: "Agosto" },
  { val: "09", label: "Setembro" }, { val: "10", label: "Outubro" },
  { val: "11", label: "Novembro" }, { val: "12", label: "Dezembro" }
];

const ProfilePage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
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
      fetchQuizHistory();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
    if (data) {
      setProfile({
        name: data.name || "",
        course: data.course || "",
        period: data.period || "",
        completion_year: data.completion_year || "",
        avatar_url: data.avatar_url || ""
      });
      if (data.birthday) {
        const [_, month, day] = data.birthday.split('-');
        setBirthDay(day);
        setBirthMonth(month);
      }
    }
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
      const { error: uploadError } = await supabase.storage.from('announcements').upload(filePath, file, { upsert: true, cacheControl: '3600' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('announcements').getPublicUrl(filePath);
      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      toast.success("Foto de perfil atualizada!");
      setTimeout(() => fetchProfile(), 500);
    } catch (error: any) {
      toast.error("Erro ao carregar imagem");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    
    // Construímos a data usando o ano 2000 como padrão interno
    const birthdayString = birthDay && birthMonth ? `2000-${birthMonth}-${birthDay}` : null;

    const { error } = await supabase.from('profiles').upsert({ 
      id: user.id, 
      ...profile,
      birthday: birthdayString,
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
              <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
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
                <Input value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="rounded-xl" />
              </div>
              
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase ml-1">Dia e Mês do Aniversário</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Select value={birthDay} onValueChange={setBirthDay}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Dia" />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-[2]">
                    <Select value={birthMonth} onValueChange={setBirthMonth}>
                      <SelectTrigger className="rounded-xl h-11">
                        <SelectValue placeholder="Mês" />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map(m => <SelectItem key={m.val} value={m.val}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-[9px] text-study-medium ml-1 italic">* O ano não será exibido nem solicitado.</p>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase ml-1">Curso</Label>
                <Input value={profile.course} onChange={e => setProfile({...profile, course: e.target.value})} className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase ml-1">Período</Label>
                  <Input value={profile.period} onChange={e => setProfile({...profile, period: e.target.value})} placeholder="Ex: 5º Período" className="rounded-xl" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold uppercase ml-1">Ano Conclusão</Label>
                  <Input value={profile.completion_year} onChange={e => setProfile({...profile, completion_year: e.target.value})} placeholder="Ex: 2026" className="rounded-xl" />
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
                      <div className="bg-study-primary/10 p-3 rounded-2xl"><Award className="text-study-primary" size={24} /></div>
                      <div>
                        <h3 className="font-bold text-study-dark dark:text-white text-sm">{quiz.subject_name}</h3>
                        <p className="text-[10px] text-study-medium font-bold uppercase">
                          {format(new Date(quiz.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <Badge className={cn("rounded-full px-3", (quiz.score / quiz.total_questions) >= 0.7 ? "bg-green-500" : "bg-red-500")}>
                        {quiz.score}/{quiz.total_questions} Acertos
                      </Badge>
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