import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function useRealtimeNotifications() {
  const navigate = useNavigate();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const handleNewNotification = useCallback(
    (payload: { new: { title: string; message: string; path?: string; type: string } }) => {
      const n = payload.new;
      toast(n.title, {
        description: n.message,
        action: n.path
          ? { label: "View", onClick: () => navigate(n.path!) }
          : undefined,
        duration: 6000,
      });
    },
    [navigate]
  );

  useEffect(() => {
    let userId: string | null = null;

    const setup = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      userId = session.user.id;

      channelRef.current = supabase
        .channel("user-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${userId}`,
          },
          handleNewNotification as any
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [handleNewNotification]);
}
