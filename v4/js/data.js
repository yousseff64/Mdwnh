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
    kicker: 'مسلسل قصير · قريبًا',
    art: 'assets/img/hujra.webp',
    scene: 'eyes',                // its project page's world (js/scenes.js)
    align: 'end',                 // logo sits at the right edge of the art
    body: 'تظن أن بابك مغلق، لكن هل جربت فتحه حقًا؟ أحيانًا يكون العائق في عقلك وحده. شاهد التشويقة الرسمية، ثم اقرأ الحكاية كاملة في ٤٣ صفحة.',
    primary: { label: 'أعرف المزيد', href: 'project.html?id=hujra' },
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
    kicker: 'فيلم قصير · جديد',
    art: 'assets/img/samarqand.webp',
    scene: 'leaves',
    align: 'center',              // logo sits centred in the art
    body: 'فتى حالم يحمل رسالة سمرقند إلى الحاكم الذي يقود المعتدين، في رحلة محفوفة بالغموض والعجائب. شاهد الفيلم، ثم اقرأ الحكاية كاملة في ٥١ صفحة.',
    primary: { label: 'أعرف المزيد', href: 'project.html?id=samarqand' },
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
  { id: 'samarqand', name: 'قضية سمرقند', role: 'فيلم قصير', year: '٢٠٢٦', cover: 'assets/img/covers/samarqand.webp', accent: '#e0a36b' },
  { id: 'ghamam', name: 'غمام', role: 'فيلم قصير', year: '٢٠٢٦', cover: 'assets/img/covers/ghamam.webp', accent: '#9b7cf2' },
  { id: 'hujra', name: 'باب الحجرة', role: 'مسلسل قصير', year: '٢٠٢٦', cover: 'assets/img/covers/hujra.webp', accent: '#8fd0ff' },
  { id: 'lis', name: 'اللص التقي', role: 'حكاية مرسومة', year: '٢٠٢٤', cover: 'assets/img/covers/lis.webp', accent: '#f3d9a4' },
  { id: 'fasl', name: 'فصل عجيب', role: 'برنامج علمي', year: '٢٠٢٥', cover: 'assets/img/covers/fasl.webp', accent: '#c35bff' },
  { id: 'qird', name: 'القرد والغيلم', role: 'قصة مصورة', year: '٢٠٢٥', cover: 'assets/img/covers/qird.webp', accent: '#8cc63f' }
];

/* ----------------------------------------------------------- إنجازاتنا ---
   `verified` numbers were read from the public channel pages on 2026-09-07.
   `sourced` numbers come from the شخصية العميل المثالي research doc, dated
   2026-08-27. Swap them the moment you have exact figures.
--------------------------------------------------------------------------- */
export const STATS = [
  { id: 'yt', label: 'مشترك في يوتيوب', value: 37400, display: '٣٧٫٤ ألف', accent: 'ember', verified: true, href: 'https://www.youtube.com/@Mdwn.c' },
  { id: 'views', label: 'مشاهدة على يوتيوب', value: 1523657, display: '١٫٥ مليون', accent: 'sky', verified: true, href: 'https://www.youtube.com/@Mdwn.c' },
  { id: 'ig', label: 'متابع في إنستغرام', value: 55000, display: '٥٥ ألف', accent: 'sun', verified: false, href: 'https://www.instagram.com/mdwn.c/' },
  { id: 'tt', label: 'إعجاب على تيك توك', value: 79200, display: '٧٩٫٢ ألف', accent: 'mint', verified: true, href: 'https://www.tiktok.com/@mdwn.c' },
  { id: 'disc', label: 'عضو في نادي المدونة', value: 1284, display: '١٬٢٨٤', accent: 'ember', verified: false, href: 'https://discord.gg/RBtp2JVXm6' },
  { id: 'films', label: 'عمل منشور', value: 115, display: '١١٥', accent: 'sky', verified: true, href: 'https://www.youtube.com/@Mdwn.c/videos' }
];

/* ---------------------------------------------------- ماذا قالوا عنا ---
   The field سراج falls through. Everything here is a message someone could
   plausibly have sent about the studio, in the place they would have sent it.

     t     which surface it came from
             yt  a YouTube comment, dark card with an avatar
             wa  an outgoing WhatsApp bubble, green
             wi  an incoming WhatsApp bubble, light
             x   a post on X, dark card with a handle
     d     depth. The lens is focused around 0.75, so 0.15 is a huge blurred
           shape right in front of the camera and 1.9 is a small dark one far
           behind. Both ends go soft, only the middle is sharp.
     n     likes, where the surface shows them
     hi    featured. Keep it to six or seven. These are the only sharp ones:
           they ride in front of سراج at the focus depth, and the rest of the
           field is blurred behind them so the page has a few things to read
           instead of sixty. The featured rows are real YouTube comments, copied
           as written (typos included), with the name, age and likes they had
           when they were captured.
     av    avatar image, cropped from the comment screenshot. Without it the
           card gets a coloured initial.
     loved the channel hearted it, shown the way YouTube shows it

   side, vertical order and tilt are derived in fall.js so this table stays
   readable and stays easy to add to.
--------------------------------------------------------------------------- */
export const COMMENTS = [
  { t: 'wa', x: 'شفت الحلقة الجديدة؟؟', d: 1.25 },
  { t: 'yt', u: '@mnop4424', av: 'assets/img/avatars/mnop4424.webp', at: 'قبل ٤ أشهر', x: 'الصراح مجهود تُرفع له القبعة', n: 348, d: 0.8, hi: 1, loved: 1 },
  { t: 'wi', x: 'لسه، بس الناس تمدح فيها', d: 0.95 },
  { t: 'x', u: '@abdullah_k', at: '٥ س', x: 'الرسم والموسيقى والقصة، كل شي في محله', n: 96, d: 1.5 },
  { t: 'yt', u: '@lamees_w', at: 'قبل أسبوع', x: 'قعدت أعيد المشهد الأخير عشر مرات', n: 274, d: 0.2 },
  { t: 'wa', x: 'خلاص أنا مقتنع، هذولا شغلهم عالمي', d: 0.7 },
  { t: 'yt', u: '@turki3009', at: 'قبل ٤ أشهر', x: 'ودي أشتغل معكم بصراحة، شغلكم يحمس', n: 61, d: 1.05 },
  { t: 'wi', x: 'أرسل لي الرابط لما تشوفها 🙏', d: 1.65 },
  { t: 'yt', u: '@65c_c', av: 'assets/img/avatars/65c_c.webp', at: 'قبل ٣ أشهر', x: 'ياخوي ذا استديو كامل تبارك الله والله تشكرون على المجهود ذا', n: 1, d: 0.72, hi: 1 },
  { t: 'yt', u: '@fundit0', av: 'assets/img/avatars/fundit0.webp', at: 'قبل ٤ أشهر', x: 'الأن هذا الي اسميه كرتون عربي!\nمو تجيبلي شخصيات رسمها طفولي وحتى ملابسها وشكلها وقصة العمل ما يمثل العرب وتسميه كرتون عربي!\nجُهد يُثى عليه، احسنتم', n: 140, d: 0.78, hi: 1 },
  { t: 'wa', x: 'ولا كأنه شغل عربي والله', d: 1.85 },
  { t: 'yt', u: '@rgd_2', at: 'قبل يومين', x: 'صوت الشخصية طلع من قلبها، ما توقعت', n: 44, d: 0.88 },
  { t: 'wi', x: 'أنا بكيت لا تحكم عليّ', d: 0.55 },
  { t: 'yt', u: '@omar.fh', at: 'قبل ٣ أسابيع', x: 'المدونة أحسن حاجة في مصر والخليج مع بعض', n: 205, d: 1.35 },
  { t: 'wa', x: 'تابعتهم من ٢٠١٩ وشفت التطور سنة بسنة', d: 0.68 },
  { t: 'yt', u: '@dana.rsm', at: 'قبل شهرين', x: 'كل حلقة أحس إنكم رفعتم السقف عن اللي قبلها. الحلقة الرابعة تحديدًا كانت نقلة، الإضاءة فيها شي ثاني.', n: 158, d: 0.8 },
  { t: 'x', u: '@yzn_9', at: '٤ أيام', x: 'الخلفيات لوحات، حرفيًا لوحات', n: 89, d: 1.6 },
  { t: 'yt', u: '@amal.writes', at: 'قبل ٧ أشهر', x: 'السيناريو محترم، ما فيه ولا جملة زايدة', n: 312, d: 0.25 },
  { t: 'wi', x: 'وش اسم الاستوديو؟', d: 1.15 },
  { t: 'wa', x: 'مدونة ستوديو، اكتبها في يوتيوب', d: 0.92 },
  { t: 'yt', u: '@fahad__', at: 'قبل شهر', x: 'انتظرت هذا المشروع سنة وما خاب ظني', n: 121, d: 0.74 },
  { t: 'x', u: '@joud_ah', at: '٥ أيام', x: 'شاركتها مع كل أصحابي، تستاهل', n: 67, d: 1.45 },
  { t: 'yt', u: '@m.alqahtani', at: 'قبل ٨ أشهر', x: 'من أول ثانية عرفت إن الشغل مدروس', n: 431, d: 0.48 },
  { t: 'wa', x: 'الكواليس اللي نزلوها أمس، شفتها؟ تفصيل الشخصيات ياخذ شهور', d: 0.76 },
  { t: 'yt', u: '@rital.k', at: 'قبل ٣ أيام', x: 'استمروا، هذا اللي ينقص المحتوى العربي', n: 254, d: 1.1 },
  { t: 'yt', u: '@Qtb8leem', av: 'assets/img/avatars/qtb8leem.webp', at: 'قبل ٣ أشهر', x: 'ما شاء الله تبارك الرحمن أداء خرافي أرجو من الله أن يظهر تعليقي أمامكم أرجوكم استمروا إن شاء الله بفترة وجيزة ستلقون رواجا كبيرا و يرزقكم الله على ذلك بأجر الدنيا و الآخرة', n: 4, d: 0.6, hi: 1 },
  { t: 'yt', u: '@zsalem', at: 'قبل شهرين', x: 'ابني عمره ٧ سنين وحفظ الأغنية كاملة', n: 189, d: 1.75 },
  { t: 'x', u: '@bassel.mo', at: '٢ س', x: 'التفاصيل في الخلفيات تخليك توقف الفيديو عشان تتفرج', n: 143, d: 0.71 },
  { t: 'wa', x: 'صراحة فخور إن هذا شغل عربي', d: 0.3 },
  { t: 'yt', u: '@hind_alz', at: 'قبل ٦ أشهر', x: 'شكرًا لأنكم ما استسهلتم. يبين إن كل لقطة أخذت وقتها.', n: 366, d: 0.82 },
  { t: 'wi', x: 'متى الحلقة الجاية؟؟', d: 1.3 },
  { t: 'yt', u: '@saeed.q', at: 'قبل أسبوعين', x: 'الميكس الصوتي نظيف جدًا، سمعتها بسماعات وانبهرت', n: 98, d: 0.66 },
  { t: 'x', u: '@nawaf7', at: '١ ي', x: 'هذا اللي نبيه: قصة عربية بجودة عالمية', n: 402, d: 1.55 },
  { t: 'wa', x: 'حجزت الحلقة عشان أشوفها بالليل بتركيز', d: 0.86 },
  { t: 'yt', u: '@xaSKULLxa', av: 'assets/img/avatars/xaskullxa.webp', at: 'قبل ٣ أشهر', x: 'والله اعضم ما شفت ذي السنة و ربي يشهد لكم والله رفعتو روسنا يارجال و ارفع القبعة لمؤدين الصوت خصيصا لريان وحبيت ان مافيه موسيقى وراح ادعي بكل صلاة على اني اشوف شيء افضل من ذا باذن الله منكم', n: 5, d: 0.64, hi: 1 },
  { t: 'wi', x: 'ما أصدق إن هذا شغل استوديو صغير', d: 1.2 },
  { t: 'yt', u: '@ka_almutairi', at: 'قبل ٣ أشهر', x: 'الشخصية الثانوية سرقت المشهد بصراحة', n: 77, d: 0.9 },
  { t: 'wa', x: 'قلت لك تستاهل المتابعة 👌', d: 1.9 },
  { t: 'x', u: '@ghaida.s', at: '٧ س', x: 'أعدت المقدمة ثلاث مرات عشان الموسيقى', n: 130, d: 0.73 },
  { t: 'yt', u: '@a.almansour', at: 'قبل سنة', x: 'تابعتكم من أول فيديو والفرق شاسع. أنتم دليل إن الاستمرار يصنع الفرق، وإن الشغل العربي يقدر يوصل.', n: 588, d: 0.79 },
  { t: 'wi', x: 'حطيتها في القائمة، بشوفها اليوم', d: 1.4 },
  { t: 'yt', u: '@mohd.gh', at: 'قبل شهر', x: 'أحسن نهاية شفتها هالسنة', n: 164, d: 0.28 },
  { t: 'yt', u: '@memo0w0dendra', av: 'assets/img/avatars/memo0w0dendra.webp', at: 'قبل ٤ أشهر', x: 'العظمة ده لو مطلعش ترند يكسر الدنيا فا بلا شك المشكلة في أذواق الناس مليون في المية! لما سمعت الفيلم حسيت بكمية توتر و ألم من نوع غريب، حسيت انه يب ده أنا! أنا بحس بكدة. المؤثرات الصوتية خطييييررةةةة كنت خايفة يكون في موسيقي بس كالعادة كنتم عند حسن ظني♡♡♡', n: 103, d: 0.35, hi: 1 },
  { t: 'x', u: '@reem_writes', at: '٣ ي', x: 'الحوار مكتوب بلهجة طبيعية مو متكلفة', n: 112, d: 1.7 },
  { t: 'yt', u: '@sultan.v', at: 'قبل ٥ أشهر', x: 'الكاميرا في المشهد الأخير، من علمكم كذا', n: 245, d: 0.84 },
  { t: 'wi', x: 'ذا الاستوديو مستقبله كبير', d: 1.0 },
  { t: 'yt', u: '@bshayer.n', at: 'قبل يوم', x: 'صدق قالوا: القصة الجيدة ما تحتاج ميزانية ضخمة، تحتاج ناس تحب شغلها. شكرًا مدونة.', n: 309, d: 0.75 },
  { t: 'wa', x: 'الموسيقى التصويرية لحالها تستاهل ألبوم', d: 0.58 },
  { t: 'yt', u: '@faisal.rn', at: 'قبل ٩ أشهر', x: 'أول عمل عربي أحس فيه إن المخرج يعرف وش يبي بالضبط', n: 276, d: 1.28 },
  { t: 'wi', x: 'وريتها لأمي وقالت ودها تشوف الباقي', d: 0.22 },
  { t: 'x', u: '@t_alharbi', at: '١١ س', x: 'كل ثانية فيها شغل. احترم هذا الجهد.', n: 91, d: 0.86 },
  { t: 'yt', u: '@shahad.mk', at: 'قبل ٧ أيام', x: 'الألوان في المشهد الليلي، ما شاء الله', n: 133, d: 1.62 },
  { t: 'wa', x: 'أرسلها في القروب لا تنسى', d: 1.05 },
  { t: 'yt', u: '@ibrahim_z', at: 'قبل شهرين', x: 'تابعت الكواليس وفهمت كم هذا صعب. من الستوري بورد إلى المكساج، شغل استوديو كامل بناس معدودين.', n: 421, d: 0.77 },
  { t: 'wi', x: 'ذكرني بأفلام كنا نشوفها زمان بس أحلى', d: 0.5 },
  { t: 'x', u: '@maha.des', at: '٢ ي', x: 'الهوية البصرية للمشروع نظيفة ومتسقة', n: 58, d: 1.42 },
  { t: 'wa', x: 'صار عندي أمل في المحتوى العربي 🤍', d: 0.68 },
  { t: 'yt', u: '@nasser.k9', at: 'قبل ٤ أشهر', x: 'شفتها ثلاث مرات ولقيت تفاصيل جديدة كل مرة', n: 197, d: 0.93 },
  { t: 'wi', x: 'قاعد أنتظر الجزء الثاني من زمان', d: 1.78 },
  { t: 'yt', u: '@areej.h', at: 'قبل أسبوع', x: 'الشخصيات لها ملامح تميزها، مو نسخ من بعض', n: 104, d: 0.32 },
  { t: 'x', u: '@salman.vfx', at: '٨ س', x: 'التكوين في اللقطة الافتتاحية درس بحد ذاته', n: 168, d: 0.74 },
  { t: 'wa', x: 'قلت لك من زمان تابعهم', d: 1.18 },
  { t: 'yt', u: '@ليتنينجمة', av: 'assets/img/avatars/laytani-najma.webp', at: 'قبل ٤ أشهر', x: 'مو من عادتي اعلق بس هذا العمل عنجد يمثل حالتي الآن ، أنا أشكركم لأنكم عملتوا هل عمل لأنه عنجد لامس قلبي خاصةً أني فاهمة احساس غمام جاني احساس البكية لما شفت الفيديو لأنه كل موقف عم يصير مع غمام عم تصير معي هلئ عنجد عم أحس الجامعة صعبة و عم أحس في منافسات كثيرة و أهلي ما اكتير يساعدون نفسيًا لما قال أنه أنا فاشل والله حاسة فيها و عارفة شعوره\nمره سيء الشعور\nالله يجزاكم خير لأنكم عملتوا هل العمل\nوادعولي تمر هل فترة على خير', n: 18, d: 0.42, hi: 1 }
];

/* -------------------------------------------------------- أين تجدنا؟ --- */
export const SOCIALS = [
  { id: 'yt', name: 'يوتيوب', handle: '@Mdwn.c', note: 'الأفلام والحلقات كاملة', href: 'https://www.youtube.com/@Mdwn.c', accent: 'ember', icon: 'smile' },
  { id: 'ig', name: 'إنستغرام', handle: '@mdwn.c', note: 'الإعلانات والكواليس أولًا', href: 'https://www.instagram.com/mdwn.c/', accent: 'sun', icon: 'sparkles' },
  { id: 'tt', name: 'تيك توك', handle: '@mdwn.c', note: 'مقاطع سريعة ولحظات مختارة', href: 'https://www.tiktok.com/@mdwn.c', accent: 'mint', icon: 'spiral' },
  { id: 'dc', name: 'ديسكورد', handle: 'نادي المدونة', note: 'التحديات والنقاش والتصويت', href: 'https://discord.gg/RBtp2JVXm6', accent: 'sky', icon: 'hash' }
];

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
    type: 'فيلم قصير',
    year: '٢٠٢٦',
    length: 'أقل من ٣ دقائق',
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
      { k: 'النوع', v: 'فيلم قصير' },
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
      { k: 'المدة', v: '١٠:٣٧' },
      { k: 'الموسيقى', v: 'بلا موسيقى' }
    ],
    theme: { bg: '#131317', sky: '#2a2a33', deep: '#08080a', ink: '#f3f3f6', accent: '#e8edf5', accent2: '#8e97a8', pop: '#c9d3e3', cloud: '#34343d' }
  },
  hujra: {
    name: 'بَابُ الحُجْرَة',
    latin: 'BAB AL HUJRA',
    type: 'مسلسل قصير',
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
      { k: 'النوع', v: 'مسلسل قصير' },
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
      { k: 'السلسلة', v: 'مدونة الرسم' },
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
