import puppeteer from 'puppeteer-core';
const BASE = 'http://127.0.0.1:8099/task-tracker';
let pass = 0, fail = 0;
const ok = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} | ${n}${x ? ' | ' + x : ''}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: 'new', args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
const clickText = async (sel, text) => {
  const h = await page.evaluateHandle((s, t) => [...document.querySelectorAll(s)].find((e) => e.innerText.trim().includes(t) && e.offsetParent !== null), sel, text);
  const el = h.asElement(); if (!el) throw new Error('missing visible ' + text);
  await el.evaluate((n) => n.scrollIntoView({ block: 'center' }));
  await el.click(); await h.dispose();
};
try {
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(BASE + '/login', { waitUntil: 'networkidle0' });
  await page.type('#email', 'akhil@example.com');
  await page.type('#password', 'demo-pass-123');
  await page.click('button[type=submit]');
  await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Good'), { timeout: 8000 });
  await new Promise((r) => setTimeout(r, 900));

  // width checks at 4 sizes
  for (const w of [320, 360, 390, 768]) {
    await page.setViewport({ width: w, height: 844 });
    await new Promise((r) => setTimeout(r, 400));
    const m = await page.evaluate(() => ({ s: document.documentElement.scrollWidth, c: document.documentElement.clientWidth }));
    ok(`no horizontal overflow at ${w}px`, m.s <= m.c, `scroll=${m.s} client=${m.c}`);
  }
  await page.setViewport({ width: 390, height: 844 });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: '/tmp/rt/shots/m2-dashboard.png' });

  // hamburger opens drawer with nav
  await page.click('button[aria-label="Open menu"]');
  await page.waitForSelector('button[aria-label="Close menu"]', { timeout: 4000 });
  ok('hamburger opens nav drawer', true);
  await sleep(400);
  await page.screenshot({ path: '/tmp/rt/shots/m2-drawer.png' });
  await page.click('button[aria-label="Close menu"]');

  // New task reachable on mobile and creates
  await clickText('button', 'New task');
  await page.waitForSelector('#task-title', { timeout: 5000 });
  await page.screenshot({ path: '/tmp/rt/shots/m2-add-dialog.png' });
  await page.type('#task-title', 'Water the plants');
  await clickText('button[type=submit]', 'task');
  await page.waitForFunction(() => document.body.innerText.includes('Water the plants'), { timeout: 8000 });
  ok('add task works on mobile', true);
  await page.waitForFunction(() => !document.querySelector('[role=dialog]'), { timeout: 5000 });

  // status badge + date visible on rows at 390
  const visible = await page.evaluate(() => {
    const row = document.querySelector('button[aria-label^="Actions for"]').closest('div.flex.items-center');
    const txt = row.innerText;
    return { badge: /Pending|In Progress|Completed/.test(txt), date: /Nov|Dec|Oct/.test(txt), w: row.getBoundingClientRect().width, vw: innerWidth };
  });
  ok('mobile row shows status badge', visible.badge);
  ok('mobile row shows date', visible.date);
  ok('row fits viewport', visible.w <= visible.vw, `w=${visible.w}`);

  // row menu opens and edit dialog works on mobile
  let opened = false;
  for (let i = 0; i < 4 && !opened; i++) {
    await page.click('button[aria-label^="Actions for"]');
    opened = await page.waitForSelector('[role=menuitem]', { timeout: 1200 }).then(() => page.evaluate(() => {
      const mi = document.querySelector('[role=menuitem]');
      if (!mi) return false;
      const c = mi.closest('[role=menu]') || mi.parentElement;
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.x >= 0 && r.y >= 0 && r.x + r.width <= window.innerWidth && r.y + r.height <= window.innerHeight;
    })).catch(() => false);
    if (!opened) await page.keyboard.press('Escape');
  }
  ok('row action menu opens on mobile', opened);
  await page.evaluate(() => [...document.querySelectorAll('[role=menuitem]')].find((e) => e.innerText.trim() === 'Edit')?.click());
  await page.waitForSelector('#task-title', { timeout: 5000 });
  ok('edit dialog opens on mobile', true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role=dialog]'), { timeout: 5000 });

  // theme switch via labeled buttons
  await clickText('button', 'Dark');
  await new Promise((r) => setTimeout(r, 400));
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  ok('theme switches to dark via visible control', theme === 'dark');
  await page.screenshot({ path: '/tmp/rt/shots/m2-dark.png' });
  await clickText('button', 'Ivory');
  await new Promise((r) => setTimeout(r, 400));

  // 320 screenshot for evidence
  await page.setViewport({ width: 320, height: 844 });
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: '/tmp/rt/shots/m2-320.png' });
} catch (e) {
  fail++; console.log('FAIL | unhandled | ' + e.message);
  await page.screenshot({ path: '/tmp/rt/shots/m2-fail.png' }).catch(() => {});
}
await browser.close();
console.log(`====\nPASSED=${pass} FAILED=${fail}`);
