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

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
}

document.addEventListener('DOMContentLoaded', async () => {
    const basePath = window.COMIC_PATH || '../باب الحجرة/';
    const loadingEl = document.getElementById('loading');
    const containerEl = document.querySelector('.container');
    const controlsEl = document.getElementById('controls');
    const comicId = window.COMIC_ID || 'unknown';
    const db = typeof firebase !== 'undefined' ? firebase.database() : null;
    let hasCountedView = false;
    
    // Discover pages dynamically
    const pages = await discoverPages(basePath);
    
    if (pages.length === 0) {
        loadingEl.innerHTML = `<p style="color: #ff5555;">لم يتم العثور على صفحات في المجلد "${basePath}".</p>`;
        return;
    }

    // View Count Logic
    if (db) {
        const viewRef = db.ref('comics/' + comicId + '/views');
        viewRef.on('value', (snapshot) => {
            const count = snapshot.val() || 0;
            const viewDisplay = document.getElementById('view-count');
            if (viewDisplay) viewDisplay.textContent = count.toLocaleString();
        });
    }

    function incrementView() {
        if (!db || hasCountedView) return;
        hasCountedView = true;
        const viewRef = db.ref('comics/' + comicId + '/views');
        viewRef.transaction((currentViews) => (currentViews || 0) + 1);
    }

    const isMobile = window.innerWidth <= 768;
    let currentViewMode = 'vertical'; 
    let flipBook = null;

    const loadingMessages = [
        "لا تقلق.. سترى القصة في اقرب وقت",
        "يستغرق الأمر اكثر من المتوقع.. هل قام ليمو بتخريبه؟",
        "لماذا لا تصلي على حبيبك محمد حتى ينتهي التحميل؟",
        "لماذا لا تستغفر ربك حتى ينتهي التحميل؟",
        "ربما السيد عجيب يعرف الحل؟",
        "هل تعلم ان قولك سبحان اللّٰه وبحمده يغرس لك نخلة في الجنة؟"
    ];

    function startRotatingText(element, delay = 5000) {
        if (!element) return;
        let msgIndex = Math.floor(Math.random() * loadingMessages.length);
        
        setTimeout(() => {
            if (element.parentElement) {
                element.style.opacity = '0';
                setTimeout(() => {
                    element.textContent = loadingMessages[msgIndex];
                    element.style.opacity = '1';
                    
                    setInterval(() => {
                        if (element.parentElement) {
                            element.style.opacity = '0';
                            setTimeout(() => {
                                msgIndex = (msgIndex + 1) % loadingMessages.length;
                                element.textContent = loadingMessages[msgIndex];
                                element.style.opacity = '1';
                            }, 500);
                        }
                    }, 10000);
                }, 500);
            }
        }, delay);
    }

    // --- Core Functions ---

    function renderPages(mode) {
        const sizer = document.querySelector('.flipbook-sizer');
        if (sizer) sizer.innerHTML = '<div id="book" class="flipbook"></div>';
        
        const bookEl = document.getElementById('book');
        if (!bookEl) return null;

        const reversedPages = mode === 'flipbook' 
            ? ['empty', ...[...pages].reverse(), 'empty']
            : [...pages].reverse();

        reversedPages.forEach((url, i) => {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'page';
            
            if (url === 'empty') {
                pageDiv.classList.add('page-empty');
                bookEl.appendChild(pageDiv);
                return;
            }

            if (mode === 'flipbook' && (i === 0 || i === reversedPages.length - 1)) {
                pageDiv.classList.add('--page-hard');
            }
            
            const pageContent = document.createElement('div');
            pageContent.className = 'page-content';
            
            // Create Page Spinner with Loading Text
            const spWrap = document.createElement('div');
            spWrap.className = 'page-loading-spinner';
            spWrap.innerHTML = `
                <div class="spinner"></div>
                <p class="page-loading-text">جاري تحضير الصفحة...</p>
            `;
            pageContent.appendChild(spWrap);
            startRotatingText(spWrap.querySelector('.page-loading-text'), 3000);
            
            const img = document.createElement('img');
            img.className = 'page-image';
            
            // Story page number (Arabic 1 is at the end of reversedPages)
            const storyPageNum = mode === 'flipbook' ? (pages.length - (i - 1)) : (pages.length - i);
            img.dataset.storyNum = storyPageNum;
            img.dataset.src = url;
            
            img.onload = () => {
                img.classList.add('loaded');
                spWrap.style.display = 'none';
            };

            img.onerror = () => {
                setTimeout(() => {
                    if (img.dataset.src) img.src = img.dataset.src + '?retry=' + Date.now();
                }, 3000);
            };

            pageContent.appendChild(img);
            pageDiv.appendChild(pageContent);
            bookEl.appendChild(pageDiv);
        });
        
        return bookEl;
    }

    async function initViewer(mode) {
        currentViewMode = mode;
        if (flipBook) {
            try { flipBook.destroy(); } catch(e) {}
            flipBook = null;
        }

        const bookEl = renderPages(mode);
        if (!bookEl) return;

        if (mode === 'vertical') {
            containerEl.classList.add('vertical-mode');
            containerEl.scrollTop = 0;
            
            // Sequential Loading
            const allImgs = Array.from(document.querySelectorAll('.page-image'));
            // Sort by story number ascending (1, 2, 3...)
            const sortedImgs = allImgs.sort((a, b) => a.dataset.storyNum - b.dataset.storyNum);
            
            // Load first 5 pages before showing viewer
            const first5 = sortedImgs.slice(0, 5);
            await loadBatchSequentially(first5);
            
            // Show Viewer
            hideLoadingScreen();
            
            // Continue loading the rest sequentially
            loadBatchSequentially(sortedImgs.slice(5)).then(() => {
                finalIntegrityCheck();
            });

            incrementView(); 
        } else {
            containerEl.classList.remove('vertical-mode');
            // For flipbook, we need most pages ready for a good experience, but we'll try to show it after 5
            const allImgs = Array.from(document.querySelectorAll('.page-image'));
            const sortedImgs = allImgs.sort((a, b) => a.dataset.storyNum - b.dataset.storyNum);
            
            const first5 = sortedImgs.slice(0, 5);
            await loadBatchSequentially(first5);
            hideLoadingScreen();

            try {
                const totalPages = pages.length + 2;
                flipBook = new St.PageFlip(bookEl, {
                    width: 800,
                    height: 1131,
                    size: "stretch",
                    minWidth: 315,
                    maxWidth: 1000,
                    minHeight: 420,
                    maxHeight: 1350,
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
                    const idx = e.data;
                    // Trigger immediate load for the flipped page if not yet loaded
                    const flippedImg = document.querySelectorAll('.page-image')[idx];
                    if (flippedImg && flippedImg.dataset.src && !flippedImg.src) {
                        flippedImg.src = flippedImg.dataset.src;
                    }
                });
                
                updatePageCounter(flipBook, totalPages);
            } catch (e) {
                console.error("Flipbook init error:", e);
            }
            
            // Continue background loading
            loadBatchSequentially(sortedImgs.slice(5)).then(() => {
                finalIntegrityCheck();
            });
        }
        
        setTimeout(resizeSizer, 100);
    }

    async function loadBatchSequentially(imgArray) {
        for (const img of imgArray) {
            if (img.dataset.src && !img.src) {
                await new Promise((resolve) => {
                    img.onload = () => resolve();
                    img.onerror = () => resolve();
                    img.src = img.dataset.src;
                });
            }
        }
    }

    function hideLoadingScreen() {
        if (loadingEl.style.display === 'none') return;
        loadingEl.style.opacity = '0';
        setTimeout(() => {
            loadingEl.style.display = 'none';
            containerEl.style.opacity = '1';
            controlsEl.classList.remove('hidden');
        }, 500);
    }

    function finalIntegrityCheck() {
        // Run every 5 seconds after full load to ensure stability
        setInterval(() => {
            const allImgs = document.querySelectorAll('.page-image');
            allImgs.forEach(img => {
                if (img.dataset.src && (!img.complete || img.naturalWidth === 0)) {
                    img.src = img.dataset.src + '?integrity=' + Date.now();
                }
            });
        }, 5000);
    }

    // --- Controls Logic ---

    if (comicId !== 'ghailam') {
        const toggleContainer = document.createElement('div');
        toggleContainer.className = 'view-mode-toggle';
        toggleContainer.innerHTML = `
            <button id="btn-mode-vertical" class="btn-toggle active">رأسي</button>
            <button id="btn-mode-flip" class="btn-toggle">3D</button>
        `;
        controlsEl.appendChild(toggleContainer);

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

    // Auto-hide Controls (Desktop Only)
    let controlsTimer;
    let lastMouseX = 0;
    let lastMouseY = 0;

    if (!isMobile) {
        const showControls = (e) => {
            const dist = Math.hypot(e.pageX - lastMouseX, e.pageY - lastMouseY);
            if (dist < 50) return; 

            lastMouseX = e.pageX;
            lastMouseY = e.pageY;

            controlsEl.classList.remove('hidden-auto');
            clearTimeout(controlsTimer);
            controlsTimer = setTimeout(() => {
                controlsEl.classList.add('hidden-auto');
            }, 2000);
        };

        document.addEventListener('mousemove', showControls);
        document.addEventListener('mousedown', (e) => {
            lastMouseX = e.pageX;
            lastMouseY = e.pageY;
            showControls(e);
        });
    }

    document.getElementById('btn-prev').addEventListener('click', () => {
        if (flipBook) flipBook.flipPrev();
    });

    document.getElementById('btn-next').addEventListener('click', () => {
        if (flipBook) flipBook.flipNext();
    });

    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        });
    }

    document.addEventListener('fullscreenchange', () => {
        document.body.classList.toggle('fullscreen-active', !!document.fullscreenElement);
        setTimeout(resizeSizer, 200);
    });

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
        
        let w = availW;
        let h = w / ratio;
        if (h > availH) {
            h = availH;
            w = h * ratio;
        }
        
        sizer.style.width = Math.floor(w) + 'px';
        sizer.style.height = Math.floor(h) + 'px';
        if (flipBook) flipBook.update();
    }
    window.addEventListener('resize', resizeSizer);

    // Initial Loading Messages
    const initLoadText = loadingEl.querySelector('p');
    startRotatingText(initLoadText, 5000);

    // Start Viewer as soon as discovery is done
    initViewer('vertical');
});

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
    const maxConcurrent = 10; // Faster discovery
    const pattern = window.PAGE_PATTERN || 'صفحة{n}.png';

    while (true) {
        const batch = [];
        for (let i = 0; i < maxConcurrent; i++) {
            const pageNum = index + i;
            let fileName = pattern.replace('{n}', pageNum);
            if (pattern.includes('{0n}')) {
                fileName = pattern.replace('{0n}', pageNum.toString().padStart(2, '0'));
            } else if (pattern.includes('Page_')) {
                const paddedNum = pageNum.toString().padStart(2, '0');
                fileName = pattern.replace('{n}', paddedNum);
            }
            batch.push(
                checkExistsFast(`${basePath}${fileName}`).then(exists => exists ? `${basePath}${fileName}` : null)
            );
        }
        const results = await Promise.all(batch);
        const foundInBatch = results.filter(r => r !== null);
        discovered.push(...foundInBatch);
        if (foundInBatch.length < maxConcurrent) break;
        if (index > 500) break; 
        index += maxConcurrent;
    }
    return discovered;
}

const flipAudio = new Audio('../assets/comic-viewer/Page flip.mp3');
function playFlipSound() {
    try {
        flipAudio.currentTime = 0;
        flipAudio.play().catch(() => {});
    } catch(e) {}
}
