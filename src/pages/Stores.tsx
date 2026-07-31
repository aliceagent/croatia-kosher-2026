import { Suspense, lazy, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import storesData from "../../data/stores.json";
import { Banner, Icon, Notice } from "../components/ui";
import { brands, fold, products } from "../lib/data";
import type { Store, StoreCity } from "../lib/types";

const StoreMap = lazy(() => import("../components/StoreMap"));

const stores = storesData.stores as unknown as Store[];
const cities = storesData.cities as unknown as StoreCity[];
const healthFoodBrands = storesData.healthFoodBrands as string[];

const healthFoodCount = products.filter(
  (p) => p.brand && healthFoodBrands.includes(p.brand),
).length;
const croatianBrands = new Set(
  brands.filter((b) => b.origin === "croatian").map((b) => b.name),
);
const croatianCount = products.filter(
  (p) => p.brand && croatianBrands.has(p.brand),
).length;

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
  const [here, setHere] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [cityQuery, setCityQuery] = useState("");

  const city = cities.find((c) => c.name === cityName) ?? null;

  /** Near me: five closest shops, plus the closest bio&bio however far it is. */
  const nearest = useMemo(() => {
    if (!here) return null;
    const withDistance = stores
      .map((s) => ({ ...s, km: distanceKm(here, [s.lat, s.lon]) }))
      .sort((a, b) => a.km - b.km);
    return {
      closest: withDistance.slice(0, 5),
      bio: withDistance.find((s) => s.chain === "bio&bio") ?? null,
    };
  }, [here]);

  const cityStores = useMemo(
    () => (city ? stores.filter((s) => s.city === city.name) : []),
    [city],
  );

  const cityMatches = useMemo(() => {
    const q = fold(cityQuery.trim());
    if (!q) return cities.slice(0, 12);
    return cities.filter((c) => fold(c.name).includes(q)).slice(0, 12);
  }, [cityQuery]);

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
        setCityName(null);
        setLocating(false);
      },
      () => {
        setGeoError("Location permission was declined. Pick a city instead.");
        setLocating(false);
      },
      { timeout: 10000 },
    );
  };

  const mapStores = here && nearest ? nearest.closest : cityStores;

  return (
    <div style={{ paddingTop: 18 }}>
      <Banner name="stores" widths={[1400, 760]} ratio="1400 / 525">
        <h1 style={{ fontSize: "clamp(19px, 3.4vw, 27px)" }}>Where to buy</h1>
        <p>
          {stores.length.toLocaleString()} branches of the six chains the 2026
          list names, across {cities.length} towns.
        </p>
      </Banner>

      {/* The answer, before any list. Most of the list is not hard to find, and
          saying so is more useful than 1,032 rows of supermarket. */}
      <p style={{ marginTop: 0, fontSize: 16 }}>
        <strong>Most of the 2026 list is ordinary supermarket food.</strong>{" "}
        Around {croatianCount} entries are Croatian brands — Podravka, Zvijezda,
        Kandit, Koestlin, Franck — sold in any Konzum, Lidl, SPAR, Plodine or
        Kaufland in the country. Most of the rest are mainstream imports you will
        also find anywhere. Only two things are genuinely hard to track down.
      </p>

      <h2 className="section-title">The hard part</h2>
      <div className="grid-cats" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))" }}>
        <div className="cat-card" style={{ gap: 6 }}>
          <span className="cat-emoji" aria-hidden="true">🍷</span>
          <span className="cat-name">Kosher wine — one place</span>
          <p className="tiny muted" style={{ margin: 0 }}>
            No supermarket sells supervised kosher wine. All wine, grape juice,
            cognac and brandy need rabbinic supervision. It comes from the
            community in Zagreb.
          </p>
          <a
            className="btn btn-sm"
            style={{ marginTop: 6 }}
            href="https://www.google.com/maps/dir/?api=1&destination=45.8095,15.9700"
            target="_blank"
            rel="noreferrer"
          >
            Bet Israel, Mažuranićev trg 6
          </a>
        </div>

        <div className="cat-card" style={{ gap: 6 }}>
          <span className="cat-emoji" aria-hidden="true">🌱</span>
          <span className="cat-name">
            The German organic range — {healthFoodCount} entries
          </span>
          <p className="tiny muted" style={{ margin: 0 }}>
            GranoVita, Schneekoppe, Vitaquell, Demeter, Tartex, Provamel and
            Alpro fill a fifth of the list, and a normal supermarket does not
            carry them. bio&amp;bio is Croatia's health-food chain — but it has
            only <strong>21 branches, in 9 cities</strong>.
          </p>
          <Link
            className="btn btn-sm"
            style={{ marginTop: 6 }}
            to={`/browse?${healthFoodBrands.map((b) => `brand=${encodeURIComponent(b)}`).join("&")}`}
          >
            See those {healthFoodCount} products
          </Link>
        </div>

        <div className="cat-card" style={{ gap: 6 }}>
          <span className="cat-emoji" aria-hidden="true">⌕</span>
          <span className="cat-name">Needs a symbol on the package</span>
          <p className="tiny muted" style={{ margin: 0 }}>
            {products.filter((p) => p.kashrut.requiresHechsher).length} entries —
            Mlinar's bakery counter, every Vindija cheese, wine. No shop
            guarantees these: you have to look at the package in your hand.
          </p>
          <Link className="btn btn-sm" style={{ marginTop: 6 }} to="/browse?status=symbol">
            See those entries
          </Link>
        </div>
      </div>

      <div style={{ margin: "20px 0 4px" }}>
        <Notice kind="warn">
          <div>
            <strong>The list names chains, not stock.</strong> The 2026 list
            gives one shop hint — bio&amp;bio, Lidl, SPAR, Konzum, Plodine,
            Kaufland — with no per-product availability. Which branch carries
            what is <em>our guess from the kind of shop it is</em>, not
            information from the list. Check the shelf and the package.
          </div>
        </Notice>
      </div>

      {/* ------------------------------------------------------- near me --- */}
      <h2 className="section-title">Find a shop</h2>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={locate} disabled={locating}>
          {Icon.pin} {locating ? "Locating…" : "Shops near me"}
        </button>
        <input
          value={cityQuery}
          onChange={(e) => setCityQuery(e.target.value)}
          placeholder="or type a city…"
          aria-label="Search for a city"
          style={{
            flex: "1 1 180px", padding: "10px 14px", borderRadius: 10,
            border: "1px solid var(--border)", background: "var(--surface)",
            color: "var(--text)", fontSize: 16,
          }}
        />
      </div>

      {geoError && (
        <div style={{ marginBottom: 12 }}>
          <Notice kind="warn"><div>{geoError}</div></Notice>
        </div>
      )}

      <div className="chips" style={{ marginBottom: 16 }}>
        {cityMatches.map((c) => (
          <button
            key={c.slug}
            className={`chip ${city?.name === c.name ? "on" : ""}`}
            onClick={() => {
              setCityName(city?.name === c.name ? null : c.name);
              setHere(null);
            }}
            aria-pressed={city?.name === c.name}
          >
            {c.name}
            <span className="n">{c.count}</span>
            {c.healthFood > 0 && <span title="has a bio&bio">🌱</span>}
          </button>
        ))}
      </div>

      {mapStores.length > 0 && (
        <Suspense
          fallback={
            <div className="card" style={{ height: 380, display: "grid", placeItems: "center" }}>
              <span className="muted tiny">Loading map…</span>
            </div>
          }
        >
          <StoreMap stores={mapStores} here={here} />
        </Suspense>
      )}

      {nearest && (
        <>
          <h3 style={{ fontSize: 17, margin: "6px 0 10px" }}>The five closest</h3>
          <div className="plist">
            {nearest.closest.map((s) => (
              <StoreRow key={s.id} s={s} km={s.km} />
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            {nearest.bio ? (
              <Notice kind="info">
                <div>
                  <strong>
                    Nearest bio&amp;bio: {nearest.bio.km.toFixed(1)} km
                  </strong>{" "}
                  ({nearest.bio.city ?? nearest.bio.region}
                  {nearest.bio.street ? `, ${nearest.bio.street}` : ""}). That is
                  the shop most likely to carry the imported organic brands.
                </div>
              </Notice>
            ) : (
              <Notice kind="warn">
                <div>No bio&amp;bio anywhere near you — the chain has 21 branches
                  in the whole country. Buy the imported organic items when you
                  pass through a city that has one.</div>
              </Notice>
            )}
          </div>
        </>
      )}

      {city && (
        <>
          <h3 style={{ fontSize: 17, margin: "6px 0 6px" }}>
            {city.name} <span className="muted" style={{ fontWeight: 400 }}>
              · {city.count} shops · {city.region}
            </span>
          </h3>
          <p className="tiny muted" style={{ marginTop: 0 }}>
            {city.healthFood > 0 ? (
              <>
                <strong>{city.healthFood} bio&amp;bio</strong> here, so the
                imported organic range is reachable. A week's shopping is
                straightforward.
              </>
            ) : (
              <>
                <strong>No bio&amp;bio here.</strong> Everyday brands are fine,
                but bring the imported organic items with you or buy them in a
                city that has one.
              </>
            )}
          </p>
          <div className="chips" style={{ marginBottom: 12 }}>
            {Object.entries(city.chains).map(([chain, n]) => (
              <span className="tag" key={chain}>{chain} · {n}</span>
            ))}
          </div>
          <div className="plist">
            {cityStores
              .slice()
              .sort((a, b) => (a.chain === "bio&bio" ? -1 : b.chain === "bio&bio" ? 1 : 0))
              .slice(0, 40)
              .map((s) => <StoreRow key={s.id} s={s} />)}
          </div>
          {cityStores.length > 40 && (
            <p className="tiny muted" style={{ marginTop: 10 }}>
              Showing 40 of {cityStores.length}. Use “Shops near me” to sort by
              distance from where you actually are.
            </p>
          )}
        </>
      )}

      {!city && !nearest && (
        <p className="muted tiny">
          Pick a city or share your location. There are {stores.length.toLocaleString()}{" "}
          branches across {cities.length} towns — listing them all would not help
          anyone, so this only shows the ones near you.
        </p>
      )}

      <h2 className="section-title">Kosher wine &amp; the community</h2>
      <div className="card" style={{ padding: 16 }}>
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
        (ODbL), snapshot taken <strong>{storesData.snapshot}</strong>. Branches
        open and close and hours change — confirm before travelling. The map
        needs a connection; everything else on this page works offline.{" "}
        <Link to="/about">About this site</Link>
      </p>
    </div>
  );
}

function StoreRow({ s, km }: { s: Store; km?: number }) {
  return (
    <div className="prow">
      <div className="prow-main">
        <a
          className="prow-name"
          href={`https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=18/${s.lat}/${s.lon}`}
          target="_blank"
          rel="noreferrer"
        >
          {s.chain}
          {s.chain === "bio&bio" && " 🌱"}
        </a>
        <div className="prow-meta">
          {s.street && <span>{s.street}</span>}
          {s.city && <span>{s.city}</span>}
          <span className="tag">
            {s.openingHours ? s.openingHours : "hours unknown"}
          </span>
          {km !== undefined && <span className="tag">{km.toFixed(1)} km</span>}
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
}
