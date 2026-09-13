/* ============================================================
   مَنْ نَحْنُ: the cast loop and its clouds.

   The video costs nothing until the section is a screen away,
   plays once it is actually on screen, and pauses when it
   leaves. Reduced motion keeps the poster frame and still
   clouds.
   ============================================================ */

import { $, afterLoad, cloudDrift, norm, reduced, whileVisible } from './util.js';

export function initAbout() {
  const section = $('#about');
  const art = $('.about__art');
  const video = $('#aboutVideo');
  if (!section || !art || !video || reduced.matches) return;

  whileVisible(section, cloudDrift(section));

  /* On a phone the news block is only half a screen, so the cast shows
     before the reader has asked for it. It waits under a blue fog, blurred
     and still. The fog lifts with the scroll and is gone once the art has
     climbed into the top fifth of the screen. The video plays only once the
     fog is mostly gone. */
  const phone = matchMedia('(max-width: 880px)');
  let fog = phone.matches ? 1 : 0;
  let onScreen = false;
  /* The tint follows the scroll frame by frame, because an opacity costs
     nothing to change. The blur is held to eighths of the same lift: every
     new radius redraws the cast, so a fresh one on every frame is the most
     expensive thing on the section, and eight steps look the same. */
  const STEP = 8;
  let step = Math.round(fog * STEP);
  art.style.setProperty('--fog', fog);
  art.style.setProperty('--fogstep', step / STEP);

  const sync = () => {
    const want = onScreen && fog < 0.35;
    /* play() can still be refused (low power mode). The poster stays up. */
    if (want && video.paused) video.play().catch(() => {});
    else if (!want && !video.paused) video.pause();
  };

  whileVisible(section, () => {
    const f = phone.matches
      ? norm(art.getBoundingClientRect().top, innerHeight * 0.18, innerHeight * 0.55)
      : 0;
    if (f === fog) return;
    fog = f;
    art.style.setProperty('--fog', f.toFixed(3));
    const s = Math.round(f * STEP);
    if (s !== step) art.style.setProperty('--fogstep', (step = s) / STEP);
    sync();
  });

  /* fetch a screen early so the first frame is ready when the reader
     arrives, but never before the first screen has finished loading: on a
     wide screen this section starts right under the hero */
  afterLoad(() => new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    video.preload = 'auto';
    video.load();
    io.disconnect();
  }, { rootMargin: '0px 0px 100% 0px' }).observe(video));

  new IntersectionObserver(([e]) => {
    onScreen = e.intersectionRatio >= 0.3;
    sync();
  }, { threshold: [0, 0.3] }).observe(video);
}
