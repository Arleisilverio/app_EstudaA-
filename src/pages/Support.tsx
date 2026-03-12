"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, User, Mail, GraduationCap, Pencil, Save, Camera, Loader2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// E-mails autorizados a editar esta página
const SUPPORT_ADMIN_EMAILS = ['arlei85@hotmail.com', 'arlei.se.silverio85@gmail.com'];
const DEV_NAME_KEY = "Arlei S. Silvério"; 

const SupportPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [devInfo, setDevInfo] = useState({
    id: "",
    name: "Arlei S. Silvério",
    description: "Aluno de direito 7º período turno manhã",
    image_url: "",
    email: 'arlei.se.silverio85@gmail.com'
  });

  const isSuperAdmin = user?.email && SUPPORT_ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    fetchDevData();
  }, []);

  const fetchDevData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, name, course, period, avatar_url')
        .eq('name', DEV_NAME_KEY)
        .maybeSingle();

      if (data) {
        setDevInfo({
          id: data.id,
          name: data.name || DEV_NAME_KEY,
          description: data.course && data.period ? `${data.course} • ${data.period}` : "Desenvolvedor do Sistema",
          image_url: data.avatar_url || "",
          email: 'arlei.se.silverio85@gmail.com'
        });
      }
    } catch (err) {
      console.error("Erro ao carregar dados do suporte:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!isSuperAdmin) return;
    setSaving(true);
    
    try {
      const { error } = await supabase.from('profiles').update({
        name: devInfo.name,
        course: devInfo.description.split(' • ')[0] || "Direito",
        period: devInfo.description.split(' • ')[1] || "7º período",
        avatar_url: devInfo.image_url
      }).eq('id', user?.id);

      if (error) throw error;

      toast.success("Dados do suporte atualizados!");
      setIsEditing(false);
      fetchDevData();
    } catch (error) {
      toast.error("Erro ao salvar dados.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteData = async () => {
    if (!isSuperAdmin) return;
    if (!confirm("Deseja limpar as informações do desenvolvedor? Isso redefinirá os campos.")) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({
        course: null,
        period: null,
        avatar_url: null
      }).eq('id', user?.id);

      if (error) throw error;

      setDevInfo(prev => ({ ...prev, description: "Informações removidas", image_url: "" }));
      toast.success("Dados removidos com sucesso.");
      setIsEditing(false);
    } catch (err) {
      toast.error("Erro ao remover dados.");
    } finally {
      setSaving(false);
    }
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
      toast.success("Foto carregada!");
    } catch (error) {
      toast.error("Erro no upload da foto.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="animate-spin text-study-primary" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative overflow-hidden">
      <div className="p-6 flex items-center justify-between border-b border-white/5 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="rounded-full hover:bg-study-light/20 text-white"
          >
            <ChevronLeft size={24} />
          </Button>
          <h1 className="text-xl font-bold text-white">Ajuda e Suporte</h1>
        </div>
        
        {isSuperAdmin && !isEditing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="text-study-primary">
              <Pencil size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleDeleteData} className="text-red-500">
              <Trash2 size={20} />
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto pb-24">
        <div className="flex flex-col items-center">
          <div className="relative mb-6">
            <div className="p-1 rounded-full bg-gradient-to-tr from-study-primary to-blue-500 shadow-xl">
              <Avatar className="h-40 w-40 border-4 border-zinc-900 overflow-hidden">
                <AvatarImage src={devInfo.image_url} className="object-cover" />
                <AvatarFallback className="bg-study-primary text-white text-4xl font-black">
                  {devInfo.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
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
              <h2 className="text-2xl font-black text-white">{devInfo.name}</h2>
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
                <Label className="text-[10px] font-bold uppercase ml-1 text-study-medium">Nome (Mantenha como no banco)</Label>
                <Input value={devInfo.name} onChange={e => setDevInfo({...devInfo, name: e.target.value})} className="rounded-xl bg-zinc-800 border-zinc-700 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-bold uppercase ml-1 text-study-medium">Descrição (Curso • Período)</Label>
                <Textarea value={devInfo.description} onChange={e => setDevInfo({...devInfo, description: e.target.value})} placeholder="Ex: Direito • 7º Período" className="rounded-xl bg-zinc-800 border-zinc-700 text-white min-h-[80px]" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1 rounded-xl border-zinc-700 text-white">Cancelar</Button>
                <Button onClick={handleSave} disabled={saving} className="flex-1 bg-study-primary text-zinc-900 hover:bg-study-primary/90 rounded-xl font-bold">
                  {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />} Salvar
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-black text-white uppercase tracking-widest border-b border-white/10 pb-2">Sobre o Projeto</h3>
          <p className="text-sm text-study-medium leading-relaxed italic">
            "Este aplicativo foi desenvolvido para facilitar o dia a dia dos alunos de Direito, unindo tecnologia e estudo focado. O Estuda AÍ é meu projeto de contribuição para a nossa turma e para o curso."
          </p>
          
          <div className="bg-zinc-800/50 p-6 rounded-[2rem] border border-white/5">
            <h4 className="font-bold text-zinc-200 text-sm mb-4">Precisa de suporte técnico?</h4>
            <Button asChild className="w-full bg-study-primary text-zinc-900 rounded-xl py-6 hover:bg-study-primary/90 transition-colors font-bold">
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