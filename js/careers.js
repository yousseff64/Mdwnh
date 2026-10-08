/* ============================================================
   اِنْضَمَّ إِلَيْنَا: the one form, and the crafts that tag it.

   There is a single form on the page. Sent as it is, it is the
   general application. Pressing a craft below does not open a
   second form: it tags this one with the craft and brings it
   back into view.

   An application is posted to the studio's relay, which checks
   it and hands it to the team. Nothing is kept on this site, and
   this page knows nothing about where it lands.

   Hover motion is sprung like the كيف أساهم cards, so it can be
   broken off and reversed at any instant, and a press answers on
   the way down. Reduced motion keeps the glow and drops every
   movement.
   ============================================================ */

import { $, $$, el, reduced, tick, spring, step, arabize } from './util.js';
import { initNav } from './ambient.js?v=2';

const ENDPOINT = 'https://mdwnh-presence.yosefbore3y.workers.dev/join';
const MAIL = 'contact@mdwn.studio';
const MIN = 20;
const MAX = 1500;

/* The crafts the studio is taking people in for right now. The id is what is
   sent; the relay has the same ids and writes the label itself, so a new
   craft is a row here AND a row there (JOIN_ROLES in the relay). */
const ROLES = [
  { id: 'edit', name: 'مونتير وموشن', mark: 'swash', c: 'var(--ember)' },
  { id: 'anim', name: 'أنيميتر', note: 'كليب ستوديو · إن بتوين · كي فريم', mark: 'sparkles', c: 'var(--sun)' },
  { id: 'char', name: 'مصمم شخصيات', mark: 'smile', c: 'var(--mint)' },
  { id: 'concept', name: 'مصمم كونسبت آرت', mark: 'spiral', c: '#4db5e6' },
  { id: 'brand', name: 'مصمم هويات بصرية', mark: 'asterisk', c: 'var(--ember)' },
  { id: '3d', name: 'ثري دي أنيميشن', note: 'ريق', mark: 'hash', c: 'var(--mint)' },
  { id: 'voice', name: 'ممثل صوتي', mark: 'question', c: 'var(--sun)' }
];

const still = reduced.matches;

/* ---- one spring loop for the whole page ---- */
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
  if (still) return;
  moving.add(st);
  if (!stop) stop = tick(loop);
};

/* one spring written to one custom property */
function sprung(node, prop, response, damping) {
  const st = { s: spring(response, damping) };
  st.all = [st.s];
  st.paint = () => node.style.setProperty(prop, st.s.x.toFixed(4));
  return {
    to(v) { st.s.to = v; wake(st); },
    kick(v) { st.s.v += v; wake(st); }
  };
}

/* ---- the form ---- */
const form = $('#joinForm');
const card = $('#joinCard');
const email = $('#joinEmail');
const message = $('#joinMessage');
const trap = $('#joinTrap');
const send = $('#joinSend');
const error = $('#joinError');
const count = $('#joinCount');
const roleRow = $('#joinRole');
const roleName = $('#joinRoleName');
const done = $('#joinDone');

let role = '';
let busy = false;
const lamps = new Map();
const cardPulse = sprung(card, '--pulse', 0.5, 0.42);
const headNod = sprung($('#joinHead'), '--nod', 0.45, 0.4);

function setRole(id) {
  const r = ROLES.find((x) => x.id === id);
  role = r ? r.id : '';
  roleRow.hidden = !r;
  roleName.textContent = r ? r.name : '';
  for (const [rid, b] of lamps) {
    const on = rid === role;
    b.btn.setAttribute('aria-pressed', String(on));
    b.lit.to(on ? 1 : 0);
  }
}

function fail(text, field) {
  error.textContent = text;
  error.hidden = !text;
  [email, message].forEach((f) => f.toggleAttribute('aria-invalid', f === field));
  if (field) field.focus();
}

const SAY = {
  email: () => ['اكتب بريدًا صحيحًا لنرد عليك.', email],
  short: () => [`اكتب ${arabize(MIN)} حرفًا على الأقل، لنعرف من أنت.`, message],
  slow: () => ['أرسلت أكثر من طلب للتو. حاول مرة أخرى بعد ساعة.', null],
  full: () => [`استقبلنا طلبات كثيرة اليوم. حاول غدًا، أو راسلنا على ${MAIL}.`, null]
};

async function submit(e) {
  e.preventDefault();
  if (busy) return;
  const mail = email.value.trim();
  const text = message.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@.]{2,}$/.test(mail)) return fail(...SAY.email());
  if (text.length < MIN) return fail(...SAY.short());
  fail('');

  busy = true;
  send.disabled = true;
  send.textContent = 'جارٍ الإرسال…';
  let out = null;
  try {
    /* text/plain keeps this a simple request: no preflight round trip */
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: JSON.stringify({ e: mail, m: text, r: role, w: trap.value })
    });
    out = await res.json();
  } catch (_) { out = null; }
  busy = false;
  send.disabled = false;
  send.textContent = 'أرسل طلبك';

  if (out && out.ok) {
    $('#joinDoneMail').textContent = mail;
    form.hidden = true;
    $('.jcard__head', card).hidden = true;
    done.hidden = false;
    done.focus({ preventScroll: true });
    cardPulse.kick(7);
    headNod.kick(9);
    return;
  }
  const known = out && SAY[out.error];
  if (known) fail(...known());
  else fail(`تعذّر إرسال الطلب الآن. حاول مرة أخرى، أو راسلنا على ${MAIL}.`);
}

function initForm() {
  const tally = () => { count.textContent = `${arabize(message.value.length)} / ${arabize(MAX)}`; };
  message.addEventListener('input', tally);
  tally();
  [email, message].forEach((f) => f.addEventListener('input', () => { if (!error.hidden) fail(''); }));
  $('#joinRoleClear').addEventListener('click', () => { setRole(''); email.focus(); });
  form.addEventListener('submit', submit);
}

/* ---- the crafts: lamps that light under the pointer and stay lit once chosen ---- */
function initRoles() {
  const grid = $('#rolesGrid');
  ROLES.forEach((r) => {
    /* each craft wears one of the house brush marks, in one of the accents:
       that mark is the lamp's bulb */
    const btn = el('button', { class: 'lamp', type: 'button', 'aria-pressed': 'false', style: `--c: ${r.c}` },
      el('i', { class: `mark mark--${r.mark} lamp__bulb`, 'aria-hidden': 'true' }),
      el('span', { class: 'lamp__name' }, r.name),
      r.note ? el('span', { class: 'lamp__note' }, r.note) : null,
      el('span', { class: 'lamp__cta' }, 'قدّم على هذا التخصص ', el('span', { 'aria-hidden': 'true' }, '↑')));
    const hover = sprung(btn, '--h', 0.32, 0.85);
    const lit = sprung(btn, '--lit', 0.5, 0.6);
    lamps.set(r.id, { btn, lit });
    btn.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') hover.to(1); });
    btn.addEventListener('pointerleave', () => hover.to(0));
    btn.addEventListener('focus', () => hover.to(1));
    btn.addEventListener('blur', () => hover.to(0));
    btn.addEventListener('click', () => {
      setRole(r.id);
      /* the form may already have been sent: a new craft opens it again */
      if (form.hidden) {
        form.hidden = false;
        $('.jcard__head', card).hidden = false;
        done.hidden = true;
      }
      card.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
      cardPulse.kick(8);
      headNod.kick(7);
      /* focus without yanking the page past the smooth scroll */
      (email.value ? message : email).focus({ preventScroll: true });
    });
    grid.append(el('li', {}, btn));
  });
  if (still) {
    /* no springs: the chosen lamp is simply on */
    new MutationObserver(() => {
      for (const b of lamps.values()) b.btn.style.setProperty('--lit', b.btn.getAttribute('aria-pressed') === 'true' ? '1' : '0');
    }).observe(grid, { attributes: true, subtree: true, attributeFilter: ['aria-pressed'] });
  }
}

/* The buttons that lead down to the crafts. When the crafts come into view
   the lamps answer in a wave, one after the other, so the eye lands on them. */
function initWave() {
  const sec = $('#roles');
  if (!sec || still || !('IntersectionObserver' in window)) return;
  let asked = false;
  $$('[data-to-roles]').forEach((a) => a.addEventListener('click', () => { asked = true; }));
  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || !asked) return;
    asked = false;
    let i = 0;
    for (const b of lamps.values()) setTimeout(() => b.lit.kick(5), 90 * i++);
  }, { threshold: 0.35 }).observe(sec);
}

/* The cover leans back a little as the page leaves it. One property, written
   only while the cover is on screen. */
function initCover() {
  const art = $('#coverArt');
  if (!art || still) return;
  let seen = true;
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(art);
  addEventListener('scroll', () => {
    if (seen) art.style.setProperty('--y', Math.min(scrollY, 900).toFixed(0));
  }, { passive: true });
}

initNav();
initRoles();
initForm();
initCover();
initWave();

/* a link straight to a craft: /careers/#voice */
const want = location.hash.slice(1);
if (ROLES.some((r) => r.id === want)) setRole(want);
