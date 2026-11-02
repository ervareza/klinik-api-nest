#!/usr/bin/env python3
"""Crop screenshot asli Postman dan Swagger: membuang bilah akun, tab, status, dan area kosong."""
from pathlib import Path
from PIL import Image

D = Path(__file__).resolve().parent.parent / "evidence/screenshots"
RAW = D / "raw"
SIDEBAR_RIGHT, TOP, BOTTOM_BAR = 640, 142, 56  # piksel retina pada jendela 2560x1600


def trim_bottom(im, pad=24):
    """Memotong area kosong di bawah isi dengan membandingkan tiap baris terhadap warna latar."""
    w, h = im.size
    bg = im.getpixel((w - 8, h - 8))
    px = im.load()
    for y in range(h - 1, 0, -1):
        if any(sum(abs(a - b) for a, b in zip(px[x, y], bg)) > 40 for x in range(40, w - 60, 6)):
            return im.crop((0, 0, w, min(h, y + pad)))
    return im


for raw in sorted(RAW.glob("[0-9]*.png")):
    im = Image.open(raw).convert("RGB")
    w, h = im.size
    main = trim_bottom(im.crop((SIDEBAR_RIGHT, TOP, w, h - BOTTOM_BAR)))
    main.save(D / f"postman-{raw.stem}.png", optimize=True)

# Struktur collection: hanya panel kiri, tanpa nama akun dan workspace
im = Image.open(RAW / "sidebar-source.png").convert("RGB")
trim_bottom(im.crop((0, 360, 840, 1410))).save(D / "postman-00-collection.png", optimize=True)

im = Image.open(RAW / "swagger-ui.png").convert("RGB")
im.save(D / "swagger-ui.png", optimize=True)
im = Image.open(RAW / "swagger-detail.png").convert("RGB")
im.save(D / "swagger-detail.png", optimize=True)
