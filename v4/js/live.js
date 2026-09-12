/* ============================================================
   The numbers that keep moving.

   assets/stats-data.js is rewritten every hour by a GitHub Action
   (scripts/fetch-stats.mjs) with what can be read off a public
   page: YouTube's subscribers, its total channel views and its
   video count, and نادي المدونة's member count. It is a plain
   script, loaded before the modules, so it is already on
   `window` by the time anything here runs.

   Nothing here is required. If the file is missing, stale, or
   blocked, every number falls back to the one written into
   data.js by hand, and the page cannot tell the difference.

   The views figure is the one number that is added up rather
   than read: YouTube's own total plus every other platform's,
   from VIEWS in data.js.
   ============================================================ */

import { VIEWS } from './data.js';
import { arabize } from './util.js';

const live = () => (typeof window !== 'undefined' && window.MDWNH_STATS) || {};

/* ٣٧٫٤ ألف / ١٫٥ مليون / ١٬٢٨٤. Arabic keeps ٬ for thousands and ٫ for the
   decimal, so a number never reads as a date. */
export function figure(n) {
  if (n >= 1e6) return `${arabize((n / 1e6).toFixed(1)).replace('.', '٫')} مليون`;
  if (n >= 1e4) return `${arabize(Math.round(n / 100) / 10).toString().replace('.', '٫')} ألف`;
  return arabize(String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '٬'));
}

/* every platform's views added together, live where a platform can be read */
export function totalViews() {
  const now = live();
  let sum = 0;
  for (const p of Object.values(VIEWS)) {
    sum += (p.live && now[p.live]) || p.value || 0;
  }
  return sum;
}

/* What a stat row should read right now. Returns the hand written display
   untouched when nothing live covers it. */
export function statValue(stat) {
  const now = live();
  if (stat.live === 'views') {
    const n = totalViews();
    return n ? { display: figure(n), value: n } : null;
  }
  const raw = stat.live && now[stat.live];
  if (raw === undefined || raw === null) return null;
  /* YouTube hands its subscriber line over already rounded and worded
     ("37.4 ألف مشترك"): keep its own figure, drop the word after it. */
  if (typeof raw === 'string') {
    const m = raw.match(/^([\d.,]+)\s*(ألف|مليون|K|M)?/i);
    if (!m) return null;
    const word = { K: 'ألف', M: 'مليون' }[(m[2] || '').toUpperCase()] || m[2] || '';
    const digits = arabize(m[1].replace(/,/g, '٬')).replace('.', '٫');
    return { display: word ? `${digits} ${word}` : digits, value: null };
  }
  return { display: figure(raw), value: raw };
}

/* the small line saying when the live numbers were last read */
export const readAt = () => {
  const at = live().at;
  if (!at) return null;
  const [y, m, d] = at.split('-').map(Number);
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  return `${arabize(d)} ${months[m - 1]} ${arabize(y)}`;
};

/* Anywhere the same numbers are written into the copy, mark the element
   `data-live="<key>"` and it is rewritten from the live file on load. The
   text already in the HTML is the fallback, so the sentence reads correctly
   before this runs and if it never does. `data-live-after` is the word that
   follows the figure ("مشاهدة"), kept out of the number itself. */
export function paintLive(root = document) {
  for (const node of root.querySelectorAll('[data-live]')) {
    const key = node.dataset.live;
    const now = statValue({ live: key });
    if (!now) continue;
    node.textContent = now.display + (node.dataset.liveAfter ? ` ${node.dataset.liveAfter}` : '');
  }
}
