import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";

const columns: ColumnDef[] = [
  { key: "title", label: "Title", editable: true },
  { key: "subtitle", label: "Subtitle", editable: true },
  { key: "emoji", label: "Emoji", editable: true },
  { key: "gradient", label: "Gradient Classes", editable: true },
  { key: "target_link", label: "Target Link", editable: true },
  { key: "sort_order", label: "Order", type: "number", editable: true },
  { key: "active", label: "Active", type: "boolean", editable: true },
];

export default function AdminPromoBanners() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("dashboard_promo_banners").select("*").order("sort_order");
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <AdminCrudTable
      title="Dashboard Promo Banners"
      data={data}
      columns={columns}
      loading={loading}
      onAdd={async (item) => { const { error } = await supabase.from("dashboard_promo_banners").insert([item] as any); if (error) throw error; fetchData(); }}
      onUpdate={async (id, item) => { const { error } = await supabase.from("dashboard_promo_banners").update(item).eq("id", id); if (error) throw error; fetchData(); }}
      onDelete={async (id) => { const { error } = await supabase.from("dashboard_promo_banners").delete().eq("id", id); if (error) throw error; fetchData(); }}
    />
  );
}
