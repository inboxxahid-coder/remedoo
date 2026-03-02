import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const hospitalIcon = new L.Icon({
  iconUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [0, -33],
});

const userIcon = new L.DivIcon({
  html: `<div style="width:14px;height:14px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 6px rgba(59,130,246,0.5)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  className: "",
});

interface Props {
  userLat: number;
  userLng: number;
  hospitals: { id: string; name: string; latitude: number; longitude: number; distance_km: number }[];
  formatDistance: (km: number) => string;
}

const NearbyHospitalsMapInner = ({ userLat, userLng, hospitals, formatDistance }: Props) => (
  <MapContainer
    center={[userLat, userLng]}
    zoom={12}
    scrollWheelZoom={false}
    dragging={false}
    zoomControl={false}
    attributionControl={false}
    style={{ height: "100%", width: "100%" }}
  >
    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <Marker position={[userLat, userLng]} icon={userIcon}>
      <Popup>You are here</Popup>
    </Marker>
    {hospitals.map((h) => (
      <Marker key={h.id} position={[h.latitude, h.longitude]} icon={hospitalIcon}>
        <Popup>
          <div className="text-xs font-semibold">{h.name}</div>
          <div className="text-[10px] text-muted-foreground">{formatDistance(h.distance_km)}</div>
        </Popup>
      </Marker>
    ))}
  </MapContainer>
);

export default NearbyHospitalsMapInner;
