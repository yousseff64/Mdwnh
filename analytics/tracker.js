// ── MDWNH Analytics Tracker ──────────────────────────────────────────────────
// Collects device, OS, browser, referrer, country, time-of-day data
// and writes enriched events to Firebase under the given path.

(function() {
    'use strict';

    function getDevice() {
        const ua = navigator.userAgent;
        if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
        if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) return 'mobile';
        return 'desktop';
    }

    function getOS() {
        const ua = navigator.userAgent;
        if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
        if (/android/i.test(ua)) return 'Android';
        if (/windows/i.test(ua)) return 'Windows';
        if (/macintosh|mac os x/i.test(ua)) return 'macOS';
        if (/linux/i.test(ua)) return 'Linux';
        return 'Other';
    }

    function getBrowser() {
        const ua = navigator.userAgent;
        if (/edg\//i.test(ua)) return 'Edge';
        if (/opr\//i.test(ua) || /opera/i.test(ua)) return 'Opera';
        if (/chrome/i.test(ua) && !/chromium/i.test(ua)) return 'Chrome';
        if (/firefox/i.test(ua)) return 'Firefox';
        if (/safari/i.test(ua)) return 'Safari';
        return 'Other';
    }

    function getReferrerType() {
        const ref = (document.referrer || '').toLowerCase();
        if (!ref) return 'direct';
        if (ref.includes(location.hostname) || ref.includes('localhost')) return 'internal';
        const social = ['instagram','twitter','x.com','tiktok','youtube','facebook','t.co','wa.me','discord','telegram','snapchat','linkedin'];
        if (social.some(s => ref.includes(s))) return 'social';
        const search = ['google','bing','yahoo','duckduckgo','yandex','baidu'];
        if (search.some(s => ref.includes(s))) return 'search';
        return 'other';
    }

    function getHour() { return new Date().getHours(); }
    function getDayOfWeek() { return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date().getDay()]; }

    function fetchWithTimeout(url, ms) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ms);
        return fetch(url, { signal: controller.signal })
            .finally(() => clearTimeout(timer));
    }

    async function getCountry() {
        // 1st try: ipwho.is  (10k/day, great mobile coverage)
        try {
            const r = await fetchWithTimeout('https://ipwho.is/', 6000);
            const d = await r.json();
            if (d && d.success && d.country) return d.country;
        } catch (e) { /* fall through */ }

        // 2nd try: ipinfo.io (50k/month, very reliable)
        try {
            const r = await fetchWithTimeout('https://ipinfo.io/json', 6000);
            const d = await r.json();
            const code = (d && d.country || '').toUpperCase();
            if (code) {
                const MAP = {
                    SA:'Saudi Arabia', AE:'United Arab Emirates', EG:'Egypt',
                    KW:'Kuwait', QA:'Qatar', BH:'Bahrain', OM:'Oman',
                    JO:'Jordan', MA:'Morocco', DZ:'Algeria', TN:'Tunisia',
                    IQ:'Iraq', YE:'Yemen', LB:'Lebanon', SY:'Syria',
                    US:'United States', GB:'United Kingdom', DE:'Germany',
                    FR:'France', TR:'Turkey', IN:'India', PK:'Pakistan',
                    CA:'Canada', AU:'Australia', NL:'Netherlands', SE:'Sweden'
                };
                return MAP[code] || code;
            }
        } catch (e) { /* fall through */ }

        return 'Unknown';
    }

    function fKey(str) {
        return (str || 'other').replace(/[.#$/\[\]\s]/g, '_').toLowerCase();
    }

    // ── Main track function ───────────────────────────────────────────────────
    // mode: 'entry' | 'view'
    // On 'entry': ALWAYS writes device/OS/browser/time/country.
    //             Only increments entries counter for non-internal traffic.
    // On 'view':  Only increments views counter.
    window.mdwnhTrack = async function(db, path, mode) {
        if (!db) return;

        if (mode === 'entry') {
            const device   = getDevice();
            const os       = getOS();
            const browser  = getBrowser();
            const refType  = getReferrerType();
            const hour     = getHour();
            const dow      = getDayOfWeek();
            const country  = await getCountry();          // plain string now
            const cKey     = fKey(country || 'unknown');

            // ── Always track these (all visitors, internal or external) ──────
            db.ref(`${path}/devices/${device}`).transaction(v => (v || 0) + 1);
            db.ref(`${path}/os/${fKey(os)}`).transaction(v => (v || 0) + 1);
            db.ref(`${path}/browsers/${fKey(browser)}`).transaction(v => (v || 0) + 1);
            db.ref(`${path}/hours/h${hour}`).transaction(v => (v || 0) + 1);
            db.ref(`${path}/days/${dow}`).transaction(v => (v || 0) + 1);
            db.ref(`${path}/countries/${cKey}`).transaction(v => (v || 0) + 1);

            // ── Only count "entries" for external traffic ────────────────────
            if (refType !== 'internal') {
                db.ref(`${path}/entries`).transaction(v => (v || 0) + 1);
                db.ref(`${path}/referrers/${refType}`).transaction(v => (v || 0) + 1);
            }
        }

        if (mode === 'view') {
            db.ref(`${path}/views`).transaction(v => (v || 0) + 1);
        }
    };
})();
