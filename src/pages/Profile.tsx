"use client";

import React, { useState } from 'react';
import { Camera, Save, User, BookOpen, Calendar, GraduationCap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import BottomNav from "@/components/BottomNav";
import { showSuccess } from "@/utils/toast";

const ProfilePage = () => {
  const [profile, setProfile] = useState({
    name: "Arlei Silverio",
    course: "Direito",
    period: "7º Período",
    completionYear: "2026",
    avatar: "https://github.com/shadcn.png"
  });

  const handleSave = () => {
    showSuccess("Perfil atualizado com sucesso!");
  };

  return (
    <div className="min-h-screen bg-[#FAF6F1] flex flex-col max-w-md mx-auto relative pb-32">
      <div className="p-6">
        <h1 className="text-3xl font-bold text-study-dark mb-6">Meu Perfil</h1>
        
        <div className="flex flex-col items-center mb-8 relative">
          <div className="relative group">
            <Avatar className="h-32 w-32 border-4 border-white shadow-study">
              <AvatarImage src={profile.avatar} />
              <AvatarFallback className="bg-study-primary text-white text-3xl">AS</AvatarFallback>
            </Avatar>
            <label className="absolute bottom-0 right-0 bg-study-primary text-white p-2 rounded-full cursor-pointer shadow-lg hover:bg-study-dark transition-colors">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" />
            </label>
          </div>
          <p className="mt-4 text-study-medium font-medium">Toque para alterar a foto</p>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-study bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-study-light/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 text-study-dark">
                <User size={18} className="text-study-primary" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-study-medium">Nome Visível</Label>
                <Input 
                  id="name" 
                  value={profile.name} 
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="rounded-xl border-study-light focus-visible:ring-study-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="course" className="text-study-medium">Curso</Label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-study-light" size={18} />
                  <Input 
                    id="course" 
                    value={profile.course} 
                    onChange={(e) => setProfile({...profile, course: e.target.value})}
                    className="pl-10 rounded-xl border-study-light focus-visible:ring-study-primary/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="period" className="text-study-medium">Turma/Período</Label>
                  <Input 
                    id="period" 
                    value={profile.period} 
                    onChange={(e) => setProfile({...profile, period: e.target.value})}
                    className="rounded-xl border-study-light focus-visible:ring-study-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year" className="text-study-medium">Conclusão (Opcional)</Label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 text-study-light" size={18} />
                    <Input 
                      id="year" 
                      value={profile.completionYear} 
                      onChange={(e) => setProfile({...profile, completionYear: e.target.value})}
                      className="pl-10 rounded-xl border-study-light focus-visible:ring-study-primary/20"
                      placeholder="Ex: 2026"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleSave}
            className="w-full bg-study-primary hover:bg-study-dark text-white rounded-2xl py-8 text-lg font-bold shadow-lg flex gap-2"
          >
            <Save size={20} /> Salvar Alterações
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;