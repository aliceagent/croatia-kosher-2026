#!/usr/bin/env node
/**
 * Generates the favicon, app icons and Open Graph share cards.
 *
 * The mark and palette come from the printed list's cover: a white Star of
 * David on the cover's blue gradient. Cards are rendered at build time so the
 * site stays fully static and needs no image service at runtime.
 */
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const ogDir = join(pub, "og");
mkdirSync(ogDir, { recursive: true });

const products = JSON.parse(readFileSync(join(root, "data/products.json"), "utf8"));
const categories = JSON.parse(readFileSync(join(root, "data/categories.json"), "utf8"));

const BLUE_DARK = "#14508f";
const BLUE = "#1668c9";
const BLUE_LIGHT = "#4a9ae8";
const GOLD = "#e0a233";

/** Star of David built from two overlapping triangles. */
const STAR_PATH =
  "M16 3.2 21 12h-10zM16 28.8 11 20h10zM3.6 22.4 8.6 13.6l5 8.8zM28.4 22.4h-10l5-8.8zM3.6 9.6h10l-5 8.8zM28.4 9.6 23.4 18.4l-5-8.8z";

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function iconSvg({ size = 512, maskable = false }) {
  const pad = maskable ? 0.62 : 0.78; // maskable icons need a safe zone
  const scale = (size * pad) / 32;
  const off = (size - 32 * scale) / 2;
  const radius = maskable ? 0 : size * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${BLUE_DARK}"/><stop offset="1" stop-color="${BLUE_LIGHT}"/>
  </linearGradient></defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
  <g transform="translate(${off} ${off}) scale(${scale})" fill="#fff">
    <path d="${STAR_PATH}"/>
  </g>
</svg>`;
}

/* Favicon: an SVG favicon stays crisp at every size and in both themes. */
writeFileSync(join(pub, "favicon.svg"), iconSvg({ size: 32 }));

const png = (svg, width) =>
  new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();

writeFileSync(join(pub, "icon-192.png"), png(iconSvg({ size: 512 }), 192));
writeFileSync(join(pub, "icon-512.png"), png(iconSvg({ size: 512 }), 512));
writeFileSync(join(pub, "apple-touch-icon.png"), png(iconSvg({ size: 512 }), 180));
writeFileSync(
  join(pub, "icon-maskable-512.png"),
  png(iconSvg({ size: 512, maskable: true }), 512),
);

/* ----------------------------------------------------------- share cards */

const BADGE_STYLE = {
  pareve: { fill: "#dcfce7", text: "#15803d", label: "PAREVE" },
  dairy: { fill: "#dbeafe", text: "#14508f", label: "DAIRY · NOT CHALAV YISRAEL" },
  symbol: { fill: "#fef3c7", text: "#b45309", label: "ONLY WITH A KOSHER SYMBOL" },
  not: { fill: "#fee2e2", text: "#b91c1c", label: "NOT KOSHER" },
  conditional: { fill: "#fdf3dd", text: "#b7791f", label: "CONDITIONAL" },
  species: { fill: "#dbeafe", text: "#14508f", label: "KOSHER SPECIES" },
};

function badgeKey(p) {
  if (p.kashrut.status === "not-kosher" && !p.kashrut.requiresHechsher) return "not";
  if (p.kashrut.requiresHechsher) return "symbol";
  if (p.kashrut.status === "conditional") return "conditional";
  if (p.kashrut.status === "dairy") return "dairy";
  if (p.kashrut.status === "kosher-species") return "species";
  return "pareve";
}

/** Wrap text by estimated glyph width — good enough for two display lines. */
function wrap(text, maxChars) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars && line) {
      lines.push(line.trim());
      line = w;
    } else {
      line = `${line} ${w}`;
    }
    if (lines.length === 2) break;
  }
  if (line.trim() && lines.length < 2) lines.push(line.trim());
  return lines;
}

function card({ eyebrow, title, subtitle, badge }) {
  const lines = wrap(title, title.length > 34 ? 26 : 22);
  const fontSize = lines.length > 1 ? 74 : 88;
  const b = badge ? BADGE_STYLE[badge] : null;
  const badgeW = b ? Math.max(230, b.label.length * 15 + 60) : 0;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1b2e"/>
      <stop offset="0.55" stop-color="${BLUE_DARK}"/>
      <stop offset="1" stop-color="${BLUE}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g opacity="0.09" transform="translate(830 120) scale(14)" fill="#fff">
    <path d="${STAR_PATH}"/>
  </g>
  <rect x="0" y="0" width="1200" height="8" fill="${GOLD}"/>

  <g transform="translate(72 84)" fill="#fff">
    <g transform="scale(1.5)"><path d="${STAR_PATH}" fill="#fff" opacity="0.95"/></g>
  </g>
  <text x="140" y="118" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="27" font-weight="700" fill="#fff" opacity="0.92" letter-spacing="1">
    KOSHER CROATIA · 2026 LIST</text>

  ${eyebrow ? `<text x="72" y="228" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="26" font-weight="700" fill="${GOLD}" letter-spacing="3">${esc(eyebrow.toUpperCase())}</text>` : ""}

  ${lines.map((l, i) => `<text x="72" y="${(eyebrow ? 320 : 300) + i * (fontSize + 12)}"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="${fontSize}" font-weight="800" fill="#fff" letter-spacing="-2">${esc(l)}</text>`).join("\n  ")}

  ${b ? `<g transform="translate(72 ${(eyebrow ? 350 : 330) + lines.length * (fontSize + 12)})">
    <rect width="${badgeW}" height="66" rx="33" fill="${b.fill}"/>
    <text x="${badgeW / 2}" y="43" text-anchor="middle"
          font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
          font-size="25" font-weight="800" fill="${b.text}" letter-spacing="1">${esc(b.label)}</text>
  </g>` : ""}

  <text x="72" y="566" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="27" font-weight="500" fill="#fff" opacity="0.78">${esc(subtitle)}</text>
</svg>`;
}

const write = (name, svg) =>
  writeFileSync(join(ogDir, `${name}.png`), png(svg, 1200));

write("default", card({
  title: "Search kosher food in Croatia",
  subtitle: `${products.length.toLocaleString()} products · filters, favourites, shopping list · works offline`,
}));

for (const c of categories) {
  write(`category-${c.id}`, card({
    eyebrow: "Category",
    title: c.label,
    subtitle: `${c.count} approved entries · Bet Israel, Zagreb`,
  }));
}

/* Per-product cards for the entries people actually ask about: everything the
 * list marks not kosher or conditional, everything needing a symbol on the
 * package, and the best-known brands. The answer shows in the chat preview
 * without anyone opening the link. */
const notable = products.filter(
  (p) =>
    p.kashrut.status === "not-kosher" ||
    p.kashrut.requiresHechsher ||
    p.kashrut.status === "conditional" ||
    /nutella|milka|toblerone|kinder|ferrero|barilla|lavazza|illy|heinz|coca|pepsi|lindt|nescafe|kitkat|oreo|philadelphia/i
      .test(`${p.names.en} ${p.brand ?? ""}`),
);

for (const p of notable) {
  write(`product-${p.id}`, card({
    eyebrow: p.brand ?? "Product",
    title: p.names.en || p.names.hr,
    subtitle: `2026 kosher list of Croatia · page ${p.sourcePage}`,
    badge: badgeKey(p),
  }));
}

console.log(
  `✓ icons + ${1 + categories.length + notable.length} share cards written to public/`,
);
