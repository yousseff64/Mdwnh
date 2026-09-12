/* ============================================================
   project.html?id=…  One template, a different world per work.

   Order on the page: the hero (title over the work's scenery),
   the video itself, the numbers, the story, other works, and the
   footer. The home page's news and أعمالنا both land here, on
   the same id.
   ============================================================ */

import { PROJECTS, PROJECT_PAGES, STATS_AS_OF } from './data.js';
import { $, arabize, clamp, el, reduced, tick, whileVisible } from './util.js';
import { initNav, initRails, initReveal, initFooter } from './ambient.js';
import { coverCard, initCovers } from './cover.js';
import { dressHero, sceneCanvas } from './scenes.js';

const asked = new URLSearchParams(location.search).get('id');
const id = PROJECT_PAGES[asked] ? asked : PROJECTS[0].id;
const p = PROJECT_PAGES[id];
const card = PROJECTS.find((x) => x.id === id);
const th = p.theme;
const still = reduced.matches;
const watchUrl = `https://www.youtube.com/watch?v=${p.yt}`;

/* ------------------------------------------------------------ colours --- */

const root = document.documentElement;
for (const [k, v] of Object.entries({ bg: th.bg, sky: th.sky, deep: th.deep, ink: th.ink, cloud: th.cloud })) {
  root.style.setProperty(`--tone-${k}`, v);
}
root.style.setProperty('--accent', th.accent);
root.style.setProperty('--accent2', th.accent2);
root.style.setProperty('--pop', th.pop || th.accent);
document.body.classList.toggle('pp--light', !!th.light);
$('meta[name=theme-color]').setAttribute('content', th.sky);
$('meta[name=description]').setAttribute('content', `${card.name}: ${p.tagline}`);
document.title = `${card.name} | مدونة ستوديو`;

/* The bar looks the same on every page: white logo, white ink. Only its
   glass takes this world's night. */
const nav = $('#nav');
nav.style.setProperty('--nav-glass', th.deep);
nav.style.setProperty('--nav-mix', '64%');

/* --------------------------------------------------------------- hero --- */

const words = p.name.split(' ');
const hero = el('section', { class: 'ph', id: 'top', 'data-rail': `NOW SHOWING · ${card.name}`, 'data-rail-end': p.latin },
  el('div', { class: 'ph__back', id: 'phBack', 'aria-hidden': 'true' }),
  el('div', { class: 'shell ph__copy' },
    el('p', { class: 'eyebrow ph__eyebrow' }, el('span', {}, 'مدونة ستوديو'), el('span', {}, p.type), el('span', {}, p.year)),
    /* word by word, never letter by letter: splitting letters breaks the joins */
    el('h1', { class: 'ph__title', 'aria-label': card.name },
      words.flatMap((w, i) => [el('span', { class: 'ph__w', style: `--i:${i}`, 'aria-hidden': 'true' }, w), i < words.length - 1 ? ' ' : null])),
    el('p', { class: 'ph__tag' }, p.tagline),
    el('div', { class: 'ph__acts' },
      el('button', { class: 'btn', type: 'button', onclick: watchNow },
        el('i', { class: 'ph__tri', 'aria-hidden': 'true' }), 'شاهد الآن'),
      el('a', { class: 'btn btn--ghost', href: watchUrl, target: '_blank', rel: 'noopener' }, 'افتحه في يوتيوب')
    )
  ),
  el('div', { class: 'ph__front', id: 'phFront', 'aria-hidden': 'true' })
);

/* ------------------------------------------------------------- player ---
   The video plays in place. Until it is pressed it is only its own
   thumbnail and a button, so the page never pays for YouTube's player
   before the reader asks for it. */

const player = el('div', { class: 'player', id: 'player' });
const face = el('button', { class: 'player__face', type: 'button', 'aria-label': `شغّل ${card.name} هنا` },
  el('img', { src: `https://i.ytimg.com/vi/${p.yt}/maxresdefault.jpg`, alt: '', width: 1280, height: 720, decoding: 'async' }),
  el('span', { class: 'player__btn', 'aria-hidden': 'true' }, el('i')),
  el('span', { class: 'player__label', 'aria-hidden': 'true' }, el('b', {}, 'شاهد الآن'), el('small', {}, `${p.type} · ${p.length}`))
);
player.append(face);

let warmed = false;
const warm = () => {
  if (warmed) return;
  warmed = true;
  ['https://www.youtube-nocookie.com', 'https://www.google.com'].forEach((href) =>
    document.head.append(el('link', { rel: 'preconnect', href })));
};
face.addEventListener('pointerenter', warm);
face.addEventListener('focus', warm);
face.addEventListener('pointerdown', warm);
face.addEventListener('click', play);

function play() {
  if (player.classList.contains('is-playing')) return;
  const frame = el('iframe', {
    src: `https://www.youtube-nocookie.com/embed/${p.yt}?autoplay=1&rel=0&playsinline=1`,
    title: `${card.name} على يوتيوب`,
    allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
    allowfullscreen: '',
    referrerpolicy: 'strict-origin-when-cross-origin'
  });
  player.append(frame);
  player.classList.add('is-playing');
  frame.focus();
}

function watchNow() {
  player.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'center' });
  play();
}

const watch = el('section', { class: 'pwatch', id: 'watch', 'aria-label': `شاهد ${card.name}` },
  el('div', { class: 'shell' }, player));

/* ------------------------------------------------------------ numbers --- */

const places = (n) => (String(n).split('.')[1] || '').length;
const fmt = (n, v = n) => arabize(v.toFixed(places(n))).replace('.', '٫');

const stats = el('section', { class: 'pstats', 'aria-label': `${card.name} بالأرقام` },
  el('ul', { class: 'shell pstats__row', 'data-rise': '' },
    p.stats.map((s) => el('li', {},
      el('b', {}, el('span', { class: 'pstats__n', 'data-n': s.n }, fmt(s.n)), s.u ? el('small', {}, s.u) : null),
      el('span', { class: 'pstats__l' }, s.l)
    ))
  ),
  /* the numbers keep moving after they were read, so say when */
  el('p', { class: 'shell pstats__note' }, `أرقام يوتيوب حتى ${STATS_AS_OF}`)
);

function countUp(node, delay) {
  const n = +node.dataset.n;
  node.textContent = fmt(n, 0);
  const t0 = performance.now() + delay;
  const stop = tick((t) => {
    const k = clamp((t - t0) / 1500, 0, 1);
    node.textContent = fmt(n, n * (1 - Math.pow(1 - k, 4)));
    if (k >= 1) stop();
  });
}

/* -------------------------------------------------------------- story --- */

const story = el('section', { class: 'section pstory', id: 'story', 'data-rail': 'THE STORY · عَنِ الحِكَايَة', 'data-rail-end': p.latin },
  el('div', { class: 'shell pstory__grid' },
    el('div', { class: 'pstory__copy', 'data-rise': '' },
      el('p', { class: 'eyebrow' }, p.crew.map((c) => el('span', {}, c))),
      el('h2', { class: 'h2' }, 'عَنِ الحِكَايَةِ'),
      el('p', { class: 'pstory__lede' }, p.body[0]),
      p.body.slice(1).map((t) => el('p', {}, t)),
      p.read ? el('a', { class: 'btn btn--ghost pstory__read', href: p.read, target: '_blank', rel: 'noopener' }, 'اقرأ القصة المصورة كاملة') : null
    ),
    el('dl', { class: 'pfacts', 'data-rise': '', style: '--rise-delay: 120ms' },
      p.facts.map((f) => el('div', {}, el('dt', {}, f.k), el('dd', {}, f.v)))
    )
  )
);

/* ---------------------------------------------------------- more work --- */

const others = PROJECTS.filter((x) => x.id !== id);
const row = el('div', { class: 'pmore__row', 'data-rise': '' }, others.map((o) => coverCard(o, false, '(max-width: 900px) 44vw, 16vw')));
const more = el('section', { class: 'section pmore', 'data-rail': 'MORE WORK · أَعْمَالٌ أُخْرَى', 'data-rail-end': 'MDWNH STUDIO' },
  el('div', { class: 'shell' },
    el('div', { class: 'pmore__head', 'data-rise': '' },
      el('div', {},
        el('p', { class: 'eyebrow' }, others.map((o) => el('span', {}, o.name))),
        el('h2', { class: 'h2' }, 'أَعْمَالٌ أُخْرَى')
      ),
      el('a', { class: 'pmore__all', href: 'index.html#work' }, 'كل أعمالنا في الرئيسية', el('span', { 'aria-hidden': 'true' }, '←'))
    ),
    row
  )
);

$('#pmain').append(hero, watch, stats, story, more);

/* the footer's own list of works, with this one marked */
$('#footWorks').append(...PROJECTS.map((o) => el('li', {},
  el('a', { href: `project.html?id=${o.id}`, 'aria-current': o.id === id ? 'page' : null }, o.name))));

/* ------------------------------------------------------------- motion --- */

initNav();
initRails();
initReveal();
initFooter();
initCovers(row);

const follow = dressHero($('#phBack'), $('#phFront'), p.scene, th);

const vars = new Map();
const setVar = (node, name, v) => {
  const s = v.toFixed(3);
  if (vars.get(name) === s) return;
  vars.set(name, s);
  node.style.setProperty(name, s);
};

sceneCanvas($('#pfx'), p.scene, th, (ptr) => {
  setVar(hero, '--px', ptr.x);
  setVar(hero, '--py', ptr.y);
  follow?.(ptr);
});

new IntersectionObserver(([e], o) => {
  if (!e.isIntersecting) return;
  o.disconnect();
  if (!still) [...stats.querySelectorAll('.pstats__n')].forEach((n, i) => countUp(n, i * 90));
}, { threshold: 0.5 }).observe(stats);

if (!still) {
  /* the title lifts away as you leave the hero, and the player comes up to
     meet you: it starts a little tipped back and settles flat as it
     reaches the middle of the screen */
  whileVisible(hero, () => setVar(hero, '--out', clamp(scrollY / (hero.offsetHeight * 0.85), 0, 1)));
  whileVisible(watch, () => {
    const r = watch.getBoundingClientRect();
    const k = clamp((innerHeight - r.top) / (innerHeight * 0.85), 0, 1);
    setVar(player, '--in', 1 - Math.pow(1 - k, 3));
  });
}
