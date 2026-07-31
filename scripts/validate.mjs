#!/usr/bin/env node
/**
 * Integrity gate for the 2026 kosher list data.
 *
 * This runs before every build. A kashrut dataset that silently loses a
 * "not kosher" marking or a "needs a hechsher on the package" flag is worse
 * than no dataset at all, so these checks are failures, not warnings.
 *
 * Usage: node scripts/validate.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => JSON.parse(readFileSync(join(root, "data", f), "utf8"));

const products = read("products.json");
const brands = read("brands.json");
const categories = read("categories.json");

const errors = [];
const fail = (msg) => errors.push(msg);

const VALID_STATUS = new Set([
  "pareve", "dairy", "requires-symbol", "kosher-species",
  "not-kosher", "conditional",
]);

/* ---------------------------------------------------------------------- */
/* Expected totals. These are asserted so that an accidental parser change  */
/* which drops or duplicates whole sections cannot pass review unnoticed.   */
/* Update them deliberately, never to make a red build go green.            */
/* ---------------------------------------------------------------------- */
const EXPECTED = {
  products: 1079,
  brands: 80,
  // Every entry the PDF marks NOT kosher (alcohol table, pp. 37-38).
  notKosher: [
    "Apricot/Peach Bols", "Benedictine", "Campari", "Champagne",
    "Cognac Grand Marinier", "Courroisier", "Egg Liqueur", "Grape Juice",
    "Martini", "Ouzo", "Pernod", "Red/White Wine", "Vermouth",
  ],
};

/* --- structural checks -------------------------------------------------- */
const ids = new Set();
const categoryIds = new Set(categories.map((c) => c.id));
const brandNames = new Set(brands.map((b) => b.name));

for (const p of products) {
  const at = `${p.id ?? "<no id>"} (p.${p.sourcePage ?? "?"})`;

  if (!p.id) fail(`missing id: ${JSON.stringify(p.names)}`);
  if (ids.has(p.id)) fail(`duplicate id: ${p.id}`);
  ids.add(p.id);

  // Traceability: every row must point back to a page of the source PDF.
  if (!Number.isInteger(p.sourcePage) || p.sourcePage < 1 || p.sourcePage > 48) {
    fail(`${at}: sourcePage out of range (${p.sourcePage})`);
  }

  if (!categoryIds.has(p.category)) fail(`${at}: unknown category "${p.category}"`);
  if (p.brand && !brandNames.has(p.brand)) fail(`${at}: orphan brand "${p.brand}"`);

  if (!p.names?.en && !p.names?.hr) fail(`${at}: row has no usable name`);

  const k = p.kashrut;
  if (!k) fail(`${at}: no kashrut block`);
  else {
    if (!VALID_STATUS.has(k.status)) fail(`${at}: invalid status "${k.status}"`);
    if (typeof k.requiresHechsher !== "boolean") {
      fail(`${at}: requiresHechsher must be boolean`);
    }
    if (typeof k.explicit !== "boolean") fail(`${at}: explicit must be boolean`);
    // A conditional approval is meaningless without saying who certifies it
    // or why it is conditional.
    if (k.status === "conditional" && !k.certifier && !k.note) {
      fail(`${at}: conditional status with neither certifier nor note`);
    }
  }

  if (p.scope !== "item" && p.scope !== "all-varieties") {
    fail(`${at}: invalid scope "${p.scope}"`);
  }
}

/* --- the checks that actually protect users ----------------------------- */

// 1. Every NOT-kosher item from the PDF is still present and still not-kosher.
for (const name of EXPECTED.notKosher) {
  const hit = products.find((p) => p.names?.en === name);
  if (!hit) fail(`NOT-KOSHER ITEM MISSING FROM DATA: "${name}"`);
  else if (hit.kashrut.status !== "not-kosher") {
    fail(`NOT-KOSHER ITEM RECLASSIFIED: "${name}" is now "${hit.kashrut.status}"`);
  }
}
const notKosherCount = products.filter((p) => p.kashrut?.status === "not-kosher").length;
if (notKosherCount !== EXPECTED.notKosher.length) {
  fail(`not-kosher count is ${notKosherCount}, expected ${EXPECTED.notKosher.length}`);
}

// 2. Items that are only approved when the package carries a kosher symbol
//    must keep that flag. Losing it turns a conditional row into a green light.
const hechsher = products.filter((p) => p.kashrut?.requiresHechsher);
if (hechsher.length < 15) {
  fail(`only ${hechsher.length} rows require a hechsher; expected at least 15`);
}
for (const p of hechsher) {
  // Mlinar's dairy pastries and the Vindija cheeses must stay dairy AND flagged.
  if (p.category === "dairy" && p.kashrut.status !== "dairy") {
    fail(`${p.id}: dairy cheese lost its dairy status`);
  }
}

// 3. Wine must never render as plainly kosher.
const wine = products.find((p) => p.names?.en === "Red/White Wine");
if (wine && !wine.kashrut.requiresHechsher) {
  fail("Red/White Wine must be flagged as requiring a kosher symbol");
}

// 4. The dairy category is dairy, wholesale. No pareve leakage.
for (const p of products.filter((p) => p.category === "dairy")) {
  if (p.kashrut.status !== "dairy") {
    fail(`${p.id}: item in the Milk & Dairy section is "${p.kashrut.status}"`);
  }
}

// 5. Section totals must not drift.
if (products.length !== EXPECTED.products) {
  fail(`product count is ${products.length}, expected ${EXPECTED.products}`);
}
if (brands.length !== EXPECTED.brands) {
  fail(`brand count is ${brands.length}, expected ${EXPECTED.brands}`);
}

// 6. Category counts in categories.json must match the actual rows.
for (const c of categories) {
  const actual = products.filter((p) => p.category === c.id).length;
  if (actual !== c.count) {
    fail(`category "${c.id}" claims ${c.count} rows but has ${actual}`);
  }
  if (actual === 0) fail(`category "${c.id}" is empty`);
}

/* --- report ------------------------------------------------------------- */
if (errors.length) {
  console.error(`\n✗ data validation failed — ${errors.length} problem(s):\n`);
  for (const e of errors) console.error(`   • ${e}`);
  console.error("");
  process.exit(1);
}

const byStatus = products.reduce((acc, p) => {
  acc[p.kashrut.status] = (acc[p.kashrut.status] || 0) + 1;
  return acc;
}, {});

console.log(`✓ data validation passed`);
console.log(`  ${products.length} products · ${brands.length} brands · ${categories.length} categories`);
console.log(`  status:`, byStatus);
console.log(`  ${hechsher.length} rows require a kosher symbol on the package`);
console.log(`  ${notKosherCount} rows are marked NOT kosher`);
