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
import { Ambulance, Plus, Trash2, Pencil, Phone, Truck } from "lucide-react";

const STATUSES = ["available", "dispatched", "maintenance"] as const;
const VEHICLE_TYPES = ["BLS", "ALS", "Patient Transport"] as const;

export default function HospitalAmbulanceFleet() {
  const [hospital, setHospital] = useState<any>(null);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editAmb, setEditAmb] = useState<any>(null);
  const [form, setForm] = useState({
    vehicle_number: "", vehicle_type: "BLS", driver_name: "", driver_phone: "",
    equipment_details: "", status: "available",
  });

  const load = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data: hosp } = await supabase.from("hospitals").select("id").eq("user_id", session.user.id).maybeSingle();
    if (!hosp) { setLoading(false); return; }
    setHospital(hosp);
    const { data } = await supabase.from("ambulances").select("*").eq("hospital_id", hosp.id).order("created_at", { ascending: false });
    setAmbulances(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => setForm({ vehicle_number: "", vehicle_type: "BLS", driver_name: "", driver_phone: "", equipment_details: "", status: "available" });

  const handleAdd = async () => {
    if (!hospital || !form.vehicle_number.trim()) { toast.error("Vehicle number required"); return; }
    const { error } = await supabase.from("ambulances").insert({
      hospital_id: hospital.id, vehicle_number: form.vehicle_number, vehicle_type: form.vehicle_type,
      driver_name: form.driver_name || null, driver_phone: form.driver_phone || null,
      equipment_details: form.equipment_details || null, status: form.status,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Ambulance added");
    logAuditAction({ action: "add_ambulance", entityType: "ambulance", details: { vehicle: form.vehicle_number } });
    resetForm(); setAddOpen(false); load();
  };

  const handleUpdate = async () => {
    if (!editAmb) return;
    const { error } = await supabase.from("ambulances").update({
      vehicle_number: form.vehicle_number, vehicle_type: form.vehicle_type,
      driver_name: form.driver_name || null, driver_phone: form.driver_phone || null,
      equipment_details: form.equipment_details || null, status: form.status,
    } as any).eq("id", editAmb.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Ambulance updated");
    logAuditAction({ action: "update_ambulance", entityType: "ambulance", entityId: editAmb.id });
    setEditAmb(null); load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("ambulances").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Ambulance removed");
    logAuditAction({ action: "delete_ambulance", entityType: "ambulance", entityId: id });
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("ambulances").update({ status } as any).eq("id", id);
    logAuditAction({ action: "update_ambulance_status", entityType: "ambulance", entityId: id, details: { status } });
    load();
  };

  const statusColor = (s: string) => s === "available" ? "default" : s === "dispatched" ? "secondary" : "destructive";

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const AmbulanceForm = ({ onSubmit, submitLabel }: { onSubmit: () => void; submitLabel: string }) => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Vehicle Number *</Label><Input value={form.vehicle_number} onChange={e => setForm({ ...form, vehicle_number: e.target.value })} placeholder="KA-01-AB-1234" /></div>
        <div>
          <Label>Vehicle Type</Label>
          <Select value={form.vehicle_type} onValueChange={v => setForm({ ...form, vehicle_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{VEHICLE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Driver Name</Label><Input value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })} /></div>
        <div><Label>Driver Phone</Label><Input value={form.driver_phone} onChange={e => setForm({ ...form, driver_phone: e.target.value })} placeholder="+91..." /></div>
      </div>
      <div><Label>Equipment Details</Label><Textarea value={form.equipment_details} onChange={e => setForm({ ...form, equipment_details: e.target.value })} placeholder="Oxygen, defibrillator, stretcher..." /></div>
      <div>
        <Label>Status</Label>
        <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button onClick={onSubmit} className="w-full">{submitLabel}</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Ambulance className="w-6 h-6 text-primary" /> Ambulance Fleet
        </h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{ambulances.filter(a => a.status === "available").length} Available</Badge>
          <Badge variant="secondary">{ambulances.filter(a => a.status === "dispatched").length} On Duty</Badge>
          <Dialog open={addOpen} onOpenChange={o => { setAddOpen(o); if (o) resetForm(); }}>
            <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" /> Add Ambulance</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Ambulance</DialogTitle></DialogHeader>
              <AmbulanceForm onSubmit={handleAdd} submitLabel="Add Ambulance" />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{ambulances.length}</p>
          <p className="text-xs text-muted-foreground">Total Fleet</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-500">{ambulances.filter(a => a.status === "available").length}</p>
          <p className="text-xs text-muted-foreground">Available</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{ambulances.filter(a => a.status === "maintenance").length}</p>
          <p className="text-xs text-muted-foreground">Maintenance</p>
        </Card>
      </div>

      {ambulances.length === 0 ? (
        <Card className="p-12 text-center"><p className="text-muted-foreground">No ambulances registered</p></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {ambulances.map(amb => (
            <Card key={amb.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-primary" />
                    <p className="font-semibold text-foreground">{amb.vehicle_number}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">{amb.vehicle_type || "BLS"}</Badge>
                    <Badge variant={statusColor(amb.status)}>{amb.status}</Badge>
                  </div>
                  {amb.driver_name && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      {amb.driver_name}
                      {amb.driver_phone && <><Phone className="w-3 h-3 ml-1" /> {amb.driver_phone}</>}
                    </p>
                  )}
                  {amb.equipment_details && <p className="text-xs text-muted-foreground">{amb.equipment_details}</p>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => {
                    setEditAmb(amb);
                    setForm({
                      vehicle_number: amb.vehicle_number, vehicle_type: amb.vehicle_type || "BLS",
                      driver_name: amb.driver_name || "", driver_phone: amb.driver_phone || "",
                      equipment_details: amb.equipment_details || "", status: amb.status,
                    });
                  }}><Pencil className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(amb.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <Select value={amb.status} onValueChange={v => updateStatus(amb.id, v)}>
                <SelectTrigger className="mt-3 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editAmb} onOpenChange={o => { if (!o) setEditAmb(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Ambulance</DialogTitle></DialogHeader>
          <AmbulanceForm onSubmit={handleUpdate} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>
    </div>
  );
}
