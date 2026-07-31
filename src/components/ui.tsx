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

/**
 * The Kosher Croatia mark: a map pin carrying a Star of David over the red
 * wave from the logo. Drawn as SVG rather than shipped as a raster so it stays
 * crisp at 16px in a browser tab and at 512px on a home screen, and so the
 * navy can follow the theme.
 */
const PIN_PATH =
  "M16 1.6C9.1 1.6 3.5 7.2 3.5 14.1c0 8.9 12.5 16.3 12.5 16.3s12.5-7.4 12.5-16.3C28.5 7.2 22.9 1.6 16 1.6z";

export function Logo({
  size = 28, title, tone = "dark",
}: {
  size?: number;
  title?: string;
  /**
   * "dark" draws a navy pin with a white star, for light backgrounds.
   * "light" inverts it for dark backgrounds like the header — without this the
   * star is white on a white pin and the mark reads as a featureless blob.
   */
  tone?: "dark" | "light";
}) {
  const pin = tone === "light" ? "#fff" : "var(--blue-700, #002869)";
  const inner = tone === "light" ? "#002869" : "#fff";
  const uid = tone === "light" ? "pinClipL" : "pinClipD";
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
      {/* The red wave, clipped to the pin exactly as in the logo. */}
      <g clipPath={`url(#${uid})`}>
        <path d="M1 21.4c5-2.6 9.5-2.6 15 0s10 2.6 15 0V32H1z" fill="#EA142B" />
        <path d="M1 24.3c5-2.4 9.5-2.4 15 0s10 2.4 15 0" stroke={inner}
          strokeWidth="1.1" fill="none" />
      </g>
      {/* Star of David: two triangles, legible down to favicon size. */}
      <path d="M16 6.4l4.5 7.8h-9zM16 18.9l-4.5-7.8h9z" fill={inner} />
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
