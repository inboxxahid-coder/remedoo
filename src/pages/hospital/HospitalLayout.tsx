import { useProviderAuth } from "@/hooks/useProviderAuth";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { Building2, LayoutDashboard, CalendarCheck, Stethoscope, User, Settings } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/hospital", icon: LayoutDashboard },
  { label: "Appointments", path: "/hospital/appointments", icon: CalendarCheck },
  { label: "Doctors", path: "/hospital/doctors", icon: Stethoscope },
  { label: "Profile", path: "/hospital/profile", icon: User },
  { label: "Settings", path: "/hospital/settings", icon: Settings },
];

export default function HospitalLayout() {
  const { loading, isAuthorized } = useProviderAuth("hospital_admin");

  if (loading || !isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <ProviderLayout
      title="Hospital Panel"
      subtitle="Manage your hospital"
      icon={Building2}
      navItems={navItems}
    />
  );
}
