import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Users, Pencil, Trash2, Heart, User, Baby, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { format } from "date-fns";
import { readPageCache, writePageCache } from "@/lib/pageCache";

const RELATIONSHIPS = ["Father", "Mother", "Son", "Daughter", "Spouse", "Sibling", "Grandparent", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  gender: string | null;
  date_of_birth: string | null;
  blood_group: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  created_at: string;
}

export default function FamilyMembers() {
  const navigate = useNavigate();
  const cachedMembers = readPageCache<FamilyMember[]>("family_members");
  const [members, setMembers] = useState<FamilyMember[]>(cachedMembers || []);
  const [loading, setLoading] = useState(!cachedMembers);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", relationship: "", gender: "", date_of_birth: "",
    blood_group: "", allergies: "", chronic_conditions: "",
  });

  const loadMembers = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { navigate("/login", { replace: true }); return; }
    const { data } = await supabase.from("family_members").select("*")
      .eq("user_id", session.user.id).order("created_at");
    setMembers(data || []);
    writePageCache("family_members", data || []);
    setLoading(false);
  };

  useEffect(() => { loadMembers(); }, []);

  const resetForm = () => {
    setForm({ name: "", relationship: "", gender: "", date_of_birth: "", blood_group: "", allergies: "", chronic_conditions: "" });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (m: FamilyMember) => {
    setForm({
      name: m.name, relationship: m.relationship, gender: m.gender || "",
      date_of_birth: m.date_of_birth || "", blood_group: m.blood_group || "",
      allergies: m.allergies || "", chronic_conditions: m.chronic_conditions || "",
    });
    setEditing(m);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.relationship) { toast.error("Name and relationship are required"); return; }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = {
      user_id: session.user.id,
      name: form.name.trim(),
      relationship: form.relationship,
      gender: form.gender || null,
      date_of_birth: form.date_of_birth || null,
      blood_group: form.blood_group || null,
      allergies: form.allergies || null,
      chronic_conditions: form.chronic_conditions || null,
    };

    if (editing) {
      await supabase.from("family_members").update(payload).eq("id", editing.id);
      toast.success("Member updated");
    } else {
      await supabase.from("family_members").insert(payload);
      toast.success("Family member added");
    }
    resetForm();
    setSaving(false);
    loadMembers();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("family_members").delete().eq("id", id);
    toast.success("Member removed");
    loadMembers();
  };

  const genderEmoji = (g: string | null) => g === "Male" ? "👨" : g === "Female" ? "👩" : "🧑";

  return (
    <div className="min-h-screen bg-background pb-24 max-w-4xl mx-auto">
      <div className="gradient-primary page-header px-5 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3 mb-2">
          <button aria-label="Go back" onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
          <h1 className="text-xl font-bold text-primary-foreground flex items-center gap-2"><Users className="w-5 h-5" /> Family Members</h1>
        </div>
        <p className="text-primary-foreground/70 text-xs">Manage health profiles for your family</p>
      </div>

      <div className="px-5 mt-4 space-y-3">
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="w-full gap-2">
          <Plus className="w-4 h-4" /> Add Family Member
        </Button>

        {showForm && (
          <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-foreground">{editing ? "Edit Member" : "Add Member"}</h3>
              <button aria-label="Clear" onClick={resetForm}><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Name *</Label>
                <Input aria-label="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Relationship *</Label>
                <Select value={form.relationship} onValueChange={v => setForm(f => ({ ...f, relationship: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{RELATIONSHIPS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Gender</Label>
                <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Date of Birth</Label>
                <Input type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">Blood Group</Label>
                <Select value={form.blood_group} onValueChange={v => setForm(f => ({ ...f, blood_group: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{BLOOD_GROUPS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Allergies</Label>
                <Input aria-label="e.g., Penicillin, Dust" value={form.allergies} onChange={e => setForm(f => ({ ...f, allergies: e.target.value }))} placeholder="e.g., Penicillin, Dust" className="h-9 text-sm" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Chronic Conditions</Label>
                <Input aria-label="e.g., Diabetes, Asthma" value={form.chronic_conditions} onChange={e => setForm(f => ({ ...f, chronic_conditions: e.target.value }))} placeholder="e.g., Diabetes, Asthma" className="h-9 text-sm" />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full h-9 text-sm">
              {saving ? "Saving..." : editing ? "Update Member" : "Add Member"}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : members.length === 0 && !showForm ? (
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No family members added yet</p>
            <p className="text-muted-foreground text-xs mt-1">Add your family to manage their health</p>
          </div>
        ) : (
          members.map(m => (
            <div key={m.id} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-lg shrink-0">
                  {genderEmoji(m.gender)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-sm text-foreground">{m.name}</h3>
                      <p className="text-xs text-muted-foreground">{m.relationship}</p>
                    </div>
                    <div className="flex gap-1">
                      <button aria-label="Edit" onClick={() => handleEdit(m)} className="p-1.5 rounded-lg hover:bg-muted"><Pencil className="w-3.5 h-3.5 text-muted-foreground" /></button>
                      <button aria-label="Remove item" onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5 text-destructive" /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {m.gender && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{m.gender}</span>}
                    {m.blood_group && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">{m.blood_group}</span>}
                    {m.date_of_birth && <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">DOB: {format(new Date(m.date_of_birth), "MMM d, yyyy")}</span>}
                  </div>
                  {m.allergies && <p className="text-[11px] text-warning mt-1.5">⚠️ Allergies: {m.allergies}</p>}
                  {m.chronic_conditions && <p className="text-[11px] text-muted-foreground mt-0.5">🏥 {m.chronic_conditions}</p>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <BottomNav />
    </div>
  );
}
