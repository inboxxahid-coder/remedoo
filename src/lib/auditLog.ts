import { supabase } from "@/integrations/supabase/client";

interface AuditLogParams {
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, any>;
}

export async function logAuditAction({ action, entityType, entityId, details }: AuditLogParams) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: doctor } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    await supabase.from("audit_logs").insert({
      user_id: session.user.id,
      doctor_id: doctor?.id ?? null,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      details: details ?? {},
    } as any);
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}
