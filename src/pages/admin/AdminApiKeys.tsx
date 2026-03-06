import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Key, Save, Eye, EyeOff, Lock, Timer, ShieldCheck, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ApiKey {
  id: string;
  key_name: string;
  key_value: string;
  display_label: string;
  category: string;
  is_masked: boolean;
  last_changed_at: string | null;
  changed_by: string | null;
  cooldown_minutes: number;
}

const SESSION_TIMEOUT_MINUTES = 5;

const categoryLabels: Record<string, { label: string; color: string }> = {
  payment: { label: "Payment", color: "bg-blue-500/10 text-blue-600" },
  messaging: { label: "Messaging", color: "bg-green-500/10 text-green-600" },
  maps: { label: "Maps", color: "bg-orange-500/10 text-orange-600" },
  general: { label: "General", color: "bg-muted text-muted-foreground" },
};

export default function AdminApiKeys() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Auth gate
  const [authenticated, setAuthenticated] = useState(false);
  const [authExpiry, setAuthExpiry] = useState<number>(0);
  const [showAuthDialog, setShowAuthDialog] = useState(true);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [remainingTime, setRemainingTime] = useState(0);

  // Session timer
  useEffect(() => {
    if (!authenticated) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((authExpiry - Date.now()) / 1000));
      setRemainingTime(left);
      if (left <= 0) {
        setAuthenticated(false);
        setShowAuthDialog(true);
        setRevealedKeys(new Set());
        toast.info("Session expired. Please re-authenticate.");
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [authenticated, authExpiry]);

  const handleAuth = async () => {
    setAuthLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        toast.error("No active session");
        setAuthLoading(false);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password,
      });
      if (error) {
        toast.error("Incorrect password");
      } else {
        const expiry = Date.now() + SESSION_TIMEOUT_MINUTES * 60 * 1000;
        setAuthExpiry(expiry);
        setAuthenticated(true);
        setShowAuthDialog(false);
        setRemainingTime(SESSION_TIMEOUT_MINUTES * 60);
        toast.success(`Authenticated for ${SESSION_TIMEOUT_MINUTES} minutes`);
      }
    } catch {
      toast.error("Authentication failed");
    }
    setPassword("");
    setAuthLoading(false);
  };

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_api_keys")
      .select("*")
      .order("category")
      .order("display_label");
    if (error) {
      toast.error("Failed to load API keys");
    } else {
      setKeys((data as any[]) || []);
      const vals: Record<string, string> = {};
      (data || []).forEach((k: any) => { vals[k.key_name] = k.key_value; });
      setEditedValues(vals);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authenticated) fetchKeys();
  }, [authenticated, fetchKeys]);

  const toggleReveal = (keyName: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyName)) next.delete(keyName);
      else next.add(keyName);
      return next;
    });
  };

  const getCooldownRemaining = (key: ApiKey): number => {
    if (!key.last_changed_at) return 0;
    const elapsed = (Date.now() - new Date(key.last_changed_at).getTime()) / 60000;
    return Math.max(0, Math.ceil(key.cooldown_minutes - elapsed));
  };

  const handleSaveKey = async (key: ApiKey) => {
    const newValue = editedValues[key.key_name];
    if (newValue === key.key_value) {
      toast.info("No changes to save");
      return;
    }

    const cooldownLeft = getCooldownRemaining(key);
    if (cooldownLeft > 0) {
      toast.error(`Cooldown active. Try again in ${cooldownLeft} minute${cooldownLeft !== 1 ? "s" : ""}.`);
      return;
    }

    if (Date.now() > authExpiry) {
      setAuthenticated(false);
      setShowAuthDialog(true);
      toast.error("Session expired. Re-authenticate to continue.");
      return;
    }

    setSaving(key.key_name);
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error } = await supabase
      .from("platform_api_keys")
      .update({
        key_value: newValue,
        last_changed_at: new Date().toISOString(),
        changed_by: userId,
      })
      .eq("key_name", key.key_name);

    if (error) {
      toast.error(`Failed to save ${key.display_label}`);
    } else {
      toast.success(`${key.display_label} updated successfully`);
      fetchKeys();
    }
    setSaving(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const groupedKeys = keys.reduce<Record<string, ApiKey[]>>((acc, k) => {
    (acc[k.category] = acc[k.category] || []).push(k);
    return acc;
  }, {});

  // Auth dialog
  if (!authenticated) {
    return (
      <Dialog open={showAuthDialog} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              Password Required
            </DialogTitle>
            <DialogDescription>
              Enter your admin password to access API keys. Session expires after {SESSION_TIMEOUT_MINUTES} minutes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Admin Password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAuth} disabled={!password || authLoading} className="gap-2">
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              Authenticate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">API Keys & Secrets</h1>
            <p className="text-sm text-muted-foreground">Manage third-party integrations securely</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5 text-xs py-1 px-2.5">
            <Timer className="w-3.5 h-3.5" />
            Session: {formatTime(remainingTime)}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => {
            setAuthenticated(false);
            setShowAuthDialog(true);
            setRevealedKeys(new Set());
          }}>
            <Lock className="w-3.5 h-3.5 mr-1.5" />
            Lock
          </Button>
        </div>
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/5 border border-destructive/20 mb-6">
        <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
        <div className="text-sm text-destructive">
          <p className="font-medium">Sensitive Data</p>
          <p className="mt-0.5">Changes to API keys can break live integrations. Each key has a cooldown period after modification.</p>
        </div>
      </div>

      {/* Key Groups */}
      <div className="space-y-6">
        {Object.entries(groupedKeys).map(([category, catKeys]) => {
          const catConfig = categoryLabels[category] || categoryLabels.general;
          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-3">
                <Badge className={`${catConfig.color} border-0 text-xs`}>{catConfig.label}</Badge>
              </div>
              <div className="space-y-3">
                {catKeys.map((k) => {
                  const isRevealed = revealedKeys.has(k.key_name);
                  const value = editedValues[k.key_name] ?? "";
                  const isChanged = value !== k.key_value;
                  const cooldownLeft = getCooldownRemaining(k);
                  const isSaving = saving === k.key_name;

                  return (
                    <Card key={k.id} className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm font-medium text-foreground">{k.display_label}</Label>
                            <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{k.key_name}</code>
                            {isChanged && <Badge variant="secondary" className="text-xs">Modified</Badge>}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type={isRevealed ? "text" : "password"}
                              value={value}
                              onChange={(e) => setEditedValues((prev) => ({ ...prev, [k.key_name]: e.target.value }))}
                              placeholder="Enter key value..."
                              className="max-w-lg font-mono text-sm"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleReveal(k.key_name)}
                              className="shrink-0"
                            >
                              {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </Button>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {k.last_changed_at && (
                              <span>Last changed: {new Date(k.last_changed_at).toLocaleString()}</span>
                            )}
                            {cooldownLeft > 0 && (
                              <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-300">
                                <Timer className="w-3 h-3" />
                                Cooldown: {cooldownLeft}m
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleSaveKey(k)}
                          disabled={!isChanged || cooldownLeft > 0 || isSaving}
                          size="sm"
                          className="gap-1.5 shrink-0"
                        >
                          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                          Save
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
