/* ============================================================
   The strip of stills on a project page.

   Quiet on purpose: no tilt, no lean, no colour pooled into the
   page. It is there to show the work, not to pull the eye off
   the writing beside it, so a frame under the pointer only grows
   a little and the strip eases to a stop.

   It is grabbed and flicked exactly the way أَعْمَالُنَا is
   (js/marquee.js): it follows the finger one to one, keeps the
   release velocity, and decays back to its cruise at the rate
   iOS scroll views decelerate at.

   Like أَعْمَالُنَا the page reads right to left, so the strip
   travels rightwards and new frames arrive from the left. The
   loop length is measured between the first frame and its first
   repeat, gap included, so the wrap never jumps.

   Reduced motion gets the same frames as a plain row you can
   scroll with a finger or a wheel, and nothing moves by itself.
   ============================================================ */

import { STILLS } from './data.js';
import { el, reduced, whileVisible } from './util.js';

const SPEED = 26;        // px per second, rightwards. Half the cover strip's.
const DECEL = 0.998;     // per ms, the rate iOS scroll views decelerate at
const SLOP = 8;          // px of travel before a press becomes a drag
const MAX_FLICK = 4200;  // px per second
const SIZES = '(max-width: 760px) 74vw, 30vw';

export function stillsStrip(id, name) {
  const shots = STILLS[id];
  if (!shots || !shots.length) return null;

  const still = reduced.matches;
  const track = el('div', { class: 'strip__track' });
  const frame = el('div', { class: `strip__frame${still ? ' is-still' : ''}`, tabindex: '0',
    role: 'group', 'aria-label': `لقطات من ${name}` }, track);

  const shot = (s, clone) => el('figure', { class: 'strip__shot', 'aria-hidden': clone ? 'true' : null },
    el('img', {
      src: s.src,
      srcset: `${s.src.replace('.webp', '-sm.webp')} 480w, ${s.src} 960w`,
      sizes: SIZES,
      alt: clone ? '' : (s.alt || ''),
      width: 960,
      height: 540,
      loading: 'lazy',
      decoding: 'async',
      draggable: 'false'
    }));

  const set = (clone) => shots.map((s) => shot(s, clone));
  track.append(...set(false));

  const section = el('section', { class: 'strip', 'aria-label': `لقطات من ${name}` }, frame);
  if (still) return section;

  let unit = 0;
  let x = 0;

  /* One real set plus enough repeats to cover the frame and one loop length
     more, so every x in [0, unit) shows a full strip. Measured the same way
     أَعْمَالُنَا measures its own strip: the distance between a frame and its
     first repeat, taken as an absolute so the page's right to left direction
     does not turn it negative. */
  function fill() {
    track.replaceChildren(...set(false), ...set(true));
    const kids = track.children;
    unit = Math.abs(kids[0].offsetLeft - kids[shots.length].offsetLeft);
    let guard = 0;
    while (track.offsetWidth < frame.clientWidth + unit + 2 && guard++ < 8) track.append(...set(true));
  }

  const paint = () => {
    if (!unit) return;
    x = ((x % unit) + unit) % unit;
    track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
  };

  /* ---- cruise ---- */
  let vel = SPEED;
  let hover = false;
  let focused = false;
  let drag = null;
  let prev = 0;

  const run = (t) => {
    const dt = prev ? Math.min(t - prev, 50) : 0;
    prev = t;
    /* while the finger is down the strip is the finger's; otherwise the
       speed eases toward its target, so a stop and a flick are the same
       motion and neither is ever a cut */
    if (!drag?.live) {
      const target = hover || focused ? 0 : SPEED;
      vel = target + (vel - target) * Math.pow(DECEL, dt);
      x += (vel * dt) / 1000;
    }
    paint();
  };

  frame.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') hover = true; });
  frame.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') hover = false; });

  /* Only a keyboard's focus holds the strip. Clicking the frame focuses it
     too, and holding on that left the strip parked until you clicked
     something else. */
  frame.addEventListener('focusin', () => { focused = frame.matches(':focus-visible'); });
  frame.addEventListener('focusout', () => { focused = false; });

  /* ---- grab and flick ----
     The pointer is captured only once the press has travelled far enough
     sideways, so a tap still lands on whatever is under it. A mostly
     vertical start is left to the page (touch-action: pan-y). */
  frame.addEventListener('dragstart', (e) => e.preventDefault());

  frame.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
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
    }
    x = drag.from + (e.clientX - drag.x0);
    drag.hist.push([e.timeStamp, e.clientX]);
    while (drag.hist.length > 2 && e.timeStamp - drag.hist[0][0] > 100) drag.hist.shift();
    paint();
  });

  const release = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (drag.live) {
      /* the strip leaves the finger at the speed the finger left it at */
      const h = drag.hist;
      const [t0, x0] = h[0] || [0, 0];
      const [t1, x1] = h[h.length - 1] || [0, 0];
      const v = t1 > t0 ? ((x1 - x0) / (t1 - t0)) * 1000 : 0;
      vel = Math.max(-MAX_FLICK, Math.min(MAX_FLICK, v));
      frame.classList.remove('is-dragging');
    }
    drag = null;
  };
  frame.addEventListener('pointerup', release);
  frame.addEventListener('pointercancel', release);

  /* The strip is built before project.js puts it on the page, so the first
     measure comes from the observer, the moment it has a width. Each frame's
     width comes from CSS rather than from its image, so nothing here waits on
     a decode; only a change of frame width can move the loop. */
  let lastW = 0;
  new ResizeObserver(() => {
    if (!frame.clientWidth || frame.clientWidth === lastW) return;
    lastW = frame.clientWidth;
    fill();
    paint();
  }).observe(frame);

  whileVisible(frame, run);

  return section;
}
