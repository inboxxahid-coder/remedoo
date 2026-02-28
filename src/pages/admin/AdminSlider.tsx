import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";

const columns: ColumnDef[] = [
  { key: "title", label: "Title", editable: true },
  { key: "description", label: "Description", editable: true },
  { key: "url", label: "Media URL", editable: true },
  { key: "type", label: "Type", editable: true },
  { key: "target_link", label: "Target Link", editable: true },
  { key: "sort_order", label: "Order", type: "number", editable: true },
  { key: "active", label: "Active", type: "boolean", editable: true },
];

export default function AdminSlider() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("slider_media").select("*").order("sort_order");
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <AdminCrudTable
      title="Slider Media"
      data={data}
      columns={columns}
      loading={loading}
      onAdd={async (item) => { const { error } = await supabase.from("slider_media").insert([item] as any); if (error) throw error; fetch(); }}
      onUpdate={async (id, item) => { const { error } = await supabase.from("slider_media").update(item).eq("id", id); if (error) throw error; fetch(); }}
      onDelete={async (id) => { const { error } = await supabase.from("slider_media").delete().eq("id", id); if (error) throw error; fetch(); }}
    />
  );
}
