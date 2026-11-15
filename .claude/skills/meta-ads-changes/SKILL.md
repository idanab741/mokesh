---
name: meta-ads-changes
description: Safe procedure for changing live Meta ads: creating ads, swapping creatives or links, budgets, schedules, audiences and exclusions. Use before any write to the ad account.
---

# שינויים במודעות מטא

## כלל ברזל
**לא לשנות תקציב, קהל, תאריכים או סטטוס בלי אישור מפורש של עידן באותה שיחה.** אישור קודם לא חל על שינוי חדש.

## החלפת קריאייטיב או לינק (מודעה חיה)
1. ליצור מודעה חדשה באותה קבוצת מודעות (נוצרת PAUSED).
2. לבקש אישור.
3. להפעיל את החדשה.
4. **לחכות שהיא יוצאת מ-IN_PROCESS/preparing**, ורק אז להשהות את הישנה. אחרת יש זמן שבו שום מודעה לא רצה.
5. לעדכן את הבדיקה היומית עם מזהה המודעה החדשה.

## מדיה
- העלאה מקומית לא נתמכת. מעלים את הקובץ ל-`mokesh-vercel/studio-assets/ad/`, ממזגים, מחכים שה-URL מחזיר 200 עם הגודל הנכון, ואז `ads_creative_upload_media` מ-URL.
- וידאו חייב תמונת שער (`image_url`). לחכות ש-`video_status` הוא `ready`.

## קהלים
- עדכון `targeting` מחליף את כל המפרט: להעתיק את הקיים במלואו. לא להחליף `location_types` בטעות.
- שינוי קהל במודעה פעילה גורם להשהיה אוטומטית ולבדיקה חוזרת: להפעיל מחדש מיד (באישור).
- לא להמציא מזהי תחומי עניין. בלי מזהה אמיתי, להשאיר Advantage+.
- החרגה קיימת: עוקבי idash101 (`52621715398016`).
