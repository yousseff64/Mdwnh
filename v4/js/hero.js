/* ============================================================
   The news clicker.

   One headline on screen at a time, cycling forever. A side
   button, a swipe, or a sideways trackpad swipe slides the card
   out and the next one in, fades the whole stage to that
   project's colour, swaps the cloud layout, and cross fades the
   headline's world: the scenery its project page wears
   (باب الحجرة's watching eyes, سمرقند's sun and falling leaf).
   Clouds sit in front of the card and travel at 45% of the
   card's speed, so the parallax reads as depth. Left alone, the
   deck moves on by itself, and the lit dot fills to show when.
   ============================================================ */

import { NEWS, PROJECT_PAGES } from './data.js';
import { $, afterLoad, cloudDrift, el, reduced, whileVisible } from './util.js';
import { sceneCanvas, scenePiece, warmScene } from './scenes.js';

const EASE = 'cubic-bezier(.22,.7,.24,1)';
const SLIDE_MS = 720;
/* scenes whose canvas draws in front of the card rather than behind it */
const IN_FRONT = new Set(['leaves']);

export function initHero() {
  const stage = $('#news');
  const track = $('#newsTrack');
  const cloudHost = $('#newsClouds');
  const dots = $('#newsDots');
  if (!stage || !track) return;

  let index = 0;
  let busy = false;

  /* Slide 0 is already in the HTML so the hero paints before this runs. */
  let current = track.querySelector('.news__slide');
  const frontHost = $('#newsFront');
  let currentClouds = buildClouds(NEWS[0]);
  let currentFront = buildClouds(NEWS[0], 'front');
  cloudHost.append(currentClouds);
  frontHost.append(currentFront);
  paintTone(NEWS[0]);

  /* each headline's world, only the current one lit */
  const lean = leaner(['#newsClouds', '#newsFront', '#newsWorlds', '#newsTrack'].map((s) => $(s)));
  const worlds = NEWS.map((item) => buildWorld(item, stage, lean));
  const light = (i) => worlds.forEach((w, j) => w.show(i === j));
  light(0);

  NEWS.forEach((item, i) => {
    dots.append(el('button', {
      class: 'news__dot',
      role: 'tab',
      'aria-selected': String(i === 0),
      'aria-label': item.name,
      onclick: () => go(i - index)
    }));
  });

  $('#newsNext').addEventListener('click', () => go(1));
  $('#newsPrev').addEventListener('click', () => go(-1));

  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(1);
    if (e.key === 'ArrowRight') go(-1);
  });

  /* swipe, because most of this audience arrives on a phone */
  let x0 = null;
  track.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  track.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1);
  });

  /* A sideways trackpad swipe turns the deck, one headline per gesture:
     after a step, the rest of that swipe's momentum is ignored until the
     events pause. Vertical scrolling is never touched. */
  let wheel = 0;
  let locked = false;
  let quiet;
  stage.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    clearTimeout(quiet);
    quiet = setTimeout(() => { locked = false; wheel = 0; }, 220);
    if (locked) return;
    wheel += e.deltaX;
    if (Math.abs(wheel) < 40) return;
    go(wheel > 0 ? 1 : -1);
    locked = true;
  }, { passive: false });

  /* The other headlines' art and scenery, fetched once the first screen is
     in, so the first turn of the deck never waits on the network or on a
     decode mid slide. */
  afterLoad(() => NEWS.slice(1).forEach((item) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = item.art;
    img.decode?.().catch(() => {});
    warmScene(item.scene);
  }));

  if (!reduced.matches) {
    /* the clouds only drift while the hero is anywhere near the screen */
    whileVisible(stage, cloudDrift(cloudHost));
    whileVisible(stage, cloudDrift(frontHost));

    /* The lit dot fills over a few seconds (CSS) and the deck moves on when
       it is full. Pointing at the hero, focusing inside it, or scrolling it
       away holds the fill where it is. */
    stage.classList.add('is-auto');
    dots.addEventListener('animationend', (e) => {
      if (e.target.getAttribute('aria-selected') !== 'true') return;
      if (busy) setTimeout(() => go(1), SLIDE_MS);
      else go(1);
    });
    new IntersectionObserver(([e]) => stage.classList.toggle('is-away', !e.isIntersecting)).observe(stage);
  }

  /* ------------------------------------------------------------ moves --- */

  function go(step) {
    if (busy || !step) return;
    const next = (index + step % NEWS.length + NEWS.length) % NEWS.length;
    if (next === index) return;
    /* Press next and the deck advances leftwards: the current card exits to
       the left, the next one arrives from the right. */
    const dir = step > 0 ? 1 : -1;
    index = next;
    busy = true;

    const item = NEWS[index];
    paintTone(item);
    light(index);
    stage.dataset.railEnd = item.name;
    [...dots.children].forEach((d, i) => d.setAttribute('aria-selected', String(i === index)));

    const incoming = buildSlide(item);
    track.insertBefore(incoming, track.querySelector('.news__dots'));

    const outgoing = current;
    outgoing.classList.add('is-out');
    current = incoming;

    const outClouds = currentClouds;
    const inClouds = buildClouds(item);
    cloudHost.append(inClouds);
    currentClouds = inClouds;

    const outFront = currentFront;
    const inFront = buildClouds(item, 'front');
    frontHost.append(inFront);
    currentFront = inFront;

    if (reduced.matches) {
      outgoing.remove();
      outClouds.remove();
      outFront.remove();
      busy = false;
      return;
    }

    const span = track.getBoundingClientRect().width * 1.15;
    const opts = { duration: SLIDE_MS, easing: EASE, fill: 'both' };

    slide(outgoing, 0, -dir * span, 1, 0, opts).then(() => outgoing.remove());
    slide(incoming, dir * span, 0, 0, 1, opts);

    /* clouds are the near layer, so they move less, not more */
    const near = span * 0.45;
    slide(outClouds, 0, -dir * near, 0.85, 0, opts).then(() => outClouds.remove());
    slide(inClouds, dir * near, 0, 0, 0.85, opts);

    /* the front layer is nearest of all, so it travels furthest */
    const front = span * 0.7;
    slide(outFront, 0, -dir * front, 0.8, 0, opts).then(() => outFront.remove());
    slide(inFront, dir * front, 0, 0, 0.8, opts);

    setTimeout(() => { busy = false; }, SLIDE_MS * 0.72);
  }

  function slide(node, fromX, toX, fromOp, toOp, opts) {
    return node.animate([
      { transform: `translate3d(${fromX}px,0,0)`, opacity: fromOp },
      { transform: `translate3d(${toX}px,0,0)`, opacity: toOp }
    ], opts).finished.catch(() => {});
  }

  function paintTone({ tone }) {
    stage.style.setProperty('--tone-bg', tone.bg);
    stage.style.setProperty('--tone-deep', tone.deep);
    stage.style.setProperty('--tone-cloud', tone.cloud);
    stage.style.setProperty('--tone-glow', tone.glow);
    stage.style.setProperty('--tone-ink', tone.ink);
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', tone.bg);
  }
}

/* -------------------------------------------------------------- build --- */

function buildSlide(item) {
  const acts = el('div', { class: 'news__acts' },
    el('a', { class: 'btn', href: item.primary.href }, item.primary.label),
    el('a', { class: 'btn btn--ghost', href: item.secondary.href, target: '_blank', rel: 'noopener' }, item.secondary.label)
  );
  return el('article', { class: 'news__slide', 'data-align': item.align },
    el('img', { class: 'news__art', src: item.art, alt: item.name, width: 1448, height: 814 }),
    el('span', { class: 'news__chip' }, item.kicker),
    el('div', { class: 'news__body' },
      el('p', { class: 'news__text' }, item.body),
      acts
    )
  );
}

function buildClouds(item, layer = 'clouds') {
  const set = el('div', { class: 'cloudset', style: 'position:absolute;inset:0' });
  (item[layer] || []).forEach((c) => {
    set.append(el('i', {
      class: 'cloud',
      'data-seed': c.d,
      'data-flip': c.f ? '1' : null,
      style: `top:${c.y}%;left:${c.x}%;width:min(${(c.s * 20).toFixed(1)}rem, ${(c.s * 38).toFixed(1)}vw);`
           + `filter:blur(${c.b}px);--cloud-color:${item.tone.cloud};`
           + `opacity:${0.92 - c.b * 0.035};`
           + `transform:${c.f ? 'scaleX(-1)' : 'none'};`
    }));
  });
  return set;
}

/* One headline's world, in the colours of its own project page: the set
   piece behind the card, and a scenery canvas behind it or in front of it.
   Its canvas only runs while it is the lit one and the hero is on screen. */
function buildWorld(item, stage, lean) {
  const th = PROJECT_PAGES[item.id]?.theme;
  if (!item.scene || !th) return { show() {} };
  const style = `--accent:${th.accent};--accent2:${th.accent2}`;
  const back = el('div', { class: 'news__layer', style });
  $('#newsWorlds').append(back);
  const piece = scenePiece(item.scene, th);
  if (piece) back.append(piece.node);

  const layer = IN_FRONT.has(item.scene) ? el('div', { class: 'news__layer', style }) : back;
  if (layer !== back) $('#newsFx').append(layer);
  const canvas = el('canvas', { class: 'news__canvas' });
  layer.append(canvas);
  const scene = sceneCanvas(canvas, item.scene, th, (ptr) => {
    lean(ptr);
    piece?.follow?.(ptr);
  }, { box: stage, density: 0.55 });

  return {
    show(on) {
      back.classList.toggle('is-on', on);
      layer.classList.toggle('is-on', on);
      scene.run(on);
    }
  };
}

/* The smoothed pointer, handed to CSS as --px / --py for the depth layers.
   Set on the layers that read it, not on the stage: a custom property
   changed on the stage restyles the whole hero under it every frame. */
function leaner(layers) {
  let x = '';
  let y = '';
  return (ptr) => {
    const nx = ptr.x.toFixed(3);
    const ny = ptr.y.toFixed(3);
    if (nx === x && ny === y) return;
    x = nx;
    y = ny;
    for (const node of layers) {
      node.style.setProperty('--px', nx);
      node.style.setProperty('--py', ny);
    }
  };
}
