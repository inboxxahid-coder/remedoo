import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Key, Save, Eye, EyeOff, Lock, Timer, ShieldCheck, Loader2,
  AlertTriangle, CreditCard, MessageSquare, MapPin, Bell, Mail,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

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

// Integration groups with icons and descriptions
const integrationGroups: Record<string, {
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
  keys: string[]; // ordered key_names
}> = {
  razorpay: {
    label: "Razorpay Payment Gateway",
    icon: CreditCard,
    color: "text-blue-600",
    description: "Payment processing for appointments, orders, and ambulance trips. Both Key ID and Key Secret are required.",
    keys: ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET"],
  },
  whatsapp: {
    label: "WhatsApp Business API",
    icon: MessageSquare,
    color: "text-green-600",
    description: "Send WhatsApp notifications to patients. Requires Meta Business access token and phone number ID.",
    keys: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
  },
  msg91: {
    label: "MSG91 SMS Gateway",
    icon: MessageSquare,
    color: "text-purple-600",
    description: "SMS OTP and notifications via MSG91. Auth Key is required; Sender ID and Template ID are optional overrides.",
    keys: ["MSG91_AUTH_KEY", "MSG91_SENDER_ID", "MSG91_TEMPLATE_ID"],
  },
  twilio: {
    label: "Twilio (SMS & WhatsApp Fallback)",
    icon: MessageSquare,
    color: "text-red-600",
    description: "Alternative SMS/WhatsApp provider. All four fields are required for Twilio integration.",
    keys: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER", "TWILIO_WHATSAPP_NUMBER"],
  },
  google_maps: {
    label: "Google Maps",
    icon: MapPin,
    color: "text-orange-600",
    description: "Location services, nearby hospitals, and ambulance tracking. API Key is required.",
    keys: ["GOOGLE_MAPS_API_KEY"],
  },
  push_notifications: {
    label: "Push Notifications (VAPID)",
    icon: Bell,
    color: "text-amber-600",
    description: "Web push notifications for appointment and order updates. Both public and private keys are required.",
    keys: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"],
  },
  email_smtp: {
    label: "Email / SMTP",
    icon: Mail,
    color: "text-cyan-600",
    description: "Email notifications and OTP delivery. Host, Port, Username, Password, and From Email are required.",
    keys: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM_EMAIL"],
  },
};

function maskValue(val: string): string {
  if (!val || val.length <= 6) return "••••••••";
  return val.slice(0, 3) + "••••••••" + val.slice(-3);
}

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

  const keysByName = keys.reduce<Record<string, ApiKey>>((acc, k) => {
    acc[k.key_name] = k;
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

      {/* Integration Groups */}
      <Accordion type="multiple" defaultValue={Object.keys(integrationGroups)} className="space-y-3">
        {Object.entries(integrationGroups).map(([groupKey, group]) => {
          const Icon = group.icon;
          const groupKeys = group.keys.map((kn) => keysByName[kn]).filter(Boolean);
          const hasAnyValue = groupKeys.some((k) => k.key_value && k.key_value.length > 0);

          return (
            <AccordionItem key={groupKey} value={groupKey} className="border rounded-xl overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 text-left">
                  <div className={`p-1.5 rounded-lg bg-muted ${group.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{group.label}</span>
                      {hasAnyValue ? (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-100 text-green-700 border-0">
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-0">
                          Not Set
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{group.description}</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-3 pt-1">
                  {groupKeys.map((k) => {
                    const isRevealed = revealedKeys.has(k.key_name);
                    const currentVal = editedValues[k.key_name] ?? "";
                    const isChanged = currentVal !== k.key_value;
                    const cooldownLeft = getCooldownRemaining(k);
                    const isSaving = saving === k.key_name;
                    const hasValue = k.key_value && k.key_value.length > 0;

                    return (
                      <Card key={k.id} className="p-3 bg-muted/30">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm font-medium text-foreground">{k.display_label}</Label>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                                {k.key_name}
                              </Badge>
                              {k.is_masked && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-amber-600 border-amber-300">
                                  Secret
                                </Badge>
                              )}
                            </div>
                            {hasValue && !isChanged && (
                              <span className="text-[10px] text-green-600 font-medium">✓ Set</span>
                            )}
                            {isChanged && (
                              <Badge variant="secondary" className="text-[10px]">Modified</Badge>
                            )}
                          </div>

                          {/* Current value display */}
                          {hasValue && !isChanged && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground">Current:</span>
                              <code className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">
                                {isRevealed ? k.key_value : maskValue(k.key_value)}
                              </code>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleReveal(k.key_name)}
                              >
                                {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </Button>
                            </div>
                          )}

                          {/* Edit input */}
                          <div className="flex items-center gap-2">
                            <Input
                              type={k.is_masked && !isRevealed ? "password" : "text"}
                              value={currentVal}
                              onChange={(e) => setEditedValues((prev) => ({ ...prev, [k.key_name]: e.target.value }))}
                              placeholder={hasValue ? "Enter new value to update..." : "Enter value..."}
                              className="font-mono text-sm h-9"
                            />
                            {!hasValue && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="shrink-0 h-9 w-9"
                                onClick={() => toggleReveal(k.key_name)}
                              >
                                {isRevealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </Button>
                            )}
                            <Button
                              onClick={() => handleSaveKey(k)}
                              disabled={!isChanged || cooldownLeft > 0 || isSaving}
                              size="sm"
                              className="gap-1.5 shrink-0 h-9"
                            >
                              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                              {hasValue ? "Update" : "Save"}
                            </Button>
                          </div>

                          {/* Meta info */}
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            {k.last_changed_at && (
                              <span>Last changed: {new Date(k.last_changed_at).toLocaleString()}</span>
                            )}
                            {cooldownLeft > 0 && (
                              <Badge variant="outline" className="gap-1 text-[10px] text-amber-600 border-amber-300">
                                <Timer className="w-3 h-3" />
                                Cooldown: {cooldownLeft}m
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
