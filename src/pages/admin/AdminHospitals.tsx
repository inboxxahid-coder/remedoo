import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";
import AdminProviderAddForm from "@/components/admin/AdminProviderAddForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const columns: ColumnDef[] = [
  { key: "name", label: "Name", editable: true },
  { key: "location", label: "Location", editable: true },
  { key: "phone", label: "Phone", editable: true },
  { key: "rating", label: "Rating", type: "number", editable: true },
  { key: "beds", label: "Beds", type: "number", editable: true },
  { key: "icu_available", label: "ICU", type: "boolean", editable: true },
  { key: "image_url", label: "Image URL", editable: true },
];

export default function AdminHospitals() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const fetch = async () => {
    setLoading(true);
    const { data } = await supabase.from("hospitals").select("*").order("created_at", { ascending: false });
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  return (
    <>
      <AdminCrudTable
        title="Hospitals"
        data={data}
        columns={columns}
        loading={loading}
        customAddButton={
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add New</span><span className="sm:hidden">Add</span>
          </Button>
        }
        onAdd={async () => {}}
        onUpdate={async (id, item) => { const { error } = await supabase.from("hospitals").update(item).eq("id", id); if (error) throw error; fetch(); }}
        onDelete={async (id) => { const { error } = await supabase.from("hospitals").delete().eq("id", id); if (error) throw error; fetch(); }}
      />
      <AdminProviderAddForm type="hospital" open={addOpen} onOpenChange={setAddOpen} onSuccess={fetch} />
    </>
  );
}
