import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Mail, ArrowLeft } from "lucide-react";
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
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="gradient-primary px-6 pt-12 pb-16 flex flex-col items-center rounded-b-[2rem]">
        <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center mb-3 border border-primary-foreground/30">
          <Heart className="w-7 h-7 text-primary-foreground" fill="currentColor" />
        </div>
        <h1 className="text-2xl font-bold text-primary-foreground">Forgot Password</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">We'll send you a reset link</p>
      </div>

      <div className="flex-1 px-6 -mt-6">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Check Your Email</h3>
              <p className="text-muted-foreground text-sm">
                We've sent a password reset link to <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
        </div>
        <div className="mt-6 text-center">
          <Link to="/login" className="inline-flex items-center gap-1 text-sm text-primary font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
