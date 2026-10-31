# מוקש! — אפליקציה לאנדרואיד ולאייפון

האפליקציה היא מעטפת (Capacitor) שפותחת את האתר `https://mokesh-psi.vercel.app` בתוך אפליקציה אמיתית:
- אייקון ומסך פתיחה משלה.
- רטט מקורי של הטלפון.
- מיקרופון לשיחה הקולית.
- מסך "אין אינטרנט".

כל שינוי שעולה לאתר מופיע מיד גם באפליקציה. צריך לשלוח גרסה חדשה לחנויות רק כשמשנים את המעטפת עצמה: אייקון, שם, הרשאות.

הבנייה נעשית ב-**GitHub Actions**, בדיוק כמו בטריפלייס, אז לא צריך Mac:
- `.github/workflows/android.yml`: בונה קובץ AAB חתום.
- `.github/workflows/ios.yml`: בונה על שרת Mac של GitHub, חותם אוטומטית ומעלה ישר ל-TestFlight.

| מה | איפה |
|---|---|
| שם האפליקציה | `מוקש!` (באנדרואיד באנגלית: `Mokesh!`) |
| מזהה האפליקציה | `com.mokesh.game` (אי אפשר לשנות אחרי ההעלאה הראשונה) |
| הכתובת שנפתחת | `capacitor.config.json` → `server.url` (כשיהיה דומיין, משנים רק פה) |
| אייקון ומסך פתיחה | `assets/` (מייצרים מחדש עם `npm run assets`) |
| מדיניות פרטיות | https://mokesh-psi.vercel.app/privacy |
| מחיקת חשבון | בתוך המשחק: הגדרות ← הפרופיל שלי ← "מחיקת החשבון" |

**התחברות עם Google באפליקציה:** כמו בטריפלייס, ההתחברות נפתחת בדפדפן של הטלפון וחוזרת לאפליקציה דרך `com.mokesh.game://auth/callback`.
- **באנדרואיד:** הכפתור מופיע.
- **באייפון:** הכפתור יופיע רק אחרי שתופעל גם התחברות עם Apple, כי אפל מחייבת את זה כשיש כניסה עם Google. עד אז נכנסים במייל וסיסמה.

---

## שלב 0 — הגדרה חד-פעמית

1. **Supabase**: Authentication ← URL Configuration ← Redirect URLs ← **Add URL** ← `com.mokesh.game://auth/callback` ← Save. בלי זה, ההתחברות עם Google באפליקציה לא תחזור אליה.
2. **GitHub**: בריפו `idanab741/mokesh`, נכנסים ל-**Settings** ← **Secrets and variables** ← **Actions** ← **New repository secret**, ומוסיפים 7 סודות.

   אנדרואיד (מהקבצים ששלחתי בצ'אט):

   | שם | ערך |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | כל התוכן של `ANDROID_KEYSTORE_BASE64.txt` |
   | `ANDROID_KEYSTORE_PASSWORD` | Keystore password מהקובץ `mokesh-upload-password.txt` |
   | `ANDROID_KEY_ALIAS` | `mokesh` |
   | `ANDROID_KEY_PASSWORD` | Key password מאותו קובץ |

   אייפון: **אותם שלושה ערכים בדיוק כמו בריפו של טריפלייס**, כי זה אותו חשבון מפתח. אם לא שמרתם אותם, יוצרים מפתח חדש ב-App Store Connect ← Users and Access ← Integrations ← App Store Connect API ← **+** (הרשאה Admin).

   | שם | ערך |
   |---|---|
   | `APPSTORE_API_KEY_ID` | Key ID |
   | `APPSTORE_API_ISSUER_ID` | Issuer ID |
   | `APPSTORE_API_KEY_BASE64` | התוכן של קובץ ה-`.p8` (פותחים ב-Notepad ומעתיקים הכל) |

---

## שלב A — Google Play (25$, פעם אחת)

### A1. פותחים חשבון מפתח
1. נכנסים ל-https://play.google.com/console/signup.
2. בוחרים **Yourself** (חשבון אישי), משלמים 25$ ומאמתים זהות. (אם לטריפלייס כבר יש חשבון Play Console שלכם, אפשר להשתמש בו ולדלג על השלב הזה.)
3. **חשוב:** בחשבון אישי שנפתח אחרי נובמבר 2023, גוגל דורשת **בדיקה סגורה עם 12 בודקים לפחות במשך 14 יום** לפני שמותר לפרסם לכולם.

### A2. יוצרים את האפליקציה ב-Play Console
**Create app**:
- שם: `מוקש! – משחק מסיבות`
- שפת ברירת מחדל: **עברית – iw-IL**
- **Game**
- **Free**
- מסמנים את ההצהרות.

### A3. בונים את הקובץ לחנות
1. ב-GitHub: **Actions** ← **Android build** ← **Run workflow** ← **Run workflow**.
2. אחרי כ-5 דקות, בתחתית עמוד ההרצה, ב-**Artifacts**, יש `mokesh-android-aab`. מורידים ופותחים את ה-zip. בפנים יש `app-release.aab`.

### A4. בדיקה סגורה
1. **Testing ← Closed testing ← Create track** (או משתמשים ב-Alpha) ← **Testers**: מוסיפים רשימה עם 12 המיילים.
2. **Create new release** ← מעלים את ה-`.aab` ← **Next** ← **Save** ← **Send for review**.
3. שולחים לבודקים את קישור ההצטרפות (**Copy link**). הם צריכים להתקין ולפתוח את האפליקציה כמה פעמים במהלך 14 הימים.

### A5. מה צריך למלא ב-Play Console (תפריט **App content**)

| סעיף | מה לבחור |
|---|---|
| Privacy policy | `https://mokesh-psi.vercel.app/privacy` |
| Ads | No, my app does not contain ads |
| App access | All functionality is available without special access. אם מבקשים חשבון: נותנים חשבון בדיקה, ראו בהמשך |
| Content rating | ממלאים את השאלון: משחק מילים, צ'אט בין משתמשים = Yes, אין אלימות. יוצא בערך 12+ |
| Target audience | 13–15, 16–17, 18+ |
| Data safety | ראו את הטבלה בהמשך |
| Delete account URL | `https://mokesh-psi.vercel.app/privacy#delete` |
| Government apps / Financial / Health | No |

**Data safety:** כן, אוספים מידע. כן, הוא מוצפן בהעברה. כן, משתמשים יכולים לבקש מחיקה.

| מידע | נאסף? | מטרה |
|---|---|---|
| Email address | Yes, required | Account management |
| Name (כינוי) | Yes | App functionality |
| Photos (תמונת פרופיל, לא חובה) | Yes, optional | App functionality |
| Audio (שיחה קולית) | **No.** לא נשמר, רק מועבר בזמן אמת | |
| Other user-generated content (מילים, צ'אט) | Yes | App functionality |
| App interactions (סטטיסטיקות) | Yes | App functionality, Analytics |

לא משתפים מידע עם צד שלישי.

### A6. דף החנות (**Main store listing**)
את הטקסטים מעתיקים מ-`store/texts.md`. את התמונות לוקחים מ-`store/`:
- אייקון 512×512: `store/icon-512.png`
- תמונה ראשית 1024×500: `store/feature-1024x500.png`
- צילומי מסך: `store/android/*.png` (לפחות 2)

### A7. אחרי 14 יום
**Production ← Create new release** ← מעלים (או מקדמים מה-Closed testing) ← **Send for review**. הבדיקה של גוגל לוקחת בין יום לשבוע.

---

## שלב B — App Store (כבר יש לכם חשבון מפתח)

### B1. מה כבר מוכן
המפתח של App Store Connect כבר מוגדר (שלב 0). החתימה אוטומטית, כמו בטריפלייס. לא צריך ליצור תעודות ופרופילים ידנית.

### B2. מזהה אפליקציה
1. https://developer.apple.com/account/resources/identifiers/list ← **+** ← **App IDs** ← **App** ← **Continue**.
2. Description: `Mokesh`. Bundle ID: **Explicit** ← `com.mokesh.game`.
3. **Continue** ← **Register**.

### B3. יוצרים את האפליקציה ב-App Store Connect
1. **Apps** ← **+** ← **New App**:
   - **iOS**
   - Name: `מוקש! – משחק מסיבות`. אם השם תפוס, מנסים `מוקש! משחק ניחושים`.
   - Primary language: **Hebrew**
   - Bundle ID: `com.mokesh.game`
   - SKU: `mokesh1`
   - **Full Access**
2. באפליקציה החדשה ← **App Information**:
   - Category: **Games ← Word**, ומשנית **Games ← Party**.
   - כדי להוסיף שם באנגלית: **Localizable Information** ← מוסיפים **English (U.S.)** ← שם: `Mokesh! – Party Word Game`.

### B4. בונים ושולחים ל-TestFlight
ב-GitHub: **Actions** ← **iOS build** ← **Run workflow**. אחרי כ-15 דקות הבנייה עולה לבד ל-App Store Connect. אחרי עוד 10–30 דקות של עיבוד אצל אפל, היא מופיעה ב-TestFlight.

### B5. מה צריך למלא לפני שליחה לבדיקה
- **App Privacy** ← Privacy Policy URL: `https://mokesh-psi.vercel.app/privacy`. Data types:
  - Email Address, Name, Photos, Gameplay Content, Other User Content: לכולם App Functionality, Linked to user, לא Tracking.
  - Product Interaction: Analytics, Not linked.
- **Age Rating**: בשאלון, *User-Generated Content* ו-*Messaging and Chat* = Yes. השאר None.
- **צילומי מסך** 6.9 אינץ': `store/ios/*.png`.
- **הטקסטים**: מ-`store/texts.md` (Subtitle, Promotional text, Description, Keywords).
- **Support URL**: `https://mokesh-psi.vercel.app`.
- **App Review Information**:
  - Sign-in required = No (אפשר לשחק כאורחים). אם בכל זאת מבקשים, נותנים חשבון בדיקה: פותחים חשבון חדש במשחק עם מייל שלכם, למשל עם `+review` לפני ה-@.
  - הערה לבודקים: `Party word game in Hebrew. You can also play as a guest. Account deletion: Settings → My profile → Delete account.`
- **Build** ← בוחרים את הבנייה מ-TestFlight ← **Add for Review** ← **Submit**.

### דברים שחשוב לדעת על אפל
- **תשלומים:** אם בעתיד הפרימיום יהיה בתשלום, אפל מחייבת לגבות דרך הרכישות שלה בתוך האפליקציה (In-App Purchase, עמלה של 15%). כרגע הפרימיום חינמי, אז אין בעיה. לפני שמפעילים תשלום (Grow), צריך לדבר על זה.
- **"סתם אתר עטוף":** אפל לפעמים דוחה אפליקציות שהן רק אתר (סעיף 4.2). מה שעוזר לנו:
  - רטט מקורי.
  - מצב "טלפון אחד" שעובד בלי חשבון.
  - משחק נגד המחשב.
  - שיחה קולית.

  אם תהיה דחייה, עונים בהודעה ומסבירים, ואני אכין תשובה.

---

## עדכון גרסה בעתיד
- **שינוי במשחק:** מעלים לאתר כרגיל. האפליקציות מתעדכנות לבד.
- **שינוי במעטפת** (אייקון, שם, הרשאות): מריצים שוב את ה-workflow ב-GitHub Actions. מספר הבנייה עולה לבד. ב-Play מעלים את ה-`.aab` החדש. באפל זה מגיע ל-TestFlight ואז שולחים לבדיקה.
- **גרסה מוצגת** (1.0.0 ← 1.1.0): כותבים אותה בשדה הגרסה כשלוחצים **Run workflow**.
