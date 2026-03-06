import { supabase } from "@/integrations/supabase/client";
import { getDistanceKm } from "@/hooks/useGeolocation";

export interface DistanceRange {
  id?: string;
  min_km: number;
  max_km: number;
  price: number;
  sort_order: number;
}

export interface AmbulancePricingConfig {
  service_enabled: boolean;
  service_type: string; // free | paid | conditional
  pricing_model: string; // flat | per_km | distance_range
  flat_price: number;
  base_fare: number;
  per_km_charge: number;
  emergency_surcharge: number;
  night_surcharge: number;
  minimum_charge: number;
  night_charge_enabled: boolean;
  night_charge_amount: number;
  night_charge_start: string;
  night_charge_end: string;
}

function isNightTime(startStr: string, endStr: string): boolean {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const [sh, sm] = startStr.split(":").map(Number);
  const [eh, em] = endStr.split(":").map(Number);
  const startMin = sh * 60 + (sm || 0);
  const endMin = eh * 60 + (em || 0);

  if (startMin > endMin) {
    // Overnight (e.g., 22:00 - 06:00)
    return currentMinutes >= startMin || currentMinutes < endMin;
  }
  return currentMinutes >= startMin && currentMinutes < endMin;
}

export function calculateAmbulancePrice(
  config: AmbulancePricingConfig,
  distanceKm: number,
  ranges: DistanceRange[]
): { price: number; nightCharge: number; total: number; matchedRange?: DistanceRange; breakdown: string } {
  if (config.service_type === "free") {
    return { price: 0, nightCharge: 0, total: 0, breakdown: "Free service" };
  }

  let price = 0;
  let matchedRange: DistanceRange | undefined;
  let breakdown = "";

  switch (config.pricing_model) {
    case "flat":
      price = config.flat_price;
      breakdown = `Flat price: ₹${price}`;
      break;

    case "per_km":
      price = config.base_fare + distanceKm * config.per_km_charge;
      price = Math.max(price, config.minimum_charge);
      breakdown = `Base ₹${config.base_fare} + ${distanceKm.toFixed(1)}km × ₹${config.per_km_charge} = ₹${price.toFixed(0)}`;
      break;

    case "distance_range": {
      const sorted = [...ranges].sort((a, b) => a.min_km - b.min_km);
      matchedRange = sorted.find(r => distanceKm >= r.min_km && distanceKm < r.max_km);
      if (!matchedRange && sorted.length > 0) {
        // If distance exceeds all ranges, use last range
        matchedRange = sorted[sorted.length - 1];
      }
      price = matchedRange?.price ?? 0;
      breakdown = matchedRange
        ? `Distance ${distanceKm.toFixed(1)}km → Range ${matchedRange.min_km}-${matchedRange.max_km}km: ₹${price}`
        : "No matching price range";
      break;
    }

    default:
      price = config.base_fare + distanceKm * config.per_km_charge;
      breakdown = `₹${price.toFixed(0)}`;
  }

  let nightCharge = 0;
  if (config.night_charge_enabled && isNightTime(config.night_charge_start, config.night_charge_end)) {
    nightCharge = config.night_charge_amount;
  }

  return {
    price: Math.round(price),
    nightCharge,
    total: Math.round(price + nightCharge),
    matchedRange,
    breakdown,
  };
}

export async function getProviderPricingConfig(
  providerType: "hospital" | "lab",
  providerId: string
): Promise<{ config: AmbulancePricingConfig | null; ranges: DistanceRange[] }> {
  const table = providerType === "hospital" ? "hospital_ambulance_config" : "lab_ambulance_config";
  const idCol = providerType === "hospital" ? "hospital_id" : "lab_id";

  const { data: cfg } = await supabase
    .from(table as any)
    .select("*")
    .eq(idCol, providerId)
    .maybeSingle();

  if (!cfg) return { config: null, ranges: [] };

  const c = cfg as any;
  const config: AmbulancePricingConfig = {
    service_enabled: c.service_enabled ?? false,
    service_type: c.service_type ?? "free",
    pricing_model: c.pricing_model ?? "per_km",
    flat_price: c.flat_price ?? 0,
    base_fare: c.base_fare ?? 0,
    per_km_charge: c.per_km_charge ?? 0,
    emergency_surcharge: c.emergency_surcharge ?? 0,
    night_surcharge: c.night_surcharge ?? 0,
    minimum_charge: c.minimum_charge ?? 0,
    night_charge_enabled: c.night_charge_enabled ?? false,
    night_charge_amount: c.night_charge_amount ?? 0,
    night_charge_start: c.night_charge_start ?? "22:00",
    night_charge_end: c.night_charge_end ?? "06:00",
  };

  const rangeCol = providerType === "hospital" ? "hospital_id" : "lab_id";
  const { data: ranges } = await supabase
    .from("ambulance_distance_ranges" as any)
    .select("*")
    .eq(rangeCol, providerId)
    .order("sort_order", { ascending: true });

  return {
    config,
    ranges: ((ranges as any[]) || []).map((r: any) => ({
      id: r.id,
      min_km: r.min_km,
      max_km: r.max_km,
      price: r.price,
      sort_order: r.sort_order,
    })),
  };
}
