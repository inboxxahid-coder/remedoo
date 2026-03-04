import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminProviderAddForm from "@/components/admin/AdminProviderAddForm";
import AdminPharmacyEditForm from "@/components/admin/AdminPharmacyEditForm";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Trash2, ShieldAlert, Lock, Plus, Pencil, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminPharmacies() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [phase, setPhase] = useState<"countdown" | "password">("countdown");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => { setLoading(true); const { data } = await supabase.from("pharmacies").select("*").order("created_at", { ascending: false }); setData(data || []); setLoading(false); };
  useEffect(() => { fetchData(); }, []);

  const startDelete = useCallback((id: string) => { const item = data.find(d => d.id === id); setDeleteTarget({ id, name: item?.name || "Unknown" }); setCountdown(10); setPhase("countdown"); setPassword(""); setDeleting(false); }, [data]);
  useEffect(() => { if (!deleteTarget || phase !== "countdown") return; timerRef.current = setInterval(() => { setCountdown(p => { if (p <= 1) { clearInterval(timerRef.current!); setPhase("password"); return 0; } return p - 1; }); }, 1000); return () => { if (timerRef.current) clearInterval(timerRef.current); }; }, [deleteTarget, phase]);
  const handleCancel = () => { if (timerRef.current) clearInterval(timerRef.current); setDeleteTarget(null); setPassword(""); };
  const handleConfirmDelete = async () => { if (!deleteTarget || !password) return; setDeleting(true); const { data: { session } } = await supabase.auth.getSession(); if (!session?.user?.email) { toast.error("Session expired"); setDeleting(false); return; } const { error: authError } = await supabase.auth.signInWithPassword({ email: session.user.email, password }); if (authError) { toast.error("Incorrect password"); setDeleting(false); return; } const { error } = await supabase.from("pharmacies").delete().eq("id", deleteTarget.id); if (error) { toast.error("Failed: " + error.message); setDeleting(false); return; } toast.success(`"${deleteTarget.name}" deleted`); handleCancel(); fetchData(); };

  const filtered = data.filter(d => !searchQuery || d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || d.location?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Pharmacies</h1>
        <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2"><Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add New</span><span className="sm:hidden">Add</span></Button>
      </div>
      <div className="mb-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search pharmacies..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div></div>
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {loading ? <div className="p-8 text-center text-muted-foreground">Loading...</div> : filtered.length === 0 ? <div className="p-8 text-center text-muted-foreground">No pharmacies found</div> : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <Table><TableHeader><TableRow>
                <TableHead className="text-xs font-semibold">Name</TableHead><TableHead className="text-xs font-semibold">Location</TableHead><TableHead className="text-xs font-semibold">Phone</TableHead><TableHead className="text-xs font-semibold">Rating</TableHead><TableHead className="text-xs font-semibold">Status</TableHead><TableHead className="text-xs font-semibold w-24">Actions</TableHead>
              </TableRow></TableHeader><TableBody>
                {filtered.map(row => (<TableRow key={row.id}><TableCell className="text-sm font-medium">{row.name}</TableCell><TableCell className="text-sm">{row.location || "—"}</TableCell><TableCell className="text-sm">{row.phone || "—"}</TableCell><TableCell className="text-sm">{row.rating ?? 0}</TableCell><TableCell><Badge variant={row.approval_status === "approved" ? "default" : "secondary"} className="text-xs">{row.approval_status}</Badge></TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditItem(row)}><Pencil className="w-3.5 h-3.5" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => startDelete(row.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div></TableCell></TableRow>))}
              </TableBody></Table>
            </div>
            <div className="md:hidden divide-y divide-border">
              {filtered.map(row => (<div key={row.id} className="p-4 space-y-2"><div className="flex items-center justify-between"><span className="font-medium text-sm text-foreground">{row.name}</span><Badge variant={row.approval_status === "approved" ? "default" : "secondary"} className="text-xs">{row.approval_status}</Badge></div><div className="text-xs text-muted-foreground">{row.location || "—"} · ⭐{row.rating ?? 0}</div><div className="flex gap-2 pt-1"><Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={() => setEditItem(row)}><Pencil className="w-3.5 h-3.5" /> Edit</Button><Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30" onClick={() => startDelete(row.id)}><Trash2 className="w-3.5 h-3.5" /></Button></div></div>))}
            </div>
          </>
        )}
      </div>
      <AdminProviderAddForm type="pharmacy" open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchData} />
      <AdminPharmacyEditForm pharmacy={editItem} open={!!editItem} onOpenChange={(v) => { if (!v) setEditItem(null); }} onSuccess={fetchData} />
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <AlertDialogContent className="max-w-md"><AlertDialogHeader><AlertDialogTitle className="flex items-center gap-2 text-destructive"><ShieldAlert className="w-5 h-5" /> Delete Pharmacy</AlertDialogTitle><AlertDialogDescription><span className="block">Permanently delete <strong>{deleteTarget?.name}</strong>?</span></AlertDialogDescription></AlertDialogHeader>
          {phase === "countdown" && <div className="flex flex-col items-center gap-3 py-4"><div className="w-20 h-20 rounded-full border-4 border-destructive/30 flex items-center justify-center"><span className="text-3xl font-bold text-destructive">{countdown}</span></div><p className="text-sm text-muted-foreground">Please wait...</p></div>}
          {phase === "password" && <div className="space-y-3 py-2"><div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-sm text-destructive flex items-start gap-2"><Lock className="w-4 h-4 mt-0.5 shrink-0" /> Enter admin password to confirm</div><div className="space-y-2"><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && password) handleConfirmDelete(); }} autoFocus /></div></div>}
          <AlertDialogFooter><AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>{phase === "password" && <Button variant="destructive" disabled={!password || deleting} onClick={handleConfirmDelete} className="gap-1.5"><Trash2 className="w-4 h-4" /> {deleting ? "Deleting..." : "Delete"}</Button>}</AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
