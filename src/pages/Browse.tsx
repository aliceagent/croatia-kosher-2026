import { useState } from "react";
import { Link } from "react-router-dom";
import { SearchBar } from "../components/SearchBar";
import { Empty, Notice, ProductList } from "../components/ui";
import { useFilters } from "../lib/useFilters";
import {
  brands, CATEGORY_EMOJI, fold, STATUS_FILTERS, TAG_LABELS,
} from "../lib/data";

const PAGE = 60;

export default function Browse() {
  const {
    state, results, facets, categories, availableTags, setQuery, toggle,
    clearAll, activeCount,
  } = useFilters();
  const [limit, setLimit] = useState(PAGE);
  const [brandQuery, setBrandQuery] = useState("");
  const [showBrands, setShowBrands] = useState(false);

  const shown = results.slice(0, limit);
  const brandList = brands
    .filter((b) => !brandQuery || fold(b.name).includes(fold(brandQuery)))
    .slice(0, showBrands ? 500 : 0);

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <SearchBar value={state.q} onChange={(v) => { setQuery(v); setLimit(PAGE); }} />
      </div>

      <div className="filters" style={{ margin: "16px 0 20px" }}>
        <div>
          <div className="fgroup-label">Kashrut status</div>
          <div className="chips">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                className={`chip ${state.status.includes(f.id) ? "on" : ""}`}
                onClick={() => toggle("status", f.id)}
                aria-pressed={state.status.includes(f.id)}
              >
                {f.label}
                <span className="n">{facets.status[f.id] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="fgroup-label">Category</div>
          <div className="chips">
            {categories.map((c) => (
              <button
                key={c.id}
                className={`chip ${state.cats.includes(c.id) ? "on" : ""}`}
                onClick={() => toggle("cats", c.id)}
                aria-pressed={state.cats.includes(c.id)}
              >
                <span aria-hidden="true">{CATEGORY_EMOJI[c.id]}</span>
                {c.label}
                <span className="n">{facets.cat[c.id] ?? 0}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="fgroup-label">Made in</div>
          <div className="chips">
            {(["croatian", "imported"] as const).map((o) => (
              <button
                key={o}
                className={`chip ${state.origin.includes(o) ? "on" : ""}`}
                onClick={() => toggle("origin", o)}
                aria-pressed={state.origin.includes(o)}
              >
                {o === "croatian" ? "🇭🇷 Croatian brand" : "🌍 Imported"}
                <span className="n">{facets.origin[o] ?? 0}</span>
              </button>
            ))}
            {availableTags.map((t) => (
              <button
                key={t}
                className={`chip ${state.tags.includes(t) ? "on" : ""}`}
                onClick={() => toggle("tags", t)}
                aria-pressed={state.tags.includes(t)}
              >
                {TAG_LABELS[t] ?? t}
                <span className="n">{facets.tag[t] ?? 0}</span>
              </button>
            ))}
            <button className="chip" onClick={() => setShowBrands((s) => !s)}>
              {showBrands ? "Hide brands" : `Brands (${brands.length})`}
            </button>
          </div>
        </div>

        {showBrands && (
          <div>
            <div className="fgroup-label">Brand</div>
            <input
              className="searchbar"
              style={{
                width: "100%", maxWidth: 320, padding: "8px 12px",
                borderRadius: 10, border: "1px solid var(--border)",
                background: "var(--surface)", color: "var(--text)",
                marginBottom: 8, fontSize: 14,
              }}
              placeholder="Filter brands…"
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
            />
            <div className="chips">
              {brandList.map((b) => (
                <button
                  key={b.id}
                  className={`chip ${state.brands.includes(b.name) ? "on" : ""}`}
                  onClick={() => toggle("brands", b.name)}
                  aria-pressed={state.brands.includes(b.name)}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <strong>{results.length.toLocaleString()}</strong>
        <span className="muted tiny">
          {results.length === 1 ? "product" : "products"}
          {state.q.trim() ? ` matching “${state.q}”` : ""}
        </span>
        {activeCount > 0 && (
          <button className="btn btn-sm" onClick={clearAll}>
            Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {state.status.includes("not-kosher") && (
        <div style={{ marginBottom: 12 }}>
          <Notice kind="danger">
            <div>
              These are the items the 2026 list marks <strong>not kosher</strong>.
              They are shown so you can recognise them, not to be bought.
            </div>
          </Notice>
        </div>
      )}

      {shown.length === 0 ? (
        <Empty title="No products match these filters">
          <p>
            {state.q.trim()
              ? "Absence from the list is not a ruling that something is not kosher."
              : "Try removing a filter."}{" "}
            <button className="btn btn-sm" onClick={clearAll}>Clear filters</button>
          </p>
        </Empty>
      ) : (
        <>
          <ProductList items={shown} />
          {results.length > limit && (
            <div style={{ textAlign: "center", marginTop: 18 }}>
              <button className="btn" onClick={() => setLimit((l) => l + PAGE)}>
                Show {Math.min(PAGE, results.length - limit)} more
              </button>
            </div>
          )}
        </>
      )}

      <p className="tiny muted" style={{ marginTop: 26 }}>
        Looking for something specific? <Link to="/guide">Read the kashrut guide</Link>{" "}
        to understand what each badge means before you rely on it.
      </p>
    </>
  );
}
