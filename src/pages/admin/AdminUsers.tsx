import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";

const columns: ColumnDef[] = [
  { key: "full_name", label: "Name", editable: false },
  { key: "email", label: "Email", editable: false },
  { key: "phone", label: "Phone", editable: false },
  { key: "language", label: "Language", editable: false },
  { key: "dark_mode", label: "Dark Mode", type: "boolean", editable: false },
  { key: "created_at", label: "Joined", editable: false, render: (val: string) => new Date(val).toLocaleDateString() },
];

export default function AdminUsers() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <AdminCrudTable
      title="Users"
      data={data}
      columns={columns}
      loading={loading}
      canAdd={false}
      onAdd={async () => {}}
      onUpdate={async () => {}}
      onDelete={async () => {}}
    />
  );
}
