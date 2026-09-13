/* ============================================================
   MDWNH STUDIO — Site Script (v3, rebuilt)
   Lean + IntersectionObserver-gated. No always-on loops.
   Data comes from projects-data.js (PROJECTS, LATEST_VIDEOS, …).
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    /* ================= 1. Navbar ================= */
    const navbar = document.getElementById('navbar');
    const heroSection = document.getElementById('hero');

    // Solid navbar once hero scrolled past (cheap: observe hero top)
    if (navbar && heroSection) {
        new IntersectionObserver(([entry]) => {
            navbar.classList.toggle('solid', !entry.isIntersecting);
        }, { rootMargin: '-80px 0px 0px 0px' }).observe(heroSection);
    }

    // Mobile drawer (slides from right + frosted backdrop)
    const toggle = document.querySelector('.mobile-menu-toggle');
    const drawer = document.getElementById('mobile-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (toggle && drawer) {
        const setDrawer = (open) => {
            drawer.classList.toggle('active', open);
            toggle.classList.toggle('open', open);
            if (backdrop) backdrop.classList.toggle('active', open);
            toggle.setAttribute('aria-expanded', open);
        };
        toggle.addEventListener('click', () => setDrawer(!drawer.classList.contains('active')));
        drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setDrawer(false)));
        if (backdrop) backdrop.addEventListener('click', () => setDrawer(false));
    }

    // Scroll-spy: highlight active section link
    const spyLinks = document.querySelectorAll('.nav-links a[data-spy]');
    if (spyLinks.length) {
        const map = {};
        spyLinks.forEach(a => { map[a.getAttribute('href').slice(1)] = a; });
        const spyIO = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const link = map[entry.target.id];
                if (link && entry.isIntersecting) {
                    spyLinks.forEach(a => a.classList.remove('active'));
                    link.classList.add('active');
                }
            });
        }, { rootMargin: '-40% 0px -55% 0px' });
        Object.keys(map).forEach(id => {
            const sec = document.getElementById(id);
            if (sec) spyIO.observe(sec);
        });
    }

    /* ================= 2. Scroll reveal (once) ================= */
    const revealIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in');
                revealIO.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => revealIO.observe(el));

    /* ================= 3. Pause looping anims off-screen ================= */
    const animIO = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            entry.target.classList.toggle('anim-off', !entry.isIntersecting);
        });
    });
    document.querySelectorAll('.clients-section, .yt-section').forEach(el => {
        el.classList.add('anim-off');
        animIO.observe(el);
    });

    /* ================= 4. Hero: pause video off-screen ================= */
    const heroVideo = document.getElementById('hero-video');
    if (heroVideo && heroSection) {
        new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                heroVideo.play().catch(() => { });
            } else {
                heroVideo.pause();
            }
        }, { threshold: 0.1 }).observe(heroSection);
    }

    /* ================= 5. Cycling text (bouncy, word-aware verb) ================= */
    (function initCyclingText() {
        const list = document.querySelector('.cycling-list');
        const container = document.querySelector('.cycling-container');
        const verbEl = document.getElementById('m-verb');
        if (!list || !container) return;

        const baseItems = Array.from(list.querySelectorAll('.cycling-item'));
        if (!baseItems.length) return;
        const words = baseItems.map(i => i.textContent.trim());
        list.appendChild(baseItems[0].cloneNode(true)); // seamless loop clone

        // Feminine agreement → تتوافق, otherwise يتوافق. True crossfade (no blank frame).
        const FEMININE = new Set(['موشن جرافكس', 'تصاميم', 'كتابة محتوى']);
        if (verbEl && !verbEl.querySelector('.m-verb-cur')) {
            verbEl.innerHTML = `<span class="m-verb-cur">${verbEl.textContent.trim()}</span>`;
        }
        let curVerb = verbEl ? verbEl.querySelector('.m-verb-cur').textContent.trim() : '';
        const setVerb = (word) => {
            if (!verbEl) return;
            const target = FEMININE.has(word) ? 'تتوافق' : 'يتوافق';
            if (curVerb === target) return;

            const cur = verbEl.querySelector('.m-verb-cur');
            const ghost = cur.cloneNode(true);         // old word, fades out
            ghost.className = 'm-verb-ghost';
            verbEl.appendChild(ghost);

            cur.textContent = target;                  // new word, fades in
            cur.classList.add('swap-in');
            void verbEl.offsetWidth;
            cur.classList.remove('swap-in');
            requestAnimationFrame(() => ghost.classList.add('out'));

            curVerb = target;
            setTimeout(() => ghost.remove(), 340);
        };

        let widths = [];
        let idx = 0;
        let timer = null;
        let itemH = 0;

        const measure = () => {
            const items = list.querySelectorAll('.cycling-item');
            itemH = items[0].getBoundingClientRect().height;
            widths = Array.from(items).map(i => i.getBoundingClientRect().width + 8);
            container.style.width = widths[idx % widths.length] + 'px';
        };

        const step = () => {
            const total = words.length;
            idx++;
            container.style.width = widths[idx % (widths.length)] + 'px';
            list.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.45, 0.64, 1)';
            list.style.transform = `translateY(-${idx * itemH}px)`;
            setVerb(words[idx % total]);
            if (idx === total) {
                // reached the clone of word[0] → snap back invisibly
                setTimeout(() => {
                    list.style.transition = 'none';
                    idx = 0;
                    list.style.transform = 'translateY(0)';
                    container.style.width = widths[0] + 'px';
                }, 620);
            }
        };

        const start = () => { if (!timer) timer = setInterval(step, 1700); };
        const stop = () => { clearInterval(timer); timer = null; };

        document.fonts.ready.then(() => { measure(); setVerb(words[0]); })
            .catch(() => setTimeout(() => { measure(); setVerb(words[0]); }, 400));

        let rT;
        window.addEventListener('resize', () => {
            clearTimeout(rT);
            rT = setTimeout(measure, 200);
        });

        new IntersectionObserver(([entry]) => {
            entry.isIntersecting ? start() : stop();
        }).observe(container);
    })();

    /* ================= 6. Services tabs (desktop split, sliding indicator + wipe) ================= */
    const serviceBtns = document.querySelectorAll('.service-btn');
    const serviceTexts = document.querySelectorAll('.service-text');
    const serviceImg = document.getElementById('service-img');
    const serviceIndicator = document.querySelector('.service-indicator');
    const serviceImages = {
        animation: 'Images/Animation.png',
        editing: 'Images/Editing.png',
        motion: 'Images/Motion.png',
        photography: 'Images/Recording.jpg',
        other: 'Images/Other.png'
    };

    const moveIndicator = (btn) => {
        if (!serviceIndicator || !btn) return;
        serviceIndicator.style.left = btn.offsetLeft + 'px';
        serviceIndicator.style.width = btn.offsetWidth + 'px';
    };

    // Position indicator once layout/fonts ready
    document.fonts.ready.then(() => {
        const active = document.querySelector('.service-btn.active');
        if (active) moveIndicator(active);
    }).catch(() => setTimeout(() => {
        const active = document.querySelector('.service-btn.active');
        if (active) moveIndicator(active);
    }, 300));

    serviceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('active')) return;
            const target = btn.dataset.target;
            const currentText = document.querySelector('.service-text.active');

            serviceBtns.forEach(b => b.classList.toggle('active', b === btn));
            moveIndicator(btn);

            if (currentText) currentText.classList.add('wipe-out');
            if (serviceImg) serviceImg.classList.add('wipe-out');

            setTimeout(() => {
                serviceTexts.forEach(t => t.classList.remove('active', 'wipe-out', 'wipe-in'));
                if (serviceImg) serviceImg.classList.remove('wipe-out', 'wipe-in');

                const next = document.getElementById(target);
                if (next) next.classList.add('active', 'wipe-in');
                if (serviceImg && serviceImages[target]) {
                    serviceImg.src = serviceImages[target];
                    serviceImg.classList.add('wipe-in');
                }
                setTimeout(() => {
                    document.querySelectorAll('.wipe-in').forEach(el => el.classList.remove('wipe-in'));
                }, 380);
            }, 320);
        });
    });

    // Reposition indicator on resize
    let svcRT;
    window.addEventListener('resize', () => {
        clearTimeout(svcRT);
        svcRT = setTimeout(() => {
            const active = document.querySelector('.service-btn.active');
            if (active) moveIndicator(active);
        }, 180);
    });

    // Mobile services scroller: pagination dots (manual, no auto-advance)
    const scroller = document.querySelector('.mobile-services-scroller');
    const pagDots = document.querySelectorAll('.pagination-dot');
    const svcCards = document.querySelectorAll('.mobile-service-card');
    if (scroller && pagDots.length && svcCards.length) {
        pagDots.forEach((dot, i) => dot.addEventListener('click', () => {
            if (svcCards[i]) svcCards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }));
        const spyObs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const i = Array.from(svcCards).indexOf(entry.target);
                    pagDots.forEach(d => d.classList.remove('active'));
                    if (pagDots[i]) pagDots[i].classList.add('active');
                }
            });
        }, { root: scroller, threshold: 0.6 });
        svcCards.forEach(c => spyObs.observe(c));
    }

    /* ================= 7. Latest — auto YouTube marquee ================= */
    (function initYouTube() {
        const track = document.getElementById('yt-track');
        if (!track) return;

        // Fallback list if the auto-generated file is missing/empty
        const FALLBACK = [
            { videoId: 'bCkfuh_2yUE', title: 'فيلم غمام | GHAMAM', thumbnail: 'https://i.ytimg.com/vi/bCkfuh_2yUE/hqdefault.jpg', link: 'https://www.youtube.com/watch?v=bCkfuh_2yUE', channelName: 'مدونة ستوديو', channelLogo: 'Circle Logo.png' }
        ];

        const videos = (Array.isArray(window.MDWNH_YT) && window.MDWNH_YT.length)
            ? window.MDWNH_YT.slice(0, 6)
            : FALLBACK;

        const cardHTML = (v) => `
            <a class="yt-card" href="${v.link}" target="_blank" rel="noopener">
                <div class="yt-thumb">
                    <img src="${v.thumbnail}" alt="${v.title}" loading="eager" fetchpriority="high" decoding="async"
                         onerror="this.src='Circle Logo.png';this.classList.add('yt-thumb-fallback')">
                    <span class="yt-play" aria-hidden="true">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    </span>
                </div>
                <div class="yt-meta">
                    <img class="yt-avatar" src="${v.channelLogo}" alt="" loading="eager" decoding="async">
                    <div class="yt-text">
                        <div class="yt-title">${v.title}</div>
                        <div class="yt-channel">${v.channelName}</div>
                    </div>
                </div>
            </a>`;

        // Two identical sets → CSS marquee shifts by exactly one set (-50%),
        // looping forever (same mechanism as the clients strip). With only a
        // few videos a single set can be narrower than the viewport, leaving a
        // blank gap once it scrolls past. Repeat the list until each set is
        // wide enough (cards are 340px wide) so the loop always stays filled.
        const CARD_W = 340;
        const MIN_SET_W = Math.max(window.innerWidth, 1920) * 1.2;
        const reps = Math.max(2, Math.ceil(MIN_SET_W / (videos.length * CARD_W)));
        const setVideos = Array.from({ length: reps }, () => videos).flat();

        const setHTML = setVideos.map(cardHTML).join('');
        track.innerHTML =
            `<div class="yt-set">${setHTML}</div><div class="yt-set" aria-hidden="true">${setHTML}</div>`;

        // Constant speed regardless of how many cards got repeated in above
        // (a fixed animation-duration would make longer tracks feel faster).
        // Cards are a fixed 340px regardless of viewport, so on narrow mobile
        // screens fewer cards are visible at once and the same px/sec reads
        // as sluggish — bump the speed there.
        const PX_PER_SEC = window.innerWidth <= 860 ? 70 : 40;
        const setWidth = track.querySelector('.yt-set').getBoundingClientRect().width;
        const durationSec = setWidth / PX_PER_SEC;
        track.style.animationDuration = `${durationSec}s`;
        const durationMs = durationSec * 1000;

        // Eased pause/resume on hover: ramp the CSS animation's playbackRate
        // instead of an instant animation-play-state toggle, so it glides to
        // a stop and glides back up to speed.
        const easeOut = t => 1 - Math.pow(1 - t, 3);
        const easeIn = t => t * t * t;
        let rampId = null;
        const rampPlaybackRate = (target, ms, easeFn) => {
            const anim = track.getAnimations()[0];
            if (!anim) return;
            cancelAnimationFrame(rampId);
            const start = anim.playbackRate;
            const t0 = performance.now();
            const step = (now) => {
                const p = Math.min(1, (now - t0) / ms);
                anim.playbackRate = start + (target - start) * easeFn(p);
                if (p < 1) rampId = requestAnimationFrame(step);
            };
            rampId = requestAnimationFrame(step);
        };
        track.addEventListener('mouseenter', () => rampPlaybackRate(0, 500, easeOut));
        track.addEventListener('mouseleave', () => rampPlaybackRate(1, 500, easeIn));

        // Touch drag-to-scroll: scrub the CSS animation's currentTime directly
        // instead of fighting it with a transform, so it stays perfectly in
        // sync with the loop. currentTime is wrapped into [0, durationMs) on
        // every move, so an infinite (loop) animation can never "run out" no
        // matter how fast or far the drag goes — it just wraps around.
        const wrap = (n, m) => ((n % m) + m) % m;
        const MAX_MOMENTUM = 8; // clamp how many x normal speed a hard flick can hit
        const VELOCITY_WINDOW_MS = 100; // only recent samples count toward the flick speed
        let drag = null;
        track.addEventListener('pointerdown', (e) => {
            if (e.pointerType !== 'touch') return;
            const anim = track.getAnimations()[0];
            if (!anim) return;
            cancelAnimationFrame(rampId);
            anim.playbackRate = 0;
            drag = {
                pointerId: e.pointerId, anim, startX: e.clientX, baseTime: anim.currentTime || 0,
                moved: false, samples: [{ t: performance.now(), x: e.clientX }]
            };
            try { track.setPointerCapture(e.pointerId); } catch (err) { /* not a real active pointer (e.g. synthetic events); drag still works via the track's own listeners */ }
            track.classList.add('dragging');
        });
        track.addEventListener('pointermove', (e) => {
            if (!drag || e.pointerId !== drag.pointerId) return;
            const dx = e.clientX - drag.startX;
            drag.anim.currentTime = wrap(drag.baseTime - (dx / PX_PER_SEC) * 1000, durationMs);
            if (Math.abs(dx) > 8) drag.moved = true;
            const now = performance.now();
            drag.samples.push({ t: now, x: e.clientX });
            while (drag.samples.length > 2 && now - drag.samples[0].t > VELOCITY_WINDOW_MS) drag.samples.shift();
        });
        const endDrag = (e) => {
            if (!drag || e.pointerId !== drag.pointerId) return;
            track.classList.remove('dragging');
            if (drag.moved) {
                // swallow the ghost click so a dragged card doesn't also
                // navigate to its YouTube link
                const suppressClick = (ev) => { ev.preventDefault(); ev.stopPropagation(); };
                track.addEventListener('click', suppressClick, { capture: true, once: true });
                setTimeout(() => track.removeEventListener('click', suppressClick, true), 400);

                // Momentum: estimate flick velocity from the last ~100ms of
                // movement and coast at that speed, decelerating back down
                // to the normal cruising rate instead of snapping straight
                // to it — a slow drag settles almost immediately, a hard
                // flick keeps gliding for a beat first. Record release
                // position/time as a sample too, so holding the finger still
                // before lifting (the standard "stop the fling" gesture)
                // correctly reads as ~0 velocity instead of reusing a stale
                // pre-pause sample.
                const now = performance.now();
                drag.samples.push({ t: now, x: e.clientX });
                while (drag.samples.length > 2 && now - drag.samples[0].t > VELOCITY_WINDOW_MS) drag.samples.shift();
                const first = drag.samples[0];
                const last = drag.samples[drag.samples.length - 1];
                const dt = last.t - first.t;
                const velocityPxPerMs = dt > 0 ? (last.x - first.x) / dt : 0;
                const momentumRate = Math.max(-MAX_MOMENTUM, Math.min(MAX_MOMENTUM,
                    -(velocityPxPerMs * 1000) / PX_PER_SEC));
                drag.anim.playbackRate = momentumRate;
                rampPlaybackRate(1, 900, easeOut);
            } else {
                rampPlaybackRate(1, 500, easeIn);
            }
            drag = null;
        };
        track.addEventListener('pointerup', endDrag);
        track.addEventListener('pointercancel', endDrag);
    })();

    /* ================= 8. Portfolio grid + filter ================= */
    const grid = document.getElementById('portfolio-grid');
    const filterBar = document.getElementById('filter-bar');
    const showMoreBtn = document.getElementById('show-more-btn');
    const INITIAL_COUNT = 9;
    let activeFilter = 'all';
    let expanded = false;

    const rankOrder = { best: 0, noteworthy: 1, normal: 2 };

    function buildProjectCard(proj, dark = false) {
        const card = document.createElement('div');
        card.className = 'project-card';
        if (proj.rank === 'best') card.classList.add('best');
        card.dataset.tags = proj.tags.join(',');
        card.dataset.id = proj.id;
        card.dataset.name = proj.name;

        const sticker = proj.rank === 'best'
            ? `<img src="${BANNER_BASE}sticker.png" class="best-badge" alt="" loading="lazy" decoding="async">`
            : '';
        const tagsHTML = proj.tags
            .map(t => `<span class="card-tag tag-${t}">${TAG_LABELS[t] || t}</span>`)
            .join('');

        card.innerHTML = `
            <div class="card-banner-wrap">
                ${sticker}
                <img class="card-banner" src="${BANNER_BASE}${proj.banner}" alt="${proj.name}" loading="lazy" decoding="async">
            </div>
            <div class="card-body">
                <div class="card-name">${proj.name}</div>
                <div class="card-tags">${tagsHTML}</div>
                <button class="btn-watch" data-link="${proj.link}">مشاهدة</button>
            </div>`;

        card.querySelector('.btn-watch').addEventListener('click', (e) => {
            e.stopPropagation();
            if (proj.link) window.open(proj.link, '_blank', 'noopener');
        });
        return card;
    }

    if (grid && typeof PROJECTS !== 'undefined') {
        // Filter pills from data
        FILTER_TAGS.forEach(tag => {
            const pill = document.createElement('button');
            pill.className = 'filter-pill';
            pill.dataset.tag = tag;
            pill.textContent = TAG_LABELS[tag] || tag;
            filterBar.appendChild(pill);
        });

        // Build all cards once, keep in a map
        const cardMap = {};
        PROJECTS.forEach(p => { cardMap[p.id] = buildProjectCard(p); });

        const allSorted = [...PROJECTS].sort((a, b) =>
            (rankOrder[a.rank] ?? 2) - (rankOrder[b.rank] ?? 2));

        // Featured default order shown under "الكل"
        const FEATURED_IDS = ['ghayam', 'layali_ramadaniya', 'daralez',
            'salam_podcast', 'jazeel', 'bab', 'maanabi-motion'];
        const featured = FEATURED_IDS.map(id => PROJECTS.find(p => p.id === id)).filter(Boolean);

        let animating = false;

        // Sequential fade-out → swap → fade-in, keeping the filter bar anchored
        function render(list, { anchor = true } = {}) {
            if (animating) return;
            animating = true;

            const barTop = filterBar.getBoundingClientRect().top;
            const current = Array.from(grid.children);
            current.forEach((c, i) => {
                c.style.transitionDelay = (i * 0.03) + 's';
                c.classList.add('faded');
            });

            setTimeout(() => {
                grid.replaceChildren();
                list.forEach(p => {
                    const c = cardMap[p.id];
                    c.classList.add('faded');
                    c.style.transitionDelay = '0s';
                    grid.appendChild(c);
                });

                // Anchor: keep the filter bar at the same viewport position
                if (anchor) {
                    const newTop = filterBar.getBoundingClientRect().top;
                    window.scrollBy(0, newTop - barTop);
                }

                void grid.offsetHeight; // reflow
                Array.from(grid.children).forEach((c, i) => {
                    c.style.transitionDelay = (i * 0.045) + 's';
                    c.classList.remove('faded');
                });

                setTimeout(() => {
                    animating = false;
                    Array.from(grid.children).forEach(c => { c.style.transitionDelay = ''; });
                }, 380 + list.length * 45);
            }, 340);
        }

        const updateShowMore = () => {
            showMoreBtn.style.display = (activeFilter === 'all' && !expanded) ? '' : 'none';
        };

        // Initial paint (no animation)
        featured.forEach(p => grid.appendChild(cardMap[p.id]));
        updateShowMore();

        filterBar.addEventListener('click', (e) => {
            const pill = e.target.closest('.filter-pill');
            if (!pill || animating) return;
            filterBar.querySelectorAll('.filter-pill').forEach(p =>
                p.classList.toggle('active', p === pill));
            activeFilter = pill.dataset.tag;
            expanded = false;
            updateShowMore();
            if (activeFilter === 'all') {
                render(featured);
            } else {
                render(allSorted.filter(p => p.tags.includes(activeFilter)));
            }
        });

        showMoreBtn.addEventListener('click', () => {
            if (animating) return;
            expanded = true;
            updateShowMore();
            render(allSorted);
        });
    }

    /* ================= 8b. Floating mobile CTA ================= */
    (function initFloatingCta() {
        const floating = document.getElementById('floating-cta');
        const gridEl = document.getElementById('portfolio-grid');
        const realCta = document.getElementById('portfolio-cta');
        if (!floating || !gridEl || !realCta) return;

        let cardsVisible = false;
        let realVisible = false;
        const update = () => floating.classList.toggle('show', cardsVisible && !realVisible);

        // Appears once the project cards themselves are on screen
        new IntersectionObserver(([e]) => { cardsVisible = e.isIntersecting; update(); },
            { threshold: 0.08 }).observe(gridEl);
        // Hides when the real "أريد عملاً مثل هذا" button is visible
        new IntersectionObserver(([e]) => { realVisible = e.isIntersecting; update(); },
            { threshold: 0.4 }).observe(realCta);
    })();

    /* ================= 9. Guided flow (opt-in overlay) ================= */
    (function initGuidedFlow() {
        const overlay = document.getElementById('guided-overlay');
        const entryBtn = document.getElementById('guided-entry-btn');
        if (!overlay || !entryBtn) return;

        const closeBtn = document.getElementById('guided-close');
        const phaseTags = document.getElementById('g-phase-tags');
        const phaseLoading = document.getElementById('g-phase-loading');
        const phaseResults = document.getElementById('g-phase-results');
        const tagsCloud = document.getElementById('g-tags-cloud');
        const btnContinue = document.getElementById('g-continue');
        const loadingText = document.getElementById('g-loading-text');
        const resultsGrid = document.getElementById('g-results-grid');
        const resultsTitle = document.getElementById('g-results-title');
        const btnWantSame = document.getElementById('g-want-same');
        const btnRestart = document.getElementById('g-restart');
        const contactModal = document.getElementById('g-contact-modal');

        const LOADING_MSGS = [
            'ستجد ما يسرك بإذن الله...',
            'انتظر قليلاً...',
            'أحسنت الاختيار...',
            'لحظات فقط...',
            '🌱✨ انتظر...',
            '🚀🚀 انتظر..'
        ];

        const selectedTags = new Set();
        const selectedCards = new Set();
        let selectionMode = false;
        let picks = [];
        let msgTimer = null;
        let loadTimer = null;
        let sound = null;
        let moveDots = [];

        const showPhase = (phase) => {
            [phaseTags, phaseLoading, phaseResults].forEach(p =>
                p.classList.toggle('hidden', p !== phase));
        };

        const clearMoveDots = () => {
            moveDots.forEach(d => d.remove());
            moveDots = [];
        };

        const open = () => {
            overlay.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
            showPhase(phaseTags);
        };

        const close = () => {
            overlay.classList.add('hidden');
            document.body.style.overflow = '';
            clearInterval(msgTimer);
            clearTimeout(loadTimer);
            clearMoveDots();
            if (sound) { sound.pause(); sound = null; }
            contactModal.classList.add('hidden');
            cancelSelection();
        };

        entryBtn.addEventListener('click', open);
        closeBtn.addEventListener('click', close);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !overlay.classList.contains('hidden')) close();
        });

        // Tag pills — assign 4 brand colors so no two neighbours match
        const BRAND = ['#f04e3a', '#f4c82b', '#3bb9ab', '#086fb6'];
        const darkText = (c) => c === '#f4c82b' || c === '#3bb9ab';
        const tagPills = Array.from(tagsCloud.querySelectorAll('.tag-pill'));
        const colorOffset = Math.floor(Math.random() * 4);
        tagPills.forEach((pill, i) => { pill.dataset.color = BRAND[(i + colorOffset) % 4]; });

        tagPills.forEach(pill => {
            pill.addEventListener('click', () => {
                const tag = pill.dataset.tag;
                if (selectedTags.has(tag)) {
                    selectedTags.delete(tag);
                    pill.classList.remove('selected');
                    pill.style.background = '';
                    pill.style.borderColor = '';
                    pill.style.color = '';
                } else {
                    selectedTags.add(tag);
                    pill.classList.add('selected');
                    const c = pill.dataset.color;
                    pill.style.background = c;
                    pill.style.borderColor = c;
                    pill.style.color = darkText(c) ? '#161616' : '#fff';
                }
                btnContinue.disabled = selectedTags.size === 0;
            });
        });

        const resetTagPills = () => {
            selectedTags.clear();
            tagPills.forEach(p => {
                p.classList.remove('selected');
                p.style.background = '';
                p.style.borderColor = '';
                p.style.color = '';
            });
        };

        // Launch the moving-dot orbit: dots glide from the tags row to the
        // centre, then chase each other (seamless, no snap).
        const launchOrbit = () => {
            clearMoveDots();
            const dots = Array.from(phaseTags.querySelectorAll('.dots-row .dot'));
            const R = 36;
            const cx = window.innerWidth / 2;
            const cy = window.innerHeight / 2;

            moveDots = dots.map(orig => {
                const r = orig.getBoundingClientRect();
                const d = document.createElement('div');
                d.className = 'g-move-dot';
                d.style.background = getComputedStyle(orig).backgroundColor;
                d.style.left = (r.left + r.width / 2 - 8) + 'px';
                d.style.top = (r.top + r.height / 2 - 8) + 'px';
                d.style.transition = 'left 0.75s cubic-bezier(0.34,1.2,0.64,1), top 0.75s cubic-bezier(0.34,1.2,0.64,1)';
                overlay.appendChild(d);
                return d;
            });

            // converge to orbit ring
            const angles = [0, 90, 180, 270];
            requestAnimationFrame(() => requestAnimationFrame(() => {
                moveDots.forEach((d, i) => {
                    const rad = angles[i % 4] * Math.PI / 180;
                    d.style.left = (cx + R * Math.cos(rad) - 8) + 'px';
                    d.style.top = (cy + R * Math.sin(rad) - 8) + 'px';
                });
            }));

            // hand off to seamless CSS orbit
            setTimeout(() => {
                moveDots.forEach((d, i) => {
                    d.style.transition = 'none';
                    d.style.left = (cx - 8) + 'px';
                    d.style.top = (cy - 8) + 'px';
                    d.style.transformOrigin = '8px 8px';
                    d.style.animation = 'ovOrbit 1.8s linear infinite';
                    d.style.animationDelay = (-i * 0.45) + 's';
                });
            }, 820);
        };

        // Continue → thinking → results
        btnContinue.addEventListener('click', () => {
            showPhase(phaseLoading);
            launchOrbit();

            // Thinking sound (keeps playing through the reveal)
            sound = new Audio('assets/media/thinking.mp3');
            sound.play().catch(() => { });

            // Rotating messages — fully fade out, swap, fade in (no overlap)
            let last = -1;
            loadingText.style.opacity = '0';
            loadingText.textContent = '';
            const nextMsg = () => {
                let i;
                do { i = Math.floor(Math.random() * LOADING_MSGS.length); }
                while (i === last && LOADING_MSGS.length > 1);
                last = i;
                loadingText.style.opacity = '0';
                setTimeout(() => {
                    loadingText.textContent = LOADING_MSGS[i];
                    loadingText.style.opacity = '1';
                }, 520);
            };
            nextMsg();
            msgTimer = setInterval(nextMsg, 2200);

            // Prepare picks + preload banners
            picks = preparePicks();
            picks.forEach(p => { const im = new Image(); im.src = BANNER_BASE + p.banner; });

            loadTimer = setTimeout(() => {
                clearInterval(msgTimer);
                clearMoveDots();
                renderResults();
                showPhase(phaseResults);
                // sound intentionally keeps playing after the cards appear
            }, 5000);
        });

        function preparePicks() {
            const matched = PROJECTS.filter(p => p.tags.some(t => selectedTags.has(t)));
            const by = r => matched.filter(p => (p.rank || 'normal') === r)
                .sort(() => Math.random() - 0.5);
            const combined = [...by('best'), ...by('noteworthy'), ...by('normal')];
            const seen = new Set();
            const unique = combined.filter(p =>
                seen.has(p.name) ? false : (seen.add(p.name), true));
            return unique.length
                ? unique.slice(0, 3)
                : [...PROJECTS].sort(() => Math.random() - 0.5).slice(0, 3);
        }

        function renderResults() {
            resultsGrid.innerHTML = '';
            selectedCards.clear();
            picks.forEach((p, i) => {
                const card = buildProjectCard(p, true);
                card.addEventListener('click', (e) => {
                    if (!selectionMode) return;
                    if (e.target.classList.contains('btn-watch')) return;
                    if (selectedCards.has(p.name)) {
                        selectedCards.delete(p.name);
                        card.classList.remove('card-selected');
                    } else {
                        selectedCards.add(p.name);
                        card.classList.add('card-selected');
                    }
                });
                resultsGrid.appendChild(card);
                // Staggered slide-in
                card.style.animationDelay = (i * 0.12) + 's';
                requestAnimationFrame(() => card.classList.add('slide-in'));
            });
        }

        // "أريد مثله" → selection mode (user picks their own favourites) → contact
        btnWantSame.addEventListener('click', () => {
            if (!selectionMode) {
                selectionMode = true;
                resultsTitle.textContent = 'اختر مشاريعك المفضلة ثم اضغط مجدداً';
                btnWantSame.textContent = 'تأكيد الاختيار ✉️';
                // nothing pre-selected — the user chooses
            } else {
                if (selectedCards.size === 0) return;
                contactModal.classList.remove('hidden');
            }
        });

        btnRestart.addEventListener('click', () => {
            cancelSelection();
            resetTagPills();
            btnContinue.disabled = true;
            showPhase(phaseTags);
        });

        function cancelSelection() {
            selectionMode = false;
            selectedCards.clear();
            resultsTitle.textContent = 'وجدنا لك هذا!';
            btnWantSame.textContent = 'أريد مثله! 🚀';
        }

        // Contact choice
        document.getElementById('g-modal-close').addEventListener('click', () =>
            contactModal.classList.add('hidden'));

        const sendRequest = (type) => {
            const names = Array.from(selectedCards).join(' / ');
            const quoted = Array.from(selectedCards).map(n => `"${n}"`).join(' و ');
            if (type === 'email') {
                const subject = `مهتم بمشروع مثل: ${names}`;
                const body = `السلام عليكم ورحمه الله وبركاته\n\nاعجبني ${quoted} من مشاريعكم! وأريد العمل على شيء مثله\n\nاليكم التفاصيل والميزانية المقترحة`;
                window.location.href =
                    `mailto:contact@mdwn.studio?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            } else {
                const text = `السلام عليكم ورحمه الله وبركاته، اعجبني ${quoted} من مشاريعكم! وأريد العمل على شيء مثله، اليكم التفاصيل والميزانية المقترحة`;
                window.open(`https://wa.me/966534223414?text=${encodeURIComponent(text)}`,
                    '_blank', 'noopener');
            }
            contactModal.classList.add('hidden');
        };

        document.getElementById('g-wa-choice').addEventListener('click', () => sendRequest('whatsapp'));
        document.getElementById('g-mail-choice').addEventListener('click', () => sendRequest('email'));
    })();

    /* ================= 10. Contact form + copy phone ================= */
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;
            const body = `${message}\n\n---\nSent from: ${email}`;
            window.location.href =
                `mailto:contact@mdwn.studio?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        });
    }

    const copyBtn = document.getElementById('copy-phone-btn');
    const toast = document.getElementById('copy-toast');
    if (copyBtn && toast) {
        const showToast = () => {
            toast.classList.add('show');
            setTimeout(() => toast.classList.remove('show'), 3000);
        };
        copyBtn.addEventListener('click', () => {
            const phone = '+966534223414';
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(phone).then(showToast).catch(() => fallback());
            } else {
                fallback();
            }
            function fallback() {
                const ta = document.createElement('textarea');
                ta.value = phone;
                ta.style.cssText = 'position:fixed;left:-9999px';
                document.body.appendChild(ta);
                ta.select();
                try { document.execCommand('copy') && showToast(); } catch (_) { }
                document.body.removeChild(ta);
            }
        });
    }

    /* ================= 13. Showreel video modal ================= */
    const videoModal = document.getElementById('video-modal');
    const heroVideoBtn = document.getElementById('hero-video-btn');
    const videoCloseBtn = document.querySelector('.video-close-btn');
    const vimeoPlayer = document.getElementById('vimeo-player');
    const VIMEO_URL = 'https://player.vimeo.com/video/1155695572?autoplay=1&title=0&byline=0&portrait=0';

    const openModal = () => {
        vimeoPlayer.src = VIMEO_URL;
        videoModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };
    const closeModal = () => {
        videoModal.classList.add('hidden');
        document.body.style.overflow = '';
        setTimeout(() => {
            if (videoModal.classList.contains('hidden')) vimeoPlayer.src = '';
        }, 450);
    };

    if (heroVideoBtn) heroVideoBtn.addEventListener('click', openModal);
    if (videoCloseBtn) videoCloseBtn.addEventListener('click', closeModal);
    if (videoModal) {
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !videoModal.classList.contains('hidden')) closeModal();
        });
    }
});
