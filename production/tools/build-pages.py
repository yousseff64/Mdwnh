#!/usr/bin/env python3
"""
المدونة / MDWNH STUDIO, production: the page generator.

    cd production && python3 tools/build-pages.py

This is the site sent to clients, served at mdwn.studio/production. It is a
copy of Satr's site (satr.media), rebranded: the two studios are practically
the same team and the same work, so the machinery, the layout and most of
the copy came across, with المدونة's logo, its font (Norsal), its dark
palette and its red. Every page is written by this script, in two languages:

    index.html                    الرئيسية          en/index.html
    projects/index.html           الأعمال           en/projects/index.html
    projects/<id>/index.html      a case study      en/projects/<id>/index.html
    about/index.html              عن المدونة         en/about/index.html
    contact/index.html            تواصل             en/contact/index.html
    sitemap.xml

Nothing here is hand-edited downstream: change this file and re-run it.

What it copies, and from whom, on purpose (the brief was "copy how people in
the field already do it", not invent a layout):

  * The work rail and its filter row are Meshbak's portfolio (meshbak.sa):
    tall portrait cards, the project's own picture tinted a little with its
    brand colour, its logo in white on the middle, category and name under
    it; a row of filters with a superscript count and a slash between them.
  * The case page is BUCK's (buck.co): an editorial grid, a small label in
    one column and the text two columns over, pictures that run edge to edge
    between the text.
  * The footer is Meshbak's: short, plain rows (how to reach us, the
    accounts, the pages) then the logo and the legal line. It fits one phone
    screen. No contact "cards" anywhere.
  * «عملنا مع» is Meshbak's client wall: the organisations' own marks in
    white, in a plain grid.
  * The hero is المدونة's own banner (Logos/Banner.png in the identity
    folder): the library render, the wordmark centred on it, the contact
    line under it. Satr's red rings were Satr's banner, so they did not come.

The case-study pictures come from masters/works/<id>/manifest.json, written
when the stills were picked; their web copies are in assets/works/<id>/.
"""

import json
import os
import re
import struct

# Bump when styles.css or script.js change: nothing here fingerprints them.
VER = "20261108m3"

SITE = "https://mdwn.studio/production"

# ── The real contact details ─────────────────────────────────────────────
# المدونة has a mailbox and three public accounts. It has no published phone
# or WhatsApp number, so there is none here: never put one in until the
# studio gives one.
MAIL = "contact@mdwn.studio"
DOMAIN = "mdwn.studio"

# This site is the studio's production department. Its name stands beside
# the logo, under the hero's wordmark and in the legal line, so nobody takes
# it for the المدونة its audience knows (or for Satr, whose site it copies).
DEPT = ("قسم الإنتاج", "Production")

SOCIAL = [
    ("Instagram", "إنستقرام", "https://www.instagram.com/mdwn.c/"),
    ("YouTube", "يوتيوب", "https://www.youtube.com/@Mdwn.c"),
    ("TikTok", "تيك توك", "https://www.tiktok.com/@mdwn.c"),
]
SAME_AS = [h for en_, ar_, h in SOCIAL]

LANGS = ("ar", "en")


def T(lang, ar, en):
    return ar if lang == "ar" else en


def esc(s):
    return (str(s).replace("&", "&amp;").replace("<", "&lt;")
            .replace(">", "&gt;").replace('"', "&quot;"))


# ═════════════════════════════════════════════════════════════════════════
#  THE LOGO: inline vectors from the 2026 rebrand's own SVGs
#
#  masters/brand/lockup-ar-white.svg is the smile mark beside «مدونة STUDIO»;
#  masters/brand/lockup-en.svg is the mark beside «STUDIO MDWNH». Each is
#  emitted once per page as a sprite with fill AND stroke set to
#  currentColor (the designer's outlines carry a stroke), and split into the
#  mark, the wordmark and the whole lockup. The boxes were measured with
#  getBBox in Chrome.
# ═════════════════════════════════════════════════════════════════════════
LOGOS = {
    # part id: (source, which shapes). Each part is drawn once per page, in
    # its own source coordinates, and every logo on the page is a <use> of it
    "mark-ar": ("lockup-ar-white.svg", slice(0, 5)),
    "word-ar": ("lockup-ar-white.svg", slice(5, None)),
    "mark-en": ("lockup-en.svg", slice(12, None)),
    "word-en": ("lockup-en.svg", slice(0, 12)),
}
# which parts each logo is made of, and the box it is framed in
BOXES = {
    ("lockup", "ar"): (("mark-ar", "word-ar"), "0 0 926.25 478.24"),
    ("word", "ar"): (("word-ar",), "489 108 442 242"),
    ("mark", "ar"): (("mark-ar",), "0 0 470.1 478.3"),
    ("lockup", "en"): (("mark-en", "word-en"), "0 0 787.51 368.18"),
    ("word", "en"): (("word-en",), "396 57 395 236"),
    ("mark", "en"): (("mark-en",), "0 0 362 368.2"),
}
# stroke width per class, per file; a shape with no class has no stroke
_STROKE = {"lockup-ar-white.svg": {"cls-1": 4, "cls-2": 1},
           "lockup-en.svg": {"cls-1": 1, "cls-2": 4}}


def _shapes(fn):
    src = open(f"masters/brand/{fn}", encoding="utf-8").read()
    out = []
    for m in re.finditer(r"<(path|ellipse)\b([^>]*?)/?>", src):
        tag, attrs = m.groups()
        cls = re.search(r'class="([^"]+)"', attrs)
        attrs = re.sub(r'\s*(class|id|data-name)="[^"]*"', "", attrs)
        # decimals cut to one place: a tenth of a unit is far below a pixel at
        # any size the logo is shown. Cut, never rounded: path data runs
        # numbers together ("12.96.5" is 12.96 then .5), and rounding the
        # first to "13" would glue the two into 130.5
        attrs = re.sub(r"(\.\d)\d+", r"\1", " ".join(attrs.split()))
        sw = _STROKE[fn].get(cls.group(1)) if cls else None
        stroke = f' stroke="currentColor" stroke-width="{sw}" stroke-miterlimit="10"' if sw else ""
        out.append(f"<{tag} {attrs}{stroke}/>")
    return out


def sprite(lang):
    parts = "".join(f'<g id="m-{pid}">{"".join(_shapes(fn)[part])}</g>'
                    for pid, (fn, part) in LOGOS.items() if pid.endswith(lang))
    return ('<svg class="sprite" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" '
            f'fill="currentColor"><defs>{parts}</defs></svg>\n')


def logo(kind="lockup", lang="ar", cls="logo", label=None):
    """kind is lockup, word or mark, in the page's language."""
    parts, box = BOXES[(kind, lang)]
    a11y = f'role="img" aria-label="{label}"' if label else 'aria-hidden="true" focusable="false"'
    uses = "".join(f'<use href="#m-{p}"/>' for p in parts)
    return f'<svg class="{cls}" viewBox="{box}" {a11y}>{uses}</svg>'


ARROW_SVG = ('<svg class="arw" viewBox="0 0 40 12" aria-hidden="true" focusable="false">'
             '<path d="M0 6h38M33 1l5 5-5 5"/></svg>')


# ═════════════════════════════════════════════════════════════════════════
#  PICTURES: sizes read straight from the webp headers
# ═════════════════════════════════════════════════════════════════════════
def webp_size(path):
    """(w, h) of a .webp without Pillow: VP8, VP8L and VP8X headers."""
    try:
        with open(path, "rb") as f:
            d = f.read(40)
    except OSError:
        return None
    if d[:4] != b"RIFF" or d[8:12] != b"WEBP":
        return None
    kind = d[12:16]
    if kind == b"VP8 ":
        w, h = struct.unpack("<HH", d[26:30])
        return w & 0x3FFF, h & 0x3FFF
    if kind == b"VP8L":
        b = d[21:25]
        w = 1 + (((b[1] & 0x3F) << 8) | b[0])
        h = 1 + (((b[3] & 0x0F) << 10) | (b[2] << 2) | ((b[1] & 0xC0) >> 6))
        return w, h
    if kind == b"VP8X":
        w = 1 + int.from_bytes(d[24:27], "little")
        h = 1 + int.from_bytes(d[27:30], "little")
        return w, h
    return None


def load_manifest(pid):
    path = f"masters/works/{pid}/manifest.json"
    if not os.path.exists(path):
        return {"items": [], "facts": {}}
    with open(path, encoding="utf-8") as f:
        m = json.load(f)
    items = []
    for it in m.get("items", []):
        # "hide" marks a picture that repeats another one on the page: a
        # still of the same moment as a loop, a panel of a strip, the same
        # shot twice. Found by comparing the pictures themselves, not names.
        if it.get("hide"):
            continue
        stem = it.get("file", "")
        stem = os.path.splitext(os.path.basename(stem))[0]
        it = dict(it, file=stem)
        if it.get("kind") in ("loop", "reel") or stem.startswith(("loop-", "reel-")):
            mp4 = f"assets/works/{pid}/{stem}.mp4"
            if not os.path.exists(mp4):
                continue
            it["video"] = True
            if it.get("kind") != "reel":
                it["kind"] = "loop"
            it["src"] = mp4
            poster = f"assets/works/{pid}/{stem}.webp"
            it["poster"] = poster if os.path.exists(poster) else None
            size = webp_size(poster) if it["poster"] else None
        else:
            src = f"assets/works/{pid}/{stem}.webp"
            if not os.path.exists(src):
                continue
            it["src"] = src
            size = webp_size(src)
        if size:
            it["w"], it["h"] = size
        it.setdefault("w", 1600)
        it.setdefault("h", 900)
        items.append(it)
    m["items"] = items
    return m


def still(src, alt=("", "")):
    """A picture that is not part of a work (the hero, the about page)."""
    w, h = webp_size(src) or (1920, 1080)
    return {"src": src, "w": w, "h": h, "caption_ar": alt[0], "caption_en": alt[1]}


def srcset(root, it):
    """The smaller copies tools/build-assets.py cut for phones and tablets
    (<stem>-720.webp, <stem>-1280.webp), plus the full picture."""
    base = it["src"][:-5]
    parts = [f"{root}{base}-{w}.webp {w}w" for w in (720, 1280) if os.path.exists(f"{base}-{w}.webp")]
    if not parts:
        return ""
    return ", ".join(parts + [f'{root}{it["src"]} {it["w"]}w'])


def pic(root, it, lang, cls="", eager=False, sizes="100vw", caption=False, alt=None):
    """An <img> (or a silent looping <video>) for a manifest item."""
    if alt is None:
        alt = esc(it.get("caption_ar" if lang == "ar" else "caption_en", "") or "")
    focus = it.get("focus") or "50% 50%"
    style = f' style="object-position:{focus}"' if focus != "50% 50%" else ""
    if it.get("video"):
        poster = f' poster="{root}{it["poster"]}"' if it.get("poster") else ""
        media = (f'<video class="{cls}" data-loop muted playsinline loop preload="none"{poster}'
                 f' width="{it["w"]}" height="{it["h"]}"{style} aria-label="{alt}">'
                 f'<source src="{root}{it["src"]}" type="video/mp4"></video>')
    else:
        load = 'fetchpriority="high"' if eager else 'loading="lazy"'
        ss = srcset(root, it)
        ss = f' srcset="{ss}" sizes="{sizes}"' if ss else ""
        media = (f'<img class="{cls}" src="{root}{it["src"]}" width="{it["w"]}" height="{it["h"]}" '
                 f'alt="{alt}" {load} decoding="async"{ss}{style}>')
    if caption and alt:
        return f'<figure class="fig">{media}<figcaption>{alt}</figcaption></figure>'
    return media


def orient(it):
    r = it["w"] / max(1, it["h"])
    return "p" if r < 0.85 else ("s" if r < 1.2 else "l")


# ═════════════════════════════════════════════════════════════════════════
#  THE WORK
#
#  Copy is the client's own document (the Google Doc «ملف صفحة المدونة»),
#  in its order. Nothing is invented: where the document has a gap (the
#  client, a date) the field is absent. Five works are shared with Satr and
#  keep what was verified there (numbers counted off the delivered material,
#  BLNZ's notes from its designer's guidelines). English is our translation.
# ═════════════════════════════════════════════════════════════════════════
KINDS = [
    ("animation", "أنيميشن",       "Animation"),
    ("motion",    "موشن جرافيك",   "Motion graphics"),
    ("comics",    "قصص مصورة",     "Comics"),
    ("video",     "إنتاج فيديو",    "Video"),
    ("podcast",   "بودكاست",       "Podcast"),
    ("identity",  "هوية بصرية",    "Identity"),
    ("events",    "تغطية فعاليات", "Events"),
]

WORKS = [
    dict(
        id="maa-allah", accent="#0C133B",
        name=("مع الله", "Ma'a Allah"),
        # the calligraphy is hard to read on its own, so the name is set
        # beside it in a medium weight (client)
        title_name=True,
        kind=("موشن، أنيميشن، مونتاج", "Motion, animation, editing"),
        kinds=["motion", "animation", "video"],
        line=("محتوى إيماني بأسلوب معاصر وجذاب عبر المنصات الرقمية الحديثة؛ لنشر رسالة إيمانية مؤثرة تصل إلى مختلف الفئات المستهدفة بقالب الفيديوهات القصيرة.",
              "Faith content in a contemporary, engaging voice on today's digital platforms: a message that reaches every audience, made as short videos."),
        meta=[
            (("المجال", "Field"), ("المحتوى الإيماني", "Faith content")),
            (("المدة", "Duration"), ("12 شهرًا متواصلة", "12 months, non-stop")),
            (("نطاق العمل", "Scope"), ("بحث وانتخاب المحتوى، كتابة، أداء صوتي، موشن غرافيك، مونتاج، إدارة النشر والحسابات",
                                       "Research and selection, writing, voice-over, motion graphics, editing, publishing and account management")),
        ],
        stats=[
            ("8.5M+", ("مشاهدة خلال 12 شهرًا", "views in 12 months")),
            ("12", ("شهرًا من النشر دون انقطاع", "months of publishing without a break")),
            # Counted on the channel (masters/works/maa-allah/manifest.json).
            ("171", ("مقطعًا قصيرًا في السلسلة", "shorts in the series")),
            ("3", ("أنواع إنتاج: موشن، أنيميشن، مونتاج", "kinds of production: motion, animation, editing")),
        ],
        idea=("الفكرة", "The idea",
              "أردنا أن يصل المحتوى الإيماني إلى الناس حيث يقضون وقتهم اليوم. فقدّمناه في مقاطع قصيرة بلغة قريبة وصورة حديثة، تحمل رسالة إيمانية مؤثرة تخاطب مختلف الفئات.",
              "We wanted faith content to reach people where they spend their time today. So we made it as short videos, in plain language and a modern picture, carrying a message that speaks to every audience."),
        did_text=("تولّينا المشروع من الفكرة حتى النشر: بحثنا وانتقينا المحتوى، وكتبناه، وأدّينا التعليق الصوتي، وصممنا الموشن غرافيك، وأخرجنا المقاطع بالمونتاج، ثم أدرنا النشر والحسابات على مدى عام كامل دون انقطاع.",
                  "We ran it from idea to publishing: we researched and chose the material, wrote it, recorded the voice-over, designed the motion graphics, cut the videos, then ran publishing and the accounts for a full year without a break."),
        did=[],
        result=("+8,500,000", ("مشاهدة، حققتها منصات «مع الله» خلال 12 شهرًا من الإنتاج والنشر المتواصل.",
                               "views across Ma'a Allah's platforms in twelve months of continuous production and publishing.")),
        theme="maa",
    ),
    dict(
        id="maknoon", accent="#0E4738",
        cover=("12-quran-hall", "60% 50%"),
        tint="#0E4738",   # the identity's dark green; the logo green is too light under white
        # big frames are cinematic, shallow-focus shots (client): the reciter
        # with the mic goes full width; the flat hall frames stay in the gallery
        rekind={"14-contestant-mic": "wide", "12-quran-hall": "detail", "16-hall-rows": "detail"},
        name=("مكنون", "Maknoon"),
        kind=("بودكاست، هوية، تغطية فعاليات", "Podcast, identity, events"),
        kinds=["podcast", "identity", "events", "video"],
        line=("عدة مشاريع متكاملة لمكنون: من البودكاست وهويته البصرية إلى تغطية الفعاليات والتصوير.",
              "Several projects for Maknoon under one language: a podcast and its identity, then event coverage and filming."),
        meta=[
            (("العميل", "Client"), ("مكنون", "Maknoon")),
            (("نطاق العمل", "Scope"), ("بودكاست، هوية بصرية، تصميم، مونتاج، تغطية فعاليات، تصوير",
                                       "Podcast, visual identity, design, editing, event coverage, filming")),
        ],
        stats=[],
        idea=("عن التعاون", "About the work",
              "لم يقتصر عملنا مع مكنون على مشروع واحد، بل رافقناه في أكثر من مرحلة وأكثر من مجال، فصنعنا له حضورًا بصريًا وصوتيًا متكاملًا يجمع أعماله تحت لغة واحدة.",
              "Our work with Maknoon was never one project. We stayed with them across several stages and several fields, and built a visual and audio presence that puts all of it under one language."),
        did_text=None,
        did=[
            (("البودكاست", "The podcast"),
             [("بودكاست «سلام مكنون»", "The «Salam Maknoon» podcast"),
              ("مقطع الافتتاحية", "The opening sequence"),
              ("الهوية البصرية التابعة للبودكاست", "The podcast's visual identity"),
              ("التصاميم", "Design"),
              ("مونتاج المقتطفات", "Editing the clips")]),
            (("الفعاليات", "Events"),
             [("تغطية فعالية «ليالي رمضانية»: التصوير ومونتاج المقاطع وإدارة الحدث",
               "Covering «Ramadan Nights»: filming, editing the clips and running the event")]),
        ],
        result=None,
        # Satr's client took the Ramadan teaser and the Friday series off this
        # page; they stay off here too
        groups=[("podcast", ("البودكاست", "The podcast")), ("events", ("الفعاليات", "Events"))],
    ),
    dict(
        id="ghamam", accent="#2B0C23",
        # the card is tinted with the plum of the film's audience scene: the
        # title lettering's purple (the manifest's accent) was the loudest
        # card on the rail
        tint="#380820",
        name=("غمام", "Ghamam"),
        kind=("فيلم أنيميشن قصير", "Short animated film"),
        kinds=["animation"],
        line=("فيلم أنيميشن قصير حقق المركز الثاني في مسابقة الإنتاج المرئي للنشء، وأُنجز في 35 يومًا.",
              "A short animated film that took second place in the youth visual production competition, made in 35 days."),
        meta=[
            (("الشكل", "Format"), ("فيلم أنيميشن قصير", "Short animated film")),
            (("الإنجاز", "Recognition"), ("المركز الثاني، مسابقة الإنتاج المرئي للنشء",
                                          "Second place, youth visual production competition")),
            (("مدة الإنتاج", "Production time"), ("35 يومًا", "35 days")),
            (("نطاق العمل", "Scope"), ("قصة أصلية، تصميم الشخصيات، رسم الخلفيات، أنيميشن، أداء صوتي",
                                       "Original story, character design, backgrounds, animation, voice acting")),
        ],
        # 35 days is already in the line and the facts; one stat on its own
        # was a full-width rule with nothing beside it
        stats=[],
        idea=("عن الحكاية", "The story",
              "غمام طالب جامعي تباغته نوبات الهلع والقلق الاجتماعي كلما اقترب موعد عرضه التقديمي. يرى الفيلم كيف يثقل هذا الضغط دراسته، وكيف يتعثر ثم ينهض من جديد.",
              "Ghamam is a university student caught by panic attacks and social anxiety whenever his presentation draws near. The film watches the pressure weigh on his studies, and how he stumbles, then gets back up."),
        did_text=("القصة من ابتكار المدونة، كتبناها وصنعنا كل ما حولها بأيدينا: صممنا الشخصيات، ورسمنا الخلفيات، وحرّكنا المشاهد، وأدّينا الأصوات، وسلّمنا الفيلم في خمسة وثلاثين يومًا.",
                  "The story is Mdwnh's own. We wrote it and made everything around it by hand: we designed the characters, painted the backgrounds, animated the scenes, performed the voices, and delivered the film in thirty-five days."),
        did=[],
        result=("المركز الثاني", ("مسابقة الإنتاج المرئي للنشء", "Second place in the youth visual production competition.")),
        result_label=("الإنجاز", "Recognition"),
    ),
    dict(
        id="samarqand", accent="#3F5D80",
        name=("قضية سمرقند", "The Samarkand Case"),
        kind=("قصة مصورة", "Comic"),
        kinds=["comics"],
        line=("قصة مصورة مستوحاة من أحداث حقيقية.", "A comic inspired by real events."),
        meta=[
            (("الشكل", "Format"), ("قصة مصورة", "Comic")),
            (("المصدر", "Source"), ("أحداث حقيقية", "Real events")),
            (("نطاق العمل", "Scope"), ("كتابة الحوارات، رسم الشخصيات وتصميمها",
                                       "Dialogue, character design and drawing")),
        ],
        # Counted off the comic itself (comics/pages/samarqand/ in this repo).
        stats=[
            ("51", ("صفحة في القصة المصورة", "pages in the comic")),
        ],
        idea=("عن الحكاية", "The story",
              "مرت خمس سنوات على اقتحام الدخلاء سمرقند. يقع الاختيار على فتى حالم مندفع ليحمل رسالة أهلها، وهي أملهم الوحيد في نصرة مدينتهم.",
              "Five years after invaders stormed Samarkand, a dreaming, headstrong boy is chosen to carry its people's message: their only hope of saving their city."),
        did_text=("حوّلنا أحداثًا حقيقية إلى قصة مصورة: كتبنا حواراتها، وصممنا شخصياتها، ورسمناها.",
                  "We turned real events into a comic: we wrote its dialogue, designed its characters, and drew it."),
        did=[],
        result=None,
        # the reader lives on this same domain, so it opens in the same tab.
        # No link to the film: the client took «شاهد الفيلم» off both pages
        links=[(("اقرأ القصة المصورة", "Read the comic"), "../Samrqand/", False)],
    ),
    dict(
        id="blnz", accent="#002F26",
        cover=("12-paper", "68% 50%"),
        tint="#002F26",   # the light brand green washes the white logo out
        name=("بلنز", "BLNZ"),
        kind=("هوية بصرية", "Visual identity"),
        kinds=["identity"],
        line=("هوية بصرية جديدة لشركة استثمار وتطوير عقاري.",
              "A new visual identity for a real-estate investment and development company."),
        meta=[
            (("المجال", "Field"), ("عقارات", "Real estate")),
            (("نطاق العمل", "Scope"), ("إعادة بناء الهوية، الشعار، الألوان، الخطوط، التطبيقات",
                                       "Rebrand: logo, colour, type, applications")),
        ],
        stats=[],
        # The designer's own words, from the guidelines' introduction (p. 2).
        idea=("الفكرة", "The idea",
              "هوية تجمع بين أصالة الجذور العربية وروح العمارة المعاصرة، لتصنع لغة بصرية تعبّر عن الثبات والتوازن والاستمرارية. ومن وحي الجمل، بما يحمله من دلالات الصبر والاعتمادية والارتباط بالبيئة العربية، تنطلق ملامحها.",
              "An identity that joins the roots of Arab heritage with the spirit of contemporary architecture: a visual language of steadiness, balance and continuity. It starts from the camel, and everything it stands for: patience, dependability, and belonging to this land."),
        did_text=None,
        did=[],
        result=None,
        theme="blnz",
    ),
    dict(
        id="taseel", accent="#2D4968",
        hero="05-wide-ceremony-report",
        name=("تأصيل", "Ta'seel"),
        kind=("مونتاج وموشن جرافيك", "Editing & motion graphics"),
        kinds=["motion", "video"],
        line=("محتوى مرئي توعوي يعرض السنن النبوية بقالب إبداعي مميز.",
              "Short films that present the Prophet's sunnah in a form people remember."),
        meta=[
            (("المجال", "Field"), ("محتوى توعوي", "Awareness content")),
            (("نطاق العمل", "Scope"), ("مونتاج، موشن غرافيك", "Editing, motion graphics")),
        ],
        # Counted off the delivered finals (masters/works/taseel/manifest.json).
        stats=[
            ("19", ("حلقة من «مع النبي»", "episodes of «Ma'a Al-Nabi»")),
            ("4", ("حلقات من «ليالٍ عشر»", "episodes of «Layali Ashr»")),
        ],
        idea=("الفكرة", "The idea",
              "أردنا أن تصل السنن النبوية إلى الناس بصورة حديثة تجذب العين وتبقى في الذاكرة، فصغناها في سلسلتين بصريتين بطابع إبداعي.",
              "We wanted the sunnah to reach people in a modern picture that catches the eye and stays in memory, so we shaped it into two visual series."),
        did_text=None,
        did=[(None, [("سلسلة «ليالٍ عشر»: سلسلة مونتاج", "«Layali Ashr»: an edited series"),
                     ("سلسلة «مع النبي»: سلسلة موشن غرافيك", "«Ma'a Al-Nabi»: a motion-graphics series")])],
        result=None,
        groups=[("layali", ("ليالٍ عشر: مونتاج", "Layali Ashr: editing")),
                ("maa-alnabi", ("مع النبي: موشن جرافيك", "Ma'a Al-Nabi: motion graphics"))],
        group_key="series",
        # the short films are not part of this case study (client)
        drop={"series": "short"},
    ),
    dict(
        id="hirasathon", accent="#A3202B",
        rekind={"06-team-15": "wide"},   # the client's pick for a big frame
        cover=("09-hall-last-day", "35% 50%"),
        name=("حراساثون", "Hirasathon"),
        kind=("تغطية فعاليات", "Event coverage"),
        kinds=["events", "video"],
        line=("تغطية كاملة لهاكاثون يطوّر حلولًا للحراسة الأمنية.",
              "Full coverage of a hackathon building solutions for security guarding."),
        meta=[
            (("العميل", "Client"), ("النصبان للحراسات الأمنية", "Al-Nasban Security")),
            (("المجال", "Field"), ("الأمن، الفعاليات التقنية", "Security, tech events")),
            (("نطاق العمل", "Scope"), ("تصوير، مونتاج", "Filming, editing")),
            # read off the edit's own screens (masters/works/hirasathon/manifest.json)
            (("التاريخ", "Date"), ("5–7 فبراير 2025، الرياض", "5–7 February 2025, Riyadh")),
        ],
        # Read off the edit's own screens (masters/works/hirasathon/manifest.json).
        stats=[
            ("72", ("ساعة، غطيناها من أولها إلى آخرها", "hours, covered from the first to the last")),
            ("3", ("أيام في قاعة واحدة", "days in one hall")),
            ("4K", ("تصوير ومونتاج بدقة 3840×2160", "filmed and finished at 3840×2160")),
        ],
        idea=("عن الحدث", "The event",
              "يتمحور «حراساثون» حول ابتكار حلول تطوّر الحراسة الأمنية: أول هاكاثون لتطوير قطاع الحراسات الأمنية في المملكة، اثنتان وسبعون ساعة من العمل المتواصل في الرياض.",
              "Hirasathon is about inventing solutions that move security guarding forward: the Kingdom's first hackathon for the guarding sector, seventy-two straight hours of work in Riyadh."),
        did_text=("غطّينا الحدث من أوله إلى آخره: صوّرنا لحظاته وفعالياته، ثم خرجنا بها في مونتاج يحكي تفاصيله.",
                  "We covered it from the first hour to the last: we filmed its moments and its sessions, then cut them into an edit that tells the story."),
        did=[],
        result=None,
    ),
]

BY_ID = {w["id"]: w for w in WORKS}
MANIFESTS = {w["id"]: load_manifest(w["id"]) for w in WORKS}
# A work may re-kind a picture: promote a frame to full width, or send a
# flat one back to the gallery (client picks; see "big photos" in CLAUDE.md).
for _w in WORKS:
    for _it in MANIFESTS[_w["id"]]["items"]:
        if _it["file"] in (_w.get("rekind") or {}):
            _it["kind"] = _w["rekind"][_it["file"]]
# A work may name its own hero when the picked one cannot stay (see "hide").
for _w in WORKS:
    if _w.get("hero"):
        for _it in MANIFESTS[_w["id"]]["items"]:
            if _it["file"] == _w["hero"]:
                _it["kind"] = "hero"


def items(pid, kind=None, **match):
    out = []
    skip = set(BY_ID[pid].get("skip", []))
    for it in MANIFESTS[pid]["items"]:
        if it["file"] in skip:
            continue
        if kind and it.get("kind") not in (kind if isinstance(kind, (list, tuple)) else [kind]):
            continue
        if any(it.get(k) != v for k, v in match.items()):
            continue
        out.append(it)
    return out


def first(pid, kind):
    got = items(pid, kind)
    return got[0] if got else None


def accent(w):
    return MANIFESTS[w["id"]].get("accent") or w["accent"]


def logo_white(root, w):
    for name in ("logo-white.webp", "logo-white.png", "new-logo-white.png"):
        p = f"assets/works/{w['id']}/{name}"
        if os.path.exists(p):
            return root + p
    return None


# ═════════════════════════════════════════════════════════════════════════
#  URLS: Arabic at the root of /production, English under /production/en/.
#  `root` is the relative path back to /production, so the site serves the
#  same from any host and any folder.
# ═════════════════════════════════════════════════════════════════════════
def url(lang, slug):
    """A site path for a page, e.g. url('en', 'projects/blnz')."""
    base = "" if lang == "ar" else "en/"
    return base + (slug + "/" if slug else "")


def depth_root(lang, slug):
    n = (0 if lang == "ar" else 1) + (slug.count("/") + 1 if slug else 0)
    return "../" * n


# ═════════════════════════════════════════════════════════════════════════
#  HEAD
# ═════════════════════════════════════════════════════════════════════════
OG_IMAGE = f"{SITE}/assets/og-production-2026-11.jpg"

ORG = f"""{{
      "@type": "ProfessionalService",
      "@id": "{SITE}/#org",
      "name": "المدونة ستوديو",
      "alternateName": ["Mdwnh Studio", "مدونة ستوديو"],
      "description": "استوديو إنتاج في الرياض: أنيميشن، موشن جرافيك، قصص مصورة، تصوير، مونتاج، بودكاست، وهوية بصرية.",
      "url": "{SITE}/",
      "logo": "{SITE}/assets/icon-512.png",
      "image": "{OG_IMAGE}",
      "email": "{MAIL}",
      "address": {{ "@type": "PostalAddress", "addressLocality": "Riyadh", "addressCountry": "SA" }},
      "areaServed": {{ "@type": "Country", "name": "SA" }},
      "knowsLanguage": ["ar", "en"],
      "sameAs": {json.dumps(SAME_AS)}
    }}"""


# ═════════════════════════════════════════════════════════════════════════
#  SPEED
#
#  The stylesheet is INLINED into every page, minified: one request fewer on
#  the critical path, and the first paint needs nothing but the HTML.
#  styles.css stays the source; edit it, then re-run this script. url()s
#  inside it are relative to the stylesheet (the root of /production), so
#  they are rewritten to the page's own depth here.
#
#  Speculation rules ask Chrome/Edge to PRERENDER a page of this site as
#  soon as the pointer rests on its link ("moderate"). Only /production/ is
#  in scope: the fan site next door is a different site. Safari/Firefox
#  ignore the block; script.js prefetches on hover for them instead.
# ═════════════════════════════════════════════════════════════════════════
_CSS = None


def inline_css(root):
    global _CSS
    if _CSS is None:
        css = open("styles.css", encoding="utf-8").read()
        css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
        css = re.sub(r"\s+", " ", css)
        css = re.sub(r"\s*([{};,>])\s*", r"\1", css)
        css = re.sub(r";}", "}", css)
        _CSS = css.strip()
    return re.sub(r'url\("(?!data:|https?:)', f'url("{root}', _CSS)


SPECULATION = json.dumps({"prerender": [{"where": {"and": [
    {"href_matches": "/production/*"},
    {"not": {"selector_matches": "[target=_blank]"}}]},
    "eagerness": "moderate"}]})


def head(p):
    lang, slug, root = p["lang"], p["slug"], p["root"]
    other = "en" if lang == "ar" else "ar"
    canonical = SITE + "/" + url(lang, slug)
    title, desc = p["title"], p["desc"]
    ld = [ORG] + p.get("ld", [])
    jsonld = ('<script type="application/ld+json">{"@context":"https://schema.org","@graph":['
              + ",".join(ld) + "]}</script>")
    preload = ""
    w = p.get("work")
    hero = first(w["id"], "hero") if w and not (w.get("theme") == "maa" and items(w["id"], "reel")) else None
    hero = hero or p.get("hero")
    if hero and not hero.get("video"):
        ss = srcset(root, hero)
        extra = f' imagesrcset="{ss}" imagesizes="100vw"' if ss else ""
        preload += f'<link rel="preload" as="image" href="{root}{hero["src"]}"{extra} fetchpriority="high">\n'
    # one Norsal file per script: an Arabic page needs the Arabic cut on its
    # first screen, an English page only the Latin one
    fonts = (f'<link rel="preload" href="{root}fonts/norsal-{"arabic" if lang == "ar" else "latin"}.woff2" '
             'as="font" type="font/woff2" crossorigin>\n')
    return f"""<!DOCTYPE html>
<html lang="{lang}" dir="{'rtl' if lang == 'ar' else 'ltr'}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{esc(title)}</title>
<meta name="description" content="{esc(desc)}">
<link rel="canonical" href="{canonical}">
<link rel="alternate" hreflang="ar" href="{SITE}/{url('ar', slug)}">
<link rel="alternate" hreflang="en" href="{SITE}/{url('en', slug)}">
<link rel="alternate" hreflang="x-default" href="{SITE}/{url('ar', slug)}">
<meta property="og:title" content="{esc(title)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:image" content="{OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="{canonical}">
<meta property="og:site_name" content="{T(lang, 'المدونة ستوديو', 'Mdwnh Studio')}">
<meta property="og:locale" content="{T(lang, 'ar_SA', 'en_US')}">
<meta property="og:locale:alternate" content="{T(other, 'ar_SA', 'en_US')}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="{OG_IMAGE}">
<meta name="theme-color" content="#0E0E13">
<link rel="icon" type="image/png" href="{root}favicon.png">
<link rel="manifest" href="{root}site.webmanifest">
<link rel="apple-touch-icon" href="{root}assets/apple-touch-icon.png">
<meta name="apple-mobile-web-app-title" content="{T(lang, 'المدونة', 'Mdwnh')}">
<script>document.documentElement.classList.add("js")</script>
{fonts}{preload}<style>{inline_css(root)}</style>
<script type="speculationrules">{SPECULATION}</script>
{jsonld}
</head>
"""


# ═════════════════════════════════════════════════════════════════════════
#  HEADER + MENU
# ═════════════════════════════════════════════════════════════════════════
NAV = [("projects", ("الأعمال", "Work")), ("about", ("عن المدونة", "About")),
       ("contact", ("تواصل", "Contact"))]


def header(p):
    lang, root, slug = p["lang"], p["root"], p["slug"]
    other = "en" if lang == "ar" else "ar"
    here = slug.split("/")[0] if slug else ""
    links = "".join(
        f'<a href="{root}{url(lang, s)}"{" aria-current=\"page\"" if here == s else ""}>{T(lang, *lab)}</a>'
        for s, lab in NAV)
    big = "".join(
        f'<li><a href="{root}{url(lang, s)}">{T(lang, *lab)}</a></li>' for s, lab in
        [("", ("الرئيسية", "Home"))] + NAV)
    switch = T(lang, "English", "العربية")
    return f"""<header class="hd" data-hd>
  <a class="hd-brand" href="{root}{url(lang, '')}" aria-label="{T(lang, 'المدونة ستوديو، قسم الإنتاج، الرئيسية', 'Mdwnh Studio, Production, home')}"><span class="hd-logo">{logo('lockup', lang)}</span><span class="hd-dept" aria-hidden="true">{T(lang, *DEPT)}</span></a>
  <nav class="hd-nav" aria-label="{T(lang, 'الرئيسية', 'Main')}">{links}</nav>
  <a class="hd-lang" href="{root}{url(other, slug)}" hreflang="{other}" lang="{other}">{switch}</a>
  <button class="hd-menu" type="button" aria-expanded="false" aria-controls="menu">{T(lang, 'القائمة', 'Menu')}</button>
</header>
<div class="menu" id="menu" hidden>
  <ul class="menu-links">{big}</ul>
  <div class="menu-foot">
    <a href="mailto:{MAIL}" dir="ltr">{MAIL}</a>
    <a href="{root}{url(other, slug)}" hreflang="{other}" lang="{other}">{switch}</a>
  </div>
</div>
"""


# ═════════════════════════════════════════════════════════════════════════
#  FOOTER: Meshbak's short plain rows, then the logo and the legal line.
#  The whole thing fits one phone screen.
# ═════════════════════════════════════════════════════════════════════════
def footer(p):
    lang, root = p["lang"], p["root"]
    pages_ = "".join(f'<li><a href="{root}{url(lang, s)}">{T(lang, *lab)}</a></li>' for s, lab in
                     [("", ("الرئيسية", "Home"))] + NAV)
    acc = "".join(f'<li><a href="{h}" rel="noopener" target="_blank">{T(lang, ar_, en_)}</a></li>'
                  for en_, ar_, h in SOCIAL)
    return f"""<footer class="ft">
  <div class="ft-main wrap">
    <p class="ft-ask">{T(lang, 'عندك فكرة؟ احكِ لنا عنها.', 'Got an idea? Tell us about it.')}</p>
    <div class="ft-col ft-reach">
      <p class="ft-k">{T(lang, 'تواصل', 'Contact')}</p>
      <ul>
        <li><a class="ft-mail" href="mailto:{MAIL}" dir="ltr">{MAIL}</a></li>
        <li class="ft-city">{T(lang, 'الرياض، السعودية', 'Riyadh, Saudi Arabia')}</li>
      </ul>
    </div>
    <div class="ft-col ft-acc">
      <p class="ft-k">{T(lang, 'الحسابات', 'Follow')}</p>
      <ul>{acc}</ul>
    </div>
    <nav class="ft-col ft-pages" aria-label="{T(lang, 'صفحات الموقع', 'Site pages')}">
      <p class="ft-k">{T(lang, 'الصفحات', 'Pages')}</p>
      <ul>{pages_}</ul>
    </nav>
  </div>
  <div class="ft-legal wrap">
    <a class="ft-logo" href="{root}{url(lang, '')}" aria-label="{T(lang, 'المدونة ستوديو', 'Mdwnh Studio')}">{logo('lockup', lang)}</a>
    <p>© 2026 {T(lang, 'المدونة ستوديو، قسم الإنتاج', 'Mdwnh Studio, Production')}</p>
  </div>
</footer>
"""


# ═════════════════════════════════════════════════════════════════════════
#  THE WORK RAIL: Meshbak's portfolio
# ═════════════════════════════════════════════════════════════════════════
def card(w, lang, root, eager=False):
    cov = first(w["id"], "cover") or first(w["id"], "hero")
    if w.get("cover"):
        # a work may pick its card picture from its other stills
        f, focus = w["cover"]
        got = [x for x in MANIFESTS[w["id"]]["items"] if x["file"] == f]
        if got:
            cov = dict(got[0], kind="cover", focus=focus)
    lw = logo_white(root, w)
    img = ""
    if cov:
        img = pic(root, cov, lang, "card-bg", eager=eager, sizes="(max-width:600px) 62vw, 18vw", alt="")
    mark = (f'<img class="card-logo" src="{lw}" alt="" loading="lazy" decoding="async">'
            if lw else f'<span class="card-word">{T(lang, *w["name"])}</span>')
    return f"""<li class="card" data-k="{' '.join(w['kinds'])}">
      <a href="{root}{url(lang, 'projects/' + w['id'])}" style="--tint:{w.get('tint') or accent(w)}">
        <div class="card-img">{img}{mark}</div>
        <p class="card-kind">{T(lang, *w['kind'])}</p>
        <h3 class="card-name">{T(lang, *w['name'])}</h3>
      </a>
    </li>"""


def rail(p, works, filters=True, title=None, more=False, cls=""):
    lang, root = p["lang"], p["root"]
    flt = ""
    if filters:
        bits = [f'<button type="button" data-f="all" aria-pressed="true">{T(lang, "الكل", "All")}'
                f'<sup>{len(works)}</sup></button>']
        for k, ar_, en_ in KINDS:
            n = sum(1 for w in works if k in w["kinds"])
            if n:
                bits.append(f'<button type="button" data-f="{k}" aria-pressed="false">'
                            f'{T(lang, ar_, en_)}<sup>{n}</sup></button>')
        sep = '<span class="sl" aria-hidden="true">/</span>'
        flt = (f'<div class="filters" role="group" aria-label="{T(lang, "تصفية الأعمال", "Filter work")}">'
               f'<span class="f-lead">{T(lang, "اعرض الأعمال:", "Show projects:")}</span>'
               + sep.join(bits) + "</div>")
    head_ = ""
    if title or more:
        t = f'<h2 class="h2">{title}</h2>' if title else ""
        m = (f'<a class="more" href="{root}{url(lang, "projects")}">{T(lang, "كل الأعمال", "All work")} {ARROW_SVG}</a>'
             if more else "")
        head_ = f'<div class="rail-head wrap">{t}{m}</div>'
    cards = "\n    ".join(card(w, lang, root, eager=(i < 3 and p.get("eager_rail"))) for i, w in enumerate(works))
    return f"""<section class="works {cls}" data-works>
  {head_}
  <div class="wrap">{flt}</div>
  <div class="rail-wrap">
    <button class="rail-btn prev" type="button" aria-label="{T(lang, 'السابق', 'Previous')}" hidden>{ARROW_SVG}</button>
    <ul class="rail" data-rail>
    {cards}
    </ul>
    <button class="rail-btn next" type="button" aria-label="{T(lang, 'التالي', 'Next')}" hidden>{ARROW_SVG}</button>
  </div>
</section>
"""


# ═════════════════════════════════════════════════════════════════════════
#  BLOCKS
# ═════════════════════════════════════════════════════════════════════════
def block(label, inner, cls=""):
    """BUCK's editorial row: a small label in one column, the text two over."""
    return f"""<section class="blk wrap {cls}">
  <h2 class="blk-label">{label}</h2>
  <div class="blk-body">{inner}</div>
</section>
"""


def bleed(root, it, lang, cls=""):
    # No visible description under the picture (client); the manifest's
    # caption is still the picture's alt text.
    if not it:
        return ""
    return (f'<figure class="bleed reveal {cls}">{pic(root, it, lang, "bleed-media")}</figure>\n')


def gallery(root, its, lang, cls=""):
    """Justified rows, the way a contact sheet is laid out: every picture
    keeps its own shape, every picture in a row is the same height, and the
    row runs edge to edge: no crops, no empty cells. Each column's `fr` is
    its picture's aspect ratio, which is what makes the heights agree.

    Lone pictures parked in an offset or centred cell left dead space beside
    them (client). A row closes once it is wide enough; a short last row is
    folded into the one before it."""
    if not its:
        return ""
    TARGET, MAX = 3.0, 4
    rows, row = [], []

    def close(row):
        # a short leftover is folded into the row before it
        lone = len(row) == 1 or sum(a["w"] / a["h"] for a in row) < TARGET * .55
        if rows and lone and len(rows[-1]) + len(row) <= MAX + 1:
            rows[-1].extend(row)
        else:
            rows.append(row)

    # Items sharing a `spread` key (a comic's whole pages) are one row of
    # their own, side by side like an open book: left to the rule above, two
    # portrait pages were squeezed into a row of frames and read as stamps.
    done = set()
    for x in its:
        sp = x.get("spread")
        if sp:
            if sp in done:
                continue
            done.add(sp)
            if row:
                close(row)
                row = []
            rows.append([y for y in its if y.get("spread") == sp])
            continue
        row.append(x)
        if sum(a["w"] / a["h"] for a in row) >= TARGET or len(row) == MAX:
            rows.append(row)
            row = []
    if row:
        close(row)
    out = []
    for r in rows:
        ars = [x["w"] / x["h"] for x in r]
        cols = " ".join(f"{a:.3f}fr" for a in ars)
        tall = all(a < 0.85 for a in ars)
        share = 100 / max(1, sum(ars))
        cells = "".join(f'<div class="g-cell">{pic(root, x, lang, "g-media", sizes=f"{max(25, round(a * share))}vw")}</div>'
                        for x, a in zip(r, ars))
        out.append(f'<div class="g-row {"g-tall" if tall else "g-wide"}" style="grid-template-columns:{cols}">{cells}</div>')
    return f'<div class="gallery wrap {cls}">' + "\n".join(f'<div class="reveal">{r}</div>' for r in out) + "</div>\n"


def meta_list(w, lang):
    rows = "".join(f'<div><dt>{T(lang, *k)}</dt><dd>{T(lang, *v)}</dd></div>' for k, v in w["meta"])
    return f'<dl class="meta">{rows}</dl>'


def stats_row(w, lang):
    st = w.get("stats") or []
    facts = MANIFESTS[w["id"]].get("stats_site") or []
    st = st + [tuple(x) for x in facts]
    if not st:
        return ""
    cells = "".join(f'<div class="stat reveal"><p class="stat-n"><bdi dir="ltr">{n}</bdi></p><p class="stat-l">{T(lang, *lab)}</p></div>'
                    for n, lab in st)
    return f'<section class="stats wrap">{cells}</section>\n'


def did_block(w, lang):
    parts = []
    if w.get("did_text"):
        parts.append(f'<p class="lead">{T(lang, *w["did_text"])}</p>')
    for grp, lines in w.get("did") or []:
        g = f'<h3 class="did-h">{T(lang, *grp)}</h3>' if grp else ""
        lis = "".join(f"<li>{T(lang, *x)}</li>" for x in lines)
        parts.append(f'<div class="did-g">{g}<ul class="did">{lis}</ul></div>')
    if not parts:
        return ""
    return block(T(lang, "ما نفذناه", "What we did"), "".join(parts))


def figure(fig, lang):
    """A big result figure. A number is isolated left to right inside the
    Arabic line; words (المركز الثاني) are left to run in the page's own
    direction, translated on the English page."""
    if re.search(r"[؀-ۿ]", fig):
        return T(lang, fig, "2nd place") if fig == "المركز الثاني" else fig
    return f'<bdi dir="ltr">{fig}</bdi>'


def case_links(w, lang, root):
    links = w.get("links") or []
    if not links:
        return ""
    out = []
    for lab, href, external in links:
        if not href.startswith("http"):
            href = root + href
        attrs = ' rel="noopener" target="_blank"' if external else ""
        out.append(f'<a href="{href}"{attrs}>{T(lang, *lab)} {ARROW_SVG}</a>')
    return f'<p class="c-links enter">{"".join(out)}</p>'


# ═════════════════════════════════════════════════════════════════════════
#  CASE STUDY
# ═════════════════════════════════════════════════════════════════════════
def case_page(p):
    lang, root, w = p["lang"], p["root"], p["work"]
    pid = w["id"]
    hero = first(pid, "hero")
    dropped = lambda x: any(x.get(k) == v for k, v in (w.get("drop") or {}).items())
    wides = [x for x in items(pid, "wide") if not dropped(x)]
    details = [x for x in items(pid, ["detail", "mockup"]) if not dropped(x)]
    loops = [x for x in items(pid, "loop") if not dropped(x)]
    out = []

    # ── title ──
    # Every work is titled with its own logo, not its name set in type
    # (client): the work's own lettering where it has one, else its white
    # mark (build-assets.py titles). Marks are sized by area, as on the
    # partner wall: --th grows a tall mark (مع الله's calligraphy) and
    # shrinks a long one, so each title carries about the same weight. The
    # name set in type is only the fallback for a work with no logo. The
    # breadcrumb (الأعمال / kind) is gone from every page: the client found
    # it noise.
    tl = f"assets/works/{pid}/title-logo.webp"
    if os.path.exists(tl):
        tw, th = webp_size(tl)
        k = max(.8, min(1.5, (2 / (tw / th)) ** .5))
        # a mark that is hard to read (title_name) has its name beside it;
        # the picture is then decoration and the words are the heading
        named = w.get("title_name")
        alt = "" if named else T(lang, *w["name"])
        name = f'<span class="c-title-name">{T(lang, *w["name"])}</span>' if named else ""
        title = (f'<h1 class="c-title c-title-logo enter blur"><img src="{root}{tl}" width="{tw}" height="{th}" '
                 f'style="--th:{k:.2f}" alt="{alt}" fetchpriority="high">{name}</h1>')
    else:
        title = f'<h1 class="c-title enter blur">{T(lang, *w["name"])}</h1>'
    out.append(f"""<section class="c-head wrap">
  {title}
  <div class="c-intro"><p class="c-line enter">{T(lang, *w['line'])}</p>{case_links(w, lang, root)}</div>
  {meta_list(w, lang)}
</section>
""")
    # ── the huge picture ──
    if w.get("theme") == "maa" and items(pid, "reel"):
        out.append(maa_hero(p))
        hero = None
    if hero:
        # wider than 16:9 (a scope frame) keeps its own shape rather than
        # being cropped to the screen
        cine = " cine" if hero["w"] / hero["h"] > 1.9 else ""
        out.append(f'<figure class="bleed c-hero{cine}">{pic(root, hero, lang, "bleed-media", eager=True)}</figure>\n')

    out.append(stats_row(w, lang))

    if w.get("idea"):
        h_ar, h_en, t_ar, t_en = w["idea"]
        out.append(block(T(lang, h_ar, h_en), f'<p class="lead">{T(lang, t_ar, t_en)}</p>'))

    theme = w.get("theme")
    if theme == "blnz":
        out.append(blnz_body(p))
        wides = []          # blnz_body lays out its own wides; never twice
    elif theme == "maa":
        out.append(maa_body(p, details, loops))
        wides = []
    elif w.get("groups"):
        # One section per group (a series, the podcast vs the events…), each
        # with its own mark if there is one, its pictures, and its own wide
        # picture closing it.
        key = w.get("group_key", "group")
        used = set()
        for g, lab in w["groups"]:
            keys = g if isinstance(g, tuple) else (g,)
            g = keys[0]
            its = interleave([x for x in details if x.get(key) in keys], [x for x in loops if x.get(key) in keys])
            gw = [x for x in wides if x.get(key) in keys]
            wig = w.get("wides_in_gallery")
            if wig is True or (isinstance(wig, tuple) and g in wig):
                its, gw_shown = gw + its, []
            else:
                gw_shown = gw
            if not its and not gw:
                continue
            used.update(id(x) for x in its)
            mark = next((f"assets/works/{pid}/logo-{g}{v}.{e}" for v in ("-white", "") for e in ("webp", "png")
                         if os.path.exists(f"assets/works/{pid}/logo-{g}{v}.{e}")), "")
            mk = (f'<img class="sub-mark" src="{root}{mark}" alt="" loading="lazy">'
                  if mark else "")
            out.append(f'<div class="sub wrap reveal">{mk}<h2>{T(lang, *lab)}</h2></div>\n')
            # big frames alternate with the gallery instead of stacking up
            # at the end of a section
            if len(gw_shown) > 1 and len(its) > 3:
                n = len(gw_shown)
                cut = [round(len(its) * k / n) for k in range(n + 1)]
                for k in range(n):
                    out.append(gallery(root, its[cut[k]:cut[k + 1]], lang))
                    out.append(bleed(root, gw_shown[k], lang))
            else:
                out.append(gallery(root, its, lang))
                for x in gw_shown:
                    out.append(bleed(root, x, lang))
            wides = [x for x in wides if x not in gw]
        rest = [x for x in details + loops if id(x) not in used]
        if rest:
            out.append(gallery(root, rest, lang))
    else:
        mixed = interleave(details, loops)
        half = (len(mixed) + 1) // 2
        out.append(gallery(root, mixed[:half], lang))
        if wides:
            out.append(bleed(root, wides[0], lang))
        out.append(gallery(root, mixed[half:], lang))
        wides = wides[1:]

    out.append(did_block(w, lang))
    if wides:
        out.append(bleed(root, wides[0], lang))

    if w.get("result"):
        fig, txt = w["result"]
        out.append(block(T(lang, *(w.get("result_label") or ("النتائج", "Results"))),
                         f'<p class="result-n">{figure(fig, lang)}</p><p class="lead">{T(lang, *txt)}</p>', "result"))
    for extra in wides[1:]:
        out.append(bleed(root, extra, lang))

    # ── other projects ──
    others = [x for x in WORKS if x["id"] != pid]
    out.append(rail(p, others, filters=False, title=T(lang, "مشاريع أخرى", "More work"), cls="dark related"))
    return "".join(out)


def interleave(a, b):
    """Spread the loops through the stills so movement turns up every few
    pictures instead of in one clump at the end."""
    if not b:
        return list(a)
    out, step, bi = [], max(2, len(a) // (len(b) + 1)), 0
    for i, x in enumerate(a):
        out.append(x)
        if (i + 1) % step == 0 and bi < len(b):
            out.append(b[bi])
            bi += 1
    return out + b[bi:]


def maa_body(p, details, loops):
    """مع الله in its own language: the series' navy, three columns, one per
    kind of production, so motion, animation and editing read as three
    different crafts rather than one pile of shorts."""
    lang, root = p["lang"], p["root"]
    types = [("motion", ("موشن جرافيك", "Motion graphics"),
              ("نص يتحرك ويُبنى على إيقاع الصوت.", "Type that moves and builds to the voice.")),
             ("animation", ("أنيميشن", "Animation"),
              ("مشاهد مرسومة تحكي القصة.", "Drawn scenes that carry the story.")),
             ("montage", ("مونتاج", "Editing"),
              ("لقطات حقيقية بإيقاع مونتاج.", "Live footage, cut to a rhythm."))]
    cols, used = [], set()
    for t, lab, sub in types:
        # mostly gifs: up to four loops per craft, stills only to fill
        lp = [x for x in loops if x.get("type") == t][:4]
        # a loop and the still of the same moment would sit side by side
        seen = {tok for x in lp for tok in x["file"].split("-")[3:] if len(tok) > 3}
        dt = [x for x in details if x.get("type") == t
              and not seen & {tok for tok in x["file"].split("-") if len(tok) > 3}]
        its = lp + dt[:4 - len(lp)]
        used.update(x["file"] for x in its)
        if not its:
            continue
        cells = "".join(f'<div class="maa-cell">{pic(root, x, lang, "g-media", sizes="30vw")}</div>' for x in its)
        cols.append(f"""<div class="maa-col reveal" data-type="{t}">
      <h3 class="maa-h"><span class="maa-dot" aria-hidden="true"></span>{T(lang, *lab)}</h3>
      <p class="maa-sub">{T(lang, *sub)}</p>
      <div class="maa-stack">{cells}</div>
    </div>""")
    # The hero is already a strip of shorts on navy; a second strip here read
    # as the same section twice (client), so the navy section opens on the logo.
    lw = logo_white(root, BY_ID["maa-allah"])
    mark = ("" if items("maa-allah", "reel") else
            f'<img class="maa-logo wrap" src="{lw}" alt="" loading="lazy">' if lw else "")
    return f"""<section class="maa">
  {mark}<div class="maa-cols wrap">
    {"".join(cols)}
  </div>
</section>
"""


TYPE_LABEL = {"motion": ("موشن جرافيك", "Motion graphics"), "animation": ("أنيميشن", "Animation"),
              "montage": ("مونتاج", "Editing")}


def maa_hero(p):
    """The opening of مع الله: five shorts playing side by side on the
    series' navy, staggered the way prints are laid on a table, each named
    with its episode and its craft."""
    lang, root = p["lang"], p["root"]
    reels = items("maa-allah", "reel")[:5]
    lw = logo_white(root, BY_ID["maa-allah"])
    tiles = "".join(f"""<figure class="reel" data-type="{x.get('type', '')}">
      {pic(root, x, lang, "reel-media", sizes="(max-width:760px) 46vw, 18vw")}
      <figcaption><span class="reel-ep">{esc(x.get('episode_' + lang) or x.get('caption_' + lang, ''))}</span>
      <span class="reel-type"><span class="maa-dot" aria-hidden="true"></span>{T(lang, *TYPE_LABEL.get(x.get('type'), ('', '')))}</span></figcaption>
    </figure>""" for x in reels)
    # the calligraphy is the page's title now, so the opening does not
    # repeat it beside the line
    logo_html = ("" if os.path.exists("assets/works/maa-allah/title-logo.webp") else
                 f'<img class="maa-hero-logo" src="{lw}" alt="">' if lw else "")
    return f"""<section class="maa-hero">
  <div class="maa-hero-top wrap">
    <p class="maa-hero-line">{T(lang, 'سلسلة واحدة، وثلاث صنعات: موشن جرافيك، أنيميشن، ومونتاج. مقطع قصير كل يومين تقريبًا، لمدة عام.', 'One series, three crafts: motion graphics, animation and editing. A short every couple of days, for a year.')}
      <a class="maa-yt" href="https://www.youtube.com/@maa_allah0" rel="noopener" target="_blank">{T(lang, 'القناة على يوتيوب', 'The channel on YouTube')} ↗</a></p>
    {logo_html}
  </div>
  <div class="maa-reel wrap">{tiles}</div>
</section>
"""


def blnz_body(p):
    """بلنز has no numbers to show, so the page is pictures: the old mark
    against the new, then what the symbol and the colours mean (from the
    designer's own guidelines), beside the pictures, then the applications."""
    lang, root = p["lang"], p["root"]
    m = MANIFESTS["blnz"]
    facts = m.get("facts", {})
    before, after = first("blnz", "before"), first("blnz", "after")
    comp = first("blnz", "comparison")
    out = []
    if before and after:
        # old to new, with an arrow between them so it reads as a change and
        # not as two logos side by side (client)
        out.append(f"""<section class="ba wrap reveal" aria-label="{T(lang, 'قبل وبعد', 'Before and after')}">
  <figure class="ba-old"><figcaption><span class="ba-k">{T(lang, 'قبل', 'Before')}</span><span class="ba-d">{T(lang, 'الشعار السابق', 'The old mark')}</span></figcaption>{pic(root, before, lang, 'ba-img', sizes='45vw')}</figure>
  <div class="ba-arrow" aria-hidden="true">{ARROW_SVG}</div>
  <figure class="ba-new"><figcaption><span class="ba-k">{T(lang, 'بعد', 'After')}</span><span class="ba-d">{T(lang, 'الهوية الجديدة', 'The new identity')}</span></figcaption>{pic(root, after, lang, 'ba-img', sizes='45vw')}</figure>
</section>
""")
    elif comp:
        out.append(bleed(root, comp, lang))
    icon = next((f"{root}assets/works/blnz/new-icon-white.{e}" for e in ("webp", "png")
                 if os.path.exists(f"assets/works/blnz/new-icon-white.{e}")), None)
    icon_html = f'<div class="blnz-icon"><img src="{icon}" alt="" loading="lazy"></div>' if icon else ""
    out.append(block(T(lang, "الرمز", "The symbol"),
                     f"""<div class="blnz-sym">{icon_html}<p class="lead">{T(lang,
                         facts.get('icon_ar') or 'تستمد أيقونة بلنز شكلها من الجمل، رمز الثبات والاعتمادية في الثقافة العربية.',
                         'The BLNZ icon is drawn from the camel, in Arab culture the sign of steadiness and of someone you can depend on, built from simple geometry so it reads both old and new. Patience, reliability, and roots in this land: that is what the mark carries into everything the company builds.')}</p></div>"""))
    pal = facts.get("palette") or ["#002F26", "#56BC78", "#93FE60", "#EBFFE1"]
    sw = "".join(f'<div class="sw" style="--c:{c}"><span dir="ltr">{c}</span></div>' for c in pal)
    out.append(block(T(lang, "اللون", "Colour"),
                     f"""<div class="swatches">{sw}</div><p class="lead">{T(lang,
                         'أخضر واحد بأربع درجات: عميق للأساس، ومتوسط للعلامة، ومضيء للتفاصيل، وأبيض مخضرّ للمساحات. لوحة تقول ما تقوله الهوية عن نفسها: الثبات والتوازن والاستمرارية.',
                         'One green in four steps: deep for the foundation, mid for the mark, bright for the details and a green-white for space. A palette that says what the identity says about itself: steadiness, balance, continuity.')}</p>"""))
    wides = items("blnz", "wide")
    det = items("blnz", ["detail", "mockup"])
    if wides:
        out.append(bleed(root, wides[0], lang))
    out.append(gallery(root, det[:len(det) // 2 + 1], lang))
    for wd in wides[1:2]:
        out.append(bleed(root, wd, lang))
    out.append(gallery(root, det[len(det) // 2 + 1:], lang))
    for wd in wides[2:]:
        out.append(bleed(root, wd, lang))
    return "".join(out)


# ═════════════════════════════════════════════════════════════════════════
#  HOME
# ═════════════════════════════════════════════════════════════════════════
# The lines that are not Satr's come from the client's document: the comic
# line is سمرقند's scope, the podcast line مكنون's.
SERVICES = [
    (("أنيميشن", "Animation"), ("مشاهد مرسومة حين لا تكفي الكاميرا.", "Drawn scenes when a camera isn't enough.")),
    (("موشن جرافيك", "Motion graphics"), ("نص وشكل يتحركان مع الصوت.", "Type and shape that move with the voice.")),
    (("قصص مصورة", "Comics"), ("كتابة الحوارات، ورسم الشخصيات وتصميمها.", "Dialogue, character design and drawing.")),
    (("تصوير", "Filming"), ("سينمائي للإعلانات والبودكاست والفعاليات.", "Cinematic, for ads, podcasts and events.")),
    (("مونتاج", "Editing"), ("من المادة الخام إلى قصة لها إيقاع.", "From raw footage to a story with a rhythm.")),
    (("بودكاست", "Podcasts"), ("مقطع الافتتاحية، والهوية البصرية، ومونتاج المقتطفات.", "The opening, the visual identity, and the clips.")),
    (("هوية بصرية", "Visual identity"), ("شعار ولون وخط وطريقة ظهور.", "Mark, colour, type and how it all shows up.")),
    (("تغطية فعاليات", "Event coverage"), ("نصوّر الحدث كاملًا ونسلّمه مقاطع جاهزة.", "We film the whole event and hand back finished cuts.")),
    (("كتابة وأداء صوتي", "Writing & voice"), ("قصة أصلية، وتعليق صوتي، وأصوات الشخصيات.", "Original stories, voice-over, and character voices.")),
    (("إدارة المحتوى", "Content & publishing"), ("كتابة ونشر وإدارة حسابات، بلا انقطاع.", "Writing, publishing and running accounts, without gaps.")),
]

# «شركاء النجاح» names the ORGANISATIONS, never our own project names: not
# «مع الله» but the body that asked for it. Shown as their own marks in
# white. A body joins the list when its logo file exists (new ones go in
# assets/clients/), and one without a logo is left out rather than set in
# type beside the marks. The list and the marks are Satr's (its commits
# 59b014c and 9467a7f, 8 November 2026), brought over on the client's word.
CLIENTS = [
    (("مكنون", "Maknoon"), "assets/works/maknoon/logo-white.webp"),
    # cut from the presenter card at the end of the Hirasathon film
    (("النصبان للحراسات الأمنية", "Al-Nasban Security Guards"), "assets/works/hirasathon/client-logo-white.webp"),
    (("تأصيل التعليمية", "Ta'seel"), "assets/works/taseel/logo-white.webp"),
    (("بلنز", "BLNZ"), "assets/works/blnz/logo-white.webp"),
    # the client's own list (8 November 2026), in its order. Still without a
    # logo, so not here: مركز فقهاء، وزارة الثقافة، سراج العقارية، اكسينا،
    # جمعية وسم الصبا، التحول التقني.
    (("ملعقة", "Mllaqah"), "assets/clients/mllaqah.webp"),
    (("فلق", "Falaq"), "assets/clients/falaq.webp"),
    (("مركز لطف للاستشارات التعليمية والتربوية", "Lutf Center"), "assets/clients/lutf.webp"),
    (("نادي الاعتماد الرياضي", "Al-Eetemad Club"), "assets/clients/aletemad.webp"),
    (("جمعية إجلال لرعاية الأيتام", "Ejlal Orphans' Association"), "assets/clients/ejlal.webp"),
    (("عزومة", "Azomah"), "assets/clients/azomah.webp"),
    (("دار العز", "Dar Alezz"), "assets/clients/daralezz.webp"),
    (("جمعية منهاج لعلوم القرآن والسنة", "Minhaj Association"), "assets/clients/minhaj.webp"),
    (("جزيل", "Jazeel"), "assets/clients/jazeel.webp"),
    (("أناناس", "Ananas"), "assets/clients/ananas.webp"),
    (("ميلاف", "Milaf"), "assets/clients/milaf.webp"),
    (("جمعية صاعد لتنمية الشباب", "Saed Youth Association"), "assets/clients/saed.webp"),
    (("شركة أوقاف مركز باحثات", "Bahithat Center Endowment"), "assets/clients/bahithat.webp"),
    (("أسمى", "Asma"), "assets/clients/asma.webp"),
    (("أكاديمية ألوان", "Alwan Academy"), "assets/clients/alwan.webp"),
    (("نادي الإبل", "Camel Club"), "assets/clients/camelclub.webp"),
    (("XP-Pen", "XP-Pen"), "assets/clients/xppen.webp"),
    (("نبراس", "Nibras"), "assets/clients/nibras.webp"),
]


def clients_block(lang, root):
    # Marks are sized by area, not by height: at one height a wide lockup
    # reads small and a square one shouts. --h is a share of the cell's
    # height, 1/√(aspect), so every mark covers about the same ink.
    marks = []
    for name, src in CLIENTS:
        if not os.path.exists(src):
            continue
        w, h = webp_size(src) or (1, 1)
        k = min(1.0, .8 / (w / h) ** .5)
        marks.append(f'<li><img src="{root}{src}" width="{w}" height="{h}" style="--h:{k:.2f}" '
                     f'alt="{T(lang, *name)}" loading="lazy" decoding="async" draggable="false"></li>')
    # Two rows, half the marks each, drifting opposite ways and draggable
    # (client). Without script.js each row is a plain sideways scroller.
    half = (len(marks) + 1) // 2
    rows = "".join(f'<div class="cl-row" data-mq-row><ul class="cl">{"".join(part)}</ul></div>'
                   for part in (marks[:half], marks[half:]))
    return f"""<section class="clients">
  <div class="blk wrap cl-head"><h2 class="blk-label">{T(lang, 'شركاء النجاح', 'Partners in success')}</h2></div>
  <div class="cl-mq" data-mq>{rows}</div>
</section>
"""


def services_list(lang, two=False):
    # two abreast: ten rows down one column read as a long page
    rows = "".join(f'<li><span class="sv-n" dir="ltr">{i:02d}</span><span class="sv-name">{T(lang, *n)}</span>'
                   f'<span class="sv-d">{T(lang, *d)}</span></li>' for i, (n, d) in enumerate(SERVICES, 1))
    return f'<ul class="sv{" sv-2" if two else ""}">{rows}</ul>'


HERO = "assets/hero.webp"


def home_body(p):
    lang, root = p["lang"], p["root"]
    hero = still(HERO)
    return f"""<section class="hero" data-hero>
  <div class="hero-bg" data-hero-loop data-src="{root}assets/hero-loop.mp4" data-src-tall="{root}assets/hero-loop-tall.mp4">{pic(root, hero, lang, "hero-img", eager=True, alt="")}</div>
  <div class="hero-mark">
    <h1 class="hero-logo">{logo('word', lang, 'logo', T(lang, 'المدونة ستوديو، قسم الإنتاج', 'Mdwnh Studio, Production'))}</h1>
    <p class="hero-dept" aria-hidden="true">{T(lang, *DEPT)}</p>
  </div>
  <ul class="hero-foot">
    <li><a href="mailto:{MAIL}" dir="ltr">{MAIL}</a></li>
    <li dir="ltr">{DOMAIN}</li>
    <li>{T(lang, 'الرياض', 'Riyadh')}</li>
  </ul>
</section>

<section class="intro wrap">
  <p class="intro-big reveal">{T(lang, 'نكتب ونرسم ونحرّك ونصوّر.<br>ونحكي القصة كاملة، من الفكرة حتى النشر.', 'We write, draw, animate and film.<br>And tell the whole story, from the idea to the day it goes out.')}</p>
  <div class="intro-cols">
    <p class="reveal">{T(lang, 'المدونة ستوديو في الرياض. نصنع الأنيميشن والفيديو والبودكاست والقصص المصورة والهوية البصرية لمن عنده شيء يستحق أن يُحكى، ونبقى مع المشروع من الفكرة حتى النشر.', 'Mdwnh is a studio in Riyadh. We make animation, video, podcasts, comics and identity for people with something worth telling, and we stay with the project from the idea to the day it goes out.')}</p>
    <p class="reveal">{T(lang, 'أكثر من 8.5 مليون مشاهدة لسلسلة واحدة، فيلم أنيميشن حقق المركز الثاني في مسابقة الإنتاج المرئي للنشء، وتغطيات لفعاليات من أول ساعة لآخرها.', 'Over 8.5 million views on a single series, an animated film that took second place in the youth visual production competition, and events covered from the first hour to the last.')}</p>
  </div>
</section>

{rail(p, WORKS, title=T(lang, 'أعمال مختارة', 'Selected work'), more=True, cls='dark')}
<section class="blk wrap">
  <h2 class="blk-label">{T(lang, 'ماذا نعمل', 'What we do')}</h2>
  <div class="blk-body">{services_list(lang, two=True)}</div>
</section>
{clients_block(lang, root)}"""


# ═════════════════════════════════════════════════════════════════════════
#  WORK INDEX
# ═════════════════════════════════════════════════════════════════════════
def projects_body(p):
    lang, root = p["lang"], p["root"]
    rows = "".join(f"""<li><a href="{root}{url(lang, 'projects/' + w['id'])}">
      <span class="ix-name">{T(lang, *w['name'])}</span>
      <span class="ix-kind">{T(lang, *w['kind'])}</span>
      <span class="ix-line">{T(lang, *w['line'])}</span>
      <span class="ix-go">{ARROW_SVG}</span>
    </a></li>""" for w in WORKS)
    return f"""<section class="p-head wrap">
  <h1 class="h1 enter blur">{T(lang, 'الأعمال', 'Work')}</h1>
  <p class="p-sub enter">{T(lang, 'مختارات من الأنيميشن والفيديو والبودكاست والقصص المصورة والهوية التي صنعناها.', 'A selection of the animation, video, podcasts, comics and identity we have made.')}</p>
</section>
{rail(p, WORKS, cls='dark big')}
<section class="blk wrap">
  <h2 class="blk-label">{T(lang, 'الفهرس', 'Index')}</h2>
  <div class="blk-body"><ul class="ix">{rows}</ul></div>
</section>
"""


# ═════════════════════════════════════════════════════════════════════════
#  ABOUT
# ═════════════════════════════════════════════════════════════════════════
STEPS = [
    (("نسمع", "Listen"), ("نجلس معك ونفهم ماذا تريد أن تقول ولمن.", "We sit with you and work out what you want to say, and to whom.")),
    (("نكتب", "Write"), ("فكرة واحدة واضحة، ونص، وخطة تصوير.", "One clear idea, a script, a shot plan.")),
    (("نصنع", "Make"), ("رسم وتحريك وتصوير وموشن ومونتاج داخل فريق واحد.", "Drawing, animation, filming, motion and editing inside one team.")),
    (("ننشر", "Publish"), ("نسلّم بالمقاسات الصحيحة، ونتولى النشر إن أردت.", "We deliver in the right formats, and run publishing if you want us to.")),
]

ABOUT = "assets/about.webp"


def about_body(p):
    lang, root = p["lang"], p["root"]
    # the studio's own library, the second render in the 2026 identity
    big = still(ABOUT, ("مكتبة المدونة", "The Mdwnh library"))
    steps = "".join(f'<li><span class="sv-n" dir="ltr">{i:02d}</span><span class="sv-name">{T(lang, *n)}</span>'
                    f'<span class="sv-d">{T(lang, *d)}</span></li>' for i, (n, d) in enumerate(STEPS, 1))
    # This site is قسم الإنتاج, المدونة's department for clients: an agency
    # for that one purpose, separate from the المدونة its audience knows. So
    # none of the fan world's voice belongs here («عالم خيالي ماتع» was
    # taken off this page by the client). Written at the client's request.
    return f"""<section class="p-head wrap">
  <h1 class="h1 enter blur">{T(lang, 'قسم الإنتاج', 'Mdwnh Production')}</h1>
  <p class="p-sub enter">{T(lang, 'قسم في المدونة مخصص لإنتاج أعمال عالية الجودة للعملاء.', 'A department of Mdwnh dedicated to making high-quality work for clients.')}</p>
</section>
{bleed(root, big, lang) if os.path.exists(ABOUT) else ''}
<section class="blk wrap">
  <h2 class="blk-label">{T(lang, 'من نحن', 'Who we are')}</h2>
  <div class="blk-body">
    <p class="lead">{T(lang, 'قسم الإنتاج هو ذراع المدونة للعملاء: فريق يصنع أعمالًا عالية الجودة للشركات والجهات والجمعيات، ويتولى المشروع من الفكرة حتى التسليم.', 'The production department is Mdwnh’s arm for clients: a team that makes high-quality work for companies, organisations and non-profits, and runs each project from the idea to delivery.')}</p>
    <p>{T(lang, 'وهو منفصل عن المدونة التي يعرفها الجمهور بقصصها وشخصياتها وأعمالها الأصلية. هنا نعمل كوكالة إنتاج: نصنع ما يحتاجه العميل، من الأنيميشن والموشن جرافيك إلى التصوير والمونتاج والبودكاست والهوية البصرية وتغطية الفعاليات، ونستند في ذلك إلى فريق المدونة، أكثر من 25 مبدعًا في الكتابة والرسم والتحريك والتصميم والمونتاج والأداء الصوتي.', 'It is separate from the Mdwnh audiences know, with its stories, characters and original work. Here we work as a production agency: we make what the client needs, from animation and motion graphics to filming, editing, podcasts, visual identity and event coverage, drawing on Mdwnh’s team of more than 25 creatives in writing, drawing, animation, design, editing and voice.')}</p>
  </div>
</section>
<section class="blk wrap">
  <h2 class="blk-label">{T(lang, 'كيف نعمل', 'How we work')}</h2>
  <div class="blk-body"><ul class="sv">{steps}</ul></div>
</section>
<section class="blk wrap">
  <h2 class="blk-label">{T(lang, 'ماذا نعمل', 'What we do')}</h2>
  <div class="blk-body">{services_list(lang, two=True)}</div>
</section>
{clients_block(lang, root)}"""


# ═════════════════════════════════════════════════════════════════════════
#  CONTACT: Meshbak's lines, the address as the one big action.
#
#  Satr's brief form wrote to Satr's own database, which this site must
#  never touch. Until the studio picks a path for briefs (a relay like the
#  one /careers uses, or another), the page is the mailbox and the accounts.
# ═════════════════════════════════════════════════════════════════════════
def contact_body(p):
    lang, root = p["lang"], p["root"]
    acc = "".join(f'<li><a href="{h}" rel="noopener" target="_blank">{T(lang, ar_, en_)}</a></li>'
                  for en_, ar_, h in SOCIAL)
    return f"""<section class="p-head wrap">
  <h1 class="h1 enter blur">{T(lang, 'خلّنا نبدأ حكايتك', 'Let’s start your story')}</h1>
  <p class="p-sub enter">{T(lang, 'احكِ لنا عن مشروعك على البريد: ما هو، ولمن، ومتى تحتاجه.', 'Tell us about your project by email: what it is, who it is for, and when you need it.')}</p>
</section>
<section class="ct wrap">
  <div class="ct-lines">
    <div><p class="ct-k">{T(lang, 'الحسابات', 'Follow')}</p><ul class="ct-acc">{acc}</ul></div>
    <div><p class="ct-k">{T(lang, 'المدينة', 'City')}</p><p>{T(lang, 'الرياض، المملكة العربية السعودية', 'Riyadh, Saudi Arabia')}</p></div>
  </div>
  <div class="ct-main">
    <p class="ct-k">{T(lang, 'البريد', 'Email')}</p>
    <a class="ct-mail" href="mailto:{MAIL}" dir="ltr">{MAIL}</a>
    <a class="send" href="mailto:{MAIL}">{T(lang, 'اكتب لنا رسالة', 'Write to us')}</a>
  </div>
</section>
"""


# ═════════════════════════════════════════════════════════════════════════
#  PAGES
# ═════════════════════════════════════════════════════════════════════════
def pages():
    out = []
    for lang in LANGS:
        out.append(dict(lang=lang, slug="", body=home_body, cls="home", eager_rail=False, hero=still(HERO),
                        title=T(lang, "المدونة ستوديو | إنتاج أنيميشن وفيديو في الرياض",
                                "Mdwnh Studio | Animation and video production in Riyadh"),
                        desc=T(lang, "المدونة ستوديو في الرياض: أنيميشن، موشن جرافيك، قصص مصورة، تصوير، مونتاج، بودكاست، وهوية بصرية.",
                               "Mdwnh Studio in Riyadh: animation, motion graphics, comics, filming, editing, podcasts and visual identity.")))
        out.append(dict(lang=lang, slug="projects", body=projects_body, cls="dark-page", eager_rail=True,
                        title=T(lang, "الأعمال | المدونة ستوديو", "Work | Mdwnh Studio"),
                        desc=T(lang, "أعمال المدونة: " + "، ".join(w["name"][0] for w in WORKS) + ".",
                               "Mdwnh's work: " + ", ".join(w["name"][1] for w in WORKS) + ".")))
        for w in WORKS:
            out.append(dict(lang=lang, slug="projects/" + w["id"], body=case_page, work=w, cls="case",
                            title=T(lang, f"{w['name'][0]} | أعمال المدونة", f"{w['name'][1]} | Mdwnh Studio"),
                            desc=T(lang, *w["line"])))
        out.append(dict(lang=lang, slug="about", body=about_body, cls="about",
                        title=T(lang, "قسم الإنتاج | المدونة ستوديو", "Production | Mdwnh Studio"),
                        desc=T(lang, "قسم الإنتاج في المدونة: فريق مخصص لإنتاج أعمال عالية الجودة للعملاء.",
                               "Mdwnh's production department: a team dedicated to making high-quality work for clients.")))
        out.append(dict(lang=lang, slug="contact", body=contact_body, cls="contact",
                        title=T(lang, "تواصل | المدونة ستوديو", "Contact | Mdwnh Studio"),
                        desc=T(lang, f"احكِ لنا عن مشروعك: {MAIL}", f"Tell us about your project: {MAIL}")))
    return out


def render(p):
    p["root"] = depth_root(p["lang"], p["slug"])
    skip = T(p["lang"], "تخطَّ إلى المحتوى", "Skip to content")
    body = p["body"](p)
    return (head(p) + f'<body class="{p.get("cls", "")}">\n' + sprite(p["lang"])
            + f'<a class="skip" href="#main">{skip}</a>\n' + header(p)
            + '<main id="main">\n' + body + "</main>\n" + footer(p)
            + f'<script src="{p["root"]}script.js?v={VER}" defer></script>\n'
            + "</body>\n</html>\n")


def write(path, text):
    d = os.path.dirname(path)
    if d:
        os.makedirs(d, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"{path:38} {len(text.encode('utf-8')) / 1024:7.1f} KB")


def sitemap(ps):
    urls = "\n".join(f"  <url><loc>{SITE}/{url(p['lang'], p['slug'])}</loc></url>" for p in ps)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by tools/build-pages.py. Do not edit. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{urls}
</urlset>
"""


# A robots.txt is only ever read at the root of a host, and the root of
# mdwn.studio is the fan site's, so this site writes none.

if __name__ == "__main__":
    ps = pages()
    for p in ps:
        write(url(p["lang"], p["slug"]) + "index.html", render(p))
    write("sitemap.xml", sitemap(ps))
    missing = [w["id"] for w in WORKS if not MANIFESTS[w["id"]]["items"]]
    if missing:
        print("\n⚠ no pictures yet for:", ", ".join(missing))
    print("\ndone.")
