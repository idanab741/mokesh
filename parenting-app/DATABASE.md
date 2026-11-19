# מסד הנתונים

Postgres (Supabase). מיגרציות: `supabase/migrations/`. כל הזמנים `timestamptz` ב-UTC; ההצגה לפי אזור הזמן של המכשיר.

| קובץ | תוכן |
|---|---|
| `20261119000100_core_schema.sql` | טבלאות, אילוצים, אינדקסים, טריגרים |
| `20261119000200_access_control.sql` | פונקציות הרשאה, RPC, RLS לכל הטבלאות |
| `20261119000300_storage.sql` | bucket פרטי `family-media` ומדיניות קבצים |

## טבלאות
| טבלה | תפקיד |
|---|---|
| `users` | פרופיל, נוצר אוטומטית מ-`auth.users` |
| `families`, `family_members` | משפחה, חברים, תפקיד והרשאות |
| `children` | ילדים (מחיקה רכה, `version`) |
| `activity_events` | כל פעילויות המעקב: `activity_type` + `payload` מאומת |
| `measurements` | משקל / אורך / היקף ראש |
| `milestones` | אבני דרך שהמשפחה סימנה (הקטלוג עצמו הוא תוכן, לא נתוני משתמש) |
| `health_records` | תסמינים, חיסונים, סיכומי ביקור |
| `medications`, `medication_administrations` | תרופות ומתן בפועל (טקסט שההורה מזין; המערכת לא מחשבת מינון) |
| `appointments`, `reminders`, `notification_preferences` | תורים, תזכורות, העדפות |
| `media_assets` | מטא-דאטה לקבצים ב-Storage |
| `invitations` | הזמנות (נשמר רק hash של הטוקן) |
| `audit_logs` | מי/מה/מתי בלבד, ללא נתוני ילדים |
| `consents` | הסכמות, append-only |

## activity_events
`id, child_id, created_by, activity_type, occurred_at, started_at, ended_at, payload, notes, client_event_id, created_at, updated_at, deleted_at, version`

- `payload` נבדק ב-CHECK (`is_valid_activity_payload`): למשל בקבוק 1–500 מ״ל, סוג חיתול מתוך רשימה.
- `unique (child_id, client_event_id)` מונע כפילויות בניסיון חוזר.
- `version` עולה בכל UPDATE (טריגר) ומשמש ל-compare-and-set בסנכרון.
- אין DELETE ללקוחות: מחיקה היא `deleted_at` כדי שתסתנכרן.
- `created_by` נקבע בשרת מ-`auth.uid()`; `child_id` אינו ניתן לשינוי.
- אינדקסים: `(child_id, occurred_at)`, `(child_id, activity_type, occurred_at)`, `(child_id, updated_at)`.

## תפקידים והרשאות
| תפקיד | מעקב שוטף | בריאות / גדילה / אבני דרך | ניהול ילדים | ניהול משפחה |
|---|---|---|---|---|
| owner (הורה ראשי) | קריאה + כתיבה | קריאה + כתיבה | כן | כן |
| parent | קריאה + כתיבה | קריאה + כתיבה | כן | לא |
| caregiver (מטפלת) | קריאה + כתיבה | אין גישה (ברירת מחדל) | לא | לא |
| relative (בן משפחה) | קריאה בלבד | אין גישה | לא | לא |

ההרשאות נשמרות כדגלים על `family_members` (`can_edit_tracking`, `can_view_health`, `can_edit_health`)
והורה ראשי יכול לשנות אותן. האכיפה ב-RLS דרך `can_read_child`, `can_write_tracking`, `can_read_health`, `can_write_health`.

## RPC
| פונקציה | מה עושה |
|---|---|
| `create_family(name)` | יוצר משפחה והופך את הקורא ל-owner |
| `create_invitation(family, role, ...)` | owner בלבד; מחזיר טוקן חד-פעמי (נשמר רק SHA-256) |
| `accept_invitation(token)` | מצרף למשפחה; שגיאה אחידה לכל כישלון כדי שלא ניתן לנחש טוקנים |
| `revoke_invitation(id)` | owner בלבד |
| `delete_my_data()` | מוחק פרופיל, חברויות, ומשפחות שהקורא חבר יחיד בהן |

כללים נוספים: משפחה חייבת owner אחד לפחות; אין INSERT ישיר ל-`family_members`/`invitations`; שינויי חברות נרשמים ב-`audit_logs`.

## בדיקות
`npm run test:db` מקים DB זמני על Postgres מקומי, מריץ את המיגרציות (מלבד storage) ואת `supabase/tests/rls_test.sql`:
56 בדיקות, בין היתר הפרדה מלאה בין משפחות, מטפלת בלי גישה רפואית, בן משפחה לקריאה בלבד, הסרת חבר, אילוצי payload וגרסאות.
הקובץ `00_local_auth_stub.sql` מדמה את `auth.uid()` והתפקידים של Supabase לצורך הבדיקה בלבד.

## גיבוי ומחיקה
- גיבוי: יש להפעיל PITR / גיבוי יומי בפרויקט Supabase (הגדרת פרויקט, לא חלק מהמיגרציות).
- מחיקת חשבון: `delete_my_data()` מוחק את הנתונים. מחיקת זהות ה-auth עצמה דורשת service role, ולכן תתבצע ב-edge function שעדיין לא נכתבה.
- שורות במחיקה רכה נשמרות לצורך סנכרון; ניקוי תקופתי שלהן עדיין לא מוגדר.

## מסד מקומי
`src/data/db/schema.ts`: `children`, `activity_events`, `measurements`, `kv`. שמות העמודות זהים לשרת, בתוספת
`sync_status`, `conflict_remote` ו-`photo_uri` (מקומי בלבד). גרסת הסכמה מנוהלת ב-`PRAGMA user_version`.
