import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";

const columns: ColumnDef[] = [
  { key: "title", label: "Title", editable: true },
  { key: "description", label: "Description", editable: true },
  { key: "icon_name", label: "Icon Name", editable: true },
  { key: "color", label: "Color Class", editable: true },
  { key: "bg_color", label: "BG Color Class", editable: true },
  { key: "sort_order", label: "Order", type: "number", editable: true },
  { key: "active", label: "Active", type: "boolean", editable: true },
];

export default function AdminHealthTips() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("dashboard_health_tips").select("*").order("sort_order");
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <AdminCrudTable
      title="Dashboard Health Tips"
      data={data}
      columns={columns}
      loading={loading}
      onAdd={async (item) => { const { error } = await supabase.from("dashboard_health_tips").insert([item] as any); if (error) throw error; fetchData(); }}
      onUpdate={async (id, item) => { const { error } = await supabase.from("dashboard_health_tips").update(item as never).eq("id", id); if (error) throw error; fetchData(); }}
      onDelete={async (id) => { const { error } = await supabase.from("dashboard_health_tips").delete().eq("id", id); if (error) throw error; fetchData(); }}
    />
  );
}