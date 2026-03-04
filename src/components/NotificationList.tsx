"use client";

import React from 'react';
import { ClipboardCheck, Calendar, BellOff, Cake, User } from 'lucide-react';
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

  return (
    <div className="w-80 max-h-[450px] overflow-hidden flex flex-col bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-study-light/20 dark:border-white/5 animate-in fade-in zoom-in-95 duration-200">
      <div className="p-4 border-b border-study-light/20 dark:border-zinc-800 bg-study-primary/5 flex items-center justify-between">
        <h3 className="font-black text-study-dark dark:text-white text-sm uppercase tracking-wider">Alertas e Mural</h3>
        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          {notifications.length}
        </span>
      </div>

      <div className="overflow-y-auto p-2">
        {notifications.length === 0 ? (
          <div className="py-12 text-center flex flex-col items-center gap-3 opacity-50">
            <div className="bg-study-light/20 p-4 rounded-full">
              <BellOff size={32} className="text-study-medium" />
            </div>
            <p className="text-xs font-bold text-study-medium uppercase tracking-widest">Tudo limpo por aqui</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {notifications.map((item) => {
              const itemDate = parseISO(item.date);
              const diffDays = differenceInDays(startOfDay(itemDate), today);
              
              const isBirthday = item.type === 'birthday';
              
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(isBirthday ? '/profile' : '/exams')}
                  className="w-full text-left p-3.5 rounded-2xl hover:bg-study-light/10 dark:hover:bg-zinc-800/50 transition-all flex gap-3 border border-transparent hover:border-study-light/30 dark:hover:border-zinc-700 active:scale-[0.98]"
                >
                  <div className={isBirthday ? "bg-pink-100 dark:bg-pink-900/30 p-2.5 rounded-xl h-fit shadow-sm" : "bg-study-primary/10 p-2.5 rounded-xl h-fit shadow-sm"}>
                    {isBirthday ? (
                      <Cake size={22} className="text-pink-600" />
                    ) : (
                      <ClipboardCheck size={22} className="text-study-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-study-dark dark:text-zinc-100 text-[13px] leading-tight mb-1 truncate">
                      {isBirthday ? `Aniversário: ${item.subject}` : `Prova de ${item.subject}`}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-study-medium dark:text-zinc-400 font-bold">
                      <Calendar size={12} className="text-study-primary" />
                      {format(itemDate, "dd/MM", { locale: ptBR })}
                      <span className="opacity-30">•</span>
                      <span className={diffDays === 0 ? "text-green-500 font-black" : "text-red-500 uppercase tracking-tighter"}>
                        {diffDays === 0 ? (isBirthday ? 'HOJE! 🎂' : 'HOJE!') : 
                         diffDays === 1 ? 'AMANHÃ!' : 
                         `EM ${diffDays} DIAS`}
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
        className="p-4 text-center text-[10px] font-black uppercase tracking-widest text-study-primary hover:bg-study-primary/5 border-t border-study-light/10 dark:border-zinc-800 transition-colors"
      >
        Ver agenda completa
      </button>
    </div>
  );
};

export default NotificationList;