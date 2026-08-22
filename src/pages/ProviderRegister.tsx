import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Heart, Mail, Lock, User, Eye, EyeOff, Stethoscope, Building2, FlaskConical, Store, Phone, MapPin, FileText, Upload, Camera, X } from "lucide-react";
import LocationPicker from "@/components/provider/LazyLocationPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ProviderType = "doctor" | "hospital" | "lab" | "pharmacy";

const providerOptions: { type: ProviderType; label: string; icon: React.ElementType; roleKey: string; table: string }[] = [
  { type: "doctor", label: "Doctor", icon: Stethoscope, roleKey: "doctor", table: "doctors" },
  { type: "hospital", label: "Hospital", icon: Building2, roleKey: "hospital_admin", table: "hospitals" },
  { type: "lab", label: "Lab", icon: FlaskConical, roleKey: "lab_admin", table: "labs" },
  { type: "pharmacy", label: "Pharmacy", icon: Store, roleKey: "pharmacy_admin", table: "pharmacies" },
];

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
    <Label htmlFor={id}>{label} {required && <span className="text-destructive">*</span>}
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
const ProviderRegister = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<ProviderType | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Account fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  // Provider fields
  const [providerName, setProviderName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [bio, setBio] = useState("");
  const [gender, setGender] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  // Document fields (all providers)
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [gstFile, setGstFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [additionalDoc1, setAdditionalDoc1] = useState<File | null>(null);
  const [additionalDoc2, setAdditionalDoc2] = useState<File | null>(null);
  const [additionalDoc3, setAdditionalDoc3] = useState<File | null>(null);

  const uploadFile = async (userId: string, file: File, folder: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const filePath = `${userId}/${folder}_${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from("certificates").upload(filePath, file);
    if (error) {
      console.error(`Upload error (${folder}):`, error);
      return null;
    }
    return filePath;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!licenseFile) {
      toast.error("License / registration document is required");
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up (returns userId even before email confirmation)
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });

      if (signUpError) {
        const msg = signUpError.message.toLowerCase();
        if (msg.includes("already") || msg.includes("registered") || msg.includes("exists") || msg.includes("unique")) {
          toast.error("This email is already registered. Please use a different email or sign in.");
        } else {
          toast.error(signUpError.message);
        }
        setLoading(false);
        return;
      }

      const userId = signUpData.user?.id;
      if (!userId) {
        toast.success("Check your email for a confirmation link!");
        navigate("/login", { replace: true });
        setLoading(false);
        return;
      }

      // 2. Build provider data (without files — those go via FormData)
      toast.info("Uploading documents & registering...");

      const providerData: Record<string, any> = {
        name: providerName,
        phone,
      };

      if (selectedType === "doctor") {
        providerData.specialization = specialization;
        providerData.bio = bio;
        if (gender) providerData.gender = gender;
      }
      providerData.location = location;
      if (latitude) providerData.latitude = Number(latitude);
      if (longitude) providerData.longitude = Number(longitude);

      // 3. Build FormData for edge function (handles file uploads + provider creation with service role)
      const formData = new FormData();
      formData.append("user_id", userId);
      formData.append("provider_type", selectedType);
      formData.append("provider_data", JSON.stringify(providerData));

      // Attach files
      formData.append("file_license", licenseFile);
      if (gstFile) formData.append("file_gst", gstFile);
      if (certificateFile) formData.append("file_certificate", certificateFile);
      if (photoFile) formData.append("file_photo", photoFile);
      
      const additionalDocFiles = [additionalDoc1, additionalDoc2, additionalDoc3];
      additionalDocFiles.forEach((file, i) => {
        if (file) formData.append(`file_additional_${i}`, file);
      });

      // 4. Call edge function (uses service role — works without active session)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/register-provider`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error(result.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // 5. Try to sign in (will work if email auto-confirm is on, otherwise user needs to verify)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        // Email confirmation required — provider record & role are already created
        toast.success("Registration submitted! Please verify your email, then log in.");
        navigate("/login", { replace: true });
      } else {
        toast.success("Registration submitted! Your account is pending admin approval.");
        navigate("/pending-approval", { replace: true });
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      toast.error("Something went wrong. Please try again.");
    }

    setLoading(false);
  };

  const getPhotoLabel = () => {
    switch (selectedType) {
      case "doctor": return "Clinic / Profile Photo";
      case "hospital": return "Hospital Photo";
      case "lab": return "Lab Photo";
      case "pharmacy": return "Pharmacy Photo";
      default: return "Photo";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="gradient-primary px-6 pt-12 pb-16 flex flex-col items-center rounded-b-[2rem]">
        <div className="w-14 h-14 rounded-xl bg-primary-foreground/20 flex items-center justify-center mb-3 border border-primary-foreground/30">
          <Heart className="w-7 h-7 text-primary-foreground" fill="currentColor" />
        </div>
        <h1 className="text-2xl font-bold text-primary-foreground">Provider Registration</h1>
        <p className="text-primary-foreground/70 text-sm mt-1">
          {step === 1 ? "Select your provider type" : `Register as ${selectedType}`}
        </p>
      </div>

      <div className="flex-1 px-6 -mt-6 pb-8">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center mb-2">I want to register as a:</p>
              <div className="grid grid-cols-2 gap-3">
                {providerOptions.map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    onClick={() => { setSelectedType(type); setStep(2); }}
                    className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all
                      ${selectedType === type
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-muted/50"
                      }`}
                  >
                    <Icon className="w-8 h-8 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-sm text-primary font-medium mb-2"
              >
                ← Change provider type
              </button>

              {/* Account info */}
              <h3 className="text-sm font-semibold text-foreground">Account Information</h3>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="fullName" placeholder="Your full name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="email" type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="password" type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="border-t border-border pt-4 mt-4" />
              <h3 className="text-sm font-semibold text-foreground">
                {selectedType === "doctor" ? "Doctor" : selectedType === "hospital" ? "Hospital" : selectedType === "lab" ? "Lab" : "Pharmacy"} Details
              </h3>

              <div className="space-y-2">
                <Label htmlFor="providerName">
                  {selectedType === "doctor" ? "Doctor Name / Clinic Name" : "Organization Name"}
                </Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="providerName" placeholder={selectedType === "doctor" ? "Dr. John Smith" : "Organization name"} value={providerName} onChange={(e) => setProviderName(e.target.value)} className="pl-10" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input id="phone" type="tel" placeholder="+91 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" />
                </div>
              </div>

              {selectedType === "doctor" && (
                <>
                  {/* Gender Selection */}
                  <div className="space-y-2">
                    <Label>Gender <span className="text-destructive">*</span></Label>
                    <div className="flex gap-2">
                      {["male", "female", "other"].map(g => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGender(g)}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                            gender === g
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/30"
                          }`}
                        >
                          {g === "male" ? "👨‍⚕️" : g === "female" ? "👩‍⚕️" : "🧑‍⚕️"} {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialization">Specialization</Label>
                    <div className="relative">
                      <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input id="specialization" placeholder="e.g. Cardiologist" value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea id="bio" placeholder="Brief description of your practice..." value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />
                  </div>
                </>
              )}

              {/* Location picker with GPS + Map for all provider types */}
              <LocationPicker
                latitude={latitude}
                longitude={longitude}
                locationText={location}
                onLatitudeChange={setLatitude}
                onLongitudeChange={setLongitude}
                onLocationTextChange={setLocation}
              />

              {/* Document Uploads Section */}
              <div className="border-t border-border pt-4 mt-4" />
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" /> Documents & Photos
              </h3>
              <p className="text-xs text-muted-foreground -mt-2">Max 5MB per file. Accepted: PDF, JPG, PNG</p>

              <FileUploadBox
                id="license"
                label="License / Registration Certificate"
                file={licenseFile}
                onFileChange={setLicenseFile}
                hint="Upload trade license or registration certificate"
                required
              />

              <FileUploadBox
                id="gst"
                label="GST Certificate (if applicable)"
                file={gstFile}
                onFileChange={setGstFile}
                hint="Upload GST registration certificate"
              />

              {selectedType === "doctor" && (
                <FileUploadBox
                  id="certificate"
                  label="Medical Degree / ID Proof"
                  file={certificateFile}
                  onFileChange={setCertificateFile}
                  hint="Upload MBBS degree, medical license, or ID proof"
                />
              )}

              <FileUploadBox
                id="photo"
                label={getPhotoLabel()}
                file={photoFile}
                onFileChange={setPhotoFile}
                accept=".jpg,.jpeg,.png,.webp"
                hint={`Upload ${getPhotoLabel().toLowerCase()}`}
                maxSizeKB={500}
              />

              {/* Additional Documents - separate fields */}
              <FileUploadBox
                id="additional_doc_1"
                label="Additional Document 1 (optional)"
                file={additionalDoc1}
                onFileChange={setAdditionalDoc1}
                hint="Upload any supporting document"
              />

              <FileUploadBox
                id="additional_doc_2"
                label="Additional Document 2 (optional)"
                file={additionalDoc2}
                onFileChange={setAdditionalDoc2}
                hint="Upload any supporting document"
              />

              <FileUploadBox
                id="additional_doc_3"
                label="Additional Document 3 (optional)"
                file={additionalDoc3}
                onFileChange={setAdditionalDoc3}
                hint="Upload any supporting document"
              />

              <div className="bg-amber-500/10 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                <FileText className="w-4 h-4 inline mr-1" />
                Your registration will be reviewed by admin. You'll get access once approved.
              </div>

              <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-semibold text-base">
                {loading ? "Uploading & Registering..." : "Submit Registration"}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center mt-6 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-semibold">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default ProviderRegister;
