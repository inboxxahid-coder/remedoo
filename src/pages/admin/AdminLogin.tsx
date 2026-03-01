import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError || !authData.user) {
        toast.error(authError?.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", authData.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        await supabase.auth.signOut();
        toast.error("You are not authorized as an admin");
        setLoading(false);
        return;
      }

      toast.success("Welcome, Admin!");
      navigate("/admin");
    } catch (err: any) {
      console.error("Admin login error:", err);
      toast.error("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in with your admin account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 bg-card p-6 rounded-2xl border border-border shadow-xl">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@remedoo.com"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          <div className="mt-4 p-3 bg-muted rounded-lg text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground text-sm">Demo Admin</p>
            <p><span className="font-medium">Email:</span> demo@remedoo.com</p>
            <p><span className="font-medium">Password:</span> <code className="bg-background px-1.5 py-0.5 rounded text-foreground">demo1234</code></p>
          </div>
        </form>
      </div>
    </div>
  );
}
