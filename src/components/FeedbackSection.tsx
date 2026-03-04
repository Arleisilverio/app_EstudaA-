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
  profiles: {
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

  useEffect(() => {
    fetchFeedbacks();

    // ESCUTA EM TEMPO REAL: Qualquer novo feedback ou exclusão atualiza a lista de todos
    const channel = supabase
      .channel('public:app_feedback')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_feedback' },
        () => {
          fetchFeedbacks(); // Recarrega a lista completa para garantir os nomes dos perfis (joins)
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFeedbacks = async () => {
    const { data, error } = await supabase
      .from('app_feedback')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false });

    if (!error) setFeedbacks(data as any || []);
    setLoading(false);
  };

  const handleSendFeedback = async () => {
    if (rating === 0) return toast.error("Selecione uma nota de 1 a 5 estrelas.");
    if (!comment.trim()) return toast.error("Escreva um breve comentário.");

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

      toast.success("Obrigado pelo seu feedback!");
      setComment("");
      setRating(0);
      // O Realtime cuidará de atualizar a lista automaticamente
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar avaliação.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remover esta avaliação?")) return;
    const { error } = await supabase.from('app_feedback').delete().eq('id', id);
    if (error) toast.error("Erro ao remover.");
    else toast.success("Feedback removido.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 px-1">
        <MessageSquare className="text-study-primary" size={18} />
        <h2 className="text-xs font-bold text-study-medium uppercase tracking-widest">Mural de Feedbacks</h2>
      </div>

      <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
        <CardHeader className="bg-study-light/20 pb-4">
          <CardTitle className="text-sm font-black flex items-center gap-2 text-study-dark">
            Sua opinião sobre o App
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform active:scale-90"
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
            placeholder="O que podemos melhorar no Estuda AÍ?" 
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="rounded-xl border-zinc-800 bg-zinc-800/30 min-h-[100px] text-white"
          />

          <Button 
            onClick={handleSendFeedback} 
            disabled={sending} 
            className="w-full bg-study-primary text-white rounded-xl font-bold py-6 gap-2"
          >
            {sending ? <Loader2 className="animate-spin" /> : <Send size={18} />}
            Enviar Feedback para Todos
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-[2rem] overflow-hidden">
        <CardHeader className="border-b border-zinc-800 bg-zinc-800/20">
          <CardTitle className="text-xs font-black text-study-medium uppercase tracking-widest">
            Comunidade ({feedbacks.length} avaliações)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[450px] w-full p-4">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-study-primary" size={32} /></div>
            ) : feedbacks.length === 0 ? (
              <div className="text-center py-16 opacity-40">
                <MessageSquare className="mx-auto mb-2 text-study-medium" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest text-study-medium">Seja o primeiro a avaliar!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {feedbacks.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-zinc-800/40 border border-zinc-800/50 relative group animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="bg-study-primary/10 p-1.5 rounded-lg">
                          <User size={12} className="text-study-primary" />
                        </div>
                        <span className="text-xs font-black text-study-dark truncate max-w-[150px]">
                          {item.profiles?.name || "Estudante"}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} size={10} className={s <= item.rating ? "fill-study-primary text-study-primary" : "text-zinc-700"} />
                        ))}
                      </div>
                    </div>
                    
                    <p className="text-sm text-zinc-300 leading-relaxed">
                      {item.comment}
                    </p>
                    
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[9px] font-bold text-study-medium uppercase tracking-tighter">
                        {format(new Date(item.created_at), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                      </span>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Remover (Admin)"
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