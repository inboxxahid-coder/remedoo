import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Building2, Phone, MapPin, Stethoscope, FileText, Upload, X, Save, Clock, Users, Star, Calendar,
} from "lucide-react";

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

interface AdminDoctorEditFormProps {
  doctor: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AdminDoctorEditForm({ doctor, open, onOpenChange, onSuccess }: AdminDoctorEditFormProps) {
  const [loading, setLoading] = useState(false);

  // All doctor fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [consultationDuration, setConsultationDuration] = useState("");
  const [maxAppointments, setMaxAppointments] = useState("");
  const [rating, setRating] = useState("");
  const [emergencyAvailable, setEmergencyAvailable] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [featuredSortOrder, setFeaturedSortOrder] = useState("");
  const [accountStatus, setAccountStatus] = useState("active");
  const [approvalStatus, setApprovalStatus] = useState("approved");
  const [adminNote, setAdminNote] = useState("");

  // Document files
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Populate on open
  useEffect(() => {
    if (doctor && open) {
      setName(doctor.name || "");
      setPhone(doctor.phone || "");
      setSpecialization(doctor.specialization || "");
      setBio(doctor.bio || "");
      setConsultationFee(String(doctor.consultation_fee ?? ""));
      setExperienceYears(String(doctor.experience_years ?? ""));
      setConsultationDuration(String(doctor.consultation_duration ?? ""));
      setMaxAppointments(String(doctor.max_appointments_per_day ?? ""));
      setRating(String(doctor.rating ?? ""));
      setEmergencyAvailable(doctor.emergency_available ?? false);
      setIsFeatured(doctor.is_featured ?? false);
      setFeaturedSortOrder(String(doctor.featured_sort_order ?? ""));
      setAccountStatus(doctor.account_status || "active");
      setApprovalStatus(doctor.approval_status || "approved");
      setAdminNote(doctor.admin_note || "");
      setLicenseFile(null);
      setGstFile(null);
      setCertificateFile(null);
      setPhotoFile(null);
    }
  }, [doctor, open]);

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const filePath = `admin/${folder}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from("certificates").upload(filePath, file);
    if (error) { console.error(`Upload error:`, error); return null; }
    return filePath;
  };

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setLoading(true);

    // Upload new files if provided
    const updates: Record<string, any> = {
      name: name.trim(),
      phone: phone.trim() || null,
      specialization: specialization.trim() || null,
      bio: bio.trim() || null,
      consultation_fee: consultationFee ? Number(consultationFee) : null,
      experience_years: experienceYears ? Number(experienceYears) : null,
      consultation_duration: consultationDuration ? Number(consultationDuration) : null,
      max_appointments_per_day: maxAppointments ? Number(maxAppointments) : null,
      rating: rating ? Number(rating) : null,
      emergency_available: emergencyAvailable,
      is_featured: isFeatured,
      featured_sort_order: featuredSortOrder ? Number(featuredSortOrder) : null,
      account_status: accountStatus,
      approval_status: approvalStatus,
      admin_note: adminNote.trim() || null,
    };

    // Upload files
    const fileUploads: Promise<void>[] = [];
    if (licenseFile) {
      fileUploads.push(uploadFile(licenseFile, "license").then(url => { if (url) updates.license_url = url; }));
    }
    if (gstFile) {
      fileUploads.push(uploadFile(gstFile, "gst").then(url => { if (url) updates.gst_url = url; }));
    }
    if (certificateFile) {
      fileUploads.push(uploadFile(certificateFile, "certificate").then(url => { if (url) updates.certificate_url = url; }));
    }
    if (photoFile) {
      fileUploads.push(uploadFile(photoFile, "photo").then(url => { if (url) updates.image_url = url; }));
    }

    if (fileUploads.length > 0) {
      toast.info("Uploading documents...");
      await Promise.all(fileUploads);
    }

    const { error } = await supabase.from("doctors").update(updates).eq("id", doctor.id);
    if (error) {
      toast.error("Failed to update: " + error.message);
      setLoading(false);
      return;
    }

    toast.success("Doctor updated successfully");
    setLoading(false);
    onOpenChange(false);
    onSuccess();
  };

  if (!doctor) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle>Edit Doctor — {doctor.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Basic Details */}
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Stethoscope className="w-4 h-4" /> Basic Information
          </h3>

          <div className="space-y-2">
            <Label>Doctor Name <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Specialization</Label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="pl-10" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
          </div>

          {/* Practice Details */}
          <div className="border-t border-border pt-4" />
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> Practice Details
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Consultation Fee (₹)</Label>
              <Input type="number" value={consultationFee} onChange={(e) => setConsultationFee(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Experience (years)</Label>
              <Input type="number" value={experienceYears} onChange={(e) => setExperienceYears(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Duration (mins)</Label>
              <Input type="number" value={consultationDuration} onChange={(e) => setConsultationDuration(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Max Appts/Day</Label>
              <Input type="number" value={maxAppointments} onChange={(e) => setMaxAppointments(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Rating</Label>
            <Input type="number" step="0.1" min="0" max="5" value={rating} onChange={(e) => setRating(e.target.value)} />
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between">
            <Label>Emergency Available</Label>
            <Switch checked={emergencyAvailable} onCheckedChange={setEmergencyAvailable} />
          </div>

          <div className="flex items-center justify-between">
            <Label>Featured Doctor</Label>
            <Switch checked={isFeatured} onCheckedChange={setIsFeatured} />
          </div>

          {isFeatured && (
            <div className="space-y-2">
              <Label>Featured Sort Order</Label>
              <Input type="number" value={featuredSortOrder} onChange={(e) => setFeaturedSortOrder(e.target.value)} />
            </div>
          )}

          {/* Admin Controls */}
          <div className="border-t border-border pt-4" />
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Star className="w-4 h-4" /> Admin Controls
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Account Status</Label>
              <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)} className="w-full h-10 rounded-md border border-input px-3 text-sm bg-background">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="banned">Banned</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Approval Status</Label>
              <select value={approvalStatus} onChange={(e) => setApprovalStatus(e.target.value)} className="w-full h-10 rounded-md border border-input px-3 text-sm bg-background">
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="returned">Returned</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Admin Note</Label>
            <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} placeholder="Internal note for admin reference..." />
          </div>

          {/* Documents */}
          <div className="border-t border-border pt-4" />
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documents & Photos
          </h3>
          <p className="text-xs text-muted-foreground -mt-2">Upload new files to replace existing ones</p>

          <FileUploadBox id="edit-license" label="License / Registration Certificate" file={licenseFile} existingUrl={doctor.license_url} onFileChange={setLicenseFile} hint="Upload to replace license" />
          <FileUploadBox id="edit-gst" label="GST Certificate" file={gstFile} existingUrl={doctor.gst_url} onFileChange={setGstFile} hint="Upload to replace GST" />
          <FileUploadBox id="edit-certificate" label="Medical Degree / ID Proof" file={certificateFile} existingUrl={doctor.certificate_url} onFileChange={setCertificateFile} hint="Upload to replace certificate" />
          <FileUploadBox id="edit-photo" label="Profile Photo" file={photoFile} existingUrl={doctor.image_url} onFileChange={setPhotoFile} accept=".jpg,.jpeg,.png,.webp" hint="Upload to replace photo" />

          <Button onClick={handleSave} disabled={loading} className="w-full h-12 rounded-xl font-semibold text-base gap-2">
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
