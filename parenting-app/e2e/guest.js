// A visitor without an account looks and does not touch. Needs a cloud build on :4173 and TEST_EMAIL / TEST_PW.
const { chromium } = require('playwright');
const OWNER = process.env.TEST_EMAIL; const PW = process.env.TEST_PW;
const S = (process.env.SHOTS_DIR || require('os').tmpdir()) + '/';
(async () => {
  const browser = await chromium.launch(process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost' } } : {});
  const errors = []; let failed = 0;
  const check = (name, ok) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (!ok) failed += 1; };
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' })).newPage();
  page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`));
  const wait = (ms = 700) => page.waitForTimeout(ms);
  const body = () => page.innerText('body');
  const btn = (n) => page.getByRole('button', { name: n, exact: true }).last();
  const prompt = async () => (await body()).includes('בשביל זה צריך חשבון');
  const closePrompt = async () => { await btn('להמשיך להציץ').click(); await wait(500); };
  await page.addLocatorHandler(page.getByRole('button', { name: 'דילוג על ההסבר' }), async (b) => { await b.evaluate((el) => el.click()); });

  await page.goto('http://localhost:4173/'); await wait(3000);
  let t = await body();
  check('welcome offers an account or a look around, not a start without one', t.includes('יצירת חשבון') && t.includes('להציץ בלי חשבון') && !t.includes('להתחיל בלי חשבון'));
  await btn('להציץ בלי חשבון').click(); await wait(5000);
  t = await body();
  check('the look around shows an example child with a diary', t.includes('עלמה') && t.includes('מצב הצצה') && /האכל/.test(t));
  await page.screenshot({ path: S + 'guest-home.png' });

  await btn('תיעוד האכלה').click(); await wait(700);
  check('logging a feeding asks for an account', await prompt());
  await page.screenshot({ path: S + 'guest-prompt.png' });
  await closePrompt();
  await btn('הוספת פעילות').click(); await wait(700);
  check('the plus button asks for an account', await prompt());
  await closePrompt();

  await page.getByRole('tab', { name: 'יומן', exact: true }).click(); await wait(900);
  const rows = await page.getByRole('button', { name: /^(בקבוק|חיתול),/ }).count();
  check('the journal can be read', rows > 0);
  await page.getByRole('tab', { name: 'נתונים', exact: true }).click(); await wait(900);
  check('the numbers can be read', (await body()).includes('האכלות'));

  // A form that is reached anyway saves nothing.
  await page.getByRole('tab', { name: 'הילד שלי', exact: true }).click(); await wait(700);
  await btn('עריכת פרופיל').click(); await wait(900);
  await page.getByLabel('שם', { exact: true }).fill('שם אחר');
  await btn('שמירת שינויים').click().catch(async () => { await btn('שמירה והמשך').click(); }); await wait(900);
  check('saving the profile asks for an account', await prompt());
  await closePrompt();
  await page.goto('http://localhost:4173/'); await wait(2500);
  check('a visitor lands on the welcome page again', (await body()).includes('להציץ בלי חשבון'));
  await btn('להציץ בלי חשבון').click(); await wait(3000);
  t = await body();
  check('nothing was changed', t.includes('עלמה') && !t.includes('שם אחר'));

  // Signing in: the example is gone, the account's own diary is there, and writing works.
  await page.goto('http://localhost:4173/auth/sign-in'); await wait(2000);
  await page.getByLabel('אימייל').fill(OWNER); await page.getByLabel('סיסמה').fill(PW);
  await btn('כניסה').click();
  await page.getByRole('tab', { name: 'בית', exact: true }).waitFor({ timeout: 30000 }).catch(() => undefined); await wait(4000);
  t = await body();
  check('after signing in there is no visitor mode', !t.includes('מצב הצצה') && !t.includes('צפייה בלבד'));
  await btn('תיעוד האכלה').click(); await wait(900);
  check('a member gets the logging sheet, not the account prompt', !(await prompt()) && (await body()).includes('תיעוד אוכל'));

  console.log(errors.length ? `ERRORS: ${errors.join('\n')}` : 'ERRORS: none');
  await browser.close();
  process.exit(failed || errors.length ? 1 : 0);
})().catch((e) => { console.log('SCRIPT FAILED', e.message.split('\n').slice(0, 6).join(' | ')); process.exit(1); });
