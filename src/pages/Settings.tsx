import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Bell, Moon, Globe, Shield, LogOut, ChevronRight, User, Heart, Calendar,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";
import BottomNav from "@/components/BottomNav";

type NotifPrefs = { email: boolean; push: boolean };

const Settings = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Tables<"profiles"> | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [language, setLanguage] = useState("en");
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setIsGuest(true); return; }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (data) {
        setProfile(data);
        setDarkMode(data.dark_mode ?? false);
        const prefs = (data.notification_preferences as NotifPrefs | null) ?? { email: true, push: true };
        setNotifEmail(prefs.email);
        setNotifPush(prefs.push);
        setLanguage(data.language ?? "en");
      }
    };
    load();
  }, []);

  const updateField = async (field: string, value: any) => {
    if (!profile) return;
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("id", profile.id);
    if (error) toast.error("Failed to save setting");
  };

  const toggleDarkMode = (val: boolean) => {
    setDarkMode(val);
    document.documentElement.classList.toggle("dark", val);
    updateField("dark_mode", val);
  };

  const toggleNotifEmail = (val: boolean) => {
    setNotifEmail(val);
    updateField("notification_preferences", { email: val, push: notifPush });
  };

  const toggleNotifPush = (val: boolean) => {
    setNotifPush(val);
    updateField("notification_preferences", { email: notifEmail, push: val });
  };

  const changeLanguage = (val: string) => {
    setLanguage(val);
    updateField("language", val);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut().catch(() => {});
    toast.success("Logged out successfully");
    navigate("/login", { replace: true });
  };

  const menuItems = [
    { icon: User, label: "Edit Profile", action: () => navigate("/profile") },
    { icon: Calendar, label: "My Appointments", action: () => navigate("/appointments") },
    { icon: Heart, label: "My Favorites", action: () => navigate("/favorites") },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="gradient-primary px-5 pt-10 pb-6 rounded-b-[1.5rem]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-primary-foreground">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-primary-foreground">Settings</h1>
        </div>
      </div>

      <div className="px-5 mt-4 space-y-4">
        {/* User Info */}
        <button
          onClick={() => navigate("/profile")}
          className="w-full flex items-center gap-4 bg-card rounded-2xl border border-border shadow-sm p-4 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-foreground truncate">
              {profile?.full_name || (isGuest ? "Guest User" : "User")}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {profile?.email || "Tap to edit profile"}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        {/* Quick Links */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors ${
                i < menuItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                <item.icon className="w-4 h-4 text-accent-foreground" />
              </div>
              <span className="flex-1 text-sm font-medium text-foreground">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Preferences */}
        {!isGuest && (
          <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Preferences</h3>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                  <Moon className="w-4 h-4 text-accent-foreground" />
                </div>
                <span className="text-sm text-foreground">Dark Mode</span>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                  <Bell className="w-4 h-4 text-accent-foreground" />
                </div>
                <span className="text-sm text-foreground">Email Notifications</span>
              </div>
              <Switch checked={notifEmail} onCheckedChange={toggleNotifEmail} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                  <Bell className="w-4 h-4 text-accent-foreground" />
                </div>
                <span className="text-sm text-foreground">Push Notifications</span>
              </div>
              <Switch checked={notifPush} onCheckedChange={toggleNotifPush} />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                  <Globe className="w-4 h-4 text-accent-foreground" />
                </div>
                <span className="text-sm text-foreground">Language</span>
              </div>
              <Select value={language} onValueChange={changeLanguage}>
                <SelectTrigger className="w-[130px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिन्दी</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-border">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Shield className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">Privacy Policy</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Globe className="w-4 h-4 text-accent-foreground" />
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">About Remedoo</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={isGuest ? () => navigate("/login", { replace: true }) : handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-destructive/30 bg-destructive/5 text-destructive font-medium text-sm"
        >
          <LogOut className="w-4 h-4" />
          {isGuest ? "Sign In" : "Log Out"}
        </button>

        <p className="text-center text-xs text-muted-foreground">Remedoo v1.0.0</p>
      </div>
      <BottomNav />
    </div>
  );
};

export default Settings;
