import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, AlertTriangle, Pill, Heart, Bell, Star, Menu, X, ChevronRight, Stethoscope, Building2, FlaskConical, Store, TrendingUp, Activity, ShoppingBag, ClipboardList, RefreshCw, IndianRupee, Tag, Dumbbell, Brain, Sun, Wind, Moon, Apple, Droplets, Wallet, FileText, Microscope, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import UnifiedSearch from "@/components/dashboard/UnifiedSearch";
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
      className="w-10 h-10 flex items-center justify-center rounded-xl bg-muted/60 hover:bg-muted transition-all duration-300 active:scale-90"
    >
      <div className="relative w-6 h-6">
        <Menu className={`w-6 h-6 text-foreground absolute inset-0 transition-all duration-300 ${isOpen ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"}`} />
        <X className={`w-6 h-6 text-foreground absolute inset-0 transition-all duration-300 ${isOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`} />
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
  const touchStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useRealtimeNotifications();

  const fetchAllData = useCallback(async () => {
    try {
      const [slidesRes, doctorsRes, adsRes, medsRes, qaRes, svcRes] = await Promise.all([
        supabase.from("slider_media").select("*").eq("active", true).order("sort_order"),
        supabase.from("doctors").select("*, hospitals!left(is_government)").eq("is_featured", true).order("featured_sort_order").limit(10),
        supabase.from("ads").select("*").eq("active", true),
        supabase.from("medicines").select("*, pharmacies(name)").eq("is_featured", true).eq("in_stock", true).order("featured_sort_order").limit(10),
        supabase.from("dashboard_quick_actions").select("*").eq("active", true).order("sort_order"),
        supabase.from("dashboard_services").select("*").eq("active", true).order("sort_order"),
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

  const quickActionCards = [
    { label: "Book\nAppointment", icon: Calendar, gradient: "from-blue-500 to-blue-600", path: "/doctors" },
    { label: "Order\nMedicine", icon: ShoppingBag, gradient: "from-emerald-500 to-emerald-600", path: "/pharmacies" },
    { label: "Lab\nTests", icon: FlaskConical, gradient: "from-blue-400 to-blue-500", path: "/labs" },
    { label: "Emergency", icon: AlertTriangle, gradient: "from-red-500 to-red-600", path: "/emergency" },
  ];

  const infoCards = [
    { label: "Wallet Balance", value: `₹${walletBalance.toLocaleString()}`, icon: Wallet, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", path: "/wallet" },
    { label: "My Prescriptions", value: `${prescriptionCount} Saved`, icon: FileText, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-900/20", path: "/medical-history" },
    { label: "Lab Reports", value: `${labReportCount} Reports`, icon: Microscope, color: "text-sky-600", bg: "bg-sky-50 dark:bg-sky-900/20", path: "/lab-reports" },
    { label: "Favorites", value: `${favoritesCount} Saved`, icon: Heart, color: "text-red-500", bg: "bg-red-50 dark:bg-red-900/20", path: "/favorites" },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div
          ref={scrollRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto bg-background"
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
            {/* Top Bar - Logo centered */}
            <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b border-border">
              <div className="flex items-center justify-between px-4 h-14">
                <AnimatedMenuButton />
                <img src={remedooLogo} alt="Remedoo" className="h-8" />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => navigate("/notifications")}
                  className="relative w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center"
                >
                  <Bell className="w-5 h-5 text-foreground" />
                  <AnimatePresence>
                    {unreadCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-destructive rounded-full flex items-center justify-center"
                      >
                        <span className="text-[10px] font-bold text-destructive-foreground leading-none">{unreadCount > 99 ? "99+" : unreadCount}</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </div>
            </div>

            {/* Welcome + Search */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl font-bold text-foreground">Welcome, {displayName}!</h1>
              </div>
              <UnifiedSearch />
            </div>

            {isLoading ? (
              <div className="px-4 space-y-4">
                <Skeleton className="w-full h-44 rounded-2xl" />
                <div className="grid grid-cols-4 gap-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
                <Skeleton className="w-full h-24 rounded-2xl" />
                <div className="grid grid-cols-4 gap-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
              </div>
            ) : (
              <div className="space-y-5 px-4">
                {/* Hero Banner Slider */}
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide snap-x snap-mandatory">
                  {(slides.length > 0 ? slides : [
                    { id: "default", title: "Stay Healthy with Remedoo", description: "Book appointments, order medicines & more", url: null, type: "image", target_link: null } as any
                  ]).map((slide: any, idx: number) => {
                    const gradients = [
                      "from-sky-100 to-blue-50 dark:from-sky-900/30 dark:to-blue-900/20",
                      "from-emerald-100 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/20",
                      "from-violet-100 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/20",
                    ];
                    const hasImage = slide.url && slide.type !== "video";
                    return (
                      <motion.div
                        key={slide.id}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => slide.target_link && navigate(slide.target_link)}
                        className={`flex-shrink-0 w-[90vw] max-w-[400px] rounded-2xl overflow-hidden relative snap-start cursor-pointer ${hasImage ? '' : `bg-gradient-to-r ${gradients[idx % 3]}`}`}
                        style={{ minHeight: 160 }}
                      >
                        {hasImage ? (
                          <>
                            <img src={slide.url} alt={slide.title || ""} className="w-full h-40 sm:h-44 object-cover" loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                            <div className="absolute bottom-0 left-0 p-4">
                              <p className="text-white font-bold text-lg drop-shadow-md">{slide.title}</p>
                              {slide.description && <p className="text-white/80 text-xs mt-0.5">{slide.description}</p>}
                            </div>
                          </>
                        ) : (
                          <div className="p-5 flex flex-col justify-center h-40 sm:h-44">
                            <p className="text-foreground font-bold text-lg">{slide.title}</p>
                            {slide.description && <p className="text-muted-foreground text-sm mt-1">{slide.description}</p>}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Quick Action Cards */}
                <div className="grid grid-cols-4 gap-2.5">
                  {quickActionCards.map((action, idx) => (
                    <motion.button
                      key={action.label}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + idx * 0.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(action.path)}
                      className={`bg-gradient-to-br ${action.gradient} rounded-2xl p-3 flex flex-col items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-shadow`}
                    >
                      <action.icon className="w-6 h-6 text-white" />
                      <span className="text-[10px] sm:text-xs text-white font-semibold text-center leading-tight whitespace-pre-line">{action.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Upcoming Appointments */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-foreground">Your Upcoming Appointments</h2>
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
                            className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
                          >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center flex-shrink-0">
                              {doc?.image_url ? (
                                <img src={doc.image_url} alt={doc.name} className="w-12 h-12 rounded-full object-cover" />
                              ) : (
                                <Stethoscope className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{doc?.name || "Doctor"}</p>
                              <p className="text-xs text-muted-foreground">{doc?.specialization || "General"}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{dateLabel} | {apt.appointment_time}</p>
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/appointment/${apt.id}`); }}
                              className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors whitespace-nowrap"
                            >
                              View Details &gt;
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-card rounded-2xl border border-border p-6 text-center">
                      <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                      <button onClick={() => navigate("/doctors")} className="text-xs text-primary font-semibold mt-2 hover:underline">Book Now →</button>
                    </div>
                  )}
                </motion.div>

                {/* Info Cards Row */}
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                  <div className="grid grid-cols-4 gap-2">
                    {infoCards.map((card, idx) => (
                      <motion.button
                        key={card.label}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate(card.path)}
                        className={`${card.bg} rounded-xl p-2.5 flex flex-col items-center gap-1 text-center`}
                      >
                        <card.icon className={`w-5 h-5 ${card.color}`} />
                        <span className="text-[10px] font-semibold text-foreground leading-tight">{card.label.split(" ")[0]}</span>
                        <span className="text-[10px] font-bold text-foreground">{card.value}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Popular Doctors */}
                {topDoctors.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-bold text-foreground">Popular Doctors</h2>
                      <button onClick={() => navigate("/doctors")} className="text-primary text-sm font-semibold flex items-center gap-0.5">
                        <ChevronRight className="w-4 h-4" /><ChevronRight className="w-4 h-4 -ml-2.5" />
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide snap-x">
                      {topDoctors.map((doc, idx) => (
                        <motion.button
                          key={doc.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + idx * 0.06 }}
                          onClick={() => navigate(`/doctor/${doc.id}`)}
                          className="flex-shrink-0 w-[140px] bg-card rounded-2xl border border-border p-3 text-center snap-start hover:shadow-md transition-shadow"
                        >
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mx-auto mb-2 overflow-hidden">
                            {doc.image_url ? (
                              <img src={doc.image_url} alt={doc.name} className="w-14 h-14 rounded-full object-cover" />
                            ) : (
                              <span className="text-2xl">👨‍⚕️</span>
                            )}
                          </div>
                          <h4 className="font-bold text-xs truncate text-foreground">{doc.name}</h4>
                          <p className="text-[10px] text-primary font-medium truncate">{doc.specialization}</p>
                          <div className="flex items-center justify-center gap-1 mt-2">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-bold text-foreground">{doc.rating || "N/A"}</span>
                            <span className="text-[9px] text-muted-foreground ml-1">
                              {doc.experience_years ? `${doc.experience_years}+ Yrs` : "Nearby"}
                            </span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Popular Medicines */}
                {popularMedicines.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-bold text-foreground">Popular Medicines</h2>
                      <button onClick={() => navigate("/pharmacies")} className="text-sm text-primary font-semibold flex items-center gap-0.5">
                        Browse <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide snap-x">
                      {popularMedicines.map((med, idx) => {
                        const discounted = med.discount_percent && med.discount_percent > 0;
                        const finalPrice = discounted ? med.price * (1 - (med.discount_percent || 0) / 100) : med.price;
                        return (
                          <motion.button
                            key={med.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.45 + idx * 0.06 }}
                            onClick={() => navigate(`/pharmacies`)}
                            className="flex-shrink-0 w-36 bg-card rounded-2xl border border-border p-3 text-left snap-start hover:shadow-md transition-shadow"
                          >
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-2">
                              <Pill className="w-5 h-5 text-emerald-600" />
                            </div>
                            <h4 className="font-bold text-xs truncate text-foreground">{med.name}</h4>
                            <p className="text-[10px] text-muted-foreground truncate">{med.pharmacy_name || med.category}</p>
                            <div className="flex items-center gap-1 mt-2">
                              <span className="text-xs font-bold text-foreground">₹{Math.round(finalPrice)}</span>
                              {discounted && (
                                <span className="text-[10px] text-muted-foreground line-through">₹{med.price}</span>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {/* Browse Services */}
                {services.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                    <h2 className="text-base font-bold mb-3 text-foreground">Browse Services</h2>
                    <div className="grid grid-cols-2 gap-2.5">
                      {services.map((svc: any) => {
                        const SvcIcon = getIcon(svc.icon_name);
                        return (
                          <motion.button
                            key={svc.id}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate(svc.path)}
                            className="bg-card rounded-2xl p-4 border border-border text-left hover:shadow-md transition-shadow"
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
                )}

                {/* Health Tips */}
                <HealthTipsCards />

                {/* Nearby Hospitals Map */}
                <NearbyHospitalsMap />

                {/* Ads */}
                {ads.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <div className="space-y-3">
                      {ads.map((ad) => (
                        <motion.a
                          key={ad.id}
                          whileHover={{ scale: 1.01 }}
                          href={ad.target_link || "#"}
                          target={ad.target_link?.startsWith("http") ? "_blank" : "_self"}
                          rel="noopener noreferrer"
                          className="block rounded-2xl overflow-hidden shadow-md border border-border hover:shadow-lg transition-shadow"
                        >
                          <img src={ad.content_url} alt={ad.title || "Ad"} className="w-full h-32 object-cover" loading="lazy" />
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
