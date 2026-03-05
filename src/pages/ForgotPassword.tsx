import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft, KeyRound } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else setSent(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="relative gradient-primary px-6 pt-14 pb-20 flex flex-col items-center overflow-hidden">
        <div className="absolute -top-20 -right-20 w-52 h-52 rounded-full bg-primary-foreground/5" />
        <motion.div
          className="w-16 h-16 rounded-2xl bg-primary-foreground/15 border border-primary-foreground/20 flex items-center justify-center mb-4"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <KeyRound className="w-8 h-8 text-primary-foreground" />
        </motion.div>
        <h1 className="text-2xl font-bold text-primary-foreground">Forgot Password</h1>
        <p className="text-primary-foreground/60 text-sm mt-1">We'll send you a reset link</p>
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 60" fill="none" preserveAspectRatio="none">
          <path d="M0 60L60 50C120 40 240 20 360 13C480 7 600 13 720 20C840 27 960 33 1080 33C1200 33 1320 27 1380 23L1440 20V60H0Z" fill="hsl(var(--background))" />
        </svg>
      </div>

      <motion.div className="flex-1 px-5 -mt-8 z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6">
          {sent ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">Check Your Email</h3>
              <p className="text-muted-foreground text-sm">
                Password reset link sent to <span className="font-semibold text-foreground">{email}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 h-12 rounded-xl bg-muted/50 border-0 focus:bg-card focus:ring-2 focus:ring-primary/20" required />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold shadow-lg shadow-primary/20">
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </div>
        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-primary font-bold">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
