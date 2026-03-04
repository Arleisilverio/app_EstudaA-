"use client";

import React, { useState, useEffect } from 'react';
import { 
  Ticket, Calendar, MapPin, Plus, Pencil, Trash2, 
  Loader2, Save, Image as ImageIcon, FileText, 
  ExternalLink, X, Upload
} from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORIES = ["Acadêmico", "Workshop", "Palestra", "Social", "Geral"];

const EventsPage = () => {
  const { isAdmin, user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'Geral',
    image_url: '',
    document_url: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true });
    
    if (!error) setEvents(data || []);
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'doc') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `event-${Date.now()}.${fileExt}`;
    const filePath = `events/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('announcements') // Reutilizando o bucket de arquivos
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('announcements')
        .getPublicUrl(filePath);

      if (type === 'image') setFormData({ ...formData, image_url: publicUrl });
      else setFormData({ ...formData, document_url: publicUrl });
      
      toast.success(`${type === 'image' ? 'Imagem' : 'Documento'} carregado!`);
    } catch (error) {
      toast.error("Erro no upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenDialog = (event: any = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        date: event.date,
        time: event.time || '',
        location: event.location || '',
        category: event.category || 'Geral',
        image_url: event.image_url || '',
        document_url: event.document_url || ''
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        date: '',
        time: '',
        location: '',
        category: 'Geral',
        image_url: '',
        document_url: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.date) {
      toast.error("Título e data são obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData, user_id: user?.id };
      const { error } = editingEvent 
        ? await supabase.from('events').update(payload).eq('id', editingEvent.id)
        : await supabase.from('events').insert([payload]);

      if (error) throw error;
      
      toast.success(editingEvent ? "Evento atualizado!" : "Evento publicado!");
      fetchEvents();
      setIsDialogOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir este evento permanentemente?")) return;
    
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      toast.success("Evento removido");
      fetchEvents();
    } catch (error) {
      toast.error("Erro ao excluir");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-32">
      <div className="p-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="bg-study-primary/10 p-3 rounded-2xl">
              <Ticket className="text-study-primary" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-study-dark dark:text-white">Eventos</h1>
              <p className="text-study-medium text-sm font-medium">Mural de avisos e murais</p>
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

        {loading && events.length === 0 ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-study-primary" size={40} /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-20 text-study-medium bg-study-light/10 rounded-[2rem] border-2 border-dashed border-study-light/30">
            Nenhum evento no mural por enquanto.
          </div>
        ) : (
          <div className="space-y-6">
            {events.map((event) => (
              <Card key={event.id} className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden group">
                {event.image_url && (
                  <div className="aspect-[21/9] relative overflow-hidden">
                    <img src={event.image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <Badge className="absolute top-4 left-4 bg-white/90 text-study-primary hover:bg-white rounded-full border-none shadow-sm font-bold">
                      {event.category}
                    </Badge>
                  </div>
                )}
                
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-black text-study-dark dark:text-white leading-tight flex-1">{event.title}</h3>
                    {isAdmin && (
                      <div className="flex gap-1 ml-2">
                        <button onClick={() => handleOpenDialog(event)} className="p-1.5 text-study-medium hover:text-study-primary"><Pencil size={16} /></button>
                        <button onClick={(e) => handleDelete(event.id, e)} className="p-1.5 text-study-medium hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    )}
                  </div>
                  
                  {event.description && <p className="text-xs text-study-medium dark:text-zinc-400 font-medium mb-4 line-clamp-3">{event.description}</p>}

                  <div className="grid grid-cols-2 gap-3 mb-6 bg-study-light/20 dark:bg-zinc-800/50 p-3 rounded-2xl">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-study-dark dark:text-zinc-200 uppercase truncate">
                      <Calendar size={14} className="text-study-primary shrink-0" /> {format(parseISO(event.date), "dd 'de' MMM", { locale: ptBR })}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-study-dark dark:text-zinc-200 uppercase truncate">
                      <MapPin size={14} className="text-study-primary shrink-0" /> {event.location || "Local a definir"}
                    </div>
                  </div>

                  {event.document_url && (
                    <Button asChild variant="outline" className="w-full rounded-xl border-study-primary/30 text-study-primary gap-2 h-12 font-bold hover:bg-study-primary/5">
                      <a href={event.document_url} target="_blank" rel="noopener noreferrer">
                        <FileText size={18} /> Ver Documento Anexo
                      </a>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-3xl max-w-[90vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEvent ? "Editar Evento" : "Novo Evento"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título do Evento *</Label>
              <Input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="Ex: Palestra Magna" className="rounded-xl" />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Detalhes do evento..." className="rounded-xl" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Horário</Label>
                <Input type="time" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="rounded-xl" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Local</Label>
                <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="Auditório, Sala..." className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <select 
                  className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <Label>Mídia e Anexos</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative group">
                  <Label className="flex flex-col items-center justify-center border-2 border-dashed border-study-light rounded-xl p-3 cursor-pointer hover:bg-study-light/10 transition-colors h-24 text-center">
                    {isUploading ? <Loader2 className="animate-spin text-study-primary" /> : <ImageIcon className="text-study-primary mb-1" size={20} />}
                    <span className="text-[10px] font-bold uppercase">{formData.image_url ? "Trocar Cartaz" : "Subir Cartaz"}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, 'image')} disabled={isUploading} />
                  </Label>
                  {formData.image_url && <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5"><Save size={10} className="text-white" /></div>}
                </div>

                <div className="relative group">
                  <Label className="flex flex-col items-center justify-center border-2 border-dashed border-study-light rounded-xl p-3 cursor-pointer hover:bg-study-light/10 transition-colors h-24 text-center">
                    {isUploading ? <Loader2 className="animate-spin text-study-primary" /> : <FileText className="text-study-primary mb-1" size={20} />}
                    <span className="text-[10px] font-bold uppercase">{formData.document_url ? "Trocar Doc" : "Anexar Doc"}</span>
                    <input type="file" className="hidden" accept=".pdf,.doc,.docx,.txt" onChange={(e) => handleFileUpload(e, 'doc')} disabled={isUploading} />
                  </Label>
                  {formData.document_url && <div className="absolute top-1 right-1 bg-green-500 rounded-full p-0.5"><Save size={10} className="text-white" /></div>}
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={loading || isUploading} className="w-full bg-study-primary hover:bg-study-dark text-white rounded-xl py-6 font-bold flex gap-2">
              <Save size={18} /> Publicar Evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default EventsPage;