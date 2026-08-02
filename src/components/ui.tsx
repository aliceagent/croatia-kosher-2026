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
  speech: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 12a7 7 0 0 1-7 7H8l-4 3v-4.6A7 7 0 0 1 4 12a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7z" />
      <path d="M9 11h6M9 14h4" />
    </svg>
  ),
  grid: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
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

/**
 * The Kosher Croatia mark: a map pin holding a Star of David flanked by a
 * menorah and a fork, over the red wave, following the logo artwork.
 *
 * Drawn as SVG rather than shipped as a raster so it stays crisp from a 16px
 * browser tab to a 512px home-screen icon, and so it can invert for the navy
 * header. `detail="simple"` drops the menorah and fork: below about 24px they
 * collapse into noise and only the star still reads.
 */
const PIN_PATH =
  "M16 1.4C9 1.4 3.3 7.1 3.3 14.1c0 9 12.7 16.5 12.7 16.5s12.7-7.5 12.7-16.5C28.7 7.1 23 1.4 16 1.4z";
const STAR_PATH =
  "M16 6.6l3.64 6.3h-7.28zM16 15.6l-3.64-6.3h7.28z";
const WAVE_PATH = "M1 21.6c5-2.7 9.6-2.7 15 0s10 2.7 15 0V32H1z";
const WAVE_LINE = "M1.5 24.6c5-2.4 9.6-2.4 15 0s10 2.4 15 0";

export function Logo({
  size = 28, title, tone = "dark", detail = "full",
}: {
  size?: number;
  title?: string;
  /**
   * "dark" is a navy pin with white contents, for light backgrounds.
   * "light" inverts it for the navy header — without this the white contents
   * sit on a white pin and the mark reads as a featureless blob.
   */
  tone?: "dark" | "light";
  detail?: "full" | "simple";
}) {
  const pin = tone === "light" ? "#fff" : "var(--blue-700, #002869)";
  const ink = tone === "light" ? "#002869" : "#fff";
  const uid = `pin-${tone}-${detail}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
    >
      <defs>
        <clipPath id={uid}>
          <path d={PIN_PATH} />
        </clipPath>
      </defs>
      <path d={PIN_PATH} fill={pin} />
      <g clipPath={`url(#${uid})`}>
        <path d={WAVE_PATH} fill="#EA142B" />
        <path d={WAVE_LINE} stroke={ink} strokeWidth="1" fill="none" />
      </g>
      <path d={STAR_PATH} fill={ink} />
      {detail === "full" && (
        <g stroke={ink} fill="none" strokeWidth="0.85" strokeLinecap="round">
          {/* Menorah */}
          <path d="M6.4 12.4v1.9M7.6 11.6v2.7M8.8 11.1v3.2M10 11.6v2.7M11.2 12.4v1.9" />
          <path d="M8.8 14.3v2.1M7.3 16.6h3" strokeWidth="0.95" />
          {/* Fork */}
          <path d="M21 11.2v2.1M22.4 11.2v2.1M23.8 11.2v2.1" />
          <path d="M21 13.3h2.8M22.4 13.3v3.3" strokeWidth="0.95" />
        </g>
      )}
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
      {on ? Icon.cart : Icon.plus}
    </button>
  );
}

/**
 * The two actions on a product page, spelled out.
 *
 * As bare icons the star and the add button read as two states of one control
 * — especially when the add button shows a tick, which looks like "selected"
 * rather than "on your shopping list". They do different things, so they say
 * which.
 */
export function ProductActions({ id }: { id: string }) {
  const { isFav, toggleFav, addToList, activeList } = useStore();
  const saved = isFav(id);
  const onList = activeList.items.find((i) => i.productId === id);

  return (
    <div className="pactions no-print">
      <button
        className={`btn ${saved ? "on" : ""}`}
        onClick={() => toggleFav(id)}
        aria-pressed={saved}
      >
        {Icon.star(saved)}
        {saved ? "Saved" : "Save to favourites"}
      </button>
      <button
        className={`btn ${onList ? "on" : ""}`}
        onClick={() => addToList(id)}
      >
        {Icon.cart}
        {onList
          ? `On your list${onList.qty > 1 ? ` (${onList.qty})` : ""} — add another`
          : "Add to shopping list"}
      </button>
    </div>
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

export const SOURCE_PDF =
  "https://www.bet-israel.com/wp/wp-content/uploads/2026/01/THE-2026-KOSHER-LIST-OF-CROATIA.pdf";

/**
 * The site-wide disclaimer. This is the most important text on the site, so it
 * is never dismissible and never abbreviated away: the data here was
 * transcribed by a machine and checked by nobody.
 */
export function Disclaimer({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="tiny" style={{ margin: 0 }}>
        <strong>Not independently verified.</strong> Built by Jonathan Caras
        (@madcapslaugh) and Claude Code from the{" "}
        <a href={SOURCE_PDF} target="_blank" rel="noreferrer">original PDF</a>.
        A G-d fearing Jew will contact Chabad and confirm the accuracy of this
        list before making any purchases.
      </p>
    );
  }
  return (
    <Notice kind="danger">
      <div>
        <strong>None of the information on this site has been independently
        verified.</strong>{" "}
        It was transcribed automatically from the{" "}
        <a href={SOURCE_PDF} target="_blank" rel="noreferrer">
          original 2026 PDF published by Bet Israel
        </a>{" "}
        and built by Jonathan Caras (
        <a href="https://x.com/madcapslaugh" target="_blank" rel="noreferrer">
          @madcapslaugh
        </a>
        ) and Claude Code. A G-d fearing Jew will contact Chabad and confirm the
        accuracy of this list before making any purchases.
      </div>
    </Notice>
  );
}

/**
 * Illustrated page banner. Images are decorative, so they carry an empty alt
 * and any meaning stays in the heading beside them. They are lazy by default
 * and never block first paint.
 */
export function Banner({
  name, alt = "", widths, ratio, priority, children,
}: {
  name: string;
  alt?: string;
  widths: [number, number];
  ratio: string;
  priority?: boolean;
  children?: ReactNode;
}) {
  const [big, small] = widths;
  return (
    <div className="banner" style={{ aspectRatio: ratio }}>
      <img
        src={`/img/${name}-${big}.webp`}
        srcSet={`/img/${name}-${small}.webp ${small}w, /img/${name}-${big}.webp ${big}w`}
        sizes="(max-width: 1120px) 100vw, 1120px"
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
      />
      {children && <div className="banner-overlay">{children}</div>}
    </div>
  );
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
