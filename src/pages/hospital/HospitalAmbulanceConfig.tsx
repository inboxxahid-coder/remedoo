import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Ambulance, Settings2, IndianRupee } from "lucide-react";

export default function HospitalAmbulanceConfig() {
  const [hospital, setHospital] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    service_enabled: false,
    service_type: "free",
    base_fare: 0,
    per_km_charge: 0,
    emergency_surcharge: 0,
    night_surcharge: 0,
    minimum_charge: 0,
  });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: hosp } = await supabase.from("hospitals").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!hosp) { setLoading(false); return; }
      setHospital(hosp);

      const { data: cfg } = await supabase.from("hospital_ambulance_config").select("*").eq("hospital_id", hosp.id).maybeSingle();
      if (cfg) {
        setConfig(cfg);
        setForm({
          service_enabled: cfg.service_enabled || false,
          service_type: cfg.service_type || "free",
          base_fare: cfg.base_fare || 0,
          per_km_charge: cfg.per_km_charge || 0,
          emergency_surcharge: cfg.emergency_surcharge || 0,
          night_surcharge: cfg.night_surcharge || 0,
          minimum_charge: cfg.minimum_charge || 0,
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!hospital) return;
    setSaving(true);
    
    if (config) {
      const { error } = await supabase.from("hospital_ambulance_config")
        .update(form as any).eq("id", config.id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("hospital_ambulance_config")
        .insert({ hospital_id: hospital.id, ...form } as any);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    
    toast.success("Ambulance service configuration saved");
    logAuditAction({ action: "update_ambulance_config", entityType: "hospital_ambulance_config", entityId: hospital.id, details: form });
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!hospital) return <p className="text-center text-muted-foreground py-12">No linked hospital</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Settings2 className="w-6 h-6 text-primary" /> Ambulance Service Configuration
      </h1>

      {/* Service Toggle */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ambulance className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Ambulance Service</p>
              <p className="text-sm text-muted-foreground">Enable ambulance dispatch from this hospital</p>
            </div>
          </div>
          <Switch checked={form.service_enabled} onCheckedChange={v => setForm({ ...form, service_enabled: v })} />
        </div>
        {form.service_enabled && (
          <Badge variant="default" className="ml-8">Active</Badge>
        )}
      </Card>

      {/* Service Type */}
      {form.service_enabled && (
        <>
          <Card className="p-6 space-y-4">
            <h3 className="font-semibold text-foreground">Service Type</h3>
            <Select value={form.service_type} onValueChange={v => setForm({ ...form, service_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="free">Free — No charge to patients</SelectItem>
                <SelectItem value="paid">Paid — Charge patients per trip</SelectItem>
                <SelectItem value="conditional">Conditional — Free for specific cases</SelectItem>
              </SelectContent>
            </Select>
            {form.service_type === "conditional" && (
              <p className="text-xs text-muted-foreground">Free for critical emergencies, paid for non-emergency transfers. Pricing applies to paid trips.</p>
            )}
          </Card>

          {/* Pricing */}
          {(form.service_type === "paid" || form.service_type === "conditional") && (
            <Card className="p-6 space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-primary" /> Pricing Configuration
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Base Fare (₹)</Label>
                  <Input type="number" min={0} value={form.base_fare} onChange={e => setForm({ ...form, base_fare: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Per KM Charge (₹)</Label>
                  <Input type="number" min={0} value={form.per_km_charge} onChange={e => setForm({ ...form, per_km_charge: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Emergency Surcharge (₹)</Label>
                  <Input type="number" min={0} value={form.emergency_surcharge} onChange={e => setForm({ ...form, emergency_surcharge: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Night Surcharge (₹)</Label>
                  <Input type="number" min={0} value={form.night_surcharge} onChange={e => setForm({ ...form, night_surcharge: Number(e.target.value) })} />
                </div>
                <div className="col-span-2">
                  <Label>Minimum Charge (₹)</Label>
                  <Input type="number" min={0} value={form.minimum_charge} onChange={e => setForm({ ...form, minimum_charge: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground mt-1">Minimum amount charged even for short trips</p>
                </div>
              </div>

              {/* Cost Preview */}
              <Card className="p-4 bg-muted/30 border-dashed">
                <p className="text-sm font-medium text-foreground mb-2">Sample Cost Estimate (10 km trip)</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex justify-between"><span>Base Fare</span><span>₹{form.base_fare}</span></div>
                  <div className="flex justify-between"><span>Distance (10 km × ₹{form.per_km_charge})</span><span>₹{form.per_km_charge * 10}</span></div>
                  <div className="flex justify-between"><span>Emergency Surcharge</span><span>₹{form.emergency_surcharge}</span></div>
                  <div className="border-t border-border pt-1 flex justify-between font-semibold text-foreground">
                    <span>Estimated Total</span>
                    <span>₹{Math.max(form.minimum_charge, form.base_fare + form.per_km_charge * 10 + form.emergency_surcharge)}</span>
                  </div>
                </div>
              </Card>
            </Card>
          )}
        </>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Configuration"}
      </Button>
    </div>
  );
}
