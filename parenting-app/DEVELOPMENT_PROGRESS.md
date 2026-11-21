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
