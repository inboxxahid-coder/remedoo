import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Palette, Upload, RotateCcw, Save, Loader2, Image, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { DEFAULT_COLORS } from "@/hooks/useBranding";
import { logAuditAction } from "@/lib/auditLog";

interface BrandingItem {
  id: string;
  key: string;
  value: string;
  label: string;
  category: string;
  type: string;
}

// Default logo assets for revert
const DEFAULT_LOGOS: Record<string, string> = {
  logo_main: "",
  logo_splash: "",
  logo_header: "",
  logo_footer: "",
  favicon: "",
};

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/x-icon"];

export default function AdminBranding() {
  const [items, setItems] = useState<BrandingItem[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const fetchBranding = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_branding")
      .select("*")
      .order("category")
      .order("label");
    if (error) {
      toast.error("Failed to load branding settings");
    } else {
      setItems((data as any[]) || []);
      const vals: Record<string, string> = {};
      (data || []).forEach((s: any) => { vals[s.key] = s.value; });
      setEditedValues(vals);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBranding(); }, [fetchBranding]);

  const handleChange = (key: string, value: string) => {
    setEditedValues((prev) => ({ ...prev, [key]: value }));
  };

  const hasChanges = items.some((s) => editedValues[s.key] !== s.value);

  const handleUpload = async (key: string, file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Invalid file type. Use PNG, JPG, SVG, WEBP, or ICO.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum 2MB allowed.");
      return;
    }

    setUploading(key);
    const ext = file.name.split(".").pop();
    const path = `${key}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("branding").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed: " + error.message);
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from("branding").getPublicUrl(path);
    handleChange(key, urlData.publicUrl);
    setUploading(null);
    toast.success("Image uploaded");
  };

  const handleSave = async () => {
    setSaving(true);
    const changed = items.filter((s) => editedValues[s.key] !== s.value);
    let hasError = false;
    const userId = (await supabase.auth.getUser()).data.user?.id;

    for (const s of changed) {
      const { error } = await supabase
        .from("platform_branding")
        .update({ value: editedValues[s.key], updated_by: userId })
        .eq("key", s.key);
      if (error) hasError = true;
    }

    await logAuditAction({
      action: "branding_update",
      entityType: "platform_branding",
      details: { changed_keys: changed.map((c) => c.key) },
    });

    if (hasError) {
      toast.error("Some settings failed to save");
    } else {
      toast.success(`${changed.length} branding setting${changed.length !== 1 ? "s" : ""} updated`);
      fetchBranding();
      // Apply colors live
      applyPreviewColors(editedValues);
    }
    setSaving(false);
  };

  const handleRevertToDefaults = async () => {
    const defaults = { ...DEFAULT_COLORS, ...DEFAULT_LOGOS };
    const newVals = { ...editedValues };
    Object.keys(defaults).forEach((k) => {
      if (k in newVals) newVals[k] = defaults[k];
    });
    setEditedValues(newVals);
    toast.info("Reset to defaults. Click Save to apply.");
  };

  // Live preview: apply color changes to CSS vars
  const applyPreviewColors = (vals: Record<string, string>) => {
    const root = document.documentElement;
    const h = vals.color_primary_h || "24";
    const s = vals.color_primary_s || "85";
    const l = vals.color_primary_l || "50";
    root.style.setProperty("--primary", `${h} ${s}% ${l}%`);
    root.style.setProperty("--ring", `${h} ${s}% ${l}%`);
    root.style.setProperty("--accent", `${h} 40% 93%`);
    root.style.setProperty("--accent-foreground", `${h} 65% 35%`);

    const bh = vals.color_background_h || "30";
    const bs = vals.color_background_s || "15";
    const bl = vals.color_background_l || "97";
    root.style.setProperty("--background", `${bh} ${bs}% ${bl}%`);

    const fh = vals.color_foreground_h || "20";
    const fs = vals.color_foreground_s || "25";
    const fl = vals.color_foreground_l || "10";
    root.style.setProperty("--foreground", `${fh} ${fs}% ${fl}%`);
  };

  useEffect(() => {
    if (previewMode) applyPreviewColors(editedValues);
  }, [previewMode, editedValues]);

  const logos = items.filter((i) => i.category === "logos");
  const colors = items.filter((i) => i.category === "colors");
  const graphics = items.filter((i) => i.category === "graphics");

  // Group color items into semantic sets
  const colorGroups = [
    { label: "Primary Color", prefix: "color_primary", description: "Main brand color used across all panels" },
    { label: "Secondary Color", prefix: "color_secondary", description: "Secondary accent and backgrounds" },
    { label: "Background Color", prefix: "color_background", description: "Page background color" },
    { label: "Text Color", prefix: "color_foreground", description: "Primary text / foreground color" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Palette className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Branding & Theme</h1>
            <p className="text-sm text-muted-foreground">Customize logos, colors, and graphics across all panels</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
            className="gap-1.5"
          >
            {previewMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {previewMode ? "Exit Preview" : "Preview"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevertToDefaults}
            className="gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            Defaults
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm" className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {previewMode && (
        <div className="mb-4 p-3 rounded-xl border border-warning/30 bg-warning/5 text-sm text-warning">
          🎨 Preview mode active — colors are applied live. Save to persist or exit to discard.
        </div>
      )}

      <Tabs defaultValue="logos" className="space-y-4">
        <TabsList className="bg-muted/50 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="logos" className="gap-1.5 text-xs sm:text-sm">
            <Image className="w-3.5 h-3.5" /> Logos ({logos.length})
          </TabsTrigger>
          <TabsTrigger value="colors" className="gap-1.5 text-xs sm:text-sm">
            <Palette className="w-3.5 h-3.5" /> Colors ({colorGroups.length})
          </TabsTrigger>
          <TabsTrigger value="graphics" className="gap-1.5 text-xs sm:text-sm">
            <Image className="w-3.5 h-3.5" /> Graphics ({graphics.length})
          </TabsTrigger>
        </TabsList>

        {/* LOGOS TAB */}
        <TabsContent value="logos">
          <div className="bg-card rounded-2xl border border-border p-4 md:p-6 shadow-sm">
            <p className="text-sm text-muted-foreground mb-4">Upload logos for app, splash screen, header, and footer. Max 2MB, PNG/JPG/SVG/WEBP.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {logos.map((item) => (
                <LogoUploadCard
                  key={item.key}
                  item={item}
                  currentValue={editedValues[item.key] ?? item.value}
                  isChanged={editedValues[item.key] !== item.value}
                  uploading={uploading === item.key}
                  onUpload={(file) => handleUpload(item.key, file)}
                  onClear={() => handleChange(item.key, "")}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* COLORS TAB */}
        <TabsContent value="colors">
          <div className="bg-card rounded-2xl border border-border p-4 md:p-6 shadow-sm">
            <p className="text-sm text-muted-foreground mb-4">Adjust theme colors. Changes propagate to all panels (Patient, Doctor, Hospital, Lab, Pharmacy, Admin).</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {colorGroups.map((group) => {
                const h = editedValues[`${group.prefix}_h`] || "0";
                const s = editedValues[`${group.prefix}_s`] || "0";
                const l = editedValues[`${group.prefix}_l`] || "50";
                const previewColor = `hsl(${h}, ${s}%, ${l}%)`;

                return (
                  <div key={group.prefix} className="p-4 rounded-xl border border-border space-y-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg border border-border shadow-sm shrink-0"
                        style={{ backgroundColor: previewColor }}
                      />
                      <div>
                        <Label className="text-sm font-semibold">{group.label}</Label>
                        <p className="text-xs text-muted-foreground">{group.description}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">Hue (0-360)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={360}
                          value={h}
                          onChange={(e) => handleChange(`${group.prefix}_h`, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Saturation (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={s}
                          onChange={(e) => handleChange(`${group.prefix}_s`, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Lightness (%)</Label>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={l}
                          onChange={(e) => handleChange(`${group.prefix}_l`, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={h}
                      onChange={(e) => handleChange(`${group.prefix}_h`, e.target.value)}
                      className="w-full accent-primary"
                      style={{
                        background: `linear-gradient(to right, hsl(0,${s}%,${l}%), hsl(60,${s}%,${l}%), hsl(120,${s}%,${l}%), hsl(180,${s}%,${l}%), hsl(240,${s}%,${l}%), hsl(300,${s}%,${l}%), hsl(360,${s}%,${l}%))`,
                        height: "8px",
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* GRAPHICS TAB */}
        <TabsContent value="graphics">
          <div className="bg-card rounded-2xl border border-border p-4 md:p-6 shadow-sm">
            <p className="text-sm text-muted-foreground mb-4">Upload custom graphics for onboarding screens, empty states, and error pages.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {graphics.map((item) => (
                <LogoUploadCard
                  key={item.key}
                  item={item}
                  currentValue={editedValues[item.key] ?? item.value}
                  isChanged={editedValues[item.key] !== item.value}
                  uploading={uploading === item.key}
                  onUpload={(file) => handleUpload(item.key, file)}
                  onClear={() => handleChange(item.key, "")}
                />
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// --- Sub-component for logo/image upload cards ---
function LogoUploadCard({
  item,
  currentValue,
  isChanged,
  uploading,
  onUpload,
  onClear,
}: {
  item: BrandingItem;
  currentValue: string;
  isChanged: boolean;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClear: () => void;
}) {
  return (
    <div className="p-4 rounded-xl border border-border space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">
          {item.label}
          {isChanged && <span className="ml-2 text-xs text-primary">(modified)</span>}
        </Label>
      </div>
      <div className="w-full h-28 rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center overflow-hidden">
        {currentValue ? (
          <img src={currentValue} alt={item.label} className="max-h-full max-w-full object-contain" />
        ) : (
          <div className="text-center">
            <Image className="w-8 h-8 text-muted-foreground/40 mx-auto mb-1" />
            <p className="text-xs text-muted-foreground">No image set</p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <label className="flex-1">
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" className="w-full gap-1.5 cursor-pointer" asChild>
            <span>
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Upload
            </span>
          </Button>
        </label>
        {currentValue && (
          <Button variant="ghost" size="sm" onClick={onClear} className="text-destructive hover:text-destructive">
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
