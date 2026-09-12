/* ============================================================
   Project cover cards: the أعمالنا marquee and the أعمال أخرى
   row on a project page share them.

   The hover is the كَيْفَ أُسَاهِمُ؟ one: the card lifts, tips
   toward the pointer, and light slides across the art. Every
   moving value is a spring (Apple's response + damping pair), so
   a hover can be broken off and reversed at any instant without a
   jump. Listeners are delegated to the host, because the marquee
   rebuilds its clones on resize.
   ============================================================ */

import { clamp, el, reduced, tick } from './util.js';

/* response in seconds, damping ratio. 1 settles with no overshoot. */
export function spring(response, damping) {
  return {
    x: 0, v: 0, to: 0,
    k: (2 * Math.PI / response) ** 2,
    c: (4 * Math.PI * damping) / response
  };
}

export function step(s, dt) {
  s.v += (-s.k * (s.x - s.to) - s.c * s.v) * dt;
  s.x += s.v * dt;
  if (Math.abs(s.v) > 1e-4 || Math.abs(s.x - s.to) > 1e-4) return true;
  s.x = s.to;
  s.v = 0;
  return false;
}

/* The glare's mask is the card's own art. A mask loads like a background
   image, the moment its card exists, so a row far down the page would fetch
   every cover at once. Until a row comes near (initCovers), its cards only
   keep the address. */
let near = false;
const mask = (glare) => {
  const url = `url(${glare.dataset.mask})`;
  glare.style.webkitMaskImage = url;
  glare.style.maskImage = url;
  delete glare.dataset.mask;
};

/* One card. `clone` marks the marquee's repeats: they are there to look
   at, so screen readers and the keyboard only ever meet the first set. */
export function coverCard(p, clone = false, sizes = '(max-width: 760px) 62vw, 30vw') {
  const label = `${p.name}، ${p.role}، ${p.year}`;
  const sm = p.cover.replace('.webp', '-sm.webp');
  /* the light only lands on painted pixels: the art is its own mask */
  const glare = el('span', { class: 'cover__glare', 'data-mask': sm });
  if (near) mask(glare);
  return el('a', {
    class: 'cover',
    href: `project.html?id=${p.id}`,
    draggable: 'false',
    'data-id': p.id,
    'aria-label': clone ? null : label,
    'aria-hidden': clone ? 'true' : null,
    tabindex: clone ? '-1' : null,
    style: `--accent: ${p.accent}`
  },
    el('span', { class: 'cover__card' },
      el('img', { src: p.cover, srcset: `${sm} 480w, ${p.cover} 900w`, sizes, alt: '', width: 900, height: 1333, draggable: 'false', loading: 'lazy', decoding: 'async' }),
      glare
    )
  );
}

/* `onHot(card)` hears which card is lifted, or null when none is. */
export function initCovers(host, { onHot } = {}) {
  const still = reduced.matches;
  const states = new WeakMap();
  const moving = new Set();
  let stop = null;
  let last = 0;

  const loop = (t) => {
    const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 0;
    last = t;
    for (const st of moving) {
      let live = false;
      for (const s of st.all) live = step(s, dt) || live;
      st.paint();
      if (!live) moving.delete(st);
    }
    if (!moving.size) { stop(); stop = null; last = 0; }
  };
  const wake = (st) => {
    moving.add(st);
    if (!stop) stop = tick(loop);
  };

  const state = (card) => {
    let st = states.get(card);
    if (st) return st;
    st = { h: spring(0.38, 1), mx: spring(0.3, 1), my: spring(0.3, 1) };
    st.all = [st.h, st.mx, st.my];
    st.paint = () => {
      const s = card.style;
      s.setProperty('--h', st.h.x.toFixed(4));
      s.setProperty('--mx', st.mx.x.toFixed(4));
      s.setProperty('--my', st.my.x.toFixed(4));
    };
    states.set(card, st);
    return st;
  };

  const hot = (card, on) => {
    if (card.classList.contains('is-hot') === on) return;
    /* the glare is about to show: make sure it is wearing its mask, even
       if this card was reached before its row was near */
    if (on) card.querySelectorAll('.cover__glare[data-mask]').forEach(mask);
    card.classList.toggle('is-hot', on);
    const lit = host.querySelector('.cover.is-hot');
    host.classList.toggle('has-hot', !!lit);
    onHot?.(lit);
    if (still) return;
    const st = state(card);
    st.h.to = on ? 1 : 0;
    if (!on) st.mx.to = st.my.to = 0;
    wake(st);
  };

  /* a screen before the row arrives, its glares get their masks */
  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    near = true;
    host.querySelectorAll('.cover__glare[data-mask]').forEach(mask);
  }, { rootMargin: '100% 0px' }).observe(host);

  const cardOf = (node) => node?.closest?.('.cover');
  const mouse = (e) => e.pointerType !== 'touch' && !host.classList.contains('is-dragging');

  host.addEventListener('pointerover', (e) => {
    const card = cardOf(e.target);
    if (card && mouse(e) && !card.contains(e.relatedTarget)) hot(card, true);
  });
  host.addEventListener('pointerout', (e) => {
    const card = cardOf(e.target);
    if (card && !card.contains(e.relatedTarget)) hot(card, false);
  });
  host.addEventListener('pointermove', (e) => {
    const card = cardOf(e.target);
    if (!card || still || !mouse(e)) return;
    if (!card.classList.contains('is-hot')) hot(card, true);
    const r = card.getBoundingClientRect();
    const st = state(card);
    st.mx.to = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
    st.my.to = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
    wake(st);
  });
  host.addEventListener('focusin', (e) => { const c = cardOf(e.target); if (c) hot(c, true); });
  host.addEventListener('focusout', (e) => { const c = cardOf(e.target); if (c) hot(c, false); });

  /* a drag takes over the strip: let every card settle */
  return { cool: () => host.querySelectorAll('.cover.is-hot').forEach((c) => hot(c, false)) };
}
