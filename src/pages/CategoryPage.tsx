import { Link, useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { SearchBar } from "../components/SearchBar";
import { Banner, Empty, Icon, Notice, ProductList } from "../components/ui";
import {
  categoryById, CATEGORY_EMOJI, displayName, fold, products, statusOrder,
} from "../lib/data";

const CATEGORY_BANNER: Record<
  string,
  { name: string; widths: [number, number]; ratio: string }
> = {
  alcohol: { name: "alcohol", widths: [1400, 760], ratio: "1400 / 700" },
};

export default function CategoryPage() {
  const { id } = useParams();
  const cat = id ? categoryById.get(id) : undefined;
  const [q, setQ] = useState("");

  const items = useMemo(() => {
    if (!cat) return [];
    const all = products.filter((p) => p.category === cat.id);
    const f = fold(q.trim());
    const filtered = f
      ? all.filter((p) =>
          fold(
            [p.names.en, p.names.hr, p.brand, p.hebrew, ...(p.aliases || [])]
              .filter(Boolean)
              .join(" "),
          ).includes(f),
        )
      : all;
    return filtered.sort((a, b) => {
      const s = statusOrder(a) - statusOrder(b);
      if (s !== 0) return s;
      return fold(displayName(a)).localeCompare(fold(displayName(b)));
    });
  }, [cat, q]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const p of items) {
      const key = p.brand || p.subheading || "Other";
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [items]);

  if (!cat) {
    return (
      <Empty title="Category not found">
        <p><Link to="/browse">Browse all products</Link></p>
      </Empty>
    );
  }

  return (
    <div style={{ paddingTop: 16 }}>
      <Link className="btn btn-sm no-print" to="/browse">{Icon.back} All categories</Link>

      {/* Only the two sections with their own illustration get a banner; the
          rest keep the compact heading so browsing stays fast. */}
      {CATEGORY_BANNER[cat.id] ? (
        <div style={{ marginTop: 14 }}>
          <Banner
            name={CATEGORY_BANNER[cat.id].name}
            widths={CATEGORY_BANNER[cat.id].widths}
            ratio={CATEGORY_BANNER[cat.id].ratio}
          >
            <h1 style={{ fontSize: "clamp(19px, 3.4vw, 27px)" }}>{cat.label}</h1>
            <p>
              {cat.count} entries · usually the {cat.aisle} aisle
            </p>
          </Banner>
        </div>
      ) : (
        <>
          <h1 style={{ fontSize: 26, margin: "14px 0 4px" }}>
            <span aria-hidden="true">{CATEGORY_EMOJI[cat.id]}</span> {cat.label}
          </h1>
          <p className="muted tiny" style={{ marginTop: 0 }}>
            {cat.count} entries · usually the <strong>{cat.aisle}</strong> aisle
          </p>
        </>
      )}

      {cat.id === "alcohol" && (
        <div style={{ margin: "14px 0" }}>
          <Notice kind="danger">
            <div>
              <strong>Read this before buying any alcohol.</strong> The 2026 list
              contains <em>no</em> wine, grape juice, cognac or brandy — those are
              forbidden without the supervision of a rabbinic authority. Items
              below marked <em>not kosher</em> are listed so you can recognise
              them. Kosher wine is available from the Bet Israel community in
              Zagreb.
            </div>
          </Notice>
        </div>
      )}

      {cat.id === "fish" && (
        <figure className="figure" style={{ marginTop: 14 }}>
          <img
            src="/img/fish-1400.webp"
            srcSet="/img/fish-760.webp 760w, /img/fish-1400.webp 1400w"
            sizes="(max-width: 1120px) 100vw, 1120px"
            alt="Six kosher Adriatic fish shown side on and labelled: sea bass, gilthead bream, sardine, mackerel, tuna and trout."
            loading="lazy"
            decoding="async"
            width={1400}
            height={1025}
          />
          <figcaption>
            Six of the kosher species on the 2026 list. Croatian names are on
            each product below — useful when reading a fish-market board.
          </figcaption>
        </figure>
      )}

      {cat.id === "fish" && (
        <div style={{ margin: "14px 0" }}>
          <Notice kind="info">
            <div>
              These are <strong>kosher species</strong> — useful for reading a
              Croatian fish-market board. A kosher species still has to be sold
              and prepared acceptably; smoked, marinated and processed fish
              additionally depend on the producer, which is why specific
              producers are listed separately here.
            </div>
          </Notice>
        </div>
      )}

      {cat.id === "dairy" && (
        <div style={{ margin: "14px 0" }}>
          <Notice kind="warn">
            <div>
              Everything in this section is <strong>dairy and not Chalav
              Yisrael</strong>. The cheeses are approved only when the package
              carries a kosher symbol.
            </div>
          </Notice>
        </div>
      )}

      <div style={{ margin: "16px 0" }}>
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder={`Search within ${cat.label.toLowerCase()}…`}
        />
      </div>

      {items.length === 0 ? (
        <Empty title="Nothing here matches that">
          <button className="btn btn-sm" onClick={() => setQ("")}>Clear search</button>
        </Empty>
      ) : groups.length > 1 && !q ? (
        groups.map(([name, list]) => (
          <section key={name}>
            <h2 className="section-title">
              {name} <span style={{ opacity: 0.6 }}>({list.length})</span>
            </h2>
            <ProductList items={list} />
          </section>
        ))
      ) : (
        <ProductList items={items} />
      )}
    </div>
  );
}
