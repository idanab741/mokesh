// Photo journal against the real backend: device A adds a picture, device B (same account) gets
// the preview with the row and the full file from Storage; a delete on B reaches A.
// Needs a cloud build served on :4173 and TEST_EMAIL / TEST_PW.
const { chromium } = require('playwright');
const path = require('path');
const skipTour = async (page) => { await page.addLocatorHandler(page.getByRole('button', { name: 'דילוג על ההסבר' }), async (b) => { await b.evaluate((el) => el.click()); }); };
const OWNER = process.env.TEST_EMAIL; const PW = process.env.TEST_PW;
const S = (process.env.SHOTS_DIR || require('os').tmpdir()) + '/';
const PICTURE = path.join(__dirname, '..', 'assets', 'welcome', 'poster.jpg');

(async () => {
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' } } : {});
  const errors = []; let failed = 0;
  const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed += 1; };
  const device = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${name} PAGEERROR ${e.message}`));
    const d = { page,
      body: () => page.innerText('body'),
      btn: (n) => page.getByRole('button', { name: n, exact: true }).last(),
      wait: (ms = 700) => page.waitForTimeout(ms),
      tab: async (n) => { await page.getByRole('tab', { name: n, exact: true }).click(); await page.waitForTimeout(700); },
      shot: (n) => page.screenshot({ path: S + n + '.png' }),
      signIn: async () => {
        await page.goto('http://localhost:4173/'); await page.waitForTimeout(3000); await skipTour(page);
        await d.btn('כבר יש לי חשבון').click(); await d.wait();
        await page.getByLabel('אימייל').fill(OWNER); await page.getByLabel('סיסמה').fill(PW);
        await d.btn('כניסה').click(); await page.waitForTimeout(7000);
      },
      sync: async () => { await d.tab('הילד שלי'); await d.btn('סנכרון עכשיו').click(); await page.waitForTimeout(1500); await page.waitForFunction(() => !document.body.innerText.includes('מסנכרן'), null, { timeout: 40000 }).catch(() => undefined); await page.waitForTimeout(1500); },
      album: async () => { await d.tab('הילד שלי'); await page.getByRole('button', { name: /אלבום תמונות/ }).click(); await page.waitForTimeout(1200); },
      photos: () => page.getByRole('button', { name: /^תמונה מ-/ }),
    };
    return d;
  };

  const A = await device('A');
  await A.signIn();
  check('signed in with a child', !!(await A.page.getByRole('tab', { name: 'בית' }).count()));
  await A.album();
  const before = await A.photos().count();
  const caption = `בדיקה ${Date.now()}`;
  const [chooser] = await Promise.all([A.page.waitForEvent('filechooser'), A.btn('הוספת תמונה').click()]);
  await chooser.setFiles(PICTURE); await A.wait(2500);
  check('the new-photo sheet opens with a date', (await A.body()).includes('תמונה חדשה') && (await A.body()).includes('מתי צולמה?'));
  await A.page.getByLabel('כמה מילים (לא חובה)').last().fill(caption);
  await A.btn('שמירה באלבום').click(); await A.wait(2000);
  check('the photo appears in its month on device A', (await A.photos().count()) === before + 1 && /החודש|שנה|לפני הלידה/.test(await A.body()));
  await A.shot('album-A');
  await A.page.getByRole('button', { name: 'חזרה' }).click(); await A.wait();
  await A.sync(); await A.sync();

  const B = await device('B');
  await B.signIn();
  await B.album();
  const mine = B.page.getByRole('button', { name: new RegExp(caption) });
  check('device B lists the photo with its caption', (await mine.count()) === 1);
  check('device B shows the preview before any file is fetched', await mine.locator('img').first().evaluate((i) => i.currentSrc.startsWith('data:image/jpeg') && i.naturalWidth > 0).catch(() => false));
  await mine.click(); await B.wait(6000);
  const full = await B.page.getByRole('img', { name: caption }).last().evaluate((el) => { const i = el.tagName === 'IMG' ? el : el.querySelector('img'); return i ? i.naturalWidth : 0; }).catch(() => 0);
  check('device B gets the full picture from Storage (wider than the preview)', full > 320);
  await B.shot('album-B-open');
  await B.btn('מחיקת התמונה').click(); await B.wait(400);
  await B.btn('כן, למחוק את התמונה').click(); await B.wait(1500);
  check('deleted on device B', (await B.page.getByRole('button', { name: new RegExp(caption) }).count()) === 0);
  await B.page.getByRole('button', { name: 'חזרה' }).click(); await B.wait();
  await B.sync();
  await A.sync(); await A.album();
  check('the deletion reaches device A', (await A.page.getByRole('button', { name: new RegExp(caption) }).count()) === 0);

  console.log(errors.length ? `ERRORS: ${errors.join('\n')}` : 'ERRORS: none');
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
})().catch((e) => { console.log('SCRIPT FAILED', e.message); process.exit(1); });
