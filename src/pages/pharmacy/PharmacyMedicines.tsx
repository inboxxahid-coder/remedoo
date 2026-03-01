import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export default function PharmacyMedicines() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: pharmacy } = await supabase.from("pharmacies").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!pharmacy) { setLoading(false); return; }
      const { data } = await supabase.from("medicines").select("*").eq("pharmacy_id", pharmacy.id).order("name");
      setMedicines(data || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Medicines</h1>
      {medicines.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No medicines listed</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {medicines.map(med => (
            <Card key={med.id} className="p-4">
              <p className="font-semibold text-foreground">{med.name}</p>
              <p className="text-sm text-muted-foreground">{med.category} • ₹{med.price}</p>
              <div className="flex gap-2 mt-2">
                <Badge variant={med.in_stock ? "default" : "destructive"}>{med.in_stock ? "In Stock" : "Out of Stock"}</Badge>
                {med.requires_prescription && <Badge variant="secondary">Rx</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
