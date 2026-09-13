/* Small shared helpers. One rAF loop for the whole page. */

export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'style') node.style.cssText = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    node.append(kid.nodeType ? kid : document.createTextNode(kid));
  }
  return node;
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/* map v from [a,b] onto [0,1], clamped */
export const norm = (v, a, b) => clamp((v - a) / (b - a || 1), 0, 1);

/* ---------------------------------------------------------- ticker ------
   Every animated module subscribes here instead of starting its own loop.
   Subscribers that return false are skipped until they ask to run again.
------------------------------------------------------------------------- */
const jobs = new Set();
let running = false;

function frame(t) {
  for (const job of jobs) job(t);
  if (!lite.on) judge(t);
  running = jobs.size > 0;
  if (running) requestAnimationFrame(frame);
}

/* ------------------------------------------------------------- lite -----
   A device that cannot keep up gets `html.lite`: the same motion, minus
   the effects that cost the most every frame (layer blurs, backdrop blurs,
   full resolution canvases). Weak hardware starts there. Anything else is
   judged by its own frames while something animates: two windows in a row
   where most frames miss about 40 fps. It never switches back, so the page
   cannot flicker between the two looks. Modules that size canvases listen
   for `litechange`.
------------------------------------------------------------------------- */
export const lite = { on: false };

function goLite() {
  if (lite.on) return;
  lite.on = true;
  document.documentElement.classList.add('lite');
  dispatchEvent(new CustomEvent('litechange'));
}

if ((navigator.deviceMemory || 8) <= 2 || (navigator.hardwareConcurrency || 8) <= 2) goLite();

/* A phone starts here too, without waiting to be judged. The costly effects
   are the full screen backdrop blurs and the blurred comment field, and a
   handset pays for those on the very first frame: by the time the judge has
   watched two windows of dropped frames the reader has already scrolled
   through the part that stuttered. The look barely changes at this size. */
if (matchMedia('(max-width: 760px) and (pointer: coarse)').matches) goLite();

/* the first moments after load are image decodes, not the device's pace */
let calm = Infinity;
if (document.readyState === 'complete') calm = performance.now() + 1500;
else addEventListener('load', () => { calm = performance.now() + 1500; }, { once: true });

let before = 0;
let seen = 0;
let slow = 0;
let strikes = 0;
function judge(t) {
  const dt = before ? t - before : 0;
  before = t;
  /* a gap this long is a hidden tab or a restart, not a frame */
  if (!dt || dt > 250 || t < calm) return;
  seen++;
  if (dt > 25) slow++;
  if (seen < 120) return;
  strikes = slow > seen / 2 ? strikes + 1 : 0;
  seen = slow = 0;
  if (strikes >= 2) goLite();
}

/* Canvas resolution: the screen's, up to 2x. Lite stops at 1.5x. */
export const canvasDpr = () => Math.min(window.devicePixelRatio || 1, lite.on ? 1.5 : 2);

/* ------------------------------------------------------- after load -----
   Anything that is not on the first screen waits until the page has
   loaded and the main thread is free, so it never competes with the hero
   for the network. */
export function afterLoad(fn, timeout = 2000) {
  const idle = () => ('requestIdleCallback' in window ? requestIdleCallback(() => fn(), { timeout }) : setTimeout(fn, 200));
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
}

export function tick(fn) {
  jobs.add(fn);
  if (!running) {
    running = true;
    requestAnimationFrame(frame);
  }
  return () => jobs.delete(fn);
}

/* ---------------------------------------------------------- springs -----
   Apple's pair: response in seconds, and a damping ratio where 1 settles
   with no overshoot and lower bounces. There is no fixed duration, so a new
   target mid flight carries the current velocity with it. `step` returns
   false once the spring has settled.
------------------------------------------------------------------------- */
export function spring(response, damping) {
  return {
    x: 0, v: 0, to: 0,
    k: (2 * Math.PI / response) ** 2,
    c: (4 * Math.PI * damping) / response
  };
}

export function step(s, dt) {
  s.v += (-s.k * (s.x - s.to) - s.c * s.v) * dt;
  s.x += s.v * dt;
  if (Math.abs(s.v) > 1e-4 || Math.abs(s.x - s.to) > 1e-4) return true;
  s.x = s.to;
  s.v = 0;
  return false;
}

/* Runs `fn` only while `target` is anywhere near the viewport. */
export function whileVisible(target, fn, margin = '35% 0px') {
  let stop = null;
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting && !stop) stop = tick(fn);
    else if (!entry.isIntersecting && stop) { stop(); stop = null; }
  }, { rootMargin: margin }).observe(target);
}

/* Each cloud keeps its own slow shake so a layer never looks pasted on.
   Returns a ticker job. `host` is re-queried every frame because the hero
   swaps its clouds out from under it. */
export function cloudDrift(host) {
  return (t) => {
    const s = t * 0.001;
    for (const cloud of host.querySelectorAll('.cloud')) {
      const k = +cloud.dataset.seed || 0;
      const x = Math.sin(s * 0.34 + k * 1.7) * (5 + k * 0.9);
      const y = Math.cos(s * 0.27 + k * 2.3) * (4 + k * 0.7);
      const r = Math.sin(s * 0.19 + k) * 0.7;
      const flip = cloud.dataset.flip ? ' scaleX(-1)' : '';
      cloud.style.transform = `translate3d(${x}px,${y}px,0) rotate(${r}deg)${flip}`;
    }
  };
}

/* Arabic-Indic digits, because the rest of the page is set in them. */
const AR = '٠١٢٣٤٥٦٧٨٩';
export const arabize = (s) => String(s).replace(/\d/g, (d) => AR[+d]);
