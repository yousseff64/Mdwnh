/* ============================================================
   Everything that is not a headline act: the navbar, the vertical
   edge rails, the scroll-in reveals, and the three data driven
   card grids.
   ============================================================ */

import { STATS, SOCIALS } from './data.js';
import { $, $$, el } from './util.js';
import { initNavWorks } from './navworks.js';

/* --------------------------------------------------------------- nav --- */

export function initNav() {
  const nav = $('#nav');
  const burger = $('#burger');
  const links = $$('#navLinks a');

  /* The bar steps out of the way while you read down the page and comes
     back the moment you scroll up, so no section loses its top to it. A few
     pixels of slack keep trackpad jitter from flickering it. It stays while
     the phone menu is open or a keyboard user is inside it. */
  let lastY = scrollY;
  const onScroll = () => {
    const y = scrollY;
    nav.classList.toggle('is-stuck', y > 24);
    if (Math.abs(y - lastY) < 6) return;
    const down = y > lastY;
    lastY = y;
    const keep = !down || y < 160 || nav.classList.contains('is-open') || nav.querySelector(':focus-visible');
    nav.classList.toggle('is-hidden', !keep);
  };
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });
  /* a script moved the page to keep the view still (the voices fold): that
     is not the reader scrolling up, so just resync instead of reacting */
  addEventListener('scrolljump', () => { lastY = scrollY; });
  nav.addEventListener('focusin', () => nav.classList.remove('is-hidden'));

  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    nav.classList.remove('is-hidden');
    burger.setAttribute('aria-expanded', String(open));
  });
  links.forEach((a) => a.addEventListener('click', () => {
    nav.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
  }));

  /* The bar keeps one look: the white logo and white ink from the first
     screen. Only its glass follows the block passing under it: that
     section's data-glass, night over the dark blocks, a heavier ink over the
     paper ones so the white stays legible. */
  const dark = new Set();
  const darkIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? dark.add(e.target) : dark.delete(e.target)));
    const under = [...dark].pop();
    nav.style.setProperty('--nav-glass', under ? under.dataset.glass || '#0b0b12' : 'var(--ink)');
    nav.style.setProperty('--nav-mix', under ? '62%' : '82%');
  }, { rootMargin: '0px 0px -94% 0px' });
  $$('[data-dark]').forEach((n) => darkIO.observe(n));

  /* current section in the navbar */
  const targets = links
    .map((a) => ({ a, sec: document.querySelector(a.getAttribute('href')) }))
    .filter((t) => t.sec);

  const spy = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      targets.forEach((t) => t.a.setAttribute('aria-current', String(t.sec === e.target)));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  targets.forEach((t) => spy.observe(t.sec));

  /* after `links` is read: the list's project links are not sections */
  initNavWorks();
}

/* ------------------------------------------------------------- rails --- */

export function initRails() {
  const start = $('#railStart');
  const end = $('#railEnd');
  const sections = $$('[data-rail]');
  if (!sections.length) return;

  let active = null;

  const swap = (rail, text, ink) => {
    if (rail.dataset.text === text) return;
    rail.dataset.text = text;
    rail.dataset.swap = '';
    setTimeout(() => {
      rail.querySelector('b').textContent = text;
      rail.style.setProperty('--rail-ink', ink);
      delete rail.dataset.swap;
    }, 240);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting || e.target === active) return;
      active = e.target;
      const ink = e.target.matches('.news, .about, .community') ? '#ffffff8a'
        : e.target.matches('.voices, .contribute, .pfoot') ? '#ffffff5c'
        : e.target.matches('.wins') ? '#32323275'
        : 'var(--ink-45)';
      swap(start, e.target.dataset.rail, ink);
      swap(end, e.target.dataset.railEnd || '', ink);
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => io.observe(s));
}

/* ------------------------------------------------------------ reveal --- */

export function initReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('[data-rise]').forEach((n) => io.observe(n));
}

/* ------------------------------------------------------------- cards --- */

const MARKS = ['asterisk', 'hash', 'question', 'smile', 'sparkles', 'spiral', 'swash'];

/* The platforms' own marks (Simple Icons, CC0; Instagram redrawn as strokes),
   so each sticker reads at a glance. Keyed by SOCIALS id. */
const LOGOS = {
  yt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="5.5"/><circle cx="12" cy="12" r="4.3"/><circle cx="17.4" cy="6.6" r="1.25" fill="currentColor" stroke="none"/></svg>',
  tt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
  dc: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>'
};

export function initCards() {
  const grid = $('#statGrid');
  STATS.forEach((s, i) => {
    grid.append(el('a', {
      class: 'stat',
      href: s.href,
      target: '_blank',
      rel: 'noopener',
      'data-rise': '',
      'data-estimate': s.verified ? null : '',
      style: `--stat-accent: var(--${s.accent}); --rise-delay: ${i * 60}ms`,
      title: s.verified ? '' : 'رقم تقريبي، يُحدَّث عند توفر الإحصاء الدقيق'
    },
      el('i', { class: `mark mark--${MARKS[i % MARKS.length]} stat__mark`, style: `--mark-color: var(--${s.accent})`, 'aria-hidden': 'true' }),
      el('span', { class: 'stat__n' }, s.display),
      el('span', { class: 'stat__l' }, s.label)
    ));
  });

  /* stickers taped to the sky, each at its own slant. community.js peels
     them up and straightens them under the pointer. */
  const TILT = [-2.2, 1.6, 1.2, -1.8];
  const finds = $('#finds');
  SOCIALS.forEach((s, i) => {
    finds.append(el('a', {
      class: 'find',
      href: s.href,
      target: '_blank',
      rel: 'noopener',
      'data-rise': '',
      'data-id': s.id,
      style: `--find: var(--${s.accent}); --tilt: ${TILT[i % TILT.length]}deg; --rise-delay: ${i * 70}ms`
    },
      el('i', { class: 'find__tape', 'aria-hidden': 'true' }),
      el('span', { class: 'find__blob', 'aria-hidden': 'true', html: LOGOS[s.id] || '' }),
      el('span', { class: 'find__n' }, s.name),
      el('span', { class: 'find__h' }, s.handle),
      el('span', { class: 'find__note' }, s.note),
      el('span', { class: 'find__go', 'aria-hidden': 'true' }, '←')
    ));
  });
}

/* ------------------------------------------------------------ footer --- */

export function initFooter() {
  const stars = $('#footStars');
  if (stars) {
    const paint = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const w = stars.offsetWidth;
      const h = stars.offsetHeight;
      if (!w || !h) return;
      stars.width = Math.round(w * dpr);
      stars.height = Math.round(h * dpr);
      const ctx = stars.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (let i = 0; i < 110; i++) {
        ctx.globalAlpha = 0.12 + Math.random() * 0.45;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.3 + 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    requestAnimationFrame(paint);
    let t;
    addEventListener('resize', () => { clearTimeout(t); t = setTimeout(paint, 250); });
  }

  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear()).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

  const form = $('#contactForm');
  const note = $('#formNote');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const missing = [...form.elements].some((f) => f.required && !f.value.trim());
    note.textContent = missing
      ? 'أكمل الحقول الثلاثة قبل الإرسال.'
      : 'هذا نموذج أولي: الإرسال غير موصول بعد. اكتب لنا على إنستغرام مؤقتًا.';
  });
}
