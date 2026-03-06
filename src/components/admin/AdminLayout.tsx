import { useState, useEffect, Suspense } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import {
  LayoutDashboard, Stethoscope, Building2, FlaskConical, Store, CalendarCheck,
  ShoppingBag, Users, Image, Megaphone, LogOut, Shield, Pill, Menu, X,
  CheckSquare, AlertTriangle, FilePenLine, KeyRound, LayoutGrid, Heart, Zap, Star, CreditCard, Grid3X3,
  ChevronDown, Layers, Settings, BarChart3, Headphones, Bell, Search,
  MessageSquare, Ticket, MapPin, Send, HelpCircle, Crown, Ambulance,
  FileText, RotateCcw, Receipt, Activity, Truck, Package, Brain, Palette, Key
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
  // 1. Dashboard
  { label: "Dashboard", path: "/admin", icon: LayoutDashboard },

  // 2. Providers Management
  {
    label: "Providers",
    icon: Stethoscope,
    items: [
      { label: "Doctors", path: "/admin/doctors", icon: Stethoscope },
      { label: "Hospitals", path: "/admin/hospitals", icon: Building2 },
      { label: "Labs", path: "/admin/labs", icon: FlaskConical },
      { label: "Pharmacies", path: "/admin/pharmacies", icon: Store },
      { label: "Featured Doctors", path: "/admin/featured-doctors", icon: Star },
      { label: "Featured Providers", path: "/admin/featured-providers", icon: Star },
    ],
  },

  // 3. Approvals System
  {
    label: "Approvals",
    icon: CheckSquare,
    items: [
      { label: "Provider Approvals", path: "/admin/approvals", icon: CheckSquare },
      { label: "Edit Requests", path: "/admin/edit-requests", icon: FilePenLine },
    ],
  },

  // 4. Operations
  {
    label: "Operations",
    icon: Layers,
    items: [
      { label: "Appointments", path: "/admin/appointments", icon: CalendarCheck },
      { label: "Medicine Orders", path: "/admin/orders", icon: ShoppingBag },
      { label: "Emergency Requests", path: "/admin/emergencies", icon: AlertTriangle },
      { label: "Users", path: "/admin/users", icon: Users },
      { label: "Support Tickets", path: "/admin/support-tickets", icon: Headphones },
      { label: "Suspicious Activity", path: "/admin/suspicious-activity", icon: AlertTriangle },
    ],
  },

  // 5. Ambulance Management
  {
    label: "Ambulance",
    icon: Ambulance,
    items: [
      { label: "Fleet & Drivers", path: "/admin/ambulance", icon: Truck },
    ],
  },

  // 6. Pharmacy Management
  {
    label: "Pharmacy Mgmt",
    icon: Pill,
    items: [
      { label: "Pharmacy Control", path: "/admin/pharmacy-control", icon: Store },
      { label: "Medicines Database", path: "/admin/medicines", icon: Pill },
      { label: "Featured Medicines", path: "/admin/featured-medicines", icon: Star },
      { label: "Remedoo Inventory", path: "/admin/remedoo-inventory", icon: Package },
      { label: "Remedoo Orders", path: "/admin/remedoo-orders", icon: ShoppingBag },
      { label: "Delivery Drivers", path: "/admin/delivery-drivers", icon: Truck },
      { label: "Pharmacy Analytics", path: "/admin/pharmacy-analytics", icon: Activity },
    ],
  },

  // 7. Medical Records
  {
    label: "Medical Records",
    icon: FileText,
    items: [
      { label: "Records Overview", path: "/admin/medical-records", icon: FileText },
    ],
  },

  // 8. Reviews & Ratings
  {
    label: "Reviews",
    icon: MessageSquare,
    items: [
      { label: "Review Moderation", path: "/admin/reviews", icon: MessageSquare },
    ],
  },

  // 9. Promotions & Marketing
  {
    label: "Promotions",
    icon: Ticket,
    items: [
      { label: "Coupons & Promos", path: "/admin/coupons", icon: Ticket },
      { label: "Promo Banners", path: "/admin/promo-banners", icon: Megaphone },
      { label: "Subscriptions", path: "/admin/subscriptions", icon: Crown },
      { label: "Healthcare Packages", path: "/admin/healthcare-packages", icon: Package },
      { label: "Corporate Plans", path: "/admin/corporate-plans", icon: Users },
    ],
  },

  // 10. Dashboard Content
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
      { label: "Category Actions", path: "/admin/category-actions", icon: Grid3X3 },
    ],
  },

  // 11. Notification Center
  {
    label: "Notifications",
    icon: Bell,
    items: [
      { label: "Broadcast Messages", path: "/admin/broadcast", icon: Send },
    ],
  },

  // 12. Finance Management
  {
    label: "Finance",
    icon: CreditCard,
    items: [
      { label: "Platform Revenue", path: "/admin/revenue", icon: BarChart3 },
      { label: "Payouts", path: "/admin/payouts", icon: CreditCard },
      { label: "Payment Accounts", path: "/admin/payment-accounts", icon: CreditCard },
      { label: "Commission Config", path: "/admin/commission", icon: KeyRound },
      { label: "Refund Tracking", path: "/admin/refunds", icon: RotateCcw },
      { label: "Transactions", path: "/admin/transactions", icon: Receipt },
    ],
  },

  // 13. Analytics & Reports
  {
    label: "Analytics",
    icon: BarChart3,
    items: [
      { label: "Analytics & Reports", path: "/admin/analytics", icon: BarChart3 },
    ],
  },

  // 14. Location Management
  {
    label: "Locations",
    icon: MapPin,
    items: [
      { label: "Service Areas", path: "/admin/service-areas", icon: MapPin },
    ],
  },

  // 15. Security & Logs
  {
    label: "Security & Logs",
    icon: Shield,
    items: [
      { label: "Audit & Login Logs", path: "/admin/logs", icon: Activity },
    ],
  },

  // 16. Content & Legal
  {
    label: "Content & Legal",
    icon: HelpCircle,
    items: [
      { label: "FAQ & Legal Pages", path: "/admin/faq", icon: HelpCircle },
    ],
  },

  // 17. Symptom Assistant
  {
    label: "Symptom Assistant",
    icon: Brain,
    items: [
      { label: "Symptom Management", path: "/admin/symptom-assistant", icon: Brain },
    ],
  },

  // 18. System Settings
  {
    label: "System Settings",
    icon: Settings,
    items: [
      { label: "Branding & Theme", path: "/admin/branding", icon: Palette },
      { label: "API Keys & Secrets", path: "/admin/api-keys", icon: Key },
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
  const { allowedPaths, isSuperAdmin, loading: permsLoading } = useAdminPermissions();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminLogo, setAdminLogo] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("platform_branding").select("value").eq("key", "admin_logo").maybeSingle()
      .then(({ data }) => { if (data?.value) setAdminLogo(data.value); });
  }, []);

  const filteredNavGroups = isSuperAdmin
    ? navGroups
    : navGroups
        .map((item) => {
          if (isNavGroup(item)) {
            const filteredItems = item.items.filter((i) => allowedPaths?.includes(i.path));
            if (filteredItems.length === 0) return null;
            return { ...item, items: filteredItems };
          }
          return allowedPaths?.includes(item.path) ? item : null;
        })
        .filter(Boolean) as (NavItem | NavGroup)[];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const searchResults = searchQuery.trim().length > 0
    ? navGroups.flatMap((item) =>
        isNavGroup(item)
          ? item.items.filter((i) => i.label.toLowerCase().includes(searchQuery.toLowerCase()))
          : item.label.toLowerCase().includes(searchQuery.toLowerCase()) ? [item] : []
      ).slice(0, 8)
    : [];

  if (loading || !isAdmin || permsLoading) {
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

  // Get current page title
  const getCurrentTitle = () => {
    for (const item of navGroups) {
      if (!isNavGroup(item) && item.path === location.pathname) return item.label;
      if (isNavGroup(item)) {
        const found = item.items.find(i => i.path === location.pathname);
        if (found) return found.label;
      }
    }
    return "Admin";
  };

  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path;
    return (
      <motion.button
        key={item.path}
        whileTap={{ scale: 0.97 }}
        onClick={() => handleNav(item.path)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
          isActive
            ? "bg-primary text-primary-foreground shadow-md"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{item.label}</span>
        {isActive && (
          <motion.div
            layoutId="admin-active-indicator"
            className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground"
          />
        )}
      </motion.button>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const isOpen = openGroups[group.label] ?? false;
    const hasActive = group.items.some((i) => location.pathname === i.path);
    const activeCount = group.items.length;

    return (
      <div key={group.label} className="space-y-0.5">
        <button
          onClick={() => toggleGroup(group.label)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
            hasActive
              ? "text-primary bg-primary/5"
              : "text-foreground hover:bg-muted"
          )}
        >
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            hasActive ? "bg-primary/10" : "bg-muted"
          )}>
            <group.icon className={cn("w-3.5 h-3.5", hasActive ? "text-primary" : "text-muted-foreground")} />
          </div>
          <span className="flex-1 text-left truncate">{group.label}</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full mr-1">{activeCount}</span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-4 pl-3 border-l-2 border-border/60 space-y-0.5 py-1">
                {group.items.map(renderNavItem)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-card flex flex-col shrink-0 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 shadow-xl lg:shadow-sm border-r border-border",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {adminLogo ? (
                <img src={adminLogo} alt="Admin Logo" className="w-10 h-10 rounded-xl object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <div>
                <h1 className="text-base font-bold text-foreground">Remedoo</h1>
                <p className="text-[11px] text-muted-foreground font-medium">Admin Console</p>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1 scrollbar-hide">
          {filteredNavGroups.map((item) =>
            isNavGroup(item) ? renderNavGroup(item) : renderNavItem(item)
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-border">
          {isSuperAdmin && (
            <div className="mb-2 px-3 py-1.5 bg-primary/5 rounded-lg">
              <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Super Admin</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top header — always visible, never scrolls */}
        <header className="shrink-0 z-30 bg-card border-b border-border">
          <div className="flex items-center gap-3 px-4 md:px-6 h-14">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold text-foreground truncate">{getCurrentTitle()}</h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center bg-muted rounded-xl px-3 h-9 gap-2 w-56 relative">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                  onFocus={() => setSearchOpen(true)}
                  onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
                  className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full"
                />
                {searchOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
                    {searchResults.map((item) => (
                      <button
                        key={item.path}
                        onMouseDown={() => { handleNav(item.path); setSearchQuery(""); setSearchOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted transition-colors text-left",
                          location.pathname === item.path && "text-primary font-semibold"
                        )}
                      >
                        <item.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => navigate("/admin/support-tickets")}
                className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors relative"
                title="Support Tickets"
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => navigate("/admin/settings")}
                className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer"
                title="Platform Settings"
              >
                <Shield className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" /></div>}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
