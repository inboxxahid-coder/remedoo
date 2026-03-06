import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, Plus, Loader2, Search, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  name: string;
  generic_name: string | null;
  category: string;
  price: number;
  mrp: number | null;
  stock_quantity: number;
  batch_number: string | null;
  expiry_date: string | null;
  supplier_name: string | null;
  requires_prescription: boolean;
  discount_percent: number | null;
  is_active: boolean;
}

const EMPTY: Partial<InventoryItem> = {
  name: "", generic_name: "", category: "General", price: 0, mrp: 0,
  stock_quantity: 0, batch_number: "", expiry_date: "", supplier_name: "",
  requires_prescription: false, discount_percent: 0, is_active: true,
};

export default function AdminRemedooInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    setSaving(true);
    if (editing.id) {
      const { error } = await supabase.from("remedoo_pharmacy_inventory").update(editing as any).eq("id", editing.id);
      if (error) toast.error(error.message); else toast.success("Item updated");
    } else {
      const { error } = await supabase.from("remedoo_pharmacy_inventory").insert(editing as any);
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

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
  const lowStock = items.filter(i => i.stock_quantity <= 10 && i.is_active);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10"><Package className="w-6 h-6 text-primary" /></div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Remedoo Pharmacy Inventory</h1>
            <p className="text-sm text-muted-foreground">{items.length} medicines in stock</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(EMPTY)} className="gap-2"><Plus className="w-4 h-4" /> Add Medicine</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing.id ? "Edit Medicine" : "Add Medicine"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {([
                ["name", "Medicine Name", "text"],
                ["generic_name", "Generic Name", "text"],
                ["category", "Category", "text"],
                ["price", "Selling Price (₹)", "number"],
                ["mrp", "MRP (₹)", "number"],
                ["stock_quantity", "Stock Quantity", "number"],
                ["batch_number", "Batch Number", "text"],
                ["expiry_date", "Expiry Date", "date"],
                ["supplier_name", "Supplier Name", "text"],
                ["discount_percent", "Discount %", "number"],
              ] as [string, string, string][]).map(([key, label, type]) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <Input
                    type={type}
                    value={(editing as any)[key] ?? ""}
                    onChange={e => setEditing(prev => ({ ...prev, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                  />
                </div>
              ))}
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

      {lowStock.length > 0 && (
        <Card className="p-4 mb-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{lowStock.length} items with low stock (≤10 units)</span>
          </div>
        </Card>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search medicines..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="space-y-2">
        {filtered.map(item => (
          <Card key={item.id} className="p-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-foreground truncate">{item.name}</p>
                {item.requires_prescription && <Badge variant="outline" className="text-[10px]">Rx</Badge>}
                {!item.is_active && <Badge variant="secondary" className="text-[10px]">Inactive</Badge>}
                {item.stock_quantity <= 10 && <Badge variant="destructive" className="text-[10px]">Low Stock</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{item.category} • ₹{item.price} • Stock: {item.stock_quantity}</p>
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
