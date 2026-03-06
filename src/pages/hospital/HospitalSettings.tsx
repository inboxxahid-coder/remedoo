import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { CreditCard } from "lucide-react";
import ProviderPaymentSettings from "@/components/provider/ProviderPaymentSettings";

export default function HospitalSettings() {
  const [hospital, setHospital] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState(10);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserId(session.user.id);
      const { data } = await supabase.from("hospitals").select("*").eq("user_id", session.user.id).maybeSingle();
      if (data) { setHospital(data); setCommissionPercent(data.platform_commission_percent ?? 10); }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!hospital) return;
    setSaving(true);
    const { error } = await supabase.from("hospitals").update({
      platform_commission_percent: commissionPercent,
      icu_available: hospital.icu_available,
    }).eq("id", hospital.id);
    if (error) toast.error(error.message);
    else { toast.success("Settings saved"); logAuditAction({ action: "update_hospital_settings", entityType: "hospital", entityId: hospital.id }); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!hospital) return <p className="text-center text-muted-foreground py-12">No linked hospital</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="payment"><CreditCard className="w-4 h-4 mr-1" /> Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6 mt-4">
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Financial Settings</h3>
            <div>
              <Label>Platform Commission (%)</Label>
              <Input type="number" min={0} max={100} value={commissionPercent} onChange={e => setCommissionPercent(Number(e.target.value))} />
              <p className="text-xs text-muted-foreground mt-1">Percentage deducted from each appointment earning</p>
            </div>
          </Card>
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Facility Settings</h3>
            <div className="flex items-center gap-3">
              <Switch checked={hospital.icu_available || false} onCheckedChange={v => setHospital({ ...hospital, icu_available: v })} />
              <Label>ICU Available</Label>
            </div>
          </Card>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
        </TabsContent>

        <TabsContent value="payment" className="mt-4">
          <ProviderPaymentSettings providerType="hospital" providerId={hospital?.id} userId={userId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
