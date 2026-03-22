"use client";

import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Calendar, Clock, Plus, Pencil, Trash2, Loader2, Save, BookOpen, MessageSquare } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import TimeKeeper from 'react-timekeeper';

const ExamsPage = () => {
  const { isAdmin, isProfessor, user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  
  const canManage = isAdmin || isProfessor;

  const [formData, setFormData] = useState({
    subject: '',
    date: '',
    time: '19:00',
    content: '',
    observations: '',
    status: 'Agendada'
  });

  useEffect(() => {
    fetchExams();

    const channel = supabase
      .channel('exams-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exams' }, () => {
        fetchExams();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchExams = async () => {
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .order('date', { ascending: true });
    
    if (!error) setExams(data || []);
    setLoading(false);
  };

  const handleOpenDialog = (exam: any = null) => {
    if (exam) {
      setEditingExam(exam);
      setFormData({
        subject: exam.subject,
        date: exam.date,
        time: exam.time || '19:00',
        content: exam.content || '',
        observations: exam.observations || '',
        status: exam.status || 'Agendada'
      });
    } else {
      setEditingExam(null);
      setFormData({
        subject: '',
        date: '',
        time: '19:00',
        content: '',
        observations: '',
        status: 'Agendada'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.subject || !formData.date || !formData.time) {
      showError("Preencha os campos obrigatórios");
      return;
    }

    setIsDialogOpen(false);

    const saveFn = async () => {
      const { error } = editingExam 
        ? await supabase.from('exams').update(formData).eq('id', editingExam.id)
        : await supabase.from('exams').insert([{ ...formData, user_id: user?.id }]);
      if (error) throw error;
      
      await fetchExams();
    };

    toast.promise(saveFn(), {
      loading: 'Salvando prova...',
      success: () => {
        return editingExam ? "Prova atualizada!" : "Prova adicionada ao calendário!";
      },
      error: 'Erro ao salvar dados'
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Excluir esta prova? Alunos não poderão mais vê-la.")) return;
    
    const deleteFn = async () => {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
      
      await fetchExams();
    };

    toast.promise(deleteFn(), {
      loading: 'Excluindo...',
      success: () => {
        return "Prova excluída!";
      },
      error: 'Erro ao excluir'
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md md:max-w-5xl lg:max-w-6xl mx-auto relative pb-32">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-study-primary/10 p-3 rounded-2xl">
              <ClipboardCheck className="text-study-primary" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-study-dark dark:text-white">Provas</h1>
              <p className="text-study-medium text-sm font-medium">Cronograma de avaliações</p>
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

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-study-primary" size={40} /></div>
        ) : exams.length === 0 ? (
          <div className="text-center py-20 text-study-medium italic">Nenhuma prova agendada no momento.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {exams.map((exam) => (
              <Card key={exam.id} className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden group h-fit">
                <CardContent className="p-0">
                  <div className="bg-study-light/20 dark:bg-zinc-800/50 px-6 py-4 flex justify-between items-center border-b border-study-light/30 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-study-primary" />
                      <span className="text-sm font-bold text-study-dark dark:text-zinc-200">
                        {format(parseISO(exam.date), 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-study-primary/10 text-study-primary hover:bg-study-primary/20 border-none rounded-full px-3">
                        {exam.status}
                      </Badge>
                      {canManage && (
                        <div className="flex gap-1 ml-2">
                          <button onClick={() => handleOpenDialog(exam)} className="p-1.5 text-study-medium hover:text-study-primary transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(exam.id)} className="p-1.5 text-study-medium hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-study-dark dark:text-zinc-100 mb-1 leading-tight">{exam.subject}</h3>
                      <div className="flex items-center gap-2 text-study-medium text-xs font-medium">
                        <Clock size={14} /> {exam.time ? exam.time.substring(0, 5) : ''}
                      </div>
                    </div>

                    <div className="bg-study-light/10 dark:bg-zinc-800/30 rounded-2xl p-4 border border-study-light/20 dark:border-zinc-800">
                      <p className="text-sm text-study-dark dark:text-zinc-300 leading-relaxed">
                        {exam.content || "Conteúdo não especificado."}
                      </p>
                      {exam.observations && (
                        <p className="text-xs text-study-medium mt-2 italic border-t border-study-light/20 pt-2">Obs: {exam.observations}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2.5rem] max-w-[90vw] sm:max-w-md bg-white dark:bg-zinc-950 border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-study-primary p-6 text-zinc-900">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
                {editingExam ? "Editar Avaliação" : "Agendar Nova Prova"}
              </DialogTitle>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Preencha os detalhes para os alunos</p>
            </DialogHeader>
          </div>

          <div className="p-6 space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase ml-1 text-study-medium flex items-center gap-1.5">
                <BookOpen size={12} className="text-study-primary" /> Matéria / Disciplina *
              </Label>
              <div className="relative">
                <Input 
                  value={formData.subject} 
                  onChange={e => setFormData({...formData, subject: e.target.value})} 
                  placeholder="Ex: Direito Civil IV" 
                  className="rounded-2xl h-12 bg-zinc-900/50 border-zinc-800 text-white pl-4 focus-visible:ring-study-primary" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase ml-1 text-study-medium flex items-center gap-1.5">
                  <Calendar size={12} className="text-study-primary" /> Data *
                </Label>
                <Input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  className="rounded-2xl h-12 bg-zinc-900/50 border-zinc-800 text-white focus-visible:ring-study-primary" 
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase ml-1 text-study-medium flex items-center gap-1.5">
                  <Clock size={12} className="text-study-primary" /> Horário *
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-12 rounded-2xl bg-zinc-900/50 border-zinc-800 text-white justify-start font-normal px-4">
                      {formData.time || "Escolha a hora"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 border-none bg-transparent shadow-2xl" align="start">
                    <TimeKeeper 
                      time={formData.time} 
                      onChange={(newTime) => setFormData({...formData, time: newTime.formatted24})}
                      switchToMinuteOnHourSelect
                      closeOnMinuteSelect
                      coarseMinutes={5}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase ml-1 text-study-medium flex items-center gap-1.5">
                <MessageSquare size={12} className="text-study-primary" /> Conteúdo Cobrado
              </Label>
              <Textarea 
                value={formData.content} 
                onChange={e => setFormData({...formData, content: e.target.value})} 
                placeholder="Tópicos da prova..." 
                className="rounded-2xl min-h-[100px] bg-zinc-900/50 border-zinc-800 text-white focus-visible:ring-study-primary" 
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase ml-1 text-study-medium flex items-center gap-1.5">
                <Plus size={12} className="text-study-primary" /> Observações
              </Label>
              <Input 
                value={formData.observations} 
                onChange={e => setFormData({...formData, observations: e.target.value})} 
                placeholder="Ex: Permitido consulta ao Vade Mecum" 
                className="rounded-2xl h-12 bg-zinc-900/50 border-zinc-800 text-white focus-visible:ring-study-primary" 
              />
            </div>
          </div>

          <div className="p-6 bg-zinc-900/50 border-t border-zinc-800">
            <Button 
              onClick={handleSubmit} 
              className="w-full bg-study-primary hover:bg-study-dark text-zinc-900 rounded-2xl py-7 font-black text-sm uppercase tracking-widest shadow-xl flex gap-2 transition-all active:scale-95"
            >
              <Save size={18} /> Publicar no Calendário
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default ExamsPage;