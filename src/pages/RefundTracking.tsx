import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, IndianRupee } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import BottomNav from "@/components/BottomNav";

type Refund = {
  id: string;
  amount: number;
  reason: string | null;
  status: string;
  admin_notes: string | null;
  processed_at: string | null;
  created_at: string;
  appointment_id: string | null;
  order_id: string | null;
};

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  requested: { icon: Clock, color: "text-warning", bg: "bg-warning/10", label: "Requested" },
  processing: { icon: AlertCircle, color: "text-primary", bg: "bg-primary/10", label: "Processing" },
  completed: { icon: CheckCircle, color: "text-success", bg: "bg-success/10", label: "Completed" },
  rejected: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
};

const RefundTracking = () => {
  const navigate = useNavigate();
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login", { replace: true }); return; }

      const { data } = await supabase
        .from("refunds")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (data) setRefunds(data as Refund[]);
      setLoading(false);
    };
    load();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground">Refund Status</h1>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading refunds...</div>
        ) : refunds.length === 0 ? (
          <div className="text-center py-12">
            <IndianRupee className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No refund requests</p>
            <p className="text-xs text-muted-foreground mt-1">Refund requests will appear here when applicable</p>
          </div>
        ) : (
          refunds.map((refund) => {
            const cfg = statusConfig[refund.status] || statusConfig.requested;
            const Icon = cfg.icon;
            return (
              <div key={refund.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">₹{refund.amount}</p>
                      <p className="text-xs text-muted-foreground">
                        {refund.appointment_id ? "Appointment" : "Order"} Refund
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>

                {refund.reason && (
                  <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2 mb-2">{refund.reason}</p>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Requested: {format(new Date(refund.created_at), "MMM d, yyyy")}</span>
                  {refund.processed_at && (
                    <span>Processed: {format(new Date(refund.processed_at), "MMM d, yyyy")}</span>
                  )}
                </div>

                {refund.admin_notes && (
                  <div className="mt-2 text-xs bg-accent rounded-lg p-2">
                    <span className="font-medium text-foreground">Admin: </span>
                    <span className="text-muted-foreground">{refund.admin_notes}</span>
                  </div>
                )}

                {/* Progress bar */}
                <div className="mt-3 flex gap-1">
                  {["requested", "processing", "completed"].map((step, i) => {
                    const stepOrder = { requested: 0, processing: 1, completed: 2, rejected: -1 };
                    const current = stepOrder[refund.status as keyof typeof stepOrder] ?? 0;
                    const isRejected = refund.status === "rejected";
                    return (
                      <div
                        key={step}
                        className={`flex-1 h-1.5 rounded-full ${
                          isRejected ? "bg-destructive/30" :
                          i <= current ? "bg-primary" : "bg-border"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default RefundTracking;
