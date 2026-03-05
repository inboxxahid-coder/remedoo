import { Calendar, AlertTriangle, Pill, Heart, Home, User, Settings, MapPin, ShoppingBag, ChevronLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

const quickActions = [
  { title: "Book Appointment", url: "/doctors", gradient: "from-primary to-primary/80", emoji: "📅" },
  { title: "Emergency SOS", url: "/emergency", gradient: "from-emergency to-emergency/80", emoji: "🚨" },
  { title: "Order Medicines", url: "/pharmacies", gradient: "from-success to-success/80", emoji: "💊" },
  { title: "Favorites", url: "/favorites", gradient: "from-warning to-warning/80", emoji: "❤️" },
  { title: "My Orders", url: "/my-orders", gradient: "from-primary to-success/80", emoji: "🛍️" },
];

const navigation = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Appointments", url: "/appointments", icon: Calendar },
  { title: "Emergency", url: "/emergency", icon: MapPin },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { toggleSidebar, setOpenMobile } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const handleNavigate = (url: string) => {
    setOpenMobile(false);
    navigate(url);
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarContent className="py-5 gap-6">
        {/* Close Button */}
        <div className="px-3">
          <button
            onClick={toggleSidebar}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-primary/70 text-primary-foreground py-3 px-4 shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 transition-all duration-300"
          >
            <ChevronLeft className="h-5 w-5" />
            <span className="font-bold text-sm tracking-wide">Close</span>
          </button>
        </div>

        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-sidebar-foreground/40 mb-3 px-4">
            ⚡ Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="grid grid-cols-2 gap-3 px-3">
              {quickActions.map((item) => (
                <button
                  key={item.title}
                  onClick={() => handleNavigate(item.url)}
                  className={`group relative overflow-hidden flex flex-col items-center gap-2 py-3 px-2 rounded-2xl bg-gradient-to-br ${item.gradient} text-primary-foreground shadow-lg hover:shadow-2xl hover:scale-[1.06] active:scale-95 transition-all duration-300 cursor-pointer`}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="text-lg">{item.emoji}</div>
                  <span className="text-[10px] font-bold text-center leading-tight drop-shadow-sm relative z-10">
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-sidebar-foreground/40 mb-3 px-4">
            🧭 Navigate
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5 px-2">
              {navigation.map((item) => {
                const isActive = currentPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <button
                      onClick={() => handleNavigate(item.url)}
                      className={`relative flex items-center gap-3 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-r from-sidebar-accent to-sidebar-accent/60 text-sidebar-primary shadow-lg border border-sidebar-primary/20"
                          : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground hover:shadow-md"
                      }`}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-sidebar-primary" />
                      )}
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span>{item.title}</span>
                    </button>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
