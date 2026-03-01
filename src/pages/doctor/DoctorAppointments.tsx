import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Filter, CalendarCheck } from "lucide-react";

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (!doctor) { setLoading(false); return; }

    const { data } = await supabase
      .from("appointments")
      .select("*")
      .eq("doctor_id", doctor.id)
      .order("appointment_date", { ascending: false });

    setAppointments(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Appointment ${status}`); load(); }
  };

  const filtered = appointments.filter(apt => {
    const matchesStatus = statusFilter === "all" || apt.status === statusFilter;
    const matchesSearch = !search ||
      apt.service_type?.toLowerCase().includes(search.toLowerCase()) ||
      apt.notes?.toLowerCase().includes(search.toLowerCase()) ||
      apt.appointment_date?.includes(search);
    return matchesStatus && matchesSearch;
  });

  const statusColor = (s: string) => {
    switch (s) {
      case "confirmed": return "default";
      case "completed": return "secondary";
      case "cancelled": return "destructive";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-48 h-8 rounded" />
        <div className="flex gap-3">
          <Skeleton className="flex-1 h-10 rounded-xl" />
          <Skeleton className="w-32 h-10 rounded-xl" />
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">My Appointments</h1>
        <Badge variant="outline" className="text-sm">
          <CalendarCheck className="w-3.5 h-3.5 mr-1" />
          {filtered.length} total
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by service, notes, or date..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No appointments found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(apt => (
            <Card key={apt.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">{apt.service_type}</p>
                  <p className="text-sm text-muted-foreground">
                    📅 {apt.appointment_date} &nbsp;·&nbsp; 🕐 {apt.appointment_time}
                  </p>
                  {apt.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-2 py-1 inline-block">
                      📝 {apt.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={statusColor(apt.status) as any}>{apt.status}</Badge>
                  {apt.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => updateStatus(apt.id, "confirmed")}>Confirm</Button>
                      <Button size="sm" variant="destructive" onClick={() => updateStatus(apt.id, "cancelled")}>Cancel</Button>
                    </>
                  )}
                  {apt.status === "confirmed" && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(apt.id, "completed")}>Complete</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
