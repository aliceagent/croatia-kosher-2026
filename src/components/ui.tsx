import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import type { Product } from "../lib/types";
import {
  badgeFor, brandByName, categoryById, CATEGORY_EMOJI, displayName,
  secondaryName,
} from "../lib/data";
import { useStore } from "../lib/store";

/* ------------------------------------------------------------------ icons */

export const Icon = {
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" />
    </svg>
  ),
  star: (filled: boolean) => (
    <svg width="19" height="19" viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"} stroke="currentColor"
      strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z" />
    </svg>
  ),
  cart: (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.55L20.5 8H6" />
      <circle cx="10" cy="20" r="1.4" /><circle cx="17" cy="20" r="1.4" />
    </svg>
  ),
  plus: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  check: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 13 4 4L19 7" />
    </svg>
  ),
  x: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  moon: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </svg>
  ),
  back: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 6l-6 6 6 6" />
    </svg>
  ),
  pin: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  ),
};

/** The Star of David mark from the printed list's cover. */
export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path
        d="M16 3.2 21 12h-10zM16 28.8 11 20h10zM3.6 22.4 8.6 13.6l5 8.8zM28.4 22.4h-10l5-8.8zM3.6 9.6h10l-5 8.8zM28.4 9.6 23.4 18.4l-5-8.8z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ----------------------------------------------------------------- badges */

export function Badge({ product, size }: { product: Product; size?: "lg" }) {
  const b = badgeFor(product);
  return (
    <span className={`badge ${b.className} ${size === "lg" ? "lg" : ""}`}>
      <span aria-hidden="true">{b.icon}</span>
      {b.label}
    </span>
  );
}

/* ----------------------------------------------------------- row controls */

export function StarButton({ id }: { id: string }) {
  const { isFav, toggleFav } = useStore();
  const on = isFav(id);
  return (
    <button
      className={`star ${on ? "on" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFav(id);
      }}
      aria-pressed={on}
      aria-label={on ? "Remove from favourites" : "Save to favourites"}
      title={on ? "Remove from favourites" : "Save to favourites"}
    >
      {Icon.star(on)}
    </button>
  );
}

export function AddButton({ id }: { id: string }) {
  const { inList, addToList } = useStore();
  const on = inList(id);
  return (
    <button
      className={`addbtn ${on ? "on" : ""}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addToList(id);
      }}
      aria-label={on ? "Add another to shopping list" : "Add to shopping list"}
      title={on ? "On your list — tap to add another" : "Add to shopping list"}
    >
      {on ? Icon.check : Icon.plus}
    </button>
  );
}

/* -------------------------------------------------------------- product row */

export function ProductRow({ p }: { p: Product }) {
  const cat = categoryById.get(p.category);
  const second = secondaryName(p);
  return (
    <div className="prow">
      <StarButton id={p.id} />
      <div className="prow-main">
        <Link className="prow-name" to={`/product/${p.id}`}>
          {displayName(p)}
        </Link>
        <div className="prow-meta">
          {p.brand && <strong>{p.brand}</strong>}
          <span>
            {CATEGORY_EMOJI[p.category]} {cat?.label}
          </span>
          {p.sizes && <span>{p.sizes.join(" · ")}</span>}
          {p.scope === "all-varieties" && <span className="tag">All varieties</span>}
          {second && <span className="tiny" style={{ color: "var(--text-faint)" }}>{second}</span>}
        </div>
      </div>
      <div className="prow-side">
        <Badge product={p} />
        <AddButton id={p.id} />
      </div>
    </div>
  );
}

export function ProductList({ items }: { items: Product[] }) {
  return (
    <div className="plist">
      {items.map((p) => (
        <ProductRow key={p.id} p={p} />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------- primitives */

export function Notice({
  kind = "info", children,
}: {
  kind?: "info" | "warn" | "danger";
  children: ReactNode;
}) {
  return <div className={`notice notice-${kind}`}>{children}</div>;
}

export function CategoryCard({ id }: { id: string }) {
  const c = categoryById.get(id);
  if (!c) return null;
  return (
    <Link className="cat-card" to={`/category/${c.id}`}>
      <span className="cat-emoji" aria-hidden="true">{CATEGORY_EMOJI[c.id]}</span>
      <span className="cat-name">{c.label}</span>
      <span className="cat-count">{c.count} items</span>
    </Link>
  );
}

export function BrandTag({ name }: { name: string }) {
  const b = brandByName.get(name);
  if (!b) return <span className="tag">{name}</span>;
  return (
    <Link className="tag" to={`/brand/${b.id}`}>
      {b.name}
    </Link>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h3>{title}</h3>
      {children}
    </div>
  );
}
