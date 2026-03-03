import { useProviderAuth } from "@/hooks/useProviderAuth";
import ProviderLayout from "@/components/provider/ProviderLayout";
import {
  Stethoscope, LayoutDashboard, CalendarCheck, User, Calendar,
  IndianRupee, AlertTriangle, Bell, Shield, Settings, Star
} from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/doctor", icon: LayoutDashboard },
  { label: "Appointments", path: "/doctor/appointments", icon: CalendarCheck },
  { label: "Schedule", path: "/doctor/schedule", icon: Calendar },
  { label: "Earnings", path: "/doctor/earnings", icon: IndianRupee },
  { label: "Reviews", path: "/doctor/reviews", icon: Star },
  { label: "Emergencies", path: "/doctor/emergencies", icon: AlertTriangle },
  { label: "Notifications", path: "/doctor/notifications", icon: Bell },
  { label: "Profile", path: "/doctor/profile", icon: User },
  { label: "Activity Log", path: "/doctor/audit-logs", icon: Shield },
  { label: "Settings", path: "/doctor/settings", icon: Settings },
];

export default function DoctorLayout() {
  const { loading, isAuthorized } = useProviderAuth("doctor");

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ProviderLayout
      title="Doctor Panel"
      subtitle="Manage your practice"
      icon={Stethoscope}
      navItems={navItems}
    />
  );
}
