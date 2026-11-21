# מעקב התקדמות

עדכון אחרון: 19.11.2026

סימון: ✅ נבנה ונבדק · 🟡 נבנה, לא נבדק מקצה לקצה (מפורט למה) · ⬜ לא נבנה

## שלב A – יסודות
- ✅ פרויקט Expo SDK 58, TypeScript strict, Expo Router, מבנה תיקיות
- ✅ Design System: tokens, טיפוגרפיה (Heebo), רכיבי UI משותפים, ניגודיות AA מחושבת
- ✅ RTL מלא ב-web. 🟡 ב-native: מוגדר (config plugin + I18nManager) אך לא הורץ על מכשיר
- ✅ סכמת Postgres מלאה + RLS (3 מיגרציות), נבדקה מול Postgres 16 מקומי
- ✅ מסד מקומי SQLite עם מיגרציות
- ✅ חיבור Supabase: נבדק מול פרויקט אמיתי (זמנית על פרויקט MOKESH המשותף, ראו "סביבת בדיקה בענן")

## שלב B – הרשמה ומשפחות
- ✅ מסך פתיחה, הוספת ילד, בחירת ילד פעיל, עריכת פרופיל, כמה ילדים
- ✅ כניסה באימייל וסיסמה מול שרת אמיתי, כולל הודעת שגיאה לסיסמה שגויה ומשיכת נתוני המשפחה במכשיר חדש
- 🟡 הרשמה + מסך "שלחנו אימייל לאישור": נבנו. לא נבדקו (משתמשי הבדיקה נוצרו ישירות במסד כדי לא לשלוח אימיילים)
- ✅ יצירת משפחה אוטומטית בסנכרון הראשון (`create_family`), נבדק דרך האפליקציה
- ⬜ כניסה עם Apple / Google

## שלב C – מסך הבית
- ✅ ברכה לפי שעה, תאריך, ילד + גיל מדויק, החלפת ילד
- ✅ ארבע כרטיסיות מעקב מנתונים אמיתיים, לחיצה מובילה ליומן מסונן
- ✅ טיימר שינה פעיל במסך הבית, תיעוד בלחיצה אחת (חיתול רטוב, שינה, בקבוק בכמות האחרונה) עם "ביטול"
- ✅ פעילות אחרונה, Empty state למשתמש חדש
- ✅ כפתור עדכונים: טיימר פעיל, רשומות ממתינות לסנכרון, התנגשויות

## עיצוב (סבב שלישי)
- ✅ רקע עם שטיפת צבע רכה בכל המסכים, כרטיסים לבנים עם צל רך, כפתורים וסמלי פעילות בגרדיאנט
- ✅ מסך הבית בנוי סביב "במה": שמיים לפי שעת היום, ובמרכזם התינוק/ת בתלת-ממד
- ✅ תנועה: כניסה מדורגת של התוכן, לחיצה "פיזית" על כפתורים וכרטיסים, איור מרחף
- ✅ סרגל ניווט צף ומטושטש, יומן בכרטיסים מקובצים לפי חלקי היום, עמודות גרף בגרדיאנט
- ✅ סריקת נגישות ופריסה אוטומטית (`scripts/test-audit.sh`) על כל המסכים והטפסים בהקלדה אמיתית
- 🟡 לא נבדק על מכשיר: פונט המערכת (SF), ביצועי הטשטוש והתלת-ממד, מצב כהה (לא קיים עדיין)

## מעבר למעקב
- 🟡 דמות בווידאו אמיתי (קטעים שנוצרו ממחולל וידאו מתמונת הייחוס, מוצגים עם הרקע המקורי שלהם): קיימים כרגע: **הבן בעמידה** (עמידה רגילה בלולאה, וניפוף לשלום בפתיחת המסך ובהקשה) ו**הבת בעמידה** (אותו דבר). לפי החלטת בעל המוצר, עד שיהיו קטעים לתנוחות נוספות, כל ילד/ה מוצג/ת בעמידה, בכל גיל.
  מסך הבית עוצב סביב הקטעים: רקע האפליקציה בצבע הרקע של הווידאו (`#F1F1EF`), בלי כרטיס שמיים ובלי מסגרת, ושולי הקטע מתמוססים לתוך המסך. הקטעים מוצגים בדיוק כפי שרונדרו.
- ⛔ צביעה חיה של הקטעים (עור, שיער, עיניים, בגדים ב-WebGL עם מסכות לכל פריים): נוסתה לאורך כמה גרסאות והוסרה לפי החלטת בעל המוצר. היא ריצדה באייפון ולא נראתה מרונדרת. הכלים והמדידות נשארו ב-`tools/baby-motion` (`tint-video.py`, `calibrate.py`, `reference/`, `packed/`), והפלטות ב-`src/domain/avatar.ts` אינן בשימוש כרגע. הכיוון הבא: דמויות מרונדרות מראש לכל מראה.
  הווידאו מנוגן בגרסת ה-web בלבד (`BabyClip.web.tsx`); ב-native מוצגות התמונות (סיבוב, מצבי רוח, צבעי בגדים). מקורות: `tools/baby-motion/source`.
- ✅ דמות התינוק/ת במסך הבית: רינדורים בסגנון סרט אנימציה (נוצרו ב-Figma AI), בן ובת, ארבע תנוחות (שכיבה על הבטן, ישיבה, זחילה, עמידה).
  תצוגת 360°: 23 זוויות (כל 15°) ברזולוציה של 600 פיקסלים לזווית. הדמות נחה עם הפנים קדימה, מסתחררת סיבוב מלא כל כמה שניות, ואפשר לסובב אותה בגרירה.
  ההורה בוחר רק את צבע הבגדים (שישה צבעים) ואת התנוחה. המקורות והבנייה: `tools/baby-turn/` (חצי מהסיבוב הוא תמונת ראי של החצי השני).
  ניסיון קודם לדגם תלת-ממד שנוצר אוטומטית מתמונה (GLB + three.js) הוסר: האיכות לא עמדה ברף.
- ✅ מצב רוח לפי היומן בלבד (`src/domain/mood.ts`, 6 בדיקות יחידה): ישנה כשרץ טיימר שינה; צוחקת וקופצת חצי שעה אחרי האכלה או התעוררות שתועדו;
  עצובה כשהזמן מאז ההאכלה האחרונה ארוך ב-30% ומעלה מהמרווח הרגיל של המשפחה עצמה (חציון של 6 מרווחים לפחות בשבוע האחרון); אחרת מחייכת. מתחת לדמות מוצגת העובדה שתועדה. אין כאן הערכה של הילד/ה האמיתי/ת ואין המלצה.
  מגבלה: פני הצחוק והעצב קיימות רק במבט מלפנים. בזמן סיבוב הדמות מוצגת עם החיוך הרגיל; דמות עצובה או ישנה לא מסתחררת מעצמה.
- ⬜ התאמת הדמות לתמונה של הילד/ה: הוסרה בגרסה הזו. הדמות היא איור קבוע, ולכן התאמה אישית דורשת יצירת סדרת איורים לכל ילד (AI בצד שרת, בהסכמה).
- ✅ תובנות מהשגרה: מרווח בין האכלות, אתמול לעומת הממוצע של המשפחה (בקבוק, שינה), רצף השינה הארוך, שעת הירדמות, חיתולים, מזונות חדשים.
  כל תובנה היא עובדה מדודה עם ציון הבסיס שלה; אין המלצות ואין ניסוח רפואי (נאכף בבדיקה).
- ⬜ טיפים ושאלות ב-AI (דורש מפתח API בצד השרת, הסכמת משתמש והחלטה על עלות)

## שלב D – מערכת מעקב
- ✅ בקבוק (סוג חלב, פלוס/מינוס + הזנה ידנית, ברירת מחדל מהפעם הקודמת, טווח 1–500)
- ✅ הנקה (טיימר לכל צד, מעבר בין צדדים, עצירה/המשך, הזנה ידנית, שמירה בלי טיימר; טיימר שורד סגירת אפליקציה)
- ✅ שאיבה (כמות לכל צד, סה״כ, משך)
- ✅ שינה (טיימר מבוסס חותמות זמן, סיום, הזנה בדיעבד, תיקון, חציית חצות)
- ✅ חיתול (סוג, צבע, מרקם, כמות)
- ✅ מוצקים (מזונות מההיסטוריה של המשפחה, מזון חדש, סימון אלרגן ידני, כמות, מרקם, תגובה)
- ✅ פעילות נוספת
- ✅ עריכה ומחיקה (רכה) לכל רשומה; כל המסכים מתעדכנים

## שלב E – יומן
- ✅ ציר זמן יומי, מעבר בין ימים + רצועת שבוע, סינון, סיכום יומי, עריכה ומחיקה עם אישור

## שלב F – נתונים
- ✅ יום / שבוע / חודש / טווח מותאם (עד 92 ימים)
- ✅ האכלות, שינה (יום/לילה, פרקים, שעת הירדמות), חיתולים, מוצקים (כולל מזונות חדשים)
- ✅ גרפים, השוואה לתקופה קודמת, "אין מספיק נתונים" כשצריך, ללא מסקנות רפואיות

## שלב G – משפחה וסנכרון
- ✅ כתיבה מקומית מיידית, תור העלאה, מניעת כפילויות, מדיניות התנגשויות (נבדק ב-Jest מול שרת מדומה)
- ✅ בצד השרת: הזמנות, תפקידים, הרשאות, הסרת חבר, audit (נבדק ב-SQL)
- ✅ סנכרון בין שני מכשירים מול Supabase אמיתי: עריכה, מחיקה, עבודה בלי רשת, חיווי רשומות ממתינות, התנגשות והכרעה
- ✅ הזמנה, מטפלת ומשתמש זר מול ה-API האמיתי (22 בדיקות)
- ✅ מגבלת זמן לבקשות רשת, כדי שסנכרון ברשת תקועה ייכשל וינסה שוב במקום להיתקע
- ⬜ ממשק שיתוף משפחתי (יצירת הזמנה, קבלה, ניהול חברים)
- ⬜ העלאת תמונות ל-Storage (כרגע תמונת הפרופיל נשמרת במכשיר בלבד)

## שלב H – בריאות והתפתחות
- ✅ מדידות גדילה: הזנה, היסטוריה, גרף (ללא אחוזונים / עקומות ייחוס)
- ⬜ אבני דרך (דורש קטלוג ממקור מקצועי; לא הומצאו טווחי גיל)
- ⬜ יומן בריאות, תרופות, חיסונים, ביקורים, תזכורות (הטבלאות וה-RLS קיימים; אין ממשק)

## פרטיות
- ✅ ייצוא נתונים (JSON), מחיקת כל הנתונים מהמכשיר
- 🟡 מחיקת חשבון: `delete_my_data()` נבדק ב-SQL; הקריאה מהאפליקציה לא נבדקה. חסרה edge function למחיקת זהות ה-auth
- ⬜ מסכי תנאי שימוש / מדיניות פרטיות ורישום הסכמות (הטבלה קיימת)

## מה נבדק בפועל
| בדיקה | תוצאה |
|---|---|
| `npm run typecheck` | עובר |
| `npm test` (50 בדיקות: גיל, זמן, אימות, סיכומים, סטטיסטיקות, תובנות, מסד מקומי, סנכרון) | עובר |
| `npm run test:db` (56 בדיקות RLS והרשאות מול Postgres 16) | עובר |
| `scripts/test-e2e.sh` (31 בדיקות בממשק אמיתי ב-Chromium, 390×844, כולל הדמות התלת-ממדית) | עובר, ללא שגיאות קונסול |
| `e2e/cloud-sync.js` (15 בדיקות, שני "מכשירים" מול Supabase אמיתי) | עובר |
| בדיקת תפקידים מול ה-API האמיתי (22 בדיקות, סקריפט חד-פעמי) | עובר |

תרחיש ה-E2E מכסה: הוספת ילד, בקבוק שמופיע בסיכום, עריכה ומחיקה שמעדכנות סכום, טיימר שינה ששורד רענון,
שינה שחוצה חצות, טיימר הנקה, מוצקים, סינון יומן, ילד שני בלי זליגת נתונים, מדידות גדילה.

## סביבת בדיקה בענן (זמנית)
- הסכמה מותקנת על פרויקט Supabase **MOKESH** (משותף עם המשחק החי) לצורך בדיקה בלבד, עד מעבר לפרויקט ייעודי.
- הותקן: 17 טבלאות, RLS + 42 policies, פונקציות הרשאה ו-RPC. ההרשאות של טבלאות `mokesh_*` לא השתנו.
- לא הותקן שם: הטריגר על `auth.users`, מיגרציית Storage, והפונקציה `delete_my_data()`. לכן "מחיקת החשבון" באפליקציה תחזיר שם שגיאה.
- שלושה משתמשי בדיקה (`parenting-test-*@example.com`) ונתוני בדיקה שלהם נמצאים בפרויקט.
- הסרה מלאה: `supabase/shared-project/teardown.sql` (לא מוחק את משתמשי הבדיקה מ-`auth.users`).
- `.env` המקומי מצביע על הפרויקט הזה ואינו נכנס ל-git.

## מגבלות סביבת הפיתוח
- אין סימולטור iOS/Android בסביבה הזו. האפליקציה הורצה ונבדקה כ-web בלבד. לא הורצו: `expo-sqlite` (נהג native),
  `expo-secure-store`, `expo-image-picker`, RTL ו-safe areas על מכשיר.
- `npx expo install` ו-`expo-doctor` חסומים ברשת כאן; הגרסאות נלקחו מ-`bundledNativeModules.json` של ה-SDK.
- מיגרציית Storage לא הורצה (דורשת סכמת `storage` של Supabase).
- בגרסת ה-web כל מסך נטען מהרשת בפעם הראשונה, ולכן מסך שלא נפתח קודם לא ייפתח בלי רשת. ב-native כל הקוד מקומי.

## ידוע / לטיפול
- שם המוצר: Lilbaby. האייקון וה-splash של האפליקציה המותקנת הם עדיין placeholders של Expo.
- ייצוא ב-native משתמש ב-Share כטקסט; לקובץ אמיתי נדרש `expo-file-system` + `expo-sharing`.
- `expo-notifications` מותקן אך עדיין לא בשימוש (תזכורות בשלב H).
- ניקוי תקופתי של שורות במחיקה רכה לא מוגדר.
- אנגלית: כל המחרוזות מרוכזות ב-`src/i18n/he.ts` ובמסכים; עדיין אין מנגנון החלפת שפה.

## הצעד הבא המומלץ
1. מעבר לפרויקט Supabase ייעודי (כל שלוש המיגרציות), עדכון `.env`, והרצת `teardown.sql` על MOKESH.
2. ממשק שיתוף משפחתי (ה-RPC וה-RLS כבר קיימים).
3. הרצה על מכשיר אמיתי (development build) ותיקוני native.
4. מודול בריאות ותזכורות.

## Tracking board and routine learning (2026-11-20)

- `src/domain/routine.ts` learns the family's own rhythm from the last 14 days of the diary: usual gap between feedings,
  the bottle amount given most often (never an average), awake time before a sleep, length of a daytime sleep, gap between
  diaper changes. A value appears only after 5 measured gaps; nothing here is a norm or advice. `predictNext` turns it into
  "what comes next" (next feeding / sleep / diaper, or the usual wake-up while a sleep runs). 7 Jest tests.
- Home: a "מה הלאה" card with those predictions (or per-activity learning progress 0–5 while there is too little data),
  and one card per activity instead of the quick row + 2x2 grid. Filled buttons save on the spot (with undo), outlined
  buttons with an arrow open the form; the running sleep lights up its own card with the timer and "סיום שינה".
- E2E: 30 checks, including the learned 3-hour feeding gap and the one-tap bottle offering a real amount.
- Not checked on a real iPhone; checked in Chromium at iPhone size only.

## Tracking rebuilt (2026-11-20, second pass)

The first pass only restyled the old layout; the user asked for a rethink. Home is now built around tracking:
- The baby stands beside the greeting (230 px) so the four tracking cards are on the first screen.
- Each card answers "how long since": time since the last feeding / awake time / time since the last diaper, a bar
  showing where that stands in the family's own usual gap, the predicted next time, today's total, one labelled button.
  A running sleep turns its card into the timer.
- `QuickLog` sheet: logging without leaving Home. Bottle amounts are the ones the family logs most, the usual one is
  preselected; "when" can be moved back up to an hour (also for sleep start and wake-up); the save button spells out
  what is saved. Diaper tiles save on tap. Full forms stay one link away.
- The "מה הלאה" card and the stacked rows from the first pass were removed.

## Home, third pass (2026-11-20)

The side-by-side hero and the dense 2x2 cards were rejected: the baby must stay at full size. Home is now: child chip
in the top bar, the baby at 320 px with three "how long since" bubbles around it (feeding, awake time / running sleep,
diaper), one line with what the family's routine expects next, four large gradient buttons that open the quick-log
sheet, and today's totals as four small tiles. The pink-lavender wash is back; on Home it scrolls with the page and
fades to the clip's backdrop colour before the baby begins.

## Girl crawl clip (2026-11-21)

One generated clip of three girls crawling side by side (three looks) was cut into three 668x720 loops (crop per
character, backdrop lifted towards #F1F1EF, 12-frame crossfade to close the loop). The light-brown girl is live as the
girl's crawl pose (8-10 months by default); the blonde and dark looks are kept in `tools/baby-motion/looks/` for the
look picker. The boy still falls back to his standing clip in the crawl pose.

## Character picker and crawl size (2026-11-21)

- A pose without a clip takes the nearest pose that has one (a sitting-age girl crawls, not stands).
- `AvatarConfig.look` + `babyLooks`: a parent picks between three girls ("החלפת דמות" under the baby). The blonde and
  dark girls have a crawl clip only, so they crawl at every age until standing clips exist. The boy has one look.
- Crawl clips are drawn at 0.85 of the box so the head matches the standing clip, and their backdrop is flattened to
  #F1F1EF with a fitted backdrop field (the generated clip had a vignette that showed as a faint box).

## Six boys from one clip (2026-11-21)

`tools/baby-motion/split.py` cuts a multi-character clip into one looping clip per character (crop, backdrop field,
plain bright pixels pulled to #F1F1EF, 12-frame crossfade). Six boys in six skin tones crawl; the boy picker offers all
six. Only the default boy has a standing clip, the others crawl at every age for now. All crawl clips (boys and girls)
were re-cut with the same script. Eye colour is meant to be changed offline on the finished clips, not generated.

## Pale box around the clip on iPhone (2026-11-21)

On iPhone Safari the clip's backdrop showed as a slightly lighter box: the phone draws video a touch lighter than the
same colour in CSS. `BabyClip.web` now lays a canvas-coloured layer over the clip with `mix-blend-mode: darken`, so no
pixel of the clip is lighter than the canvas. Checked in Chromium by brightening the video 3% (box gone, backdrop equals
the canvas exactly); not confirmed on an iPhone from here.
- Follow-up: the user's iPhone screenshot measured the crawl backdrop at 240,240,238 against a 241,241,239 canvas (one
  level darker, same as Chromium), so the box was not a lighter video. `split.py` now encodes the backdrop one level
  higher; drawn raw (no mask, no blend layer) in Chromium it is exactly 241,241,239 on all nine crawl clips. The older
  standing clips have an uneven backdrop (236-245) hidden only by the feathered edge; not yet re-cut.

## No feathered edges on the clips (2026-11-21)

The user's complaint was the feathered edge itself (16% each side), which faded hands, feet and shadows. The feather
mask is removed from `BabyClip.web`. To make hard edges invisible, every clip (crawl and the four standing ones, whose
originals are kept in `tools/baby-motion/source/stand/`) is run through `split.py`: backdrop field, plain pixels pulled
to the canvas colour, and only the outermost 3% eased into it. Amplified 40x against the canvas in Chromium, nothing
but the character and its contact shadow differs. Not confirmed on an iPhone.

## Boys lying on the back (2026-11-21)

Six boys lying on their backs, cut from one clip, fill the youngest pose (stored under the `tummy` stage key, now
labelled "שכיבה"). All six boy looks have lying + crawl; only the default has standing. On a tie the nearest-pose rule
now takes the later pose, so a sitting-age child crawls rather than lies down.

## Six newborn girls lying (2026-11-21)

Six girls lying on their backs with a newborn look (thin hair, small body), cut from one clip. The girl looks now use
the same six keys as the boys (porcelain, default, olive, tan, brown, deep); the earlier `blonde` and `dark` crawl clips
became `porcelain` and `deep`, and saved configs with the old keys are mapped. Olive, tan and brown girls have the lying
clip only. The boys' lying clip still has full hair; a newborn version would need a new clip.

## Family sharing (2026-11-21)

Client side of the sharing that the schema already had (families, family_members, invitations + RPCs):
- `/family` screen (from "הילד שלי" → "משפחה ושיתוף"): members with roles, invite, join with a code, leave, remove.
- An invitation is a one-time 64-character code (server stores its hash, valid 7 days). It is shared as a link
  `…/parents/?join=CODE`; the code is taken from the address at startup, removed from the address bar, kept until the
  person is signed in, and accepted before the first sync. A code can also be pasted in the family screen.
- Roles offered: parent (everything) and caregiver (daily tracking; no profile edit, no growth). View-only is not
  offered yet because the app cannot yet block a read-only member from logging locally.
- Joining resets the pull cursors (`pullEverything`), because the family's rows are older than the device's cursors;
  without this an existing user who joined saw nothing. Leaving deletes that family's rows from the device.
- `e2e/family-invite.js` runs against the real project with two test accounts: 11 checks.
- Not built: listing or revoking pending invitations (select on `invitations` is revoked for clients; needs an RPC),
  transferring ownership, native deep links.

## Moments and milestones (2026-11-21)

- `/milestones` (from "הילד שלי"): a catalog of moments to remember in five groups, plus moments in the family's own
  words, each with an optional date and note. No expected ages and no "late": it only records what happened.
- Local table `milestones` (schema v3) synced with `public.milestones`. A catalog moment uses an id derived from the
  child and the key, so two phones marking the same moment meet in one row instead of hitting the unique index.
- The character's pose follows the furthest pose moment marked (sits / crawls / stands / first steps); the age is only
  the fallback. Only parents can add moments (the server gates this table with the health permission).
- Not built: a photo on a moment (comes with the photo journal).

## Summary for the doctor (2026-11-21)

`/report` (from "הילד שלי"): one page for a week, two weeks or a month that restates what was logged: feeding, sleep
(night / day), diapers, solids and foods, measurements and marked moments. Averages are over days that have records.
It can be shared as text, copied, or opened as a plain page for printing / saving as PDF (web). It states that it is
not a medical document and draws no conclusions. The JSON export now includes moments.

## Tastings, and health notes (2026-11-21)

- `/foods`: every food the child tried, built from the logged solids: first and last time, how many times, the
  family's own allergen mark and the notes written next to those meals. States that the mark is not a medical finding.
- `/health` with three tabs. Fever and medicines: temperature readings and medicines given, one timeline, and "when it
  was last given" per medicine. Vaccinations: name and date copied from the booklet, free text, no built-in schedule.
  Visits: planned and past, with what was said. The app never computes a dose, never says when a medicine may be given
  again and never interprets a temperature, and says so on the screen.
- Local schema v4 mirrors `health_records`, `medications`, `medication_administrations`, `appointments`; all four sync.
  Not synced: `symptoms`, `details`, `is_active`, `status` (left at the server defaults).
- The server gates these tables with the health permission, so a caregiver neither sees nor adds them. That includes
  "medicine given", which a caregiver would reasonably want; changing it is a server policy decision.
- Checked against the real project: a second device sees the temperature, medicine, vaccination and visit.
- Home, below the tracking area and without touching the character: "עוד על <name>" with five shortcuts (moments,
  health, tastings, summary, family) and a short list of what is current (a medicine given in the last 24 hours, the
  next visit, the latest moment). The new screens were reachable only from "הילד שלי" and the user saw nothing new.

## "Arch" design direction (2026-11-21)

The user chose direction A of five sketches. Built so far, on Home and in the shared chrome:
- A gradient sky behind the greeting; the character stands in an arch window painted in the clip's backdrop colour, so
  the sky can be any colour while the clip still blends. The character keeps its size and place.
- A white sheet rises over the sky with one sentence about now, one about what the routine expects next, and four soft
  tiles that log (feeding, sleep, diaper, meal) and show their status. They replace the "since" tiles, the next card
  and the gradient dock.
- Three colour worlds (`domain/theme.ts`): rose (default for a girl), sky (default for a boy), meadow (default when the
  sex was not given). A parent can pick any of them in "החלפת דמות וצבע". The tab bar and the wash at the top of the
  other screens follow it.
- Rubik on the web, loaded from Google Fonts at startup; the system face is the fallback.
- Not yet restyled: primary buttons and selected chips are still rose in every colour world; journal, stats, forms and
  the other screens keep their layout.
- Follow-up after the user's review: the character is centred in the arch in every pose (it used to sit on the bottom
  edge, so the smaller lying and crawling clips looked dropped). Every accent in the app now follows the colour world:
  `colors.primaryStrong`, `primaryLight`, `primary`, `ink` and `gradients.primary` are getters over the current accent,
  style sheets that use them are wrapped in `themed()`, and the root remounts when the colour world changes. Home was
  brought closer to the sketch: only the logo and the child's avatar in the top bar (the bell appears when something
  needs attention), headings in the colour world's deep tone, two plain sentences in the sheet, and "דמות וצבע" moved
  into the shortcuts. The `darken` layer over the clip was removed: with rounded clipping it drew black patches while
  the wave clip played, and the backdrops are exact without it.

## Home simplified (2026-11-21)

The user found the area under the four tiles generic and random. Home now has, under the tiles: one "היום" card (three
totals and the day strip, with a link to the journal), "כדאי לדעת" only when something is current (a medicine given
today, the next visit, the latest moment), insights only once there are any (no placeholder card), and recent activity.
Removed from Home: the 2x2 totals that repeated the tiles, the grid of six shortcuts, and "דמות וצבע".
"הילד שלי" is the one place for everything else, in four groups: התפתחות (moments, growth, tastings), בריאות (health,
summary for the doctor), משפחה, and הגדרות (character and colour, account, data).
- The user picked option 4 of five sheet sketches: four rings instead of tiles. A ring fills as the time since the last
  feeding / wake-up / diaper approaches the family's own usual gap (from `predictNext`); the meal ring fills with today's
  meals against the usual number on a day with solids (`routine.solidsPerDay`, at least three such days). A ring with
  nothing learned shows only its track. Under the rings: one line with today's three totals. The day strip left Home.
- Boys' lying clip replaced with the newborn version (thin hair, small body), cut from a new six-boy clip; boys and
  girls are now drawn at the same lying scale (0.82).
- Girls' crawl: all six girls now crawl, cut from one new six-girl clip that matches the six skin tones. It replaces the
  three clips from the first three-girl clip (which had other faces and blue eyes on the blonde) and fills the three
  that had none. Standing clips exist only for the default boy and the default girl.

## Home as three daily needs (2026-11-21)

The user asked for main categories rather than a tracker: sleep, food, diaper. The sheet under the character is now
"היום של <name>" with three cards. Each card has the ring, where things stand now and what the family's routine expects
next, a "+" that logs, and facts about the day: today's total, and how this family's own usual day looks (from the seven
days before today, once three of them have records), plus the last dirty diaper. Feeding and meal were merged into
"אוכל": the quick sheet offers bottle, nursing and solids. The two sentences above and the four rings were removed
because the cards say the same things.
- "דמות וצבע" now has a pose choice: automatic (it says which pose that gives and whether it comes from the age or
  from a marked moment), lying, crawling, standing, limited to the poses the chosen character has clips for. Before this
  a pose saved by the old look editor, or one implied by a marked moment, could not be seen or changed anywhere.

## Lili the companion, sterilising, the album (2026-11-21)

- `domain/advisor.ts` + `Companion`: Lili (a crescent-moon mascot in six poses, cut from the user's image into
  `assets/mascot/`) opens the sheet on Home with one thing worth saying and a button that acts on it. Priority: empty app,
  running sleep, empty day, what the family's own routine expects about now, sterilising, a fresh moment, an empty album,
  today's sleep against the family's usual, still learning, all good. It only restates the diary and the learned
  routine and suggests what to log; it gives no medical or care advice. 4 Jest tests.
- Sterilising: logged as an "other" activity titled "עיקור ציוד" whose note says what was in the batch, so it syncs and
  shows in the journal without a new table. Home shows when it was last done and how many bottles of that batch are
  still clean (the batch minus every bottle feeding logged since). 1 Jest test.
- The album on Home: up to five badges (caught moments in colour, the next ones locked) and the count, opening the
  moments screen.

## Journal time line, bottom bar, tour, steriliser (2026-11-21)

- Journal: the day is one time line (hour, rail, soft badge, title and detail) instead of stacked cards. Today it shows
  "עכשיו" and, above it, what the family's routine expects next as dashed "צפוי" rows. The list draws the whole day.
- Bottom bar: on the bottom edge, full width, icons only (labels stay for screen readers). A soft pill sits behind the
  current tab and springs to the next; dragging along the bar moves the pill with the finger and letting go opens what
  is under it, including "+". Modelled on the Triplace bar (drag lens) with an Instagram-like flat look.
- Tour before the welcome screen: four steps with Lili (who she is; sleep, food, diaper; learning the routine; moments,
  health and family), dots, "הבא" and "דלג", like the Triplace onboarding. E2E scripts skip it.
- "עיקור" renamed to "סטריליזטור" everywhere; records saved under the old title still count.
- `scripts/test-audit.sh` (overlap, off-screen and unreachable controls on an iPhone-size touch screen): no problems.
  It does not walk the newer screens (health, moments, tastings, family, summary).

## Triplace-style bar and tour, Lili's first steps (2026-11-21)

The user pointed out that the previous bar and tour were not what Triplace has. Rebuilt after reading the Triplace code
(`src/components/ui/BottomNav.tsx`, `src/components/tour/SpotlightTour.tsx`):
- Bottom bar: a floating glass capsule with a margin on every side, icons only, a tinted pill behind the current tab
  that springs to the next one and follows the finger when dragged, and the round "+" rising out of the middle where
  Triplace has its globe.
- Tour: a spotlight over the real Home screen (`SpotlightTour.web`), shown once per device: the screen dims, the
  spotlight moves from the character to Lili, the three needs, the steriliser, the album, the "+" and the bar, and Lili
  says in a sentence what each is for; story-style progress, "הבא" / tap anywhere, "דלג". The slide tour before the
  welcome screen was removed. Web only; native shows nothing.
- Lili's first steps with a new family: a photo, the last sleep, the last feeding, the last diaper. Each explains why
  it helps, shows "צעד N מתוך 4", has one button that opens the right form and "לא עכשיו". A step is done once its
  record exists; put-off steps are remembered on the device.
- Tour rework after the user's review (things were cut, the card jumped, the flow was rough): the card now stays in one
  place above the bottom bar; the screen scrolls at once under it so each control sits just above the card; one
  spotlight glides between controls (it closes to a point for the opening and closing cards, so the dimming never
  flashes); a control taller than the free space is lit only as far as the card; the needs step lights one card, not
  all three; the text slides in per step, with "N מתוך 9" and "חזרה". Checked at 390x844 and 375x667: on every step the
  spotlight is inside the screen and does not meet the card.

## עמוד הפתיחה בעיצוב הקשת
- `welcome.tsx` נבנה מחדש: שמיים ורודים, הדמות החיה בקשת (תינוקת ותינוק מתחלפים), לילי עם בועת דיבור, שורת פרצופים של הדמויות לבחירה, שלושה יתרונות קצרים והכפתורים הקיימים על גיליון לבן.
- בלי ילד פעיל, ערכת הצבעים היא ורודה (לא ירוקה). במסך נמוך הקשת קטנה יותר.
- נבדק ב-Chromium בגודל 390×844 ו-375×667 בלבד, לא על אייפון אמיתי.

## עמידה ונפנוף לחמשת הבנים הנוספים
- מקור: `tools/baby-motion/source/boys-stand-wave-six.mp4` (שישה בנים, כ-4 שניות עמידה ואז נפנוף). מרכזי תאים 316×340: (255,190)(623,190)(991,190)(255,536)(623,536)(991,536).
- `split.py` קיבל FROM/TO/SUFFIX/TAIL: לולאת עמידה מפריימים 0–96, נפנוף מפריים 96 עד הסוף עם מעבר חזרה לפריים הראשון.
- הבן הראשי נשאר עם הסרטון המקורי (חד יותר). חסר עדיין: עמידה ונפנוף לחמש הבנות הנוספות.
