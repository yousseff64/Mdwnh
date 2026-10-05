/* ============================================================
   The painted world behind a project page's hero.

   Two jobs. The first is the picture: one <picture> with a wide
   frame and a phone's 9:16 column, so each screen downloads one
   file its own size (tools/build-assets.py backgrounds cuts them).
   It sits under the scenery canvas, fades in once it has decoded,
   and until then the page wears its flat colour as it always did.

   The second is the light. Every painting has one (a lamp, a
   moon, a sun behind haze), and data.js says where. The picture
   is cropped differently on every screen, so that point is mapped
   from the master onto the page each time the layout changes, and
   the title is filled from it: each word's gradient is centred on
   the painted light itself, not on the word, and the title's
   shadow falls away from it. That is what makes the words stand
   in the room instead of on top of it.
   ============================================================ */

import { el, reduced } from './util.js';

const PHONE = '(max-aspect-ratio: 4/5)';
const TALL = 9 / 16;
/* the picture is drawn a little large, so the pointer drift never shows an
   edge (.pbg__pic in project.css holds the same number) */
const OVER = 1.04;

export function backdrop(id, bg) {
  const base = `assets/img/bg/${id}`;
  const img = el('img', {
    class: 'pbg__img',
    alt: '',
    srcset: `${base}-1280.webp 1280w, ${base}-1920.webp 1920w`,
    /* the picture covers a box a little taller than the screen, so on a
       wide screen it is as wide as that height makes it. project.html
       preloads with these same strings */
    sizes: 'max(100vw, 200vh)',
    src: `${base}-1280.webp`,
    fetchpriority: 'high',
    decoding: 'async',
    draggable: 'false'
  });
  const glow = bg.light.glow ? el('i', { class: 'pbg__glow', style: `--glow:${bg.light.glow}` }) : null;
  const pic = el('picture', { class: 'pbg__pic' },
    el('source', {
      media: PHONE,
      srcset: `${base}-tall-720.webp 720w, ${base}-tall-1080.webp 1080w`,
      sizes: 'max(100vw, 67vh)'
    }),
    img
  );
  const node = el('div', {
    class: `pbg${bg.light.flicker ? ' pbg--flicker' : ''}`,
    'aria-hidden': 'true',
    style: `--at:${bg.at[0]}% ${bg.at[1]}%;--at-tall:${bg.atTall[0]}% ${bg.atTall[1]}%;`
         + `--pool:${bg.pool};--pool-k:${bg.poolK * 100}%;`
         + (bg.zenith ? `--zenith:${bg.zenith}` : '')
  }, pic, glow, el('i', { class: 'pbg__pool' }));

  /* Shown only once it can be painted whole: a painting that arrives in
     bands is worse than the flat colour it replaces. decode() is asked for
     but never waited on for long, because a tab opened in the background
     does not decode at all until it is looked at. */
  const show = () => node.classList.add('is-in');
  const ready = () => Promise.race([
    img.decode ? img.decode().catch(() => {}) : null,
    new Promise((r) => setTimeout(r, 400))
  ]).then(show);
  if (img.complete && img.naturalWidth) ready();
  else img.addEventListener('load', ready, { once: true });

  const phone = matchMedia(PHONE);

  /* a point on the master, as pixels inside the backdrop's own box */
  function place(u, v) {
    const W = node.clientWidth;
    const H = node.clientHeight;
    const tall = phone.matches;
    const ar = tall ? TALL : bg.ar;
    if (tall) {
      const span = TALL / bg.ar;
      u = (u - (bg.tall - span / 2)) / span;
    }
    const [ox, oy] = tall ? bg.atTall : bg.at;
    const s = Math.max(W / ar, H);
    const w = ar * s;
    const x = (W - w) * (ox / 100) + u * w;
    const y = (H - s) * (oy / 100) + v * s;
    return [W / 2 + (x - W / 2) * OVER, H / 2 + (y - H / 2) * OVER, H];
  }

  /* CSS conic angles: 0 is straight up, clockwise */
  const bearing = (ax, ay, bx, by) => (Math.atan2(bx - ax, ay - by) * 180 / Math.PI + 360) % 360;

  /* Light the title. Runs on load and whenever the layout changes, never
     per frame: nothing here follows the scroll. */
  function light(hero, title, words) {
    const L = bg.light;
    const [c0, c1, c2] = bg.lit;
    title.classList.add('ph__title--lit');
    if (L.flicker) title.classList.add('ph__title--flicker');
    title.style.setProperty('--cast', bg.cast);

    /* Where a box sits on the page, from layout alone. A rect would also
       carry the word's entrance animation and the copy's scroll lift, and
       the light would be aimed at wherever the word happened to be. The
       backdrop itself sits at the page's top left corner. */
    const spot = (n) => {
      let x = 0;
      let y = 0;
      for (let e = n; e; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; }
      return [x, y];
    };

    function measure() {
      const [lx, ly, H] = place(L.at[0], L.at[1]);
      if (glow) glow.style.translate = `${lx.toFixed(1)}px ${ly.toFixed(1)}px`;

      /* the shadow falls away from the light */
      const [tx, ty] = spot(title);
      const dx = tx + title.offsetWidth / 2 - lx;
      const dy = ty + title.offsetHeight / 2 - ly;
      const d = Math.hypot(dx, dy) || 1;
      title.style.setProperty('--fx', (dx / d).toFixed(3));
      title.style.setProperty('--fy', (dy / d).toFixed(3));

      let cone = null;
      if (L.kind === 'cone') {
        const [ax, ay] = [lx, ly];
        const [bx, by] = place(L.left[0], L.left[1]);
        const [cx, cy] = place(L.right[0], L.right[1]);
        const from = bearing(ax, ay, cx, cy);
        cone = { from, wide: (bearing(ax, ay, bx, by) - from + 360) % 360 };
      }

      for (const w of words) {
        const [wx, wy] = spot(w);
        const x = `${(lx - wx).toFixed(1)}px`;
        const y = `${(ly - wy).toFixed(1)}px`;
        /* the last layer is the light; over it, a little shade gathers at
           the foot of each letter so the title has a ground to stand on */
        const foot = 'linear-gradient(to bottom, #0000 58%, #0000002e)';
        if (cone) {
          /* soft is the lamp's penumbra, in degrees either side of an edge */
          const soft = 1.1;
          const a = cone.wide;
          w.style.backgroundImage = `${foot}, conic-gradient(from ${(cone.from - soft).toFixed(2)}deg at ${x} ${y}, `
            + `${c1} 0deg, ${c0} ${soft * 2}deg, ${c0} ${a.toFixed(2)}deg, ${c1} ${(a + soft * 2).toFixed(2)}deg, `
            + `${c2} ${(a + 26).toFixed(2)}deg, ${c2} ${(334 - soft * 2).toFixed(2)}deg, ${c1} 360deg)`;
        } else {
          const R = L.r * H;
          w.style.backgroundImage = `${foot}, radial-gradient(circle at ${x} ${y}, `
            + `${c0} 0, ${c1} ${(R * 0.5).toFixed(0)}px, ${c2} ${R.toFixed(0)}px)`;
        }
      }
    }

    measure();
    /* the box changes with the window, the title with its webfont */
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    ro.observe(title);
    phone.addEventListener('change', measure);
    document.fonts?.ready.then(measure);
    img.addEventListener('load', measure);
  }

  /* The painting lags the scroll a little, so it sits behind the page and
     not on it. Returns the per frame hook, or null when motion is off. */
  let last = '';
  const drift = reduced.matches ? null : () => {
    const s = (Math.min(scrollY, node.clientHeight) * 0.24).toFixed(1);
    if (s === last) return;
    last = s;
    pic.style.setProperty('--sy', s);
  };

  return { node, pic, light, drift };
}
