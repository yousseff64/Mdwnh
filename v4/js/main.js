import { initHero } from './hero.js';
import { initMarquee } from './marquee.js';
import { initFall } from './fall.js';
import { initAbout } from './about.js';
import { initContribute } from './contribute.js';
import { initWins } from './wins.js';
import { initCommunity } from './community.js';
import { initNav, initRails, initReveal, initCards, initFooter } from './ambient.js';
import { afterLoad } from './util.js';
import { paintLive } from './live.js';

paintLive();         /* the numbers written into the copy, from assets/stats-data.js */
initNav();
initRails();
initCards();
initReveal();
initHero();
initAbout();
initMarquee();
initWins();          /* after initCards: it counts up the stat cards */
initContribute();
initCommunity();     /* after initCards: it springs the platform stickers */

/* The fall is the heaviest thing on the page (a 480 KB atlas) and it lives
   well below the fold. It starts once the first screen has loaded and the
   page is idle, or sooner if the reader is already heading for it. */
let fell = false;
const fall = () => {
  if (fell) return;
  fell = true;
  initFall();
};
afterLoad(fall, 1500);
const voices = document.getElementById('voices');
if (voices) {
  new IntersectionObserver(([e], io) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    fall();
  }, { rootMargin: '150% 0px' }).observe(voices);
}
