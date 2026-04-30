/* ============================================================
   MDWNH STUDIO — Projects Browser
   Smart-looking AI project filter (tag-based under the hood)
   ============================================================ */

// ── Project Data ───────────────────────────────────────────
const BANNER_BASE = '../Our Projects/Project Banners/';

const PROJECTS = [
  {
    id: 'makashdana',
    name: 'مكشدانة',
    banner: 'هوية بصرية مكشدانة.png',
    tags: ['تصميم', 'هوية'],
    link: 'https://drive.google.com/file/d/1egewenQQLqvh6bkPpvD4IytI8ND5RRpL/view?usp=share_link'
  },
  {
    id: 'salammaknoon',
    name: 'بودكاست سلام مكنون',
    banner: 'هوية بصرية سلام مكنون.png',
    tags: ['تصميم', 'هوية'],
    link: 'https://drive.google.com/file/d/1MLPC2jAs-A8wRxpmds0r2B_0nVpk8pCx/view?usp=sharing'
  },
  {
    id: 'daralez',
    name: 'دار العز',
    banner: 'هوية بصرية دار العز.png',
    tags: ['تصميم', 'هوية'],
    link: 'https://drive.google.com/file/d/1W8flJbTCrACtWXVwTV7xBWK_Ek9AXT5O/view?usp=share_link'
  },
  {
    id: 'yaghilam-photo',
    name: 'يا غلام',
    banner: 'تصوير يا غلام.png',
    tags: ['تصوير'],
    link: 'https://www.youtube.com/watch?si=3M34xAVU513aswp3&v=h9WQT7gMP6E&feature=youtu.be'
  },
  {
    id: 'samarqand',
    name: 'قضية سمرقند',
    banner: 'رسم سمرقند.png',
    tags: ['رسم'],
    link: 'https://mdwn.studio/Samrqand/'
  },
  {
    id: 'maallah-motion',
    name: 'مع الله (موشن)',
    banner: 'موشن مع الله.png',
    tags: ['موشن', 'مونتاج'],
    link: 'https://drive.google.com/file/d/1IEyk8RVUqM660I4-37H8c-nbn8lppEyx/view?usp=share_link'
  },
  {
    id: 'asma',
    name: 'اسمى',
    banner: 'تقرير اسمى.png',
    tags: ['موشن', 'مونتاج', 'تقرير'],
    link: 'https://drive.google.com/file/d/1eVx9LMkE6VpkPiiNnb9w_3nKdYOhxt-y/view?usp=share_link'
  },
  {
    id: 'milaf',
    name: 'ميلاف',
    banner: 'تقرير ميلاف.png',
    tags: ['موشن', 'مونتاج'],
    link: 'https://drive.google.com/file/d/1htEUt3tei4vWJweCZmdbMMn-zayVnGwO/view?usp=sharing'
  },
  {
    id: 'bab',
    name: 'باب الحجرة',
    banner: 'رسم باب الحجرة.png',
    tags: ['رسم'],
    link: 'https://mdwn.studio/Hujra/'
  },
  {
    id: 'harason',
    name: 'الحراساثون للدراسات الأمنية',
    banner: 'تصوير الحراساثون.png',
    tags: ['تصوير', 'مونتاج', 'تقرير'],
    link: 'https://drive.google.com/file/d/1AKPFm-08Zm8y3W_brVrSOJwtQ1pyCnRz/view?usp=share_link'
  },
  {
    id: 'risha',
    name: 'نادي الاعتماد الرياضي',
    banner: 'تصوير ريشة - نادي الاعتماد الرياضي.png',
    tags: ['تصوير', 'مونتاج', 'تقرير'],
    link: 'https://drive.google.com/file/d/1xghsfy_6WF0QdQ03970-lxO9ftH2FCeC/view?usp=share_link'
  },
  {
    id: 'maallah-anim',
    name: 'مع الله (انيميشن)',
    banner: 'انيميشن مع الله.png',
    tags: ['انيميشن'],
    link: 'https://drive.google.com/file/d/17cnXj6XOPxtrlFWOdOi3hDfbyx_vD65B/view?usp=share_link'
  },
  {
    id: 'dalilak',
    name: 'مرشدك لأفضل التطبيقات القرآنية',
    banner: 'تصميم دليلك.png',
    tags: ['تصميم'],
    link: 'https://drive.google.com/file/d/1IqkTdp959MSKbWw_6yIHODAs3YpHVLy9/view?usp=share_link'
  },
  {
    id: 'ananas',
    name: 'أناناس',
    banner: ' مونتاج- موشن اناناس.png',
    tags: ['موشن'],
    link: 'https://drive.google.com/file/d/1xiXUISFp6O69Q-e8D02kaH-3koqdbtiZ/view?usp=share_link'
  },
  {
    id: 'ghayam',
    name: 'غمام',
    banner: 'انيميشن فيلم غمام.png',
    tags: ['انيميشن'],
    link: 'https://drive.google.com/file/d/11aCcpOXRfU7hC7aGPmASY5IUqV_V31ix/view?usp=share_link'
  },
  {
    id: 'mashaer-yateem',
    name: 'مشاعر يتيم',
    banner: 'انيميشن مشاعر يتيم.png',
    tags: ['رسم', 'مونتاج'],
    link: 'https://www.youtube.com/watch?si=Q-ch3v0bzWUfBrHb&v=LV0ljvjeYA8&feature=youtu.be'
  },
  {
    id: 'maanabi-motion',
    name: 'مع النبي',
    banner: 'موشن مع النبي.png',
    tags: ['موشن'],
    link: 'https://drive.google.com/file/d/1mf1NzPyyJbGfWtSOLEneZKJHIOZKvnGj/view?usp=share_link'
  },
  {
    id: 'maanabi-edit',
    name: 'مع النبي',
    banner: 'مونتاج مع النبي.png',
    tags: ['مونتاج'],
    link: 'https://drive.google.com/file/d/1NFOyBJreTm_yQOFwlCXzRAOcshID3h-L/view?usp=share_link'
  }
];

// Loading messages
const LOADING_MSGS = [
  'ستجد ما يسرك بإذن الله...',
  'انتظر قليلاً...',
  'أحسنت الاختيار...',
  'لحظات فقط...',
  '🌱✨انتظر...',
  '🚀🚀 انتظر..'
];

// ── State ──────────────────────────────────────────────────
let selectedTags    = new Set();
let selectedCards   = new Set();
let selectionMode   = false;
let msgInterval     = null;
let currentSound    = null;
let picksForDisplay = [];

// ================= Lenis Smooth Scroll =================
const lenis = new Lenis({
  duration: 1.0,
  easing: (t) => --t * t * t + 1,
  orientation: 'vertical',
  gestureOrientation: 'vertical',
  smoothWheel: true,
  wheelMultiplier: 1.25,
  smoothTouch: false,
  touchMultiplier: 2.5,
  infinite: false,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);


// ── DOM Refs ───────────────────────────────────────────────
const phaseSelection = document.getElementById('phase-selection');
const phaseLoading   = document.getElementById('phase-loading');
const phaseResults   = document.getElementById('phase-results');
const tagsCloud      = document.getElementById('tags-cloud');
const btnContinue    = document.getElementById('btn-continue');
const loadingText    = document.getElementById('loading-text');
const cardsGrid      = document.getElementById('cards-grid');
const btnWantSame    = document.getElementById('btn-want-same');
const btnRestart     = document.getElementById('btn-restart');
const resultsTitle  = document.getElementById('results-title');
const mainActions    = document.getElementById('main-actions');
const selectionActions = document.getElementById('selection-actions');
const btnConfirm     = document.getElementById('btn-confirm-select');
const btnCancel      = document.getElementById('btn-cancel-select');
const contactModal   = document.getElementById('contact-modal');
const btnWaChoice    = document.getElementById('btn-whatsapp-choice');
const btnMailChoice  = document.getElementById('btn-email-choice');
const btnModalClose  = document.getElementById('btn-modal-close');

// Browse Section DOM
const btnFilterToggle   = document.getElementById('btn-filter-toggle');
const browseTagsWrap    = document.getElementById('browse-tags-wrap');
const browseTagsCloud   = document.getElementById('browse-tags-cloud');
const allProjectsGrid   = document.getElementById('all-projects-grid');

let browseFilters = new Set();

// ── Tag Selection ──────────────────────────────────────────
tagsCloud.querySelectorAll('.tag-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    const tag = pill.dataset.tag;
    if (selectedTags.has(tag)) {
      selectedTags.delete(tag);
      pill.classList.remove('selected');
    } else {
      selectedTags.add(tag);
      pill.classList.add('selected');
    }
    // Enable/disable continue
    if (selectedTags.size > 0) {
      btnContinue.disabled = false;
      btnContinue.classList.add('enabled');
    } else {
      btnContinue.disabled = true;
      btnContinue.classList.remove('enabled');
    }
  });
});

// ── Continue → Loading ─────────────────────────────────────
btnContinue.addEventListener('click', () => {
  startLoading();
});

function startLoading() {
  const dotsRow = document.getElementById('dots-row');
  const origDots = dotsRow.querySelectorAll('.dot');
  const colors   = ['#f04e3a','#f4c82b','#3bb9ab','#086fb6'];
  const R        = 36; // orbit radius px

  // --- Build fixed overlay ---
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;pointer-events:none;background:rgba(26,26,26,0);transition:background 0.5s;';
  document.body.appendChild(overlay);
  requestAnimationFrame(() => { overlay.style.background = 'rgba(26,26,26,0.98)'; });

  // Mirror each dot's position into overlay
  const cx = window.innerWidth  / 2;
  const cy = window.innerHeight / 2;

  const ovDots = Array.from(origDots).map((orig, i) => {
    const rect = orig.getBoundingClientRect();
    const d = document.createElement('div');
    Object.assign(d.style, {
      position:'absolute', width:'16px', height:'16px',
      borderRadius:'50%', background: colors[i],
      left: (rect.left + rect.width/2  - 8) + 'px',
      top:  (rect.top  + rect.height/2 - 8) + 'px',
      transition: 'left 0.75s cubic-bezier(0.34,1.2,0.64,1), top 0.75s cubic-bezier(0.34,1.2,0.64,1)',
      willChange: 'transform, left, top',
    });
    overlay.appendChild(d);
    return d;
  });

  // Hide originals + fade selection content
  dotsRow.style.opacity = '0';
  ['.main-title','.main-subtitle','.tags-cloud','.btn-continue','.brand-line-separator','.browse-section'].forEach(sel => {
    const el = phaseSelection.querySelector(sel);
    if (el) { el.style.transition = 'opacity 0.35s'; el.style.opacity = '0'; }
  });

  // Step 1 — converge to orbit positions (100ms)
  const angles = [0, 90, 180, 270];
  setTimeout(() => {
    ovDots.forEach((d, i) => {
      const rad = angles[i] * Math.PI / 180;
      d.style.left = (cx + R * Math.cos(rad) - 8) + 'px';
      d.style.top  = (cy + R * Math.sin(rad) - 8) + 'px';
    });
  }, 100);

  // Step 2 — switch to CSS orbit animation (860ms = 100 + 750 + small buffer)
  // Runs immediately after position transition completes → seamless spin start
  setTimeout(() => {
    ovDots.forEach((d, i) => {
      d.style.transition = 'none';
      d.style.left = (cx - 8) + 'px';
      d.style.top  = (cy - 8) + 'px';
      d.style.transformOrigin = '8px 8px';
      d.style.animation = 'ovOrbit 1.8s linear infinite';
      d.style.animationDelay = (-i * 0.45) + 's';
    });
  }, 860);

  // Step 3 — loading text below orbit (1100ms)
  const textEl = document.createElement('p');
  Object.assign(textEl.style, {
    position:'absolute', top: (cy + 58) + 'px', left:'0', right:'0',
    textAlign:'center', fontFamily:"'Rubik',sans-serif",
    fontSize:'1.15rem', fontWeight:'500',
    color:'rgba(250,249,247,0.55)', opacity:'0', transition:'opacity 0.6s',
  });
  overlay.appendChild(textEl);

  const showMsg = (msg) => {
    textEl.textContent = msg;
    requestAnimationFrame(() => requestAnimationFrame(() => { textEl.style.opacity = '1'; }));
  };

  setTimeout(() => {
    let lastIndex = -1;
    const updateRandomMsg = () => {
      let msgIndex;
      do {
        msgIndex = Math.floor(Math.random() * LOADING_MSGS.length);
      } while (msgIndex === lastIndex && LOADING_MSGS.length > 1);
      lastIndex = msgIndex;
      showMsg(LOADING_MSGS[msgIndex]);
    };

    updateRandomMsg();
    msgInterval = setInterval(() => {
      textEl.style.opacity = '0';
      setTimeout(updateRandomMsg, 600);
    }, 2000);
  }, 1100);

  // ⚡ Start fading out background orbs mid-way through loading (after 2 seconds)
  setTimeout(() => {
    const bgOrbs = document.querySelector('.bg-orbs');
    if (bgOrbs) bgOrbs.style.opacity = '0';
  }, 2000);

  // Step 4 — after exactly 5 seconds reveal results
  const totalDelay = 5000;

  // 🔊 Audio
  if (currentSound) {
    currentSound.pause();
    currentSound.currentTime = 0;
  }
  const sounds = ['thinking sound.mp3', 'thinking sound 2.mp3', 'thinking sound 3.mp3'];
  const randomSound = sounds[Math.floor(Math.random() * sounds.length)];
  currentSound = new Audio(randomSound);
  currentSound.play().catch(e => console.log("Audio play failed:", e));

  // 🖼️ Pre-load results
  prepareResults();
  picksForDisplay.forEach(proj => {
    const img = new Image();
    img.src = BANNER_BASE + proj.banner;
  });

  setTimeout(() => {
    clearInterval(msgInterval);
    overlay.style.transition = 'opacity 0.6s';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.remove();
      dotsRow.style.opacity = '';
      showResults();
    }, 600);
  }, totalDelay);
}

function showLoadingMsg(msg) {
  loadingText.textContent = msg;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      loadingText.classList.add('visible');
    });
  });
}

// ── Results ────────────────────────────────────────────────
function prepareResults() {
  // Filter projects by selected tags
  const matched = PROJECTS.filter(p =>
    p.tags.some(t => selectedTags.has(t))
  );

  // Deduplicate by name (pick first occurrence)
  const seen = new Set();
  const unique = matched.filter(p => {
    if (seen.has(p.name)) return false;
    seen.add(p.name);
    return true;
  });

  // Shuffle and pick 3
  const shuffled = unique.sort(() => Math.random() - 0.5);
  const picks = shuffled.slice(0, 3);

  // Fallback: if nothing matched, pick 3 random
  picksForDisplay = picks.length > 0
    ? picks
    : PROJECTS.sort(() => Math.random() - 0.5).slice(0, 3);
}

function showResults() {
  buildCards(picksForDisplay);
  showPhase(phaseResults);
}

function buildCards(projects) {
  cardsGrid.innerHTML = '';
  selectedCards.clear();
  updateConfirmBtn();

  projects.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id   = proj.id;
    card.dataset.name = proj.name;

    const bannerSrc  = BANNER_BASE + proj.banner;
    const tagLabels  = { انيميشن:'انيميشن', موشن:'موشن', مونتاج:'مونتاج', تصوير:'تصوير', كوميكس:'كوميكس', هوية:'هوية بصرية', تقرير:'تقرير', تصميم:'تصميم' };
    const tagsHTML   = proj.tags.map(t => `<span class="card-tag tag-${t}">${tagLabels[t] || t}</span>`).join('');

    card.innerHTML = `
      <div class="card-banner-wrap">
        <img class="card-banner"
             src="${bannerSrc}"
             alt="${proj.name}"
             loading="lazy">
      </div>
      <div class="card-body">
        <div class="card-name">${proj.name}</div>
        <div class="card-tags">${tagsHTML}</div>
        <button class="btn-watch" onclick="watchProject('${proj.id}','${proj.link}')">مشاهدة</button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (!selectionMode) return;
      if (e.target.classList.contains('btn-watch')) return;
      toggleCardSelection(card, proj);
    });

    cardsGrid.appendChild(card);
  });
}

// ── Watch project ──────────────────────────────────────────
function watchProject(id, link) {
  if (link && link !== '') {
    window.open(link, '_blank');
  } else {
    alert('رابط المشروع غير متوفر حالياً');
  }
}
window.watchProject = watchProject;

// ── "أريد مثله" flow ──────────────────────────────────────
btnWantSame.addEventListener('click', () => {
  selectionMode = true;
  fadeTitle('اختر مشاريعك المفضلة');
  mainActions.classList.add('hidden');
  selectionActions.classList.remove('hidden');
  cardsGrid.classList.add('selection-mode');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

btnCancel.addEventListener('click', cancelSelection);

function cancelSelection() {
  selectionMode = false;
  fadeTitle('وجدنا لك هذا!');
  selectedCards.clear();
  selectionActions.classList.add('hidden');
  mainActions.classList.remove('hidden');
  cardsGrid.classList.remove('selection-mode');
  cardsGrid.querySelectorAll('.project-card').forEach(c => {
    c.classList.remove('card-selected');
  });
  updateConfirmBtn();
}

function toggleCardSelection(card, proj) {
  if (selectedCards.has(proj.name)) {
    selectedCards.delete(proj.name);
    card.classList.remove('card-selected');
  } else {
    selectedCards.add(proj.name);
    card.classList.add('card-selected');
  }
  updateConfirmBtn();
}

function updateConfirmBtn() {
  if (selectedCards.size > 0) {
    btnConfirm.classList.add('active');
    btnConfirm.disabled = false;
  } else {
    btnConfirm.classList.remove('active');
    btnConfirm.disabled = true;
  }
}

btnConfirm.addEventListener('click', () => {
  if (selectedCards.size === 0) return;
  contactModal.classList.remove('hidden');
  // Scroll halfway up instead of all the way to prevent mobile UI jitter
  window.scrollTo({ top: window.scrollY / 2, behavior: 'smooth' });
});

btnModalClose.addEventListener('click', () => {
  contactModal.classList.add('hidden');
});

btnMailChoice.addEventListener('click', () => {
  sendRequest('email');
  contactModal.classList.add('hidden');
});

btnWaChoice.addEventListener('click', () => {
  sendRequest('whatsapp');
  contactModal.classList.add('hidden');
});

function sendRequest(type) {
  const names   = Array.from(selectedCards).join(' / ');
  const quoted  = Array.from(selectedCards).map(n => `"${n}"`).join(' و ');
  
  if (type === 'email') {
    const rawSubject = `مهتم بمشروع مثل: ${names}`;
    const rawBody = `السلام عليكم ورحمه الله وبركاته

اعجبني ${quoted} من مشاريعكم! وأريد العمل على شيء مثله

اليكم التفاصيل والميزانية المقترحة`;
    const mailto = `mailto:hello@mdwn.info?subject=${encodeURIComponent(rawSubject)}&body=${encodeURIComponent(rawBody)}`;
    window.location.href = mailto;
  } else {
    // WhatsApp logic: No heading, single row
    const waText = `السلام عليكم ورحمه الله وبركاته، اعجبني ${quoted} من مشاريعكم! وأريد العمل على شيء مثله، اليكم التفاصيل والميزانية المقترحة`;
    const waUrl = `https://wa.me/966534223414?text=${encodeURIComponent(waText)}`;
    window.open(waUrl, '_blank');
  }
}

// ── Restart ────────────────────────────────────────────────
btnRestart.addEventListener('click', () => {
  // Restore visibility and reset transitions/styles to prevent layout shifts
  const dotsRow = document.getElementById('dots-row');
  if (dotsRow) {
    dotsRow.style.opacity = '1';
    dotsRow.style.transition = '';
  }

  ['.main-title','.main-subtitle','.tags-cloud','.btn-continue','.brand-line-separator','.browse-section'].forEach(sel => {
    const el = phaseSelection.querySelector(sel);
    if (el) { 
      el.style.opacity = '1'; 
      el.style.pointerEvents = 'auto'; 
      el.style.transition = ''; // Remove the transition we added in startLoading
    }
  });

  // Switch back to selection phase instantly
  showPhase(phaseSelection);

  // Instantly disable continue button to prevent accidental clicks
  btnContinue.disabled = true;
  btnContinue.classList.remove('enabled');

  // Deselect tags after 1 second as requested
  setTimeout(() => {
    selectedTags.clear();
    tagsCloud.querySelectorAll('.tag-pill').forEach(p => p.classList.remove('selected'));
  }, 1000);
});

// ── Phase Switcher ─────────────────────────────────────────
function showPhase(target) {
  const allPhases = [phaseSelection, phaseLoading, phaseResults];
  const bgOrbs = document.querySelector('.bg-orbs');
  
  // Hide others instantly but keep target hidden for a frame
  allPhases.forEach(p => {
    if (p !== target) {
      p.style.display = 'none';
      p.classList.remove('active-phase', 'fade-in');
    }
  });

  // Toggle global background visibility based on phase
  if (bgOrbs) {
    // Hide gradients only in results phase
    bgOrbs.style.opacity = (target === phaseResults) ? '0' : '1';
  }

  // Reset scroll BEFORE showing target to avoid jump
  window.scrollTo({ top: 0, behavior: 'instant' });

  target.style.display = 'flex';
  target.classList.add('active-phase');

  // Trigger fade-in on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      target.classList.add('fade-in');
    });
  });
}

function fadeTitle(newText) {
  resultsTitle.style.opacity = '0';
  setTimeout(() => {
    resultsTitle.textContent = newText;
    resultsTitle.style.opacity = '1';
  }, 300);
}

// ── Browse Logic ──────────────────────────────────────────
function initBrowse() {
  renderBrowseGrid();
}

function renderBrowseGrid() {
  allProjectsGrid.innerHTML = '';
  PROJECTS.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'project-card';
    
    const tagLabels = { انيميشن:'انيميشن', موشن:'موشن', مونتاج:'مونتاج', تصوير:'تصوير', رسم:'رسم', هوية:'هوية بصرية', تقرير:'تقرير', تصميم:'تصميم' };
    const tagsHTML  = proj.tags.map(t => `<span class="card-tag tag-${t}">${tagLabels[t] || t}</span>`).join('');

    card.innerHTML = `
      <div class="card-banner-wrap">
        <img src="${BANNER_BASE}${proj.banner}" alt="${proj.name}" class="card-banner" loading="lazy">
      </div>
      <div class="card-body">
        <h3 class="card-name">${proj.name}</h3>
        <div class="card-tags">${tagsHTML}</div>
        <button class="btn-watch" onclick="watchProject('${proj.id}','${proj.link}')">مشاهدة</button>
      </div>
    `;
    allProjectsGrid.appendChild(card);
  });
  // Notify Lenis that the content height has changed
  if (typeof lenis !== 'undefined') lenis.resize();
}

// Run init
initBrowse();

// ── Contact Section Logic (Ported) ──────────────────────────
// Contact Form
const contactForm = document.getElementById('contact-form');
if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;
    const recipient = 'hello@mdwn.info';
    const body = `${message}\n\n---\nSent from: ${email}`;
    window.location.href = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });
}

// Copy Phone
const copyBtn = document.getElementById('copy-phone-btn');
const toast = document.getElementById('copy-toast');
if (copyBtn && toast) {
  copyBtn.addEventListener('click', () => {
    const phoneNumber = '+966534223414';
    const showToast = () => {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(phoneNumber).then(showToast);
    } else {
      const ta = document.createElement("textarea");
      ta.value = phoneNumber;
      ta.style.position = "fixed"; ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try { if (document.execCommand('copy')) showToast(); } catch(e) {}
      document.body.removeChild(ta);
    }
  });
}
