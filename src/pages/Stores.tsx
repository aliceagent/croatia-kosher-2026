import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import storesRaw from "../../data/stores.json";
import { Icon, Notice } from "../components/ui";
import { fold } from "../lib/data";
import type { Store } from "../lib/types";

const stores = storesRaw as unknown as Store[];

const CHAINS = ["Konzum", "Lidl", "SPAR", "Plodine", "Kaufland", "bio&bio"];

/** Cities with a Jewish-community connection or enough branches to matter. */
const FEATURED_CITIES = [
  "Zagreb", "Split", "Rijeka", "Osijek", "Zadar", "Dubrovnik", "Pula", "Varaždin",
];

function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function Stores() {
  const [chain, setChain] = useState<string[]>([]);
  const [city, setCity] = useState("");
  const [here, setHere] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const cities = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stores) {
      if (!s.city) continue;
      counts.set(s.city, (counts.get(s.city) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, []);

  const results = useMemo(() => {
    const f = fold(city.trim());
    let list = stores.filter((s) => {
      if (chain.length && !chain.includes(s.chain)) return false;
      if (f && !fold(`${s.city ?? ""} ${s.name} ${s.street ?? ""}`).includes(f)) return false;
      return true;
    });
    if (here) {
      list = [...list]
        .map((s) => ({ s, d: distanceKm(here, [s.lat, s.lon]) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 60)
        .map(({ s, d }) => ({ ...s, _d: d }) as Store & { _d: number });
    }
    return list;
  }, [chain, city, here]);

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoError("This browser cannot share your location.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setHere([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setGeoError("Location permission was declined. Search by city instead.");
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  return (
    <div style={{ paddingTop: 18 }}>
      <h1 style={{ fontSize: 25, marginBottom: 6 }}>Where to buy</h1>
      <p className="muted tiny">
        {stores.length.toLocaleString()} branches of the six chains named in the
        2026 list, across {cities.length} towns and cities.
      </p>

      <div style={{ margin: "16px 0" }}>
        <Notice kind="warn">
          <div>
            <strong>The list names these chains, not which shop stocks what.</strong>{" "}
            The 2026 list gives one shop hint — <em>bio&amp;bio, Lidl, Spar, Konzum,
            Plodine, Kaufland</em> — with no per-product availability. Use this to
            find a shop; check the shelf and the package for the rest.
            bio&amp;bio is the health-food chain most likely to carry the imported
            German organic brands that fill much of the list.
          </div>
        </Notice>
      </div>

      <div className="filters" style={{ marginBottom: 18 }}>
        <div>
          <div className="fgroup-label">Chain</div>
          <div className="chips">
            {CHAINS.map((c) => {
              const n = stores.filter((s) => s.chain === c).length;
              return (
                <button
                  key={c}
                  className={`chip ${chain.includes(c) ? "on" : ""}`}
                  onClick={() =>
                    setChain((prev) =>
                      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
                    )
                  }
                  aria-pressed={chain.includes(c)}
                >
                  {c} <span className="n">{n}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="fgroup-label">City</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <input
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setHere(null);
              }}
              placeholder="Type a city or street…"
              aria-label="Search by city or street"
              style={{
                flex: "1 1 220px", padding: "10px 14px", borderRadius: 10,
                border: "1px solid var(--border)", background: "var(--surface)",
                color: "var(--text)", fontSize: 16,
              }}
            />
            <button className="btn" onClick={locate} disabled={locating}>
              {Icon.pin} {locating ? "Locating…" : here ? "Near me ✓" : "Near me"}
            </button>
          </div>
          <div className="chips">
            {FEATURED_CITIES.map((c) => (
              <button
                key={c}
                className={`chip ${fold(city) === fold(c) ? "on" : ""}`}
                onClick={() => {
                  setCity(fold(city) === fold(c) ? "" : c);
                  setHere(null);
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {geoError && (
        <div style={{ marginBottom: 14 }}>
          <Notice kind="warn"><div>{geoError}</div></Notice>
        </div>
      )}

      <p className="tiny muted">
        {results.length.toLocaleString()} shop{results.length === 1 ? "" : "s"}
        {here ? " — nearest first" : ""}
      </p>

      <div className="plist" style={{ marginTop: 10 }}>
        {results.slice(0, 200).map((s) => {
          const d = (s as Store & { _d?: number })._d;
          return (
            <div className="prow" key={s.id}>
              <div className="prow-main">
                <a
                  className="prow-name"
                  href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=18/${s.lat}/${s.lon}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.name}
                </a>
                <div className="prow-meta">
                  <strong>{s.chain}</strong>
                  {s.city && <span>{s.city}</span>}
                  {s.street && <span>{s.street}</span>}
                  {s.openingHours && <span className="tag">{s.openingHours}</span>}
                  {d !== undefined && <span className="tag">{d.toFixed(1)} km</span>}
                </div>
              </div>
              <div className="prow-side">
                <a
                  className="btn btn-sm"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {results.length > 200 && (
        <p className="tiny muted" style={{ marginTop: 12 }}>
          Showing the first 200 — narrow by chain or city, or use “Near me”.
        </p>
      )}

      <h2 className="section-title">Kosher wine &amp; the community</h2>
      <div className="card" style={{ padding: 16 }}>
        <p style={{ marginTop: 0 }}>
          No supermarket in Croatia sells supervised kosher wine. The 2026 list is
          explicit: all wine, grape juice, cognac and brandy require rabbinic
          supervision. Kosher wine is available directly from the Jewish community.
        </p>
        <p style={{ marginBottom: 0 }}>
          <strong>Židovska vjerska zajednica „Bet Israel"</strong>
          <br />
          Mažuranićev trg 6, 10000 Zagreb
          <br />
          <a href="tel:+38514851008">+385 (1) 48 51 008</a> ·{" "}
          <a href="mailto:ured@bet-israel.com">ured@bet-israel.com</a> ·{" "}
          <a href="https://www.bet-israel.com" target="_blank" rel="noreferrer">
            bet-israel.com
          </a>
        </p>
      </div>

      <p className="tiny muted" style={{ marginTop: 20 }}>
        Shop locations from{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          OpenStreetMap contributors
        </a>{" "}
        (ODbL), snapshot taken for this build. Opening hours and branches change —
        confirm before travelling. <Link to="/about">About this site</Link>
      </p>
    </div>
  );
}
