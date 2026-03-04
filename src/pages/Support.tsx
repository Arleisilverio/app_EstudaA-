"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, User, Mail, GraduationCap, MapPin, Pencil, Save, Camera, Loader2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SUPPORT_ADMIN_EMAIL = 'arlei85@hotmail.com';

const SupportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [devInfo, setDevInfo] = useState({
    name: "Arlei S. Silvério",
    description: "Aluno de direito 7º período turno manhã",
    image_url: "",
    email: "arlei85@hotmail.com"
  });

  const isSuperAdmin = user?.email === SUPPORT_ADMIN_EMAIL;

  useEffect(() => {
    fetchDevInfo();
  }, []);

  const fetchDevInfo = async () => {
    // Usamos a tabela de perfis filtrando pelo e-mail do admin para buscar os dados persistidos
    const { data, error } = await supabase
      .from('profiles')
      .select('name, course, period, avatar_url')
      .eq('id', user?.id) // Se for o admin logado, busca o dele
      .single();

    if (data && isSuperAdmin) {
      setDevInfo({
        name: data.name || "Arlei S. Silvério",
        description: `${data.course || 'Direito'} ${data.period || '7º período'}`,
        image_url: data.avatar_url || "",
        email: SUPPORT_ADMIN_EMAIL
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!isSuperAdmin) return;
    setSaving(true);
    
    // Simulação de salvamento (no caso real, salvaríamos em uma tabela de config ou perfil do admin)
    // Para este MVP, salvaremos no perfil do próprio admin
    const { error } = await supabase.from('profiles').update({
      name: devInfo.name,
      course: "Direito",
      period: "7º período",
      avatar_url: devInfo.image_url
    }).eq('id', user?.id);

    if (!error) {
      toast.success("Informações do desenvolvedor atualizadas!");
      setIsEditing(false);
    } else {
      toast.error("Erro ao salvar dados.");
    }
    setSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isSuperAdmin) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `dev-avatar-${Date.now()}.${fileExt}`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('announcements')
        .getPublicUrl(fileName);

      setDevInfo({ ...devInfo, image_url: publicUrl });
      toast.success("Foto atualizada!");
    } catch (error) {
      toast.error("Erro no upload da foto.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative overflow-hidden">
      <div className="p-6 flex items-center justify-between border-b bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-study-light/20"
          >
            <ChevronLeft size={24} />
          </Button>
          <h1 className="text-xl font-bold text-study-dark dark:text-white">Ajuda e Suporte</h1>
        </div>
        
        {isSuperAdmin && !isEditing && (
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="text-study-primary">
            <Pencil size={20} />
          </Button>
        )}
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto pb-24">
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="p-1 rounded-full bg-gradient-to-tr from-study-primary to-blue-300 shadow-xl">
              <Avatar className="h-40 w-40 border-4 border-white dark:border-zinc-900 overflow-hidden">
                <AvatarImage src={devInfo.image_url} className="object-cover" />
                <AvatarFallback className="bg-study-primary text-white text-4xl font-black">AS</AvatarFallback>
              </Avatar>
            </div>
            {isEditing && (
              <label className="absolute bottom-2 right-2 bg-study-primary text-white p-3 rounded-full cursor-pointer shadow-lg border-2 border-white hover:scale-110 transition-all">
                {uploading ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
              </label>
            )}
          </div>

          {!isEditing ? (
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-study-dark dark:text-white">{devInfo.name}</h2>
              <p className="text-study-primary font-bold uppercase tracking-widest text-xs">Desenvolvedor do Projeto</p>
              <div className="flex flex-col items-center gap-3 mt-6">
                <div className="flex items-center gap-2 text-study-medium text-sm font-medium">
                  <GraduationCap size={16} className="text-study-primary" /> {devInfo.description}
                </div>
                <div className="flex items-center gap-2 text-study-medium text-sm font-medium">
                  <Mail size={16} className="text-study-primary" /> {devInfo.email}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase ml-1">Nome para Exibição</Label>
                <Input value={devInfo.name} onChange={e => setDevInfo({...devInfo, name: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase ml-1">Sua Descrição (Curso/Período)</Label>
                <Textarea value={devInfo.description} onChange={e => setDevInfo({...devInfo, description: e.target.value})} className="rounded-xl min-h-[80px]" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1 rounded-xl">Cancelar</Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-study-primary rounded-xl font-bold">
                  {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />} Salvar
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-black text-study-dark dark:text-white uppercase tracking-widest border-b pb-2">Sobre o Projeto</h3>
          <p className="text-sm text-study-medium leading-relaxed italic">
            "Este aplicativo foi desenvolvido para facilitar o dia a dia dos alunos de Direito, unindo tecnologia e estudo focado. O Estuda AÍ é meu projeto de contribuição para a nossa turma e para o curso."
          </p>
          
          <div className="bg-study-light/10 dark:bg-zinc-800 p-6 rounded-[2rem] border border-study-light/20">
            <h4 className="font-bold text-study-dark dark:text-zinc-200 text-sm mb-4">Precisa de suporte técnico?</h4>
            <Button asChild className="w-full bg-study-dark text-white rounded-xl py-6 hover:bg-black transition-colors">
              <a href={`mailto:${devInfo.email}`}>
                <Mail className="mr-2" size={18} /> Enviar um E-mail
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportPage;