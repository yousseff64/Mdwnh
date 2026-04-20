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

// ─── Rotating Messages ───────────────────────────────────────────────────────
const LOADING_MESSAGES = [
    "لا تقلق.. سترى القصة في اقرب وقت",
    "يستغرق الأمر اكثر من المتوقع.. هل قام ليمو بتخريبه؟",
    "لماذا لا تصل على حبيبك محمد حتى ينتهي التحميل؟",
    "لماذا لا تستغفر ربك حتى ينتهي التحميل؟",
    "ربما السيد عجيب يعرف الحل؟",
    "هل تعلم ان قولك سبحان اللّٰه وبحمده يغرس لك نخلة في الجنة؟"
];

/**
 * Attach a rotating message loop to a <p> element.
 * Starts after `delayMs` and rotates every `intervalMs`.
 * Returns a stop function.
 */
function attachRotatingMessages(el, delayMs = 5000, intervalMs = 10000) {
    if (!el) return () => {};
    let idx = Math.floor(Math.random() * LOADING_MESSAGES.length);
    let stopped = false;
    let intervalId = null;

    const show = () => {
        if (stopped) return;
        el.style.opacity = '0';
        setTimeout(() => {
            if (stopped) return;
            el.textContent = LOADING_MESSAGES[idx];
            idx = (idx + 1) % LOADING_MESSAGES.length;
            el.style.opacity = '1';
        }, 400);
    };

    const timer = setTimeout(() => {
        if (stopped) return;
        show();
        intervalId = setInterval(show, intervalMs);
    }, delayMs);

    return () => {
        stopped = true;
        clearTimeout(timer);
        if (intervalId) clearInterval(intervalId);
    };
}

// ─── Image Loading Helpers ───────────────────────────────────────────────────

function loadImage(img, src) {
    return new Promise((resolve) => {
        if (img.classList.contains('loaded')) { resolve(); return; }
        img.onload = () => {
            img.classList.add('loaded');
            const sp = img.closest('.page-content')?.querySelector('.page-loading-spinner');
            if (sp) sp.classList.add('done');
            resolve();
        };
        img.onerror = () => {
            // Retry once after 2s, then resolve anyway
            setTimeout(() => {
                const retrySrc = src + '?r=' + Date.now();
                img.onload = () => {
                    img.classList.add('loaded');
                    const sp = img.closest('.page-content')?.querySelector('.page-loading-spinner');
                    if (sp) sp.classList.add('done');
                    resolve();
                };
                img.onerror = () => resolve(); // give up silently
                img.src = retrySrc;
            }, 2000);
        };
        img.src = src;
    });
}

function checkExistsFast(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

async function discoverPages(basePath) {
    let index = 1;
    const discovered = [];
    const maxConcurrent = 5;
    const pattern = window.PAGE_PATTERN || 'صفحة{n}.png';

    while (true) {
        const batch = [];
        for (let i = 0; i < maxConcurrent; i++) {
            const pageNum = index + i;
            let fileName = pattern.replace('{n}', pageNum);
            if (pattern.includes('{0n}')) {
                fileName = pattern.replace('{0n}', pageNum.toString().padStart(2, '0'));
            } else if (pattern.includes('Page_')) {
                fileName = pattern.replace('{n}', pageNum.toString().padStart(2, '0'));
            }
            batch.push(
                checkExistsFast(`${basePath}${fileName}`).then(exists => exists ? `${basePath}${fileName}` : null)
            );
        }
        const results = await Promise.all(batch);
        const found = results.filter(Boolean);
        discovered.push(...found);
        if (found.length < maxConcurrent) break;
        if (index > 500) break;
        index += maxConcurrent;
    }
    return discovered;
}

// ─── Main ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const basePath   = window.COMIC_PATH || '../باب الحجرة/';
    const loadingEl  = document.getElementById('loading');
    const containerEl = document.querySelector('.container');
    const controlsEl = document.getElementById('controls');
    const comicId    = window.COMIC_ID || 'unknown';
    const db         = typeof firebase !== 'undefined' ? firebase.database() : null;
    let hasCountedView = false;

    // Kick off rotating messages on the initial loading screen immediately
    const initMsgEl = loadingEl.querySelector('p');
    if (initMsgEl) initMsgEl.textContent = 'جاري تجهيز الصفحات..';
    const stopInitMessages = attachRotatingMessages(initMsgEl, 5000, 10000);

    // View count
    if (db) {
        const viewRef = db.ref('comics/' + comicId + '/views');
        viewRef.on('value', snap => {
            const el = document.getElementById('view-count');
            if (el) el.textContent = (snap.val() || 0).toLocaleString();
        });
    }
    function incrementView() {
        if (!db || hasCountedView) return;
        hasCountedView = true;
        db.ref('comics/' + comicId + '/views').transaction(v => (v || 0) + 1);
    }

    // Discover pages
    const pages = await discoverPages(basePath);
    if (pages.length === 0) {
        stopInitMessages();
        loadingEl.innerHTML = `<p style="color:#ff5555;">لم يتم العثور على صفحات في "${basePath}".</p>`;
        return;
    }

    const isMobile = window.innerWidth <= 768;
    let currentViewMode = 'vertical';
    let flipBook = null;

    // ── Render pages into DOM ──────────────────────────────────────────────
    function renderPages(mode) {
        const sizer = document.querySelector('.flipbook-sizer');
        if (sizer) sizer.innerHTML = '<div id="book" class="flipbook"></div>';
        const bookEl = document.getElementById('book');
        if (!bookEl) return null;

        const orderedPages = mode === 'flipbook'
            ? ['empty', ...[...pages].reverse(), 'empty']
            : [...pages].reverse();

        orderedPages.forEach((url, i) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';

            if (url === 'empty') {
                pageDiv.classList.add('page-empty');
                bookEl.appendChild(pageDiv);
                return;
            }

            if (mode === 'flipbook' && (i === 0 || i === orderedPages.length - 1)) {
                pageDiv.classList.add('--page-hard');
            }

            const pageContent = document.createElement('div');
            pageContent.className = 'page-content';

            // Per-page spinner + rotating message
            const spinner = document.createElement('div');
            spinner.className = 'page-loading-spinner';
            spinner.innerHTML = `
                <div class="spinner small"></div>
                <p class="page-loading-text">جاري تحضير الصفحة...</p>
            `;

            const img = document.createElement('img');
            img.className = 'page-image';
            img.dataset.src = url;

            pageContent.appendChild(spinner);
            pageContent.appendChild(img);
            pageDiv.appendChild(pageContent);
            bookEl.appendChild(pageDiv);
        });

        return bookEl;
    }

    // ── Sequential loader: loads one image at a time ───────────────────────
    // Returns a promise that resolves when the first `earlyCount` are done,
    // while continuing to load the rest in the background.
    function sequentialLoad(earlyCount = 5) {
        const allImgs = [...document.querySelectorAll('.page-image[data-src]')];
        // Pages are reversed in DOM so last index = Arabic page 1
        // We want to load Arabic pages 1..N, which are at the END of the array
        const loadOrder = [...allImgs].reverse(); // start from Arabic p1

        // Attach rotating messages to every per-page spinner
        const stoppers = [];
        loadOrder.forEach(img => {
            const msgEl = img.closest('.page-content')?.querySelector('.page-loading-text');
            stoppers.push(attachRotatingMessages(msgEl, 5000, 10000));
        });

        const earlyPromises = [];
        let earlyResolved = 0;
        let earlyResolve;
        const earlyDone = new Promise(r => earlyResolve = r);

        // Sequential chain
        let chain = Promise.resolve();
        loadOrder.forEach((img, i) => {
            chain = chain.then(async () => {
                const src = img.dataset.src;
                if (!src) return;
                img.removeAttribute('data-src');
                await loadImage(img, src);
                // Stop the spinner message for this page
                if (stoppers[i]) stoppers[i]();
                earlyResolved++;
                if (earlyResolved >= Math.min(earlyCount, loadOrder.length)) {
                    earlyResolve();
                }
            });
        });

        // Final verification pass after everything loads
        chain.then(() => {
            earlyResolve(); // in case fewer pages than earlyCount
            setTimeout(() => verifyAllLoaded(), 500);
        });

        return earlyDone;
    }

    // ── Verification pass ──────────────────────────────────────────────────
    async function verifyAllLoaded() {
        const allImgs = [...document.querySelectorAll('.page-image')];
        for (const img of allImgs) {
            if (!img.classList.contains('loaded') || img.naturalWidth === 0) {
                const src = img.src || img.dataset.src;
                if (!src) continue;
                img.removeAttribute('data-src');
                await loadImage(img, src.split('?')[0]); // strip old query params
            }
        }
    }

    // ── Init viewer ────────────────────────────────────────────────────────
    async function initViewer(mode) {
        currentViewMode = mode;

        if (flipBook) {
            try { flipBook.destroy(); } catch(e) {}
            flipBook = null;
        }

        const bookEl = renderPages(mode);
        if (!bookEl) return;

        containerEl.style.opacity = '1';

        if (mode === 'vertical') {
            containerEl.classList.add('vertical-mode');
            containerEl.scrollTop = 0;

            // Start sequential load, show reader after first 5
            const earlyDone = sequentialLoad(5);
            await earlyDone;
            incrementView();

        } else {
            containerEl.classList.remove('vertical-mode');
            try {
                const totalPages = pages.length + 2;
                flipBook = new St.PageFlip(bookEl, {
                    width: 800, height: 1131,
                    size: "stretch",
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
                    lazyLoadAround(e.data);
                    if (flipBook.getCurrentPageIndex() > 6) incrementView();
                });

                updatePageCounter(flipBook, totalPages);
                lazyLoadAround(totalPages - 2);
            } catch (e) {
                console.error('Flipbook init error:', e);
            }
        }

        setTimeout(resizeSizer, 100);
    }

    // Lazy-load around current index (for flipbook mode)
    function lazyLoadAround(index) {
        const allImgs = [...document.querySelectorAll('.page-image')];
        allImgs.forEach((img, i) => {
            if (Math.abs(i - index) <= 4 && img.dataset.src) {
                const src = img.dataset.src;
                img.removeAttribute('data-src');
                loadImage(img, src);
            }
        });
    }

    // ── Controls ───────────────────────────────────────────────────────────

    // Mode toggle (not for Ghailam)
    if (comicId !== 'ghailam') {
        const div = document.createElement('div');
        div.className = 'view-mode-toggle';
        div.innerHTML = `
            <button id="btn-mode-vertical" class="btn-toggle active">رأسي</button>
            <button id="btn-mode-flip" class="btn-toggle">3D</button>
        `;
        controlsEl.appendChild(div);

        document.getElementById('btn-mode-vertical').addEventListener('click', () => {
            if (currentViewMode === 'vertical') return;
            document.getElementById('btn-mode-vertical').classList.add('active');
            document.getElementById('btn-mode-flip').classList.remove('active');
            initViewer('vertical');
        });
        document.getElementById('btn-mode-flip').addEventListener('click', () => {
            if (currentViewMode === 'flipbook') return;
            document.getElementById('btn-mode-flip').classList.add('active');
            document.getElementById('btn-mode-vertical').classList.remove('active');
            initViewer('flipbook');
        });
    }

    // Auto-hide controls on desktop
    let controlsTimer;
    let lastMouseX = 0, lastMouseY = 0;
    if (!isMobile) {
        const showControls = e => {
            const dist = Math.hypot(e.pageX - lastMouseX, e.pageY - lastMouseY);
            if (dist < 50) return;
            lastMouseX = e.pageX; lastMouseY = e.pageY;
            controlsEl.classList.remove('hidden-auto');
            clearTimeout(controlsTimer);
            controlsTimer = setTimeout(() => controlsEl.classList.add('hidden-auto'), 2000);
        };
        document.addEventListener('mousemove', showControls);
        document.addEventListener('mousedown', e => { lastMouseX = e.pageX; lastMouseY = e.pageY; showControls(e); });
    }

    document.getElementById('btn-prev').addEventListener('click', () => { if (flipBook) flipBook.flipPrev(); });
    document.getElementById('btn-next').addEventListener('click', () => { if (flipBook) flipBook.flipNext(); });

    const btnFS = document.getElementById('btn-fullscreen');
    if (btnFS) {
        btnFS.addEventListener('click', () => {
            if (!document.fullscreenElement) document.documentElement.requestFullscreen();
            else document.exitFullscreen();
        });
    }
    document.addEventListener('fullscreenchange', () => {
        document.body.classList.toggle('fullscreen-active', !!document.fullscreenElement);
        setTimeout(resizeSizer, 200);
    });

    // ── Sizer ──────────────────────────────────────────────────────────────
    function resizeSizer() {
        const sizer = document.querySelector('.flipbook-sizer');
        if (!sizer) return;
        if (currentViewMode === 'vertical') {
            sizer.style.width = '';
            sizer.style.height = '';
            return;
        }
        const ratio = 1600 / 1131;
        const availW = containerEl.clientWidth - 40;
        const availH = containerEl.clientHeight - 160;
        let w = availW, h = w / ratio;
        if (h > availH) { h = availH; w = h * ratio; }
        sizer.style.width = Math.floor(w) + 'px';
        sizer.style.height = Math.floor(h) + 'px';
        if (flipBook) flipBook.update();
    }
    window.addEventListener('resize', resizeSizer);

    // ── Boot ───────────────────────────────────────────────────────────────
    // Build DOM immediately (invisible), start loading
    const bookEl = renderPages('vertical');
    containerEl.classList.add('vertical-mode');

    // Begin sequential load; wait for first 5 pages
    const earlyDone = sequentialLoad(5);

    await earlyDone;

    // Dismiss initial loading screen
    stopInitMessages();
    loadingEl.style.opacity = '0';
    setTimeout(() => {
        loadingEl.style.display = 'none';
        containerEl.style.opacity = '1';
        controlsEl.classList.remove('hidden');
        incrementView();
    }, 500);

    // Insert the mode toggle after controls are shown
    if (comicId !== 'ghailam') {
        // Already appended above — just make sure resizeSizer runs
        setTimeout(resizeSizer, 600);
    }

    // ── Helper ─────────────────────────────────────────────────────────────
    function updatePageCounter(book, totalPages) {
        if (!book) return;
        const ci = book.getCurrentPageIndex();
        const total = totalPages - 2;
        const offset = 1;
        let left = total - (ci - offset);
        let str = `${left}`;
        if (ci < totalPages - 1 && ci > 0) {
            const ri = ci + 1;
            if (ri < totalPages - 1) str = `${total - (ri - offset)} - ${left}`;
        }
        document.getElementById('page-current').textContent = str;
        document.getElementById('page-total').textContent = total;
    }
});

// ─── Sound ───────────────────────────────────────────────────────────────────
const flipAudio = new Audio('../assets/comic-viewer/Page flip.mp3');
function playFlipSound() {
    try { flipAudio.currentTime = 0; flipAudio.play().catch(() => {}); } catch(e) {}
}
