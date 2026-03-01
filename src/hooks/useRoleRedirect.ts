import { supabase } from "@/integrations/supabase/client";

export async function getRoleRedirectPath(userId: string): Promise<string> {
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (!roles || roles.length === 0) return "/dashboard";

  const roleSet = new Set(roles.map((r) => r.role));

  if (roleSet.has("admin")) return "/admin";
  if (roleSet.has("doctor")) return "/doctor";
  if (roleSet.has("hospital_admin")) return "/hospital";
  if (roleSet.has("lab_admin")) return "/lab";
  if (roleSet.has("pharmacy_admin")) return "/pharmacy-panel";

  return "/dashboard";
}
