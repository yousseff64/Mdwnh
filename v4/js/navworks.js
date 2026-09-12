/* ============================================================
   أعمالنا in the bar: hovering it drops a small glass list of the
   six works, each a link to its own page.

   The list is a popover so it renders in the top layer. Inside the
   bar it would sit under the bar's own backdrop-filter, which cuts
   any blur inside it off from the page. The DOM stays right after
   the link, so Tab walks from أعمالنا into the list.

   One spring (--o, 0 to 1) drives it in and out. A new hover mid
   exit just turns it around. Wide screens only: the phone menu has
   no hover, and أعمالنا there still goes to the section.
   ============================================================ */

import { PROJECTS } from './data.js';
import { $, $$, clamp, el, spring, step, tick } from './util.js';

export function initNavWorks() {
  const nav = $('#nav');
  const link = $('#navLinks a[href$="#work"]');
  if (!nav || !link || !('showPopover' in HTMLElement.prototype)) return;

  const wide = matchMedia('(min-width: 901px)');
  const here = new URLSearchParams(location.search).get('id');

  const panel = el('div', { class: 'navworks', id: 'navWorks', popover: 'manual' },
    el('ul', { 'aria-label': 'أعمالنا' },
      PROJECTS.map((p, i) => el('li', { style: `--i:${i}` },
        el('a', {
          href: `project.html?id=${p.id}`,
          style: `--accent:${p.accent}`,
          'aria-current': location.pathname.endsWith('project.html') && p.id === here ? 'page' : null
        }, el('b', {}, p.name), el('small', {}, p.role))))));
  link.after(panel);
  link.setAttribute('aria-controls', panel.id);
  link.setAttribute('aria-expanded', 'false');
  const items = $$('a', panel);

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
      panel.showPopover();
      place();
    }
    o.to = on ? 1 : 0;
    if (!stop) stop = tick(loop);
  };
  /* a short grace on leave, so the trip from the link down into the
     list does not close it on the way */
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
     closes it and hands focus back to أعمالنا ---- */
  let quiet = false;
  link.addEventListener('focus', () => { if (!quiet && link.matches(':focus-visible')) set(true); });
  [link, panel].forEach((n) => n.addEventListener('focusout', (e) => {
    if (!inside(e.relatedTarget)) set(false);
  }));
  link.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowDown') return;
    e.preventDefault();
    set(true);
    items[0].focus();
  });
  panel.addEventListener('keydown', (e) => {
    const at = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const next = at + (e.key === 'ArrowDown' ? 1 : -1);
      if (next < 0) link.focus();
      else items[Math.min(next, items.length - 1)].focus();
    }
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
