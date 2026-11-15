---
name: promo-video-builder
description: Build vertical promo videos (Reels/Stories, 1080x1920) from HTML with real animated UI, render frames with Playwright and encode with ffmpeg. Use for any ad or promo video.
---

# בניית סרטון פרומו

## לפני שמתחילים
1. סיפור אחד עם פתיחה של 3 שניות שהצופה מזהה בה את עצמו ("גם לך יש פתק כזה?").
2. להציג סטוריבורד/פריימים לאישור לפני הפקה מלאה.
3. עיצוב לפי ia-studio-brand או triplace-brand.

## מבנה טכני
- עמוד HTML 1080x1920 עם סצנות `[data-t][data-d]` ופונקציה `window.render(t)`.
- `render` מציג את הסצנה הפעילה, ומסנכרן אנימציות CSS: `el.getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=lt*1000})`.
- הקלדה: `data-type` עם זמני התחלה/סוף. מונים: `data-count`.
- ממשק אפליקציה ב-393x852 בתוך wrapper שמוקטן עם `transform:scale`. **לא לשים scale על אלמנט שיש לו אנימציה** (האנימציה דורסת את ה-transform).
- תנועת מצלמה לטלפון: keyframes ב-JS (translateY/rotateX/rotateY/scale), עם `transform-origin:50% 0` כשמזמים, כדי לא לכסות כותרות.

## רינדור
- Playwright: לכל פריים `render(i/30)` ו-screenshot ל-JPEG.
- ffmpeg: `-framerate 30 -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart`.
- לבדוק דף דגימות (contact sheet) של 10-14 פריימים לפני קידוד סופי.

## מוזיקה
- עידן מוסיף שיר בעצמו. אם הקובץ שהוא שולח דחוס (למשל 576x1024), לקחת ממנו **רק את האודיו** ולחבר לווידאו המקורי ב-1080p.
