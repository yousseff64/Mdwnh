/* ============================================================
   Site data. Everything the page renders comes from here.
   ============================================================ */

/* ---------------------------------------------------------- news / hero ---
   One entry per headline in the hero clicker. `tone` drives the whole stage:
   page background, cloud tint, and the card glow.
   Cloud layout is authored per item. x/y are percentages of the stage,
   s is scale, f flips it, b is blur in px, d is the drift seed.
--------------------------------------------------------------------------- */
export const NEWS = [
  {
    id: 'hujra',
    name: 'باب الحجرة',
    kicker: 'قصة مصورة · اقرأها الآن',
    art: 'assets/img/hujra.webp',
    scene: 'eyes',                // its project page's world (js/scenes.js)
    align: 'end',                 // logo sits at the right edge of the art
    body: 'تظن أن بابك مغلق، لكن هل جربت فتحه حقًا؟ شاهد التشويقة الرسمية، واكتشف ما وراءه.\nالحكاية كاملة في ٤٣ صفحة.',
    primary: { label: 'أعرف المزيد', href: 'project.html?id=hujra' },
    read: { label: 'اقرأ القصة المصورة', href: 'https://mdwn.studio/Hujra/' },
    secondary: { label: 'شاهد التشويقة', href: 'https://www.youtube.com/watch?v=tJfiXnSMD0c' },
    tone: {
      bg: '#4a2a63',
      deep: '#2a1339',
      cloud: '#9a5fc2',
      glow: '#b07de0',
      ink: '#f6efff'
    },
    clouds: [
      { x: -6, y: 4, s: 1.5, f: 0, b: 5, d: 0 },
      { x: 78, y: -8, s: 1.9, f: 1, b: 9, d: 1 },
      { x: 62, y: 74, s: 1.2, f: 0, b: 2, d: 2 },
      { x: -12, y: 66, s: 2.1, f: 1, b: 12, d: 3 },
      { x: 34, y: 92, s: 0.8, f: 0, b: 0, d: 4 }
    ],
    /* nearest layer: grazes the card corners, never the copy */
    front: [
      { x: -16, y: 24, s: 1.4, f: 0, b: 1, d: 10 },
      { x: 66, y: -14, s: 1.0, f: 1, b: 0, d: 11 }
    ]
  },
  {
    id: 'samarqand',
    name: 'قضية سمرقند',
    kicker: 'قصة مصورة · جديدة',
    art: 'assets/img/samarqand.webp',
    scene: 'leaves',
    align: 'center',              // logo sits centred in the art
    body: 'من سمرقند إلى معسكر المعتدين، يحمل فتى رسالة لا يعرف ما الذي ينتظره عند نهايتها.\nشاهد الفيلم، واقرأ الحكاية كاملة في ٥١ صفحة.',
    primary: { label: 'أعرف المزيد', href: 'project.html?id=samarqand' },
    read: { label: 'اقرأ القصة المصورة', href: 'https://mdwn.studio/Samrqand/' },
    secondary: { label: 'شاهد الفيلم', href: 'https://www.youtube.com/watch?v=aU4dZUsIVxk' },
    tone: {
      bg: '#7f9dbe',
      deep: '#3f5d80',
      cloud: '#ffffff',
      glow: '#ffffff',
      ink: '#ffffff'              // white on both headlines, by request
    },
    clouds: [
      { x: -10, y: -6, s: 1.7, f: 0, b: 6, d: 5 },
      { x: 72, y: 8, s: 1.1, f: 1, b: 0, d: 6 },
      { x: 80, y: 68, s: 2.0, f: 0, b: 10, d: 7 },
      { x: -8, y: 58, s: 1.3, f: 1, b: 3, d: 8 },
      { x: 24, y: 88, s: 0.9, f: 0, b: 1, d: 9 }
    ],
    front: [
      { x: -18, y: 12, s: 1.5, f: 1, b: 0, d: 12 },
      { x: 70, y: 66, s: 1.1, f: 0, b: 2, d: 13 }
    ]
  }
];

/* ------------------------------------------------------------- projects ---
   أعمالنا, in marquee order. Every cover is cut to one shared frame by
   build-assets.py (card, the art breaking out of it, a baked shadow), so they
   are all 900 x 1333, with a -sm.webp twin at 480 wide. `accent` is the glow
   a card lifts in, taken from its own art. Every id has a page in
   PROJECT_PAGES, and the news items link to the same pages.
   Each year is the year the work went up on YouTube.
--------------------------------------------------------------------------- */
export const PROJECTS = [
  { id: 'samarqand', name: 'قضية سمرقند', role: 'قصة مصورة', year: '٢٠٢٦', cover: 'assets/img/covers/samarqand.webp', accent: '#e0a36b' },
  { id: 'ghamam', name: 'غمام', role: 'فيلم قصير', year: '٢٠٢٦', cover: 'assets/img/covers/ghamam.webp', accent: '#9b7cf2' },
  { id: 'hujra', name: 'باب الحجرة', role: 'قصة مصورة', year: '٢٠٢٦', cover: 'assets/img/covers/hujra.webp', accent: '#8fd0ff' },
  { id: 'lis', name: 'اللص التقي', role: 'حكاية مرسومة', year: '٢٠٢٤', cover: 'assets/img/covers/lis.webp', accent: '#f3d9a4' },
  { id: 'fasl', name: 'فصل عجيب', role: 'برنامج علمي', year: '٢٠٢٥', cover: 'assets/img/covers/fasl.webp', accent: '#c35bff' },
  { id: 'qird', name: 'القرد والغيلم', role: 'قصة مصورة', year: '٢٠٢٥', cover: 'assets/img/covers/qird.webp', accent: '#8cc63f' }
];

/* ----------------------------------------------------------- إنجازاتنا ---
   Two kinds of number here.

   `live` names a key in window.MDWNH_STATS, written by
   scripts/fetch-stats.mjs (an hourly GitHub Action). Those rows refresh
   themselves off the public YouTube and Discord pages, so nobody has to
   remember to edit them. `display` is only the fallback the page paints
   before that file is parsed, or if it is missing.

   Everything else is entered by hand, with the date it was read. TikTok
   serves only its first page to anyone not logged in, and Instagram
   publishes no view count at all, so neither can be read by a script.
--------------------------------------------------------------------------- */

/* The views figure is every platform added together, not YouTube's alone.
   Each line is one platform's own total.
     yt   read live off the channel's about page, exact
     tt   TikTok. THIS IS A FLOOR, not the real total: it is the sum of the
          24 videos TikTok serves to a logged out visitor, out of 61 on the
          profile. Replace it with the all time figure from TikTok Studio
          (Analytics → Video views → All time) and drop the `floor` flag.
     ig   Instagram publishes no view count on a profile, and the account
          has no reels, so there is nothing to add.
--------------------------------------------------------------------------- */
export const VIEWS = {
  yt: { live: 'ytViews', value: 1525199, at: '١٢ سبتمبر ٢٠٢٦' },
  tt: { value: 1347297, at: '١٢ سبتمبر ٢٠٢٦', floor: true },
  ig: { value: 0, at: '١٢ سبتمبر ٢٠٢٦' }
};

export const STATS = [
  { id: 'yt', label: 'مشترك في يوتيوب', value: 37400, display: '٣٧٫٤ ألف', live: 'ytSubsText', accent: 'ember', verified: true, href: 'https://www.youtube.com/@Mdwn.c' },
  { id: 'views', label: 'مشاهدة على كل المنصات', value: 2872496, display: '٢٫٩ مليون', live: 'views', approx: true, accent: 'sky', verified: false, href: 'https://www.youtube.com/@Mdwn.c' },
  { id: 'ig', label: 'متابع في إنستغرام', value: 55200, display: '٥٥٫٢ ألف', accent: 'sun', verified: true, href: 'https://www.instagram.com/mdwn.c/' },
  { id: 'tt', label: 'إعجاب على تيك توك', value: 79200, display: '٧٩٫٢ ألف', accent: 'mint', verified: true, href: 'https://www.tiktok.com/@mdwn.c' },
  { id: 'disc', label: 'عضو في نادي المدونة', value: 1284, display: '١٬٢٨٤', live: 'discMembers', accent: 'ember', verified: true, href: 'https://discord.gg/RBtp2JVXm6' },
  { id: 'films', label: 'عمل منشور', value: 115, display: '١١٥', accent: 'sky', verified: true, href: 'https://www.youtube.com/@Mdwn.c/videos' }
];

/* ----------------------------------------------- ماذا قالوا عن عملنا ---
   The field سراج falls through. Two kinds of row, and the difference
   matters.

   The seven `hi` rows are real: comments people left under the work, copied
   as written. Every other row is deliberate filler, noises and notes to
   nobody, because the field behind them is decoration and the blur is not a
   guarantee. If it ever fails to paint (an old browser, a dropped filter, a
   screenshot) the page must not read as sixty testimonials the studio never
   received. Never write a plausible compliment into a background row.

     t     which surface it came from
             yt  a YouTube comment, dark card with an avatar
             wa  an outgoing WhatsApp bubble, green
             wi  an incoming WhatsApp bubble, light
             x   a post on X, dark card with a handle
     d     depth. The lens is focused around 0.75, so 0.15 is a huge blurred
           shape right in front of the camera and 1.9 is a small dark one far
           behind. Both ends go soft, only the middle is sharp.
     n     likes, where the surface shows them
     hi    featured, and real. Keep it to six or seven. These are the only
           sharp ones: they ride in front of سراج at the focus depth, so the
           page has a few things to read instead of sixty. Copied as written,
           typos included, with the handle, age and likes each had when it
           was captured. The screenshots they came from are in Art/comments/.
     av    avatar image, cut from that screenshot by build-assets.py. Drop it
           where the commenter has no real picture (a plain black circle, a
           letter): the card's own coloured initial reads better than a
           smudge.

   side, vertical order and tilt are derived in fall.js so this table stays
   readable and stays easy to add to.
--------------------------------------------------------------------------- */
export const COMMENTS = [
  { t: 'wa', x: 'بلا بلا بلا بلا', d: 1.25 },
  { t: 'yt', u: '@fundit0', at: 'قبل ٤ أشهر', x: 'الأن هذا الي اسميه كرتون عربي!\nمو تجيبيلي شخصيات رسمها طفولي وحتى ملابسها وشكلها وقصة العمل ما يمثل العرب وتسميه كرتون عربي!\nجُهد يُثى عليه، احسنتم', n: 140, d: 0.8, hi: 1 },
  { t: 'wi', x: 'طق طق طق', d: 0.95 },
  { t: 'x', u: '@لا_أحد', at: '٥ س', x: 'همهمة', n: 96, d: 1.5 },
  { t: 'yt', u: '@تجربة', at: 'قبل أسبوع', x: 'لا تقرأني، أنا زينة', n: 274, d: 0.2 },
  { t: 'wa', x: 'نص بديل ينتظر دوره', d: 0.7 },
  { t: 'yt', u: '@مستطيل', at: 'قبل ٤ أشهر', x: 'واحد اثنان ثلاثة، اختبار', n: 61, d: 1.05 },
  { t: 'wi', x: 'زقزقة', d: 1.65 },
  { t: 'yt', u: '@shahedalmahreq', av: 'assets/img/avatars/shahedalmahreq.webp', at: 'قبل ٤ أشهر', x: 'اسلوب التلوين والرسم مرة جاي على القصة واسلوبها......\nكملوا بالانميشن العربي والشعب معكوا', n: 51, d: 0.72, hi: 1 },
  { t: 'yt', u: '@Abqarenoo1', av: 'assets/img/avatars/abqarenoo1.webp', at: 'قبل ٤ أشهر', x: 'كدت ابكي والله الفيديو جميل جميل جميل اللهم بارك ❤❤❤❤', n: 10, d: 0.78, hi: 1 },
  { t: 'wa', x: 'أنا مجرد مستطيل', d: 1.85 },
  { t: 'yt', u: '@مؤقت', at: 'قبل يومين', x: 'ضجيج خلفية', n: 44, d: 0.88 },
  { t: 'wi', x: 'كلام كلام كلام', d: 0.55 },
  { t: 'yt', u: '@همهمة', at: 'قبل ٣ أسابيع', x: 'تكة تكة تكة', n: 205, d: 1.35 },
  { t: 'wa', x: 'هنا كان يفترض أن يكون شيء', d: 0.68 },
  { t: 'yt', u: '@بطاقة_خلفية', at: 'قبل شهرين', x: 'خخخخخخ', n: 158, d: 0.8 },
  { t: 'x', u: '@حشو', at: '٤ أيام', x: 'ااااااااااا', n: 89, d: 1.6 },
  { t: 'yt', u: '@لا_أحد', at: 'قبل ٧ أشهر', x: 'موجة صوت بلا كلمات', n: 312, d: 0.25 },
  { t: 'wi', x: 'حرف وحرف وحرف', d: 1.15 },
  { t: 'wa', x: 'طنين', d: 0.92 },
  { t: 'yt', u: '@مستطيل', at: 'قبل شهر', x: 'أزيز', n: 121, d: 0.74 },
  { t: 'x', u: '@خلفية', at: '٥ أيام', x: 'مجرد حشو', n: 67, d: 1.45 },
  { t: 'yt', u: '@ضجيج', at: 'قبل ٨ أشهر', x: 'لوريم إيبسوم، لكن بالعربي', n: 431, d: 0.48 },
  { t: 'wa', x: 'غمغمة', d: 0.76 },
  { t: 'yt', u: '@صدى', at: 'قبل ٣ أيام', x: 'قرقعة', n: 254, d: 1.1 },
  { t: 'yt', u: '@Mariam_said888', av: 'assets/img/avatars/mariam_said888.webp', at: 'قبل ٤ أشهر', x: 'انا مش ببالغ\nبس انا بكيت\nبجد انا اندمجت مع التحفه ديه الي تستحق الانتشار فعلا\nكل الدعم', n: 2, d: 0.6, hi: 1 },
  { t: 'yt', u: '@همهمة', at: 'قبل شهرين', x: 'خشخشة', n: 189, d: 1.75 },
  { t: 'x', u: '@نص_بديل', at: '٢ س', x: 'فقاعة فارغة', n: 143, d: 0.71 },
  { t: 'wa', x: 'نقطة، فاصلة، نقطة', d: 0.3 },
  { t: 'yt', u: '@حشو', at: 'قبل ٦ أشهر', x: 'الغيمة تسلم عليك', n: 366, d: 0.82 },
  { t: 'wi', x: 'أنا خلف سراج، لا تنظر إليّ', d: 1.3 },
  { t: 'yt', u: '@تجربة', at: 'قبل أسبوعين', x: 'سقوط حر', n: 98, d: 0.66 },
  { t: 'x', u: '@زخرفة', at: '١ ي', x: 'وشوشة', n: 402, d: 1.55 },
  { t: 'wa', x: 'رنة', d: 0.86 },
  { t: 'yt', u: '@azry_07', at: 'قبل ٤ أشهر', x: 'احسست بالقشعريرة مع نهاية العمل... اوصلتم الفكرة شكرا!', n: 3, d: 0.64, hi: 1 },
  { t: 'wi', x: 'دقة على الطاولة', d: 1.2 },
  { t: 'yt', u: '@ضجيج', at: 'قبل ٣ أشهر', x: 'كركرة', n: 77, d: 0.9 },
  { t: 'wa', x: 'ثرثرة', d: 1.9 },
  { t: 'x', u: '@صدى', at: '٧ س', x: 'صرير', n: 130, d: 0.73 },
  { t: 'yt', u: '@همهمة', at: 'قبل سنة', x: 'حفيف', n: 588, d: 0.79 },
  { t: 'wi', x: 'دمدمة', d: 1.4 },
  { t: 'yt', u: '@بطاقة_خلفية', at: 'قبل شهر', x: 'رفرفة', n: 164, d: 0.28 },
  { t: 'yt', u: '@usersohaila', at: 'قبل ٤ أشهر', x: 'الله يرضى عنكم أنتم على ثغر اللهم بارك استمرو', n: 1, d: 0.35, hi: 1 },
  { t: 'x', u: '@حشو', at: '٣ ي', x: 'همس همس', n: 112, d: 1.7 },
  { t: 'yt', u: '@لا_أحد', at: 'قبل ٥ أشهر', x: 'خربشة', n: 245, d: 0.84 },
  { t: 'wi', x: 'زوبعة في فنجان', d: 1.0 },
  { t: 'yt', u: '@زخرفة', at: 'قبل يوم', x: 'نغمة انتظار', n: 309, d: 0.75 },
  { t: 'wa', x: 'صدى', d: 0.58 },
  { t: 'yt', u: '@خلفية', at: 'قبل ٩ أشهر', x: 'قرقرة', n: 276, d: 1.28 },
  { t: 'wi', x: 'تنحنح', d: 0.22 },
  { t: 'x', u: '@مؤقت', at: '١١ س', x: 'صفير', n: 91, d: 0.86 },
  { t: 'yt', u: '@صدى', at: 'قبل ٧ أيام', x: 'لا شيء هنا', n: 133, d: 1.62 },
  { t: 'wa', x: 'استمر في السقوط', d: 1.05 },
  { t: 'yt', u: '@نص_بديل', at: 'قبل شهرين', x: 'مررت من هنا', n: 421, d: 0.77 },
  { t: 'wi', x: 'بطاقة فاضية', d: 0.5 },
  { t: 'x', u: '@حشو', at: '٢ ي', x: 'نص مؤقت', n: 58, d: 1.42 },
  { t: 'wa', x: 'طرطشة', d: 0.68 },
  { t: 'yt', u: '@تجربة', at: 'قبل ٤ أشهر', x: 'دغدغة', n: 197, d: 0.93 },
  { t: 'wi', x: 'صفصفة', d: 1.78 },
  { t: 'yt', u: '@مستطيل', at: 'قبل أسبوع', x: 'أنين باب', n: 104, d: 0.32 },
  { t: 'x', u: '@خلفية', at: '٨ س', x: 'شخللة', n: 168, d: 0.74 },
  { t: 'wa', x: 'تمتمة', d: 1.18 },
  { t: 'yt', u: '@kamelelsayed3106', av: 'assets/img/avatars/kamelelsayed3106.webp', at: 'قبل ٣ أشهر', x: 'يستحق الاوسكار و ربي', n: 1, d: 0.42, hi: 1 }
];

/* -------------------------------------------------------- أين تجدنا؟ --- */
export const SOCIALS = [
  { id: 'yt', name: 'يوتيوب', handle: '@Mdwn.c', note: 'الأفلام والحلقات كاملة', href: 'https://www.youtube.com/@Mdwn.c', accent: 'ember', icon: 'smile' },
  { id: 'ig', name: 'إنستغرام', handle: '@mdwn.c', note: 'الإعلانات والكواليس أولًا', href: 'https://www.instagram.com/mdwn.c/', accent: 'sun', icon: 'sparkles' },
  { id: 'tt', name: 'تيك توك', handle: '@mdwn.c', note: 'مقاطع سريعة ولحظات مختارة', href: 'https://www.tiktok.com/@mdwn.c', accent: 'mint', icon: 'spiral' },
  { id: 'dc', name: 'ديسكورد', handle: 'نادي المدونة', note: 'التحديات والنقاش والتصويت', href: 'https://discord.gg/RBtp2JVXm6', accent: 'sky', icon: 'hash' }
];

/* --------------------------------------------------------- project stills ---
   The strip that runs across a project page, five frames per work, in the
   order they appear on the strip.

   To change one, drop a new file over Art/stills/<id>/<n>.jpg and rerun
   `python3 v4/tools/build-assets.py stills`. It is cut to 16:9 for you, so
   the replacement does not have to be trimmed first. To add or drop a frame,
   add or drop the file and the line here. Every entry has a 480 wide twin
   built beside it (-sm.webp); js/stills.js asks for it on a phone.

   Where they came from: أعمال بالفيديو are frames off the film itself.
   بَابُ الحُجْرَة and القِرْدُ وَالغَيْلَم are bands cut out of the comic,
   because their videos are a teaser and an announcement, not the work.
--------------------------------------------------------------------------- */
export const STILLS = {
  samarqand: [
    { src: 'assets/img/stills/samarqand-1.webp', alt: 'الفتى في سوق سمرقند' },
    { src: 'assets/img/stills/samarqand-2.webp', alt: 'صحن المسجد الكبير' },
    { src: 'assets/img/stills/samarqand-3.webp', alt: 'وجه الفتى عن قرب' },
    { src: 'assets/img/stills/samarqand-4.webp', alt: 'الفتى ورفيقه في الطريق' },
    { src: 'assets/img/stills/samarqand-5.webp', alt: 'الفتى يشير ورفيقه يضحك' }
  ],
  ghamam: [
    { src: 'assets/img/stills/ghamam-1.webp', alt: 'غمام بين زملائه' },
    { src: 'assets/img/stills/ghamam-2.webp', alt: 'غمام أمام حاسوبه ليلًا' },
    { src: 'assets/img/stills/ghamam-3.webp', alt: 'غمام خلف المنصة' },
    { src: 'assets/img/stills/ghamam-4.webp', alt: 'العرض التقديمي على الشاشة' },
    { src: 'assets/img/stills/ghamam-5.webp', alt: 'القاعة تذوب في نوبة الهلع' }
  ],
  hujra: [
    { src: 'assets/img/stills/hujra-1.webp', alt: 'حسام داخل مكعب زجاجي' },
    { src: 'assets/img/stills/hujra-2.webp', alt: 'حسام يصرخ في وجه الوهم' },
    { src: 'assets/img/stills/hujra-3.webp', alt: 'صفحة ابتعد' },
    { src: 'assets/img/stills/hujra-4.webp', alt: 'حسام وسط عيون متوهجة' },
    { src: 'assets/img/stills/hujra-5.webp', alt: 'حسام منكفئ خلف الباب' }
  ],
  lis: [
    { src: 'assets/img/stills/lis-1.webp', alt: 'المدينة ليلًا' },
    { src: 'assets/img/stills/lis-2.webp', alt: 'اللص أمام الباب' },
    { src: 'assets/img/stills/lis-3.webp', alt: 'فناء البيت ونافورته' },
    { src: 'assets/img/stills/lis-4.webp', alt: 'اللص بين أكياس الطعام' },
    { src: 'assets/img/stills/lis-5.webp', alt: 'نهاية الحكاية تحت الأضواء' }
  ],
  fasl: [
    { src: 'assets/img/stills/fasl-1.webp', alt: 'السيد عجيب أمام السبورة' },
    { src: 'assets/img/stills/fasl-2.webp', alt: 'حقل قمح عند الغروب' },
    { src: 'assets/img/stills/fasl-3.webp', alt: 'أينشتاين ومعادلاته' },
    { src: 'assets/img/stills/fasl-4.webp', alt: 'سيارة تعبر الزمن' },
    { src: 'assets/img/stills/fasl-5.webp', alt: 'كائن يسبح قرب ثقب أسود' }
  ],
  qird: [
    { src: 'assets/img/stills/qird-1.webp', alt: 'القرد على غصن التين' },
    { src: 'assets/img/stills/qird-2.webp', alt: 'أول لقاء بين القرد والغيلم' },
    { src: 'assets/img/stills/qird-3.webp', alt: 'شجرة التين على الشاطئ' },
    { src: 'assets/img/stills/qird-4.webp', alt: 'القرد على ظهر الغيلم في البحر' },
    { src: 'assets/img/stills/qird-5.webp', alt: 'بيت الغيلم تحت سطح الماء' }
  ]
};

/* ------------------------------------------------- project detail pages ---
   One page per id in PROJECTS, rendered by project.html?id=…

     yt       the YouTube video. The page plays it in place, and its
              thumbnail is the poster until you press play
     scene    the world the page is dressed in, read off that thumbnail
              (js/scenes.js draws it)
     theme    colours picked from the same thumbnail
                bg      page ground. ink must pass for body text on it
                sky     top of the hero, fading down into bg
                deep    footer ground
                accent  the thumbnail's loudest colour, accent2 the next
                pop     accent for small text, when accent is too light
                cloud   cloud tint. light: bg is light and ink is dark
     name     the header, with tashkeel
     read     the work's comic on mdwn.studio, when it has one
     stats    four numbers. Views, likes and comments were read off each
              video's YouTube page on the date in STATS_AS_OF, and rounded
              down, never up. The like rate is likes over views. Page
              counts are the pages in the site's comic readers.

   Synopses are written from the studio's own brief for each work. غمام's
   award is the one on the home page (إنجازاتنا).
--------------------------------------------------------------------------- */
export const STATS_AS_OF = '١١ سبتمبر ٢٠٢٦';

export const PROJECT_PAGES = {
  samarqand: {
    name: 'قَضِيَّةُ سَمَرْقَنْد',
    latin: 'THE SAMARKAND CASE',
    type: 'قصة مصورة',
    year: '٢٠٢٦',
    length: 'الفيلم، أقل من ٣ دقائق',
    yt: 'aU4dZUsIVxk',
    scene: 'leaves',
    read: 'https://mdwn.studio/Samrqand/',
    tagline: 'رسالة واحدة هي أمل المدينة، وفتى واحد يحملها.',
    body: [
      'مرت خمس سنوات على اقتحام الدخلاء سمرقند. يقع الاختيار على فتى حالم مندفع ليحمل رسالة أهلها، وهي أملهم الوحيد في نصرة مدينتهم.',
      'رحلة محفوفة بالغموض والعجائب، غايتها أن يصل إلى الحاكم الذي يقود المعتدين، ويبلغه رسالة سمرقند. شاهد الفيلم، ثم اقرأ الحكاية كاملة في قصة مصورة من ٥١ صفحة.'
    ],
    crew: ['كتابة', 'رسم', 'تحريك', 'قصة مصورة'],
    stats: [
      { n: 7.5, u: 'ألف', l: 'مشاهدة' },
      { n: 630, l: 'إعجابًا' },
      { n: 135, l: 'تعليقًا' },
      { n: 8.3, u: '٪', l: 'نسبة الإعجاب إلى المشاهدات' }
    ],
    facts: [
      { k: 'النوع', v: 'قصة مصورة' },
      { k: 'نُشر في', v: '٦ أغسطس ٢٠٢٦' },
      { k: 'المدة', v: '٢:٤٩' },
      { k: 'الموضوع', v: 'حكاية من التاريخ الإسلامي' },
      { k: 'القصة المصورة', v: '٥١ صفحة' }
    ],
    theme: { bg: '#4f739b', sky: '#93b8dc', deep: '#2b211c', ink: '#fffaf2', accent: '#f1dcc2', accent2: '#c8733c', cloud: '#ffffff' }
  },
  ghamam: {
    name: 'غَمَام',
    latin: 'GHAMAM',
    type: 'فيلم قصير',
    year: '٢٠٢٦',
    length: 'أكثر من ١٠ دقائق',
    yt: 'bCkfuh_2yUE',
    scene: 'smoke',
    tagline: 'نوبة هلع قبل العرض التقديمي، وطالب يحاول أن ينهض من جديد.',
    body: [
      'غمام طالب جامعي تباغته نوبات الهلع والقلق الاجتماعي كلما اقترب موعد عرضه التقديمي. يرى الفيلم كيف يثقل هذا الضغط دراسته، وكيف يتعثر ثم ينهض من جديد.',
      'صنعناه في وقت قياسي لمسابقة إنتاج محتوى للنشء، وفاز بالمركز الثاني في جائزة الإنتاج المرئي للنشء. فيلم بلا موسيقى، يترك الصمت والمؤثرات الصوتية تحكي، وكتب الناس تحته في التعليقات: هذا أنا.'
    ],
    /* the one award on the site. project.js gives it its own band under the
       video, in the same three rosette petals as إنجازاتنا on the home page,
       cooled down to this page's night. */
    award: {
      place: '٢',
      rank: 'المركز الثاني',
      name: 'جائزة الإنتاج المرئي للنشء',
      note: 'عن فيلم غمام، مسابقة إنتاج محتوى للنشء'
    },
    crew: ['كتابة', 'إخراج', 'تصميم صوت', 'أداء صوتي'],
    stats: [
      { n: 51.6, u: 'ألف', l: 'مشاهدة' },
      { n: 5.1, u: 'ألف', l: 'إعجاب' },
      { n: 718, l: 'تعليقًا' },
      { n: 9.9, u: '٪', l: 'نسبة الإعجاب إلى المشاهدات' }
    ],
    facts: [
      { k: 'النوع', v: 'فيلم قصير' },
      { k: 'الجائزة', v: 'المركز الثاني، جائزة الإنتاج المرئي للنشء' },
      { k: 'نُشر في', v: '٧ مايو ٢٠٢٦' },
      { k: 'المدة', v: '١٠:٣٧' }
    ],
    theme: { bg: '#131317', sky: '#2a2a33', deep: '#08080a', ink: '#f3f3f6', accent: '#e8edf5', accent2: '#8e97a8', pop: '#c9d3e3', cloud: '#34343d' }
  },
  hujra: {
    name: 'بَابُ الحُجْرَة',
    latin: 'BAB AL HUJRA',
    type: 'قصة مصورة',
    year: '٢٠٢٦',
    length: 'التشويقة الرسمية',
    yt: 'tJfiXnSMD0c',
    scene: 'eyes',
    read: 'https://mdwn.studio/Hujra/',
    tagline: 'قد يكون بابك مفتوحًا طوال الوقت، لكنك لم تمدّ يدك إلى المقبض بعد.',
    body: [
      'تظن أن بابك مغلق. هل جربت فتحه حقًا، أم أقنعت نفسك أن لا فائدة من المحاولة؟ أحيانًا يكون العائق في عقلك وحده، لا في الباب. اسأل نفسك: ما الذي يمنعك؟',
      'بدأت الحكاية قصة مصورة من ٤٣ صفحة تقرؤها كاملة الآن. شاهد التشويقة الرسمية، واشترك في القناة ليصلك جديدها يوم نشره.'
    ],
    crew: ['كتابة', 'رسم', 'تحريك', 'تصميم صوت'],
    stats: [
      { n: 4.2, u: 'ألف', l: 'مشاهدة للتشويقة' },
      { n: 315, l: 'إعجابًا' },
      { n: 60, l: 'تعليقًا' },
      { n: 43, u: 'صفحة', l: 'في القصة المصورة' }
    ],
    facts: [
      { k: 'النوع', v: 'قصة مصورة' },
      { k: 'التشويقة', v: '٢٥ أبريل ٢٠٢٦' },
      { k: 'مدة التشويقة', v: '٣٦ ثانية' },
      { k: 'القصة المصورة', v: '٤٣ صفحة' },
      { k: 'نسبة الإعجاب', v: '٧٫٣٪ من المشاهدات' }
    ],
    theme: { bg: '#2a1340', sky: '#4b2a66', deep: '#12081d', ink: '#f6efff', accent: '#9fd8ff', accent2: '#b07de0', cloud: '#6b3d93' }
  },
  lis: {
    name: 'اللِّصُّ التَّقِيّ',
    latin: 'THE PIOUS THIEF',
    type: 'حكاية مرسومة',
    year: '٢٠٢٤',
    length: 'أقل من ٥ دقائق',
    yt: '0y3jSrG-Gto',
    scene: 'sparkle',
    tagline: 'لصٌّ يتسلل إلى بيت، فيخرج منه بدرس في التقوى.',
    body: [
      'حكاية طريفة ذكرها الشيخ علي الطنطاوي: لص يدخل بيتًا ليسرقه، فيفهم المشاهد معه معنى التقوى بطريقة كوميدية غير متوقعة.',
      'رسمناها وحركناها ضمن مدونة الرسم، بخطوط بسيطة وألوان دافئة، في أقل من خمس دقائق.'
    ],
    crew: ['رواية', 'رسم', 'تحريك', 'أداء صوتي'],
    stats: [
      { n: 164.9, u: 'ألف', l: 'مشاهدة' },
      { n: 8.7, u: 'ألف', l: 'إعجاب' },
      { n: 5.2, u: '٪', l: 'نسبة الإعجاب إلى المشاهدات' },
      { n: 4.8, u: 'دقيقة', l: 'مدة الحكاية' }
    ],
    facts: [
      { k: 'النوع', v: 'حكاية مرسومة' },
      { k: 'الأصل', v: 'الشيخ علي الطنطاوي' },
      { k: 'نُشر في', v: '٢٥ أبريل ٢٠٢٤' },
      { k: 'المدة', v: '٤:٥٠' }
    ],
    theme: { bg: '#7a3f52', sky: '#9d5c6e', deep: '#2b1018', ink: '#fcebc8', accent: '#f6dfb0', accent2: '#79b9a6', cloud: '#b67a8b' }
  },
  fasl: {
    name: 'فَصْلٌ عَجِيب',
    latin: 'A STRANGE CLASS',
    type: 'برنامج علمي',
    year: '٢٠٢٥',
    length: 'أقل من ٤ دقائق',
    yt: 'DstPIXlD090',
    scene: 'space',
    tagline: 'السيد عجيب يبدأ من سؤال، ولا يتركك قبل الجواب.',
    body: [
      'برنامج علمي طريف يقدمه السيد عجيب: يبدأ من سؤال، ثم يمضي بك في رحلة بحث بين الأسطر والكلمات حتى تصل معه إلى الجواب.',
      'في هذه الحلقة سؤال واحد: هل السفر عبر الزمن ممكن؟ أقل من أربع دقائق بين الفيزياء والكوميديا، تنتهي بمعلومة تبقى معك.'
    ],
    crew: ['السيد عجيب', 'كتابة', 'رسم', 'تحريك'],
    stats: [
      { n: 8.8, u: 'ألف', l: 'مشاهدة' },
      { n: 599, l: 'إعجابًا' },
      { n: 104, l: 'تعليقات' },
      { n: 6.7, u: '٪', l: 'نسبة الإعجاب إلى المشاهدات' }
    ],
    facts: [
      { k: 'النوع', v: 'برنامج علمي' },
      { k: 'يقدمه', v: 'السيد عجيب' },
      { k: 'الحلقة', v: 'هل السفر عبر الزمن ممكن؟' },
      { k: 'نُشر في', v: '٢٠ فبراير ٢٠٢٥' },
      { k: 'المدة', v: '٣:٤٢' }
    ],
    theme: { bg: '#110e33', sky: '#241866', deep: '#060515', ink: '#ffffff', accent: '#c35bff', accent2: '#ff9f45', pop: '#d99bff', cloud: '#4b2a9a' }
  },
  qird: {
    name: 'القِرْدُ وَالغَيْلَم',
    latin: 'THE MONKEY & THE TURTLE',
    type: 'قصة مصورة',
    year: '٢٠٢٥',
    length: 'إعلان القصة',
    yt: 'O1xRcQWH_t0',
    scene: 'figs',
    read: 'https://mdwn.studio/Ghailam/',
    tagline: 'صداقة على شجرة تين، وقلبٌ مطلوب في عرض البحر.',
    body: [
      'من كليلة ودمنة: صداقة بين قرد وغيلم توطدت بتبادل الطعام والود، حتى ادّعت زوجة الغيلم أن دواءها الوحيد قلب القرد، فحاول الغيلم أن يحتال على صديقه.',
      'ينجو القرد بذكائه حين يزعم أنه ترك قلبه على الشجرة. قصة مصورة من ١٨ صفحة نشرناها مع منصة 505error، وهذا الإعلان يعرّفك بها.'
    ],
    crew: ['سيناريو', 'رسم', 'تلوين', 'حروف'],
    stats: [
      { n: 3.1, u: 'ألف', l: 'مشاهدة للإعلان' },
      { n: 141, l: 'إعجابًا' },
      { n: 25, l: 'تعليقًا' },
      { n: 18, u: 'صفحة', l: 'في القصة المصورة' }
    ],
    facts: [
      { k: 'النوع', v: 'قصة مصورة' },
      { k: 'الأصل', v: 'كليلة ودمنة' },
      { k: 'بالشراكة مع', v: '505error' },
      { k: 'نُشر الإعلان', v: '٢١ أغسطس ٢٠٢٥' },
      { k: 'مدة الإعلان', v: '٢٨ ثانية' }
    ],
    theme: { bg: '#e2eff5', sky: '#bfe0ee', deep: '#1d3526', ink: '#1f2b30', accent: '#8cc63f', accent2: '#f5b92b', pop: '#3f7d1c', cloud: '#ffffff', light: true }
  }
};
