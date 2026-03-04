"use client";

import React from 'react';
import { ClipboardCheck, Calendar, BellOff, Cake } from 'lucide-react';
import { format, parseISO, differenceInDays, startOfDay, setYear, isBefore, addYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface NotificationItem {
  id: string;
  subject: string;
  date: string;
  time?: string;
  type: 'exam' | 'birthday';
}

interface NotificationListProps {
  notifications: NotificationItem[];
}

const NotificationList = ({ notifications }: NotificationListProps) => {
  const navigate = useNavigate();
  const today = startOfDay(new Date());
  const currentYear = today.getFullYear();

  return (
    <div className="w-80 max-h-[400px] overflow-hidden flex flex-col bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-study-light/20 dark:border-white/5 animate-in fade-in zoom-in-95 duration-200">
      <div className="p-4 border-b border-study-light/20 dark:border-zinc-800 bg-study-primary/5 flex items-center justify-between">
        <h3 className="font-black text-study-dark dark:text-white text-sm uppercase tracking-wider">Alertas e Mural</h3>
        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {notifications.length}
        </span>
      </div>

      <div className="overflow-y-auto p-2">
        {notifications.length === 0 ? (
          <div className="py-10 text-center flex flex-col items-center gap-2 opacity-50">
            <BellOff size={32} className="text-study-medium" />
            <p className="text-xs font-medium text-study-medium">Nenhum alerta para agora.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((item) => {
              const itemDate = parseISO(item.date);
              
              let daysLeft = 0;
              let dateLabel = "";

              if (item.type === 'exam') {
                const examDate = startOfDay(itemDate);
                daysLeft = differenceInDays(examDate, today);
                dateLabel = format(examDate, "dd 'de' MMM", { locale: ptBR });
              } else {
                // Para aniversários, normalizamos para o ano atual/próximo
                let nextBday = setYear(itemDate, currentYear);
                if (isBefore(nextBday, today)) nextBday = addYears(nextBday, 1);
                daysLeft = differenceInDays(nextBday, today);
                dateLabel = format(nextBday, "dd/MM", { locale: ptBR });
              }
              
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.type === 'exam' ? '/exams' : '/profile')}
                  className="w-full text-left p-3 rounded-2xl hover:bg-study-light/10 dark:hover:bg-zinc-800/50 transition-colors flex gap-3 border border-transparent hover:border-study-light/30 dark:hover:border-zinc-700"
                >
                  <div className={item.type === 'exam' ? "bg-study-primary/10 p-2.5 rounded-xl h-fit" : "bg-pink-100 dark:bg-pink-900/30 p-2.5 rounded-xl h-fit"}>
                    {item.type === 'exam' ? (
                      <ClipboardCheck size={20} className="text-study-primary" />
                    ) : (
                      <Cake size={20} className="text-pink-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-study-dark dark:text-zinc-100 text-sm truncate">
                      {item.type === 'exam' ? item.subject : `Niver: ${item.subject}`}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-study-medium dark:text-zinc-400 mt-1 font-bold">
                      <Calendar size={12} />
                      {dateLabel}
                      <span>•</span>
                      <span className={daysLeft === 0 ? "text-green-500 font-black" : "text-red-500 uppercase tracking-tighter"}>
                        {daysLeft === 0 ? (item.type === 'exam' ? 'É HOJE!' : 'PARABÉNS! 🎂') : 
                         daysLeft === 1 ? 'É AMANHÃ!' : 
                         `Faltam ${daysLeft} dias`}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button 
        onClick={() => navigate('/exams')}
        className="p-3 text-center text-[10px] font-black uppercase tracking-widest text-study-primary hover:bg-study-primary/5 border-t border-study-light/10 dark:border-zinc-800 transition-colors"
      >
        Ver agenda de provas
      </button>
    </div>
  );
};

export default NotificationList;