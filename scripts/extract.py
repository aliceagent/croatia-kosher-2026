#!/usr/bin/env python3
"""
Extract the 2026 Kosher Products List of Croatia (Bet Israel, Zagreb)
from the source PDF into structured JSON.

Every emitted row carries `sourcePage` so any entry can be traced back to
the original document. Kashrut status is never guessed: it is inherited from
an explicit marker in the PDF (category header, brand header, or an inline
"only if it has the kosher symbol" modifier), and rows that cannot resolve a
status are emitted with status=None so the validator fails loudly.

Usage:  python3 scripts/extract.py
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw" / "pdf-text.txt"
OUT = ROOT / "data"

HEB_RE = re.compile(r"[֐-׿יִ-ﭏ]")
PAGE_RE = re.compile(r"^===== PAGE (\d+) =====$")
SIZE_RE = re.compile(
    r"\b\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l)\b(?!\w)", re.IGNORECASE
)

# ---------------------------------------------------------------------------
# Category definitions. Keyed by the exact (Hebrew-stripped) header line that
# introduces the section in the PDF, so detection is deterministic rather than
# heuristic. `default` is the kashrut status that applies to rows in the
# section unless a brand header or inline modifier overrides it.
# ---------------------------------------------------------------------------
CATEGORIES = [
    # id, label, header matches, default status, icon, aisle
    ("bread", "Bread & Pastries", ["MLINAR d.d -"], None, "bread", "Bakery"),
    ("basics", "Basic Products", ["BASIC PRODUCTS / OSNOVNI PROIZVODI"], "pareve", "basics", "Pantry"),
    ("dairy", "Milk & Dairy", ["MILK AND DIARY PRODUCTS (Not Chalav Israel milk)/MLIJEČNI PROIZVODI"], "dairy", "dairy", "Dairy"),
    ("cereals", "Breakfast Cereals", ["ŽITARICE ZA DORUČAK / BREAKFAST CEREALS"], "pareve", "cereal", "Breakfast"),
    ("pasta", "Pasta", ["PASTA /TJESTENINA"], "pareve", "pasta", "Pantry"),
    ("rice", "Rice", ["RICE /RIŽA"], "pareve", "rice", "Pantry"),
    ("soups", "Soups", ["SOUPS/ JUHE I BUJONI"], "pareve", "soup", "Pantry"),
    ("frozen-veg", "Frozen Vegetables", ["FROZEN VEGETABLES/ SMRZNUTO POVRĆE"], "pareve", "frozen", "Frozen"),
    ("canned-veg", "Canned Vegetables", ["VEGETABLES IN CANS/ KONZERVIRANO POVRĆE"], "pareve", "can", "Canned"),
    ("fish", "Fish", ["RIBA /FISH: (FRESH,FROZEN,SMOKED OR SALTED)"], "kosher-species", "fish", "Fish"),
    ("canned-fish", "Canned Fish", ["FISH IN CANS / KONZERVIRANA"], "pareve", "can", "Canned"),
    ("spreads", "Spreads & Pâtés", ["SPREADS /NAMAZI I PAŠTE"], "pareve", "spread", "Pantry"),
    ("sauces", "Sauces", ["SAUCES / UMACI"], "pareve", "sauce", "Pantry"),
    ("dried-fruit", "Dried Fruit & Legumes", ["DRY FRUTIS & LEGUMES / SUŠENO VOĆE' I MAHUNARKE"], "pareve", "nuts", "Pantry"),
    ("soy", "Soy & Meat Substitutes", ["SOY PRODUCTS & MEAT SUBSTITUTES/PROIZVODI OD SOJE I NADOMJESCI MESA"], "pareve", "soy", "Chilled"),
    ("salted-snacks", "Salted Snacks", ["SALTED / SLANO"], "pareve", "snack", "Snacks"),
    ("cookies", "Cookies", ["COOKIES /KEKSI"], "pareve", "cookie", "Snacks"),
    ("marmalade", "Marmalades & Jams", ["MARMALADES / MARMELADA"], "pareve", "jam", "Pantry"),
    ("chocolate", "Chocolate & Candy", ["CHOCOLATES/ ČOKOLADE I ČOKOLADICE"], "pareve", "chocolate", "Snacks"),
    ("coffee", "Coffee", ["COFFEE /KAVA"], "pareve", "coffee", "Drinks"),
    ("tea", "Tea", ["TEA/ČAJEVI"], "pareve", "tea", "Drinks"),
    ("drinks", "Water & Soft Drinks", ["WATER&LIGHT DRINKS / VODA i PIĆA"], "pareve", "drink", "Drinks"),
    ("alcohol", "Wine & Alcohol", ["WINE & ALCOHOLIC BEVERAGES/ALKOHOLNA PIĆA"], None, "wine", "Drinks"),
    ("cake-additives", "Cake Mixes & Additives", ["DODACI ZA KOLAČE I TIJESTA /ADDITIVES FOR CAKE AND DOUGH"], "pareve", "cake", "Baking"),
    ("vitamins", "Vitamins", ["VITAMINS / VITAMINi"], "pareve", "vitamin", "Health"),
    ("toothpaste", "Toothpaste", ["TOOTHPASTE/ ZUBNE"], "pareve", "toothpaste", "Health"),
    ("koestlin", "Koestlin Snacks", ["KOESTLIN"], None, "cookie", "Snacks"),
]

# Croatian companies named in the list -> used for the origin facet.
# Categories whose default status is stated outright by the section header
# ("MILK AND DIARY PRODUCTS (Not Chalav Israel milk)", the fish species list)
# rather than inferred. Everywhere else a `pareve` default reflects the
# document's convention of marking only the dairy lines, which is weaker
# evidence and is flagged as such on the product page.
EXPLICIT_DEFAULT_CATEGORIES = {"dairy", "fish"}

CROATIAN_BRANDS = {
    "MLINAR", "PODRAVKA", "ZVIJEZDA", "KANDIT", "KOESTLIN", "VINDIJA", "FRANCK",
    "JAMNICA", "MARASKA", "BADEL 1862", "DUKAT", "ZDENKA", "BELJE", "NAŠE KLASJE",
    "KRAŠ", "CROMARIS", "PELAGOS", "SARDINA POSTIRA", "MARINADA DOORA", "NATURALA",
    "ANAMARIJA", "KALNIČKE VODE", "BOŽJAKOVINA", "JUICY", "SOLANA PAG", "VIRO",
    "MARKO OBRT ZA DIMLJENJE RIBE", "KVASAC D.O.O", "GALA BJELOVAR", "MEDENA",
    "NEW BAKERY", "SANA", "AGROLAGUNA", "AGROFIN", "BIMAL", "ČEPIN", "PLODINEC",
}

# Inline modifier lines that change the kashrut status of following rows.
REQUIRES_SYMBOL_MARKERS = (
    "only if it has the kosher symbol",
    "samo kad nosi oznaku košer",
    "only when carry kosher symbol",
)

TAG_RULES = [
    ("organic", ("bio-", "bio ", "organic", "biologisch")),
    ("no-msg", ("no msg added",)),
    ("diet", ("diät", "diet ", "diabetic", "without sugar", "bez šećera",
              "sugar-free", "ohne zucker", "less sugar", "unsweetened",
              "ungesüßt", "senza zucchero", "saltless", "neslani", "unsalted")),
    ("wholegrain", ("vollkorn", "whole grain", "wholemeal", "whole wheat",
                    "integral", "pelnoziarniste", "whole-grain")),
    ("kids", ("kinder", "baby", "children", "junior", "milupa", "spongebob",
              "za djecu", "kindern")),
    ("vegan", ("tofu", "soy", "soja", "vegan", "vegetarisch", "vegetarian",
               "veggie", "meat substitute")),
    ("gluten-grain", ("gluten",)),
]


def strip_hebrew(text: str) -> str:
    """
    Remove Hebrew runs and the stray punctuation that brackets them.

    Hebrew is right-to-left, so a parenthesised Hebrew phrase extracts as
    ")text(" and deleting the letters leaves a reversed empty pair behind --
    which is why a row read "Vegetarian bratwurst )(". Orphaned brackets are
    cleared here rather than in every consumer.
    """
    out = HEB_RE.sub("", text)
    out = re.sub(r"[‎‏]", "", out)
    out = re.sub(r"\)\s*\(", " ", out)   # reversed empty pair
    out = re.sub(r"\(\s*\)", " ", out)   # ordinary empty pair
    # A reversed bracket group left stranded at the end of the line, such as
    # ") 10-12%(" trailing "Cocoa, Reduced Fat (10-12%)". End-anchored so a
    # legitimate "(a) text (b)" is untouched.
    out = re.sub(r"\)\s*[^()]{0,14}\(\s*$", ")", out)
    # A bracket left with no partner is debris from the Hebrew column.
    if out.count("(") != out.count(")"):
        out = re.sub(r"(?<![A-Za-z0-9])[()](?![A-Za-z0-9])", " ", out)
    return re.sub(r"\s+", " ", out).strip()


def hebrew_of(text: str) -> str | None:
    """
    Pull the Hebrew out of a line and restore logical order.

    pdfplumber emits Hebrew in visual (reversed) order, so each Hebrew run is
    reversed back. Runs are then re-joined in reverse sequence, which restores
    right-to-left reading order for the multi-run lines in this document.
    """
    runs = re.findall(r"[֐-׿יִ-ﭏ\"'׳״]+(?:[  ][֐-׿יִ-ﭏ\"'0-9%()\-]+)*", text)
    runs = [r.strip() for r in runs if HEB_RE.search(r)]
    if not runs:
        return None
    fixed = [r[::-1] for r in runs]
    joined = " ".join(reversed(fixed)) if len(fixed) > 1 else fixed[0]
    return re.sub(r"\s+", " ", joined).strip() or None


def norm(text: str) -> str:
    """Casefold + strip diacritics, for matching and ID generation."""
    text = text.replace("đ", "d").replace("Đ", "D")
    decomposed = unicodedata.normalize("NFKD", text)
    return "".join(c for c in decomposed if not unicodedata.combining(c)).lower()


def slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", norm(text)).strip("-")
    return re.sub(r"-{2,}", "-", s)[:70] or "item"


def _hkey(text: str) -> str:
    """Normalise a header line so trailing dashes/punctuation don't break matching."""
    return re.sub(r"\s+", " ", norm(text).strip(" .,:;-–—")).strip()


CAT_BY_HEADER = {_hkey(h): c for c in CATEGORIES for h in c[2]}

# Sections that are one company's catalogue: the section header is the brand,
# so rows inside them carry no separate brand header of their own.
IMPLICIT_BRAND = {"bread": "MLINAR", "koestlin": "KOESTLIN"}


def _near(a: str, b: str) -> bool:
    """True when two tokens differ by at most one substitution.

    The PDF mis-spells its own repeated brand name in places -- the Alpro
    section reads "ALPRO SOJA (Drinks): ... ALPEO" -- and an exact match would
    silently attribute the whole Alpro range to the brand above it.
    """
    if a == b:
        return True
    if len(a) != len(b) or len(a) < 4:
        return False
    return sum(1 for x, y in zip(a, b) if x != y) == 1


def _tokens_match(head: list[str], tail: list[str]) -> bool:
    return len(head) == len(tail) and all(_near(a, b) for a, b in zip(head, tail))


def detect_brand_header(latin: str) -> tuple[str, str] | None:
    """
    Brand headers repeat the company name at both ends of the line, e.g.
    "PODRAVKA PODRAVKA" or "KELLOGS: : KELLOGS" or
    "NAŠE KLASJE: Dairy, Not Chalav Israel NAŠE KLASJE".

    Returns (brand, middle_text) where middle_text may carry a kashrut note.
    """
    # A brand header never carries pack sizes -- those lines are product rows
    # such as "STICKS SALADOS 250g / Salados Sticks", whose repeated first and
    # last word would otherwise look like a header.
    if SIZE_RE.search(latin):
        return None
    cleaned = re.sub(r"[():*]", " ", latin)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    words = cleaned.split(" ")
    if len(words) < 2:
        return None
    # Longest suffix that also forms the prefix.
    for n in range(min(4, len(words) // 2), 0, -1):
        head = [norm(w) for w in words[:n]]
        tail = [norm(w) for w in words[-n:]]
        if _tokens_match(head, tail) and all(h for h in head):
            # Take the leading spelling: it is the section title, and where the
            # two ends disagree (ALPRO/ALPEO) the leading one is the correct one.
            brand = " ".join(words[:n]).strip(" ,.:;-")
            middle = " ".join(words[n:-n]).strip(" ,.:;-")
            if len(brand) < 2 or brand.isdigit():
                continue
            # "Curry / Curry", "Marzipan Rohmasse/ raw marzipan" and
            # "Chokella / Nestle chokella" are product rows whose Croatian and
            # English names share a word -- they only look like headers. A real
            # header has no name separator in the middle, unless that middle is
            # itself a kashrut declaration ("NESTLE ZITARICE/ Cereals: Dairy...").
            if "/" in middle and not kashrut_from_text(middle)[0]:
                continue
            return brand, middle
    return None


def kashrut_from_text(text: str) -> tuple[str | None, str | None]:
    """Read an explicit kashrut marker out of a header/modifier line."""
    low = norm(text)
    if "not chalav israel" in low or "not chalav yisrael" in low:
        return "dairy", "Not Chalav Israel"
    if re.search(r"\bdairy\b|\bmlijecni\b", low):
        return "dairy", None
    if re.search(r"\bparve\b|\bparva\b|\bpareve\b|\bhoverah\b", low):
        return "pareve", None
    return None, None


# The PDF's German sections are headed "HRV/GER/ENG", but their rows carry only
# "German / English" -- there is no Croatian at all for the imported German
# brands. Labelling the first segment "Croatian" was wrong for 142 rows.
_GERMAN = re.compile(
    r"[äöüßÄÖÜ]|\b(mit|und|ohne|für|Vollkorn|Knusper|M[üu]sli|Schoko\w*|Fr[üu]chte|"
    r"Zucker|Nuss|Haferflocken|Zartbitter|Di[äa]t|Streusel|Pastete|Bratling|"
    r"Kr[äa]uter|R[äa]ucher|Sahne|Milch|Wei[ßs]|K[äa]se|Erdbeer|Apfel|Zimt|Honig|"
    r"Getr[äa]nk|Kleie|Flocken|Bohnen|Sch[öo]ko)\b")
_CROATIAN = re.compile(
    r"[čćšžđČĆŠŽĐ]|\b(sve|vrste|bez|sa|od|mlijeko|kruh|riba|vo[cć]e|povr[cć]e|"
    r"slani|keksi|juha|umak|smrznut\w*|konzerv\w*|prah\w*|tjestenina)\b", re.I)


def detect_lang(text: str) -> str | None:
    """Which language the non-English segment is in, when it can be told."""
    if not text:
        return None
    german, croatian = _GERMAN.search(text), _CROATIAN.search(text)
    if german and not croatian:
        return "de"
    if croatian and not german:
        return "hr"
    return None


def clean_name(text: str) -> str:
    """
    Tidy the debris that Hebrew-stripping and line-wrapping leave behind.

    Removing the Hebrew column strips its punctuation with it, so rows like the
    Anamarija coffee list end as "... Kava santos , ,, : *", and a wrapped line
    can rejoin as "Vegetarian bratwurst(Sausage)without egg".
    """
    t = re.sub(r"\s+", " ", text)
    t = re.sub(r"\s*,(\s*,)+", ",", t)          # ", ,, ," -> ","
    t = re.sub(r"\(\s*\)", "", t)                # empty brackets left by Hebrew
    t = re.sub(r"\)(?=[A-Za-zÀ-ž])", ") ", t)    # ")without" -> ") without"
    t = re.sub(r"(?<=[a-zà-ž])\(", " (", t)      # "bratwurst(" -> "bratwurst ("
    t = re.sub(r"^[\s,:;*.\-–]+", "", t)
    t = re.sub(r"[\s,:;*.\-–]+$", "", t)
    # A bracket with no partner is leftover from the Hebrew column, not part
    # of the product name.
    if t.count("(") != t.count(")"):
        t = t.replace("(", " ").replace(")", " ")
    # The Hebrew column repeats figures that appear in the Latin name, and
    # stripping its letters strands them: "8 Fruit Muesli 8". Only a trailing
    # number already present earlier in the name is removed, so a genuine
    # trailing figure such as "Glenfiddich Whisky 12" survives.
    m = re.search(r"\s(\d{1,2})$", t)
    if m and re.search(rf"(?<![\d]){re.escape(m.group(1))}(?![\d])", t[: m.start()]):
        t = t[: m.start()]
    return re.sub(r"\s+", " ", t).strip()


def parse_names(latin: str) -> dict:
    """
    Split "Croatian name / English name" into languages.

    Rows are written HRV/ENG or HRV/GER/ENG. The German column, when present,
    is the first segment and Croatian the second; there is no reliable marker
    distinguishing them, so the leading segment is stored as `hr` and any
    middle segment as `de` only when the section header declared a GER column.
    """
    parts = [p.strip(" .,;") for p in re.split(r"\s*/\s*", latin) if p.strip(" .,;")]
    if not parts:
        return {}
    if len(parts) == 1:
        return {"hr": parts[0], "en": parts[0]}
    return {"hr": parts[0], "en": parts[-1], "alt": parts[1:-1] or None}


def tags_for(text: str) -> list[str]:
    low = norm(text)
    found = []
    for tag, needles in TAG_RULES:
        if any(n in low for n in needles):
            found.append(tag)
    return found


def main() -> None:
    lines = RAW.read_text(encoding="utf-8").split("\n")

    products: list[dict] = []
    brands: dict[str, dict] = {}
    page = 0
    cat = None
    cat_default = None
    brand = None
    brand_status = None
    brand_note = None
    # Section status is declared by lines like "Fresh baked products (Pareve)"
    # or "Snacks, sweet and salty (Dairy, not chalav Israel)". It outlives brand
    # headers, which is why it is tracked separately: inside the Koestlin annex
    # the Parve/Dairy split spans many brand-less pages.
    section_status = None
    section_note = None
    requires_symbol = False   # sticky until the next section or sub-heading
    subheading = None
    seen_ids: dict[str, int] = {}
    warnings: list[str] = []
    prev_latin = ""

    def flush_product(latin: str, heb: str | None, extra: dict | None = None) -> None:
        nonlocal products
        names = parse_names(latin)
        if not names:
            return
        english = names.get("en") or names.get("hr") or ""
        english = clean_name(english)
        hr_name = clean_name(names.get("hr") or "")
        if english.startswith("(") and "(" in hr_name:
            lead = hr_name.split("(", 1)[0].strip()
            if lead:
                english = f"{lead} {english}"
                names = {**names, "en": english}
        if norm(english) in {"all kinds", "sve vrste", "all the kinds",
                             "all kinds of classica pastas"}:
            english = "All varieties"
            names = {**names, "en": english}
        sizes = sorted({m.group(0).replace(" ", "") for m in SIZE_RE.finditer(latin)},
                       key=lambda s: (len(s), s))
        # Strip sizes out of the display names, keep them as structured data.
        clean = {k: (clean_name(SIZE_RE.sub("", v))
                     if isinstance(v, str) else v)
                 for k, v in names.items()}
        explicit_status = ((extra or {}).get("status") or brand_status
                           or section_status)
        status = explicit_status or cat_default
        explicit = bool(explicit_status) or cat[0] in EXPLICIT_DEFAULT_CATEGORIES
        note = (extra or {}).get("note") or brand_note or section_note
        req = (extra or {}).get("requiresSymbol", requires_symbol)
        # `requiresHechsher` is kept orthogonal to the dairy/pareve status so a
        # row like Mlinar's Sacher torte stays *dairy* while also demanding a
        # symbol on the package. Collapsing the two would lose the dairy fact.
        if req and status is None:
            status = "requires-symbol"
        scope = "all-varieties" if re.search(
            r"\ball kinds\b|\bsve vrste\b|\ball the kinds\b|\bsvi sokovi\b|\ball \d*\s*juices\b",
            norm(latin)) else "item"

        base = slug(f"{cat[0]}-{brand or ''}-{english or names.get('hr','')}")
        n = seen_ids.get(base, 0)
        seen_ids[base] = n + 1
        pid = base if n == 0 else f"{base}-{n + 1}"

        first = clean.get("hr")
        products.append({
            "id": pid,
            "originalLang": detect_lang(first) if first and first != english else None,
            "category": cat[0],
            "brand": brand or IMPLICIT_BRAND.get(cat[0]),
            "subheading": subheading,
            "names": {k: v for k, v in clean.items() if v},
            "hebrew": heb,
            "sizes": sizes or None,
            "kashrut": {
                "status": status,
                "explicit": explicit,
                "requiresHechsher": bool(req),
                "certifier": (extra or {}).get("certifier"),
                "note": note,
            },
            "scope": scope,
            "tags": tags_for(latin) or None,
            "sourcePage": page,
        })

    i = 0
    while i < len(lines):
        raw = lines[i]
        i += 1
        if not raw.strip():
            continue
        m = PAGE_RE.match(raw.strip())
        if m:
            page = int(m.group(1))
            continue
        latin = strip_hebrew(raw)
        heb = hebrew_of(raw)
        low = norm(latin)

        # --- skip chrome -------------------------------------------------
        # Lines that were pure Hebrew leave only stray brackets behind.
        if not latin or latin.isdigit() or not re.search(r"[A-Za-zÀ-ž]", latin):
            continue
        if low.startswith("www.bet-israel.com") or low.startswith("index"):
            continue
        if re.fullmatch(r"(hrv|eng|ger|hrv/eng|hrv/ger/eng|hrv/ger /eng|hrv / eng|kashrut status)[ /a-z]*", low):
            continue
        if "authorised by" in low or "hebrew and design" in low or "web by" in low:
            continue
        if low.startswith("koser proizvodi u hrvatskoj"):
            continue
        # Page 2 is the index and page 48 is the back-cover colophon -- the
        # community's address, phone and the "where to buy" chain list. Neither
        # holds products, and the colophon was arriving as eight of them.
        if page in (2, 48):
            continue

        # --- category header ---------------------------------------------
        if _hkey(latin) in CAT_BY_HEADER:
            cat = CAT_BY_HEADER[_hkey(latin)]
            cat_default = cat[3]
            brand = brand_status = brand_note = subheading = None
            section_status = section_note = None
            requires_symbol = False
            continue
        if cat is None:
            continue

        # --- inline "only with kosher symbol" modifier ---------------------
        if any(k in low for k in REQUIRES_SYMBOL_MARKERS) and "/" in latin and len(latin) < 90:
            requires_symbol = True
            continue

        # --- pareve/dairy section modifiers (Mlinar & Koestlin annex) ------
        if re.search(r"fresh baked products|snacks, sweet and salty", low):
            st, note = kashrut_from_text(latin)
            if st:
                section_status, section_note = st, note
                brand_status = brand_note = None
                requires_symbol = False
                subheading = re.sub(r"\s*\(.*?\)\s*", " ", latin.split("/")[0]).strip() or None
            continue

        # --- alcohol table -------------------------------------------------
        # Emitted wholesale from ALCOHOL_TABLE below; the raw lines are skipped.
        if cat[0] == "alcohol":
            continue

        # --- brand header ---------------------------------------------------
        bh = detect_brand_header(latin)
        if bh:
            brand, middle = bh
            brand = brand.strip(" .,:;-")
            st, note = kashrut_from_text(middle)
            brand_status, brand_note = st, note
            requires_symbol = False
            subheading = None
            key = norm(brand)
            entry = brands.setdefault(key, {
                "id": slug(brand), "name": brand, "categories": set(),
                "origin": "croatian" if norm(brand) in {norm(b) for b in CROATIAN_BRANDS} else "imported",
            })
            entry["categories"].add(cat[0])
            # Reuse the first spelling seen so casing variants of the same brand
            # ("GRANOvita" / "GranoVita") never split into two entries.
            brand = entry["name"]
            continue

        # --- "Basic Products" pattern: "Flour:" heading + company list ------
        if cat[0] == "basics" and latin.rstrip().endswith(":"):
            subheading = latin.rstrip(":").strip()
            # the following line(s) are the approved companies
            companies, consumed = [], 0
            while i + consumed < len(lines):
                nxt = strip_hebrew(lines[i + consumed])
                if not nxt or nxt.isdigit() or nxt.rstrip().endswith(":") or PAGE_RE.match(lines[i + consumed].strip()):
                    break
                companies.append(nxt)
                consumed += 1
                if consumed >= 3:
                    break
            i += consumed
            blob = " ".join(companies)
            names = parse_names(subheading)
            english = names.get("en") or subheading
            base = slug(f"basics-{english}")
            n = seen_ids.get(base, 0)
            seen_ids[base] = n + 1
            products.append({
                "id": base if n == 0 else f"{base}-{n+1}",
                "category": "basics",
                "brand": None,
                "subheading": None,
                "names": {k: v for k, v in names.items() if v},
                "hebrew": heb,
                "sizes": None,
                "kashrut": {"status": "pareve", "explicit": False,
                            "requiresHechsher": False, "certifier": None,
                            "note": None},
                "scope": "all-varieties",
                "approvedCompanies": split_companies(blob),
                "tags": tags_for(subheading + " " + blob) or None,
                "sourcePage": page,
            })
            subheading = None
            continue

        # --- sub-heading inside a category (e.g. "Meki sirevi/ Soft cheeses:")
        if latin.rstrip().endswith(":") and len(latin) < 80:
            subheading = latin.rstrip(":").strip()
            requires_symbol = False
            continue

        # --- continuation of a wrapped product name -------------------------
        if products and is_continuation(latin, low, prev_latin):
            tgt = products[-1]
            if tgt["names"].get("en"):
                tgt["names"]["en"] = clean_name(f"{tgt['names']['en']} {latin}")
            prev_latin = latin
            continue

        # --- ordinary product row -------------------------------------------
        flush_product(latin, heb)
        prev_latin = latin

    for cid, bname in IMPLICIT_BRAND.items():
        if any(p["category"] == cid for p in products):
            brands.setdefault(norm(bname), {
                "id": slug(bname), "name": bname, "categories": set(),
                "origin": "croatian",
            })["categories"].add(cid)

    products.extend(build_alcohol(lines))

    # brands -> serialisable
    brand_list = sorted(
        ({**b, "categories": sorted(b["categories"])} for b in brands.values()),
        key=lambda b: b["name"].lower(),
    )

    for p in products:
        if p["kashrut"]["status"] is None:
            warnings.append(f"p{p['sourcePage']}: no kashrut status for {p['id']}")

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "products.json").write_text(
        json.dumps(products, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "brands.json").write_text(
        json.dumps(brand_list, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "categories.json").write_text(json.dumps([
        {"id": c[0], "label": c[1], "defaultStatus": c[3], "icon": c[4], "aisle": c[5],
         "count": sum(1 for p in products if p["category"] == c[0])}
        for c in CATEGORIES
    ], ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"products: {len(products)}   brands: {len(brand_list)}")
    for c in CATEGORIES:
        n = sum(1 for p in products if p["category"] == c[0])
        print(f"  {c[0]:16s} {n:4d}")
    if warnings:
        print(f"\n{len(warnings)} rows without kashrut status:")
        for w in warnings[:25]:
            print("   ", w)


# The alcohol table's Hebrew column repeats the kashrut status next to the
# drink name ("לא כשר קאמפרי"). Only the name belongs in the product record --
# the status is already a structured field, and leaving it in would render as
# "Campari not kosher" wherever the Hebrew name is shown.
_STATUS_HEBREW = ["כשר חלבי", "לא כשר", "כשר"]


def strip_status_hebrew(raw: str) -> str:
    out = raw
    for phrase in _STATUS_HEBREW:
        visual = phrase[::-1]
        # The PDF letter-spaces its Hebrew, so allow gaps between characters.
        pattern = r"\s*".join(re.escape(c) for c in visual if not c.isspace())
        out = re.sub(pattern, " ", out)
    return out


def build_alcohol(lines: list[str]) -> list[dict]:
    """Emit the hand-transcribed alcohol table, attaching Hebrew and page
    numbers by locating each entry's row in the raw text."""
    located: dict[str, tuple[int, str | None]] = {}
    page = 0
    for raw in lines:
        m = PAGE_RE.match(raw.strip())
        if m:
            page = int(m.group(1))
            continue
        if page not in (37, 38):
            continue
        latin = strip_hebrew(raw)
        if latin and re.match(r"(not\s+)?kosher|generally\s+kosher", norm(latin)):
            located[norm(latin)] = (page, hebrew_of(strip_status_hebrew(raw)))

    out = []
    for name, status, certifier, note, req, aliases in ALCOHOL_TABLE:
        page_no, heb = 37, None
        for key, (pg, hb) in located.items():
            if norm(name) in key:
                page_no, heb = pg, hb
                break
        out.append({
            "id": slug(f"alcohol-{name}"),
            "category": "alcohol",
            "brand": None,
            "subheading": None,
            "names": {"hr": name, "en": name},
            "aliases": aliases or None,
            "hebrew": heb,
            "sizes": None,
            "kashrut": {
                "status": status,
                "explicit": True,
                "requiresHechsher": req,
                "certifier": certifier,
                "note": note,
            },
            "scope": "item",
            "tags": None,
            "sourcePage": page_no,
        })
    return out


def split_companies(blob: str) -> list[str]:
    blob = re.sub(r"\s*\(.*?\)\s*", " ", blob)
    parts = re.split(r"[,/]| - |–", blob)
    return [p.strip(" .;") for p in parts if len(p.strip(" .;")) > 1]


# A line that stops mid-phrase. Only word connectives count: a product name
# routinely ends in a dash or a comma ("Peppers – mild", "After Eight – sve
# vrste"), and treating those as unfinished swallowed the next product.
DANGLING_TAIL = re.compile(r"\b(?:and|with|of|in|the)\s*$", re.I)
# Punctuation endings are a weaker hint, used only to relax the length test.
SOFT_TAIL = re.compile(r"[-–&,]\s*$")


def is_continuation(latin: str, low: str, prev_latin: str) -> bool:
    """
    A wrapped tail of the previous row.

    The decisive signal is that the *previous* line ran to the column edge or
    ended on a dangling connector. Without that check, genuine single-language
    rows that happen to start lowercase (the whole "reis-fit Risbellis ..."
    range on p.11) get swallowed into the row above them.
    """
    if "/" in latin or ":" in latin:
        return False
    if len(latin) > 60 or SIZE_RE.search(latin):
        return False
    starts_bracket = latin.lstrip()[:1] == "("
    dangling = bool(DANGLING_TAIL.search(prev_latin))
    wrapped = (dangling or SOFT_TAIL.search(prev_latin) is not None
               or len(prev_latin) >= (45 if starts_bracket else 58))
    if not wrapped:
        return False
    # "...Snack with Cheese and" + "Pepper": when the previous line breaks on a
    # connective the tail belongs to it whatever its capitalisation.
    if dangling:
        return True
    first = latin.lstrip()[:1]
    return bool(first) and (
        first.islower()
        or first == "("
        or low.startswith(("and ", "with ", "salted", "elderberry"))
    )


# ---------------------------------------------------------------------------
# The alcohol table (pp. 37-38) is transcribed by hand rather than parsed.
#
# It is the only section that marks items NOT kosher, three of its rows wrap
# across lines in a way that defeats column parsing (Beer, Red/White Wine,
# Sheridan's), and a mistake here is the worst failure this dataset can have.
# Names keep the PDF's own spelling; `aliases` carry the conventional spellings
# so search still finds them.
#
# Fields: (pdf name, status, certifier, note, requiresSymbol, aliases)
# ---------------------------------------------------------------------------
ALCOHOL_TABLE = [
    ("Blackberry wine", "conditional", "PZ Cerine", None, False, []),
    ("Amaretto", "pareve", None, None, False, []),
    ("Amarula Cream", "dairy", None, "Kosher but dairy", False, []),
    ("Apricot/Peach Bols", "not-kosher", None, None, False, ["Bols"]),
    ("Arak/Pastis", "conditional", None, "Generally kosher", False, ["Arak", "Pastis"]),
    ("Bacardi", "conditional", None, "Generally kosher", False, []),
    ("Beer", "pareve", None,
     "Listed brands: Bavaria, Heineken, Stella Artois, Ožujsko", False,
     ["Pivo", "Bavaria", "Heineken", "Stella Artois", "Ožujsko"]),
    ("Benedictine", "not-kosher", None, None, False, ["Bénédictine"]),
    ("Campari", "not-kosher", None, None, False, []),
    ("Champagne", "not-kosher", None, None, False, ["Šampanjac"]),
    ("Cherry Brandy", "conditional", "Maraska", None, False, []),
    ("Cognac Grand Marinier", "not-kosher", None, None, False, ["Grand Marnier", "Cognac"]),
    ("Cointreau", "pareve", None, None, False, []),
    ("Courroisier", "not-kosher", None, None, False, ["Courvoisier"]),
    ("Drambuie", "pareve", None, None, False, []),
    ("Egg Liqueur", "not-kosher", None, None, False, ["Advocaat"]),
    ("Gin", "pareve", None, None, False, []),
    ("Grape Juice", "not-kosher", None,
     "Grape products require rabbinic supervision", False, ["Sok od grožđa"]),
    ("Jägermeister", "pareve", None, None, False, ["Jagermeister"]),
    ("Kahlua", "pareve", None, None, False, ["Kahlúa"]),
    ("Kirschwasser (Kirsch)", "pareve", None, None, False, ["Kirsch"]),
    ("Lochen-Ohra", "pareve", None, None, False, []),
    ("Maraschino", "conditional", "Maraska", None, False, []),
    ("Margarita", "pareve", None, None, False, []),
    ("Martini", "not-kosher", None, None, False, []),
    ("Mozart Liqueur", "dairy", None, "Kosher but dairy", False, []),
    ("Ouzo", "not-kosher", None, None, False, []),
    ("Pernod", "not-kosher", None, None, False, []),
    ("Cherry Heering", "pareve", None, None, False, []),
    ("Red/White Wine", "not-kosher", None,
     "Only when it carries a kosher symbol. All wine requires rabbinic supervision.",
     True, ["Crveno vino", "Bijelo vino", "Wine", "Vino"]),
    ("Rum", "pareve", None, None, False, []),
    ("Sambuva", "dairy", None, "Kosher but dairy", False, ["Sambuca"]),
    ("Sheridan's", "conditional", "Maraska, Badel 1862", None, False, ["Sheridans"]),
    ("Slivovitz", "pareve", None, None, False, ["Šljivovica"]),
    ("Tequilla", "pareve", None, None, False, ["Tequila"]),
    ("Tia Maria", "pareve", None, None, False, []),
    ("Tzuika", "pareve", None, None, False, ["Cuica", "Țuică"]),
    ("Vermouth", "not-kosher", None, None, False, ["Vermut"]),
    ("Whisky/Scotch", "pareve", None, None, False, ["Whiskey", "Scotch"]),
    ("Whisky Johnnie Walker", "pareve", None, None, False, ["Johnnie Walker"]),
    ("JACK DANIEL'S", "pareve", None, None, False, ["Jack Daniels"]),
    ("Glenfiddich Whisky 12", "pareve", None, None, False, ["Glenfiddich"]),
    ("CHIVAS REGAL 12", "pareve", None, None, False, ["Chivas Regal"]),
]


if __name__ == "__main__":
    main()
