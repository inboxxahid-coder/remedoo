import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";
import { Badge } from "@/components/ui/badge";

const columns: ColumnDef[] = [
  { key: "user_id", label: "User ID", editable: false },
  { key: "subtotal", label: "Subtotal", type: "number", editable: false },
  { key: "total", label: "Total", type: "number", editable: false },
  {
    key: "status", label: "Status", editable: true,
    render: (val: string) => (
      <Badge variant={val === "delivered" ? "default" : val === "cancelled" ? "destructive" : "secondary"}>
        {val}
      </Badge>
    ),
  },
  { key: "payment_status", label: "Payment", editable: true },
  { key: "payment_method", label: "Method", editable: false },
  { key: "delivery_address", label: "Address", editable: false },
  { key: "placed_at", label: "Placed At", editable: false },
];

export default function AdminOrders() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("orders").select("*").order("placed_at", { ascending: false });
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <AdminCrudTable
      title="Orders"
      data={data}
      columns={columns}
      loading={loading}
      canAdd={false}
      onAdd={async () => {}}
      onUpdate={async (id, item) => { const { error } = await supabase.from("orders").update(item).eq("id", id); if (error) throw error; fetch(); }}
      onDelete={async (id) => { const { error } = await supabase.from("orders").delete().eq("id", id); if (error) throw error; fetch(); }}
    />
  );
}
