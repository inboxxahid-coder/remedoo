import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";
import { Badge } from "@/components/ui/badge";

const columns: ColumnDef[] = [
  { key: "patient_id", label: "Patient ID", editable: false },
  { key: "service_type", label: "Service", editable: false },
  { key: "appointment_date", label: "Date", editable: false },
  { key: "appointment_time", label: "Time", editable: false },
  {
    key: "status", label: "Status", editable: true,
    render: (val: string) => (
      <Badge variant={val === "confirmed" ? "default" : val === "cancelled" ? "destructive" : "secondary"}>
        {val}
      </Badge>
    ),
  },
  { key: "notes", label: "Notes", editable: true },
];

export default function AdminAppointments() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("appointments").select("*").order("appointment_date", { ascending: false });
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <AdminCrudTable
      title="Appointments"
      data={data}
      columns={columns}
      loading={loading}
      canAdd={false}
      onAdd={async () => {}}
      onUpdate={async (id, item) => { const { error } = await supabase.from("appointments").update(item).eq("id", id); if (error) throw error; fetch(); }}
      onDelete={async (id) => { const { error } = await supabase.from("appointments").delete().eq("id", id); if (error) throw error; fetch(); }}
    />
  );
}
