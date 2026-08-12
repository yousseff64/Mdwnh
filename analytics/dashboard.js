/* ══════════════════════════════════════════════════════════════════════════════
   MDWNH Analytics — dashboard engine v3
   ──────────────────────────────────────────────────────────────────────────────
   Reads the daily buckets written by tracker.js v3 and answers the question the
   old dashboard could not: "engagement moved — by how much, and what caused it?"

   Performance notes (the old one was slow because of these):
     • v2 opened a permanent .on('value') listener on the ENTIRE node for all
       five sections at once, so every write re-downloaded everything and
       re-rendered 15 live charts. v3 does one range-scoped .once() read per
       refresh and keeps a single set of charts that are updated in place.
     • Only the selected scope is rendered. Switching scope reuses the charts.
   ══════════════════════════════════════════════════════════════════════════════ */

/* ── Firebase ─────────────────────────────────────────────────────────────── */
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
const TZ = 'Asia/Riyadh';

const SCOPES = [
    { id: 'all',            name: 'نظرة عامة',      emoji: '📊', color: '#8b5cf6' },
    { id: 'comics_hujra',   name: 'باب الحجرة',     emoji: '🚪', color: '#3b82f6', kind: 'comic' },
    { id: 'comics_samrqand',name: 'قضية سمرقند',    emoji: '⚖️', color: '#2dd4bf', kind: 'comic' },
    { id: 'comics_ghailam', name: 'القرد والغيلم',  emoji: '🐒', color: '#fbbf24', kind: 'comic' },
    { id: 'pages_main',     name: 'الصفحة الرئيسية', emoji: '🏠', color: '#a78bfa' },
    { id: 'pages_projects', name: 'المشاريع',       emoji: '📁', color: '#fb923c' }
];
const DATA_SCOPES = SCOPES.filter(s => s.id !== 'all').map(s => s.id);

const DOW_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

/* ── State ────────────────────────────────────────────────────────────────── */
let syncPillIndicator = function () {};   // assigned by buildScopeNav
let positionTips     = function () {};   // assigned by initControls

const state = {
    scope: 'all',
    preset: 'this_week',
    customFrom: null,
    customTo: null,
    fair: true,            // trim the comparison period to the same elapsed days
    raw: {},               // scopeId -> { 'YYYY-MM-DD': {...} }
    loaded: false
};
const charts = {};

/* ══ Date helpers — all in Riyadh time ═══════════════════════════════════════ */
function todayRiyadh() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
}
/* Date strings are treated as UTC midnight so arithmetic never drifts a day. */
function d2t(s) { return Date.parse(s + 'T00:00:00Z'); }
function t2d(t) { return new Date(t).toISOString().slice(0, 10); }
function addDays(s, n) { return t2d(d2t(s) + n * 86400000); }
function daysBetween(a, b) { return Math.round((d2t(b) - d2t(a)) / 86400000) + 1; }
function dowOf(s) { return new Date(d2t(s)).getUTCDay(); }
function startOfWeek(s) { return addDays(s, -dowOf(s)); }          // week starts Sunday
function startOfMonth(s) { return s.slice(0, 8) + '01'; }
function endOfMonth(s) {
    const d = new Date(d2t(s));
    return t2d(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
}
function rangeDays(from, to) {
    const out = [];
    for (let d = from; d2t(d) <= d2t(to); d = addDays(d, 1)) out.push(d);
    return out;
}
function fmtDate(s) {
    const d = new Date(d2t(s));
    return new Intl.DateTimeFormat('ar-EG', {
        timeZone: 'UTC', day: 'numeric', month: 'short'
    }).format(d);
}

/* Resolve the selected preset into { cur:{from,to}, prev:{from,to}, label } */
function resolvePeriod() {
    const today = todayRiyadh();
    let cur, prev, label, prevLabel;

    switch (state.preset) {
        case 'today':
            cur  = { from: today, to: today };
            prev = { from: addDays(today, -1), to: addDays(today, -1) };
            label = 'اليوم'; prevLabel = 'أمس';
            break;

        case 'this_week': {
            const s = startOfWeek(today);
            cur  = { from: s, to: today };
            prev = { from: addDays(s, -7), to: addDays(s, -1) };
            label = 'هذا الأسبوع'; prevLabel = 'الأسبوع الماضي';
            break;
        }
        case 'last_week': {
            const s = addDays(startOfWeek(today), -7);
            cur  = { from: s, to: addDays(s, 6) };
            prev = { from: addDays(s, -7), to: addDays(s, -1) };
            label = 'الأسبوع الماضي'; prevLabel = 'الأسبوع قبله';
            break;
        }
        case 'this_month': {
            const s = startOfMonth(today);
            const ps = startOfMonth(addDays(s, -1));
            cur  = { from: s, to: today };
            prev = { from: ps, to: endOfMonth(ps) };
            label = 'هذا الشهر'; prevLabel = 'الشهر الماضي';
            break;
        }
        case 'last_month': {
            const ls = startOfMonth(addDays(startOfMonth(today), -1));
            const pls = startOfMonth(addDays(ls, -1));
            cur  = { from: ls, to: endOfMonth(ls) };
            prev = { from: pls, to: endOfMonth(pls) };
            label = 'الشهر الماضي'; prevLabel = 'الشهر قبله';
            break;
        }
        case 'last7': case 'last28': case 'last90': {
            const n = parseInt(state.preset.replace('last', ''), 10);
            cur  = { from: addDays(today, -(n - 1)), to: today };
            prev = { from: addDays(today, -(2 * n - 1)), to: addDays(today, -n) };
            const unit = n <= 10 ? 'أيام' : 'يوم';   // Arabic: 3-10 takes the plural
            label = `آخر ${n} ${unit}`; prevLabel = `الـ ${n} ${unit} السابقة`;
            break;
        }
        case 'custom': {
            const f = state.customFrom || addDays(today, -6);
            const t = state.customTo || today;
            const n = daysBetween(f, t);
            cur  = { from: f, to: t };
            prev = { from: addDays(f, -n), to: addDays(f, -1) };
            label = 'فترة مخصصة'; prevLabel = 'الفترة السابقة المماثلة';
            break;
        }
        default:
            cur = { from: today, to: today };
            prev = { from: addDays(today, -1), to: addDays(today, -1) };
            label = 'اليوم'; prevLabel = 'أمس';
    }

    /* Fair comparison: an in-progress week/month is compared against the same
       number of elapsed days, not against a full one. Without this, "this week"
       always looks down simply because it has not finished yet. */
    let trimmed = false;
    if (state.fair && (state.preset === 'this_week' || state.preset === 'this_month')) {
        const n = daysBetween(cur.from, cur.to);
        if (daysBetween(prev.from, prev.to) > n) {
            prev = { from: prev.from, to: addDays(prev.from, n - 1) };
            trimmed = true;
        }
    }
    return { cur, prev, label, prevLabel, trimmed };
}

/* ══ Aggregation ════════════════════════════════════════════════════════════ */
const LEAF_METRICS = ['sessions', 'pageviews', 'qualifiedViews', 'engagedSessions',
    'bounces', 'newVisitors', 'returningVisitors', 'activeMs', 'scrollSum', 'scrollN'];
const DIMENSIONS = ['devices', 'os', 'browsers', 'referrers', 'sources',
    'countries', 'hours', 'dow', 'langs', 'screens', 'campaigns', 'depth', 'events'];

function emptyAgg() {
    const a = {};
    LEAF_METRICS.forEach(m => a[m] = 0);
    DIMENSIONS.forEach(d => a[d] = {});
    return a;
}
/* Merge one day's raw object into an accumulator. */
function mergeDay(acc, day) {
    if (!day) return acc;
    LEAF_METRICS.forEach(m => { acc[m] += day[m] || 0; });
    DIMENSIONS.forEach(dim => {
        const src = day[dim];
        if (!src) return;
        for (const k in src) acc[dim][k] = (acc[dim][k] || 0) + (src[k] || 0);
    });
    return acc;
}
/* Pull every day in [from,to] for the active scope (or all scopes summed). */
function aggregate(from, to) {
    const acc = emptyAgg();
    const scopes = state.scope === 'all' ? DATA_SCOPES : [state.scope];
    rangeDays(from, to).forEach(d => {
        scopes.forEach(s => mergeDay(acc, (state.raw[s] || {})[d]));
    });
    return acc;
}
/* Per-day series of one metric, for the trend chart. */
function series(from, to, metric) {
    const scopes = state.scope === 'all' ? DATA_SCOPES : [state.scope];
    return rangeDays(from, to).map(d => {
        let v = 0;
        scopes.forEach(s => {
            const day = (state.raw[s] || {})[d];
            if (day) v += day[metric] || 0;
        });
        return v;
    });
}

/* ══ Derived metrics ════════════════════════════════════════════════════════ */
function derive(a) {
    const s = a.sessions || 0;
    return {
        sessions:        s,
        pageviews:       a.pageviews || 0,
        qualifiedViews:  a.qualifiedViews || 0,
        engagedSessions: a.engagedSessions || 0,
        newVisitors:     a.newVisitors || 0,
        returningVisitors: a.returningVisitors || 0,
        bounces:         a.bounces || 0,
        engagementRate:  s ? (a.engagedSessions / s) * 100 : 0,
        bounceRate:      s ? (a.bounces / s) * 100 : 0,
        viewRate:        s ? (a.qualifiedViews / s) * 100 : 0,
        avgSeconds:      s ? (a.activeMs / s) / 1000 : 0,
        avgScroll:       a.scrollN ? a.scrollSum / a.scrollN : 0,
        pagesPerSession: s ? a.pageviews / s : 0,
        returnRate:      s ? (a.returningVisitors / s) * 100 : 0,
        /* One headline number the team asked for: total engagement.
           Engaged sessions + qualified views + depth-completions, i.e. every
           signal that someone actually consumed the content. */
        engagementScore: (a.engagedSessions || 0) + (a.qualifiedViews || 0) +
                         ((a.depth && a.depth.d100) || 0)
    };
}

/* ══ Formatting ═════════════════════════════════════════════════════════════ */
const nf = new Intl.NumberFormat('en-US');
function num(v)  { return nf.format(Math.round(v || 0)); }
function pct(v)  { return (v || 0).toFixed(1).replace(/\.0$/, '') + '%'; }
function dur(sec) {
    sec = Math.round(sec || 0);
    if (sec < 60) return sec + 'ث';
    const m = Math.floor(sec / 60), s = sec % 60;
    if (m < 60) return m + 'د ' + String(s).padStart(2, '0') + 'ث';
    return Math.floor(m / 60) + 'س ' + String(m % 60).padStart(2, '0') + 'د';
}
/* Percentage change with the edge cases the old dashboard got wrong:
   0 -> 0 is flat (not NaN), 0 -> n is "new", n -> 0 is -100%. */
function change(cur, prev) {
    cur = cur || 0; prev = prev || 0;
    if (prev === 0 && cur === 0) return { pct: 0, dir: 'flat', text: '—', abs: 0 };
    if (prev === 0)              return { pct: null, dir: 'up', text: 'جديد', abs: cur };
    const p = ((cur - prev) / prev) * 100;
    return {
        pct: p,
        abs: cur - prev,
        dir: Math.abs(p) < 0.05 ? 'flat' : (p > 0 ? 'up' : 'down'),
        text: (p > 0 ? '+' : '') + p.toFixed(1).replace(/\.0$/, '') + '%'
    };
}
function deltaHTML(c, invert) {
    // invert=true for metrics where going down is good (bounce rate).
    let cls = c.dir === 'flat' ? 'flat' : (c.dir === 'up' ? 'up' : 'down');
    if (invert && cls !== 'flat') cls = cls === 'up' ? 'down' : 'up';
    const arrow = c.dir === 'flat' ? '→' : (c.dir === 'up' ? '↑' : '↓');
    return `<span class="delta ${cls}">${arrow} ${c.text}</span>`;
}

/* ── Country code -> Arabic name + flag ───────────────────────────────────── */
const COUNTRY_AR = {
    SA: 'السعودية', AE: 'الإمارات', EG: 'مصر', KW: 'الكويت', QA: 'قطر',
    BH: 'البحرين', OM: 'عُمان', JO: 'الأردن', MA: 'المغرب', DZ: 'الجزائر',
    TN: 'تونس', LY: 'ليبيا', IQ: 'العراق', YE: 'اليمن', LB: 'لبنان',
    SY: 'سوريا', PS: 'فلسطين', SD: 'السودان', MR: 'موريتانيا', SO: 'الصومال',
    US: 'أمريكا', GB: 'بريطانيا', DE: 'ألمانيا', FR: 'فرنسا', NL: 'هولندا',
    SE: 'السويد', NO: 'النرويج', DK: 'الدنمارك', TR: 'تركيا', IN: 'الهند',
    PK: 'باكستان', BD: 'بنغلاديش', ID: 'إندونيسيا', MY: 'ماليزيا',
    CA: 'كندا', AU: 'أستراليا', ES: 'إسبانيا', IT: 'إيطاليا', RU: 'روسيا',
    CN: 'الصين', JP: 'اليابان', BR: 'البرازيل', ZA: 'جنوب أفريقيا',
    NG: 'نيجيريا', KE: 'كينيا', ZZ: 'غير معروف'
};
function flag(code) {
    code = (code || '').toUpperCase();
    if (code === 'ZZ' || !/^[A-Z]{2}$/.test(code)) return '🌍';
    return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}
function countryLabel(code) {
    const c = (code || '').toUpperCase();
    return `${flag(c)} ${COUNTRY_AR[c] || c}`;
}

/* ── Dimension label maps ─────────────────────────────────────────────────── */
const LABELS = {
    devices:   { mobile: '📱 موبايل', desktop: '🖥️ كمبيوتر', tablet: '📲 تابلت' },
    os:        { ios: '🍎 iOS', android: '🤖 Android', windows: '🪟 Windows',
                 macos: '🍎 macOS', linux: '🐧 Linux', chromeos: '💻 ChromeOS', other: '❓ أخرى' },
    browsers:  { chrome: '🌐 Chrome', safari: '🧭 Safari', firefox: '🦊 Firefox',
                 edge: '🔷 Edge', opera: '🎭 Opera', samsung: '📱 Samsung',
                 instagram: '📸 إنستغرام (داخلي)', facebook: '📘 فيسبوك (داخلي)',
                 tiktok: '🎵 تيك توك (داخلي)', snapchat: '👻 سناب (داخلي)', other: '❓ أخرى' },
    referrers: { direct: '🔗 مباشر', social: '📲 سوشيال', search: '🔍 بحث',
                 internal: '🏠 من داخل الموقع', campaign: '🎯 حملة', other: '📌 أخرى' },
    sources:   { direct: '🔗 مباشر', internal: '🏠 داخلي', instagram: '📸 إنستغرام',
                 tiktok: '🎵 تيك توك', youtube: '▶️ يوتيوب', facebook: '📘 فيسبوك',
                 x: '✖️ إكس', whatsapp: '💬 واتساب', telegram: '✈️ تيليجرام',
                 snapchat: '👻 سناب شات', linkedin: '💼 لينكدإن', google: '🔍 جوجل',
                 bing: '🔍 Bing', discord: '🎮 ديسكورد', reddit: '👽 Reddit',
                 threads: '🧵 ثريدز', pinterest: '📌 بينتريست' },
    screens:   { xs: '📱 صغير جدًا (<480)', sm: '📱 صغير (480-767)', md: '📲 متوسط (768-1023)',
                 lg: '💻 كبير (1024-1439)', xl: '🖥️ كبير جدًا (1440+)' },
    langs:     { ar: '🇸🇦 العربية', en: '🇬🇧 الإنجليزية', fr: '🇫🇷 الفرنسية',
                 de: '🇩🇪 الألمانية', tr: '🇹🇷 التركية', id: '🇮🇩 الإندونيسية',
                 ur: '🇵🇰 الأردية', es: '🇪🇸 الإسبانية', other: '🌐 أخرى' },
    depth:     { d25: 'وصلوا 25%', d50: 'وصلوا 50%', d75: 'وصلوا 75%', d100: 'وصلوا للنهاية' },
    events:    { completed: '🏁 أنهى القراءة', read_25: '📖 قرأ 25%', read_50: '📖 قرأ 50%',
                 read_75: '📖 قرأ 75%', read_100: '📖 قرأ 100%', click_email: '✉️ ضغط الإيميل',
                 click_phone: '📞 ضغط الهاتف' }
};
function label(dim, k) {
    if (dim === 'countries') return countryLabel(k);
    const m = LABELS[dim] || {};
    if (m[k]) return m[k];
    if (dim === 'events' && k.indexOf('outbound_') === 0) return '↗️ ' + k.slice(9).replace(/_/g, '.');
    if (dim === 'events' && k.indexOf('nav_') === 0) return '🔘 ' + k.slice(4).replace(/_/g, ' ');
    return k.replace(/_/g, ' ');
}

/* ══ "What changed" engine ═══════════════════════════════════════════════════
   This is the feature the team asked for: not just "engagement dropped 32%",
   but which slice of the audience caused it, ranked by how much of the total
   move each one explains.                                                    */
function analyseChange(cur, prev, curDays, prevDays) {
    const c = derive(cur), p = derive(prev);
    const head = change(c.engagementScore, p.engagementScore);
    const findings = [];

    const DIMS = [
        ['sources',   'مصدر الزيارة'],
        ['countries', 'الدولة'],
        ['devices',   'الجهاز'],
        ['referrers', 'نوع المصدر'],
        ['browsers',  'المتصفح'],
        ['campaigns', 'الحملة']
    ];

    DIMS.forEach(([dim, dimName]) => {
        const keys = new Set([...Object.keys(cur[dim] || {}), ...Object.keys(prev[dim] || {})]);
        const rows = [];
        keys.forEach(k => {
            if (dim === 'campaigns' && k === 'none') return;
            const a = (cur[dim] || {})[k] || 0;
            const b = (prev[dim] || {})[k] || 0;
            if (a === b) return;
            rows.push({ dim, dimName, key: k, cur: a, prev: b, delta: a - b });
        });
        rows.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
        rows.slice(0, 3).forEach(r => findings.push(r));
    });

    const sessionDelta = c.sessions - p.sessions;
    findings.forEach(f => {
        f.share = sessionDelta !== 0 ? (f.delta / sessionDelta) * 100 : null;
        f.chg = change(f.cur, f.prev);
    });
    findings.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    /* Sharpest single-day move inside the current period — "where exactly". */
    const days = rangeDays(curDays.from, curDays.to);
    const daily = days.map(d => {
        const scopes = state.scope === 'all' ? DATA_SCOPES : [state.scope];
        const acc = emptyAgg();
        scopes.forEach(s => mergeDay(acc, (state.raw[s] || {})[d]));
        return { date: d, v: derive(acc).engagementScore };
    });
    let worstDay = null, bestDay = null;
    for (let i = 1; i < daily.length; i++) {
        const diff = daily[i].v - daily[i - 1].v;
        if (!worstDay || diff < worstDay.diff) worstDay = { date: daily[i].date, diff, from: daily[i - 1] };
        if (!bestDay  || diff > bestDay.diff)  bestDay  = { date: daily[i].date, diff, from: daily[i - 1] };
    }

    return { head, findings: findings.slice(0, 8), c, p, daily, worstDay, bestDay, sessionDelta };
}

/* ══ Rendering ══════════════════════════════════════════════════════════════ */
function el(id) { return document.getElementById(id); }
function setHTML(id, html) { const e = el(id); if (e) e.innerHTML = html; }

function renderKPIs(c, p) {
    // Every card carries a real explanation. `tip` is shown in a popover on
    // hover/tap — the old build used a bare title attribute that only changed
    // the cursor and never actually explained anything.
    const cards = [
        { k: 'الجلسات', v: num(c.sessions), d: change(c.sessions, p.sessions),
          sub: `${num(p.sessions)} في الفترة السابقة`,
          tip: 'عدد الزيارات المنفصلة. الزائر الواحد يُحسب جلسة واحدة مهما حدّث الصفحة، وتُفتح له جلسة جديدة فقط بعد 30 دقيقة من عدم النشاط. هذا هو رقم "كم شخص دخل" الحقيقي.' },

        { k: 'إجمالي التفاعل', v: num(c.engagementScore), d: change(c.engagementScore, p.engagementScore),
          sub: `${num(p.engagementScore)} سابقًا`, big: true,
          tip: 'الرقم الرئيسي للفريق. مجموع: الجلسات المتفاعلة + المشاهدات الحقيقية + من وصل لنهاية المحتوى. يرتفع فقط عندما يستهلك الناس المحتوى فعلًا، لا لمجرد فتح الصفحة.' },

        { k: 'مشاهدات حقيقية', v: num(c.qualifiedViews), d: change(c.qualifiedViews, p.qualifiedViews),
          sub: '20 ثانية فعلية داخل الصفحة',
          tip: 'من بقي 20 ثانية والصفحة مفتوحة أمامه فعلًا. لو فتح التبويب في الخلفية ولم ينظر إليه لا يُحتسب — الوقت يتوقف عند تصغير النافذة أو تبديل التبويب.' },

        { k: 'معدل التفاعل', v: pct(c.engagementRate), d: change(c.engagementRate, p.engagementRate),
          sub: `${num(c.engagedSessions)} جلسة متفاعلة`,
          tip: 'نسبة الجلسات التي تفاعلت فعلًا = الجلسات المتفاعلة ÷ كل الجلسات. الجلسة تُعتبر متفاعلة إذا بقي الزائر 15 ثانية نشطة، أو نزل 50% من الصفحة، أو ضغط على أي شيء.' },

        { k: 'متوسط وقت القراءة', v: dur(c.avgSeconds), d: change(c.avgSeconds, p.avgSeconds),
          sub: 'لكل جلسة، وقت نشط فقط',
          tip: 'متوسط الوقت النشط لكل جلسة. يُحسب فقط والصفحة ظاهرة أمام الزائر. انخفاضه مع ثبات الجلسات يعني أن المحتوى لم يمسك الناس.' },

        { k: 'متوسط عمق التمرير', v: pct(c.avgScroll), d: change(c.avgScroll, p.avgScroll),
          sub: 'كم نزل الزائر في الصفحة',
          tip: 'أقصى نسبة نزل إليها الزائر في الصفحة، بالمتوسط. 100% = وصل للنهاية. رقم منخفض يعني أن أول الصفحة لا يقنعهم بالاستمرار.' },

        { k: 'معدل الارتداد', v: pct(c.bounceRate), d: change(c.bounceRate, p.bounceRate),
          sub: 'خرج دون أي تفاعل', invert: true,
          tip: 'نسبة من دخل وخرج دون أي تفاعل يُذكر (أقل من 15 ثانية، ولم ينزل، ولم يضغط شيئًا). كلما قلّ كان أفضل — لذلك يظهر انخفاضه باللون الأخضر.' },

        { k: 'زوار جدد', v: num(c.newVisitors), d: change(c.newVisitors, p.newVisitors),
          sub: `${pct(100 - c.returnRate)} من الجلسات`,
          tip: 'جلسات من أجهزة تزور الموقع لأول مرة. ارتفاعه يعني أن التسويق يجلب جمهورًا جديدًا.' },

        { k: 'زوار عائدون', v: num(c.returningVisitors), d: change(c.returningVisitors, p.returningVisitors),
          sub: `${pct(c.returnRate)} من الجلسات`,
          tip: 'جلسات من أجهزة سبق أن زارت الموقع. ارتفاعه يعني أن المحتوى يستحق الرجوع إليه — وهو أفضل مؤشر على الولاء.' },

        { k: 'مشاهدات الصفحات', v: num(c.pageviews), d: change(c.pageviews, p.pageviews),
          sub: `${c.pagesPerSession.toFixed(2)} صفحة/جلسة`,
          tip: 'إجمالي مرات تحميل الصفحة، بما فيها التحديث والرجوع. أعلى من الجلسات دائمًا. النسبة صفحة/جلسة تبيّن كم صفحة يتصفحها الزائر في الزيارة الواحدة.' }
    ];
    setHTML('kpi-row', cards.map(x => `
        <div class="kpi-card${x.big ? ' hero' : ''}">
            <div class="kpi-label">${x.k}<span class="info" tabindex="0" role="button"
                 aria-label="شرح ${x.k}" data-tip="${x.tip.replace(/"/g, '&quot;')}">؟</span></div>
            <div class="kpi-val">${x.v}</div>
            <div class="kpi-foot">${deltaHTML(x.d, x.invert)}<span class="kpi-sub">${x.sub}</span></div>
        </div>`).join(''));
}

function renderNarrative(an, period) {
    const dirWord = an.head.dir === 'up' ? 'ارتفع' : (an.head.dir === 'down' ? 'انخفض' : 'ثبت');
    const cls = an.head.dir === 'up' ? 'up' : (an.head.dir === 'down' ? 'down' : 'flat');

    let html = `
        <div class="nar-head ${cls}">
            <div class="nar-big">${an.head.dir === 'flat' ? '—' : (an.head.dir === 'up' ? '↑' : '↓')} ${an.head.text}</div>
            <div class="nar-say">
                إجمالي التفاعل ${dirWord} في <b>${period.label}</b>
                (${num(an.c.engagementScore)}) مقارنةً بـ <b>${period.prevLabel}</b> (${num(an.p.engagementScore)}).
                ${an.head.abs === 0 ? 'بدون فرق يُذكر.'
                    : `${an.head.abs > 0 ? 'بزيادة' : 'بنقص'} <b>${num(Math.abs(an.head.abs))}</b> نقطة تفاعل.`}
            </div>
        </div>`;

    if (!an.findings.length) {
        html += `<div class="nar-empty">لا توجد فروق تُذكر بين الفترتين على أي بُعد.</div>`;
    } else {
        html += `<div class="nar-why">لماذا؟ أكبر الأسباب مرتّبة حسب حجم أثرها على عدد الجلسات:</div>
                 <div class="nar-list">`;
        an.findings.forEach(f => {
            const up = f.delta > 0;
            html += `
            <div class="nar-item ${up ? 'up' : 'down'}">
                <div class="nar-item-bar"></div>
                <div class="nar-item-body">
                    <div class="nar-item-top">
                        <span class="nar-item-name">${label(f.dim, f.key)}</span>
                        <span class="nar-dim">${f.dimName}</span>
                    </div>
                    <div class="nar-item-sub">
                        ${num(f.prev)} ← ${num(f.cur)} جلسة
                        <b class="${up ? 'up' : 'down'}">(${up ? '+' : ''}${num(f.delta)}${f.chg.pct !== null ? '، ' + f.chg.text : ''})</b>
                        ${f.share !== null && Math.abs(f.share) >= 1 && Math.abs(f.share) <= 400
                            ? `<span class="nar-share">يفسّر ${Math.abs(f.share).toFixed(0)}% من التغيّر</span>` : ''}
                    </div>
                </div>
            </div>`;
        });
        html += `</div>`;
    }

    if (an.worstDay && an.worstDay.diff < 0) {
        html += `<div class="nar-day down">أحدّ انخفاض يومي: <b>${fmtDate(an.worstDay.date)}</b>
                 (${num(an.worstDay.diff)} مقارنةً باليوم السابق له).</div>`;
    }
    if (an.bestDay && an.bestDay.diff > 0) {
        html += `<div class="nar-day up">أقوى قفزة يومية: <b>${fmtDate(an.bestDay.date)}</b>
                 (+${num(an.bestDay.diff)} مقارنةً باليوم السابق له).</div>`;
    }
    if (period.trimmed) {
        html += `<div class="nar-note">المقارنة عادلة: الفترة السابقة تم قصّها لنفس عدد الأيام المنقضية
                 (${daysBetween(period.cur.from, period.cur.to)} يوم) حتى لا تبدو الفترة الحالية أقل لمجرد أنها لم تنتهِ.</div>`;
    }
    setHTML('narrative', html);
}

/* ── Trend chart: current period vs previous, overlaid ────────────────────── */
function renderTrend(period, metric) {
    const ctx = el('chart-trend');
    if (!ctx) return;
    const curDays = rangeDays(period.cur.from, period.cur.to);
    const prvDays = rangeDays(period.prev.from, period.prev.to);
    const n = Math.max(curDays.length, prvDays.length);

    const curVals = series(period.cur.from, period.cur.to, metric);
    const prvVals = series(period.prev.from, period.prev.to, metric);
    while (curVals.length < n) curVals.push(null);
    while (prvVals.length < n) prvVals.push(null);

    const labels = Array.from({ length: n }, (_, i) => curDays[i] ? fmtDate(curDays[i]) : '—');
    const color = (SCOPES.find(s => s.id === state.scope) || SCOPES[0]).color;

    const data = {
        labels,
        datasets: [
            { label: period.label, data: curVals, borderColor: color,
              backgroundColor: color + '25', borderWidth: 2.5, fill: true,
              tension: 0.35, pointRadius: 2.5, pointHoverRadius: 6 },
            { label: period.prevLabel, data: prvVals, borderColor: 'rgba(245,244,242,0.35)',
              backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 4],
              fill: false, tension: 0.35, pointRadius: 0, pointHoverRadius: 5 }
        ]
    };

    if (charts.trend) {
        charts.trend.data = data;
        charts.trend.update('none');
        return;
    }
    charts.trend = new Chart(ctx, {
        type: 'line',
        data,
        options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { boxWidth: 12, padding: 14, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        afterBody(items) {
                            const i = items[0].dataIndex;
                            const a = curVals[i] || 0, b = prvVals[i] || 0;
                            const ch = change(a, b);
                            return `الفرق: ${ch.text} (${a - b >= 0 ? '+' : ''}${a - b})`;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { maxTicksLimit: 12 } },
                y: { grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

/* ── Breakdown table with per-row deltas ──────────────────────────────────── */
function renderTable(containerId, dim, cur, prev, opts) {
    opts = opts || {};
    const skip = opts.exclude || [];
    const keys = new Set([...Object.keys(cur[dim] || {}), ...Object.keys(prev[dim] || {})]
        .filter(k => skip.indexOf(k) === -1));
    const total = [...keys].reduce((a, k) => a + ((cur[dim] || {})[k] || 0), 0);
    const rows = [...keys].map(k => {
        const a = (cur[dim] || {})[k] || 0;
        const b = (prev[dim] || {})[k] || 0;
        return { k, a, b, d: a - b, chg: change(a, b), share: total ? (a / total) * 100 : 0 };
    }).filter(r => r.a || r.b)
      .sort((x, y) => y.a - x.a || Math.abs(y.d) - Math.abs(x.d))
      .slice(0, opts.limit || 12);

    if (!rows.length) {
        setHTML(containerId, `<div class="empty">لا توجد بيانات في هذه الفترة</div>`);
        return;
    }
    const max = rows[0].a || 1;
    const color = opts.color || '#3b82f6';

    setHTML(containerId, `
        <table class="bt">
            <thead><tr>
                <th>${opts.head || ''}</th><th>الحالي</th><th>السابق</th><th>التغيّر</th><th>الحصة</th>
            </tr></thead>
            <tbody>
            ${rows.map(r => `
                <tr>
                    <td class="bt-name">
                        <div class="bt-label">${label(dim, r.k)}</div>
                        <div class="bt-track"><div class="bt-fill" style="width:${Math.round((r.a / max) * 100)}%;background:${color}"></div></div>
                    </td>
                    <td class="bt-num">${num(r.a)}</td>
                    <td class="bt-num muted">${num(r.b)}</td>
                    <td class="bt-num">${deltaHTML(r.chg)}<div class="bt-abs">${r.d >= 0 ? '+' : ''}${num(r.d)}</div></td>
                    <td class="bt-num muted">${pct(r.share)}</td>
                </tr>`).join('')}
            </tbody>
        </table>`);
}

/* ── Hour × day-of-week heatmap (Riyadh time) ─────────────────────────────── */
function renderHeatmap(period) {
    const scopes = state.scope === 'all' ? DATA_SCOPES : [state.scope];
    const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
    const hourTotals = new Array(24).fill(0);
    const dowTotals = new Array(7).fill(0);

    /* hours and dow are stored per day, so the grid is built by attributing each
       day's hour histogram to that day's weekday. */
    rangeDays(period.cur.from, period.cur.to).forEach(d => {
        const w = dowOf(d);
        scopes.forEach(s => {
            const day = (state.raw[s] || {})[d];
            if (!day || !day.hours) return;
            for (let h = 0; h < 24; h++) {
                const v = day.hours['h' + h] || 0;
                grid[w][h] += v; hourTotals[h] += v; dowTotals[w] += v;
            }
        });
    });

    let max = 0;
    grid.forEach(r => r.forEach(v => { if (v > max) max = v; }));
    const color = (SCOPES.find(s => s.id === state.scope) || SCOPES[0]).color;

    let html = '<div class="hm">';
    html += '<div class="hm-corner"></div>';
    for (let h = 0; h < 24; h++) {
        html += `<div class="hm-h">${h % 3 === 0 ? h : ''}</div>`;
    }
    for (let w = 0; w < 7; w++) {
        html += `<div class="hm-d">${DOW_AR[w]}</div>`;
        for (let h = 0; h < 24; h++) {
            const v = grid[w][h];
            const a = max ? Math.pow(v / max, 0.6) : 0;
            html += `<div class="hm-c" style="background:${v ? color : 'rgba(255,255,255,0.03)'};opacity:${v ? 0.18 + a * 0.82 : 1}"
                      title="${DOW_AR[w]} ${h}:00 — ${num(v)} جلسة"></div>`;
        }
    }
    html += '</div>';

    const peakH = hourTotals.indexOf(Math.max(...hourTotals));
    const peakD = dowTotals.indexOf(Math.max(...dowTotals));
    if (max > 0) {
        html += `<div class="hm-note">أعلى نشاط: <b>${DOW_AR[peakD]}</b> وحول الساعة
                 <b>${peakH}:00</b> بتوقيت الرياض — أفضل وقت للنشر.</div>`;
    }
    setHTML('heatmap', html);
}

/* ── Engagement funnel ────────────────────────────────────────────────────── */
function renderFunnel(cur, prev) {
    const steps = [
        { n: 'وصلوا للصفحة',      v: cur.sessions,                    p: prev.sessions },
        { n: 'تفاعلوا',           v: cur.engagedSessions,             p: prev.engagedSessions },
        { n: 'شاهدوا 20 ثانية+',  v: cur.qualifiedViews,              p: prev.qualifiedViews },
        { n: 'نزلوا 50% أو أكثر', v: (cur.depth && cur.depth.d50) || 0,  p: (prev.depth && prev.depth.d50) || 0 },
        { n: 'وصلوا للنهاية',     v: (cur.depth && cur.depth.d100) || 0, p: (prev.depth && prev.depth.d100) || 0 }
    ];
    const top = steps[0].v || 1;
    setHTML('funnel', steps.map((s, i) => {
        const share = (s.v / top) * 100;
        const drop = i > 0 && steps[i - 1].v ? ((steps[i - 1].v - s.v) / steps[i - 1].v) * 100 : 0;
        return `
        <div class="fn-step">
            <div class="fn-top">
                <span class="fn-name">${s.n}</span>
                <span class="fn-val">${num(s.v)} <span class="fn-share">(${pct(share)})</span> ${deltaHTML(change(s.v, s.p))}</span>
            </div>
            <div class="fn-track"><div class="fn-fill" style="width:${Math.max(share, 1)}%"></div></div>
            ${i > 0 && drop > 0 ? `<div class="fn-drop">تسرّب ${pct(drop)} من الخطوة السابقة</div>` : ''}
        </div>`;
    }).join(''));
}

/* ── Devices donut ────────────────────────────────────────────────────────── */
function renderDonut(cur) {
    const ctx = el('chart-device');
    if (!ctx) return;
    const obj = cur.devices || {};
    const keys = Object.keys(obj).sort((a, b) => obj[b] - obj[a]);
    const COLORS = { mobile: '#3b82f6', desktop: '#2dd4bf', tablet: '#a78bfa' };
    const data = {
        labels: keys.map(k => (LABELS.devices[k] || k)),
        datasets: [{
            data: keys.map(k => obj[k]),
            backgroundColor: keys.map(k => COLORS[k] || '#fb923c'),
            borderWidth: 2, borderColor: '#16161a', hoverOffset: 8
        }]
    };
    if (charts.device) { charts.device.data = data; charts.device.update('none'); return; }
    charts.device = new Chart(ctx, {
        type: 'doughnut', data,
        options: {
            responsive: true, maintainAspectRatio: false, cutout: '66%',
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, usePointStyle: true } },
                tooltip: { callbacks: { label: c => ` ${c.label}: ${num(c.parsed)}` } }
            }
        }
    });
}

/* ── New vs returning ─────────────────────────────────────────────────────── */
function renderVisitorMix(period) {
    const ctx = el('chart-visitors');
    if (!ctx) return;
    const days = rangeDays(period.cur.from, period.cur.to);
    const labels = days.map(fmtDate);
    const nw = series(period.cur.from, period.cur.to, 'newVisitors');
    const rt = series(period.cur.from, period.cur.to, 'returningVisitors');
    const data = {
        labels,
        datasets: [
            { label: 'جدد',   data: nw, backgroundColor: '#3b82f6', borderRadius: 4, stack: 'v' },
            { label: 'عائدون', data: rt, backgroundColor: '#2dd4bf', borderRadius: 4, stack: 'v' }
        ]
    };
    if (charts.visitors) { charts.visitors.data = data; charts.visitors.update('none'); return; }
    charts.visitors = new Chart(ctx, {
        type: 'bar', data,
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { boxWidth: 10, usePointStyle: true } } },
            scales: {
                x: { stacked: true, grid: { display: false }, ticks: { maxTicksLimit: 12 } },
                y: { stacked: true, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true, ticks: { precision: 0 } }
            }
        }
    });
}

/* ── Per-day raw table: "exactly where it dropped" ────────────────────────── */
function renderDailyTable(period) {
    const scopes = state.scope === 'all' ? DATA_SCOPES : [state.scope];
    const days = rangeDays(period.cur.from, period.cur.to);
    const rows = days.map(d => {
        const acc = emptyAgg();
        scopes.forEach(s => mergeDay(acc, (state.raw[s] || {})[d]));
        return { d, m: derive(acc) };
    });
    setHTML('daily-table', `
        <table class="bt dt">
            <thead><tr>
                <th>اليوم</th><th>جلسات</th><th>مشاهدات</th><th>تفاعل</th>
                <th>معدل التفاعل</th><th>متوسط الوقت</th><th>عمق التمرير</th><th>ارتداد</th><th>مقارنة بأمس</th>
            </tr></thead>
            <tbody>${rows.map((r, i) => {
                const prev = i > 0 ? rows[i - 1].m.engagementScore : null;
                const ch = prev === null ? null : change(r.m.engagementScore, prev);
                return `<tr>
                    <td class="bt-name"><b>${fmtDate(r.d)}</b><div class="dt-dow">${DOW_AR[dowOf(r.d)]}</div></td>
                    <td class="bt-num">${num(r.m.sessions)}</td>
                    <td class="bt-num">${num(r.m.qualifiedViews)}</td>
                    <td class="bt-num"><b>${num(r.m.engagementScore)}</b></td>
                    <td class="bt-num muted">${pct(r.m.engagementRate)}</td>
                    <td class="bt-num muted">${dur(r.m.avgSeconds)}</td>
                    <td class="bt-num muted">${pct(r.m.avgScroll)}</td>
                    <td class="bt-num muted">${pct(r.m.bounceRate)}</td>
                    <td class="bt-num">${ch ? deltaHTML(ch) : '—'}</td>
                </tr>`;
            }).join('')}</tbody>
        </table>`);
}

/* ── Per-section comparison (only on the Overview scope) ──────────────────── */
function renderScopeCompare(period) {
    const wrap = el('scope-compare-card');
    if (state.scope !== 'all') { wrap.style.display = 'none'; return; }
    wrap.style.display = '';

    const rows = DATA_SCOPES.map(id => {
        const meta = SCOPES.find(s => s.id === id);
        const c = emptyAgg(), p = emptyAgg();
        rangeDays(period.cur.from, period.cur.to).forEach(d => mergeDay(c, (state.raw[id] || {})[d]));
        rangeDays(period.prev.from, period.prev.to).forEach(d => mergeDay(p, (state.raw[id] || {})[d]));
        return { meta, c: derive(c), p: derive(p) };
    }).sort((a, b) => b.c.engagementScore - a.c.engagementScore);

    const max = rows[0] ? (rows[0].c.engagementScore || 1) : 1;
    setHTML('scope-compare', `
        <table class="bt">
            <thead><tr><th>القسم</th><th>جلسات</th><th>مشاهدات</th><th>تفاعل</th><th>معدل التفاعل</th><th>متوسط الوقت</th><th>التغيّر</th></tr></thead>
            <tbody>${rows.map(r => `
                <tr>
                    <td class="bt-name">
                        <div class="bt-label">${r.meta.emoji} ${r.meta.name}</div>
                        <div class="bt-track"><div class="bt-fill" style="width:${Math.round((r.c.engagementScore / max) * 100)}%;background:${r.meta.color}"></div></div>
                    </td>
                    <td class="bt-num">${num(r.c.sessions)}</td>
                    <td class="bt-num">${num(r.c.qualifiedViews)}</td>
                    <td class="bt-num"><b>${num(r.c.engagementScore)}</b></td>
                    <td class="bt-num muted">${pct(r.c.engagementRate)}</td>
                    <td class="bt-num muted">${dur(r.c.avgSeconds)}</td>
                    <td class="bt-num">${deltaHTML(change(r.c.engagementScore, r.p.engagementScore))}</td>
                </tr>`).join('')}</tbody>
        </table>`);
}

/* ══ All-time totals from the pre-v3 data ════════════════════════════════════
   The v2 tracker only ever stored lifetime totals with no dates attached, so
   per-day history for that period cannot be reconstructed — it was never
   recorded. The totals themselves are intact though, and v3 keeps mirroring
   into the same legacy counters, so this node is a genuine all-time figure.

   The one thing that needs repairing on read is countries: v2 wrote whatever
   its two IP providers returned, so the same country landed under both a name
   and a code ("belgium" and "be", "libya" and "ly"). They are merged back to a
   single ISO-2 key here rather than by rewriting production data.            */
const LEGACY_PATH = {
    comics_hujra: 'comics/hujra', comics_samrqand: 'comics/samrqand',
    comics_ghailam: 'comics/ghailam', pages_main: 'pages/main',
    pages_projects: 'pages/projects'
};
const NAME_TO_ISO = {
    saudi_arabia: 'SA', united_arab_emirates: 'AE', egypt: 'EG', kuwait: 'KW',
    qatar: 'QA', bahrain: 'BH', oman: 'OM', jordan: 'JO',
    hashemite_kingdom_of_jordan: 'JO', morocco: 'MA', algeria: 'DZ',
    tunisia: 'TN', libya: 'LY', iraq: 'IQ', yemen: 'YE', lebanon: 'LB',
    syria: 'SY', palestine: 'PS', sudan: 'SD', mauritania: 'MR',
    somalia: 'SO', djibouti: 'DJ', comoros: 'KM',
    united_states: 'US', united_kingdom: 'GB', germany: 'DE', france: 'FR',
    netherlands: 'NL', belgium: 'BE', sweden: 'SE', norway: 'NO',
    denmark: 'DK', finland: 'FI', poland: 'PL', czechia: 'CZ', spain: 'ES',
    italy: 'IT', russia: 'RU', turkey: 'TR', israel: 'IL',
    india: 'IN', pakistan: 'PK', bangladesh: 'BD', indonesia: 'ID',
    malaysia: 'MY', singapore: 'SG', japan: 'JP', china: 'CN',
    kyrgyzstan: 'KG', senegal: 'SN', uganda: 'UG', kenya: 'KE',
    nigeria: 'NG', south_africa: 'ZA', canada: 'CA', australia: 'AU',
    brazil: 'BR', unknown: 'ZZ', other: 'ZZ'
};
function toISO(k) {
    const raw = String(k || '').toLowerCase();
    if (NAME_TO_ISO[raw]) return NAME_TO_ISO[raw];
    if (/^[a-z]{2}$/.test(raw)) return raw.toUpperCase();   // already a code
    return 'ZZ';
}
const legacyRaw = {};

function loadLegacy() {
    return ensureAuth().then(() => Promise.all(DATA_SCOPES.map(id =>
        db.ref(LEGACY_PATH[id]).once('value')
          .then(s => { legacyRaw[id] = s.val() || {}; })
          .catch(() => { legacyRaw[id] = {}; })
    )));
}

function renderAllTime() {
    const scopes = state.scope === 'all' ? DATA_SCOPES : [state.scope];
    let entries = 0, views = 0;
    const countries = {}, devices = {};

    scopes.forEach(id => {
        const L = legacyRaw[id] || {};
        entries += L.entries || 0;
        views   += L.views || 0;
        for (const k in (L.countries || {})) {
            const c = toISO(k);
            countries[c] = (countries[c] || 0) + L.countries[k];
        }
        for (const k in (L.devices || {})) devices[k] = (devices[k] || 0) + L.devices[k];
    });

    const rows = DATA_SCOPES
        .filter(id => scopes.indexOf(id) !== -1)
        .map(id => ({ meta: SCOPES.find(s => s.id === id), L: legacyRaw[id] || {} }))
        .sort((a, b) => (b.L.entries || 0) - (a.L.entries || 0));
    const maxE = rows[0] ? (rows[0].L.entries || 1) : 1;

    const topC = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const maxC = topC[0] ? topC[0][1] : 1;

    setHTML('all-time', `
        <div class="at-heads">
            <div class="at-stat"><div class="at-lbl">إجمالي الزيارات</div><div class="at-val">${num(entries)}</div></div>
            <div class="at-stat"><div class="at-lbl">إجمالي المشاهدات</div><div class="at-val">${num(views)}</div></div>
            <div class="at-stat"><div class="at-lbl">الدول</div><div class="at-val">${num(Object.keys(countries).length)}</div></div>
        </div>
        <div class="grid-2" style="margin-bottom:0">
            <div>
                <div class="at-sub">حسب القسم</div>
                <table class="bt"><thead><tr><th>القسم</th><th>زيارات</th><th>مشاهدات</th></tr></thead>
                <tbody>${rows.map(r => `
                    <tr>
                        <td class="bt-name">
                            <div class="bt-label">${r.meta.emoji} ${r.meta.name}</div>
                            <div class="bt-track"><div class="bt-fill" style="width:${Math.round(((r.L.entries || 0) / maxE) * 100)}%;background:${r.meta.color}"></div></div>
                        </td>
                        <td class="bt-num">${num(r.L.entries || 0)}</td>
                        <td class="bt-num muted">${num(r.L.views || 0)}</td>
                    </tr>`).join('')}</tbody></table>
            </div>
            <div>
                <div class="at-sub">أعلى الدول منذ البداية <span class="at-fix">(تم دمج المكرر)</span></div>
                <table class="bt"><thead><tr><th>الدولة</th><th>زيارات</th><th>الحصة</th></tr></thead>
                <tbody>${topC.map(([c, v]) => `
                    <tr>
                        <td class="bt-name">
                            <div class="bt-label">${countryLabel(c)}</div>
                            <div class="bt-track"><div class="bt-fill" style="width:${Math.round((v / maxC) * 100)}%;background:#fbbf24"></div></div>
                        </td>
                        <td class="bt-num">${num(v)}</td>
                        <td class="bt-num muted">${pct((v / Math.max(entries, 1)) * 100)}</td>
                    </tr>`).join('')}</tbody></table>
            </div>
        </div>
        <div class="at-note">
            هذه الأرقام محفوظة من النظام القديم ولم يُحذف منها شيء، وما زالت تتراكم مع النظام الجديد.
            لكن ما قبل 12 أغسطس 2026 كان يُحسب بالطريقة القديمة (كل تحديث للصفحة = زيارة جديدة)، لذلك
            "الزيارات" هنا أعلى من الواقع، ولا يمكن تفصيلها يومًا بيوم لأن النظام القديم لم يكن يسجّل التواريخ أصلًا.
            التفصيل اليومي والمقارنات تبدأ من 12 أغسطس 2026 فصاعدًا.
        </div>`);
}

/* ══ Data loading ═══════════════════════════════════════════════════════════
   One range-scoped read per scope instead of a permanent whole-node listener. */
/* The database no longer serves analytics to anonymous HTTP callers, so the
   dashboard signs in first. This is not the PIN — it stops the numbers being
   readable by anyone who simply knows the database URL. Someone who reads this
   file could still sign in the same way; it raises the floor, it is not a wall.
   Resolves immediately once a session exists, so refreshes do not re-auth. */
let authReady = null;
function ensureAuth() {
    if (authReady) return authReady;
    authReady = new Promise(resolve => {
        firebase.auth().onAuthStateChanged(user => { if (user) resolve(user); });
        firebase.auth().signInAnonymously().catch(err => {
            console.error('[MDWNH] sign-in failed:', err && err.code);
            const n = el('narrative');
            if (n) n.innerHTML = `<div class="nar-empty">تعذّر تسجيل الدخول إلى قاعدة البيانات
                (${err && err.code || 'خطأ'}). تأكد من تفعيل "Anonymous" في إعدادات Firebase Authentication.</div>`;
            setLoading(false);
        });
    });
    return authReady;
}

function loadRange(from, to) {
    setLoading(true);
    return ensureAuth().then(() => Promise.all(DATA_SCOPES.map(id =>
        db.ref('stats/v3/' + id + '/daily')
          .orderByKey().startAt(from).endAt(to).once('value')
          .then(snap => { state.raw[id] = Object.assign(state.raw[id] || {}, snap.val() || {}); })
          .catch(err => { console.warn('[MDWNH] load failed for', id, err && err.message); })
    ))).then(() => { state.loaded = true; setLoading(false); });
}

function setLoading(on) {
    const b = el('refresh-btn');
    if (b) b.classList.toggle('loading', !!on);
    document.body.classList.toggle('is-loading', !!on);
}

/* ══ Main render ════════════════════════════════════════════════════════════ */
function render() {
    const period = resolvePeriod();
    const cur = aggregate(period.cur.from, period.cur.to);
    const prev = aggregate(period.prev.from, period.prev.to);
    const c = derive(cur), p = derive(prev);
    const meta = SCOPES.find(s => s.id === state.scope) || SCOPES[0];

    el('period-label').textContent =
        `${period.label} (${fmtDate(period.cur.from)} – ${fmtDate(period.cur.to)})`;
    el('period-prev-label').textContent =
        `مقارنةً بـ ${period.prevLabel} (${fmtDate(period.prev.from)} – ${fmtDate(period.prev.to)})`;
    el('scope-title').textContent = `${meta.emoji} ${meta.name}`;
    el('scope-title').style.color = meta.color;

    renderKPIs(c, p);
    renderNarrative(analyseChange(cur, prev, period.cur, period.prev), period);
    renderTrend(period, el('trend-metric').value);
    renderScopeCompare(period);
    renderDonut(cur);
    renderTable('tbl-sources',   'sources',   cur, prev, { head: 'المصدر',   color: '#2dd4bf' });
    renderTable('tbl-countries', 'countries', cur, prev, { head: 'الدولة',   color: '#fbbf24' });
    renderTable('tbl-os',        'os',        cur, prev, { head: 'النظام',   color: meta.color });
    renderTable('tbl-browsers',  'browsers',  cur, prev, { head: 'المتصفح',  color: '#3b82f6' });
    renderTable('tbl-referrers', 'referrers', cur, prev, { head: 'نوع المصدر', color: '#a78bfa' });
    renderTable('tbl-screens',   'screens',   cur, prev, { head: 'حجم الشاشة', color: '#fb923c' });
    renderTable('tbl-langs',     'langs',     cur, prev, { head: 'اللغة',    color: '#2dd4bf' });
    // 'none' is every visit that carried no utm_campaign — noise in this card.
    renderTable('tbl-campaigns', 'campaigns', cur, prev, { head: 'الحملة',   color: '#f472b6', exclude: ['none'] });
    renderTable('tbl-events',    'events',    cur, prev, { head: 'الحدث',    color: '#fbbf24', limit: 20 });
    renderHeatmap(period);
    renderFunnel(cur, prev);
    renderVisitorMix(period);
    renderDailyTable(period);
    renderAllTime();

    syncPillIndicator();   // widths can shift as content lands; keep it honest
    positionTips();        // KPI cards were just rebuilt; re-measure the popovers

    const now = new Date().toLocaleTimeString('ar-EG', { timeZone: TZ, hour12: true });
    el('last-updated').textContent = 'آخر تحديث: ' + now + ' (الرياض)';
    el('footer-time').textContent = 'آخر تحديث: ' + now + ' بتوقيت الرياض';
}

/* Refresh = re-read the widest range the current view needs, then re-render. */
function refresh() {
    const period = resolvePeriod();
    return loadRange(period.prev.from, period.cur.to).then(render);
}

/* ══ CSV export ═════════════════════════════════════════════════════════════ */
function exportCSV() {
    const period = resolvePeriod();
    const scopes = state.scope === 'all' ? DATA_SCOPES : [state.scope];
    const days = rangeDays(period.prev.from, period.cur.to);
    const head = ['date', 'scope', 'period', ...LEAF_METRICS,
                  'engagementRate', 'bounceRate', 'avgSeconds', 'avgScroll', 'engagementScore'];
    const lines = [head.join(',')];

    days.forEach(d => {
        const inCur = d2t(d) >= d2t(period.cur.from) && d2t(d) <= d2t(period.cur.to);
        const inPrev = d2t(d) >= d2t(period.prev.from) && d2t(d) <= d2t(period.prev.to);
        scopes.forEach(s => {
            const day = (state.raw[s] || {})[d];
            if (!day) return;
            const a = mergeDay(emptyAgg(), day), m = derive(a);
            lines.push([
                d, s, inCur ? 'current' : (inPrev ? 'previous' : 'other'),
                ...LEAF_METRICS.map(k => a[k] || 0),
                m.engagementRate.toFixed(2), m.bounceRate.toFixed(2),
                m.avgSeconds.toFixed(1), m.avgScroll.toFixed(1), m.engagementScore
            ].join(','));
        });
    });

    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mdwnh-analytics-${state.scope}-${period.cur.from}_${period.cur.to}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

/* ══ UI wiring ══════════════════════════════════════════════════════════════ */
function buildScopeNav() {
    const bar = el('scope-nav');
    bar.innerHTML = `<div class="nav-pill-indicator" id="pill-indicator"></div>` +
        SCOPES.map(s => `<button class="nav-pill${s.id === state.scope ? ' active' : ''}" data-scope="${s.id}">${s.emoji} ${s.name}</button>`).join('');

    const indicator = el('pill-indicator');
    function move(btn) {
        indicator.style.left = btn.offsetLeft + 'px';
        indicator.style.width = btn.offsetWidth + 'px';
    }

    /* Re-measure from whatever the active pill currently is. A single early
       requestAnimationFrame was not enough: the Rubik webfont swaps in after
       it runs and changes every pill's width, so the highlight sat a little
       off until the first tap re-measured it — and if the tab is opened in the
       background the frame never fires at all, leaving it at 0. Re-sync on
       every event that can change the measurement instead. */
    syncPillIndicator = function () {
        const a = bar.querySelector('.nav-pill.active');
        if (a && a.offsetWidth) move(a);
    };
    requestAnimationFrame(syncPillIndicator);
    window.addEventListener('load', syncPillIndicator);
    /* Plain timers as the backstop. requestAnimationFrame, ResizeObserver and
       load are all tied to the rendering lifecycle, so a tab opened in the
       background can miss every one of them and leave the highlight stranded.
       setTimeout fires either way, and re-measuring is a couple of reads. */
    [0, 300, 1200, 3000].forEach(ms => setTimeout(syncPillIndicator, ms));
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => setTimeout(syncPillIndicator, 50));
    }
    if (window.ResizeObserver) {
        new ResizeObserver(syncPillIndicator).observe(bar);
    }
    bar.addEventListener('scroll', syncPillIndicator, { passive: true });
    bar.querySelectorAll('.nav-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            bar.querySelectorAll('.nav-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            move(pill);
            pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            state.scope = pill.dataset.scope;
            render();                     // data is already in memory — instant
        });
    });
    window.addEventListener('resize', syncPillIndicator);
    window.addEventListener('orientationchange', () => setTimeout(syncPillIndicator, 150));
}

function initControls() {
    el('period-select').addEventListener('change', e => {
        state.preset = e.target.value;
        el('custom-range').style.display = state.preset === 'custom' ? '' : 'none';
        refresh();
    });
    el('fair-toggle').addEventListener('change', e => { state.fair = e.target.checked; render(); });
    el('trend-metric').addEventListener('change', () => render());
    el('refresh-btn').addEventListener('click', () => refresh());
    el('export-btn').addEventListener('click', exportCSV);

    const today = todayRiyadh();
    el('date-from').max = today; el('date-to').max = today;
    el('date-from').value = addDays(today, -6); el('date-to').value = today;
    el('apply-custom').addEventListener('click', () => {
        state.customFrom = el('date-from').value;
        state.customTo = el('date-to').value;
        if (!state.customFrom || !state.customTo) return;
        if (d2t(state.customFrom) > d2t(state.customTo)) {
            const t = state.customFrom; state.customFrom = state.customTo; state.customTo = t;
            el('date-from').value = state.customFrom; el('date-to').value = state.customTo;
        }
        refresh();
    });

    // Collapsible cards keep the page light on mobile.
    document.querySelectorAll('[data-collapse]').forEach(h => {
        h.addEventListener('click', () => h.parentElement.classList.toggle('collapsed'));
    });

    /* Metric explanations. Hover covers the desktop case in CSS; this makes
       them openable by tap, which is the only way to read them on a phone. */
    /* Keep every explanation box inside the screen. Each one is centred on its
       card, which pushed the boxes on the outer columns past the screen edge
       where they were cut off. This measures where the box would land and
       hands the CSS a correction, so it slides back into view instead. */
    positionTips = function () {
        const vw = document.documentElement.clientWidth;
        const M = 10;                                   // breathing room at the edges
        document.querySelectorAll('.kpi-label .info').forEach(badge => {
            const card = badge.closest('.kpi-card');
            if (!card) return;
            const r = card.getBoundingClientRect();
            const centre = r.left + r.width / 2;
            const w = Math.min(265, vw - 2 * M);
            const wanted = centre - w / 2;
            const clamped = Math.max(M, Math.min(wanted, vw - M - w));
            badge.style.setProperty('--tip-w', w + 'px');
            badge.style.setProperty('--tip-shift', Math.round(clamped - wanted) + 'px');
        });
    };
    window.addEventListener('resize', positionTips);

    function closeTips(except) {
        document.querySelectorAll('.kpi-label .info.open').forEach(b => {
            if (b === except) return;
            b.classList.remove('open');
            const card = b.closest('.kpi-card');
            if (card) card.classList.remove('tip-open');
        });
    }
    /* A tap can deliver more than one click (the touch event plus the browser's
       synthetic one). Without this guard the second toggled the box straight
       back off, so it appeared and vanished. Repeats on the same badge inside
       350ms are treated as one press. */
    let lastBadge = null, lastAt = 0;
    document.addEventListener('click', e => {
        const badge = e.target.closest && e.target.closest('.kpi-label .info');
        if (badge && badge === lastBadge && Date.now() - lastAt < 350) return;
        closeTips(badge);
        if (!badge) return;
        lastBadge = badge; lastAt = Date.now();
        positionTips();                       // measure before it becomes visible
        const open = badge.classList.toggle('open');
        const card = badge.closest('.kpi-card');
        if (card) card.classList.toggle('tip-open', open);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeTips(null); });
}

/* ── PIN gate ─────────────────────────────────────────────────────────────── */
document.querySelectorAll('.pin-digit').forEach((elx, i, all) => {
    elx.addEventListener('input', () => {
        elx.value = elx.value.replace(/\D/g, '').slice(-1);
        if (elx.value && i < all.length - 1) all[i + 1].focus();
        if (i === all.length - 1 && elx.value) checkPassword();
    });
    elx.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !elx.value && i > 0) all[i - 1].focus();
    });
});
document.querySelector('.login-card').addEventListener('click', () => el('d1').focus());
el('d1').focus();

function checkPassword() {
    const entered = ['d1', 'd2', 'd3', 'd4'].map(id => el(id).value).join('');
    if (entered === PASSWORD) {
        el('login-screen').style.display = 'none';
        el('dashboard').style.display = 'block';
        try { sessionStorage.setItem('mdwnh.dash', '1'); } catch (e) {}
        initDashboard();
    } else {
        const err = el('login-error');
        err.textContent = 'رمز خاطئ. حاول مرة أخرى.';
        ['d1', 'd2', 'd3', 'd4'].forEach(id => el(id).value = '');
        el('d1').focus();
        setTimeout(() => err.textContent = '', 2500);
    }
}
function logout() {
    try { sessionStorage.removeItem('mdwnh.dash'); } catch (e) {}
    el('dashboard').style.display = 'none';
    el('login-screen').style.display = 'flex';
    ['d1', 'd2', 'd3', 'd4'].forEach(id => el(id).value = '');
    el('d1').focus();
}
window.logout = logout;
window.checkPassword = checkPassword;

/* ── Boot ─────────────────────────────────────────────────────────────────── */
let booted = false;
function initDashboard() {
    if (booted) return;
    booted = true;

    Chart.defaults.color = 'rgba(245,244,242,0.5)';
    Chart.defaults.borderColor = 'rgba(255,255,255,0.06)';
    Chart.defaults.font.family = "'Rubik', sans-serif";
    Chart.defaults.font.size = 11;
    Chart.defaults.animation.duration = 400;

    buildScopeNav();
    initControls();
    loadLegacy().then(refresh);   // all-time totals load once, then the period data

    // Light auto-refresh. Far cheaper than v2's permanent whole-node listeners.
    setInterval(() => { if (!document.hidden) refresh(); }, 120000);
}

// Skip the PIN if it was already entered in this browser tab.
try {
    if (sessionStorage.getItem('mdwnh.dash') === '1') {
        el('login-screen').style.display = 'none';
        el('dashboard').style.display = 'block';
        initDashboard();
    }
} catch (e) {}
