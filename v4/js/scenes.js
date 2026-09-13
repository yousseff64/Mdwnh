/* ============================================================
   Project page scenery. Each work is dressed in the world of its
   own YouTube thumbnail:

     leaves   قضية سمرقند    autumn leaves falling past clouds
     smoke    غمام           one spotlight in a dark room, dust in it
     eyes     باب الحجرة     glowing eyes that blink and watch you
     sparkle  اللص التقي     warm sparkles and thin drawn swirls
     space    فصل عجيب       deep space, orbit rings, floating maths
     figs     القرد والغيلم  a pale sky, figs and leaves falling

   The small things that fall, float or twinkle are drawn on one
   fixed canvas behind the whole page. The set pieces (clouds,
   rings, eyes, the spotlight) are DOM in the hero. Everything
   has a depth: nearer things are bigger and faster, and move more
   with the scroll and the pointer. Reduced motion paints one
   still frame and nothing moves.
   ============================================================ */

import { canvasDpr, clamp, cloudDrift, el, reduced, tick, whileVisible } from './util.js';

const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[(Math.random() * list.length) | 0];
const mod = (v, m) => ((v % m) + m) % m;

/* unit shape, about two units tall, centred on the origin */
const SPARK = new Path2D('M0 -1 Q0.14 -0.14 1 0 Q0.14 0.14 0 1 Q-0.14 0.14 -1 0 Q-0.14 -0.14 0 -1 Z');

/* the fig from القرد والغيلم's own art (Art/تين.png), fetched only by the
   scene that drops it */
const FIG = new Image();
const fig = () => {
  if (!FIG.src) FIG.src = 'assets/scenery/fig.webp';
  return FIG;
};

/* قضية سمرقند's own falling leaf (Art/1أ): two hand animated takes, packed
   by build-assets.py into one sheet with where each frame sat on its
   2338 x 1653 stage. A clip plays one whole take somewhere to the side of
   the copy, fading in as the leaf enters and out as it settles. */
let LEAF = null;
const leafSheet = () => {
  if (LEAF) return LEAF;
  LEAF = { img: new Image(), meta: null };
  LEAF.img.src = 'assets/scenery/leaf.webp';
  fetch('assets/scenery/leaf.json').then((r) => r.json()).then((m) => {
    /* the box each take's leaf travels through, in stage pixels */
    m.bounds = m.takes.map((frames) => {
      const f = frames.filter(Boolean);
      const x0 = Math.min(...f.map((q) => q[4]));
      const y0 = Math.min(...f.map((q) => q[5]));
      const x1 = Math.max(...f.map((q) => q[4] + q[2] / m.scale));
      return { cx: (x0 + x1) / 2, y0 };
    });
    LEAF.meta = m;
  }).catch(() => {});
  return LEAF;
};

/* A scene's art, fetched ahead of the moment it is shown (the news hero
   warms the headlines after the first). */
export function warmScene(scene) {
  if (scene === 'leaves') leafSheet();
  if (scene === 'figs') fig();
}

function placeClip(p, W, H, first) {
  const m = p.sheet.meta;
  p.take = (Math.random() * m.takes.length) | 0;
  p.t = 0;
  p.wait = first ? rnd(0, 1.6) : rnd(0.8, 3.2);
  p.flip = Math.random() < 0.5;
  p.s = (H / m.stage[1]) * rnd(0.6, 1);
  p.z = 0.6 + p.s * 0.6;
  /* one side of the screen or the other, never over the middle column */
  p.side = !p.side;
  const cx = W * (p.side ? rnd(0.04, 0.3) : rnd(0.7, 0.96));
  const b = m.bounds[p.take];
  p.x = p.flip ? cx + b.cx * p.s : cx - b.cx * p.s;
  p.y = H * rnd(-0.12, 0.08) - b.y0 * p.s;
  p.placed = true;
}

/* the chalk of فصل عجيب's blackboard, drifting through space */
const MATHS = ['π', '∑', '∫', '√x', 'x²', 'E=mc²', '∞', 'Δ', 'θ', 'λ', 'f(x)', 'a²+b²', '∂', '÷', '±', '≈',
  '1', '2', '3', '5', '7', '9', 'sin θ', 'dx'];

/* ----------------------------------------------------------- particles ---
   make() places one, move() advances it by dt seconds, draw() paints it
   with the canvas already translated to its spot on screen. */
const KINDS = {
  star: {
    make: (W, H, th, o) => ({
      x: rnd(0, W), y: rnd(0, H), z: rnd(0.3, 1.25), r: rnd(0.35, 1.3),
      ph: rnd(0, TAU), sp: rnd(0.5, 2.2),
      c: o.c || (Math.random() < 0.18 ? th.accent : '#ffffff')
    }),
    draw(ctx, p, t) {
      ctx.globalAlpha = (0.2 + 0.75 * (0.5 + 0.5 * Math.sin(t * p.sp + p.ph))) * Math.min(1, p.z + 0.15);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(0, 0, p.r * (0.6 + p.z * 0.6), 0, TAU);
      ctx.fill();
    }
  },

  glyph: {
    make: (W, H, th) => ({
      x: rnd(0, W), y: rnd(0, H), z: rnd(0.35, 1.2), s: pick(MATHS), size: rnd(15, 32),
      vx: rnd(-7, 7), vy: rnd(-5, 5), rot: rnd(-0.5, 0.5), vr: rnd(-0.08, 0.08),
      c: Math.random() < 0.7 ? th.accent : th.accent2
    }),
    move(p, dt) { p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; },
    draw(ctx, p) {
      /* The copy sits over this field, and a glyph drifting under a line of
         Arabic used to compete with it. Faint enough to read as chalk left
         in the dark, never enough to fight a word. */
      ctx.rotate(p.rot);
      ctx.globalAlpha = 0.07 + 0.15 * Math.min(1, p.z);
      ctx.fillStyle = p.c;
      ctx.font = `600 ${(p.size * p.z).toFixed(1)}px Rubik, system-ui, sans-serif`;
      ctx.fillText(p.s, 0, 0);
    }
  },

  /* a played clip, not a particle: it sits where placeClip put it (no
     wrapping, no scroll), and only the pointer nudges it. The sheet is
     asked for on the first frame the clip runs, not when it is made: the
     news hero makes every headline's scene up front. */
  clip: {
    free: true,
    make: () => ({ x: 0, y: 0, z: 1, sheet: null, placed: false, side: Math.random() < 0.5 }),
    move(p, dt, t, W, H) {
      if (!p.sheet) p.sheet = leafSheet();
      const m = p.sheet.meta;
      if (!m) return;
      if (!p.placed) placeClip(p, W, H, true);
      if (p.wait > 0) { p.wait -= dt; return; }
      p.t += dt;
      if (p.t * m.fps >= m.takes[p.take].length) placeClip(p, W, H, false);
    },
    draw(ctx, p) {
      const m = p.sheet?.meta;
      if (!m || !p.placed || p.wait > 0 || !p.sheet.img.naturalWidth) return;
      const frames = m.takes[p.take];
      const i = Math.min(frames.length - 1, Math.floor(p.t * m.fps));
      const f = frames[i];
      if (!f) return;
      const k = i / (frames.length - 1);
      ctx.globalAlpha = clamp(Math.min(k / 0.14, (1 - k) / 0.22), 0, 1);
      ctx.scale(p.flip ? -p.s : p.s, p.s);
      const [x, y, w, h, ox, oy] = f;
      ctx.drawImage(p.sheet.img, x, y, w, h, ox, oy, w / m.scale, h / m.scale);
    }
  },

  fig: {
    make: (W, H) => ({
      x: rnd(0, W), y: rnd(0, H), z: rnd(0.5, 1.3), size: rnd(11, 17),
      vy: rnd(30, 52), sw: rnd(10, 22), sf: rnd(0.4, 0.9), ph: rnd(0, TAU),
      rot: rnd(-0.6, 0.6), vr: rnd(-0.6, 0.6), img: fig()
    }),
    move(p, dt, t) {
      p.y += p.vy * p.z * dt;
      p.x += Math.sin(t * p.sf + p.ph) * p.sw * dt;
      p.rot += p.vr * dt;
    },
    draw(ctx, p) {
      const img = p.img;
      if (!img.naturalWidth) return;
      const h = p.size * p.z * 2;
      const w = (h * img.naturalWidth) / img.naturalHeight;
      ctx.rotate(p.rot);
      ctx.globalAlpha = 0.8 + 0.2 * Math.min(1, p.z);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    }
  },

  /* dust and drizzle, only really visible inside غمام's spotlight */
  mote: {
    make: (W, H) => ({
      x: rnd(0, W), y: rnd(0, H), z: rnd(0.4, 1.3), r: rnd(0.5, 1.6),
      vy: rnd(6, 18), sw: rnd(4, 10), sf: rnd(0.3, 0.8), ph: rnd(0, TAU)
    }),
    move(p, dt, t) { p.y += p.vy * dt; p.x += Math.sin(t * p.sf + p.ph) * p.sw * dt; },
    draw(ctx, p, t, env) {
      /* the cone opens downward from the top centre of the screen */
      const half = env.W * 0.07 + env.sy * 0.36;
      const d = Math.abs(env.sx - env.W / 2) / half;
      const lit = d < 1 ? (1 - d) ** 1.4 : 0;
      ctx.globalAlpha = 0.05 + 0.85 * lit * Math.min(1, p.z);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, p.r * p.z, 0, TAU);
      ctx.fill();
    }
  },

  /* out of focus lights, like the blurred eyes at the edges of باب الحجرة */
  bokeh: {
    make: (W, H) => ({
      x: rnd(0, W), y: rnd(0, H), z: rnd(0.4, 1.3), r: rnd(6, 26),
      vx: rnd(-6, 6), vy: rnd(-5, 5), ph: rnd(0, TAU), sp: rnd(0.3, 0.9), c: Math.random() < 0.6 ? 0 : 1
    }),
    move(p, dt) { p.x += p.vx * dt; p.y += p.vy * dt; },
    draw(ctx, p, t, env) {
      const r = p.r * p.z;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (0.22 + 0.3 * (0.5 + 0.5 * Math.sin(t * p.sp + p.ph))) * Math.min(1, p.z);
      ctx.drawImage(env.sprites[p.c], -r, -r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  },

  spark: {
    make: (W, H, th) => ({
      x: rnd(0, W), y: rnd(0, H), z: rnd(0.4, 1.25), size: rnd(4, 10), ph: rnd(0, TAU),
      sp: rnd(0.6, 1.6), rot: rnd(0, 0.6), vr: rnd(-0.2, 0.2), vy: rnd(-4, -1), c: th.accent
    }),
    move(p, dt) { p.y += p.vy * dt; p.rot += p.vr * dt; },
    draw(ctx, p, t) {
      const pulse = 0.5 + 0.5 * Math.sin(t * p.sp + p.ph);
      const k = p.size * p.z * (0.45 + 0.55 * pulse);
      ctx.rotate(p.rot);
      ctx.scale(k, k);
      ctx.globalAlpha = (0.35 + 0.6 * pulse) * Math.min(1, p.z + 0.2);
      ctx.fillStyle = p.c;
      ctx.fill(SPARK);
    }
  }
};

/* [kind, count on a 1440 x 860 screen, options]. `fixed` counts do not
   scale with the screen: three leaves are three leaves on any phone. */
const RECIPES = {
  space: () => [['star', 190], ['glyph', 16]],
  leaves: () => [['clip', 3, { fixed: true }]],
  smoke: () => [['mote', 120]],
  eyes: () => [['bokeh', 30], ['star', 50]],
  sparkle: (th) => [['spark', 26], ['star', 60, { c: th.accent }]],
  figs: () => [['fig', 14]]
};

/* The share of the scroll the falling field takes, and whether depth slows
   it. Every scene's field sits far behind the page and creeps.

   القرد والغيلم's figs used to travel with the scroll one to one. The field
   wraps every screenful, so at one to one a screen of scrolling swapped the
   whole field for a copy of itself: the figs whipped up the screen and the
   same arrangement tiled down the page. They creep like everything else now,
   a touch faster, so the wrap stays out of sight and depth still reads. */
const SCROLL = { figs: { k: 0.3, depth: true } };
const CREEP = { k: 0.16, depth: true };

/* a soft round light, drawn once and stamped */
function glow(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, color);
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return c;
}

/* The scenery canvas. By default it is fixed to the viewport and runs for
   the life of the page (project pages). Given a `box`, it fills that
   element instead, has no scroll parallax, and only runs while the box is
   on screen and the returned controller's run(true) says so (the news
   hero, one canvas per headline). `onFrame(ptr)` gets the smoothed pointer
   each frame, -1 to 1 across the screen, so DOM layers can follow it. */
export function sceneCanvas(canvas, scene, th, onFrame, { box = null, density = 1 } = {}) {
  const ctx = canvas.getContext('2d');
  const recipe = (RECIPES[scene] || (() => []))(th);
  const still = reduced.matches;
  const env = { W: 0, H: 0, sx: 0, sy: 0, sprites: [glow(th.accent), glow(th.accent2)] };
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  let W = 0;
  let H = 0;
  let dpr = 1;
  let parts = [];
  const roll = SCROLL[scene] || CREEP;

  function resize() {
    const w = box ? box.clientWidth : innerWidth;
    const h = box ? box.clientHeight : innerHeight;
    /* a phone's toolbar changes the height on every scroll: only a real
       change of width reseeds, so nothing jumps */
    const reseed = !parts.length || Math.abs(w - W) > 80;
    W = env.W = w;
    H = env.H = h;
    dpr = canvasDpr();
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.direction = 'ltr';
    if (!reseed) return;
    const area = clamp((W * H) / (1440 * 860), 0.4, 1.5) * density;
    parts = recipe.flatMap(([kind, n, o = {}]) =>
      Array.from({ length: o.fixed ? n : Math.round(n * area) }, () => Object.assign(KINDS[kind].make(W, H, th, o), { k: KINDS[kind] })));
  }

  /* ---- a shooting star now and then, فصل عجيب only ---- */
  let shoot = null;
  let wait = 2.5;
  function shooting(dt) {
    if (!shoot) {
      wait -= dt;
      if (wait > 0) return;
      const a = rnd(0.35, 0.7);
      const sp = rnd(900, 1400);
      shoot = { x: rnd(W * 0.3, W * 1.1), y: rnd(-40, H * 0.4), vx: -Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rnd(0.6, 1) };
    }
    shoot.life += dt;
    shoot.x += shoot.vx * dt;
    shoot.y += shoot.vy * dt;
    const k = shoot.life / shoot.max;
    if (k >= 1) { shoot = null; wait = rnd(3, 8); return; }
    const tx = shoot.x - shoot.vx * 0.09;
    const ty = shoot.y - shoot.vy * 0.09;
    const g = ctx.createLinearGradient(shoot.x, shoot.y, tx, ty);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = Math.sin(k * Math.PI);
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(shoot.x, shoot.y);
    ctx.lineTo(tx, ty);
    ctx.stroke();
  }

  let last = 0;
  let moved = 0;
  let wander = 0;
  const M = 80;   // margin, so nothing pops in at an edge

  function frame(now) {
    const t = now / 1000;
    const dt = last ? Math.min(t - last, 0.05) : 0;
    last = t;

    /* no pointer (a phone, or a mouse at rest): the view drifts on its own */
    if (!still && now - moved > 4000 && t > wander) {
      ptr.tx = rnd(-0.6, 0.6);
      ptr.ty = rnd(-0.4, 0.4);
      wander = t + rnd(3, 5);
    }
    const ease = 1 - Math.pow(0.03, dt);
    ptr.x += (ptr.tx - ptr.x) * ease;
    ptr.y += (ptr.ty - ptr.y) * ease;

    const scroll = still || box ? 0 : scrollY;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      if (!still && p.k.move) p.k.move(p, dt, t, W, H);
      if (p.k.free) {
        env.sx = p.x - ptr.x * p.z * 22;
        env.sy = p.y - ptr.y * p.z * 12;
      } else {
        env.sx = mod(p.x - ptr.x * p.z * 22 + M, W + M * 2) - M;
        env.sy = mod(p.y - scroll * (roll.depth ? p.z : 1) * roll.k - ptr.y * p.z * 12 + M, H + M * 2) - M;
      }
      ctx.setTransform(dpr, 0, 0, dpr, env.sx * dpr, env.sy * dpr);
      p.k.draw(ctx, p, t, env);
    }
    if (scene === 'space' && !still) shooting(dt);
    ctx.globalAlpha = 1;
    onFrame?.(ptr, t);
  }

  resize();
  let rt;
  const onResize = () => {
    clearTimeout(rt);
    rt = setTimeout(() => { resize(); if (still) frame(0); }, 120);
  };
  if (box) new ResizeObserver(onResize).observe(box);
  else addEventListener('resize', onResize);
  addEventListener('litechange', onResize);

  if (still) { frame(0); return { run() {} }; }

  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    moved = e.timeStamp;
    ptr.tx = (e.clientX / innerWidth) * 2 - 1;
    ptr.ty = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  if (!box) { tick(frame); return { run() {} }; }

  let stop = null;
  let want = false;
  let seen = false;
  const sync = () => {
    const go = want && seen;
    if (go && !stop) { last = 0; stop = tick(frame); }
    else if (!go && stop) { stop(); stop = null; }
  };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; sync(); }).observe(box);
  return { run(on) { want = on; sync(); } };
}

/* One set piece on its own, for pages that build their own stage. */
export const scenePiece = (scene, th) => PIECES[scene]?.(th) || null;

/* ------------------------------------------------------------- the hero ---
   Clouds (the house decoration) in two layers, a brush mark or two, and
   the scene's set piece. Returns a per frame hook for anything that
   follows the pointer, or null. */

const CLOUD_LOOK = {
  leaves: { a: 0.95, b: 1 },
  smoke: { a: 0.9, b: 2.4 },
  eyes: { a: 0.5, b: 2 },
  sparkle: { a: 0.55, b: 1.4 },
  space: { a: 0.32, b: 4 },
  figs: { a: 1, b: 1 }
};

/* x, y are percentages of the hero, w is rem, b blur, f flips, d drift seed */
const BACK = [
  { x: -9, y: 8, w: 24, b: 4, d: 1 },
  { x: 76, y: -2, w: 30, b: 8, f: 1, d: 2 },
  { x: 84, y: 50, w: 17, b: 2, d: 3 },
  { x: -15, y: 54, w: 28, b: 10, f: 1, d: 4 },
  { x: 38, y: -12, w: 20, b: 14, d: 5 }
];
/* the near layer hangs over the player's top corners, never over the copy */
const FRONT = [
  { x: -14, y: 80, w: 30, b: 0, d: 6 },
  { x: 72, y: 86, w: 32, b: 1, f: 1, d: 7 }
];

/* [icon, colour key, x %, y %, size rem] */
const MARKS = {
  leaves: [['swash', 'accent', 8, 30, 3.5]],
  eyes: [['asterisk', 'accent2', 80, 30, 3], ['asterisk', 'accent2', 13, 70, 2]],
  sparkle: [['sparkles', 'accent', 82, 22, 3.25], ['sparkles', 'accent', 10, 64, 2.5]],
  space: [['sparkles', 'accent2', 86, 70, 3]],
  figs: [['smile', 'accent2', 84, 26, 3], ['sparkles', 'accent', 10, 30, 2.5]],
  smoke: []
};

function cloud(c, look, tint) {
  return el('i', {
    class: 'cloud',
    'data-seed': c.d,
    'data-flip': c.f ? '1' : null,
    'aria-hidden': 'true',
    style: `left:${c.x}%;top:${c.y}%;width:min(${c.w}rem, ${(c.w * 2.4).toFixed(1)}vw);`
         + `filter:blur(${(c.b * look.b).toFixed(1)}px);opacity:${look.a};--cloud-color:${tint};`
         + (c.f ? 'transform:scaleX(-1);' : '')
  });
}

export function dressHero(back, front, scene, th) {
  const look = CLOUD_LOOK[scene] || CLOUD_LOOK.leaves;
  const piece = PIECES[scene]?.(th);
  if (piece) back.append(piece.node);
  back.append(...BACK.map((c) => cloud(c, look, th.cloud)));
  (MARKS[scene] || []).forEach(([icon, key, x, y, s]) => back.append(el('i', {
    class: `mark mark--${icon} strew`,
    'aria-hidden': 'true',
    style: `--mark-color:${th[key]};left:${x}%;top:${y}%;width:${s}rem;aspect-ratio:1;--sway:${rnd(10, 15).toFixed(1)}s;`
  })));
  front.append(...FRONT.map((c) => cloud(c, look, th.cloud)));

  if (!reduced.matches) {
    whileVisible(back, cloudDrift(back));
    whileVisible(front, cloudDrift(front));
  }
  return piece?.follow || null;
}

/* ---- set pieces ---- */

const PIECES = {
  /* فصل عجيب: the black hole and its numbered orbits, off to the left */
  space(th) {
    const rings = [[150, 3, 70], [215, 2.4, -95], [290, 2, 130], [375, 1.6, -170], [465, 1.3, 220]];
    let svg = `<svg viewBox="-500 -500 1000 1000" aria-hidden="true"><defs>`
      + `<radialGradient id="holeRing"><stop offset=".55" stop-color="${th.accent2}" stop-opacity="0"/>`
      + `<stop offset=".72" stop-color="${th.accent2}" stop-opacity=".95"/><stop offset=".8" stop-color="#fff3d6" stop-opacity=".9"/>`
      + `<stop offset="1" stop-color="${th.accent2}" stop-opacity="0"/></radialGradient>`
      + `<radialGradient id="holeHalo"><stop offset="0" stop-color="${th.accent2}" stop-opacity=".35"/>`
      + `<stop offset="1" stop-color="${th.accent2}" stop-opacity="0"/></radialGradient></defs>`
      + `<circle r="260" fill="url(#holeHalo)"/>`;
    rings.forEach(([r, w, s], i) => {
      const n = 8 + i * 3;
      let marks = '';
      for (let j = 0; j < n; j++) {
        const label = j % 3 === 0 ? String(((i * 7 + j) % 9) + 1) : '-';
        marks += `<text transform="rotate(${((j / n) * 360).toFixed(1)}) translate(0 ${-r - 14})" text-anchor="middle">${label}</text>`;
      }
      svg += `<g class="orbit__ring" style="--spin:${Math.abs(s)}s;animation-direction:${s < 0 ? 'reverse' : 'normal'}">`
        + `<circle r="${r}" fill="none" stroke="${th.accent}" stroke-width="${w}" stroke-opacity="${(0.85 - i * 0.12).toFixed(2)}"/>`
        + `<g fill="${th.accent}" fill-opacity="${(0.75 - i * 0.1).toFixed(2)}" font-size="${22 - i * 1.5}" font-family="Rubik, sans-serif" font-weight="600">${marks}</g></g>`;
    });
    svg += `<circle r="120" fill="url(#holeRing)"/><circle r="86" fill="#04030c"/></svg>`;
    return { node: el('div', { class: 'orbit', html: svg }) };
  },

  /* غمام: one hard light from above, pooling on the floor */
  smoke() {
    return { node: el('div', { class: 'spot', 'aria-hidden': 'true' }, el('i', { class: 'spot__beam' }), el('i', { class: 'spot__pool' })) };
  },

  /* سمرقند and القرد والغيلم: sun behind the clouds */
  leaves() { return { node: el('i', { class: 'sun', 'aria-hidden': 'true' }) }; },
  figs() { return { node: el('i', { class: 'sun', 'aria-hidden': 'true' }) }; },

  /* اللص التقي: the thin swirling lines drawn across the thumbnail */
  sparkle() {
    const paths = [
      'M-50 420 C 180 300, 320 520, 560 380 S 900 180, 1250 320',
      'M-40 160 C 220 60, 420 260, 700 140 S 1080 40, 1260 120',
      'M-60 600 C 260 520, 520 700, 820 560 S 1120 480, 1260 560'
    ];
    return {
      node: el('div', {
        class: 'swirls',
        html: `<svg viewBox="0 0 1200 700" preserveAspectRatio="none" aria-hidden="true">`
          + paths.map((d, i) => `<path d="${d}" pathLength="1" style="--i:${i}"/>`).join('') + '</svg>'
      })
    };
  },

  /* باب الحجرة: eyes in the dark. They blink on their own clocks, and
     every iris turns toward the pointer. */
  eyes(th) {
    /* x %, y %, width rem, blur px (depth of field), tilt deg */
    const EYES = [
      [3, 10, 7.5, 0, -8], [15, 36, 4.5, 1.5, 6], [6, 60, 10, 6, -4], [19, 80, 5, 0, 10],
      [28, 6, 3.5, 2.5, -12], [68, 4, 4, 1.5, 8], [82, 16, 8, 0, -6], [91, 42, 5, 2, 12],
      [76, 58, 11, 7, -10], [88, 78, 4.5, 0, 4], [62, 84, 3.5, 2.5, -8], [36, 88, 6.5, 4, 6]
    ];
    const LID = 'M4 30 Q60 -6 116 30 Q60 66 4 30Z';
    const wrap = el('div', {
      class: 'eyes',
      'aria-hidden': 'true',
      html: `<svg width="0" height="0" style="position:absolute"><defs><clipPath id="eyeLid"><path d="${LID}"/></clipPath>`
        + `<radialGradient id="eyeIris" cx=".42" cy=".38" r=".7"><stop offset="0" stop-color="#ffffff"/>`
        + `<stop offset=".45" stop-color="${th.accent}"/><stop offset="1" stop-color="#2d5fb8"/></radialGradient></defs></svg>`
    });
    const eyes = EYES.map(([x, y, w, b, r]) => {
      const node = el('div', {
        class: 'eye',
        style: `left:${x}%;top:${y}%;width:${w}rem;rotate:${r}deg;--blur:${b}px;`
             + `--blink:${rnd(4.5, 9).toFixed(2)}s;--delay:${(-rnd(0, 9)).toFixed(2)}s;`,
        html: `<svg viewBox="0 0 120 60"><path d="${LID}" fill="#0c0518"/>`
          + `<g clip-path="url(#eyeLid)"><g class="eye__ball"><circle cx="60" cy="30" r="19" fill="url(#eyeIris)"/>`
          + `<circle cx="60" cy="30" r="7.5" fill="#0a0f26"/><circle cx="54" cy="23.5" r="3.2" fill="#fff"/></g></g>`
          + `<path d="${LID}" fill="none" stroke="${th.accent}" stroke-opacity=".55" stroke-width="2.5"/></svg>`
      });
      wrap.append(node);
      return { node, ball: node.querySelector('.eye__ball') };
    });

    let seen = true;
    new IntersectionObserver(([e]) => { seen = e.isIntersecting; }).observe(wrap);

    const follow = (ptr) => {
      if (!seen) return;
      const px = ((ptr.x + 1) / 2) * innerWidth;
      const py = ((ptr.y + 1) / 2) * innerHeight;
      /* every read before any write: measuring after moving an iris would
         make the browser restyle the page once per eye, every frame */
      const boxes = eyes.map((e) => e.node.getBoundingClientRect());
      eyes.forEach((e, i) => {
        const r = boxes[i];
        const dx = px - (r.left + r.width / 2);
        const dy = py - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const f = clamp(d / 260, 0.2, 1);
        e.ball.style.transform = `translate(${((dx / d) * 13 * f).toFixed(2)}px,${((dy / d) * 7 * f).toFixed(2)}px)`;
      });
    };
    return { node: wrap, follow: reduced.matches ? null : follow };
  }
};
