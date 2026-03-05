import { useProviderAuth } from "@/hooks/useProviderAuth";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { FlaskConical, LayoutDashboard, CalendarCheck, User, Settings, TestTube, Droplets, IndianRupee, Bell, MessageSquare, Star, ScrollText, BarChart3 } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/lab", icon: LayoutDashboard },
  { label: "Appointments", path: "/lab/appointments", icon: CalendarCheck },
  { label: "Tests", path: "/lab/tests", icon: TestTube },
  { label: "Sample Collections", path: "/lab/samples", icon: Droplets },
  { label: "Earnings", path: "/lab/earnings", icon: IndianRupee },
  { label: "Notifications", path: "/lab/notifications", icon: Bell },
  { label: "Support Tickets", path: "/lab/support-tickets", icon: MessageSquare },
  { label: "Reviews", path: "/lab/reviews", icon: Star },
  { label: "Audit Logs", path: "/lab/audit-logs", icon: ScrollText },
  { label: "Analytics", path: "/lab/analytics", icon: BarChart3 },
  { label: "Profile", path: "/lab/profile", icon: User },
  { label: "Settings", path: "/lab/settings", icon: Settings },
];

export default function LabLayout() {
  const { loading, isAuthorized } = useProviderAuth("lab_admin");

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ProviderLayout
      title="Lab Panel"
      subtitle="Manage your laboratory"
      icon={FlaskConical}
      navItems={navItems}
    />
  );
}
