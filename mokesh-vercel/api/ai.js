// מוקש! — פונקציית שרת ל-Vercel: מפעילה את ״המחשב״ בלי לחשוף את המפתח לדפדפן.
// הגדירו ב-Vercel: ANTHROPIC_API_KEY (חובה), ANTHROPIC_MODEL (אופציונלי).
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const key = process.env.ANTHROPIC_API_KEY;
  if (req.method === 'GET') return res.status(200).json({ ok: !!key });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!key) return res.status(503).json({ error: 'ANTHROPIC_API_KEY missing' });

  const { prompt, json } = req.body || {};
  if (typeof prompt !== 'string' || prompt.length > 4000) return res.status(400).json({ error: 'bad prompt' });

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 120, temperature: 0.9,
      system: json ? 'השב אך ורק ב-JSON תקין, בלי טקסט נוסף ובלי גדרות קוד.' : 'אתה שחקן במשחק מסיבות בעברית. ענה קצר, בלי הקדמות.',
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!r.ok) return res.status(502).json({ error: 'anthropic ' + r.status, detail: await r.text() });
  const data = await r.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
  if (!json) return res.status(200).json({ text });
  try { return res.status(200).json({ value: JSON.parse(text.replace(/```json|```/g, '').trim()) }); }
  catch { return res.status(200).json({ value: null, text }); }
}
