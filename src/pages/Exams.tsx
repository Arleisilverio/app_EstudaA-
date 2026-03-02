"use client";

import React, { useState, useEffect } from 'react';
import { ClipboardCheck, Calendar, Clock, Plus, Pencil, Trash2, Loader2, Save } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

const ExamsPage = () => {
  const { isAdmin, user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [formData, setFormData] = useState({
    subject: '',
    date: '',
    time: '',
    content: '',
    observations: '',
    status: 'Agendada'
  });

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .order('date', { ascending: true });
      
      if (error) throw error;
      setExams(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (exam: any = null) => {
    if (exam) {
      setEditingExam(exam);
      setFormData({
        subject: exam.subject,
        date: exam.date,
        time: exam.time,
        content: exam.content || '',
        observations: exam.observations || '',
        status: exam.status || 'Agendada'
      });
    } else {
      setEditingExam(null);
      setFormData({
        subject: '',
        date: '',
        time: '',
        content: '',
        observations: '',
        status: 'Agendada'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.subject || !formData.date || !formData.time) {
      showError("Preencha os campos obrigatórios");
      return;
    }

    try {
      if (editingExam) {
        const { error } = await supabase
          .from('exams')
          .update(formData)
          .eq('id', editingExam.id);
        if (error) throw error;
        showSuccess("Prova atualizada!");
      } else {
        const { error } = await supabase
          .from('exams')
          .insert([{ ...formData, user_id: user?.id }]);
        if (error) throw error;
        showSuccess("Prova adicionada!");
      }
      setIsDialogOpen(false);
      fetchExams();
    } catch (err) {
      showError("Erro ao salvar dados");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta prova?")) return;
    try {
      const { error } = await supabase.from('exams').delete().eq('id', id);
      if (error) throw error;
      showSuccess("Prova excluída!");
      fetchExams();
    } catch (err) {
      showError("Erro ao excluir");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-32">
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
        ) : exams.length === 0 ? (
          <div className="text-center py-20 text-study-medium">Nenhuma prova agendada.</div>
        ) : (
          <div className="space-y-4">
            {exams.map((exam) => (
              <Card key={exam.id} className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden">
                <CardContent className="p-0">
                  <div className="bg-study-light/20 dark:bg-zinc-800/50 px-6 py-4 flex justify-between items-center border-b border-study-light/30 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-study-primary" />
                      <span className="text-sm font-bold text-study-dark dark:text-zinc-200">{exam.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-study-primary/10 text-study-primary hover:bg-study-primary/20 border-none rounded-full px-3">
                        {exam.status}
                      </Badge>
                      {isAdmin && (
                        <div className="flex gap-1">
                          <button onClick={() => handleOpenDialog(exam)} className="p-1.5 text-study-medium hover:text-study-primary"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(exam.id)} className="p-1.5 text-study-medium hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-study-dark dark:text-zinc-100 mb-1">{exam.subject}</h3>
                      <div className="flex items-center gap-2 text-study-medium text-xs font-medium">
                        <Clock size={14} /> {exam.time}
                      </div>
                    </div>

                    <div className="bg-study-light/10 dark:bg-zinc-800/30 rounded-2xl p-4 border border-study-light/20 dark:border-zinc-800">
                      <p className="text-sm text-study-dark dark:text-zinc-300 leading-relaxed">
                        {exam.content}
                      </p>
                      {exam.observations && (
                        <p className="text-xs text-study-medium mt-2 italic">Obs: {exam.observations}</p>
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
        <DialogContent className="rounded-3xl max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingExam ? "Editar Prova" : "Nova Prova"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Matéria *</Label>
              <Input value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} placeholder="Ex: Direito Penal" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Horário *</Label>
                <Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Conteúdo</Label>
              <Textarea value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} placeholder="O que vai cair na prova?" className="rounded-xl min-h-[100px]" />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input value={formData.observations} onChange={e => setFormData({...formData, observations: e.target.value})} placeholder="Ex: Levar Vade Mecum" className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} className="w-full bg-study-primary hover:bg-study-dark text-white rounded-xl py-6 font-bold flex gap-2">
              <Save size={18} /> Salvar Prova
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default ExamsPage;