import MiniSearch from "minisearch";
import productsRaw from "../../data/products.json";
import brandsRaw from "../../data/brands.json";
import categoriesRaw from "../../data/categories.json";
import type { Brand, Category, KashrutStatus, Product } from "./types";

export const products = productsRaw as unknown as Product[];
export const brands = brandsRaw as unknown as Brand[];
export const categories = categoriesRaw as unknown as Category[];

export const categoryById = new Map(categories.map((c) => [c.id, c]));
export const brandByName = new Map(brands.map((b) => [b.name, b]));
export const productById = new Map(products.map((p) => [p.id, p]));

/**
 * Fold diacritics so a tourist typing "cokolada" on a foreign keyboard finds
 * "čokolada", and so German umlauts match their plain forms.
 */
export function fold(text: string): string {
  return text
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function displayName(p: Product): string {
  return p.names.en || p.names.hr || p.id;
}

export function secondaryName(p: Product): string | null {
  const en = p.names.en;
  const hr = p.names.hr;
  if (hr && en && fold(hr) !== fold(en)) return hr;
  return null;
}

/** Every string a product should be findable by. */
function searchableText(p: Product): string {
  return [
    p.names.en,
    p.names.hr,
    ...(p.names.alt || []),
    ...(p.aliases || []),
    p.brand,
    p.subheading,
    ...(p.approvedCompanies || []),
    categoryById.get(p.category)?.label,
  ]
    .filter(Boolean)
    .join(" ");
}

export const searchIndex = new MiniSearch<Product>({
  idField: "id",
  fields: ["text", "hebrew"],
  storeFields: ["id"],
  processTerm: (term) => {
    const f = fold(term);
    return f.length > 1 || /[֐-׿]/.test(term) ? f : null;
  },
  tokenize: (text) => text.split(/[\s/,()&·"'’\-–—.]+/).filter(Boolean),
  searchOptions: {
    prefix: true,
    fuzzy: (term) => (term.length > 5 ? 0.25 : term.length > 3 ? 0.2 : 0),
    boost: { text: 2 },
  },
});

searchIndex.addAll(
  products.map((p) => ({
    ...p,
    text: searchableText(p),
    hebrew: p.hebrew || "",
  })) as never[],
);

export function search(query: string): Product[] {
  const q = query.trim();
  if (!q) return [];
  const hits = searchIndex.search(q);
  const out: Product[] = [];
  for (const h of hits) {
    const p = productById.get(h.id as string);
    if (p) out.push(p);
  }
  return out;
}

/* --------------------------------------------------------------- badges */

export interface BadgeSpec {
  label: string;
  className: string;
  icon: string;
  /** Short sentence explaining what the badge means in practice. */
  explain: string;
}

/**
 * Badge priority is deliberate and must not be reordered casually:
 * a "not kosher" or "needs a symbol on the package" fact always outranks the
 * dairy/pareve fact, because it is the one that changes what you do in a shop.
 */
export function badgeFor(p: Product): BadgeSpec {
  const k = p.kashrut;
  if (k.status === "not-kosher" && !k.requiresHechsher) {
    return {
      label: "Not kosher",
      className: "badge-not",
      icon: "✕",
      explain: "The 2026 list marks this as not kosher.",
    };
  }
  if (k.requiresHechsher) {
    return {
      label: "Check the package",
      className: "badge-symbol",
      icon: "⌕",
      explain:
        "Approved only when that specific package carries a kosher symbol. Without the symbol on the package in your hand, it is not covered by the list.",
    };
  }
  if (k.status === "conditional") {
    return {
      label: k.certifier ? `Kosher · ${k.certifier}` : "Conditional",
      className: "badge-conditional",
      icon: "◈",
      explain: k.certifier
        ? `Listed as kosher under ${k.certifier}. Other producers of the same drink are not covered.`
        : "Listed as generally kosher.",
    };
  }
  if (k.status === "dairy") {
    return {
      label: "Dairy",
      className: "badge-dairy",
      icon: "◗",
      explain:
        "Dairy, and not Chalav Yisrael. Do not eat with or after meat.",
    };
  }
  if (k.status === "kosher-species") {
    return {
      label: "Kosher species",
      className: "badge-species",
      icon: "≈",
      explain:
        "A kosher species of fish. This is about the fish itself, not about any particular processed product.",
    };
  }
  return {
    label: "Pareve",
    className: "badge-pareve",
    icon: "✓",
    explain: "Neither meat nor dairy.",
  };
}

export const STATUS_FILTERS: {
  id: string;
  label: string;
  match: (p: Product) => boolean;
}[] = [
  { id: "pareve", label: "Pareve", match: (p) => p.kashrut.status === "pareve" && !p.kashrut.requiresHechsher },
  { id: "dairy", label: "Dairy", match: (p) => p.kashrut.status === "dairy" && !p.kashrut.requiresHechsher },
  { id: "symbol", label: "Check the package", match: (p) => p.kashrut.requiresHechsher },
  { id: "not-kosher", label: "Not kosher", match: (p) => p.kashrut.status === "not-kosher" },
];

export const TAG_LABELS: Record<string, string> = {
  organic: "Organic",
  vegan: "Soy & vegan",
  diet: "Diet / no sugar",
  wholegrain: "Wholegrain",
  kids: "Kids",
  "no-msg": "No MSG added",
  "gluten-grain": "Gluten",
};

export const CATEGORY_EMOJI: Record<string, string> = {
  bread: "🍞", basics: "🧂", dairy: "🥛", cereals: "🥣", pasta: "🍝",
  rice: "🍚", soups: "🍲", "frozen-veg": "🧊", "canned-veg": "🥫",
  fish: "🐟", "canned-fish": "🐠", spreads: "🥜", sauces: "🍅",
  "dried-fruit": "🌰", soy: "🌱", "salted-snacks": "🥨", cookies: "🍪",
  marmalade: "🍓", chocolate: "🍫", coffee: "☕", tea: "🍵",
  drinks: "🥤", alcohol: "🍷", "cake-additives": "🎂", vitamins: "💊",
  toothpaste: "🪥", koestlin: "🍘",
};

export function statusOrder(p: Product): number {
  if (p.kashrut.status === "not-kosher") return 3;
  if (p.kashrut.requiresHechsher) return 2;
  if (p.kashrut.status === "dairy") return 1;
  return 0;
}

export const AISLES = [
  "Bakery", "Dairy", "Chilled", "Frozen", "Fish", "Breakfast", "Pantry",
  "Canned", "Baking", "Snacks", "Drinks", "Health", "Other",
];

export function aisleFor(p: Product): string {
  return categoryById.get(p.category)?.aisle || "Other";
}

export function originOf(p: Product): "croatian" | "imported" | null {
  if (!p.brand) return null;
  return brandByName.get(p.brand)?.origin ?? null;
}

export const STATUS_LABEL: Record<KashrutStatus, string> = {
  pareve: "Pareve",
  dairy: "Dairy",
  "requires-symbol": "Check the package",
  "kosher-species": "Kosher species",
  "not-kosher": "Not kosher",
  conditional: "Conditional",
};
