import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Star, MapPin, Phone, Clock, Briefcase, Heart, IndianRupee, Calendar, Building2, MessageSquare, Navigation, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import ReviewDialog from "@/components/patient/ReviewDialog";
import { withAuthGuard } from "@/hooks/useRequireAuth";
import { getDoctorAvatar } from "@/lib/providerDefaults";

const DoctorDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [doctor, setDoctor] = useState<(Tables<"doctors"> & { hospital_name?: string; hospital_location?: string; hospital_latitude?: number | null; hospital_longitude?: number | null; is_government_hospital?: boolean }) | null>(null);
  const [reviews, setReviews] = useState<(Tables<"reviews"> & { user_name?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [hasCompletedAppointment, setHasCompletedAppointment] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      const [docRes, reviewsRes] = await Promise.all([
        supabase.from("doctors").select("*, hospitals(name, location, latitude, longitude, is_government)").eq("id", id).single(),
        supabase.from("reviews").select("*").eq("provider_id", id).eq("provider_type", "doctor").order("created_at", { ascending: false }).limit(10),
      ]);

      if (docRes.data) {
        const d: any = docRes.data;
        setDoctor({
          ...d,
          hospital_name: d.hospitals?.name,
          hospital_location: d.hospitals?.location,
          hospital_latitude: d.hospitals?.latitude,
          hospital_longitude: d.hospitals?.longitude,
          is_government_hospital: d.hospitals?.is_government ?? false,
        });
      }

      if (reviewsRes.data) {
        // Fetch profile names for reviewers
        const userIds = reviewsRes.data.map((r) => r.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", userIds);
        const nameMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);
        setReviews(reviewsRes.data.map((r) => ({ ...r, user_name: nameMap.get(r.user_id) || "Patient" })));
      }

      // Check favorite status
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUserId(session.user.id);
        const [favRes, apptRes] = await Promise.all([
          supabase.from("favorites").select("id").eq("user_id", session.user.id).eq("provider_id", id).eq("provider_type", "doctor").maybeSingle(),
          supabase.from("appointments").select("id").eq("patient_id", session.user.id).eq("doctor_id", id).eq("status", "completed").limit(1).maybeSingle(),
        ]);
        setIsFavorite(!!favRes.data);
        setHasCompletedAppointment(apptRes.data?.id || null);
      }

      setLoading(false);
    };
    fetchData();
  }, [id]);

  const toggleFavorite = async () => {
    if (!userId || !id) { toast.error("Please sign in"); navigate("/login"); return; }
    if (isFavorite) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("provider_id", id).eq("provider_type", "doctor");
      setIsFavorite(false);
      toast.success("Removed from favorites");
    } else {
      await supabase.from("favorites").insert({ user_id: userId, provider_id: id, provider_type: "doctor" });
      setIsFavorite(true);
      toast.success("Added to favorites");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="gradient-primary page-header px-5 pb-20 rounded-b-[2rem]">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
            <Skeleton className="h-6 w-40 bg-primary-foreground/20" />
          </div>
        </div>
        <div className="px-5 -mt-12 space-y-4">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Doctor not found</p>
        <BottomNav />
      </div>
    );
  }

  const workingHours = doctor.working_hours as Record<string, string> | null;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <div className="gradient-primary page-header px-5 pb-24 rounded-b-[2rem] relative overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-primary-foreground/5"
        />
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-primary-foreground"><ArrowLeft className="w-6 h-6" /></button>
            <h1 className="text-xl font-bold text-primary-foreground">Doctor Profile</h1>
          </div>
          <button onClick={toggleFavorite} className="w-10 h-10 rounded-full bg-primary-foreground/15 flex items-center justify-center">
            <Heart className={`w-5 h-5 ${isFavorite ? "fill-emergency text-emergency" : "text-primary-foreground"}`} />
          </button>
        </div>
      </div>

      <div className="px-5 -mt-14 space-y-4 relative z-10">
        {/* Doctor Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-5 shadow-lg"
        >
          <div className="flex gap-4">
            <img src={getDoctorAvatar(doctor.gender, doctor.image_url)} alt={doctor.name} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0 border-2 border-primary/20" />
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5">{doctor.name}{doctor.approval_status === "approved" && <BadgeCheck className="w-5 h-5 text-blue-500 shrink-0" />}</h2>
              <p
                className="text-sm text-primary font-medium cursor-pointer hover:underline"
                onClick={() => doctor.specialization && navigate(`/doctors?spec=${encodeURIComponent(doctor.specialization)}`)}
              >
                {doctor.specialization}
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-warning text-warning" />
                  <span className="text-sm font-bold text-foreground">{doctor.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span className="text-xs">{doctor.experience_years} yrs exp</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <IndianRupee className="w-4 h-4 text-primary" />
              <span className="text-lg font-bold text-primary">₹{doctor.consultation_fee}</span>
              <span className="text-xs text-muted-foreground">/ consultation</span>
            </div>
            {doctor.phone && (
              <a href={`tel:${doctor.phone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Phone className="w-4 h-4" /> Call
              </a>
            )}
          </div>
        </motion.div>

        {/* Bio */}
        {doctor.bio && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl border border-border p-5 shadow-sm"
          >
            <h3 className="font-semibold text-foreground mb-2">About</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{doctor.bio}</p>
          </motion.div>
        )}

        {/* Hospital & Location */}
        {doctor.hospital_name && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-card rounded-2xl border border-border p-5 shadow-sm"
          >
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" /> Hospital
            </h3>
            <p className="text-sm font-medium text-foreground">{doctor.hospital_name}</p>
            {doctor.hospital_location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3" /> {doctor.hospital_location}
              </p>
            )}

            {/* Map & Directions */}
            {(doctor.hospital_latitude && doctor.hospital_longitude || doctor.hospital_location) && (
              <>
                {doctor.hospital_latitude && doctor.hospital_longitude && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-border h-40">
                    <iframe
                      title="Hospital Location"
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${doctor.hospital_longitude - 0.01},${doctor.hospital_latitude - 0.01},${doctor.hospital_longitude + 0.01},${doctor.hospital_latitude + 0.01}&layer=mapnik&marker=${doctor.hospital_latitude},${doctor.hospital_longitude}`}
                    />
                  </div>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${doctor.hospital_latitude && doctor.hospital_longitude ? `${doctor.hospital_latitude},${doctor.hospital_longitude}` : encodeURIComponent(doctor.hospital_location || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 w-full h-9 rounded-xl text-xs font-semibold border border-primary/30 text-primary hover:bg-primary/5 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" /> Get Directions
                </a>
              </>
            )}
          </motion.div>
        )}

        {/* Working Hours */}
        {workingHours && Object.keys(workingHours).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card rounded-2xl border border-border p-5 shadow-sm"
          >
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

        {/* Reviews */}
        {reviews.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-card rounded-2xl border border-border p-5 shadow-sm"
          >
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-warning" /> Reviews ({reviews.length})
            </h3>
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{review.user_name}</span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-warning text-warning" />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-xs text-muted-foreground mt-1">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Write Review */}
        {hasCompletedAppointment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card rounded-2xl border border-border p-5 shadow-sm"
          >
            <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" /> Share Your Experience
            </h3>
            <p className="text-sm text-muted-foreground mb-3">You've visited this doctor. Leave a review to help other patients.</p>
            <Button
              onClick={() => setReviewOpen(true)}
              variant="outline"
              className="w-full rounded-xl"
            >
              <Star className="w-4 h-4 mr-2" /> Write a Review
            </Button>
          </motion.div>
        )}
      </div>

      {/* Review Dialog */}
      {hasCompletedAppointment && (
        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          providerId={id!}
          providerType="doctor"
          providerName={doctor.name}
          appointmentId={hasCompletedAppointment}
          onReviewSubmitted={() => {
            supabase.from("reviews").select("*").eq("provider_id", id!).eq("provider_type", "doctor").order("created_at", { ascending: false }).limit(10).then(({ data }) => {
              if (data) {
                const userIds = data.map((r) => r.user_id);
                supabase.from("profiles").select("user_id, full_name").in("user_id", userIds).then(({ data: profiles }) => {
                  const nameMap = new Map(profiles?.map((p) => [p.user_id, p.full_name]) || []);
                  setReviews(data.map((r) => ({ ...r, user_name: nameMap.get(r.user_id) || "Patient" })));
                });
              }
            });
          }}
        />
      )}

      {/* Fixed Book Button — only for private hospital doctors */}
      {!doctor.is_government_hospital && (
        <div className="fixed bottom-20 left-0 right-0 px-5 z-50">
          <Button
            onClick={() => navigate(`/book/doctor/${id}`)}
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

export default withAuthGuard(DoctorDetail);
