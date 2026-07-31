#!/usr/bin/env node
/**
 * Emits a static HTML file per product, category and top-level route.
 *
 * The app is a client-rendered SPA, but crawlers and chat apps do not run JS —
 * they read the HTML they are served. Without this, every shared link would
 * show the same generic preview. Each file carries its own title, description
 * and og:image, then boots the same SPA bundle.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const shell = readFileSync(join(dist, "index.html"), "utf8");

const products = JSON.parse(readFileSync(join(root, "data/products.json"), "utf8"));
const categories = JSON.parse(readFileSync(join(root, "data/categories.json"), "utf8"));

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const SITE = "https://kosher-croatia-2026.vercel.app";

function statusLabel(p) {
  if (p.kashrut.status === "not-kosher" && !p.kashrut.requiresHechsher) return "Not kosher";
  if (p.kashrut.requiresHechsher) return "Only with a kosher symbol on the package";
  if (p.kashrut.status === "conditional") {
    return p.kashrut.certifier ? `Kosher — ${p.kashrut.certifier}` : "Conditional";
  }
  if (p.kashrut.status === "dairy") return "Dairy, not Chalav Yisrael";
  if (p.kashrut.status === "kosher-species") return "Kosher species";
  return "Pareve";
}

function emit(route, { title, description, image }) {
  const dir = join(dist, route);
  mkdirSync(dir, { recursive: true });
  const url = `${SITE}/${route}`;
  const img = `${SITE}${image}`;

  const html = shell
    .replace(
      /<title>[^<]*<\/title>/,
      `<title>${esc(title)}</title>`,
    )
    .replace(
      /<meta name="description" content="[^"]*"\s*\/>/,
      `<meta name="description" content="${esc(description)}" />`,
    )
    .replace(
      /<meta property="og:title" content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${esc(title)}" />`,
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${esc(description)}" />`,
    )
    .replace(
      /<meta property="og:image" content="[^"]*"\s*\/>/,
      `<meta property="og:image" content="${img}" />\n    <meta property="og:url" content="${esc(url)}" />`,
    )
    .replace(
      /<meta name="twitter:image" content="[^"]*"\s*\/>/,
      `<meta name="twitter:image" content="${img}" />\n    <meta name="twitter:title" content="${esc(title)}" />\n    <meta name="twitter:description" content="${esc(description)}" />`,
    );

  writeFileSync(join(dir, "index.html"), html);
}

const hasCard = (name) => existsSync(join(dist, "og", `${name}.png`));

let n = 0;

for (const p of products) {
  const name = p.names.en || p.names.hr;
  const image = hasCard(`product-${p.id}`) ? `/og/product-${p.id}.png` : "/og/default.png";
  emit(`product/${p.id}`, {
    title: `${name}${p.brand ? ` (${p.brand})` : ""} — ${statusLabel(p)} | Kosher Croatia 2026`,
    description: `${statusLabel(p)}. From the 2026 kosher products list of Croatia, page ${p.sourcePage}, authorised by Chief Rabbi Dr. Kotel Da-Don.`,
    image,
  });
  n++;
}

for (const c of categories) {
  emit(`category/${c.id}`, {
    title: `${c.label} — ${c.count} kosher products in Croatia | 2026 list`,
    description: `${c.count} approved ${c.label.toLowerCase()} entries from the 2026 kosher products list of Croatia, published by Bet Israel, Zagreb.`,
    image: hasCard(`category-${c.id}`) ? `/og/category-${c.id}.png` : "/og/default.png",
  });
  n++;
}

const PAGES = {
  browse: ["Browse all kosher products in Croatia | 2026 list",
    "Filter 1,080 kosher products by category, kashrut status, brand and origin."],
  guide: ["Kashrut guide — what the badges mean | Kosher Croatia 2026",
    "Pareve, dairy, 'only with a kosher symbol', not kosher: what each status on the 2026 Croatian kosher list actually means."],
  stores: ["Where to buy kosher food in Croatia | 2026 list",
    "Find branches of the six supermarket chains named in the 2026 kosher list, plus kosher wine from the Bet Israel community in Zagreb."],
  about: ["About — Kosher Croatia 2026",
    "An unofficial searchable version of the 2026 kosher products list of Croatia, published by Bet Israel, Zagreb."],
  favorites: ["Your favourites | Kosher Croatia 2026",
    "Products you have starred, saved on your device."],
  list: ["Your shopping list | Kosher Croatia 2026",
    "A kosher shopping list grouped by supermarket aisle. Print it or share the link."],
};

for (const [route, [title, description]] of Object.entries(PAGES)) {
  emit(route, { title, description, image: "/og/default.png" });
  n++;
}

/* A sitemap so the pages are discoverable. */
const urls = [
  "", "browse", "guide", "stores", "about",
  ...categories.map((c) => `category/${c.id}`),
  ...products.map((p) => `product/${p.id}`),
];
writeFileSync(
  join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${SITE}/${u}</loc></url>`)
    .join("\n")}\n</urlset>\n`,
);
writeFileSync(
  join(dist, "robots.txt"),
  `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`,
);

console.log(`✓ prerendered ${n} routes + sitemap (${urls.length} urls)`);
