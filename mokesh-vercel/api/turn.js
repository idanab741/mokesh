// מוקש! — פרטי שרת תיווך (TURN) לשיחה הקולית, כדי שתעבוד גם בגלישה סלולרית.
// הגדירו ב-Vercel: CF_TURN_KEY_ID ו-CF_TURN_API_TOKEN (מ-Cloudflare ← Realtime ← TURN Server).
// בלי ההגדרות מוחזר רק STUN (עובד ב-WiFi, לא תמיד בסלולר).
const STUN = [{ urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] }];
let cache = null;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const origin = req.headers.origin || req.headers.referer || '';
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  if (origin && !origin.includes(host)) return res.status(403).json({ error: 'origin' });
  const id = process.env.CF_TURN_KEY_ID, token = process.env.CF_TURN_API_TOKEN;
  if (!id || !token) return res.status(200).json({ iceServers: STUN, turn: false });
  // אותם פרטים לכמה שעות: חוסך קריאות ל-Cloudflare
  if (cache && cache.until > Date.now()) return res.status(200).json({ iceServers: cache.ice, turn: true });
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${id}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 6 * 3600 }),
    });
    if (!r.ok) throw new Error('cloudflare ' + r.status);
    const d = await r.json();
    const ice = Array.isArray(d.iceServers) ? d.iceServers : [d.iceServers];
    cache = { ice, until: Date.now() + 4 * 3600 * 1000 };
    return res.status(200).json({ iceServers: ice, turn: true });
  } catch (e) {
    console.error('turn', e);
    return res.status(200).json({ iceServers: STUN, turn: false });
  }
}
