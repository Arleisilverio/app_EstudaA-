"use client";

import React, { useState } from 'react';
import { Plus, Trash2, Image as ImageIcon, Save, Loader2, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from "sonner";

interface Announcement {
  id?: string;
  title: string;
  subtitle: string;
  image_url: string;
  button_text: string;
  button_link: string;
}

const AnnouncementManager = ({ isOpen, onClose, onRefresh }: { isOpen: boolean, onClose: () => void, onRefresh: () => void }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Announcement>({
    title: '',
    subtitle: '',
    image_url: '',
    button_text: 'Acesse Agora',
    button_link: '#'
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const fileName = `${Date.now()}-${file.name}`;
    
    try {
      const { error: uploadError } = await supabase.storage
        .from('announcements')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('announcements')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image_url: publicUrl });
      toast.success("Imagem carregada!");
    } catch (error) {
      toast.error("Erro no upload da imagem");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.image_url) {
      toast.error("Título e imagem são obrigatórios");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('announcements')
        .insert([formData]);

      if (error) throw error;
      
      toast.success("Aviso publicado no mural!");
      onRefresh();
      onClose();
      setFormData({ title: '', subtitle: '', image_url: '', button_text: 'Acesse Agora', button_link: '#' });
    } catch (error) {
      toast.error("Erro ao publicar aviso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-3xl max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Aviso no Mural</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Título do Aviso</Label>
            <Input 
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="Ex: Nova Prova Disponível!"
              className="rounded-xl"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Subtítulo / Descrição</Label>
            <Input 
              value={formData.subtitle} 
              onChange={e => setFormData({...formData, subtitle: e.target.value})}
              placeholder="Ex: Confira o cronograma de Direito Penal"
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Texto do Botão</Label>
              <Input 
                value={formData.button_text} 
                onChange={e => setFormData({...formData, button_text: e.target.value})}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Link do Botão</Label>
              <Input 
                value={formData.button_link} 
                onChange={e => setFormData({...formData, button_link: e.target.value})}
                placeholder="/exams"
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Imagem de Fundo</Label>
            <div className="flex gap-2">
              <Label className="flex-1 cursor-pointer border-2 border-dashed border-study-light rounded-xl p-4 flex items-center justify-center gap-2 hover:bg-study-light/10 transition-colors">
                {loading ? <Loader2 className="animate-spin" /> : <ImageIcon size={20} />}
                <span className="text-sm font-medium">{formData.image_url ? "Trocar Imagem" : "Selecionar Imagem"}</span>
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={loading} />
              </Label>
              {formData.image_url && (
                <div className="w-14 h-14 rounded-xl overflow-hidden border">
                  <img src={formData.image_url} className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading} className="w-full bg-study-primary hover:bg-study-dark text-white rounded-xl py-6 font-bold flex gap-2">
            {loading ? <Loader2 className="animate-spin" /> : <Plus size={18} />} Adicionar ao Mural
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AnnouncementManager;