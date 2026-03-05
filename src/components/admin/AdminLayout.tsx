import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  LayoutDashboard, Stethoscope, Building2, FlaskConical, Store, CalendarCheck,
  ShoppingBag, Users, Image, Megaphone, LogOut, Shield, Pill, Menu, X,
  CheckSquare, AlertTriangle, FilePenLine, KeyRound, LayoutGrid, Heart, Zap, Star, CreditCard, Grid3X3,
  ChevronDown, Layers, Settings, BarChart3, Headphones
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

interface NavGroup {
  label: string;
  icon: React.ElementType;
  items: NavItem[];
}

const navGroups: (NavItem | NavGroup)[] = [
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },
  {
    label: "Providers",
    icon: Stethoscope,
    items: [
      { label: "Approvals", path: "/admin/approvals", icon: CheckSquare },
      { label: "Doctors", path: "/admin/doctors", icon: Stethoscope },
      { label: "Hospitals", path: "/admin/hospitals", icon: Building2 },
      { label: "Labs", path: "/admin/labs", icon: FlaskConical },
      { label: "Pharmacies", path: "/admin/pharmacies", icon: Store },
      { label: "Featured Doctors", path: "/admin/featured-doctors", icon: Star },
    ],
  },
  {
    label: "Operations",
    icon: Layers,
    items: [
      { label: "Appointments", path: "/admin/appointments", icon: CalendarCheck },
      { label: "Orders", path: "/admin/orders", icon: ShoppingBag },
      { label: "Emergencies", path: "/admin/emergencies", icon: AlertTriangle },
      { label: "Users", path: "/admin/users", icon: Users },
      { label: "Edit Requests", path: "/admin/edit-requests", icon: FilePenLine },
      { label: "Support Tickets", path: "/admin/support-tickets", icon: Headphones },
      { label: "Suspicious Activity", path: "/admin/suspicious-activity", icon: AlertTriangle },
    ],
  },
  {
    label: "Dashboard Content",
    icon: LayoutGrid,
    items: [
      { label: "Quick Actions", path: "/admin/quick-actions", icon: Zap },
      { label: "Services", path: "/admin/services", icon: LayoutGrid },
      { label: "Health Tips", path: "/admin/health-tips", icon: Heart },
      { label: "Info Cards", path: "/admin/info-cards", icon: CreditCard },
      { label: "Quick Access Grid", path: "/admin/quick-access", icon: Grid3X3 },
      { label: "Slider", path: "/admin/slider", icon: Image },
      { label: "Ads", path: "/admin/ads", icon: Megaphone },
      { label: "Medicines", path: "/admin/medicines", icon: Pill },
      { label: "Featured Medicines", path: "/admin/featured-medicines", icon: Star },
    ],
  },
  {
    label: "Finance & Settings",
    icon: Settings,
    items: [
      { label: "Platform Revenue", path: "/admin/revenue", icon: BarChart3 },
      { label: "Payouts", path: "/admin/payouts", icon: CreditCard },
      { label: "Commission Config", path: "/admin/commission", icon: KeyRound },
      { label: "OTP Settings", path: "/admin/otp-settings", icon: KeyRound },
      { label: "Admin Team", path: "/admin/team", icon: Shield },
      { label: "Platform Settings", path: "/admin/settings", icon: Settings },
    ],
  },
];

function isNavGroup(item: NavItem | NavGroup): item is NavGroup {
  return "items" in item;
}

export default function AdminLayout() {
  const { loading, isAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-expand groups that contain the active route
  const getInitialOpen = () => {
    const open: Record<string, boolean> = {};
    navGroups.forEach((item) => {
      if (isNavGroup(item)) {
        open[item.label] = item.items.some((i) => location.pathname === i.path);
      }
    });
    return open;
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpen);

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

  const handleNav = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path;
    return (
      <button
        key={item.path}
        onClick={() => handleNav(item.path)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
          isActive
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        {item.label}
      </button>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const isOpen = openGroups[group.label] ?? false;
    const hasActive = group.items.some((i) => location.pathname === i.path);

    return (
      <div key={group.label}>
        <button
          onClick={() => toggleGroup(group.label)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all",
            hasActive
              ? "text-primary"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          <group.icon className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">{group.label}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
        {isOpen && (
          <div className="ml-3 pl-3 border-l border-border/50 mt-1 space-y-0.5">
            {group.items.map(renderNavItem)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col shrink-0 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground px-5 pt-2">Remedoo Management</p>

        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {navGroups.map((item) =>
            isNavGroup(item) ? renderNavGroup(item) : renderNavItem(item)
          )}
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
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3 lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">Admin</span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
