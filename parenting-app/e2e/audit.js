// Layout + interaction audit on an iPhone-sized touch screen, using real taps and key presses.
const skipTour = async (page) => { const b = page.getByRole('button', { name: 'דילוג על ההסבר' }); if (await b.count()) { await b.tap(); await page.waitForTimeout(500); } };
const { chromium, devices } = require('playwright');
const problems = [];
const note = (screen, msg) => { problems.push(`[${screen}] ${msg}`); };

// Runs in the page: finds controls that are off-screen, overlapped by another control, or not hittable.
const scan = () => {
  const vw = window.innerWidth, out = [];
  const sel = 'input, textarea, [role="button"], [role="tab"], [role="radio"], [role="switch"], [role="link"]';
  const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && r.bottom > 0 && r.top < window.innerHeight; };
  const els = [...document.querySelectorAll(sel)].filter(visible);
  const name = (el) => (el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.innerText || el.tagName).trim().slice(0, 40);
  // Only the top-most layer counts (a sheet or dialog covers the page below it on purpose).
  const top = els.filter((el) => { const r = el.getBoundingClientRect(); const cx = Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), cy = r.top + r.height / 2; const hit = document.elementFromPoint(cx, cy); return hit && (el === hit || el.contains(hit) || hit.contains(el)); });
  const covered = els.filter((el) => !top.includes(el));
  for (const el of els) {
    const r = el.getBoundingClientRect();
    const scroller = el.closest('[style*="overflow-x"], .r-150rngu, .r-1rngwi6');
    if ((r.left < -1 || r.right > vw + 1) && !isInHorizontalScroller(el)) out.push(`off-screen: "${name(el)}" x=${Math.round(r.left)}..${Math.round(r.right)} of ${vw}`);
    if (r.width < 24 || r.height < 24) { if (el.tagName !== 'INPUT') out.push(`tiny target: "${name(el)}" ${Math.round(r.width)}x${Math.round(r.height)}`); }
  }
  function isInHorizontalScroller(el) { for (let p = el.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if ((s.overflowX === 'auto' || s.overflowX === 'scroll') && p.scrollWidth > p.clientWidth + 2) return true; } return false; }
  // inputs that are covered by something that is not an ancestor/descendant, while a sibling control is hit instead
  for (const el of covered) {
    if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') continue;
    const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(Math.min(vw - 1, Math.max(0, r.left + r.width / 2)), r.top + r.height / 2);
    const hitCtl = hit && hit.closest(sel);
    if (hitCtl && hitCtl !== el && (hitCtl.tagName === 'INPUT' || hitCtl.tagName === 'TEXTAREA')) out.push(`input "${name(el)}" is covered by input "${name(hitCtl)}"`);
  }
  if (document.documentElement.scrollWidth > vw + 2) out.push(`page scrolls sideways: ${document.documentElement.scrollWidth} > ${vw}`);
  // text clipped with ellipsis inside buttons / headings
  for (const el of document.querySelectorAll('[dir="auto"], div')) {
    if (el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow === 'ellipsis' && visible(el) && el.innerText.trim().length > 0) out.push(`text cut off: "${el.innerText.trim().slice(0, 40)}"`);
  }
  return [...new Set(out)];
};

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => note('runtime', 'PAGEERROR ' + e.message.slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') note('runtime', 'CONSOLE ' + m.text().slice(0, 160)); });
  await page.clock.install({ time: new Date('2026-11-19T20:00:00+02:00') });
  const w = (ms = 600) => page.waitForTimeout(ms);
  const audit = async (screen) => { for (const p of await page.evaluate(scan)) note(screen, p); await page.screenshot({ path: `${process.env.SHOTS_DIR || require('os').tmpdir()}/${screen.replace(/[^a-z0-9-]/gi, '_')}.png` }); };
  const tapBtn = async (name, exact = true) => { await page.getByRole('button', { name, exact }).last().tap(); await w(); };
  // Types with real key presses and reports if the field did not take the text.
  const type = async (screen, label, text, expect = text) => {
    const f = page.getByLabel(label, { exact: true }).last();
    try { await f.tap({ timeout: 5000 }); } catch { note(screen, `cannot tap field "${label}"`); return; }
    await page.keyboard.type(text, { delay: 25 }); await w(200);
    const v = await f.inputValue();
    if (v !== expect) note(screen, `typed "${text}" into "${label}" but it holds "${v}"`);
  };
  const scrollAll = async (screen) => {
    // audit the screen at several scroll positions of its main scroller
    for (let i = 0; i < 6; i += 1) {
      await audit(`${screen}-${i}`);
      const more = await page.evaluate(() => { const s = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 60 && getComputedStyle(d).overflowY !== 'visible' && d.offsetParent && d.getBoundingClientRect().width > 300); const el = s[s.length - 1]; if (!el) return false; const before = el.scrollTop; el.scrollTop += Math.round(window.innerHeight * 0.7); return el.scrollTop > before + 5; });
      await w(350);
      if (!more) break;
    }
  };

  await page.goto('http://localhost:4173/'); await w(3000); await audit('tour'); await skipTour(page);
  await scrollAll('welcome');
  // --- auth screens
  await tapBtn('כבר יש לי חשבון'); await audit('sign-in');
  await type('sign-in', 'אימייל', 'someone@example.com'); await type('sign-in', 'סיסמה', 'abcd1234');
  await tapBtn('אין לי חשבון עדיין'); await scrollAll('sign-up');
  await type('sign-up', 'השם שלך', 'דנה'); await type('sign-up', 'אימייל', 'someone@example.com'); await type('sign-up', 'סיסמה', 'abcd1234');
  await tapBtn('חזרה'); await w(800);
  // --- child form
  await page.goto('http://localhost:4173/'); await w(2500); await skipTour(page);
  await page.getByText('להתחיל בלי חשבון').tap(); await w(900);
  await scrollAll('child-form');
  await page.evaluate(() => { for (const d of document.querySelectorAll('div')) d.scrollTop = 0; });
  await type('child-form', 'שם', 'עלמה'); await type('child-form', 'תאריך לידה, יום', '19'); await type('child-form', 'תאריך לידה, חודש', '5'); await type('child-form', 'תאריך לידה, שנה', '2026');
  await type('child-form', 'שבוע לידה (לא חובה)', '39'); await type('child-form', 'הערות אישיות (לא חובה)', 'הערה');
  await page.getByRole('tab', { name: 'בת', exact: true }).tap();
  await tapBtn('שמירה והמשך'); await w(1500);
  if (!(await page.innerText('body')).includes('עלמה')) note('child-form', 'saving the child did not reach Home');
  await scrollAll('home-empty');
  // --- add sheet + every form
  const openForm = async (label) => { await tapBtn('הוספת פעילות'); await audit('add-sheet'); await tapBtn(label); await w(900); };
  await openForm('בקבוק'); await scrollAll('form-bottle');
  await type('form-bottle', 'כמות, מ״ל', '135'); await type('form-bottle', 'מתי, שעה', '18', '18'); await type('form-bottle', 'מתי, דקות', '5', '5');
  await page.getByLabel('הערות (לא חובה)').tap(); await w(300);
  if ((await page.getByLabel('מתי, דקות').inputValue()) !== '05') note('form-bottle', 'minutes did not normalise to 05 after leaving the field');
  await type('form-bottle', 'הערות (לא חובה)', 'אכלה יפה');
  await tapBtn('הוספת 10 מ״ל לכמות'); if ((await page.getByLabel('כמות, מ״ל').inputValue()) !== '145') note('form-bottle', 'plus button did not add 10');
  await tapBtn('שמירה'); await w(1000);
  if (!(await page.innerText('body')).includes('145 מ״ל')) note('form-bottle', 'saved bottle (145 ml at 18:05) is not shown on Home');

  await openForm('הנקה'); await scrollAll('form-nursing');
  await page.evaluate(() => { for (const d of document.querySelectorAll('div')) d.scrollTop = 0; });
  await type('form-nursing', 'דקות בצד ימין, ד׳', '7'); await type('form-nursing', 'דקות בצד שמאל, ד׳', '9');
  await tapBtn('שמירה'); await w(900);
  await openForm('שאיבה'); await scrollAll('form-pumping');
  await page.evaluate(() => { for (const d of document.querySelectorAll('div')) d.scrollTop = 0; });
  await type('form-pumping', 'כמות בצד ימין, מ״ל', '60'); await type('form-pumping', 'כמות בצד שמאל, מ״ל', '45'); await type('form-pumping', 'משך השאיבה, דקות', '15');
  if (!(await page.innerText('body')).includes('105 מ״ל')) note('form-pumping', 'total did not update to 105');
  await tapBtn('שמירה'); await w(900);
  await openForm('שינה'); await audit('form-sleep-timer');
  await page.getByRole('tab', { name: 'הזנה בדיעבד' }).tap(); await w(400); await scrollAll('form-sleep-manual');
  await page.evaluate(() => { for (const d of document.querySelectorAll('div')) d.scrollTop = 0; });
  await type('form-sleep', 'שעת התחלה, שעה', '13'); await type('form-sleep', 'שעת התחלה, דקות', '0', '0'); await type('form-sleep', 'שעת סיום, שעה', '14'); await type('form-sleep', 'שעת סיום, דקות', '30');
  await page.getByLabel('הערות (לא חובה)').tap(); await w(300);
  if (!(await page.innerText('body')).includes('1 ש׳ 30 ד׳')) note('form-sleep', 'duration did not compute to 1h30');
  await tapBtn('שמירה'); await w(900);
  await openForm('חיתול'); await page.getByRole('tab', { name: 'יציאה', exact: true }).tap(); await w(300); await scrollAll('form-diaper');
  await tapBtn('שמירה'); await w(900);
  await openForm('מוצקים'); await scrollAll('form-solids');
  await page.evaluate(() => { for (const d of document.querySelectorAll('div')) d.scrollTop = 0; });
  await type('form-solids', 'שם המזון', 'בטטה'); await tapBtn('הוספה');
  if (!(await page.innerText('body')).includes('בטטה')) note('form-solids', 'food was not added');
  await type('form-solids', 'תגובה שנצפתה (לא חובה)', 'אהבה');
  await tapBtn('שמירה'); await w(900);
  await openForm('פעילות נוספת'); await audit('form-other'); await type('form-other', 'שם הפעילות', 'אמבטיה'); await tapBtn('שמירה'); await w(900);
  const home = await page.innerText('body');
  for (const expected of ['הנקה', 'שאיבה', 'אמבטיה', 'בטטה']) if (!home.includes(expected)) note('home', `saved "${expected}" is missing from recent activity`);
  await page.evaluate(() => { for (const d of document.querySelectorAll('div')) d.scrollTop = 0; }); await w(300);
  await scrollAll('home-full');
  // --- tabs
  await page.getByRole('tab', { name: 'יומן' }).tap(); await w(900); await scrollAll('journal');
  await page.getByRole('tab', { name: 'נתונים' }).tap(); await w(1000); await scrollAll('stats');
  await page.evaluate(() => { for (const d of document.querySelectorAll('div')) d.scrollTop = 0; }); await w(300);
  await page.getByRole('tab', { name: 'מותאם' }).tap(); await w(600); await audit('stats-range-sheet');
  await type('stats-range', 'מתאריך, יום', '1'); await type('stats-range', 'מתאריך, חודש', '11'); await type('stats-range', 'מתאריך, שנה', '2026');
  await tapBtn('הצגת הנתונים'); await w(600);
  await page.getByRole('tab', { name: 'הילד שלי' }).tap(); await w(900); await scrollAll('child-tab');
  await page.evaluate(() => { for (const d of document.querySelectorAll('div')) d.scrollTop = 0; }); await w(300);
  await tapBtn('מדידות גדילה'); await w(800); await audit('growth-empty');
  await tapBtn('הוספת מדידה'); await audit('growth-sheet');
  await type('growth', 'משקל (ק״ג)', '7.25'); await type('growth', 'אורך / גובה (ס״מ)', '66.5'); await type('growth', 'היקף ראש (ס״מ)', '42');
  await tapBtn('שמירה'); await w(900);
  if (!(await page.innerText('body')).includes('7.25 ק״ג')) note('growth', 'measurement was not saved');
  await audit('growth-with-data');
  await page.goto('http://localhost:4173/updates'); await w(2500); await audit('updates');

  console.log(problems.length ? [...new Set(problems)].join('\n') : 'NO PROBLEMS FOUND');
  await browser.close();
})().catch((e) => { console.log([...new Set(problems)].join('\n')); console.error('AUDIT SCRIPT STOPPED:', e.message.slice(0, 400)); process.exit(1); });
