import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Calendar, Package, Info, Check, BellRing, BellOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import BottomNav from "@/components/BottomNav";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  icon: typeof Calendar;
  path?: string;
};

const iconMap: Record<string, typeof Calendar> = {
  appointment: Calendar,
  order: Package,
  system: Info,
};

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
      item.read ? "bg-muted/40 border-border/50" : "bg-card border-border shadow-sm"
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
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { permission, supported, requestPermission } = usePushNotifications();

  // Enable real-time toast alerts
  useRealtimeNotifications();

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data) {
        setNotifications(
          data.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            message: n.message || "",
            time: format(parseISO(n.created_at), "MMM d, h:mm a"),
            read: n.read,
            icon: iconMap[n.type] || Info,
            path: n.path,
          }))
        );
      }
      setLoading(false);
    };
    load();

    // Listen for new notifications in real-time and add to list
    const channel = supabase
      .channel("notifications-page")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload: any) => {
          const n = payload.new;
          setNotifications((prev) => [
            {
              id: n.id,
              type: n.type,
              title: n.title,
              message: n.message || "",
              time: format(parseISO(n.created_at), "MMM d, h:mm a"),
              read: false,
              icon: iconMap[n.type] || Info,
              path: n.path,
            },
            ...prev,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const markAllRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", session.user.id)
      .eq("read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleTap = async (item: NotificationItem) => {
    // Mark as read
    if (!item.read) {
      await supabase.from("notifications").update({ read: true }).eq("id", item.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
    }
    if (item.path) navigate(item.path);
  };

  const filterByType = (type: string) => notifications.filter((n) => n.type === type);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const renderList = (items: NotificationItem[], label: string) =>
    items.length === 0 ? (
      <EmptyState label={label} />
    ) : (
      <div className="space-y-3">
        <AnimatePresence>
          {items.map((item) => (
            <NotificationCard key={item.id} item={item} onTap={() => handleTap(item)} />
          ))}
        </AnimatePresence>
      </div>
    );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-primary page-header px-5 pb-6 rounded-b-[2rem]">
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
          <div className="flex items-center gap-2">
            {supported && (
              <Button
                size="sm"
                variant="ghost"
                onClick={requestPermission}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                title={permission === "granted" ? "Push enabled" : "Enable push"}
              >
                {permission === "granted" ? (
                  <BellRing className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4" />
                )}
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={markAllRead}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Check className="w-4 h-4 mr-1" /> Read all
              </Button>
            )}
          </div>
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
            <TabsContent value="all">{renderList(notifications, "notifications")}</TabsContent>
            <TabsContent value="appointments">{renderList(filterByType("appointment"), "appointment reminders")}</TabsContent>
            <TabsContent value="orders">{renderList(filterByType("order"), "order updates")}</TabsContent>
            <TabsContent value="system">{renderList(filterByType("system"), "system alerts")}</TabsContent>
          </div>
        </Tabs>
      </div>
      <BottomNav />
    </div>
  );
};

export default Notifications;
