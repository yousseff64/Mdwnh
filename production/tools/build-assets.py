#!/usr/bin/env python3
"""Derive everything the browser downloads from the masters in `masters/`.

    cd production && python3 tools/build-assets.py [step]

Steps: paper, hero, brand, fonts, works, titles, og. With no step, all but `fonts`
and `og` run (those two need fontTools and Chrome). Needs Pillow and cwebp.
Every file it writes is committed, so this only has to be run when a master
changes, but when one does, run it rather than editing a derivative by hand.

The heavy masters (the JPGs and PNGs under masters/) are not committed, the
same rule as /Art in the rest of the repo: only what this script writes
ships. The manifests and the brand SVGs are committed.
"""
import os
import subprocess
import sys

from PIL import Image, ImageEnhance

SRC = "masters"
OUT = "assets"

PAPER = (251, 250, 249)   # #FBFAF9, the brand's paper and this site's text
DEEP = (14, 14, 19)       # #0E0E13, the page

os.makedirs(OUT, exist_ok=True)


def report(path):
    print(f"{os.path.basename(path):28} {os.path.getsize(path) / 1024:7.1f} KB")


# ── the grain ─────────────────────────────────────────────────────────
# A 192px tile of specks, dark and light, mostly transparent, tiled over the
# hero and the footer the way Satr does it. It costs one paint and no blend
# mode.
def build_paper():
    import random
    rnd = random.Random(1405)          # fixed seed: the tile is reproducible
    n = 192
    g = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    px = g.load()
    for y in range(n):
        for x in range(n):
            r = rnd.random()
            # three populations, the way printed grain actually reads: a fine
            # dark tooth everywhere, fewer light flecks, and rare heavy dust
            if r < 0.30:
                px[x, y] = (24, 26, 30, rnd.randint(10, 26))
            elif r < 0.42:
                px[x, y] = (255, 255, 255, rnd.randint(14, 34))
            elif r < 0.4235:
                px[x, y] = (18, 20, 24, rnd.randint(70, 120))
    p = os.path.join(OUT, "grain.webp")
    g.save(p, "WEBP", lossless=True, method=6)
    report(p)


# ── the two big pictures that are not a work ──────────────────────────
# hero.png is the library render behind المدونة's own banner (Logos/BG2.png
# in the identity folder: the aisle of books looking up into the stars).
# It is held down a little in the file itself, so the white wordmark reads
# on it without a CSS filter or an overlay. about.jpg is the second library
# render (Logos/BG.jpg: the reading table under the lamps).
def build_hero():
    jobs = [("hero.png", "hero", 0.6), ("about.jpg", "about", 1.0)]
    for name, stem, light in jobs:
        im = Image.open(f"{SRC}/{name}").convert("RGB")
        if light != 1.0:
            im = ImageEnhance.Brightness(im).enhance(light)
        if im.width > 1920:
            im = im.resize((1920, round(im.height * 1920 / im.width)), Image.LANCZOS)
        tmp = f"{SRC}/.{stem}-flat.png"
        im.save(tmp)
        for w, suffix in ((1920, ""), (1280, "-1280"), (720, "-720")):
            out = f"{OUT}/{stem}{suffix}.webp"
            args = ["cwebp", "-quiet", "-q", "74", tmp, "-o", out]
            if w < im.width:
                args[4:4] = ["-resize", str(w), "0"]
            subprocess.run(args, check=True)
            report(out)
        os.remove(tmp)


# ── favicon, install tiles ────────────────────────────────────────────
# The smile mark alone: the lockup at 16px is a smudge. The favicon keeps the
# paper background (read against browser chrome that is usually light); the
# install tiles put the white mark on the page's own dark plate, because a
# home screen is somebody else's wallpaper. `any` and `maskable` are never
# the same file: the maskable copy is inset far enough that the mask only
# ever cuts plate.
def build_brand():
    black = Image.open(f"{SRC}/brand/mark.png").convert("RGBA")
    black = black.crop(black.getbbox())
    white = Image.open(f"{SRC}/brand/mark-white.png").convert("RGBA")
    white = white.crop(white.getbbox())

    def square(mark, size, inset, bg):
        plate = Image.new("RGBA", (size, size), (*bg, 255))
        m = mark.copy()
        m.thumbnail((int(size * inset),) * 2, Image.LANCZOS)
        plate.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
        return plate.convert("RGB")

    square(black, 512, .86, PAPER).save("favicon.png", "PNG", optimize=True)
    report("favicon.png")
    for size, inset, name in [(192, .7, "icon-192.png"), (512, .7, "icon-512.png"),
                              (512, .56, "icon-maskable-512.png"),
                              (180, .7, "apple-touch-icon.png")]:
        p = os.path.join(OUT, name)
        square(white, size, inset, DEEP).save(p, "PNG", optimize=True)
        report(p)


# ── Norsal, cut per script ────────────────────────────────────────────
# The studio's font is one variable file at the repo root (fonts/norsal.woff2,
# every weight, Arabic and Latin). This site serves it as two files with
# unicode-ranges, the way Satr serves Vazirmatn: an Arabic page preloads the
# Arabic cut, an English page the Latin one, and each only fetches the other
# if a glyph from it turns up. The weight axis and every joining feature are
# kept. Needs fontTools + brotli (`pip install fonttools brotli`).
ARABIC = (list(range(0x0600, 0x0700)) + list(range(0x0750, 0x0780)) + list(range(0x08A0, 0x0900))
          + list(range(0xFB50, 0xFE00)) + list(range(0xFE70, 0xFEFD))
          + [0x20, 0xA0, 0x200C, 0x200D, 0x200E, 0x200F, 0xAB, 0xBB])
LATIN = (list(range(0x20, 0x7F)) + list(range(0xA0, 0x100)) + [0x2013, 0x2018, 0x2019, 0x201C, 0x201D,
         0x2026, 0x2022, 0x20AC, 0x2122, 0x00D7])


def build_fonts():
    from fontTools import subset
    os.makedirs("fonts", exist_ok=True)
    for name, cps in (("arabic", ARABIC), ("latin", LATIN)):
        opts = subset.Options()
        opts.flavor = "woff2"
        opts.layout_features = ["*"]       # keep every joining / ligature feature
        font = subset.load_font("../fonts/norsal.woff2", opts)
        sub = subset.Subsetter(opts)
        sub.populate(unicodes=cps)
        sub.subset(font)
        out = f"fonts/norsal-{name}.woff2"
        subset.save_font(font, out, opts)
        report(out)


WIDTHS = (720, 1280)


def build_works():
    """Smaller copies of every case-study picture, for phones and tablets.

    The full-size .webp in assets/works/<id>/ is left exactly as it is and
    becomes the largest entry of a srcset. The 720 and 1280 copies are cut
    from the master JPG (never from the webp, so nothing is compressed twice)
    and only when the picture is wider than the copy. The generator finds
    them by name (<stem>-720.webp) and writes the srcset."""
    root = "masters/works"
    made = 0
    for pid in sorted(os.listdir(root)):
        mdir, adir = f"{root}/{pid}", f"assets/works/{pid}"
        if not os.path.isdir(mdir) or not os.path.isdir(adir):
            continue
        for name in sorted(os.listdir(adir)):
            stem, ext = os.path.splitext(name)
            if ext != ".webp" or name.startswith("._") or stem.startswith(("loop-", "reel-")) \
                    or stem.rsplit("-", 1)[-1] in ("720", "1280"):
                continue
            master = next((f"{mdir}/{stem}{e}" for e in (".jpg", ".png") if os.path.exists(f"{mdir}/{stem}{e}")), None)
            if not master:
                continue
            with Image.open(f"{adir}/{name}") as im:
                full_w = im.width
            for w in WIDTHS:
                out = f"{adir}/{stem}-{w}.webp"
                if full_w <= w * 1.15 or os.path.exists(out):
                    continue
                subprocess.run(["cwebp", "-quiet", "-q", "78", "-resize", str(w), "0", master, "-o", out], check=True)
                made += 1
    print(f"  {made} smaller copies written")


def build_titles():
    """A work whose page is titled with its own logo (`title_logo` in WORKS)
    has the lettering, in its own colours, at masters/works/<id>/
    title-logo.png. It is cropped to its ink and written as WebP with alpha,
    at most 1000px wide: the title shows it at up to about 450px, so that
    covers a retina screen."""
    import glob
    for src in sorted(glob.glob("masters/works/*/title-logo.png")):
        pid = src.split("/")[2]
        im = Image.open(src).convert("RGBA")
        im = im.crop(im.getchannel("A").getbbox())
        if im.width > 1000:
            im = im.resize((1000, round(im.height * 1000 / im.width)), Image.LANCZOS)
        out = f"assets/works/{pid}/title-logo.webp"
        im.save(out, "WEBP", quality=90, alpha_quality=90, method=6)
        report(out)


def build_og():
    """The link-preview image: the hero itself (the library, the wordmark in
    paper white, the contact line in red under it) rendered by headless
    Chrome from masters/og/share.html at 2x and cut to 1200x630. The HTML is
    written here from the brand's own SVG, so the picture can always be
    rebuilt.

    The file name carries a date: WhatsApp, X and LinkedIn cache a preview by
    the image URL, so a new picture needs a new name or nobody sees it."""
    import re
    src = open(f"{SRC}/brand/lockup-ar-white.svg", encoding="utf-8").read()
    shapes = re.findall(r"<(?:path|ellipse)\b[^>]*?/?>", src)[5:]
    shapes = "".join(re.sub(r'\s*class="[^"]*"', "", s) for s in shapes)
    html = f"""<!doctype html><meta charset="utf-8">
<style>
@font-face{{font-family:N;src:url("../../fonts/norsal-latin.woff2")}}
html,body{{margin:0;width:1200px;height:630px;overflow:hidden;background:#0E0E13}}
body{{position:relative;font-family:N,sans-serif}}
.bg{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.grain{{position:absolute;inset:0;background:url("../../assets/grain.webp");opacity:.3}}
.logo{{position:absolute;left:50%;top:282px;width:300px;translate:-50% -50%;fill:#FBFAF9;stroke:#FBFAF9}}
.foot{{position:absolute;left:0;right:0;bottom:34px;display:flex;justify-content:center;gap:88px;color:#F56549;font-size:20px;font-weight:500}}
</style>
<img class="bg" src="../../assets/hero.webp">
<div class="grain"></div>
<svg class="logo" viewBox="489 108 442 242">{shapes}</svg>
<div class="foot"><span>contact@mdwn.studio</span><span>mdwn.studio</span></div>
"""
    os.makedirs("masters/og", exist_ok=True)
    with open("masters/og/share.html", "w", encoding="utf-8") as f:
        f.write(html)
    chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    png = os.path.abspath("masters/og/share.png")
    subprocess.run([chrome, "--headless=new", "--hide-scrollbars", "--force-device-scale-factor=2",
                    "--window-size=1200,630", "--virtual-time-budget=2000", "--allow-file-access-from-files",
                    f"--screenshot={png}", "file://" + os.path.abspath("masters/og/share.html")],
                   check=True, capture_output=True)
    out = f"{OUT}/og-share-2026-11.jpg"
    Image.open(png).convert("RGB").resize((1200, 630), Image.LANCZOS).save(
        out, "JPEG", quality=86, optimize=True, progressive=True)
    report(out)


STEPS = {"paper": build_paper, "hero": build_hero, "brand": build_brand,
         "fonts": build_fonts, "works": build_works, "titles": build_titles, "og": build_og}

if __name__ == "__main__":
    want = sys.argv[1:] or ["paper", "hero", "brand", "works", "titles"]
    for step in want:
        STEPS[step]()
    print("\ndone.")
