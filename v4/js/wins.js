/* ============================================================
   إِنْجَازَاتُنَا: the numbers, and the award table beside them.

   Reaching the table deals its pieces in one at a time: the red
   grin, the photo from the night, the award's plaque, the still
   from the film that won, and last the medal, which stamps down
   in a burst of sparks. Every piece rides springs, so the pointer
   can take hold of one mid entrance and let go without a jump.
   The numbers count up as their cards rise. Reduced motion lays
   the table out still and skips the counting.
   ============================================================ */

import { $, $$, el, clamp, reduced, tick, whileVisible, cloudDrift, spring, step, arabize } from './util.js';

const DEAL = 150;            /* ms between one piece landing and the next */
const BURST = ['var(--sun)', 'var(--ember)', 'var(--sun)', 'var(--sky)'];
const AR = '٠١٢٣٤٥٦٧٨٩';

/* One loop for every spring in the section. It only ticks while
   something is still moving. */
function rig() {
  const springs = [];
  const painters = [];
  let stop = null;
  let last = 0;
  const loop = (t) => {
    const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 0;
    last = t;
    let live = false;
    for (const s of springs) live = step(s, dt) || live;
    for (const p of painters) p();
    if (!live) { stop(); stop = null; last = 0; }
  };
  return {
    add(response, damping, x = 0) {
      const s = spring(response, damping);
      s.x = s.to = x;
      springs.push(s);
      return s;
    },
    paint(fn) { painters.push(fn); },
    wake() { if (!stop) stop = tick(loop); }
  };
}

/* ------------------------------------------------------------ numbers --- */

/* ٣٧٫٤ ألف counts up from ٠ keeping its own decimals, grouping and tail */
function countUp(node, delay) {
  const text = node.textContent;
  const m = text.match(/^([٠-٩][٠-٩٬٫]*)(.*)$/s);
  if (!m) return;
  const [, figure, tail] = m;
  const places = (figure.split('٫')[1] || '').length;
  const grouped = figure.includes('٬');
  const target = parseFloat(figure.replace(/٬/g, '').replace('٫', '.').replace(/[٠-٩]/g, (d) => AR.indexOf(d)));
  const fmt = (v) => {
    let [whole, frac] = v.toFixed(places).split('.');
    if (grouped) whole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
    return arabize(frac ? `${whole}٫${frac}` : whole) + tail;
  };
  node.textContent = fmt(0);
  const t0 = performance.now() + delay;
  const stop = tick((t) => {
    const k = clamp((t - t0) / 1200, 0, 1);
    node.textContent = k < 1 ? fmt(target * (1 - (1 - k) ** 4)) : text;
    if (k === 1) stop();
  });
}

function initStats(r, section) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const n = $('.stat__n', e.target);
      /* the figure is mid count for a moment: give readers the real one */
      e.target.setAttribute('aria-label', `${n.textContent} ${$('.stat__l', e.target).textContent}`);
      countUp(n, parseFloat(e.target.style.getPropertyValue('--rise-delay')) || 0);
    });
  }, { rootMargin: '0px 0px -12% 0px' });

  $$('.stat', section).forEach((card) => {
    io.observe(card);
    const h = r.add(0.32, 0.8);
    r.paint(() => card.style.setProperty('--h', h.x.toFixed(4)));
    const set = (on) => { h.to = on ? 1 : 0; r.wake(); };
    card.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') set(true); });
    card.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') set(false); });
    card.addEventListener('focus', () => set(true));
    card.addEventListener('blur', () => set(false));
    card.addEventListener('pointerdown', () => { h.v -= 5; r.wake(); });
  });
}

/* -------------------------------------------------------------- table --- */

function initTable(r, stage) {
  const pieces = $$('.prize__piece', stage).map((node) => {
    const [response, damping] = (node.dataset.deal || '0.7 0.62').split(' ').map(Number);
    return {
      node,
      depth: +node.dataset.depth || 0,
      e: r.add(response, damping),   /* dealt in: 0 off the table, 1 down on it */
      h: r.add(0.34, 0.8)            /* lifted toward the pointer */
    };
  });
  const find = (name) => pieces.find((p) => p.node.classList.contains(`prize__${name}`));
  const photo = find('photo');
  const still = find('still');
  const medal = find('medal');
  const grin = find('grin');
  const sparks = $('.prize__sparks', stage);
  const seal = $('.prize__seal', stage);

  /* the pointer across the table (parallax) and across the photo (tilt) */
  const mx = r.add(0.7, 1);
  const my = r.add(0.7, 1);
  const tx = r.add(0.3, 1);
  const ty = r.add(0.3, 1);
  const spin = r.add(0.9, 0.3);      /* the medal wobbles, degrees */
  const chomp = r.add(0.45, 0.3);    /* the grin snaps shut and open */

  /* sparks fly out of the medal, then fall away */
  let lastBurst = 0;
  const burst = (n, reach) => {
    const now = performance.now();
    if (now - lastBurst < 450) return;
    lastBurst = now;
    const box = stage.getBoundingClientRect();
    const m = seal.getBoundingClientRect();
    const x = m.left + m.width / 2 - box.left;
    const y = m.top + m.height / 2 - box.top;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
      const d = m.width * (0.55 + Math.random() * 0.4) * reach;
      const dx = Math.cos(a) * d;
      const dy = Math.sin(a) * d;
      const spark = el('i', {
        class: 'prize__burst',
        style: `left:${x}px;top:${y}px;--s:${(0.5 + Math.random() * 0.7).toFixed(2)};--c:${BURST[i % BURST.length]}`
      });
      sparks.append(spark);
      spark.animate([
        { transform: 'translate(-50%, -50%) scale(0.2) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1) rotate(90deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx * 1.18}px), calc(-50% + ${dy * 1.18 + 14}px)) scale(0.2) rotate(160deg)`, opacity: 0 }
      ], { duration: 760 + Math.random() * 360, easing: 'cubic-bezier(.16,.8,.3,1)' }).onfinish = () => spark.remove();
    }
  };

  let landed = false;
  r.paint(() => {
    for (const p of pieces) {
      const s = p.node.style;
      s.setProperty('--e', p.e.x.toFixed(4));
      s.setProperty('--h', p.h.x.toFixed(4));
      s.setProperty('--px', (-mx.x * p.depth).toFixed(2));
      s.setProperty('--py', (-my.x * p.depth * 0.6).toFixed(2));
    }
    photo.node.style.setProperty('--tx', tx.x.toFixed(4));
    photo.node.style.setProperty('--ty', ty.x.toFixed(4));
    medal.node.style.setProperty('--spin', spin.x.toFixed(3));
    grin.node.style.setProperty('--chomp', chomp.x.toFixed(4));

    /* the medal's first touch down: sparks, and the table jumps under it */
    if (!landed && medal.e.x >= 1) {
      landed = true;
      burst(12, 1.25);
      photo.h.v -= 3.5;
      still.h.v -= 2.5;
      chomp.v += 5;
    }
  });

  const lift = (p, on) => {
    p.h.to = on ? 1 : 0;
    if (on && p === medal) { spin.v += 420; burst(7, 0.9); }
    if (on && p === grin) chomp.v += 6;
    if (!on && p === photo) tx.to = ty.to = 0;
    r.wake();
  };
  for (const p of pieces) {
    p.node.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') lift(p, true); });
    p.node.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') lift(p, false); });
    /* the press answers at once, touch included */
    p.node.addEventListener('pointerdown', () => {
      p.h.v -= 6;
      if (p === medal) { spin.v -= 720; burst(9, 1); }
      if (p === grin) chomp.v += 9;
      r.wake();
    });
  }

  stage.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const b = stage.getBoundingClientRect();
    mx.to = clamp(((e.clientX - b.left) / b.width) * 2 - 1, -1, 1);
    my.to = clamp(((e.clientY - b.top) / b.height) * 2 - 1, -1, 1);
    if (photo.h.to) {
      const q = photo.node.getBoundingClientRect();
      tx.to = clamp(((e.clientX - q.left) / q.width) * 2 - 1, -1, 1);
      ty.to = clamp(((e.clientY - q.top) / q.height) * 2 - 1, -1, 1);
    }
    r.wake();
  });
  stage.addEventListener('pointerleave', () => { mx.to = my.to = 0; r.wake(); });

  /* Armed, the pieces wait off the table (CSS holds --e at 0) until it is
     well on screen, then land one after another, the medal a beat late. */
  stage.classList.add('is-armed');
  new IntersectionObserver(([en], io) => {
    if (!en.isIntersecting) return;
    io.disconnect();
    stage.classList.add('is-in');
    pieces.forEach((p, i) => setTimeout(() => {
      p.e.to = 1;
      r.wake();
    }, 160 + i * DEAL + (p === medal ? 260 : 0)));
  }, { threshold: 0.35 }).observe(stage);
}

export function initWins() {
  const section = $('#wins');
  const stage = $('#prize');
  if (!section || !stage || reduced.matches) return;
  const r = rig();
  initStats(r, section);
  initTable(r, stage);
  whileVisible(stage, cloudDrift(stage));
}
