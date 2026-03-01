import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Percent, Save, Settings2 } from "lucide-react";

export default function AdminCommissionConfig() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("platform_commission_config").select("*").order("provider_type");
    setConfigs(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpdate = async (config: any) => {
    setSaving(config.id);
    const { error } = await supabase.from("platform_commission_config").update({
      commission_percent: config.commission_percent,
      flat_fee: config.flat_fee,
      is_active: config.is_active,
      description: config.description,
    }).eq("id", config.id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Commission updated");
  };

  const updateField = (id: string, field: string, value: any) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const providerIcon = (type: string) => {
    switch (type) {
      case "doctor": return "🩺";
      case "hospital": return "🏥";
      case "pharmacy": return "💊";
      case "lab": return "🔬";
      default: return "📋";
    }
  };

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="w-56 h-8 rounded" />
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Commission Configuration</h1>
      </div>
      <p className="text-sm text-muted-foreground">Set platform commission rates for each provider type and service. Changes apply to future transactions only.</p>

      <div className="space-y-4">
        {configs.map(config => (
          <Card key={config.id} className="p-5">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl">{providerIcon(config.provider_type)}</span>
                <div>
                  <p className="font-semibold text-foreground capitalize">{config.provider_type} — {config.service_type.replace("_", " ")}</p>
                  <Input
                    value={config.description || ""}
                    onChange={e => updateField(config.id, "description", e.target.value)}
                    className="mt-1 text-xs h-8"
                    placeholder="Description..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.is_active ? "default" : "secondary"}>
                  {config.is_active ? "Active" : "Inactive"}
                </Badge>
                <Switch
                  checked={config.is_active}
                  onCheckedChange={v => updateField(config.id, "is_active", v)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1">
                  <Percent className="w-3 h-3" /> Commission %
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={config.commission_percent}
                  onChange={e => updateField(config.id, "commission_percent", Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Flat Fee (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.flat_fee}
                  onChange={e => updateField(config.id, "flat_fee", Number(e.target.value))}
                />
              </div>
              <div className="flex items-end">
                <Button
                  size="sm"
                  onClick={() => handleUpdate(config)}
                  disabled={saving === config.id}
                  className="gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving === config.id ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
