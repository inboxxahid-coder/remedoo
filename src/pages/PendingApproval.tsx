import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, LogOut, AlertTriangle, Upload, RotateCcw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PendingApproval = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"pending" | "returned" | "rejected">("pending");
  const [adminNote, setAdminNote] = useState<string | null>(null);
  const [providerTable, setProviderTable] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [newFile, setNewFile] = useState<File | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;

      // Check which provider type this user is
      const tables = [
        { table: "doctors", role: "doctor" },
        { table: "hospitals", role: "hospital_admin" },
        { table: "labs", role: "lab_admin" },
        { table: "pharmacies", role: "pharmacy_admin" },
      ];

      for (const { table } of tables) {
        const { data } = await (supabase
          .from(table as any)
          .select("id, approval_status, admin_note")
          .eq("user_id", userId)
          .maybeSingle() as any);
        if (data) {
          setProviderTable(table);
          setProviderId(data.id);
          setStatus(data.approval_status as any);
          setAdminNote(data.admin_note || null);
          break;
        }
      }
    };
    fetchStatus();
  }, []);

  const handleReupload = async () => {
    if (!newFile || !providerTable || !providerId) return;
    setUploading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast.error("Session expired"); setUploading(false); return; }

    const fileExt = newFile.name.split('.').pop();
    const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage.from("certificates").upload(filePath, newFile);
    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    // Update provider record with new certificate and set back to pending
    const { error } = await supabase
      .from(providerTable as any)
      .update({ certificate_url: filePath, approval_status: "pending", admin_note: null } as any)
      .eq("id", providerId);

    if (error) {
      toast.error("Failed to update: " + error.message);
      setUploading(false);
      return;
    }

    toast.success("Documents re-uploaded! Your application is back under review.");
    setStatus("pending");
    setAdminNote(null);
    setNewFile(null);
    setUploading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="bg-card rounded-2xl shadow-lg border border-border p-8 max-w-md w-full text-center space-y-5">

        {status === "returned" ? (
          <>
            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto">
              <RotateCcw className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Documents Returned</h1>
            <p className="text-muted-foreground text-sm">
              The admin has reviewed your registration and sent it back for revision.
            </p>

            {adminNote && (
              <div className="bg-blue-500/5 border border-blue-200 rounded-xl p-4 text-left">
                <p className="text-xs font-semibold text-blue-600 mb-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Admin Note
                </p>
                <p className="text-sm text-foreground">{adminNote}</p>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <label
                htmlFor="reupload"
                className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/30"
              >
                <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-sm text-muted-foreground truncate">
                  {newFile ? newFile.name : "Upload new documents (PDF/Image)"}
                </span>
              </label>
              <input
                id="reupload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => setNewFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">Max 5MB. Accepted: PDF, JPG, PNG</p>

              <Button
                onClick={handleReupload}
                disabled={!newFile || uploading}
                className="w-full h-11 gap-1.5"
              >
                <FileText className="w-4 h-4" />
                {uploading ? "Uploading..." : "Re-submit for Review"}
              </Button>
            </div>
          </>
        ) : status === "rejected" ? (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Registration Rejected</h1>
            <p className="text-muted-foreground text-sm">
              Unfortunately, your registration has been rejected.
            </p>
            {adminNote && (
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 text-left">
                <p className="text-xs font-semibold text-destructive mb-1">Reason</p>
                <p className="text-sm text-foreground">{adminNote}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Registration Submitted</h1>
            <p className="text-muted-foreground text-sm">
              Your provider registration is under review. You'll be able to access your dashboard once an admin approves your account.
            </p>
            <p className="text-xs text-muted-foreground">
              This usually takes 24–48 hours. You'll receive a notification once approved.
            </p>
          </>
        )}

        <Button variant="outline" onClick={handleLogout} className="gap-2">
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </div>
    </div>
  );
};

export default PendingApproval;
