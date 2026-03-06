import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Plus, Loader2, Search, AlertTriangle, Calendar, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const CATEGORIES = [
  "Pain Relief", "Antibiotics", "Diabetes", "Heart & BP", "Vitamins & Supplements",
  "Skin Care", "Eye Care", "Digestive", "Respiratory", "Personal Care", "General", "Other",
];

const DRUG_CATEGORIES = [
  { value: "otc", label: "OTC (Over-the-Counter)" },
  { value: "prescription", label: "Prescription Only" },
  { value: "schedule_h", label: "Schedule H" },
  { value: "schedule_h1", label: "Schedule H1" },
  { value: "schedule_x", label: "Schedule X" },
];

interface InventoryItem {
  id: string;
  name: string;
  brand_name: string | null;
  generic_name: string | null;
  category: string;
  price: number;
  mrp: number | null;
  stock_quantity: number;
  batch_number: string | null;
  expiry_date: string | null;
  manufacturing_date: string | null;
  supplier_name: string | null;
  manufacturer: string | null;
  requires_prescription: boolean;
  discount_percent: number | null;
  is_active: boolean;
  description: string | null;
  dosage_info: string | null;
  side_effects: string | null;
  usage_instructions: string | null;
  drug_category: string | null;
  low_stock_threshold: number | null;
  image_url: string | null;
}

const EMPTY: Partial<InventoryItem> = {
  name: "", brand_name: "", generic_name: "", category: "General", price: 0, mrp: 0,
  stock_quantity: 0, batch_number: "", expiry_date: "", manufacturing_date: "",
  supplier_name: "", manufacturer: "", requires_prescription: false,
  discount_percent: 0, is_active: true, description: "", dosage_info: "",
  side_effects: "", usage_instructions: "", drug_category: "otc",
  low_stock_threshold: 10, image_url: "",
};

export default function AdminRemedooInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<InventoryItem>>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("remedoo_pharmacy_inventory").select("*").order("name");
    setItems((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (!editing.name?.trim()) { toast.error("Medicine name is required"); return; }
    setSaving(true);
    const record = { ...editing };
    if (!record.expiry_date) record.expiry_date = null;
    if (!record.manufacturing_date) record.manufacturing_date = null;

    if (editing.id) {
      const { error } = await supabase.from("remedoo_pharmacy_inventory").update(record as any).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Item updated");
    } else {
      const { error } = await supabase.from("remedoo_pharmacy_inventory").insert(record as any);
      if (error) toast.error(error.message); else toast.success("Item added");
    }
    setSaving(false);
    setDialogOpen(false);
    setEditing(EMPTY);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await supabase.from("remedoo_pharmacy_inventory").delete().eq("id", id);
    toast.success("Deleted");
    load();
  };

  const isExpired = (d: string | null) => d ? new Date(d) < new Date() : false;
  const isExpiringSoon = (d: string | null) => d ? new Date(d) <= new Date(Date.now() + 90 * 86400000) && !isExpired(d) : false;
  const isLowStock = (item: InventoryItem) => item.stock_quantity > 0 && item.stock_quantity <= (item.low_stock_threshold || 10);

  const filtered = items.filter(i => {
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.generic_name?.toLowerCase().includes(search.toLowerCase()) ||
      i.brand_name?.toLowerCase().includes(search.toLowerCase());
    if (filter === "low_stock") return matchSearch && isLowStock(i);
    if (filter === "expired") return matchSearch && isExpired(i.expiry_date);
    if (filter === "expiring") return matchSearch && isExpiringSoon(i.expiry_date);
    if (filter === "out") return matchSearch && (i.stock_quantity === 0 || !i.is_active);
    if (filter === "rx") return matchSearch && i.requires_prescription;
    return matchSearch;
  });

  const lowStockCount = items.filter(isLowStock).length;
  const expiredCount = items.filter(i => isExpired(i.expiry_date)).length;
  const expiringCount = items.filter(i => isExpiringSoon(i.expiry_date)).length;

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10"><Package className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Remedoo Pharmacy Inventory</h1>
            <p className="text-sm text-muted-foreground">{items.length} medicines • {items.filter(i => i.is_active).length} active</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(EMPTY)} className="gap-2"><Plus className="w-4 h-4" /> Add Medicine</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Medicine Name *</Label>
                  <Input value={editing.name ?? ""} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} /></div>
                <div><Label className="text-xs">Brand Name</Label>
                  <Input value={editing.brand_name ?? ""} onChange={e => setEditing(p => ({ ...p, brand_name: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Generic Name</Label>
                  <Input value={editing.generic_name ?? ""} onChange={e => setEditing(p => ({ ...p, generic_name: e.target.value }))} placeholder="e.g. Paracetamol" /></div>
                <div><Label className="text-xs">Manufacturer</Label>
                  <Input value={editing.manufacturer ?? ""} onChange={e => setEditing(p => ({ ...p, manufacturer: e.target.value }))} /></div>
              </div>

              {/* Category & Classification */}
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Category</Label>
                  <Select value={editing.category || "General"} onValueChange={v => setEditing(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label className="text-xs">Drug Classification</Label>
                  <Select value={editing.drug_category || "otc"} onValueChange={v => setEditing(p => ({ ...p, drug_category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DRUG_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                  </Select></div>
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Selling Price (₹)</Label>
                  <Input type="number" value={editing.price ?? 0} onChange={e => setEditing(p => ({ ...p, price: Number(e.target.value) }))} /></div>
                <div><Label className="text-xs">MRP (₹)</Label>
                  <Input type="number" value={editing.mrp ?? 0} onChange={e => setEditing(p => ({ ...p, mrp: Number(e.target.value) }))} /></div>
                <div><Label className="text-xs">Discount %</Label>
                  <Input type="number" value={editing.discount_percent ?? 0} onChange={e => setEditing(p => ({ ...p, discount_percent: Number(e.target.value) }))} /></div>
              </div>

              {/* Stock & Batch */}
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Stock Qty</Label>
                  <Input type="number" value={editing.stock_quantity ?? 0} onChange={e => setEditing(p => ({ ...p, stock_quantity: Number(e.target.value) }))} /></div>
                <div><Label className="text-xs">Low Stock Alert At</Label>
                  <Input type="number" value={editing.low_stock_threshold ?? 10} onChange={e => setEditing(p => ({ ...p, low_stock_threshold: Number(e.target.value) }))} /></div>
                <div><Label className="text-xs">Batch Number</Label>
                  <Input value={editing.batch_number ?? ""} onChange={e => setEditing(p => ({ ...p, batch_number: e.target.value }))} /></div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Manufacturing Date</Label>
                  <Input type="date" value={editing.manufacturing_date ?? ""} onChange={e => setEditing(p => ({ ...p, manufacturing_date: e.target.value }))} /></div>
                <div><Label className="text-xs">Expiry Date</Label>
                  <Input type="date" value={editing.expiry_date ?? ""} onChange={e => setEditing(p => ({ ...p, expiry_date: e.target.value }))} /></div>
              </div>

              {/* Supplier */}
              <div><Label className="text-xs">Supplier Name</Label>
                <Input value={editing.supplier_name ?? ""} onChange={e => setEditing(p => ({ ...p, supplier_name: e.target.value }))} /></div>

              {/* Description & Medical Info */}
              <div><Label className="text-xs">Description</Label>
                <Textarea value={editing.description ?? ""} onChange={e => setEditing(p => ({ ...p, description: e.target.value }))} placeholder="Short description of the medicine" /></div>
              <div><Label className="text-xs">Dosage Information</Label>
                <Textarea value={editing.dosage_info ?? ""} onChange={e => setEditing(p => ({ ...p, dosage_info: e.target.value }))} placeholder="e.g. 1 tablet twice daily after meals" /></div>
              <div><Label className="text-xs">Side Effects</Label>
                <Textarea value={editing.side_effects ?? ""} onChange={e => setEditing(p => ({ ...p, side_effects: e.target.value }))} placeholder="e.g. Drowsiness, nausea" /></div>
              <div><Label className="text-xs">Usage Instructions</Label>
                <Textarea value={editing.usage_instructions ?? ""} onChange={e => setEditing(p => ({ ...p, usage_instructions: e.target.value }))} placeholder="e.g. Take with water, avoid alcohol" /></div>

              {/* Image URL */}
              <div><Label className="text-xs">Image URL</Label>
                <Input value={editing.image_url ?? ""} onChange={e => setEditing(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." /></div>

              {/* Toggles */}
              <div className="flex items-center justify-between">
                <Label>Requires Prescription</Label>
                <Switch checked={editing.requires_prescription} onCheckedChange={v => setEditing(p => ({ ...p, requires_prescription: v }))} />
              </div>
              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch checked={editing.is_active} onCheckedChange={v => setEditing(p => ({ ...p, is_active: v }))} />
              </div>

              <Button onClick={handleSave} disabled={saving || !editing.name} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editing.id ? "Update" : "Add"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts */}
      <div className="flex gap-3 flex-wrap mb-4">
        {expiredCount > 0 && (
          <Card className="p-3 border-destructive/50 bg-destructive/5 flex items-center gap-2 cursor-pointer" onClick={() => setFilter("expired")}>
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-sm font-medium text-foreground">{expiredCount} EXPIRED — Remove from sale</span>
          </Card>
        )}
        {expiringCount > 0 && (
          <Card className="p-3 border-amber-500/30 bg-amber-500/5 flex items-center gap-2 cursor-pointer" onClick={() => setFilter("expiring")}>
            <Calendar className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-foreground">{expiringCount} expiring within 90 days</span>
          </Card>
        )}
        {lowStockCount > 0 && (
          <Card className="p-3 border-amber-500/30 bg-amber-500/5 flex items-center gap-2 cursor-pointer" onClick={() => setFilter("low_stock")}>
            <Package className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-foreground">{lowStockCount} low stock items</span>
          </Card>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {[
          { key: "all", label: "All" },
          { key: "low_stock", label: `Low Stock (${lowStockCount})` },
          { key: "out", label: "Out of Stock" },
          { key: "expired", label: `Expired (${expiredCount})` },
          { key: "expiring", label: `Expiring (${expiringCount})` },
          { key: "rx", label: "Rx Only" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-all ${
              filter === f.key ? "bg-foreground text-background" : "bg-card border border-border text-foreground"
            }`}>{f.label}</button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search by name, brand, or generic name..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-2">
        {filtered.map(item => (
          <Card key={item.id} className={`p-4 flex items-center justify-between gap-3 ${isExpired(item.expiry_date) ? "border-destructive/50 bg-destructive/5" : ""}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                {item.brand_name && <span className="text-xs text-primary font-medium">{item.brand_name}</span>}
                {item.requires_prescription && <Badge variant="outline" className="text-[10px]">Rx</Badge>}
                {!item.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                {isExpired(item.expiry_date) && <Badge variant="destructive" className="text-[10px]">EXPIRED</Badge>}
                {isExpiringSoon(item.expiry_date) && <Badge className="text-[10px] bg-amber-100 text-amber-800">Expiring Soon</Badge>}
                {isLowStock(item) && <Badge className="text-[10px] bg-amber-100 text-amber-800">Low Stock</Badge>}
                {item.stock_quantity === 0 && <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {item.category} • ₹{item.price}{item.mrp && item.mrp > item.price ? ` (MRP: ₹${item.mrp})` : ""} • Stock: {item.stock_quantity}
                {item.drug_category && ` • ${item.drug_category.toUpperCase()}`}
              </p>
              {item.generic_name && <p className="text-xs text-muted-foreground">Generic: {item.generic_name}</p>}
              {item.manufacturer && <p className="text-xs text-muted-foreground">Mfr: {item.manufacturer}</p>}
              {item.expiry_date && <p className="text-xs text-muted-foreground">Exp: {item.expiry_date} {item.batch_number ? `• Batch: ${item.batch_number}` : ""}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={() => { setEditing(item); setDialogOpen(true); }}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>Delete</Button>
            </div>
          </Card>
        ))}
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-10">No medicines found</p>}
      </div>
    </div>
  );
}
