/* ============================================================
   أعمالنا in the bar: hovering it drops the six works as a shelf
   of their own covers, each a link to its own page. The art is
   what tells them apart, so the row needs no bullets or tags.

   The covers are the marquee's own -sm files, so on the home page
   they are already in the cache. They are only given their src the
   first time the shelf opens: until then the panel is display:none
   and a closed menu should cost nothing.

   The list is a popover so it renders in the top layer. Inside the
   bar it would sit under the bar's own backdrop-filter, which cuts
   any blur inside it off from the page. The DOM stays right after
   the link, so Tab walks from أعمالنا into the shelf.

   One spring (--o, 0 to 1) drives it in and out. A new hover mid
   exit just turns it around; each cover takes its own slice of that
   spring (--p in the CSS) so they arrive in reading order. Wide
   screens only: the phone menu has no hover, and أعمالنا there
   still goes to the section.
   ============================================================ */

import { PROJECTS, PROJECT_PAGES } from './data.js';
import { $, $$, clamp, el, spring, step, tick } from './util.js';

const HOME = 'SIX WORKS';

export function initNavWorks() {
  const nav = $('#nav');
  const link = $('#navLinks a[href$="#work"]');
  if (!nav || !link || !('showPopover' in HTMLElement.prototype)) return;

  const wide = matchMedia('(min-width: 901px)');
  const here = new URLSearchParams(location.search).get('id');
  const onPage = location.pathname.endsWith('project.html');

  /* the marginalia at the head of the shelf: the studio's line until a
     cover is under the pointer, then that work's own latin title */
  const latin = el('i', {}, HOME);

  const card = (p, i) => {
    const mine = onPage && p.id === here;
    const sm = p.cover.replace('.webp', '-sm.webp');
    return el('li', { style: `--i:${i}; --accent:${p.accent}` },
      el('a', {
        href: `project.html?id=${p.id}`,
        'data-latin': (PROJECT_PAGES[p.id] || {}).latin || p.name,
        'aria-current': mine ? 'page' : null
      },
        el('span', { class: 'navworks__art' },
          el('img', {
            'data-src': sm, alt: '', width: 900, height: 1333,
            draggable: 'false', decoding: 'async'
          })),
        el('b', {}, p.name),
        el('small', {}, mine ? 'أنت هنا' : p.role)));
  };

  const panel = el('div', { class: 'navworks', id: 'navWorks', popover: 'manual' },
    el('span', { class: 'navworks__deco', 'aria-hidden': 'true' },
      el('span', { class: 'cloud navworks__cloud' })),
    el('p', { class: 'navworks__head' }, el('b', {}, 'كُلُّ الأَعْمَال'), latin),
    el('ul', { 'aria-label': 'أعمالنا' }, PROJECTS.map(card)));
  link.after(panel);
  link.setAttribute('aria-controls', panel.id);
  link.setAttribute('aria-expanded', 'false');
  const items = $$('a', panel);

  /* the covers wait for the first open, so a menu nobody touches
     never costs a request */
  let loaded = false;
  const art = () => {
    if (loaded) return;
    loaded = true;
    for (const img of $$('img[data-src]', panel)) {
      img.src = img.dataset.src;
      delete img.dataset.src;
    }
  };

  /* the latin line follows the pointer across the shelf */
  const say = (text) => {
    if (latin.textContent === text) return;
    latin.textContent = text;
    latin.style.animation = 'none';
    void latin.offsetWidth;
    latin.style.animation = '';
  };
  panel.addEventListener('pointerover', (e) => {
    const a = e.target.closest('a');
    if (a) say(a.dataset.latin);
  });
  panel.addEventListener('pointerout', (e) => {
    if (!panel.contains(e.relatedTarget)) say(HOME);
  });
  panel.addEventListener('focusin', (e) => {
    const a = e.target.closest('a');
    if (a) say(a.dataset.latin);
  });
  panel.addEventListener('focusout', (e) => {
    if (!panel.contains(e.relatedTarget)) say(HOME);
  });

  /* under the link, centred on it, and kept on screen. The panel grows
     out of the link, so its origin sits under the link's middle. */
  const place = () => {
    const r = link.getBoundingClientRect();
    const bar = nav.getBoundingClientRect();
    const w = panel.offsetWidth;
    const mid = r.left + r.width / 2;
    const x = clamp(mid, w / 2 + 12, innerWidth - w / 2 - 12);
    const y = bar.bottom + 8;
    const s = panel.style;
    s.setProperty('--x', `${x}px`);
    s.setProperty('--y', `${y}px`);
    s.setProperty('--ox', `${mid - (x - w / 2)}px`);
    s.setProperty('--gap', `${y - r.bottom}px`);
  };

  /* ---- the spring ---- */
  const o = spring(0.3, 1);
  let stop = null;
  let last = 0;
  let want = false;

  const loop = (t) => {
    const dt = last ? Math.min((t - last) / 1000, 1 / 30) : 0;
    last = t;
    const live = step(o, dt);
    panel.style.setProperty('--o', o.x.toFixed(4));
    if (live) return;
    stop(); stop = null; last = 0;
    if (!want && panel.matches(':popover-open')) panel.hidePopover();
  };

  let timer = 0;
  const set = (on) => {
    clearTimeout(timer);
    if (on && (!wide.matches || nav.classList.contains('is-hidden'))) return;
    if (on === want) return;
    want = on;
    link.setAttribute('aria-expanded', String(on));
    if (on && !panel.matches(':popover-open')) {
      art();
      panel.showPopover();
      place();
    }
    if (!on) say(HOME);
    o.to = on ? 1 : 0;
    if (!stop) stop = tick(loop);
  };
  /* a short grace on leave, so the trip from the link down into the
     shelf does not close it on the way */
  const later = () => { clearTimeout(timer); timer = setTimeout(() => set(false), 160); };
  const inside = (n) => !!n && (link.contains(n) || panel.contains(n));

  /* ---- pointer ---- */
  [link, panel].forEach((n) => {
    n.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') set(true); });
    n.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') later(); });
  });
  link.addEventListener('click', () => set(false));
  document.addEventListener('pointerdown', (e) => { if (want && !inside(e.target)) set(false); });

  /* ---- keyboard: focus opens it, Tab or the arrows walk it, Escape
     closes it and hands focus back to أعمالنا. The shelf reads right
     to left, so the left arrow goes forward along it ---- */
  let quiet = false;
  link.addEventListener('focus', () => { if (!quiet && link.matches(':focus-visible')) set(true); });
  [link, panel].forEach((n) => n.addEventListener('focusout', (e) => {
    if (!inside(e.relatedTarget)) set(false);
  }));
  link.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown') return;
    e.preventDefault();
    set(true);
    art();
    items[0].focus();
  });
  const STEP = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 };
  panel.addEventListener('keydown', (e) => {
    const by = STEP[e.key];
    if (!by) return;
    e.preventDefault();
    const next = items.indexOf(document.activeElement) + by;
    if (next < 0) link.focus();
    else items[Math.min(next, items.length - 1)].focus();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !want) return;
    const back = panel.contains(document.activeElement);
    set(false);
    if (back) { quiet = true; link.focus(); quiet = false; }
  });

  /* the bar tucking away, the phone menu, or a narrow window all close it */
  new MutationObserver(() => {
    if (nav.classList.contains('is-hidden') || nav.classList.contains('is-open')) set(false);
  }).observe(nav, { attributes: true, attributeFilter: ['class'] });
  wide.addEventListener('change', () => set(false));
  addEventListener('resize', () => { if (want) place(); });
}
