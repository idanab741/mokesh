# Builds the boutique studio pages: studio.html (Hebrew, RTL) and studio-en.html (English, LTR)
# from one template. Usage: python3 build_studio.py /home/user/mokesh/mokesh-vercel
import json, os, sys, urllib.parse

OUT = sys.argv[1]
FR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'frag')
def frag(n): return open(os.path.join(FR, n), encoding='utf-8').read()

APPLE, PLAY, WA_SVG, AX_SVG = frag('apple.svg'), frag('play.svg'), frag('wa.svg'), frag('ax.svg')
TOOLS = json.load(open(os.path.join(FR, 'tools.json'), encoding='utf-8'))
ILL = json.load(open(os.path.join(FR, 'illus.json'), encoding='utf-8'))
SV_HALO = ['rgba(30,155,240,.26)', 'rgba(237,234,227,.10)', 'rgba(10,109,254,.24)', 'rgba(37,49,253,.42)', 'rgba(237,234,227,.10)']
SV_ALT_EN = {
  'איור: אפליקציה בשני טלפונים, עם אישור בחנויות': 'Illustration: one app on two phones, approved in the stores',
  'איור: סקיצה של מסך שהופכת למוצר מוכן': 'Illustration: a screen sketch turning into a finished product',
  "איור: צ'אט עם בינה מלאכותית שמחזיר תשובה מסודרת": 'Illustration: an AI chat returning a well-structured answer',
  'איור: משחק בזמן אמת עם טיימר, שחקנים וניקוד': 'Illustration: a real-time game with a timer, players and a score',
  'איור: עמוד נחיתה במחשב ובטלפון, עם גרף הורדות שעולה': 'Illustration: a landing page on desktop and phone, with a rising downloads chart'}
FORMJS_HE = frag('formjs.html')
HEADAX = frag('headax.html')

IL = '<svg viewBox="0 0 22 16" aria-hidden="true"><rect width="22" height="16" fill="#fff"/><rect y="2" width="22" height="2.3" fill="#0038B8"/><rect y="11.7" width="22" height="2.3" fill="#0038B8"/><path d="M11 4.9l2.5 4.35h-5zM11 11.1l-2.5-4.35h5z" fill="none" stroke="#0038B8" stroke-width=".75"/></svg>'
US = '<svg viewBox="0 0 22 16" aria-hidden="true"><rect width="22" height="16" fill="#fff"/><g fill="#B22234"><rect width="22" height="1.23"/><rect y="2.46" width="22" height="1.23"/><rect y="4.92" width="22" height="1.23"/><rect y="7.38" width="22" height="1.23"/><rect y="9.85" width="22" height="1.23"/><rect y="12.31" width="22" height="1.23"/><rect y="14.77" width="22" height="1.23"/></g><rect width="9.6" height="8.6" fill="#3C3B6E"/><g fill="#fff"><circle cx="1.6" cy="1.5" r=".45"/><circle cx="4.8" cy="1.5" r=".45"/><circle cx="8" cy="1.5" r=".45"/><circle cx="3.2" cy="3.4" r=".45"/><circle cx="6.4" cy="3.4" r=".45"/><circle cx="1.6" cy="5.3" r=".45"/><circle cx="4.8" cy="5.3" r=".45"/><circle cx="8" cy="5.3" r=".45"/><circle cx="3.2" cy="7.1" r=".45"/><circle cx="6.4" cy="7.1" r=".45"/></g></svg>'

WA_HE_TXT = 'היי, הגעתי מהאתר של IA STUDIO ואשמח לשמוע פרטים.'
WA_EN_TXT = 'Hi, I found the IA STUDIO website and would like to hear more.'

T = {
'he': dict(
  lang='he', dir='rtl', ar='←', path='/studio', other='/studio-en',
  title='IA STUDIO',
  desc='IA STUDIO – סטודיו לאפליקציות ומוצרים דיגיטליים. רעיונות גדולים מתחילים כאן: מהאפיון והעיצוב ועד הפיתוח וההשקה, הכול במקום אחד.',
  ogdesc='רעיונות גדולים מתחילים כאן. מהאפיון והעיצוב ועד הפיתוח וההשקה, הכול במקום אחד.', og='og-he-2.jpg',
  skip='דילוג לתוכן הראשי', nav=['עבודות', 'שירותים', 'תהליך', 'שאלות'], cta='התחילו פרויקט', langgroup='שפה',
  eb='סטודיו לאפליקציות ומוצרים דיגיטליים',
  h1a='רעיונות גדולים', h1b='מתחילים כאן.',
  lede='מהאפיון והעיצוב ועד הפיתוח וההשקה. הכול במקום אחד, בלי להתפשר על הפרטים הקטנים.',
  sig='', towork='לעבודות',
  capr='Triplace · מוקש! · ב-App Store וב-Google Play',
  work_h='עבודות.', work_g='מוצרים חיים.', work_p='',
  tp_sub='הדרך החדשה לתכנן טיול', tp_desc='מחליקים על מקומות, רואים מה החברים המליצו, ומקבלים מסלול מוכן יום אחרי יום.',
  tp_alt1='Triplace: המפה של החברים', tp_alt2='Triplace: מסך הבית',
  mk_name='מוקש!', mk_sub='משחק המסיבות שכולם צועקים בו', mk_desc='מסבירים מילה לקבוצה, והיריבים טומנים שלוש מילים שאסור להגיד. אונליין, בטלפון אחד או מול המחשב.',
  mk_img1='/studio-assets/m_boom.webp', mk_img2='/studio-assets/m_home.webp', mk_alt1='מוקש!: מסך הבום', mk_alt2='מוקש!: מסך הבית',
  mk_play='לשחק בדפדפן', mk_url='https://mokesh-psi.vercel.app/app', hl='he', apple_tp='https://apps.apple.com/il/app/triplace/id6757530943', apple_mk='https://apps.apple.com/il/app/id6829290776',
  lp_h='עמודי נחיתה.', lp_g='עמוד לכל מוצר.', lp_p='עמוד מהיר שמסביר את המוצר ומביא הורדות. לפעמים עם המוצר עצמו בתוכו.',
  lp_tp_desc='TripMatch שאפשר להחליק עליו, והצבעה חיה על מסלול.', lp_mk_desc='משחק אמיתי בתוך העמוד, בעברית ובאנגלית.',
  lp_mk_href='/app', lp_mk_url='mokesh-psi.vercel.app/app', lp_mk_img='/studio-assets/lp_mk_d.webp', lp_mk_m='/studio-assets/lp_mk_m.webp', lp_view='לצפייה בעמוד',
  lp_tp_alt='Triplace: עמוד הנחיתה', lp_mk_alt='מוקש!: עמוד הנחיתה',
  cd_name='קפטן דמיון', lp_cd_desc='סדרת ספרי ילדים. עמוד חשוך שמדליקים בפנס.', lp_cd_alt='קפטן דמיון: עמוד הנחיתה',
  sv_h='מה אנחנו בונים.', sv_g='ואיך.', sv_p='כל פרויקט מתחיל בשיחה ונגמר בחנות. באמצע: אפיון, עיצוב ופיתוח, באותן ידיים.',
  sv=[('אפליקציות לחנויות', 'אפליקציה אחת לאייפון ולאנדרואיד, עם כניסה דרך Apple ו-Google, דפי חנות ולוח בקרה. עד האישור של אפל וגוגל.', 'Triplace · מוקש!'),
      ('גרסה ראשונה', 'רק מה שצריך כדי לבדוק את הרעיון מול משתמשים אמיתיים. הצעה במחיר קבוע, עם רשימה ברורה של מה נכנס.', 'מחיר קבוע'),
      ('מוצרים עם <span class="lat">AI</span>', 'בינה מלאכותית שעושה עבודה אמיתית בתוך המוצר: עונה, ממליצה ובונה בשביל המשתמש.', 'טריפי'),
      ('משחקים בזמן אמת', 'חדרים, קבוצות, שלבים והישגים. אונליין, בטלפון אחד או מול המחשב.', 'מוקש!'),
      ('עמודי נחיתה', 'עמוד שמסביר את המוצר ומביא הורדות ופניות, מותאם לטלפון.', 'עברית · <span class="lat">English</span>')],
  pr_h='ארבעה שלבים.', pr_g='מרעיון לחנות.', pr_p='מהשיחה הראשונה ועד החנות, עד 8 שבועות. הזמן המדויק תלוי בהיקף.',
  pr=[('אפיון', 'מה בונים, למי, ומה נכנס לגרסה הראשונה.'), ('עיצוב', 'מיתוג, דמות ומסכים, עד שזה מרגיש שלכם.'),
      ('פיתוח', 'גרסה חיה כבר מההתחלה, נבדקת על אייפון ואנדרואיד.'), ('השקה', 'דפי חנות, בדיקת אפל וגוגל, ולוח בקרה מהיום הראשון.')],
  tl_h='כלים.', tl_g='שבנו את המוצרים.',
  fq_h='שאלות.', fq_g='לפני שמתחילים.',
  fq=[('כמה זמן לוקח לבנות אפליקציה?', 'מרעיון ועד החנות זה לוקח עד 8 שבועות, כולל הבדיקה של אפל וגוגל. הזמן המדויק תלוי בהיקף של המוצר.'),
      ('כמה זה עולה?', 'תלוי בהיקף. אחרי שיחת אפיון קצרה מקבלים הצעה במחיר קבוע לגרסה הראשונה, עם רשימה ברורה של מה כלול.'),
      ('אתם מעלים את האפליקציה לחנויות?', 'כן. דפי חנות, צילומי מסך, מדיניות פרטיות ותשובות לבודקים, עד האישור ב-App Store וב-Google Play.'),
      ('של מי הקוד והאפליקציה?', 'שלכם. האפליקציה עולה תחת חשבון המפתח שלכם, והקוד מועבר אליכם במלואו.')],
  ct_eb='פרויקט חדש', ct_h='יש לכם רעיון?', ct_g='בואו נדבר.', ct_p='כתבו כמה שורות. נחזור עם הצעה לגרסה ראשונה: מה נכנס, כמה זמן, וכמה זה עולה.',
  f_aria='טופס פנייה', f_name='שם מלא', f_phone='טלפון', f_email='מייל', f_opt='(לא חובה)', f_msg='ספרו לנו על הרעיון',
  f_note='הפרטים ישמשו רק כדי לחזור אליכם בנוגע לפנייה. אין חובה למסור אותם, אבל בלעדיהם לא נוכל לחזור אליכם. הפירוט המלא ב<a href="/studio-privacy">מדיניות הפרטיות</a>.',
  f_send='שליחת הפנייה', f_wa='וואטסאפ', wa_txt=WA_HE_TXT,
  copy='© 2026 IA Studio · עידן עבודי', legal_aria='מסמכים משפטיים',
  legal=[('/studio-terms', 'תנאי שימוש'), ('/studio-privacy', 'מדיניות פרטיות'), ('/studio-accessibility', 'הצהרת נגישות')], ax_open='התאמות נגישות',
  fab_wa='שליחת הודעה בוואטסאפ (נפתח בחלון חדש)', fab_ax='תפריט נגישות', ax_title='התאמות נגישות',
  ax=['הגדלת הטקסט', 'רגיל', 'ניגודיות גבוהה', 'הדגשת קישורים', 'עצירת אנימציות', 'גופן קריא', 'איפוס ההתאמות', 'הצהרת נגישות'],
),
'en': dict(
  lang='en', dir='ltr', ar='→', path='/studio-en', other='/studio',
  title='IA STUDIO',
  desc='IA STUDIO – An app and digital product studio. Big ideas start here: from strategy and design to development and launch, all in one place.',
  ogdesc='Big ideas start here. From strategy and design to development and launch, all in one place.', og='og-en-2.jpg',
  skip='Skip to main content', nav=['Work', 'Services', 'Process', 'FAQ'], cta='Start a project', langgroup='Language',
  eb='An app &amp; digital product studio',
  h1a='Big ideas', h1b='start here.',
  lede='From strategy and design to development and launch. All in one place, without compromising on the small details.',
  sig='', towork='See the work',
  capr='Triplace · Blast! · on the App Store and Google Play',
  work_h='Work.', work_g='Live products.', work_p='',
  tp_sub='A new way to plan a trip', tp_desc='Swipe through places, see what your friends recommend, and get a ready-made itinerary, day by day.',
  tp_alt1='Triplace: the friends map', tp_alt2='Triplace: home screen',
  mk_name='Blast!', mk_sub='The party game everyone ends up shouting at', mk_desc='Explain a word to your team while your rivals plant three words you can’t say. Online, on one phone, or against the computer.',
  mk_img1='/app-assets/en/boom.webp', mk_img2='/app-assets/en/home.webp', mk_alt1='Blast!: the boom screen', mk_alt2='Blast!: home screen',
  mk_play='Play in the browser', mk_url='https://mokesh-psi.vercel.app/app-en', hl='en', apple_tp='https://apps.apple.com/app/triplace/id6757530943', apple_mk='https://apps.apple.com/app/id6829290776',
  lp_h='Landing pages.', lp_g='One for every product.', lp_p='A fast page that explains the product and brings in downloads. Sometimes with the product itself inside it.',
  lp_tp_desc='A swipeable TripMatch and live voting on an itinerary.', lp_mk_desc='A real game inside the page, in English and Hebrew.',
  lp_mk_href='/app-en', lp_mk_url='mokesh-psi.vercel.app/app-en', lp_mk_img='/studio-assets/lp_mken_d.webp', lp_mk_m='/studio-assets/lp_mken_m.webp', lp_view='View the page',
  lp_tp_alt='Triplace: landing page', lp_mk_alt='Blast!: landing page',
  cd_name='Captain Dimyon', lp_cd_desc='A children\'s book series. A dark page you light up with a flashlight.', lp_cd_alt='Captain Dimyon: landing page',
  sv_h='What we build.', sv_g='And how.', sv_p='Every project starts with a conversation and ends in the store. In between: strategy, design and development, by the same hands.',
  sv=[('Apps for the stores', 'One app for iPhone and Android, with Sign in with Apple and Google, store listings and an admin dashboard. All the way to Apple and Google approval.', 'Triplace · Blast!'),
      ('A first version', 'Only what you need to test the idea with real users. A fixed-price proposal, with a clear list of what’s in.', 'Fixed price'),
      ('AI-powered products', 'AI that does real work inside the product: it answers, recommends and builds things for the user.', 'Trippy'),
      ('Real-time games', 'Rooms, teams, levels and achievements. Online, on one phone, or against the computer.', 'Blast!'),
      ('Landing pages', 'A mobile-first page that explains the product and brings in downloads and inquiries.', 'English · Hebrew')],
  pr_h='Four steps.', pr_g='Idea to store.', pr_p='From the first conversation to the stores, up to 8 weeks. The exact time depends on the scope.',
  pr=[('Strategy', 'What we build, for whom, and what goes into the first version.'), ('Design', 'Branding, character and screens, until it feels like yours.'),
      ('Development', 'A live build from the start, tested on iPhone and Android.'), ('Launch', 'Store listings, Apple and Google review, and a dashboard from day one.')],
  tl_h='Tools.', tl_g='That built our products.',
  fq_h='Questions.', fq_g='Before we start.',
  fq=[('How long does it take to build an app?', 'From idea to the stores takes up to 8 weeks, including Apple and Google review. The exact timeline depends on the scope of the product.'),
      ('How much does it cost?', 'It depends on the scope. After a short discovery call you get a fixed-price proposal for the first version, with a clear list of what’s included.'),
      ('Do you publish the app to the stores?', 'Yes. Store listings, screenshots, a privacy policy and replies to the reviewers, all the way to approval on the App Store and Google Play.'),
      ('Who owns the code and the app?', 'You do. The app is published under your own developer account, and the full code is handed over to you.')],
  ct_eb='', ct_h='Have an idea?', ct_g='Let’s talk.', ct_p='Write a few lines. We’ll come back with a proposal for a first version: what’s in it, how long it takes and what it costs.',
  f_aria='Contact form', f_name='Full name', f_phone='Phone', f_email='Email', f_opt='(optional)', f_msg='Tell us about the idea',
  f_note='We use these details only to get back to you about your inquiry. They’re optional, but without them we can’t reply. Full details in our <a href="/studio-privacy" hreflang="he">privacy policy</a> (in Hebrew).',
  f_send='Send', f_wa='WhatsApp', wa_txt=WA_EN_TXT,
  copy='© 2026 IA Studio · Idan Abudi', legal_aria='Legal',
  legal=[('/studio-terms', 'Terms of use (HE)'), ('/studio-privacy', 'Privacy policy (HE)'), ('/studio-accessibility', 'Accessibility statement (HE)')], ax_open='Accessibility settings',
  fab_wa='Message us on WhatsApp (opens in a new window)', fab_ax='Accessibility menu', ax_title='Accessibility settings',
  ax=['Text size', 'Normal', 'High contrast', 'Highlight links', 'Stop animations', 'Readable font', 'Reset', 'Accessibility statement (HE)'],
)}

# script strings for the English page (the Hebrew script is the source)
JS_EN = [
  ("var SRC_NAMES={ig:'אינסטגרם',fb:'פייסבוק',wa:'וואטסאפ',tt:'טיקטוק',li:'לינקדאין'};", "var SRC_NAMES={ig:'Instagram',fb:'Facebook',wa:'WhatsApp',tt:'TikTok',li:'LinkedIn'};"),
  ("+' (דרך '+SRC_LABEL+')'", "+' (via '+SRC_LABEL+')'"),
  ("btn.textContent='שליחה בוואטסאפ';", "btn.textContent='Send via WhatsApp';"),
  ("'כתבו את השם שלכם'", "'Please enter your name'"),
  ("'כתבו מספר טלפון תקין, למשל 050-1234567'", "'Please enter a valid phone number, e.g. +972 50-123-4567'"),
  ("'כתובת המייל לא נראית תקינה'", "'This email address doesn’t look right'"),
  ("'כתבו כמה מילים על הרעיון'", "'Write a few words about the idea'"),
  ("return 'פנייה מהאתר של IA STUDIO\\nשם: '+F.name.value.trim()+'\\nטלפון: '+F.phone.value.trim()+(F.email.value.trim()?'\\nמייל: '",
   "return 'Inquiry from the IA STUDIO website\\nName: '+F.name.value.trim()+'\\nPhone: '+F.phone.value.trim()+(F.email.value.trim()?'\\nEmail: '"),
  ("+(SRC_LABEL?'\\n\\n(דרך '+SRC_LABEL+')':'')", "+(SRC_LABEL?'\\n\\n(via '+SRC_LABEL+')':'')"),
  ("a.textContent=' לשליחה בוואטסאפ';", "a.textContent=' send it on WhatsApp';"),
  ("say('יש שדות שצריך לתקן.','bad');", "say('Some fields need fixing.','bad');"),
  ("say('פותחים את וואטסאפ עם הפרטים שמילאתם. נשאר רק ללחוץ שם על \"שליחה\".','good');", "say('Opening WhatsApp with your details. Just tap “Send” there.','good');"),
  ("btn.textContent='שולחים…';", "btn.textContent='Sending…';"),
  ("subject:'פנייה חדשה מהאתר של IA STUDIO'+", "subject:'פנייה חדשה מהאתר של IA STUDIO (אנגלית)'+"),
  ("say('קיבלנו את הפנייה. נחזור אליכם בהקדם.','good');", "say('Got it. We’ll be in touch soon.','good');"),
  ("fail('השליחה לא הצליחה. אפשר לנסות שוב, או',", "fail('Sending failed. You can try again, or',"),
  ("fail('אין חיבור לשרת כרגע. אפשר לנסות שוב, או',", "fail('We can’t reach the server right now. You can try again, or',"),
  ("var ZL=['רגיל','גדול','גדול מאוד'];", "var ZL=['Normal','Large','Extra large'];"),
]

CSS = r'''
/* Layout: עמוד בצבע עצם, שקט כמו הקאבר. פחם רק כמסגרת לעבודות, ללוגו ולפנייה. קווי שיער במקום כרטיסים, מרווחים נדיבים */
:root{
  --bone:#EDEAE3; --bone2:#E4E0D7; --paper:#F4F2ED; --ink:#0B0B0C; --ink2:#3E3C37; --mute:#66615A; --soft:#8A857B;
  --rule:rgba(11,11,12,.13); --coal:#0E0E10; --coal2:#17171A; --cfg2:#A1A1A6; --cmute:#9B968C;
  --he:"Heebo",-apple-system,"SF Hebrew","Segoe UI",Arial,sans-serif; --lat:"Inter","Heebo",-apple-system,"Helvetica Neue",Arial,sans-serif;
  --ease:cubic-bezier(.16,1,.3,1);
  color-scheme:light;
}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:calc(68px + env(safe-area-inset-top,0px) + 24px)}
body{background:var(--bone);color:var(--ink);font-family:var(--body);font-size:17px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden}
h1,h2,h3,h4,p,ul,ol,dl,dd{margin:0;padding:0}
ul,ol{list-style:none}
a{color:inherit;text-decoration:none}
img{display:block;max-width:100%}
.lat{font-family:var(--lat);direction:ltr;unicode-bidi:isolate}
.wrap{max-width:1200px;margin:0 auto;padding-left:max(24px,env(safe-area-inset-left,0px));padding-right:max(24px,env(safe-area-inset-right,0px))}
:focus-visible{outline:2px solid var(--ink);outline-offset:3px;border-radius:6px}
::selection{background:var(--ink);color:var(--bone)}
main:focus{outline:none}
.skip{position:fixed;top:8px;inset-inline-start:8px;z-index:400;background:var(--ink);color:var(--bone);font-weight:700;padding:12px 18px;border-radius:12px;transform:translateY(-200%);transition:transform .2s}
.skip:focus{transform:none}

/* nav */
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:61;background:var(--bone)}
.nav{position:sticky;top:env(safe-area-inset-top,0px);z-index:60;background:rgba(237,234,227,.86);backdrop-filter:saturate(160%) blur(14px);-webkit-backdrop-filter:saturate(160%) blur(14px);border-bottom:1px solid transparent;transition:border-color .4s}
.nav.solid{border-color:var(--rule)}
.nav .wrap{display:flex;align-items:center;gap:28px;height:68px}
.wm{font-family:var(--lat);font-weight:800;letter-spacing:-.045em;font-size:19px;direction:ltr;unicode-bidi:isolate}
.nav ul{display:flex;gap:28px;font-size:14.5px;color:var(--ink2);margin-inline-start:auto}
.nav ul a{transition:color .3s}.nav ul a:hover{color:var(--ink)}
.nav .end{display:flex;align-items:center;gap:14px;margin-inline-start:28px}
.flags{display:flex;gap:4px;padding:3px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--rule)}
.flags a{width:30px;height:30px;border-radius:50%;display:grid;place-items:center;opacity:.45;transition:opacity .3s}
.flags a:hover{opacity:1}
.flags a.on{opacity:1;background:var(--paper);box-shadow:0 0 0 1px var(--rule)}
.flags svg{width:20px;height:14px;border-radius:2.5px;display:block;box-shadow:0 0 0 .5px rgba(0,0,0,.28)}
.pill{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:48px;padding:0 24px;border-radius:999px;background:var(--ink);color:var(--bone);font-weight:600;font-size:15.5px;border:0;cursor:pointer;font-family:inherit;transition:background .3s,transform .3s var(--ease)}
.pill:hover{background:#2A2926}
.pill .ar{transition:transform .35s var(--ease)}
.pill:hover .ar{transform:translateX(var(--nudge))}
.pill.sm{height:38px;padding:0 16px;font-size:14px}
.lnk{font-weight:600;font-size:15.5px;border-bottom:1px solid currentColor;padding-bottom:2px;transition:opacity .3s}
.lnk:hover{opacity:.65}

/* hero */
.hero{padding-block:clamp(45px,7vw,98px) clamp(31px,4.2vw,56px)}
.eb{font-size:13px;font-weight:600;color:var(--mute);display:flex;align-items:center;gap:12px}
.eb .lat{letter-spacing:.18em;font-size:12px}
.eb i{width:28px;height:1px;background:currentColor;opacity:.8}
.hero h1{font-weight:800;font-size:var(--h1);line-height:.98;letter-spacing:-.045em;margin-top:18px;text-wrap:balance}
.hero h1 span{color:var(--soft)}
.hero .row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:40px;align-items:end;margin-top:clamp(24px,2.8vw,38px);padding-top:20px;border-top:1px solid var(--rule)}
.hero .lede{font-size:clamp(18px,1.7vw,22px);color:var(--ink2);max-width:28em;line-height:1.55}
.hero .sig{display:block;margin-top:10px;font-size:14px;color:var(--mute)}
.hero .acts{display:flex;align-items:center;gap:24px}

/* framed wordmark */
.frame{background:var(--coal);border-radius:clamp(22px,3vw,36px);padding:clamp(20px,3.5vw,45px) clamp(22px,5vw,64px) clamp(14px,2.1vw,24px);overflow:hidden}
.frame .wfill{width:100%;aspect-ratio:2000/348;background:url(/studio-assets/collage.webp) 0 50%/auto 115% repeat-x;-webkit-mask:url(/studio-assets/word-mask.png) center/100% 100% no-repeat;mask:url(/studio-assets/word-mask.png) center/100% 100% no-repeat;animation:pan var(--dur,60s) linear infinite}
@keyframes pan{to{background-position:var(--pw,-3000px) 50%}}
.frame .cap{display:flex;justify-content:space-between;gap:16px;margin-top:clamp(14px,2.1vw,24px);padding-top:12px;border-top:1px solid rgba(255,255,255,.1);color:var(--cfg2);font-size:13.5px}
.frame .cap .lat{letter-spacing:.16em;font-size:12px}

/* sections */
.sec{padding-top:clamp(59px,7vw,105px)}
.sh{padding-bottom:20px;border-bottom:1px solid var(--rule)}
.sh h2{font-weight:800;font-size:clamp(36px,4.8vw,64px);line-height:1.02;letter-spacing:-.04em;text-wrap:balance}
.sh h2 span{color:var(--soft)}
.sh p{color:var(--ink2);font-size:17.5px;max-width:32em}

/* work */
.work{margin-top:clamp(20px,2.8vw,34px);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(16px,2.2vw,28px)}
.wk{display:flex;flex-direction:column;gap:13px;min-width:0}
.wk .shot{border-radius:clamp(20px,2.4vw,30px);aspect-ratio:4/3.3;overflow:hidden;display:flex;align-items:flex-end;justify-content:center;gap:5%;padding-top:8%}
.wk .shot img{width:35%;border-radius:22px 22px 0 0;box-shadow:0 0 0 5px #000,0 0 0 6px #2a2a2e;transition:transform .8s var(--ease)}
.wk .shot img+img{width:30%;margin-bottom:-3%}
.wk:hover .shot img{transform:translateY(-6px)}
.wk:hover .shot img+img{transform:translateY(-3px)}
.wk .meta{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:14px;align-items:center;padding-bottom:12px;border-bottom:1px solid var(--rule)}
.wk .meta img{width:42px;height:42px;border-radius:11px}
.wk .meta b{font-size:21px;font-weight:800;letter-spacing:-.02em;display:block;line-height:1.2}
.wk .meta small{color:var(--mute);font-size:14px}
.wk .tag{font-family:var(--lat);font-size:11.5px;color:var(--mute);letter-spacing:.16em}
.wk p{color:var(--ink2);font-size:16.5px;max-width:34em}
.wk .acts{display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px}
.store{display:inline-flex;align-items:center;gap:8px;height:42px;padding:0 14px;border-radius:12px;background:var(--ink);color:#fff;font-family:var(--lat);font-size:10.5px;line-height:1.1;direction:ltr;transition:opacity .3s}
.store:hover{opacity:.8}
.store svg{width:20px;height:20px;fill:#fff;flex:none}
.store b{display:block;font-size:15px;font-weight:600;letter-spacing:-.01em}

/* landing pages */
.lps{margin-top:clamp(20px,2.8vw,34px);display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(16px,2.2vw,28px)}
@media (min-width:961px){.lps{grid-template-columns:repeat(3,minmax(0,1fr))}}
.lp{display:flex;flex-direction:column;gap:12px;min-width:0}
.lp .scr{position:relative;background:var(--coal);border-radius:clamp(18px,2vw,26px);padding:clamp(18px,2.6vw,30px);overflow:hidden}
.lp .brw{width:82%;margin-left:auto;border-radius:10px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,.1);transition:transform .8s var(--ease)}
.lp .brw img{width:100%}
.lp .ph{position:absolute;left:clamp(14px,2vw,24px);bottom:clamp(14px,2vw,24px);width:23%;aspect-ratio:300/650;border-radius:clamp(10px,1.4vw,16px);padding:3px;background:#000;box-shadow:0 0 0 1px rgba(255,255,255,.16),0 24px 40px -12px rgba(0,0,0,.9);transition:transform .8s var(--ease)}
.lp .ph img{width:100%;height:100%;object-fit:cover;border-radius:clamp(8px,1.1vw,13px)}
.lp.flip .brw{margin-left:0;margin-right:auto}
.lp.flip .ph{left:auto;right:clamp(14px,2vw,24px)}
.lp:hover .brw{transform:translateY(-4px)}
.lp:hover .ph{transform:translateY(-8px)}
.lp .row{display:flex;justify-content:space-between;align-items:baseline;gap:16px;padding-bottom:14px;border-bottom:1px solid var(--rule)}
.lp h3{font-size:20px;font-weight:800;letter-spacing:-.02em}
.lp p{color:var(--ink2);font-size:16px}
.lp .go{font-size:14px;font-weight:600;white-space:nowrap}

/* services */
.svc li{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:clamp(24px,5vw,80px);align-items:center;padding:clamp(20px,2.4vw,31px) 0;border-bottom:1px solid var(--rule)}
.svc li:nth-child(even) .vis{order:2}
.svc .vis{position:relative;aspect-ratio:520/380;border-radius:clamp(20px,2.4vw,30px);overflow:hidden;background:radial-gradient(60% 65% at 50% 75%,var(--halo,transparent),transparent 72%),var(--coal)}
.svc .vis svg.svart{position:absolute;inset:0;width:100%;height:100%;display:block}
.svc .tx{display:flex;flex-direction:column;gap:12px;min-width:0}
.svc h3{font-size:clamp(26px,3vw,40px);font-weight:800;letter-spacing:-.035em;line-height:1.08}
.svc p{color:var(--ink2);font-size:17px;max-width:30em}
.svc .ex{align-self:flex-start;margin-top:8px;font-size:13px;color:var(--mute);padding:5px 12px;border-radius:999px;box-shadow:inset 0 0 0 1px var(--rule)}
@media (prefers-reduced-motion:no-preference){
  .svart .fl1{animation:svfl 7s ease-in-out infinite}
  .svart .fl2{animation:svfl 9s ease-in-out -3s infinite}
  .svart .fl3{animation:svfl 6s ease-in-out -1.5s infinite}
  .svart .dot{animation:svdt 1.4s ease-in-out infinite}
  .svart .dot.d1{animation-delay:.18s}.svart .dot.d2{animation-delay:.36s}
}
@keyframes svfl{0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
@keyframes svdt{0%,60%,100%{opacity:.35}30%{opacity:1}}

/* process */
.steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid var(--rule)}
.steps li{padding:21px 0 24px;padding-inline-end:28px;position:relative}
.steps li+li{padding-inline-start:28px;border-inline-start:1px solid var(--rule)}
.steps .art{height:150px;border-radius:18px;background:var(--coal);margin-bottom:15px;overflow:hidden}
.steps .art svg{width:100%;height:100%;display:block}
.steps .n{font-family:var(--lat);font-size:12px;letter-spacing:.16em;color:var(--mute)}
.a1 .ln{stroke:var(--bone);stroke-width:2;fill:none;stroke-dasharray:200;stroke-dashoffset:200}
.in .a1 .ln{animation:draw 2.4s var(--ease) forwards}
.in .a1 .ln:nth-child(2){animation-delay:.25s}.in .a1 .ln:nth-child(3){animation-delay:.45s}.in .a1 .ln:nth-child(4){animation-delay:.6s}.in .a1 .ln:nth-child(5){animation-delay:.75s}.in .a1 .ln:nth-child(6){animation-delay:.9s}
@keyframes draw{to{stroke-dashoffset:0}}
.a2 circle{transform-box:fill-box;transform-origin:center;transform:scale(0)}
.in .a2 circle{animation:pop .8s var(--ease) forwards}
.in .a2 circle:nth-child(2){animation-delay:.15s}.in .a2 circle:nth-child(3){animation-delay:.3s}.in .a2 circle:nth-child(4){animation-delay:.45s}
@keyframes pop{to{transform:scale(1)}}
.a2 .cur{animation:cur 3.4s var(--ease) infinite}
@keyframes cur{0%,100%{transform:translate(0,0)}50%{transform:translate(-36px,10px)}}
.a3 rect.cl{transform-box:fill-box;transform-origin:right;transform:scaleX(0)}
.in .a3 rect.cl{animation:type 3.6s steps(14) infinite}
.in .a3 rect.cl:nth-of-type(2){animation-delay:.3s}.in .a3 rect.cl:nth-of-type(3){animation-delay:.6s}.in .a3 rect.cl:nth-of-type(4){animation-delay:.9s}.in .a3 rect.cl:nth-of-type(5){animation-delay:1.2s}
@keyframes type{0%{transform:scaleX(0)}40%,85%{transform:scaleX(1)}100%{transform:scaleX(1);opacity:0}}
.a4 .rk{animation:up 2.8s var(--ease) infinite}
@keyframes up{0%{transform:translateY(26px);opacity:0}25%,70%{transform:translateY(0);opacity:1}100%{transform:translateY(-30px);opacity:0}}
.a4 .ck{stroke-dasharray:30;stroke-dashoffset:30}
.in .a4 .ck{animation:draw 1s .6s var(--ease) forwards}
/* with motion off, show every illustration in its finished state */
.still .a1 .ln,.still .a4 .ck{stroke-dashoffset:0}.still .a2 circle,.still .a3 rect.cl{transform:none}
.steps h3{font-size:24px;font-weight:700;letter-spacing:-.025em;margin-top:14px}
.steps p{color:var(--ink2);font-size:16px;margin-top:8px}

/* tools */
.tools{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));border-bottom:1px solid var(--rule)}
.tool{display:flex;align-items:center;gap:12px;padding:14px 16px;border-top:1px solid var(--rule);direction:ltr;min-width:0}
.tool svg{width:20px;height:20px;flex:none;fill:var(--ink2);transition:fill .4s}
.tool:hover svg{fill:var(--c)}
.tool span{font-family:var(--lat);font-size:14px;font-weight:600;color:var(--ink2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tools .tool:nth-child(-n+5){border-top:0}

/* faq */
.faq details{border-bottom:1px solid var(--rule)}
.faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:18px 0;font-size:clamp(19px,2vw,24px);font-weight:700;letter-spacing:-.02em}
.faq summary::-webkit-details-marker{display:none}
.faq summary i{width:16px;height:16px;position:relative;flex:none}
.faq summary i::before,.faq summary i::after{content:"";position:absolute;inset:7px 0 auto;height:2px;background:var(--ink);transition:transform .4s var(--ease)}
.faq summary i::after{transform:rotate(90deg)}
.faq details[open] summary i::after{transform:rotate(0)}
.faq details p{color:var(--ink2);font-size:17px;max-width:44em;padding-bottom:20px;margin-top:-4px}

/* contact */
.contact{margin-top:clamp(67px,8.4vw,112px);background:var(--ink);color:var(--bone);border-radius:clamp(26px,3.4vw,44px) clamp(26px,3.4vw,44px) 0 0;padding-block:clamp(50px,6.3vw,84px) calc(max(30px,env(safe-area-inset-bottom,0px)) + 84px)}
.contact :focus-visible{outline-color:var(--bone)}
.contact .eb{color:var(--cmute)}
.contact h2{font-weight:800;font-size:clamp(46px,7.6vw,104px);line-height:.98;letter-spacing:-.045em;margin-top:15px}
.contact h2 span{color:#77726A}
.contact .cg{display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:clamp(30px,5vw,80px);margin-top:clamp(28px,3.5vw,45px);padding-top:21px;border-top:1px solid rgba(237,234,227,.14)}
.contact .lead2{color:#B9B4AA;font-size:17.5px;max-width:26em}
.cform{display:flex;flex-direction:column;gap:20px;min-width:0}
.cform .frow{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.cform .fld{display:flex;flex-direction:column;gap:6px;min-width:0}
.cform label{font-size:13.5px;font-weight:600;color:var(--cmute)}
.cform label .opt{font-weight:400}
.cform input,.cform textarea{font:inherit;font-size:17px;color:var(--bone);background:transparent;border:0;border-bottom:1px solid rgba(237,234,227,.3);border-radius:0;padding:8px 0 10px;width:100%;min-width:0;transition:border-color .25s}
.cform textarea{resize:vertical;min-height:96px;line-height:1.5}
.cform input:focus,.cform textarea:focus{outline:none;border-bottom-color:var(--bone)}
.cform [aria-invalid="true"]{border-bottom-color:#FF8A80}
.cform .err{font-size:13.5px;font-weight:600;color:#FF8A80}
.cform .err:empty{display:none}
.cform .hp{position:absolute;inset-inline-start:-9999px;width:1px;height:1px;opacity:0}
.cform .fnote{font-size:13.5px;color:var(--cmute);max-width:60ch}
.cform .fnote a{text-decoration:underline;text-underline-offset:3px;color:var(--bone)}
.cform .factions{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.cform .pill{background:var(--bone);color:var(--ink);height:52px;padding:0 28px;font-size:16px}
.cform .pill:hover{background:#fff}
.cform .pill[disabled]{opacity:.6;cursor:default}
.cform .wa{display:inline-flex;align-items:center;gap:10px;height:52px;padding:0 22px;border-radius:999px;color:var(--bone);font-weight:600;font-size:15.5px;box-shadow:inset 0 0 0 1px rgba(237,234,227,.3);transition:box-shadow .3s}
.cform .wa:hover{box-shadow:inset 0 0 0 1px var(--bone)}
.cform .wa svg{width:18px;height:18px;fill:currentColor}
.cform .fstatus{min-height:1.5em;font-size:15.5px;font-weight:600}
.cform .fstatus.good{color:#8FDCA0}
.cform .fstatus.bad{color:#FF8A80}
.cform .fstatus a{text-decoration:underline}
.cform .fstatus small{display:block}
.foot{display:flex;justify-content:space-between;align-items:center;gap:14px 24px;flex-wrap:wrap;margin-top:clamp(49px,6.3vw,84px);padding-top:18px;border-top:1px solid rgba(237,234,227,.14);color:#8A857B;font-size:13.5px}
.foot .wm{color:var(--bone)}
.legal{display:flex;flex-wrap:wrap;gap:6px 18px}
.legal a,.legal button{font:inherit;color:#B9B4AA;background:none;border:0;padding:0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}

/* reveal (visible at rest; only content below the fold animates in) */
/* loader: 000 -> 100, dark curtain */
.loader{position:fixed;inset:0;z-index:300;background:#0B0B0C;color:#EDEAE3;display:flex;flex-direction:column;justify-content:space-between;padding:max(24px,env(safe-area-inset-top,0px)) max(24px,env(safe-area-inset-left,0px)) max(24px,env(safe-area-inset-bottom,0px));clip-path:inset(0 0 0 0);transition:clip-path 1.05s cubic-bezier(.76,0,.24,1)}
.loader.out{clip-path:inset(0 0 100% 0)}
.loader .lt{display:flex;justify-content:space-between;align-items:center;font:600 13px Inter,system-ui,sans-serif;letter-spacing:.14em;color:#9B968C;direction:ltr}
.loader .lt b{color:#EDEAE3;font-weight:800;letter-spacing:-.01em;font-size:15px}
.loader .cnt{font-family:Inter,system-ui,sans-serif;font-weight:800;font-size:clamp(110px,24vw,340px);line-height:.8;letter-spacing:-.06em;direction:ltr;text-align:left;font-variant-numeric:tabular-nums;color:#EDEAE3}
.loader .bar{height:2px;background:rgba(237,234,227,.16);margin-top:18px;position:relative;overflow:hidden}
.loader .bar i{position:absolute;inset:0 auto 0 0;width:0;background:#EDEAE3;display:block}
html.ld body{overflow:hidden}
html.ld .hero .eb,html.ld .hero h1,html.ld .hero .row{opacity:0;transform:translateY(26px)}
.hero .eb,.hero h1,.hero .row{transition:opacity 1s var(--ease),transform 1.1s var(--ease)}
.hero h1{transition-delay:.08s}.hero .row{transition-delay:.18s}
@media (prefers-reduced-motion:reduce){.loader{display:none}html.ld body{overflow:auto}html.ld .hero .eb,html.ld .hero h1,html.ld .hero .row{opacity:1;transform:none}}
.rv{transition:opacity 1s var(--ease),transform 1s var(--ease)}
.rv.pre{opacity:0;transform:translateY(22px)}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.rv.pre{opacity:1;transform:none}html{scroll-behavior:auto}.a1 .ln,.a4 .ck{stroke-dashoffset:0}.a2 circle,.a3 rect.cl{transform:none}}

/* floating buttons & a11y panel */
.fab{position:fixed;z-index:120;bottom:max(18px,env(safe-area-inset-bottom,0px));width:54px;height:54px;border-radius:50%;display:grid;place-items:center;border:0;cursor:pointer;box-shadow:0 10px 30px -10px rgba(0,0,0,.45),0 0 0 1px rgba(0,0,0,.12);transition:transform .3s var(--ease)}
.fab:hover{transform:translateY(-3px)}
.fab svg{width:26px;height:26px;fill:currentColor}
.fab.wa{inset-inline-end:max(18px,env(safe-area-inset-right,0px));background:#0E7C42;color:#fff}
.fab.ax{inset-inline-start:max(18px,env(safe-area-inset-left,0px));background:var(--ink);color:var(--bone)}
[dir="rtl"] .fab.wa{inset-inline-end:auto;left:max(18px,env(safe-area-inset-left,0px))}
[dir="rtl"] .fab.ax{inset-inline-start:auto;right:max(18px,env(safe-area-inset-right,0px))}
[dir="ltr"] .fab.wa{inset-inline-end:auto;right:max(18px,env(safe-area-inset-right,0px))}
[dir="ltr"] .fab.ax{inset-inline-start:auto;left:max(18px,env(safe-area-inset-left,0px))}
.fab:focus-visible{outline:3px solid var(--ink);outline-offset:3px}
.axp{position:fixed;z-index:121;bottom:calc(max(18px,env(safe-area-inset-bottom,0px)) + 66px);width:min(320px,calc(100vw - 36px));background:#111113;color:#F5F5F7;border-radius:22px;box-shadow:0 24px 60px -18px rgba(0,0,0,.6),inset 0 0 0 1px rgba(255,255,255,.18);padding:18px;display:flex;flex-direction:column;gap:10px}
[dir="rtl"] .axp{right:max(18px,env(safe-area-inset-right,0px))}
[dir="ltr"] .axp{left:max(18px,env(safe-area-inset-left,0px))}
.axp h2{font-size:19px;font-weight:800;letter-spacing:-.02em;margin:0 0 4px}
.axp button.opt{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;font:inherit;font-size:16px;font-weight:600;color:#F5F5F7;background:#1c1c1f;border:0;border-radius:14px;padding:13px 16px;cursor:pointer;text-align:start;box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
.axp button.opt[aria-pressed="true"]{background:var(--bone);color:var(--ink)}
.axp button.opt .st{font-size:13px;font-weight:700;opacity:.8}
.axp .row2{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:4px;font-size:14px}
.axp .row2 a,.axp .row2 button{font:inherit;font-weight:700;color:#EDEAE3;background:none;border:0;padding:6px 0;cursor:pointer;text-decoration:underline;text-underline-offset:3px}
.axp :focus-visible{outline:3px solid #fff;outline-offset:2px}

/* a11y modes (saved in the browser) */
html.ax-z1 main{zoom:1.12}
html.ax-z2 main{zoom:1.25}
html.ax-c{--ink2:#1F1E1B;--mute:#3E3C37;--soft:#55524C;--rule:rgba(11,11,12,.32);--cmute:#E2DED6}
html.ax-c .contact .lead2,html.ax-c .legal a,html.ax-c .legal button{color:#F2EFE8}
html.ax-l a{text-decoration:underline!important;text-underline-offset:3px}
html.ax-l a.pill,html.ax-l a.store,html.ax-l a.fab,html.ax-l .flags a{text-decoration:none!important;box-shadow:inset 0 0 0 2px currentColor}
html.ax-m *,html.ax-m *::before,html.ax-m *::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}
html.ax-m .rv.pre{opacity:1;transform:none}
html.ax-m .a1 .ln,html.ax-m .a4 .ck{stroke-dashoffset:0}html.ax-m .a2 circle,html.ax-m .a3 rect.cl{transform:none}
html.ax-f body,html.ax-f body *{font-family:Arial,"Arial Hebrew","Helvetica Neue",sans-serif!important;letter-spacing:0!important}

@media (max-width:960px){
  .nav ul{display:none}
  .nav .end{margin-inline-start:auto}
  .hero .row,.contact .cg{grid-template-columns:minmax(0,1fr)}
  .work,.lps{grid-template-columns:minmax(0,1fr)}
  .svc li{grid-template-columns:minmax(0,1fr);gap:20px}
  .svc li:nth-child(even) .vis{order:0}
  .steps{grid-template-columns:repeat(2,minmax(0,1fr))}
  .steps li:nth-child(3){padding-inline-start:0;border-inline-start:0;border-top:1px solid var(--rule)}
  .steps li:nth-child(4){border-top:1px solid var(--rule)}
  .tools{grid-template-columns:repeat(3,minmax(0,1fr))}
  .tools .tool:nth-child(-n+5){border-top:1px solid var(--rule)}
  .tools .tool:nth-child(-n+3){border-top:0}
  .tools .tool:last-child:nth-child(3n+1){grid-column:span 3}
}
@media (max-width:560px){
  body{font-size:16px}
  .nav .pill.sm{display:none}
  .hero .acts{flex-wrap:wrap;gap:16px 22px}
  .frame .cap span:last-child{display:none}
  .steps{grid-template-columns:minmax(0,1fr)}
  .steps li,.steps li+li{padding-inline:0;border-inline-start:0}
  .steps li+li{border-top:1px solid var(--rule)}
  .tools{grid-template-columns:repeat(2,minmax(0,1fr))}
  .tools .tool:nth-child(3){border-top:1px solid var(--rule)}
  .tools .tool:last-child:nth-child(3n+1){grid-column:auto}
  .tools .tool:last-child:nth-child(odd){grid-column:span 2}
  .tool{padding:16px 10px;gap:10px}.tool span{white-space:normal;font-size:13.5px;line-height:1.25}
  .cform .frow{grid-template-columns:minmax(0,1fr)}
  .cform .factions>*{flex:1 1 100%}
  .wk .meta{grid-template-columns:auto minmax(0,1fr)}
  .wk .tag{display:none}
}
@media print{.fab,.axp,.nav,.skip{display:none!important}}
'''

MAINJS = r'''<script>
(function(){
  var L=document.getElementById('loader'),cn=document.getElementById('cnt'),bar=document.getElementById('bar'),root=document.documentElement;
  function go(){root.classList.remove('ld');}
  if(!L)return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||root.classList.contains('ax-m')){L.remove();go();return;}
  var t0=performance.now(),D=1500;
  (function tick(now){var p=Math.min(1,(now-t0)/D),e=p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2;cn.textContent=String(Math.round(e*100)).padStart(3,'0');bar.style.width=(e*100)+'%';
    if(p<1)requestAnimationFrame(tick);else setTimeout(function(){L.classList.add('out');setTimeout(go,250);setTimeout(function(){L.remove();},1200);},150);})(t0);
  setTimeout(function(){if(document.body.contains(L)){L.remove();go();}},5000);
})();
</script>
<script>
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nav=document.getElementById('nav');function nv(){nav.classList.toggle('solid',scrollY>8);}addEventListener('scroll',nv,{passive:true});nv();
  /* the collage drifts slowly inside the letters */
  var wf=document.getElementById('wfill');function pw(){var h=wf.getBoundingClientRect().height*1.15;var d=h*3600/435;wf.style.setProperty('--pw',(-d).toFixed(1)+'px');wf.style.setProperty('--dur',Math.max(30,d/25).toFixed(1)+'s');}pw();addEventListener('resize',pw);
  var proc=document.getElementById('proc');
  if(reduce||!('IntersectionObserver' in window)){proc.classList.add('in');return;}
  new IntersectionObserver(function(es,o){es.forEach(function(e){if(e.isIntersecting){proc.classList.add('in');o.disconnect();}});},{threshold:.25}).observe(proc);
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.remove('pre');io.unobserve(e.target);}});},{rootMargin:'0px 0px -6% 0px'});
  document.querySelectorAll('.rv').forEach(function(el){if(el.getBoundingClientRect().top>innerHeight){el.classList.add('pre');io.observe(el);}});
})();
</script>'''


def build(L):
    t = T[L]
    he = L == 'he'
    ar = t['ar']
    wa_url = 'https://wa.me/972548315055?text=' + urllib.parse.quote(t['wa_txt'])
    flags = ('<div class="flags" role="group" aria-label="%s">' % t['langgroup']
             + '<a %shref="/studio" hreflang="he" lang="he" aria-label="עברית"%s>%s</a>' % ('class="on" ' if he else '', ' aria-current="page"' if he else '', IL)
             + '<a %shref="/studio-en" hreflang="en" lang="en" aria-label="English"%s>%s</a>' % ('' if he else 'class="on" ', '' if he else ' aria-current="page"', US)
             + '</div>')
    css = CSS.replace('font-family:var(--body)', 'font-family:%s' % ('var(--he)' if he else 'var(--lat)'))
    css = css.replace(':root{', ':root{\n  --nudge:%s; --h1:%s;' % ('-4px' if he else '4px', 'clamp(50px,9vw,124px)' if he else 'clamp(50px,9vw,124px)'), 1)
    navs = ''.join('<li><a href="#%s">%s</a></li>' % (h, n) for h, n in zip(['work', 'services', 'process', 'faq'], t['nav']))
    def ill(svg):
        if not he:
            for a, b in SV_ALT_EN.items():
                svg = svg.replace('aria-label="%s"' % a, 'aria-label="%s"' % b)
        return svg
    svc = ''.join('<li class="rv"><div class="vis" style="--halo:%s">%s</div><div class="tx"><h3>%s</h3><p>%s</p><span class="ex">%s</span></div></li>' % (SV_HALO[i], ill(ILL['sv'][i]), a, b, c) for i, (a, b, c) in enumerate(t['sv']))
    steps = ''.join('<li class="rv"><div class="art %s" aria-hidden="true">%s</div><span class="n">0%d</span><h3>%s</h3><p>%s</p></li>' % (ILL['art'][i][0], ILL['art'][i][1], i + 1, a, b) for i, (a, b) in enumerate(t['pr']))
    tools = ''.join('<div class="tool" style="--c:%s">%s<span>%s</span></div>' % (c, svg, n) for c, svg, n in TOOLS)
    faq = ''.join('<details><summary>%s<i aria-hidden="true"></i></summary><p>%s</p></details>' % q for q in t['fq'])
    legal = ''.join('<a href="%s"%s>%s</a>' % (h, '' if he else ' hreflang="he"', n) for h, n in t['legal'])
    ax = t['ax']
    js = FORMJS_HE
    if not he:
        for a, b in JS_EN:
            assert js.count(a) == 1, a
            js = js.replace(a, b)
    store = lambda href, svg, top, bot: '<a class="store" href="%s" target="_blank" rel="noopener">%s<span>%s<b>%s</b></span></a>' % (href, svg, top, bot)
    tp_play = 'https://play.google.com/store/apps/details?id=com.triplacetravel.app&amp;hl=' + t['hl']
    mk_play = 'https://play.google.com/store/apps/details?id=com.mokesh.game&amp;hl=' + t['hl']

    html = f'''<!doctype html>
<html lang="{t['lang']}" dir="{t['dir']}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{t['title']}</title>
<meta name="description" content="{t['desc']}">
<meta property="og:title" content="IA STUDIO">
<meta property="og:description" content="{t['ogdesc']}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://mokesh-psi.vercel.app{t['path']}">
<meta property="og:image" content="https://mokesh-psi.vercel.app/studio-assets/{t['og']}">
<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://mokesh-psi.vercel.app/studio-assets/{t['og']}">
<link rel="alternate" hreflang="he" href="https://mokesh-psi.vercel.app/studio"><link rel="alternate" hreflang="en" href="https://mokesh-psi.vercel.app/studio-en">
<link rel="icon" type="image/png" sizes="32x32" href="/studio-assets/favicon-32.png">
<link rel="apple-touch-icon" href="/studio-assets/apple-touch-icon.png">
<meta name="theme-color" content="#EDEAE3">
<style>:root{{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}}body{{margin:0}}[hidden]{{display:none!important}}</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap">
<style>{css}</style>
</head>
<body>
{HEADAX}
<script>document.documentElement.classList.add('ld')</script>
<div class="loader" id="loader" aria-hidden="true">
  <div class="lt"><b>IA STUDIO</b><span>APPS · GAMES · PRODUCTS</span></div>
  <div><div class="cnt" id="cnt">000</div><div class="bar"><i id="bar"></i></div></div>
</div>
<a class="skip" href="#top">{t['skip']}</a>

<header class="nav" id="nav"><div class="wrap">
  <a class="wm" href="#top" aria-label="IA STUDIO">IA STUDIO</a>
  <ul>{navs}</ul>
  <div class="end">{flags}<a class="pill sm" href="#contact">{t['cta']}</a></div>
</div></header>

<main id="top" tabindex="-1">
  <section class="hero"><div class="wrap">
    <p class="eb"><span class="lat">IA STUDIO</span><i></i>{t['eb']}</p>
    <h1>{t['h1a']}<br><span>{t['h1b']}</span></h1>
    <div class="row">
      <p class="lede">{t['lede']}</p>
      <div class="acts"><a class="pill" href="#contact">{t['cta']} <span class="ar" aria-hidden="true">{ar}</span></a><a class="lnk" href="#work">{t['towork']}</a></div>
    </div>
  </div></section>

  <div class="wrap">
    <div class="frame"><div class="wfill" id="wfill" role="img" aria-label="IA STUDIO"></div><div class="cap"><span class="lat">APPS · GAMES · PRODUCTS</span><span>{t['capr']}</span></div></div>

    <section class="sec" id="work">
      <div class="sh rv"><h2>{t['work_h']}<br><span>{t['work_g']}</span></h2></div>
      <div class="work">
        <article class="wk rv">
          <div class="shot" style="background:radial-gradient(ellipse at 50% 100%,rgba(30,155,240,.3),transparent 65%),var(--coal)"><img loading="lazy" decoding="async" src="/studio-assets/t_map.webp?v=3" alt="{t['tp_alt1']}"><img loading="lazy" decoding="async" src="/studio-assets/t_home.webp?v=3" alt="{t['tp_alt2']}"></div>
          <div class="meta"><img loading="lazy" decoding="async" src="/studio-assets/tp_icon.webp?v=2" alt=""><div><b><span class="lat">Triplace</span></b><small>{t['tp_sub']}</small></div><span class="tag">TRAVEL</span></div>
          <p>{t['tp_desc']}</p>
          <div class="acts">{store(t['apple_tp'], APPLE, 'Download on the', 'App Store')}{store(tp_play, PLAY, 'GET IT ON', 'Google Play')}</div>
        </article>
        <article class="wk rv">
          <div class="shot" style="background:radial-gradient(ellipse at 50% 100%,rgba(37,49,253,.38),transparent 65%),var(--coal)"><img loading="lazy" decoding="async" src="{t['mk_img1']}" alt="{t['mk_alt1']}"><img loading="lazy" decoding="async" src="{t['mk_img2']}" alt="{t['mk_alt2']}"></div>
          <div class="meta"><img loading="lazy" decoding="async" src="/studio-assets/mk_icon.webp" alt=""><div><b>{t['mk_name']}</b><small>{t['mk_sub']}</small></div><span class="tag">GAME</span></div>
          <p>{t['mk_desc']}</p>
          <div class="acts">{store(t['apple_mk'], APPLE, 'Download on the', 'App Store')}{store(mk_play, PLAY, 'GET IT ON', 'Google Play')}<a class="lnk" href="{t['mk_url']}" target="_blank" rel="noopener">{t['mk_play']}</a></div>
        </article>
      </div>
    </section>

    <section class="sec" id="landing">
      <div class="sh rv"><h2>{t['lp_h']}<br><span>{t['lp_g']}</span></h2></div>
      <div class="lps">
        <a class="lp rv" href="https://beta.triplace.co.il/download" target="_blank" rel="noopener">
          <div class="scr"><div class="brw"><img loading="lazy" decoding="async" src="/studio-assets/lp_tp_d.webp?v=2" alt="{t['lp_tp_alt']}"></div><div class="ph"><img loading="lazy" decoding="async" src="/studio-assets/lp_tp_m.webp?v=2" alt=""></div></div>
          <div class="row"><h3 class="lat">Triplace</h3><span class="go">{t['lp_view']} <span aria-hidden="true">{ar}</span></span></div>
          <p>{t['lp_tp_desc']}</p>
        </a>
        <a class="lp flip rv" href="{t['lp_mk_href']}" target="_blank" rel="noopener">
          <div class="scr"><div class="brw"><img loading="lazy" decoding="async" src="{t['lp_mk_img']}" alt="{t['lp_mk_alt']}"></div><div class="ph"><img loading="lazy" decoding="async" src="{t['lp_mk_m']}" alt=""></div></div>
          <div class="row"><h3>{t['mk_name']}</h3><span class="go">{t['lp_view']} <span aria-hidden="true">{ar}</span></span></div>
          <p>{t['lp_mk_desc']}</p>
        </a>
        <a class="lp flip rv" href="/captain-dimyon/" target="_blank" rel="noopener">
          <div class="scr"><div class="brw"><img loading="lazy" decoding="async" src="/studio-assets/lp_cd_d.webp" alt="{t['lp_cd_alt']}"></div><div class="ph"><img loading="lazy" decoding="async" src="/studio-assets/lp_cd_m.webp" alt=""></div></div>
          <div class="row"><h3>{t['cd_name']}</h3><span class="go">{t['lp_view']} <span aria-hidden="true">{ar}</span></span></div>
          <p>{t['lp_cd_desc']}</p>
        </a>
      </div>
    </section>

    <section class="sec" id="services">
      <div class="sh rv"><h2>{t['sv_h']}<br><span>{t['sv_g']}</span></h2></div>
      <ul class="svc">{svc}</ul>
    </section>

    <section class="sec" id="process">
      <div class="sh rv"><h2>{t['pr_h']}<br><span>{t['pr_g']}</span></h2></div>
      <ol class="steps" id="proc">{steps}</ol>
    </section>

    <section class="sec" id="tools">
      <div class="sh rv"><h2>{t['tl_h']}<br><span>{t['tl_g']}</span></h2></div>
      <div class="tools rv">{tools}</div>
    </section>

    <section class="sec" id="faq">
      <div class="sh rv"><h2>{t['fq_h']}<br><span>{t['fq_g']}</span></h2></div>
      <div class="faq rv">{faq}</div>
    </section>
  </div>

  <section class="contact" id="contact"><div class="wrap">
    <p class="eb"><span class="lat">NEW PROJECT</span>{('<i></i>' + t['ct_eb']) if t['ct_eb'] else ''}</p>
    <h2>{t['ct_h']}<br><span>{t['ct_g']}</span></h2>
    <div class="cg">
      <p class="lead2">{t['ct_p']}</p>
      <form class="cform" id="cform" novalidate aria-label="{t['f_aria']}">
        <div class="frow">
          <div class="fld"><label for="cf-name">{t['f_name']}</label><input id="cf-name" name="name" type="text" autocomplete="name" required maxlength="80" aria-describedby="cf-name-e"><span class="err" id="cf-name-e"></span></div>
          <div class="fld"><label for="cf-phone">{t['f_phone']}</label><input id="cf-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="20" dir="ltr"{' style="text-align:right"' if he else ''} aria-describedby="cf-phone-e"><span class="err" id="cf-phone-e"></span></div>
        </div>
        <div class="fld"><label for="cf-email">{t['f_email']} <span class="opt">{t['f_opt']}</span></label><input id="cf-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="120" dir="ltr"{' style="text-align:right"' if he else ''} aria-describedby="cf-email-e"><span class="err" id="cf-email-e"></span></div>
        <div class="fld"><label for="cf-msg">{t['f_msg']}</label><textarea id="cf-msg" name="message" rows="3" required maxlength="2000" aria-describedby="cf-msg-e"></textarea><span class="err" id="cf-msg-e"></span></div>
        <input class="hp" type="checkbox" name="botcheck" tabindex="-1" autocomplete="off" aria-hidden="true">
        <p class="fnote">{t['f_note']}</p>
        <div class="factions"><button class="pill" type="submit" id="cf-send">{t['f_send']}</button><a class="wa" id="cf-wa" href="{wa_url}" target="_blank" rel="noopener">{WA_SVG}{t['f_wa']}</a></div>
        <div class="fstatus" id="cf-status" role="status" aria-live="polite"></div>
      </form>
    </div>
    <div class="foot"><span class="wm">IA STUDIO</span><span>{t['copy']}</span><nav class="legal" aria-label="{t['legal_aria']}">{legal}<button type="button" id="ax-open2">{t['ax_open']}</button></nav></div>
  </div></section>
</main>

<a class="fab wa" href="{wa_url}" target="_blank" rel="noopener" aria-label="{t['fab_wa']}">{WA_SVG}</a>
<button class="fab ax" id="ax-btn" type="button" aria-label="{t['fab_ax']}" aria-expanded="false" aria-controls="ax-panel">{AX_SVG}</button>
<div class="axp" id="ax-panel" role="dialog" aria-label="{t['ax_title']}" hidden>
  <h2>{t['ax_title']}</h2>
  <button class="opt" type="button" data-ax="z" aria-pressed="false">{ax[0]} <span class="st" id="ax-zs">{ax[1]}</span></button>
  <button class="opt" type="button" data-ax="c" aria-pressed="false">{ax[2]}</button>
  <button class="opt" type="button" data-ax="l" aria-pressed="false">{ax[3]}</button>
  <button class="opt" type="button" data-ax="m" aria-pressed="false">{ax[4]}</button>
  <button class="opt" type="button" data-ax="f" aria-pressed="false">{ax[5]}</button>
  <div class="row2"><button type="button" id="ax-reset">{ax[6]}</button><a href="/studio-accessibility"{'' if he else ' hreflang="he"'}>{ax[7]}</a></div>
</div>

{MAINJS}

{js}
</body>
</html>
'''
    return html


for L, fn in (('he', 'studio.html'), ('en', 'studio-en.html')):
    open(os.path.join(OUT, fn), 'w', encoding='utf-8').write(build(L))
    print('wrote', fn)
