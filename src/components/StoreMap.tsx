import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import type { Store } from "../lib/types";

/*
 * The map is the one part of the site that needs the network: tiles come from
 * OpenStreetMap and cannot be precached, so everything the map shows is also
 * available as text above it. It renders only for a chosen city or a near-me
 * result -- never all 1,032 branches at once.
 */

const CHAIN_COLOR: Record<string, string> = {
  "bio&bio": "#15803d",
  Konzum: "#1668c9",
  Lidl: "#14508f",
  SPAR: "#14508f",
  Plodine: "#14508f",
  Kaufland: "#14508f",
};

function pin(chain: string) {
  const color = CHAIN_COLOR[chain] ?? "#14508f";
  const big = chain === "bio&bio";
  return L.divIcon({
    className: "",
    html: `<span style="
      display:block;width:${big ? 20 : 14}px;height:${big ? 20 : 14}px;
      border-radius:50%;background:${color};
      border:${big ? 3 : 2}px solid #fff;
      box-shadow:0 1px 4px rgba(0,0,0,.45)"></span>`,
    iconSize: [big ? 20 : 14, big ? 20 : 14],
    iconAnchor: [big ? 10 : 7, big ? 10 : 7],
  });
}

function FitBounds({ stores, here }: { stores: Store[]; here: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    const pts: [number, number][] = stores.map((s) => [s.lat, s.lon]);
    if (here) pts.push(here);
    if (pts.length === 0) return;
    if (pts.length === 1) map.setView(pts[0], 14);
    else map.fitBounds(L.latLngBounds(pts).pad(0.15));
  }, [stores, here, map]);
  return null;
}

export default function StoreMap({
  stores, here, height = 380,
}: {
  stores: Store[];
  here?: [number, number] | null;
  height?: number;
}) {
  if (!stores.length) return null;
  return (
    <div
      className="card no-print"
      style={{ height, overflow: "hidden", padding: 0, marginBottom: 14 }}
    >
      <MapContainer
        center={[stores[0].lat, stores[0].lon]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <FitBounds stores={stores} here={here ?? null} />
        {here && (
          <Marker
            position={here}
            icon={L.divIcon({
              className: "",
              html: `<span style="display:block;width:16px;height:16px;border-radius:50%;
                background:#e8112d;border:3px solid #fff;
                box-shadow:0 0 0 4px rgba(232,17,45,.25)"></span>`,
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          >
            <Popup>You are here</Popup>
          </Marker>
        )}
        {stores.map((s) => (
          <Marker key={s.id} position={[s.lat, s.lon]} icon={pin(s.chain)}>
            <Popup>
              <strong>{s.chain}</strong>
              {s.street && <><br />{s.street}</>}
              {s.city && <><br />{s.city}</>}
              {s.openingHours && <><br /><span style={{ opacity: 0.75 }}>{s.openingHours}</span></>}
              <br />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`}
                target="_blank"
                rel="noreferrer"
              >
                Directions
              </a>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
