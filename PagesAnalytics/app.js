/* ═══════════════════════════════════════════════════════════════════════════
   المدونة ستوديو — مركز الاستراتيجية · منطق التطبيق
   دخول (رمز 1445) · تنقّل · عدّادات · حركات · رسوم Chart.js
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';

const PASSWORD = '1445';
const AUTH_KEY = 'mdwn_pa_auth';

/* ── أدوات تنسيق الأرقام (أرقام عربية) ──────────────────────────────────── */
const ar = n => Number(n).toLocaleString('ar-EG');
function fmtShort(n) {
  if (n >= 1e6) return (n / 1e6).toLocaleString('ar-EG', { maximumFractionDigits: 1 }) + ' مليون';
  if (n >= 1e3) return (n / 1e3).toLocaleString('ar-EG', { maximumFractionDigits: 1 }) + ' ألف';
  return ar(n);
}

/* ── الدخول ─────────────────────────────────────────────────────────────── */
const pinInputs = [...document.querySelectorAll('.pin input')];
const loginErr = document.getElementById('login-err');

pinInputs.forEach((el, i) => {
  el.addEventListener('input', () => {
    el.value = el.value.replace(/\D/g, '').slice(-1);
    if (el.value && i < pinInputs.length - 1) pinInputs[i + 1].focus();
    if (i === pinInputs.length - 1 && el.value) tryLogin();
  });
  el.addEventListener('keydown', e => {
    if (e.key === 'Backspace' && !el.value && i > 0) pinInputs[i - 1].focus();
  });
});
document.getElementById('pin-form').addEventListener('submit', e => { e.preventDefault(); tryLogin(); });

function tryLogin() {
  const code = pinInputs.map(i => i.value).join('');
  if (code === PASSWORD) {
    try { sessionStorage.setItem(AUTH_KEY, '1'); } catch (e) {}
    enterApp();
  } else {
    loginErr.textContent = 'رمز غير صحيح، حاول مجددًا.';
    document.querySelector('.login-card').classList.add('shake');
    setTimeout(() => document.querySelector('.login-card').classList.remove('shake'), 450);
    pinInputs.forEach(i => i.value = '');
    pinInputs[0].focus();
    setTimeout(() => loginErr.textContent = '', 2600);
  }
}

function enterApp() {
  document.getElementById('login').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  // تهيئة متزامنة — لا نعتمد على requestAnimationFrame في الإقلاع
  safe(build);
  safe(revealAll);
  safe(initNav);
  safe(initCharts);
}

/* غلاف آمن: خطأ في خطوة لا يوقف بقية التهيئة */
function safe(fn) { try { fn(); } catch (e) { console.error('[PagesAnalytics]', fn.name, e); } }

document.getElementById('logout').addEventListener('click', () => {
  try { sessionStorage.removeItem(AUTH_KEY); } catch (e) {}
  location.reload();
});

/* جلسة محفوظة */
window.addEventListener('DOMContentLoaded', () => {
  let authed = false;
  try { authed = sessionStorage.getItem(AUTH_KEY) === '1'; } catch (e) {}
  if (authed) enterApp(); else pinInputs[0].focus();
});

/* ── بناء المحتوى الديناميكي من DATA ────────────────────────────────────── */
function build() {
  const P = DATA.platforms, A = DATA.aggregate;

  /* إحصاءات البطل */
  el('hero-stats').innerHTML = [
    { v: A.totalAudience, l: 'إجمالي الجمهور', s: true },
    { v: DATA.platforms.youtube.totalViews, l: 'مشاهدات يوتيوب', s: true },
    { v: A.totalContent, l: 'قطعة محتوى' },
    { v: A.yearsActive, l: 'سنوات من العطاء' }
  ].map((x, i) => `<div class="hero-stat reveal d${i + 1}"><div class="v" data-count="${x.v}" data-fmt="${x.s ? 'short' : 'full'}">٠</div><div class="l">${x.l}</div></div>`).join('');

  /* بطاقات المنصّات */
  el('platforms').innerHTML = [
    platCard(P.instagram, [
      ['متابع', P.instagram.followers], ['منشور', P.instagram.posts], ['أعلى ريل', P.instagram.bestReelViews]
    ], '📸', ['أكبر قاعدة جمهور', 'ريلز موسمية تنفجر', 'كاروسيل أقل تفاعلًا']),
    platCard(P.youtube, [
      ['مشترك', P.youtube.followers], ['مشاهدة', P.youtube.totalViews], ['فيديو', P.youtube.videos]
    ], '▶️', ['أعمال طويلة قوية', 'محرّك الانتشار', 'أرشيف منذ ٢٠١٧']),
    platCard(P.tiktok, [
      ['متابع', P.tiktok.followers], ['إعجاب', P.tiktok.likes], ['فيديو', P.tiktok.videos]
    ], '🎵', ['أعلى نسبة تفاعل', 'أقل تطويرًا', 'أكبر فرصة نمو'])
  ].join('');

  /* أبرز الأنماط */
  el('insights').innerHTML = [
    ['🏆', 'محتوى الوعي يقود الانتشار', 'أعلى الفيديوهات أداءً هي رسائل تطوير الذات ومحاربة التفاهة (١٢٢ ألفًا، ٦٢ ألفًا) — هذه هويّة القناة الرابحة.'],
    ['🌙', 'الموسمية تضاعف الوصول', 'ريل رمضان «وِرد القرآن» حقّق ٩١ ألف مشاهدة و١٨ ألف إعجاب — أضعاف المعدّل المعتاد على إنستغرام.'],
    ['📚', 'الحكاية الإيمانية تصنع الذروات', '«اللص التقي» (١٦٢ ألفًا) أعلى عمل على الإطلاق — السرد القصصي الإيماني سلاح تمييزي.'],
    ['✂️', 'الشورتس نصف الكتالوج', 'نحو ٧١ من أصل ١١٠ أعمال يوتيوب قصيرة، بثبات ٥–٢٤ ألف مشاهدة — محرّك يومي جاهز للتوسّع.'],
    ['📊', 'حقبتا ٢٠٢٤–٢٠٢٥ الأقوى', '٥٥٢ ألف مشاهدة من ١٤ عملًا في عامين — قمّة النضج الإبداعي للقناة.'],
    ['🔻', 'فجوة التفاعل على إنستغرام', '٥٧ ألف متابع لكن متوسط المنشور العادي ~١٣٠ إعجابًا — طاقة كامنة ضخمة غير مُفعّلة.']
  ].map(([em, h, d]) => `<div class="insight reveal"><div class="em">${em}</div><div><div class="h">${h}</div><div class="d">${d}</div></div></div>`).join('');

  /* أعلى أعمال يوتيوب */
  const maxV = Math.max(...DATA.youtubeTopVideos.map(v => v.views));
  el('yt-top').innerHTML = DATA.youtubeTopVideos.slice(0, 8).map((v, i) =>
    topRow(i, v.title, v.views, maxV, '#FF4d4d')).join('');
  const maxS = Math.max(...DATA.youtubeTopShorts.map(v => v.views));
  el('yt-shorts').innerHTML = DATA.youtubeTopShorts.map((v, i) =>
    topRow(i, v.title, v.views, maxS, '#2dd4bf')).join('');

  /* الركائز */
  el('pillars').innerHTML = DATA.pillars.map(p => `
    <div class="card idea reveal" style="border-top:3px solid ${p.color}">
      <div class="t">${p.name}</div>
      <div style="font-size:2rem;font-weight:900;color:${p.color}">${ar(p.share)}٪</div>
      <div class="d" style="margin:.4rem 0 .6rem">${p.note}</div>
      <div class="d" style="font-size:.78rem;color:var(--faint)">متوسط ${fmtShort(p.avgViews)} مشاهدة</div>
    </div>`).join('');

  /* KPIs */
  el('kpis').innerHTML = [
    { v: A.totalAudience, l: 'إجمالي الجمهور', ico: '👥', c: 'var(--c-blue)', delta: '+٧٦٪ مستهدف', fmt: 'full' },
    { v: P.youtube.totalViews, l: 'إجمالي مشاهدات يوتيوب', ico: '👁️', c: 'var(--c-red)', fmt: 'full' },
    { v: A.totalContent, l: 'إجمالي المحتوى المنشور', ico: '🎬', c: 'var(--c-teal)', fmt: 'full' },
    { v: 20397, l: 'متوسط مشاهدات العمل الطويل', ico: '📈', c: 'var(--c-yellow)', fmt: 'full' }
  ].map(k => `
    <div class="card kpi reveal">
      <div class="ico" style="background:${k.c}22;color:${k.c}">${k.ico}</div>
      <div class="v" data-count="${k.v}" data-fmt="${k.fmt}">٠</div>
      <div class="l">${k.l}</div>
      ${k.delta ? `<div class="delta up">▲ ${k.delta}</div>` : ''}
      <div class="kpi-bar" style="background:${k.c}"></div>
    </div>`).join('');

  /* الاستراتيجية — الأطروحة */
  el('thesis').innerHTML = `<div style="font-size:.82rem;font-weight:700;color:var(--c-teal);margin-bottom:.5rem">الأطروحة</div>
    <div style="font-size:1.05rem;line-height:1.9">${DATA.strategy.thesis}</div>`;

  /* المراحل */
  el('phases').innerHTML = DATA.strategy.phases.map(ph => `
    <div class="card reveal" style="--ph:${ph.color}">
      <div class="phase">
        <div class="dot"></div>
        <div class="win">المرحلة ${ar(ph.n)} · ${ph.window}</div>
        <div class="pt">${ph.title}</div>
        <ul>${ph.goals.map(g => `<li>${g}</li>`).join('')}</ul>
      </div>
    </div>`).join('');

  /* الأفكار */
  el('ideas').innerHTML = DATA.strategy.contentIdeas.map(i => `
    <div class="card idea reveal"><div class="icon">${i.icon}</div><div class="t">${i.t}</div><div class="d">${i.d}</div></div>`).join('');

  /* التكامل */
  el('synergies').innerHTML = DATA.strategy.synergies.map(s => `
    <div class="card reveal" style="padding:1rem 1.1rem">
      <div class="syn"><span class="from">${s.from}</span><span class="arr">⟸</span><span class="to">${s.to}</span></div>
      <div class="syn note" style="margin-top:.5rem">${s.note}</div>
    </div>`).join('');

  /* الأهداف */
  el('targets').innerHTML = `<div class="target">` + DATA.strategy.targets.map(t => {
    const pct = Math.round((t.from / t.to) * 100);
    return `<div>
      <div class="tl"><span class="lab">${t.label}</span><span class="num">${ar(t.from)} ← <b>${ar(t.to)}</b> ${t.unit}</span></div>
      <div class="track"><div class="fill" data-w="${pct}"></div></div>
    </div>`;
  }).join('') + `</div>`;
}

/* مكوّنات صغيرة */
function el(id) { return document.getElementById(id); }
function platCard(p, metrics, ico, tags) {
  return `<div class="card plat reveal" style="--p:${p.color}">
    <div class="plat-head">
      <div class="plat-logo">${ico}</div>
      <div><div class="h">${p.name}</div><div class="s">${p.handle}</div></div>
    </div>
    <div class="plat-metrics">
      ${metrics.map(([l, v]) => `<div class="metric"><div class="v">${fmtShort(v)}</div><div class="l">${l}</div></div>`).join('')}
    </div>
    <div class="role">${p.role}</div>
    <div class="tags">${tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
  </div>`;
}
function topRow(i, title, val, max, color) {
  return `<div class="toprow ${i === 0 ? 'top1' : ''}">
    <div class="rank">${ar(i + 1)}</div>
    <div class="t" title="${title}">${title}</div>
    <div class="barwrap"><div class="bar" data-w="${(val / max * 100).toFixed(1)}" style="background:${color}"></div></div>
    <div class="n">${fmtShort(val)}</div>
  </div>`;
}

/* ── العدّادات المتحركة (مع ضمان القيمة النهائية) ───────────────────────── */
function animateCount(node) {
  const target = +node.dataset.count;
  const fmt = node.dataset.fmt === 'short' ? fmtShort : ar;
  const dur = 1400, t0 = (performance && performance.now) ? performance.now() : Date.now();
  let raf = 0;
  function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
    node.textContent = fmt(Math.round(target * e));
    if (p < 1) raf = requestAnimationFrame(step);
  }
  raf = requestAnimationFrame(step);
  // ضمان: إن لم تعمل rAF (تبويب خلفي/معاينة) تُضبط القيمة النهائية بأي حال
  setTimeout(() => { node.textContent = fmt(target); }, dur + 120);
}

/* ── الكشف عند التمرير — يعتمد على getBoundingClientRect + scroll (بلا IO/rAF) ── */
function revealAll() {
  function show(node) {
    if (node.dataset.shown) return;
    node.dataset.shown = '1';
    node.classList.add('in');
    node.querySelectorAll('[data-count]').forEach(c => { if (!c.dataset.done) { c.dataset.done = '1'; animateCount(c); } });
    node.querySelectorAll('.bar[data-w], .fill[data-w]').forEach(b => { b.style.width = b.dataset.w + '%'; });
  }
  function check() {
    const h = window.innerHeight || document.documentElement.clientHeight;
    document.querySelectorAll('.reveal').forEach(n => {
      const r = n.getBoundingClientRect();
      if (r.top < h * 0.92 && r.bottom > 0) show(n);
    });
  }
  check();
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check);
}

/* ── شريط التنقّل (أقراص + scroll-spy) ───────────────────────────────────── */
function initNav() {
  const pills = [...document.querySelectorAll('.pill')];
  const ind = el('pill-ind');
  const sections = pills.map(p => el(p.dataset.go));

  function moveTo(pill) {
    ind.style.left = pill.offsetLeft + 'px';
    ind.style.width = pill.offsetWidth + 'px';
  }
  function setActive(pill) {
    pills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    moveTo(pill);
  }
  pills.forEach(p => p.addEventListener('click', () => {
    setActive(p);
    const top = el(p.dataset.go).getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top, behavior: 'smooth' });
  }));
  // الوضع الابتدائي
  setActive(pills[0]);
  window.addEventListener('resize', () => moveTo(document.querySelector('.pill.active')));

  // scroll-spy
  const spy = new IntersectionObserver((entries) => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        const p = pills.find(x => x.dataset.go === en.target.id);
        if (p && !p.classList.contains('active')) setActive(p);
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(s => spy.observe(s));
}

/* ── رسوم Chart.js ──────────────────────────────────────────────────────── */
function initCharts() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.font.family = 'Rubik';
  Chart.defaults.color = 'rgba(245,244,242,0.6)';
  Chart.defaults.font.size = 12;
  const grid = 'rgba(255,255,255,0.06)';
  const P = DATA.platforms;
  const tip = { rtl: true, titleFont: { family: 'Rubik' }, bodyFont: { family: 'Rubik' }, padding: 10, backgroundColor: '#1b1b20', borderColor: 'rgba(255,255,255,.12)', borderWidth: 1 };

  /* توزيع الجمهور — دونات */
  new Chart(el('c-audience'), {
    type: 'doughnut',
    data: {
      labels: ['إنستغرام', 'يوتيوب', 'تيك توك'],
      datasets: [{
        data: [P.instagram.followers, P.youtube.followers, P.tiktok.followers],
        backgroundColor: ['#E1306C', '#FF0000', '#25F4EE'],
        borderColor: '#0c0c0e', borderWidth: 3, hoverOffset: 10
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { rtl: true, position: 'bottom', labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' } },
        tooltip: { ...tip, callbacks: { label: c => ' ' + c.label + ': ' + ar(c.raw) + ' (' + Math.round(c.raw / DATA.aggregate.totalAudience * 100) + '٪)' } }
      }
    }
  });

  /* رادار المقارنة */
  new Chart(el('c-radar'), {
    type: 'radar',
    data: {
      labels: ['المتابعون', 'حجم المحتوى', 'التفاعل', 'فرصة النمو'],
      datasets: [
        ds('إنستغرام', [100, 100, 60, 55], '#E1306C'),
        ds('يوتيوب', [65, 31, 85, 65], '#FF4d4d'),
        ds('تيك توك', [20, 12, 72, 95], '#25F4EE')
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { rtl: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14 } }, tooltip: tip },
      scales: { r: { angleLines: { color: grid }, grid: { color: grid }, suggestedMin: 0, suggestedMax: 100, pointLabels: { font: { size: 12, family: 'Rubik' } }, ticks: { display: false } } }
    }
  });
  function ds(label, data, color) {
    return { label, data, borderColor: color, backgroundColor: color + '33', pointBackgroundColor: color, borderWidth: 2, pointRadius: 3 };
  }

  /* يوتيوب حسب الحقبة — أعمدة */
  new Chart(el('c-era'), {
    type: 'bar',
    data: {
      labels: DATA.youtubeByEra.map(e => e.era),
      datasets: [{
        label: 'مشاهدات', data: DATA.youtubeByEra.map(e => e.views),
        backgroundColor: ctxGrad('#FF0000', '#f04e3a'), borderRadius: 8, maxBarThickness: 46
      }]
    },
    options: barOpts(grid, tip, v => fmtShort(v))
  });

  /* توزيع المشاهدات — أعمدة */
  new Chart(el('c-dist'), {
    type: 'bar',
    data: {
      labels: DATA.youtubeDistribution.map(d => d.band),
      datasets: [{ label: 'عدد الأعمال', data: DATA.youtubeDistribution.map(d => d.count), backgroundColor: ctxGrad('#3b9fe6', '#086fb6'), borderRadius: 8, maxBarThickness: 46 }]
    },
    options: barOpts(grid, tip, v => ar(v))
  });

  /* تفاعل إنستغرام — أعمدة بمقياس لوغاريتمي */
  const igs = [...DATA.instagramSample].reverse();
  new Chart(el('c-ig'), {
    type: 'bar',
    data: {
      labels: igs.map(p => p.label),
      datasets: [{
        label: 'إعجابات', data: igs.map(p => p.likes),
        backgroundColor: igs.map(p => p.likes > 5000 ? '#fbbf24' : '#E1306C'), borderRadius: 6, maxBarThickness: 30
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { label: c => ' ' + ar(c.raw) + ' إعجاب' } } },
      scales: {
        x: { type: 'logarithmic', grid: { color: grid }, ticks: { callback: v => fmtShort(v) } },
        y: { grid: { display: false }, ticks: { font: { size: 10 } } }
      }
    }
  });

  /* النمو المتوقّع — خط */
  const pr = DATA.projections;
  new Chart(el('c-growth'), {
    type: 'line',
    data: {
      labels: pr.months,
      datasets: [
        line('إنستغرام', pr.instagram.series, '#E1306C'),
        line('يوتيوب', pr.youtube.series, '#FF4d4d'),
        line('تيك توك', pr.tiktok.series, '#25F4EE')
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { rtl: true, position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14 } }, tooltip: { ...tip, callbacks: { label: c => ' ' + c.dataset.label + ': ' + ar(c.raw) } } },
      scales: { x: { reverse: true, grid: { display: false } }, y: { grid: { color: grid }, ticks: { callback: v => fmtShort(v) } } }
    }
  });
  function line(label, data, color) {
    return { label, data, borderColor: color, backgroundColor: color + '22', borderWidth: 2.5, tension: .4, fill: true, pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: color };
  }
}

/* خيارات الأعمدة المشتركة (محور زمني/فئوي معكوس للقراءة من اليمين) */
function barOpts(grid, tip, fmt) {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { ...tip, callbacks: { label: c => ' ' + fmt(c.raw) } } },
    scales: {
      x: { reverse: true, grid: { display: false }, ticks: { font: { size: 11 } } },
      y: { grid: { color: grid }, ticks: { callback: v => fmt(v) }, beginAtZero: true }
    }
  };
}

/* تدرّج عمودي للأعمدة */
function ctxGrad(c1, c2) {
  return (context) => {
    const { ctx, chartArea } = context.chart;
    if (!chartArea) return c1;
    const g = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    g.addColorStop(0, c2); g.addColorStop(1, c1);
    return g;
  };
}
