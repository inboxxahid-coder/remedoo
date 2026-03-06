import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export default function AdminServiceAreas() {
  const [areas, setAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", type: "city", latitude: "", longitude: "", radius_km: "", is_active: true, parent_id: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("service_areas").select("*").order("type").order("name");
    setAreas(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ name: "", type: "city", latitude: "", longitude: "", radius_km: "", is_active: true, parent_id: "" }); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    const payload: any = { name: form.name, type: form.type, is_active: form.is_active, latitude: form.latitude ? +form.latitude : null, longitude: form.longitude ? +form.longitude : null, radius_km: form.radius_km ? +form.radius_km : null, parent_id: form.parent_id || null };

    if (editing) {
      const { error } = await supabase.from("service_areas").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("service_areas").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
    }
    setDialogOpen(false); resetForm(); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("service_areas").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const openEdit = (a: any) => {
    setEditing(a);
    setForm({ name: a.name, type: a.type, latitude: a.latitude?.toString() || "", longitude: a.longitude?.toString() || "", radius_km: a.radius_km?.toString() || "", is_active: a.is_active, parent_id: a.parent_id || "" });
    setDialogOpen(true);
  };

  const cities = areas.filter(a => a.type === "city");
  const typeBadge = (t: string) => {
    const colors: Record<string, string> = { city: "default", area: "secondary", zone: "outline" };
    return <Badge variant={colors[t] as any || "outline"} className="capitalize">{t}</Badge>;
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><MapPin className="w-6 h-6 text-primary" /> Service Areas</h1>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Add Area</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Add"} Service Area</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Mumbai" /></div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="city">City</SelectItem><SelectItem value="area">Area</SelectItem><SelectItem value="zone">Service Zone</SelectItem><SelectItem value="delivery_zone">Delivery Zone</SelectItem></SelectContent>
                </Select>
              </div>
              {form.type !== "city" && cities.length > 0 && (
                <div><Label>Parent City</Label>
                  <Select value={form.parent_id} onValueChange={v => setForm(f => ({ ...f, parent_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select city" /></SelectTrigger>
                    <SelectContent>{cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Latitude</Label><Input value={form.latitude} onChange={e => setForm(f => ({ ...f, latitude: e.target.value }))} /></div>
                <div><Label>Longitude</Label><Input value={form.longitude} onChange={e => setForm(f => ({ ...f, longitude: e.target.value }))} /></div>
                <div><Label>Radius (km)</Label><Input value={form.radius_km} onChange={e => setForm(f => ({ ...f, radius_km: e.target.value }))} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
              <Button className="w-full" onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {areas.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No service areas configured</p></Card>
      ) : (
        <div className="grid gap-3">
          {areas.map(a => (
            <Card key={a.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{a.name}</span>
                    {typeBadge(a.type)}
                    <Badge variant={a.is_active ? "default" : "secondary"}>{a.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {a.latitude && a.longitude ? `📍 ${a.latitude}, ${a.longitude}` : "No coordinates"}
                    {a.radius_km ? ` • ${a.radius_km}km radius` : ""}
                    {a.parent_id ? ` • Parent: ${areas.find(x => x.id === a.parent_id)?.name || "—"}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
