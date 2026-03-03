import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";

const columns: ColumnDef[] = [
  { key: "name", label: "Name", editable: true },
  { key: "brand_name", label: "Brand Name", editable: true },
  { key: "generic_name", label: "Generic Name", editable: true },
  { key: "category", label: "Category", editable: true },
  { key: "price", label: "Price", type: "number", editable: true },
  { key: "stock_quantity", label: "Stock", type: "number", editable: true },
  { key: "in_stock", label: "In Stock", type: "boolean", editable: true },
  { key: "requires_prescription", label: "Rx Required", type: "boolean", editable: true },
  { key: "pharmacy_id", label: "Pharmacy ID", editable: true },
];

export default function AdminMedicines() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("medicines").select("*").order("created_at", { ascending: false });
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <AdminCrudTable
      title="Medicines"
      data={data}
      columns={columns}
      loading={loading}
      onAdd={async (item) => { const { error } = await supabase.from("medicines").insert([item] as any); if (error) throw error; fetch(); }}
      onUpdate={async (id, item) => { const { error } = await supabase.from("medicines").update(item).eq("id", id); if (error) throw error; fetch(); }}
      onDelete={async (id) => { const { error } = await supabase.from("medicines").delete().eq("id", id); if (error) throw error; fetch(); }}
    />
  );
}
