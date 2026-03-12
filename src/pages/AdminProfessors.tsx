"use client";

import React, { useState, useEffect } from 'react';
import { ChevronLeft, UserPlus, Phone, BookOpen, Trash2, Loader2, Save, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const AdminProfessors = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [professors, setProfessors] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    subject_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: profs } = await supabase.from('professors').select('*, subjects(name)').order('name');
    const { data: subs } = await supabase.from('subjects').select('id, name').order('name');
    
    if (profs) setProfessors(profs);
    if (subs) setSubjects(subs);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.phone_number || !formData.subject_id) {
      return toast.error("Preencha todos os campos.");
    }

    setSaving(true);
    try {
      // Limpa o número (apenas dígitos)
      const cleanPhone = formData.phone_number.replace(/\D/g, '');
      
      const { error } = await supabase.from('professors').insert([{
        name: formData.name,
        phone_number: cleanPhone,
        subject_id: formData.subject_id
      }]);

      if (error) throw error;

      toast.success("Professor autorizado!");
      setFormData({ name: '', phone_number: '', subject_id: '' });
      fetchData();
    } catch (err) {
      toast.error("Erro ao cadastrar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover autorização deste professor?")) return;
    const { error } = await supabase.from('professors').delete().eq('id', id);
    if (!error) {
      toast.success("Removido.");
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative overflow-hidden">
      <div className="p-6 flex items-center gap-4 border-b border-white/5 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full text-white">
          <ChevronLeft size={24} />
        </Button>
        <h1 className="text-xl font-bold text-white">Curadoria n8n</h1>
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto pb-24">
        <section className="space-y-4">
          <h2 className="text-xs font-bold text-study-primary uppercase tracking-widest flex items-center gap-2">
            <UserPlus size={14} /> Autorizar Novo Professor
          </h2>
          <Card className="border-none bg-zinc-900 rounded-[2rem] shadow-xl">
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] uppercase ml-1 text-study-medium">Nome do Professor</Label>
                <Input 
                  placeholder="Ex: Rafael Nassif" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="rounded-xl bg-zinc-800 border-zinc-700 text-white" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase ml-1 text-study-medium">WhatsApp (DDI + DDD + Num)</Label>
                <Input 
                  placeholder="Ex: 5541987922057" 
                  value={formData.phone_number}
                  onChange={e => setFormData({...formData, phone_number: e.target.value})}
                  className="rounded-xl bg-zinc-800 border-zinc-700 text-white" 
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] uppercase ml-1 text-study-medium">Matéria Designada</Label>
                <Select value={formData.subject_id} onValueChange={v => setFormData({...formData, subject_id: v})}>
                  <SelectTrigger className="rounded-xl bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Selecione a matéria" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} disabled={saving} className="w-full bg-study-primary text-zinc-900 rounded-xl font-bold py-6">
                {saving ? <Loader2 className="animate-spin" /> : "Vincular no n8n"}
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-bold text-study-medium uppercase tracking-widest flex items-center gap-2">
            <UserCheck size={14} /> Professores Elegíveis
          </h2>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-study-primary" /></div>
          ) : professors.length === 0 ? (
            <p className="text-center py-10 text-study-medium text-xs">Nenhum professor cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {professors.map((p) => (
                <div key={p.id} className="p-4 rounded-2xl bg-zinc-800/40 border border-white/5 flex items-center justify-between group">
                  <div className="flex gap-3">
                    <div className="bg-study-primary/10 p-2 rounded-xl h-fit">
                      <Phone size={16} className="text-study-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{p.name}</p>
                      <p className="text-[10px] font-bold text-study-primary uppercase tracking-tighter">
                        {p.subjects?.name}
                      </p>
                      <p className="text-[9px] text-study-medium mt-0.5">ID: {p.phone_number}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminProfessors;