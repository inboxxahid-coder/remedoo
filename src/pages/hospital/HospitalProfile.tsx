import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Save, BadgeCheck, Lock, Upload, X, FileText } from "lucide-react";
import { getHospitalImage } from "@/lib/providerDefaults";

interface FileUploadBoxProps {
  id: string; label: string; file: File | null; existingUrl?: string | null;
  onFileChange: (file: File | null) => void; accept?: string; hint?: string;
}
const FileUploadBox = ({ id, label, file, existingUrl, onFileChange, accept = ".pdf,.jpg,.jpeg,.png,.webp", hint }: FileUploadBoxProps) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    {existingUrl && !file && <a href={existingUrl} target="_blank" rel="noopener" className="text-xs text-primary underline block mb-1">📄 View current</a>}
    <label htmlFor={id} className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/30">
      <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground truncate flex-1">{file ? file.name : hint || "Choose file"}</span>
      {file && <button aria-label="Clear search" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFileChange(null); }} className="p-1 rounded-full hover:bg-destructive/10"><X className="w-4 h-4 text-destructive" /></button>}
    </label>
    <input id={id} type="file" accept={accept} className="hidden" onChange={(e) => { onFileChange(e.target.files?.[0] || null); e.target.value = ""; }} />
  </div>
);

export default function HospitalProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingUpdates, setPendingUpdates] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase.from("hospitals").select("*").eq("user_id", session.user.id).maybeSingle();
      setProfile(data);
      setLoading(false);
    };
    load();
  }, []);

  const uploadFileToStorage = async (file: File, folder: string): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const path = `${session.user.id}/${folder}_${Date.now()}.${file.name.split(".").pop()}`;
    const bucket = folder === "photo" ? "avatars" : "certificates";
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return null; }
    if (bucket === "avatars") { const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path); return publicUrl; }
    return path;
  };

  const handleSave = async () => {
    if (!profile) return;
    const updates: Record<string, any> = {
      name: profile.name, location: profile.location, phone: profile.phone,
      emergency_contact: profile.emergency_contact, is_government: profile.is_government,
      total_beds: profile.total_beds, available_beds: profile.available_beds,
      total_icu_beds: profile.total_icu_beds, available_icu_beds: profile.available_icu_beds,
      icu_available: profile.icu_available,
    };
    setUploading(true);
    const uploads: Promise<void>[] = [];
    if (photoFile) uploads.push(uploadFileToStorage(photoFile, "photo").then(url => { if (url) updates.image_url = url; }));
    if (licenseFile) uploads.push(uploadFileToStorage(licenseFile, "license").then(url => { if (url) updates.license_url = url; }));
    if (gstFile) uploads.push(uploadFileToStorage(gstFile, "gst").then(url => { if (url) updates.gst_url = url; }));
    if (uploads.length > 0) await Promise.all(uploads);
    setUploading(false);
    setPendingUpdates(updates); setConfirmPassword(""); setShowPasswordDialog(true);
  };

  const handlePasswordConfirm = async () => {
    if (!pendingUpdates || !confirmPassword || !profile) return;
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.email) { toast.error("Session expired"); setSaving(false); return; }
    const { error: authError } = await supabase.auth.signInWithPassword({ email: session.user.email, password: confirmPassword });
    if (authError) { toast.error("Incorrect password"); setSaving(false); return; }
    const { error } = await supabase.from("hospitals").update(pendingUpdates as never).eq("id", profile.id);
    if (error) toast.error(error.message);
    else { toast.success("Profile updated"); setProfile({ ...profile, ...pendingUpdates }); logAuditAction({ action: "update_hospital_profile", entityType: "hospital", entityId: profile.id }); setPhotoFile(null); setLicenseFile(null); setGstFile(null); }
    setSaving(false); setShowPasswordDialog(false); setPendingUpdates(null);
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  if (!profile) return <p className="text-center text-muted-foreground py-12">No linked hospital profile</p>;

  const set = (k: string, v: any) => setProfile({ ...profile, [k]: v });

  return (
    <div className="max-w-2xl space-y-6">
      {/* Hero Section */}
      <Card className="p-3 sticky top-0 z-20 bg-card shadow-sm">
        <div className="flex items-center gap-3">
          <img src={getHospitalImage(profile.image_url)} alt={profile.name || "Hospital"} className="w-10 h-10 rounded-xl object-cover border border-primary/20" />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-foreground truncate">{profile.name || "Unnamed Hospital"}</h1>
            <p className="text-xs text-muted-foreground">{profile.location || "Location not set"}</p>
            <div className="flex items-center gap-2 mt-1.5">
              {profile.approval_status === "approved" && <BadgeCheck className="w-4 h-4 text-red-500" />}
              <Badge variant={profile.approval_status === "approved" ? "default" : "secondary"} className={profile.approval_status === "approved" ? "bg-red-500 hover:bg-red-600 text-white border-red-500 text-xs" : "text-xs"}>
                {profile.approval_status === "approved" ? "Verified Hospital" : profile.approval_status}
              </Badge>
            </div>
          </div>
        </div>
        <div className="mt-2">
          <FileUploadBox id="hosp-photo" label="" file={photoFile} onFileChange={setPhotoFile} accept=".jpg,.jpeg,.png,.webp" hint="Upload new photo" />
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
        <div><Label>Name</Label><Input value={profile.name || ""} onChange={e => set("name", e.target.value)} /></div>
        <div><Label>Location</Label><Input value={profile.location || ""} onChange={e => set("location", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Phone</Label><Input value={profile.phone || ""} onChange={e => set("phone", e.target.value)} /></div>
          <div><Label>Emergency Contact</Label><Input value={profile.emergency_contact || ""} onChange={e => set("emergency_contact", e.target.value)} /></div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Bed Capacity</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><Label>Total Beds</Label><Input type="number" value={profile.total_beds || 0} onChange={e => set("total_beds", Number(e.target.value))} /></div>
          <div><Label>Available Beds</Label><Input type="number" value={profile.available_beds || 0} onChange={e => set("available_beds", Number(e.target.value))} /></div>
          <div><Label>Total ICU Beds</Label><Input type="number" value={profile.total_icu_beds || 0} onChange={e => set("total_icu_beds", Number(e.target.value))} /></div>
          <div><Label>Available ICU</Label><Input type="number" value={profile.available_icu_beds || 0} onChange={e => set("available_icu_beds", Number(e.target.value))} /></div>
        </div>
        <div className="flex items-center justify-between pt-2"><Label>ICU Available</Label><Switch checked={profile.icu_available || false} onCheckedChange={v => set("icu_available", v)} /></div>
        <div className="flex items-center justify-between"><Label>Government Hospital</Label><Switch checked={profile.is_government || false} onCheckedChange={v => set("is_government", v)} /></div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Documents</h2>
        <p className="text-xs text-muted-foreground">Upload new files to replace existing. Changes require password confirmation.</p>
        <FileUploadBox id="hosp-license" label="License" file={licenseFile} existingUrl={profile.license_url} onFileChange={setLicenseFile} hint="Upload to replace" />
        <FileUploadBox id="hosp-gst" label="GST Certificate" file={gstFile} existingUrl={profile.gst_url} onFileChange={setGstFile} hint="Upload to replace" />
      </Card>

      <Button onClick={handleSave} disabled={saving || uploading} className="w-full"><Save className="w-4 h-4 mr-2" />{uploading ? "Uploading..." : saving ? "Saving..." : "Save Profile"}</Button>

      <Dialog open={showPasswordDialog} onOpenChange={(v) => { if (!v) { setShowPasswordDialog(false); setPendingUpdates(null); } }}>
        <DialogContent className="max-w-sm"><DialogHeader><DialogTitle className="flex items-center gap-2"><Lock className="w-5 h-5" /> Confirm Password</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Enter your password to confirm changes.</p>
          <div className="space-y-2"><Label>Password</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && confirmPassword) handlePasswordConfirm(); }} autoFocus /></div>
          <DialogFooter><Button variant="outline" onClick={() => { setShowPasswordDialog(false); setPendingUpdates(null); }}>Cancel</Button><Button onClick={handlePasswordConfirm} disabled={!confirmPassword || saving}>{saving ? "Saving..." : "Confirm & Save"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
