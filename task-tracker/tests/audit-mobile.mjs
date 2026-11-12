import puppeteer from 'puppeteer-core';
const BASE = 'http://127.0.0.1:8099/task-tracker/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, pass, extra = '') => { results.push(`${pass ? 'PASS' : 'FAIL'} | ${name}${extra ? ' | ' + extra : ''}`); };
const clickBtn = (text, exact = true) => page.evaluate((t, ex) => {
  const b = [...document.querySelectorAll('button')].find((x) => ex ? x.textContent.trim() === t : x.textContent.includes(t));
  if (b) { b.click(); return true; } return false;
}, text, exact);
const EMAIL = `auditm${Date.now()}@example.com`;
try {
for (const W of [390, 320]) {
  await page.setViewport({ width: W, height: 844, isMobile: true, hasTouch: true });
  await page.goto(BASE + 'register', { waitUntil: 'networkidle0' });
  await sleep(800);
  const noOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
  ok(`${W}px register page: no horizontal scroll`, noOverflow, `scrollW=${await page.evaluate(() => document.documentElement.scrollWidth)}`);
  if (W === 320) break; // register once at 390
  await page.type('#name', 'Audit M');
  await page.type('#remail', EMAIL);
  await page.type('#rpassword', 'audit-pass-123');
  await page.type('#confirm', 'audit-pass-123');
  await clickBtn('Create account');
  await page.waitForFunction(() => document.querySelector('#overview'), { timeout: 9000 });
  await sleep(1500);
  ok('390px dashboard renders, no horizontal scroll', await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await page.screenshot({ path: '/tmp/rt/shots/audit-m-dash.png' });

  // hamburger -> drawer opens inside viewport
  await page.click('button[aria-label="Open menu"]');
  await sleep(500);
  const drawer = await page.evaluate(() => {
    const d = [...document.querySelectorAll('div')].find((x) => x.className.includes('w-64'));
    if (!d) return null;
    const r = d.getBoundingClientRect();
    return { x: r.x, w: r.width, inView: r.x >= 0 && r.x + r.width <= innerWidth };
  });
  ok('mobile drawer opens in viewport', drawer && drawer.inView, JSON.stringify(drawer));
  await page.screenshot({ path: '/tmp/rt/shots/audit-m-drawer.png' });
  // drawer nav: My Tasks -> closes drawer + flash + hash
  await page.evaluate(() => { const a = [...document.querySelectorAll('.w-64 nav a')].find((x) => x.textContent.trim() === 'My Tasks'); if (a) a.click(); });
  await sleep(600);
  const navSt = await page.evaluate(() => ({ drawerGone: !document.querySelector('.w-64'), flash: document.getElementById('tasks')?.classList.contains('section-flash'), hash: location.hash }));
  ok('drawer My Tasks: closes, flashes, sets hash', navSt.drawerGone && navSt.flash && navSt.hash === '#tasks', JSON.stringify(navSt));

  // new task dialog fits viewport
  await clickBtn('New task', false);
  await page.waitForSelector('#task-title', { timeout: 4000 });
  await sleep(400);
  const dlgOk = await page.evaluate(() => {
    const d = document.querySelector('[role=dialog]');
    const r = d.getBoundingClientRect();
    return r.width > 0 && r.x >= 0 && r.y >= 0 && r.x + r.width <= innerWidth && r.y + r.height <= innerHeight;
  });
  ok('390px new-task dialog fits viewport', dlgOk);
  await page.type('#task-title', 'Mobile audit task');
  await clickBtn('Create task');
  await sleep(1400);
  ok('mobile task created', await page.evaluate(() => document.body.innerText.includes('Mobile audit task')));

  // row menu opens inside viewport (trusted tap)
  const btn = await page.$('button[aria-label^="Actions for"]');
  await btn.click();
  try {
    await page.waitForSelector('[role=menuitem]', { timeout: 2500 });
    await sleep(400);
    const iv = await page.evaluate(() => {
      const mi = document.querySelector('[role=menuitem]');
      const c = mi && (mi.closest('[role=menu]') || mi.parentElement);
      const r = c.getBoundingClientRect();
      return r.width > 0 && r.x >= 0 && r.y >= 0 && r.x + r.width <= innerWidth && r.y + r.height <= innerHeight;
    });
    ok('mobile row menu opens in viewport', iv);
    await page.screenshot({ path: '/tmp/rt/shots/audit-m-menu.png' });
    // delete through the menu
    await page.evaluate(() => [...document.querySelectorAll('[role=menuitem]')].find((e) => e.innerText.trim() === 'Delete')?.click());
    await page.waitForFunction(() => document.body.innerText.includes('Delete this task?'), { timeout: 4000 });
    await sleep(300);
    await clickBtn('Delete');
    await sleep(1300);
    ok('mobile delete works', await page.evaluate(() => !document.body.innerText.includes('Mobile audit task')));
  } catch { ok('mobile row menu opens in viewport', false); }

  // logout from drawer
  await page.click('button[aria-label="Open menu"]');
  await sleep(500);
  await page.evaluate(() => [...document.querySelectorAll('.w-64 button')].find((b) => b.textContent.trim() === 'Log out')?.click());
  await page.waitForSelector('#email', { timeout: 6000 });
  ok('mobile logout lands on login', true);
}
} catch (e) { results.push('SCRIPT ERROR | ' + e.message.split('\n')[0]); }
console.log(results.join('\n'));
console.log('====');
console.log(`PASSED=${results.filter((r) => r.startsWith('PASS')).length} FAILED=${results.filter((r) => r.startsWith('FAIL')).length}`);
await browser.close();
