import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  LayoutDashboard, Stethoscope, Building2, FlaskConical, Store, CalendarCheck,
  ShoppingBag, Users, Image, Megaphone, LogOut, Shield, Pill
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  { label: "Doctors", path: "/admin/doctors", icon: Stethoscope },
  { label: "Hospitals", path: "/admin/hospitals", icon: Building2 },
  { label: "Labs", path: "/admin/labs", icon: FlaskConical },
  { label: "Pharmacies", path: "/admin/pharmacies", icon: Store },
  { label: "Medicines", path: "/admin/medicines", icon: Pill },
  { label: "Appointments", path: "/admin/appointments", icon: CalendarCheck },
  { label: "Orders", path: "/admin/orders", icon: ShoppingBag },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Slider", path: "/admin/slider", icon: Image },
  { label: "Ads", path: "/admin/ads", icon: Megaphone },
];

export default function AdminLayout() {
  const { loading, isAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login");
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0 sticky top-0 h-screen">
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Remedoo Management</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
