#!/usr/bin/env python3
"""
Generate the site's responsive brand imagery from assets/brand/.

Run this after changing artwork, then commit public/img/. It is deliberately
NOT part of `npm run build`: the deploy target only serves static files, and
adding a Python step to the build would make deployment depend on the host
having Pillow.

Usage:  python3 scripts/build-images.py
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "brand"
OUT = ROOT / "public" / "img"

# name, source, widths to emit, quality
# Widths cover the largest slot each image occupies plus a 2x retina variant;
# nothing is emitted wider than the master, so nothing is ever upscaled.
PLAN = [
    ("hero",        "1.webp",  [1600, 900],  76),
    ("brandmark",   "2.webp",  [1200, 600],  82),
    ("empty-search", "3.webp", [700, 380],   80),
    ("guide",       "4.webp",  [1400, 760],  78),
    ("stores",      "5.webp",  [1400, 760],  78),
    ("fish",        "6.webp",  [1400, 760],  80),
    ("alcohol",     "7.webp",  [1400, 760],  78),
    ("empty-list",  "8.webp",  [700, 380],   80),
    ("offline",     "9.webp",  [1200, 640],  78),
    ("about",       "10.webp", [1400, 760],  78),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    total = 0
    for name, src, widths, quality in PLAN:
        im = Image.open(SRC / src).convert("RGB")
        for w in widths:
            if w > im.width:
                continue
            h = round(im.height * w / im.width)
            resized = im.resize((w, h), Image.LANCZOS)
            path = OUT / f"{name}-{w}.webp"
            resized.save(path, "WEBP", quality=quality, method=6)
            size = path.stat().st_size
            total += size
            print(f"  {path.name:<24} {w}x{h:<5} {size // 1024:4d} KB")
    print(f"\n{total // 1024} KB total across {len(list(OUT.glob('*.webp')))} files")


if __name__ == "__main__":
    main()
