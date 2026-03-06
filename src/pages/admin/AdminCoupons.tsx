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
import { Ticket, Plus, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({
    code: "", description: "", discount_type: "percentage", discount_value: 0,
    min_order_amount: 0, max_discount_amount: 0, usage_limit: 0,
    applicable_for: "all", valid_from: "", valid_until: "", is_active: true,
  });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
    setCoupons(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ code: "", description: "", discount_type: "percentage", discount_value: 0, min_order_amount: 0, max_discount_amount: 0, usage_limit: 0, applicable_for: "all", valid_from: "", valid_until: "", is_active: true });
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.code.trim()) { toast.error("Code is required"); return; }
    const payload: any = { ...form, discount_value: Number(form.discount_value), min_order_amount: Number(form.min_order_amount), max_discount_amount: Number(form.max_discount_amount) || null, usage_limit: Number(form.usage_limit) || null, valid_from: form.valid_from || new Date().toISOString(), valid_until: form.valid_until || null };

    if (editing) {
      const { error } = await supabase.from("coupons").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Coupon updated");
    } else {
      const { error } = await supabase.from("coupons").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Coupon created");
    }
    setDialogOpen(false);
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this coupon?")) return;
    await supabase.from("coupons").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  const openEdit = (c: any) => {
    setEditing(c);
    setForm({ code: c.code, description: c.description || "", discount_type: c.discount_type, discount_value: c.discount_value, min_order_amount: c.min_order_amount || 0, max_discount_amount: c.max_discount_amount || 0, usage_limit: c.usage_limit || 0, applicable_for: c.applicable_for, valid_from: c.valid_from?.slice(0, 16) || "", valid_until: c.valid_until?.slice(0, 16) || "", is_active: c.is_active });
    setDialogOpen(true);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Ticket className="w-6 h-6 text-primary" /> Coupons & Promos
        </h1>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" /> Add Coupon</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Coupon</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Code</Label><Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SAVE20" /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Discount Type</Label>
                  <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="percentage">Percentage</SelectItem><SelectItem value="fixed">Fixed Amount</SelectItem></SelectContent>
                  </Select>
                </div>
                <div><Label>Discount Value</Label><Input type="number" value={form.discount_value} onChange={e => setForm(f => ({ ...f, discount_value: +e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Min Order ₹</Label><Input type="number" value={form.min_order_amount} onChange={e => setForm(f => ({ ...f, min_order_amount: +e.target.value }))} /></div>
                <div><Label>Max Discount ₹</Label><Input type="number" value={form.max_discount_amount} onChange={e => setForm(f => ({ ...f, max_discount_amount: +e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Usage Limit</Label><Input type="number" value={form.usage_limit} onChange={e => setForm(f => ({ ...f, usage_limit: +e.target.value }))} placeholder="0 = unlimited" /></div>
                <div><Label>Applicable For</Label>
                  <Select value={form.applicable_for} onValueChange={v => setForm(f => ({ ...f, applicable_for: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="appointments">Appointments</SelectItem><SelectItem value="orders">Orders</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Valid From</Label><Input type="datetime-local" value={form.valid_from} onChange={e => setForm(f => ({ ...f, valid_from: e.target.value }))} /></div>
                <div><Label>Valid Until</Label><Input type="datetime-local" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Active</Label></div>
              <Button className="w-full" onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {coupons.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No coupons yet</p></Card>
      ) : (
        <div className="grid gap-3">
          {coupons.map(c => (
            <Card key={c.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary text-lg">{c.code}</span>
                    <Badge variant={c.is_active ? "default" : "secondary"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                    <Badge variant="outline" className="capitalize">{c.applicable_for}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {c.discount_type === "percentage" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
                    {c.min_order_amount > 0 && ` • Min ₹${c.min_order_amount}`}
                    {c.max_discount_amount > 0 && ` • Max ₹${c.max_discount_amount}`}
                  </p>
                  <p className="text-xs text-muted-foreground">Used: {c.used_count}{c.usage_limit ? `/${c.usage_limit}` : ""} • {c.description || ""}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
