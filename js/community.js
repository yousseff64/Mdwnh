/* ============================================================
   مُجْتَمَعُنَا: the call and the stickers.

   The call is a drawing of نادي المدونة's voice room. While it is
   on screen the talking ring passes from one سراج to the next,
   some of them say something, and reactions float up. A press on
   a tile hops its سراج and sends a reaction up from it. The real
   server peeks out from behind the call and stays put.

   Hover motion is sprung like the كيف أساهم cards, so it can be
   broken off and reversed at any instant. Reduced motion keeps
   one still speaker, no drift, and reactions that only fade.
   ============================================================ */

import { $, $$, el, reduced, tick, whileVisible, cloudDrift, spring, step } from './util.js';

/* What each سراج says when the ring comes round to them. They are meant to
   sound like four people who already know each other and are half paying
   attention, not like a feature list: someone is eating, someone missed the
   vote, someone is still awake at four. Keep them that way. */
const LINES = {
  misbah: [
    'ثانية ثانية، خليني أشارك الشاشة',
    'لا تحكموا عليها، لسا ما لونتها',
    'طيب هذي اللقطة أعدتها ست مرات، ست'
  ],
  siraj: [
    'طيب مين قال إني أشبه موزة',
    'أنا أكلت، كملوا بدوني',
    'ارسموني بلون جديد وأنا أحط الصورة'
  ],
  fanous: [
    'هههههههه لا والله',
    'قلت لكم من أول حلقة إنه هو',
    'أنا نسيت أصوت، عادي؟'
  ],
  qandeel: [
    'الساعة أربعة ولسا صاحي',
    'خلصت الخلفية، بس ما تعجبني',
    'وش صار على اقتراح الأسبوع اللي طاف'
  ]
};

/* the reactions are the house brush marks, in the accents */
const POPS = [
  ['sparkles', 'var(--sun)'], ['smile', 'var(--mint)'], ['asterisk', 'var(--ember)'],
  ['spiral', '#8fcdf1'], ['sparkles', '#fff']
];

const any = (list) => list[(Math.random() * list.length) | 0];

export function initCommunity() {
  const section = $('#community');
  const call = $('#call');
  if (!section || !call) return;
  const grid = $('#callGrid');
  const fx = $('#callFx');
  const react = $('#callReact');
  const tiles = $$('.tile', grid);
  const still = reduced.matches;

  /* ---- one spring loop for everything in the section ---- */
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

  /* ---- the stickers: peeled up and straightened under the pointer ---- */
  $$('.find', section).forEach((card) => {
    const st = { h: spring(0.36, 0.8) };
    st.all = [st.h];
    st.paint = () => card.style.setProperty('--h', st.h.x.toFixed(4));
    const lift = (on) => { st.h.to = on ? 1 : 0; wake(st); };
    card.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') lift(true); });
    card.addEventListener('pointerleave', () => lift(false));
    card.addEventListener('focus', () => lift(true));
    card.addEventListener('blur', () => lift(false));
  });

  /* ---- reactions ---- */
  const pop = (from, n = 1) => {
    const box = call.getBoundingClientRect();
    const r = from.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const [name, color] = any(POPS);
      const x = r.left - box.left + r.width * (0.3 + Math.random() * 0.4);
      const y = r.top - box.top + r.height * 0.45;
      const m = el('i', {
        class: `mark mark--${name} call__pop`,
        style: `--mark-color: ${color}; left: ${x.toFixed(1)}px; top: ${y.toFixed(1)}px`
      });
      fx.append(m);
      const dx = (Math.random() - 0.5) * 90;
      const up = 110 + Math.random() * 100;
      const spin = (Math.random() - 0.5) * 90;
      const frames = still
        ? [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 0 }]
        : [
            { transform: 'scale(0.3)', opacity: 0 },
            { transform: `translate(${dx * 0.25}px, ${-up * 0.22}px) scale(1.15) rotate(${spin * 0.25}deg)`, opacity: 1, offset: 0.18 },
            { transform: `translate(${dx}px, ${-up}px) scale(0.8) rotate(${spin}deg)`, opacity: 0 }
          ];
      m.animate(frames, {
        duration: 1500 + Math.random() * 700,
        delay: i * 90,
        easing: 'cubic-bezier(.2,.7,.3,1)',
        fill: 'both'
      }).finished.then(() => m.remove(), () => m.remove());
    }
  };

  react?.addEventListener('click', () => pop(react, 4));

  /* ---- the tiles: a lift on hover, a hop on press ---- */
  const states = new Map(tiles.map((tile) => {
    const st = { h: spring(0.3, 1), k: spring(0.42, 0.45) };
    st.all = [st.h, st.k];
    st.paint = () => {
      tile.style.setProperty('--h', st.h.x.toFixed(4));
      tile.style.setProperty('--k', st.k.x.toFixed(4));
    };
    return [tile, st];
  }));
  const hop = (tile) => {
    const st = states.get(tile);
    st.k.v += 10;            /* a kick, not a target: it lands on its own */
    wake(st);
  };
  tiles.forEach((tile) => {
    const st = states.get(tile);
    const lift = (on) => { st.h.to = on ? 1 : 0; wake(st); };
    tile.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') lift(true); });
    tile.addEventListener('pointerleave', () => lift(false));
    tile.addEventListener('pointerdown', () => { hop(tile); pop(tile); });
    if (tile.matches('a')) {
      tile.addEventListener('focus', () => lift(true));
      tile.addEventListener('blur', () => lift(false));
    }
  });

  /* ---- speech bubbles ---- */
  const say = (tile, text) => {
    tile.querySelector('.call__say')?.remove();
    const b = el('span', { class: 'call__say' }, text);
    tile.append(b);
    b.animate(still
      ? [{ opacity: 0 }, { opacity: 1 }]
      : [{ opacity: 0, transform: 'translateY(8px) scale(0.6)' }, { opacity: 1, transform: 'none' }],
    { duration: still ? 200 : 460, easing: 'cubic-bezier(.3,1.45,.5,1)', fill: 'both' });
    setTimeout(() => {
      b.animate([{ opacity: 1 }, { opacity: 0, transform: still ? 'none' : 'translateY(-6px)' }],
        { duration: 260, fill: 'forwards' }).finished.then(() => b.remove(), () => b.remove());
    }, 2400);
  };

  /* ---- the talking ring passes round ---- */
  const talkers = tiles.filter((t) => t.dataset.who && !t.classList.contains('tile--muted'));
  const said = new Map();
  let lastTalker = null;
  let timer = 0;
  let running = false;
  let inView = false;

  const turn = () => {
    tiles.forEach((t) => t.classList.remove('is-talking'));
    /* a hidden tile (the phone layout drops one) never gets the ring */
    const open = talkers.filter((t) => t.offsetParent && t !== lastTalker);
    const who = any(open.length ? open : talkers);
    lastTalker = who;
    who.classList.add('is-talking');
    /* now and then someone laughs along */
    if (Math.random() < 0.22) any(open.filter((t) => t !== who))?.classList.add('is-talking');

    const lines = LINES[who.dataset.who];
    if (lines && Math.random() < 0.72) {
      const n = said.get(who) || 0;
      said.set(who, n + 1);
      say(who, lines[n % lines.length]);
    }
    if (Math.random() < 0.4) pop(who);
    timer = setTimeout(turn, 1700 + Math.random() * 1500);
  };

  /* The showreel on the shared screen. preload="none" in the markup, so it
     costs nothing until the call is actually on screen, and it stops the
     moment it leaves: a video decoding behind the fold is the kind of thing
     a phone pays for twice. Reduced motion leaves the poster frame. */
  const stream = $('#callStream');
  const streamRun = (go) => {
    if (!stream || still) return;
    if (go) stream.play?.().catch(() => {});
    else stream.pause?.();
  };

  const run = () => {
    const go = inView && !document.hidden;
    if (go === running) return;
    running = go;
    clearTimeout(timer);
    streamRun(go);
    if (go && !still) timer = setTimeout(turn, 600);
  };

  new IntersectionObserver(([e]) => { inView = e.isIntersecting; run(); }, { threshold: 0.2 }).observe(call);
  document.addEventListener('visibilitychange', run);

  if (!still) {
    whileVisible(section, cloudDrift(section));
    /* the footer's bank rises into this sky, so it drifts with it */
    const bank = $('.pfoot__clouds--bank');
    if (bank) whileVisible(bank, cloudDrift(bank));
  }
}
