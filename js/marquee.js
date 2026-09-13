/* ============================================================
   أَعْمَالُنَا: the cover marquee.

   The page reads right to left, so the strip is anchored on the
   right and travels rightwards: new work arrives from the left,
   the way the eye is already moving. The old strip travelled left
   from a right anchor, so it slid its own start off screen and
   left an empty gap behind it.

   The loop length is measured between the first card and its
   first repeat, so it includes the gap and the wrap never jumps.

   Hover eases the strip to a stop (it never halts dead). It can
   be grabbed and flicked with a mouse or a finger: it follows 1:1,
   keeps the release velocity, and decays back to its cruise with
   Apple's scroll deceleration. A fast strip leans its cards back
   against the motion. Lifting a card pools its colour into the
   sky and names it under the strip; on a mouse a bubble rides the
   pointer and says what a press does. Reduced motion gets a plain
   scrolling row and none of the extras.
   ============================================================ */

import { PROJECTS } from './data.js';
import { $, clamp, cloudDrift, el, reduced, tick, whileVisible } from './util.js';
import { coverCard, initCovers, spring, step } from './cover.js';

const SPEED = 42;       // px per second, rightwards
const DECEL = 0.998;    // per ms, the rate iOS scroll views decelerate at
const SLOP = 8;         // px of travel before a press becomes a drag
const MAX_FLICK = 4200; // px per second
const SIZES = '(max-width: 760px) 68vw, 32vw';

export function initMarquee() {
  const section = $('#work');
  const frame = $('#marquee');
  const track = $('#marqueeTrack');
  if (!frame || !track) return;

  const still = reduced.matches;
  const byId = new Map(PROJECTS.map((p) => [p.id, p]));
  const covers = initCovers(frame, { onHot: (card) => lift(card && byId.get(card.dataset.id)) });
  frame.classList.toggle('is-still', still);

  let unit = 0;
  let x = 0;

  const paint = () => {
    if (still || !unit) return;
    x = ((x % unit) + unit) % unit;
    track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
  };

  const set = (clone) => PROJECTS.map((p) => coverCard(p, clone, SIZES));

  /* One real set plus enough repeats to cover the frame and one loop
     length more, so every x in [0, unit) shows a full strip. */
  function fill() {
    track.replaceChildren(...set(false));
    if (still) return;
    track.append(...set(true));
    const kids = track.children;
    unit = Math.abs(kids[0].offsetLeft - kids[PROJECTS.length].offsetLeft);
    while (track.offsetWidth < frame.clientWidth + unit + 2) track.append(...set(true));
  }
  fill();

  let rt;
  let lastW = frame.clientWidth;
  new ResizeObserver(() => {
    if (frame.clientWidth === lastW) return;
    lastW = frame.clientWidth;
    clearTimeout(rt);
    rt = setTimeout(() => { fill(); paint(); }, 160);
  }).observe(frame);

  /* ---- the line under the strip, and the sky's colour ----
     Moving from one card to the next lets go of one before lifting the
     other, so the change waits a frame and only the last word shows. */
  const now = $('#workNow');
  const idle = now ? [...now.childNodes] : [];
  let shown;
  let pending;
  let queued = false;
  function lift(p) {
    pending = p || null;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      if (pending === shown) return;
      shown = pending;
      section?.style.setProperty('--glow', shown ? shown.accent : 'transparent');
      if (!now) return;
      now.replaceChildren(...(shown
        ? [el('b', {}, shown.name), el('span', {}, `${shown.role} · ${shown.year}`), el('em', {}, 'اضغط لتدخل عالمه ←')]
        : idle));
      now.classList.remove('is-swap');
      void now.offsetWidth;
      now.classList.add('is-swap');
    });
  }

  if (still) return;

  whileVisible(section, cloudDrift($('#workSky')));

  /* ---- cruise ---- */
  let vel = SPEED;
  let hover = false;
  let focused = false;
  let drag = null;
  let eatClick = false;
  let prev = 0;
  let lean = 0;
  let leanS = '';

  whileVisible(frame, (t) => {
    const dt = prev ? Math.min(t - prev, 50) : 0;
    prev = t;
    if (!drag?.live) {
      const target = hover || focused ? 0 : SPEED;
      vel = target + (vel - target) * Math.pow(DECEL, dt);
      x += (vel * dt) / 1000;
    }
    lean += (clamp(vel / 1600, -1, 1) - lean) * (1 - Math.pow(0.004, dt / 1000));
    const l = lean.toFixed(3);
    if (l !== leanS) track.style.setProperty('--lean', (leanS = l));
    paint();
  }, '20% 0px');

  frame.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') hover = true; });
  frame.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') hover = false; });

  /* A keyboard user tabs through the real set. Stop, and slide the focused
     card fully into view: the frame clips, so it cannot scroll to it. */
  frame.addEventListener('focusin', (e) => {
    focused = true;
    const card = e.target.closest('.cover');
    if (!card) return;
    const f = frame.getBoundingClientRect();
    const r = card.getBoundingClientRect();
    const pad = f.width * 0.08;
    if (r.left < f.left + pad) x += f.left + pad - r.left;
    else if (r.right > f.right - pad) x -= r.right - (f.right - pad);
    vel = 0;
    paint();
  });
  frame.addEventListener('focusout', () => { focused = false; });

  /* ---- grab and flick ----
     The pointer is only captured once the press has travelled far enough
     sideways, so a plain click still reaches the card's link. A mostly
     vertical start is left to the page (touch-action: pan-y). */
  frame.addEventListener('dragstart', (e) => e.preventDefault());

  frame.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    eatClick = false;
    drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, from: x, live: false, hist: [] };
  });

  frame.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.live) {
      if (Math.abs(dx) < SLOP) return;
      if (Math.abs(e.clientY - drag.y0) > Math.abs(dx)) { drag = null; return; }
      drag.live = true;
      drag.x0 = e.clientX;          // track from here, so nothing jumps by the slop
      drag.from = x;
      frame.setPointerCapture(e.pointerId);
      frame.classList.add('is-dragging');
      covers.cool();
    }
    x = drag.from + (e.clientX - drag.x0);
    drag.hist.push([e.timeStamp, e.clientX]);
    while (drag.hist.length > 2 && e.timeStamp - drag.hist[0][0] > 100) drag.hist.shift();
    if (drag.hist.length > 1) {
      const [t0, x0] = drag.hist[0];
      vel = ((e.clientX - x0) / Math.max(1, e.timeStamp - t0)) * 1000;   // for the lean
    }
  });

  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.live) {
      const h = drag.hist;
      const [t0, x0] = h[0] || [0, 0];
      const [t1, x1] = h[h.length - 1] || [0, 0];
      const v = t1 > t0 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0;
      vel = Math.max(-MAX_FLICK, Math.min(MAX_FLICK, v));
      eatClick = true;
      frame.classList.remove('is-dragging');
    }
    drag = null;
  };
  frame.addEventListener('pointerup', release);
  frame.addEventListener('pointercancel', release);

  /* a drag that ends over a card is not a click on it */
  frame.addEventListener('click', (e) => {
    if (!eatClick) return;
    e.preventDefault();
    e.stopPropagation();
    eatClick = false;
  }, true);

  bubble(frame, byId);
}

/* ---- the pointer bubble ----
   Mouse only. It springs after the pointer (so it lags a little, like a
   real object on a string), grows over a card, and dips on the press.
   It appears where the pointer already is instead of flying in. */
function bubble(frame, byId) {
  const node = $('#workCursor');
  if (!node || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  frame.classList.add('has-bubble');
  const label = node.firstElementChild;
  const bx = spring(0.2, 1);
  const by = spring(0.2, 1);
  const bs = spring(0.32, 0.7);
  let stop = null;
  let last = 0;
  let said = '';

  const loop = (t) => {
    const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 0;
    last = t;
    const a = step(bx, dt);
    const b = step(by, dt);
    const c = step(bs, dt);
    node.style.transform = `translate3d(${bx.x.toFixed(1)}px,${by.x.toFixed(1)}px,0) scale(${Math.max(0, bs.x).toFixed(3)})`;
    if (!a && !b && !c) { stop(); stop = null; last = 0; }
  };
  const wake = () => { if (!stop) stop = tick(loop); };
  const say = (s) => { if (s !== said) label.textContent = said = s; };

  frame.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (bs.to === 0 && bs.x < 0.05) { bx.x = e.clientX; by.x = e.clientY; }
    bx.to = e.clientX;
    by.to = e.clientY;
    const card = e.target.closest('.cover');
    const dragging = frame.classList.contains('is-dragging');
    bs.to = dragging ? 0.82 : card ? 1.16 : 1;
    say(card && !dragging ? 'افتح' : 'اسحب');
    node.style.setProperty('--ring', card && !dragging ? byId.get(card.dataset.id)?.accent || 'transparent' : 'transparent');
    wake();
  });
  frame.addEventListener('pointerleave', () => { bs.to = 0; wake(); });
  frame.addEventListener('pointerdown', () => { bs.v -= 4; wake(); });
  addEventListener('scroll', () => { if (bs.to) { bs.to = 0; wake(); } }, { passive: true });
}
