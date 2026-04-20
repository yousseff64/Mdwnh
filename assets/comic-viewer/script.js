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

if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
}

// ─── Global Loading Messages ─────────────────────────────────────────────────
const LOADING_MESSAGES = [
    "لا تقلق.. سترى القصة في اقرب وقت",
    "يستغرق الأمر اكثر من المتوقع.. هل قام ليمو بتخريبه؟",
    "لماذا لا تصل على حبيبك محمد حتى ينتهي التحميل؟",
    "لماذا لا تستغفر ربك حتى ينتهي التحميل؟",
    "ربما السيد عجيب يعرف الحل؟",
    "هل تعلم ان قولك سبحان اللّٰه وبحمده يغرس لك نخلة في الجنة؟"
];

/**
 * Starts rotating loading messages in a text element.
 * Waits `startDelay`ms before first swap, then swaps every 10s.
 * Returns a stop function.
 */
function startMessageRotator(textEl, startDelay = 5000) {
    if (!textEl) return () => {};
    let idx = 0;
    let stopped = false;
    let timer;

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

    return () => {
        stopped = true;
        clearTimeout(timer);
    };
}

// ─── Image Loading Helpers ────────────────────────────────────────────────────
function loadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload  = () => resolve({ url, ok: true, img });
        img.onerror = () => resolve({ url, ok: false, img });
        img.src = url;
    });
}

function checkExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload  = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

async function discoverPages(basePath) {
    let index = 1;
    const discovered = [];
    const BATCH = 10; // larger batch = faster discovery
    const pattern = window.PAGE_PATTERN || 'صفحة{n}.png';

    while (true) {
        const batch = [];
        for (let i = 0; i < BATCH; i++) {
            const n = index + i;
            let fileName;
            if (pattern.includes('{0n}')) {
                fileName = pattern.replace('{0n}', n.toString().padStart(2, '0'));
            } else if (pattern.includes('Page_')) {
                fileName = pattern.replace('{n}', n.toString().padStart(2, '0'));
            } else {
                fileName = pattern.replace('{n}', n);
            }
            const url = `${basePath}${fileName}`;
            batch.push(checkExists(url).then(ok => ok ? url : null));
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
    const loadTextEl = loadingEl ? loadingEl.querySelector('p') : null;
    const containerEl= document.querySelector('.container');
    const controlsEl = document.getElementById('controls');
    const db         = typeof firebase !== 'undefined' ? firebase.database() : null;
    const isMobile   = window.innerWidth <= 768;

    let currentViewMode = 'vertical';
    let flipBook = null;
    let hasCountedView = false;
    let stopGlobalRotator = () => {};

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

    // ── Start loading messages on the splash screen ──────────────────────────
    if (loadTextEl) {
        loadTextEl.style.transition = 'opacity 0.5s ease';
        stopGlobalRotator = startMessageRotator(loadTextEl, 5000);
    }

    // ── Discover all pages ────────────────────────────────────────────────────
    const pages = await discoverPages(basePath);

    if (pages.length === 0) {
        if (loadingEl) loadingEl.innerHTML = `<p style="color:#ff5555;">لم يتم العثور على صفحات في المجلد "${basePath}".</p>`;
        return;
    }

    stopGlobalRotator();

    // ── Render all page divs immediately (with spinners) ─────────────────────
    // imgMap: url → <img> element, for fast O(1) lookup without CSS.escape issues
    const imgMap = new Map();
    const bookEl = buildBookDOM('vertical', pages, imgMap);

    // Show the container right away — images will pop in as they load
    containerEl.classList.add('vertical-mode');
    containerEl.style.opacity = '1';

    // ── Load first 5 pages in PARALLEL (fastest possible) ────────────────────
    const FIRST_BATCH = Math.min(5, pages.length);
    const firstUrls   = [...pages].reverse().slice(0, FIRST_BATCH); // reversed = reading order
    const firstLoads  = firstUrls.map(url => loadAndApplyImage(url));

    await Promise.all(firstLoads);

    // ── Hide loading splash, reveal reader ────────────────────────────────────
    if (loadingEl) {
        loadingEl.style.opacity = '0';
        setTimeout(() => { if (loadingEl) loadingEl.style.display = 'none'; }, 500);
    }
    if (controlsEl) controlsEl.classList.remove('hidden');
    incrementView();

    // ── Load remaining pages SEQUENTIALLY in background ──────────────────────
    const remaining = [...pages].reverse().slice(FIRST_BATCH);
    (async () => {
        for (const url of remaining) {
            await loadAndApplyImage(url);
        }
        // ── Final integrity check after everything finishes ───────────────
        setTimeout(runIntegrityCheck, 2000);
    })();

    // ─────────────────────────────────────────────────────────────────────────
    // Build the book DOM for a given mode. Returns the new bookEl.
    // ─────────────────────────────────────────────────────────────────────────
    function buildBookDOM(mode, pageList, map) {
        if (map) map.clear();
        const sizer = document.querySelector('.flipbook-sizer');
        if (sizer) sizer.innerHTML = '<div id="book" class="flipbook"></div>';
        const bk = document.getElementById('book');
        if (!bk) return null;

        const reversed = mode === 'flipbook'
            ? ['empty', ...[...pageList].reverse(), 'empty']
            : [...pageList].reverse();

        reversed.forEach((url, i) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';

            if (url === 'empty') {
                pageDiv.classList.add('page-empty');
                bk.appendChild(pageDiv);
                return;
            }

            if (mode === 'flipbook' && (i === 0 || i === reversed.length - 1)) {
                pageDiv.classList.add('--page-hard');
            }

            // Per-page spinner with rotating messages
            const spinnerWrap = document.createElement('div');
            spinnerWrap.className = 'page-loading-spinner';
            const spinnerEl  = document.createElement('div');
            spinnerEl.className = 'spinner small';
            const spinnerTxt = document.createElement('p');
            spinnerTxt.className = 'page-loading-text';
            spinnerTxt.textContent = 'جاري تجهيز الصفحات..';
            spinnerWrap.appendChild(spinnerEl);
            spinnerWrap.appendChild(spinnerTxt);

            const stopPageRotator = startMessageRotator(spinnerTxt, 5000);

            const pageContent = document.createElement('div');
            pageContent.className = 'page-content';

            const img = document.createElement('img');
            img.className = 'page-image';

            img.onload = () => {
                img.classList.add('loaded');
                stopPageRotator();
                spinnerWrap.style.display = 'none';
            };
            img.onerror = () => setTimeout(() => retryImage(img, url), 4000);

            // Register in map for O(1) lookup. Also store url on element itself.
            img._comicUrl = url;
            if (map) map.set(url, img);

            pageContent.appendChild(spinnerWrap);
            pageContent.appendChild(img);
            pageDiv.appendChild(pageContent);
            bk.appendChild(pageDiv);
        });

        return bk;
    }

    // ── Trigger load for an image by URL (uses map for O(1) lookup) ──────────
    function loadAndApplyImage(url) {
        return new Promise((resolve) => {
            const img = imgMap.get(url);
            if (!img) { resolve(); return; }
            if (img.classList.contains('loaded')) { resolve(); return; }

            const cleanup = () => {
                img.removeEventListener('load', onLoad);
                img.removeEventListener('error', onError);
            };
            const onLoad  = () => { cleanup(); resolve(); };
            const onError = () => { cleanup(); resolve(); }; // resolve anyway – don't block queue
            img.addEventListener('load',  onLoad);
            img.addEventListener('error', onError);

            if (!img.src) img.src = url; // trigger the actual download
        });
    }

    function retryImage(img, url) {
        const src = url || img.dataset.src;
        if (!src) return;
        img.src = src + '?retry=' + Date.now();
    }

    // ── Final integrity check: re-download any broken images ─────────────────
    function runIntegrityCheck() {
        document.querySelectorAll('.page-image').forEach(img => {
            const broken = !img.classList.contains('loaded') ||
                           !img.complete ||
                           img.naturalWidth === 0;
            if (broken && img._comicUrl) {
                img.classList.remove('loaded');
                const sp = img.closest('.page-content')?.querySelector('.page-loading-spinner');
                if (sp) sp.style.display = '';
                retryImage(img, img._comicUrl);
            }
        });
    }

    // ── Periodic safety net every 5s ──────────────────────────────────────────
    setInterval(runIntegrityCheck, 5000);

    // ─────────────────────────────────────────────────────────────────────────
    // View mode toggle
    // ─────────────────────────────────────────────────────────────────────────
    async function switchMode(mode) {
        if (currentViewMode === mode) return;
        currentViewMode = mode;

        if (flipBook) {
            try { flipBook.destroy(); } catch(e) {}
            flipBook = null;
        }

        // Rebuild DOM and repopulate the shared imgMap
        const bk = buildBookDOM(mode, pages, imgMap);
        if (!bk) return;

        containerEl.style.opacity = '1';

        if (mode === 'vertical') {
            containerEl.classList.add('vertical-mode');
            containerEl.scrollTop = 0;
            // Load all images right away (they're in the map now)
            for (const [url, img] of imgMap) {
                if (!img.src) img.src = url;
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
                flipBook.on('flip', (e) => {
                    playFlipSound();
                    updatePageCounter(flipBook, totalPages);
                    lazyLoadAround(e.data);
                    if (flipBook.getCurrentPageIndex() > 6) incrementView();
                });
                updatePageCounter(flipBook, totalPages);
                lazyLoadAround(totalPages - 2);
            } catch(e) { console.error('Flipbook init:', e); }
        }
        setTimeout(resizeSizer, 100);
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

    // ── Auto-hide controls (desktop only, 50px threshold) ────────────────────
    let controlsTimer;
    let lastMX = 0, lastMY = 0;
    if (!isMobile && controlsEl) {
        const show = (e) => {
            if (Math.hypot(e.pageX - lastMX, e.pageY - lastMY) < 50) return;
            lastMX = e.pageX; lastMY = e.pageY;
            controlsEl.classList.remove('hidden-auto');
            clearTimeout(controlsTimer);
            controlsTimer = setTimeout(() => controlsEl.classList.add('hidden-auto'), 2000);
        };
        document.addEventListener('mousemove', show);
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

    // ── Flipbook helpers ──────────────────────────────────────────────────────
    function lazyLoadAround(index) {
        document.querySelectorAll('.page-image').forEach((img, i) => {
            if (Math.abs(i - index) <= 4 && img._comicUrl && !img.src) {
                img.src = img._comicUrl;
            }
        });
    }

    function updatePageCounter(book, totalPages) {
        if (!book) return;
        const ci = book.getCurrentPageIndex();
        const total = totalPages - 2;
        const offset = 1;
        let left = total - (ci - offset);
        let display = `${left}`;
        if (ci < totalPages - 1 && ci > 0) {
            const ri = ci + 1;
            if (ri < totalPages - 1) display = `${total - (ri - offset)} - ${left}`;
        }
        const elCur = document.getElementById('page-current');
        const elTot = document.getElementById('page-total');
        if (elCur) elCur.textContent = display;
        if (elTot) elTot.textContent = total;
    }
});

// ─── Sound ────────────────────────────────────────────────────────────────────
const flipAudio = new Audio('../assets/comic-viewer/Page flip.mp3');
function playFlipSound() {
    try { flipAudio.currentTime = 0; flipAudio.play().catch(() => {}); } catch(e) {}
}
