import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useGuardedNavigate } from "@/hooks/useGuardedNavigate";
import { Calendar, AlertTriangle, Pill, Heart, Bell, Star, Menu, X, ChevronRight, Stethoscope, Building2, FlaskConical, Store, TrendingUp, Activity, ShoppingBag, ClipboardList, RefreshCw, IndianRupee, Tag, Dumbbell, Brain, Sun, Wind, Moon, Apple, Droplets, FileText, Microscope, Ambulance, MapPin, Clock, Percent, Zap, type LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const logoIcons = ["💊", "🩺", "🏥", "❤️", "💉", "🧬", "🧪"];
const logoLetters = "Remedoo".split("");
let logoAnimatedOnce = false;

const AnimatedLogo = () => {
  const skipAnimation = logoAnimatedOnce;
  const [morphed, setMorphed] = useState(skipAnimation);
  useEffect(() => {
    if (skipAnimation) return;
    const t = setTimeout(() => {
      setMorphed(true);
      logoAnimatedOnce = true;
    }, 600);
    return () => clearTimeout(t);
  }, [skipAnimation]);

  if (skipAnimation) {
    return (
      <div className="flex items-center gap-0">
        {logoLetters.map((letter, i) => (
          <div key={i} className="relative w-[0.85rem] h-7 flex items-center justify-center">
            <span className="absolute text-xl font-extrabold text-primary-foreground">{letter}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0">
      {logoLetters.map((letter, i) => (
        <div key={i} className="relative w-[0.85rem] h-7 flex items-center justify-center">
          <motion.span
            className="absolute text-[10px]"
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: morphed ? 0 : 1,
              scale: morphed ? 0.3 : 1,
              rotateY: morphed ? 90 : 0,
            }}
            transition={{
              opacity: { duration: 0.2, delay: morphed ? i * 0.05 : i * 0.06 },
              scale: { duration: 0.25, delay: morphed ? i * 0.05 : i * 0.06 },
              rotateY: { duration: 0.2, delay: morphed ? i * 0.05 : 0 },
            }}
          >
            {logoIcons[i]}
          </motion.span>
          <motion.span
            className="absolute text-xl font-extrabold text-primary-foreground"
            initial={{ opacity: 0, scale: 0.3, rotateY: -90 }}
            animate={{
              opacity: morphed ? 1 : 0,
              scale: morphed ? 1 : 0.3,
              rotateY: morphed ? 0 : -90,
            }}
            transition={{
              type: "spring",
              stiffness: 280,
              damping: 18,
              delay: i * 0.06 + 0.1,
            }}
          >
            {letter}
          </motion.span>
        </div>
      ))}
    </div>
  );
};

import NearbyHospitalsMap from "@/components/dashboard/NearbyHospitalsMap";
import HealthTipsCards from "@/components/dashboard/HealthTipsCards";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupaUser } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import BottomNav from "@/components/BottomNav";
import SupportQueryFab from "@/components/patient/SupportQueryFab";
import { Skeleton } from "@/components/ui/skeleton";
import UnifiedSearch from "@/components/dashboard/UnifiedSearch";

const iconMap: Record<string, LucideIcon> = {
  Calendar, AlertTriangle, Pill, Heart, Bell, Star, Stethoscope, Building2,
  FlaskConical, Store, TrendingUp, Activity, ShoppingBag, ClipboardList,
  IndianRupee, Tag, Dumbbell, Brain, Sun, Wind, Moon, Apple, Droplets, RefreshCw,
  FileText, Microscope, Ambulance, MapPin,
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

const PROMO_BANNERS_FALLBACK = [
  { title: "Flat 30% OFF", subtitle: "on first doctor consultation", gradient: "from-[hsl(262,60%,52%)] to-[hsl(280,55%,45%)]", emoji: "🩺" },
  { title: "Free Delivery", subtitle: "on medicine orders above ₹199", gradient: "from-[hsl(152,55%,40%)] to-[hsl(170,60%,38%)]", emoji: "💊" },
  { title: "Health Packages", subtitle: "starting at ₹299 only", gradient: "from-[hsl(200,65%,45%)] to-[hsl(215,70%,50%)]", emoji: "🧪" },
  { title: "Emergency SOS", subtitle: "ambulance in under 10 mins", gradient: "from-[hsl(0,70%,52%)] to-[hsl(350,60%,48%)]", emoji: "🚑" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const guardedNavigate = useGuardedNavigate();
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
  const [prescriptionCount, setPrescriptionCount] = useState(0);
  const [labReportCount, setLabReportCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [popularHospitals, setPopularHospitals] = useState<any[]>([]);
  const [featuredPackages, setFeaturedPackages] = useState<any[]>([]);
  const [pharmacyOffers, setPharmacyOffers] = useState<any[]>([]);
  const [infoCards, setInfoCards] = useState<any[]>([]);
  const [quickAccessItems, setQuickAccessItems] = useState<any[]>([]);
  const [promoIdx, setPromoIdx] = useState(0);
  const [promoBanners, setPromoBanners] = useState<any[]>([]);
  const [categoryActions, setCategoryActions] = useState<any[]>([]);
  const touchStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useRealtimeNotifications();

  const activeBanners = promoBanners.length > 0 ? promoBanners : PROMO_BANNERS_FALLBACK;
  useEffect(() => {
    if (activeBanners.length === 0) return;
    const t = setInterval(() => setPromoIdx(p => (p + 1) % activeBanners.length), 3500);
    return () => clearInterval(t);
  }, [activeBanners.length]);

  const fetchAllData = useCallback(async () => {
    try {
      const [slidesRes, doctorsRes, adsRes, medsRes, qaRes, svcRes, hospitalsRes, packagesRes, pharmacyOffersRes, infoCardsRes, quickAccessRes, promoBannersRes, catActionsRes] = await Promise.all([
        supabase.from("slider_media").select("*").eq("active", true).order("sort_order"),
        supabase.from("doctors").select("*, hospitals!left(is_government)").eq("is_featured", true).order("featured_sort_order").limit(10),
        supabase.from("ads").select("*").eq("active", true),
        supabase.from("medicines").select("*, pharmacies(name)").eq("is_featured", true).eq("in_stock", true).order("featured_sort_order").limit(10),
        supabase.from("dashboard_quick_actions").select("*").eq("active", true).order("sort_order"),
        supabase.from("dashboard_services").select("*").eq("active", true).order("sort_order"),
        supabase.from("hospitals").select("id, name, location, rating, image_url, total_beds, is_government").eq("approval_status", "approved").order("rating", { ascending: false }).limit(5),
        supabase.from("lab_test_packages").select("*, labs(name)").eq("is_active", true).order("created_at", { ascending: false }).limit(6),
        supabase.from("pharmacies").select("id, name, location, rating, image_url").eq("approval_status", "approved").order("rating", { ascending: false }).limit(6),
        supabase.from("dashboard_info_cards").select("*").eq("active", true).order("sort_order"),
        supabase.from("dashboard_quick_access").select("*").eq("active", true).order("sort_order"),
        supabase.from("dashboard_promo_banners").select("*").eq("active", true).order("sort_order"),
        supabase.from("dashboard_category_actions").select("*").eq("active", true).order("sort_order"),
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
      if (infoCardsRes.data) setInfoCards(infoCardsRes.data);
      if (quickAccessRes.data) setQuickAccessItems(quickAccessRes.data);

      if (pharmacyOffersRes.data && pharmacyOffersRes.data.length > 0) {
        const pharmacyIds = pharmacyOffersRes.data.map((p: any) => p.id);
        const { data: offerMeds } = await supabase
          .from("medicines")
          .select("id, name, price, discount_percent, pharmacy_id")
          .in("pharmacy_id", pharmacyIds)
          .gt("discount_percent", 0)
          .eq("in_stock", true)
          .order("discount_percent", { ascending: false })
          .limit(50);
        const pharmaciesWithOffers = pharmacyOffersRes.data.map((ph: any) => {
          const meds = (offerMeds || []).filter((m: any) => m.pharmacy_id === ph.id);
          const maxDiscount = meds.length > 0 ? Math.max(...meds.map((m: any) => m.discount_percent || 0)) : 0;
          return { ...ph, offerCount: meds.length, maxDiscount, topOffers: meds.slice(0, 3) };
        });
        setPharmacyOffers(pharmaciesWithOffers);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsLoading(false); return; }
      const userId = session.user.id;
      const today = new Date().toISOString().split("T")[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

      const [notifRes, apptRes, orderRes, activeRes, upcomingRes, prescRes, labRepRes, favRes] = await Promise.all([
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("read", false),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("patient_id", userId).gte("appointment_date", today).in("status", ["pending", "confirmed"]),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", thirtyDaysAgo),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", userId).in("status", ["placed", "confirmed", "out_for_delivery"]),
        supabase.from("appointments").select("id, appointment_date, appointment_time, status, doctor_id, doctors(name, specialization, image_url)").eq("patient_id", userId).gte("appointment_date", today).in("status", ["pending", "confirmed"]).order("appointment_date").limit(2),
        supabase.from("appointments").select("id", { count: "exact", head: true }).eq("patient_id", userId).not("prescription_url", "is", null),
        supabase.from("lab_sample_collections").select("id", { count: "exact", head: true }).eq("patient_id", userId).not("report_url", "is", null),
        supabase.from("favorites").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      setUnreadCount(notifRes.count ?? 0);
      setUpcomingAppts(apptRes.count ?? 0);
      setRecentOrders(orderRes.count ?? 0);
      setActiveOrders(activeRes.count ?? 0);
      setUpcomingAppointments(upcomingRes.data || []);
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

  const CATEGORY_DEFAULTS = [
    { label: "Doctors", icon_name: "Stethoscope", path: "/doctors", emoji: "🩺", bg_color: "bg-[hsl(205,80%,92%)] dark:bg-[hsl(205,40%,18%)]", text_color: "text-[hsl(205,65%,45%)]" },
    { label: "Hospitals", icon_name: "Building2", path: "/hospitals", emoji: "🏥", bg_color: "bg-[hsl(152,50%,92%)] dark:bg-[hsl(152,30%,18%)]", text_color: "text-[hsl(152,55%,40%)]" },
    { label: "Labs", icon_name: "FlaskConical", path: "/labs", emoji: "🧪", bg_color: "bg-[hsl(262,50%,93%)] dark:bg-[hsl(262,30%,18%)]", text_color: "text-[hsl(262,60%,52%)]" },
    { label: "Pharmacy", icon_name: "Store", path: "/pharmacies", emoji: "💊", bg_color: "bg-[hsl(30,80%,92%)] dark:bg-[hsl(30,40%,18%)]", text_color: "text-[hsl(30,80%,50%)]" },
    { label: "Emergency", icon_name: "Ambulance", path: "/emergency", emoji: "🚑", bg_color: "bg-destructive/10", text_color: "text-destructive" },
    { label: "Favorites", icon_name: "Heart", path: "/favorites", emoji: "❤️", bg_color: "bg-[hsl(330,60%,93%)] dark:bg-[hsl(330,30%,18%)]", text_color: "text-[hsl(330,65%,50%)]" },
    { label: "Orders", icon_name: "ShoppingBag", path: "/my-orders", emoji: "📦", bg_color: "bg-[hsl(45,80%,92%)] dark:bg-[hsl(45,30%,18%)]", text_color: "text-[hsl(45,85%,40%)]" },
    { label: "Reports", icon_name: "FileText", path: "/lab-reports", emoji: "📋", bg_color: "bg-[hsl(190,60%,92%)] dark:bg-[hsl(190,30%,18%)]", text_color: "text-[hsl(190,70%,42%)]" },
  ];
  const activeCategoryActions = categoryActions.length > 0 ? categoryActions : CATEGORY_DEFAULTS;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-x-hidden bg-muted/30 dark:bg-background">
          {/* ===== FIXED HEADER — outside scroll ===== */}
          <div className="shrink-0 z-40 bg-primary safe-top">
            <div className="flex items-center justify-between px-4 h-14">
              <AnimatedMenuButton />
              <AnimatedLogo />
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

          {/* Scrollable content area */}
          <div
            ref={scrollRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex-1 overflow-y-auto overflow-x-hidden"
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

          <div className="pb-24 overflow-x-hidden">
            {/* ===== HERO HEADER with search ===== */}
            <div className="bg-primary rounded-b-[28px] px-4 pt-2 pb-5">
              <p className="text-white/80 text-xs font-medium">Hello,</p>
              <h1 className="text-xl font-bold text-white truncate">{displayName} 👋</h1>
              <div className="mt-3">
                <UnifiedSearch />
              </div>
            </div>

            {isLoading ? (
              <div className="px-4 space-y-4 pt-4">
                <Skeleton className="w-full h-28 rounded-2xl" />
                <div className="grid grid-cols-4 gap-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
                <Skeleton className="w-full h-24 rounded-2xl" />
              </div>
            ) : (
              <div className="space-y-5 pt-4 w-full max-w-full">

                {/* ===== CATEGORY GRID (Swiggy-style round icons) ===== */}
                <div className="px-4">
                  <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                    {activeCategoryActions.map((cat, idx) => {
                      const CatIcon = getIcon(cat.icon_name);
                      return (
                        <motion.button
                          key={cat.label}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 + idx * 0.04 }}
                          whileTap={{ scale: 0.92 }}
                          onClick={() => navigate(cat.path)}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <div className={`w-14 h-14 rounded-2xl ${cat.bg_color || cat.bg} flex items-center justify-center shadow-sm`}>
                            <CatIcon className={`w-6 h-6 ${cat.text_color || cat.color}`} strokeWidth={1.8} />
                          </div>
                          <span className="text-[11px] font-semibold text-foreground text-center leading-tight">{cat.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* ===== PROMO CAROUSEL ===== */}
                <div className="px-4">
                  <div className="relative overflow-hidden rounded-2xl h-[110px]">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={promoIdx}
                        initial={{ opacity: 0, x: 60 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -60 }}
                        transition={{ duration: 0.4 }}
                        className={`absolute inset-0 bg-gradient-to-r ${activeBanners[promoIdx % activeBanners.length]?.gradient} rounded-2xl p-5 flex items-center justify-between`}
                      >
                        <div>
                          <p className="text-white font-extrabold text-xl">{activeBanners[promoIdx % activeBanners.length]?.title}</p>
                          <p className="text-white/80 text-sm mt-1">{activeBanners[promoIdx % activeBanners.length]?.subtitle || activeBanners[promoIdx % activeBanners.length]?.sub}</p>
                        </div>
                        <span className="text-5xl opacity-80">{activeBanners[promoIdx % activeBanners.length]?.emoji}</span>
                      </motion.div>
                    </AnimatePresence>
                    {/* Dots */}
                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {activeBanners.map((_, i) => (
                        <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === promoIdx % activeBanners.length ? "w-5 bg-white" : "w-1.5 bg-white/40"}`} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* ===== HERO SLIDER (if slides exist) ===== */}
                {slides.length > 0 && (
                  <div className="px-4">
                    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide snap-x snap-mandatory">
                      {slides.map((slide: any, idx: number) => (
                        <motion.div
                          key={slide.id}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          onClick={() => slide.target_link && navigate(slide.target_link)}
                          className="flex-shrink-0 w-[85vw] max-w-[360px] rounded-2xl overflow-hidden relative snap-start cursor-pointer"
                          style={{ minHeight: 150 }}
                        >
                          {slide.url && slide.type !== "video" ? (
                            <>
                              <img src={slide.url} alt={slide.title || ""} className="w-full h-[150px] object-cover" loading="lazy" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                              <div className="absolute bottom-0 left-0 p-4">
                                <p className="text-white font-bold text-base drop-shadow-md">{slide.title}</p>
                                {slide.description && <p className="text-white/80 text-xs mt-0.5">{slide.description}</p>}
                              </div>
                            </>
                          ) : (
                            <div className="p-5 flex flex-col justify-center h-[150px] bg-gradient-to-r from-primary/10 to-primary/5">
                              <p className="text-foreground font-bold text-lg">{slide.title}</p>
                              <p className="text-muted-foreground text-sm mt-1">{slide.description}</p>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== LIVE STATUS STRIP ===== */}
                <div className="px-4">
                  <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                    {[
                      { label: "Appointments", value: upcomingAppts, icon: Calendar, color: "text-primary", bg: "bg-primary/10", path: "/appointments" },
                      { label: "Active Orders", value: activeOrders, icon: ShoppingBag, color: "text-[hsl(152,55%,40%)]", bg: "bg-[hsl(152,50%,92%)] dark:bg-[hsl(152,30%,18%)]", path: "/my-orders" },
                      { label: "Prescriptions", value: prescriptionCount, icon: FileText, color: "text-[hsl(262,60%,52%)]", bg: "bg-[hsl(262,50%,93%)] dark:bg-[hsl(262,30%,18%)]", path: "/medical-history" },
                      { label: "Reports", value: labReportCount, icon: Microscope, color: "text-[hsl(200,65%,45%)]", bg: "bg-[hsl(200,60%,92%)] dark:bg-[hsl(200,30%,18%)]", path: "/lab-reports" },
                    ].map((item, idx) => (
                      <motion.button
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + idx * 0.05 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => navigate(item.path)}
                        className="flex-shrink-0 flex items-center gap-2.5 bg-card border border-border rounded-xl px-3.5 py-2.5 shadow-sm min-w-[140px]"
                      >
                        <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center`}>
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                        </div>
                        <div className="text-left">
                          <p className="text-lg font-bold text-foreground leading-none">{item.value}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* ===== UPCOMING APPOINTMENTS ===== */}
                <div className="px-4">
                  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-bold text-foreground">Upcoming Appointments</h2>
                      {upcomingAppts > 0 && (
                        <button onClick={() => navigate("/appointments")} className="text-xs font-semibold text-primary">See all</button>
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
                              className="bg-card rounded-2xl border border-border p-3.5 flex items-center gap-3 cursor-pointer shadow-sm"
                            >
                              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {doc?.image_url ? (
                                  <img src={doc.image_url} alt={doc.name} className="w-12 h-12 rounded-xl object-cover" />
                                ) : (
                                  <Stethoscope className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-sm text-foreground truncate">{doc?.name || "Doctor"}</p>
                                <p className="text-xs text-muted-foreground">{doc?.specialization || "General"}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Clock className="w-3 h-3" /> {dateLabel} · {apt.appointment_time}</span>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-card rounded-2xl border border-border p-5 text-center shadow-sm">
                        <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No upcoming appointments</p>
                        <button onClick={() => navigate("/doctors")} className="text-xs text-primary font-semibold mt-2 hover:underline">Book Now →</button>
                      </div>
                    )}
                  </motion.div>
                </div>

                {/* ===== POPULAR DOCTORS ===== */}
                {topDoctors.length > 0 && (
                  <div className="px-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-bold text-foreground">Popular Doctors</h2>
                      <button onClick={() => navigate("/doctors")} className="text-xs font-semibold text-primary">See all</button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                      {topDoctors.map((doc, idx) => (
                        <motion.button
                          key={doc.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + idx * 0.05 }}
                          onClick={() => navigate(`/doctor/${doc.id}`)}
                          className="flex-shrink-0 w-[140px] bg-card rounded-2xl border border-border overflow-hidden snap-start shadow-sm"
                        >
                          <div className="h-24 bg-muted flex items-center justify-center overflow-hidden">
                            {doc.image_url ? (
                              <img src={doc.image_url} alt={doc.name} className="w-full h-full object-cover" />
                            ) : (
                              <Stethoscope className="w-8 h-8 text-muted-foreground/40" />
                            )}
                          </div>
                          <div className="p-2.5">
                            <h4 className="font-bold text-xs truncate text-foreground">{doc.name}</h4>
                            <p className="text-[10px] text-muted-foreground truncate">{doc.specialization}</p>
                            <div className="flex items-center gap-1 mt-1.5">
                              <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${(doc.rating || 0) >= 4 ? "bg-[hsl(152,55%,40%)]" : (doc.rating || 0) >= 3 ? "bg-[hsl(45,85%,48%)]" : "bg-[hsl(30,80%,50%)]"}`}>
                                ★ {doc.rating || "N/A"}
                              </div>
                              <span className="text-[9px] text-muted-foreground">
                                {doc.experience_years ? `${doc.experience_years}y exp` : ""}
                              </span>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== POPULAR HOSPITALS ===== */}
                {popularHospitals.length > 0 && (
                  <div className="px-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-bold text-foreground">Popular Hospitals</h2>
                      <button onClick={() => navigate("/hospitals")} className="text-xs font-semibold text-primary">See all</button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                      {popularHospitals.map((hosp: any, idx: number) => (
                        <motion.button
                          key={hosp.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.35 + idx * 0.05 }}
                          onClick={() => navigate(`/hospital/${hosp.id}`)}
                          className="flex-shrink-0 w-[260px] bg-card rounded-2xl border border-border overflow-hidden snap-start shadow-sm"
                        >
                          <div className="h-28 bg-muted relative overflow-hidden">
                            {hosp.image_url ? (
                              <img src={hosp.image_url} alt={hosp.name} className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                                <Building2 className="w-10 h-10 text-muted-foreground/30" />
                              </div>
                            )}
                            <div className="absolute top-2 left-2">
                              <div className={`px-1.5 py-0.5 rounded text-[10px] font-bold text-white ${(hosp.rating || 0) >= 4 ? "bg-[hsl(152,55%,40%)]" : "bg-[hsl(45,85%,48%)]"}`}>
                                ★ {hosp.rating || "N/A"}
                              </div>
                            </div>
                          </div>
                          <div className="p-3">
                            <h4 className="font-bold text-sm text-foreground truncate">{hosp.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              {hosp.location && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 truncate">
                                  <MapPin className="w-3 h-3 flex-shrink-0" /> {hosp.location}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Multispeciality</span>
                              {hosp.total_beds && <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{hosp.total_beds} beds</span>}
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ===== POPULAR MEDICINES ===== */}
                {popularMedicines.length > 0 && (
                  <div className="px-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-bold text-foreground">Popular Medicines</h2>
                      <button onClick={() => navigate("/pharmacies")} className="text-xs font-semibold text-primary">See all</button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                      {popularMedicines.map((med, idx) => {
                        const discountedPrice = med.discount_percent ? med.price * (1 - med.discount_percent / 100) : null;
                        return (
                          <motion.button
                            key={med.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + idx * 0.05 }}
                            onClick={() => navigate(`/pharmacy/${med.pharmacy_id}`)}
                            className="flex-shrink-0 w-[130px] bg-card rounded-2xl border border-border p-3 text-center snap-start shadow-sm relative"
                          >
                            {med.discount_percent && med.discount_percent > 0 && (
                              <span className="absolute top-2 right-2 bg-[hsl(152,55%,40%)] text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                                {med.discount_percent}% OFF
                              </span>
                            )}
                            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-2">
                              {med.image_url ? (
                                <img src={med.image_url} alt={med.name} className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
                              ) : (
                                <Pill className="w-5 h-5 text-muted-foreground" />
                              )}
                            </div>
                            <h4 className="font-bold text-[11px] truncate text-foreground">{med.name}</h4>
                            <p className="text-[9px] text-muted-foreground truncate">{med.category}</p>
                            <div className="flex items-center justify-center gap-1 mt-1.5">
                              <span className="text-xs font-bold text-foreground">₹{discountedPrice ? discountedPrice.toFixed(0) : med.price}</span>
                              {discountedPrice && <span className="text-[9px] text-muted-foreground line-through">₹{med.price}</span>}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ===== FEATURED PACKAGES ===== */}
                {featuredPackages.length > 0 && (
                  <div className="px-4">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-bold text-foreground">Health Packages</h2>
                      <button onClick={() => navigate("/labs")} className="text-xs font-semibold text-primary">See all</button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                      {featuredPackages.map((pkg: any, idx: number) => {
                        const hasDiscount = pkg.discount_percent && pkg.discount_percent > 0;
                        const originalPrice = hasDiscount ? Math.round(pkg.package_price / (1 - pkg.discount_percent / 100)) : pkg.package_price;
                        const tests = Array.isArray(pkg.tests) ? pkg.tests : [];
                        return (
                          <motion.button
                            key={pkg.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.42 + idx * 0.05 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate("/labs")}
                            className="flex-shrink-0 w-[180px] bg-card rounded-2xl border border-border p-3.5 text-left snap-start shadow-sm relative overflow-hidden"
                          >
                            {hasDiscount && (
                              <span className="absolute top-2 right-2 text-[8px] font-bold bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded">{pkg.discount_percent}% OFF</span>
                            )}
                            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                              <FlaskConical className="w-4 h-4 text-primary" />
                            </div>
                            <h4 className="font-bold text-xs text-foreground truncate">{pkg.name}</h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-sm font-bold text-foreground">₹{pkg.package_price}</span>
                              {hasDiscount && <span className="text-[9px] text-muted-foreground line-through">₹{originalPrice}</span>}
                            </div>
                            {tests.length > 0 && <p className="text-[9px] text-muted-foreground mt-1">{tests.length}+ Tests included</p>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ===== PHARMACY BENEFITS ===== */}
                <div className="px-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-base font-bold text-foreground">Pharmacy Benefits</h2>
                    <button onClick={() => navigate("/pharmacies")} className="text-xs font-semibold text-primary">See all</button>
                  </div>
                  {pharmacyOffers.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                      {pharmacyOffers.map((ph: any, idx: number) => (
                        <motion.button
                          key={ph.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.45 + idx * 0.05 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => navigate(`/pharmacy/${ph.id}`)}
                          className="flex-shrink-0 w-[180px] bg-card rounded-2xl border border-border p-3.5 text-left snap-start shadow-sm relative overflow-hidden"
                        >
                          {ph.maxDiscount > 0 && (
                            <span className="absolute top-2 right-2 bg-[hsl(152,55%,40%)] text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                              Up to {ph.maxDiscount}% OFF
                            </span>
                          )}
                          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-2 overflow-hidden">
                            {ph.image_url ? (
                              <img src={ph.image_url} alt={ph.name} className="w-10 h-10 rounded-xl object-cover" loading="lazy" />
                            ) : (
                              <Store className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <h4 className="font-bold text-xs text-foreground truncate">{ph.name}</h4>
                          {ph.location && (
                            <p className="text-[9px] text-muted-foreground truncate flex items-center gap-0.5 mt-0.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" /> {ph.location}
                            </p>
                          )}
                          {ph.rating > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${ph.rating >= 4 ? "bg-[hsl(152,55%,40%)]" : "bg-[hsl(45,85%,48%)]"}`}>
                                ★ {ph.rating}
                              </div>
                            </div>
                          )}
                          {ph.offerCount > 0 && (
                            <p className="text-[9px] text-[hsl(152,55%,35%)] dark:text-[hsl(152,50%,60%)] font-semibold mt-1.5">🎉 {ph.offerCount} offer{ph.offerCount > 1 ? "s" : ""}</p>
                          )}
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { icon: Tag, label: "10% Discounts", color: "text-primary", bg: "bg-primary/10" },
                        { icon: ShoppingBag, label: "Home Delivery", color: "text-[hsl(152,55%,40%)]", bg: "bg-[hsl(152,50%,92%)] dark:bg-[hsl(152,30%,18%)]" },
                        { icon: Stethoscope, label: "Free Consultation", color: "text-[hsl(200,65%,48%)]", bg: "bg-[hsl(200,60%,92%)] dark:bg-[hsl(200,30%,18%)]" },
                        { icon: Heart, label: "Secure Payment", color: "text-[hsl(330,65%,50%)]", bg: "bg-[hsl(330,50%,93%)] dark:bg-[hsl(330,30%,18%)]" },
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
                  )}
                </div>

                {/* ===== QUICK ACCESS ===== */}
                {quickAccessItems.length > 0 && (
                  <div className="px-4">
                    <h2 className="text-base font-bold text-foreground mb-3">Explore More</h2>
                    <div className="grid grid-cols-2 gap-2.5">
                      {quickAccessItems.map((item: any, idx: number) => {
                        const QAIcon = getIcon(item.icon_name);
                        return (
                          <motion.button
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + idx * 0.04 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate(item.path)}
                            className="bg-card rounded-2xl border border-border p-4 text-left shadow-sm relative overflow-hidden"
                          >
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                              <QAIcon className="w-5 h-5 text-primary" />
                            </div>
                            <p className="font-bold text-sm text-foreground">{item.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{item.subtitle}</p>
                            {item.extra_text && <p className="text-[9px] font-semibold text-primary mt-1">{item.extra_text}</p>}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ===== BROWSE SERVICES ===== */}
                {services.length > 0 && (
                  <div className="px-4">
                    <h2 className="text-base font-bold mb-3 text-foreground">Browse Services</h2>
                    <div className="grid grid-cols-2 gap-2.5">
                      {services.map((svc: any) => {
                        const SvcIcon = getIcon(svc.icon_name);
                        return (
                          <motion.button
                            key={svc.id}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate(svc.path)}
                            className="bg-card rounded-2xl p-3.5 border border-border text-left shadow-sm"
                          >
                            <div className={`w-9 h-9 rounded-xl ${svc.bg_color} flex items-center justify-center mb-2`}>
                              <SvcIcon className={`w-4 h-4 ${svc.color}`} />
                            </div>
                            <h3 className="font-bold text-xs text-foreground">{svc.title}</h3>
                            <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{svc.description}</p>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ===== HEALTH TIPS ===== */}
                <div className="px-4">
                  <HealthTipsCards />
                </div>

                {/* ===== NEARBY HOSPITALS MAP ===== */}
                <div className="px-4">
                  <NearbyHospitalsMap />
                </div>

                {/* ===== ADS ===== */}
                {ads.length > 0 && (
                  <div className="px-4">
                    <div className="space-y-3">
                      {ads.map((ad) => (
                        <motion.a
                          key={ad.id}
                          whileHover={{ scale: 1.01 }}
                          href={ad.target_link || "#"}
                          target={ad.target_link?.startsWith("http") ? "_blank" : "_self"}
                          rel="noopener noreferrer"
                          className="block rounded-2xl overflow-hidden shadow-sm border border-border"
                        >
                          <img src={ad.content_url} alt={ad.title || "Ad"} className="w-full h-28 object-cover" loading="lazy" />
                          {ad.title && (
                            <div className="bg-card px-3 py-2">
                              <p className="text-xs font-semibold text-foreground">{ad.title}</p>
                              <p className="text-[9px] text-muted-foreground">Sponsored</p>
                            </div>
                          )}
                        </motion.a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
      <SupportQueryFab />
      <BottomNav />
    </SidebarProvider>
  );
};

export default Dashboard;
