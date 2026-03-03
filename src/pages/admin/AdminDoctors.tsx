import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import AdminCrudTable, { ColumnDef } from "@/components/admin/AdminCrudTable";
import AdminProviderAddForm from "@/components/admin/AdminProviderAddForm";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Trash2, ShieldAlert, Lock, Plus } from "lucide-react";

const columns: ColumnDef[] = [
  { key: "name", label: "Name", editable: true },
  { key: "specialization", label: "Specialization", editable: true },
  { key: "phone", label: "Phone", editable: true },
  { key: "rating", label: "Rating", type: "number", editable: true },
  { key: "consultation_fee", label: "Fee", type: "number", editable: true },
  { key: "bio", label: "Bio", editable: true },
  { key: "image_url", label: "Image URL", editable: true },
];

export default function AdminDoctors() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [countdown, setCountdown] = useState(10);
  const [phase, setPhase] = useState<"countdown" | "password">("countdown");
  const [password, setPassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data } = await supabase.from("doctors").select("*").order("created_at", { ascending: false });
    setData(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const startDelete = useCallback(async (id: string) => {
    const doctor = data.find((d) => d.id === id);
    setDeleteTarget({ id, name: doctor?.name || "Unknown" });
    setCountdown(10);
    setPhase("countdown");
    setPassword("");
    setDeleting(false);
  }, [data]);

  // Countdown timer
  useEffect(() => {
    if (!deleteTarget || phase !== "countdown") return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setPhase("password");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [deleteTarget, phase]);

  const handleCancel = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setDeleteTarget(null);
    setPassword("");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !password) return;
    setDeleting(true);

    // Verify admin password by re-authenticating
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) {
      toast.error("Session expired. Please log in again.");
      setDeleting(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password,
    });

    if (authError) {
      toast.error("Incorrect admin password");
      setDeleting(false);
      return;
    }

    // Delete the doctor
    const { error } = await supabase.from("doctors").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Failed to delete doctor: " + error.message);
      setDeleting(false);
      return;
    }

    toast.success(`Doctor "${deleteTarget.name}" has been permanently deleted`);
    handleCancel();
    fetchData();
  };

  return (
    <>
      <AdminCrudTable
        title="Doctors"
        data={data}
        columns={columns}
        loading={loading}
        customAddButton={
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add New</span><span className="sm:hidden">Add</span>
          </Button>
        }
        onAdd={async () => {}}
        onUpdate={async (id, item) => { const { error } = await supabase.from("doctors").update(item).eq("id", id); if (error) throw error; fetchData(); }}
        onDelete={startDelete}
      />

      <AdminProviderAddForm type="doctor" open={addOpen} onOpenChange={setAddOpen} onSuccess={fetchData} />

      {/* Secure Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              Delete Doctor
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                You are about to <strong className="text-destructive">permanently delete</strong>{" "}
                <strong>{deleteTarget?.name}</strong>. This action cannot be undone.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          {phase === "countdown" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-20 h-20 rounded-full border-4 border-destructive/30 flex items-center justify-center">
                <span className="text-3xl font-bold text-destructive">{countdown}</span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Please wait before confirming deletion...
              </p>
            </div>
          )}

          {phase === "password" && (
            <div className="space-y-3 py-2">
              <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-sm text-destructive flex items-start gap-2">
                <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                Enter your admin password to confirm deletion
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-password">Admin Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && password) handleConfirmDelete(); }}
                  autoFocus
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            {phase === "password" && (
              <Button
                variant="destructive"
                disabled={!password || deleting}
                onClick={handleConfirmDelete}
                className="gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Deleting..." : "Delete Permanently"}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
