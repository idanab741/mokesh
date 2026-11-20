const { chromium } = require('playwright');
const S = (process.env.SHOTS_DIR || require('os').tmpdir()) + '/';
const results = [];
const check = (name, cond) => { results.push(`${cond ? 'PASS' : 'FAIL'} ${name}`); };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text().slice(0, 300)); });
  const shot = (n) => page.screenshot({ path: S + n + '.png' });
  const body = () => page.innerText('body');
  const btn = (name, exact = true) => page.getByRole('button', { name, exact }).last();
  const wait = (ms = 500) => page.waitForTimeout(ms);

  await page.clock.install({ time: new Date('2026-11-19T20:00:00+02:00') });
  await page.goto('http://localhost:4173/');
  await page.waitForTimeout(2500);
  await page.getByText('מתחילים').click();
  await wait();
  // --- child profile
  await page.getByLabel('שם', { exact: true }).fill('עלמה');
  // Real clicks and key presses (not fill): this is how the "cannot type the year" bug was missed.
  await page.getByLabel('תאריך לידה, יום').click(); await page.keyboard.type('19', { delay: 30 });
  await page.getByLabel('תאריך לידה, חודש').click(); await page.keyboard.type('5', { delay: 30 });
  await page.getByLabel('תאריך לידה, שנה').click(); await page.keyboard.type('2026', { delay: 30 });
  check('year can be typed into the birth-date field', (await page.getByLabel('תאריך לידה, שנה').inputValue()) === '2026');
  const boxes = [];
  for (const l of ['תאריך לידה, יום', 'תאריך לידה, חודש', 'תאריך לידה, שנה']) boxes.push(await page.getByLabel(l).boundingBox());
  check('date fields fit inside the screen and do not overlap',
    boxes.every((b) => b.x >= 0 && b.x + b.width <= 390) && boxes[2].x + boxes[2].width <= boxes[1].x && boxes[1].x + boxes[1].width <= boxes[0].x);
  await page.getByRole('tab', { name: 'בת', exact: true }).click();
  await shot('02-add-child');
  await btn('שמירה והמשך').click();
  await wait(1200);
  await shot('03-home-empty');
  let t = await body();
  check('home shows child name and age', t.includes('עלמה') && t.includes('בת 6 חודשים'));
  check('home empty state, no invented data', t.includes('מתחילים לתעד את עלמה') && t.includes('0 האכלות'));

  // --- the baby character: shown as video for every child, and it waves when tapped
  t = await body();
  const clip = page.locator('[data-testid="baby-clip"]');
  check('home shows the baby as video, for a girl too', (await clip.count()) === 1);
  check('the baby clip is a playing video', await clip.locator('video').first().evaluate((v) => /\.mp4/.test(v.currentSrc || v.src)));
  // the greeting wave plays by itself first; once it is over, a tap must start it again
  await page.waitForSelector('[data-testid="baby-clip"][data-waving="0"]', { timeout: 15000 }).catch(() => {});
  await wait(600); await clip.click();
  check('tapping the baby plays the wave', await page.waitForSelector('[data-testid="baby-clip"][data-waving="1"]', { timeout: 4000 }).then(() => true, () => false));
  check('no look editor while the baby is a plain clip', (await page.getByRole('button', { name: 'התאמת המראה של הדמות' }).count()) === 0);
  await shot('03c-home-with-baby');

  // --- add sheet
  await btn('הוספת פעילות').click();
  await wait(600);
  await shot('04-add-sheet');
  await btn('בקבוק').click();
  await wait(800);
  await shot('05-bottle-form');
  await btn('שמירה').click();
  await wait(900);
  t = await body();
  check('bottle saved -> home shows 1 feeding 120ml', t.includes('האכלה אחת') && t.includes('120 מ״ל בבקבוק'));

  // second bottle with custom amount
  const addBottle = async (ml, daysBack = 0, hour = null) => {
    await btn('הוספת פעילות').click(); await wait(500);
    await btn('בקבוק').click(); await wait(700);
    const amount = page.getByLabel('כמות, מ״ל');
    await amount.fill(String(ml)); await amount.blur();
    for (let i = 0; i < daysBack; i++) await btn('יום קודם').click();
    if (hour !== null) { const h = page.getByLabel('מתי, שעה'); await h.fill(String(hour)); await h.blur(); }
    await btn('שמירה').click(); await wait(800);
  };
  await addBottle(90, 0, 6);
  t = await body();
  check('second bottle sums to 210ml', t.includes('2 האכלות') && t.includes('210 מ״ל בבקבוק'));
  await btn('תיעוד האכלה').click(); await wait(700);
  t = await body();
  check('quick log starts from an amount the family really gave', t.includes('שמירה: בקבוק 120 מ״ל · עכשיו') && t.includes('90'));
  await shot('05b-quick-feed');
  await btn('סגירה').click(); await wait(500);

  // --- quick diaper
  await btn('תיעוד חיתול').click(); await wait(600); await shot('05c-quick-diaper');
  await btn('חיתול רטוב').click(); await wait(900);
  t = await body();
  check('one-tap diaper counted', t.includes('החלפה אחת'));

  // --- sleep timer
  await btn('התחלת שינה').click(); await wait(600);
  await btn('התחלת שינה · עכשיו').click(); await wait(1500);
  t = await body();
  check('sleep timer running banner', t.includes('עלמה ישנה') && t.includes('סיום שינה'));
  await shot('06-home-sleeping');
  await page.reload(); await wait(3000);
  t = await body();
  check('after reload: data + running timer persisted', t.includes('2 האכלות') && t.includes('עלמה ישנה'));
  await btn('סיום שינה').click(); await wait(600);
  await page.getByRole('button', { name: /^סיום שינה ·/ }).click(); await wait(900);
  t = await body();
  check('sleep ended', !t.includes('עלמה ישנה'));

  // --- retro sleep crossing midnight: yesterday 21:00 -> today 05:30
  await btn('הוספת פעילות').click(); await wait(500);
  await btn('שינה').click(); await wait(700);
  await page.getByRole('tab', { name: 'הזנה בדיעבד' }).click(); await wait(300);
  await page.getByRole('button', { name: 'יום קודם' }).first().click();
  let f = page.getByLabel('שעת התחלה, שעה'); await f.fill('21'); await f.blur();
  f = page.getByLabel('שעת התחלה, דקות'); await f.fill('0'); await f.blur();
  f = page.getByLabel('שעת סיום, שעה'); await f.fill('5'); await f.blur();
  f = page.getByLabel('שעת סיום, דקות'); await f.fill('30'); await f.blur();
  await wait(300);
  await shot('07-sleep-form');
  check('sleep form shows 8.5h duration', (await body()).includes('8 ש׳ 30 ד׳'));
  await btn('שמירה').click(); await wait(900);
  t = await body();
  check('today counts only the part after midnight (5.5h)', t.includes('5 ש׳ 30 ד׳'));

  // --- solids
  await btn('הוספת פעילות').click(); await wait(500);
  await btn('מוצקים').click(); await wait(700);
  await page.getByLabel('שם המזון').fill('בטטה'); await btn('הוספה').click();
  await page.getByLabel('שם המזון').fill('טחינה');
  await page.getByLabel('לסמן את המזון החדש כאלרגני').click();
  await btn('הוספה').click();
  await page.getByText('מחית חלקה').click();
  await wait(300); await shot('08-solids-form');
  await btn('שמירה').click(); await wait(900);

  // --- nursing manual + diaper detailed
  await btn('הוספת פעילות').click(); await wait(500);
  await btn('הנקה').click(); await wait(700);
  await page.getByRole('button', { name: /^צד ימין/ }).click(); await wait(2200);
  check('nursing timer counts from timestamps', /00:0[2-4]/.test(await body()));
  await shot('09-nursing-form');
  await page.getByRole('button', { name: /^צד שמאל/ }).click(); await wait(1200);
  await btn('שמירה').click(); await wait(900);
  await btn('הוספת פעילות').click(); await wait(500);
  await btn('חיתול').click(); await wait(700);
  await page.getByRole('tab', { name: 'יציאה', exact: true }).click(); await wait(300);
  await btn('צהוב').click(); await btn('רך').click();
  await shot('10-diaper-form');
  await btn('שמירה').click(); await wait(900);

  // --- past days for stats
  const plan = [[1, [120, 130, 110, 140]], [2, [100, 120, 120]], [3, [110, 110, 130, 120]], [4, [90, 120]], [5, [120, 125, 115]]];
  for (const [back, amounts] of plan) { let h = 7; for (const ml of amounts) { await addBottle(ml, back, h); h += 4; } }
  await page.evaluate(() => window.scrollTo(0, 0));
  await wait(400);
  await shot('11-home-full');
  await page.locator('body').evaluate(() => { const s = [...document.querySelectorAll('div')].find((d) => d.scrollHeight > d.clientHeight + 200 && getComputedStyle(d).overflowY !== 'visible'); if (s) s.scrollTop = 420; });
  await wait(400); await shot('12-home-scrolled');

  // --- journal
  await page.getByRole('tab', { name: 'יומן' }).click(); await wait(900);
  await shot('13-journal');
  t = await body();
  check('journal lists today events incl. cross-midnight sleep', t.includes('\u206621:00–05:30\u2069') && t.includes('התחילה ביום הקודם') && t.includes('בטטה, טחינה'));
  await page.getByRole('button', { name: 'האכלות', exact: true }).click(); await wait(400);
  t = await body();
  check('filter feedings hides diapers', !t.includes('רטוב ויציאה') && t.includes('תמ״ל'));
  await shot('14-journal-filter');
  await page.getByRole('button', { name: 'הכול', exact: true }).click();
  await btn('היום הקודם').click(); await wait(600);
  t = await body();
  check('yesterday shows its 4 bottles + sleep continuing', t.includes('אתמול') && t.includes('נמשכה ליום הבא'));
  await shot('15-journal-yesterday');
  await btn('חזרה להיום').click(); await wait(500);

  // --- edit + delete from journal
  await page.getByRole('button', { name: /^בקבוק, 06:00/ }).click(); await wait(800);
  const amount = page.getByLabel('כמות, מ״ל'); await amount.fill('150'); await amount.blur();
  await shot('16-edit-bottle');
  await btn('שמירת שינויים').click(); await wait(900);
  await page.getByRole('tab', { name: 'בית' }).click(); await wait(700);
  t = await body();
  check('edit 90->150 updates total to 270ml', t.includes('270 מ״ל בבקבוק'));
  await page.getByRole('tab', { name: 'יומן' }).click(); await wait(700);
  await page.getByRole('button', { name: /^בקבוק, 06:00/ }).click(); await wait(800);
  await btn('מחיקת הרשומה').click(); await wait(400);
  await shot('17-delete-confirm');
  await btn('מחיקה').click(); await wait(900);
  await page.getByRole('tab', { name: 'בית' }).click(); await wait(700);
  t = await body();
  check('delete removes it from the total (120ml left)', t.includes('120 מ״ל בבקבוק') && !t.includes('270 מ״ל'));

  // --- stats
  await page.getByRole('tab', { name: 'נתונים' }).click(); await wait(1200);
  await shot('18-stats-week');
  t = await body();
  check('stats week shows totals from real data', t.includes('האכלות') && t.includes('סה״כ בבקבוק'));
  
  const scroller = async (y) => page.locator('body').evaluate((_, y) => { const s = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 200 && getComputedStyle(d).overflowY !== 'visible' && d.offsetParent); const el = s[s.length - 1]; if (el) el.scrollTop = y; }, y);
  await scroller(520); await wait(400); await shot('19-stats-sleep');
  await scroller(1250); await wait(400); await shot('20-stats-more');
  await scroller(0);
  await page.getByRole('tab', { name: 'יום', exact: true }).click(); await wait(600); await shot('21-stats-day');
  await page.getByRole('tab', { name: 'חודש' }).click(); await wait(600); await shot('22-stats-month');

  // --- second child isolation
  await page.getByRole('tab', { name: 'הילד שלי' }).click(); await wait(700);
  await shot('23-child-tab');
  await btn('הוספת ילד/ה').click(); await wait(700);
  await page.getByLabel('שם', { exact: true }).fill('נועם');
  await page.getByLabel('תאריך לידה, יום').fill('1');
  await page.getByLabel('תאריך לידה, חודש').fill('8');
  await page.getByLabel('תאריך לידה, שנה').fill('2024');
  await page.getByRole('tab', { name: 'בן', exact: true }).click();
  await btn('שמירה והמשך').click(); await wait(1200);
  t = await body();
  check('new child is active with empty data (no leak from sibling)', t.includes('נועם') && t.includes('בן שנתיים ו-3 חודשים') && t.includes('0 האכלות') && !t.includes('בטטה'));
  await shot('24-second-child');
  await page.getByRole('button', { name: /^נועם/ }).first().click(); await wait(600);
  await shot('25-child-switcher');
  await page.getByRole('radio', { name: 'עלמה' }).last().click(); await wait(800);
  t = await body();
  check('switching back shows the first child data', t.includes('עלמה') && t.includes('120 מ״ל בבקבוק'));

  // --- growth
  await page.getByRole('tab', { name: 'הילד שלי' }).click(); await wait(600);
  await btn('מדידות גדילה').click(); await wait(800);
  for (const [d, m, w, l] of [[20, 9, '6.4', '62'], [22, 10, '6.9', '64.5'], [18, 11, '7.3', '66']]) {
    await btn('הוספת מדידה').click(); await wait(500);
    await page.getByLabel('תאריך המדידה, יום').fill(String(d));
    await page.getByLabel('תאריך המדידה, חודש').fill(String(m));
    await page.getByLabel('משקל (ק״ג)').fill(w);
    await page.getByLabel('אורך / גובה (ס״מ)').fill(l);
    await btn('שמירה').click(); await wait(800);
  }
  await shot('26-growth');
  check('growth lists 3 measurements', (await body()).includes('7.3 ק״ג'));

  await page.goto('http://localhost:4173/updates'); await wait(2500); await shot('27-updates');

  // --- the routine is learned from the diary: six bottles three hours apart yesterday
  await page.goto('http://localhost:4173/'); await wait(2500);
  for (const hour of [6, 9, 12, 15, 18, 21]) await addBottle(120, 1, hour);
  t = await body();
  check('routine learned: next feeding predicted from the family\'s own 3-hour gap', t.includes('הבאה') && t.includes('אצלכם כל 3 ש׳'));
  await page.evaluate(() => window.scrollTo(0, 0)); await shot('28-home-routine');
  await shot('29-tracking'); await page.mouse.move(195, 400); await page.mouse.wheel(0, 520); await wait(900); await shot('30-below');

  console.log(results.join('\n'));
  console.log('ERRORS:', [...new Set(errors)].join('\n') || 'none');
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT FAILED', e.message.slice(0, 600)); process.exit(1); });
