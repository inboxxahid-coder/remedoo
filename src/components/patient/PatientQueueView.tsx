import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Hash, Users, CheckCircle2 } from "lucide-react";

interface PatientQueueViewProps {
  appointmentId: string;
  doctorId: string;
  appointmentDate: string;
}

export default function PatientQueueView({ appointmentId, doctorId, appointmentDate }: PatientQueueViewProps) {
  const [myToken, setMyToken] = useState<number | null>(null);
  const [currentToken, setCurrentToken] = useState<number | null>(null);
  const [totalWaiting, setTotalWaiting] = useState(0);

  const loadQueue = async () => {
    const { data } = await supabase
      .from("appointments")
      .select("id, token_number, status")
      .eq("doctor_id", doctorId)
      .eq("appointment_date", appointmentDate)
      .in("status", ["confirmed", "completed"])
      .not("token_number", "is", null)
      .order("token_number", { ascending: true });

    const items = data || [];
    const mine = items.find(a => a.id === appointmentId);
    setMyToken(mine?.token_number ?? null);

    const completed = items.filter(a => a.status === "completed");
    const confirmed = items.filter(a => a.status === "confirmed");
    setTotalWaiting(confirmed.length);

    if (completed.length > 0) {
      setCurrentToken(Math.max(...completed.map(a => a.token_number)));
    } else {
      setCurrentToken(null);
    }
  };

  useEffect(() => {
    loadQueue();

    const channel = supabase
      .channel(`patient-queue-${appointmentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments", filter: `doctor_id=eq.${doctorId}` },
        () => loadQueue()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [appointmentId, doctorId, appointmentDate]);

  if (!myToken) return null;

  const isMyTurn = currentToken !== null && myToken === currentToken + 1;
  const isDone = currentToken !== null && myToken <= currentToken;
  const position = currentToken !== null ? Math.max(0, myToken - currentToken - 1) : myToken - 1;

  return (
    <div className="mt-2 p-3 rounded-xl bg-muted/50 border border-border">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-semibold text-foreground">Your Token: {myToken}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Now Serving: {currentToken ? `#${currentToken}` : "—"}
          </div>
        </div>
        {isDone ? (
          <Badge variant="secondary" className="text-xs gap-1">
            <CheckCircle2 className="w-3 h-3" /> Done
          </Badge>
        ) : isMyTurn ? (
          <Badge className="text-xs animate-pulse">Your Turn Next!</Badge>
        ) : (
          <Badge variant="outline" className="text-xs">
            {position} ahead of you
          </Badge>
        )}
      </div>
    </div>
  );
}
