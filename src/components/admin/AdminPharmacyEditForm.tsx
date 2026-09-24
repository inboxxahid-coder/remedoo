import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Phone, MapPin, FileText, Upload, X, Save, Star, Store } from "lucide-react";
import AdminEmailChangeRow from "./AdminEmailChangeRow";

interface FileUploadBoxProps {
  id: string; label: string; file: File | null; existingUrl?: string | null;
  onFileChange: (file: File | null) => void; accept?: string; hint?: string;
}

const FileUploadBox = ({ id, label, file, existingUrl, onFileChange, accept = ".pdf,.jpg,.jpeg,.png,.webp", hint }: FileUploadBoxProps) => (
  <div className="space-y-1.5">
    <Label htmlFor={id}>{label}</Label>
    {existingUrl && !file && <a href={existingUrl} target="_blank" rel="noopener" className="text-xs text-primary underline block mb-1">📄 View current file</a>}
    <label htmlFor={id} className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/30">
      <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
      <span className="text-sm text-muted-foreground truncate flex-1">{file ? file.name : hint || "Choose file to replace"}</span>
      {file && <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFileChange(null); }} className="p-1 rounded-full hover:bg-destructive/10"><X className="w-4 h-4 text-destructive" /></button>}
    </label>
    <input id={id} type="file" accept={accept} className="hidden" onChange={(e) => { onFileChange(e.target.files?.[0] || null); e.target.value = ""; }} />
  </div>
);

interface Props {
  pharmacy: any; open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void;
}

export default function AdminPharmacyEditForm({ pharmacy, open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [providerEmail, setProviderEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [rating, setRating] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("approved");
  const [adminNote, setAdminNote] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (pharmacy && open) {
      setName(pharmacy.name || ""); setPhone(pharmacy.phone || ""); setLocation(pharmacy.location || "");
      setRating(String(pharmacy.rating ?? "")); setLatitude(String(pharmacy.latitude ?? "")); setLongitude(String(pharmacy.longitude ?? ""));
      setApprovalStatus(pharmacy.approval_status || "approved"); setAdminNote(pharmacy.admin_note || "");
      setLicenseFile(null); setGstFile(null); setPhotoFile(null);
      setProviderEmail("");
      if (pharmacy.user_id) {
        supabase.from("profiles").select("email").eq("user_id", pharmacy.user_id).maybeSingle()
          .then(({ data }) => { if (data?.email) setProviderEmail(data.email); });
      }
    }
  }, [pharmacy, open]);

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const filePath = `admin/${folder}_${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage.from("certificates").upload(filePath, file);
    if (error) return null;
    return filePath;
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setLoading(true);
    const updates: Record<string, any> = {
      name: name.trim(), phone: phone.trim() || null, location: location.trim() || null,
      rating: rating ? Number(rating) : null,
      latitude: latitude ? Number(latitude) : null, longitude: longitude ? Number(longitude) : null,
      approval_status: approvalStatus, admin_note: adminNote.trim() || null,
    };

    const fileUploads: Promise<void>[] = [];
    if (licenseFile) fileUploads.push(uploadFile(licenseFile, "license").then(url => { if (url) updates.license_url = url; }));
    if (gstFile) fileUploads.push(uploadFile(gstFile, "gst").then(url => { if (url) updates.gst_url = url; }));
    if (photoFile) fileUploads.push(uploadFile(photoFile, "photo").then(url => { if (url) updates.image_url = url; }));
    if (fileUploads.length > 0) { toast.info("Uploading..."); await Promise.all(fileUploads); }

    const { error } = await supabase.from("pharmacies").update(updates as never).eq("id", pharmacy.id);
    if (error) { toast.error("Failed: " + error.message); setLoading(false); return; }
    toast.success("Pharmacy updated"); setLoading(false); onOpenChange(false); onSuccess();
  };

  if (!pharmacy) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-4">
        <DialogHeader><DialogTitle>Edit Pharmacy — {pharmacy.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <AdminEmailChangeRow
            userId={pharmacy.user_id}
            currentEmail={providerEmail}
            onEmailChanged={(email) => setProviderEmail(email)}
          />
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Store className="w-4 h-4" /> Basic Information</h3>
          <div className="space-y-2"><Label>Pharmacy Name <span className="text-destructive">*</span></Label><div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={name} onChange={(e) => setName(e.target.value)} className="pl-10" /></div></div>
          <div className="space-y-2"><Label>Phone</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" /></div></div>
          <div className="space-y-2"><Label>Location</Label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10" /></div></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Latitude</Label><Input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} /></div>
            <div className="space-y-2"><Label>Longitude</Label><Input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Rating</Label><Input type="number" step="0.1" min="0" max="5" value={rating} onChange={(e) => setRating(e.target.value)} /></div>

          <div className="border-t border-border pt-4" />
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Star className="w-4 h-4" /> Admin Controls</h3>
          <div className="space-y-2"><Label>Approval Status</Label>
            <select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)} className="w-full h-10 rounded-md border border-input px-3 text-sm bg-background">
              <option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="returned">Returned</option>
            </select></div>
          <div className="space-y-2"><Label>Admin Note</Label><Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} /></div>

          <div className="border-t border-border pt-4" />
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Documents & Photos</h3>
          <FileUploadBox id="pharm-license" label="License" file={licenseFile} existingUrl={pharmacy.license_url} onFileChange={setLicenseFile} hint="Upload to replace" />
          <FileUploadBox id="pharm-gst" label="GST Certificate" file={gstFile} existingUrl={pharmacy.gst_url} onFileChange={setGstFile} hint="Upload to replace" />
          <FileUploadBox id="pharm-photo" label="Pharmacy Photo" file={photoFile} existingUrl={pharmacy.image_url} onFileChange={setPhotoFile} accept=".jpg,.jpeg,.png,.webp" hint="Upload to replace" />

          <Button onClick={handleSave} disabled={loading} className="w-full h-12 rounded-xl font-semibold gap-2"><Save className="w-4 h-4" />{loading ? "Saving..." : "Save Changes"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
