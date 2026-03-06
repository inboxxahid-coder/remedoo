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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Briefcase, Plus, Trash2, Edit, IndianRupee, Users } from "lucide-react";

export default function AdminCorporatePlans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    company_name: "", contact_email: "", contact_phone: "",
    plan_type: "basic", max_employees: 50, monthly_price: 0,
    services_included: "consultations, checkups, emergency",
    is_active: true, start_date: "", end_date: "",
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("corporate_plans").select("*").order("created_at", { ascending: false });
    setPlans(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ company_name: "", contact_email: "", contact_phone: "", plan_type: "basic", max_employees: 50, monthly_price: 0, services_included: "consultations, checkups, emergency", is_active: true, start_date: "", end_date: "" });
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) { toast.error("Company name required"); return; }
    let servicesJson: string[];
    try { servicesJson = JSON.parse(form.services_included); } catch { servicesJson = form.services_included.split(",").map(s => s.trim()).filter(Boolean); }

    const payload = {
      company_name: form.company_name, contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null, plan_type: form.plan_type,
      max_employees: Number(form.max_employees), monthly_price: Number(form.monthly_price),
      services_included: servicesJson, is_active: form.is_active,
      start_date: form.start_date || null, end_date: form.end_date || null,
    };

    if (editing) {
      const { error } = await supabase.from("corporate_plans").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Updated");
    } else {
      const { error } = await supabase.from("corporate_plans").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Created");
    }
    setDialogOpen(false); resetForm(); load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete?")) return;
    await supabase.from("corporate_plans").delete().eq("id", id);
    toast.success("Deleted"); load();
  };

  const openEdit = (p: any) => {
    setEditing(p);
    setForm({
      company_name: p.company_name, contact_email: p.contact_email || "",
      contact_phone: p.contact_phone || "", plan_type: p.plan_type,
      max_employees: p.max_employees, monthly_price: p.monthly_price,
      services_included: Array.isArray(p.services_included) ? p.services_included.join(", ") : "",
      is_active: p.is_active, start_date: p.start_date || "", end_date: p.end_date || "",
    });
    setDialogOpen(true);
  };

  const planColor = (t: string) => t === "enterprise" ? "text-amber-500" : t === "premium" ? "text-purple-500" : "text-blue-500";

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary" /> Corporate Health Plans
        </h1>
        <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-1" /> Add Plan</Button></DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Corporate Plan</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Company Name</Label><Input value={form.company_name} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Email</Label><Input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} /></div>
                <div><Label>Phone</Label><Input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Plan Type</Label>
                  <Select value={form.plan_type} onValueChange={v => setForm(f => ({ ...f, plan_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Max Employees</Label><Input type="number" value={form.max_employees} onChange={e => setForm(f => ({ ...f, max_employees: Number(e.target.value) }))} /></div>
                <div><Label>Monthly ₹</Label><Input type="number" value={form.monthly_price} onChange={e => setForm(f => ({ ...f, monthly_price: Number(e.target.value) }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
                <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
              </div>
              <div><Label>Services (comma separated)</Label><Textarea value={form.services_included} onChange={e => setForm(f => ({ ...f, services_included: e.target.value }))} /></div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
              <Button onClick={handleSave} className="w-full">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{plans.length}</p><p className="text-xs text-muted-foreground">Total Plans</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-primary">{plans.filter(p => p.is_active).length}</p><p className="text-xs text-muted-foreground">Active</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-foreground">{plans.reduce((s, p) => s + (p.max_employees || 0), 0)}</p><p className="text-xs text-muted-foreground">Total Employees</p></Card>
        <Card className="p-4 text-center"><p className="text-2xl font-bold text-foreground">₹{plans.filter(p => p.is_active).reduce((s, p) => s + Number(p.monthly_price || 0), 0).toLocaleString()}</p><p className="text-xs text-muted-foreground">Monthly Revenue</p></Card>
      </div>

      <div className="space-y-3">
        {plans.map(p => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{p.company_name}</h3>
                  <Badge className={`${planColor(p.plan_type)} capitalize`} variant="outline">{p.plan_type}</Badge>
                  <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{p.max_employees} employees</span>
                  <span className="flex items-center gap-1"><IndianRupee className="w-3 h-3" />{Number(p.monthly_price).toLocaleString()}/mo</span>
                  {p.contact_email && <span>{p.contact_email}</span>}
                </div>
                {Array.isArray(p.services_included) && (
                  <div className="flex flex-wrap gap-1 mt-1">{p.services_included.map((s: string, i: number) => <Badge key={i} variant="outline" className="text-xs capitalize">{s}</Badge>)}</div>
                )}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="w-4 h-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
              </div>
            </div>
          </Card>
        ))}
        {plans.length === 0 && <Card className="p-8 text-center"><p className="text-muted-foreground">No corporate plans yet</p></Card>}
      </div>
    </div>
  );
}
