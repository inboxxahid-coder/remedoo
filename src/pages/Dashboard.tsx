import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, AlertTriangle, Pill, Heart, Bell, Star, Menu, X, ChevronRight, Stethoscope, Building2, FlaskConical, Store, TrendingUp, Activity, ShoppingBag, ClipboardList, RefreshCw, IndianRupee, Tag, Dumbbell, Brain, Sun, Wind, Moon, Apple, Droplets, type LucideIcon } from "lucide-react";
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

// Icon lookup map for dynamic icon resolution
const iconMap: Record<string, LucideIcon> = {
  Calendar, AlertTriangle, Pill, Heart, Bell, Star, Stethoscope, Building2,
  FlaskConical, Store, TrendingUp, Activity, ShoppingBag, ClipboardList,
  IndianRupee, Tag, Dumbbell, Brain, Sun, Wind, Moon, Apple, Droplets, RefreshCw,
};

const getIcon = (name: string): LucideIcon => iconMap[name] || Heart;

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

const AnimatedMenuButton = () => {
  const { toggleSidebar, open, openMobile, isMobile } = useSidebar();
  const isOpen = isMobile ? openMobile : open;

  return (
    <button
      onClick={toggleSidebar}
      className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-foreground/20 border border-primary-foreground/30 hover:bg-primary-foreground/30 transition-all duration-300 active:scale-90 backdrop-blur-sm"
    >
      <div className="relative w-6 h-6">
        <Menu className={`w-6 h-6 text-primary-foreground absolute inset-0 transition-all duration-300 ${isOpen ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"}`} />
        <X className={`w-6 h-6 text-primary-foreground absolute inset-0 transition-all duration-300 ${isOpen ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`} />
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
        // Filter out government hospital doctors
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

      const [notifRes, apptRes, orderRes, activeRes] = await Promise.all([
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("read", false),
        supabase.from("appointments").select("*", { count: "exact", head: true }).eq("patient_id", userId).gte("appointment_date", today).in("status", ["pending", "confirmed"]),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", thirtyDaysAgo),
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", userId).in("status", ["placed", "confirmed", "out_for_delivery"]),
      ]);
      setUnreadCount(notifRes.count ?? 0);
      setUpcomingAppts(apptRes.count ?? 0);
      setRecentOrders(orderRes.count ?? 0);
      setActiveOrders(activeRes.count ?? 0);
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

  // Pull-to-refresh touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 5) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta > 0) {
      setPullDistance(Math.min(delta * 0.4, 80));
    }
  }, [isRefreshing]);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 50) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, handleRefresh]);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Patient";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const greetingEmoji = hour < 12 ? "☀️" : hour < 17 ? "🌤️" : "🌙";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div
          ref={scrollRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto"
          style={{ overscrollBehavior: "contain" }}
        >
          {/* Pull-to-refresh indicator */}
          <AnimatePresence>
            {(pullDistance > 0 || isRefreshing) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: isRefreshing ? 48 : pullDistance, opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center justify-center bg-background overflow-hidden"
              >
                <motion.div
                  animate={{ rotate: isRefreshing ? 360 : pullDistance * 3.6 }}
                  transition={isRefreshing ? { duration: 0.8, repeat: Infinity, ease: "linear" } : { duration: 0 }}
                >
                  <RefreshCw className={`w-5 h-5 ${pullDistance > 50 || isRefreshing ? "text-primary" : "text-muted-foreground"}`} />
                </motion.div>
                {isRefreshing && (
                  <span className="ml-2 text-xs text-muted-foreground font-medium">Refreshing...</span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          <div className="bg-background pb-24">
            {/* Header */}
            <div className="relative">
              <div className="gradient-primary px-5 pt-6 pb-12 rounded-b-[2.5rem]">
                {/* Animated decorative shapes */}
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.05, 0.1, 0.05] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-primary-foreground/5"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.08, 0.05] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                  className="absolute top-20 -right-5 w-28 h-28 rounded-full bg-primary-foreground/5"
                />
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                  className="absolute -bottom-8 -left-8 w-36 h-36 rounded-full bg-primary-foreground/5"
                />

                <motion.div
                  initial={{ opacity: 0, y: -15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="flex items-center justify-between mb-6 relative z-10"
                >
                  <div className="flex items-center gap-3">
                    <AnimatedMenuButton />
                    <div>
                      <p className="text-primary-foreground/70 text-sm font-medium">{greeting} {greetingEmoji}</p>
                      <h1 className="text-xl font-bold text-primary-foreground tracking-tight">{displayName}</h1>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate("/notifications")}
                    className="relative w-11 h-11 rounded-full bg-primary-foreground/15 flex items-center justify-center border border-primary-foreground/20 backdrop-blur-sm"
                  >
                    <Bell className="w-5 h-5 text-primary-foreground" />
                    <AnimatePresence>
                      {unreadCount > 0 && (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-emergency rounded-full border-2 border-primary flex items-center justify-center"
                        >
                          <span className="text-[10px] font-bold text-primary-foreground leading-none">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.15 }}
                  className="relative z-30"
                >
                  <UnifiedSearch />
                </motion.div>
              </div>
            </div>

            <div className="px-5 -mt-6 space-y-4 relative z-10">
              {/* Loading Skeleton */}
              {isLoading ? (
                <div className="space-y-6 pt-2">
                  {/* Stats skeleton */}
                  <div className="glass rounded-3xl p-4 shadow-2xl shadow-primary/5">
                    <div className="grid grid-cols-3 gap-3">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-muted/30">
                          <Skeleton className="w-10 h-10 rounded-xl" />
                          <Skeleton className="w-10 h-7 rounded" />
                          <Skeleton className="w-16 h-3 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Quick actions skeleton */}
                  <div className="glass rounded-3xl p-5 shadow-2xl shadow-primary/5">
                    <div className="grid grid-cols-4 gap-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex flex-col items-center gap-2.5">
                          <Skeleton className="w-[3.75rem] h-[3.75rem] rounded-2xl" />
                          <Skeleton className="w-12 h-3 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Featured skeleton */}
                  <div>
                    <Skeleton className="w-24 h-5 rounded mb-4" />
                    <div className="flex gap-4 overflow-hidden">
                      {[1, 2].map(i => (
                        <Skeleton key={i} className="flex-shrink-0 w-72 h-44 rounded-3xl" />
                      ))}
                    </div>
                  </div>
                  {/* Services skeleton */}
                  <div>
                    <Skeleton className="w-32 h-5 rounded mb-4" />
                    <div className="grid grid-cols-2 gap-3.5">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="bg-card rounded-2xl p-5 border border-border">
                          <Skeleton className="w-12 h-12 rounded-2xl mb-3" />
                          <Skeleton className="w-20 h-4 rounded mb-2" />
                          <Skeleton className="w-28 h-3 rounded" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
              <>
              {/* Health Stats Summary */}
              {user && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] as const }}
                  className="glass rounded-2xl p-2 shadow-2xl shadow-primary/5"
                >
                  <div className="grid grid-cols-3 gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate("/appointments")}
                      className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-primary/5 hover:bg-primary/10 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <span className="text-base font-extrabold text-foreground">{upcomingAppts}</span>
                      <span className="text-[8px] text-muted-foreground font-medium leading-tight text-center">Upcoming Appts</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate("/my-orders")}
                      className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-success/5 hover:bg-success/10 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-success/15 flex items-center justify-center">
                        <ShoppingBag className="w-3.5 h-3.5 text-success" />
                      </div>
                      <span className="text-base font-extrabold text-foreground">{recentOrders}</span>
                      <span className="text-[8px] text-muted-foreground font-medium leading-tight text-center">Orders (30d)</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate("/my-orders")}
                      className="flex flex-col items-center gap-0.5 p-1.5 rounded-xl bg-warning/5 hover:bg-warning/10 transition-colors"
                    >
                      <div className="w-7 h-7 rounded-lg bg-warning/15 flex items-center justify-center">
                        <ClipboardList className="w-3.5 h-3.5 text-warning" />
                      </div>
                      <span className="text-base font-extrabold text-foreground">{activeOrders}</span>
                      <span className="text-[8px] text-muted-foreground font-medium leading-tight text-center">Active Orders</span>
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Quick Actions — floating glass card */}
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="glass rounded-2xl p-3 shadow-2xl shadow-primary/5"
              >
                <div className="grid grid-cols-4 gap-2">
                  {quickActions.map((action) => {
                    const Icon = getIcon(action.icon_name);
                    return (
                    <motion.button
                      key={action.id}
                      variants={item}
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => navigate(action.path)}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className={`relative w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
                        <Icon className="w-5 h-5 text-primary-foreground" />
                        <div className="absolute inset-0 rounded-xl bg-primary-foreground/0 group-hover:bg-primary-foreground/10 transition-colors duration-300" />
                      </div>
                      <span className="text-[10px] text-center leading-tight text-foreground font-semibold whitespace-pre-line">{action.label}</span>
                    </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Featured Slider */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-foreground">Featured</h2>
                  <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Swipe →
                  </span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide snap-x snap-mandatory">
                  {(slides.length > 0 ? slides.map((slide, idx) => ({
                    id: slide.id,
                    title: slide.title || "",
                    desc: slide.description || "",
                    link: slide.target_link,
                    url: slide.url,
                    type: slide.type,
                    accent: idx % 3,
                  })) : [
                    { id: "1", title: "Stay Hydrated 💧", desc: "Drink at least 8 glasses of water daily", link: null, url: null, type: "image", accent: 0 },
                    { id: "2", title: "Sleep Well 😴", desc: "Get 7-9 hours of quality sleep", link: null, url: null, type: "image", accent: 1 },
                    { id: "3", title: "Stay Active 🏃", desc: "30 min of exercise boosts immunity", link: null, url: null, type: "image", accent: 2 },
                  ]).map((tip, idx) => {
                    const gradients = [
                      "from-primary via-primary/90 to-[hsl(190,70%,35%)]",
                      "from-[hsl(260,60%,55%)] via-[hsl(280,55%,50%)] to-[hsl(300,50%,45%)]",
                      "from-[hsl(340,65%,50%)] via-[hsl(355,60%,55%)] to-[hsl(15,70%,50%)]",
                    ];
                    const hasImage = tip.url && tip.type !== "video";
                    return (
                    <motion.button
                      key={tip.id}
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
                      onClick={() => tip.link && navigate(tip.link)}
                      className={`flex-shrink-0 w-[80vw] max-w-[320px] rounded-2xl ${hasImage ? "" : `bg-gradient-to-br ${gradients[tip.accent % 3]}`} relative overflow-hidden shadow-lg text-left snap-start group cursor-pointer`}
                    >
                      {hasImage && (
                        <img
                          src={tip.url!}
                          alt={tip.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {hasImage && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />}
                      {!hasImage && (
                        <div className="absolute inset-0">
                          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/[0.07] -translate-y-1/2 translate-x-1/3" />
                          <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/[0.05] translate-y-1/3 -translate-x-1/4" />
                          <motion.div
                            animate={{ scale: [1, 1.15, 1], opacity: [0.04, 0.08, 0.04] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-1/2 right-6 w-20 h-20 rounded-full bg-white/5"
                          />
                        </div>
                      )}
                      <div className="relative z-10 p-5 flex flex-col h-44 justify-end">
                        <div>
                          <p className="font-extrabold text-lg text-white leading-snug drop-shadow-md">{tip.title}</p>
                          <p className="text-xs text-white/80 mt-1 line-clamp-2 leading-relaxed drop-shadow-sm">{tip.desc}</p>
                        </div>
                        {tip.link && (
                          <div className="flex items-center gap-1 text-white/60 text-[11px] font-semibold group-hover:text-white/90 transition-colors self-start mt-2">
                            Learn more <ChevronRight className="w-3 h-3" />
                          </div>
                        )}
                      </div>
                    </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Top Doctors */}
              {topDoctors.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.6 }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-foreground">Top Doctors</h2>
                    <button onClick={() => navigate("/doctors")} className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
                      See All <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-3.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide snap-x">
                    {topDoctors.map((doc, idx) => (
                      <motion.button
                        key={doc.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                        whileHover={{ y: -6, transition: { duration: 0.2 } }}
                        onClick={() => navigate(`/doctor/${doc.id}`)}
                        className="flex-shrink-0 w-44 bg-card rounded-2xl border border-border p-4 shadow-sm text-left snap-start hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 group"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-primary/15 flex items-center justify-center text-2xl mb-3 group-hover:scale-105 transition-transform duration-300">
                          👨‍⚕️
                        </div>
                        <h4 className="font-bold text-sm truncate text-foreground">{doc.name}</h4>
                        <p className="text-xs text-primary font-medium mt-0.5 truncate">{doc.specialization}</p>
                        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
                          <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                          <span className="text-xs font-bold text-foreground">{doc.rating}</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">Book →</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Popular Medicines */}
              {popularMedicines.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-foreground">Medicines</h2>
                    <button onClick={() => navigate("/pharmacies")} className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
                      Browse All <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-3.5 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide snap-x">
                    {popularMedicines.map((med, idx) => {
                      const discounted = med.discount_percent && med.discount_percent > 0;
                      const finalPrice = discounted ? med.price * (1 - (med.discount_percent || 0) / 100) : med.price;
                      return (
                        <motion.button
                          key={med.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.55 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                          whileHover={{ y: -6, transition: { duration: 0.2 } }}
                          onClick={() => navigate(`/pharmacies`)}
                          className="flex-shrink-0 w-40 bg-card rounded-2xl border border-border p-4 shadow-sm text-left snap-start hover:border-success/30 hover:shadow-lg hover:shadow-success/5 transition-all duration-300 group"
                        >
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-success/10 to-success/20 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-300">
                            <Pill className="w-6 h-6 text-success" />
                          </div>
                          <h4 className="font-bold text-sm truncate text-foreground">{med.name}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{med.pharmacy_name || med.category}</p>
                          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-border/50">
                            <IndianRupee className="w-3 h-3 text-foreground" />
                            <span className="text-xs font-bold text-foreground">₹{Math.round(finalPrice)}</span>
                            {discounted && (
                              <>
                                <span className="text-[10px] text-muted-foreground line-through">₹{med.price}</span>
                                <span className="text-[10px] text-success font-semibold ml-auto flex items-center gap-0.5"><Tag className="w-2.5 h-2.5" />{med.discount_percent}%</span>
                              </>
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Browse Services */}
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                transition={{ delayChildren: 0.55 }}
              >
                <h2 className="text-lg font-bold mb-4 text-foreground">Browse Services</h2>
                <div className="grid grid-cols-2 gap-3.5">
                  {services.map((svc) => {
                    const SvcIcon = getIcon(svc.icon_name);
                    return (
                    <motion.button
                      key={svc.id}
                      variants={item}
                      whileHover={{ scale: 1.04, y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(svc.path)}
                      className="bg-card rounded-2xl p-5 border border-border text-left shadow-sm hover:shadow-lg transition-all duration-300 group"
                    >
                      <div className={`w-12 h-12 rounded-2xl ${svc.bg_color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                        <SvcIcon className={`w-5.5 h-5.5 ${svc.color}`} />
                      </div>
                      <h3 className="font-bold text-foreground text-[15px]">{svc.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{svc.description}</p>
                      <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground group-hover:text-primary transition-colors duration-300">
                        <TrendingUp className="w-3 h-3" /> Explore
                      </div>
                    </motion.button>
                    );
                  })}
                </div>
              </motion.div>

              {/* Health Tips */}
              <HealthTipsCards />

              {/* Nearby Hospitals Map */}
              <NearbyHospitalsMap />

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
                        className="block rounded-2xl overflow-hidden shadow-md border border-border hover:shadow-lg transition-shadow duration-300"
                      >
                        <img
                          src={ad.content_url}
                          alt={ad.title || "Ad"}
                          className="w-full h-32 object-cover"
                          loading="lazy"
                        />
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
            </>
              )}
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </SidebarProvider>
  );
};

export default Dashboard;
