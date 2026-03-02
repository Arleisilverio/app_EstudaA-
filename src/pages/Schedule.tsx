"use client";

import React, { useState, useEffect } from 'react';
import { CalendarDays, Clock, MapPin, Plus, Pencil, Trash2, Loader2, Save } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { toast } from "sonner";

const DAYS = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
const COLORS = [
  { label: 'Azul', value: 'bg-blue-500' },
  { label: 'Roxo', value: 'bg-violet-500' },
  { label: 'Ciano', value: 'bg-cyan-500' },
  { label: 'Indigo', value: 'bg-indigo-500' },
  { label: 'Rosa', value: 'bg-pink-500' },
];

const SchedulePage = () => {
  const { isAdmin, user } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    day_of_week: 'Segunda-feira',
    start_time: '',
    end_time: '',
    subject_name: '',
    room: '',
    color: 'bg-blue-500'
  });

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    const { data, error } = await supabase
      .from('schedule')
      .select('*')
      .order('start_time', { ascending: true });
    
    if (!error) setSchedule(data || []);
    setLoading(false);
  };

  const handleOpenDialog = (item: any = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        day_of_week: item.day_of_week,
        start_time: item.start_time,
        end_time: item.end_time,
        subject_name: item.subject_name,
        room: item.room || '',
        color: item.color || 'bg-blue-500'
      });
    } else {
      setEditingItem(null);
      setFormData({
        day_of_week: 'Segunda-feira',
        start_time: '',
        end_time: '',
        subject_name: '',
        room: '',
        color: 'bg-blue-500'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.subject_name || !formData.start_time || !formData.end_time) {
      showError("Preencha os campos obrigatórios");
      return;
    }

    setIsDialogOpen(false);

    const saveFn = async () => {
      const { error } = editingItem
        ? await supabase.from('schedule').update(formData).eq('id', editingItem.id)
        : await supabase.from('schedule').insert([{ ...formData, user_id: user?.id }]);
      if (error) throw error;
    };

    toast.promise(saveFn(), {
      loading: 'Atualizando grade...',
      success: () => {
        fetchSchedule();
        return editingItem ? "Grade atualizada!" : "Aula adicionada!";
      },
      error: 'Erro ao salvar dados'
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Remover da grade?")) return;
    
    const deleteFn = async () => {
      const { error } = await supabase.from('schedule').delete().eq('id', id);
      if (error) throw error;
    };

    toast.promise(deleteFn(), {
      loading: 'Removendo...',
      success: () => {
        fetchSchedule();
        return "Item removido!";
      },
      error: 'Erro ao excluir'
    });
  };

  const groupedSchedule = DAYS.map(day => ({
    day,
    items: schedule.filter(s => s.day_of_week === day)
  })).filter(group => group.items.length > 0 || isAdmin);

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-32">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-study-primary/10 p-3 rounded-2xl">
              <CalendarDays className="text-study-primary" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-study-dark dark:text-white">Grade</h1>
              <p className="text-study-medium text-sm font-medium">Horário Semanal</p>
            </div>
          </div>
          
          {isAdmin && (
            <Button 
              onClick={() => handleOpenDialog()}
              className="rounded-full w-12 h-12 bg-study-primary hover:bg-study-dark p-0 shadow-lg"
            >
              <Plus size={24} className="text-white" />
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-study-primary" size={40} /></div>
        ) : (
          <div className="space-y-8">
            {groupedSchedule.map((dayPlan, idx) => (
              <section key={idx} className="space-y-3">
                <div className="flex items-center gap-2 ml-1">
                  <div className="w-2 h-2 rounded-full bg-study-primary" />
                  <h2 className="text-sm font-black text-study-dark dark:text-zinc-200 uppercase tracking-widest">
                    {dayPlan.day}
                  </h2>
                </div>
                
                <div className="grid gap-3">
                  {dayPlan.items.length === 0 && isAdmin && (
                    <p className="text-[10px] text-study-medium italic ml-4">Nenhuma aula cadastrada.</p>
                  )}
                  {dayPlan.items.map((item, sIdx) => (
                    <Card key={sIdx} className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[1.5rem] overflow-hidden group">
                      <CardContent className="p-0 flex h-20">
                        <div className={`w-3 ${item.color}`} />
                        <div className="flex-1 p-4 flex items-center justify-between">
                          <div className="space-y-1">
                            <h3 className="font-bold text-study-dark dark:text-zinc-100 text-sm">
                              {item.subject_name}
                            </h3>
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1 text-[10px] font-bold text-study-medium dark:text-zinc-400 uppercase">
                                <Clock size={12} className="text-study-primary" /> {item.start_time.substring(0,5)} - {item.end_time.substring(0,5)}
                              </span>
                              <span className="flex items-center gap-1 text-[10px] font-bold text-study-medium dark:text-zinc-400 uppercase">
                                <MapPin size={12} className="text-study-primary" /> {item.room}
                              </span>
                            </div>
                          </div>
                          
                          {isAdmin && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleOpenDialog(item)} className="p-1.5 text-study-medium hover:text-study-primary"><Pencil size={14} /></button>
                              <button onClick={() => handleDelete(item.id)} className="p-1.5 text-study-medium hover:text-red-500"><Trash2 size={14} /></button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Horário" : "Nova Aula"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Dia da Semana</Label>
              <Select value={formData.day_of_week} onValueChange={v => setFormData({...formData, day_of_week: v})}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Matéria *</Label>
              <Input value={formData.subject_name} onChange={e => setFormData({...formData, subject_name: e.target.value})} placeholder="Nome da disciplina" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início *</Label>
                <Input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Fim *</Label>
                <Input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="rounded-xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sala / Local</Label>
                <Input value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} placeholder="Ex: Sala 302" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Cor de Destaque</Label>
                <Select value={formData.color} onValueChange={v => setFormData({...formData, color: v})}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{COLORS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} className="w-full bg-study-primary hover:bg-study-dark text-white rounded-xl py-6 font-bold flex gap-2">
              <Save size={18} /> Salvar na Grade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default SchedulePage;