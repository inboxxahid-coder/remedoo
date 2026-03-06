import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Store, Loader2, Building2, Package, Truck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AdminPharmacyControl() {
  const [mode, setMode] = useState<"partner" | "remedoo">("partner");
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [stats, setStats] = useState({ partners: 0, remedooItems: 0, drivers: 0, activeOrders: 0 });

  useEffect(() => {
    const load = async () => {
      const [settingRes, partnersRes, inventoryRes, driversRes, ordersRes] = await Promise.all([
        supabase.from("platform_settings").select("value").eq("key", "pharmacy_mode").maybeSingle(),
        supabase.from("pharmacies" as any).select("id", { count: "exact", head: true }),
        supabase.from("remedoo_pharmacy_inventory").select("id", { count: "exact", head: true }),
        supabase.from("delivery_drivers").select("id", { count: "exact", head: true }),
        supabase.from("remedoo_orders").select("id", { count: "exact", head: true }).not("status", "in", '("delivered","cancelled")'),
      ]);
      setMode(settingRes.data?.value === "remedoo" ? "remedoo" : "partner");
      setStats({
        partners: partnersRes.count || 0,
        remedooItems: inventoryRes.count || 0,
        drivers: driversRes.count || 0,
        activeOrders: ordersRes.count || 0,
      });
      setLoading(false);
    };
    load();
  }, []);

  const handleSwitch = async (newMode: "partner" | "remedoo") => {
    if (newMode === mode) return;
    setSwitching(true);
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase
      .from("platform_settings")
      .update({ value: newMode, updated_by: user?.id })
      .eq("key", "pharmacy_mode");
    if (error) {
      toast.error("Failed to switch pharmacy mode");
    } else {
      setMode(newMode);
      toast.success(`Switched to ${newMode === "partner" ? "Partner Pharmacy" : "Remedoo Pharmacy"} mode`);
    }
    setSwitching(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-primary/10">
          <Store className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Pharmacy Control</h1>
          <p className="text-sm text-muted-foreground">Switch between partner and Remedoo pharmacy modes</p>
        </div>
      </div>

      {/* Current Mode Banner */}
      <Card className="p-5 mb-6 border-2 border-primary/30 bg-primary/5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${mode === "partner" ? "bg-emerald-500" : "bg-violet-500"} animate-pulse`} />
            <div>
              <p className="font-bold text-foreground">
                Current Mode: {mode === "partner" ? "Partner Pharmacies" : "Remedoo Pharmacy"}
              </p>
              <p className="text-xs text-muted-foreground">
                {mode === "partner"
                  ? "Orders are routed to registered partner pharmacies"
                  : "All orders are handled by Remedoo's own pharmacy system"}
              </p>
            </div>
          </div>
          <Badge variant={mode === "partner" ? "default" : "secondary"} className="text-xs">
            {mode === "partner" ? "Marketplace" : "Direct"}
          </Badge>
        </div>
      </Card>

      {/* Warning */}
      <Card className="p-4 mb-6 border-amber-500/30 bg-amber-500/5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Important Notice</p>
            <p className="text-xs text-muted-foreground mt-1">
              Switching modes will not delete any existing data. Partner pharmacies remain registered
              and their order history is preserved. In Remedoo mode, partner pharmacies simply stop
              receiving new orders.
            </p>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center">
          <Building2 className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.partners}</p>
          <p className="text-xs text-muted-foreground">Partner Pharmacies</p>
        </Card>
        <Card className="p-4 text-center">
          <Package className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.remedooItems}</p>
          <p className="text-xs text-muted-foreground">Remedoo Inventory</p>
        </Card>
        <Card className="p-4 text-center">
          <Truck className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.drivers}</p>
          <p className="text-xs text-muted-foreground">Delivery Drivers</p>
        </Card>
        <Card className="p-4 text-center">
          <Store className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.activeOrders}</p>
          <p className="text-xs text-muted-foreground">Active Orders</p>
        </Card>
      </div>

      {/* Mode Selection */}
      <div className="grid md:grid-cols-2 gap-4">
        <button
          onClick={() => handleSwitch("partner")}
          disabled={switching}
          className={`text-left p-6 rounded-2xl border-2 transition-all ${
            mode === "partner"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-card hover:border-primary/40"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/10">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Partner Pharmacy Mode</h3>
              {mode === "partner" && <Badge className="text-[10px] mt-1">Active</Badge>}
            </div>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>• Orders routed to nearby partner pharmacies</li>
            <li>• Partner pharmacies manage their own inventory</li>
            <li>• Marketplace commission model</li>
            <li>• Multiple pharmacy choices for patients</li>
          </ul>
        </button>

        <button
          onClick={() => handleSwitch("remedoo")}
          disabled={switching}
          className={`text-left p-6 rounded-2xl border-2 transition-all ${
            mode === "remedoo"
              ? "border-primary bg-primary/5 shadow-md"
              : "border-border bg-card hover:border-primary/40"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-violet-500/10">
              <Store className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Remedoo Pharmacy Mode</h3>
              {mode === "remedoo" && <Badge className="text-[10px] mt-1">Active</Badge>}
            </div>
          </div>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li>• All orders handled by Remedoo pharmacy</li>
            <li>• Centralized inventory management</li>
            <li>• Dedicated delivery driver system</li>
            <li>• Full control over pricing and stock</li>
          </ul>
        </button>
      </div>

      {switching && (
        <div className="flex items-center justify-center gap-2 mt-4 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Switching pharmacy mode...
        </div>
      )}
    </div>
  );
}
