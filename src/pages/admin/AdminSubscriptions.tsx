import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Crown, Plus, Trash2, Edit, Users } from "lucide-react";
import { toast } from "sonner";

export default function AdminSubscriptions() {
  const [plans, setPlans] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", provider_type: "doctor", price: 0, duration_days: 30, is_active: true, features: "" });

  const load = async () => {
    setLoading(true);
    const [plansRes, subsRes] = await Promise.all([
      supabase.from("subscription_plans").select("*").order("provider_type").order("price"),
      supabase.from("provider_subscriptions").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setPlans(plansRes.data || []);
    setSubscriptions(subsRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ name: "", description: "", provider_type: "doctor", price: 0, duration_days: 30, is_active: true, features: "" }); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    let featuresJson: any[] = [];
    try { featuresJson = form.features ? JSON.parse(form.features) : []; } catch { featuresJson = form.features.split(",").map(f => f.trim()).filter(Boolean); }

    const payload: any = { name: form.name, description: form.description || null, provider_type: form.provider_type, price: Number(form.price), duration_days: Number(form.duration_days), is_active: form.is_active, features: featuresJson };

    if (editing) {
      const { error } = await supabase.from("subscription_plans").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("subscription_plans").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
    }
    setDialogOpen(false); resetForm(); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("subscription_plans").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const openEdit = (p: any) => {
    setEditing(p);
    const features = Array.isArray(p.features) ? p.features.join(", ") : "";
    setForm({ name: p.name, description: p.description || "", provider_type: p.provider_type, price: p.price, duration_days: p.duration_days, is_active: p.is_active, features });
    setDialogOpen(true);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Crown className="w-6 h-6 text-amber-500" /> Subscription Plans</h1>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Add Plan</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Plan</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Premium Listing" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Provider Type</Label>
                  <Select value={form.provider_type} onValueChange={v => setForm(f => ({ ...f, provider_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="doctor">Doctor</SelectItem><SelectItem value="hospital">Hospital</SelectItem><SelectItem value="lab">Lab</SelectItem><SelectItem value="pharmacy">Pharmacy</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Price (₹)</Label><Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} /></div>
              </div>
              <div><Label>Duration (days)</Label><Input type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: +e.target.value }))} /></div>
              <div><Label>Features (comma separated)</Label><Input value={form.features} onChange={e => setForm(f => ({ ...f, features: e.target.value }))} placeholder="Featured listing, Priority support" /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
              <Button className="w-full" onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="plans">
        <TabsList><TabsTrigger value="plans">Plans ({plans.length})</TabsTrigger><TabsTrigger value="subscribers">Subscribers ({subscriptions.length})</TabsTrigger></TabsList>

        <TabsContent value="plans" className="space-y-3 mt-4">
          {plans.length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No plans yet</p></Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {plans.map(p => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{p.name}</span>
                        <Badge variant="outline" className="capitalize">{p.provider_type}</Badge>
                        <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                      </div>
                      <p className="text-xl font-bold text-primary mt-1">₹{p.price}<span className="text-xs text-muted-foreground font-normal">/{p.duration_days} days</span></p>
                      {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                      {Array.isArray(p.features) && p.features.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {p.features.map((f: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{f}</Badge>)}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(p)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscribers" className="space-y-3 mt-4">
          {subscriptions.length === 0 ? (
            <Card className="p-12 text-center"><Users className="w-8 h-8 mx-auto text-muted-foreground mb-2" /><p className="text-muted-foreground">No subscribers yet</p></Card>
          ) : (
            <div className="space-y-3">
              {subscriptions.map(s => {
                const plan = plans.find(p => p.id === s.plan_id);
                return (
                  <Card key={s.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{plan?.name || "Unknown Plan"}</span>
                          <Badge variant="outline" className="capitalize">{s.provider_type}</Badge>
                          <Badge variant={s.status === "active" ? "default" : "secondary"} className="capitalize">{s.status}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Expires: {new Date(s.expires_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
