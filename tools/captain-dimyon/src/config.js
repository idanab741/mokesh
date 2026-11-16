// ✦ כל מה שצריך לעדכן בדף נמצא כאן ✦
// שדה ריק ('') = הפריט מוסתר או מוצג בגרסה כללית. ראו גם TODO.md

export const config = {
  // [להשלים] שמות הדמויות. כל עוד ריק, יוצג "המפלצת" / "השפן" בלבד.
  names: {
    monster: '',
    bunny: '',
  },

  // [להשלים] קישורי רשתות. קישור ריק לא יוצג.
  social: {
    instagram: '',
    tiktok: '',
    facebook: '',
  },

  // [להשלים] שמות הספרים הבאים (טיזר)
  teasers: [
    'קפטן דמיון והצל שבארון',
    'קפטן דמיון והקול מהאמבטיה',
    'קפטן דמיון והכוכב שנפל',
  ],

  // [להשלים] "איך הכל התחיל". כל עוד ריק, המקטע מוסתר.
  // אפשר כמה פסקאות: כל פריט במערך הוא פסקה.
  story: [],

  // טופס המועדון. ריק = מדמה הצלחה בלי לשלוח.
  // Netlify Forms: '/'  ·  Mailchimp / Brevo: כתובת ה־endpoint שלהם
  formEndpoint: '',

  // ה־Hero: האיור (key-art), מיקום העיניים מתחת למיטה והמקום שבו המפלצת קופצת.
  // אם מחליפים את האיור, צריך למדוד מחדש.
  hero: {
    // the hero illustration and its pixel size
    img: { w: 1731, h: 909 },
    // the two glowing eyes under the bed, as % of the illustration's width/height
    eyes: { x: 80.9, y: 77.6 },
    // where the monster lands when the light comes on: floor = its feet (% of height), width = % of the illustration's width
    monster: { floor: 92, width: 14, dx: -5 },
    // object-position of the illustration: phones / wide screens
    focus: { x: 68, y: 60 },
    focusWide: { x: 0, y: 50 },
    autoLightMs: 5000,
  },

};
