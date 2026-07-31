import { Link, useParams } from "react-router-dom";
import { Empty, Icon, Notice, ProductList } from "../components/ui";
import { brands, categoryById, displayName, fold, products, statusOrder } from "../lib/data";

export default function BrandPage() {
  const { id } = useParams();
  const brand = brands.find((b) => b.id === id);
  if (!brand) {
    return (
      <Empty title="Brand not found">
        <p><Link to="/browse">Browse all products</Link></p>
      </Empty>
    );
  }

  const items = products
    .filter((p) => p.brand === brand.name)
    .sort((a, b) => {
      const s = statusOrder(a) - statusOrder(b);
      if (s !== 0) return s;
      return fold(displayName(a)).localeCompare(fold(displayName(b)));
    });

  const blanket = items.filter((p) => p.scope === "all-varieties");
  const hasDairy = items.some((p) => p.kashrut.status === "dairy");
  const hasPareve = items.some(
    (p) => p.kashrut.status === "pareve" && !p.kashrut.requiresHechsher,
  );

  return (
    <div style={{ paddingTop: 16 }}>
      <Link className="btn btn-sm no-print" to="/browse">{Icon.back} Browse</Link>

      <h1 style={{ fontSize: 26, margin: "14px 0 6px" }}>{brand.name}</h1>
      <p className="muted tiny">
        {items.length} entr{items.length === 1 ? "y" : "ies"} ·{" "}
        {brand.origin === "croatian" ? "🇭🇷 Croatian company" : "🌍 Imported"} ·{" "}
        {brand.categories.map((c) => categoryById.get(c)?.label).filter(Boolean).join(", ")}
      </p>

      {blanket.length > 0 && (
        <div style={{ margin: "14px 0" }}>
          <Notice kind="info">
            <div>
              The list approves <strong>all varieties</strong> from this producer
              for {blanket.length === 1 ? "one line" : `${blanket.length} lines`} —
              individual flavours are not enumerated.
            </div>
          </Notice>
        </div>
      )}

      {hasDairy && hasPareve && (
        <div style={{ margin: "14px 0" }}>
          <Notice kind="warn">
            <div>
              This producer has <strong>both dairy and pareve</strong> entries on
              the list. Check the badge on the specific product — do not assume
              the whole brand is one or the other.
            </div>
          </Notice>
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <ProductList items={items} />
      </div>
    </div>
  );
}
