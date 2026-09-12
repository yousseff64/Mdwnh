/* ============================================================
   The strip of stills on a project page.

   Quiet on purpose: one slow, continuous drift, no lift, no
   tilt, no colour pooled into the page. It is there to show the
   work, not to pull the eye off the writing beside it, so the
   only thing it answers to is the pointer resting on it, which
   eases it to a stop and lets it go again.

   Like أَعْمَالُنَا the page reads right to left, so the strip
   travels rightwards and new frames arrive from the left. The
   loop length is measured between the first frame and its first
   repeat, gap included, so the wrap never jumps.

   Reduced motion gets the same frames as a plain row you can
   scroll with a finger or a wheel, and nothing moves by itself.
   ============================================================ */

import { STILLS } from './data.js';
import { clamp, el, reduced, whileVisible } from './util.js';

const SPEED = 26;        // px per second, rightwards. Half the cover strip's.
const SIZES = '(max-width: 760px) 74vw, 30vw';

/* eased toward 0 while the pointer rests on the strip, 1 otherwise */
function glide(from, to, k) {
  return from + (to - from) * k;
}

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
  let rest = 1;          /* 1 cruising, 0 stopped under the pointer */
  let want = 1;

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

  let last = 0;
  const run = (t) => {
    const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 0;
    last = t;
    /* a stop that takes about a third of a second either way, never a cut */
    rest = glide(rest, want, clamp(dt * 9, 0, 1));
    x += SPEED * rest * dt;
    paint();
  };

  const hold = (on) => { want = on ? 0 : 1; };
  frame.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') hold(true); });
  frame.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') hold(false); });
  frame.addEventListener('focusin', () => hold(true));
  frame.addEventListener('focusout', () => hold(false));

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
