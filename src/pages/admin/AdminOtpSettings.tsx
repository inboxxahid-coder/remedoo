import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, Mail, MessageSquare, Phone, Save, Info } from "lucide-react";

export default function AdminOtpSettings() {
  const [settings, setSettings] = useState({
    id: "",
    email_enabled: true,
    sms_enabled: false,
    whatsapp_enabled: false,
    otp_required_for_confirmed: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("cancellation_otp_settings")
      .select("*")
      .limit(1)
      .single();
    if (data) setSettings(data as any);
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("cancellation_otp_settings")
      .update({
        email_enabled: settings.email_enabled,
        sms_enabled: settings.sms_enabled,
        whatsapp_enabled: settings.whatsapp_enabled,
        otp_required_for_confirmed: settings.otp_required_for_confirmed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) toast.error("Failed to save settings");
    else toast.success("OTP settings saved!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Cancellation OTP Settings</h1>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">OTP Verification</h2>
          <p className="text-sm text-muted-foreground">
            Require OTP verification before patients can cancel confirmed appointments.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-primary" />
            <div>
              <Label className="text-base font-medium">Enable OTP for Cancellations</Label>
              <p className="text-sm text-muted-foreground">Require OTP when cancelling confirmed appointments</p>
            </div>
          </div>
          <Switch
            checked={settings.otp_required_for_confirmed}
            onCheckedChange={(v) => setSettings({ ...settings, otp_required_for_confirmed: v })}
          />
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-1">OTP Delivery Channels</h2>
          <p className="text-sm text-muted-foreground">
            Choose how OTP codes are sent to patients. At least one channel must be enabled.
          </p>
        </div>

        {/* Email */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Label className="text-base font-medium">Email</Label>
              <p className="text-sm text-muted-foreground">Send OTP to registered email address</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Built-in</Badge>
            <Switch
              checked={settings.email_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, email_enabled: v })}
            />
          </div>
        </div>

        {/* SMS */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <Label className="text-base font-medium">SMS</Label>
              <p className="text-sm text-muted-foreground">Send OTP via text message</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Twilio</Badge>
            <Switch
              checked={settings.sms_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, sms_enabled: v })}
            />
          </div>
        </div>

        {/* WhatsApp */}
        <div className="flex items-center justify-between p-4 rounded-xl border border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <Label className="text-base font-medium">WhatsApp</Label>
              <p className="text-sm text-muted-foreground">Send OTP via WhatsApp message</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Twilio</Badge>
            <Switch
              checked={settings.whatsapp_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, whatsapp_enabled: v })}
            />
          </div>
        </div>

        {(settings.sms_enabled || settings.whatsapp_enabled) && (
          <div className="flex items-start gap-2 p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
            <div className="text-sm text-yellow-700 dark:text-yellow-400">
              <p className="font-medium">Twilio Setup Required</p>
              <p className="mt-1">
                SMS and WhatsApp require Twilio credentials. Please add <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">TWILIO_ACCOUNT_SID</code>,{" "}
                <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">TWILIO_AUTH_TOKEN</code>,{" "}
                <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">TWILIO_PHONE_NUMBER</code>
                {settings.whatsapp_enabled && (
                  <>, and <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">TWILIO_WHATSAPP_NUMBER</code></>
                )}{" "}
                as backend secrets.
              </p>
            </div>
          </div>
        )}
      </Card>

      <Button onClick={handleSave} disabled={saving} className="gap-2">
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
