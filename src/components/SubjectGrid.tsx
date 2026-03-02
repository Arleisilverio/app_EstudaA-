"use client";

import React from 'react';
import { Scale, FileText, Gavel, ClipboardList, Book, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const subjects = [
  { id: '1', name: 'Direito Administrativo', icon: Scale, color: 'bg-[#5D4037]' },
  { id: '2', name: 'Constitucional', icon: FileText, color: 'bg-[#A1887F]' },
  { id: '3', name: 'Penal', icon: Gavel, color: 'bg-[#4E342E]' },
  { id: '4', name: 'Processo Penal', icon: ClipboardList, color: 'bg-[#795548]' },
  { id: '5', name: 'Direito Civil', icon: Book, color: 'bg-[#8D6E63]' },
  { id: '6', name: 'Direito Empresarial', icon: Briefcase, color: 'bg-[#3E2723]' },
];

const SubjectGrid = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 mt-8 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-study-primary/10 p-2 rounded-lg">
          <Book className="text-study-primary" size={20} />
        </div>
        <h3 className="text-2xl font-bold text-study-dark">Matérias</h3>
        <div className="h-px bg-study-light flex-1 mt-1" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {subjects.map((subject) => (
          <button
            key={subject.id}
            onClick={() => navigate(`/study/${subject.id}`)}
            className="relative h-44 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center gap-3 shadow-study transition-all hover:-translate-y-1 active:scale-95 overflow-hidden group border-b-4 border-black/10"
            style={{ backgroundColor: '#A67C52' }}
          >
            {/* Overlay gradient for premium look */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            
            <div className="relative">
              <subject.icon size={44} className="text-white drop-shadow-md" strokeWidth={1.5} />
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-white font-bold text-sm leading-tight drop-shadow-sm">
                {subject.name}
              </span>
              <div className="w-8 h-0.5 bg-white/40 rounded-full mt-2" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SubjectGrid;