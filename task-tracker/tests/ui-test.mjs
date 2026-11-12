// Full-stack UI verification for the Task Tracker.
// Drives the real built app (React dist + PHP API + MySQL) in Chrome,
// exercises the main flows and writes screenshots to /tmp/rt/shots/.
import puppeteer from 'puppeteer-core';

const BASE = 'http://127.0.0.1:8099/task-tracker';
const SHOTS = '/tmp/rt/shots';
let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'} | ${name}${extra ? ' | ' + extra : ''}`); };

const clickText = async (page, selector, text) => {
  const handle = await page.evaluateHandle((sel, t) =>
    [...document.querySelectorAll(sel)].find((e) => e.innerText.trim().includes(t)), selector, text);
  const el = handle.asElement();
  if (!el) throw new Error(`no element ${selector} with text "${text}"`);
  await el.click();
  await handle.dispose();
};

// Radix trigger clicks can land mid-entrance-animation; retry until the menu
// opens. "Open" means visibly rendered inside the viewport, not merely present
// in the DOM - an unpositioned menu still appears in the DOM.
const openRowMenu = async (page, btn) => {
  for (let i = 0; i < 4; i++) {
    await btn.click();
    try {
      await page.waitForSelector('[role=menuitem]', { timeout: 1500 });
      await new Promise((r) => setTimeout(r, 300));
      const inView = await page.evaluate(() => {
        const mi = document.querySelector('[role=menuitem]');
        if (!mi) return false;
        const c = mi.closest('[role=menu]') || mi.parentElement;
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.x >= 0 && r.y >= 0 && r.x + r.width <= window.innerWidth && r.y + r.height <= window.innerHeight;
      });
      if (inView) return;
    } catch { /* retry below */ }
    await page.keyboard.press('Escape').catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('row menu never opened visibly in the viewport');
};

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu'],
});

let page;
try {
  page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  page.on('pageerror', (e) => console.log(`PAGEERROR | ${e.message}`));
  page.on('request', (r) => { if (r.method() !== 'GET') console.log(`REQ | ${r.method()} ${r.url()}`); });
  page.on('response', (r) => { if (r.request().method() !== 'GET') console.log(`RES | ${r.status()} ${r.url()}`); });
  page.on('console', (m) => { if (m.type() === 'error') console.log(`CONSOLE-ERROR | ${m.text()}`); });

  // 1. logged-out redirect to login
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  ok('logged-out visitor is redirected to login', page.url().includes('/login'));
  await page.screenshot({ path: `${SHOTS}/01-login.png` });

  // 2. register
  await page.goto(BASE + '/register', { waitUntil: 'networkidle0' });
  await page.type('#name', 'Akhil Kumar');
  await page.type('#remail', 'akhil@example.com');
  await page.type('#rpassword', 'demo-pass-123');
  await page.type('#confirm', 'demo-pass-123');
  await page.screenshot({ path: `${SHOTS}/02-register.png` });
  await page.click('button[type=submit]');
  await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Good'), { timeout: 8000 });
  ok('register logs in and lands on dashboard', true);

  // 3. empty state visible (wait for tasks fetch to settle)
  await page.waitForFunction(() => document.body.innerText.includes('No tasks yet'), { timeout: 8000 }).catch(() => {});
  const emptyText = await page.$eval('body', (b) => b.innerText);
  ok('empty state shows for new account', emptyText.includes('No tasks yet'));
  await page.screenshot({ path: `${SHOTS}/03-dashboard-empty.png` });

  // helper: open the add dialog and submit
  const addTask = async (title, desc, status) => {
    await clickText(page, 'button', 'New task');
    await page.waitForSelector('#task-title', { timeout: 5000 });
    await page.type('#task-title', title);
    if (desc) await page.type('#task-desc', desc);
    if (status) {
      await page.click('#task-status');
      await page.waitForSelector('[role=option]', { timeout: 5000 });
      await clickText(page, '[role=option]', status);
    }
    await clickText(page, '[role=dialog] button[type=submit], button[type=submit]', 'task');
    try {
      await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 8000 }, title);
    } catch (e) {
      await page.screenshot({ path: `${SHOTS}/debug-after-submit.png` });
      throw e;
    }
    // wait for the close animation to fully unmount the dialog
    await page.waitForFunction(() => !document.querySelector('[role=dialog]'), { timeout: 5000 });
  };

  // 4. add a task through the dialog
  await clickText(page, 'button', 'New task');
  await page.waitForSelector('#task-title', { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: `${SHOTS}/04-add-dialog.png` });
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role=dialog]'), { timeout: 5000 });
  await addTask('Finish the task tracker', 'CRUD + search + filters + security');
  ok('task created through dialog appears in list', true);

  // 5. validation: empty title shows friendly error (client side)
  await clickText(page, 'button', 'New task');
  await page.waitForSelector('#task-title', { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 400));
  await clickText(page, '[role=dialog] button[type=submit]', 'Create task');
  await page.screenshot({ path: `${SHOTS}/debug-validation.png` });
  await page.waitForFunction(() => document.body.innerText.includes('Please enter a task title.'), { timeout: 5000 });
  ok('empty title blocked with friendly message in dialog', true);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role=dialog]'), { timeout: 5000 });

  // 6. two more tasks
  await addTask('Prepare review notes', '', 'In Progress');
  await addTask('Submit internship form', '', 'Pending');
  await page.screenshot({ path: `${SHOTS}/05-dashboard-tasks.png` });
  const bodyText = await page.$eval('body', (b) => b.innerText);
  ok('stat card shows total of 3', /Total tasks[\s\S]{0,60}\b3\b|\b3\b[\s\S]{0,60}Total tasks/.test(bodyText));

  // search
  await page.type('input[aria-label="Search tasks by title"]', 'review');
  await page.waitForFunction(() => !document.body.innerText.includes('Finish the task tracker') && document.body.innerText.includes('Prepare review notes'), { timeout: 8000 });
  ok('search filters the list to matching titles', true);
  await page.screenshot({ path: `${SHOTS}/06-search.png` });
  await page.evaluate(() => {
    const i = document.querySelector('input[aria-label="Search tasks by title"]');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    set.call(i, '');
    i.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => document.body.innerText.includes('Finish the task tracker'), { timeout: 8000 });

  // 7. edit task title
  const actionsBtns = await page.$$('button[aria-label^="Actions for"]');
  ok('row action buttons render', actionsBtns.length >= 3, `count=${actionsBtns.length}`);
  await openRowMenu(page, actionsBtns[0]);
  await page.evaluate(() => [...document.querySelectorAll('[role=menuitem]')].find((e) => e.innerText.trim() === 'Edit')?.click());
  await page.waitForSelector('#task-title', { timeout: 5000 });
  await new Promise((r) => setTimeout(r, 400));
  await page.click('#task-title');
  await page.keyboard.down('Control');
  await page.keyboard.press('a');
  await page.keyboard.up('Control');
  await page.type('#task-title', 'Finish the task tracker v2');
  await clickText(page, 'button[type=submit]', 'changes');
  await page.waitForFunction(() => document.body.innerText.includes('Finish the task tracker v2'), { timeout: 8000 });
  const concat = await page.evaluate(() => document.body.innerText.includes('Submit internship formFinish'));
  ok('edit replaced text cleanly (no concatenation)', !concat);

  // 8. delete with confirmation
  const btns2 = await page.$$('button[aria-label^="Actions for"]');
  await openRowMenu(page, btns2[0]);
  await page.evaluate(() => [...document.querySelectorAll('[role=menuitem]')].find((e) => e.innerText.trim() === 'Delete')?.click());
  await page.waitForFunction(() => document.body.innerText.includes('Delete this task?'), { timeout: 5000 });
  await page.screenshot({ path: `${SHOTS}/07-delete-confirm.png` });
  await clickText(page, 'button', 'Delete');
  await page.waitForFunction(() => !document.body.innerText.includes('Finish the task tracker v2'), { timeout: 8000 });
  ok('delete removes task after confirmation', true);

  // 9. logout then login again
  await page.click('button[aria-label="Log out"]');
  await page.waitForFunction(() => location.pathname.includes('/login'), { timeout: 8000 });
  ok('logout returns to login page', true);
  await page.type('#email', 'akhil@example.com');
  await page.type('#password', 'demo-pass-123');
  await page.click('button[type=submit]');
  await page.waitForFunction(() => document.querySelector('h1')?.textContent.includes('Good'), { timeout: 8000 });
  await page.waitForFunction(() => document.body.innerText.includes('Prepare review notes') || document.body.innerText.includes('No tasks yet'), { timeout: 8000 }).catch(() => {});
  const afterLogin = await page.$eval('body', (b) => b.innerText);
  ok('tasks persist across logout/login (MySQL)', afterLogin.includes('Prepare review notes'));
  await page.screenshot({ path: `${SHOTS}/08-after-relogin.png` });

  // 10. mobile layout
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: `${SHOTS}/09-mobile.png` });
  ok('mobile dashboard renders', true);

  // 11. dark theme token check
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark'; });
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: `${SHOTS}/10-dark.png` });
  await page.evaluate(() => { document.documentElement.dataset.theme = 'ivory'; });
} catch (e) {
  fail++;
  console.log(`FAIL | unhandled | ${e.message}`);
  try { await page.screenshot({ path: `${SHOTS}/debug-failure.png` }); } catch {}
} finally {
  await browser.close();
}

console.log(`====\nPASSED=${pass} FAILED=${fail}`);
process.exit(fail ? 1 : 0);
