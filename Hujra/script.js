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
        
        // Eagerly load the last 5 items of the comic (Arabic pages 1 to 5)
        if (actualPageNum <= 5) {
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
            usePortrait: true,
            flippingTime: 450, 
            startPage: isMobile ? reversedPages.length - 1 : reversedPages.length - 2
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
    } catch (e) {
        console.error("PageFlip init error:", e);
        loadingEl.innerHTML = '<p style="color: #ff5555;">حدث خطأ أثناء تحميل الصفحات.</p>';
    }

    // Flip Event
    flipBook.on('flip', (e) => {
        lazyLoadImages(e.data);
        updatePageCounter(flipBook, reversedPages.length);
        playFlipSound();
    });

    // Navigation Controls
    document.getElementById('btn-prev').addEventListener('click', () => {
        // Arabic Next Page is LTR Prev Page
        flipBook.flipPrev();
    });

    document.getElementById('btn-next').addEventListener('click', () => {
        // Arabic Prev Page is LTR Next Page
        flipBook.flipNext();
    });

    // Keyboard Controls
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') {
            flipBook.flipPrev(); // Right arrow -> Next Arabic Page
        } else if (e.key === 'ArrowLeft') {
            flipBook.flipNext(); // Left arrow -> Prev Arabic Page
        }
    });

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
        const currentIndex = book.getCurrentPageIndex(); 
        const isLandscape = book.getOrientation() === 'landscape';
        
        // Remove empty pages from calculation
        const actualTotal = isMobile ? totalPages : totalPages - 2;
        const offset = isMobile ? 0 : 1;
        
        if (reversedPages[currentIndex] === 'empty') return;
        
        let arrIndex = currentIndex - offset;
        let actualLeft = actualTotal - arrIndex; 
        let displayStr = `${actualLeft}`;
        
        if (isLandscape && currentIndex < totalPages - 1 && currentIndex > 0) {
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
