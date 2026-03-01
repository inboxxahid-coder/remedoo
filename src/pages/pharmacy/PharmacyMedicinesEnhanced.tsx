import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/exportCsv";
import {
  Pill, Search, Plus, Pencil, Trash2, AlertTriangle, Calendar, Hash, Download, Filter
} from "lucide-react";

export default function PharmacyMedicinesEnhanced() {
  const [pharmacyId, setPharmacyId] = useState<string | null>(null);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", generic_name: "", category: "General", price: 0, discount_percent: 0,
    description: "", unit: "strip", requires_prescription: false, in_stock: true,
    stock_quantity: 0, batch_number: "", expiry_date: "", low_stock_threshold: 10,
    manufacturer: "", image_url: "",
  });

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: pharmacy } = await supabase.from("pharmacies").select("id").eq("user_id", session.user.id).maybeSingle();
    if (!pharmacy) { setLoading(false); return; }
    setPharmacyId(pharmacy.id);
    const { data } = await supabase.from("medicines").select("*").eq("pharmacy_id", pharmacy.id).order("name");
    setMedicines(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = medicines.filter(m => {
    const matchSearch = !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.generic_name?.toLowerCase().includes(search.toLowerCase());
    const matchStock = stockFilter === "all" ||
      (stockFilter === "low" && m.stock_quantity <= (m.low_stock_threshold || 10) && m.stock_quantity > 0) ||
      (stockFilter === "out" && (!m.in_stock || m.stock_quantity === 0)) ||
      (stockFilter === "expiring" && m.expiry_date && new Date(m.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    return matchSearch && matchStock;
  });

  const lowStockCount = medicines.filter(m => m.stock_quantity > 0 && m.stock_quantity <= (m.low_stock_threshold || 10)).length;
  const expiringCount = medicines.filter(m => m.expiry_date && new Date(m.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)).length;
  const outOfStockCount = medicines.filter(m => !m.in_stock || m.stock_quantity === 0).length;

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", generic_name: "", category: "General", price: 0, discount_percent: 0, description: "", unit: "strip", requires_prescription: false, in_stock: true, stock_quantity: 0, batch_number: "", expiry_date: "", low_stock_threshold: 10, manufacturer: "", image_url: "" });
    setDialogOpen(true);
  };

  const openEdit = (med: any) => {
    setEditingId(med.id);
    setForm({
      name: med.name, generic_name: med.generic_name || "", category: med.category, price: med.price,
      discount_percent: med.discount_percent || 0, description: med.description || "", unit: med.unit || "strip",
      requires_prescription: med.requires_prescription || false, in_stock: med.in_stock ?? true,
      stock_quantity: med.stock_quantity || 0, batch_number: med.batch_number || "",
      expiry_date: med.expiry_date || "", low_stock_threshold: med.low_stock_threshold || 10,
      manufacturer: med.manufacturer || "", image_url: med.image_url || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!pharmacyId || !form.name.trim()) { toast.error("Medicine name is required"); return; }
    setSaving(true);
    const record: any = { ...form, pharmacy_id: pharmacyId, expiry_date: form.expiry_date || null };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("medicines").update(record).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("medicines").insert(record));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Medicine updated" : "Medicine added");
    setDialogOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this medicine?")) return;
    const { error } = await supabase.from("medicines").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Deleted"); load(); }
  };

  const handleExport = () => {
    exportToCsv("medicines_inventory", medicines.map(m => ({
      Name: m.name, Generic: m.generic_name || "", Category: m.category,
      Price: `₹${m.price}`, Stock: m.stock_quantity, Batch: m.batch_number || "",
      Expiry: m.expiry_date || "", InStock: m.in_stock ? "Yes" : "No",
    })));
  };

  const isExpiringSoon = (date: string) => date && new Date(date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const isExpired = (date: string) => date && new Date(date) < new Date();

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground">Medicines Inventory</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4 mr-1" /> Export</Button>
          <Button size="sm" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Medicine</Button>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockCount > 0 || expiringCount > 0) && (
        <div className="flex gap-3 flex-wrap">
          {lowStockCount > 0 && (
            <Card className="p-3 border-amber-500/50 bg-amber-500/5 flex items-center gap-2 cursor-pointer" onClick={() => setStockFilter("low")}>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium text-foreground">{lowStockCount} low stock items</span>
            </Card>
          )}
          {expiringCount > 0 && (
            <Card className="p-3 border-destructive/50 bg-destructive/5 flex items-center gap-2 cursor-pointer" onClick={() => setStockFilter("expiring")}>
              <Calendar className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-foreground">{expiringCount} expiring within 30 days</span>
            </Card>
          )}
          {outOfStockCount > 0 && (
            <Card className="p-3 border-muted flex items-center gap-2 cursor-pointer" onClick={() => setStockFilter("out")}>
              <Pill className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{outOfStockCount} out of stock</span>
            </Card>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search medicines..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={stockFilter} onValueChange={setStockFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({medicines.length})</SelectItem>
            <SelectItem value="low">Low Stock ({lowStockCount})</SelectItem>
            <SelectItem value="out">Out of Stock ({outOfStockCount})</SelectItem>
            <SelectItem value="expiring">Expiring Soon ({expiringCount})</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No medicines found</p></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(med => (
            <Card key={med.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{med.name}</p>
                  {med.generic_name && <p className="text-xs text-muted-foreground">{med.generic_name}</p>}
                  <p className="text-sm text-primary font-bold mt-1">₹{med.price}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant={med.in_stock && med.stock_quantity > 0 ? "default" : "destructive"}>
                      {med.in_stock && med.stock_quantity > 0 ? `Stock: ${med.stock_quantity}` : "Out"}
                    </Badge>
                    {med.stock_quantity > 0 && med.stock_quantity <= (med.low_stock_threshold || 10) && (
                      <Badge variant="outline" className="text-amber-500 border-amber-500/50 text-xs">Low</Badge>
                    )}
                    {med.requires_prescription && <Badge variant="secondary" className="text-xs">Rx</Badge>}
                  </div>
                  {med.batch_number && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> Batch: {med.batch_number}
                    </p>
                  )}
                  {med.expiry_date && (
                    <p className={`text-xs mt-0.5 flex items-center gap-1 ${isExpired(med.expiry_date) ? "text-destructive" : isExpiringSoon(med.expiry_date) ? "text-amber-500" : "text-muted-foreground"}`}>
                      <Calendar className="w-3 h-3" />
                      Exp: {med.expiry_date}
                      {isExpired(med.expiry_date) && " (EXPIRED)"}
                      {!isExpired(med.expiry_date) && isExpiringSoon(med.expiry_date) && " (Soon)"}
                    </p>
                  )}
                  {med.manufacturer && <p className="text-xs text-muted-foreground mt-0.5">Mfr: {med.manufacturer}</p>}
                </div>
                <div className="flex flex-col gap-1">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(med)}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(med.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Generic Name</Label>
                <Input value={form.generic_name} onChange={e => setForm(f => ({ ...f, generic_name: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Price (₹)</Label>
                <Input type="number" min={0} value={form.price} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Stock Qty</Label>
                <Input type="number" min={0} value={form.stock_quantity} onChange={e => setForm(f => ({ ...f, stock_quantity: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Low Stock Alert</Label>
                <Input type="number" min={0} value={form.low_stock_threshold} onChange={e => setForm(f => ({ ...f, low_stock_threshold: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Batch Number</Label>
                <Input value={form.batch_number} onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))} placeholder="e.g. BN-2026-001" />
              </div>
              <div className="space-y-1.5">
                <Label>Expiry Date</Label>
                <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Manufacturer</Label>
                <Input value={form.manufacturer} onChange={e => setForm(f => ({ ...f, manufacturer: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["General", "Antibiotics", "Pain Relief", "Vitamins", "Cardiac", "Diabetes", "Skin Care", "Eye Care", "Other"].map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Requires Prescription</Label>
              <Switch checked={form.requires_prescription} onCheckedChange={v => setForm(f => ({ ...f, requires_prescription: v }))} />
            </div>
            <div className="flex items-center justify-between">
              <Label>In Stock</Label>
              <Switch checked={form.in_stock} onCheckedChange={v => setForm(f => ({ ...f, in_stock: v }))} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving..." : editingId ? "Update" : "Add Medicine"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
