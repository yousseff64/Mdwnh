/* ══════════════════════════════════════════════════════════════════════════════
   MDWNH Analytics Tracker — v3
   ──────────────────────────────────────────────────────────────────────────────
   Replaces the v2 tracker. What changed and why:

   v2 BUG                                        v3 FIX
   ─────────────────────────────────────────────────────────────────────────────
   getHours()/getDay() used the VISITOR's local   All time bucketing normalised to
   timezone but the chart was labelled            Asia/Riyadh via Intl, matching
   "Saudi time".                                  the dashboard label.

   Country came from two providers that           Always stores the ISO-3166 alpha-2
   disagreed on format ("France" vs "FR"),        code. Cached per visitor for 7 days
   so one country landed in two buckets.          so it is fetched ~once, not per view.

   `entries` incremented on every page load,      Session model (30-min idle window).
   so one person refreshing 10x looked like       Sessions, dimensions and country are
   10 visitors.                                   counted once per session per scope.

   8 separate .transaction() calls per load.      One batched multi-path update() using
                                                  ServerValue.increment — 1 round trip.

   Only lifetime totals were stored, so there     Every metric is also written into a
   was no way to see WHEN a number moved.         daily bucket keyed by Riyadh date.
                                                  That is what powers week-vs-week and
                                                  month-vs-month comparison.

   Nothing measured actual engagement.            Active (visible) dwell time, scroll
                                                  depth milestones, engaged sessions,
                                                  bounces, outbound clicks, custom
                                                  events, and comic reading progress.

   DATA MODEL (Realtime Database)
   ─────────────────────────────────────────────────────────────────────────────
   stats/v3/<scope>/daily/<YYYY-MM-DD>/   <- Riyadh date. Range-queryable by key.
       sessions, pageviews, qualifiedViews, engagedSessions, bounces,
       newVisitors, returningVisitors, activeMs, scrollSum, scrollN,
       devices/*, os/*, browsers/*, referrers/*, sources/*, countries/<ISO2>,
       hours/h0..h23, dow/d0..d6, langs/*, screens/*, campaigns/*,
       depth/d25|d50|d75|d100, events/*
   stats/v3/<scope>/lifetime/            <- same leaf metrics, never bucketed
   <scope>/                              <- LEGACY mirror (comics/x, pages/x) so the
                                            old counters and the on-page view badge
                                            keep working. Do not add new fields here.
   ══════════════════════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    var NS       = 'mdwnh.a3.';
    var TZ       = 'Asia/Riyadh';
    var SESSION_IDLE_MS   = 30 * 60 * 1000;  // 30 min of inactivity ends a session
    var QUALIFIED_MS      = 20 * 1000;       // 20s of ACTIVE time = a real view
    var ENGAGED_MS        = 15 * 1000;       // 15s active OR 50% scroll = engaged
    var HEARTBEAT_MS      = 15 * 1000;       // how often dwell time is flushed
    var COUNTRY_TTL_MS    = 7 * 24 * 60 * 60 * 1000;

    /* ── storage helpers (never throw in private mode) ────────────────────── */
    function ls(k, v) {
        try {
            if (v === undefined) return localStorage.getItem(NS + k);
            localStorage.setItem(NS + k, v);
        } catch (e) { return null; }
    }
    function ss(k, v) {
        try {
            if (v === undefined) return sessionStorage.getItem(NS + k);
            sessionStorage.setItem(NS + k, v);
        } catch (e) { return null; }
    }
    function uid() {
        try {
            if (crypto && crypto.randomUUID) return crypto.randomUUID();
        } catch (e) {}
        return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }

    /* ── Riyadh-normalised date parts ─────────────────────────────────────────
       v2 read the visitor's own clock, so a reader in Jakarta was filed under
       the wrong hour and sometimes the wrong day. Everything below is computed
       in the studio's timezone so the buckets line up with the dashboard.     */
    var _dateFmt, _hourFmt, _dowFmt;
    function riyadh(now) {
        now = now || new Date();
        try {
            if (!_dateFmt) {
                _dateFmt = new Intl.DateTimeFormat('en-CA', {
                    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
                });
                _hourFmt = new Intl.DateTimeFormat('en-GB', {
                    timeZone: TZ, hour: '2-digit', hourCycle: 'h23'
                });
                _dowFmt  = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' });
            }
            var dowMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
            return {
                date: _dateFmt.format(now),                       // YYYY-MM-DD
                hour: parseInt(_hourFmt.format(now), 10) || 0,    // 0-23
                dow:  dowMap[_dowFmt.format(now)] || 0            // 0=Sunday
            };
        } catch (e) {
            // Intl missing (very old browser): fall back to UTC+3 arithmetic.
            var t = new Date(now.getTime() + 3 * 3600 * 1000);
            return {
                date: t.toISOString().slice(0, 10),
                hour: t.getUTCHours(),
                dow:  t.getUTCDay()
            };
        }
    }

    /* ── environment sniffing ─────────────────────────────────────────────── */
    function device() {
        var ua = navigator.userAgent;
        // iPadOS 13+ reports as Macintosh; touch points give it away.
        if (/ipad/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet';
        if (/tablet|playbook|silk|kindle/i.test(ua)) return 'tablet';
        if (/mobile|android|iphone|ipod|blackberry|windows phone|opera mini/i.test(ua)) return 'mobile';
        return 'desktop';
    }
    function os() {
        var ua = navigator.userAgent;
        if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
        if (/android/i.test(ua))          return 'Android';
        if (/windows/i.test(ua))          return 'Windows';
        if (/macintosh|mac os x/i.test(ua)) return 'macOS';
        if (/cros/i.test(ua))             return 'ChromeOS';
        if (/linux/i.test(ua))            return 'Linux';
        return 'Other';
    }
    function browser() {
        var ua = navigator.userAgent;
        if (/edg\//i.test(ua))                                return 'Edge';
        if (/opr\/|opera/i.test(ua))                          return 'Opera';
        if (/samsungbrowser/i.test(ua))                       return 'Samsung';
        if (/fban|fbav|fb_iab/i.test(ua))                     return 'Facebook';   // in-app
        if (/instagram/i.test(ua))                            return 'Instagram';  // in-app
        if (/tiktok|bytedance|musical_ly/i.test(ua))          return 'TikTok';     // in-app
        if (/snapchat/i.test(ua))                             return 'Snapchat';
        if (/chrome|crios/i.test(ua) && !/chromium/i.test(ua)) return 'Chrome';
        if (/firefox|fxios/i.test(ua))                        return 'Firefox';
        if (/safari/i.test(ua))                               return 'Safari';
        return 'Other';
    }
    function screenBucket() {
        var w = window.innerWidth || screen.width || 0;
        if (w < 480)  return 'xs';
        if (w < 768)  return 'sm';
        if (w < 1024) return 'md';
        if (w < 1440) return 'lg';
        return 'xl';
    }
    function lang() {
        return ((navigator.language || 'other').split('-')[0] || 'other').toLowerCase();
    }
    function isBot() {
        if (navigator.webdriver) return true;
        return /bot|crawl|spider|slurp|bingpreview|headless|lighthouse|pagespeed|gtmetrix|preview|facebookexternalhit|whatsapp|telegrambot|embedly|quora link|pinterest|vkshare|monitor|uptime/i
            .test(navigator.userAgent);
    }

    /* ── traffic source ───────────────────────────────────────────────────────
       Two levels: `referrers` is the coarse bucket the old dashboard used
       (direct / social / search / internal / other) and `sources` is the
       granular name marketing actually needs (instagram, tiktok, youtube…).
       UTM parameters always win over the referrer header.                     */
    var SOURCE_MAP = [
        ['instagram',  'social',  /instagram|ig\.me|l\.instagram/],
        ['tiktok',     'social',  /tiktok|bytedance|musical_ly/],
        ['youtube',    'social',  /youtube|youtu\.be/],
        ['facebook',   'social',  /facebook|fb\.com|fb\.me|l\.facebook/],
        ['x',          'social',  /twitter\.com|\/\/x\.com|t\.co/],
        ['whatsapp',   'social',  /whatsapp|wa\.me|chat\.whatsapp/],
        ['telegram',   'social',  /telegram|t\.me/],
        ['snapchat',   'social',  /snapchat/],
        ['linkedin',   'social',  /linkedin|lnkd\.in/],
        ['discord',    'social',  /discord/],
        ['reddit',     'social',  /reddit/],
        ['pinterest',  'social',  /pinterest/],
        ['threads',    'social',  /threads\.net/],
        ['google',     'search',  /google\./],
        ['bing',       'search',  /bing\./],
        ['yandex',     'search',  /yandex\./],
        ['duckduckgo', 'search',  /duckduckgo/],
        ['yahoo',      'search',  /yahoo\./],
        ['baidu',      'search',  /baidu\./]
    ];
    function trafficSource() {
        var qs  = new URLSearchParams(location.search);
        var utm = qs.get('utm_source') || qs.get('source') || qs.get('ref');
        var ref = (document.referrer || '').toLowerCase();

        if (utm) {
            var u = key(utm);
            var known = null;
            for (var i = 0; i < SOURCE_MAP.length; i++) {
                if (SOURCE_MAP[i][2].test(u)) { known = SOURCE_MAP[i]; break; }
            }
            return {
                source:   known ? known[0] : u,
                type:     known ? known[1] : 'campaign',
                campaign: key(qs.get('utm_campaign') || qs.get('utm_medium') || 'none')
            };
        }
        if (!ref) return { source: 'direct', type: 'direct', campaign: 'none' };

        var host = '';
        try { host = new URL(document.referrer).hostname.toLowerCase(); } catch (e) { host = ref; }
        if (host === location.hostname || /localhost|127\.0\.0\.1/.test(host)) {
            return { source: 'internal', type: 'internal', campaign: 'none' };
        }
        for (var j = 0; j < SOURCE_MAP.length; j++) {
            if (SOURCE_MAP[j][2].test(host)) {
                return { source: SOURCE_MAP[j][0], type: SOURCE_MAP[j][1], campaign: 'none' };
            }
        }
        return { source: key(host.replace(/^www\./, '')), type: 'other', campaign: 'none' };
    }

    /* Firebase keys cannot contain . # $ / [ ] */
    function key(s) {
        return String(s == null ? 'other' : s)
            .replace(/[.#$/[\]]/g, '_')
            .replace(/\s+/g, '_')
            .toLowerCase()
            .slice(0, 60) || 'other';
    }

    /* ── country: ISO-2 only, cached per visitor ──────────────────────────────
       v2 called two IP APIs on EVERY page load and stored whatever shape each
       returned. That was slow, hit rate limits, and split one country across
       two buckets. Now: resolved at most once a week per visitor, always a
       2-letter code, and the dashboard turns the code into a name and flag.  */
    function fetchTimeout(url, ms) {
        var ctl = new AbortController();
        var t = setTimeout(function () { ctl.abort(); }, ms);
        return fetch(url, { signal: ctl.signal, mode: 'cors' })
            .then(function (r) { return r.json(); })
            .finally(function () { clearTimeout(t); });
    }
    function iso2(v) {
        v = String(v || '').trim().toUpperCase();
        return /^[A-Z]{2}$/.test(v) ? v : '';
    }
    function resolveCountry() {
        var cached = ls('country');
        var at     = parseInt(ls('countryAt') || '0', 10);
        if (cached && iso2(cached) && Date.now() - at < COUNTRY_TTL_MS) {
            return Promise.resolve(cached);
        }
        return fetchTimeout('https://ipwho.is/?fields=country_code,success', 5000)
            .then(function (d) {
                var c = iso2(d && d.country_code);
                if (c) return c;
                throw new Error('no code');
            })
            .catch(function () {
                return fetchTimeout('https://ipinfo.io/json', 5000)
                    .then(function (d) { return iso2(d && d.country); });
            })
            .then(function (c) {
                if (!c) return 'ZZ';                       // ZZ = unknown, a real ISO code
                ls('country', c); ls('countryAt', String(Date.now()));
                return c;
            })
            .catch(function () { return 'ZZ'; });
    }

    /* ── batched writer ───────────────────────────────────────────────────────
       Collects every counter into one object and sends a single update().
       v2 fired 8 independent transactions per page load.                     */
    function Writer(db, scope, legacyPath) {
        this.db = db;
        this.base = 'stats/v3/' + scope;
        this.legacy = legacyPath;
        this.buf = {};
        this.timer = null;
        this.hasIncrement = false;
        try {
            this.hasIncrement = typeof firebase.database.ServerValue.increment === 'function';
        } catch (e) {}
    }
    Writer.prototype.inc = function (leaf, n, date) {
        n = n === undefined ? 1 : n;
        if (!n) return this;
        this.buf[this.base + '/daily/' + date + '/' + leaf] =
            (this.buf[this.base + '/daily/' + date + '/' + leaf] || 0) + n;
        this.buf[this.base + '/lifetime/' + leaf] =
            (this.buf[this.base + '/lifetime/' + leaf] || 0) + n;
        return this;
    };
    /* Legacy mirror so the old flat counters and the on-page view badge survive. */
    Writer.prototype.legacyInc = function (leaf, n) {
        if (!this.legacy) return this;
        var p = this.legacy + '/' + leaf;
        this.buf[p] = (this.buf[p] || 0) + (n === undefined ? 1 : n);
        return this;
    };
    Writer.prototype.flush = function () {
        var paths = Object.keys(this.buf);
        if (!paths.length) return Promise.resolve();
        var buf = this.buf;
        this.buf = {};

        if (this.hasIncrement) {
            var updates = {};
            for (var i = 0; i < paths.length; i++) {
                updates[paths[i]] = firebase.database.ServerValue.increment(buf[paths[i]]);
            }
            return this.db.ref().update(updates).catch(function (e) {
                console.warn('[MDWNH] write failed:', e && e.message);
            });
        }
        // Fallback for ancient SDKs.
        var self = this;
        return Promise.all(paths.map(function (p) {
            return self.db.ref(p).transaction(function (v) { return (v || 0) + buf[p]; });
        })).catch(function () {});
    };
    Writer.prototype.schedule = function (ms) {
        var self = this;
        if (this.timer) return;
        this.timer = setTimeout(function () {
            self.timer = null;
            self.flush();
        }, ms === undefined ? 400 : ms);
    };

    /* ══ main ═══════════════════════════════════════════════════════════════ */
    var started = false;

    function init(opts) {
        if (started) return API;
        opts = opts || {};

        var db = opts.db;
        if (!db && typeof firebase !== 'undefined') {
            try { db = firebase.database(); } catch (e) {}
        }
        if (!db) { console.warn('[MDWNH] no Firebase database instance'); return API; }
        if (isBot()) { return API; }
        if (/\/analytics\/?$/.test(location.pathname)) { return API; } // never track the dashboard

        var legacyPath = opts.path;                      // e.g. "comics/hujra"
        var scope      = legacyPath.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
        started = true;

        var w  = new Writer(db, scope, legacyPath);
        var rd = riyadh();
        var day = rd.date;

        /* ── visitor + session identity ───────────────────────────────────── */
        var vid = ls('vid');
        var isNewVisitor = false;
        if (!vid) { vid = uid(); ls('vid', vid); isNewVisitor = true; }

        var lastSeen = parseInt(ls('lastSeen') || '0', 10);
        var sid = ss('sid');
        if (!sid || Date.now() - lastSeen > SESSION_IDLE_MS) {
            sid = uid();
            ss('sid', sid);
            ss('scopes', '');                            // new session -> re-count dimensions
        }
        ls('lastSeen', String(Date.now()));

        // Has this session already been counted for THIS scope?
        var seen = (ss('scopes') || '').split(',');
        var firstHere = seen.indexOf(scope) === -1;
        if (firstHere) { seen.push(scope); ss('scopes', seen.filter(Boolean).join(',')); }

        var src = trafficSource();

        /* ── pageview: every load ─────────────────────────────────────────── */
        w.inc('pageviews', 1, day);

        /* ── session + all dimensions: once per session per scope ─────────── */
        if (firstHere) {
            w.inc('sessions', 1, day)
             .inc('devices/'   + key(device()),   1, day)
             .inc('os/'        + key(os()),       1, day)
             .inc('browsers/'  + key(browser()),  1, day)
             .inc('referrers/' + key(src.type),   1, day)
             .inc('sources/'   + key(src.source), 1, day)
             .inc('campaigns/' + key(src.campaign), 1, day)
             .inc('hours/h'    + rd.hour,         1, day)
             .inc('dow/d'      + rd.dow,          1, day)
             .inc('langs/'     + key(lang()),     1, day)
             .inc('screens/'   + screenBucket(),  1, day)
             .inc(isNewVisitor ? 'newVisitors' : 'returningVisitors', 1, day);

            // Legacy mirror — same shape v2 wrote, so nothing downstream breaks.
            w.legacyInc('entries')
             .legacyInc('devices/'   + key(device()))
             .legacyInc('os/'        + key(os()))
             .legacyInc('browsers/'  + key(browser()))
             .legacyInc('referrers/' + key(src.type))
             .legacyInc('hours/h'    + rd.hour)
             .legacyInc('days/'      + ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][rd.dow]);

            resolveCountry().then(function (c) {
                w.inc('countries/' + c, 1, day);
                w.schedule(0);
            });
        }
        w.schedule(300);

        /* ── active-time accounting ───────────────────────────────────────────
           Only counts while the tab is actually visible. v2's 20-second timer
           fired even for a tab opened in the background and never looked at.  */
        var activeMs      = 0;
        var lastTick      = Date.now();
        var pendingMs     = 0;
        var qualified     = false;
        var engaged       = false;
        var interacted    = false;
        var maxScroll     = 0;
        var depthSent     = {};
        var scrollLogged  = false;

        function visible() {
            return document.visibilityState === 'visible';
        }
        function accrue() {
            var now = Date.now();
            if (visible()) {
                var d = now - lastTick;
                if (d > 0 && d < 60000) { activeMs += d; pendingMs += d; }
            }
            lastTick = now;
        }

        function markQualified() {
            if (qualified || !firstHere) return;
            qualified = true;
            w.inc('qualifiedViews', 1, day).legacyInc('views');
            w.schedule(0);
        }
        function markEngaged() {
            if (engaged || !firstHere) return;
            engaged = true;
            w.inc('engagedSessions', 1, day);
            w.schedule(500);
        }

        function tick() {
            accrue();
            if (activeMs >= QUALIFIED_MS) markQualified();
            if (activeMs >= ENGAGED_MS || maxScroll >= 50 || interacted) markEngaged();
            if (pendingMs >= 1000) {
                w.inc('activeMs', Math.round(pendingMs), day);
                pendingMs = 0;
                w.schedule(0);
            }
        }
        var hb = setInterval(tick, HEARTBEAT_MS);

        document.addEventListener('visibilitychange', function () {
            accrue();
            if (!visible()) { tick(); }      // flush before the tab goes away
            else { lastTick = Date.now(); }
        });

        /* ── scroll depth ─────────────────────────────────────────────────── */
        function scrollPct() {
            var doc = document.documentElement;
            var h = Math.max(doc.scrollHeight, document.body ? document.body.scrollHeight : 0);
            var vh = window.innerHeight || doc.clientHeight;
            if (h <= vh) return 100;                       // page fits: fully seen
            var y = window.scrollY || doc.scrollTop || 0;
            return Math.min(100, Math.round(((y + vh) / h) * 100));
        }
        var scrollRaf = false;
        function onScroll() {
            if (scrollRaf) return;
            scrollRaf = true;
            requestAnimationFrame(function () {
                scrollRaf = false;
                var p = scrollPct();
                if (p > maxScroll) maxScroll = p;
                [25, 50, 75, 100].forEach(function (m) {
                    if (maxScroll >= m && !depthSent[m]) {
                        depthSent[m] = true;
                        w.inc('depth/d' + m, 1, day);
                        w.schedule(1000);
                    }
                });
                if (maxScroll >= 50) markEngaged();
            });
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        // Some comic pages scroll an inner container, not the window.
        if (opts.scrollContainer) {
            var sc = typeof opts.scrollContainer === 'string'
                ? document.querySelector(opts.scrollContainer) : opts.scrollContainer;
            if (sc) {
                sc.addEventListener('scroll', function () {
                    var p = Math.min(100, Math.round(
                        ((sc.scrollTop + sc.clientHeight) / Math.max(sc.scrollHeight, 1)) * 100));
                    if (p > maxScroll) maxScroll = p;
                    [25, 50, 75, 100].forEach(function (m) {
                        if (maxScroll >= m && !depthSent[m]) {
                            depthSent[m] = true;
                            w.inc('depth/d' + m, 1, day);
                            w.schedule(1000);
                        }
                    });
                    if (maxScroll >= 50) markEngaged();
                }, { passive: true });
            }
        }

        /* ── interaction + outbound clicks ────────────────────────────────── */
        ['click', 'keydown', 'touchstart'].forEach(function (evt) {
            window.addEventListener(evt, function () {
                interacted = true;
                markEngaged();
            }, { passive: true, once: true });
        });

        document.addEventListener('click', function (e) {
            var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
            if (!a) return;
            var href = a.getAttribute('href') || '';
            var label = a.dataset.track || a.getAttribute('aria-label') ||
                        (a.textContent || '').trim().slice(0, 40);
            if (/^mailto:/i.test(href))      return API.event('click_email');
            if (/^tel:/i.test(href))         return API.event('click_phone');
            var host = '';
            try { host = new URL(href, location.href).hostname; } catch (err) { return; }
            if (host && host !== location.hostname) {
                API.event('outbound_' + key(host.replace(/^www\./, '')));
            } else if (label) {
                API.event('nav_' + key(label));
            }
        }, true);

        /* ── final flush ──────────────────────────────────────────────────────
           pagehide fires reliably on mobile Safari where unload does not.     */
        function finalFlush() {
            accrue();
            if (pendingMs >= 1000) { w.inc('activeMs', Math.round(pendingMs), day); pendingMs = 0; }
            if (firstHere && !scrollLogged) {
                scrollLogged = true;
                w.inc('scrollSum', maxScroll, day).inc('scrollN', 1, day);
                // A bounce is a session that never became engaged.
                if (!engaged) w.inc('bounces', 1, day);
            }
            w.flush();
            clearInterval(hb);
        }
        window.addEventListener('pagehide', finalFlush);
        window.addEventListener('beforeunload', finalFlush);

        /* ── public handles ───────────────────────────────────────────────── */
        API._w = w; API._day = day; API._scope = scope;
        API.ready = true;

        console.log('[MDWNH v3] tracking', legacyPath, '| session', firstHere ? 'new' : 'continued',
                    '| Riyadh', day, rd.hour + ':00');
        return API;
    }

    /* ── public API ───────────────────────────────────────────────────────── */
    var API = {
        ready: false,

        init: init,

        /* Custom event. Counted once per session per name so a fidgety reader
           clicking the same button ten times does not distort the report. */
        event: function (name, n) {
            if (!API.ready || !API._w) return;
            var k = key(name);
            var seen = (ss('ev') || '').split(',');
            var tag = API._scope + ':' + k;
            if (seen.indexOf(tag) !== -1) return;
            seen.push(tag); ss('ev', seen.filter(Boolean).join(','));
            API._w.inc('events/' + k, n || 1, API._day);
            API._w.schedule(1500);
        },

        /* Comic reading progress. Called by the viewer on page turns; records
           the furthest milestone reached so we can see where readers drop off. */
        progress: function (current, total) {
            if (!API.ready || !API._w || !total) return;
            var pct = Math.min(100, Math.round((current / total) * 100));
            [25, 50, 75, 100].forEach(function (m) {
                if (pct >= m) API.event('read_' + m);
            });
            if (pct >= 90) API.event('completed');
        }
    };

    window.MdwnhAnalytics = API;

    /* Backwards-compatible shim for the v2 call signature:
         mdwnhTrack(db, 'pages/main', 'entry')  -> starts v3 tracking
         mdwnhTrack(db, 'pages/main', 'view')   -> no-op; v3 decides this itself
                                                   from real active time.       */
    window.mdwnhTrack = function (db, path, mode) {
        if (mode === 'view') return;
        return init({ db: db, path: path });
    };
})();
