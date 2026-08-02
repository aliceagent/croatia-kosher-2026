import { chromium, devices } from "playwright";
const B = "http://127.0.0.1:4240";
const br = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const out = []; const errs = [];
const ok = (n, p, d="") => out.push([n, p, d]);
const ctx = await br.newContext({ viewport: { width: 1180, height: 1000 }, deviceScaleFactor: 2 });
const d = await ctx.newPage();
d.on("pageerror", e => errs.push(e.message));

// --- disclaimer dismissal
await d.goto(`${B}/`, { waitUntil: "networkidle" });
ok("disclaimer shows on first visit", (await d.locator(".notice-danger").count()) > 0);
await d.screenshot({ path: "n-home-before.png", clip:{x:0,y:0,width:1180,height:620} });
await d.locator("button", { hasText: "OK, I understand" }).click();
await d.waitForTimeout(250);
ok("OK hides it", (await d.locator("button", { hasText: "OK, I understand" }).count()) === 0);
ok("footer keeps the statement",
  /Not independently verified/.test(await d.locator("footer").innerText()));
await d.goto(`${B}/product/alcohol-campari`, { waitUntil: "networkidle" });
ok("stays dismissed on other pages",
  (await d.locator("button", { hasText: "OK, I understand" }).count()) === 0);
await d.goto(`${B}/about`, { waitUntil: "networkidle" });
ok("About keeps it permanently",
  /has been independently verified/.test(await d.locator("main").innerText()));
await d.reload({ waitUntil: "networkidle" });
ok("dismissal survives reload",
  (await d.locator("button", { hasText: "OK, I understand" }).count()) === 0);

// --- travel FAQ
await d.goto(`${B}/travel`, { waitUntil: "networkidle" });
const t = await d.locator("main").innerText();
ok("FAQ answers currency", /Euro/.test(t));
ok("FAQ answers outlets", /Type C\/F|Type C and Type F/.test(t));
ok("FAQ answers driving side", /Right/.test(t));
ok("FAQ answers language", /Croatian/.test(t));
ok("FAQ covers visas", /Visa-free/.test(t));
await d.locator(".faq summary").first().click();
await d.waitForTimeout(200);
ok("FAQ expands", (await d.locator(".faq[open]").count()) > 0);
await d.fill('input[type="search"]', "outlet");
await d.waitForTimeout(300);
ok("FAQ is searchable", (await d.locator(".faq").count()) > 0 && (await d.locator(".faq").count()) < 8);
await d.screenshot({ path: "n-travel.png", clip:{x:0,y:0,width:1180,height:1000} });

// --- phrasebook tab + old url
await d.goto(`${B}/travel?tab=phrases`, { waitUntil: "networkidle" });
ok("phrasebook tab renders", (await d.locator(".phrase").count()) > 50);
await d.goto(`${B}/phrases`, { waitUntil: "networkidle" });
await d.waitForTimeout(300);
ok("/phrases redirects", d.url().includes("tab=phrases"));

const m = await (await br.newContext({ ...devices["iPhone 13"] })).newPage();
await m.goto(`${B}/travel`, { waitUntil: "networkidle" });
await m.screenshot({ path: "n-travel-mobile.png" });
const over = await m.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok("no mobile overflow on travel", over <= 1, `${over}px`);

await br.close();
for (const [n,p,dd] of out) console.log(`  ${p?"PASS":"FAIL"}  ${n}${dd?`  [${dd}]`:""}`);
console.log(`\n${out.filter(x=>x[1]).length}/${out.length} passed`);
if (errs.length) console.log("JS errors:", [...new Set(errs)].slice(0,3));
