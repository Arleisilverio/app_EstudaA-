"use client";

import React, { useState } from 'react';
import { CheckCircle2, XCircle, RefreshCcw, Award, ChevronRight, HelpCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
}

const QuizComponent = ({ questions, onClose }: QuizProps) => {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);

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

  const isAllAnswered = questions.every(q => answers[q.id] !== undefined);

  if (showResults) {
    const score = calculateScore();
    const percentage = (score / questions.length) * 100;

    return (
      <Card className="border-none shadow-2xl bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-500">
        <CardHeader className="bg-study-primary text-white p-10 text-center">
          <Award className="mx-auto mb-4" size={64} />
          <CardTitle className="text-3xl font-black">Resultado do Simulado</CardTitle>
          <p className="opacity-90 font-medium mt-2">Você acertou {score} de {questions.length} questões</p>
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
              Revisão de Desempenho
            </h3>
            {questions.map((q, idx) => {
              const isCorrect = answers[q.id] === q.correctIndex;
              return (
                <div key={q.id} className={cn(
                  "p-5 rounded-2xl border-2 transition-all",
                  isCorrect ? "border-green-100 bg-green-50/30 dark:border-green-900/20" : "border-red-100 bg-red-50/30 dark:border-red-900/20"
                )}>
                  <div className="flex gap-3 mb-3">
                    {isCorrect ? <CheckCircle2 className="text-green-500 shrink-0" size={20} /> : <XCircle className="text-red-500 shrink-0" size={20} />}
                    <p className="font-bold text-sm text-study-dark dark:text-zinc-200">{idx + 1}. {q.question}</p>
                  </div>
                  {!isCorrect && (
                    <div className="ml-8 space-y-2">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">Sua resposta: {q.options[answers[q.id]]}</p>
                      <p className="text-xs text-green-600 dark:text-green-400 font-bold">Resposta correta: {q.options[q.correctIndex]}</p>
                    </div>
                  )}
                  <p className="ml-8 mt-3 text-[11px] text-study-medium dark:text-zinc-400 italic leading-relaxed">
                    <strong>Explicação:</strong> {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          <Button 
            onClick={onClose}
            className="w-full bg-study-primary hover:bg-study-dark text-white rounded-2xl py-8 font-black text-lg shadow-lg flex gap-2"
          >
            <RefreshCcw size={20} /> Finalizar e Voltar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-2xl bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-10 duration-700">
      <CardHeader className="bg-study-light/20 dark:bg-zinc-800/50 p-8 border-b border-study-light/30">
        <div className="flex items-center justify-between mb-4">
          <Badge className="bg-study-primary text-white rounded-full px-4 py-1">Simulado Ativo</Badge>
          <p className="text-xs font-bold text-study-medium uppercase tracking-widest">
            {Object.keys(answers).length} de {questions.length} respondidas
          </p>
        </div>
        <Progress value={(Object.keys(answers).length / questions.length) * 100} className="h-2 bg-study-light/50" />
      </CardHeader>
      
      <CardContent className="p-8 space-y-10">
        {questions.map((q, idx) => (
          <div key={q.id} className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-study-primary text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                {idx + 1}
              </div>
              <h3 className="text-lg font-bold text-study-dark dark:text-zinc-100 leading-tight pt-1">
                {q.question}
              </h3>
            </div>

            <RadioGroup 
              value={answers[q.id]?.toString()} 
              onValueChange={(val) => handleSelect(q.id, parseInt(val))}
              className="ml-12 grid gap-3"
            >
              {q.options.map((option, oIdx) => (
                <div 
                  key={oIdx}
                  onClick={() => handleSelect(q.id, oIdx)}
                  className={cn(
                    "flex items-center space-x-3 p-4 rounded-2xl border-2 cursor-pointer transition-all active:scale-[0.98]",
                    answers[q.id] === oIdx 
                      ? "border-study-primary bg-study-primary/5 shadow-sm" 
                      : "border-study-light/50 dark:border-zinc-800 hover:border-study-primary/30"
                  )}
                >
                  <RadioGroupItem value={oIdx.toString()} id={`q${q.id}-o${oIdx}`} className="border-study-primary text-study-primary" />
                  <Label htmlFor={`q${q.id}-o${oIdx}`} className="flex-1 cursor-pointer font-medium text-study-dark dark:text-zinc-300">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        ))}

        <div className="pt-6 border-t border-study-light/30">
          <Button 
            disabled={!isAllAnswered}
            onClick={() => {
              setShowResults(true);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full bg-study-primary hover:bg-study-dark text-white rounded-2xl py-8 font-black text-lg shadow-lg flex gap-2 transition-all disabled:opacity-50"
          >
            Corrigir Simulado <ChevronRight size={20} />
          </Button>
          {!isAllAnswered && (
            <p className="text-center text-[10px] text-red-500 font-bold uppercase tracking-widest mt-4">
              Responda todas as questões para ver o resultado
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuizComponent;