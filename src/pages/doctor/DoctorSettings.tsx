import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Bell, Moon, Save, Shield } from "lucide-react";

export default function DoctorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("dark_mode, notification_preferences")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (profile) {
        setDarkMode(profile.dark_mode ?? false);
        const prefs = profile.notification_preferences as any;
        if (prefs) {
          setNotifEmail(prefs.email ?? true);
          setNotifPush(prefs.push ?? true);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSaving(false); return; }

    const { error } = await supabase.from("profiles").update({
      dark_mode: darkMode,
      notification_preferences: { email: notifEmail, push: notifPush },
    }).eq("user_id", session.user.id);

    if (error) toast.error(error.message);
    else {
      if (darkMode) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      toast.success("Settings saved");
      logAuditAction({ action: "update_settings", entityType: "settings" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="w-32 h-8 rounded" />
        {[1, 2].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {/* Appearance */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Moon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Dark Mode</Label>
            <p className="text-xs text-muted-foreground">Toggle dark theme</p>
          </div>
          <Switch checked={darkMode} onCheckedChange={setDarkMode} />
        </div>
      </Card>

      {/* Notifications */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Email Notifications</Label>
              <p className="text-xs text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Push Notifications</Label>
              <p className="text-xs text-muted-foreground">Browser push notifications</p>
            </div>
            <Switch checked={notifPush} onCheckedChange={setNotifPush} />
          </div>
        </div>
      </Card>

      {/* Security Info */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Security</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          All actions are logged in the Activity Log. Your data is protected with role-based access control
          and encrypted at rest. Only you can access your patient data and appointment records.
        </p>
      </Card>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
