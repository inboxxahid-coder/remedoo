import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { CalendarCheck, Search, Filter } from "lucide-react";

export default function HospitalAppointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [departments, setDepartments] = useState<any[]>([]);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: hospital } = await supabase.from("hospitals").select("id").eq("user_id", session.user.id).maybeSingle();
    if (!hospital) { setLoading(false); return; }

    const [aptRes, deptRes] = await Promise.all([
      supabase.from("appointments").select("*, doctors(name)").eq("hospital_id", hospital.id).order("appointment_date", { ascending: false }),
      supabase.from("departments").select("id, name").eq("hospital_id", hospital.id),
    ]);
    setAppointments(aptRes.data || []);
    setDepartments(deptRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const cancelAppointment = async (id: string) => {
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Appointment cancelled");
    logAuditAction({ action: "cancel_appointment", entityType: "appointment", entityId: id });
    load();
  };

  const filtered = appointments.filter(a => {
    const matchSearch = !search || a.service_type?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || a.status === statusFilter;
    const matchDept = deptFilter === "all" || a.department === deptFilter;
    return matchSearch && matchStatus && matchDept;
  });

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
        <CalendarCheck className="w-6 h-6 text-primary" /> Appointments
      </h1>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {departments.length > 0 && (
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} appointment{filtered.length !== 1 ? "s" : ""}</p>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No appointments found</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(apt => (
            <Card key={apt.id} className="p-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-semibold text-foreground">{apt.service_type}</p>
                <p className="text-sm text-muted-foreground">{apt.appointment_date} at {apt.appointment_time}</p>
                {(apt as any).doctors?.name && <p className="text-xs text-primary font-medium mt-0.5">Dr. {(apt as any).doctors.name}</p>}
                {apt.department && <Badge variant="outline" className="mt-1">{apt.department}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={apt.status === "confirmed" ? "default" : apt.status === "completed" ? "secondary" : apt.status === "cancelled" ? "destructive" : "outline"}>
                  {apt.status}
                </Badge>
                {(apt.status === "pending" || apt.status === "confirmed") && (
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelAppointment(apt.id)}>Cancel</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
