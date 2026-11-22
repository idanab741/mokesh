const { chromium } = require('playwright');
// The tour over Home is closed whenever it shows up.
const skipTour = async (page) => { if (page.__tour) return; page.__tour = true; await page.addLocatorHandler(page.getByRole('button', { name: 'דילוג על ההסבר' }), async (b) => { await b.evaluate((el) => el.click()); }); };
// Needs a cloud build served on :4173 and an existing, confirmed account:
//   TEST_EMAIL=... TEST_PW=... node e2e/cloud-sync.js   (HTTPS_PROXY is used when set)
const PW = process.env.TEST_PW, OWNER = process.env.TEST_EMAIL;
const S = (process.env.SHOTS_DIR || require('os').tmpdir()) + '/';
const results = []; const check = (n, c) => { results.push(`${c ? 'PASS' : 'FAIL'} ${n}`); console.log(results[results.length - 1]); };
(async () => {
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' } } : {});
  const errors = [];
  const device = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${name} PAGEERROR ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name} CONSOLE ${m.text().slice(0, 240)}`); });
    const d = { ctx, page, name,
      body: () => page.innerText('body'),
      btn: (n) => page.getByRole('button', { name: n, exact: true }).last(),
      wait: (ms = 600) => page.waitForTimeout(ms),
      tab: async (n) => { await page.getByRole('tab', { name: n, exact: true }).click(); await page.waitForTimeout(700); },
      shot: (n) => page.screenshot({ path: S + n + '.png' }),
      signIn: async () => {
        await page.goto('http://localhost:4173/'); await page.waitForTimeout(3000); await skipTour(page);
        await d.btn('כבר יש לי חשבון').click(); await d.wait();
        await page.getByLabel('אימייל').fill(OWNER);
        await page.getByLabel('סיסמה').fill(PW);
        await d.btn('כניסה').click();
        // Signing in and the first pull take a few seconds, and how many varies.
        await page.getByRole('tab', { name: 'בית', exact: true }).waitFor({ timeout: 25000 }).catch(() => undefined);
        await page.waitForTimeout(3000);
      },
      sync: async () => { await d.tab('הילד שלי'); await d.btn('סנכרון עכשיו').click(); await page.waitForTimeout(1500); await page.waitForFunction(() => !document.body.innerText.includes('מסנכרן'), null, { timeout: 40000 }).catch(() => undefined); await page.waitForTimeout(1500); },
    };
    return d;
  };

  // ---------- device A: sign in, create child, log a bottle
  const A = await device('A');
  await A.page.goto('http://localhost:4173/'); await A.wait(3000); await skipTour(A.page);
  check('cloud build shows account options', (await A.body()).includes('יצירת חשבון') && (await A.body()).includes('כבר יש לי חשבון'));
  await A.shot('01-welcome-cloud');
  await A.btn('כבר יש לי חשבון').click(); await A.wait();
  await A.page.getByLabel('אימייל').fill(OWNER);
  await A.page.getByLabel('סיסמה').fill('wrong-password-1');
  await A.btn('כניסה').click(); await A.wait(4000);
  check('wrong password shows a clear Hebrew error', (await A.body()).includes('האימייל או הסיסמה אינם נכונים'));
  await A.shot('02-signin-error');
  await A.page.getByLabel('סיסמה').fill(PW);
  await A.btn('כניסה').click();
  await Promise.race([A.page.getByRole('tab', { name: 'בית', exact: true }).waitFor({ timeout: 25000 }), A.page.getByRole('button', { name: 'מתחילים', exact: true }).waitFor({ timeout: 25000 })]).catch(() => undefined);
  await A.wait(3000);
  let t = await A.body();
  // The home tour also says "מתחילים": only the welcome page (no tab bar yet) means there is no child.
  const fresh = !(await A.page.getByRole('tab', { name: 'בית' }).count()) && t.includes('מתחילים');
  check('sign-in with email works', (fresh || t.includes('עלמה')) && !t.includes('כבר יש לי חשבון'));
  if (fresh) {
    await A.btn('מתחילים').click(); await A.wait();
    await A.page.getByLabel('שם', { exact: true }).fill('עלמה');
    await A.page.getByLabel('תאריך לידה, יום').fill('19');
    await A.page.getByLabel('תאריך לידה, חודש').fill('5');
    await A.page.getByLabel('תאריך לידה, שנה').fill('2026');
    await A.page.getByRole('tab', { name: 'בת', exact: true }).click();
    await A.btn('שמירה והמשך').click(); await A.wait(1500);
    await A.btn('הוספת פעילות').click(); await A.wait();
    await A.btn('בקבוק').click(); await A.wait(800);
    await A.btn('שמירה').click(); await A.wait(1200);
  } else if (!t.includes('מ״ל בבקבוק')) {
    // An account from an earlier day: the checks below need a bottle logged today.
    await A.btn('הוספת פעילות').click(); await A.wait();
    await A.btn('בקבוק').click(); await A.wait(800);
    await A.btn('שמירה').click(); await A.wait(1200);
  }
  await A.sync();
  t = await A.body();
  check('device A: account row shows synced state', t.includes(OWNER) && t.includes('סונכרן'));
  await A.shot('03-A-synced');

  // ---------- device B: same account, fresh browser
  const B = await device('B');
  await B.signIn();
  t = await B.body();
  check('device B: after sign-in the child and the bottle arrive from the server', t.includes('עלמה') && t.includes('מ״ל בבקבוק'));
  await B.shot('04-B-after-signin');

  // ---------- B edits, A receives
  await B.tab('יומן'); await B.shot('dbg-journal');
  await B.page.getByRole('button', { name: /^בקבוק,/ }).last().click(); await B.wait(900);
  let amount = B.page.getByLabel('כמות, מ״ל'); await amount.fill('150'); await amount.blur();
  await B.btn('שמירת שינויים').click(); await B.wait(1200);
  await B.sync();
  await A.sync(); await A.tab('בית');
  check('edit on device B reaches device A (150 ml)', (await A.body()).includes('150 מ״ל בבקבוק'));

  // ---------- offline on A: write is kept, then uploaded
  await A.tab('יומן'); await A.page.getByRole('button', { name: /^בקבוק,/ }).last().click(); await A.wait(900); await A.btn('סגירה בלי לשמור').click(); await A.wait(600); await A.tab('בית'); // web only: load the journal screen's code before cutting the network
  await A.ctx.setOffline(true);
  await A.btn('תיעוד חיתול').click(); await A.wait(600); await A.btn('חיתול רטוב').click(); await A.wait(1500);
  t = await A.body();
  check('offline: diaper is saved locally and counted', t.includes('החלפה אחת'));
  await A.tab('הילד שלי'); await A.wait(16000);
  t = await A.body();
  check('offline: pending records are reported, nothing lost', /ממתינ/.test(t) && !t.includes('מסנכרן'));
  await A.shot('05-A-offline-pending');
  // conflicting edits: A (offline) -> 100, B (online) -> 180
  await A.tab('יומן');
  await A.page.getByRole('button', { name: /^בקבוק,/ }).last().click(); await A.wait(900);
  amount = A.page.getByLabel('כמות, מ״ל'); await amount.fill('100'); await amount.blur();
  await A.btn('שמירת שינויים').click(); await A.wait(1200);
  await B.tab('יומן');
  await B.page.getByRole('button', { name: /^בקבוק,/ }).last().click(); await B.wait(900);
  amount = B.page.getByLabel('כמות, מ״ל'); await amount.fill('180'); await amount.blur();
  await B.btn('שמירת שינויים').click(); await B.wait(1200);
  await B.sync();
  await A.ctx.setOffline(false);
  await A.sync();
  await B.sync(); await B.tab('בית');
  check('after reconnect: the offline diaper reached device B', (await B.body()).includes('החלפה אחת'));
  check('conflict: server keeps B value, nothing silently overwritten', (await B.body()).includes('180 מ״ל בבקבוק'));
  await A.tab('בית');
  check('conflict: A still shows its own value', (await A.body()).includes('100 מ״ל בבקבוק'));
  await A.page.goto('http://localhost:4173/updates'); await A.wait(3500);
  t = await A.body();
  check('conflict is surfaced to the parent', t.includes('דורש הכרעה'));
  await A.shot('06-A-conflict-list');
  await A.page.getByRole('button', { name: /^בקבוק,/ }).last().click(); await A.wait(1000);
  await A.shot('07-A-conflict-resolve');
  await A.btn('להשאיר את הגרסה שמוצגת כאן').click(); await A.wait(4000);
  await A.page.goto('http://localhost:4173/'); await A.wait(3500); await skipTour(A.page);
  await A.sync();
  await B.sync(); await B.tab('בית');
  check('resolution "keep mine" propagates to device B (100 ml)', (await B.body()).includes('100 מ״ל בבקבוק'));
  await B.shot('08-B-final');

  // ---------- delete on B, disappears on A
  await B.tab('יומן');
  await B.page.getByRole('button', { name: /^חיתול,/ }).last().click(); await B.wait(900);
  await B.btn('מחיקת הרשומה').click(); await B.wait(400);
  await B.btn('מחיקה').click(); await B.wait(1200);
  await B.sync(); await A.sync(); await A.tab('בית');
  check('deletion on B removes the record on A', (await A.body()).includes('0 החלפות'));

  // ---------- sign out keeps local data
  await A.tab('הילד שלי'); await A.btn('יציאה מהחשבון').click(); await A.wait(2500);
  t = await A.body();
  check('sign-out keeps the data on the device', t.includes('עלמה') && t.includes('יצירת חשבון או כניסה'));

  console.log('ERRORS:', [...new Set(errors)].join('\n') || 'none');
  await browser.close();
})().catch(async (e) => {  console.error('SCRIPT FAILED', e.message.slice(0, 1500)); process.exit(1); });
