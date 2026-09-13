/* ============================================================
   MDWNH STUDIO — Site Data
   Projects gallery + latest work. Edit here to add content.
   ============================================================ */

const BANNER_BASE = 'Our Projects/Project Banners/';

const TAG_LABELS = {
  'انيميشن': 'انيميشن',
  'موشن': 'موشن',
  'مونتاج': 'مونتاج',
  'تصوير': 'تصوير',
  'رسم': 'رسم',
  'هوية': 'هوية بصرية',
  'تقرير': 'تقرير',
  'تصميم': 'تصميم',
  'اداء_صوتي': 'أداء صوتي',
  'كتابة_محتوى': 'كتابة محتوى'
};

/* Tags shown as filter pills (order matters) */
const FILTER_TAGS = ['انيميشن', 'موشن', 'مونتاج', 'تصوير', 'رسم', 'هوية', 'تصميم', 'تقرير'];

const PROJECTS = [
  {
    id: 'ghayam',
    name: 'غمام',
    banner: 'انيميشن فيلم غمام.png',
    tags: ['انيميشن'],
    link: 'https://www.youtube.com/watch?v=bCkfuh_2yUE',
    rank: 'best'
  },
  {
    id: 'mentad',
    name: 'منطاد',
    banner: 'منطاد.PNG',
    tags: ['انيميشن', 'كتابة_محتوى', 'اداء_صوتي'],
    link: 'https://drive.google.com/file/d/1obX-1MrAnyfPOpR54tIq2kaxiPZHTBFT/view?usp=drive_link',
    rank: 'normal'
  },
  {
    id: 'layali_ramadaniya',
    name: 'ليالي رمضانية',
    banner: 'ليالي رمضانية.png',
    tags: ['تصوير', 'مونتاج', 'تقرير'],
    link: 'https://drive.google.com/file/d/1feyokSoRAiao3HQPIp9Q93P7x4jLASDq/view?usp=drive_link',
    rank: 'best'
  },
  {
    id: 'salam_podcast',
    name: 'بودكاست سلام مكنون',
    banner: 'بودكاست سلام مكنون.png',
    tags: ['مونتاج'],
    link: 'https://youtu.be/NBYt33ZIAwQ?si=xXadp3IISJoOcpdk',
    rank: 'noteworthy'
  },
  {
    id: 'reading_club',
    name: 'نادي القراءة',
    banner: 'نادي القراءة.PNG',
    tags: ['موشن', 'اداء_صوتي', 'كتابة_محتوى'],
    link: 'https://drive.google.com/file/d/1YZI_se_uPn8_m_AnDtosoUvJD69F9K40/view?usp=drive_link',
    rank: 'normal'
  },
  {
    id: 'jazeel',
    name: 'جزيل',
    banner: 'جزيل.PNG',
    tags: ['موشن', 'كتابة_محتوى', 'اداء_صوتي'],
    link: 'https://www.tiktok.com/@jazeel_sa/video/7555792389336632594?is_from_webapp=1&sender_device=pc',
    rank: 'noteworthy'
  },
  {
    id: 'makashdana_video',
    name: 'مشكدانة',
    banner: 'مكشدانة.PNG',
    tags: ['مونتاج'],
    link: 'https://www.tiktok.com/@meskdinh/video/7612734451545607444?is_from_webapp=1&sender_device=pc',
    rank: 'noteworthy'
  },
  {
    id: 'makashdana',
    name: 'هوية مشكدانة',
    banner: 'هوية بصرية مكشدانة.png',
    tags: ['تصميم', 'هوية'],
    link: 'https://drive.google.com/file/d/1wmbLkvBaMnr1pqcZWthbkmmi4AM7T9Qk/view?usp=sharing',
    rank: 'best'
  },
  {
    id: 'salammaknoon',
    name: 'هوية سلام مكنون',
    banner: 'هوية بصرية سلام مكنون.png',
    tags: ['تصميم', 'هوية'],
    link: 'https://drive.google.com/file/d/1MLPC2jAs-A8wRxpmds0r2B_0nVpk8pCx/view?usp=sharing',
    rank: 'normal'
  },
  {
    id: 'daralez',
    name: 'دار العز',
    banner: 'هوية بصرية دار العز.png',
    tags: ['تصميم', 'هوية'],
    link: 'https://drive.google.com/file/d/1W8flJbTCrACtWXVwTV7xBWK_Ek9AXT5O/view?usp=share_link',
    rank: 'best'
  },
  {
    id: 'yaghilam-photo',
    name: 'يا غلام',
    banner: 'تصوير يا غلام.png',
    tags: ['تصوير'],
    link: 'https://www.youtube.com/watch?si=3M34xAVU513aswp3&v=h9WQT7gMP6E&feature=youtu.be',
    rank: 'noteworthy'
  },
  {
    id: 'samarqand',
    name: 'قضية سمرقند',
    banner: 'رسم سمرقند.png',
    tags: ['رسم'],
    link: 'https://mdwn.studio/Samrqand/',
    rank: 'noteworthy'
  },
  {
    id: 'maallah-motion',
    name: 'مع الله (موشن)',
    banner: 'موشن مع الله.png',
    tags: ['موشن', 'مونتاج'],
    link: 'https://drive.google.com/file/d/1IEyk8RVUqM660I4-37H8c-nbn8lppEyx/view?usp=share_link',
    rank: 'noteworthy'
  },
  {
    id: 'asma',
    name: 'اسمى',
    banner: 'تقرير اسمى.png',
    tags: ['موشن', 'مونتاج', 'تقرير'],
    link: 'https://drive.google.com/file/d/1eVx9LMkE6VpkPiiNnb9w_3nKdYOhxt-y/view?usp=share_link',
    rank: 'normal'
  },
  {
    id: 'bab',
    name: 'باب الحجرة',
    banner: 'رسم باب الحجرة.png',
    tags: ['رسم'],
    link: 'https://mdwn.studio/Hujra/',
    rank: 'noteworthy'
  },
  {
    id: 'harason',
    name: 'الحراساثون للدراسات الأمنية',
    banner: 'تصوير الحراساثون.png',
    tags: ['تصوير', 'مونتاج', 'تقرير'],
    link: 'https://drive.google.com/file/d/1AKPFm-08Zm8y3W_brVrSOJwtQ1pyCnRz/view?usp=share_link',
    rank: 'noteworthy'
  },
  {
    id: 'risha',
    name: 'نادي الاعتماد الرياضي',
    banner: 'تصوير ريشة - نادي الاعتماد الرياضي.png',
    tags: ['تصوير', 'مونتاج', 'تقرير'],
    link: 'https://drive.google.com/file/d/1xghsfy_6WF0QdQ03970-lxO9ftH2FCeC/view?usp=share_link',
    rank: 'normal'
  },
  {
    id: 'maallah-anim',
    name: 'مع الله (انيميشن)',
    banner: 'انيميشن مع الله.png',
    tags: ['انيميشن'],
    link: 'https://drive.google.com/file/d/17cnXj6XOPxtrlFWOdOi3hDfbyx_vD65B/view?usp=share_link',
    rank: 'noteworthy'
  },
  {
    id: 'dalilak',
    name: 'مرشدك لأفضل التطبيقات القرآنية',
    banner: 'تصميم دليلك.png',
    tags: ['تصميم'],
    link: 'https://drive.google.com/file/d/1IqkTdp959MSKbWw_6yIHODAs3YpHVLy9/view?usp=share_link',
    rank: 'normal'
  },
  {
    id: 'ananas',
    name: 'أناناس',
    banner: ' مونتاج- موشن اناناس.png',
    tags: ['موشن'],
    link: 'https://drive.google.com/file/d/1xiXUISFp6O69Q-e8D02kaH-3koqdbtiZ/view?usp=share_link',
    rank: 'noteworthy'
  },
  {
    id: 'mashaer-yateem',
    name: 'مشاعر يتيم',
    banner: 'انيميشن مشاعر يتيم.png',
    tags: ['رسم'],
    link: 'https://www.youtube.com/watch?si=Q-ch3v0bzWUfBrHb&v=LV0ljvjeYA8&feature=youtu.be',
    rank: 'best'
  },
  {
    id: 'maanabi-motion',
    name: 'مع النبي',
    banner: 'موشن مع النبي.png',
    tags: ['موشن'],
    link: 'https://drive.google.com/file/d/1mf1NzPyyJbGfWtSOLEneZKJHIOZKvnGj/view?usp=share_link',
    rank: 'noteworthy'
  },
  {
    id: 'maanabi-edit',
    name: 'مع النبي',
    banner: 'مونتاج مع النبي.png',
    tags: ['مونتاج'],
    link: 'https://drive.google.com/file/d/1NFOyBJreTm_yQOFwlCXzRAOcshID3h-L/view?usp=share_link',
    rank: 'noteworthy'
  }
];

/* Team member images */
const TEAM_INNER = [
  'MdwnhSections/photo_3_2026-01-20_11-34-16.jpg',
  'MdwnhSections/photo_5_2026-01-20_11-34-16.jpg',
  'MdwnhSections/photo_6_2026-01-20_11-34-16.jpg',
  'MdwnhSections/photo_7_2026-01-20_11-34-16.jpg',
  'MdwnhSections/photo_8_2026-01-20_11-34-16.jpg'
];

const TEAM_MEMBERS = [
  'IMG_7096.png', 'IMG_7098.png', 'IMG_7100.png', 'IMG_7101.png', 'IMG_7102.png',
  'IMG_7103.png', 'IMG_7104.png', 'IMG_7105.png', 'IMG_7106.png', 'IMG_7107.png',
  'IMG_7108.png', 'IMG_7109.png', 'IMG_7110.png', 'IMG_7111.png', 'IMG_7112.png',
  'IMG_7113.png', 'IMG_7114.png', 'IMG_7115.png', 'IMG_7116.png', 'IMG_7117.png',
  'IMG_7118.png', 'IMG_7119.png', 'IMG_7120.png', 'IMG_7121.png', 'IMG_7122.png',
  'IMG_7123.png', 'IMG_7124.png', 'IMG_7125.png', 'IMG_7126.png', 'IMG_7127.png',
  'IMG_7128.png', 'IMG_7129.png', 'IMG_7130.png', 'IMG_7131.png', 'IMG_7132.png',
  'IMG_7133.png', 'IMG_7134.png', 'IMG_7135.png'
].map(f => 'Siraj-members/' + f);
