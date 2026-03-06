import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, Plus, Trash2, Edit, IndianRupee, FlaskConical, Building2 } from "lucide-react";

export default function AdminHealthcarePackages() {
  const [packages, setPackages] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", description: "", provider_type: "hospital", provider_id: "",
    original_price: 0, discounted_price: 0, tests_included: "",
    duration_days: 1, is_active: true,
  });
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);

  const load = async () => {
    setLoading(true);
    const [pkgRes, bookRes, hospRes, labRes] = await Promise.all([
      supabase.from("healthcare_packages").select("*").order("created_at", { ascending: false }),
      supabase.from("package_bookings").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("hospitals").select("id, name"),
      supabase.from("labs").select("id, name"),
    ]);
    setPackages(pkgRes.data || []);
    setBookings(bookRes.data || []);
    setHospitals(hospRes.data || []);
    setLabs(labRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", description: "", provider_type: "hospital", provider_id: "", original_price: 0, discounted_price: 0, tests_included: "", duration_days: 1, is_active: true });
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.provider_id) { toast.error("Name and provider required"); return; }
    let testsJson: string[] = [];
    try { testsJson = form.tests_included ? JSON.parse(form.tests_included) : []; } catch { testsJson = form.tests_included.split(",").map(t => t.trim()).filter(Boolean); }

    const payload = {
      name: form.name, description: form.description || null,
      provider_type: form.provider_type, provider_id: form.provider_id,
      original_price: Number(form.original_price), discounted_price: form.discounted_price ? Number(form.discounted_price) : null,
      tests_included: testsJson, duration_days: Number(form.duration_days), is_active: form.is_active,
    };

    if (editing) {
      const { error } = await supabase.from("healthcare_packages").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("healthcare_packages").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
    }
    setDialogOpen(false); resetForm(); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this package?")) return;
    await supabase.from("healthcare_packages").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || "", provider_type: p.provider_type,
      provider_id: p.provider_id, original_price: p.original_price,
      discounted_price: p.discounted_price || 0,
      tests_included: Array.isArray(p.tests_included) ? JSON.stringify(p.tests_included) : "",
      duration_days: p.duration_days, is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const providerOptions = form.provider_type === "hospital" ? hospitals : labs;

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Package className="w-6 h-6 text-primary" /> Healthcare Packages
        </h1>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Add Package</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Package</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Provider Type</Label>
                  <Select value={form.provider_type} onValueChange={v => setForm(f => ({ ...f, provider_type: v, provider_id: "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hospital">Hospital</SelectItem>
                      <SelectItem value="lab">Lab</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Provider</Label>
                  <Select value={form.provider_id} onValueChange={v => setForm(f => ({ ...f, provider_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {providerOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Price (₹)</Label><Input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: Number(e.target.value) }))} /></div>
                <div><Label>Discounted (₹)</Label><Input type="number" value={form.discounted_price} onChange={e => setForm(f => ({ ...f, discounted_price: Number(e.target.value) }))} /></div>
                <div><Label>Duration (days)</Label><Input type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: Number(e.target.value) }))} /></div>
              </div>
              <div><Label>Tests Included (comma separated)</Label><Textarea value={form.tests_included} onChange={e => setForm(f => ({ ...f, tests_included: e.target.value }))} placeholder="CBC, Lipid Profile, Thyroid..." /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
              <Button onClick={handleSave} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="packages">
        <TabsList><TabsTrigger value="packages">Packages ({packages.length})</TabsTrigger><TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger></TabsList>
        <TabsContent value="packages">
          <div className="grid md:grid-cols-2 gap-4">
            {packages.map(p => (
              <Card key={p.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {p.provider_type === "hospital" ? <Building2 className="w-4 h-4 text-blue-500" /> : <FlaskConical className="w-4 h-4 text-purple-500" />}
                      <h3 className="font-semibold text-foreground">{p.name}</h3>
                    </div>
                    {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1 font-bold text-primary"><IndianRupee className="w-3 h-3" />{p.discounted_price || p.original_price}</span>
                  {p.discounted_price && <span className="line-through text-muted-foreground text-xs">₹{p.original_price}</span>}
                  <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                  <span className="text-xs text-muted-foreground">{p.bookings_count} bookings</span>
                </div>
                {Array.isArray(p.tests_included) && p.tests_included.length > 0 && (
                  <div className="flex flex-wrap gap-1">{p.tests_included.map((t: string, i: number) => <Badge key={i} variant="outline" className="text-xs">{t}</Badge>)}</div>
                )}
              </Card>
            ))}
            {packages.length === 0 && <Card className="p-8 text-center col-span-2"><p className="text-muted-foreground">No packages yet</p></Card>}
          </div>
        </TabsContent>
        <TabsContent value="bookings">
          <div className="space-y-2">
            {bookings.map(b => (
              <Card key={b.id} className="p-3 flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">Booking #{b.id.slice(0, 8)}</span>
                  <span className="text-muted-foreground ml-2">₹{b.amount_paid}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={b.status === "completed" ? "default" : "secondary"}>{b.status}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}
            {bookings.length === 0 && <Card className="p-8 text-center"><p className="text-muted-foreground">No bookings yet</p></Card>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
