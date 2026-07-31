#!/usr/bin/env python3
"""
Turn the raw Overpass export into data/stores.json.

The 2026 list names six chains under "Where to buy". This only maps where
those chains have branches -- the list publishes no per-product stock, and the
site says so wherever these are shown.

Cities are assigned from coordinates, not from OpenStreetMap's `addr:city`
tag: 57% of branches carry no city tag, so tag-based matching silently loses
most of a city's shops (a search for Zagreb found 93 of its 264 branches).
Tagged branches derive each city's centroid, then every branch is bucketed by
distance to the nearest one.

Source: OpenStreetMap contributors, ODbL.
"""
import json
import math
import re
import unicodedata
from collections import Counter, defaultdict
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

# Anchors for places a traveller is likely to search for, so they get a city
# bucket even when no branch there carries an addr:city tag.
SEED_CITIES = {
    "Zagreb": (45.8150, 15.9819), "Split": (43.5081, 16.4402),
    "Rijeka": (45.3271, 14.4422), "Osijek": (45.5550, 18.6955),
    "Zadar": (44.1194, 15.2314), "Dubrovnik": (42.6507, 18.0944),
    "Pula": (44.8666, 13.8496), "Varaždin": (46.3057, 16.3366),
    "Šibenik": (43.7350, 15.8952), "Karlovac": (45.4870, 15.5478),
    "Slavonski Brod": (45.1603, 18.0156), "Sisak": (45.4658, 16.3767),
    "Vinkovci": (45.2881, 18.8048), "Velika Gorica": (45.7125, 16.0756),
    "Koprivnica": (46.1639, 16.8330), "Čakovec": (46.3844, 16.4339),
    "Bjelovar": (45.8990, 16.8489), "Poreč": (45.2269, 13.5959),
    "Rovinj": (45.0811, 13.6387), "Makarska": (43.2969, 17.0178),
    "Trogir": (43.5125, 16.2517), "Opatija": (45.3378, 14.3053),
    "Umag": (45.4319, 13.5236), "Vodice": (43.7594, 15.7783),
    "Biograd na Moru": (43.9400, 15.4519), "Samobor": (45.8028, 15.7108),
    "Zaprešić": (45.8558, 15.8081), "Đakovo": (45.3081, 18.4103),
    "Požega": (45.3403, 17.6853), "Virovitica": (45.8319, 17.3839),
    "Kutina": (45.4811, 16.7783), "Metković": (43.0542, 17.6486),
    "Knin": (44.0411, 16.1997), "Sinj": (43.7033, 16.6394),
    "Gospić": (44.5464, 15.3744), "Ogulin": (45.2661, 15.2264),
    "Krapina": (46.1608, 15.8781), "Pazin": (45.2400, 13.9367),
    "Crikvenica": (45.1769, 14.6919), "Županja": (45.0778, 18.6994),
    "Vukovar": (45.3419, 19.0022), "Daruvar": (45.5906, 17.2253),
    "Dugo Selo": (45.8000, 16.2350), "Omiš": (43.4447, 16.6889),
    # Solin and Kaštela are deliberately absent: they are Split's metro area,
    # and someone planning a trip searches "Split", not the suburb they happen
    # to be standing in.
}

# Coarse regions, useful when planning a trip. Bounds are deliberately loose:
# this is for "which part of the country", not administrative accuracy.
REGIONS = [
    ("Istria", lambda la, lo: 44.65 <= la <= 45.55 and lo <= 14.10),
    ("Kvarner & Highlands", lambda la, lo: 44.40 <= la <= 45.65 and 14.10 < lo <= 15.30),
    ("Dalmatia", lambda la, lo: la < 44.40),
    ("Slavonia", lambda la, lo: lo > 17.20),
    ("Zagreb & Central Croatia", lambda la, lo: True),
]

# Producers whose range is health-food / organic import rather than everyday
# supermarket stock. Used to explain what bio&bio is for -- an inference about
# the kind of shop, never a claim about what any branch actually carries.
HEALTH_FOOD_BRANDS = [
    "GranoVita", "SCHNEEKOPPE", "VITAquell", "DEMETER", "TARTEX",
    "PROVAMEL", "ALPRO", "KOELLN", "SEEBERGER", "MILUPA", "MEßMER",
]


def km(a, b):
    R = 6371.0
    dlat = math.radians(b[0] - a[0])
    dlon = math.radians(b[1] - a[1])
    h = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0]))
         * math.sin(dlon / 2) ** 2)
    return 2 * R * math.asin(math.sqrt(h))


def fold(s):
    return "".join(c for c in unicodedata.normalize("NFKD", s or "")
                   if not unicodedata.combining(c)).lower()


def tagged_city(tags):
    for k in ("addr:city", "addr:town", "addr:village"):
        if tags.get(k):
            return tags[k].strip()
    return None


def street_of(tags):
    street, num = tags.get("addr:street"), tags.get("addr:housenumber")
    if street and num:
        return f"{street} {num}"
    return street or None


def region_of(lat, lon):
    for name, test in REGIONS:
        if test(lat, lon):
            return name
    return "Croatia"


# --------------------------------------------------------------- parse ----
rows, seen, skipped = [], set(), 0
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
    rows.append({
        "id": f"{el['type'][0]}{el['id']}",
        "chain": chain,
        "name": name,
        "lat": round(lat, 6),
        "lon": round(lon, 6),
        "_tagged": tagged_city(tags),
        "street": street_of(tags),
        "openingHours": tags.get("opening_hours"),
    })

# ------------------------------------------------- derive city centroids ---
groups = defaultdict(list)
for r in rows:
    if r["_tagged"]:
        groups[r["_tagged"]].append((r["lat"], r["lon"]))

# Radius per city: big enough to absorb a metro area, small enough that a
# neighbouring town is not swallowed by its larger neighbour.
RADIUS = {"Zagreb": 18.0, "Split": 16.0, "Rijeka": 14.0, "Osijek": 12.0}
DEFAULT_RADIUS = 8.0

centroids = dict(SEED_CITIES)
for city, pts in groups.items():
    if city in centroids:
        continue
    c = (sum(p[0] for p in pts) / len(pts), sum(p[1] for p in pts) / len(pts))
    # Drop centroids that sit inside a seeded metro. OSM tags branches with
    # suburb and industrial-estate names -- "Zagreb / Lučko", "Sesvete",
    # "Odra", "Solin" -- and each would otherwise become its own "city",
    # splintering Zagreb into a dozen buckets nobody would think to search.
    if any(km(c, seed) < RADIUS.get(name, DEFAULT_RADIUS)
           for name, seed in SEED_CITIES.items()):
        continue
    centroids[city] = c

for r in rows:
    best, best_d = None, 1e9
    for city, c in centroids.items():
        d = km((r["lat"], r["lon"]), c)
        if d < min(RADIUS.get(city, DEFAULT_RADIUS), best_d):
            best, best_d = city, d
    r["city"] = best or r["_tagged"]
    r["region"] = region_of(r["lat"], r["lon"])
    r.pop("_tagged")

rows.sort(key=lambda s: (s["chain"], fold(s["city"] or "zzz"), s["name"]))

# ------------------------------------------------------------ city index ---
by_city = defaultdict(list)
for r in rows:
    if r["city"]:
        by_city[r["city"]].append(r)

cities = []
for city, group in by_city.items():
    chains = Counter(s["chain"] for s in group)
    lat = sum(s["lat"] for s in group) / len(group)
    lon = sum(s["lon"] for s in group) / len(group)
    cities.append({
        "name": city,
        "slug": re.sub(r"[^a-z0-9]+", "-", fold(city)).strip("-"),
        "region": region_of(lat, lon),
        "lat": round(lat, 5),
        "lon": round(lon, 5),
        "count": len(group),
        "chains": dict(chains.most_common()),
        "healthFood": chains.get("bio&bio", 0),
    })
cities.sort(key=lambda c: -c["count"])

# --------------------------------------------------------------- write ----
osm = raw.get("osm3s", {})
snapshot = (osm.get("timestamp_osm_base") or osm.get("timestamp_areas_base") or "")[:10]

out = {
    "snapshot": snapshot,
    "attribution": "© OpenStreetMap contributors, ODbL",
    "healthFoodBrands": HEALTH_FOOD_BRANDS,
    "cities": cities,
    "stores": rows,
}
(ROOT / "data" / "stores.json").write_text(
    json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")

print(f"stores: {len(rows)}  (skipped {skipped})  snapshot {snapshot}")
for c, n in Counter(s["chain"] for s in rows).most_common():
    print(f"  {c:10s} {n:4d}")
print(f"  cities: {len(cities)}   unplaced: {sum(1 for r in rows if not r['city'])}")
print("  largest:", ", ".join(f"{c['name']}({c['count']})" for c in cities[:8]))
bb = [c for c in cities if c["healthFood"]]
print(f"  bio&bio in {len(bb)} cities:",
      ", ".join(f"{c['name']}({c['healthFood']})" for c in bb))
