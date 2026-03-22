"use client";

import React, { useEffect, useState } from 'react';
import { 
  Scale, FileText, Gavel, ClipboardList, Book, Briefcase, 
  Plus, Trash2, Pencil, Save, Loader2, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const ICON_MAP: Record<string, any> = {
  Scale, FileText, Gavel, ClipboardList, Book, Briefcase
};

const CACHE_KEY = 'cached_subjects';

const SubjectGrid = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', icon_name: 'Book' });

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      setSubjects(JSON.parse(cached));
      setLoading(false);
    }
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      
      if (data) {
        setSubjects(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
    } catch (error) {
      console.error("Erro ao buscar matérias:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (subject: any = null) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({ name: subject.name, icon_name: subject.icon_name });
    } else {
      setEditingSubject(null);
      setFormData({ name: '', icon_name: 'Book' });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) return toast.error("Nome é obrigatório");
    
    setLoading(true);
    try {
      if (editingSubject) {
        const { error } = await supabase.from('subjects').update(formData).eq('id', editingSubject.id);
        if (error) throw error;
        toast.success("Matéria atualizada!");
      } else {
        const { error } = await supabase.from('subjects').insert([formData]);
        if (error) throw error;
        toast.success("Matéria adicionada!");
      }
      
      localStorage.removeItem(CACHE_KEY);
      await fetchSubjects();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir esta matéria e todos os dados associados?")) return;

    try {
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
      
      toast.success("Matéria removida");
      
      localStorage.removeItem(CACHE_KEY);
      await fetchSubjects();
    } catch (error) {
      toast.error("Erro ao remover");
    }
  };

  if (loading && subjects.length === 0) return (
    <div className="flex justify-center py-20"><Loader2 className="animate-spin text-study-primary" /></div>
  );

  return (
    <div className="px-4 mt-8 pb-32">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-study-primary/10 p-2 rounded-lg">
            <Book className="text-study-primary" size={20} />
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-study-dark dark:text-white">Matérias</h3>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={fetchSubjects} variant="ghost" size="icon" className="rounded-full text-study-medium">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </Button>
          {isAdmin && (
            <Button 
              onClick={() => handleOpenDialog()}
              size="sm"
              className="rounded-full bg-study-primary hover:bg-study-dark text-white gap-2 h-9 text-xs"
            >
              <Plus size={14} /> Nova
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {subjects.map((subject) => {
          const IconComponent = ICON_MAP[subject.icon_name] || Book;
          return (
            <div key={subject.id} className="relative group">
              <button
                onClick={() => navigate(`/study/${subject.id}`)}
                className="w-full aspect-square sm:aspect-auto sm:min-h-[160px] rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 flex flex-col items-center justify-center text-center gap-2 sm:gap-3 shadow-study transition-all hover:-translate-y-1 active:scale-95 overflow-hidden border-b-4 border-black/10 bg-study-primary/90 dark:bg-study-primary/80"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="relative">
                  <IconComponent size={32} className="sm:size-[44px] text-white dark:text-zinc-900 drop-shadow-md" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col items-center w-full">
                  <span className="text-white dark:text-zinc-900 font-bold text-[11px] sm:text-sm leading-tight drop-shadow-sm truncate w-full px-1">
                    {subject.name}
                  </span>
                  <div className="w-6 sm:w-8 h-0.5 bg-white/40 dark:bg-black/20 rounded-full mt-1.5 sm:mt-2" />
                </div>
              </button>

              {isAdmin && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleOpenDialog(subject); }}
                    className="p-1.5 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-sm"
                  >
                    <Pencil size={12} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(subject.id, e)}
                    className="p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-[2rem] max-w-[90vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSubject ? "Editar Matéria" : "Nova Matéria"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-study-medium">Nome da Matéria</label>
              <Input 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Ex: Direito Processual"
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-study-medium">Ícone</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(ICON_MAP).map(iconKey => {
                  const Icon = ICON_MAP[iconKey];
                  return (
                    <button
                      key={iconKey}
                      onClick={() => setFormData({...formData, icon_name: iconKey})}
                      className={`p-3 rounded-xl border-2 flex items-center justify-center transition-all ${
                        formData.icon_name === iconKey 
                          ? 'border-study-primary bg-study-primary/10 text-study-primary' 
                          : 'border-study-light text-study-medium hover:bg-study-light/20'
                      }`}
                    >
                      <Icon size={20} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSave} className="w-full bg-study-primary hover:bg-study-dark text-white rounded-xl py-6 font-bold gap-2">
              <Save size={18} /> Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubjectGrid;