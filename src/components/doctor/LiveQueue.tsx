import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Users, Hash, ArrowRight, CheckCircle2 } from "lucide-react";

interface LiveQueueProps {
  doctorId: string;
}

export default function LiveQueue({ doctorId }: LiveQueueProps) {
  const [queue, setQueue] = useState<any[]>([]);
  const [currentToken, setCurrentToken] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  const loadQueue = async () => {
    const { data } = await supabase
      .from("appointments")
      .select("id, token_number, status, appointment_time, service_type, patient_id")
      .eq("doctor_id", doctorId)
      .eq("appointment_date", today)
      .in("status", ["confirmed", "completed"])
      .not("token_number", "is", null)
      .order("token_number", { ascending: true });

    const items = data || [];
    setQueue(items);

    // Current token = last completed + 1, or first confirmed
    const completed = items.filter(a => a.status === "completed");
    const confirmed = items.filter(a => a.status === "confirmed");
    if (completed.length > 0) {
      const lastCompleted = Math.max(...completed.map(a => a.token_number));
      setCurrentToken(lastCompleted);
    } else {
      setCurrentToken(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadQueue();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("queue-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `doctor_id=eq.${doctorId}`,
        },
        () => loadQueue()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [doctorId]);

  const callNext = async () => {
    const confirmed = queue.filter(a => a.status === "confirmed").sort((a, b) => a.token_number - b.token_number);
    if (confirmed.length === 0) {
      toast.info("No more patients in queue");
      return;
    }
    const next = confirmed[0];
    // Mark current as "in cabin" by completing the previous or just moving forward
    setCurrentToken(next.token_number);
    toast.success(`Now serving Token #${next.token_number}`);
    logAuditAction({ action: "call_next_patient", entityType: "appointment", entityId: next.id, details: { token: next.token_number } });
  };

  const confirmedQueue = queue.filter(a => a.status === "confirmed");
  const completedQueue = queue.filter(a => a.status === "completed");
  const nextInLine = confirmedQueue.sort((a, b) => a.token_number - b.token_number)[0];

  return (
    <Card className="p-4 border-primary/20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Live Queue — Today
        </h3>
        <Badge variant="outline" className="text-xs">
          {confirmedQueue.length} waiting · {completedQueue.length} done
        </Badge>
      </div>

      {/* Current Token Display */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-primary/10 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Now In Cabin</p>
          <p className="text-3xl font-bold text-primary">
            {currentToken ? `#${currentToken}` : "—"}
          </p>
        </div>
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Next Token</p>
          <p className="text-3xl font-bold text-foreground">
            {nextInLine ? `#${nextInLine.token_number}` : "—"}
          </p>
        </div>
      </div>

      <Button className="w-full mb-3" onClick={callNext} disabled={confirmedQueue.length === 0}>
        <ArrowRight className="w-4 h-4 mr-1" /> Call Next Patient
      </Button>

      {/* Queue List */}
      {queue.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground text-center py-2">No tokens assigned yet</p>
      ) : (
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {queue.map(apt => (
            <div
              key={apt.id}
              className={`flex items-center justify-between text-sm px-3 py-2 rounded-lg ${
                apt.token_number === currentToken
                  ? "bg-primary/10 border border-primary/30"
                  : apt.status === "completed"
                  ? "bg-muted/30 text-muted-foreground"
                  : "bg-background"
              }`}
            >
              <div className="flex items-center gap-2">
                <Hash className="w-3.5 h-3.5" />
                <span className="font-medium">Token {apt.token_number}</span>
                <span className="text-xs text-muted-foreground">· {apt.appointment_time}</span>
              </div>
              {apt.status === "completed" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : apt.token_number === currentToken ? (
                <Badge className="text-xs">In Cabin</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">Waiting</Badge>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
