import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface LocationPickerProps {
  latitude: string;
  longitude: string;
  locationText: string;
  onLatitudeChange: (v: string) => void;
  onLongitudeChange: (v: string) => void;
  onLocationTextChange: (v: string) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToLocation({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 15, { duration: 1 });
    }
  }, [lat, lng, map]);
  return null;
}

const LocationPicker = ({
  latitude,
  longitude,
  locationText,
  onLatitudeChange,
  onLongitudeChange,
  onLocationTextChange,
}: LocationPickerProps) => {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const lat = parseFloat(latitude) || 20.5937;
  const lng = parseFloat(longitude) || 78.9629;
  const hasCoords = !!latitude && !!longitude;

  const fetchGPS = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newLat = pos.coords.latitude.toFixed(6);
        const newLng = pos.coords.longitude.toFixed(6);
        onLatitudeChange(newLat);
        onLongitudeChange(newLng);
        setShowMap(true);
        // Reverse geocode
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${newLat}&lon=${newLng}&format=json`
          );
          const data = await res.json();
          if (data.display_name) {
            onLocationTextChange(data.display_name);
          }
        } catch {
          // ignore geocode failure
        }
        toast.success("GPS location captured!");
        setGpsLoading(false);
      },
      (err) => {
        toast.error("Failed to get location: " + err.message);
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleMapClick = async (clickLat: number, clickLng: number) => {
    onLatitudeChange(clickLat.toFixed(6));
    onLongitudeChange(clickLng.toFixed(6));
    // Reverse geocode
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${clickLat}&lon=${clickLng}&format=json`
      );
      const data = await res.json();
      if (data.display_name) {
        onLocationTextChange(data.display_name);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-3">
      {/* Location text field */}
      <div className="space-y-2">
        <Label htmlFor="locationText">Location / Address</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="locationText"
            placeholder="City, Area or use GPS below"
            value={locationText}
            onChange={(e) => onLocationTextChange(e.target.value)}
            className="pl-10"
            required
          />
        </div>
      </div>

      {/* GPS + Map toggle buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={fetchGPS}
          disabled={gpsLoading}
          className="flex-1"
        >
          {gpsLoading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Navigation className="w-4 h-4 mr-1" />
          )}
          {gpsLoading ? "Fetching..." : "Get GPS Location"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowMap(!showMap)}
          className="flex-1"
        >
          <MapPin className="w-4 h-4 mr-1" />
          {showMap ? "Hide Map" : "Pin on Map"}
        </Button>
      </div>

      {/* Lat/Lng editable fields */}
      {hasCoords && (
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Latitude</Label>
            <Input
              type="number"
              step="any"
              placeholder="Latitude"
              value={latitude}
              onChange={(e) => onLatitudeChange(e.target.value)}
              className="text-xs h-8"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Longitude</Label>
            <Input
              type="number"
              step="any"
              placeholder="Longitude"
              value={longitude}
              onChange={(e) => onLongitudeChange(e.target.value)}
              className="text-xs h-8"
            />
          </div>
        </div>
      )}

      {/* Interactive Map */}
      {showMap && (
        <div className="rounded-xl overflow-hidden border border-border h-[220px]">
          <MapContainer
            center={[lat, lng]}
            zoom={hasCoords ? 15 : 5}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {hasCoords && <Marker position={[lat, lng]} />}
            {hasCoords && <FlyToLocation lat={lat} lng={lng} />}
          </MapContainer>
          <p className="text-xs text-muted-foreground text-center py-1 bg-muted/50">
            Tap on the map to pin your location
          </p>
        </div>
      )}
    </div>
  );
};

export default LocationPicker;
