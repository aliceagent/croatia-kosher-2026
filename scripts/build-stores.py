#!/usr/bin/env python3
"""
Turn the raw Overpass export into data/stores.json.

The 2026 list names six chains under "Where to buy". This only maps where
those chains have branches -- the list publishes no per-product stock, and the
site says so wherever these are shown.

Source: OpenStreetMap contributors, ODbL. Refresh with scripts/fetch-stores.sh
"""
import json, re, unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
raw = json.loads((ROOT / "data" / "raw" / "osm-stores-raw.json").read_text())

# Ordered: the first pattern that matches wins, so "Interspar" is a SPAR and
# "Super Konzum" is a Konzum before the looser patterns get a chance.
CHAINS = [
    ("bio&bio", re.compile(r"\bbio\s*&\s*bio\b", re.I)),
    ("Kaufland", re.compile(r"\bkaufland\b", re.I)),
    ("Konzum", re.compile(r"\bkonzum\b", re.I)),
    ("Plodine", re.compile(r"\bplodine\b", re.I)),
    ("Lidl", re.compile(r"\blidl\b", re.I)),
    ("SPAR", re.compile(r"\b(inter)?spar\b", re.I)),
]
# "Spartak", "Sparkly Pet" and friends match \bspar only by accident.
SHOP_OK = {"supermarket", "convenience", "health_food", "greengrocer",
           "grocery", "department_store", "wholesale", "food"}


def city_of(tags):
    for k in ("addr:city", "addr:town", "addr:village", "addr:suburb"):
        if tags.get(k):
            return tags[k].strip()
    return None


def street_of(tags):
    street, num = tags.get("addr:street"), tags.get("addr:housenumber")
    if street and num:
        return f"{street} {num}"
    return street or None


def fold(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s or "")
                   if not unicodedata.combining(c)).lower()


out, seen = [], set()
skipped = 0
for el in raw["elements"]:
    tags = el.get("tags", {})
    name = (tags.get("name") or "").strip()
    if not name:
        continue
    shop = tags.get("shop")
    if shop and shop not in SHOP_OK:
        skipped += 1
        continue
    chain = next((c for c, pat in CHAINS if pat.search(name)), None)
    if not chain:
        skipped += 1
        continue

    lat = el.get("lat") or (el.get("center") or {}).get("lat")
    lon = el.get("lon") or (el.get("center") or {}).get("lon")
    if lat is None or lon is None:
        continue

    key = (chain, round(lat, 5), round(lon, 5))
    if key in seen:
        continue
    seen.add(key)

    out.append({
        "id": f"{el['type'][0]}{el['id']}",
        "chain": chain,
        "name": name,
        "lat": round(lat, 6),
        "lon": round(lon, 6),
        "city": city_of(tags),
        "street": street_of(tags),
        "openingHours": tags.get("opening_hours"),
    })

out.sort(key=lambda s: (s["chain"], fold(s["city"] or "zzz"), s["name"]))
(ROOT / "data" / "stores.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

import collections
print(f"stores: {len(out)}  (skipped {skipped} non-matching)")
for c, n in collections.Counter(s["chain"] for s in out).most_common():
    print(f"  {c:10s} {n:4d}")
cities = collections.Counter(fold(s["city"]) for s in out if s["city"])
print(f"  cities with a branch: {len(cities)}")
print("  top:", ", ".join(f"{c}({n})" for c, n in cities.most_common(8)))
