import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Phone, Clock, Bed, Heart, Calendar, ShieldCheck, Landmark, Navigation, Building2, Users, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { withAuthGuard } from "@/hooks/useRequireAuth";

const HospitalDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [hospital, setHospital] = useState<any>(null);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const [hospRes, docRes, deptRes] = await Promise.all([
        supabase.from("hospitals").select("*").eq("id", id).single(),
        supabase.from("doctors").select("id, name, specialization, rating, image_url, consultation_fee").eq("hospital_id", id).eq("approval_status", "approved"),
        supabase.from("departments").select("*").eq("hospital_id", id).eq("is_active", true),
      ]);

      if (hospRes.data) setHospital(hospRes.data);
      if (docRes.data) setDoctors(docRes.data);
      if (deptRes.data) setDepartments(deptRes.data);

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        const { data: favRes } = await supabase.from("favorites").select("id").eq("user_id", session.user.id).eq("provider_id", id).eq("provider_type", "hospital").maybeSingle();
        setIsFavorite(!!favRes);
      }

      setLoading(false);
    };
    fetchData();
  }, [id]);

  const toggleFavorite = async () => {
    if (!userId || !id) { toast.error("Please sign in"); navigate("/login"); return; }
    if (isFavorite) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("provider_id", id).eq("provider_type", "hospital");
      setIsFavorite(false);
      toast.success("Removed from favorites");
    } else {
      await supabase.from("favorites").insert({ user_id: userId, provider_id: id, provider_type: "hospital" });
      setIsFavorite(true);
      toast.success("Added to favorites");
    }
  };

   if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24 max-w-4xl mx-auto">
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-foreground"><ArrowLeft className="w-6 h-6" /></button>
            <Skeleton className="h-6 w-40" />
          </div>
        </div>
        <div className="px-5 mt-4 space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Hospital not found</p>
        <BottomNav />
      </div>
    );
  }

  const workingHours = hospital.working_hours as Record<string, string> | null;

  return (
    <div className="min-h-screen bg-background pb-32 max-w-4xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-lg border-b border-border px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-foreground"><ArrowLeft className="w-6 h-6" /></button>
            <h1 className="text-lg font-bold text-foreground">Hospital Details</h1>
          </div>
          <button onClick={toggleFavorite} className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-emergency text-emergency" : "text-muted-foreground"}`} />
          </button>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4 relative z-10">
        {/* Hospital Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl border border-border p-5 shadow-lg">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-primary/15 flex items-center justify-center text-4xl flex-shrink-0">
              {hospital.image_url ? (
                <img loading="lazy" decoding="async" src={hospital.image_url} alt={hospital.name} className="w-full h-full rounded-2xl object-cover" />
              ) : hospital.is_government ? "🏛️" : "🏥"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">{hospital.name}{hospital.approval_status === "approved" && <BadgeCheck className="w-5 h-5 text-red-500 shrink-0" />}</h2>
              {hospital.is_government && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                  <Landmark className="w-2.5 h-2.5" />GOVT
                </span>
              )}
              {hospital.location && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{hospital.location}</p>
              )}
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  <span className="text-sm font-bold text-foreground">{hospital.rating}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <Bed className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-foreground">{hospital.available_beds ?? hospital.beds ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Beds Available</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-foreground">{hospital.available_icu_beds ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">ICU Beds</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-lg font-bold text-foreground">{doctors.length}</p>
              <p className="text-[10px] text-muted-foreground">Doctors</p>
            </div>
          </div>

          {/* Contact */}
          <div className="mt-4 pt-4 border-t border-border flex items-center gap-4">
            {hospital.phone && (
              <a href={`tel:${hospital.phone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Phone className="w-4 h-4" /> {hospital.phone}
              </a>
            )}
            {hospital.emergency_contact && (
              <a href={`tel:${hospital.emergency_contact}`} className="flex items-center gap-1.5 text-sm text-destructive hover:underline">
                <Phone className="w-4 h-4" /> Emergency
              </a>
            )}
          </div>
        </motion.div>

        {/* Departments */}
        {departments.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Departments ({departments.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {departments.map((dept) => (
                <span key={dept.id} className="text-xs bg-accent text-foreground px-3 py-1.5 rounded-full font-medium">
                  {dept.name}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Doctors */}
        {doctors.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Doctors ({doctors.length})
            </h3>
            <div className="space-y-3">
              {doctors.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => navigate(`/doctor/${doc.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/30 transition-colors text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-2xl flex-shrink-0">
                    {doc.image_url ? (
                      <img loading="lazy" decoding="async" src={doc.image_url} alt={doc.name} className="w-full h-full rounded-xl object-cover" />
                    ) : "👨‍⚕️"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-primary">{doc.specialization}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 fill-warning text-warning" />{doc.rating}
                      </span>
                      {doc.consultation_fee > 0 && (
                        <span className="text-xs font-medium text-foreground">₹{doc.consultation_fee}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Working Hours */}
        {workingHours && Object.keys(workingHours).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" /> Working Hours
            </h3>
            <div className="space-y-2">
              {Object.entries(workingHours).map(([day, hours]) => (
                <div key={day} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground capitalize">{day}</span>
                  <span className={`text-sm font-medium ${hours === "closed" ? "text-destructive" : "text-foreground"}`}>{hours}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Map */}
        {(hospital.latitude && hospital.longitude || hospital.location) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" /> Location
            </h3>
            {hospital.latitude && hospital.longitude && (
              <div className="rounded-xl overflow-hidden border border-border h-44">
                <iframe
                  title="Hospital Location"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${hospital.longitude - 0.01},${hospital.latitude - 0.01},${hospital.longitude + 0.01},${hospital.latitude + 0.01}&layer=mapnik&marker=${hospital.latitude},${hospital.longitude}`}
                />
              </div>
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude && hospital.longitude ? `${hospital.latitude},${hospital.longitude}` : encodeURIComponent(hospital.location || '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 w-full h-9 rounded-xl text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Navigation className="w-3.5 h-3.5" /> Get Directions
            </a>
          </motion.div>
        )}
      </div>

      {/* Fixed Book Button — only for non-government hospitals */}
      {!hospital.is_government && (
        <div className="fixed bottom-20 left-0 right-0 px-5 z-50">
          <Button
            onClick={() => navigate(`/book/hospital/${id}`)}
            className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-base shadow-xl shadow-primary/25"
          >
            <Calendar className="w-5 h-5 mr-2" /> Book Appointment
          </Button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default withAuthGuard(HospitalDetail);
