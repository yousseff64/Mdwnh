/* ═══════════════════════════════════════════════════════════════════════
   المدونة / MDWNH STUDIO, production: public behaviour. One IIFE, sectioned.
   Copied from Satr's script.js; only the prefetch scope changed.
   Native scrolling throughout: nothing here intercepts the wheel or touch.
   ═══════════════════════════════════════════════════════════════════════ */
(() => {
"use strict";

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const rtl = document.documentElement.dir === "rtl";
const lang = document.documentElement.lang;

/* ── Header: away on the way down, back on the way up ──
   Direction is accumulated and only flips after 24px one way, or a
   trackpad's 1px tail makes it flicker. Always shown near the top. */
const hd = document.querySelector("[data-hd]");
let lastY = scrollY, acc = 0;
addEventListener("scroll", () => {
  const y = scrollY, d = y - lastY;
  lastY = y;
  if (!hd) return;
  if (y < 140 || document.body.classList.contains("menu-open")) {
    hd.classList.remove("up"); acc = 0; return;
  }
  acc = Math.sign(d) === Math.sign(acc) ? acc + d : d;
  if (acc > 24) hd.classList.add("up");
  else if (acc < -24) hd.classList.remove("up");
}, { passive: true });

/* ── Menu (phones) ── */
const menuBtn = document.querySelector(".hd-menu");
const menu = document.getElementById("menu");
if (menuBtn && menu) {
  const set = open => {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.textContent = open ? (lang === "ar" ? "إغلاق" : "Close") : (lang === "ar" ? "القائمة" : "Menu");
    document.body.classList.toggle("menu-open", open);
  };
  menuBtn.addEventListener("click", () => set(menu.hidden));
  menu.addEventListener("click", e => { if (e.target.closest("a")) set(false); });
  addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) { set(false); menuBtn.focus(); } });
}

/* ── The work rail: arrows + filters (Meshbak's) ──
   scrollLeft is negative in an RTL scroller in every current engine, so
   positions are read as magnitudes and the step's sign follows the
   direction. Arrows exist only while there is somewhere to go. */
document.querySelectorAll("[data-works]").forEach(sec => {
  const rail = sec.querySelector("[data-rail]");
  const prev = sec.querySelector(".rail-btn.prev");
  const next = sec.querySelector(".rail-btn.next");
  if (!rail) return;

  const update = () => {
    const max = rail.scrollWidth - rail.clientWidth;
    const pos = Math.abs(rail.scrollLeft);
    const over = max > 4;
    if (prev) prev.hidden = !over || pos < 4;
    if (next) next.hidden = !over || pos > max - 4;
  };
  const step = () => {
    const c = rail.querySelector(".card:not([hidden])");
    return c ? c.getBoundingClientRect().width + 12 : 260;
  };
  const go = dir => rail.scrollBy({
    left: dir * step() * 2 * (rtl ? -1 : 1),
    behavior: reduced ? "auto" : "smooth"
  });
  prev?.addEventListener("click", () => go(-1));
  next?.addEventListener("click", () => go(1));
  rail.addEventListener("scroll", update, { passive: true });
  addEventListener("resize", update);
  update();

  const btns = sec.querySelectorAll(".filters [data-f]");
  btns.forEach(b => b.addEventListener("click", () => {
    const f = b.dataset.f;
    btns.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    rail.querySelectorAll(".card").forEach(c => {
      c.hidden = !(f === "all" || c.dataset.k.split(" ").includes(f));
    });
    rail.scrollTo({ left: 0 });
    update();
  }));
});

/* ── Partners: two rows drifting opposite ways, and draggable ──
   Satr's, brought over as it is. Each row's marks are cloned until a copy
   can always fill the screen, and the track moves by transform; x wraps by
   one set's width, so the loop has no seam. A drag moves the row under the
   pointer and lets go with its own speed, which eases back to the drift.
   Move/up listen on window and the mouse pointerdown is preventDefault'ed:
   a native image drag or a text selection would otherwise steal the
   gesture. Touch keeps the page's own vertical scroll (touch-action:pan-y):
   only a sideways drag is ours, and the wheel is never touched. Under
   reduced motion the rows hold still but still drag. Off screen, the loop
   stops. */
const mq = document.querySelector("[data-mq]");
if (mq) {
  const DRIFT = reduced ? 0 : 26;                  // px per second
  const rows = [...mq.querySelectorAll("[data-mq-row]")].map((row, i) => ({
    row, track: row.firstElementChild, dir: i % 2 ? 1 : -1, x: 0, w: 0, v: 0, drag: null
  }));
  const wrap = r => { if (r.w) { r.x %= r.w; if (r.x > 0) r.x -= r.w; } };
  const place = r => { r.track.style.transform = `translate3d(${r.x}px,0,0)`; };
  const fill = () => {
    mq.classList.add("on");
    rows.forEach((r, i) => {
      r.track.querySelectorAll("[data-clone]").forEach(n => n.remove());
      const set = [...r.track.children];
      r.w = r.track.getBoundingClientRect().width;
      if (!r.w) return;
      const copies = Math.ceil(r.row.clientWidth / r.w) + 1;
      for (let c = 0; c < copies; c++) set.forEach(li => {
        const n = li.cloneNode(true);
        n.dataset.clone = "";
        n.setAttribute("aria-hidden", "true");
        n.querySelector("img").alt = "";
        r.track.append(n);
      });
      if (!r.x) r.x = -r.w * (i ? .5 : 0);       // the second row starts mid-set
      wrap(r); place(r);
    });
  };
  fill();
  let rw = innerWidth;
  addEventListener("resize", () => { if (innerWidth !== rw) { rw = innerWidth; fill(); } });

  let raf = 0, last = 0;
  const tick = t => {
    const dt = Math.min(.05, (t - (last || t)) / 1000);
    last = t;
    rows.forEach(r => {
      if (r.drag) return;
      r.v += (r.dir * DRIFT - r.v) * (1 - Math.exp(-dt * 4));
      r.x += r.v * dt;
      wrap(r); place(r);
    });
    raf = requestAnimationFrame(tick);
  };
  new IntersectionObserver(([e]) => {
    cancelAnimationFrame(raf); last = 0;
    if (e.isIntersecting) raf = requestAnimationFrame(tick);
  }).observe(mq);

  rows.forEach(r => r.row.addEventListener("pointerdown", e => {
    if (e.button > 0 || r.drag) return;
    if (e.pointerType === "mouse") e.preventDefault();
    r.drag = { id: e.pointerId, px: e.clientX, x0: r.x, lx: e.clientX, lt: e.timeStamp };
    r.v = 0;
    r.row.classList.add("drag");
  }));
  addEventListener("pointermove", e => rows.forEach(r => {
    const d = r.drag;
    if (!d || d.id !== e.pointerId) return;
    r.x = d.x0 + e.clientX - d.px;
    const dt = (e.timeStamp - d.lt) / 1000;
    if (dt > 0) r.v = r.v * .6 + (e.clientX - d.lx) / dt * .4;
    d.lx = e.clientX; d.lt = e.timeStamp;
    wrap(r); place(r);
  }));
  const release = e => rows.forEach(r => {
    if (!r.drag || r.drag.id !== e.pointerId) return;
    if (e.timeStamp - r.drag.lt > 80) r.v = 0;     // held still before letting go: no fling
    r.v = Math.max(-2400, Math.min(2400, r.v));
    r.drag = null;
    r.row.classList.remove("drag");
  });
  addEventListener("pointerup", release);
  addEventListener("pointercancel", release);
}

/* ── The hero, moving ──
   The hero paints as a still (preloaded, a few KB) and nothing on the first
   screen waits for the video. Only once the page has loaded, and the
   browser is idle, is the loop asked for: the 8 second camera tilt up the
   library, dissolving back into its start (tools/build-assets.py
   hero-loop). It starts on the very frame the still shows and fades in over
   it, so the moment it takes over is invisible. Phones (the hero is taller
   than wide there) get the narrow cut, a fifth of the size. Never under
   reduced motion, never on Save-Data or a 2G/3G connection, and it pauses
   whenever the hero is off screen. Silent: muted, and the file has no
   audio track at all. */
const heroLoop = document.querySelector("[data-hero-loop]");
if (heroLoop && !reduced) {
  const net = navigator.connection;
  const slow = net && (net.saveData || /2g|3g/.test(net.effectiveType || ""));
  if (!slow) {
    const start = () => {
      const v = document.createElement("video");
      v.className = "hero-vid";
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = "auto";
      v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
      v.setAttribute("aria-hidden", "true");
      v.disablePictureInPicture = true;
      v.src = matchMedia("(max-width: 600px)").matches ? heroLoop.dataset.srcTall : heroLoop.dataset.src;
      v.addEventListener("playing", () => v.classList.add("on"), { once: true });
      heroLoop.append(v);
      new IntersectionObserver(([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else v.pause();
      }).observe(heroLoop);
    };
    const later = () => (window.requestIdleCallback ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 200));
    if (document.readyState === "complete") later();
    else addEventListener("load", later, { once: true });
  }
}

/* ── Entrances: one observer for every .reveal ──
   Fires once the element's top is a little way into the screen, so it
   plays where the eye is, not in the corner of it. */
const els = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window && !reduced) {
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add("in");
    io.unobserve(e.target);
  }), { rootMargin: "0px 0px -10% 0px" });
  els.forEach(el => io.observe(el));
} else {
  els.forEach(el => el.classList.add("in"));
}

/* ── Loops: silent, and only while on screen ──
   preload="none" in the markup, so nothing is fetched until the clip is
   near; play() is what loads it. Under reduced motion the poster stays. */
const loops = document.querySelectorAll("video[data-loop]");
if (loops.length && !reduced && "IntersectionObserver" in window) {
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    v.muted = true;
    if (e.isIntersecting) v.play().catch(() => {});
    else v.pause();
  }), { rootMargin: "120px 0px" });
  loops.forEach(v => vio.observe(v));
}

/* ── Instant navigation where speculation rules are not supported ──
   Chrome/Edge prerender on hover from the <script type="speculationrules">
   in <head>. Safari and Firefox ignore that block (and Safari ignores
   rel=prefetch), so here a hovered or touched same-site link is fetched at
   low priority; the click then comes out of the HTTP cache. */
if (!(HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules"))) {
  const warmed = new Set();
  const warm = e => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.target || a.origin !== location.origin || a.pathname === location.pathname
        || !a.pathname.startsWith("/production/") || warmed.has(a.pathname)) return;
    warmed.add(a.pathname);
    fetch(a.href, { priority: "low", credentials: "same-origin" }).catch(() => {});
  };
  addEventListener("pointerover", warm, { passive: true });
  addEventListener("touchstart", warm, { passive: true });
}
})();
