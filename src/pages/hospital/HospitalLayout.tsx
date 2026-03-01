import { useProviderAuth } from "@/hooks/useProviderAuth";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { Building2, LayoutDashboard, CalendarCheck, Stethoscope, BedDouble, Siren, Building, Wrench, Scissors, IndianRupee, BarChart3, ScrollText, User, Settings } from "lucide-react";

const navItems = [
  { label: "Dashboard", path: "/hospital", icon: LayoutDashboard },
  { label: "Appointments", path: "/hospital/appointments", icon: CalendarCheck },
  { label: "Beds & ICU", path: "/hospital/beds", icon: BedDouble },
  { label: "Emergencies", path: "/hospital/emergencies", icon: Siren },
  { label: "Doctors", path: "/hospital/doctors", icon: Stethoscope },
  { label: "Departments", path: "/hospital/departments", icon: Building },
  { label: "Operation Theaters", path: "/hospital/ots", icon: Scissors },
  { label: "Equipment", path: "/hospital/equipment", icon: Wrench },
  { label: "Earnings", path: "/hospital/earnings", icon: IndianRupee },
  { label: "Analytics", path: "/hospital/analytics", icon: BarChart3 },
  { label: "Audit Logs", path: "/hospital/audit-logs", icon: ScrollText },
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
