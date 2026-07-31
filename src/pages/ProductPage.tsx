import { Link, useParams } from "react-router-dom";
import { useEffect } from "react";
import {
  AddButton, Badge, BrandTag, Empty, Icon, Notice, ProductList, StarButton,
} from "../components/ui";
import {
  badgeFor, categoryById, CATEGORY_EMOJI, displayName, products, TAG_LABELS,
} from "../lib/data";
import { productById } from "../lib/data";
import { useStore } from "../lib/store";

export default function ProductPage() {
  const { id } = useParams();
  const p = id ? productById.get(id) : undefined;
  const { pushRecent } = useStore();

  useEffect(() => {
    if (p) pushRecent(p.id);
  }, [p, pushRecent]);

  useEffect(() => {
    if (!p) return;
    const prev = document.title;
    document.title = `${displayName(p)} — ${badgeFor(p).label} | Kosher Croatia 2026`;
    return () => {
      document.title = prev;
    };
  }, [p]);

  if (!p) {
    return (
      <Empty title="Product not found">
        <p><Link to="/browse">Browse all products</Link></p>
      </Empty>
    );
  }

  const cat = categoryById.get(p.category);
  const b = badgeFor(p);
  const related = products
    .filter((x) => x.id !== p.id && x.category === p.category &&
      (p.brand ? x.brand === p.brand : true))
    .slice(0, 8);

  return (
    <article style={{ paddingTop: 16 }}>
      <Link className="btn btn-sm no-print" to={`/category/${p.category}`}>
        {Icon.back} {cat?.label}
      </Link>

      <header style={{ margin: "16px 0 18px" }}>
        <h1 style={{ fontSize: 27, marginBottom: 8 }}>{displayName(p)}</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Badge product={p} size="lg" />
          {p.scope === "all-varieties" && (
            <span className="tag">Applies to all varieties</span>
          )}
          {p.tags?.map((t) => (
            <span className="tag" key={t}>{TAG_LABELS[t] ?? t}</span>
          ))}
        </div>
      </header>

      <div className="no-print" style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <span className="btn" style={{ padding: 0, border: "none", background: "none" }}>
          <StarButton id={p.id} />
        </span>
        <span className="btn" style={{ padding: 0, border: "none", background: "none" }}>
          <AddButton id={p.id} />
        </span>
        <span className="tiny muted" style={{ alignSelf: "center" }}>
          Star it, or add it to your shopping list
        </span>
      </div>

      {/* The single most important sentence on the page. */}
      <Notice
        kind={
          p.kashrut.status === "not-kosher" ? "danger"
            : p.kashrut.requiresHechsher || p.kashrut.status === "conditional" ? "warn"
            : "info"
        }
      >
        <div>
          <strong>{b.label}.</strong> {b.explain}
          {p.kashrut.note && <> {p.kashrut.note}.</>}
        </div>
      </Notice>

      {p.kashrut.status === "not-kosher" && p.kashrut.requiresHechsher && (
        <div style={{ marginTop: 10 }}>
          <Notice kind="danger">
            <div>
              The list marks this <strong>not kosher</strong> as a general category.
              It is acceptable only where a bottle carries a kosher symbol. All
              wine, grape juice, cognac and brandy require rabbinic supervision —
              kosher wine is available from the Bet Israel community in Zagreb.
            </div>
          </Notice>
        </div>
      )}

      {!p.kashrut.explicit && (
        <p className="tiny muted" style={{ marginTop: 10 }}>
          Note: the 2026 list does not label this item dairy or pareve outright.
          It is shown as <strong>{b.label.toLowerCase()}</strong> because the list
          marks only its dairy entries, and this is not one of them. Check the
          ingredients if it matters for your meal.
        </p>
      )}

      <h2 className="section-title">Details</h2>
      <dl className="card" style={{ padding: 16, margin: 0, display: "grid", gap: 12 }}>
        <Row label="Category">
          <Link to={`/category/${p.category}`}>
            {CATEGORY_EMOJI[p.category]} {cat?.label}
          </Link>
        </Row>
        {p.brand && <Row label="Brand"><BrandTag name={p.brand} /></Row>}
        {p.subheading && <Row label="Listed under">{p.subheading}</Row>}
        {p.names.hr && p.names.hr !== p.names.en && (
          <Row label="Croatian / original">{p.names.hr}</Row>
        )}
        {p.names.alt?.length ? (
          <Row label="Also listed as">{p.names.alt.join(" · ")}</Row>
        ) : null}
        {p.hebrew && (
          <Row label="Hebrew">
            <span dir="rtl" lang="he" style={{ fontSize: 16 }}>{p.hebrew}</span>
          </Row>
        )}
        {p.sizes?.length ? <Row label="Pack sizes">{p.sizes.join(" · ")}</Row> : null}
        {p.kashrut.certifier && <Row label="Certified by">{p.kashrut.certifier}</Row>}
        {p.approvedCompanies?.length ? (
          <Row label="Approved producers">
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {p.approvedCompanies.map((c) => (
                <span className="tag" key={c}>{c}</span>
              ))}
            </div>
          </Row>
        ) : null}
        <Row label="Source">
          Page {p.sourcePage} of the 2026 printed list
        </Row>
      </dl>

      {related.length > 0 && (
        <>
          <h2 className="section-title">
            {p.brand ? `More from ${p.brand}` : `More in ${cat?.label}`}
          </h2>
          <ProductList items={related} />
        </>
      )}

      <p className="tiny muted no-print" style={{ marginTop: 24 }}>
        Spotted a mistake?{" "}
        <a
          href={`mailto:ured@bet-israel.com?subject=${encodeURIComponent(
            `2026 kosher list — correction: ${displayName(p)}`,
          )}&body=${encodeURIComponent(
            `Product: ${displayName(p)}\nBrand: ${p.brand ?? "—"}\nPage: ${p.sourcePage}\n\nWhat looks wrong:\n`,
          )}`}
        >
          Report it to Bet Israel
        </a>
        , who maintain the list.
      </p>
    </article>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      <dt
        style={{
          minWidth: 132, fontSize: 12.5, fontWeight: 700, color: "var(--text-faint)",
          textTransform: "uppercase", letterSpacing: "0.05em", paddingTop: 2,
        }}
      >
        {label}
      </dt>
      <dd style={{ margin: 0, flex: 1, minWidth: 180 }}>{children}</dd>
    </div>
  );
}
