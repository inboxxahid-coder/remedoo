import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Star, User } from "lucide-react";

export default function PharmacyReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: pharmacy } = await supabase.from("pharmacies").select("id").eq("user_id", session.user.id).maybeSingle();
      if (!pharmacy) { setLoading(false); return; }
      const { data } = await supabase.from("reviews").select("*").eq("provider_id", pharmacy.id).eq("provider_type", "pharmacy").order("created_at", { ascending: false });
      setReviews(data || []);
      setLoading(false);
    };
    load();
  }, []);

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "0";
  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Star className="w-6 h-6 text-amber-500" /> Customer Reviews</h1>
        <div className="flex items-center gap-2"><Badge variant="outline" className="text-lg px-3 py-1">⭐ {avgRating}</Badge><Badge variant="secondary">{reviews.length} reviews</Badge></div>
      </div>
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-foreground mb-3">Rating Distribution</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map(star => {
            const count = reviews.filter(r => r.rating === star).length;
            const pct = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            return (<div key={star} className="flex items-center gap-2"><span className="text-sm text-muted-foreground w-4">{star}</span><Star className="w-3.5 h-3.5 text-amber-500" /><div className="flex-1 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} /></div><span className="text-xs text-muted-foreground w-6">{count}</span></div>);
          })}
        </div>
      </Card>
      {reviews.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No reviews yet</p></Card>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><User className="w-5 h-5 text-muted-foreground" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex">{Array.from({ length: 5 }, (_, i) => (<Star key={i} className={`w-4 h-4 ${i < r.rating ? "text-amber-500 fill-amber-500" : "text-muted"}`} />))}</div>
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="text-sm text-foreground mt-1">{r.comment}</p>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
