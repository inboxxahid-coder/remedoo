import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Ambulance, Settings2, IndianRupee, Plus, Pencil, Trash2, Moon } from "lucide-react";
import type { DistanceRange } from "@/lib/ambulancePricing";

export default function LabAmbulanceConfig() {
  const [lab, setLab] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ranges, setRanges] = useState<DistanceRange[]>([]);
  const [editRange, setEditRange] = useState<DistanceRange | null>(null);
  const [rangeForm, setRangeForm] = useState({ min_km: 0, max_km: 0, price: 0 });

  const [form, setForm] = useState({
    service_enabled: false,
    service_type: "free",
    pricing_model: "per_km",
    flat_price: 0,
    base_fare: 0,
    per_km_charge: 0,
    emergency_surcharge: 0,
    night_surcharge: 0,
    minimum_charge: 0,
    night_charge_enabled: false,
    night_charge_amount: 0,
    night_charge_start: "22:00",
    night_charge_end: "06:00",
  });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: labData } = await supabase.from("labs").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!labData) { setLoading(false); return; }
      setLab(labData);

      const { data: cfg } = await supabase.from("lab_ambulance_config" as any).select("*").eq("lab_id", labData.id).maybeSingle();
      if (cfg) {
        const c = cfg as any;
        setConfig(c);
        setForm({
          service_enabled: c.service_enabled || false,
          service_type: c.service_type || "free",
          pricing_model: c.pricing_model || "per_km",
          flat_price: c.flat_price || 0,
          base_fare: c.base_fare || 0,
          per_km_charge: c.per_km_charge || 0,
          emergency_surcharge: c.emergency_surcharge || 0,
          night_surcharge: c.night_surcharge || 0,
          minimum_charge: c.minimum_charge || 0,
          night_charge_enabled: c.night_charge_enabled || false,
          night_charge_amount: c.night_charge_amount || 0,
          night_charge_start: c.night_charge_start || "22:00",
          night_charge_end: c.night_charge_end || "06:00",
        });
      }

      const { data: rangeData } = await supabase.from("ambulance_distance_ranges" as any).select("*").eq("lab_id", labData.id).order("sort_order", { ascending: true });
      setRanges((rangeData as any[]) || []);
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!lab) return;
    setSaving(true);
    const payload = form as any;
    if (config) {
      const { error } = await supabase.from("lab_ambulance_config" as any).update(payload).eq("id", (config as any).id);
      if (error) { toast.error(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("lab_ambulance_config" as any).insert({ lab_id: lab.id, ...payload } as any);
      if (error) { toast.error(error.message); setSaving(false); return; }
    }
    toast.success("Configuration saved");
    logAuditAction({ action: "update_ambulance_config", entityType: "lab_ambulance_config", entityId: lab.id, details: form });
    setSaving(false);
  };

  const saveRange = async () => {
    if (!lab) return;
    if (rangeForm.min_km >= rangeForm.max_km) { toast.error("Max must be greater than Min"); return; }
    if (editRange?.id) {
      await supabase.from("ambulance_distance_ranges" as any).update({ min_km: rangeForm.min_km, max_km: rangeForm.max_km, price: rangeForm.price } as any).eq("id", editRange.id);
    } else {
      await supabase.from("ambulance_distance_ranges" as any).insert({ lab_id: lab.id, min_km: rangeForm.min_km, max_km: rangeForm.max_km, price: rangeForm.price, sort_order: ranges.length } as any);
    }
    const { data } = await supabase.from("ambulance_distance_ranges" as any).select("*").eq("lab_id", lab.id).order("sort_order", { ascending: true });
    setRanges((data as any[]) || []);
    setEditRange(null);
    setRangeForm({ min_km: 0, max_km: 0, price: 0 });
    toast.success("Range saved");
  };

  const deleteRange = async (id: string) => {
    await supabase.from("ambulance_distance_ranges" as any).delete().eq("id", id);
    setRanges(ranges.filter(r => r.id !== id));
    toast.success("Range deleted");
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!lab) return <p className="text-center text-muted-foreground py-12">No linked lab</p>;

  const showPricing = form.service_enabled && (form.service_type === "paid" || form.service_type === "conditional");

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <Settings2 className="w-6 h-6 text-primary" /> Ambulance Pricing Settings
      </h1>

      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Ambulance className="w-5 h-5 text-primary" />
            <div>
              <p className="font-semibold text-foreground">Ambulance Service</p>
              <p className="text-sm text-muted-foreground">Enable ambulance dispatch from this lab</p>
            </div>
          </div>
          <Switch checked={form.service_enabled} onCheckedChange={v => setForm({ ...form, service_enabled: v })} />
        </div>
        {form.service_enabled && <Badge variant="default" className="ml-8">Active</Badge>}
      </Card>

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
          </Card>

          {showPricing && (
            <>
              <Card className="p-6 space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <IndianRupee className="w-4 h-4 text-primary" /> Pricing Model
                </h3>
                <Select value={form.pricing_model} onValueChange={v => setForm({ ...form, pricing_model: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat Price — Fixed price for any distance</SelectItem>
                    <SelectItem value="per_km">Per Kilometer — Base fare + per km charge</SelectItem>
                    <SelectItem value="distance_range">Distance Range — Different prices for distance slabs</SelectItem>
                  </SelectContent>
                </Select>

                {form.pricing_model === "flat" && (
                  <div><Label>Flat Price (₹)</Label><Input type="number" min={0} value={form.flat_price} onChange={e => setForm({ ...form, flat_price: Number(e.target.value) })} /></div>
                )}

                {form.pricing_model === "per_km" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Base Fare (₹)</Label><Input type="number" min={0} value={form.base_fare} onChange={e => setForm({ ...form, base_fare: Number(e.target.value) })} /></div>
                    <div><Label>Per KM (₹)</Label><Input type="number" min={0} value={form.per_km_charge} onChange={e => setForm({ ...form, per_km_charge: Number(e.target.value) })} /></div>
                    <div><Label>Emergency Surcharge (₹)</Label><Input type="number" min={0} value={form.emergency_surcharge} onChange={e => setForm({ ...form, emergency_surcharge: Number(e.target.value) })} /></div>
                    <div><Label>Minimum Charge (₹)</Label><Input type="number" min={0} value={form.minimum_charge} onChange={e => setForm({ ...form, minimum_charge: Number(e.target.value) })} /></div>
                  </div>
                )}
              </Card>

              {form.pricing_model === "distance_range" && (
                <Card className="p-6 space-y-4">
                  <h3 className="font-semibold text-foreground">Distance Pricing Ranges</h3>
                  {ranges.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Min (km)</TableHead>
                          <TableHead>Max (km)</TableHead>
                          <TableHead>Price (₹)</TableHead>
                          <TableHead className="w-24">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ranges.map(r => (
                          <TableRow key={r.id}>
                            <TableCell>{r.min_km}</TableCell>
                            <TableCell>{r.max_km}</TableCell>
                            <TableCell>₹{r.price}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" onClick={() => { setEditRange(r); setRangeForm({ min_km: r.min_km, max_km: r.max_km, price: r.price }); }}><Pencil className="w-4 h-4" /></Button>
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => r.id && deleteRange(r.id)}><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                  <div className="border border-border rounded-lg p-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">{editRange?.id ? "Edit Range" : "Add New Range"}</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Min KM</Label><Input type="number" min={0} value={rangeForm.min_km} onChange={e => setRangeForm({ ...rangeForm, min_km: Number(e.target.value) })} /></div>
                      <div><Label>Max KM</Label><Input type="number" min={0} value={rangeForm.max_km} onChange={e => setRangeForm({ ...rangeForm, max_km: Number(e.target.value) })} /></div>
                      <div><Label>Price (₹)</Label><Input type="number" min={0} value={rangeForm.price} onChange={e => setRangeForm({ ...rangeForm, price: Number(e.target.value) })} /></div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={saveRange} size="sm"><Plus className="w-4 h-4 mr-1" />{editRange?.id ? "Update" : "Add"} Range</Button>
                      {editRange?.id && <Button variant="outline" size="sm" onClick={() => { setEditRange(null); setRangeForm({ min_km: 0, max_km: 0, price: 0 }); }}>Cancel</Button>}
                    </div>
                  </div>
                </Card>
              )}

              <Card className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Moon className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-semibold text-foreground">Night Emergency Charge</p>
                      <p className="text-sm text-muted-foreground">Add extra charge for trips during night hours</p>
                    </div>
                  </div>
                  <Switch checked={form.night_charge_enabled} onCheckedChange={v => setForm({ ...form, night_charge_enabled: v })} />
                </div>
                {form.night_charge_enabled && (
                  <div className="grid grid-cols-3 gap-4 ml-8">
                    <div><Label>Night Charge (₹)</Label><Input type="number" min={0} value={form.night_charge_amount} onChange={e => setForm({ ...form, night_charge_amount: Number(e.target.value) })} /></div>
                    <div><Label>Start Time</Label><Input type="time" value={form.night_charge_start} onChange={e => setForm({ ...form, night_charge_start: e.target.value })} /></div>
                    <div><Label>End Time</Label><Input type="time" value={form.night_charge_end} onChange={e => setForm({ ...form, night_charge_end: e.target.value })} /></div>
                  </div>
                )}
              </Card>
            </>
          )}
        </>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Saving..." : "Save Configuration"}
      </Button>
    </div>
  );
}
