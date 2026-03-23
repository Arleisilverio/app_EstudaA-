"use client";

import React, { useState, useEffect } from 'react';
import { CalendarDays, Clock, MapPin, Plus, Pencil, Trash2, Loader2, Save, ChevronRight } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DAYS = [
  { id: "Segunda-feira", label: "SEG" },
  { id: "Terça-feira", label: "TER" },
  { id: "Quarta-feira", label: "QUA" },
  { id: "Quinta-feira", label: "QUI" },
  { id: "Sexta-feira", label: "SEX" },
  { id: "Sábado", label: "SÁB" }
];

// Dados iniciais de fallback
const INITIAL_SCHEDULE = [
  { day_of_week: "Segunda-feira", start_time: "08:20", end_time: "10:10", subject_name: "Direito Societário", room: "Prof. Wilian Roque", color: "bg-blue-500" },
  { day_of_week: "Segunda-feira", start_time: "10:20", end_time: "12:00", subject_name: "Procedimentos nos Tribunais", room: "Profª. Carolina Belomo", color: "bg-violet-500" },
  { day_of_week: "Terça-feira", start_time: "08:20", end_time: "10:10", subject_name: "Direito Individual e Coletivo do Trabalho", room: "Prof. Rafael Carmezim", color: "bg-pink-500" },
  { day_of_week: "Terça-feira", start_time: "10:20", end_time: "12:00", subject_name: "Teoria Geral do Direito Tributário", room: "Profª. Ana Cristina", color: "bg-cyan-500" },
  { day_of_week: "Quarta-feira", start_time: "08:20", end_time: "10:10", subject_name: "Prática Jurídica em Direito e Proc. Civil", room: "Prof. Wilian Roque", color: "bg-indigo-500" },
  { day_of_week: "Quarta-feira", start_time: "10:20", end_time: "12:00", subject_name: "Teoria Geral do Direito Tributário", room: "Profª. Ana Cristina", color: "bg-cyan-500" },
  { day_of_week: "Quinta-feira", start_time: "08:20", end_time: "10:10", subject_name: "Agentes Públicos e Resp. Administrativa", room: "Profª. Paola Nery", color: "bg-orange-500" },
  { day_of_week: "Quinta-feira", start_time: "10:20", end_time: "12:00", subject_name: "Procedimentos nos Tribunais", room: "Profª. Carolina Belomo", color: "bg-violet-500" },
  { day_of_week: "Sexta-feira", start_time: "08:20", end_time: "10:10", subject_name: "Direito Individual e Coletivo do Trabalho", room: "Prof. Rafael Carmezim", color: "bg-pink-500" },
  { day_of_week: "Sexta-feira", start_time: "10:20", end_time: "12:00", subject_name: "Desenv. Socioem. e de Carreira", room: "Prof. Eugenio Pereira", color: "bg-green-500" },
  { day_of_week: "Sábado", start_time: "08:20", end_time: "10:10", subject_name: "Prática Jurídica em Direito e Proc. Civil", room: "Prof. Wilian Roque", color: "bg-indigo-500" },
];

const SchedulePage = () => {
  const { isAdmin, isProfessor, user } = useAuth();
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState("Segunda-feira");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const canManage = isAdmin || isProfessor;

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
    
    if (!error && data && data.length > 0) {
      setSchedule(data);
    } else {
      setSchedule(INITIAL_SCHEDULE);
    }
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
        day_of_week: selectedDay,
        start_time: '',
        end_time: '',
        subject_name: '',
        room: '',
        color: 'bg-blue-500'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.subject_name || !formData.start_time || !formData.end_time) {
      showError("Preencha os campos obrigatórios");
      return;
    }

    const saveFn = async () => {
      const payload = {
        ...formData,
        user_id: user?.id,
        start_time: formData.start_time.length === 5 ? `${formData.start_time}:00` : formData.start_time,
        end_time: formData.end_time.length === 5 ? `${formData.end_time}:00` : formData.end_time
      };

      const { error } = editingItem
        ? await supabase.from('schedule').update(payload).eq('id', editingItem.id)
        : await supabase.from('schedule').insert([payload]);
      
      if (error) throw error;
      await fetchSchedule();
    };

    toast.promise(saveFn(), {
      loading: 'Salvando na grade...',
      success: () => {
        setIsDialogOpen(false);
        return "Horário atualizado!";
      },
      error: 'Erro ao salvar'
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover este horário da grade?")) return;
    
    const deleteFn = async () => {
      const { error } = await supabase.from('schedule').delete().eq('id', id);
      if (error) throw error;
      await fetchSchedule();
    };

    toast.promise(deleteFn(), {
      loading: 'Removendo...',
      success: 'Horário removido!',
      error: 'Erro ao excluir'
    });
  };

  const filteredSchedule = schedule.filter(item => item.day_of_week === selectedDay);

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-32">
      <div className="p-6 pb-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-study-primary/10 p-3 rounded-2xl">
              <CalendarDays className="text-study-primary" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-study-dark dark:text-white">Grade</h1>
              <p className="text-study-medium text-sm font-medium">Horário Semanal</p>
            </div>
          </div>
          
          {canManage && (
            <Button 
              onClick={() => handleOpenDialog()}
              className="rounded-full w-12 h-12 bg-study-primary hover:bg-study-dark p-0 shadow-lg"
            >
              <Plus size={24} className="text-white" />
            </Button>
          )}
        </div>

        <ScrollArea className="w-full whitespace-nowrap mb-6">
          <div className="flex gap-3 pb-2">
            {DAYS.map((day) => (
              <button
                key={day.id}
                onClick={() => setSelectedDay(day.id)}
                className={cn(
                  "px-6 py-3 rounded-2xl font-black text-xs transition-all border-2",
                  selectedDay === day.id 
                    ? "bg-study-primary border-study-primary text-zinc-900 shadow-lg scale-105" 
                    : "bg-zinc-900/50 border-zinc-800 text-study-medium hover:border-study-primary/30"
                )}
              >
                {day.label}
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="hidden" />
        </ScrollArea>
      </div>

      <div className="px-6 flex-1">
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-study-primary" size={40} /></div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {filteredSchedule.length === 0 ? (
              <div className="text-center py-20 opacity-30 flex flex-col items-center gap-4">
                <div className="bg-zinc-800 p-6 rounded-full"><CalendarDays size={48} /></div>
                <p className="text-xs font-black uppercase tracking-widest">Nenhuma aula hoje</p>
              </div>
            ) : (
              filteredSchedule.map((item, idx) => (
                <Card key={idx} className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden group">
                  <CardContent className="p-0 flex min-h-[100px]">
                    <div className={cn("w-3 shrink-0", item.color || "bg-study-primary")} />
                    <div className="flex-1 p-5 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-black text-study-dark dark:text-zinc-100 text-base leading-tight">
                          {item.subject_name}
                        </h3>
                        {canManage && (
                          <div className="flex gap-1">
                            <button onClick={() => handleOpenDialog(item)} className="p-1.5 text-study-medium hover:text-study-primary transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(item.id)} className="p-1.5 text-study-medium hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-study-medium uppercase tracking-tighter">
                          <Clock size={14} className="text-study-primary" /> 
                          {item.start_time.substring(0,5)} — {item.end_time.substring(0,5)}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-study-medium uppercase tracking-tighter">
                          <MapPin size={14} className="text-study-primary" /> 
                          {item.room || "Local a definir"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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
                <SelectContent>{DAYS.map(d => <SelectItem key={d.id} value={d.id}>{d.id}</SelectItem>)}</SelectContent>
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
            <div className="space-y-2">
              <Label>Professor / Sala</Label>
              <Input value={formData.room} onChange={e => setFormData({...formData, room: e.target.value})} placeholder="Ex: Prof. Wilian" className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} className="w-full bg-study-primary hover:bg-study-dark text-zinc-900 rounded-xl py-6 font-bold flex gap-2">
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