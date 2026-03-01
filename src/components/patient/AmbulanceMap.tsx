import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface AmbulanceMapProps {
  userLat: number;
  userLng: number;
  ambulanceLat?: number | null;
  ambulanceLng?: number | null;
  ambulanceInfo?: string;
}

const AmbulanceMap = ({ userLat, userLng, ambulanceLat, ambulanceLng, ambulanceInfo }: AmbulanceMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const ambMarkerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    const initMap = async () => {
      const L = (await import("leaflet")).default;

      if (cancelled || !mapRef.current) return;
      if (mapInstanceRef.current) return;

      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current).setView([userLat, userLng], 14);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      // User marker
      const userIcon = L.divIcon({
        html: `<div style="width:20px;height:20px;border-radius:50%;background:hsl(168,72%,40%);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        className: "",
      });
      L.marker([userLat, userLng], { icon: userIcon }).addTo(map).bindPopup("📍 Your Location");

      // Ambulance marker
      if (ambulanceLat && ambulanceLng) {
        const ambIcon = L.divIcon({
          html: `<div style="font-size:24px;text-shadow:0 2px 4px rgba(0,0,0,0.3);">🚑</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          className: "",
        });
        ambMarkerRef.current = L.marker([ambulanceLat, ambulanceLng], { icon: ambIcon })
          .addTo(map)
          .bindPopup(ambulanceInfo || "Ambulance");

        const bounds = L.latLngBounds([[userLat, userLng], [ambulanceLat, ambulanceLng]]);
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [userLat, userLng]);

  // Update ambulance marker position on change
  useEffect(() => {
    if (!mapInstanceRef.current || !ambulanceLat || !ambulanceLng) return;

    const updateMarker = async () => {
      const L = (await import("leaflet")).default;

      if (ambMarkerRef.current) {
        ambMarkerRef.current.setLatLng([ambulanceLat, ambulanceLng]);
      } else {
        const ambIcon = L.divIcon({
          html: `<div style="font-size:24px;text-shadow:0 2px 4px rgba(0,0,0,0.3);">🚑</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          className: "",
        });
        ambMarkerRef.current = L.marker([ambulanceLat, ambulanceLng], { icon: ambIcon })
          .addTo(mapInstanceRef.current)
          .bindPopup(ambulanceInfo || "Ambulance");
      }
    };
    updateMarker();
  }, [ambulanceLat, ambulanceLng, ambulanceInfo]);

  return (
    <div
      ref={mapRef}
      className="w-full h-48 rounded-xl overflow-hidden border border-border"
      style={{ zIndex: 0 }}
    />
  );
};

export default AmbulanceMap;
