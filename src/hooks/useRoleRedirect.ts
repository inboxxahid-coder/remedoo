import { supabase } from "@/integrations/supabase/client";

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function fetchRolePath(userId: string): Promise<string> {
  const { data: roles, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error || !roles || roles.length === 0) return "/dashboard";

  const roleSet = new Set(roles.map((r) => r.role));

  if (roleSet.has("admin")) return "/admin";

  if (roleSet.has("doctor")) {
    const { data } = await supabase.from("doctors").select("approval_status").eq("user_id", userId).maybeSingle();
    if (data?.approval_status === "pending") return "/pending-approval";
    return "/doctor";
  }
  if (roleSet.has("hospital_admin")) {
    const { data } = await supabase.from("hospitals").select("approval_status").eq("user_id", userId).maybeSingle();
    if (data?.approval_status === "pending") return "/pending-approval";
    return "/hospital";
  }
  if (roleSet.has("lab_admin")) {
    const { data } = await supabase.from("labs").select("approval_status").eq("user_id", userId).maybeSingle();
    if (data?.approval_status === "pending") return "/pending-approval";
    return "/lab";
  }
  if (roleSet.has("pharmacy_admin")) {
    const { data } = await supabase.from("pharmacies").select("approval_status").eq("user_id", userId).maybeSingle();
    if (data?.approval_status === "pending") return "/pending-approval";
    return "/pharmacy-panel";
  }

  return "/dashboard";
}

export async function getRoleRedirectPath(userId: string): Promise<string> {
  return withTimeout(fetchRolePath(userId), 4000, "/dashboard");
}
