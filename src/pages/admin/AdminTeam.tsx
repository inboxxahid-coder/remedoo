import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Search, Plus, UserCheck, UserX, MoreHorizontal, Shield, Loader2, Trash2, Pencil, KeyRound, Mail
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const DESIGNATIONS = [
  "Super Admin",
  "Admin",
  "Operations Manager",
  "Finance Manager",
  "Support Manager",
  "Content Manager",
  "Medical Officer",
];

interface AdminMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  designation: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminTeam() {
  const [data, setData] = useState<AdminMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editMember, setEditMember] = useState<AdminMember | null>(null);
  const [editForm, setEditForm] = useState({ name: "", designation: "", phone: "" });

  // Change email state
  const [emailMember, setEmailMember] = useState<AdminMember | null>(null);
  const [newEmail, setNewEmail] = useState("");

  // Change password state
  const [passwordMember, setPasswordMember] = useState<AdminMember | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Add form state
  const [form, setForm] = useState({
    name: "", email: "", password: "", designation: "Admin", phone: "",
  });

  const fetchTeam = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_team")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error) setData((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchTeam(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.designation.toLowerCase().includes(q)
    );
  }, [data, search]);

  const handleCreateAdmin = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error("Name, email and password are required");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("admin-create-user", {
        body: { email: form.email, password: form.password, full_name: form.name },
      });

      if (fnError || !fnData?.user_id) {
        toast.error(fnData?.error || "Failed to create user account");
        setSaving(false);
        return;
      }

      const userId = fnData.user_id;

      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: userId,
        role: "admin",
      });

      if (roleError && !roleError.message.includes("duplicate")) {
        toast.error("User created but failed to assign admin role");
        setSaving(false);
        return;
      }

      const currentUser = (await supabase.auth.getUser()).data.user;
      const { error: teamError } = await supabase.from("admin_team").insert({
        user_id: userId,
        name: form.name,
        email: form.email,
        designation: form.designation,
        phone: form.phone || null,
        created_by: currentUser?.id,
      });

      if (teamError) {
        toast.error("User & role created, but team record failed");
      } else {
        toast.success(`Admin "${form.name}" created as ${form.designation}`);
      }

      setShowAdd(false);
      setForm({ name: "", email: "", password: "", designation: "Admin", phone: "" });
      fetchTeam();
    } catch (err) {
      toast.error("Unexpected error creating admin");
    }
    setSaving(false);
  };

  // Edit details (name, designation, phone)
  const openEdit = (member: AdminMember) => {
    setEditMember(member);
    setEditForm({ name: member.name, designation: member.designation, phone: member.phone || "" });
  };

  const handleSaveEdit = async () => {
    if (!editMember || !editForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("admin_team")
      .update({ name: editForm.name, designation: editForm.designation, phone: editForm.phone || null })
      .eq("id", editMember.id);
    if (error) {
      toast.error("Failed to update details");
    } else {
      toast.success("Admin details updated");
      setEditMember(null);
      fetchTeam();
    }
    setSaving(false);
  };

  // Change email
  const openEmailChange = (member: AdminMember) => {
    setEmailMember(member);
    setNewEmail("");
  };

  const handleChangeEmail = async () => {
    if (!emailMember || !newEmail.trim()) {
      toast.error("New email is required");
      return;
    }
    setSaving(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("admin-change-email", {
        body: { user_id: emailMember.user_id, new_email: newEmail },
      });

      if (fnError || fnData?.error) {
        toast.error(fnData?.error || "Failed to change email");
        setSaving(false);
        return;
      }

      // Update admin_team record
      await supabase.from("admin_team").update({ email: newEmail }).eq("id", emailMember.id);
      toast.success("Email updated successfully");
      setEmailMember(null);
      fetchTeam();
    } catch {
      toast.error("Failed to change email");
    }
    setSaving(false);
  };

  // Change password
  const openPasswordChange = (member: AdminMember) => {
    setPasswordMember(member);
    setNewPassword("");
  };

  const handleChangePassword = async () => {
    if (!passwordMember || !newPassword.trim()) {
      toast.error("New password is required");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSaving(true);
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("admin-create-user", {
        body: { user_id: passwordMember.user_id, password: newPassword, action: "update_password" },
      });

      if (fnError || fnData?.error) {
        toast.error(fnData?.error || "Failed to change password");
        setSaving(false);
        return;
      }

      toast.success("Password updated successfully");
      setPasswordMember(null);
    } catch {
      toast.error("Failed to change password");
    }
    setSaving(false);
  };

  const toggleActive = async (member: AdminMember) => {
    const { error } = await supabase
      .from("admin_team")
      .update({ is_active: !member.is_active })
      .eq("id", member.id);
    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(member.is_active ? "Admin deactivated" : "Admin activated");
      fetchTeam();
    }
  };

  const removeMember = async (member: AdminMember) => {
    if (!confirm(`Remove "${member.name}" from admin team? This won't delete their account.`)) return;
    const { error } = await supabase.from("admin_team").delete().eq("id", member.id);
    if (error) {
      toast.error("Failed to remove");
    } else {
      toast.success("Admin removed from team");
      fetchTeam();
    }
  };

  // Check if current user is Super Admin
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: teamRecord } = await supabase
        .from("admin_team")
        .select("designation")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsSuperAdmin(teamRecord?.designation === "Super Admin");
    };
    checkSuperAdmin();
  }, []);

  const renderActions = (m: AdminMember) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isSuperAdmin && (
          <>
            <DropdownMenuItem onClick={() => openEdit(m)}>
              <Pencil className="w-4 h-4 mr-2" /> Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEmailChange(m)}>
              <Mail className="w-4 h-4 mr-2" /> Change Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openPasswordChange(m)}>
              <KeyRound className="w-4 h-4 mr-2" /> Change Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toggleActive(m)}>
              {m.is_active ? <UserX className="w-4 h-4 mr-2" /> : <UserCheck className="w-4 h-4 mr-2" />}
              {m.is_active ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => removeMember(m)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" /> Remove
            </DropdownMenuItem>
          </>
        )}
        {!isSuperAdmin && (
          <DropdownMenuItem disabled className="text-muted-foreground">
            Only Super Admin can manage
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Admin Team</h1>
            <p className="text-sm text-muted-foreground">Manage admin users and designations</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search admins..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {isSuperAdmin && (
            <Button onClick={() => setShowAdd(true)} className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" /> Add Admin
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Admins", value: data.length, color: "text-primary" },
          { label: "Active", value: data.filter((d) => d.is_active).length, color: "text-emerald-600" },
          { label: "Inactive", value: data.filter((d) => !d.is_active).length, color: "text-amber-600" },
          { label: "Designations", value: [...new Set(data.map((d) => d.designation))].length, color: "text-blue-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-3 text-center">
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {data.length === 0 ? "No admin team members yet. Add your first admin!" : "No results found"}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell className="text-sm">{m.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-medium">{m.designation}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{m.phone || "—"}</TableCell>
                      <TableCell>
                        {m.is_active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">Active</Badge>
                        ) : (
                          <Badge className="bg-red-500/10 text-red-600 border-red-200">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(m.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{renderActions(m)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="md:hidden divide-y divide-border">
              {filtered.map((m) => (
                <div key={m.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-foreground">{m.name}</p>
                      <p className="text-sm text-muted-foreground">{m.email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {m.is_active ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">Active</Badge>
                      ) : (
                        <Badge className="bg-red-500/10 text-red-600 border-red-200 text-xs">Inactive</Badge>
                      )}
                      {renderActions(m)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{m.designation}</Badge>
                    {m.phone && <span className="text-xs text-muted-foreground">{m.phone}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-3">{filtered.length} admin{filtered.length !== 1 ? "s" : ""}</p>

      {/* Add Admin Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" /> Add New Admin
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Enter full name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="admin@remedoo.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
            </div>
            <div className="space-y-1.5">
              <Label>Designation *</Label>
              <Select value={form.designation} onValueChange={(v) => setForm((f) => ({ ...f, designation: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESIGNATIONS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone (optional)</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleCreateAdmin} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog open={!!editMember} onOpenChange={(open) => !open && setEditMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> Edit Admin Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Designation *</Label>
              <Select value={editForm.designation} onValueChange={(v) => setEditForm((f) => ({ ...f, designation: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DESIGNATIONS.map((d) => (<SelectItem key={d} value={d}>{d}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditMember(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Email Dialog */}
      <Dialog open={!!emailMember} onOpenChange={(open) => !open && setEmailMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" /> Change Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground">Current Email</Label>
              <Input value={emailMember?.email || ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label>New Email *</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new-email@remedoo.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailMember(null)}>Cancel</Button>
            <Button onClick={handleChangeEmail} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Update Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={!!passwordMember} onOpenChange={(open) => !open && setPasswordMember(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Change Password
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Set a new password for <span className="font-medium text-foreground">{passwordMember?.name}</span>
            </p>
            <div className="space-y-1.5">
              <Label>New Password *</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordMember(null)}>Cancel</Button>
            <Button onClick={handleChangePassword} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Update Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
