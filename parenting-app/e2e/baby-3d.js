// Checks the real 3D baby (web build): it loads, turns by itself, follows a drag, and the
// clothes colour changes. Run by scripts/test-e2e.sh against the locally served bundle.
const { chromium } = require('playwright');
const results = [];
const check = (name, cond) => { results.push(`${cond ? 'PASS' : 'FAIL'} ${name}`); };
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'he-IL', timezoneId: 'Asia/Jerusalem' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost:4173/'); await page.waitForTimeout(2500);
  await page.getByText('מתחילים').click(); await page.waitForTimeout(500);
  await page.getByLabel('שם', { exact: true }).fill('נועם');
  const now = new Date(); const born = new Date(now.getFullYear(), now.getMonth() - 6, Math.min(now.getDate(), 28));
  await page.getByLabel('תאריך לידה, יום').click(); await page.keyboard.type(String(born.getDate()));
  await page.getByLabel('תאריך לידה, חודש').click(); await page.keyboard.type(String(born.getMonth() + 1));
  await page.getByLabel('תאריך לידה, שנה').click(); await page.keyboard.type(String(born.getFullYear()));
  await page.getByRole('tab', { name: 'בן', exact: true }).click();
  await page.getByRole('button', { name: 'שמירה והמשך' }).last().click();
  const ready = await page.waitForSelector('[data-testid="baby-3d"][data-ready="1"]', { timeout: 60000 }).then(() => true, () => false);
  check('3D model of the sitting boy loads', ready);
  const el = page.locator('[data-testid="baby-3d"]').first();
  const angle = async () => Number(await el.getAttribute('data-angle'));
  const a0 = await angle(); await page.waitForTimeout(1500); const a1 = await angle();
  check('the baby turns by itself in small steps (not 45° jumps)', a1 !== a0 && Math.abs(a1 - a0) < 45);
  const box = await el.boundingBox();
  const before = await angle();
  await page.mouse.move(box.x + 200, box.y + 130); await page.mouse.down();
  await page.mouse.move(box.x + 60, box.y + 130, { steps: 10 });
  const during = await angle(); await page.mouse.up();
  const turned = ((before - during + 540) % 360) - 180;
  check('dragging sideways turns the baby with the finger', Math.abs(turned) > 50);
  // Counts pink pixels of the newest 3D canvas, read in the same frame it was drawn.
  const pinkPixels = async () => page.locator('[data-testid="baby-3d"] canvas').last().evaluate((c) => new Promise((done) => {
    requestAnimationFrame(() => {
      const copy = document.createElement('canvas'); copy.width = 120; copy.height = 120;
      const g = copy.getContext('2d'); g.drawImage(c, 0, 0, 120, 120);
      const d = g.getImageData(0, 0, 120, 120).data; let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] > 200 && d[i] - d[i + 1] > 45 && d[i + 2] > d[i + 1]) n++;
      done(n);
    });
  }));
  await page.getByRole('button', { name: 'התאמת המראה של הדמות' }).last().click();
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="baby-3d"][data-ready="1"]').length >= 2, null, { timeout: 60000 }).catch(() => {});
  const teal = await pinkPixels();
  await page.getByRole('radio', { name: 'בגדים בצבע ורוד' }).click(); await page.waitForTimeout(600);
  check('changing the clothes colour repaints the 3D baby', (await pinkPixels()) > teal + 400);
  check('no page errors', errors.length === 0);
  console.log(results.join('\n'));
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
  process.exit(results.some((r) => r.startsWith('FAIL')) ? 1 : 0);
})();
