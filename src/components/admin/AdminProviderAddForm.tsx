import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Building2, Phone, MapPin, Stethoscope, FileText, Upload, X, Camera,
} from "lucide-react";

type ProviderType = "doctor" | "hospital" | "lab" | "pharmacy";

interface FileUploadBoxProps {
  id: string;
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  accept?: string;
  hint?: string;
  required?: boolean;
  maxSizeKB?: number;
}

const FileUploadBox = ({ id, label, file, onFileChange, accept = ".pdf,.jpg,.jpeg,.png,.webp", hint, required, maxSizeKB }: FileUploadBoxProps) => {
  const handleFileSelect = (selectedFile: File | null) => {
    if (selectedFile && maxSizeKB && selectedFile.size > maxSizeKB * 1024) {
      toast.error(`${label} must be under ${maxSizeKB}KB`);
      return;
    }
    onFileChange(selectedFile);
  };

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label} {required && <span className="text-destructive">*</span>}
        {maxSizeKB && <span className="text-xs text-muted-foreground ml-1">(max {maxSizeKB}KB)</span>}
      </Label>
      <div className="relative">
        <label
          htmlFor={id}
          className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors bg-muted/30"
        >
          <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
          <span className="text-sm text-muted-foreground truncate flex-1">
            {file ? file.name : hint || "Choose file (PDF/Image)"}
          </span>
          {file && (
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFileChange(null); }}
              className="p-1 rounded-full hover:bg-destructive/10"
            >
              <X className="w-4 h-4 text-destructive" />
            </button>
          )}
        </label>
        <input
          id={id}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => { handleFileSelect(e.target.files?.[0] || null); e.target.value = ""; }}
        />
      </div>
    </div>
  );
};

interface AdminProviderAddFormProps {
  type: ProviderType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export default function AdminProviderAddForm({ type, open, onOpenChange, onSuccess }: AdminProviderAddFormProps) {
  const [loading, setLoading] = useState(false);

  // Provider fields
  const [providerName, setProviderName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [consultationFee, setConsultationFee] = useState("");
  const [rating, setRating] = useState("");

  // Hospital-specific
  const [beds, setBeds] = useState("");
  const [icuAvailable, setIcuAvailable] = useState(false);

  // Document fields
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [additionalDoc1, setAdditionalDoc1] = useState<File | null>(null);
  const [additionalDoc2, setAdditionalDoc2] = useState<File | null>(null);
  const [additionalDoc3, setAdditionalDoc3] = useState<File | null>(null);

  const resetForm = () => {
    setProviderName("");
    setPhone("");
    setLocation("");
    setSpecialization("");
    setBio("");
    setConsultationFee("");
    setRating("");
    setBeds("");
    setIcuAvailable(false);
    setLicenseFile(null);
    setGstFile(null);
    setCertificateFile(null);
    setPhotoFile(null);
    setAdditionalDoc1(null);
    setAdditionalDoc2(null);
    setAdditionalDoc3(null);
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split(".").pop();
    const filePath = `admin/${folder}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from("certificates").upload(filePath, file);
    if (error) {
      console.error(`Upload error (${folder}):`, error);
      return null;
    }
    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerName.trim()) {
      toast.error("Name is required");
      return;
    }

    setLoading(true);

    // Upload all files in parallel
    const uploadPromises: Promise<{ key: string; url: string | null }>[] = [];

    if (licenseFile) {
      uploadPromises.push(uploadFile(licenseFile, "license").then(url => ({ key: "license_url", url })));
    }
    if (gstFile) {
      uploadPromises.push(uploadFile(gstFile, "gst").then(url => ({ key: "gst_url", url })));
    }
    if (certificateFile) {
      uploadPromises.push(uploadFile(certificateFile, "certificate").then(url => ({ key: "certificate_url", url })));
    }
    if (photoFile) {
      uploadPromises.push(uploadFile(photoFile, "photo").then(url => ({ key: "image_url", url })));
    }

    const additionalDocUrls: string[] = [];
    const additionalDocFiles = [additionalDoc1, additionalDoc2, additionalDoc3].filter(Boolean) as File[];
    for (let i = 0; i < additionalDocFiles.length; i++) {
      uploadPromises.push(
        uploadFile(additionalDocFiles[i], `doc_${i}`).then(url => {
          if (url) additionalDocUrls.push(url);
          return { key: "_additional", url };
        })
      );
    }

    let uploadResults: { key: string; url: string | null }[] = [];
    if (uploadPromises.length > 0) {
      toast.info("Uploading documents...");
      uploadResults = await Promise.all(uploadPromises);
    }

    // Build provider data
    const providerData: Record<string, any> = {
      name: providerName.trim(),
      phone: phone.trim() || null,
      rating: rating ? Number(rating) : null,
    };

    // Add uploaded URLs
    for (const result of uploadResults) {
      if (result.key !== "_additional" && result.url) {
        providerData[result.key] = result.url;
      }
    }
    if (additionalDocUrls.length > 0) {
      providerData.additional_docs_urls = additionalDocUrls;
    }

    // Type-specific fields
    if (type === "doctor") {
      providerData.specialization = specialization.trim() || null;
      providerData.bio = bio.trim() || null;
      providerData.consultation_fee = consultationFee ? Number(consultationFee) : null;
    } else {
      providerData.location = location.trim() || null;
    }

    if (type === "hospital") {
      providerData.beds = beds ? Number(beds) : null;
      providerData.icu_available = icuAvailable;
    }

    // Insert
    let error: any = null;
    if (type === "doctor") {
      ({ error } = await supabase.from("doctors").insert([providerData] as any));
    } else if (type === "hospital") {
      ({ error } = await supabase.from("hospitals").insert([providerData] as any));
    } else if (type === "lab") {
      ({ error } = await supabase.from("labs").insert([providerData] as any));
    } else if (type === "pharmacy") {
      ({ error } = await supabase.from("pharmacies").insert([providerData] as any));
    }

    if (error) {
      toast.error("Failed to add: " + error.message);
      setLoading(false);
      return;
    }

    toast.success(`${typeLabel} added successfully`);
    resetForm();
    setLoading(false);
    onOpenChange(false);
    onSuccess();
  };

  const typeLabel = type === "doctor" ? "Doctor" : type === "hospital" ? "Hospital" : type === "lab" ? "Lab" : "Pharmacy";

  const getPhotoLabel = () => {
    switch (type) {
      case "doctor": return "Clinic / Profile Photo";
      case "hospital": return "Hospital Photo";
      case "lab": return "Lab Photo";
      case "pharmacy": return "Pharmacy Photo";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) { onOpenChange(v); if (!v) resetForm(); } }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-4">
        <DialogHeader>
          <DialogTitle>Add {typeLabel}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Basic Details */}
          <h3 className="text-sm font-semibold text-foreground">{typeLabel} Details</h3>

          <div className="space-y-2">
            <Label htmlFor="admin-provider-name">
              {type === "doctor" ? "Doctor Name / Clinic Name" : "Organization Name"}
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="admin-provider-name"
                placeholder={type === "doctor" ? "Dr. John Smith" : "Organization name"}
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-provider-phone">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="admin-provider-phone"
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {type === "doctor" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="admin-specialization">Specialization</Label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="admin-specialization"
                    placeholder="e.g. Cardiologist"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-fee">Consultation Fee (₹)</Label>
                <Input
                  id="admin-fee"
                  type="number"
                  placeholder="500"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-bio">Bio</Label>
                <Textarea
                  id="admin-bio"
                  placeholder="Brief description of practice..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="admin-location">Location / Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  id="admin-location"
                  placeholder="City, Area"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {type === "hospital" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="admin-beds">Total Beds</Label>
                <Input
                  id="admin-beds"
                  type="number"
                  placeholder="100"
                  value={beds}
                  onChange={(e) => setBeds(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="admin-icu"
                  checked={icuAvailable}
                  onChange={(e) => setIcuAvailable(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                <Label htmlFor="admin-icu">ICU Available</Label>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="admin-rating">Rating</Label>
            <Input
              id="admin-rating"
              type="number"
              step="0.1"
              min="0"
              max="5"
              placeholder="4.5"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            />
          </div>

          {/* Document Uploads Section */}
          <div className="border-t border-border pt-4 mt-4" />
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4" /> Documents & Photos
          </h3>
          <p className="text-xs text-muted-foreground -mt-2">Max 5MB per file. Accepted: PDF, JPG, PNG</p>

          <FileUploadBox
            id="admin-license"
            label="License / Registration Certificate"
            file={licenseFile}
            onFileChange={setLicenseFile}
            hint="Upload trade license or registration certificate"
          />

          <FileUploadBox
            id="admin-gst"
            label="GST Certificate (if applicable)"
            file={gstFile}
            onFileChange={setGstFile}
            hint="Upload GST registration certificate"
          />

          {type === "doctor" && (
            <FileUploadBox
              id="admin-certificate"
              label="Medical Degree / ID Proof"
              file={certificateFile}
              onFileChange={setCertificateFile}
              hint="Upload MBBS degree, medical license, or ID proof"
            />
          )}

          <FileUploadBox
            id="admin-photo"
            label={getPhotoLabel()}
            file={photoFile}
            onFileChange={setPhotoFile}
            accept=".jpg,.jpeg,.png,.webp"
            hint={`Upload ${getPhotoLabel().toLowerCase()}`}
            maxSizeKB={500}
          />

          <FileUploadBox
            id="admin-additional-1"
            label="Additional Document 1 (optional)"
            file={additionalDoc1}
            onFileChange={setAdditionalDoc1}
            hint="Upload any supporting document"
          />

          <FileUploadBox
            id="admin-additional-2"
            label="Additional Document 2 (optional)"
            file={additionalDoc2}
            onFileChange={setAdditionalDoc2}
            hint="Upload any supporting document"
          />

          <FileUploadBox
            id="admin-additional-3"
            label="Additional Document 3 (optional)"
            file={additionalDoc3}
            onFileChange={setAdditionalDoc3}
            hint="Upload any supporting document"
          />

          <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl font-semibold text-base">
            {loading ? "Uploading & Adding..." : `Add ${typeLabel}`}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
