import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, ShoppingBag, AlertTriangle, Clock, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "appointment" | "order" | "emergency";
  title: string;
  subtitle: string;
  time: string;
  status: string;
  path: string;
}

const statusColors: Record<string, string> = {
  confirmed: "text-success bg-success/10",
  completed: "text-primary bg-primary/10",
  pending: "text-warning bg-warning/10",
  cancelled: "text-destructive bg-destructive/10",
  placed: "text-primary bg-primary/10",
  delivered: "text-success bg-success/10",
  out_for_delivery: "text-warning bg-warning/10",
  dispatched: "text-warning bg-warning/10",
  resolved: "text-success bg-success/10",
};

const typeIcons = {
  appointment: CalendarCheck,
  order: ShoppingBag,
  emergency: AlertTriangle,
};

const RecentActivityFeed = () => {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const userId = session.user.id;

      const [appts, orders, emergencies] = await Promise.all([
        supabase.from("appointments")
          .select("id, service_type, appointment_date, appointment_time, status, created_at")
          .eq("patient_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("orders")
          .select("id, total, status, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("emergency_requests")
          .select("id, status, created_at")
          .eq("patient_id", userId)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const items: ActivityItem[] = [
        ...(appts.data?.map((a) => ({
          id: a.id,
          type: "appointment" as const,
          title: `${a.service_type} Appointment`,
          subtitle: `${a.appointment_date} at ${a.appointment_time}`,
          time: a.created_at,
          status: a.status,
          path: "/appointments",
        })) || []),
        ...(orders.data?.map((o) => ({
          id: o.id,
          type: "order" as const,
          title: `Medicine Order`,
          subtitle: `₹${o.total}`,
          time: o.created_at,
          status: o.status,
          path: "/my-orders",
        })) || []),
        ...(emergencies.data?.map((e) => ({
          id: e.id,
          type: "emergency" as const,
          title: "Emergency Request",
          subtitle: e.status,
          time: e.created_at,
          status: e.status,
          path: "/emergency",
        })) || []),
      ];

      items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      setActivities(items.slice(0, 6));
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading || activities.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" /> Recent Activity
        </h2>
      </div>

      <div className="space-y-2">
        {activities.map((activity, idx) => {
          const Icon = typeIcons[activity.type];
          const colorClass = statusColors[activity.status] || "text-muted-foreground bg-muted";
          return (
            <motion.button
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => navigate(activity.path)}
              className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-card border border-border hover:border-primary/30 transition-colors text-left"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground truncate">{activity.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{activity.subtitle}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-md ${colorClass}`}>
                  {activity.status.replace("_", " ")}
                </span>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default RecentActivityFeed;
