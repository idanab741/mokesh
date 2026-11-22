// The admin screen opens for an account listed in app_admins and for nobody else.
// Needs a cloud build on :4173, TEST_EMAIL (an admin), TEST_EMAIL_2 (not an admin) and TEST_PW.
const { chromium } = require('playwright');
const S = (process.env.SHOTS_DIR || require('os').tmpdir()) + '/';
(async () => {
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' } } : {});
  const errors = []; let failed = 0;
  const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed += 1; };
  const open = async (email) => {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' })).newPage();
    page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));
    await page.addLocatorHandler(page.getByRole('button', { name: 'דילוג על ההסבר' }), async (b) => { await b.evaluate((el) => el.click()); });
    await page.goto('http://localhost:4173/auth/sign-in'); await page.waitForTimeout(2500);
    await page.getByLabel('אימייל').fill(email); await page.getByLabel('סיסמה').fill(process.env.TEST_PW);
    await page.getByRole('button', { name: 'כניסה', exact: true }).last().click();
    await page.waitForFunction(() => !location.pathname.includes('sign-in'), null, { timeout: 30000 }).catch(() => undefined);
    await page.waitForTimeout(4000);
    return page;
  };

  const A = await open(process.env.TEST_EMAIL);
  await A.getByRole('tab', { name: 'הילד שלי', exact: true }).click(); await A.waitForTimeout(2500);
  check('an admin sees the way in', (await A.getByRole('button', { name: /^ניהול/ }).count()) === 1);
  await A.getByRole('button', { name: /^ניהול/ }).click(); await A.waitForTimeout(5000);
  let t = await A.innerText('body');
  check('the admin screen shows accounts, use and the funnel', ['חשבונות', 'פעילים השבוע', 'משפחות', 'מה מתעדים', 'מעמוד הפתיחה לחשבון', 'חשבונות אחרונים'].every((x) => t.includes(x)));
  check('accounts are listed by email', t.includes(process.env.TEST_EMAIL));
  check('no family content on the admin screen', !t.includes('עלמה'));
  await A.screenshot({ path: S + 'admin-1.png' });
  await A.mouse.move(195, 400); await A.mouse.wheel(0, 900); await A.waitForTimeout(800); await A.screenshot({ path: S + 'admin-2.png' });

  const B = await open(process.env.TEST_EMAIL_2);
  await B.goto('http://localhost:4173/admin'); await B.waitForTimeout(5000);
  t = await B.innerText('body');
  check('a regular account is refused', t.includes('פתוח רק לחשבון הניהול') && !t.includes('חשבונות אחרונים'));
  const direct = await B.evaluate(async () => {
    const key = Object.keys(localStorage).find((k) => k.includes('auth-token')); const token = key ? JSON.parse(localStorage.getItem(key)).access_token : null;
    return token ? 'has-token' : 'no-token';
  });
  check('the regular account is really signed in', direct === 'has-token');

  console.log(errors.length ? `ERRORS: ${errors.join('\n')}` : 'ERRORS: none');
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
})().catch((e) => { console.log('SCRIPT FAILED', e.message.split('\n').slice(0, 5).join(' | ')); process.exit(1); });
