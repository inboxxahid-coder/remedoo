import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Bell, Moon, Save, Shield, CreditCard } from "lucide-react";
import ProviderPaymentSettings from "@/components/provider/ProviderPaymentSettings";

export default function DoctorSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      setUserId(session.user.id);

      const [profileRes, doctorRes] = await Promise.all([
        supabase.from("profiles").select("dark_mode, notification_preferences").eq("user_id", session.user.id).maybeSingle(),
        supabase.from("doctors").select("id").eq("user_id", session.user.id).maybeSingle(),
      ]);

      if (profileRes.data) {
        setDarkMode(profileRes.data.dark_mode ?? false);
        const prefs = profileRes.data.notification_preferences as any;
        if (prefs) { setNotifEmail(prefs.email ?? true); setNotifPush(prefs.push ?? true); }
      }
      setDoctorId(doctorRes.data?.id ?? null);
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

  if (loading) return (
    <div className="space-y-6 max-w-2xl">
      <Skeleton className="w-32 h-8 rounded" />
      {[1, 2].map(i => <Skeleton key={i} className="h-40 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payment"><CreditCard className="w-4 h-4 mr-1" /> Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Moon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
            </div>
            <div className="flex items-center justify-between">
              <div><Label className="text-sm font-medium">Dark Mode</Label><p className="text-xs text-muted-foreground">Toggle dark theme</p></div>
              <Switch checked={darkMode} onCheckedChange={setDarkMode} />
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Notification Preferences</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div><Label className="text-sm font-medium">Email Notifications</Label><p className="text-xs text-muted-foreground">Receive updates via email</p></div>
                <Switch checked={notifEmail} onCheckedChange={setNotifEmail} />
              </div>
              <div className="flex items-center justify-between">
                <div><Label className="text-sm font-medium">Push Notifications</Label><p className="text-xs text-muted-foreground">Browser push notifications</p></div>
                <Switch checked={notifPush} onCheckedChange={setNotifPush} />
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Security</h2>
            </div>
            <p className="text-sm text-muted-foreground">All actions are logged. Your data is protected with role-based access control and encrypted at rest.</p>
          </Card>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </TabsContent>

        <TabsContent value="payment" className="mt-4">
          <ProviderPaymentSettings providerType="doctor" providerId={doctorId} userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
