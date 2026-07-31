import { chromium, devices } from "playwright";

const B = "http://127.0.0.1:4220";
const br = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });

const ROUTES = [
  ["/", "home"],
  ["/browse", "browse"],
  ["/browse?cat=chocolate", "browse-filtered"],
  ["/category/fish", "cat-fish"],
  ["/category/alcohol", "cat-alcohol"],
  ["/product/alcohol-campari", "product-notkosher"],
  ["/product/bread-sacher-cake", "product-symbol"],
  ["/brand/ferrero", "brand"],
  ["/stores", "stores"],
  ["/guide", "guide"],
  ["/about", "about"],
  ["/favorites", "favorites"],
  ["/list", "list"],
];

const problems = [];

for (const device of ["iPhone 13", "Galaxy S9+"]) {
  const ctx = await br.newContext({ ...devices[device] });
  const page = await ctx.newPage();
  const vw = devices[device].viewport.width;
  page.on("pageerror", (e) => problems.push([device, "JS", e.message]));

  // seed some personal state so favourites/list aren't empty
  await page.goto(`${B}/browse`, { waitUntil: "networkidle" });
  await page.locator(".prow .star").first().click();
  await page.locator(".prow .addbtn").first().click();
  await page.locator(".prow .addbtn").nth(2).click();

  for (const [route, name] of ROUTES) {
    await page.goto(B + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(350);

    // 1. horizontal overflow — the classic mobile failure
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    if (over > 1) {
      const culprits = await page.evaluate((w) =>
        [...document.querySelectorAll("*")]
          .filter((el) => el.getBoundingClientRect().right > w + 1)
          .slice(0, 4)
          .map((el) => `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}`),
      vw);
      problems.push([device, name, `overflows by ${over}px: ${culprits.join(", ")}`]);
    }

    // 2. tap targets below the 44px guidance
    // Only standalone controls. Inline links inside prose are text-height by
    // nature and the 44px touch guidance does not apply to them.
    const small = await page.evaluate(() =>
      [...document.querySelectorAll("a,button,input[type=checkbox]")]
        .filter((el) => !el.closest("p, li, figcaption, .notice, .prow-meta"))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && (r.height < 28 || r.width < 28);
        })
        .slice(0, 5)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}(${Math.round(r.width)}x${Math.round(r.height)})`;
        }),
    );
    if (small.length) problems.push([device, name, `small tap targets: ${small.join(", ")}`]);

    // 3. text clipped by its own container
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll("h1,h2,h3,.prow-name,.cat-name,.badge,.btn,.chip")]
        .filter((el) => el.scrollWidth > el.clientWidth + 2)
        .slice(0, 4)
        .map((el) => `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ")[0]}: "${el.textContent.trim().slice(0, 28)}"`),
    );
    if (clipped.length) problems.push([device, name, `clipped text: ${clipped.join(" | ")}`]);

    if (device === "iPhone 13") {
      await page.screenshot({ path: `m-${name}.png` });
    }
  }
  await ctx.close();
}

await br.close();

if (!problems.length) console.log("no mobile problems found");
else {
  console.log(`${problems.length} mobile problem(s):\n`);
  for (const [d, page, msg] of problems) console.log(`  [${d}] ${page}\n      ${msg}`);
}
