"use client";

import React from 'react';
import { Scale, FileText, Gavel, ClipboardList, Book, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const subjects = [
  { id: '1', name: 'Direito Administrativo', icon: Scale },
  { id: '2', name: 'Constitucional', icon: FileText },
  { id: '3', name: 'Penal', icon: Gavel },
  { id: '4', name: 'Processo Penal', icon: ClipboardList },
  { id: '5', name: 'Direito Civil', icon: Book },
  { id: '6', name: 'Direito Empresarial', icon: Briefcase },
];

const SubjectGrid = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 mt-8 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-study-primary/10 p-2 rounded-lg">
          <Book className="text-study-primary" size={20} />
        </div>
        <h3 className="text-2xl font-bold text-study-dark dark:text-white">Matérias</h3>
        <div className="h-px bg-study-light dark:bg-zinc-800 flex-1 mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {subjects.map((subject) => (
          <button
            key={subject.id}
            onClick={() => navigate(`/study/${subject.id}`)}
            className="relative h-44 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center gap-3 shadow-study transition-all hover:-translate-y-1 active:scale-95 overflow-hidden group border-b-4 border-black/10 bg-study-primary/90 dark:bg-study-primary/80"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <div className="relative">
              <subject.icon size={44} className="text-white dark:text-zinc-900 drop-shadow-md" strokeWidth={1.5} />
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-white dark:text-zinc-900 font-bold text-sm leading-tight drop-shadow-sm">
                {subject.name}
              </span>
              <div className="w-8 h-0.5 bg-white/40 dark:bg-black/20 rounded-full mt-2" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SubjectGrid;