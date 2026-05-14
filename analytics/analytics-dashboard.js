// ── analytics-dashboard.js  (Part 2: Core logic, nav, panel builder) ──────────

/* ── Firebase config ──────────────────────────────────────────────────────── */
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
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

/* ── Config ───────────────────────────────────────────────────────────────── */
const PASSWORD = '1445';

const SECTIONS = [
    { id: 'hujra',    name: 'باب الحجرة',    emoji: '🚪', color: '#3b82f6', path: 'comics/hujra'    },
    { id: 'samrqand', name: 'قضية سمرقند',   emoji: '⚖️', color: '#2dd4bf', path: 'comics/samrqand' },
    { id: 'ghailam',  name: 'القرد والغيلم', emoji: '🐒', color: '#fbbf24', path: 'comics/ghailam'  },
    { id: 'main',     name: 'الصفحة الرئيسية', emoji: '🏠', color: '#a78bfa', path: 'pages/main'  },
    { id: 'projects', name: 'المشاريع',      emoji: '📁', color: '#fb923c', path: 'pages/projects' },
];

/* ── State ────────────────────────────────────────────────────────────────── */
const chartInstances = {}; // id -> Chart.js instance

/* ── PIN Login ────────────────────────────────────────────────────────────── */
document.querySelectorAll('.pin-digit').forEach((el, i, all) => {
    el.addEventListener('input', () => {
        el.value = el.value.replace(/\D/g, '').slice(-1);
        if (el.value && i < all.length - 1) all[i + 1].focus();
        if (i === all.length - 1 && el.value) checkPassword();
    });
    el.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !el.value && i > 0) all[i - 1].focus();
    });
});
document.querySelector('.login-card').addEventListener('click', () => document.getElementById('d1').focus());
document.getElementById('d1').focus();

function checkPassword() {
    const entered = ['d1','d2','d3','d4'].map(id => document.getElementById(id).value).join('');
    if (entered === PASSWORD) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        initDashboard();
    } else {
        const err = document.getElementById('login-error');
        err.textContent = 'رمز خاطئ. حاول مرة أخرى.';
        ['d1','d2','d3','d4'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('d1').focus();
        setTimeout(() => err.textContent = '', 2500);
    }
}
function logout() {
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    ['d1','d2','d3','d4'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('d1').focus();
}

/* ── Pill Nav ─────────────────────────────────────────────────────────────── */
function initNav() {
    const pills   = document.querySelectorAll('.nav-pill');
    const bar     = document.getElementById('nav-bar');
    const indicator = document.getElementById('pill-indicator');

    function movePill(btn) {
        indicator.style.left  = btn.offsetLeft + 'px';
        indicator.style.width = btn.offsetWidth + 'px';
    }

    // Init position after layout paint
    requestAnimationFrame(() => {
        const active = document.querySelector('.nav-pill.active');
        if (active) movePill(active);
    });

    pills.forEach(pill => {
        pill.addEventListener('click', () => {
            pills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            movePill(pill);
            // Smooth scroll pill into view
            pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

            // Show panel
            const sid = pill.dataset.section;
            document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('panel-' + sid).classList.add('active');
        });
    });
}

/* ── Skeleton helper ─────────────────────────────────────────────────────── */
function skl(w = '80px', h = '2rem') {
    return `<span class="skeleton" style="width:${w};height:${h};border-radius:8px;"></span>`;
}

/* ── Build a section panel HTML ─────────────────────────────────────────── */
function buildPanel(s) {
    const el = document.getElementById('panel-' + s.id);
    el.innerHTML = `
        <div class="section-hero">
            <div class="section-hero-bar" style="background:${s.color}"></div>
            <div class="section-hero-icon">${s.emoji}</div>
            <div>
                <div class="section-hero-name">${s.name}</div>
                <div class="section-hero-id">${s.path}</div>
            </div>
        </div>

        <!-- KPI Row -->
        <div class="kpi-row">
            <div class="kpi-card">
                <div class="kpi-label">👁️ مشاهدات (20ث+)</div>
                <div class="kpi-val" id="${s.id}-kpi-views" style="color:${s.color}">${skl()}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">🔗 زيارات خارجية</div>
                <div class="kpi-val" id="${s.id}-kpi-entries" style="color:var(--teal)">${skl()}</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">📈 معدل التحويل</div>
                <div class="kpi-val" id="${s.id}-kpi-conv" style="color:var(--yellow)">${skl()}</div>
                <div class="kpi-sub">مشاهدة من كل زيارة</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">📱 أكثر جهاز</div>
                <div class="kpi-val" id="${s.id}-kpi-device" style="color:var(--purple);font-size:1.2rem;margin-top:.3rem">${skl()}</div>
            </div>
        </div>

        <!-- Row 1: Device + OS -->
        <div class="charts-grid">
            <div class="chart-card">
                <div class="chart-title"><span class="chart-title-icon">📱</span>نوع الجهاز</div>
                <div class="chart-wrap"><canvas id="${s.id}-chart-device"></canvas></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><span class="chart-title-icon">💻</span>نظام التشغيل</div>
                <div class="chart-wrap" id="${s.id}-wrap-os"><div class="bar-list" id="${s.id}-list-os"></div></div>
            </div>
        </div>

        <!-- Row 2: Browser + Traffic Source -->
        <div class="charts-grid">
            <div class="chart-card">
                <div class="chart-title"><span class="chart-title-icon">🌐</span>المتصفح</div>
                <div class="chart-wrap" id="${s.id}-wrap-browser"><div class="bar-list" id="${s.id}-list-browser"></div></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><span class="chart-title-icon">📡</span>مصدر الزيارة</div>
                <div class="chart-wrap" id="${s.id}-wrap-ref"><div class="bar-list" id="${s.id}-list-ref"></div></div>
            </div>
        </div>

        <!-- Row 3: Activity by hour (full width) -->
        <div class="charts-grid">
            <div class="chart-card full">
                <div class="chart-title"><span class="chart-title-icon">🕐</span>نشاط الزوار بالساعة (توقيت السعودية)</div>
                <div class="chart-wrap tall"><canvas id="${s.id}-chart-hours"></canvas></div>
            </div>
        </div>

        <!-- Row 4: Countries + Day of week -->
        <div class="charts-grid">
            <div class="chart-card">
                <div class="chart-title"><span class="chart-title-icon">🌍</span>الدول الأعلى زيارة</div>
                <div class="bar-list" id="${s.id}-list-countries"></div>
            </div>
            <div class="chart-card">
                <div class="chart-title"><span class="chart-title-icon">📅</span>أيام الأسبوع</div>
                <div class="chart-wrap"><canvas id="${s.id}-chart-days"></canvas></div>
            </div>
        </div>

        <div class="conv-row">
            <span class="conv-label">إجمالي: مشاهدات ÷ زيارات</span>
            <span class="conv-val" id="${s.id}-conv-full">…</span>
        </div>
    `;
}

/* ── Chart.js global defaults ─────────────────────────────────────────────── */
Chart.defaults.color       = 'rgba(245,244,242,0.45)';
Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family = "'Rubik', sans-serif";
Chart.defaults.font.size   = 11;

/* ── Donut chart (device) ─────────────────────────────────────────────────── */
function renderDonut(canvasId, labels, values, colors) {
    if (chartInstances[canvasId]) { chartInstances[canvasId].destroy(); }
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#1a1a1f', hoverOffset: 6 }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 10, padding: 12 } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed.toLocaleString('ar')}` } }
            }
        }
    });
}

/* ── Area/line chart (hours) ──────────────────────────────────────────────── */
function renderHours(canvasId, hoursObj, color) {
    if (chartInstances[canvasId]) { chartInstances[canvasId].destroy(); }
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    function fmt12(h) {
        if (h === 0)  return '12 AM';
        if (h < 12)  return h + ' AM';
        if (h === 12) return '12 PM';
        return (h - 12) + ' PM';
    }
    const labels = Array.from({length: 24}, (_, i) => fmt12(i));
    const data   = Array.from({length: 24}, (_, i) => hoursObj['h' + i] || 0);
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'زوار',
                data,
                borderColor: color,
                backgroundColor: color + '22',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: color,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

/* ── Bar chart (days of week) ─────────────────────────────────────────────── */
function renderDays(canvasId, daysObj, color) {
    if (chartInstances[canvasId]) { chartInstances[canvasId].destroy(); }
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const order  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const arabic = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
    const data   = order.map(d => daysObj[d] || 0);
    chartInstances[canvasId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: arabic,
            datasets: [{
                label: 'زوار',
                data,
                backgroundColor: color + '88',
                borderColor: color,
                borderWidth: 1,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { display: false } },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

/* ── Horizontal bar list (OS, Browser, Countries, Referrer) ───────────────── */
const EMOJI_MAP = {
    // OS
    ios:'🍎', android:'🤖', windows:'🪟', macos:'🍎', linux:'🐧', other:'❓',
    // Browser
    chrome:'🌐', safari:'🧭', firefox:'🦊', edge:'🔷', opera:'🎭',
    // Referrer
    direct:'🔗', social:'📲', search:'🔍', internal:'🏠', other:'📌',
    // Countries — generic flag emoji map (most common)
};
const COUNTRY_FLAGS = {
    'saudi_arabia':'🇸🇦','saudi arabia':'🇸🇦',
    'united_arab_emirates':'🇦🇪','united arab emirates':'🇦🇪',
    'egypt':'🇪🇬','kuwait':'🇰🇼','qatar':'🇶🇦',
    'bahrain':'🇧🇭','oman':'🇴🇲','jordan':'🇯🇴',
    'morocco':'🇲🇦','algeria':'🇩🇿','tunisia':'🇹🇳',
    'iraq':'🇮🇶','yemen':'🇾🇪','lebanon':'🇱🇧',
    'united_states':'🇺🇸','united states':'🇺🇸',
    'united_kingdom':'🇬🇧','united kingdom':'🇬🇧',
    'germany':'🇩🇪','france':'🇫🇷','turkey':'🇹🇷',
    'unknown':'🌍'
};

function renderBarList(listId, dataObj, color, labelMap = {}) {
    const el = document.getElementById(listId);
    if (!el) return;
    const entries = Object.entries(dataObj).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const max = entries[0]?.[1] || 1;
    el.innerHTML = entries.map(([key, val]) => {
        const pct = Math.round((val / max) * 100);
        const rawKey = key.toLowerCase().replace(/_/g,' ');
        const emoji  = labelMap[rawKey] || EMOJI_MAP[rawKey] || COUNTRY_FLAGS[rawKey] || COUNTRY_FLAGS[key.toLowerCase()] || '🌐';
        const label  = (key.charAt(0).toUpperCase() + key.slice(1)).replace(/_/g,' ');
        return `
            <div class="bar-item">
                <div class="bar-item-row">
                    <span class="bar-item-label">${emoji} ${label}</span>
                    <span class="bar-item-val">${val.toLocaleString('ar')}</span>
                </div>
                <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${color}"></div></div>
            </div>`;
    }).join('');
    if (!entries.length) el.innerHTML = `<span style="color:var(--muted);font-size:.8rem;">لا توجد بيانات بعد</span>`;
}

/* ── Subscribe to a section's Firebase data ──────────────────────────────── */
function subscribeSection(s) {
    db.ref(s.path).on('value', snap => {
        const d = snap.val() || {};

        const views   = d.views   || 0;
        const entries = d.entries || 0;
        const conv    = entries > 0 ? Math.round((views / entries) * 100) + '%' : '—';

        // KPIs
        setText(s.id + '-kpi-views',   views.toLocaleString('ar'));
        setText(s.id + '-kpi-entries', entries.toLocaleString('ar'));
        setText(s.id + '-kpi-conv',    conv);
        setText(s.id + '-conv-full',   conv);

        // Top device
        const devObj = d.devices || {};
        const topDev = topKey(devObj);
        const devLabels = { mobile: '📱 موبايل', desktop: '🖥️ ديسكتوب', tablet: '📲 تابلت' };
        setText(s.id + '-kpi-device', devLabels[topDev] || topDev || '—');

        // Donut — device
        const DCOLS = ['#3b82f6','#2dd4bf','#a78bfa'];
        const devKeys = Object.keys(devObj);
        renderDonut(s.id + '-chart-device',
            devKeys.map(k => ({ mobile:'موبايل', desktop:'ديسكتوب', tablet:'تابلت' }[k] || k)),
            devKeys.map(k => devObj[k]),
            DCOLS.slice(0, devKeys.length));

        // Bar lists
        renderBarList(s.id + '-list-os',       d.os        || {}, s.color);
        renderBarList(s.id + '-list-browser',   d.browsers  || {}, '#3b82f6');
        renderBarList(s.id + '-list-ref',       d.referrers || {}, '#2dd4bf');
        renderBarList(s.id + '-list-countries', d.countries || {}, '#fbbf24');

        // Hour chart
        renderHours(s.id + '-chart-hours', d.hours || {}, s.color);

        // Day chart
        renderDays(s.id + '-chart-days', d.days || {}, s.color);

        // Footer timestamp
        document.getElementById('footer-time').textContent =
            'آخر تحديث: ' + new Date().toLocaleTimeString('ar-SA');
        document.getElementById('last-updated').textContent =
            'آخر تحديث: ' + new Date().toLocaleTimeString('ar-SA');
    });
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
function topKey(obj) {
    return Object.entries(obj).sort((a,b) => b[1]-a[1])[0]?.[0] || '';
}

/* ── Init dashboard ──────────────────────────────────────────────────────── */
function initDashboard() {
    initNav();
    SECTIONS.forEach(s => {
        buildPanel(s);
        subscribeSection(s);
    });
}
