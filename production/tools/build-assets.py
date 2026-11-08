#!/usr/bin/env python3
"""Derive everything the browser downloads from the masters in `masters/`.

    cd production && python3 tools/build-assets.py [step]

Steps: hero-loop, hero, brand, fonts, works, titles, og. With no step, all but `fonts`
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
DEEP = (10, 10, 10)       # #0A0A0A, the page

os.makedirs(OUT, exist_ok=True)


def report(path):
    print(f"{os.path.basename(path):28} {os.path.getsize(path) / 1024:7.1f} KB")


# ── the two big pictures that are not a work ──────────────────────────
# hero.png is the library render behind المدونة's own banner: a frame of the
# shot the hero loop is made from, written there by `hero-loop` so the still
# and the video's first frame are the same picture.
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


# ── the hero, moving ──────────────────────────────────────────────
# The hero's library is one frame of a rendered shot: the camera tilting up
# the aisle, 240 frames at 1920x1080 in the campaign folder (HERO_SEQ, read
# only, never copied: it is 660 MB). This turns it into a silent loop:
#
#   * Every frame is kept and played at 24 fps, so the pan never stutters.
#   * The last LOOP_FADE frames dissolve into the first ones (smoothstep), so
#     the loop has no jump: 240 - 48 = 192 frames, 8 seconds.
#   * The file starts on a pure frame, f[LOOP_FADE], and that same frame
#     (undarkened) is written to masters/hero.png, so the still the page
#     paints first and the video's first frame are one picture and the
#     video fades in over it without a seam. Run `hero` after this step.
#   * Each frame is held down to 0.6 like the still.
#   * Two cuts: 1920x1080 for wide screens, and a 576x720 middle column for
#     phones, where the hero is taller than it is wide and a 16:9 file would
#     spend most of its bytes off screen. x264 at veryslow with aq-mode 3,
#     which keeps the fog's dark gradients from banding.
#
# The page never waits for any of this: the still is what paints, and
# script.js asks for the video only after the page has loaded (see there).
HERO_SEQ = "/Volumes/Sigma Drive/الشغل 2/المدونة/حملة الفراغ/shot 14 +/env"
LOOP_FADE = 48
LOOP_FPS = 24
LOOP_LIGHT = 0.6


def build_hero_loop():
    import glob
    frames = sorted(f for f in glob.glob(f"{HERO_SEQ}/e*.png") if not os.path.basename(f).startswith("._"))
    if not frames:
        print("  hero-loop: the sequence is not mounted, skipped")
        return
    n, F = len(frames), LOOP_FADE
    M = n - F
    # the file's frame j is the loop's frame F + j: pure frames f[F..M-1],
    # then the dissolve from the tail f[M..n-1] into the head f[0..F-1]
    order = [("one", F + j) for j in range(M - F)] + [("mix", i) for i in range(F)]

    def frame(k):
        return Image.open(frames[k]).convert("RGB")

    Image.open(frames[F]).convert("RGB").save(f"{SRC}/hero.png")
    print(f"  hero.png is frame {F + 1} of {n}")

    def enc(out, size, crf):
        w, h = size
        return subprocess.Popen(
            ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}",
             "-r", str(LOOP_FPS), "-i", "-", "-an", "-c:v", "libx264", "-preset", "veryslow",
             "-crf", str(crf), "-x264-params", "aq-mode=3:aq-strength=0.9", "-pix_fmt", "yuv420p",
             "-vf", "scale=out_color_matrix=bt709:out_range=tv", "-colorspace", "bt709",
             "-color_primaries", "bt709", "-color_trc", "bt709", "-movflags", "+faststart", out],
            stdin=subprocess.PIPE)

    wide = enc(f"{OUT}/hero-loop.mp4", (1920, 1080), 21)
    tall = enc(f"{OUT}/hero-loop-tall.mp4", (576, 720), 22)
    col = (1920 - 864) // 2            # a 4:5 column from the middle, 864x1080
    for kind, k in order:
        if kind == "one":
            im = frame(k)
        else:
            t = (k + .5) / F
            t = t * t * (3 - 2 * t)        # smoothstep: the dissolve eases in and out
            im = Image.blend(frame(M + k), frame(k), t)
        im = ImageEnhance.Brightness(im).enhance(LOOP_LIGHT)
        wide.stdin.write(im.tobytes())
        tall.stdin.write(im.crop((col, 0, col + 864, 1080)).resize((576, 720), Image.LANCZOS).tobytes())
    for p in (wide, tall):
        p.stdin.close()
        p.wait()
    report(f"{OUT}/hero-loop.mp4")
    report(f"{OUT}/hero-loop-tall.mp4")


# ── the asterisk, favicon, install tiles ─────────────────────────────
# قسم الإنتاج's own mark is the brand's red brush asterisk (the department
# icon in Logos/icons/الانتاج.png), where Satr's is a red dot. asterisk.webp
# is that brush mark as an alpha mask: the stylesheet paints it red wherever
# Satr had its dot. The favicon and the install tiles are the department
# icon made flat (no gradient, no pattern): the white asterisk on a red
# plate. `any` and `maskable` are never the same file: the maskable copy is
# inset far enough that the mask only ever cuts plate.
EMBER = (245, 101, 73)    # #F56549


def build_brand():
    star = Image.open(f"{SRC}/brand/asterisk.png").convert("RGBA")
    star = star.crop(star.getchannel("A").getbbox())

    mask = Image.new("RGBA", star.size, (255, 255, 255, 0))
    mask.putalpha(star.getchannel("A"))
    mask.thumbnail((160, 160), Image.LANCZOS)
    p = os.path.join(OUT, "asterisk.webp")
    mask.save(p, "WEBP", quality=90, alpha_quality=90, method=6)
    report(p)

    white = Image.new("RGBA", star.size, (*PAPER, 0))
    white.putalpha(star.getchannel("A"))

    def tile(size, inset):
        plate = Image.new("RGBA", (size, size), (*EMBER, 255))
        m = white.copy()
        m.thumbnail((int(size * inset),) * 2, Image.LANCZOS)
        plate.alpha_composite(m, ((size - m.width) // 2, (size - m.height) // 2))
        return plate.convert("RGB")

    tile(512, .66).save("favicon.png", "PNG", optimize=True)
    report("favicon.png")
    for size, inset, name in [(192, .6, "icon-192.png"), (512, .6, "icon-512.png"),
                              (512, .46, "icon-maskable-512.png"),
                              (180, .6, "apple-touch-icon.png")]:
        p = os.path.join(OUT, name)
        tile(size, inset).save(p, "PNG", optimize=True)
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


# Every work page is titled with the work's own logo, never its name set in
# type (client). The source is the work's own lettering where it has one
# (masters/works/<id>/title-logo.png), else its white logo. Each is cropped
# to its ink and written as WebP with alpha, at most 1000px on its long
# side: the title shows it at up to about 500px, so that covers a retina
# screen. Works in TITLE_WHITE are painted white whatever the source's
# colours: غمام's purple lettering (client).
TITLE_SOURCES = ("title-logo.png", "logo-white.png", "new-logo-white.png")
TITLE_WHITE = ("ghamam",)


def build_titles():
    for mdir in sorted(os.listdir("masters/works")):
        src = next((f"masters/works/{mdir}/{n}" for n in TITLE_SOURCES
                    if os.path.exists(f"masters/works/{mdir}/{n}")), None)
        if not src or not os.path.isdir(f"assets/works/{mdir}"):
            continue
        im = Image.open(src).convert("RGBA")
        im = im.crop(im.getchannel("A").getbbox())
        if mdir in TITLE_WHITE:
            white = Image.new("RGBA", im.size, (*PAPER, 0))
            white.putalpha(im.getchannel("A"))
            im = white
        im.thumbnail((1000, 1000), Image.LANCZOS)
        out = f"assets/works/{mdir}/title-logo.webp"
        im.save(out, "WEBP", quality=90, alpha_quality=90, method=6)
        report(out)


def build_og():
    """The link-preview image: the hero itself (the library, the wordmark in
    paper white, قسم الإنتاج under it with its red asterisk, the contact
    line in red) rendered by headless
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
@font-face{{font-family:N2;src:url("../../fonts/norsal-arabic.woff2")}}
html,body{{margin:0;width:1200px;height:630px;overflow:hidden;background:#0A0A0A}}
body{{position:relative;font-family:N,sans-serif}}
.bg{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}}
.logo{{position:absolute;left:50%;top:262px;width:300px;translate:-50% -50%;fill:#FBFAF9;stroke:#FBFAF9}}
.dept{{position:absolute;left:0;right:0;top:362px;display:flex;justify-content:center;align-items:center;gap:12px;color:#FBFAF9;font:700 26px N2,sans-serif}}
.dept i{{width:24px;height:24px;background:#F56549;-webkit-mask:url("../../assets/asterisk.webp") center/contain no-repeat}}
.foot{{position:absolute;left:0;right:0;bottom:34px;display:flex;justify-content:center;gap:88px;color:#F56549;font-size:20px;font-weight:500}}
</style>
<img class="bg" src="../../assets/hero.webp">
<svg class="logo" viewBox="489 108 442 242">{shapes}</svg>
<div class="dept" dir="rtl"><i></i>قسم الإنتاج</div>
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
    out = f"{OUT}/og-production-2026-11.jpg"
    Image.open(png).convert("RGB").resize((1200, 630), Image.LANCZOS).save(
        out, "JPEG", quality=86, optimize=True, progressive=True)
    report(out)


STEPS = {"hero-loop": build_hero_loop, "hero": build_hero, "brand": build_brand,
         "fonts": build_fonts, "works": build_works, "titles": build_titles, "og": build_og}

if __name__ == "__main__":
    want = sys.argv[1:] or ["hero", "brand", "works", "titles"]
    for step in want:
        STEPS[step]()
    print("\ndone.")
