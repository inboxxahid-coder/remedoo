import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Wrench, Plus, Trash2, AlertTriangle } from "lucide-react";

const STATUSES = ["operational", "under_maintenance", "out_of_order"] as const;

export default function HospitalEquipment() {
  const [hospital, setHospital] = useState<any>(null);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", department_id: "", status: "operational", maintenance_notes: "" });

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: hosp } = await supabase.from("hospitals").select("id").eq("user_id", session.user.id).maybeSingle();
    if (!hosp) { setLoading(false); return; }
    setHospital(hosp);
    const [eqRes, deptRes] = await Promise.all([
      supabase.from("hospital_equipment").select("*").eq("hospital_id", hosp.id).order("name"),
      supabase.from("departments").select("id, name").eq("hospital_id", hosp.id),
    ]);
    setEquipment(eqRes.data || []);
    setDepartments(deptRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!hospital || !form.name.trim()) { toast.error("Name required"); return; }
    const { error } = await supabase.from("hospital_equipment").insert({
      hospital_id: hospital.id, name: form.name, department_id: form.department_id || null,
      status: form.status, maintenance_notes: form.maintenance_notes || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Equipment added");
    logAuditAction({ action: "add_equipment", entityType: "equipment", details: { name: form.name } });
    setForm({ name: "", department_id: "", status: "operational", maintenance_notes: "" });
    setAddOpen(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("hospital_equipment").update({ status } as any).eq("id", id);
    logAuditAction({ action: "update_equipment_status", entityType: "equipment", entityId: id, details: { status } });
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("hospital_equipment").delete().eq("id", id);
    toast.success("Equipment removed");
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const maintenance = equipment.filter(e => e.status !== "operational");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wrench className="w-6 h-6 text-primary" /> Equipment & Resources
        </h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Equipment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label>Department</Label>
                <Select value={form.department_id} onValueChange={v => setForm({ ...form, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Input value={form.maintenance_notes} onChange={e => setForm({ ...form, maintenance_notes: e.target.value })} /></div>
              <Button onClick={handleAdd}>Add Equipment</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {maintenance.length > 0 && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <p className="font-semibold text-foreground">{maintenance.length} equipment under maintenance or out of order</p>
          </div>
        </Card>
      )}

      {equipment.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No equipment registered</p></Card>
      ) : (
        <div className="space-y-3">
          {equipment.map(eq => {
            const dept = departments.find(d => d.id === eq.department_id);
            return (
              <Card key={eq.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-semibold text-foreground">{eq.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {dept && <Badge variant="outline">{dept.name}</Badge>}
                    <Badge variant={eq.status === "operational" ? "default" : eq.status === "under_maintenance" ? "secondary" : "destructive"}>
                      {eq.status.replace("_", " ")}
                    </Badge>
                  </div>
                  {eq.maintenance_notes && <p className="text-xs text-muted-foreground mt-1">{eq.maintenance_notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <Select value={eq.status} onValueChange={v => updateStatus(eq.id, v)}>
                    <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(eq.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
