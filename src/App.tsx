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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();
  const location = useLocation();
  
  if (loading && !session) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="relative">
          <Loader2 className="animate-spin text-study-primary" size={48} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-study-medium uppercase tracking-widest animate-pulse">
            Sincronizando...
          </p>
        </div>
      </div>
    );
  }

  if (session) {
    return <>{children}</>;
  }
  
  return <Navigate to="/login" state={{ from: location }} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/reset-password" element={<ResetPassword />} />
    
    {/* Rotas Protegidas */}
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/study/:subjectId" element={<ProtectedRoute><StudyDashboard /></ProtectedRoute>} />
    <Route path="/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="/exams" element={<ProtectedRoute><Exams /></ProtectedRoute>} />
    <Route path="/schedule" element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
    <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
    <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
    <Route path="/terms" element={<Terms />} />
    
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark" storageKey="study-ai-theme" attribute="class">
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