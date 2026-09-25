import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Sparkles, UserPlus, Stethoscope, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { getRoleRedirectPath } from "@/hooks/useRoleRedirect";
import { toast } from "sonner";
import remedooLogo from "@/assets/remedoo-logo-transparent.png";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<"password" | "magic">("password");
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("invalid") || msg.includes("credentials")) {
          toast.error("Invalid email or password. Please check and try again.");
        } else {
          toast.error(error.message);
        }
        setLoading(false);
        return;
      }
      if (data?.session) {
        const redirectPath = await getRoleRedirectPath(data.session.user.id);
        navigate(redirectPath, { replace: true });
        return;
      }
      toast.error("Login failed. Please try again.");
    } catch (err: any) {
      console.error("Login error:", err);
      toast.error("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("Please enter your email address"); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) toast.error(error.message);
      else { setMagicLinkSent(true); toast.success("Magic link sent! Check your email."); }
    } catch { toast.error("Something went wrong. Please try again."); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Swiggy-style curved header */}
      <div className="relative gradient-primary px-6 pt-6 pb-12 flex flex-col items-center overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full bg-primary-foreground/5" />
        <div className="absolute -bottom-10 -left-16 w-40 h-40 rounded-full bg-primary-foreground/5" />
        
        <motion.img
          src={remedooLogo}
          alt="Remedoo"
          className="h-11 object-contain mb-2 brightness-0 invert"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
        <motion.h1
          className="text-xl font-bold text-primary-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          Welcome Back
        </motion.h1>
        <motion.p
          className="text-primary-foreground/60 text-xs mt-0.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          Sign in to continue to Remedoo
        </motion.p>
        {/* Wave */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none">
          <path d="M0 60L60 50C120 40 240 20 360 13C480 7 600 13 720 20C840 27 960 33 1080 33C1200 33 1320 27 1380 23L1440 20V60H0Z" fill="hsl(var(--background))" />
        </svg>
      </div>

      {/* Form area */}
      <motion.div
        className="flex-1 px-5 -mt-8 z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="bg-card rounded-2xl shadow-xl border border-border p-4">
          {/* Mode tabs */}
          <div className="flex gap-1.5 mb-4 bg-muted rounded-xl p-1">
            {(["password", "magic"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => { setLoginMode(mode); setMagicLinkSent(false); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${
                  loginMode === mode
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {mode === "password" ? "Password" : "Magic Link"}
              </button>
            ))}
          </div>

          {loginMode === "password" ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl bg-muted/50 border-0 focus:bg-card focus:ring-2 focus:ring-primary/20" required />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10 h-11 rounded-xl bg-muted/50 border-0 focus:bg-card focus:ring-2 focus:ring-primary/20" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-xs text-primary font-semibold">Forgot Password?</Link>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-bold text-[15px] shadow-lg shadow-primary/20">
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          ) : magicLinkSent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2 text-foreground">Check Your Email</h3>
              <p className="text-muted-foreground text-sm">Magic login link sent to <span className="font-semibold text-foreground">{email}</span></p>
              <Button variant="ghost" className="mt-4 text-primary font-semibold" onClick={() => setMagicLinkSent(false)}>Send again</Button>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="magic-email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="magic-email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-11 rounded-xl bg-muted/50 border-0 focus:bg-card focus:ring-2 focus:ring-primary/20" required />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">We'll send you a magic link — no password needed.</p>
              <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl gradient-primary text-primary-foreground font-bold text-[15px] gap-2 shadow-lg shadow-primary/20">
                <Sparkles className="w-4 h-4" />
                {loading ? "Sending..." : "Send Magic Link"}
              </Button>
            </form>
          )}

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-3 text-muted-foreground font-medium">or</span></div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 rounded-xl font-semibold text-[15px] gap-2.5 border-border hover:bg-muted/50"
            onClick={async () => {
              const { error } = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
              if (error) toast.error(error.message);
            }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Continue with Google
          </Button>
        </div>

        {/* Bottom links */}
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/dashboard", { replace: true })}
          className="w-full h-12 rounded-xl font-semibold text-[15px] border-border hover:bg-muted/50 mt-5"
        >
          Skip, continue as guest →
        </Button>
        <p className="text-center mt-4 text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary font-bold">Sign Up</Link>
        </p>
        <p className="text-center mt-2 mb-8 text-sm text-muted-foreground">
          Are you a provider?{" "}
          <Link to="/provider-register" className="text-primary font-bold">Register</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;
