import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logAuditAction } from "@/lib/auditLog";
import { Upload, Save, ShieldCheck } from "lucide-react";

export default function DoctorProfile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

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

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);

    // Non-critical fields can be updated directly
    const { error } = await supabase.from("doctors").update({
      name: profile.name,
      specialization: profile.specialization,
      phone: profile.phone,
      bio: profile.bio,
      consultation_fee: profile.consultation_fee,
      experience_years: (profile as any).experience_years ?? 0,
    } as any).eq("id", profile.id);

    if (error) toast.error(error.message);
    else {
      toast.success("Profile updated");
      logAuditAction({ action: "update_profile", entityType: "doctor", entityId: profile.id });
    }
    setSaving(false);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !profile) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(avatarFile.type)) { toast.error("Only JPEG, PNG, WEBP allowed"); return; }
    if (avatarFile.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }

    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUploading(false); return; }

    const path = `${session.user.id}/doctor_avatar.${avatarFile.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("avatars").upload(path, avatarFile, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("doctors").update({ image_url: publicUrl }).eq("id", profile.id);
    setProfile({ ...profile, image_url: publicUrl });
    toast.success("Photo uploaded");
    logAuditAction({ action: "upload_avatar", entityType: "doctor", entityId: profile.id });
    setAvatarFile(null);
    setUploading(false);
  };

  const handleCertUpload = async () => {
    if (!certFile || !profile) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(certFile.type)) { toast.error("Only PDF, JPEG, PNG allowed"); return; }
    if (certFile.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }

    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUploading(false); return; }

    const path = `${session.user.id}/certificate_${Date.now()}.${certFile.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("certificates").upload(path, certFile);
    if (error) { toast.error(error.message); setUploading(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("certificates").getPublicUrl(path);
    await supabase.from("doctors").update({ certificate_url: publicUrl } as any).eq("id", profile.id);
    setProfile({ ...profile, certificate_url: publicUrl });
    toast.success("Certificate uploaded");
    logAuditAction({ action: "upload_certificate", entityType: "doctor", entityId: profile.id });
    setCertFile(null);
    setUploading(false);
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
        <ShieldCheck className="w-4 h-4 text-muted-foreground" />
        <Badge variant={profile.approval_status === "approved" ? "default" : "secondary"}>
          {profile.approval_status}
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
          <div className="flex-1 space-y-2">
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={e => setAvatarFile(e.target.files?.[0] || null)}
            />
            {avatarFile && (
              <Button size="sm" onClick={handleAvatarUpload} disabled={uploading}>
                <Upload className="w-4 h-4 mr-1" /> {uploading ? "Uploading..." : "Upload Photo"}
              </Button>
            )}
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
            <p className="text-xs text-amber-500 mt-1">⚠️ Changes require admin approval</p>
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={profile.phone || ""} onChange={e => set("phone", e.target.value)} />
          </div>
          <div>
            <Label>Experience (years)</Label>
            <Input type="number" value={(profile as any).experience_years || 0} onChange={e => set("experience_years", Number(e.target.value))} />
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

      {/* Certificate Upload */}
      <Card className="p-5">
        <Label className="text-sm font-semibold mb-3 block">Medical Certificate</Label>
        {(profile as any).certificate_url && (
          <a href={(profile as any).certificate_url} target="_blank" rel="noopener" className="text-sm text-primary underline mb-2 block">
            📄 View Current Certificate
          </a>
        )}
        <Input
          type="file"
          accept=".pdf,image/jpeg,image/png"
          onChange={e => setCertFile(e.target.files?.[0] || null)}
        />
        {certFile && (
          <Button size="sm" onClick={handleCertUpload} disabled={uploading} className="mt-2">
            <Upload className="w-4 h-4 mr-1" /> {uploading ? "Uploading..." : "Upload Certificate"}
          </Button>
        )}
      </Card>

      {/* Hospital Info */}
      {profile.hospital_id && (
        <Card className="p-5">
          <Label className="text-sm font-semibold mb-1 block">Hospital Affiliation</Label>
          <p className="text-sm text-muted-foreground">Linked to hospital ID: {profile.hospital_id.slice(0, 8)}...</p>
          <p className="text-xs text-amber-500 mt-1">⚠️ Hospital changes require admin approval</p>
        </Card>
      )}

      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Profile"}
      </Button>
    </div>
  );
}
