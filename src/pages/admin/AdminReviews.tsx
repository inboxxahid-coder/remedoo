import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Star, User, CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export default function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [providerFilter, setProviderFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    let query = supabase.from("reviews").select("*").order("created_at", { ascending: false });
    if (filter !== "all") query = query.eq("status", filter);
    if (providerFilter !== "all") query = query.eq("provider_type", providerFilter);
    const { data } = await query;
    setReviews(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, providerFilter]);

  const updateStatus = async (id: string, status: string, notes?: string) => {
    const { error } = await supabase.from("reviews").update({ status, admin_notes: notes || null } as any).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    toast.success(`Review ${status}`);
    load();
  };

  const statusIcon = (s: string) => {
    if (s === "approved") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (s === "rejected") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusBadge = (s: string) => {
    const v = s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";
    return <Badge variant={v as any} className="capitalize">{s}</Badge>;
  };

  const stats = {
    total: reviews.length,
    approved: reviews.filter(r => r.status === "approved").length,
    pending: reviews.filter(r => r.status === "pending").length,
    rejected: reviews.filter(r => r.status === "rejected").length,
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" /> Review Moderation
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: stats.total, color: "bg-primary/10 text-primary" },
          { label: "Approved", value: stats.approved, color: "bg-emerald-500/10 text-emerald-600" },
          { label: "Pending", value: stats.pending, color: "bg-amber-500/10 text-amber-600" },
          { label: "Rejected", value: stats.rejected, color: "bg-destructive/10 text-destructive" },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className={`text-xs font-medium ${s.color} inline-block px-2 py-0.5 rounded-full mt-1`}>{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            <SelectItem value="doctor">Doctors</SelectItem>
            <SelectItem value="hospital">Hospitals</SelectItem>
            <SelectItem value="lab">Labs</SelectItem>
            <SelectItem value="pharmacy">Pharmacies</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews */}
      {reviews.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No reviews found</p></Card>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} className={`w-4 h-4 ${i < r.rating ? "text-amber-500 fill-amber-500" : "text-muted"}`} />
                      ))}
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">{r.provider_type}</Badge>
                    {statusBadge(r.status)}
                    <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  {r.comment && <p className="text-sm text-foreground mt-1">{r.comment}</p>}
                  <p className="text-xs text-muted-foreground mt-1">Provider: {r.provider_id?.slice(0, 8)}... | User: {r.user_id?.slice(0, 8)}...</p>

                  <div className="flex gap-2 mt-3">
                    {r.status !== "approved" && (
                      <Button size="sm" variant="default" onClick={() => updateStatus(r.id, "approved")}>
                        <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                      </Button>
                    )}
                    {r.status !== "rejected" && (
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(r.id, "rejected")}>
                        <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                      </Button>
                    )}
                    {r.status !== "pending" && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, "pending")}>
                        <Clock className="w-3.5 h-3.5 mr-1" /> Pending
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
