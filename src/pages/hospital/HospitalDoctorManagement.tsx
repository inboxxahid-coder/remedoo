import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Stethoscope, Plus, Trash2, UserCheck, Search } from "lucide-react";

export default function HospitalDoctorManagement() {
  const [hospital, setHospital] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [unlinkedDoctors, setUnlinkedDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: hosp } = await supabase.from("hospitals").select("id").eq("user_id", session.user.id).maybeSingle();
    if (!hosp) { setLoading(false); return; }
    setHospital(hosp);

    const [docRes, deptRes, unlinkedRes] = await Promise.all([
      supabase.from("doctors").select("*").eq("hospital_id", hosp.id).order("name"),
      supabase.from("departments").select("*").eq("hospital_id", hosp.id),
      supabase.from("doctors").select("*").is("hospital_id", null).eq("approval_status", "approved"),
    ]);

    setDoctors(docRes.data || []);
    setDepartments(deptRes.data || []);
    setUnlinkedDoctors(unlinkedRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const linkDoctor = async (doctorId: string) => {
    if (!hospital) return;
    const { error } = await supabase.from("doctors").update({ hospital_id: hospital.id }).eq("id", doctorId);
    if (error) { toast.error(error.message); return; }
    toast.success("Doctor linked to hospital");
    logAuditAction({ action: "link_doctor", entityType: "doctor", entityId: doctorId });
    load();
    setAddOpen(false);
  };

  const unlinkDoctor = async (doctorId: string) => {
    const { error } = await supabase.from("doctors").update({ hospital_id: null, department_id: null }).eq("id", doctorId);
    if (error) { toast.error(error.message); return; }
    toast.success("Doctor removed from hospital");
    logAuditAction({ action: "unlink_doctor", entityType: "doctor", entityId: doctorId });
    load();
  };

  const assignDepartment = async (doctorId: string, deptId: string) => {
    const { error } = await supabase.from("doctors").update({ department_id: deptId || null }).eq("id", doctorId);
    if (error) { toast.error(error.message); return; }
    toast.success("Department assigned");
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const filtered = doctors.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Stethoscope className="w-6 h-6 text-primary" /> Doctor Management
        </h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Doctor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Link a Doctor</DialogTitle></DialogHeader>
            {unlinkedDoctors.length === 0 ? (
              <p className="text-muted-foreground py-4">No unlinked approved doctors available</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {unlinkedDoctors.map(d => (
                  <Card key={d.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.specialization}</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => linkDoctor(d.id)}>
                      <UserCheck className="w-4 h-4 mr-1" /> Link
                    </Button>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search doctors..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No doctors linked to this hospital</p></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => {
            const dept = departments.find(d => d.id === doc.department_id);
            return (
              <Card key={doc.id} className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{doc.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{doc.specialization || "General"}</Badge>
                      {dept && <Badge variant="outline">{dept.name}</Badge>}
                      <span className="text-xs text-muted-foreground">₹{doc.consultation_fee || 0}/visit</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{doc.phone || "No phone"} · {doc.experience_years || 0} yrs exp</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={doc.department_id || ""} onValueChange={(v) => assignDepartment(doc.id, v)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => unlinkDoctor(doc.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
