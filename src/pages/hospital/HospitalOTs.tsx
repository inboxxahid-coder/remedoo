import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Scissors, Plus, Trash2 } from "lucide-react";

const OT_STATUSES = ["available", "in_use", "maintenance", "reserved"] as const;

export default function HospitalOTs() {
  const [hospital, setHospital] = useState<any>(null);
  const [ots, setOts] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: "", department_id: "", notes: "" });

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: hosp } = await supabase.from("hospitals").select("id").eq("user_id", session.user.id).maybeSingle();
    if (!hosp) { setLoading(false); return; }
    setHospital(hosp);
    const [otRes, deptRes] = await Promise.all([
      supabase.from("operation_theaters").select("*").eq("hospital_id", hosp.id).order("name"),
      supabase.from("departments").select("id, name").eq("hospital_id", hosp.id),
    ]);
    setOts(otRes.data || []);
    setDepartments(deptRes.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!hospital || !form.name.trim()) { toast.error("Name required"); return; }
    const { error } = await supabase.from("operation_theaters").insert({
      hospital_id: hospital.id, name: form.name, department_id: form.department_id || null, notes: form.notes || null,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Operation theater added");
    logAuditAction({ action: "add_ot", entityType: "operation_theater", details: { name: form.name } });
    setForm({ name: "", department_id: "", notes: "" });
    setAddOpen(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("operation_theaters").update({ status } as any).eq("id", id);
    logAuditAction({ action: "update_ot_status", entityType: "operation_theater", entityId: id, details: { status } });
    load();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("operation_theaters").delete().eq("id", id);
    toast.success("OT removed");
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Scissors className="w-6 h-6 text-primary" /> Operation Theaters
        </h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add OT</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Operation Theater</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label>Department</Label>
                <Select value={form.department_id} onValueChange={v => setForm({ ...form, department_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={handleAdd}>Add OT</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {ots.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No operation theaters registered</p></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {ots.map(ot => {
            const dept = departments.find(d => d.id === ot.department_id);
            return (
              <Card key={ot.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-foreground">{ot.name}</p>
                    <div className="flex gap-2 mt-1">
                      {dept && <Badge variant="outline">{dept.name}</Badge>}
                      <Badge variant={ot.status === "available" ? "default" : ot.status === "in_use" ? "secondary" : "destructive"}>
                        {ot.status.replace("_", " ")}
                      </Badge>
                    </div>
                    {ot.notes && <p className="text-xs text-muted-foreground mt-2">{ot.notes}</p>}
                  </div>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(ot.id)}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <Select value={ot.status} onValueChange={v => updateStatus(ot.id, v)}>
                  <SelectTrigger className="mt-3 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{OT_STATUSES.map(s => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
                </Select>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
