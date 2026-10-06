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
import { $, afterLoad, cloudDrift, el, lite, reduced, whileVisible } from './util.js';
import { sceneCanvas, scenePiece, warmScene } from './scenes.js';

const EASE = 'cubic-bezier(.45,.05,.15,1)';
const SLIDE_MS = 1150;
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
  const lean = leaner(['#newsBgs', '#newsClouds', '#newsFront', '#newsWorlds', '#newsTrack'].map((s) => $(s)));
  const worlds = NEWS.map((item) => buildWorld(item, stage, lean));

  /* The painting behind each world: the one its project page wears, at the
     same crop and from the same files (tools/build-assets.py backgrounds).
     The first is in the HTML. The others are only asked for once the first
     screen is in, and a headline whose work has no painting keeps the flat
     colour and its set piece. */
  const bgHost = $('#newsBgs');
  const bgs = NEWS.map((item, i) => {
    /* no host: a page cached from before the paintings, running this file */
    if (!bgHost || !painted(item)) return null;
    if (i === 0) return bgHost.querySelector('.news__bg');
    const node = newsBg(item);
    /* decoded before it is ever shown: WebKit otherwise decodes a painting
       on the frame it first appears, mid sweep, and blinks */
    afterLoad(() => {
      bgHost.append(node);
      node.querySelector('img').decode?.().catch(() => {});
    });
    return node;
  });

  const light = (i) => {
    worlds.forEach((w, j) => w.show(i === j));
    bgs.forEach((b, j) => b?.classList.toggle('is-on', i === j));
  };
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

  /* Swipe, because most of this audience arrives on a phone.
     A mouse drag across the card is how you select the copy, not how you
     turn the deck, so only a touch or a pen swipes. The gesture also has
     to be sideways, and it is dropped the moment text is being selected:
     otherwise highlighting a line threw the reader onto the next headline. */
  let x0 = null;
  let y0 = null;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse') return;
    x0 = e.clientX;
    y0 = e.clientY;
  });
  const dropSwipe = () => { x0 = y0 = null; };
  track.addEventListener('pointercancel', dropSwipe);
  track.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    dropSwipe();
    if (!getSelection()?.isCollapsed) return;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? 1 : -1);
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

  /* On a phone the copy sits under the art instead of on it, so a headline
     whose words wrap to one more line made a taller card, and the whole
     stage jumped by that line when the deck turned. Every card takes the
     height of the tallest. Measured with the real slides, hidden, whenever
     the width or the font changes. */
  const phone = matchMedia('(max-width: 760px)');
  let levelled = 0;
  function level() {
    track.style.removeProperty('--slide-h');
    if (!phone.matches) return;
    let tallest = 0;
    for (const item of NEWS) {
      const probe = buildSlide(item);
      probe.style.cssText = 'position:absolute;inset:0 0 auto;visibility:hidden;animation:none';
      track.append(probe);
      tallest = Math.max(tallest, probe.offsetHeight);
      probe.remove();
    }
    track.style.setProperty('--slide-h', `${tallest}px`);
  }
  level();
  document.fonts?.ready.then(level);
  phone.addEventListener('change', level);
  new ResizeObserver(([e]) => {
    const w = Math.round(e.contentRect.width);
    if (w === levelled) return;
    levelled = w;
    level();
  }).observe(track);

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
    const from = index;
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

    sweep(bgs[from], bgs[index], dir);

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

    setTimeout(() => { busy = false; }, SLIDE_MS * 0.6);
  }

  /* The paintings turn with the deck. They slide the way the card goes,
     a whole width of their own, so the two pass like frames on a strip
     while the lens pulls focus. The one leaving slides away and blurs out;
     the one arriving starts blurred on the other side and sharpens as it
     settles. Nothing is scaled: the client read a scale as the painting
     growing into place instead of arriving. They are the far layer, so
     they take a little longer over the trip than the card does.

     A turn made before the last one has finished picks each painting up
     from wherever it is. Where it is, is read off the screen and written
     into the new sweep's first keyframe: leaving that keyframe out and
     letting the browser work it out from the sweep already running made
     WebKit flash the painting at its resting state for a frame. The new
     sweep is started before the old ones are dropped, for the same reason:
     there is never a frame with nothing holding the painting.

     The sweep is the only thing that moves these. The stylesheet's opacity
     transition is for reduced motion alone (sections.css), so the two never
     run against each other. */
  function sweep(out, into, dir) {
    /* a device that cannot keep up slides and fades, and skips the blur */
    const far = lite.on ? 'none' : 'blur(26px)';
    const near = lite.on ? 'none' : 'blur(0px)';
    const away = (side) => ({ transform: `translate3d(${side * 100}%,0,0)`, filter: far, opacity: 0 });
    const home = { transform: 'translate3d(0,0,0)', filter: near, opacity: 1 };
    const opts = { duration: SLIDE_MS * 1.18, easing: EASE, fill: 'both' };
    const sweeps = (n) => n.getAnimations().filter((x) => !(x instanceof CSSTransition));

    const run = (n, rest, to) => {
      const old = sweeps(n);
      let from = rest;
      if (old.some((x) => x.playState === 'running')) {
        const now = getComputedStyle(n);
        from = {
          transform: now.transform === 'none' ? home.transform : now.transform,
          filter: now.filter === 'none' ? near : now.filter,
          opacity: now.opacity
        };
      }
      const a = n.animate([from, to], opts);
      old.forEach((x) => x.cancel());
      /* once it has come to rest where the stylesheet would have it anyway,
         the sweep lets go */
      a.finished.then(() => { if (sweeps(n).length === 1) a.cancel(); }).catch(() => {});
    };
    if (out) run(out, home, away(-dir));
    if (into) run(into, away(dir), home);
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
  /* Where the work is a comic, the pages are the whole story and the video is
     the teaser for it, so the comic is the second button and the video drops
     to a quiet link under the pair. The comic reader is on this same site. */
  const acts = el('div', { class: 'news__acts' },
    el('a', { class: 'btn', href: item.primary.href }, item.primary.label),
    item.read
      ? el('a', { class: 'btn btn--ghost', href: item.read.href }, item.read.label)
      : el('a', { class: 'btn btn--ghost', href: item.secondary.href, target: '_blank', rel: 'noopener' }, item.secondary.label),
    item.read
      ? el('a', { class: 'news__watch', href: item.secondary.href, target: '_blank', rel: 'noopener' },
        el('i', { class: 'news__tri', 'aria-hidden': 'true' }), item.secondary.label)
      : null
  );
  return el('article', { class: 'news__slide', 'data-align': item.align },
    el('img', { class: 'news__art', src: item.art, alt: item.name, width: 1448, height: 814 }),
    el('span', { class: 'news__chip' }, item.kicker),
    el('div', { class: 'news__body' },
      el('p', { class: 'news__text' }, lines(item.body)),
      acts
    )
  );
}

const painted = (item) => PROJECT_PAGES[item.id]?.bg;

/* One headline's painting. `wash` is what the top of it deepens to, so the
   header reads: the stage's own colour, or the sky's zenith where the
   painting is a pale one. `foot` is the colour it ends in, at the seam. */
function newsBg(item) {
  const bg = painted(item);
  /* the stage's own framing where the work has one (bg.news), else the
     project page's */
  const frame = bg.news || {};
  const at = frame.at || bg.at;
  const atTall = frame.atTall || bg.atTall;
  const base = `assets/img/bg/${item.id}`;
  return el('div', {
    class: 'news__bg',
    style: `--at:${at[0]}% ${at[1]}%;--at-tall:${atTall[0]}% ${atTall[1]}%;--zoom:${frame.zoom || 1};`
         + `--wash:${bg.zenith || item.tone.bg};--foot:${item.tone.bg}`
  }, el('picture', {},
    el('source', {
      media: '(max-aspect-ratio: 4/5)',
      srcset: `${base}-tall-720.webp 720w, ${base}-tall-1080.webp 1080w`,
      sizes: '100vw'
    }),
    el('img', {
      src: `${base}-1280.webp`,
      srcset: `${base}-1280.webp 1280w, ${base}-1920.webp 1920w`,
      sizes: 'max(100vw, 200vh)',
      alt: '',
      decoding: 'sync'
    })
  ));
}

/* A body written over more than one line keeps its breaks. */
function lines(text) {
  return String(text).split('\n').flatMap((t, i) => (i ? [el('br'), t] : [t]));
}

/* Over a painting the far clouds stay out, as they do on its project page:
   the painting is the far layer. The near ones are the house's, and stay. */
function buildClouds(item, layer = 'clouds') {
  const set = el('div', { class: 'cloudset', style: 'position:absolute;inset:0' });
  if (layer === 'clouds' && painted(item)) return set;
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
  /* a painting already holds the eyes or the sun */
  const piece = painted(item) ? null : scenePiece(item.scene, th);
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
