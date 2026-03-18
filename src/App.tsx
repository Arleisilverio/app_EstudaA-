import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index";
import StudyDashboard from "./pages/StudyDashboard";
import History from "./pages/History";
import Profile from "./pages/Profile";
import Exams from "./pages/Exams";
import Schedule from "./pages/Schedule";
import Settings from "./pages/Settings";
import Events from "./pages/Events";
import Terms from "./pages/Terms";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Support from "./pages/Support";
import ProfessorPortal from "./pages/ProfessorPortal";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { session, loading, role } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <Loader2 className="animate-spin text-study-primary" size={48} />
        <p className="text-sm font-bold text-study-medium uppercase tracking-widest animate-pulse">
          Sincronizando...
        </p>
      </div>
    );
  }
  
  if (!session) return <Navigate to="/login" replace />;

  // Se for professor e tentar acessar rotas de aluno, manda pro portal (exceto Provas que agora ele gerencia)
  const profAllowedPaths = ['/professor-portal', '/settings', '/support', '/terms', '/exams'];
  if (role === 'professor' && !profAllowedPaths.includes(location.pathname)) {
    return <Navigate to="/professor-portal" replace />;
  }

  // Se for aluno e tentar acessar o portal do professor, manda pra home (a menos que seja admin)
  if (role === 'student' && location.pathname === '/professor-portal') {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    
    {/* Rotas de Aluno */}
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/study/:subjectId" element={<ProtectedRoute><StudyDashboard /></ProtectedRoute>} />
    <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
    <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
    <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
    
    {/* Rotas Comuns / Professor */}
    <Route path="/professor-portal" element={<ProtectedRoute><ProfessorPortal /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/terms" element={<Terms />} />
    <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
    
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="study-ai-theme" attribute="class">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner position="top-center" />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;