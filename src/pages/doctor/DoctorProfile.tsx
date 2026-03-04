import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Upload, Save, BadgeCheck, Lock, X, FileText } from "lucide-react";

interface FileUploadBoxProps {
  id: string;
  label: string;
  file: File | null;
  existingUrl?: string | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  hint?: string;
}

const FileUploadBox = ({ id, label, file, existingUrl, onFileChange, accept = ".pdf,.jpg,.jpeg,.png,.webp", hint }: FileUploadBoxProps) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    {existingUrl && !file && (
      <a href={existingUrl} target="_blank" rel="noopener" className="text-xs text-primary underline block mb-1">📄 View current file</a>
    )}
    <label
      htmlFor={id}
      className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/30"
    >
      <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground truncate flex-1">
        {file ? file.name : hint || "Choose file to replace"}
      </span>
      {file && (
        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFileChange(null); }} className="p-1 rounded-full hover:bg-destructive/10">
          <X className="w-4 h-4 text-destructive" />
        </button>
      )}
    </label>
    <input id={id} type="file" accept={accept} className="hidden" onChange={(e) => { onFileChange(e.target.files?.[0] || null); e.target.value = ""; }} />
  </div>
);

export default function DoctorProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // File uploads
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);

  // Password confirmation dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("doctors").select("*").eq("user_id", session.user.id).maybeSingle();
      setProfile(data);
      setLoading(false);
    };
    load();
  }, []);

  const uploadFileToStorage = async (file: File, bucket: string, folder: string): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const ext = file.name.split(".").pop();
    const path = `${session.user.id}/${folder}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    if (bucket === "avatars") {
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path);
      return publicUrl;
    }
    return path;
  };

  const handleSave = async () => {
    if (!profile) return;

    // Build updates
    const updates: Record<string, any> = {
      name: profile.name,
      specialization: profile.specialization,
      phone: profile.phone,
      bio: profile.bio,
      consultation_fee: profile.consultation_fee,
      experience_years: profile.experience_years ?? 0,
      consultation_duration: profile.consultation_duration ?? 15,
      max_appointments_per_day: profile.max_appointments_per_day ?? 20,
      emergency_available: profile.emergency_available ?? false,
    };

    // Upload files if any
    setUploading(true);
    const fileUploads: Promise<void>[] = [];

    if (avatarFile) {
      fileUploads.push(uploadFileToStorage(avatarFile, "avatars", "doctor_avatar").then(url => { if (url) updates.image_url = url; }));
    }
    if (licenseFile) {
      fileUploads.push(uploadFileToStorage(licenseFile, "certificates", "license").then(url => { if (url) updates.license_url = url; }));
    }
    if (gstFile) {
      fileUploads.push(uploadFileToStorage(gstFile, "certificates", "gst").then(url => { if (url) updates.gst_url = url; }));
    }
    if (certFile) {
      fileUploads.push(uploadFileToStorage(certFile, "certificates", "certificate").then(url => { if (url) updates.certificate_url = url; }));
    }

    if (fileUploads.length > 0) {
      await Promise.all(fileUploads);
    }
    setUploading(false);

    // Require password confirmation
    setPendingUpdates(updates);
    setConfirmPassword("");
    setShowPasswordDialog(true);
  };

  const handlePasswordConfirm = async () => {
    if (!pendingUpdates || !confirmPassword || !profile) return;
    setSaving(true);

    // Verify password
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) { toast.error("Session expired"); setSaving(false); return; }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: confirmPassword,
    });

    if (authError) {
      toast.error("Incorrect password");
      setSaving(false);
      return;
    }

    // Save updates
    const { error } = await supabase.from("doctors").update(pendingUpdates).eq("id", profile.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile updated successfully");
      setProfile({ ...profile, ...pendingUpdates });
      logAuditAction({ action: "update_profile", entityType: "doctor", entityId: profile.id });
      // Reset file states
      setAvatarFile(null);
      setLicenseFile(null);
      setGstFile(null);
      setCertFile(null);
    }

    setSaving(false);
    setShowPasswordDialog(false);
    setPendingUpdates(null);
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="w-40 h-8 rounded" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!profile) return <p className="text-center text-muted-foreground py-12">No linked doctor profile found</p>;

  const set = (key: string, value: any) => setProfile({ ...profile, [key]: value });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">My Profile</h1>

      {/* Approval Status */}
      <div className="flex items-center gap-2">
        {profile.approval_status === "approved" && (
          <>
            <BadgeCheck className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-semibold text-blue-500">Verified</span>
          </>
        )}
        <Badge variant={profile.approval_status === "approved" ? "default" : "secondary"} className={profile.approval_status === "approved" ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500" : ""}>
          {profile.approval_status === "approved" ? "Verified Doctor" : profile.approval_status}
        </Badge>
      </div>

      {/* Avatar */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-3 block">Profile Photo</Label>
        <div className="flex items-center gap-4">
          {profile.image_url ? (
            <img src={profile.image_url} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center text-3xl">👨‍⚕️</div>
          )}
          <div className="flex-1">
            <FileUploadBox id="doc-avatar" label="" file={avatarFile} onFileChange={setAvatarFile} accept=".jpg,.jpeg,.png,.webp" hint="Upload new profile photo" />
          </div>
        </div>
      </Card>

      {/* Basic Info */}
      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Full Name</Label>
            <Input value={profile.name || ""} onChange={e => set("name", e.target.value)} />
          </div>
          <div>
            <Label>Specialization</Label>
            <Input value={profile.specialization || ""} onChange={e => set("specialization", e.target.value)} />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={profile.phone || ""} onChange={e => set("phone", e.target.value)} />
          </div>
          <div>
            <Label>Experience (years)</Label>
            <Input type="number" value={profile.experience_years || 0} onChange={e => set("experience_years", Number(e.target.value))} />
          </div>
          <div>
            <Label>Consultation Fee (₹)</Label>
            <Input type="number" value={profile.consultation_fee || 0} onChange={e => set("consultation_fee", Number(e.target.value))} />
          </div>
          <div>
            <Label>Rating</Label>
            <Input value={profile.rating ?? 0} disabled className="bg-muted/50" />
          </div>
        </div>
        <div>
          <Label>Bio / Description</Label>
          <Textarea value={profile.bio || ""} onChange={e => set("bio", e.target.value)} rows={4} />
        </div>
      </Card>

      {/* Practice Settings */}
      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Practice Settings</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Consultation Duration (mins)</Label>
            <Input type="number" value={profile.consultation_duration ?? 15} onChange={e => set("consultation_duration", Number(e.target.value))} />
          </div>
          <div>
            <Label>Max Appointments / Day</Label>
            <Input type="number" value={profile.max_appointments_per_day ?? 20} onChange={e => set("max_appointments_per_day", Number(e.target.value))} />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Label>Emergency Available</Label>
          <Switch checked={profile.emergency_available ?? false} onCheckedChange={(v) => set("emergency_available", v)} />
        </div>
      </Card>

      {/* Documents */}
      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4" /> Documents
        </h2>
        <p className="text-xs text-muted-foreground">Upload new files to replace existing ones. Changes require password confirmation.</p>

        <FileUploadBox id="doc-license" label="License / Registration Certificate" file={licenseFile} existingUrl={profile.license_url} onFileChange={setLicenseFile} hint="Upload to replace license" />
        <FileUploadBox id="doc-gst" label="GST Certificate" file={gstFile} existingUrl={profile.gst_url} onFileChange={setGstFile} hint="Upload to replace GST certificate" />
        <FileUploadBox id="doc-cert" label="Medical Degree / ID Proof" file={certFile} existingUrl={profile.certificate_url} onFileChange={setCertFile} hint="Upload to replace certificate" />
      </Card>

      {/* Hospital Info */}
      {profile.hospital_id && (
        <Card className="p-5">
          <Label className="text-sm font-semibold mb-1 block">Hospital Affiliation</Label>
          <p className="text-sm text-muted-foreground">Linked to hospital ID: {profile.hospital_id.slice(0, 8)}...</p>
          <p className="text-xs text-amber-500 mt-1">⚠️ Hospital changes require admin approval</p>
        </Card>
      )}

      <Button onClick={handleSave} disabled={saving || uploading} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {uploading ? "Uploading files..." : saving ? "Saving..." : "Save Profile"}
      </Button>

      {/* Password Confirmation Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={(v) => { if (!v) { setShowPasswordDialog(false); setPendingUpdates(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" /> Confirm Password
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Enter your password to confirm profile changes.</p>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw">Password</Label>
            <Input
              id="confirm-pw"
              type="password"
              placeholder="Enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && confirmPassword) handlePasswordConfirm(); }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPasswordDialog(false); setPendingUpdates(null); }}>Cancel</Button>
            <Button onClick={handlePasswordConfirm} disabled={!confirmPassword || saving}>
              {saving ? "Saving..." : "Confirm & Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
