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
