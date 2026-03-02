"use client";

import React from 'react';
import { Settings as SettingsIcon, Moon, Sun, ShieldAlert, Trash2, ChevronRight, LogOut, ExternalLink } from 'lucide-react';
import { useTheme } from "next-themes";
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import BottomNav from "@/components/BottomNav";
import { showError, showSuccess } from "@/utils/toast";

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    showSuccess("Saindo da conta...");
    setTimeout(() => navigate("/"), 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col max-w-md mx-auto relative pb-40">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-study-primary/10 p-3 rounded-2xl">
            <SettingsIcon className="text-study-primary" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-study-dark dark:text-white">Ajustes</h1>
            <p className="text-study-medium text-sm font-medium">Configurações do aplicativo</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Aparência */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-study-medium uppercase tracking-widest ml-1">Personalização</h2>
            <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl">
                      {theme === 'dark' ? <Moon size={18} className="text-amber-600" /> : <Sun size={18} className="text-amber-600" />}
                    </div>
                    <span className="font-bold text-study-dark dark:text-zinc-200">Modo Escuro</span>
                  </div>
                  <Switch 
                    checked={theme === "dark"} 
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} 
                  />
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Legal e Suporte */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-study-medium uppercase tracking-widest ml-1">Legal</h2>
            <Card className="border-none shadow-study bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                <button 
                  onClick={() => navigate('/terms')}
                  className="w-full flex items-center justify-between p-4 px-6 border-b border-study-light/20 dark:border-zinc-800 hover:bg-study-light/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl">
                      <ShieldAlert size={18} className="text-green-600" />
                    </div>
                    <span className="font-bold text-study-dark dark:text-zinc-200">Termos de Uso</span>
                  </div>
                  <ChevronRight size={18} className="text-study-medium" />
                </button>
                <button className="w-full flex items-center justify-between p-4 px-6 hover:bg-study-light/10 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-xl">
                      <ExternalLink size={18} className="text-blue-600" />
                    </div>
                    <span className="font-bold text-study-dark dark:text-zinc-200">Ajuda e Suporte</span>
                  </div>
                  <ChevronRight size={18} className="text-study-medium" />
                </button>
              </CardContent>
            </Card>
          </section>

          {/* Zona de Perigo */}
          <section className="space-y-3">
            <h2 className="text-xs font-bold text-red-500 uppercase tracking-widest ml-1">Gerenciamento</h2>
            <Card className="border-2 border-red-100 dark:border-red-900/20 shadow-none bg-red-50/30 dark:bg-red-900/5 rounded-3xl overflow-hidden">
              <CardContent className="p-0">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="w-full flex items-center justify-between p-4 px-6 text-red-600 border-b border-red-100/50 dark:border-red-900/10 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                      <div className="flex items-center gap-3">
                        <Trash2 size={18} />
                        <span className="font-bold">Excluir Minha Conta</span>
                      </div>
                      <ChevronRight size={18} />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl border-none">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-xl font-bold text-study-dark">Tem certeza absoluta?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente seu perfil e todo seu progresso.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => showError("Funcionalidade bloqueada nesta versão")}
                        className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                      >
                        Confirmar Exclusão
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-4 px-6 text-study-medium hover:bg-study-light/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <LogOut size={18} />
                    <span className="font-bold">Sair do Aplicativo</span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      {/* Rodapé fixo com a versão */}
      <footer className="absolute bottom-32 left-0 right-0 text-center">
        <p className="text-[9px] font-bold text-study-medium/50 uppercase tracking-[0.2em]">
          Estuda AÍ • Versão 1.0.24-beta • 2024
        </p>
      </footer>

      <BottomNav />
    </div>
  );
};

export default SettingsPage;