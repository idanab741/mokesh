# קפטן דמיון ✦ דף מותג

דף נחיתה (One-Page) בעברית לסדרת ספרי הילדים "קפטן דמיון".
HTML, CSS ו־JavaScript נקי, עם Vite לפיתוח ולבנייה.

## הרצה

```bash
npm install
npm run dev        # פיתוח: http://localhost:5173
npm run build      # בנייה ל־dist/
npm run preview    # בדיקת ה־build
```

## העלאה

- **Netlify:** מחברים את הריפו, וההגדרות נקראות מ־`netlify.toml` (build: `npm run build`, publish: `dist`). טופס המועדון מוכן ל־Netlify Forms: ב־`src/config.js` משנים את `formEndpoint` ל־`'/'`.
- **Vercel:** מחברים את הריפו, וההגדרות נקראות מ־`vercel.json`.

## איפה מה

| קובץ | מה יש בו |
|---|---|
| `index.html` | כל הטקסטים וכל המקטעים |
| `src/config.js` | **כל מה שמעדכנים**: שמות, רשתות, טיזרים, "איך הכל התחיל", טופס, מיקום העיניים ב־Hero |
| `src/styles.css` | צבעים (CSS variables ב־`:root`), טיפוגרפיה, כל המקטעים |
| `src/hero.js` | אינטראקציית הפנס |
| `src/sky.js` | שמי הכוכבים |
| `src/main.js` | קרוסלה, דמויות, parallax, גחליליות, טופס |
| `public/assets/` | איורים (כרגע זמניים, ראו `TODO.md`) |
| `scripts/placeholders/` | הסקריפטים שציירו את האיורים הזמניים |

## הפנס

- **בדסקטופ** האלומה עוקבת אחרי העכבר. כשהיא מוצאת את העיניים מופיע "גְּרְרְר...", ואחרי כ־2.5 שניות האור נדלק והמפלצת מנופפת.
- **בטלפון** האלומה מסיירת לבד, ואפשר גם לגרור אותה באצבע. האור נדלק אחרי `hero.autoLightMs` (ברירת מחדל: 5 שניות).
- **הכפתור "🔦 הדליקו את האור"** מדליק הכל מיד.
- **עם `prefers-reduced-motion`** אין חושך ואין שום תנועה.
- **החלפת האיור של ה־Hero:** פותחים את האיור החדש, מודדים באחוזים את המרכז שבין שתי העיניים, ומעדכנים את `hero.eyes.x` ואת `hero.eyes.y` ב־`config.js`. ה־`floor` הוא המרחק מהעיניים עד הרצפה שמתחת למיטה (באחוזים מגובה האיור), ומשם המפלצת עולה.

## ביצועים

Lighthouse במובייל (על ה־build, עם האיורים הזמניים): ביצועים 100, נגישות 100, Best Practices 100, SEO 100.

מה שומר על המהירות:
- **החושך:** מצויר על canvas קטן (רבע רזולוציה) שמוגדל במסך.
- **הכוכבים:** מצוירים פעם אחת ומונפשים רק ב־opacity וב־transform.
- **אנימציות בלולאה:** נעצרות במקטעים שלא נראים.
- **מקטעים מתחת לקיפול:** מקבלים `content-visibility: auto`.
- **גופנים:** נטענים בלי לחסום את הציור הראשון.

כשמחליפים לאיורים אמיתיים כדאי לשמור על משקל דומה: WebP באיכות של כ־80, וגרסת 2400 עד כ־400KB.

## איפה זה באוויר (mokesh)

- **הכתובת:** https://mokesh-psi.vercel.app/captain-dimyon/
- **קוד המקור** נמצא בתיקייה הזו: `tools/captain-dimyon`.
- **הגרסה שבאוויר** נמצאת ב־`mokesh-vercel/captain-dimyon`, התיקייה ש־Vercel מגיש.
- **תמונות:** הן לא שוכפלו לכאן, כדי שהריפו יישאר קטן. לפני עבודה מקומית מעתיקים אותן ל־`public`:

```bash
cp -r ../../mokesh-vercel/captain-dimyon/assets public/ && cp ../../mokesh-vercel/captain-dimyon/{og-image.jpg,favicon-*.png,apple-touch-icon.png} public/
```

- **בנייה מחדש לאותו נתיב:** בונים לתיקייה זמנית, ואז מעתיקים את התוצאה ל־`mokesh-vercel/captain-dimyon`. את תמונת השיתוף (`og:image`) מעדכנים לכתובת המלאה.

```bash
npx vite build --base /captain-dimyon/ --outDir /tmp/cd-build
```
