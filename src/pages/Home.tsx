import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";
import { SearchBar } from "../components/SearchBar";
import { Banner, CategoryCard, Disclaimer, Empty, Notice, ProductList } from "../components/ui";
import { categories, productById, products, search } from "../lib/data";
import { useStore } from "../lib/store";

const POPULAR = [
  "chocolate", "Milka", "Nutella", "coffee", "Barilla", "tofu", "salmon",
  "hummus", "Kinder", "olive oil",
];

export default function Home() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { recent } = useStore();
  const hits = q.trim() ? search(q).slice(0, 40) : [];
  const recentProducts = recent
    .map((id) => productById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, 5);

  return (
    <>
      {/* The page is search-first, so the heading is for screen readers and
          document structure rather than for sighted users. */}
      <div style={{ paddingTop: 16 }}>
        <Banner name="hero" widths={[1600, 900]} ratio="1600 / 534" priority>
          <h1 style={{ fontSize: "clamp(20px, 4vw, 32px)" }}>
            Kosher food in Croatia
          </h1>
          <p>
            Search the 2026 list — {products.length.toLocaleString()} products,
            in Croatian, English, German and Hebrew. Works offline.
          </p>
        </Banner>
      </div>
      <SearchBar
        hero
        autoFocus
        value={q}
        onChange={setQ}
        placeholder="Search a product, brand, or what's on the label…"
      />

      {q.trim() ? (
        hits.length ? (
          <>
            <p className="tiny muted" style={{ margin: "2px 0 12px" }}>
              {hits.length === 40 ? "Top 40 matches" : `${hits.length} match${hits.length === 1 ? "" : "es"}`}
              {" · "}
              <button
                className="btn btn-sm"
                style={{ padding: "2px 8px" }}
                onClick={() => navigate(`/browse?q=${encodeURIComponent(q)}`)}
              >
                Refine with filters
              </button>
            </p>
            <ProductList items={hits} />
          </>
        ) : (
          <Empty title="Nothing matching that in the 2026 list">
            <img
              className="empty-art"
              src="/img/empty-search-380.webp"
              alt=""
              loading="lazy"
              decoding="async"
              width={380}
              height={380}
            />
            <Notice kind="warn">
              <div>
                <strong>Not finding it does not mean it is not kosher.</strong> The
                list covers what the community checked and approved for 2026 — a
                product can be absent simply because nobody submitted it. Ask{" "}
                <a href="mailto:ured@bet-israel.com">Bet Israel</a> if you need a
                ruling on something specific.
              </div>
            </Notice>
            <p style={{ marginTop: 16 }}>
              Try a different spelling, the brand name, or{" "}
              <Link to="/browse">browse by category</Link>.
            </p>
          </Empty>
        )
      ) : (
        <>
          <div className="chips" style={{ marginBottom: 4 }}>
            {POPULAR.map((t) => (
              <button key={t} className="chip" onClick={() => setQ(t)}>
                {t}
              </button>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <Disclaimer />
          </div>

          <Notice kind="info">
            <div>
              <strong>{products.length.toLocaleString()} products</strong> from the
              2026 kosher list of Croatia, authorised by Chief Rabbi Dr. Kotel
              Da-Don. Search in Croatian, English, German or Hebrew — accents
              optional, so <em>cokolada</em> finds <em>čokolada</em>.{" "}
              <Link to="/guide">What the badges mean →</Link>
            </div>
          </Notice>

          {recentProducts.length > 0 && (
            <>
              <h2 className="section-title">Recently viewed</h2>
              <ProductList items={recentProducts} />
            </>
          )}

          <h2 className="section-title">Browse by category</h2>
          <div className="grid-cats">
            {categories.map((c) => (
              <CategoryCard key={c.id} id={c.id} />
            ))}
          </div>

          <h2 className="section-title">Before you shop</h2>
          <div className="grid-cats">
            <Link className="cat-card" to="/guide">
              <span className="cat-emoji" aria-hidden="true">📖</span>
              <span className="cat-name">Kashrut guide</span>
              <span className="cat-count">What each badge means</span>
            </Link>
            <Link className="cat-card" to="/stores">
              <span className="cat-emoji" aria-hidden="true">🗺️</span>
              <span className="cat-name">Where to buy</span>
              <span className="cat-count">1,032 shops across Croatia</span>
            </Link>
            <Link className="cat-card" to="/category/fish">
              <span className="cat-emoji" aria-hidden="true">🐟</span>
              <span className="cat-name">Fish identifier</span>
              <span className="cat-count">Croatian ↔ English names</span>
            </Link>
            <Link className="cat-card" to="/category/alcohol">
              <span className="cat-emoji" aria-hidden="true">🍷</span>
              <span className="cat-name">Wine &amp; spirits</span>
              <span className="cat-count">Includes what is not kosher</span>
            </Link>
          </div>
        </>
      )}
    </>
  );
}
