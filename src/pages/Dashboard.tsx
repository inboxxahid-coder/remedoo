import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, AlertTriangle, Pill, Heart, Bell, Star, Menu, X, ChevronRight, Stethoscope, Building2, FlaskConical, Store, TrendingUp, Activity, ShoppingBag, ClipboardList, RefreshCw, IndianRupee, Tag, Dumbbell, Brain, Sun, Wind, Moon, Apple, Droplets, Wallet, FileText, Microscope, Ambulance, MapPin, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import NearbyHospitalsMap from "@/components/dashboard/NearbyHospitalsMap";
import HealthTipsCards from "@/components/dashboard/HealthTipsCards";

import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupaUser } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import BottomNav from "@/components/BottomNav";
import { Skeleton } from "@/components/ui/skeleton";
import remedooLogo from "@/assets/remedoo-logo.png";
import UnifiedSearch from "@/components/dashboard/UnifiedSearch";

const iconMap: Record<string, LucideIcon> = {
  Calendar, AlertTriangle, Pill, Heart, Bell, Star, Stethoscope, Building2,
  FlaskConical, Store, TrendingUp, Activity, ShoppingBag, ClipboardList,
  IndianRupee, Tag, Dumbbell, Brain, Sun, Wind, Moon, Apple, Droplets, RefreshCw,
};
const getIcon = (name: string): LucideIcon => iconMap[name] || Heart;

const AnimatedMenuButton = () => {
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar();
  const isOpen = isMobile ? openMobile : open;
  return (
    <button
      onClick={toggleSidebar}
      className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-all duration-300 active:scale-90"
    >
      <div className="relative w-6 h-6">
        <Menu className={`w-6 h-6 text-white absolute inset-0 transition-all duration-300 ${isOpen ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"}`} />
        <X className={`w-6 h-6 text-white absolute inset-0 transition-all duration-300 ${isOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`} />
      </div>
    </button>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupaUser | null>(null);
  const [slides, setSlides] = useState<Tables<"slider_media">[]>([]);
  const [topDoctors, setTopDoctors] = useState<Tables<"doctors">[]>([]);
  const [ads, setAds] = useState<Tables<"ads">[]>([]);
  const [popularMedicines, setPopularMedicines] = useState<(Tables<"medicines"> & { pharmacy_name?: string })[]>([]);
  const [quickActions, setQuickActions] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingAppts, setUpcomingAppts] = useState(0);
  const [recentOrders, setRecentOrders] = useState(0);
  const [activeOrders, setActiveOrders] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pullDistance, setPullDistance] = useState(0);
  const [upcomingAppointments, setUpcomingAppointments] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [labReportCount, setLabReportCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [popularHospitals, setPopularHospitals] = useState<any[]>([]);
  const [featuredPackages, setFeaturedPackages] = useState<any[]>([]);
  const touchStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useRealtimeNotifications();

  const fetchAllData = useCallback(async () => {
    try {
      const [slidesRes, doctorsRes, adsRes, medsRes, qaRes, svcRes, hospitalsRes, packagesRes] = await Promise.all([
        supabase.from("slider_media").select("*").eq("active", true).order("sort_order"),
        supabase.from("doctors").select("*, hospitals!left(is_government)").eq("is_featured", true).order("featured_sort_order").limit(10),
        supabase.from("ads").select("*").eq("active", true),
        supabase.from("medicines").select("*, pharmacies(name)").eq("is_featured", true).eq("in_stock", true).order("featured_sort_order").limit(10),
        supabase.from("dashboard_quick_actions").select("*").eq("active", true).order("sort_order"),
        supabase.from("dashboard_services").select("*").eq("active", true).order("sort_order"),
        supabase.from("hospitals").select("id, name, location, rating, image_url, total_beds, is_government").eq("approval_status", "approved").order("rating", { ascending: false }).limit(5),
        supabase.from("lab_test_packages").select("*, labs(name)").eq("is_active", true).order("created_at", { ascending: false }).limit(6),
      ]);
      if (slidesRes.data) setSlides(slidesRes.data);
      if (doctorsRes.data) {
        const nonGovtDoctors = doctorsRes.data.filter((d: any) => !d.hospitals?.is_government);
        if (nonGovtDoctors.length > 0) {
          setTopDoctors(nonGovtDoctors);
        } else {
          const fallback = await supabase.from("doctors").select("*, hospitals!left(is_government)").order("rating", { ascending: false }).limit(10);
          setTopDoctors((fallback.data || []).filter((d: any) => !d.hospitals?.is_government).slice(0, 5));
        }
      }
      if (adsRes.data) setAds(adsRes.data);
      if (medsRes.data) {
        if (medsRes.data.length > 0) {
          setPopularMedicines(medsRes.data.map((m: any) => ({ ...m, pharmacy_name: m.pharmacies?.name })));
        } else {
          const fallback = await supabase.from("medicines").select("*, pharmacies(name)").eq("in_stock", true).order("created_at", { ascending: false }).limit(10);
          setPopularMedicines((fallback.data || []).map((m: any) => ({ ...m, pharmacy_name: m.pharmacies?.name })));
        }
      }
      if (qaRes.data) setQuickActions(qaRes.data);
      if (svcRes.data) setServices(svcRes.data);
      if (hospitalsRes.data) setPopularHospitals(hospitalsRes.data);
      if (packagesRes.data) setFeaturedPackages(packagesRes.data.map((p: any) => ({ ...p, lab_name: p.labs?.name })));

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsLoading(false); return; }
      const userId = session.user.id;
      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const [notifRes, apptRes, orderRes, activeRes, upcomingRes, walletRes, prescRes, labRepRes, favRes] = await Promise.all([
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("read", false),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("patient_id", userId).gte("appointment_date", today).in("status", ["pending", "confirmed"]),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", thirtyDaysAgo),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", userId).in("status", ["placed", "confirmed", "out_for_delivery"]),
        supabase.from("appointments").select("id, appointment_date, appointment_time, status, doctor_id, doctors(name, specialization, image_url)").eq("patient_id", userId).gte("appointment_date", today).in("status", ["pending", "confirmed"]).order("appointment_date").limit(2),
        supabase.from("payments").select("amount, type").eq("user_id", userId),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("patient_id", userId).not("prescription_url", "is", null),
        supabase.from("lab_sample_collections").select("id", { count: "exact", head: true }).eq("patient_id", userId).not("report_url", "is", null),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      setUnreadCount(notifRes.count ?? 0);
      setUpcomingAppts(apptRes.count ?? 0);
      setRecentOrders(orderRes.count ?? 0);
      setActiveOrders(activeRes.count ?? 0);
      setUpcomingAppointments(upcomingRes.data || []);

      const payments = walletRes.data || [];
      const balance = payments.reduce((sum, p) => sum + (p.type === "credit" ? Number(p.amount) : -Number(p.amount)), 0);
      setWalletBalance(Math.max(0, balance));
      setPrescriptionCount(prescRes.count ?? 0);
      setLabReportCount(labRepRes.count ?? 0);
      setFavoritesCount(favRes.count ?? 0);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
    setPullDistance(0);
  }, [fetchAllData]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    fetchAllData();

    const notifChannel = supabase
      .channel("dashboard-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, () => fetchAllData())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, () => fetchAllData())
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(notifChannel);
    };
  }, [navigate, fetchAllData]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 5) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) setPullDistance(Math.min(delta * 0.4, 80));
  }, [isRefreshing]);
  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 50) handleRefresh();
    else setPullDistance(0);
  }, [pullDistance, handleRefresh]);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Patient";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div
          ref={scrollRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-[hsl(210,20%,97%)] dark:bg-background"
          style={{ overscrollBehavior: "contain" }}
        >
          {/* Pull-to-refresh */}
          <AnimatePresence>
            {(pullDistance > 0 || isRefreshing) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: isRefreshing ? 48 : pullDistance, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center bg-background overflow-hidden"
              >
                <motion.div animate={{ rotate: isRefreshing ? 360 : pullDistance * 3.6 }} transition={isRefreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : { duration: 0 }}>
                  <RefreshCw className={`w-5 h-5 ${pullDistance > 50 || isRefreshing ? "text-primary" : "text-muted-foreground"}`} />
                </motion.div>
                {isRefreshing && <span className="ml-2 text-xs text-muted-foreground font-medium">Refreshing...</span>}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="pb-24">
            {/* ===== TOP BAR ===== */}
            <div className="sticky top-0 z-40 bg-primary">
              <div className="flex items-center justify-between px-4 h-14">
                <AnimatedMenuButton />
                <img src={remedooLogo} alt="Remedoo" className="h-8 brightness-0 invert" />
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate("/notifications")}
                  className="relative w-10 h-10 rounded-full flex items-center justify-center"
                >
                  <Bell className="w-6 h-6 text-white" strokeWidth={1.8} />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-0.5 -right-0.5 min-w-[20px] h-[20px] px-1 bg-destructive rounded-full flex items-center justify-center border-2 border-primary"
                      >
                        <span className="text-[10px] font-bold text-destructive-foreground leading-none">{unreadCount > 99 ? "99+" : unreadCount}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>

            {/* ===== WELCOME + SEARCH ===== */}
            <div className="px-5 pt-4 pb-4 bg-primary rounded-b-3xl">
              <h1 className="text-lg font-bold text-white mb-2">Welcome, {displayName}!</h1>
              <UnifiedSearch />
            </div>

            {isLoading ? (
              <div className="px-5 space-y-4 pt-4">
                <Skeleton className="w-full h-44 rounded-2xl" />
                <div className="grid grid-cols-4 gap-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                </div>
                <Skeleton className="w-full h-24 rounded-2xl" />
              </div>
            ) : (
              <div className="space-y-5 pt-4">

                {/* ===== HERO BANNER ===== */}
                <div className="px-5">
                  <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
                    {(slides.length > 0 ? slides : [
                      { id: "default", title: "Stay Healthy with Remedoo", description: "Book appointments, order medicines & more", url: null, type: "image", target_link: null } as any
                    ]).map((slide: any, idx: number) => {
                      const hasImage = slide.url && slide.type !== "video";
                      return (
                        <motion.div
                          key={slide.id}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          onClick={() => slide.target_link && navigate(slide.target_link)}
                          className="flex-shrink-0 w-full max-w-full rounded-2xl overflow-hidden relative snap-start cursor-pointer bg-gradient-to-r from-[hsl(205,80%,92%)] to-[hsl(205,70%,96%)] dark:from-[hsl(205,40%,18%)] dark:to-[hsl(205,30%,22%)]"
                          style={{ minHeight: 170 }}
                        >
                          {hasImage ? (
                            <>
                              <img src={slide.url} alt={slide.title || ""} className="w-full h-[170px] object-cover" loading="lazy" decoding="async" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                              <div className="absolute bottom-0 left-0 p-4">
                                <p className="text-white font-bold text-lg drop-shadow-md">{slide.title}</p>
                                {slide.description && <p className="text-white/80 text-xs mt-0.5">{slide.description}</p>}
                              </div>
                            </>
                          ) : (
                            <div className="p-5 flex flex-col justify-center h-[170px]">
                              <p className="text-foreground font-bold text-xl italic">
                                <span className="font-extrabold not-italic">Stay Healthy</span> with Remedoo
                              </p>
                              <p className="text-muted-foreground text-sm mt-1">{slide.description}</p>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* ===== QUICK ACTION CARDS (4 squares) ===== */}
                <div className="px-5">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Book\nAppointment", icon: Calendar, bg: "bg-[hsl(215,70%,50%)]", path: "/doctors" },
                      { label: "Order\nMedicine", icon: ClipboardList, bg: "bg-[hsl(152,55%,40%)]", path: "/pharmacies" },
                      { label: "Lab\nTests", icon: FlaskConical, bg: "bg-[hsl(200,65%,48%)]", path: "/labs" },
                      { label: "Emergency", icon: AlertTriangle, bg: "bg-[hsl(0,70%,52%)]", path: "/emergency" },
                    ].map((action, idx) => (
                      <motion.button
                        key={action.label}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + idx * 0.05 }}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => navigate(action.path)}
                        className={`${action.bg} rounded-2xl p-3 flex flex-col items-center justify-center gap-2 aspect-square shadow-md`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <action.icon className="w-5 h-5 text-white" strokeWidth={2} />
                        </div>
                        <span className="text-[10px] text-white font-bold text-center leading-tight whitespace-pre-line">{action.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* ===== YOUR UPCOMING APPOINTMENTS ===== */}
                <div className="px-5">
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-bold text-foreground">Your Upcoming Appointments</h2>
                      {upcomingAppts > 0 && (
                        <button onClick={() => navigate("/appointments")} className="text-muted-foreground hover:text-primary">
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                    {upcomingAppointments.length > 0 ? (
                      <div className="space-y-2.5">
                        {upcomingAppointments.map((apt: any) => {
                          const doc = apt.doctors;
                          const dateObj = new Date(apt.appointment_date);
                          const today = new Date();
                          const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
                          const isToday = dateObj.toDateString() === today.toDateString();
                          const isTomorrow = dateObj.toDateString() === tomorrow.toDateString();
                          const dateLabel = isToday ? "Today" : isTomorrow ? "Tomorrow" : dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

                          return (
                            <motion.div
                              key={apt.id}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => navigate(`/appointment/${apt.id}`)}
                              className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 cursor-pointer shadow-sm"
                            >
                              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {doc?.image_url ? (
                                  <img src={doc.image_url} alt={doc.name} className="w-14 h-14 rounded-full object-cover" />
                                ) : (
                                  <Stethoscope className="w-6 h-6 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-foreground truncate">{doc?.name || "Doctor"}</p>
                                <p className="text-xs text-muted-foreground">{doc?.specialization || "General"}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{dateLabel} | {apt.appointment_time}</p>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/appointment/${apt.id}`); }}
                                className="text-xs font-bold text-white bg-primary px-4 py-2 rounded-full hover:opacity-90 transition-opacity whitespace-nowrap shadow-sm"
                              >
                                View Details &gt;
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-card rounded-2xl border border-border p-6 text-center shadow-sm">
                        <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                        <button onClick={() => navigate("/doctors")} className="text-xs text-primary font-semibold mt-2 hover:underline">Book Now →</button>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* ===== INFO CARDS ROW ===== */}
                <div className="px-5">
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                    <div className="grid grid-cols-4 gap-2.5">
                      {[
                        { label: "Wallet Balance", value: `₹${walletBalance.toLocaleString()}`, icon: Wallet, iconBg: "bg-[hsl(38,80%,92%)]", iconColor: "text-[hsl(38,80%,45%)]", path: "/wallet" },
                        { label: "My Prescriptions", value: `${prescriptionCount} Saved`, icon: FileText, iconBg: "bg-[hsl(215,60%,92%)]", iconColor: "text-primary", path: "/medical-history" },
                        { label: "Lab Reports", value: `${labReportCount} Reports`, icon: Microscope, iconBg: "bg-[hsl(200,65%,90%)]", iconColor: "text-[hsl(200,65%,40%)]", path: "/lab-reports" },
                        { label: "Favorites", value: `${favoritesCount} Saved`, icon: Heart, iconBg: "bg-[hsl(0,70%,92%)]", iconColor: "text-[hsl(0,70%,50%)]", path: "/favorites" },
                      ].map((card) => (
                        <motion.button
                          key={card.label}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => navigate(card.path)}
                          className="bg-card rounded-2xl border border-border p-3 flex flex-col items-center gap-1.5 text-center shadow-sm"
                        >
                          <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                            <card.icon className={`w-5 h-5 ${card.iconColor}`} strokeWidth={1.8} />
                          </div>
                          <span className="text-[9px] font-semibold text-foreground leading-tight">{card.label}</span>
                          <span className="text-[10px] font-bold text-foreground">{card.value}</span>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* ===== POPULAR DOCTORS ===== */}
                {topDoctors.length > 0 && (
                  <div className="px-5">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-foreground">Popular Doctors</h2>
                        <button onClick={() => navigate("/doctors")} className="text-primary font-bold text-sm flex items-center">
                          <ChevronRight className="w-4 h-4" /><ChevronRight className="w-4 h-4 -ml-2.5" />
                        </button>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x">
                        {topDoctors.map((doc, idx) => (
                          <motion.button
                            key={doc.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 + idx * 0.06 }}
                            onClick={() => navigate(`/doctor/${doc.id}`)}
                            className="flex-shrink-0 w-[150px] bg-card rounded-2xl border border-border p-3 text-center snap-start shadow-sm"
                          >
                            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-2 overflow-hidden">
                              {doc.image_url ? (
                                <img src={doc.image_url} alt={doc.name} className="w-14 h-14 rounded-full object-cover" />
                              ) : (
                                <span className="text-2xl">👨‍⚕️</span>
                              )}
                            </div>
                            <h4 className="font-bold text-xs truncate text-foreground">{doc.name}</h4>
                            <p className="text-[10px] text-primary font-medium truncate">{doc.specialization}</p>
                            <div className="flex items-center justify-center gap-1 mt-2">
                              <Star className="w-3.5 h-3.5 fill-[hsl(38,90%,55%)] text-[hsl(38,90%,55%)]" />
                              <span className="text-xs font-bold text-foreground">{doc.rating || "N/A"}</span>
                              <span className="text-[9px] text-muted-foreground ml-0.5">
                                {doc.experience_years ? `${doc.experience_years}+ Years Exp` : "Nearby"}
                              </span>
                            </div>
                          </motion.button>
                        ))}
                      </div>
                      <div className="flex items-center justify-center gap-1.5 mt-1">
                        <div className="w-6 h-1.5 rounded-full bg-primary" />
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                        <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* ===== POPULAR MEDICINES ===== */}
                {popularMedicines.length > 0 && (
                  <div className="px-5">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-foreground">Popular Medicines</h2>
                        <button onClick={() => navigate("/pharmacies")} className="text-primary font-bold text-sm flex items-center">
                          <ChevronRight className="w-4 h-4" /><ChevronRight className="w-4 h-4 -ml-2.5" />
                        </button>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x">
                        {popularMedicines.map((med, idx) => {
                          const discountedPrice = med.discount_percent ? med.price * (1 - med.discount_percent / 100) : null;
                          return (
                            <motion.button
                              key={med.id}
                              initial={{ opacity: 0, y: 15 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.4 + idx * 0.06 }}
                              onClick={() => navigate(`/pharmacy/${med.pharmacy_id}`)}
                              className="flex-shrink-0 w-[140px] bg-card rounded-2xl border border-border p-3 text-center snap-start shadow-sm relative"
                            >
                              {med.discount_percent && med.discount_percent > 0 && (
                                <span className="absolute top-2 right-2 bg-destructive text-destructive-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                  {med.discount_percent}% OFF
                                </span>
                              )}
                              <div className="w-12 h-12 rounded-xl bg-[hsl(152,50%,92%)] dark:bg-[hsl(152,30%,18%)] flex items-center justify-center mx-auto mb-2">
                                {med.image_url ? (
                                  <img src={med.image_url} alt={med.name} className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
                                ) : (
                                  <Pill className="w-5 h-5 text-[hsl(152,55%,40%)]" />
                                )}
                              </div>
                              <h4 className="font-bold text-xs truncate text-foreground">{med.name}</h4>
                              <p className="text-[10px] text-muted-foreground truncate">{med.category}</p>
                              <div className="flex items-center justify-center gap-1 mt-1.5">
                                <span className="text-xs font-bold text-foreground">₹{discountedPrice ? discountedPrice.toFixed(0) : med.price}</span>
                                {discountedPrice && (
                                  <span className="text-[10px] text-muted-foreground line-through">₹{med.price}</span>
                                )}
                              </div>
                              {med.pharmacy_name && (
                                <p className="text-[9px] text-muted-foreground mt-1 truncate">{med.pharmacy_name}</p>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* ===== POPULAR HOSPITALS ===== */}
                {popularHospitals.length > 0 && (
                  <div className="px-5">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42 }}>
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-bold text-foreground">Popular Hospitals</h2>
                        <button onClick={() => navigate("/hospitals")} className="text-primary font-bold text-sm flex items-center">
                          <ChevronRight className="w-4 h-4" /><ChevronRight className="w-4 h-4 -ml-2.5" />
                        </button>
                      </div>
                      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x">
                        {popularHospitals.map((hosp: any, idx: number) => (
                          <motion.button
                            key={hosp.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.45 + idx * 0.06 }}
                            onClick={() => navigate(`/hospital/${hosp.id}`)}
                            className="flex-shrink-0 w-[300px] bg-gradient-to-r from-[hsl(205,80%,94%)] to-[hsl(205,60%,97%)] dark:from-[hsl(205,40%,15%)] dark:to-[hsl(205,30%,20%)] rounded-2xl border border-border p-4 text-left snap-start shadow-sm relative overflow-hidden"
                            style={{ minHeight: 150 }}
                          >
                            <div className="relative z-10">
                              <h4 className="font-bold text-base text-foreground">{hosp.name}</h4>
                              <div className="flex items-center gap-0.5 mt-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(hosp.rating || 0) ? "fill-[hsl(38,90%,55%)] text-[hsl(38,90%,55%)]" : "fill-none text-muted-foreground/30"}`} />
                                ))}
                              </div>
                              <p className="text-xs text-muted-foreground mt-1.5">● Multispeciality</p>
                              <div className="flex items-center gap-2 mt-3">
                                {hosp.location && (
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <MapPin className="w-3 h-3" /> {hosp.total_beds || "15"}+ Doctors
                                  </span>
                                )}
                                <button
                                  onClick={(e) => { e.stopPropagation(); navigate(`/hospital/${hosp.id}`); }}
                                  className="text-[11px] font-bold text-white bg-primary px-3 py-1.5 rounded-full shadow-sm"
                                >
                                  View Details &gt;
                                </button>
                              </div>
                            </div>
                            {hosp.image_url && (
                              <img src={hosp.image_url} alt={hosp.name} className="absolute right-0 bottom-0 w-28 h-28 object-contain opacity-80" loading="lazy" decoding="async" />
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* ===== FEATURED PACKAGES (before Quick Access) ===== */}
                {featuredPackages.length > 0 && (
                  <div className="px-5">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }}>
                      <h2 className="text-lg font-bold mb-3 text-foreground">Featured Packages</h2>
                      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x">
                        {featuredPackages.map((pkg: any, idx: number) => {
                          const hasDiscount = pkg.discount_percent && pkg.discount_percent > 0;
                          const originalPrice = hasDiscount ? Math.round(pkg.package_price / (1 - pkg.discount_percent / 100)) : pkg.package_price;
                          const tests = Array.isArray(pkg.tests) ? pkg.tests : [];
                          return (
                            <motion.button
                              key={pkg.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.48 + idx * 0.06 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => navigate("/labs")}
                              className="flex-shrink-0 w-[200px] bg-gradient-to-br from-[hsl(205,80%,94%)] to-[hsl(205,60%,97%)] dark:from-[hsl(205,40%,15%)] dark:to-[hsl(205,30%,20%)] rounded-2xl p-4 text-left border border-border relative overflow-hidden shadow-sm snap-start"
                            >
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                                <FlaskConical className="w-5 h-5 text-primary" />
                              </div>
                              <h4 className="font-bold text-sm text-foreground truncate">{pkg.name}</h4>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-lg font-bold text-foreground">₹{pkg.package_price}</span>
                                {hasDiscount && <span className="text-[10px] text-muted-foreground line-through">₹{originalPrice}</span>}
                              </div>
                              {tests.length > 0 && <p className="text-[10px] text-muted-foreground mt-1">{tests.length}+ Tests</p>}
                              {hasDiscount && (
                                <span className="absolute top-2 right-2 text-[9px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">{pkg.discount_percent}% OFF</span>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* ===== PHARMACY BENEFITS ===== */}
                <div className="px-5">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.47 }}>
                    <h2 className="text-lg font-bold mb-3 text-foreground">Pharmacy Benefits</h2>
                    <div className="bg-gradient-to-br from-[hsl(205,80%,94%)] to-[hsl(210,60%,97%)] dark:from-[hsl(205,40%,15%)] dark:to-[hsl(210,30%,20%)] rounded-2xl p-4 border border-border shadow-sm">
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { icon: Tag, label: "10% Discounts", color: "text-primary", bg: "bg-primary/10" },
                          { icon: ShoppingBag, label: "Home Delivery", color: "text-[hsl(152,55%,40%)]", bg: "bg-[hsl(152,50%,92%)] dark:bg-[hsl(152,30%,18%)]" },
                          { icon: Stethoscope, label: "Free Consultation", color: "text-[hsl(200,65%,48%)]", bg: "bg-[hsl(200,60%,92%)] dark:bg-[hsl(200,30%,18%)]" },
                          { icon: Heart, label: "Secure Payment", color: "text-[hsl(152,55%,40%)]", bg: "bg-[hsl(152,50%,92%)] dark:bg-[hsl(152,30%,18%)]" },
                        ].map((item, idx) => (
                          <motion.div
                            key={item.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 + idx * 0.05 }}
                            className="bg-card rounded-xl p-3 flex items-center gap-2 shadow-sm border border-border"
                          >
                            <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center flex-shrink-0`}>
                              <item.icon className={`w-4 h-4 ${item.color}`} />
                            </div>
                            <span className="text-xs font-semibold text-foreground leading-tight">{item.label}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* ===== QUICK ACCESS MORE (2x2 grid) ===== */}
                <div className="px-5">
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}>
                    <div className="flex items-center gap-1 mb-3">
                      <h2 className="text-lg font-bold text-foreground">Quick Access More</h2>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Find Doctors */}
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/doctors")}
                        className="bg-gradient-to-br from-[hsl(215,70%,50%)] to-[hsl(215,65%,40%)] rounded-2xl p-4 text-left relative overflow-hidden shadow-md"
                        style={{ minHeight: 130 }}>
                        <p className="text-white font-bold text-base">Find Doctors</p>
                        <p className="text-white/80 text-xs mt-0.5">400+ Available</p>
                        <Stethoscope className="absolute bottom-3 right-3 w-12 h-12 text-white/15" />
                      </motion.button>

                      {/* Ambulance Service */}
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/emergency")}
                        className="bg-gradient-to-br from-muted to-[hsl(205,30%,94%)] dark:from-[hsl(210,20%,16%)] dark:to-[hsl(205,20%,14%)] rounded-2xl p-4 text-left relative overflow-hidden border border-border shadow-sm"
                        style={{ minHeight: 130 }}>
                        <p className="text-foreground font-bold text-base">Ambulance Service</p>
                        <p className="text-muted-foreground text-xs mt-0.5">10 min Guaranteed</p>
                        <p className="text-muted-foreground text-xs mt-0.5">₹200</p>
                        <Ambulance className="absolute bottom-3 right-3 w-12 h-12 text-muted-foreground/15" />
                      </motion.button>

                      {/* Medicine Delivery */}
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/pharmacies")}
                        className="bg-gradient-to-br from-[hsl(152,55%,40%)] to-[hsl(152,50%,32%)] rounded-2xl p-4 text-left relative overflow-hidden shadow-md"
                        style={{ minHeight: 130 }}>
                        <p className="text-white font-bold text-base">Medicine Delivery</p>
                        <p className="text-white/80 text-xs mt-0.5">Fast Home Delivery</p>
                        <Pill className="absolute bottom-3 right-3 w-12 h-12 text-white/15" />
                      </motion.button>

                      {/* Health Packages */}
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/labs")}
                        className="bg-gradient-to-br from-[hsl(270,40%,92%)] to-[hsl(280,35%,88%)] dark:from-[hsl(270,30%,18%)] dark:to-[hsl(280,25%,15%)] rounded-2xl p-4 text-left relative overflow-hidden border border-border shadow-sm"
                        style={{ minHeight: 130 }}>
                        <p className="text-foreground font-bold text-base">Health Packages</p>
                        <p className="text-muted-foreground text-xs mt-0.5">Full Body Checkups</p>
                        <p className="text-muted-foreground text-xs font-semibold mt-2">Starting From ₹999</p>
                        <FlaskConical className="absolute bottom-3 right-3 w-12 h-12 text-muted-foreground/15" />
                      </motion.button>
                    </div>
                  </motion.div>
                </div>


                {/* ===== BROWSE SERVICES ===== */}
                {services.length > 0 && (
                  <div className="px-5">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                      <h2 className="text-lg font-bold mb-3 text-foreground">Browse Services</h2>
                      <div className="grid grid-cols-2 gap-3">
                        {services.map((svc: any) => {
                          const SvcIcon = getIcon(svc.icon_name);
                          return (
                            <motion.button
                              key={svc.id}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => navigate(svc.path)}
                              className="bg-card rounded-2xl p-4 border border-border text-left shadow-sm"
                            >
                              <div className={`w-10 h-10 rounded-xl ${svc.bg_color} flex items-center justify-center mb-2`}>
                                <SvcIcon className={`w-5 h-5 ${svc.color}`} />
                              </div>
                              <h3 className="font-bold text-sm text-foreground">{svc.title}</h3>
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{svc.description}</p>
                            </motion.button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* ===== HEALTH TIPS ===== */}
                <div className="px-5">
                  <HealthTipsCards />
                </div>

                {/* ===== NEARBY HOSPITALS MAP ===== */}
                <div className="px-5">
                  <NearbyHospitalsMap />
                </div>

                {/* ===== ADS ===== */}
                {ads.length > 0 && (
                  <div className="px-5">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                      <div className="space-y-3">
                        {ads.map((ad) => (
                          <motion.a
                            key={ad.id}
                            whileHover={{ scale: 1.01 }}
                            href={ad.target_link || "#"}
                            target={ad.target_link?.startsWith("http") ? "_blank" : "_self"}
                            rel="noopener noreferrer"
                            className="block rounded-2xl overflow-hidden shadow-md border border-border"
                          >
                            <img src={ad.content_url} alt={ad.title || "Ad"} className="w-full h-32 object-cover" loading="lazy" decoding="async" />
                            {ad.title && (
                              <div className="bg-card px-4 py-2.5">
                                <p className="text-xs font-semibold text-foreground">{ad.title}</p>
                                <p className="text-[10px] text-muted-foreground">Sponsored</p>
                              </div>
                            )}
                          </motion.a>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <BottomNav />
    </SidebarProvider>
  );
};

export default Dashboard;
