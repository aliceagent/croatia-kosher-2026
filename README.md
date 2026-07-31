# Kosher Croatia 2026

A searchable version of **KOŠER PROIZVODI U HRVATSKOJ — 2026** (The 2026 Kosher
Products List of Croatia), published by the Jewish community *Bet Israel* in
Zagreb and authorised by Chief Rabbi Dr. Kotel Da-Don.

This is an unofficial search interface onto that list. The community remains the
authority, and this is **not a Passover list**.

## What it does

- Search 1,080 products in Croatian, English, German and Hebrew, with folded
  diacritics so `cokolada` finds `čokolada`
- Filter by kashrut status, category, brand, origin and dietary tags
- Star favourites and build shopping lists grouped by supermarket aisle
- Find the 1,032 branches of the six chains the list names under "where to buy"
- Works offline as an installable PWA — the intended use is a phone in a
  supermarket with no signal

## Kashrut handling

The list does not use one flat "kosher" mark, and neither does this. Status is
resolved from explicit markings in the document, and `kashrut.explicit` records
whether the status was stated outright or follows from the document's
convention of marking only its dairy lines. `requiresHechsher` is kept separate
from dairy/pareve so an item can be both dairy *and* require a symbol on the
package. Every row carries `sourcePage` for traceability.

`scripts/validate.mjs` runs before every build and fails it if a not-kosher item
goes missing or is reclassified, if a hechsher flag is lost, if wine renders as
plainly kosher, or if section totals drift.

## Commands

```bash
npm install
npm run dev        # local dev server
npm run extract    # re-parse the PDF into data/*.json (needs pdfplumber)
npm run validate   # data integrity gate
npm run build      # validate -> icons + share cards -> bundle -> prerender
npm run preview    # serve the production build
node scripts/qa.mjs  # browser QA suite (needs a preview server running)
```

## Layout

```
data/raw/          source PDF and its extracted text
data/*.json        products, brands, categories, stores
scripts/extract.py parses the PDF into structured data
scripts/validate.mjs   integrity gate
scripts/build-stores.py  OpenStreetMap export -> stores.json
scripts/gen-icons.mjs    favicon, app icons, OG share cards
scripts/prerender.mjs    static HTML per route for share previews
src/               the app
```

## Credits

Product data © the Jewish community Bet Israel, Zagreb — Mažuranićev trg 6,
10000 Zagreb, <ured@bet-israel.com>, <https://www.bet-israel.com>.
Shop locations © OpenStreetMap contributors, ODbL.
