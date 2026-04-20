import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    navigate(user ? "/dashboard" : "/landing", { replace: true });
  }, [user, loading, navigate]);
  return <div className="flex h-screen items-center justify-center text-muted-foreground">Loading BiogasIQ…</div>;
};  

export default Index;
