import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";

const columns: ColumnDef[] = [
  { key: "title", label: "Title", editable: true },
  { key: "type", label: "Type", editable: true },
  { key: "content_url", label: "Content URL", editable: true },
  { key: "target_link", label: "Target Link", editable: true },
  { key: "placement", label: "Placement", editable: true },
  { key: "active", label: "Active", type: "boolean", editable: true },
];

export default function AdminAds() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("ads").select("*").order("created_at", { ascending: false });
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <AdminCrudTable
      title="Ads"
      data={data}
      columns={columns}
      loading={loading}
      onAdd={async (item) => { const { error } = await supabase.from("ads").insert([item] as any); if (error) throw error; fetch(); }}
      onUpdate={async (id, item) => { const { error } = await supabase.from("ads").update(item).eq("id", id); if (error) throw error; fetch(); }}
      onDelete={async (id) => { const { error } = await supabase.from("ads").delete().eq("id", id); if (error) throw error; fetch(); }}
    />
  );
}
