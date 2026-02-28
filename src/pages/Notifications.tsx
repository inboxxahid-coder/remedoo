import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Calendar, Package, Info, Check, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

type NotificationItem = {
  id: string;
  type: "appointment" | "order" | "system";
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: typeof Calendar;
  path?: string;
};

const buildAppointmentNotifications = (appointments: Tables<"appointments">[]): NotificationItem[] =>
  appointments.map((apt) => {
    const date = parseISO(apt.appointment_date);
    const prefix = isToday(date) ? "Today" : isTomorrow(date) ? "Tomorrow" : format(date, "MMM d");
    return {
      id: `apt-${apt.id}`,
      type: "appointment",
      title: `${prefix} — ${apt.service_type} appointment`,
      message: `Scheduled at ${apt.appointment_time?.slice(0, 5)}. Status: ${apt.status}`,
      time: format(parseISO(apt.created_at), "MMM d, h:mm a"),
      read: apt.status === "completed",
      icon: Calendar,
      path: "/appointments",
    };
  });

const buildOrderNotifications = (orders: Tables<"orders">[]): NotificationItem[] =>
  orders.map((order) => {
    const statusMap: Record<string, string> = {
      placed: "Your order has been placed",
      confirmed: "Your order is confirmed",
      out_for_delivery: "Your order is out for delivery 🚚",
      delivered: "Your order has been delivered ✅",
      cancelled: "Your order was cancelled",
    };
    return {
      id: `ord-${order.id}`,
      type: "order",
      title: statusMap[order.status] || `Order ${order.status}`,
      message: `Total: ₹${order.total} • ${order.payment_method.toUpperCase()}`,
      time: format(parseISO(order.updated_at), "MMM d, h:mm a"),
      read: order.status === "delivered",
      icon: Package,
      path: `/order/${order.id}`,
    };
  });

const systemAlerts: NotificationItem[] = [
  {
    id: "sys-1",
    type: "system",
    title: "Welcome to MediCare! 🎉",
    message: "Explore doctors, pharmacies, and labs near you.",
    time: "System",
    read: false,
    icon: Info,
  },
  {
    id: "sys-2",
    type: "system",
    title: "Stay healthy 💪",
    message: "Remember to schedule your annual health checkup.",
    time: "System",
    read: false,
    icon: Info,
  },
];

const NotificationCard = ({
  item,
  onTap,
}: {
  item: NotificationItem;
  onTap: () => void;
}) => (
  <motion.button
    layout
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -60 }}
    onClick={onTap}
    className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-colors ${
      item.read
        ? "bg-muted/40 border-border/50"
        : "bg-card border-border shadow-sm"
    }`}
  >
    <div
      className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
        item.type === "appointment"
          ? "bg-primary/10 text-primary"
          : item.type === "order"
          ? "bg-success/10 text-success"
          : "bg-warning/10 text-warning"
      }`}
    >
      <item.icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h4 className={`text-sm font-semibold truncate ${item.read ? "text-muted-foreground" : "text-foreground"}`}>
          {item.title}
        </h4>
        {!item.read && <span className="shrink-0 w-2 h-2 rounded-full bg-primary" />}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.message}</p>
      <p className="text-[10px] text-muted-foreground/60 mt-1">{item.time}</p>
    </div>
  </motion.button>
);

const EmptyState = ({ label }: { label: string }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Bell className="w-12 h-12 text-muted-foreground/30 mb-3" />
    <p className="text-sm text-muted-foreground">No {label} yet</p>
  </div>
);

const Notifications = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Tables<"appointments">[]>([]);
  const [orders, setOrders] = useState<Tables<"orders">[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [aptRes, ordRes] = await Promise.all([
        supabase
          .from("appointments")
          .select("*")
          .eq("patient_id", session.user.id)
          .order("created_at", { ascending: false })
          .limit(20),
        supabase
          .from("orders")
          .select("*")
          .eq("user_id", session.user.id)
          .order("updated_at", { ascending: false })
          .limit(20),
      ]);

      if (aptRes.data) setAppointments(aptRes.data);
      if (ordRes.data) setOrders(ordRes.data);
    };
    load();
  }, []);

  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));

  const aptNotifs = buildAppointmentNotifications(appointments).filter((n) => !dismissed.has(n.id));
  const orderNotifs = buildOrderNotifications(orders).filter((n) => !dismissed.has(n.id));
  const sysNotifs = systemAlerts.filter((n) => !dismissed.has(n.id));
  const allNotifs = [...aptNotifs, ...orderNotifs, ...sysNotifs];

  const unreadCount = allNotifs.filter((n) => !n.read).length;

  const renderList = (items: NotificationItem[], label: string) =>
    items.length === 0 ? (
      <EmptyState label={label} />
    ) : (
      <div className="space-y-3">
        <AnimatePresence>
          {items.map((item) => (
            <NotificationCard
              key={item.id}
              item={item}
              onTap={() => (item.path ? navigate(item.path) : dismiss(item.id))}
            />
          ))}
        </AnimatePresence>
      </div>
    );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[2rem]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-primary-foreground/20 border border-primary-foreground/30 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-primary-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-primary-foreground">Notifications</h1>
            {unreadCount > 0 && (
              <p className="text-sm text-primary-foreground/70">{unreadCount} unread</p>
            )}
          </div>
          {allNotifs.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDismissed(new Set(allNotifs.map((n) => n.id)))}
              className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Check className="w-4 h-4 mr-1" /> Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 -mt-3 relative z-10">
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full bg-card shadow-md rounded-2xl h-12 p-1">
            <TabsTrigger value="all" className="flex-1 rounded-xl text-xs font-semibold">All</TabsTrigger>
            <TabsTrigger value="appointments" className="flex-1 rounded-xl text-xs font-semibold">Appointments</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 rounded-xl text-xs font-semibold">Orders</TabsTrigger>
            <TabsTrigger value="system" className="flex-1 rounded-xl text-xs font-semibold">System</TabsTrigger>
          </TabsList>

          <div className="mt-4 pb-8">
            <TabsContent value="all">{renderList(allNotifs, "notifications")}</TabsContent>
            <TabsContent value="appointments">{renderList(aptNotifs, "appointment reminders")}</TabsContent>
            <TabsContent value="orders">{renderList(orderNotifs, "order updates")}</TabsContent>
            <TabsContent value="system">{renderList(sysNotifs, "system alerts")}</TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Notifications;
