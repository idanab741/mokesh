# Lilbaby – אפליקציית הורים

אפליקציית מובייל (iOS + Android, עם גרסת web לפיתוח) להורים לילדים מגיל לידה עד שלוש:
מעקב האכלות, שינה, חיתולים ומוצקים, יומן, נתונים וגדילה. עברית ו-RTL מלא.

> התיקייה הזו עצמאית לחלוטין משאר הריפו (מוקש / IA STUDIO) ואינה נוגעת בקבצים שלהם.

## מה צריך
- Node 20 ומעלה, npm
- להרצה על מכשיר: Expo Go או development build. לבדיקות מסד הנתונים: Postgres 16 מקומי.

## התקנה והרצה
```bash
cd parenting-app
npm install
cp .env.example .env      # אפשר להשאיר ריק: האפליקציה תרוץ במצב "מכשיר בלבד"
npm run web               # דפדפן
npm run ios | npm run android
```
הוספת תלות native: `npx expo install <package>` (מתאים גרסה ל-SDK).

## מצבי עבודה
| מצב | מתי | מה קורה |
|---|---|---|
| מכשיר בלבד | אין משתני Supabase ב-`.env` | הכול נשמר ב-SQLite מקומי. אין חשבונות, אין סנכרון. הממשק אומר זאת במפורש. |
| ענן | `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` מוגדרים | הרשמה/כניסה באימייל, סנכרון דו-כיווני, הרשאות RLS. |

### חיבור Supabase
1. ליצור פרויקט Supabase.
2. להריץ את `supabase/migrations/*.sql` לפי הסדר (Supabase CLI: `supabase db push`, או SQL editor).
3. להעתיק Project URL ו-publishable (anon) key ל-`.env`.
4. לוודא ש-Email auth פעיל (אישור אימייל מופעל כברירת מחדל).

אין להכניס `service_role` key לאפליקציה או ל-`.env` שלה.

## בדיקות
```bash
npm run typecheck   # TypeScript
npm test            # Jest: לוגיקה, מסד מקומי (SQLite אמיתי), מנוע סנכרון
PGURL=postgres://postgres@localhost:5432/postgres npm run test:db   # מיגרציות + 56 בדיקות RLS מול Postgres
./scripts/test-e2e.sh   # בונה web ומריץ תרחיש מלא ב-Chromium (Playwright)
```

## מבנה
```
src/app/         מסכים (Expo Router)
src/components/  רכיבי UI משותפים (ui/), טפסי פעילות, גרפים
src/design/      Design tokens
src/domain/      לוגיקה עסקית טהורה: סוגי פעילות, אימות, סיכומים, סטטיסטיקות, גיל
src/data/        SQLite מקומי, repositories, מנוע סנכרון
src/services/    Supabase, קונפיגורציה, אחסון מאובטח, ייצוא נתונים
src/state/       Zustand + ספק השירותים
supabase/        מיגרציות Postgres ובדיקות RLS
```
פירוט: [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATABASE.md](./DATABASE.md) · [DEVELOPMENT_PROGRESS.md](./DEVELOPMENT_PROGRESS.md)
