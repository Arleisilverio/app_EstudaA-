"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, RefreshCcw, Award, ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { toast } from 'sonner';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizProps {
  questions: Question[];
  onClose: () => void;
  subjectId: string;
}

const QuizComponent = ({ questions, onClose, subjectId }: QuizProps) => {
  const { user } = useAuth();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelect = (qId: number, oIdx: number) => {
    if (showResults) return;
    setAnswers({ ...answers, [qId]: oIdx });
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correctIndex) correct++;
    });
    return correct;
  };

  const handleFinish = async () => {
    setSaving(true);
    const score = calculateScore();

    try {
      // Buscar nome da matéria para o histórico
      const { data: subject } = await supabase.from('subjects').select('name').eq('id', subjectId).single();

      const { error } = await supabase.from('quiz_history').insert([{
        user_id: user?.id,
        subject_id: subjectId,
        subject_name: subject?.name || "Matéria Desconhecida",
        score: score,
        total_questions: questions.length
      }]);

      if (error) throw error;
      setShowResults(true);
    } catch (err) {
      toast.error("Erro ao salvar resultado no histórico.");
      setShowResults(true); // Mostra o resultado mesmo se falhar o salvamento
    } finally {
      setSaving(false);
    }
  };

  const isAllAnswered = questions.every(q => answers[q.id] !== undefined);

  if (showResults) {
    const score = calculateScore();

    return (
      <Card className="border-none shadow-2xl bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-500">
        <CardHeader className="bg-study-primary text-white p-10 text-center">
          <Award className="mx-auto mb-4" size={64} />
          <CardTitle className="text-3xl font-black">Resultado</CardTitle>
          <p className="opacity-90 font-medium mt-2">Você acertou {score} de {questions.length}</p>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="flex justify-around items-center bg-study-light/20 dark:bg-zinc-800/50 p-6 rounded-3xl">
            <div className="text-center">
              <p className="text-4xl font-black text-green-500">{score}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-study-medium">Acertos</p>
            </div>
            <div className="w-px h-12 bg-study-light/30" />
            <div className="text-center">
              <p className="text-4xl font-black text-red-500">{questions.length - score}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-study-medium">Erros</p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-bold text-study-dark dark:text-white flex items-center gap-2">
              <HelpCircle size={20} className="text-study-primary" />
              Revisão
            </h3>
            {questions.map((q, idx) => {
              const isCorrect = answers[q.id] === q.correctIndex;
              return (
                <div key={q.id} className={cn(
                  "p-5 rounded-2xl border-2",
                  isCorrect ? "border-green-100 bg-green-50/30 dark:border-green-900/20" : "border-red-100 bg-red-50/30 dark:border-red-900/20"
                )}>
                  <div className="flex gap-3 mb-2">
                    <p className="font-bold text-sm text-study-dark dark:text-zinc-200">{idx + 1}. {q.question}</p>
                  </div>
                  {!isCorrect && (
                    <div className="space-y-1 mb-2">
                      <p className="text-xs text-red-600 font-medium">Sua resposta: {q.options[answers[q.id]]}</p>
                      <p className="text-xs text-green-600 font-bold">Correta: {q.options[q.correctIndex]}</p>
                    </div>
                  )}
                  <p className="text-[11px] text-study-medium italic"><strong>Ex:</strong> {q.explanation}</p>
                </div>
              );
            })}
          </div>

          <Button onClick={onClose} className="w-full bg-study-primary rounded-2xl py-8 font-black">
            Finalizar e Limpar Chat
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-2xl bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden">
      <CardHeader className="bg-study-light/20 p-8">
        <div className="flex items-center justify-between mb-4">
          <Badge className="bg-study-primary text-white">Simulado Ativo</Badge>
          <p className="text-xs font-bold text-study-medium">{Object.keys(answers).length} de {questions.length}</p>
        </div>
        <Progress value={(Object.keys(answers).length / questions.length) * 100} className="h-2" />
      </CardHeader>
      
      <CardContent className="p-8 space-y-10">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-4">
            <h3 className="text-lg font-bold text-study-dark dark:text-zinc-100">{idx + 1}. {q.question}</h3>
            <RadioGroup onValueChange={(val) => handleSelect(q.id, parseInt(val))} className="grid gap-3">
              {q.options.map((option, oIdx) => (
                <div key={oIdx} className={cn(
                  "flex items-center space-x-3 p-4 rounded-2xl border-2",
                  answers[q.id] === oIdx ? "border-study-primary bg-study-primary/5" : "border-study-light/50"
                )}>
                  <RadioGroupItem value={oIdx.toString()} id={`q${q.id}-o${oIdx}`} />
                  <Label htmlFor={`q${q.id}-o${oIdx}`} className="flex-1 cursor-pointer">{option}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}

        <Button 
          disabled={!isAllAnswered || saving}
          onClick={handleFinish}
          className="w-full bg-study-primary rounded-2xl py-8 font-black"
        >
          {saving ? "Salvando..." : "Corrigir e Salvar"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuizComponent;