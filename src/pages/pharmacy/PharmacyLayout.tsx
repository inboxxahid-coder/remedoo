import { useProviderAuth } from "@/hooks/useProviderAuth";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { Store, LayoutDashboard, ShoppingBag, Pill, User, Settings, IndianRupee, Bell, MessageSquare, Star, ScrollText, BarChart3 } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/pharmacy-panel", icon: LayoutDashboard },
  { label: "Orders", path: "/pharmacy-panel/orders", icon: ShoppingBag },
  { label: "Medicines", path: "/pharmacy-panel/medicines", icon: Pill },
  { label: "Earnings", path: "/pharmacy-panel/earnings", icon: IndianRupee },
  { label: "Notifications", path: "/pharmacy-panel/notifications", icon: Bell },
  { label: "Support Tickets", path: "/pharmacy-panel/support-tickets", icon: MessageSquare },
  { label: "Reviews", path: "/pharmacy-panel/reviews", icon: Star },
  { label: "Audit Logs", path: "/pharmacy-panel/audit-logs", icon: ScrollText },
  { label: "Analytics", path: "/pharmacy-panel/analytics", icon: BarChart3 },
  { label: "Profile", path: "/pharmacy-panel/profile", icon: User },
  { label: "Settings", path: "/pharmacy-panel/settings", icon: Settings },
];

export default function PharmacyLayout() {
  const { loading, isAuthorized } = useProviderAuth("pharmacy_admin");

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ProviderLayout
      title="Pharmacy Panel"
      subtitle="Manage your pharmacy"
      icon={Store}
      navItems={navItems}
    />
  );
}
