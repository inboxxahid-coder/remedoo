import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Plus, Loader2, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface Driver {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  vehicle_type: string;
  vehicle_number: string | null;
  license_number: string | null;
  status: string;
  is_active: boolean;
}

export default function AdminDeliveryDrivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", vehicle_type: "bike", vehicle_number: "", license_number: "", user_id: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("delivery_drivers").select("*").order("created_at", { ascending: false });
    setDrivers((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.name || !form.user_id) { toast.error("Name and User ID required"); return; }
    setSaving(true);
    const { error } = await supabase.from("delivery_drivers").insert(form as any);
    if (error) toast.error(error.message);
    else { toast.success("Driver added"); setDialogOpen(false); load(); }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("delivery_drivers").update({ is_active: active } as any).eq("id", id);
    toast.success(active ? "Driver activated" : "Driver deactivated");
    load();
  };

  const filtered = drivers.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  const statusColor: Record<string, string> = {
    available: "bg-emerald-100 text-emerald-800",
    on_delivery: "bg-orange-100 text-orange-800",
    offline: "bg-muted text-muted-foreground",
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10"><Truck className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Delivery Drivers</h1>
            <p className="text-sm text-muted-foreground">{drivers.length} drivers registered</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Add Driver</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Delivery Driver</DialogTitle></DialogHeader>
            <div className="space-y-3 mt-2">
              {([
                ["user_id", "User ID (from auth)"],
                ["name", "Full Name"],
                ["phone", "Phone Number"],
                ["vehicle_type", "Vehicle Type (bike/car/van)"],
                ["vehicle_number", "Vehicle Number"],
                ["license_number", "License Number"],
              ] as [string, string][]).map(([key, label]) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input value={(form as any)[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} />
                </div>
              ))}
              <Button onClick={handleAdd} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Driver"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search drivers..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-2">
        {filtered.map(d => (
          <Card key={d.id} className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-foreground">{d.name}</p>
                <Badge className={`text-[10px] ${statusColor[d.status] || ""}`}>{d.status}</Badge>
                {!d.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{d.phone || "—"} • {d.vehicle_type} {d.vehicle_number || ""}</p>
            </div>
            <Switch checked={d.is_active} onCheckedChange={v => toggleActive(d.id, v)} />
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-10">No drivers found</p>}
      </div>
    </div>
  );
}
