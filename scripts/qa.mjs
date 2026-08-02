import { chromium, devices } from "playwright";

const BASE = "http://127.0.0.1:4230";
const results = [];
const errors = [];
const ok = (name, pass, detail = "") =>
  results.push({ name, pass, detail });

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ ...devices["iPhone 13"] });
const page = await ctx.newPage();

page.on("console", (m) => {
  if (m.type() === "error") errors.push(`console: ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

async function go(path) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
}

/* ---------------------------------------------------------- 1. home + search */
await go("/");
ok("home renders", (await page.locator("h2", { hasText: "Browse by category" }).count()) > 0);
ok("category grid present", (await page.locator(".cat-card").count()) >= 27);

// diacritic-insensitive search
await page.fill('input[type="search"]', "cokolada");
await page.waitForTimeout(400);
const cokoladaHits = await page.locator(".prow").count();
ok("diacritic-insensitive search (cokolada -> čokolada)", cokoladaHits > 0, `${cokoladaHits} hits`);

// typo tolerance
await page.fill('input[type="search"]', "nutela");
await page.waitForTimeout(400);
const nutellaText = await page.locator(".prow").first().innerText().catch(() => "");
ok("typo tolerance (nutela -> Nutella)", /nutella/i.test(nutellaText), nutellaText.split("\n")[0]);

// Croatian label search
await page.fill('input[type="search"]', "kruh");
await page.waitForTimeout(400);
ok("Croatian label search (kruh = bread)", (await page.locator(".prow").count()) > 0);

// German
await page.fill('input[type="search"]', "Schokolade");
await page.waitForTimeout(400);
ok("German search (Schokolade)", (await page.locator(".prow").count()) > 0);

// zero-result honesty
await page.fill('input[type="search"]', "zzzqqqxyz");
await page.waitForTimeout(400);
const emptyText = await page.locator(".empty").innerText().catch(() => "");
ok("empty state says absence is not a ruling",
  /does not mean it is not kosher/i.test(emptyText));

/* ------------------------------------------------------- 2. critical badges */
await go("/product/alcohol-campari");
let body = await page.locator("main").innerText();
ok("Campari shows NOT KOSHER", /not kosher/i.test(body), body.split("\n")[1]);

await go("/product/alcohol-red-white-wine");
body = await page.locator("main").innerText();
ok("Wine demands a kosher symbol", /check the package/i.test(body));
ok("Wine warns about rabbinic supervision", /rabbinic supervision/i.test(body));

await go("/product/bread-sacher-cake");
body = await page.locator("main").innerText();
ok("Sacher torte flagged 'check the package'", /check the package/i.test(body));
ok("Sacher torte still cites its page", /Page 3 of the 2026/i.test(body));

/* -------------------------------------------- 3. favourites + shopping list */
await go("/browse");
await page.locator(".prow .star").first().click();
await page.waitForTimeout(200);
const favBadge = await page.locator('a[href="/favorites"] .count').innerText().catch(() => "0");
ok("starring updates the header count", favBadge === "1", `badge=${favBadge}`);

await page.locator(".prow .addbtn").first().click();
await page.waitForTimeout(200);
const cartBadge = await page.locator('a[href="/list"] .count').innerText().catch(() => "0");
ok("adding to list updates the cart count", cartBadge === "1", `badge=${cartBadge}`);

await go("/list");
ok("list groups by aisle", (await page.locator(".section-title").count()) >= 1);
const listBody = await page.locator("main").innerText();
ok("list shows share/print actions", /Share link/i.test(listBody) && /Print/i.test(listBody));

// custom item
await page.fill('input[aria-label="Add a custom item"]', "Fresh tomatoes");
await page.click('button[type="submit"]');
await page.waitForTimeout(250);
ok("custom item added", (await page.locator("main").innerText()).includes("Fresh tomatoes"));

// persistence across reload
await page.reload({ waitUntil: "networkidle" });
ok("list persists across reload",
  (await page.locator("main").innerText()).includes("Fresh tomatoes"));

await go("/favorites");
ok("favourites page lists the starred item", (await page.locator(".prow").count()) === 1);

/* -------------------------------------------------------- 4. filters in URL */
await go("/browse?status=not-kosher");
await page.waitForTimeout(300);
const nkCount = await page.locator(".prow").count();
ok("not-kosher filter from URL", nkCount === 13, `${nkCount} rows (expect 13)`);
ok("not-kosher filter shows a warning",
  /shown so you can recognise them/i.test(await page.locator("main").innerText()));

await go("/browse?cat=dairy");
await page.waitForTimeout(300);
const dairyBadges = await page.locator(".prow .badge").allInnerTexts();
ok("every dairy row is dairy or check-the-package",
  dairyBadges.every((b) => /dairy|check the package/i.test(b)),
  dairyBadges.slice(0, 3).join(" | "));

/* ------------------------------------------------------------- 5. stores */
await go("/stores");
await page.waitForTimeout(400);
// The page deliberately lists nothing until you choose a city or share your
// location: a dump of 1,032 supermarkets was the thing being fixed.
ok("stores page lists nothing before you choose",
  (await page.locator(".prow").count()) === 0);
const storeText = await page.locator("main").innerText();
ok("stores page leads with the answer",
  /Most of the 2026 list is ordinary supermarket food/i.test(storeText));
ok("stores page labels the stock guess as a guess",
  /our guess from the kind of shop/i.test(storeText));
await page.locator(".chip", { hasText: "Zagreb" }).first().click();
await page.waitForTimeout(900);
ok("choosing a city lists its shops",
  (await page.locator(".prow").count()) > 5);
ok("Zagreb resolves the full metro, not just tagged branches",
  /225 shops/.test(await page.locator("main").innerText()));

/* ------------------------------------------------------------ 6. a11y-ish */
await go("/");
const noAlt = await page.locator("img:not([alt])").count();
ok("no images missing alt", noAlt === 0);
const h1 = await page.locator("h1").count();
ok("home has exactly one h1", h1 === 1, `${h1} h1 elements`);
ok("skip link present", (await page.locator(".skip-link").count()) === 1);

/* ------------------------------------------- 7. prerendered meta for shares */
const { readFileSync } = await import("node:fs");
const distFile = (p) =>
  readFileSync(`/home/user/croatia-kosher-2026/dist/${p}/index.html`, "utf8");
const html = distFile("product/alcohol-campari");
ok("prerendered title carries the status",
  /<title>Campari.*Not kosher/i.test(html),
  (html.match(/<title>[^<]*/) || [""])[0]);
ok("prerendered og:image is product-specific",
  html.includes("og/product-alcohol-campari.png"));
ok("category prerender has its own card",
  distFile("category/chocolate").includes("og/category-chocolate.png"));

/* ------------------------------------------------------------- 8. desktop */
const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const dpage = await dctx.newPage();
dpage.on("pageerror", (e) => errors.push(`desktop pageerror: ${e.message}`));
await dpage.goto(`${BASE}/`, { waitUntil: "networkidle" });
await dpage.screenshot({ path: "shot-home.png", fullPage: false });

// Home autofocuses search, so blur first: the point of the shortcut is
// reaching the box from elsewhere on the page, not while already inside it.
await dpage.goto(`${BASE}/browse`, { waitUntil: "networkidle" });
await dpage.evaluate(() => document.activeElement?.blur());
await dpage.keyboard.press("/");
await dpage.waitForTimeout(120);
const focusedType = await dpage.evaluate(
  () => document.activeElement?.getAttribute("type"),
);
const typedValue = await dpage.evaluate(
  () => document.activeElement?.value ?? "",
);
ok("'/' focuses search from elsewhere on the page", focusedType === "search");
ok("'/' does not get typed into the box", typedValue === "", `value="${typedValue}"`);

await dpage.goto(`${BASE}/browse?cat=chocolate`, { waitUntil: "networkidle" });
await dpage.screenshot({ path: "shot-browse.png", fullPage: false });
await dpage.goto(`${BASE}/product/alcohol-campari`, { waitUntil: "networkidle" });
await dpage.screenshot({ path: "shot-product.png", fullPage: false });
await dpage.emulateMedia({ colorScheme: "dark" });
await dpage.goto(`${BASE}/guide`, { waitUntil: "networkidle" });
await dpage.screenshot({ path: "shot-guide-dark.png", fullPage: false });
await page.screenshot({ path: "shot-mobile.png", fullPage: false });

await browser.close();

/* ------------------------------------------------------------------ report */
const failed = results.filter((r) => !r.pass);
console.log("\n=== QA RESULTS ===");
for (const r of results) {
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  [${r.detail}]` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (errors.length) {
  console.log(`\nJS errors (${errors.length}):`);
  for (const e of [...new Set(errors)].slice(0, 10)) console.log("   " + e);
}
process.exit(failed.length || errors.length ? 1 : 0);
