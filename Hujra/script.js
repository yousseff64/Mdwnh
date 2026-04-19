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

    // Emulate RTL by reversing the pages. 
    // In LTR, the last page is on the Left side, which matches the position of a front cover in Arabic books.
    const reversedPages = [...pages].reverse();
    
    // Create HTML elements for each page
    reversedPages.forEach((url, i) => {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        
        // Make the first and last physical pages hard (covers)
        if (i === 0 || i === reversedPages.length - 1) {
            pageDiv.classList.add('--page-hard');
        }
        
        const pageContent = document.createElement('div');
        pageContent.className = 'page-content';
        
        const img = document.createElement('img');
        img.className = 'page-image';
        
        // The Arabic cover (Page 1) is at the END of this reversed array.
        // We eagerly load the last 4 items of the array, which correspond to Arabic pages 1, 2, 3, 4.
        const actualPageNum = reversedPages.length - i;
        if (actualPageNum <= 4) {
            img.src = url;
            img.onload = () => img.classList.add('loaded');
        } else {
            img.dataset.src = url; // Lazy load the rest
        }
        
        img.alt = `صفحة ${actualPageNum}`;
        
        pageContent.appendChild(img);
        pageDiv.appendChild(pageContent);
        bookEl.appendChild(pageDiv);
    });

    // Initialize PageFlip
    const flipBook = new St.PageFlip(bookEl, {
        width: 800,
        height: 1131, // Standard comic proportion
        size: "stretch",
        minWidth: 315,
        maxWidth: 1000,
        minHeight: 420,
        maxHeight: 1350,
        maxShadowOpacity: 0.5,
        showCover: true,
        mobileScrollSupport: false,
        usePortrait: true
    });

    flipBook.loadFromHTML(document.querySelectorAll('.page'));
    
    // Smooth transition from loading to viewer
    loadingEl.style.opacity = '0';
    setTimeout(() => {
        loadingEl.style.display = 'none';
        containerEl.style.opacity = '1';
        controlsEl.classList.remove('hidden');
        
        // Turn immediately to the last LTR page (which is the Arabic cover)
        flipBook.turnToPage(reversedPages.length - 1);
        updatePageCounter(flipBook, reversedPages.length);
    }, 500);

    // Flip Event
    flipBook.on('flip', (e) => {
        lazyLoadImages(e.data);
        updatePageCounter(flipBook, reversedPages.length);
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
        // Load images within a range to ensure smooth reading
        for (let i = 0; i < allImgs.length; i++) {
            if (Math.abs(i - currentIndex) <= 4) {
                const img = allImgs[i];
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    img.onload = () => img.classList.add('loaded');
                }
            }
        }
    }

    function updatePageCounter(book, totalPages) {
        const currentIndex = book.getCurrentPageIndex(); 
        const isLandscape = book.getOrientation() === 'landscape';
        
        let actualLeft = totalPages - currentIndex; 
        let displayStr = `${actualLeft}`;
        
        if (isLandscape && currentIndex < totalPages - 1 && currentIndex > 0) {
            const rightPageIdx = currentIndex + 1;
            if (rightPageIdx < totalPages) {
                const actualRight = totalPages - rightPageIdx;
                displayStr = `${actualRight} - ${actualLeft}`;
            }
        }

        document.getElementById('page-current').textContent = displayStr;
        document.getElementById('page-total').textContent = totalPages;
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
