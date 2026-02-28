import { Calendar, AlertTriangle, Pill, Heart, Home, User, Settings, MapPin, ShoppingBag, Wallet, BarChart3 } from "lucide-react";
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
  { title: "Book Appointment", url: "/doctors", icon: Calendar, color: "bg-primary text-primary-foreground" },
  { title: "Emergency SOS", url: "/emergency", icon: AlertTriangle, color: "bg-emergency text-emergency-foreground" },
  { title: "Order Medicines", url: "/pharmacies", icon: Pill, color: "bg-success text-success-foreground" },
  { title: "Favorites", url: "/favorites", icon: Heart, color: "bg-warning text-warning-foreground" },
  { title: "My Orders", url: "/my-orders", icon: ShoppingBag, color: "bg-accent text-accent-foreground" },
  { title: "Wallet", url: "/wallet", icon: Wallet, color: "bg-primary text-primary-foreground" },
  { title: "Analytics", url: "/analytics", icon: BarChart3, color: "bg-secondary text-secondary-foreground" },
];

const navigation = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Appointments", url: "/appointments", icon: Calendar },
  { title: "Emergency", url: "/emergency", icon: MapPin },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="py-4 gap-6">
        {/* Quick Actions */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold uppercase tracking-widest text-sidebar-foreground/50 mb-2 px-4">
            Quick Actions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <div className={collapsed ? "flex flex-col gap-2 px-1" : "grid grid-cols-2 gap-3 px-3"}>
              {quickActions.map((item) => (
                <button
                  key={item.title}
                  onClick={() => navigate(item.url)}
                  className={`group relative flex ${collapsed ? "w-10 h-10 items-center justify-center" : "flex-col items-center gap-2 py-4 px-2"} rounded-2xl ${item.color} shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200`}
                >
                  <item.icon className={collapsed ? "h-5 w-5" : "h-7 w-7"} />
                  {!collapsed && (
                    <span className="text-xs font-semibold text-center leading-tight">
                      {item.title}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-bold uppercase tracking-widest text-sidebar-foreground/50 mb-2 px-4">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1 px-2">
              {navigation.map((item) => {
                const isActive = currentPath === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <button
                      onClick={() => navigate(item.url)}
                      className={`flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-sidebar-accent text-sidebar-primary shadow-md"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                      } ${collapsed ? "justify-center px-2" : ""}`}
                    >
                      <item.icon className={`${collapsed ? "h-5 w-5" : "h-5 w-5"} flex-shrink-0`} />
                      {!collapsed && <span>{item.title}</span>}
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
