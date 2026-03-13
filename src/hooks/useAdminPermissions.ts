import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// All assignable admin panel pages
export const ALL_ADMIN_PAGES = [
  { path: "/admin", label: "Dashboard", group: "Dashboard" },
  { path: "/admin/approvals", label: "Approvals", group: "Providers" },
  { path: "/admin/doctors", label: "Doctors", group: "Providers" },
  { path: "/admin/hospitals", label: "Hospitals", group: "Providers" },
  { path: "/admin/labs", label: "Labs", group: "Providers" },
  { path: "/admin/pharmacies", label: "Pharmacies", group: "Providers" },
  { path: "/admin/featured-doctors", label: "Featured Doctors", group: "Providers" },
  { path: "/admin/appointments", label: "Appointments", group: "Operations" },
  { path: "/admin/orders", label: "Orders", group: "Operations" },
  { path: "/admin/emergencies", label: "Emergencies", group: "Operations" },
  { path: "/admin/users", label: "Users", group: "Operations" },
  { path: "/admin/edit-requests", label: "Edit Requests", group: "Operations" },
  { path: "/admin/support-tickets", label: "Support Tickets", group: "Operations" },
  { path: "/admin/suspicious-activity", label: "Suspicious Activity", group: "Operations" },
  { path: "/admin/quick-actions", label: "Quick Actions", group: "Dashboard Content" },
  { path: "/admin/services", label: "Services", group: "Dashboard Content" },
  { path: "/admin/health-tips", label: "Health Tips", group: "Dashboard Content" },
  { path: "/admin/info-cards", label: "Info Cards", group: "Dashboard Content" },
  { path: "/admin/quick-access", label: "Quick Access Grid", group: "Dashboard Content" },
  { path: "/admin/slider", label: "Slider", group: "Dashboard Content" },
  { path: "/admin/ads", label: "Ads", group: "Dashboard Content" },
  { path: "/admin/medicines", label: "Medicines", group: "Dashboard Content" },
  { path: "/admin/featured-medicines", label: "Featured Medicines", group: "Dashboard Content" },
  { path: "/admin/promo-banners", label: "Promo Banners", group: "Dashboard Content" },
  { path: "/admin/category-actions", label: "Category Actions", group: "Dashboard Content" },
  { path: "/admin/revenue", label: "Platform Revenue", group: "Finance & Settings" },
  { path: "/admin/payouts", label: "Payouts", group: "Finance & Settings" },
  { path: "/admin/commission", label: "Commission Config", group: "Finance & Settings" },
  { path: "/admin/otp-settings", label: "OTP Settings", group: "Finance & Settings" },
  { path: "/admin/team", label: "Admin Team", group: "Finance & Settings" },
  { path: "/admin/settings", label: "Platform Settings", group: "Finance & Settings" },
  { path: "/admin/sessions", label: "Session Management", group: "Security & Logs" },
];

export function useAdminPermissions() {
  const [allowedPaths, setAllowedPaths] = useState<string[] | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Check if Super Admin
      const { data: teamRecord } = await supabase
        .from("admin_team")
        .select("id, designation")
        .eq("user_id", user.id)
        .maybeSingle();

      if (teamRecord?.designation === "Super Admin") {
        setIsSuperAdmin(true);
        setAllowedPaths(ALL_ADMIN_PAGES.map((p) => p.path));
        setLoading(false);
        return;
      }

      if (!teamRecord) {
        setAllowedPaths([]);
        setLoading(false);
        return;
      }

      // Fetch assigned permissions
      const { data: perms } = await supabase
        .from("admin_permissions")
        .select("page_path")
        .eq("admin_team_id", teamRecord.id);

      setAllowedPaths((perms || []).map((p: any) => p.page_path));
      setLoading(false);
    };
    load();
  }, []);

  return { allowedPaths, isSuperAdmin, loading };
}
