import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function HospitalDoctors() {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: hospital } = await supabase.from("hospitals").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!hospital) { setLoading(false); return; }
      const { data } = await supabase.from("doctors").select("*").eq("hospital_id", hospital.id);
      setDoctors(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Our Doctors</h1>
      {doctors.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No doctors linked to this hospital</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {doctors.map(doc => (
            <Card key={doc.id} className="p-4">
              <p className="font-semibold text-foreground">{doc.name}</p>
              <p className="text-sm text-muted-foreground">{doc.specialization}</p>
              <p className="text-xs text-muted-foreground mt-1">{doc.phone}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
