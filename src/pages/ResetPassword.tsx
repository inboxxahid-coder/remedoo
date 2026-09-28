import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we have a recovery session
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    if (hashParams.get("type") !== "recovery" && !hashParams.get("access_token")) {
      // Also listen for auth state change
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event !== "PASSWORD_RECOVERY") {
          // Allow the page to load anyway for manual navigation
        }
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated! Please sign in.");
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="gradient-primary px-6 pt-12 pb-16 flex flex-col items-center rounded-b-[2rem]">
        <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center mb-3 border border-primary-foreground/30">
          <Heart className="w-7 h-7 text-primary-foreground" fill="currentColor" />
        </div>
        <h1 className="text-2xl font-bold text-primary-foreground">New Password</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">Set your new password</p>
      </div>

      <div className="flex-1 px-6 -mt-6">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
          <form onSubmit={handleUpdate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input aria-label="Min. 6 characters"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold"
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
