import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Save, Building2, CreditCard, CalendarCheck, AlertTriangle, FileText, Loader2, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  label: string;
  category: string;
  type: string;
}

const categoryConfig: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  general: { label: "General", icon: Building2, description: "Platform name, contact info, and core settings" },
  services: { label: "Service Controls", icon: Settings, description: "Enable or disable platform services globally" },
  finance: { label: "Finance", icon: CreditCard, description: "Commission rates, delivery fees, and order limits" },
  appointments: { label: "Appointments", icon: CalendarCheck, description: "Scheduling rules and auto-cancel policies" },
  pharmacy: { label: "Pharmacy", icon: Settings, description: "Pharmacy mode control (partner vs Remedoo)" },
  emergency: { label: "Emergency", icon: AlertTriangle, description: "Emergency search radius and timeout settings" },
  legal: { label: "Legal", icon: FileText, description: "URLs for terms, privacy, and refund policies" },
  email: { label: "Email", icon: Mail, description: "Gmail SMTP configuration for sending emails (OTP, orders, reports)" },
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<PlatformSetting[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_settings")
      .select("*")
      .order("category")
      .order("label");
    if (error) {
      toast.error("Failed to load settings");
    } else {
      setSettings((data as any[]) || []);
      const vals: Record<string, string> = {};
      (data || []).forEach((s: any) => { vals[s.key] = s.value; });
      setEditedValues(vals);
    }
    setLoading(false);
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = settings.some((s) => editedValues[s.key] !== s.value);

  const handleSave = async () => {
    setSaving(true);
    const changed = settings.filter((s) => editedValues[s.key] !== s.value);
    let hasError = false;

    for (const s of changed) {
      const { error } = await supabase
        .from("platform_settings")
        .update({ value: editedValues[s.key], updated_by: (await supabase.auth.getUser()).data.user?.id })
        .eq("key", s.key);
      if (error) hasError = true;
    }

    if (hasError) {
      toast.error("Some settings failed to save");
    } else {
      toast.success(`${changed.length} setting${changed.length !== 1 ? "s" : ""} updated`);
      fetchSettings();
    }
    setSaving(false);
  };

  const categories = Object.keys(categoryConfig);

  const renderSetting = (s: PlatformSetting) => {
    const value = editedValues[s.key] ?? s.value;
    const isChanged = value !== s.value;

    // Special pharmacy_mode renderer
    if (s.key === "pharmacy_mode") {
      return (
        <div key={s.key} className="py-3 px-1 space-y-2">
          <Label className="text-sm font-medium text-foreground">
            {s.label}
            {isChanged && <span className="ml-2 text-xs text-primary">(modified)</span>}
          </Label>
          <p className="text-xs text-muted-foreground mb-2">Controls whether medicine orders go to partner pharmacies or Remedoo's own pharmacy</p>
          <div className="flex gap-3">
            {["partner", "remedoo"].map(m => (
              <button
                key={m}
                onClick={() => handleChange(s.key, m)}
                className={`flex-1 p-3 rounded-xl border-2 text-center text-sm font-medium transition-all ${
                  value === m ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"
                }`}
              >
                {m === "partner" ? "Partner Pharmacies" : "Remedoo Pharmacy"}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (s.type === "toggle") {
      return (
        <div key={s.key} className="flex items-center justify-between py-3 px-1">
          <div>
            <Label className="text-sm font-medium text-foreground">{s.label}</Label>
          </div>
          <Switch
            checked={value === "true"}
            onCheckedChange={(checked) => handleChange(s.key, checked ? "true" : "false")}
          />
        </div>
      );
    }

    return (
      <div key={s.key} className="space-y-1.5 py-3 px-1">
        <Label className="text-sm font-medium text-foreground">
          {s.label}
          {isChanged && <span className="ml-2 text-xs text-primary">(modified)</span>}
        </Label>
        <Input
          type={s.type === "password" ? "password" : s.type === "number" ? "number" : "text"}
          value={value}
          onChange={(e) => handleChange(s.key, e.target.value)}
          placeholder={s.type === "password" ? "••••••••••••••••" : ""}
          className="max-w-md"
        />
        {s.key === "gmail_app_password" && (
          <p className="text-xs text-muted-foreground">
            Generate at{" "}
            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-primary underline">
              Google App Passwords
            </a>
            {" "}(requires 2-Step Verification)
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Settings className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Platform Settings</h1>
            <p className="text-sm text-muted-foreground">Configure global platform behavior</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
          {categories.map((cat) => {
            const config = categoryConfig[cat];
            const Icon = config.icon;
            return (
              <TabsTrigger key={cat} value={cat} className="gap-1.5 text-xs sm:text-sm">
                <Icon className="w-3.5 h-3.5" />
                {config.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((cat) => {
          const config = categoryConfig[cat];
          const catSettings = settings.filter((s) => s.category === cat);
          return (
            <TabsContent key={cat} value={cat}>
              <div className="bg-card rounded-2xl border border-border p-4 md:p-6 shadow-sm">
                <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
                <div className="divide-y divide-border">
                  {catSettings.map(renderSetting)}
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
