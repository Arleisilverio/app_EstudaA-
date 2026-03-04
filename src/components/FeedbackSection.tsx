"use client";

import React, { useState, useEffect } from 'react';
import { Star, MessageSquare, Trash2, Loader2, Send, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Feedback {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_id: string;
  profiles?: {
    name: string;
  } | null;
}

const FeedbackSection = () => {
  const { user, isAdmin } = useAuth();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const fetchFeedbacks = async () => {
    try {
      // Buscamos os feedbacks e tentamos trazer o nome do perfil associado
      const { data, error } = await supabase
        .from('app_feedback')
        .select(`
          id, 
          rating, 
          comment, 
          created_at, 
          user_id,
          profiles (name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Erro ao buscar feedbacks:", error);
        return;
      }

      setFeedbacks(data as any || []);
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();

    // Inscrição em tempo real para atualizações automáticas
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_feedback' },
        () => {
          fetchFeedbacks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSendFeedback = async () => {
    if (rating === 0) return toast.error("Por favor, selecione as estrelas.");
    if (!comment.trim()) return toast.error("Escreva um comentário.");

    setSending(true);
    try {
      const { error } = await supabase
        .from('app_feedback')
        .insert([{
          user_id: user?.id,
          rating,
          comment
        }]);

      if (error) throw error;

      toast.success("Feedback enviado com sucesso!");
      setComment("");
      setRating(0);
      
      // Forçamos a atualização imediata da lista
      fetchFeedbacks();
    } catch (err: any) {
      toast.error("Erro ao salvar feedback.");
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta avaliação?")) return;
    try {
      const { error } = await supabase.from('app_feedback').delete().eq('id', id);
      if (error) throw error;
      toast.success("Removido com sucesso.");
      fetchFeedbacks();
    } catch (err) {
      toast.error("Erro ao remover.");
    }
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-study-primary" size={18} />
          <h2 className="text-xs font-bold text-study-medium uppercase tracking-widest">Mural da Comunidade</h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={fetchFeedbacks}
          className="h-7 text-[10px] font-bold text-study-primary hover:bg-study-primary/10"
        >
          {loading ? <Loader2 className="animate-spin size-3" /> : "Atualizar Mural"}
        </Button>
      </div>

      {/* Formulário de Envio */}
      <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-study-light/20 pb-4">
          <CardTitle className="text-sm font-black text-study-dark">Sua avaliação</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-all hover:scale-110 active:scale-90"
              >
                <Star 
                  size={32} 
                  className={cn(
                    "transition-colors",
                    star <= rating ? "fill-study-primary text-study-primary" : "text-zinc-700"
                  )} 
                />
              </button>
            ))}
          </div>
          
          <Textarea 
            placeholder="O que você está achando do app?" 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="rounded-xl border-zinc-800 bg-zinc-800/30 min-h-[80px] text-white focus:border-study-primary"
          />

          <Button 
            onClick={handleSendFeedback} 
            disabled={sending} 
            className="w-full bg-study-primary hover:bg-study-primary/90 text-white rounded-xl font-bold py-6 gap-2"
          >
            {sending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
            Publicar no Mural
          </Button>
        </CardContent>
      </Card>

      {/* Lista de Avaliações */}
      <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
        <CardHeader className="border-b border-zinc-800/50 bg-zinc-800/10">
          <CardTitle className="text-[10px] font-black text-study-medium uppercase tracking-widest">
            Feedbacks Recentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] w-full p-4">
            {loading && feedbacks.length === 0 ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-study-primary" size={32} /></div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-20 opacity-30">
                <MessageSquare className="mx-auto mb-2" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest">Seja o primeiro a avaliar</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {feedbacks.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-zinc-800/40 border border-zinc-800/50 relative group transition-all hover:bg-zinc-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-study-primary/10 p-1.5 rounded-lg">
                          <User size={12} className="text-study-primary" />
                        </div>
                        <span className="text-xs font-black text-study-dark truncate max-w-[140px]">
                          {item.profiles?.name || "Estudante"}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={10} className={s <= item.rating ? "fill-study-primary text-study-primary" : "text-zinc-700"} />
                        ))}
                      </div>
                    </div>
                    
                    <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                      {item.comment}
                    </p>
                    
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-study-medium uppercase opacity-60">
                        {format(new Date(item.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                      </span>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedbackSection;