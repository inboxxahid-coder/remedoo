import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Building, Plus, Trash2, Pencil } from "lucide-react";

export default function HospitalDepartments() {
  const [hospital, setHospital] = useState<any>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: hosp } = await supabase.from("hospitals").select("id").eq("user_id", session.user.id).maybeSingle();
    if (!hosp) { setLoading(false); return; }
    setHospital(hosp);
    const { data } = await supabase.from("departments").select("*").eq("hospital_id", hosp.id).order("name");
    setDepartments(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!hospital || !form.name.trim()) { toast.error("Name required"); return; }
    const { error } = await supabase.from("departments").insert({ hospital_id: hospital.id, name: form.name, description: form.description || null } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Department added");
    logAuditAction({ action: "add_department", entityType: "department", details: { name: form.name } });
    setForm({ name: "", description: "" });
    setAddOpen(false);
    load();
  };

  const handleUpdate = async () => {
    if (!editDept) return;
    const { error } = await supabase.from("departments").update({ name: form.name, description: form.description } as any).eq("id", editDept.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Department updated");
    setEditDept(null);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("departments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Department deleted");
    logAuditAction({ action: "delete_department", entityType: "department", entityId: id });
    load();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("departments").update({ is_active: active } as any).eq("id", id);
    load();
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building className="w-6 h-6 text-primary" /> Departments
        </h1>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Department</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              <Button onClick={handleAdd}>Add Department</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {departments.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No departments yet</p></Card>
      ) : (
        <div className="space-y-3">
          {departments.map(d => (
            <Card key={d.id} className="p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-foreground">{d.name}</p>
                {d.description && <p className="text-sm text-muted-foreground">{d.description}</p>}
                <Badge variant={d.is_active ? "default" : "secondary"} className="mt-1">{d.is_active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={d.is_active} onCheckedChange={(v) => toggleActive(d.id, v)} />
                <Button size="sm" variant="ghost" onClick={() => { setEditDept(d); setForm({ name: d.name, description: d.description || "" }); }}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(d.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editDept} onOpenChange={(o) => { if (!o) setEditDept(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Department</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
