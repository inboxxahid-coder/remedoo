import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Search, FlaskConical, Pill, User } from "lucide-react";

export default function AdminMedicalRecords() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labReports, setLabReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [prescRes, labRes] = await Promise.all([
        supabase.from("appointments")
          .select("id, patient_id, appointment_date, service_type, prescription_url, consultation_notes, doctors(name), profiles!appointments_patient_id_fkey(full_name)")
          .not("prescription_url", "is", null)
          .order("appointment_date", { ascending: false })
          .limit(100),
        supabase.from("lab_sample_collections")
          .select("id, patient_id, test_name, status, report_url, scheduled_date, labs(name), profiles!lab_sample_collections_patient_id_fkey(full_name)")
          .order("scheduled_date", { ascending: false })
          .limit(100),
      ]);
      setPrescriptions(prescRes.data || []);
      setLabReports(labRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  const filterItems = (items: any[], field: string) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      i[field]?.toLowerCase().includes(q) ||
      i.patient_id?.toLowerCase().includes(q) ||
      JSON.stringify(i).toLowerCase().includes(q)
    );
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> Medical Records</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <Pill className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{prescriptions.length}</p>
          <p className="text-xs text-muted-foreground">Prescriptions</p>
        </Card>
        <Card className="p-4 text-center">
          <FlaskConical className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{labReports.length}</p>
          <p className="text-xs text-muted-foreground">Lab Reports</p>
        </Card>
        <Card className="p-4 text-center">
          <User className="w-5 h-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{new Set([...prescriptions.map(p => p.patient_id), ...labReports.map(l => l.patient_id)]).size}</p>
          <p className="text-xs text-muted-foreground">Patients</p>
        </Card>
      </div>

      <div className="flex items-center gap-2 bg-muted rounded-xl px-3 h-10">
        <Search className="w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search records..." className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-9" />
      </div>

      <Tabs defaultValue="prescriptions">
        <TabsList>
          <TabsTrigger value="prescriptions">Prescriptions ({prescriptions.length})</TabsTrigger>
          <TabsTrigger value="lab-reports">Lab Reports ({labReports.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="space-y-3 mt-4">
          {filterItems(prescriptions, "service_type").length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No prescriptions found</p></Card>
          ) : filterItems(prescriptions, "service_type").map(p => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">Patient: {(p.profiles as any)?.full_name || p.patient_id.slice(0, 8)}</span>
                    <Badge variant="outline" className="capitalize">{p.service_type}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Doctor: {(p.doctors as any)?.name || "—"} • Date: {p.appointment_date}
                  </p>
                  {p.consultation_notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">Notes: {p.consultation_notes}</p>}
                </div>
                {p.prescription_url && (
                  <a href={p.prescription_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline shrink-0">View</a>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="lab-reports" className="space-y-3 mt-4">
          {filterItems(labReports, "test_name").length === 0 ? (
            <Card className="p-12 text-center"><p className="text-muted-foreground">No lab reports found</p></Card>
          ) : filterItems(labReports, "test_name").map(l => (
            <Card key={l.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{l.test_name}</span>
                    <Badge variant={l.status === "completed" ? "default" : "secondary"} className="capitalize">{l.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Patient: {(l.profiles as any)?.full_name || l.patient_id.slice(0, 8)} • Lab: {(l.labs as any)?.name || "—"} • Date: {l.scheduled_date}
                  </p>
                </div>
                {l.report_url && (
                  <a href={l.report_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline shrink-0">View</a>
                )}
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
