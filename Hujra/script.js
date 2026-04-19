document.addEventListener('DOMContentLoaded', async () => {
    const basePath = '../باب الحجرة/';
    const loadingEl = document.getElementById('loading');
    const containerEl = document.querySelector('.container');
    const bookEl = document.getElementById('book');
    const controlsEl = document.getElementById('controls');
    
    // Discover pages dynamically
    const pages = await discoverPages(basePath);
    
    if (pages.length === 0) {
        loadingEl.innerHTML = '<p style="color: #ff5555;">لم يتم العثور على صفحات. يرجى التأكد من وجود مجلد "باب الحجرة" والصور داخله بتسمية "صفحة1.png" وهكذا.</p>';
        return;
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
        
        // Eagerly load the last 3 items of the comic
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

    let flipBook;

    // Sizer Logic
    function resizeSizer() {
        const sizer = document.querySelector('.flipbook-sizer');
        if (!sizer) return;
        
        const isMob = window.innerWidth <= 768;
        const ratio = isMob ? 800 / 1131 : 1600 / 1131;
        
        const padX = isMob ? 20 : 80;
        const padY = isMob ? 100 : 120;
        
        const availW = containerEl.clientWidth - padX;
        const availH = containerEl.clientHeight - padY;
        
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

        let isDragging = false;
        let startX = 0;
        let currentX = 0;

        bookEl.addEventListener('touchstart', e => {
            if (e.touches.length > 1 || window.isZoomed) return;
            isDragging = true;
            startX = e.touches[0].clientX;
            bookEl.classList.remove('animating');
            currentX = 0;
        }, {passive: true});

        bookEl.addEventListener('touchmove', e => {
            if (!isDragging || window.isZoomed) return;
            currentX = e.touches[0].clientX - startX;
            
            if (mobileCurrentIndex === 0 && currentX > 0) currentX *= 0.3; 
            if (mobileCurrentIndex === reversedPages.length - 1 && currentX < 0) currentX *= 0.3;
            
            updateMobilePages(currentX);
        }, {passive: true});

        bookEl.addEventListener('touchend', e => {
            if (!isDragging || window.isZoomed) return;
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
        });

        function updateMobilePages(offsetPixels) {
            const allPages = bookEl.querySelectorAll('.page');
            const width = bookEl.clientWidth;
            allPages.forEach((p, i) => {
                const offsetIndex = i - mobileCurrentIndex;
                if (Math.abs(offsetIndex) > 1) {
                    p.style.display = 'none';
                    p.style.zIndex = 0;
                } else {
                    p.style.display = 'block';
                    const basePercent = offsetIndex * 100;
                    
                    let rotY = 0;
                    let scale = 1;
                    
                    if (offsetPixels !== 0 && offsetIndex === 0) {
                        const dragProgress = Math.abs(offsetPixels) / width;
                        rotY = (offsetPixels > 0 ? 1 : -1) * (dragProgress * 45); // Amplified 300%
                        scale = 1 - (dragProgress * 0.15); // More pronounced scale
                        p.style.zIndex = 2;
                    } else if (offsetIndex === 0) {
                        p.style.zIndex = 2;
                    } else {
                        p.style.zIndex = 1;
                    }
                    
                    p.style.transform = `translateX(calc(${basePercent}% + ${offsetPixels}px)) rotateY(${rotY}deg) scale(${scale})`;
                }
            });
            if (offsetPixels === 0) lazyLoadImages(mobileCurrentIndex);
        }

        function updateMobileCounter() {
            const actualLeft = reversedPages.length - mobileCurrentIndex;
            document.getElementById('page-current').textContent = actualLeft;
            document.getElementById('page-total').textContent = reversedPages.length;
        }

        // Button Controls for Mobile
        // In Arabic, btn-prev (Left Arrow) goes to Next Page (index--)
        document.getElementById('btn-prev').addEventListener('click', () => {
            if (mobileCurrentIndex > 0) {
                bookEl.classList.add('animating');
                mobileCurrentIndex--;
                updateMobilePages(0);
                updateMobileCounter();
                playFlipSound();
            }
        });

        // In Arabic, btn-next (Right Arrow) goes to Prev Page (index++)
        document.getElementById('btn-next').addEventListener('click', () => {
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
            });

            // Button Controls for Desktop
            document.getElementById('btn-prev').addEventListener('click', () => {
                flipBook.flipPrev();
            });

            document.getElementById('btn-next').addEventListener('click', () => {
                flipBook.flipNext();
            });
            
            // Keyboard Controls
    document.addEventListener('keydown', (e) => {
        if (window.isZoomed) return;
        if (e.key === 'ArrowRight') {
            if (isMobile) document.getElementById('btn-next').click();
            else if (flipBook) flipBook.flipPrev();
        } else if (e.key === 'ArrowLeft') {
            if (isMobile) document.getElementById('btn-prev').click();
            else if (flipBook) flipBook.flipNext();
        }
    });
    
    // Zoom & Pan System
    window.isZoomed = false;
    let panX = 0;
    let panY = 0;
    let panStartX = 0;
    let panStartY = 0;
    let isPanning = false;

    const zoomBtn = document.getElementById('btn-zoom');
    const sizerEl = document.querySelector('.flipbook-sizer');
    
    function updateZoomTransform() {
        if (window.isZoomed) {
            sizerEl.style.transform = `translate(${panX}px, ${panY}px) scale(2.5)`;
        } else {
            sizerEl.style.transform = `translate(0px, 0px) scale(1)`;
            panX = 0;
            panY = 0;
        }
    }

    zoomBtn.addEventListener('click', () => {
        window.isZoomed = !window.isZoomed;
        sizerEl.style.transition = 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)';
        
        if (window.isZoomed) {
            // Zoom out icon (Filled)
            zoomBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M6.5 7a.5.5 0 0 1 0 1h-3a.5.5 0 0 1 0-1h3z"/><path d="M15.708 14.293L12.5 11.086A6.5 6.5 0 1 0 11.086 12.5l3.207 3.207a1 1 0 0 0 1.415-1.414zM2 6.5a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0z"/></svg>`;
            containerEl.classList.add('zoomed');
        } else {
            // Zoom in icon (Filled)
            zoomBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M15.708 14.293L12.5 11.086A6.5 6.5 0 1 0 11.086 12.5l3.207 3.207a1 1 0 0 0 1.415-1.414zM2 6.5a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0zM6.5 4a.5.5 0 0 1 .5.5V6h1.5a.5.5 0 0 1 0 1H7v1.5a.5.5 0 0 1-1 0V7H4.5a.5.5 0 0 1 0-1H6V4.5a.5.5 0 0 1 .5-.5z"/></svg>`;
            containerEl.classList.remove('zoomed');
        }
        updateZoomTransform();
        
        setTimeout(() => {
            sizerEl.style.transition = ''; 
        }, 300);
    });

    // Panning & Intercept Logic
    function handleStart(e) {
        if (!window.isZoomed) return;
        
        // Ensure we stop standard behavior
        isPanning = true;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        panStartX = clientX - panX;
        panStartY = clientY - panY;
        
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
    }

    function handleMove(e) {
        if (!window.isZoomed || !isPanning) return;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        
        let newX = clientX - panStartX;
        let newY = clientY - panStartY;
        
        // Dynamic bounds based on scaled size (2.5x)
        const limitX = sizerEl.clientWidth * 0.75;
        const limitY = sizerEl.clientHeight * 0.75;
        
        panX = Math.max(-limitX, Math.min(limitX, newX));
        panY = Math.max(-limitY, Math.min(limitY, newY));
        
        updateZoomTransform();
        
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
    }

    function handleEnd(e) {
        if (window.isZoomed && isPanning) {
            isPanning = false;
            e.stopPropagation();
        }
    }

    // Attach to both container for start and window for move/end
    containerEl.addEventListener('mousedown', handleStart, {capture: true});
    containerEl.addEventListener('touchstart', handleStart, {capture: true, passive: false});

    window.addEventListener('mousemove', handleMove, {capture: true, passive: false});
    window.addEventListener('touchmove', handleMove, {capture: true, passive: false});

    window.addEventListener('mouseup', handleEnd, {capture: true});
    window.addEventListener('touchend', handleEnd, {capture: true});
    window.addEventListener('touchcancel', handleEnd, {capture: true});    
            
        } catch (e) {
            console.error("PageFlip init error:", e);
            loadingEl.innerHTML = '<p style="color: #ff5555;">حدث خطأ أثناء تحميل الصفحات.</p>';
        }
    }

    // Helpers
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
const flipAudio = new Audio('Page flip.mp3');
function playFlipSound() {
    try {
        flipAudio.currentTime = 0;
        flipAudio.play().catch(() => {});
    } catch(e) {}
}
