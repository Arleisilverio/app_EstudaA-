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
  userName?: string;
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
      // 1. Buscamos apenas os feedbacks primeiro (mais garantido)
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('app_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;
      if (!feedbackData) return;

      // 2. Buscamos todos os perfis para associar os nomes manualmente
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name');

      const nameMap: Record<string, string> = {};
      profileData?.forEach(p => {
        if (p.id && p.name) nameMap[p.id] = p.name;
      });

      // 3. Mesclamos os dados
      const merged = feedbackData.map(f => ({
        ...f,
        userName: nameMap[f.user_id] || "Estudante"
      }));

      setFeedbacks(merged);
    } catch (err: any) {
      console.error("Erro no Mural:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
    
    // Inscrição em tempo real simplificada
    const channel = supabase
      .channel('feedback_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_feedback' }, () => {
        fetchFeedbacks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSendFeedback = async () => {
    if (!user?.id) return toast.error("Você precisa estar logado.");
    if (rating === 0) return toast.error("Escolha de 1 a 5 estrelas.");
    if (!comment.trim()) return toast.error("Escreva um comentário.");

    setSending(true);
    try {
      const { error } = await supabase
        .from('app_feedback')
        .insert([{
          user_id: user.id,
          rating,
          comment
        }]);

      if (error) throw error;

      toast.success("Publicado no mural!");
      setComment("");
      setRating(0);
      fetchFeedbacks(); // Força atualização
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta avaliação?")) return;
    const { error } = await supabase.from('app_feedback').delete().eq('id', id);
    if (!error) {
      toast.success("Removido.");
      fetchFeedbacks();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-xs font-bold text-study-medium uppercase tracking-widest flex items-center gap-2">
          <MessageSquare size={14} className="text-study-primary" /> Mural da Comunidade
        </h2>
      </div>

      <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
        <CardContent className="pt-8 space-y-4">
          <div className="flex justify-center gap-2 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)}>
                <Star size={32} className={cn("transition-colors", star <= rating ? "fill-study-primary text-study-primary" : "text-zinc-700")} />
              </button>
            ))}
          </div>
          
          <Textarea 
            placeholder="Conte para a comunidade o que achou..." 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="rounded-xl border-zinc-800 bg-zinc-800/30 min-h-[100px] text-white"
          />

          <Button onClick={handleSendFeedback} disabled={sending} className="w-full bg-study-primary text-white rounded-xl font-bold py-6">
            {sending ? <Loader2 className="animate-spin" /> : "Postar no Mural"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-zinc-800/20 border-b border-zinc-800">
          <CardTitle className="text-[10px] font-black text-study-medium uppercase tracking-widest">Feedbacks Recentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] w-full p-4">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-study-primary" size={32} /></div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-20 opacity-30 text-xs font-bold uppercase">Nenhum feedback ainda</div>
            ) : (
              <div className="flex flex-col gap-4">
                {feedbacks.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-zinc-800/40 border border-zinc-800/50 relative group">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-study-primary/10 p-1.5 rounded-lg"><User size={12} className="text-study-primary" /></div>
                        <span className="text-xs font-black text-study-dark">{item.userName}</span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={10} className={s <= item.rating ? "fill-study-primary text-study-primary" : "text-zinc-700"} />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-zinc-300 leading-relaxed">"{item.comment}"</p>
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[9px] font-bold text-study-medium uppercase">
                      {format(new Date(item.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                      {isAdmin && (
                        <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:bg-red-500/10 p-1 rounded-lg">
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