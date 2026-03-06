import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BrandingValues {
  [key: string]: string;
}

const DEFAULT_COLORS: Record<string, string> = {
  color_primary_h: "24",
  color_primary_s: "85",
  color_primary_l: "50",
  color_secondary_h: "30",
  color_secondary_s: "20",
  color_secondary_l: "95",
  color_background_h: "30",
  color_background_s: "15",
  color_background_l: "97",
  color_foreground_h: "20",
  color_foreground_s: "25",
  color_foreground_l: "10",
};

export function useBranding() {
  const [branding, setBranding] = useState<BrandingValues>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBranding = async () => {
      const { data } = await supabase
        .from("platform_branding")
        .select("key, value");
      if (data) {
        const map: BrandingValues = {};
        data.forEach((row: any) => {
          map[row.key] = row.value;
        });
        setBranding(map);
        applyColors(map);
      }
      setLoading(false);
    };
    fetchBranding();
  }, []);

  return { branding, loading };
}

function applyColors(branding: BrandingValues) {
  const root = document.documentElement;
  const isDark = root.classList.contains("dark");

  // Only apply if values differ from defaults (i.e., admin has customized them)
  const h = branding.color_primary_h || DEFAULT_COLORS.color_primary_h;
  const s = branding.color_primary_s || DEFAULT_COLORS.color_primary_s;
  const l = branding.color_primary_l || DEFAULT_COLORS.color_primary_l;

  root.style.setProperty("--primary", `${h} ${s}% ${l}%`);
  root.style.setProperty("--ring", `${h} ${s}% ${l}%`);
  root.style.setProperty("--sidebar-primary", `${h} ${s}% ${isDark ? Math.max(Number(l) - 2, 30) : l}%`);
  root.style.setProperty("--sidebar-ring", `${h} ${s}% ${l}%`);

  // Accent derived from primary
  root.style.setProperty("--accent", `${h} 40% ${isDark ? "18" : "93"}%`);
  root.style.setProperty("--accent-foreground", `${h} 65% ${isDark ? "80" : "35"}%`);
  root.style.setProperty("--sidebar-accent", `${h} 30% ${isDark ? "18" : "93"}%`);
  root.style.setProperty("--sidebar-accent-foreground", `${h} 50% ${isDark ? "80" : "35"}%`);

  // Secondary
  const sh = branding.color_secondary_h || DEFAULT_COLORS.color_secondary_h;
  const ss = branding.color_secondary_s || DEFAULT_COLORS.color_secondary_s;
  const sl = branding.color_secondary_l || DEFAULT_COLORS.color_secondary_l;
  root.style.setProperty("--secondary", `${sh} ${ss}% ${isDark ? "18" : sl}%`);

  // Background
  const bh = branding.color_background_h || DEFAULT_COLORS.color_background_h;
  const bs = branding.color_background_s || DEFAULT_COLORS.color_background_s;
  const bl = branding.color_background_l || DEFAULT_COLORS.color_background_l;
  root.style.setProperty("--background", `${bh} ${bs}% ${isDark ? "8" : bl}%`);

  // Foreground
  const fh = branding.color_foreground_h || DEFAULT_COLORS.color_foreground_h;
  const fs = branding.color_foreground_s || DEFAULT_COLORS.color_foreground_s;
  const fl = branding.color_foreground_l || DEFAULT_COLORS.color_foreground_l;
  root.style.setProperty("--foreground", `${fh} ${fs}% ${isDark ? "96" : fl}%`);
}

export { DEFAULT_COLORS };
