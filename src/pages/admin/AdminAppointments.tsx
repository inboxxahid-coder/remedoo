import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck, Search, XCircle, Filter, Download } from "lucide-react";
import { exportToCsv } from "@/lib/exportCsv";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function AdminAppointments() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("appointments").select("*").order("appointment_date", { ascending: false });
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    return data.filter(a => {
      if (dateFilter && a.appointment_date !== dateFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (serviceFilter !== "all" && a.service_type !== serviceFilter) return false;
      return true;
    });
  }, [data, dateFilter, statusFilter, serviceFilter]);

  const serviceTypes = useMemo(() => [...new Set(data.map(a => a.service_type))], [data]);

  const cancelAppointment = async (id: string) => {
    if (!confirm("Cancel this appointment?")) return;
    const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast.error("Failed to cancel"); return; }
    toast.success("Appointment cancelled");
    fetchData();
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm("Permanently delete this appointment?")) return;
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    toast.success("Appointment deleted");
    fetchData();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Confirmed</Badge>;
      case "cancelled": return <Badge className="bg-red-500/10 text-red-600 border-red-200">Cancelled</Badge>;
      case "completed": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200">Completed</Badge>;
      case "pending": return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">Pending</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Appointment Monitoring</h1>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => exportToCsv("appointments", filtered, ["service_type","appointment_date","appointment_time","status","notes"])}>
          <Download className="w-4 h-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full sm:w-44"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Service Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {serviceTypes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        {(dateFilter || statusFilter !== "all" || serviceFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFilter(""); setStatusFilter("all"); setServiceFilter("all"); }} className="text-xs gap-1">
            <XCircle className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No appointments found</div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.service_type}</TableCell>
                      <TableCell>{a.appointment_date}</TableCell>
                      <TableCell>{a.appointment_time}</TableCell>
                      <TableCell>{statusBadge(a.status)}</TableCell>
                      <TableCell className="max-w-[150px] truncate text-sm text-muted-foreground">{a.notes || "—"}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {a.status !== "cancelled" && a.status !== "completed" && (
                            <Button variant="ghost" size="sm" onClick={() => cancelAppointment(a.id)} className="text-xs text-amber-600 hover:text-amber-700">
                              Cancel
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={() => deleteAppointment(a.id)} className="text-xs text-destructive">
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden divide-y divide-border">
              {filtered.map((a) => (
                <div key={a.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{a.service_type}</p>
                      <p className="text-sm text-muted-foreground">{a.appointment_date} at {a.appointment_time}</p>
                    </div>
                    {statusBadge(a.status)}
                  </div>
                  {a.notes && <p className="text-xs text-muted-foreground">{a.notes}</p>}
                  <div className="flex gap-2 pt-1">
                    {a.status !== "cancelled" && a.status !== "completed" && (
                      <Button variant="outline" size="sm" onClick={() => cancelAppointment(a.id)} className="text-xs gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => deleteAppointment(a.id)} className="text-xs gap-1 text-destructive">
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-3">{filtered.length} appointment{filtered.length !== 1 ? "s" : ""}</p>
    </div>
  );
}
