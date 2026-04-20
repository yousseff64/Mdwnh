// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyATzvkgxTYVKZcOEeLjkJpupw56TLeIjXU",
  authDomain: "mdwnhviewer.firebaseapp.com",
  databaseURL: "https://mdwnhviewer-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mdwnhviewer",
  storageBucket: "mdwnhviewer.firebasestorage.app",
  messagingSenderId: "384065085258",
  appId: "1:384065085258:web:35911a6e9b28015657ebb3",
  measurementId: "G-Z2GTGYBSMS"
};
if (typeof firebase !== 'undefined') firebase.initializeApp(firebaseConfig);

// ─── Loading Messages ─────────────────────────────────────────────────────────
const LOADING_MESSAGES = [
    "لا تقلق.. سترى القصة في اقرب وقت",
    "يستغرق الأمر اكثر من المتوقع.. هل قام ليمو بتخريبه؟",
    "لماذا لا تصل على حبيبك محمد حتى ينتهي التحميل؟",
    "لماذا لا تستغفر ربك حتى ينتهي التحميل؟",
    "ربما السيد عجيب يعرف الحل؟",
    "هل تعلم ان قولك سبحان اللّٰه وبحمده يغرس لك نخلة في الجنة؟"
];

function startMessageRotator(textEl, startDelay = 5000) {
    if (!textEl) return () => {};
    let idx = 0, stopped = false, timer;
    const fadeToNext = () => {
        if (stopped) return;
        textEl.style.transition = 'opacity 0.5s ease';
        textEl.style.opacity = '0';
        setTimeout(() => {
            if (stopped) return;
            textEl.textContent = LOADING_MESSAGES[idx % LOADING_MESSAGES.length];
            idx++;
            textEl.style.opacity = '1';
            timer = setTimeout(fadeToNext, 10000);
        }, 500);
    };
    timer = setTimeout(fadeToNext, startDelay);
    return () => { stopped = true; clearTimeout(timer); };
}

// ─── Page URL Generation ──────────────────────────────────────────────────────
function buildFileName(pattern, n) {
    if (pattern.includes('{0n}')) {
        return pattern.replace('{0n}', n.toString().padStart(2, '0'));
    }
    return pattern.replace('{n}', n);
}

function generatePageUrls(basePath, count) {
    // Fast path: generate all URLs directly when count is known
    const pattern = window.PAGE_PATTERN || 'صفحة{n}.png';
    const urls = [];
    for (let n = 1; n <= count; n++) {
        urls.push(basePath + buildFileName(pattern, n));
    }
    return urls;
}

async function discoverPages(basePath) {
    // Slow fallback: probe for pages when count is unknown
    let index = 1;
    const discovered = [];
    const BATCH = 10;
    const pattern = window.PAGE_PATTERN || 'صفحة{n}.png';

    while (true) {
        const batch = [];
        for (let i = 0; i < BATCH; i++) {
            const n = index + i;
            const url = basePath + buildFileName(pattern, n);
            batch.push(new Promise(res => {
                const img = new Image();
                img.onload  = () => res(url);
                img.onerror = () => res(null);
                img.src = url;
            }));
        }
        const results = await Promise.all(batch);
        const found = results.filter(Boolean);
        discovered.push(...found);
        if (found.length < BATCH) break;
        if (index > 500) break;
        index += BATCH;
    }
    return discovered;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const basePath   = window.COMIC_PATH || '../باب الحجرة/';
    const comicId    = window.COMIC_ID   || 'unknown';
    const loadingEl  = document.getElementById('loading');
    const loadTextEl = loadingEl?.querySelector('p');
    const containerEl = document.querySelector('.container');
    const controlsEl  = document.getElementById('controls');
    const db = typeof firebase !== 'undefined' ? firebase.database() : null;
    const isMobile = window.innerWidth <= 768;

    let currentViewMode = 'vertical';
    let flipBook = null;
    let hasCountedView = false;
    // imgMap: url → <img element>, rebuilt on every DOM switch
    const imgMap = new Map();

    // ── Firebase view counter ────────────────────────────────────────────────
    if (db) {
        db.ref('comics/' + comicId + '/views').on('value', snap => {
            const el = document.getElementById('view-count');
            if (el) el.textContent = (snap.val() || 0).toLocaleString();
        });
    }
    function incrementView() {
        if (!db || hasCountedView) return;
        hasCountedView = true;
        db.ref('comics/' + comicId + '/views').transaction(v => (v || 0) + 1);
    }

    // ── Start splash messages ────────────────────────────────────────────────
    if (loadTextEl) {
        loadTextEl.style.transition = 'opacity 0.5s ease';
        startMessageRotator(loadTextEl, 5000);
    }

    // ── Get page list (instant if PAGE_COUNT set, otherwise probe) ───────────
    let pages;
    if (window.PAGE_COUNT && window.PAGE_COUNT > 0) {
        pages = generatePageUrls(basePath, window.PAGE_COUNT);
    } else {
        pages = await discoverPages(basePath);
    }

    if (pages.length === 0) {
        if (loadingEl) loadingEl.innerHTML = `<p style="color:#ff5555;">لم يتم العثور على صفحات.</p>`;
        return;
    }

    // ── Build DOM with spinners, images have NO src yet ──────────────────────
    buildBookDOM('vertical', pages);

    containerEl.classList.add('vertical-mode');

    // ── Load first 3 pages immediately in parallel ────────────────────────────
    // (reading order = reversed array, so last 3 in pages[] = first 3 in story)
    const readOrder = [...pages].reverse();
    const FIRST_N = Math.min(3, readOrder.length);

    await Promise.all(readOrder.slice(0, FIRST_N).map(url => triggerLoad(url)));

    // ── Hide splash and show reader ───────────────────────────────────────────
    if (loadingEl) {
        loadingEl.style.opacity = '0';
        setTimeout(() => { loadingEl.style.display = 'none'; }, 500);
    }
    containerEl.style.opacity = '1';
    if (controlsEl) controlsEl.classList.remove('hidden');
    incrementView();

    // ── Load remaining pages one-by-one in background ────────────────────────
    (async () => {
        for (const url of readOrder.slice(FIRST_N)) {
            await triggerLoad(url);
        }
        // Final integrity check 2s after all done
        setTimeout(runIntegrityCheck, 2000);
    })();

    // Integrity check every 8s as safety net
    setInterval(runIntegrityCheck, 8000);

    // ─────────────────────────────────────────────────────────────────────────
    //  DOM builder — completely recreates #book each time
    // ─────────────────────────────────────────────────────────────────────────
    function buildBookDOM(mode, pageList) {
        imgMap.clear();
        const sizer = document.querySelector('.flipbook-sizer');
        if (sizer) sizer.innerHTML = '<div id="book" class="flipbook"></div>';
        const bk = document.getElementById('book');
        if (!bk) return null;

        const ordered = mode === 'flipbook'
            ? ['empty', ...[...pageList].reverse(), 'empty']
            : [...pageList].reverse();

        ordered.forEach((url, i) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';

            if (url === 'empty') {
                pageDiv.classList.add('page-empty');
                bk.appendChild(pageDiv);
                return;
            }

            if (mode === 'flipbook' && (i === 0 || i === ordered.length - 1)) {
                pageDiv.classList.add('--page-hard');
            }

            // Per-page spinner
            const spinnerWrap = document.createElement('div');
            spinnerWrap.className = 'page-loading-spinner';
            const spinEl = document.createElement('div');
            spinEl.className = 'spinner small';
            const txtEl = document.createElement('p');
            txtEl.className = 'page-loading-text';
            txtEl.textContent = 'جاري تجهيز الصفحة..';
            spinnerWrap.appendChild(spinEl);
            spinnerWrap.appendChild(txtEl);

            // Each page rotates messages after 5s of waiting
            const stopRot = startMessageRotator(txtEl, 5000);

            const pageContent = document.createElement('div');
            pageContent.className = 'page-content';

            const img = document.createElement('img');
            img.className = 'page-image';
            img._comicUrl = url;      // Store URL as JS property (no data attr)
            img._attempted = false;   // Track whether we've started loading it

            img.onload = () => {
                img.classList.add('loaded');
                img._attempted = true;
                stopRot();
                spinnerWrap.style.display = 'none';
            };
            img.onerror = () => {
                img._attempted = true;
                setTimeout(() => {
                    // Retry with cache-buster
                    img.src = url + '?r=' + Date.now();
                }, 4000);
            };

            // Register in map
            imgMap.set(url, img);

            pageContent.appendChild(spinnerWrap);
            pageContent.appendChild(img);
            pageDiv.appendChild(pageContent);
            bk.appendChild(pageDiv);
        });

        return bk;
    }

    // ── Trigger load for one URL, await completion ────────────────────────────
    function triggerLoad(url) {
        return new Promise(resolve => {
            const img = imgMap.get(url);
            if (!img) { resolve(); return; }
            if (img.classList.contains('loaded')) { resolve(); return; }

            const cleanup = () => {
                img.removeEventListener('load',  onLoad);
                img.removeEventListener('error', onError);
            };
            const onLoad  = () => { cleanup(); resolve(); };
            const onError = () => { cleanup(); resolve(); }; // don't stall the queue

            img.addEventListener('load',  onLoad);
            img.addEventListener('error', onError);

            // Only set src if not already set
            if (!img.src || img.src === window.location.href) {
                img._attempted = true;
                img.src = url;
            }
        });
    }

    // ── Integrity check — only retry images that WERE attempted but failed ────
    function runIntegrityCheck() {
        imgMap.forEach((img, url) => {
            if (!img._attempted) return; // not yet queued, skip
            const broken = !img.classList.contains('loaded') ||
                           !img.complete ||
                           img.naturalWidth === 0;
            if (broken) {
                img.classList.remove('loaded');
                const sp = img.closest('.page-content')?.querySelector('.page-loading-spinner');
                if (sp) sp.style.display = '';
                img.src = url + '?check=' + Date.now();
            }
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Mode switching
    // ─────────────────────────────────────────────────────────────────────────
    async function switchMode(mode) {
        if (currentViewMode === mode) return;
        currentViewMode = mode;

        if (flipBook) {
            try { flipBook.destroy(); } catch(e) {}
            flipBook = null;
        }

        // Rebuild DOM + repopulate imgMap
        const bk = buildBookDOM(mode, pages);
        if (!bk) return;

        containerEl.style.opacity = '1';

        if (mode === 'vertical') {
            containerEl.classList.add('vertical-mode');
            containerEl.scrollTop = 0;
            // Load all pages right away (they've been seen before)
            for (const url of [...pages].reverse()) {
                const img = imgMap.get(url);
                if (img && !img.src) {
                    img._attempted = true;
                    img.src = url;
                }
            }
        } else {
            containerEl.classList.remove('vertical-mode');
            try {
                const totalPages = pages.length + 2;
                flipBook = new St.PageFlip(bk, {
                    width: 800, height: 1131,
                    size: 'stretch',
                    minWidth: 315, maxWidth: 1000,
                    minHeight: 420, maxHeight: 1350,
                    maxShadowOpacity: 0.9,
                    showCover: false,
                    mobileScrollSupport: false,
                    usePortrait: false,
                    flippingTime: 450,
                    startPage: totalPages - 2
                });
                flipBook.loadFromHTML(document.querySelectorAll('.page'));
                flipBook.on('flip', e => {
                    playFlipSound();
                    updatePageCounter(flipBook, totalPages);
                    loadAround(e.data);
                    if (flipBook.getCurrentPageIndex() > 6) incrementView();
                });
                updatePageCounter(flipBook, totalPages);
                // Load first 10 pages around start immediately
                loadAround(totalPages - 2, 10);
                // Then load rest sequentially
                (async () => {
                    for (const url of [...pages].reverse()) {
                        await triggerLoad(url);
                    }
                })();
            } catch(e) { console.error('Flipbook init:', e); }
        }
        setTimeout(resizeSizer, 100);
    }

    // ── Load images around a given index ─────────────────────────────────────
    function loadAround(index, radius = 4) {
        document.querySelectorAll('.page-image').forEach((img, i) => {
            if (Math.abs(i - index) <= radius && img._comicUrl && !img.src) {
                img._attempted = true;
                img.src = img._comicUrl;
            }
        });
    }

    // ── Mode toggle buttons ───────────────────────────────────────────────────
    if (comicId !== 'ghailam' && controlsEl) {
        const wrap = document.createElement('div');
        wrap.className = 'view-mode-toggle';
        wrap.innerHTML = `
            <button id="btn-mode-vertical" class="btn-toggle active">رأسي</button>
            <button id="btn-mode-flip" class="btn-toggle">3D</button>
        `;
        controlsEl.appendChild(wrap);
        document.getElementById('btn-mode-vertical').addEventListener('click', () => {
            document.getElementById('btn-mode-vertical').classList.add('active');
            document.getElementById('btn-mode-flip').classList.remove('active');
            switchMode('vertical');
        });
        document.getElementById('btn-mode-flip').addEventListener('click', () => {
            document.getElementById('btn-mode-flip').classList.add('active');
            document.getElementById('btn-mode-vertical').classList.remove('active');
            switchMode('flipbook');
        });
    }

    // ── Auto-hide controls on desktop (50px threshold) ────────────────────────
    let controlsTimer, lastMX = 0, lastMY = 0;
    if (!isMobile && controlsEl) {
        document.addEventListener('mousemove', e => {
            if (Math.hypot(e.pageX - lastMX, e.pageY - lastMY) < 50) return;
            lastMX = e.pageX; lastMY = e.pageY;
            controlsEl.classList.remove('hidden-auto');
            clearTimeout(controlsTimer);
            controlsTimer = setTimeout(() => controlsEl.classList.add('hidden-auto'), 2000);
        });
    }

    // ── Navigation buttons ────────────────────────────────────────────────────
    document.getElementById('btn-prev')?.addEventListener('click', () => { if (flipBook) flipBook.flipPrev(); });
    document.getElementById('btn-next')?.addEventListener('click', () => { if (flipBook) flipBook.flipNext(); });

    // ── Fullscreen ────────────────────────────────────────────────────────────
    document.getElementById('btn-fullscreen')?.addEventListener('click', () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen();
        else document.exitFullscreen();
    });
    document.addEventListener('fullscreenchange', () => {
        document.body.classList.toggle('fullscreen-active', !!document.fullscreenElement);
        setTimeout(resizeSizer, 200);
    });

    // ── Sizer ─────────────────────────────────────────────────────────────────
    function resizeSizer() {
        const sizer = document.querySelector('.flipbook-sizer');
        if (!sizer) return;
        if (currentViewMode === 'vertical') { sizer.style.width = ''; sizer.style.height = ''; return; }
        const ratio = 1600 / 1131;
        const availW = containerEl.clientWidth - 40;
        const availH = containerEl.clientHeight - 160;
        let w = availW, h = w / ratio;
        if (h > availH) { h = availH; w = h * ratio; }
        sizer.style.width  = Math.floor(w) + 'px';
        sizer.style.height = Math.floor(h) + 'px';
        if (flipBook) flipBook.update();
    }
    window.addEventListener('resize', resizeSizer);

    // ── Page counter for flipbook mode ────────────────────────────────────────
    function updatePageCounter(book, totalPages) {
        if (!book) return;
        const ci = book.getCurrentPageIndex();
        const total = totalPages - 2, offset = 1;
        let left = total - (ci - offset);
        let display = `${left}`;
        if (ci < totalPages - 1 && ci > 0) {
            const ri = ci + 1;
            if (ri < totalPages - 1) display = `${total - (ri - offset)} - ${left}`;
        }
        document.getElementById('page-current')?.setAttribute !== undefined &&
            (document.getElementById('page-current').textContent = display);
        document.getElementById('page-total') &&
            (document.getElementById('page-total').textContent = total);
    }
});

// ─── Sound ────────────────────────────────────────────────────────────────────
const flipAudio = new Audio('../assets/comic-viewer/Page flip.mp3');
function playFlipSound() {
    try { flipAudio.currentTime = 0; flipAudio.play().catch(() => {}); } catch(e) {}
}
