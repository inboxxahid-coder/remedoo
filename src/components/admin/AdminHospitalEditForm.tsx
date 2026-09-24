import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Phone, MapPin, FileText, Upload, X, Save, Star, Bed } from "lucide-react";
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
  hospital: any; open: boolean; onOpenChange: (open: boolean) => void; onSuccess: () => void;
}

export default function AdminHospitalEditForm({ hospital, open, onOpenChange, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [providerEmail, setProviderEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [rating, setRating] = useState("");
  const [totalBeds, setTotalBeds] = useState("");
  const [availableBeds, setAvailableBeds] = useState("");
  const [totalIcuBeds, setTotalIcuBeds] = useState("");
  const [availableIcuBeds, setAvailableIcuBeds] = useState("");
  const [icuAvailable, setIcuAvailable] = useState(false);
  const [isGovernment, setIsGovernment] = useState(false);
  const [commissionPercent, setCommissionPercent] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("approved");
  const [adminNote, setAdminNote] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  useEffect(() => {
    if (hospital && open) {
      setName(hospital.name || ""); setPhone(hospital.phone || ""); setLocation(hospital.location || "");
      setEmergencyContact(hospital.emergency_contact || ""); setRating(String(hospital.rating ?? ""));
      setTotalBeds(String(hospital.total_beds ?? "")); setAvailableBeds(String(hospital.available_beds ?? ""));
      setTotalIcuBeds(String(hospital.total_icu_beds ?? "")); setAvailableIcuBeds(String(hospital.available_icu_beds ?? ""));
      setIcuAvailable(hospital.icu_available ?? false); setIsGovernment(hospital.is_government ?? false);
      setCommissionPercent(String(hospital.platform_commission_percent ?? ""));
      setApprovalStatus(hospital.approval_status || "approved"); setAdminNote(hospital.admin_note || "");
      setLicenseFile(null); setGstFile(null); setPhotoFile(null);
      setProviderEmail("");
      if (hospital.user_id) {
        supabase.from("profiles").select("email").eq("user_id", hospital.user_id).maybeSingle()
          .then(({ data }) => { if (data?.email) setProviderEmail(data.email); });
      }
    }
  }, [hospital, open]);

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
      emergency_contact: emergencyContact.trim() || null, rating: rating ? Number(rating) : null,
      total_beds: totalBeds ? Number(totalBeds) : null, available_beds: availableBeds ? Number(availableBeds) : null,
      total_icu_beds: totalIcuBeds ? Number(totalIcuBeds) : null, available_icu_beds: availableIcuBeds ? Number(availableIcuBeds) : null,
      icu_available: icuAvailable, is_government: isGovernment,
      platform_commission_percent: commissionPercent ? Number(commissionPercent) : null,
      approval_status: approvalStatus, admin_note: adminNote.trim() || null,
    };

    const fileUploads: Promise<void>[] = [];
    if (licenseFile) fileUploads.push(uploadFile(licenseFile, "license").then(url => { if (url) updates.license_url = url; }));
    if (gstFile) fileUploads.push(uploadFile(gstFile, "gst").then(url => { if (url) updates.gst_url = url; }));
    if (photoFile) fileUploads.push(uploadFile(photoFile, "photo").then(url => { if (url) updates.image_url = url; }));
    if (fileUploads.length > 0) { toast.info("Uploading..."); await Promise.all(fileUploads); }

    const { error } = await supabase.from("hospitals").update(updates as never).eq("id", hospital.id);
    if (error) { toast.error("Failed: " + error.message); setLoading(false); return; }
    toast.success("Hospital updated"); setLoading(false); onOpenChange(false); onSuccess();
  };

  if (!hospital) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-4">
        <DialogHeader><DialogTitle>Edit Hospital — {hospital.name}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <AdminEmailChangeRow
            userId={hospital.user_id}
            currentEmail={providerEmail}
            onEmailChanged={(email) => setProviderEmail(email)}
          />
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Building2 className="w-4 h-4" /> Basic Information</h3>
          <div className="space-y-2"><Label>Hospital Name <span className="text-destructive">*</span></Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>Location</Label><div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={location} onChange={(e) => setLocation(e.target.value)} className="pl-10" /></div></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div className="space-y-2"><Label>Emergency Contact</Label><Input value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} /></div>
          </div>

          <div className="border-t border-border pt-4" />
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Bed className="w-4 h-4" /> Capacity</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Total Beds</Label><Input type="number" value={totalBeds} onChange={(e) => setTotalBeds(e.target.value)} /></div>
            <div className="space-y-2"><Label>Available Beds</Label><Input type="number" value={availableBeds} onChange={(e) => setAvailableBeds(e.target.value)} /></div>
            <div className="space-y-2"><Label>Total ICU Beds</Label><Input type="number" value={totalIcuBeds} onChange={(e) => setTotalIcuBeds(e.target.value)} /></div>
            <div className="space-y-2"><Label>Available ICU</Label><Input type="number" value={availableIcuBeds} onChange={(e) => setAvailableIcuBeds(e.target.value)} /></div>
          </div>
          <div className="flex items-center justify-between"><Label>ICU Available</Label><Switch checked={icuAvailable} onCheckedChange={setIcuAvailable} /></div>
          <div className="flex items-center justify-between"><Label>Government Hospital</Label><Switch checked={isGovernment} onCheckedChange={setIsGovernment} /></div>
          <div className="space-y-2"><Label>Rating</Label><Input type="number" step="0.1" min="0" max="5" value={rating} onChange={(e) => setRating(e.target.value)} /></div>

          <div className="border-t border-border pt-4" />
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Star className="w-4 h-4" /> Admin Controls</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Approval Status</Label>
              <select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)} className="w-full h-10 rounded-md border border-input px-3 text-sm bg-background">
                <option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option><option value="returned">Returned</option>
              </select></div>
            <div className="space-y-2"><Label>Commission %</Label><Input type="number" value={commissionPercent} onChange={(e) => setCommissionPercent(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Admin Note</Label><Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} /></div>

          <div className="border-t border-border pt-4" />
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> Documents & Photos</h3>
          <FileUploadBox id="hosp-license" label="License" file={licenseFile} existingUrl={hospital.license_url} onFileChange={setLicenseFile} hint="Upload to replace" />
          <FileUploadBox id="hosp-gst" label="GST Certificate" file={gstFile} existingUrl={hospital.gst_url} onFileChange={setGstFile} hint="Upload to replace" />
          <FileUploadBox id="hosp-photo" label="Hospital Photo" file={photoFile} existingUrl={hospital.image_url} onFileChange={setPhotoFile} accept=".jpg,.jpeg,.png,.webp" hint="Upload to replace" />

          <Button onClick={handleSave} disabled={loading} className="w-full h-12 rounded-xl font-semibold gap-2"><Save className="w-4 h-4" />{loading ? "Saving..." : "Save Changes"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
