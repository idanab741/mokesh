const { chromium } = require('playwright');
// The tour over Home is closed whenever it shows up.
const skipTour = async (page) => { if (page.__tour) return; page.__tour = true; await page.addLocatorHandler(page.getByRole('button', { name: 'דילוג על ההסבר' }), async (b) => { await b.click(); }); };
// Needs a cloud build served on :4173 and two existing, confirmed accounts:
//   TEST_EMAIL=owner TEST_EMAIL_2=other TEST_PW=... node e2e/family-invite.js
const PW = process.env.TEST_PW, OWNER = process.env.TEST_EMAIL, OTHER = process.env.TEST_EMAIL_2;
const S = (process.env.SHOTS_DIR || require('os').tmpdir()) + '/';
const results = []; const check = (n, c) => { results.push(`${c ? 'PASS' : 'FAIL'} ${n}`); console.log(results[results.length - 1]); };
(async () => {
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' } } : {});
  const errors = [];
  const device = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', timezoneId: 'Asia/Jerusalem', ignoreHTTPSErrors: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(`${name} PAGEERROR ${e.message}`));
    return { page, body: () => page.innerText('body'), btn: (n) => page.getByRole('button', { name: n, exact: true }).last(), wait: (ms = 700) => page.waitForTimeout(ms),
      shot: (n) => page.screenshot({ path: S + n + '.png' }),
      signIn: async (email) => {
        await page.getByRole('button', { name: 'כבר יש לי חשבון', exact: true }).last().click(); await page.waitForTimeout(700);
        await page.getByLabel('אימייל').fill(email); await page.getByLabel('סיסמה').fill(PW);
        await page.getByRole('button', { name: 'כניסה', exact: true }).last().click(); await page.waitForTimeout(8000);
      } };
  };

  // ---------- the owner creates an invitation
  const A = await device('A');
  await A.page.goto('http://localhost:4173/'); await A.wait(3000); await skipTour(A.page);
  await A.signIn(OWNER);
  let t = await A.body();
  if (t.includes('מתחילים')) {
    await A.btn('מתחילים').click(); await A.wait();
    await A.page.getByLabel('שם', { exact: true }).fill('עלמה');
    await A.page.getByLabel('תאריך לידה, יום').fill('19'); await A.page.getByLabel('תאריך לידה, חודש').fill('5'); await A.page.getByLabel('תאריך לידה, שנה').fill('2026');
    await A.page.getByRole('tab', { name: 'בת', exact: true }).click();
    await A.btn('שמירה והמשך').click(); await A.wait(5000);
  }
  await A.page.getByRole('tab', { name: 'הילד שלי', exact: true }).click(); await A.wait();
  await A.btn('סנכרון עכשיו').click(); await A.wait(5000);
  await A.btn('משפחה ושיתוף').click(); await A.wait(4000);
  t = await A.body();
  check('owner sees the family with themself as manager', t.includes('מנהל/ת המשפחה') && t.includes('(אני)'));
  const before = (t.match(/מטפל\/ת/g) || []).length;
  await A.shot('f1-family');
  await A.btn('הזמנת בן/בת משפחה').click(); await A.wait();
  await A.page.getByRole('radio', { name: 'מטפל/ת' }).click();
  await A.shot('f2-roles');
  await A.btn('יצירת הזמנה').click(); await A.wait(5000);
  const link = (await A.page.getByTestId('invite-code').innerText()).trim();
  check('invitation gives a link that carries a 64-character code', /\?join=[a-f0-9]{64}$/.test(link));
  await A.shot('f3-invite');

  // ---------- the invited person opens the link, signs in, and sees the family's child
  const B = await device('B');
  await B.page.goto(link); await B.wait(3500); await skipTour(B.page);
  t = await B.body();
  check('the link tells a signed-out visitor they were invited', t.includes('הוזמנת להצטרף למשפחה'));
  check('the code is removed from the address bar', !B.page.url().includes('join='));
  await B.shot('f4-invited');
  await B.signIn(OTHER);
  await B.wait(3000);
  t = await B.body();
  check('after signing in, the invited person sees the owner\'s child', t.includes('עלמה'));
  await B.shot('f5-joined');
  await B.page.getByRole('tab', { name: 'הילד שלי', exact: true }).click(); await B.wait(3500);
  check('a caregiver cannot edit the child profile', (await B.page.getByRole('button', { name: 'עריכת פרופיל', exact: true }).count()) === 0);
  await B.btn('משפחה ושיתוף').click(); await B.wait(4000);
  t = await B.body();
  check('the invited person is listed as caregiver', t.includes('מטפל/ת') && t.includes('(אני)'));
  await B.shot('f6-member');

  // ---------- a used code cannot be used again
  const C = await device('C');
  await C.page.goto('http://localhost:4173/'); await C.wait(3000); await skipTour(C.page);
  await C.signIn(OTHER); await C.wait(2000);
  await C.page.getByRole('tab', { name: 'הילד שלי', exact: true }).click(); await C.wait();
  await C.btn('משפחה ושיתוף').click(); await C.wait(3000);
  await C.btn('הצטרפות עם קוד').click(); await C.wait();
  await C.page.getByLabel('קוד ההצטרפות').fill(link.split('join=')[1]);
  await C.btn('הצטרפות').click(); await C.wait(4000);
  check('a used code is refused with a clear message', (await C.body()).includes('הקוד אינו בתוקף'));

  // ---------- the owner sees the new member; the member leaves (also restores the test accounts)
  await A.page.reload(); await A.wait(5000);
  const count = async () => ((await A.body()).match(/מטפל\/ת/g) || []).length;
  const withMember = await count();
  check('the owner sees the new member', withMember === before + 1);
  await B.btn('יציאה מהמשפחה').click(); await B.wait();
  await B.btn('יציאה').click(); await B.wait(6000);
  t = await B.body();
  check('after leaving, the family is no longer listed for the member', !t.includes('(אני)') || !t.includes('מטפל/ת'));
  await A.page.reload(); await A.wait(5000);
  check('after leaving, the owner no longer sees the member', (await count()) === before);

  console.log('ERRORS:', [...new Set(errors)].join('\n') || 'none');
  await browser.close();
})().catch((e) => { console.error('SCRIPT FAILED', e.message.slice(0, 500)); process.exit(1); });
