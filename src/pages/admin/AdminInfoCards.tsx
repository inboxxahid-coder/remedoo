import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";

const columns: ColumnDef[] = [
  { key: "label", label: "Label", editable: true },
  { key: "icon_name", label: "Icon Name", editable: true },
  { key: "icon_bg", label: "Icon BG Class", editable: true },
  { key: "icon_color", label: "Icon Color Class", editable: true },
  { key: "path", label: "Path", editable: true },
  { key: "sort_order", label: "Order", type: "number", editable: true },
  { key: "active", label: "Active", type: "boolean", editable: true },
];

export default function AdminInfoCards() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("dashboard_info_cards").select("*").order("sort_order");
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <AdminCrudTable
      title="Dashboard Info Cards"
      data={data}
      columns={columns}
      loading={loading}
      onAdd={async (item) => { const { error } = await supabase.from("dashboard_info_cards").insert([item] as any); if (error) throw error; fetchData(); }}
      onUpdate={async (id, item) => { const { error } = await supabase.from("dashboard_info_cards").update(item as never).eq("id", id); if (error) throw error; fetchData(); }}
      onDelete={async (id) => { const { error } = await supabase.from("dashboard_info_cards").delete().eq("id", id); if (error) throw error; fetchData(); }}
    />
  );
}
