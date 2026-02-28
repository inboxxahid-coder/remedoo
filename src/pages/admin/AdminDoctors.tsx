import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";

const columns: ColumnDef[] = [
  { key: "name", label: "Name", editable: true },
  { key: "specialization", label: "Specialization", editable: true },
  { key: "phone", label: "Phone", editable: true },
  { key: "rating", label: "Rating", type: "number", editable: true },
  { key: "consultation_fee", label: "Fee", type: "number", editable: true },
  { key: "bio", label: "Bio", editable: true },
  { key: "image_url", label: "Image URL", editable: true },
];

export default function AdminDoctors() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("doctors").select("*").order("created_at", { ascending: false });
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <AdminCrudTable
      title="Doctors"
      data={data}
      columns={columns}
      loading={loading}
      onAdd={async (item) => { const { error } = await supabase.from("doctors").insert([item] as any); if (error) throw error; fetch(); }}
      onUpdate={async (id, item) => { const { error } = await supabase.from("doctors").update(item).eq("id", id); if (error) throw error; fetch(); }}
      onDelete={async (id) => { const { error } = await supabase.from("doctors").delete().eq("id", id); if (error) throw error; fetch(); }}
    />
  );
}
