import { useNavigate } from "react-router-dom";
import { Clock, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const PendingApproval = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="bg-card rounded-2xl shadow-lg border border-border p-8 max-w-md w-full text-center space-y-5">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>
        <h1 className="text-xl font-bold text-foreground">Registration Submitted</h1>
        <p className="text-muted-foreground text-sm">
          Your provider registration is under review. You'll be able to access your dashboard once an admin approves your account.
        </p>
        <p className="text-xs text-muted-foreground">
          This usually takes 24–48 hours. You'll receive an email notification once approved.
        </p>
        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
};

export default PendingApproval;
