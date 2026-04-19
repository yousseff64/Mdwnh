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
    const bookEl = document.getElementById('book');
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
    
    // Emulate RTL by reversing the pages. 
    // On desktop, we pad with 'empty' to force 2-page spread behavior without the jarring showCover snap.
    const reversedPages = isMobile ? [...pages].reverse() : ['empty', ...[...pages].reverse(), 'empty'];
    
    // Array to track eager image loading
    const preloadPromises = [];
    
    const loadingMessages = [
        "لا تقلق.. سترى القصة في اقرب وقت",
        "يستغرق الأمر اكثر من المتوقع.. هل قام ليمو بتخريبه؟",
        "لماذا لا تصلي على حبيبك محمد حتى ينتهي التحميل؟",
        "لماذا لا تستغفر ربك حتى ينتهي التحميل؟",
        "ربما السيد عجيب يعرف الحل؟",
        "هل تعلم ان قولك سبحان الله وبحمده يغرس لك نخلة في الجنة؟"
    ];

    function startRotatingText(element) {
        let msgIndex = Math.floor(Math.random() * loadingMessages.length);
        
        function rotate() {
            element.style.opacity = '0';
            setTimeout(() => {
                if(!element.parentElement) return; // Stop if removed
                element.textContent = loadingMessages[msgIndex];
                msgIndex = (msgIndex + 1) % loadingMessages.length;
                element.style.opacity = '1';
            }, 500);
        }
        
        setTimeout(() => {
            rotate();
            setInterval(rotate, 10000);
        }, 6000);
    }
    
    // Create HTML elements for each page
    reversedPages.forEach((url, i) => {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        
        if (url === 'empty') {
            pageDiv.classList.add('page-empty');
            pageDiv.style.backgroundColor = 'transparent';
            pageDiv.style.boxShadow = 'none';
            pageDiv.style.border = 'none';
            bookEl.appendChild(pageDiv);
            return;
        }

        // Make the first and last physical pages hard (covers)
        if (i === 0 || i === reversedPages.length - 1) {
            pageDiv.classList.add('--page-hard');
        }
        
        const pageContent = document.createElement('div');
        pageContent.className = 'page-content';
        
        // Add Loading Spinner HTML
        pageContent.innerHTML = `
            <div class="page-loading-spinner">
                <div class="spinner small"></div>
                <p class="page-loading-text">جاري تحضير الصفحات...</p>
            </div>
        `;
        startRotatingText(pageContent.querySelector('.page-loading-text'));
        
        const img = document.createElement('img');
        img.className = 'page-image';
        
        // Calculate actual page number
        const offset = isMobile ? 0 : 1;
        const arrIndex = i - offset;
        const actualPageNum = pages.length - arrIndex;
        
        // Eagerly load the last 3 items of the comic (Arabic pages 1 to 3)
        if (actualPageNum <= 3) {
            const loadPromise = new Promise((resolve) => {
                img.onload = () => {
                    img.classList.add('loaded');
                    const sp = pageContent.querySelector('.page-loading-spinner');
                    if(sp) sp.style.display = 'none';
                    resolve();
                };
                img.onerror = () => resolve(); // prevent infinite hang if image fails
            });
            preloadPromises.push(loadPromise);
            img.src = url;
        } else {
            img.dataset.src = url; // Lazy load the rest
        }
        
        img.alt = `صفحة ${actualPageNum}`;
        
        pageContent.appendChild(img);
        pageDiv.appendChild(pageContent);
        bookEl.appendChild(pageDiv);
    });

    // Change loading text initially
    const initLoadText = loadingEl.querySelector('p');
    initLoadText.classList.add('page-loading-text');
    initLoadText.textContent = 'جاري تحضير الصفحات...';
    startRotatingText(initLoadText);
    
    // Wait for the first 5 pages to actually download
    await Promise.all(preloadPromises);
    
    // Background load EVERYTHING else sequentially
    backgroundLoadAll();

    let flipBook;

    // Sizer Logic
    function resizeSizer() {
        const sizer = document.querySelector('.flipbook-sizer');
        if (!sizer) return;
        
        const isMob = window.innerWidth <= 768;
        const ratio = isMob ? 800 / 1131 : 1600 / 1131;
        
        const padX = isMob ? 0 : 20;
        const padY = 0; // Remove top gap entirely for better fit
        
        const availW = containerEl.clientWidth - padX;
        // Subtract height of controls (approx 75px) to prevent overlap on desktop
        const availH = containerEl.clientHeight - (isMob ? 80 : 75);
        
        if (availW <= 0 || availH <= 0) return;

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
    resizeSizer(); // Apply initial sizing before init

    if (isMobile) {
        // Custom Mobile Slider Engine
        bookEl.classList.add('mobile-slider');
        let mobileCurrentIndex = reversedPages.length - 1; // Start at Arabic cover
        
        loadingEl.style.opacity = '0';
        setTimeout(() => {
            loadingEl.style.display = 'none';
            containerEl.style.opacity = '1';
            controlsEl.classList.remove('hidden');
            
            updateMobilePages(0);
            updateMobileCounter();
        }, 500);

        let mobileMode = 'vertical'; // Default as requested
        const btnMode = document.getElementById('btn-mode');
        
        if (mobileMode === 'vertical') {
            containerEl.classList.add('vertical-mode');
            // Force lazy load for all images in vertical mode
            lazyLoadAllVertical();
        }

        btnMode.addEventListener('click', () => {
            mobileMode = (mobileMode === 'vertical') ? 'swipe' : 'vertical';
            if (mobileMode === 'vertical') {
                containerEl.classList.add('vertical-mode');
                lazyLoadAllVertical();
            } else {
                containerEl.classList.remove('vertical-mode');
                updateMobilePages(0);
            }
        });

        function lazyLoadAllVertical() {
            const allImgs = document.querySelectorAll('.page-image');
            allImgs.forEach(img => {
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    img.onload = () => {
                        img.classList.add('loaded');
                        const sp = img.closest('.page-content').querySelector('.page-loading-spinner');
                        if (sp) sp.style.display = 'none';
                    };
                }
            });
            incrementView(); // Always count view in vertical mode if they open it? 
            // Wait, request said "makes it past 6th page".
            // For vertical mode, we'll check scroll position.
        }

        if (mobileMode === 'vertical') {
            containerEl.addEventListener('scroll', () => {
                if (mobileMode !== 'vertical') return;
                const scrollPos = containerEl.scrollTop;
                const pageHeight = window.innerHeight;
                if (scrollPos > pageHeight * 5) { // Roughly page 6
                    incrementView();
                }
            });
        }

        let isDragging = false;
        let startX = 0;
        let currentX = 0;

        bookEl.addEventListener('touchstart', e => {
            if (isZoomed || e.touches.length > 1) return;
            isDragging = true;
            startX = e.touches[0].clientX;
            bookEl.classList.remove('animating');
            currentX = 0;
        }, {passive: true});

        bookEl.addEventListener('touchmove', e => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX - startX;
            
            if (mobileCurrentIndex === 0 && currentX > 0) currentX *= 0.3; 
            if (mobileCurrentIndex === reversedPages.length - 1 && currentX < 0) currentX *= 0.3;
            
            updateMobilePages(currentX);
        }, {passive: true});

        bookEl.addEventListener('touchend', e => {
            if (!isDragging) return;
            isDragging = false;
            bookEl.classList.add('animating');
            
            const threshold = bookEl.clientWidth * 0.15; 
            
            if (currentX > threshold && mobileCurrentIndex > 0) {
                mobileCurrentIndex--;
                playFlipSound();
            } else if (currentX < -threshold && mobileCurrentIndex < reversedPages.length - 1) {
                mobileCurrentIndex++;
                playFlipSound();
            }
            
            updateMobilePages(0);
            updateMobileCounter();
            
            // View counting for swipe mode
            if (mobileCurrentIndex > 5) incrementView();
        });

        function updateMobilePages(offsetPixels) {
            const allPages = bookEl.querySelectorAll('.page');
            const width = bookEl.clientWidth || window.innerWidth;
            allPages.forEach((p, i) => {
                const offsetIndex = i - mobileCurrentIndex;
                if (Math.abs(offsetIndex) > 1) {
                    p.style.display = 'none';
                } else {
                    p.style.display = 'block';
                    const basePercent = offsetIndex * 100;
                    
                    // Add papery flippy feel (subtle rotation and scale)
                    const progress = Math.abs(offsetPixels / width);
                    const rotation = (offsetPixels / width) * 10; // Max 10 degrees
                    const scale = 1 - (progress * 0.05); // Slight scale down
                    
                    p.style.transform = `translateX(calc(${basePercent}% + ${offsetPixels}px)) rotate(${rotation}deg) scale(${scale})`;
                }
            });
            if (offsetPixels === 0) lazyLoadImages(mobileCurrentIndex);
        }

        function updateMobileCounter() {
            const actualLeft = reversedPages.length - mobileCurrentIndex;
            document.getElementById('page-current').textContent = actualLeft;
            document.getElementById('page-total').textContent = reversedPages.length;
        }

        // Button Controls for Mobile (Fixed Inversion for RTL)
        document.getElementById('btn-prev').addEventListener('click', () => {
            if (isZoomed) return;
            // In Arabic RTL, the Left Arrow (btn-prev) goes FORWARD in the story
            if (mobileCurrentIndex > 0) {
                bookEl.classList.add('animating');
                mobileCurrentIndex--;
                updateMobilePages(0);
                updateMobileCounter();
                playFlipSound();
            }
        });

        document.getElementById('btn-next').addEventListener('click', () => {
            if (isZoomed) return;
            // In Arabic RTL, the Right Arrow (btn-next) goes BACKWARD in the story
            if (mobileCurrentIndex < reversedPages.length - 1) {
                bookEl.classList.add('animating');
                mobileCurrentIndex++;
                updateMobilePages(0);
                updateMobileCounter();
                playFlipSound();
            }
        });

    } else {
        // Desktop St.PageFlip Engine
        try {
            // Initialize PageFlip
            flipBook = new St.PageFlip(bookEl, {
                width: 800,
                height: 1131, // Standard comic proportion
                size: "stretch", 
                minWidth: 315,
                maxWidth: 1000,
                minHeight: 420,
                maxHeight: 1350,
                maxShadowOpacity: 0.9,
                showCover: false, // Prevent the book from physically snapping left/right
                mobileScrollSupport: false,
                usePortrait: false,
                flippingTime: 450, 
                startPage: reversedPages.length - 2
            });

            flipBook.loadFromHTML(document.querySelectorAll('.page'));
            
            // Smooth transition from loading to viewer
            loadingEl.style.opacity = '0';
            setTimeout(() => {
                loadingEl.style.display = 'none';
                containerEl.style.opacity = '1';
                controlsEl.classList.remove('hidden');
                
                updatePageCounter(flipBook, reversedPages.length);
            }, 500);

            // Flip Event
            flipBook.on('flip', (e) => {
                playFlipSound();
                updatePageCounter(flipBook, reversedPages.length);
                lazyLoadImages(e.data);
                
                // View counting for desktop
                const currentPage = flipBook.getCurrentPageIndex();
                if (currentPage > 6) incrementView();
            });

            // Button Controls for Desktop
            document.getElementById('btn-prev').addEventListener('click', () => {
                if (isZoomed) return;
                flipBook.flipPrev();
            });

            document.getElementById('btn-next').addEventListener('click', () => {
                if (isZoomed) return;
                flipBook.flipNext();
            });
            
            // Keyboard Controls
            document.addEventListener('keydown', (e) => {
                if (isZoomed) return;
                if (e.key === 'ArrowRight') {
                    flipBook.flipPrev(); // Right arrow -> Next Arabic Page
                } else if (e.key === 'ArrowLeft') {
                    flipBook.flipNext(); // Left arrow -> Prev Arabic Page
                }
            });
            
        } catch (e) {
            console.error("PageFlip init error:", e);
            loadingEl.innerHTML = '<p style="color: #ff5555;">حدث خطأ أثناء تحميل الصفحات.</p>';
        }
    }

    // Zoom Logic REMOVED per request (Keeping isZoomed flag for internal checks if needed)
    let isZoomed = false;
    let zoomScale = 1.5;
    const sizer = document.querySelector('.flipbook-sizer');
    // zoom button listener removed
    
    // Panning logic for Zoom (Pinch support)
    let isPanning = false;
    let panStartX, panStartY, scrollStartX, scrollStartY;

    const startPan = (x, y) => {
        if (!isZoomed) return;
        isPanning = true;
        panStartX = x - containerEl.offsetLeft;
        panStartY = y - containerEl.offsetTop;
        scrollStartX = containerEl.scrollLeft;
        scrollStartY = containerEl.scrollTop;
    };

    const movePan = (x, y) => {
        if (!isPanning || !isZoomed) return;
        const curX = x - containerEl.offsetLeft;
        const curY = y - containerEl.offsetTop;
        const walkX = (curX - panStartX);
        const walkY = (curY - panStartY);
        containerEl.scrollLeft = scrollStartX - walkX;
        containerEl.scrollTop = scrollStartY - walkY;
    };

    containerEl.addEventListener('mousedown', (e) => startPan(e.pageX, e.pageY));
    window.addEventListener('mouseup', () => isPanning = false);
    window.addEventListener('mousemove', (e) => {
        if (isPanning) e.preventDefault();
        movePan(e.pageX, e.pageY);
    });

    containerEl.addEventListener('touchstart', (e) => {
        if (isZoomed && e.touches.length === 1) {
            startPan(e.touches[0].pageX, e.touches[0].pageY);
        }
    }, {passive: false});

    containerEl.addEventListener('touchmove', (e) => {
        if (isPanning && isZoomed && e.touches.length === 1) {
            e.preventDefault();
            movePan(e.touches[0].pageX, e.touches[0].pageY);
        }
    }, {passive: false});

    containerEl.addEventListener('touchend', () => isPanning = false);

    // Helpers
    async function backgroundLoadAll() {
        const allImgs = document.querySelectorAll('.page-image');
        // Sequentially load to avoid saturating network
        for (let img of allImgs) {
            if (img.dataset.src) {
                await new Promise((resolve) => {
                    img.onload = () => {
                        img.classList.add('loaded');
                        const parent = img.closest('.page-content');
                        if (parent) {
                            const sp = parent.querySelector('.page-loading-spinner');
                            if (sp) sp.style.display = 'none';
                        }
                        resolve();
                    };
                    img.onerror = () => resolve();
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                });
            }
        }
    }

    function lazyLoadImages(currentIndex) {
        const allImgs = document.querySelectorAll('.page-image');
        for (let i = 0; i < allImgs.length; i++) {
            if (Math.abs(i - currentIndex) <= 4) {
                const img = allImgs[i];
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    img.onload = () => {
                        img.classList.add('loaded');
                        const parent = img.closest('.page-content');
                        if(parent) {
                            const sp = parent.querySelector('.page-loading-spinner');
                            if(sp) sp.style.display = 'none';
                        }
                    };
                }
            }
        }
    }

    function updatePageCounter(book, totalPages) {
        if (!book) return;
        const currentIndex = book.getCurrentPageIndex(); 
        
        // Desktop is always landscape since we disabled usePortrait
        const actualTotal = totalPages - 2; // remove empty padding
        const offset = 1;
        
        if (reversedPages[currentIndex] === 'empty') return;
        
        let arrIndex = currentIndex - offset;
        let actualLeft = actualTotal - arrIndex; 
        let displayStr = `${actualLeft}`;
        
        if (currentIndex < totalPages - 1 && currentIndex > 0) {
            const rightPageIdx = currentIndex + 1;
            if (reversedPages[rightPageIdx] !== 'empty' && rightPageIdx < totalPages) {
                const arrRight = rightPageIdx - offset;
                const actualRight = actualTotal - arrRight;
                displayStr = `${actualRight} - ${actualLeft}`;
            }
        }

        document.getElementById('page-current').textContent = displayStr;
        document.getElementById('page-total').textContent = actualTotal;
    }
});

// Dynamic Discovery Logic
async function checkExistsFast(url) {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        return response.ok;
    } catch (e) {
        // Fallback for file:// protocol or servers blocking HEAD
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }
}

async function discoverPages(basePath) {
    let index = 1;
    const pages = [];
    let foundAll = false;
    
    // Batch process to be fast but not overwhelming
    while (!foundAll) {
        const batch = [];
        for (let i = 0; i < 4; i++) { 
            const pageNum = index + i;
            batch.push(
                checkExistsFast(`${basePath}صفحة${pageNum}.png`)
                .then(exists => ({ pageNum, exists }))
            );
        }
        
        const results = await Promise.all(batch);
        results.sort((a, b) => a.pageNum - b.pageNum);
        
        for (const res of results) {
            if (res.exists) {
                pages.push(`${basePath}صفحة${res.pageNum}.png`);
            } else {
                foundAll = true;
                break;
            }
        }
        index += 4;
        
        if (index > 200) foundAll = true; // Failsafe
    }
    
    return pages;
}

// Sound Effect Logic
const flipAudio = new Audio('/assets/comic-viewer/Page flip.mp3');
function playFlipSound() {
    try {
        flipAudio.currentTime = 0;
        flipAudio.play().catch(() => {});
    } catch(e) {}
}
