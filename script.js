document.addEventListener('DOMContentLoaded', () => {

    // ================= Lenis Smooth Scroll =================
    const lenis = new Lenis({
        duration: 1.0, // Slightly more smoothing (was 0.8)
        easing: (t) => {
            // Cubic ease-out with cleaner settling
            return --t * t * t + 1;
        },
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1.25, // Reduced from 1.5
        smoothTouch: false,
        touchMultiplier: 2.5, // Reduced from 3
        infinite: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    // ================= Smooth Scroll for Anchor Links =================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const target = this.getAttribute('href');
            if (target === '#') return;

            const targetElement = document.querySelector(target);
            if (targetElement) {
                e.preventDefault();

                // Special case for hero scroll arrow: 50% less distance
                let scrollTarget = target;
                let offset = 0;

                if (this.closest('.scroll-indicator')) {
                    // Calculate Y position of target and take 50% of it
                    const targetRect = targetElement.getBoundingClientRect();
                    const absoluteTargetY = targetRect.top + window.scrollY;
                    scrollTarget = absoluteTargetY * 0.5;
                }

                lenis.scrollTo(scrollTarget, {
                    duration: 1.2,
                    offset: offset
                });
            }
        });
    });

    // Services Tabs Logic
    // Services Tabs Logic
    const serviceBtns = document.querySelectorAll('.service-btn');
    const serviceTexts = document.querySelectorAll('.service-text');
    const serviceImg = document.getElementById('service-img');
    const serviceIndicator = document.querySelector('.service-indicator');
    const controlsContainer = document.querySelector('.services-controls');
    let isTransitioning = false; // Prevent spam clicking

    // Function to move indicator
    function moveIndicator(targetBtn) {
        if (!serviceIndicator || !targetBtn) return;

        // Use offsetLeft and offsetWidth relative to the .services-controls container
        const left = targetBtn.offsetLeft;
        const width = targetBtn.offsetWidth;

        serviceIndicator.style.left = `${left}px`;
        serviceIndicator.style.width = `${width}px`;
    }

    // Initialize indicator position
    // Small timeout to ensure fonts/layout are ready
    setTimeout(() => {
        const activeBtn = document.querySelector('.service-btn.active');
        if (activeBtn) moveIndicator(activeBtn);
    }, 100);

    // Mapping IDs to Image Paths
    // Note: Adjust paths if your file system is different or deployed differently
    const imageMap = {
        'animation': 'Images/Animation.png',
        'editing': 'Images/Editing.png',
        'motion': 'Images/Motion.png',
        'photography': 'Images/Recording.jpg', // Using Recording.jpg for now as placeholder for photography/general
        'other': 'Images/Other.png'
    };

    serviceBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('active')) return;

            const targetId = btn.getAttribute('data-target');
            const currentBtn = document.querySelector('.service-btn.active');
            const currentText = document.querySelector('.service-text.active');

            // Switch Buttons immediately
            if (currentBtn) currentBtn.classList.remove('active');
            btn.classList.add('active');

            // Move Indicator immediately (no lockout)
            moveIndicator(btn);

            // 2. Trigger Content Swap
            // We still use a small timeout for the 'wipe' effect, but the buttons are never locked.
            if (currentText) currentText.classList.add('wipe-out');
            serviceImg.classList.add('wipe-out');

            setTimeout(() => {
                // Clear old states
                serviceTexts.forEach(t => t.classList.remove('active', 'wipe-out', 'wipe-in'));
                serviceImg.classList.remove('wipe-out', 'wipe-in');

                // Update Content
                const nextText = document.getElementById(targetId);
                if (nextText) nextText.classList.add('active', 'wipe-in');

                if (imageMap[targetId]) {
                    serviceImg.src = imageMap[targetId];
                }
                serviceImg.classList.add('wipe-in');

                // Cleanup animation classes
                setTimeout(() => {
                    document.querySelectorAll('.wipe-in').forEach(el => el.classList.remove('wipe-in'));
                }, 400);

            }, 300);
        });
    });

    // Optional: Add simple parallax or reveal on scroll here if needed later
    // Mobile Pagination Logic
    const scroller = document.querySelector('.mobile-services-scroller');
    const dots = document.querySelectorAll('.pagination-dot');
    const cards = document.querySelectorAll('.mobile-service-card');

    if (scroller && dots.length > 0 && cards.length > 0) {
        // 1. Click to Scroll
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                if (cards[index]) {
                    cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }
            });
        });

        // 2. Scroll Spy (Update Active Dot)
        const observerOptions = {
            root: scroller,
            threshold: 0.6 // Trigger when 60% visible
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Find index of intersecting card
                    const index = Array.from(cards).indexOf(entry.target);
                    if (index !== -1) {
                        // Update Dots
                        dots.forEach(d => d.classList.remove('active'));
                        if (dots[index]) dots[index].classList.add('active');
                    }
                }
            });
        }, observerOptions);

        cards.forEach(card => observer.observe(card));
    }

    // Team Members Logic (Collision Detection + Scroll Reveal)
    const teamSection = document.querySelector('.team-section');
    const memberContainer = document.querySelector('.team-members-cloud');

    // 1. Define Image Sources
    const mdwnhSectionsFiles = [
        "photo_3_2026-01-20_11-34-16.jpg",
        "photo_5_2026-01-20_11-34-16.jpg",
        "photo_6_2026-01-20_11-34-16.jpg",
        "photo_7_2026-01-20_11-34-16.jpg",
        "photo_8_2026-01-20_11-34-16.jpg"
    ];

    // Explicit list to avoid missing files (7097, 7099 are missing)
    const sirajMembersFiles = [
        "IMG_7096.png", "IMG_7098.png", "IMG_7100.png", "IMG_7101.png", "IMG_7102.png",
        "IMG_7103.png", "IMG_7104.png", "IMG_7105.png", "IMG_7106.png", "IMG_7107.png",
        "IMG_7108.png", "IMG_7109.png", "IMG_7110.png", "IMG_7111.png", "IMG_7112.png",
        "IMG_7113.png", "IMG_7114.png", "IMG_7115.png", "IMG_7116.png", "IMG_7117.png",
        "IMG_7118.png", "IMG_7119.png", "IMG_7120.png", "IMG_7121.png", "IMG_7122.png",
        "IMG_7123.png", "IMG_7124.png", "IMG_7125.png", "IMG_7126.png", "IMG_7127.png",
        "IMG_7128.png", "IMG_7129.png", "IMG_7130.png", "IMG_7131.png", "IMG_7132.png",
        "IMG_7133.png", "IMG_7134.png", "IMG_7135.png"
    ];

    if (teamSection && memberContainer) {
        let members = []; // Will hold the DOM elements
        const positions = []; // Store placed {x, y, radius}
        const memberSize = 80; // Visual size (approx diameter)
        const buffer = 10; // Extra spacing between items

        // Config Zones
        const innerRadiusFixed = 210; // Closer (Was 230)
        const outerZoneStart = 310;   // Increased to 310 (Avoid inner overlap)
        const outerZoneEnd = 430;     // Increased to 430 (More space for 20 items to stagger)

        // Use a set to track initialized members to prevent duplicates if scroll observer fires multiple times
        let isInitialized = false;

        // --- Init Function ---
        const initTeamMembers = () => {
            if (isInitialized) return;
            isInitialized = true;

            memberContainer.innerHTML = ''; // CTS
            members = [];

            // Helper to create img
            const createMember = (src, type, className = 'member-img') => {
                const img = document.createElement('img');
                img.src = src;
                img.className = className;
                img.dataset.type = type;

                // Randomize Shake Phase
                img.style.animationDelay = `-${Math.random() * 5}s`;

                memberContainer.appendChild(img);
                members.push(img);
                return img;
            };

            // A. Spawn Inner (Immediate)
            mdwnhSectionsFiles.forEach((file, index) => {
                const img = createMember(`MdwnhSections/${file}`, 'inner', 'member-img section-member');
                // Track index for orbit spacing
                img.dataset.orbitIndex = index;
                // Initial fade in
                setTimeout(() => img.style.opacity = '1', index * 100);
            });

            // Start Orbit Loop immediately so they appear moving
            startOrbitLoop();

            // B. Spawn Outer (Delayed 250ms)
            setTimeout(() => {
                const shuffledSiraj = [...sirajMembersFiles].sort(() => 0.5 - Math.random());
                const selectedSiraj = shuffledSiraj.slice(0, 20);

                selectedSiraj.forEach((file) => {
                    createMember(`Siraj-members/${file}`, 'outer');
                });

                // Place and Reveal Outer
                placeOuterMembers();

                // Reveal animation for outer (Randomized Order)
                const outerMembers = members.filter(m => m.dataset.type === 'outer');
                // Create a shuffled copy for reveal order to avoid radial effect
                const shuffledReveal = [...outerMembers].sort(() => 0.5 - Math.random());

                shuffledReveal.forEach((m, i) => {
                    setTimeout(() => m.style.opacity = '1', i * 50); // Slower stagger for pop effect
                });

                // Re-bind drag events for new elements
                setupDragEvents();

            }, 250);

            setupDragEvents();
        };

        // --- Orbit Logic (Inner & Outer) ---
        let orbitAngle = 0;
        let orbitOuterAngle = 0; // Separate angle for outer ring
        let animationFrameId;

        const startOrbitLoop = () => {
            // 0.001 rad/frame approx 60fps
            const speed = 0.0015;
            const outerSpeed = speed * 0.3; // 30% speed for outer ring

            // Spring Physics Constants
            const stiffness = 0.02; // Keep slow pull
            const damping = 0.85;   // Reduced from 0.95 to Significantly reduce overshoot (High Friction)
            const precision = 0.5; // stop when within 0.5px

            const updateOrbit = () => {
                orbitAngle += speed;
                orbitOuterAngle += outerSpeed;

                const innerMembers = members.filter(m => m.dataset.type === 'inner');
                const outerMembers = members.filter(m => m.dataset.type === 'outer');

                // Helper to Apply Position with Snapping (Spring)
                const applyMotion = (member, targetX, targetY) => {
                    member.dataset.originalX = targetX;
                    member.dataset.originalY = targetY;

                    if (member.classList.contains('dragging')) return;

                    if (member.classList.contains('snapping')) {
                        let curX = parseFloat(member.dataset.lerpX);
                        let curY = parseFloat(member.dataset.lerpY);
                        let vx = parseFloat(member.dataset.vx || 0);
                        let vy = parseFloat(member.dataset.vy || 0);

                        // Spring Force: F = -k * x - d * v
                        const dx = targetX - curX;
                        const dy = targetY - curY;

                        const ax = dx * stiffness - vx * (1 - damping); // Damping factor adjusted
                        const ay = dy * stiffness - vy * (1 - damping);

                        // Or standard Verlet/Euler:
                        // force = (target - current) * stiffness
                        // velocity = velocity * damping + force
                        // position = position + velocity

                        vx = (vx + dx * stiffness) * damping;
                        vy = (vy + dy * stiffness) * damping;

                        curX += vx;
                        curY += vy;

                        member.dataset.lerpX = curX;
                        member.dataset.lerpY = curY;
                        member.dataset.vx = vx;
                        member.dataset.vy = vy;

                        member.style.left = `calc(50% + ${curX}px)`;
                        member.style.top = `calc(50% + ${curY}px)`;

                        // Stop snapping if stopped and close
                        const speedSq = vx * vx + vy * vy;
                        const distSq = dx * dx + dy * dy;

                        if (speedSq < 0.01 && distSq < precision * precision) {
                            member.classList.remove('snapping');
                            // Ensure final exact placement
                            member.style.left = `calc(50% + ${targetX}px)`;
                            member.style.top = `calc(50% + ${targetY}px)`;
                        }
                    } else {
                        member.style.left = `calc(50% + ${targetX}px)`;
                        member.style.top = `calc(50% + ${targetY}px)`;
                    }
                };

                // --- Animate Inner Members ---
                const total = innerMembers.length;
                const sector = (2 * Math.PI) / (total || 1);

                innerMembers.forEach((member) => {
                    const index = parseInt(member.dataset.orbitIndex || 0);
                    const angle = orbitAngle + (index * sector);
                    const x = Math.cos(angle) * innerRadiusFixed;
                    const y = Math.sin(angle) * (innerRadiusFixed * 0.8);
                    applyMotion(member, x, y);
                });

                // --- Animate Outer Members ---
                outerMembers.forEach((member) => {
                    if (!member.dataset.initialAngle) return;
                    const initialAngle = parseFloat(member.dataset.initialAngle);
                    const r = parseFloat(member.dataset.radius);
                    const currentAngle = initialAngle + orbitOuterAngle;
                    const x = Math.cos(currentAngle) * r;
                    const y = Math.sin(currentAngle) * (r * 0.8);
                    applyMotion(member, x, y);
                });

                animationFrameId = requestAnimationFrame(updateOrbit);
            };

            // Cancel any existing loop
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
            updateOrbit();
        };

        // --- Placement Logic (Outer Only) ---
        const placeOuterMembers = () => {
            positions.length = 0;
            const globalAngleOffset = Math.random() * 2 * Math.PI;

            const outerMembers = members.filter(m => m.dataset.type === 'outer');
            const outerSector = (2 * Math.PI) / outerMembers.length;

            outerMembers.forEach((member, index) => {
                let placed = false;
                let attempts = 0;
                let x, y;
                let placedAngle = 0;
                let placedRadius = 0;

                while (!placed && attempts < 500) {
                    const jitter = (Math.random() - 0.5) * outerSector * 2.5;
                    const angle = globalAngleOffset + (index * outerSector) + jitter;
                    const r = outerZoneStart + Math.random() * (outerZoneEnd - outerZoneStart);

                    x = Math.cos(angle) * r;
                    y = Math.sin(angle) * (r * 0.8);

                    // Collision Check
                    let overlap = false;
                    for (const pos of positions) {
                        const dx = x - pos.x;
                        const dy = y - pos.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < (memberSize + buffer)) {
                            overlap = true;
                            break;
                        }
                    }

                    if (!overlap) {
                        positions.push({ x, y });
                        placed = true;
                        placedAngle = angle;
                        placedRadius = r;
                    }
                    attempts++;
                }

                if (!placed) {
                    const angle = globalAngleOffset + (index * outerSector);
                    const r = outerZoneEnd;
                    x = Math.cos(angle) * r;
                    y = Math.sin(angle) * (r * 0.8);
                    positions.push({ x, y });

                    placedAngle = angle;
                    placedRadius = r;
                }

                member.dataset.initialAngle = placedAngle;
                member.dataset.radius = placedRadius;

                applyPosition(member, x, y);
            });
        };

        function applyPosition(member, x, y) {
            member.style.left = `calc(50% + ${x}px)`;
            member.style.top = `calc(50% + ${y}px)`;
            member.dataset.originalX = x;
            member.dataset.originalY = y;
        }

        // Reveal on Scroll
        // Initialize Team Members immediately
        initTeamMembers();


        // --- Drag & Drop Interaction (Wrapped) ---
        let activeMember = null;
        let startX = 0, startY = 0;
        let initialLeft = 0, initialTop = 0;

        function setupDragEvents() {
            members.forEach(member => {
                member.removeEventListener('mousedown', startDrag); // safety
                member.addEventListener('mousedown', startDrag);
                member.addEventListener('touchstart', startDrag, { passive: false });
            });
        }

        function startDrag(e) {
            e.preventDefault();
            // Prevent dragging inner members
            if (this.dataset.type === 'inner') return;

            if (activeMember && activeMember !== this) endDrag();
            activeMember = this;

            const clientX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
            const clientY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;

            startX = clientX;
            startY = clientY;

            const style = window.getComputedStyle(activeMember);
            initialLeft = parseFloat(style.left);
            initialTop = parseFloat(style.top);

            activeMember.classList.add('dragging');
            activeMember.style.transition = 'none';
        }

        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag, { passive: false });
        document.addEventListener('mouseup', endDrag);
        document.addEventListener('touchend', endDrag);
        window.addEventListener('mouseup', endDrag);

        function drag(e) {
            if (!activeMember) return;
            e.preventDefault();

            const clientX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
            const clientY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;

            activeMember.style.left = `${initialLeft + dx}px`;
            activeMember.style.top = `${initialTop + dy}px`;
        }

        function endDrag() {
            if (!activeMember) return;
            const currentElement = activeMember;
            currentElement.classList.remove('dragging');
            currentElement.classList.add('snapping');

            // Restore transitions for smooth scale/translate (Proximity effect)
            // We explicitly do NOT transition 'left' and 'top' as JS handles those
            currentElement.style.transition = 'scale 0.4s ease-out, translate 0.4s ease-out, z-index 0s';

            // Calculate current visual position relative to center for smooth catch-up
            const container = document.querySelector('.team-container');
            const rect = container.getBoundingClientRect();
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const style = window.getComputedStyle(currentElement);
            const currentLeft = parseFloat(style.left);
            const currentTop = parseFloat(style.top);

            // Convert to offset from center
            currentElement.dataset.lerpX = currentLeft - centerX;
            currentElement.dataset.lerpY = currentTop - centerY;

            // Init velocity
            currentElement.dataset.vx = 0;
            currentElement.dataset.vy = 0;

            activeMember = null;
        }

        // --- Proximity Repulsion ---
        teamSection.addEventListener('mousemove', (e) => {
            const containerRect = document.querySelector('.team-container').getBoundingClientRect();
            const centerX = containerRect.left + containerRect.width / 2;
            const centerY = containerRect.top + containerRect.height / 2;
            const cursorX = e.clientX;
            const cursorY = e.clientY;

            const threshold = 250;
            const maxShift = 20;

            // Logic applied to `members` array (which is now dynamic)
            let closestMember = null;
            let minDistance = Infinity;

            members.forEach(member => {
                if (member.classList.contains('dragging') || !member.dataset.originalX) return;
                const memberScreenX = centerX + parseFloat(member.dataset.originalX);
                const memberScreenY = centerY + parseFloat(member.dataset.originalY);
                const dist = Math.sqrt(Math.pow(memberScreenX - cursorX, 2) + Math.pow(memberScreenY - cursorY, 2));

                if (dist < minDistance) {
                    minDistance = dist;
                    closestMember = member;
                }
            });

            members.forEach(member => {
                if (member.classList.contains('dragging') || !member.dataset.originalX) return;
                // Skip if currently being dragged

                const memberScreenX = centerX + parseFloat(member.dataset.originalX);
                const memberScreenY = centerY + parseFloat(member.dataset.originalY);
                const dx = memberScreenX - cursorX;
                const dy = memberScreenY - cursorY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < threshold) {
                    if (member === closestMember) {
                        member.style.translate = '0px 0px';
                        member.style.scale = '1.15';
                        member.style.zIndex = '50';
                        member.style.cursor = 'pointer';
                    } else {
                        const force = (threshold - dist) / threshold;
                        const shiftX = (dx / dist) * maxShift * force;
                        const shiftY = (dy / dist) * maxShift * force;
                        member.style.translate = `${shiftX}px ${shiftY}px`;
                        member.style.scale = '1';
                        member.style.zIndex = '1';
                    }
                } else {
                    if (member.style.translate !== '0px 0px') member.style.translate = '0px 0px';
                    if (member.style.scale !== '1') member.style.scale = '1';
                    if (member.style.zIndex !== '') member.style.zIndex = '';
                }
            });
        });

        // --- Handle Resize ---
        let resizeTimeout;
        window.addEventListener('resize', () => {
            // Debounce resize
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Re-place outer members on significant resize to ensure they stay in bounds?
                // For now, simpler approach: just ensure logic doesn't break.
                // Ideally, we might want to re-run placement if screen size changes drastically, 
                // but that resets the animation. 
                // Let's just ensure the container rects used in mousemove are fresh (they are queried live in mousemove).
            }, 200);
        });
    }

    // --- Latest Work Data (Mock - Update manually or connect API) ---
    // TO UPDATE VIDEOS: Edit this array. Copy/Paste a block { ... } to add more.
    const latestVideos = [
        {
            title: "مشاعر يتيم",
            desc: "مشاهد فنية قصصية جسدنا فيها ما سطره الشاعر أحمد بخيت في قصيدته الشهيرة قمر جنوبي والتي وصف فيها مشاعر اليتيم",
            tag: "رسم - مونتاج",
            thumbDesktop: "Images/Yateem.png", // Vertical for Desktop (9:16)
            thumbMobile: "Images/YateemFull.png",   // Horizontal for Mobile (16:9)
            link: "https://www.youtube.com/watch?v=l34NFa_Jgak",
            account: "@mdwn.c"
        },
        {
            title: "قضية سمرقند",
            desc: "بعد خمسة أعوام من اقتحام الدخلاء للبلدة، فتى حالم ومندفع، تم اختياره ليُبلِغ رسالة كانت هي الأمل الوحيد لنصرة بلدته الحبيبة سَمَرْقَنْد، وفي سبيل ذلك، انطلق في رحلة محفوفة بالغموض والعجائب التي لم يتوقعها أحد؛ آملًا أن يلتقي بالحاكم الذي يقود ذلك العدو المعتد، وتبليغه رسالة سمرقند.",
            tag: "رسم - تصميم",
            thumbDesktop: "Images/samarqand.png",
            thumbMobile: "Images/samarqandFull.png",
            link: "https://www.youtube.com/watch?v=Z0SJd9hoC6U",
            account: "@mdwn.c"
        },
        {
            title: "مع الله",
            desc: "مجموعة من المقاطع الدعوية و الإيمانية التي عرضت. بوسائل إبداعية فريدة وقريبة للجمهور عبر (مونتاج، موشن, انيميشن)",
            tag: "مونتاج - موشن - انيميشن",
            thumbDesktop: "Images/withAllah.png",
            thumbMobile: "Images/withAllahFull.png",
            link: "https://www.instagram.com/withAllah01/",
            account: "@withAllah01"
        },
        {
            title: "بودكاست يا غلام",
            desc: " بودكاست أنتجناه من بداية اختيار الضيف وزوايا التصوير حتى المونتاج والنشر. وهو عبارة عن لقاءات مع شخصيات من شتّى الأعمار، ومن أصحاب التجارب الشخصية والقصص الملهمة التي تهم كثيرًا من شباب الجيل المعاصر.",
            tag: "تصوير - مونتاج",
            thumbDesktop: "Images/Ghulam.png",
            thumbMobile: "Images/GhulamFull.png",
            link: "https://www.youtube.com/watch?v=h9WQT7gMP6E&",
            account: "@mdwn.c"
        }
    ];

    const latestGrid = document.getElementById('latest-grid');
    if (latestGrid) {
        latestVideos.forEach(video => {
            const card = document.createElement('div');
            card.className = 'latest-card';
            card.innerHTML = `
                <div class="latest-thumb">
                    <picture>
                        <source media="(max-width: 768px)" srcset="${video.thumbMobile}">
                        <img src="${video.thumbDesktop}" alt="${video.title}">
                    </picture>
                </div>
                <div class="latest-content">
                    <div class="latest-title-row">
                        <div class="latest-title">${video.title}</div>
                        <div class="latest-desc">${video.desc}</div>
                    </div>
                    <div class="latest-tags">
                        <span class="latest-tag">${video.tag}</span>
                    </div>
                    <div class="latest-footer">
                        <a href="${video.link}" target="_blank" class="latest-watch-btn">
                            <span>شاهد</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </a>
                    </div>
                </div>
            `;
            latestGrid.appendChild(card);
        });
    }

    // --- Latest Work Gradient Interaction ---
    const latestWorkSection = document.getElementById('latest-work');
    const gradBg = document.getElementById('latest-gradient-bg');

    if (latestWorkSection && gradBg) {
        // 1. Mouse Tracking
        latestWorkSection.addEventListener('mousemove', (e) => {
            const rect = latestWorkSection.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;

            gradBg.style.setProperty('--grad-x', `${x}%`);
            gradBg.style.setProperty('--grad-y', `${y}%`);
        });

        // 2. Hover Visibility Toggle
        latestWorkSection.addEventListener('mouseenter', () => {
            gradBg.style.opacity = '0.1'; // Show gradient at 15% opacity
        });

        latestWorkSection.addEventListener('mouseleave', () => {
            gradBg.style.opacity = '0'; // Hide gradient
        });

        // 3. Smooth Color Cycling
        const colors = ['#086fb6', '#3bb9ab', '#f4c82b', '#f04e3a'];
        let colorIndex = 0;

        setInterval(() => {
            colorIndex = (colorIndex + 1) % colors.length;
            gradBg.style.setProperty('--grad-color', colors[colorIndex]);
        }, 3000); // Change color every 3 seconds
    }

    // --- Social Media Links Configuration ---
    // TO UPDATE LINKS: Change the URLs below
    const socialLinks = {
        youtube: "https://www.youtube.com/@Mdwn.c",
        linkedin: "https://www.linkedin.com/company/mdwn-studio/",
        instagram: "https://www.instagram.com/mdwn.c/",
        tiktok: "https://www.tiktok.com/@mdwn.c",
        behance: "https://www.behance.net/gallery/236817445/_",
        discord: "https://discord.gg/Pz2jPCHtF4"
    };

    // Configure Social Links
    document.querySelectorAll('.social-btn').forEach(btn => {
        const platform = btn.classList[1]; // e.g., 'youtube', 'linkedin'
        if (socialLinks[platform]) {
            btn.href = socialLinks[platform];
        }
    });

    // ================= Video Player Modal =================
    const videoModal = document.getElementById('video-modal');
    const heroVideoBtn = document.getElementById('hero-video-btn');
    const videoCloseBtn = document.querySelector('.video-close-btn');
    const vimeoPlayer = document.getElementById('vimeo-player');
    const vimeoVideoUrl = 'https://player.vimeo.com/video/1155695572?autoplay=1&title=0&byline=0&portrait=0';

    function openVideoModal() {
        vimeoPlayer.src = vimeoVideoUrl;
        videoModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Prevent background scroll
    }

    function closeVideoModal() {
        videoModal.classList.add('hidden');
        document.body.style.overflow = ''; // Restore scroll

        // Wait for CSS transition (500ms) before clearing src to avoid jumpy exit
        setTimeout(() => {
            if (videoModal.classList.contains('hidden')) {
                vimeoPlayer.src = '';
            }
        }, 500);
    }

    // Open modal on hero button click
    if (heroVideoBtn) {
        heroVideoBtn.addEventListener('click', openVideoModal);
    }

    // Close modal on X button click
    if (videoCloseBtn) {
        videoCloseBtn.addEventListener('click', closeVideoModal);
    }

    // Close modal on backdrop click
    if (videoModal) {
        videoModal.addEventListener('click', (e) => {
            if (e.target === videoModal) {
                closeVideoModal();
            }
        });
    }

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !videoModal.classList.contains('hidden')) {
            closeVideoModal();
        }
    });

    // --------------------------------------------------------------------------
    // 7. Peeking Characters Logic (Contact Section)
    // --------------------------------------------------------------------------
    const memberImages = [
        "IMG_7096.png", "IMG_7098.png", "IMG_7100.png", "IMG_7101.png", "IMG_7102.png",
        "IMG_7103.png", "IMG_7104.png", "IMG_7105.png", "IMG_7106.png", "IMG_7107.png",
        "IMG_7108.png", "IMG_7109.png", "IMG_7110.png", "IMG_7111.png", "IMG_7112.png",
        "IMG_7113.png", "IMG_7114.png", "IMG_7115.png", "IMG_7116.png", "IMG_7117.png",
        "IMG_7118.png", "IMG_7119.png", "IMG_7120.png", "IMG_7121.png", "IMG_7122.png",
        "IMG_7123.png", "IMG_7124.png", "IMG_7125.png", "IMG_7126.png", "IMG_7127.png",
        "IMG_7128.png", "IMG_7129.png", "IMG_7130.png", "IMG_7131.png", "IMG_7132.png",
        "IMG_7133.png", "IMG_7134.png", "IMG_7135.png"
    ];

    function initPeekingCharacters() {
        const container = document.querySelector('.peeking-chars-container');
        const contactSection = document.querySelector('.contact-section'); // observe section, not card

        if (!container || !contactSection || window.innerWidth <= 768) return;

        // Ensure we clear any existing chars initially
        container.innerHTML = '';

        let hasPeeked = false;

        const gradient = document.querySelector('.peeking-gradient');

        if (!hasPeeked) {
            hasPeeked = true;
            // Trigger Reveal

            // Show Gradient
            if (gradient) gradient.classList.add('visible');

            // 2. Pick random members (Total 27: 7 Front + 20 Back)
            const totalNeeded = 27;
            const shuffled = [...memberImages].sort(() => 0.5 - Math.random());
            // Ensure we have enough
            while (shuffled.length < totalNeeded) {
                shuffled.push(...[...memberImages].sort(() => 0.5 - Math.random()));
            }

            const frontMembers = shuffled.slice(0, 7);
            const backMembers = shuffled.slice(7, 27);

            // --- Helper to Create Members ---
            const spawnRow = (list, type, count) => {
                const slotWidth = 100 / count;

                list.forEach((filename, index) => {
                    const img = document.createElement('img');
                    img.src = `Siraj-members/${filename}`;
                    img.classList.add('peeking-char');
                    img.classList.add(type); // 'front-row' or 'back-row'

                    const centerOfSlot = (index * slotWidth) + (slotWidth / 2);
                    const jitter = (Math.random() * 8) - 4;

                    img.style.left = `${centerOfSlot + jitter}%`;

                    let scaleBase = 0.9;
                    if (type === 'back-row') scaleBase = 0.85;

                    const scale = scaleBase + Math.random() * 0.2;
                    img.style.height = `${160 * scale}px`;

                    const baseZ = type === 'front-row' ? 10 : 0;
                    img.style.zIndex = baseZ + Math.floor(Math.random() * 5);

                    container.appendChild(img);
                });
            };

            // 3. Create DOM Elements
            spawnRow(backMembers, 'back-row', 20);
            spawnRow(frontMembers, 'front-row', 7);

            // 4. Trigger Animation (Staggered)
            requestAnimationFrame(() => {
                const frontChars = document.querySelectorAll('.front-row');
                const backChars = document.querySelectorAll('.back-row');

                // A. Reveal Front Row (Fast)
                frontChars.forEach((char, i) => {
                    setTimeout(() => {
                        char.classList.add('visible');
                    }, i * 50);
                });

                // B. Reveal Back Row (Delayed)
                backChars.forEach((char, i) => {
                    const baseDelay = 150;
                    setTimeout(() => {
                        char.classList.add('visible');
                    }, baseDelay + (i * 30));
                });
            });
        }
    }

    initPeekingCharacters();

    /* ================= Cycling Text ================= */
    function initCyclingText() {
        const list = document.querySelector('.cycling-list');
        const container = document.querySelector('.cycling-container');
        if (!list || !container) return;

        const items = list.querySelectorAll('.cycling-item');
        if (items.length === 0) return;

        // Clone first item for seamless loop
        const firstClone = items[0].cloneNode(true);
        list.appendChild(firstClone);

        // Function to measure and start cycling
        const startCycle = () => {
            let widths = [];
            let currentIndex = 0;
            const allItems = list.querySelectorAll('.cycling-item');
            const totalItems = allItems.length;
            const itemHeight = allItems[0].offsetHeight;
            let cycleTimeout;

            // Measure Function
            const measure = () => {
                widths = Array.from(allItems).map(item => item.getBoundingClientRect().width + 5);
                // Update width immediately for consistency
                const nextWidthIndex = currentIndex % totalItems;
                container.style.width = `${widths[nextWidthIndex]}px`;
            };

            // Initial Measure
            measure();

            // Resize Listener for this specific closure
            window.addEventListener('resize', () => {
                measure();
            });

            // CONFIG: Time between cycles (in milliseconds)
            const cycleDuration = 1200;

            function cycle() {
                cycleTimeout = setTimeout(() => {
                    currentIndex++;

                    // 1. Animate Width to Next Item
                    const nextWidthIndex = currentIndex % totalItems;
                    container.style.width = `${widths[nextWidthIndex]}px`;

                    // 2. Animate Transform Vertical
                    list.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    list.style.transform = `translateY(-${currentIndex * itemHeight}px)`;

                    // 3. Handle Reset (Infinite Loop)
                    if (currentIndex === totalItems - 1) {
                        setTimeout(() => {
                            list.style.transition = 'none';
                            currentIndex = 0;
                            list.style.transform = `translateY(0)`;
                            // Update width for index 0 to be safe
                            container.style.width = `${widths[0]}px`;
                        }, 600); // Wait for transition
                    }

                    cycle();
                }, cycleDuration);
            }

            // Start the loop
            cycle();
        };

        // Ensure fonts are ready before measuring
        document.fonts.ready.then(startCycle).catch(() => {
            // Fallback if font loading fails/times out
            setTimeout(startCycle, 500);
        });


    }

    // Call init
    initCyclingText();

    /* ================= Magic Sparks (Team Section) ================= */
    function initMagicSparks() {
        const teamSection = document.querySelector('.team-section');
        if (!teamSection) return;

        // Create Container
        const sparkContainer = document.createElement('div');
        sparkContainer.classList.add('spark-container');
        sparkContainer.style.position = 'absolute';
        sparkContainer.style.top = '0';
        sparkContainer.style.left = '0';
        sparkContainer.style.width = '100%';
        sparkContainer.style.height = '100%';
        sparkContainer.style.pointerEvents = 'none';
        sparkContainer.style.zIndex = '1'; // Above Bg, Below Cloud
        teamSection.appendChild(sparkContainer);

        function createSpark() {
            const spark = document.createElement('div');
            spark.classList.add('magic-spark');

            // Random Position
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            spark.style.left = `${x}%`;
            spark.style.top = `${y}%`;

            // Random Size
            const size = Math.random() * 3 + 1; // 1px to 4px
            spark.style.width = `${size}px`;
            spark.style.height = `${size}px`;

            // Random Animation Duration
            const duration = Math.random() * 3 + 2; // 2s to 5s
            spark.style.animationDuration = `${duration}s`;

            sparkContainer.appendChild(spark);

            // Cleanup
            setTimeout(() => {
                spark.remove();
            }, duration * 1000);
        }

        // Spawn Interval
        setInterval(createSpark, 300); // 3 sparks per second
    }

    initMagicSparks();

    // 8. Contact Form Logic
    // --------------------------------------------------------------------------
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;

            // Construct Mailto Link
            // Note: We include the user's entered email in the body since mailto 'from' isn't reliable
            const recipient = 'hello@mdwn.info';
            const body = `${message}\n\n---\nSent from: ${email}`;

            const mailtoLink = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

            window.location.href = mailtoLink;
        });
    }

    // Phone Copy Functionality
    const copyBtn = document.getElementById('copy-phone-btn');
    const toast = document.getElementById('copy-toast');

    if (copyBtn && toast) {
        copyBtn.addEventListener('click', () => {
            const phoneNumber = '+966534223414';

            // Robust Copy Function
            const copyToClipboard = (text) => {
                // Try Modern API
                if (navigator.clipboard && window.isSecureContext) {
                    navigator.clipboard.writeText(text).then(() => {
                        showToast();
                    }).catch(err => {
                        console.error('Async: Could not copy text: ', err);
                        fallbackCopyTextToClipboard(text);
                    });
                } else {
                    fallbackCopyTextToClipboard(text);
                }
            };

            const fallbackCopyTextToClipboard = (text) => {
                const textArea = document.createElement("textarea");
                textArea.value = text;

                // Ensure it's not visible but part of DOM
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);

                textArea.focus();
                textArea.select();

                try {
                    const successful = document.execCommand('copy');
                    if (successful) {
                        showToast();
                    } else {
                        console.error('Fallback: Copying text command was unsuccessful');
                        alert('Could not copy phone number. Please copy manually: ' + text);
                    }
                } catch (err) {
                    console.error('Fallback: Oops, unable to copy', err);
                    alert('Could not copy phone number. Please copy manually: ' + text);
                }

                document.body.removeChild(textArea);
            };

            const showToast = () => {
                toast.classList.add('show');
                setTimeout(() => {
                    toast.classList.remove('show');
                }, 3000);
            };

            copyToClipboard(phoneNumber);
        });
    }

    // Mobile Menu Toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const mobileDrawer = document.querySelector('.mobile-drawer');
    const mobileLinks = document.querySelectorAll('.mobile-nav-links a');

    if (mobileToggle && mobileDrawer) {
        // Toggle Drawer
        mobileToggle.addEventListener('click', () => {
            mobileDrawer.classList.toggle('active');
        });

        // Close Drawer when linking
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileDrawer.classList.remove('active');
            });
        });

        // Close on click outside (Optional enhancement)
        document.addEventListener('click', (e) => {
            if (!mobileDrawer.contains(e.target) && !mobileToggle.contains(e.target) && mobileDrawer.classList.contains('active')) {
                mobileDrawer.classList.remove('active');
            }
        });
    }

    // ================= Clients Marquee (JS Driven for Hit-Test Accuracy) =================
    const marqueeTrack = document.querySelector('.marquee-track');
    // Select the first content set to measure its width (it's 25% of the total if there are 4 sets)
    const marqueeContent = document.querySelector('.marquee-content');

    if (marqueeTrack && marqueeContent) {
        let scrollPos = 0;
        const speed = 0.5; // Pixels per frame (Adjust manually to match desired speed)

        let updateMarquee = () => {
            // Measure width dynamically to handle resize
            const setWidth = marqueeContent.offsetWidth; // Width of one set

            scrollPos += speed;

            // Loop logic: CSS was 0 -> 25% (one set width)
            if (scrollPos >= setWidth) {
                scrollPos = 0;
            }

            // Apply transform
            // Using translate3d for GPU composition, but updated on main thread for hit-test sync
            marqueeTrack.style.transform = `translate3d(${scrollPos}px, 0, 0)`;

            requestAnimationFrame(updateMarquee);
        };

        requestAnimationFrame(updateMarquee);
    }

    // ================= Projects Promo Sparks =================
    const sparksContainer = document.querySelector('.sparks-container');
    const tastyBtn = document.querySelector('.btn-tasty');
    const colors = ['#f04e3a', '#f4c82b', '#3bb9ab', '#086fb6'];

    if (sparksContainer && tastyBtn) {
        let mouseX = 0;
        let mouseY = 0;

        tastyBtn.addEventListener('mousemove', (e) => {
            const rect = tastyBtn.getBoundingClientRect();
            mouseX = e.clientX - rect.left;
            mouseY = e.clientY - rect.top;
        });

        function createPromoSpark() {
            const spark = document.createElement('div');
            spark.classList.add('promo-spark');
            
            // Random color from brand palette
            spark.style.background = colors[Math.floor(Math.random() * colors.length)];
            
            // Position at mouse
            spark.style.left = `${mouseX}px`;
            spark.style.top = `${mouseY}px`;
            
            // Random direction
            const angle = Math.random() * Math.PI * 2;
            const distance = 40 + Math.random() * 80;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            spark.style.setProperty('--tx', `${tx}px`);
            spark.style.setProperty('--ty', `${ty}px`);
            
            // Random size
            const size = 2 + Math.random() * 4;
            spark.style.width = `${size}px`;
            spark.style.height = `${size}px`;

            sparksContainer.appendChild(spark);
            
            setTimeout(() => {
                spark.remove();
            }, 1500);
        }

        let sparkInterval;
        tastyBtn.addEventListener('mouseenter', () => {
            sparkInterval = setInterval(createPromoSpark, 60);
        });
        tastyBtn.addEventListener('mouseleave', () => {
            clearInterval(sparkInterval);
        });
    }

}); // End DOMContentLoaded
