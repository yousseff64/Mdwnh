#!/usr/bin/env python3
"""
Build the optimised asset set for the v4 site.

Source art lives outside v4/ (Art/, icons/, Our Projects/). Nothing here is
edited by hand: run `python3 v4/tools/build-assets.py` from the repo root and
everything under v4/assets/ is regenerated.

Outputs
  v4/assets/img/*.webp        photographic / illustrated art, resized
  v4/assets/img/covers/*.webp أعمالنا cover cards, composed art on alpha
  v4/assets/icons/*.webp      brush icons kept as alpha masks (recoloured in CSS)
  v4/assets/fall/atlas.webp   sراج falling sequence, shelf packed
  v4/assets/fall/atlas.json   per frame source rect + draw offset
  v4/assets/video/cast*.mp4   the مَنْ نَحْنُ cast loop, AV1 + H.264, plus a poster
  v4/assets/img/seam-*.svg    the news / مَنْ نَحْنُ cloud seam, two vector bands

Needs ffmpeg with libsvtav1 and libx264 on PATH for the video step.
"""

import io
import json
import os
import shutil
import subprocess
import sys
import unicodedata as ud

from PIL import Image, ImageDraw

# tools/ sits at the repo root, beside the site it builds into
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets")


def src(*parts):
    return os.path.join(ROOT, *parts)


def listdir(path):
    return [f for f in sorted(os.listdir(path)) if not f.startswith("._")]


def find(folder, needle):
    """Match a filename by substring, normalising Arabic to NFC first."""
    needle = ud.normalize("NFC", needle)
    for f in listdir(src(folder)):
        if needle in ud.normalize("NFC", f):
            return src(folder, f)
    raise FileNotFoundError(f"{needle} in {folder}")


def ensure(*parts):
    p = os.path.join(OUT, *parts)
    os.makedirs(p, exist_ok=True)
    return p


def save_webp(im, path, width=None, quality=82, lossless=False):
    if width and im.width > width:
        h = round(im.height * width / im.width)
        im = im.resize((width, h), Image.LANCZOS)
    im.save(path, "WEBP", quality=quality, method=6, lossless=lossless)
    return os.path.getsize(path)


# ---------------------------------------------------------------- flat art ---

def build_images():
    d = ensure("img")
    jobs = [
        # (source, output name, target width)
        (src("Art", "cloud.png"), "cloud.webp", 720),
        (find("Art", "باب الحجرة"), "hujra.webp", 1448),
        (find("Art", "سمرقند"), "samarqand.webp", 1448),
        (src("Art", "Jumping man.png"), "jump.webp", 465),
        (src("Art", "shekih.png"), "sheikh.webp", 400),
        (src("Art", "Safi.png"), "safi.webp", 260),
        (src("Art", "ryan.png"), "ryan.webp", 260),
        (src("logo.png"), "logo-white.webp", 340),
        (src("footer-logo.png"), "logo-dark.webp", 380),
        (src("Circle Logo.png"), "logo-mark.webp", 200),
    ]
    # The eight full body سراج poses, numbered in file order.
    poses = [src("Art", f) for f in listdir(src("Art"))
             if "نهائي" in ud.normalize("NFC", f)]
    for i, p in enumerate(poses, 1):
        jobs.append((p, f"pose-{i}.webp", 520))

    total = 0
    for source, name, width in jobs:
        im = Image.open(source).convert("RGBA")
        bb = im.getbbox()
        if bb and (bb[2] - bb[0]) * (bb[3] - bb[1]) < im.width * im.height * 0.98:
            im = im.crop(bb)  # trim dead alpha so the CSS box matches the art
        total += save_webp(im, os.path.join(d, name), width)
    print(f"img      {len(jobs):3d} files  {total / 1024:8.0f} KB")


def build_banners():
    """Project banners used by the marquee."""
    d = ensure("img", "projects")
    folder = "Our Projects/Project Banners"
    picks = {
        "غمام": "ghayam.webp",
        "مشاعر يتيم": "yateem.webp",
        "باب الحجرة": "hujra.webp",
        "سمرقند": "samarqand.webp",
        "مع النبي": "nabi.webp",
        "منطاد": "muntad.webp",
        "يا غلام": "ghulam.webp",
    }
    total = 0
    for needle, name in picks.items():
        try:
            path = find(folder, needle)
        except FileNotFoundError:
            print(f"  ! missing banner {needle}")
            continue
        im = Image.open(path).convert("RGB")
        total += save_webp(im, os.path.join(d, name), 760, quality=80)
    print(f"projects {len(picks):3d} files  {total / 1024:8.0f} KB")


# Every cover is the same 675 x 1151 card on a 1080 x 1440 canvas, with its
# art (a hand, a hat, the title logo) breaking out of it. The card does not
# sit in the same spot on every canvas, so each file is cut to one frame
# measured from its card's top left corner: this much room for the art that
# breaks out on each side, in source pixels.
COVER_CARD = (675, 1151)
COVER_ROOM = {"left": 125, "right": 60, "top": 0, "bottom": 190}
COVER_SHADOW = 70           # padding for the shadow baked in below


def _card_origin(alpha):
    """Top left corner of the card: its straight left edge is the longest
    opaque run across the middle rows, its top the start of the opaque run
    down a column just inside that edge (clear of the corner radius)."""
    px = alpha.load()
    w, h = alpha.size

    def runs(seq):
        out, start = [], None
        for i, v in enumerate(seq + [False]):
            if v and start is None:
                start = i
            elif not v and start is not None:
                out.append((start, i - 1))
                start = None
        return out

    left = max(max(runs([px[x, y] >= 250 for x in range(w)]), key=lambda r: r[1] - r[0])[0]
               for y in (500, 600, 700))
    col = [px[left + 110, y] >= 250 for y in range(h)]
    top = next(s for s, e in runs(col) if s <= 600 <= e)
    return left, top


def build_covers():
    """أعمالنا cover cards, from the composed art in Art/projects/.

    Each is cut to the shared frame, so all six cards come out the same size
    in the same place. Two of the sources were cut off at the bottom through
    their title art: `fade` softens that edge. The drop shadow is baked here
    rather than drawn by CSS, so a moving strip of them costs nothing."""
    from PIL import ImageChops, ImageFilter

    d = ensure("img", "covers")
    picks = [
        # (file needle, output name, bottom fade in source px)
        ("سمرقند", "samarqand", 0),
        ("غمام", "ghamam", 0),
        ("باب الحجرة", "hujra", 0),
        ("التقي", "lis", 70),
        ("القرد", "qird", 56),
        ("فصل عجيب", "fasl", 0),
    ]
    cw, ch = COVER_CARD
    r, p = COVER_ROOM, COVER_SHADOW
    total = 0
    for needle, name, fade in picks:
        im = Image.open(find(os.path.join("Art", "projects"), needle)).convert("RGBA")
        # drop near invisible ghost pixels left over from the source layers
        a = im.getchannel("A").point(lambda v: 0 if v < 14 else v)
        im.putalpha(a)
        x, y = _card_origin(a)
        im = im.crop((x - r["left"], y - r["top"], x + cw + r["right"], y + ch + r["bottom"]))

        if fade:
            a = im.getchannel("A")
            bottom = a.getbbox()[3]
            ramp = Image.linear_gradient("L").resize((im.width, fade)).transpose(Image.FLIP_TOP_BOTTOM)
            mask = Image.new("L", im.size, 255)
            mask.paste(ramp, (0, bottom - fade))
            mask.paste(0, (0, bottom, im.width, im.height))
            im.putalpha(ImageChops.multiply(a, mask))

        # soft shadow under the whole silhouette, a little below it
        a = im.getchannel("A")
        canvas = Image.new("RGBA", (im.width + 2 * p, im.height + 2 * p), (0, 0, 0, 0))
        shade = Image.new("L", canvas.size, 0)
        shade.paste(a, (p, p + 26))
        shade = shade.filter(ImageFilter.GaussianBlur(28)).point(lambda v: int(v * 0.34))
        canvas.paste(Image.new("RGBA", canvas.size, (22, 14, 34, 255)), (0, 0), shade)
        canvas.alpha_composite(im, (p, p))

        for width, suffix in ((900, ""), (480, "-sm")):
            total += save_webp(canvas, os.path.join(d, f"{name}{suffix}.webp"), width, quality=84)
    print(f"covers   {len(picks) * 2:3d} files  {total / 1024:8.0f} KB  "
          f"frame {cw + r['left'] + r['right'] + 2 * p}x{ch + r['top'] + r['bottom'] + 2 * p}")


def build_scenery():
    """Small pieces the project and news scenery draw on canvas (js/scenes.js).

      scenery/fig.webp    القرد والغيلم's fig, from Art/تين.png
      scenery/leaf.webp   the falling leaf from قضية سمرقند: two takes of 116
      scenery/leaf.json   frames each (Art/1أ/). Every frame's tight crop is
                          shelf packed into one sheet with where it sat on the
                          stage, the same way as the سراج fall atlas.
    """
    d = ensure("scenery")
    fig = Image.open(find("Art", "تين")).convert("RGBA")
    total = save_webp(fig.crop(fig.getbbox()), os.path.join(d, "fig.webp"), 160, quality=88)

    folder = next(src("Art", f) for f in listdir(src("Art"))
                  if ud.normalize("NFC", f) == ud.normalize("NFC", "1أ"))
    scale = 0.7
    stage = None
    crops, takes = [], []
    for sub in listdir(folder):
        path = os.path.join(folder, sub)
        if not os.path.isdir(path):
            continue
        frames = []
        for f in listdir(path):
            if not f.lower().endswith(".png"):
                continue
            im = Image.open(os.path.join(path, f)).convert("RGBA")
            stage = stage or im.size
            bb = im.getbbox()
            if not bb:
                frames.append(None)
                continue
            c = im.crop(bb)
            c = c.resize((max(1, round(c.width * scale)), max(1, round(c.height * scale))), Image.LANCZOS)
            crops.append({"img": c, "ox": bb[0], "oy": bb[1]})
            frames.append(len(crops) - 1)
        takes.append(frames)

    sheet_w = 1024
    x = y = shelf = 0
    for i in sorted(range(len(crops)), key=lambda i: -crops[i]["img"].height):
        im = crops[i]["img"]
        if x + im.width > sheet_w:
            x, y, shelf = 0, y + shelf, 0
        crops[i]["x"], crops[i]["y"] = x, y
        x += im.width + 1
        shelf = max(shelf, im.height + 1)
    sheet = Image.new("RGBA", (sheet_w, y + shelf), (0, 0, 0, 0))
    for c in crops:
        sheet.paste(c["img"], (c["x"], c["y"]))
    total += save_webp(sheet, os.path.join(d, "leaf.webp"), quality=86)

    def rec(i):
        if i is None:
            return 0
        c = crops[i]
        return [c["x"], c["y"], c["img"].width, c["img"].height, c["ox"], c["oy"]]

    meta = {"stage": list(stage), "scale": scale, "fps": 24, "takes": [[rec(i) for i in t] for t in takes]}
    with open(os.path.join(d, "leaf.json"), "w") as fh:
        json.dump(meta, fh, separators=(",", ":"))
    print(f"scenery  {2 + 1:3d} files  {total / 1024:8.0f} KB  leaf {len(takes)} takes, "
          f"{len(crops)} frames, sheet {sheet.width}x{sheet.height}")


def build_icons():
    """Brush icons stay black on transparent: CSS uses them as masks."""
    d = ensure("icons")
    total = 0
    names = listdir(src("icons"))
    for f in names:
        im = Image.open(src("icons", f)).convert("RGBA")
        bb = im.getbbox()
        if bb:
            im = im.crop(bb)
        out = os.path.join(d, os.path.splitext(f)[0] + ".webp")
        total += save_webp(im, out, 320, quality=90)
    print(f"icons    {len(names):3d} files  {total / 1024:8.0f} KB")


def build_award():
    shutil.copyfile(find("Art", "جائزة الانتاج"), os.path.join(ensure("img"), "award.svg"))
    print("award      1 file")


def build_wins():
    """إنجازاتنا's award table: the photo from the night, a still of the film
    that won, and the red grin drawn behind them (a mask, like the icons)."""
    d = ensure("img", "wins")
    folder = os.path.join("Art", "achievements")
    # The photo came off the phone mirrored: the screens behind the trophy
    # read backwards. Flip it here, so the piece stays where it is placed.
    night = Image.open(src(folder, "award.jpg")).convert("RGB").transpose(Image.FLIP_LEFT_RIGHT)
    total = save_webp(night, os.path.join(d, "night.webp"), quality=84)
    # The still catches a second character at its left edge. Square on ryan.
    still = Image.open(src(folder, "ryan.png")).convert("RGB").crop((70, 20, 680, 630))
    total += save_webp(still, os.path.join(d, "still.webp"), 460, quality=84)
    shutil.copyfile(find(folder, "Asset 25"), os.path.join(ensure("icons"), "grin.svg"))
    print(f"wins       3 files  {total / 1024:8.0f} KB")


# --------------------------------------------------------- falling sequence ---

IMPACT_FRAME = 59  # سراج_0059 — the frame he lands on


def build_fall(scale=0.60, quality=80):
    """
    Shelf pack every frame's tight bounding box into one atlas.

    Each frame records where it sat inside the original 720x540 stage, so the
    canvas can redraw the sequence with its original motion intact.
    """
    d = ensure("fall")
    folder = src("Art", "سراج")
    files = [f for f in listdir(folder) if f.endswith(".png")]

    stage = Image.open(os.path.join(folder, files[0])).size
    crops = []
    for f in files:
        im = Image.open(os.path.join(folder, f)).convert("RGBA")
        bb = im.getbbox()
        c = im.crop(bb)
        w = max(1, round(c.width * scale))
        h = max(1, round(c.height * scale))
        crops.append({
            "img": c.resize((w, h), Image.LANCZOS),
            "ox": bb[0] * scale,
            "oy": bb[1] * scale,
        })

    # Shelf pack, tallest first, into a fixed width sheet.
    sheet_w = 2048
    order = sorted(range(len(crops)), key=lambda i: -crops[i]["img"].height)
    x = y = shelf_h = 0
    for i in order:
        im = crops[i]["img"]
        if x + im.width > sheet_w:
            x = 0
            y += shelf_h
            shelf_h = 0
        crops[i]["x"] = x
        crops[i]["y"] = y
        x += im.width
        shelf_h = max(shelf_h, im.height)
    sheet_h = y + shelf_h

    atlas = Image.new("RGBA", (sheet_w, sheet_h), (0, 0, 0, 0))
    for c in crops:
        atlas.paste(c["img"], (c["x"], c["y"]), c["img"])
    size = save_webp(atlas, os.path.join(d, "atlas.webp"), quality=quality)

    meta = {
        "sheet": [sheet_w, sheet_h],
        "stage": [round(stage[0] * scale), round(stage[1] * scale)],
        "impact": IMPACT_FRAME,
        "fps": 12,
        "frames": [
            [c["x"], c["y"], c["img"].width, c["img"].height,
             round(c["ox"], 1), round(c["oy"], 1)]
            for c in crops
        ],
    }
    with open(os.path.join(d, "atlas.json"), "w") as fh:
        json.dump(meta, fh, separators=(",", ":"))

    print(f"fall     {len(crops):3d} frames {size / 1024:8.0f} KB  "
          f"sheet {sheet_w}x{sheet_h}")


# -------------------------------------------------------------- cast loop ---

# Art/art.mp4 is 1728x1000 with the cast in the middle and flat blue either
# side. Keep the cast plus enough blue for the CSS mask to fade through.
# The page draws the cast at 1.5x, so upscale here with lanczos and a light
# luma unsharp: the line art stays far crisper than a 1344 px file stretched
# bilinearly by the browser.
VIDEO_FILTER = ("crop=1344:960:192:16,"
                "scale=2016:1440:flags=lanczos,"
                "unsharp=5:5:0.7:5:5:0")


def build_video():
    """
    One 6 s, 12 fps loop (first and last frame already meet), two encodes.

    AV1 is listed first in the markup and is about half the bytes. H.264 is
    the fallback every browser decodes. No audio, moov atom up front so the
    first frame paints before the file is done, bt709 tagged so browsers do
    not guess the colour space.
    """
    d = ensure("video")
    ff = ["ffmpeg", "-v", "error", "-y", "-i", src("Art", "art.mp4"), "-vf", VIDEO_FILTER]
    tail = ["-an", "-g", "72", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"]

    av1 = os.path.join(d, "cast-av1.mp4")
    avc = os.path.join(d, "cast.mp4")
    subprocess.run([*ff, "-c:v", "libsvtav1", "-preset", "4", "-crf", "34",
                    "-svtav1-params", "enable-stat-report=0", *tail, av1],
                   check=True, stderr=subprocess.DEVNULL)
    subprocess.run([*ff, "-c:v", "libx264", "-preset", "veryslow", "-tune", "animation",
                    "-crf", "24", "-profile:v", "high", *tail, avc], check=True)

    # Poster: the loop's first frame, so the swap to video is invisible.
    png = subprocess.run([*ff, "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"],
                         check=True, capture_output=True).stdout
    poster = save_webp(Image.open(io.BytesIO(png)).convert("RGB"),
                       os.path.join(d, "cast.webp"), quality=80)

    sizes = [os.path.getsize(av1), os.path.getsize(avc), poster]
    print("video      av1 {:.0f} KB  h264 {:.0f} KB  poster {:.0f} KB".format(
        *(s / 1024 for s in sizes)))


def build_showreel():
    """The clip playing on the shared screen in the مُجْتَمَعُنَا call.

    The source is a 1080p master, drawn into a tile a few hundred pixels
    wide, so it ships at 640 across and nothing more. One H.264 encode, not
    two: AV1 came out the same size as H.264 on this clip, so the second
    file would have bought nothing. No audio, faststart, bt709 tagged."""
    source = src("Art", "showreel.mp4")
    if not os.path.isfile(source):
        print("showreel   skipped, no Art/showreel.mp4")
        return
    d = ensure("video")
    scale = ["-vf", "scale=640:-2:flags=lanczos"]
    out = os.path.join(d, "showreel.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", source, *scale,
                    "-c:v", "libx264", "-preset", "veryslow", "-tune", "animation",
                    "-crf", "31", "-profile:v", "high",
                    "-an", "-g", "96", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
                    "-color_primaries", "bt709", "-color_trc", "bt709",
                    "-colorspace", "bt709", out], check=True)

    # Poster: two seconds in, because the clip opens on black.
    png = subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "2", "-i", source,
                          *scale, "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-"],
                         check=True, capture_output=True).stdout
    poster = save_webp(Image.open(io.BytesIO(png)).convert("RGB"),
                       os.path.join(d, "showreel.webp"), quality=76)

    print("showreel   h264 {:.0f} KB  poster {:.0f} KB".format(
        os.path.getsize(out) / 1024, poster / 1024))


# -------------------------------------------------------------- seam cloud ---

def build_seam():
    """
    The seam under the news block stretches the house cloud to several times
    its width. A 720 px bitmap mask does not survive that: the edge goes soft,
    and the thin gap between the cloud and its base line, plus the loose
    droplets, stretch into streaks.

    So trace only the cloud body's top edge into a vector silhouette that is
    solid underneath. preserveAspectRatio="none" lets CSS stretch it, and it
    stays sharp at any size.
    """
    alpha = Image.open(src("Art", "cloud.png")).convert("RGBA").getchannel("A")
    w, h = alpha.size
    a = alpha.load()

    # Flood the body from the middle of its widest run on the centre row.
    # The droplets are separate islands, so they never get marked.
    body_img = alpha.point(lambda v: 255 if v >= 128 else 0)
    row = [a[x, h // 2] >= 128 for x in range(w)]
    runs, start = [], None
    for x, on in enumerate(row + [False]):
        if on and start is None:
            start = x
        elif not on and start is not None:
            runs.append((x - start, start))
            start = None
    length, first = max(runs)
    ImageDraw.floodfill(body_img, (first + length // 2, h // 2), 128)
    body = body_img.load()

    # Top edge per column, refined to a sub-pixel using the original alpha.
    top = []
    for x in range(w):
        y = next((y for y in range(h) if body[x, y] == 128), None)
        if y is None:
            top.append(float(h))
        elif y == 0:
            top.append(0.0)
        else:
            prev, cur = a[x, y - 1], a[x, y]
            top.append(y - 1 + min(1.0, max(0.0, (128 - prev) / max(1, cur - prev))))

    # Ease both ends of the body down to the floor, so a stretched copy never
    # ends in a vertical cliff where the traced edge simply stops.
    inside = [x for x in range(w) if top[x] < h]
    xl, xr = inside[0], inside[-1]
    ramp = (xr - xl) * 0.12
    for x in range(w):
        t = min(x - xl, xr - x) / ramp
        if t <= 0:
            top[x] = float(h)
        elif t < 1:
            top[x] = h - (h - top[x]) * t * t * (3 - 2 * t)

    # The edge as a rise: 0 on the floor, 1 at the top of the cloud's box.
    rise = [(h - y) / h for y in top]

    def cloud(u, flip):
        """The traced edge at u in [0, 1] across one cloud, linear between columns."""
        if not 0 <= u <= 1:
            return 0.0
        if flip:
            u = 1 - u
        f = u * (w - 1)
        i = min(int(f), w - 2)
        return rise[i] + (rise[i + 1] - rise[i]) * (f - i)

    def smax(p, q, k=0.18):
        """max() with the corner rounded, so two puffs meet in a soft valley."""
        g = max(k - abs(p - q), 0) / k
        return max(p, q) + g * g * k / 4

    # Separate stretched clouds left ledges, V cracks and cliffs where they
    # met. So each band is baked into one silhouette: three copies of the
    # traced cloud, unioned over a solid floor.
    # (left edge, width, height, mirrored), all as fractions of the band.
    bands = {
        "down": [(-0.06, 0.50, 1.00, False), (0.30, 0.42, 0.78, True), (0.58, 0.48, 0.92, False)],
        "up":   [(-0.04, 0.42, 0.80, True), (0.24, 0.36, 1.00, False), (0.54, 0.46, 0.90, True)],
    }
    floor, n = 0.26, 600
    for name, puffs in bands.items():
        edge = []
        for i in range(n + 1):
            v = floor
            for x0, bw, bh, flip in puffs:
                v = smax(v, bh * cloud((i / n - x0) / bw, flip))
            edge.append(min(v, 1.0))
        # Two passes of a short box blur turn the fin's near vertical side
        # into a slope that holds up when stretched four times wide.
        for _ in range(2):
            edge = [sum(edge[max(0, i - 7):i + 8]) / len(edge[max(0, i - 7):i + 8])
                    for i in range(len(edge))]
        pts = " ".join(f"{i},{100 * (1 - v):.1f}" for i, v in enumerate(edge))
        svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} 100" '
               f'preserveAspectRatio="none"><path d="M0,100L{pts}L{n},100Z"/></svg>')
        with open(os.path.join(ensure("img"), f"seam-{name}.svg"), "w") as fh:
            fh.write(svg)
    print(f"seam       {len(bands)} files")


# ----------------------------------------------------------------- avatars ---

def crop_avatar(im):
    """Find the round avatar in the top left of a YouTube comment screenshot.

    Screenshots are cropped by hand, so the avatar is never in quite the same
    place, and some are trimmed flush to the circle. Take the first row that
    is not the page ground, then read the block of columns the avatar fills
    under it: the circle is one solid band, and the handle beside it starts
    after a clear gap. That gap is what separates the two."""
    rgb = im.convert("RGB")
    W, H = rgb.size
    px = rgb.load()
    bg = px[W - 3, H - 3]              # the ground, read away from the face

    def lit(x, y):
        return sum(abs(a - b) for a, b in zip(px[x, y], bg)) > 22

    strip = max(8, int(W * 0.32))      # wide enough for a tightly cropped shot
    top = next((y for y in range(H) if any(lit(x, y) for x in range(strip))), None)
    if top is None:
        k = W / 1170                   # nothing but ground: fall back to the
        cx = cy = d = 72 * k           # spot YouTube on iOS uses at 1170 wide
        print("         avatar not found, used the default spot. check it")
    else:
        band = range(top, min(top + strip, H))
        cols = [any(lit(x, y) for y in band) for x in range(strip)]
        left = cols.index(True)
        x, gap = left, 0
        while x < strip:
            gap = 0 if cols[x] else gap + 1
            if gap >= 3:               # three empty columns: the circle ended
                break
            x += 1
        d = x - gap - left
        if d < strip * 0.15:           # a speck, not a face: a very dark avatar
            k = W / 1170               # whose rim reads as ground. Fall back.
            cx = cy = d = 72 * k
            print("         avatar edge too faint, used the default spot. check it")
        else:
            cx, cy = left + d / 2, top + d / 2

    r = d / 2 * 0.96  # shave the anti-aliased rim, the CSS circle clips the rest
    return rgb.crop((round(cx - r), round(cy - r), round(cx + r), round(cy + r)))


def build_avatars():
    """Featured comment avatars, cropped from the comment screenshots.

    Each screenshot in Art/comments/ is named after the commenter's handle,
    the way data.js refers to it (`fundit0.jpg` -> avatars/fundit0.webp)."""
    folder = src("Art", "comments")
    if not os.path.isdir(folder):
        print("avatars    skipped, no Art/comments/")
        return
    d = ensure("img", "avatars")
    total = n = 0
    for f in listdir(folder):
        stem, ext = os.path.splitext(f)
        if ext.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
            continue
        face = crop_avatar(Image.open(os.path.join(folder, f)))
        face = face.resize((96, 96), Image.LANCZOS)
        total += save_webp(face, os.path.join(d, stem.lower() + ".webp"), quality=85)
        n += 1
    print(f"avatars  {n:3d} files  {total / 1024:8.0f} KB")


# --------------------------------------------------------------- community ---

# سراج is a species: the مُجْتَمَعُنَا call seats several of them, each the
# same avatar with its hue turned. The source is blue.
# (name, target hue in degrees or None to keep it, saturation, value)
SIRAJ_HUES = [
    ("blue", None, 1, 1),
    ("sun", 48, 0.92, 1.06),
    ("ember", 8, 0.8, 1.02),
    ("mint", 173, 0.7, 0.86),
]


def _median_hue(im):
    """Hue of the saturated paint in `im`, in degrees."""
    import colorsys
    px = im.load()
    hues = []
    for y in range(0, im.height, 2):
        for x in range(0, im.width, 2):
            r, g, b, a = px[x, y]
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if a > 128 and s > 0.45 and v > 0.4:
                hues.append(h)
    hues.sort()
    return hues[len(hues) // 2] * 360


def _turn_hue(im, deg, sat, val):
    """Turn the hue of the painted parts only. The grey ground, the white face
    and the ink lines are left alone, so they stay the same in every copy."""
    h, s, v = im.convert("RGB").convert("HSV").split()
    turn = round(deg / 360 * 256)
    h = h.point(lambda x: (x + turn) % 256)
    s2 = s.point(lambda x: min(255, int(x * sat)))
    v2 = v.point(lambda x: min(255, int(x * val)))
    out = Image.merge("HSV", (h, s2, v2)).convert("RGB")
    paint = s.point(lambda x: max(0, min(255, (x - 30) * 4)))
    out = Image.composite(out, im.convert("RGB"), paint).convert("RGBA")
    out.putalpha(im.getchannel("A"))
    return out


def build_community():
    """مُجْتَمَعُنَا: the screenshot of نادي المدونة that peeks out from
    behind the call, and the call's سراج avatars, one per colour."""
    d = ensure("img", "club")
    shot = Image.open(find("Art", "iscord")).convert("RGB")
    # drop the macOS menu bar and the blurred member list on the right
    total = save_webp(shot.crop((10, 36, 730, 764)), os.path.join(d, "server.webp"), 720, quality=78)

    face = Image.open(src("Art", "siraj.png")).convert("RGBA")
    base = _median_hue(face)
    for name, hue, sat, val in SIRAJ_HUES:
        im = face if hue is None else _turn_hue(face, hue - base, sat, val)
        total += save_webp(im, os.path.join(d, f"siraj-{name}.webp"), 160, quality=86)
    print(f"club     {1 + len(SIRAJ_HUES):3d} files  {total / 1024:8.0f} KB")



def build_stills():
    """The strip of stills that runs across every project page.

    Source lives in Art/stills/<project id>/1.jpg … 5.jpg, one folder per id
    in PROJECTS. To change a still, drop a new file over the old one and run
    this again: anything wider than 16:9 is centre cropped, anything taller
    is cropped to the middle band, so a replacement does not have to be cut
    to size first. Two widths ship, because the strip is small on a phone and
    half the screen on a desktop.
    """
    d = ensure("img", "stills")
    root = src("Art", "stills")
    total = 0
    files = 0
    for pid in sorted(listdir(root)):
        folder = os.path.join(root, pid)
        if not os.path.isdir(folder):
            continue
        for i, name in enumerate(listdir(folder), 1):
            im = Image.open(os.path.join(folder, name)).convert("RGB")
            w, h = im.size
            want = w * 9 / 16
            if h > want + 1:                       # tall: keep the middle band
                y = round((h - want) / 2)
                im = im.crop((0, y, w, y + round(want)))
            elif h < want - 1:                     # wide: keep the middle column
                want_w = round(h * 16 / 9)
                x = round((w - want_w) / 2)
                im = im.crop((x, 0, x + want_w, h))
            total += save_webp(im, os.path.join(d, f"{pid}-{i}.webp"), 960, quality=73)
            total += save_webp(im, os.path.join(d, f"{pid}-{i}-sm.webp"), 480, quality=70)
            files += 2
    print(f"stills   {files:3d} files  {total / 1024:8.0f} KB")


STEPS = [build_images, build_banners, build_covers, build_scenery, build_icons, build_award, build_wins, build_fall,
         build_video, build_showreel, build_seam, build_avatars, build_community, build_stills]

if __name__ == "__main__":
    # no arguments builds everything; `build-assets.py avatars seam` builds
    # just those steps
    only = sys.argv[1:]
    for step in STEPS:
        if not only or step.__name__.removeprefix("build_") in only:
            step()
