---
name: ship-and-verify
description: Ship changes to Idan's two sites and verify them live: the IA STUDIO static site (idanab741/mokesh, Vercel) and the Triplace Next.js app (idanab741/triplacecode). Use for any code or content change that should go live.
---

# העלאה לאוויר ובדיקה

## כללי
- עובדים על הענף `claude/busy-gauss-f07hqu`, בסיס עדכני מ-`origin/main`.
- חתימה בקומיט: `Co-Authored-By` ו-`Claude-Session` לפי התזכורת בשיחה. בלי מזהה מודל.
- PR עם גוף קצר: מה, למה, מה נבדק.

## IA STUDIO (mokesh)
1. `git fetch origin main && git checkout -B claude/busy-gauss-f07hqu origin/main`.
2. עמודי הסטודיו נוצרים מ-`tools/studio-build/build_studio.py` (`python3 tools/studio-build/build_studio.py mokesh-vercel`). לא לערוך את ה-HTML ידנית.
3. לבדוק ב-Playwright: 1280 ו-390, עברית ואנגלית, בלי שגיאות בקונסול.
4. PR, ואז squash merge.
5. לחכות ש-`curl` מחזיר את השינוי מ-`mokesh-psi.vercel.app` (פרמטר `?v=` נגד מטמון).

## Triplace (triplacecode)
1. זו גרסת Next.js עם שינויים שוברים: לקרוא את התיעוד ב-`node_modules/next/dist/docs/` לפני שכותבים קוד (AGENTS.md).
2. `npx tsc --noEmit -p .` ו-`npx eslint <files>` חייבים לעבור.
3. ב-`src/proxy.ts`: לא לשבור את ההגנות על אורחים ועל נתיבים מוגנים.
4. PR, ואז merge.
5. לבדוק באתר החי (`beta.triplace.co.il`) עם `curl` ו-User-Agent מתאים (אייפון/אנדרואיד/וואטסאפ).

## אחרי
לדווח לעידן מה השתנה ומה נבדק, בעברית, בלי מונחים טכניים מיותרים.
