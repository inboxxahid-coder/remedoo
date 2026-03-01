import { useProviderAuth } from "@/hooks/useProviderAuth";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { Store, LayoutDashboard, ShoppingBag, Pill, User, Settings } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/pharmacy-panel", icon: LayoutDashboard },
  { label: "Orders", path: "/pharmacy-panel/orders", icon: ShoppingBag },
  { label: "Medicines", path: "/pharmacy-panel/medicines", icon: Pill },
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
