/* ============================================================
   ماذا قالوا عنا؟

   سراج drops out from under the أعمالنا block and falls through
   a field of real audience comments until he hits the floor, which
   is the top edge of the next section (إنجازاتنا).

   Three phases:
     A  enter   he slides down out of the section's top edge, so he
                reads as coming from behind the block above.
     B  fall    pinned on screen, frames 0..58 driven by scroll, the
                comment field streams past him in parallax layers.
     C  land    at frame 59 his body meets the seam. From there the
                remaining frames play once on a timer and he stays
                stuck to the floor. At the next pause in scrolling the
                section folds to one screen, so the way back up is short.
                Once it drops out of sight below, it unfolds and the fall
                is ready to play again.

   The frames are one WebP atlas plus a rect table, blitted to a
   canvas, so scrubbing is instant and there is nothing to decode
   per frame.
   ============================================================ */

import { COMMENTS } from './data.js';
import { $, canvasDpr, clamp, el, lerp, lite, norm, reduced, whileVisible } from './util.js';

const ATLAS = 'assets/fall/atlas.webp';
const META = 'assets/fall/atlas.json';

/* Where the seam cuts across his frame box when he lands. His own bounding
   box ends at 0.855, so parking the seam a little higher sinks him into the
   floor and lets his hands and cap break the line instead of hovering on it.
   Lower than this and his face goes under the floor. */
const IMPACT_FOOT = 0.71;

/* A hairline of light around him (css px), so his black arms and legs still
   read against the night. It is his own silhouette in white, stamped around
   him in a ring on a canvas of its own that sits under him. */
const RIM = 1.2;
const RING = Array.from({ length: 8 }, (_, j) => [Math.cos(j * Math.PI / 4), Math.sin(j * Math.PI / 4)]);

/* The canvas hangs this far below the sticky stage so that, once he lands on
   the seam, his hands and cap can still be painted over the section below
   instead of being cut off at the canvas edge. */
const OVERHANG = 200;

const FRAME_END = 0.90;   // scroll fraction at which the fall frames run out
const REST = 0.30;        // his resting height on screen while falling

/* He does not land the moment the pin lets go, because then the floor is
   still at the very bottom edge of the screen and the impact plays where
   nobody is looking. He keeps falling while the stage scrolls away, and
   lands once the floor has risen this far up the screen (as a fraction of
   its height), so the next section is in view when he hits it. */
const LIFT = 0.32;

export async function initFall() {
  const section = $('#voices');
  const stage = $('#voicesStage');
  const canvas = $('#voicesSiraj');
  const starCanvas = $('#voicesStars');
  const field = $('#voicesField');
  const front = $('#voicesFront');
  const intro = section?.querySelector('.voices__intro');
  if (!section || !canvas) return;

  drawStars(starCanvas);
  const cards = buildField(field, front);

  const [sheet, meta] = await Promise.all([load(ATLAS), fetch(META).then((r) => r.json())]);
  const ctx = canvas.getContext('2d');
  const [stageW, stageH] = meta.stage;
  const last = meta.frames.length - 1;

  /* the rim canvas, plus two scratch canvases rebuilt only when the frame
     changes: the current frame as a white silhouette, and that silhouette
     already stamped round in its ring, so each paint blits the rim once
     instead of eight times */
  const rim = $('#voicesRim');
  const rctx = rim?.getContext('2d');
  const sil = document.createElement('canvas');
  const sctx = sil.getContext('2d');
  const halo = document.createElement('canvas');
  const hctx = halo.getContext('2d');
  let silFrame = -1;

  let dpr = 1;
  let vw = 0;
  let vh = 0;
  let drawW = 0;
  let drawH = 0;

  function measure() {
    const box = stage.getBoundingClientRect();
    vw = box.width;
    vh = box.height;
    dpr = canvasDpr();
    drawW = Math.min(vw * (vw < 760 ? 0.58 : 0.42), vh * 0.62, 540);
    drawH = drawW * (stageH / stageW);
    for (const c of rim ? [canvas, rim] : [canvas]) {
      c.width = Math.round(vw * dpr);
      c.height = Math.round((vh + OVERHANG) * dpr);
      c.style.width = `${vw}px`;
      c.style.height = `${vh + OVERHANG}px`;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    rctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    silFrame = -1;
    layout(cards, vw, vh, drawW);
  }

  const still = reduced.matches;

  /* Resizing the canvas clears it, so a still render has to be redone
     every time we remeasure. */
  function remeasure() {
    measure();
    if (still) {
      paint(28, (vw - drawW) / 2, vh * REST, 0, 0, 0);
      settle(cards, vw, vh, intro.offsetTop + intro.offsetHeight);
    }
  }

  if (still) section.style.height = '150svh';
  remeasure();
  new ResizeObserver(remeasure).observe(stage);
  /* Card sizes depend on the webfont, so lay the field out again once it
     lands. The font stylesheet no longer blocks the page, so `ready` can
     resolve before the fonts have even been asked for: listen for each
     batch as well. */
  document.fonts?.ready.then(remeasure);
  document.fonts?.addEventListener?.('loadingdone', remeasure);
  /* lite drops the canvas resolution and the field's blur */
  addEventListener('litechange', remeasure);
  if (still) return;

  let landedAt = 0;   // timestamp of impact, 0 until it happens

  /* ---- the fold ----
     Going back up should not mean scrolling through the whole fall again.
     Once he has landed and the pin has let go, the section folds to one
     screen at the next pause in scrolling. The fold keeps the section's
     bottom edge where it is on screen, and the loop works from a virtual
     full-height top, so nothing visible moves. Once the section is out of
     sight below (the reader went back up past it) it unfolds and unlands,
     so the next visit gets the whole fall. */
  let short = false;
  let tall = 3;       // full height in screens, read at the fold
  let foldTop = 0;    // the folded section's top, right after the fold

  function fold() {
    const before = section.getBoundingClientRect().bottom;
    tall = section.offsetHeight / vh;
    section.classList.add('is-short');
    short = true;
    const d = section.getBoundingClientRect().bottom - before;
    if (Math.abs(d) > 0.5) {
      window.scrollTo({ top: scrollY + d, behavior: 'instant' });
      /* tell anything tracking scroll direction (the nav) this was not the
         reader going back up */
      dispatchEvent(new CustomEvent('scrolljump'));
    }
    foldTop = section.getBoundingClientRect().top;
  }

  function unfold() {
    section.classList.remove('is-short', 'is-landed');
    short = false;
    landedAt = 0;
  }

  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting && e.boundingClientRect.top > 0 && (landedAt || short)) unfold();
  }).observe(section);

  /* Folding moves the scroll position, so it only happens while nothing is
     scrolling. A correction in the middle of a flick would stop it dead. */
  let idle = 0;
  addEventListener('scroll', () => {
    clearTimeout(idle);
    idle = setTimeout(() => {
      if (short) return;
      const r = section.getBoundingClientRect();
      if (r.top >= innerHeight) return;
      /* jumped straight past him (a nav link, a restored scroll position):
         count it as a landing that happened long ago */
      if (!landedAt && r.bottom <= 0) {
        landedAt = performance.now() - 1e5;
        section.classList.add('is-landed');
      }
      if (landedAt && r.bottom <= vh + 1) fold();
    }, 160);
  }, { passive: true });

  whileVisible(section, (t) => {
    const rect = section.getBoundingClientRect();
    const sr = stage.getBoundingClientRect();

    /* Folded, the section is one screen tall, but everything is worked out
       as if it were still full height with the same bottom edge, so the
       field and stars carry on exactly where the fold left them. */
    const H = short ? tall * vh : rect.height;
    const top = rect.bottom - H;

    /* Everything below is in stage-local pixels. While the stage is pinned
       those match the viewport, but once the section runs out the stage
       slides up inside it, so the seam has to be converted. */
    const seam = rect.bottom - sr.top;
    const span = H + vh;
    const flow = clamp(vh - top, 0, span);

    /* ---- phase A: slide out from under the block above ---- */
    const enter = norm(vh - top, 0, vh);
    const restY = vh * REST;
    let y = lerp(-drawH * 1.05, restY, easeOut(enter));

    /* ---- phase B: scroll drives the frames ----
       `reach` runs LIFT of a screen past the end of the pin, so the frames
       and the dive also cover the stretch where the floor rises into view. */
    const run = Math.max(1, H - vh);
    const reach = run + vh * LIFT;
    const b = clamp(-top / run, 0, 1);
    const q = clamp(-top / reach, 0, 1);
    let frame = Math.round(norm(q, 0, FRAME_END) * (meta.impact - 1));

    if (top <= 0) {
      /* Worked out on screen, then made stage-local: once the pin lets go
         the stage slides up and sr.top goes negative by that much. Over the
         last stretch he accelerates down into the rising floor. */
      const dive = norm(q, FRAME_END - 0.06, 1);
      const floor = rect.bottom - drawH * IMPACT_FOOT;
      y = lerp(restY, Math.max(restY, floor), easeIn(dive)) - sr.top;
    }

    /* ---- phase C: the seam catches him and never lets go ---- */
    const landY = seam - drawH * IMPACT_FOOT;
    if (landedAt || y >= landY - 0.5) {
      if (!landedAt) {
        landedAt = t;
        section.classList.add('is-landed');
      }
      y = landY;
      const since = (t - landedAt) / 1000;
      frame = Math.min(last, meta.impact + Math.floor(since * meta.fps));
    }

    /* camera shake: constant while he is in the air, damped once he lands */
    const damp = landedAt ? Math.max(0, 1 - (t - landedAt) / 700) : 1;
    const s = t * 0.001;
    const sx = (Math.sin(s * 1.7) * 3.1 + Math.sin(s * 0.83) * 2.2) * damp;
    const sy = (Math.cos(s * 1.31) * 3.4 + Math.sin(s * 2.07) * 1.5) * damp;
    const rot = Math.sin(s * 0.77) * 1.15 * damp;

    paint(frame, (vw - drawW) / 2, y, sx, sy, rot);
    stream(cards, flow, span, vh, reach, s);
    /* the words and their frosted pool fade together; once gone the pool is
       hidden outright so its blurs stop costing anything */
    /* Folded, the header comes back as you head up through the section.
       It is measured from wherever the fold happened, so it never pops in. */
    const fade = short
      ? Math.min(norm(rect.top, -0.3 * vh, -0.1 * vh), norm(rect.top - foldTop, 0, 0.2 * vh))
      : clamp(1 - b * 4, 0, 1);
    intro.style.setProperty('--fade', fade.toFixed(3));
    intro.style.visibility = fade > 0 ? '' : 'hidden';
    starCanvas.style.transform = `translate3d(0, ${-flow * 0.055}px, 0)`;
  });

  function paint(i, x, y, sx, sy, rot) {
    const f = clamp(i, 0, last);
    const [fx, fy, fw, fh, ox, oy] = meta.frames[f];
    const k = drawW / stageW;
    const dx = -drawW / 2 + ox * k;
    const dy = -drawH / 2 + oy * k;
    const dw = fw * k;
    const dh = fh * k;
    const cx = x + drawW / 2 + sx;
    const cy = y + drawH / 2 + sy;
    const turn = (rot * Math.PI) / 180;

    ctx.clearRect(0, 0, vw, vh + OVERHANG);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(turn);
    ctx.drawImage(sheet, fx, fy, fw, fh, dx, dy, dw, dh);
    ctx.restore();

    if (!rctx) return;
    const pad = Math.ceil(RIM * dpr);
    if (silFrame !== f) {
      /* resizing also resets the compositing mode for the next rebuild */
      sil.width = Math.ceil(dw * dpr);
      sil.height = Math.ceil(dh * dpr);
      sctx.drawImage(sheet, fx, fy, fw, fh, 0, 0, sil.width, sil.height);
      sctx.globalCompositeOperation = 'source-in';
      sctx.fillStyle = '#fff';
      sctx.fillRect(0, 0, sil.width, sil.height);
      halo.width = sil.width + pad * 2;
      halo.height = sil.height + pad * 2;
      for (const [ux, uy] of RING) hctx.drawImage(sil, pad + ux * RIM * dpr, pad + uy * RIM * dpr);
      silFrame = f;
    }
    rctx.clearRect(0, 0, vw, vh + OVERHANG);
    rctx.save();
    rctx.translate(cx, cy);
    rctx.rotate(turn);
    rctx.drawImage(halo, dx - pad / dpr, dy - pad / dpr, halo.width / dpr, halo.height / dpr);
    rctx.restore();
  }
}

/* ------------------------------------------------------------- field --- */

/* The lens is focused here. Anything nearer or further goes soft, which is
   what makes the near cards read as being right in front of the camera. */
const FOCUS = 0.75;

/* Featured comments cross the middle of the screen at evenly spaced points of
   the pinned fall, as a fraction of it. The first waits for the header to
   fade, the last passes just before he hits the floor. */
const LEAD_FROM = 0.2;
const LEAD_TO = 0.9;

/* The featured few (`hi` in data.js) go in the front layer, above سراج, so
   they stay readable on a phone where there is no room beside him. The rest
   stay behind him, out of focus, filling the frame. */
function buildField(back, front) {
  let rank = 0;
  return COMMENTS.map((c, i) => {
    const node = card(c, i);
    const seed = (i * 2.399) % 6.283;
    if (c.hi) {
      node.classList.add('is-hi');
      front.append(node);
      /* alternate sides, starting on the right where an Arabic line starts */
      const r = rank++;
      return { node, c, hi: true, rank: r, side: r % 2 ? -1 : 1, seed };
    }
    /* near in front of far, so the layers stack the way depth implies */
    node.style.zIndex = String(120 - Math.round(c.d * 50));
    back.append(node);
    return { node, c, hi: false, side: i % 2 ? 1 : -1, seed };
  });
}

function card(c, i) {
  if (c.t === 'wa' || c.t === 'wi') {
    return el('article', { class: `vmsg vmsg--${c.t}` },
      el('p', { class: 'vmsg__t' }, c.x),
      el('span', { class: 'vmsg__meta' }, TIMES[i % TIMES.length], c.t === 'wa' ? el('span', { class: 'vmsg__tick', html: TICK }) : null)
    );
  }
  if (c.t === 'x') {
    return el('article', { class: 'vcomment vcomment--x' },
      el('span', { class: 'vcomment__pfp', style: `background:${pfp(i)}` }, c.u[1].toUpperCase()),
      el('div', { class: 'vcomment__main' },
        el('div', { class: 'vcomment__top' },
          el('span', { class: 'vcomment__u' }, c.u),
          el('span', { class: 'vcomment__at' }, `· ${c.at}`)
        ),
        el('p', { class: 'vcomment__t' }, c.x),
        el('div', { class: 'vcomment__acts' },
          el('span', { html: HEART }),
          el('b', {}, arabicNum(c.n))
        )
      )
    );
  }
  /* the real avatar sits over the coloured initial, and drops out if it
     fails to load so the initial shows instead */
  const face = c.av
    ? el('img', { src: c.av, alt: '', width: 48, height: 48, decoding: 'async', onerror: (e) => e.target.remove() })
    : null;
  return el('article', { class: 'vcomment' },
    el('span', { class: 'vcomment__pfp', style: `background:${pfp(i)}` }, c.u[1].toUpperCase(), face),
    el('div', { class: 'vcomment__main' },
      el('div', { class: 'vcomment__top' },
        el('span', { class: 'vcomment__u' }, c.u),
        el('span', { class: 'vcomment__at' }, c.at)
      ),
      el('p', { class: 'vcomment__t' }, c.x),
      el('div', { class: 'vcomment__acts' },
        el('span', { html: THUMB }),
        el('b', {}, arabicNum(c.n)),
        el('span', { class: 'vcomment__reply' }, 'رد'),
        c.loved ? el('span', { class: 'vcomment__loved', title: 'أعجب مدونة ستوديو بهذا التعليق', html: HEART }) : null
      )
    )
  );
}

/* Park every card outside the corridor سراج falls through. Cards are pinned
   by their inner edge, so a huge near one runs off the side of the screen
   instead of creeping into the middle. */
function layout(cards, vw, vh, charW) {
  const narrow = vw < 760;
  /* سراج only fills the middle ~60% of his frame box, so the protected
     corridor is narrower than the box he is drawn into. */
  const corridor = charW * 0.27 + (narrow ? 5 : 12);
  const back = cards.filter((c) => !c.hi);
  const lead = cards.filter((c) => c.hi);
  const n = back.length;

  back.forEach((card, i) => {
    const d = card.c.d;
    const w0 = card.node.offsetWidth;
    const h0 = card.node.offsetHeight;

    card.scale = clamp(1.55 / (0.55 + d), 0.55, narrow ? 1.5 : 2.3);
    card.w = w0 * card.scale;
    card.h = h0 * card.scale;

    /* Depth of field, but nothing back here is ever sharp: these fill the
       frame, the featured few carry the words. Near goes huge and soft,
       far goes small, soft and dark. */
    card.blur = (2.6 + Math.abs(d - FOCUS) * 5.5) * (narrow ? 0.8 : 1);
    card.bright = clamp(0.8 - Math.max(0, d - 0.3) * 0.32, 0.3, 0.8);
    card.alpha = clamp(0.85 - Math.max(0, d - 1) * 0.4, 0.35, 0.85);

    /* Lanes: 0 hugs the corridor, 1 sits out at the edge of the frame, and
       anything past that runs off the side. The golden ratio step spreads
       them without any two landing in the same lane. A third of every card
       is kept on screen so nothing becomes a stray sliver. */
    const outer = Math.max(40, vw / 2 - corridor);
    /* biased toward 0 so the mass of the field hugs سراج, with only a
       few pushed right out to the edge of frame */
    const lane = Math.pow((i * 0.6180339887) % 1, 1.8);
    let inner = vw / 2 + card.side * (corridor + lane * outer * 1.3);
    inner = card.side > 0
      ? Math.min(inner, vw - card.w * 0.34)
      : Math.max(inner, card.w * 0.34);

    const left = card.side > 0 ? inner : inner - card.w;
    card.x = left - w0 * (1 - card.scale) / 2;   // undo the centred scale
    card.y0 = -h0 * (1 - card.scale) / 2;

    card.speed = 1.9 / (0.9 + d);
    /* spread the cues evenly, then nudge by depth so layers interleave */
    card.cue = 0.04 + (i / n) * 0.79 + (d - FOCUS) * 0.02 + (lane - 0.5) * 0.02;
    card.rot = ((i * 37) % 17) - 8;

    /* A blur on a moving layer is redrawn every frame, and the field has
       dozens. Lite keeps the depth in brightness and opacity alone. */
    card.node.style.filter = lite.on
      ? `brightness(${card.bright.toFixed(2)})`
      : `blur(${card.blur.toFixed(1)}px) brightness(${card.bright.toFixed(2)})`;
    card.node.style.opacity = card.alpha.toFixed(2);
  });

  /* Featured: at the focus depth, lit, and tilted just enough to still feel
     like they are falling past. On a wide screen they hug the corridor. On a
     phone they take most of the width, pinned to alternate edges, and pass
     over his side instead of running off the screen. */
  lead.forEach((card) => {
    const w0 = card.node.offsetWidth;
    const h0 = card.node.offsetHeight;
    const pad = narrow ? 14 : 24;

    card.scale = narrow ? 1 : 1.12;
    card.w = w0 * card.scale;
    card.h = h0 * card.scale;

    let left = narrow
      ? (card.side > 0 ? vw - card.w - pad : pad)
      : (card.side > 0 ? vw / 2 + corridor + 8 : vw / 2 - corridor - 8 - card.w);
    left = clamp(left, pad, Math.max(pad, vw - card.w - pad));
    card.x = left - w0 * (1 - card.scale) / 2;
    card.y0 = -h0 * (1 - card.scale) / 2;

    /* fast enough that only two or so are on screen at once */
    card.speed = narrow ? 1.6 : 1.5;
    card.p = LEAD_FROM + (card.rank / Math.max(1, lead.length - 1)) * (LEAD_TO - LEAD_FROM);
    card.rot = card.side * -1.6;

    card.node.style.filter = 'none';
    card.node.style.opacity = '1';
  });
}

function stream(cards, flow, span, vh, run, s) {
  for (const card of cards) {
    /* the point of the scroll at which this card crosses mid screen. A
       featured one is tied to the pinned fall, so it always gets its moment
       while he is on screen, whatever the section height. */
    const mark = card.hi ? vh + card.p * run : card.cue * span;
    const y = vh * 0.5 - card.h / 2 - (flow - mark) * card.speed;
    /* only touch visibility when it changes: most cards are off screen */
    const shown = y >= -card.h - 120 && y <= vh + 160;
    if (card.shown !== shown) {
      card.shown = shown;
      card.node.style.visibility = shown ? 'visible' : 'hidden';
    }
    if (!shown) continue;
    const rot = card.rot + Math.sin(s * 0.32 + card.seed) * (card.hi ? 0.8 : 2.6);
    card.node.style.transform =
      `translate3d(${card.x}px, ${(y + card.y0).toFixed(1)}px, 0) `
      + `rotate(${rot.toFixed(2)}deg) scale(${card.scale.toFixed(3)})`;
  }
}

/* Reduced motion: no parallax, just the featured comments stacked under the
   header, as many as fit on screen. */
function settle(cards, vw, vh, from) {
  let y = Math.max(vh * 0.2, from + 24);
  let full = false;
  cards.forEach((card) => {
    const h = card.node.offsetHeight;
    const keep = card.hi && !full && y + h < vh - 24;
    if (card.hi && !keep) full = true;
    card.node.style.filter = 'none';
    card.node.style.opacity = keep ? '1' : '0';
    card.node.style.visibility = keep ? 'visible' : 'hidden';
    if (!keep) return;
    /* still mode has no parallax to justify a card hanging off the edge */
    const x = clamp(card.x, 24, Math.max(24, vw - card.node.offsetWidth - 24));
    card.node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    y += h + 18;   // stack by real height, never overlap
  });
}

/* ------------------------------------------------------------- stars --- */

function drawStars(canvas) {
  if (!canvas) return;
  const paint = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight * 1.25;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const tint = ['#ffffff', '#cfe6ff', '#ffe9b8', '#bff3ee'];
    for (let i = 0; i < 220; i++) {
      const r = Math.random() * 1.5 + 0.25;
      ctx.globalAlpha = 0.15 + Math.random() * 0.6;
      ctx.fillStyle = tint[(Math.random() * tint.length) | 0];
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  paint();
  let t;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(paint, 220); });
}

/* ------------------------------------------------------------- bits ---- */

const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.3-9A5.2 5.2 0 0 1 12 6.8 5.2 5.2 0 0 1 21.3 12c-1.8 4.4-9.3 9-9.3 9Z"/></svg>';
const TICK = '<svg viewBox="0 0 18 12" aria-hidden="true"><path d="M1 6.6 4.2 10 10.4 2M7.6 6.6 10.8 10 17 2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const TIMES = ['٩:٤١', '١١:٠٢', '٢:١٧', '٧:٥٥', '١٠:٣٠', '٤:٠٩'];
const THUMB = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 10h4v11H2zM21.5 10H14l1.1-4.4a1.9 1.9 0 0 0-3.6-1.2L8 10v11h10.6a2 2 0 0 0 2-1.6l1.4-7a2 2 0 0 0-1.5-2.4Z"/></svg>';
const PFPS = ['#F56549', '#F7D038', '#45C4B9', '#0084C1', '#c98bd8', '#8fd15a'];
const pfp = (i) => PFPS[i % PFPS.length];
const arabicNum = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t;

function load(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}
