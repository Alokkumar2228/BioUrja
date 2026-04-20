import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import WasteInput from "./pages/WasteInput.tsx";
import Advisor from "./pages/Advisor.tsx";
import Reports from "./pages/Reports.tsx";
import NotFound from "./pages/NotFound.tsx";
import LandinPage from "./pages/BiogasIQLanding.tsx"

const queryClient = new QueryClient();

const Protected = ({ children }: { children: JSX.Element }) => (
  <ProtectedRoute><AppLayout>{children}</AppLayout></ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/landing" element={<LandinPage/>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
            <Route path="/waste" element={<Protected><WasteInput /></Protected>} />
            <Route path="/advisor" element={<Protected><Advisor /></Protected>} />
            <Route path="/reports" element={<Protected><Reports /></Protected>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
