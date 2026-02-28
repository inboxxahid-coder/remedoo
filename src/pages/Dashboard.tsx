import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, AlertTriangle, Pill, Heart, Bell, Star, Menu, X, ChevronRight, Stethoscope, Building2, FlaskConical, Store } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupaUser } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

const quickActions = [
  { icon: Calendar, label: "Book\nAppointment", gradient: "from-primary to-[hsl(190,70%,45%)]", path: "/doctors" },
  { icon: AlertTriangle, label: "Emergency\nSOS", gradient: "from-emergency to-[hsl(15,80%,50%)]", path: "/emergency" },
  { icon: Pill, label: "Order\nMedicines", gradient: "from-success to-[hsl(160,55%,48%)]", path: "/pharmacies" },
  { icon: Heart, label: "Favorites", gradient: "from-warning to-[hsl(25,90%,55%)]", path: "/favorites" },
];

const services = [
  { title: "Doctors", desc: "Find specialists", icon: Stethoscope, path: "/doctors", gradient: "from-primary/10 to-primary/5" },
  { title: "Hospitals", desc: "Nearby facilities", icon: Building2, path: "/hospitals", gradient: "from-emergency/10 to-emergency/5" },
  { title: "Labs", desc: "Book tests", icon: FlaskConical, path: "/labs", gradient: "from-success/10 to-success/5" },
  { title: "Pharmacies", desc: "Order medicines", icon: Store, path: "/pharmacies", gradient: "from-warning/10 to-warning/5" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
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
  const [search, setSearch] = useState("");
  const [slides, setSlides] = useState<Tables<"slider_media">[]>([]);
  const [topDoctors, setTopDoctors] = useState<Tables<"doctors">[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    supabase.from("slider_media").select("*").eq("active", true).order("sort_order").then(({ data }) => {
      if (data) setSlides(data);
    });
    supabase.from("doctors").select("*").order("rating", { ascending: false }).limit(5).then(({ data }) => {
      if (data) setTopDoctors(data);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Patient";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const greetingEmoji = hour < 12 ? "☀️" : hour < 17 ? "🌤️" : "🌙";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="bg-background pb-24">
            {/* Header */}
            <div className="relative overflow-hidden">
              <div className="gradient-primary px-5 pt-10 pb-12 rounded-b-[2rem]">
                {/* Decorative circles */}
                <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-foreground/5" />
                <div className="absolute top-20 -right-5 w-24 h-24 rounded-full bg-primary-foreground/5" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-primary-foreground/5" />

                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
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
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate("/appointments")}
                    className="relative w-10 h-10 rounded-full bg-primary-foreground/15 flex items-center justify-center border border-primary-foreground/20 backdrop-blur-sm"
                  >
                    <Bell className="w-5 h-5 text-primary-foreground" />
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emergency rounded-full border-2 border-primary" />
                  </motion.button>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="relative z-10"
                >
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search doctors, hospitals, labs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-11 bg-card/95 backdrop-blur-md border-0 shadow-xl h-12 rounded-2xl text-sm focus-visible:ring-2 focus-visible:ring-primary-foreground/30"
                  />
                </motion.div>
              </div>
            </div>

            <div className="px-5 -mt-5 space-y-7 relative z-10">
              {/* Quick Actions — floating glass card */}
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="glass rounded-2xl p-4 shadow-xl"
              >
                <div className="grid grid-cols-4 gap-3">
                  {quickActions.map((action) => (
                    <motion.button
                      key={action.label}
                      variants={item}
                      whileHover={{ scale: 1.08, y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigate(action.path)}
                      className="flex flex-col items-center gap-2"
                    >
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-lg`}>
                        <action.icon className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <span className="text-[11px] text-center leading-tight text-foreground font-semibold whitespace-pre-line">{action.label}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Featured Slider */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-foreground">Featured</h2>
                  <span className="text-xs text-muted-foreground font-medium">Swipe →</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide snap-x snap-mandatory">
                  {slides.length > 0 ? slides.map((slide, idx) => (
                    <motion.button
                      key={slide.id}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + idx * 0.1 }}
                      onClick={() => slide.target_link && navigate(slide.target_link)}
                      className="flex-shrink-0 w-72 h-40 rounded-2xl gradient-primary relative overflow-hidden shadow-lg text-left snap-start group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10" />
                      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-primary-foreground/10" />
                      <div className="relative z-10 p-5 flex flex-col justify-end h-full">
                        <p className="font-bold text-lg text-primary-foreground leading-tight">{slide.title}</p>
                        <p className="text-sm text-primary-foreground/70 mt-1 line-clamp-2">{slide.description}</p>
                      </div>
                    </motion.button>
                  )) : [
                    { title: "Stay Hydrated 💧", desc: "Drink at least 8 glasses of water daily" },
                    { title: "Sleep Well 😴", desc: "Get 7-9 hours of quality sleep" },
                    { title: "Stay Active 🏃", desc: "30 min of exercise boosts immunity" },
                  ].map((tip, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex-shrink-0 w-72 h-40 rounded-2xl gradient-primary relative overflow-hidden shadow-lg snap-start"
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10" />
                      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-primary-foreground/10" />
                      <div className="relative z-10 p-5 flex flex-col justify-end h-full text-primary-foreground">
                        <p className="font-bold text-lg leading-tight">{tip.title}</p>
                        <p className="text-sm opacity-70 mt-1">{tip.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Top Doctors */}
              {topDoctors.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-foreground">Top Doctors</h2>
                    <button onClick={() => navigate("/doctors")} className="flex items-center gap-1 text-sm text-primary font-semibold hover:underline">
                      See All <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1 scrollbar-hide snap-x">
                    {topDoctors.map((doc, idx) => (
                      <motion.button
                        key={doc.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + idx * 0.08 }}
                        whileHover={{ y: -4, boxShadow: "0 12px 24px -8px hsl(168 72% 40% / 0.2)" }}
                        onClick={() => navigate(`/book/doctor/${doc.id}`)}
                        className="flex-shrink-0 w-40 bg-card rounded-2xl border border-border p-4 shadow-sm text-left snap-start hover:border-primary/30 transition-colors"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary/10 flex items-center justify-center text-2xl mb-3">👨‍⚕️</div>
                        <h4 className="font-bold text-sm truncate text-foreground">{doc.name}</h4>
                        <p className="text-xs text-primary font-medium mt-0.5">{doc.specialization}</p>
                        <div className="flex items-center gap-1 mt-2">
                          <Star className="w-3.5 h-3.5 fill-warning text-warning" />
                          <span className="text-xs font-bold text-foreground">{doc.rating}</span>
                        </div>
                      </motion.button>
                    ))}
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
                <h2 className="text-lg font-bold mb-3 text-foreground">Browse Services</h2>
                <div className="grid grid-cols-2 gap-3">
                  {services.map((svc) => (
                    <motion.button
                      key={svc.title}
                      variants={item}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(svc.path)}
                      className={`bg-gradient-to-br ${svc.gradient} rounded-2xl p-4 border border-border/50 text-left shadow-sm hover:shadow-lg transition-all group`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        <svc.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-bold text-foreground">{svc.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{svc.desc}</p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
