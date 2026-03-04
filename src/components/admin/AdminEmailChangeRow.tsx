import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Pencil, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminEmailChangeRowProps {
  userId: string | null;
  currentEmail: string;
  onEmailChanged?: (newEmail: string) => void;
}

export default function AdminEmailChangeRow({ userId, currentEmail, onEmailChanged }: AdminEmailChangeRowProps) {
  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState(currentEmail);
  const [loading, setLoading] = useState(false);

  const handleChangeEmail = async () => {
    if (!userId) {
      toast.error("No linked user account found");
      return;
    }
    if (!newEmail.trim() || newEmail.trim() === currentEmail) {
      setEditing(false);
      return;
    }
    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Not authenticated");
        setLoading(false);
        return;
      }

      const res = await supabase.functions.invoke("admin-change-email", {
        body: { user_id: userId, new_email: newEmail.trim() },
      });

      if (res.error) {
        toast.error(res.error.message || "Failed to change email");
      } else if (res.data?.error) {
        toast.error(res.data.error);
      } else {
        toast.success("Email updated successfully");
        setEditing(false);
        onEmailChanged?.(newEmail.trim());
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to change email");
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5">
          <Mail className="w-4 h-4 text-muted-foreground" /> Account Email
        </Label>
        <p className="text-sm text-muted-foreground italic">No linked user account</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-1.5">
        <Mail className="w-4 h-4 text-muted-foreground" /> Account Email
      </Label>
      {editing ? (
        <div className="flex items-center gap-2">
          <Input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="flex-1"
            placeholder="Enter new email"
            disabled={loading}
          />
          <Button
            size="icon"
            variant="ghost"
            onClick={handleChangeEmail}
            disabled={loading}
            className="shrink-0 h-10 w-10 text-primary hover:bg-primary/10"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => { setEditing(false); setNewEmail(currentEmail); }}
            disabled={loading}
            className="shrink-0 h-10 w-10 text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            value={currentEmail}
            readOnly
            className="flex-1 bg-muted/50 cursor-default"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setNewEmail(currentEmail); setEditing(true); }}
            className="shrink-0 gap-1.5 text-xs"
          >
            <Pencil className="w-3.5 h-3.5" /> Change
          </Button>
        </div>
      )}
    </div>
  );
}
