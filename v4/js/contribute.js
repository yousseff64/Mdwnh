/* ============================================================
   كَيْفَ أُسَاهِمُ؟: three cards that come alive under the pointer.

   Every moving value is a spring (Apple's response + damping
   pair), so a hover can be broken off and reversed at any
   instant without a jump. The springs only tick while something
   is still moving. Touch has no hover, so the card in view wakes
   up instead. Reduced motion keeps still cards and the poster.
   ============================================================ */

import { $, $$, afterLoad, clamp, reduced, tick, whileVisible, cloudDrift, spring, step } from './util.js';

export function initContribute() {
  const section = $('#contribute');
  if (!section) return;
  const ways = $('#ways');
  const cards = $$('.way', section);
  const video = $('#wayVideo');
  const still = reduced.matches;

  /* ---- springs, one loop shared by all three cards ---- */
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

  const states = new Map(cards.map((card) => {
    const [r, d] = (card.dataset.spring || '0.4 1').split(' ').map(Number);
    const st = {
      h: spring(0.38, 1),     /* the card: lift, glow, glare */
      c: spring(r, d),        /* the character: its own feel per card */
      mx: spring(0.3, 1),     /* pointer, -1 to 1 across the card */
      my: spring(0.3, 1),
      kick: +card.dataset.kick || 0
    };
    st.all = [st.h, st.c, st.mx, st.my];
    st.paint = () => {
      const s = card.style;
      s.setProperty('--h', st.h.x.toFixed(4));
      s.setProperty('--c', st.c.x.toFixed(4));
      s.setProperty('--mx', st.mx.x.toFixed(4));
      s.setProperty('--my', st.my.x.toFixed(4));
    };
    return [card, st];
  }));

  const hot = (card, on) => {
    if (card.classList.contains('is-hot') === on) return;
    card.classList.toggle('is-hot', on);
    if (video && card.contains(video) && !still) {
      if (on) video.play().catch(() => {});
      else video.pause();
    }
    if (still) return;
    const st = states.get(card);
    st.h.to = st.c.to = on ? 1 : 0;
    if (on) st.c.v += st.kick;          /* the jumper hops, he does not glide */
    else st.mx.to = st.my.to = 0;
    wake(st);
  };

  /* ---- pointer and keyboard ---- */
  cards.forEach((card) => {
    const face = $('.way__card', card);
    const st = states.get(card);
    card.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') hot(card, true); });
    card.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') hot(card, false); });
    card.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' || still) return;
      const r = face.getBoundingClientRect();
      st.mx.to = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      st.my.to = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      wake(st);
    });
    card.addEventListener('focusin', () => hot(card, true));
    card.addEventListener('focusout', () => hot(card, false));
  });

  /* ---- touch: the card in view is the hot one ----
     Phones get a swipe row, and the card snapped to the middle wakes.
     Wide touch screens show all three, so any card mostly on screen does. */
  const row = matchMedia('(max-width: 820px)');
  const noHover = matchMedia('(hover: none)');
  let io = null;
  const seen = (entries) => entries.forEach((e) => hot(e.target, e.isIntersecting));
  const watch = () => {
    io?.disconnect();
    io = row.matches ? new IntersectionObserver(seen, { root: ways, rootMargin: '0px -34% 0px -34%' })
      : noHover.matches ? new IntersectionObserver(seen, { threshold: 0.65 })
      : null;
    if (io) cards.forEach((c) => io.observe(c));
    else cards.forEach((c) => hot(c, false));
  };
  watch();
  row.addEventListener('change', watch);
  noHover.addEventListener('change', watch);

  if (still) return;

  whileVisible(section, cloudDrift(section));

  /* The cast loop is the same file مَنْ نَحْنُ already fetched. Ask for it
     a screen early so the first hover never waits on the network. */
  if (video) {
    afterLoad(() => new IntersectionObserver(([e], o) => {
      if (!e.isIntersecting) return;
      video.preload = 'auto';
      video.load();
      o.disconnect();
    }, { rootMargin: '0px 0px 100% 0px' }).observe(video));
  }
}
