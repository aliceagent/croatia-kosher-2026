import { Link } from "react-router-dom";
import { Empty, ProductList } from "../components/ui";
import { categoryById, productById } from "../lib/data";
import { useStore } from "../lib/store";

export default function Favorites() {
  const { favorites, addMany, clearFavs } = useStore();
  const items = favorites
    .map((id) => productById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (!items.length) {
    return (
      <Empty title="No favourites yet">
        <p>
          Tap the ☆ on any product to keep it here. Favourites are stored on this
          device only — no account, nothing sent anywhere.
        </p>
        <p><Link className="btn btn-primary" to="/browse">Browse products</Link></p>
      </Empty>
    );
  }

  const byCategory = new Map<string, typeof items>();
  for (const p of items) {
    const arr = byCategory.get(p.category) ?? [];
    arr.push(p);
    byCategory.set(p.category, arr);
  }

  return (
    <div style={{ paddingTop: 18 }}>
      <h1 style={{ fontSize: 25, marginBottom: 6 }}>Favourites</h1>
      <p className="muted tiny">{items.length} saved on this device</p>

      <div className="no-print" style={{ display: "flex", gap: 8, margin: "14px 0 20px", flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={() => addMany(favorites)}>
          Add all to shopping list
        </button>
        <button
          className="btn"
          onClick={() => {
            if (confirm(`Remove all ${items.length} favourites? This cannot be undone.`)) {
              clearFavs();
            }
          }}
        >
          Clear all
        </button>
      </div>

      {[...byCategory.entries()].map(([catId, list]) => (
        <section key={catId}>
          <h2 className="section-title">
            {categoryById.get(catId)?.label} <span style={{ opacity: 0.6 }}>({list.length})</span>
          </h2>
          <ProductList items={list} />
        </section>
      ))}
    </div>
  );
}
