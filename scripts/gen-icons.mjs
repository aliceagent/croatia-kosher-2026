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

/* The supplied logo artwork, embedded so every raster asset uses the real
   mark rather than a redrawing of it. */
const PIN_DATA_URI =
  "data:image/png;base64," +
  readFileSync(join(root, "assets/brand/logo-pin.png")).toString("base64");

const products = JSON.parse(readFileSync(join(root, "data/products.json"), "utf8"));
const categories = JSON.parse(readFileSync(join(root, "data/categories.json"), "utf8"));

/* Sampled from the Kosher Croatia logo and its illustration set. */
const NAVY_DEEP = "#00112E";
const NAVY = "#002869";
const NAVY_MID = "#003A8C";
const RED = "#EA142B";
const SAND = "#E4C391";

/* The mark: a map pin carrying a Star of David over the logo's red wave. */
const PIN_PATH =
  "M16 1.4C9 1.4 3.3 7.1 3.3 14.1c0 9 12.7 16.5 12.7 16.5s12.7-7.5 12.7-16.5C28.7 7.1 23 1.4 16 1.4z";
const STAR_PATH = "M16 6.6l3.64 6.3h-7.28zM16 15.6l-3.64-6.3h7.28z";
const WAVE_PATH = "M1 21.6c5-2.7 9.6-2.7 15 0s10 2.7 15 0V32H1z";
const WAVE_LINE = "M1.5 24.6c5-2.4 9.6-2.4 15 0s10 2.4 15 0";

/**
 * The pin mark in a 32x32 box. `detail: "simple"` drops the menorah and fork,
 * which collapse into noise below roughly 24px and leave only the star legible.
 */
function markGroup(fill = "#fff", detail = "full") {
  const ink = fill === "#fff" ? NAVY : "#fff";
  const extras = detail === "full" ? `
    <g stroke="${ink}" fill="none" stroke-width="0.85" stroke-linecap="round">
      <path d="M6.4 12.4v1.9M7.6 11.6v2.7M8.8 11.1v3.2M10 11.6v2.7M11.2 12.4v1.9"/>
      <path d="M8.8 14.3v2.1M7.3 16.6h3" stroke-width="0.95"/>
      <path d="M21 11.2v2.1M22.4 11.2v2.1M23.8 11.2v2.1"/>
      <path d="M21 13.3h2.8M22.4 13.3v3.3" stroke-width="0.95"/>
    </g>` : "";
  return `<defs><clipPath id="pc"><path d="${PIN_PATH}"/></clipPath></defs>
    <path d="${PIN_PATH}" fill="${fill}"/>
    <g clip-path="url(#pc)">
      <path d="${WAVE_PATH}" fill="${RED}"/>
      <path d="${WAVE_LINE}" stroke="${ink}" stroke-width="1" fill="none"/>
    </g>
    <path d="${STAR_PATH}" fill="${ink}"/>${extras}`;
}

const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Redrawn mark, used only where the real artwork is too small to read. */
function simpleIconSvg(size = 32) {
  const scale = (size * 0.76) / 32;
  const off = (size - 32 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${NAVY}"/><stop offset="1" stop-color="${NAVY_MID}"/>
  </linearGradient></defs>
  <rect width="${size}" height="${size}" rx="${size * 0.22}" fill="url(#g)"/>
  <g transform="translate(${off} ${off}) scale(${scale})">${markGroup("#fff", "simple")}</g>
</svg>`;
}

function iconSvg({ size = 512, maskable = false, detail = "full" }) {
  const pad = maskable ? 0.60 : 0.76; // maskable icons need a safe zone
  const scale = (size * pad) / 32;
  const off = (size - 32 * scale) / 2;
  const radius = maskable ? 0 : size * 0.22;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${NAVY}"/><stop offset="1" stop-color="${NAVY_MID}"/>
  </linearGradient></defs>
  <rect width="${size}" height="${size}" rx="${radius}" fill="url(#g)"/>
  <image href="${PIN_DATA_URI}" x="${off}" y="${off}"
         width="${32 * scale}" height="${32 * scale}"/>
</svg>`;
}

/* Favicon: an SVG favicon stays crisp at every size and in both themes. */
/* The favicon renders at 16-32px, where the artwork's menorah, fork and
   coastline turn to mush, so the tab icon is the simplified redraw. */
writeFileSync(join(pub, "favicon.svg"), simpleIconSvg(32));

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
  pareve: { fill: "#DCF3E5", text: "#146C3A", label: "PAREVE" },
  dairy: { fill: "#D8E3F2", text: "#002869", label: "DAIRY · NOT CHALAV YISRAEL" },
  symbol: { fill: "#FBEBCC", text: "#9A5B08", label: "ONLY WITH A KOSHER SYMBOL" },
  not: { fill: "#FBE0E3", text: "#C00F24", label: "NOT KOSHER" },
  conditional: { fill: "#FBEEDC", text: "#9C6B2F", label: "CONDITIONAL" },
  species: { fill: "#D8E3F2", text: "#002869", label: "KOSHER SPECIES" },
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
      <stop offset="0" stop-color="${NAVY_DEEP}"/>
      <stop offset="0.55" stop-color="${NAVY}"/>
      <stop offset="1" stop-color="${NAVY_MID}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <g opacity="0.13">
    <image href="${PIN_DATA_URI}" x="835" y="120" width="330" height="330"/>
  </g>
  <rect x="0" y="0" width="1200" height="9" fill="${RED}"/>

  <image href="${PIN_DATA_URI}" x="66" y="62" width="62" height="62"/>
  <text x="140" y="118" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="27" font-weight="700" fill="#fff" opacity="0.92" letter-spacing="1">
    KOSHER CROATIA · 2026 LIST</text>

  ${eyebrow ? `<text x="72" y="228" font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
        font-size="26" font-weight="700" fill="${SAND}" letter-spacing="3">${esc(eyebrow.toUpperCase())}</text>` : ""}

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
