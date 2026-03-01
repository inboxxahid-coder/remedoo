import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, TestTube, Home, Utensils, BadgePercent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

const CATEGORIES = ["General", "Blood", "Urine", "Radiology", "Pathology", "Microbiology", "Immunology", "Hormone"];
const SAMPLE_TYPES = ["Blood", "Urine", "Stool", "Swab", "Saliva", "Sputum", "Other"];

type LabTest = Tables<"lab_tests"> & { home_collection_fee?: number };

const emptyForm = {
  name: "",
  category: "General",
  price: 0,
  discount_percent: 0,
  sample_type: "Blood",
  turnaround_time: "24 hours",
  description: "",
  home_collection: true,
  home_collection_fee: 0,
  requires_fasting: false,
  is_popular: false,
};

export default function LabTests() {
  const [labId, setLabId] = useState<string | null>(null);
  const [tests, setTests] = useState<LabTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadTests = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: lab } = await supabase.from("labs").select("id").eq("user_id", session.user.id).maybeSingle();
    if (!lab) { setLoading(false); return; }
    setLabId(lab.id);
    const { data } = await supabase.from("lab_tests").select("*").eq("lab_id", lab.id).order("created_at", { ascending: false });
    setTests((data as LabTest[]) || []);
    setLoading(false);
  };

  useEffect(() => { loadTests(); }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (test: LabTest) => {
    setEditingId(test.id);
    setForm({
      name: test.name,
      category: test.category,
      price: test.price,
      discount_percent: test.discount_percent ?? 0,
      sample_type: test.sample_type ?? "Blood",
      turnaround_time: test.turnaround_time ?? "24 hours",
      description: test.description ?? "",
      home_collection: test.home_collection ?? true,
      home_collection_fee: (test as any).home_collection_fee ?? 0,
      requires_fasting: test.requires_fasting ?? false,
      is_popular: test.is_popular ?? false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!labId) return;
    if (!form.name.trim()) { toast.error("Test name is required"); return; }
    if (form.price <= 0) { toast.error("Price must be greater than 0"); return; }

    setSaving(true);
    const record: any = {
      lab_id: labId,
      name: form.name.trim(),
      category: form.category,
      price: form.price,
      discount_percent: form.discount_percent,
      sample_type: form.sample_type,
      turnaround_time: form.turnaround_time,
      description: form.description || null,
      home_collection: form.home_collection,
      home_collection_fee: form.home_collection ? form.home_collection_fee : 0,
      requires_fasting: form.requires_fasting,
      is_popular: form.is_popular,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("lab_tests").update(record).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("lab_tests").insert(record));
    }

    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Test updated" : "Test added");
    setDialogOpen(false);
    loadTests();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this test?")) return;
    const { error } = await supabase.from("lab_tests").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Test deleted"); loadTests(); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Manage Tests</h1>
        <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" />Add Test</Button>
      </div>

      {tests.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No tests added yet. Click "Add Test" to get started.</p>
      ) : (
        <div className="space-y-3">
          {tests.map(test => (
            <Card key={test.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
                    <TestTube className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{test.name}</p>
                    <p className="text-xs text-muted-foreground">{test.category} · {test.sample_type}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-primary">₹{test.price}</span>
                      {test.discount_percent != null && test.discount_percent > 0 && (
                        <span className="text-xs text-success flex items-center gap-0.5">
                          <BadgePercent className="w-3 h-3" />{test.discount_percent}% off
                        </span>
                      )}
                      {test.home_collection && (
                        <span className="text-xs text-success flex items-center gap-0.5">
                          <Home className="w-3 h-3" />Home +₹{(test as any).home_collection_fee || 0}
                        </span>
                      )}
                      {test.requires_fasting && (
                        <span className="text-xs text-warning flex items-center gap-0.5">
                          <Utensils className="w-3 h-3" />Fasting
                        </span>
                      )}
                      {test.is_popular && <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Popular</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(test)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(test.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Test" : "Add New Test"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Test Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Complete Blood Count" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Sample Type</Label>
                <Select value={form.sample_type} onValueChange={v => setForm(f => ({ ...f, sample_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SAMPLE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (₹) *</Label>
                <Input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Discount %</Label>
                <Input type="number" min={0} max={100} value={form.discount_percent} onChange={e => setForm(f => ({ ...f, discount_percent: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Turnaround Time</Label>
              <Input value={form.turnaround_time} onChange={e => setForm(f => ({ ...f, turnaround_time: e.target.value }))} placeholder="e.g. 24 hours" />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description of the test" />
            </div>

            {/* Home Collection Toggle & Fee */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Home className="w-4 h-4 text-primary" />
                  Home Collection
                </Label>
                <Switch checked={form.home_collection} onCheckedChange={v => setForm(f => ({ ...f, home_collection: v }))} />
              </div>
              {form.home_collection && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Extra Charge for Home Collection (₹)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.home_collection_fee}
                    onChange={e => setForm(f => ({ ...f, home_collection_fee: Number(e.target.value) }))}
                    placeholder="0 for free"
                  />
                  <p className="text-[10px] text-muted-foreground">Set 0 if home collection is free. This amount will be added to test price when patient selects home collection.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Utensils className="w-4 h-4 text-warning" />Requires Fasting
              </Label>
              <Switch checked={form.requires_fasting} onCheckedChange={v => setForm(f => ({ ...f, requires_fasting: v }))} />
            </div>

            <div className="flex items-center justify-between">
              <Label>Mark as Popular</Label>
              <Switch checked={form.is_popular} onCheckedChange={v => setForm(f => ({ ...f, is_popular: v }))} />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : editingId ? "Update Test" : "Add Test"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
