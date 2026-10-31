# מוקש! — אפליקציה לאנדרואיד ולאייפון

האפליקציה היא מעטפת (Capacitor) שפותחת את האתר `https://mokesh-psi.vercel.app` בתוך אפליקציה אמיתית:
- אייקון ומסך פתיחה משלה.
- רטט מקורי של הטלפון.
- מיקרופון לשיחה הקולית.
- מסך "אין אינטרנט".

כל שינוי שעולה לאתר מופיע מיד גם באפליקציה. צריך לשלוח גרסה חדשה לחנויות רק כשמשנים את המעטפת עצמה: אייקון, שם, הרשאות.

כל הבנייה נעשית ב-**Codemagic**, אז לא צריך Mac.

| מה | איפה |
|---|---|
| שם האפליקציה | `מוקש!` (באנדרואיד באנגלית: `Mokesh!`) |
| מזהה האפליקציה | `com.mokesh.game` (אי אפשר לשנות אחרי ההעלאה הראשונה) |
| הכתובת שנפתחת | `capacitor.config.json` → `server.url` (כשיהיה דומיין, משנים רק פה) |
| הגדרות הבנייה | `codemagic.yaml` בתיקייה הראשית של הריפו |
| אייקון ומסך פתיחה | `assets/` (מייצרים מחדש עם `npm run assets`) |
| מדיניות פרטיות | https://mokesh-psi.vercel.app/privacy |
| מחיקת חשבון | בתוך המשחק: הגדרות ← הפרופיל שלי ← "מחיקת החשבון" |

> בתוך האפליקציה אין כפתור "המשך עם Google", כי Google חוסמת כניסה מתוך אפליקציות מהסוג הזה. נכנסים במייל וסיסמה, והחשבון זהה לחשבון באתר. משתמשים שנרשמו באתר עם Google יכולים לבחור "שכחתי סיסמה" ולקבוע סיסמה.

---

## שלב 0 — Codemagic (פעם אחת)

1. נכנסים ל-https://codemagic.io/signup ובוחרים **Sign up with GitHub**.
2. **Add application** ← GitHub ← בוחרים את `idanab741/mokesh` ← **Codemagic YAML** (הקובץ כבר קיים בריפו).
3. התוכנית החינמית נותנת 500 דקות בנייה בחודש. זה מספיק בשפע.

---

## שלב A — Google Play (25$, פעם אחת)

### A1. פותחים חשבון מפתח
1. נכנסים ל-https://play.google.com/console/signup.
2. בוחרים **Yourself** (חשבון אישי), משלמים 25$ ומאמתים זהות עם תעודה. האימות לוקח בין כמה שעות לכמה ימים.
3. **חשוב:** בחשבון אישי חדש, גוגל דורשת **בדיקה סגורה עם 12 בודקים לפחות במשך 14 יום** לפני שמותר לפרסם לכולם. כדאי לאסוף כבר עכשיו 12 כתובות Gmail של חברים ומשפחה.

### A2. מעלים את מפתח החתימה ל-Codemagic
את הקובץ `mokesh-upload.jks` והסיסמה קיבלתם ממני בצ'אט. **שמרו את שניהם במקום בטוח.** בלעדיהם אי אפשר לעדכן את האפליקציה.

1. ב-Codemagic: **Teams** ← הצוות שלכם ← **Code signing identities** ← **Android keystores**.
2. **Upload keystore** ← בוחרים את הקובץ.
3. ממלאים:
   - **Keystore password**, **Key alias** (`mokesh`), **Key password**: מהקובץ שקיבלתם.
   - **Reference name**: `mokesh_upload` (בדיוק ככה).
4. שומרים.

### A3. בונים את הקובץ לחנות
1. ב-Codemagic פותחים את האפליקציה ← **Start new build** ← בוחרים **Android — Google Play** ← **Start**.
2. אחרי כ-10 דקות, ב-**Artifacts** יש קובץ `app-release.aab`. מורידים אותו.

### A4. יוצרים את האפליקציה ב-Play Console
1. **Create app**:
   - שם: `מוקש! – משחק מסיבות`
   - שפת ברירת מחדל: **עברית – iw-IL**
   - **Game**
   - **Free**
   - מסמנים את ההצהרות.
2. **Testing ← Closed testing ← Create track** (או משתמשים ב-Alpha) ← **Testers**: מוסיפים רשימה עם 12 המיילים.
3. **Create new release** ← מעלים את ה-`.aab` ← **Next** ← **Save** ← **Send for review**.
4. שולחים לבודקים את קישור ההצטרפות (**Copy link**). הם צריכים להתקין ולפתוח את האפליקציה כמה פעמים במהלך 14 הימים.

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

### B1. מפתח API ל-Codemagic
1. https://appstoreconnect.apple.com ← **Users and Access** ← **Integrations** ← **App Store Connect API** ← **Team Keys** ← **+**.
2. שם: `Codemagic`, הרשאה: **Admin** ← **Generate**.
3. מורידים את קובץ ה-`.p8`. **אפשר להוריד אותו רק פעם אחת.** רושמים גם את ה-**Issuer ID** (למעלה) ואת ה-**Key ID**.
4. ב-Codemagic: **Teams** ← **Team integrations** ← **Developer Portal** ← **Manage keys** ← **Add key**:
   - **App Store Connect API key name**: `mokesh_asc` (בדיוק ככה)
   - **Issuer ID** ו-**Key ID** מהשלב הקודם
   - מעלים את קובץ ה-`.p8`
   - **Save**

### B2. מזהה אפליקציה
1. https://developer.apple.com/account/resources/identifiers/list ← **+** ← **App IDs** ← **App** ← **Continue**.
2. Description: `Mokesh`. Bundle ID: **Explicit** ← `com.mokesh.game`.
3. לא מסמנים יכולות נוספות ← **Continue** ← **Register**.

### B3. תעודה ופרופיל חתימה (דרך Codemagic, בלי Mac)
1. ב-Codemagic: **Code signing identities** ← **iOS certificates** ← **Generate certificate**:
   - Type: **Apple Distribution**
   - API key: `mokesh_asc`
   - Reference name: `mokesh_dist`
   - **Generate**. Codemagic שומר את התעודה ושולח אותה גם לאפל.
2. באתר של אפל: https://developer.apple.com/account/resources/profiles/list ← **+**:
   - **App Store Connect** ← **Continue**
   - App ID: `com.mokesh.game` ← התעודה שנוצרה עכשיו
   - שם: `Mokesh App Store` ← **Generate**
3. חזרה ל-Codemagic: **iOS provisioning profiles** ← **Fetch profiles** ← בוחרים את `Mokesh App Store` ← Reference name: `mokesh_profile` ← **Save**.

### B4. יוצרים את האפליקציה ב-App Store Connect
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

### B5. בונים ושולחים ל-TestFlight
ב-Codemagic: **Start new build** ← **iOS — App Store**. אחרי כ-15 דקות הבנייה עולה לבד ל-TestFlight. אחרי עוד 10–30 דקות של עיבוד אצל אפל, אפשר להתקין דרך אפליקציית TestFlight באייפון.

### B6. מה צריך למלא לפני שליחה לבדיקה
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
- **שינוי במעטפת** (אייקון, שם, הרשאות): בונים מחדש ב-Codemagic. מספר הבנייה עולה לבד. ב-Play מעלים את ה-`.aab` החדש. באפל זה מגיע ל-TestFlight ואז שולחים לבדיקה.
- **גרסה מוצגת** (1.0 ← 1.1):
  - אנדרואיד: `versionName` בקובץ `android/app/build.gradle`.
  - אייפון: `MARKETING_VERSION` בקובץ `ios/App/App.xcodeproj/project.pbxproj`.
