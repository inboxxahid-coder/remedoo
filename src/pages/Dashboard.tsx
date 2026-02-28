import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Calendar, AlertTriangle, Pill, Heart, Bell, User, Home, MapPin, Settings, Star, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupaUser } from "@supabase/supabase-js";
import type { Tables } from "@/integrations/supabase/types";

const quickActions = [
  { icon: Calendar, label: "Book\nAppointment", color: "bg-primary", path: "/doctors" },
  { icon: AlertTriangle, label: "Emergency\nSOS", color: "bg-emergency", path: "/emergency" },
  { icon: Pill, label: "Order\nMedicines", color: "bg-success", path: "/pharmacies" },
  { icon: ShoppingBag, label: "My\nOrders", color: "bg-accent", path: "/my-orders" },
  { icon: Heart, label: "View\nFavorites", color: "bg-warning", path: "/favorites" },
];

const bottomTabs = [
  { icon: Home, label: "Home", path: "/dashboard" },
  { icon: Calendar, label: "Appointments", path: "/appointments" },
  { icon: MapPin, label: "Emergency", path: "/emergency" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

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

    // Load slider & top doctors
    supabase.from("slider_media").select("*").eq("active", true).order("sort_order").then(({ data }) => {
      if (data) setSlides(data);
    });
    supabase.from("doctors").select("*").order("rating", { ascending: false }).limit(5).then(({ data }) => {
      if (data) setTopDoctors(data);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Patient";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-primary px-5 pt-10 pb-8 rounded-b-[1.5rem]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-primary-foreground/70 text-sm">Good day 👋</p>
            <h1 className="text-xl font-bold text-primary-foreground">{displayName}</h1>
          </div>
          <button onClick={() => navigate("/profile")} className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center border border-primary-foreground/30">
            <Bell className="w-5 h-5 text-primary-foreground" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search doctors, hospitals, labs..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card border-0 shadow-lg h-12 rounded-xl" />
        </div>
      </div>

      <div className="px-5 mt-6 space-y-6">
        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-5 gap-2">
            {quickActions.map((action) => (
              <button key={action.label} onClick={() => navigate(action.path)} className="flex flex-col items-center gap-2">
                <div className={`w-14 h-14 rounded-2xl ${action.color} flex items-center justify-center shadow-md`}>
                  <action.icon className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-xs text-center leading-tight text-foreground font-medium whitespace-pre-line">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Media Slider */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Featured</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {slides.length > 0 ? slides.map((slide) => (
              <button
                key={slide.id}
                onClick={() => slide.target_link && navigate(slide.target_link)}
                className="flex-shrink-0 w-72 h-36 rounded-2xl gradient-primary flex items-center justify-center shadow-md text-left px-6"
              >
                <div className="text-primary-foreground">
                  <p className="font-bold text-lg">{slide.title}</p>
                  <p className="text-sm opacity-70 mt-1">{slide.description}</p>
                </div>
              </button>
            )) : [1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-72 h-36 rounded-2xl gradient-primary flex items-center justify-center shadow-md">
                <div className="text-center text-primary-foreground">
                  <p className="font-bold text-lg">Health Tip #{i}</p>
                  <p className="text-sm opacity-70">Stay healthy, stay strong</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Doctors */}
        {topDoctors.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">Top Doctors</h2>
              <button onClick={() => navigate("/doctors")} className="text-sm text-primary font-medium">See All</button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
              {topDoctors.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => navigate(`/book/doctor/${doc.id}`)}
                  className="flex-shrink-0 w-40 bg-card rounded-2xl border border-border p-3 shadow-sm text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-2xl mb-2">👨‍⚕️</div>
                  <h4 className="font-semibold text-sm truncate">{doc.name}</h4>
                  <p className="text-xs text-primary">{doc.specialization}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 fill-warning text-warning" />
                    <span className="text-xs font-medium">{doc.rating}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Browse Services */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Browse Services</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { title: "Doctors", desc: "Find specialists", icon: "👨‍⚕️", path: "/doctors" },
              { title: "Hospitals", desc: "Nearby facilities", icon: "🏥", path: "/hospitals" },
              { title: "Labs", desc: "Book tests", icon: "🔬", path: "/labs" },
              { title: "Pharmacies", desc: "Order medicines", icon: "💊", path: "/pharmacies" },
            ].map((item) => (
              <button key={item.title} onClick={() => navigate(item.path)} className="bg-card rounded-2xl p-4 border border-border text-left shadow-sm hover:shadow-md transition-shadow">
                <span className="text-3xl">{item.icon}</span>
                <h3 className="font-semibold mt-2">{item.title}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-bottom">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {bottomTabs.map((tab) => (
            <button key={tab.label} onClick={() => navigate(tab.path)} className={`flex flex-col items-center gap-0.5 text-xs ${tab.path === "/dashboard" ? "text-primary" : "text-muted-foreground"}`}>
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
