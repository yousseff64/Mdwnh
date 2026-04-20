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
    if (pattern.includes('{0n}')) return pattern.replace('{0n}', n.toString().padStart(2, '0'));
    return pattern.replace('{n}', n);
}

function generatePageUrls(basePath, count) {
    const pattern = window.PAGE_PATTERN || 'صفحة{n}.png';
    const urls = [];
    for (let n = 1; n <= count; n++) urls.push(basePath + buildFileName(pattern, n));
    return urls;
}

async function discoverPages(basePath) {
    let index = 1;
    const discovered = [];
    const BATCH = 10;
    const pattern = window.PAGE_PATTERN || 'صفحة{n}.png';
    while (true) {
        const batch = [];
        for (let i = 0; i < BATCH; i++) {
            const url = basePath + buildFileName(pattern, index + i);
            batch.push(new Promise(res => {
                const img = new Image();
                img.onload = () => res(url);
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

// ─── Load a single URL → returns the loaded <img> element ────────────────────
function loadSingleImage(url) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => {
            // Retry once on error
            setTimeout(() => {
                const img2 = new Image();
                img2.onload  = () => resolve(img2);
                img2.onerror = () => resolve(img); // give up, still resolve
                img2.src = url + '?r=' + Date.now();
            }, 3000);
        };
        img.src = url;
    });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    const basePath    = window.COMIC_PATH || '../باب الحجرة/';
    const comicId     = window.COMIC_ID   || 'unknown';
    const loadingEl   = document.getElementById('loading');
    const loadTextEl  = loadingEl?.querySelector('p');
    const containerEl = document.querySelector('.container');
    const controlsEl  = document.getElementById('controls');
    const db = typeof firebase !== 'undefined' ? firebase.database() : null;
    const isMobile = window.innerWidth <= 768;

    let currentViewMode = 'vertical';
    let flipBook = null;
    let hasCountedView = false;
    // Store all loaded images in reading order for mode switching
    const loadedImages = []; // [{ url, img }]

    // ── Firebase ─────────────────────────────────────────────────────────────
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

    // ── Splash messages ──────────────────────────────────────────────────────
    if (loadTextEl) {
        loadTextEl.style.transition = 'opacity 0.5s ease';
        startMessageRotator(loadTextEl, 5000);
    }

    // ── Get page list ────────────────────────────────────────────────────────
    const pages = window.PAGE_COUNT > 0
        ? generatePageUrls(basePath, window.PAGE_COUNT)
        : await discoverPages(basePath);

    if (pages.length === 0) {
        if (loadingEl) loadingEl.innerHTML = `<p style="color:#ff5555;">لم يتم العثور على صفحات.</p>`;
        return;
    }

    // Reading order (Forward: Page 1 to Page N)
    const readOrder = [...pages];

    // ── Set up the book container ─────────────────────────────────────────────
    containerEl.classList.add('vertical-mode');
    const sizer = document.querySelector('.flipbook-sizer');
    if (sizer) sizer.innerHTML = '<div id="book" class="flipbook"></div>';
    const bookEl = document.getElementById('book');

    // ── Helper: create a page div with a spinner placeholder ─────────────────
    function createPagePlaceholder(url) {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.dataset.url = url;

        const spinnerWrap = document.createElement('div');
        spinnerWrap.className = 'page-loading-spinner';
        const spinEl = document.createElement('div');
        spinEl.className = 'spinner small';
        const txtEl = document.createElement('p');
        txtEl.className = 'page-loading-text';
        txtEl.textContent = 'جاري تجهيز الصفحة..';
        spinnerWrap.appendChild(spinEl);
        spinnerWrap.appendChild(txtEl);

        const stopRot = startMessageRotator(txtEl, 5000);

        const pageContent = document.createElement('div');
        pageContent.className = 'page-content';
        pageContent.appendChild(spinnerWrap);

        pageDiv.appendChild(pageContent);
        return { pageDiv, pageContent, spinnerWrap, stopRot };
    }

    // ── Helper: swap placeholder spinner → actual image ───────────────────────
    function finalizePageDiv(pageContent, spinnerWrap, stopRot, img) {
        stopRot();
        img.className = 'page-image loaded';
        img.style.opacity = '1';
        pageContent.appendChild(img);
        spinnerWrap.style.display = 'none';
    }

    // ── Progressive loading: show spinner, load image, swap in ────────────────
    async function loadAndAppendPage(url) {
        const { pageDiv, pageContent, spinnerWrap, stopRot } = createPagePlaceholder(url);
        bookEl.appendChild(pageDiv); // spinner visible immediately

        const img = await loadSingleImage(url);
        loadedImages.push({ url, img });
        finalizePageDiv(pageContent, spinnerWrap, stopRot, img);
    }

    // ── Load first 5 pages simultaneously, show reader ────────────────────────
    const FIRST_N = Math.min(5, readOrder.length);
    await Promise.all(readOrder.slice(0, FIRST_N).map(url => loadAndAppendPage(url)));

    // Hide splash
    if (loadingEl) {
        loadingEl.style.opacity = '0';
        setTimeout(() => { loadingEl.style.display = 'none'; }, 500);
    }
    containerEl.style.opacity = '1';
    if (controlsEl) controlsEl.classList.remove('hidden');
    incrementView();

    // ── Load remaining pages ONE BY ONE ──────────────────────────────────────
    (async () => {
        for (const url of readOrder.slice(FIRST_N)) {
            await loadAndAppendPage(url);
        }
        // After all done, run integrity check
        setTimeout(runIntegrityCheck, 2000);
    })();

    // Safety net every 10s
    setInterval(runIntegrityCheck, 10000);

    // ── Integrity check: retry any page-image that failed ────────────────────
    function runIntegrityCheck() {
        document.querySelectorAll('.page-image').forEach(img => {
            if (!img.complete || img.naturalWidth === 0) {
                const url = img.src.split('?')[0];
                img.src = url + '?check=' + Date.now();
            }
        });
    }

    // ── Mode switching ────────────────────────────────────────────────────────
    async function switchMode(mode) {
        if (currentViewMode === mode) return;
        currentViewMode = mode;

        if (flipBook) {
            try { flipBook.destroy(); } catch(e) {}
            flipBook = null;
        }

        // Rebuild book from already-loaded images
        const sizerEl = document.querySelector('.flipbook-sizer');
        if (sizerEl) sizerEl.innerHTML = '<div id="book" class="flipbook"></div>';
        const bk = document.getElementById('book');
        if (!bk) return;

        containerEl.style.opacity = '1';

        if (mode === 'vertical') {
            containerEl.classList.add('vertical-mode');
            containerEl.scrollTop = 0;

            // Re-add all loaded pages in reading order
            loadedImages.forEach(({ url, img }) => {
                const pageDiv = document.createElement('div');
                pageDiv.className = 'page';
                const pageContent = document.createElement('div');
                pageContent.className = 'page-content';
                const clone = img.cloneNode();
                clone.className = 'page-image loaded';
                clone.style.opacity = '1';
                clone.src = url;
                pageContent.appendChild(clone);
                pageDiv.appendChild(pageContent);
                bk.appendChild(pageDiv);
            });

            // Add spinner placeholders for pages not yet loaded
            const loadedUrls = new Set(loadedImages.map(d => d.url));
            readOrder.forEach(url => {
                if (!loadedUrls.has(url)) {
                    const { pageDiv } = createPagePlaceholder(url);
                    bk.appendChild(pageDiv);
                }
            });

        } else {
            containerEl.classList.remove('vertical-mode');

            // For flipbook: build full page list with empty pads (reversed for RTL)
            const allOrdered = ['empty', ...[...pages].reverse(), 'empty'];
            const loadedMap = new Map(loadedImages.map(d => [d.url, d.img]));

            allOrdered.forEach((url, i) => {
                const pageDiv = document.createElement('div');
                pageDiv.className = 'page';

                if (url === 'empty') {
                    pageDiv.classList.add('page-empty');
                    bk.appendChild(pageDiv);
                    return;
                }
                if (i === 0 || i === allOrdered.length - 1) pageDiv.classList.add('--page-hard');

                const pageContent = document.createElement('div');
                pageContent.className = 'page-content';

                if (loadedMap.has(url)) {
                    const clone = loadedMap.get(url).cloneNode();
                    clone.className = 'page-image loaded';
                    clone.style.opacity = '1';
                    clone.src = url;
                    pageContent.appendChild(clone);
                } else {
                    // Spinner for pages not yet loaded
                    const spinnerWrap = document.createElement('div');
                    spinnerWrap.className = 'page-loading-spinner';
                    spinnerWrap.innerHTML = '<div class="spinner small"></div>';
                    const imgEl = document.createElement('img');
                    imgEl.className = 'page-image';
                    imgEl.onload = () => {
                        imgEl.classList.add('loaded');
                        spinnerWrap.style.display = 'none';
                    };
                    imgEl.src = url;
                    pageContent.appendChild(spinnerWrap);
                    pageContent.appendChild(imgEl);
                }

                pageDiv.appendChild(pageContent);
                bk.appendChild(pageDiv);
            });

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
                    if (flipBook.getCurrentPageIndex() > 6) incrementView();
                });
                updatePageCounter(flipBook, totalPages);
            } catch(e) { console.error('Flipbook init:', e); }
        }
        setTimeout(resizeSizer, 100);
    }

    // ── Toggle buttons ────────────────────────────────────────────────────────
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

    // ── Auto-hide controls (50px threshold) ──────────────────────────────────
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
        sizer.style.width = Math.floor(w) + 'px';
        sizer.style.height = Math.floor(h) + 'px';
        if (flipBook) flipBook.update();
    }
    window.addEventListener('resize', resizeSizer);

    // ── Page counter ──────────────────────────────────────────────────────────
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
        const cur = document.getElementById('page-current');
        const tot = document.getElementById('page-total');
        if (cur) cur.textContent = display;
        if (tot) tot.textContent = total;
    }
});

// ─── Sound ────────────────────────────────────────────────────────────────────
const flipAudio = new Audio('../assets/comic-viewer/Page flip.mp3');
function playFlipSound() {
    try { flipAudio.currentTime = 0; flipAudio.play().catch(() => {}); } catch(e) {}
}
