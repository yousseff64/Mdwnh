# مدونة ستوديو — Mdwnh Studio

Arabic animation studio. This repo holds the public website.

## Writing rules (apply to code comments, copy, commits, and chat)

- **Never use an em dash.** Use a comma, a colon, a full stop, or parentheses.
  This applies to Arabic and English alike.
- Arabic is the primary language of the site. English appears only as small
  utility text (labels, marginalia, platform names).
- **Every section header carries tashkeel.** `مَنْ نَحْنُ؟` not `من نحن؟`.
  Body copy stays undiacritised.
- Copy is written from the reader's side of the screen. Say what a button does.
  A button that says `شاهد الآن` leads to something you can watch right now.

## Working rules for Claude

- **Always load the `caveman` skill** at the start of work in this project and
  keep it on for every chat reply. Code, comments, copy and commits stay
  written normally.
- **Always load the `apple-design` skill** for any UI, layout, motion or
  interaction work. Hover and gesture motion is spring driven and
  interruptible (see `js/contribute.js`), feedback lands on press, and
  every effect has a reduced motion fallback.
- Other agents may be editing the site at the same time. Make targeted edits,
  re-read a file right before changing it, and never revert changes you did
  not make.

## Who the site is for

Priority order, set by the client:

1. **المتابع (the fan)** — first class citizen. The site's job is to walk them
   through the مدونة universe and its work.
2. **المبدع (the aspiring creator)** — wants a clear, non vague way in.
3. **العميل (the client)** — lowest priority *on this site*.

The production services arm lives on a separate animation studio site. Do not
put a services pitch or a client portfolio pitch on this one: it splits the
fan's attention and the client explicitly rejected it.

Audience persona (from `شخصية العميل المثالي` research doc): Arabic speaking,
16 to 30 with a core of 18 to 26, Gulf and MENA, student or early career,
discovers work through short vertical video, decides in seconds, values
originality and cultural closeness, and converts from viewer to member when the
way in is spelled out.

## Repo layout

The site is the repo root. `mdwn.studio` serves it, and the site that used to
live there is archived, whole and working, at `mdwn.studio/old`.

```
/                     the site
  index.html          single page
  project.html        project detail template, driven by ?id=
  css/                base.css (tokens + primitives), sections.css, project.css
  js/                 data.js + one module per behaviour
  assets/             GENERATED. do not hand edit
  tools/build-assets.py
/comics               the comic shelf
  index.html          the three covers, on base.css + comics.css
  viewer/             the reader chrome every comic shares (css, js, page turn)
  pages/<id>/         the numbered page art each reader loads
/Hujra, /Samrqand,
/Ghailam              one reader per comic. These URLs are published, so they
                      keep their names even though the ids elsewhere are
                      hujra, samarqand and qird
/old                  the previous site, archived and still reachable. It
                      links out to /comics/ and /analytics/ absolutely,
                      because those did not move with it
/analytics            the view counter the readers and /old share
/Art, /icons          source art. Hundreds of megabytes, untracked, never
                      shipped: only what build-assets.py writes is
/Art/stills/<id>/     the five frames on each project page's strip
/Art/comments/        the featured comment screenshots, named by handle
/Art/showreel.mp4     the master behind the clip in the مُجْتَمَعُنَا call
/scripts              fetch-stats.mjs    → assets/stats-data.js (the numbers)
                      fetch-youtube.mjs  → old/assets/youtube-data.js. This
                      only feeds the archive now, so the hourly job that runs
                      it is doing nothing anyone reads. Retire it when you
                      are sure nothing else wants it.
```

`build_images` in build-assets.py currently fails: it looks for the project
art at the top of `Art/`, and those files now live in `Art/projects/`. Run one
step at a time (`build-assets.py stills`) until the paths are reconciled.

## Assets

`assets/` is **generated output**. To change an asset, change the source in
`Art/` or `icons/` and rerun:

```bash
python3 tools/build-assets.py
```

Everything ships as WebP. The home page's payload is about 1.6 MB, including
the 69 frame falling animation packed into a single 480 KB atlas. Keep it that
way: the site must feel instant on a phone on mobile data.

The project page stills (`assets/img/stills/`) add about 1 MB across all six
works, but none of it is on the home page and every frame is lazy loaded, so a
project page costs 30 to 100 KB on a phone (the `-sm.webp` twin) and up to
330 KB on a desktop. Each still ships at two widths.

Never add a build step, a bundler, or a framework. The site is plain HTML, CSS
and ES modules served statically from Firebase Hosting.

## Brand

| Token | Value | Use |
| --- | --- | --- |
| paper | `#FBFAF9` | default background |
| ink | `#323232` | default text |
| ember | `#F56549` | accent |
| sun | `#F7D038` | accent |
| mint | `#45C4B9` | accent |
| sky | `#0084C1` | accent |

Fonts: **Rubik** for body and UI, **Baloo Bhaijaan 2** for display headers.
Never apply `letter-spacing` to Arabic text: it breaks the joins. Latin
marginalia may be tracked.

### Visual language

- **Icons** (`icons/*.png`) are brush drawn black marks. They are used as CSS
  masks and recoloured with the four accents. Never ship them as flat black.
- **Clouds** (`Art/cloud.png`) are the house decoration. Reuse the one asset
  many times per screen: vary scale, flip it, vary blur, and give each copy its
  own slow drift. They usually sit in the foreground.
- **سراج** is a *species*, not a person. He is normally yellow, but individual
  سراج may be hue shifted to blue or red. Use him sparingly; the cast art
  carries more weight.
- **No negative space.** Empty margins get vertical marginalia, a drifting
  icon, or a cloud. Every screenful should have something in it.
- Section headers get a small eyebrow line above them listing real names
  separated by `·` (project names, platform names, role names).

## The falling سراج section

`js/fall.js` is the one piece with a load bearing layout contract. Do not
change these without reading it:

- **Stacking order is deliberate.** Page order is أعمالنا, ماذا قالوا عن عملنا,
  إنجازاتنا, كيف أساهم. `.work` is `z-index: 5`, `.voices` is `4`, `.wins`
  is `3`, `.contribute` is `2`. سراج drops out from *under* `.work`, and lands
  *over* `.wins` so his hands break the seam. The block above `.voices` must
  sit above it and the block below must sit under it; reordering sections
  means moving these z-indexes with them.
- **Only سراج escapes the clip.** Stars, the intro and the comment field live
  inside `.voices__clip` (`overflow: hidden`). His canvas is a sibling of that
  clip and hangs `OVERHANG` pixels below the sticky stage.
- **Inside the stage, three layers straddle him.** The blurred field
  (`.voices__field`, `2`) is under سراج (`6`). The featured comments
  (`.voices__front`, `7`, the `hi` rows in `data.js`) and the header
  (`.voices__intro`, `8`) are over him, so they stay readable on a phone
  where there is no room beside him. Keep featured to six or seven. His white
  hairline (`.voices__rim`, overlay) is a second canvas directly under his.
- **The section folds after the landing.** Once he has landed and the pin has
  let go, `.voices` gets `.is-short` (one screen) at the next scroll pause,
  with the scroll corrected so nothing on screen moves. Everything in the loop
  is computed against a virtual full-height top (`rect.bottom - H`), so the
  field carries on as if it were still tall. When the section leaves the
  viewport below, it unfolds and unlands, so the fall replays.
- **Never put opacity, filter or mask on an ancestor of a `backdrop-filter`.**
  The header's frosted pool (`.voices__veil`) and the featured cards blur
  what is behind them; any of those on a parent cuts the blur off from the
  page. That is why the header fades through `--fade` on each child instead
  of `opacity` on `.voices__intro`.
- **Positions are stage-local, not viewport-local.** Once the section runs out
  the sticky stage slides up inside it, so the seam is computed as
  `section.bottom - stage.top`. Using viewport coordinates makes him land in
  the wrong place, and the bug only shows at the very end of the scroll.
- **`IMPACT_FOOT`** is where the floor cuts across his frame box. His own
  bounding box ends at `0.855`, so anything lower sinks him into the floor.
- Frames 0 to 58 are scrubbed by scroll. From 59 the rest play once on a timer
  and never rewind, because he has landed.
- **He lands in view, not at the pin's end.** When the pin lets go the floor is
  still on the bottom edge of the screen. He keeps falling for another `LIFT`
  of a screen while the stage scrolls away, and lands once the floor has risen
  into view. Frames scrub over `run + vh * LIFT`, not just the pinned run.

## The comments

The seven comments in `js/data.js` marked `hi` are real: people wrote them
under the work, and the screenshots they were copied from sit in
`Art/comments/`, each named after the handle. `build-assets.py avatars` cuts
the round avatar out of each one. Where a commenter has no real picture (a
plain black circle, a letter) drop the `av` and let the card paint its own
coloured initial instead.

**Every other row in that table is filler, and must stay filler.** They are
noises and notes to nobody. The field behind سراج is decoration, and the blur
that softens it is not a guarantee: a phone renders it unblurred, and an old
browser or a screenshot can lose it entirely. A plausible compliment written
into a background row becomes a testimonial the studio never received. Never
write one.

## The numbers

`scripts/fetch-stats.mjs` runs hourly (`.github/workflows/stats.yml`) and
writes `assets/stats-data.js`, a plain script loaded before the modules. It
reads only public pages: YouTube's about page (subscribers, total channel
views, video count) and the نادي المدونة invite (members). TikTok serves only
its first page to anyone not logged in, and Instagram publishes no view count,
so those stay hand entered in `data.js`.

- `js/live.js` merges the two. A STATS row names a live key; anything it does
  not cover keeps the figure in `data.js`. Nothing is required: if the file is
  missing the page reads exactly as it does now.
- Any number written into the copy carries `data-live="<key>"` and is rewritten
  on load. The text in the HTML is the fallback, so the sentence is correct
  before and without the script.
- **مشاهدة على كل المنصات is a sum**, not YouTube's figure: `VIEWS` in
  `data.js` holds one line per platform. The TikTok line is a floor (the 24
  videos TikTok serves publicly, of 61), so the row is marked `approx` and
  shows as an estimate however fresh it is. Replace it with the all time
  figure from TikTok Studio and drop the flag.

## The project pages

- **A work that is a comic leads with the comic.** Where `PROJECT_PAGES[id]`
  has a `read`, the hero's filled button is `اقرأ القصة المصورة` and the
  video drops to a ghost; on the home page's news card the comic is the second
  button and the trailer becomes a quiet link under the pair. The readers are
  on this same site, so those links never open a new tab.
- **The strip of stills** (`js/stills.js`, `STILLS` in `data.js`) is
  deliberately quiet: one slow drift, no lift, no tilt, and the pointer eases
  it to a stop. To change a frame, drop a file over `Art/stills/<id>/<n>.jpg`
  and run `python3 tools/build-assets.py stills`: it is cut to 16:9 for you
  and both widths are rebuilt. Reduced motion turns it into a snap scrolling
  row and moves nothing.
- **غمام's award** is the `award` block on its page, drawn by `.pprize` as the
  same three petal rosette as إنجازاتنا, cooled to that page's night. The band
  closes عَنِ الحِكَايَة, where the copy names the competition, and climbs into
  that section's bottom bay so it reads as the story's last line. Any other
  work that wins something gets the band by adding the same block.

## Accessibility floor

Responsive to 360px. Visible keyboard focus. `prefers-reduced-motion` disables
the parallax, the camera shake, the marquee, and the scroll driven fall, which
then renders as a static frame. Do not ship a section that only works with a
mouse.
