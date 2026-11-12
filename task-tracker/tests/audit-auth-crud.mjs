import puppeteer from 'puppeteer-core';
const BASE = 'http://127.0.0.1:8099/task-tracker/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, pass, extra = '') => { results.push(`${pass ? 'PASS' : 'FAIL'} | ${name}${extra ? ' | ' + extra : ''}`); };
const SHOT = '/tmp/rt/shots/audit';
const inView = (r) => r && r.width > 0 && r.x >= 0 && r.y >= 0 && r.x + r.width <= innerWidth && r.y + r.height <= innerHeight;
const openNewTask = async () => {
  for (let i = 0; i < 3; i++) {
    await clickBtn('New task', false);
    try { await page.waitForSelector('#task-title', { timeout: 2500 }); await sleep(300); return true; } catch {}
  }
  return false;
};
const rectOf = (sel) => page.evaluate((s) => { const el = document.querySelector(s); return el ? JSON.parse(JSON.stringify(el.getBoundingClientRect())) : null; }, sel);
// Radix Select: open the trigger, assert the listbox is in the viewport,
// then click the option with a trusted ElementHandle click.
const pickSelect = async (triggerSel, optionLabel) => {
  await page.click(triggerSel);
  await page.waitForSelector('[role=option]', { timeout: 3000 });
  await sleep(350);
  const iv = await page.evaluate(() => {
    const lb = document.querySelector('[role=listbox]');
    if (!lb) return false;
    const r = lb.getBoundingClientRect();
    return r.width > 0 && r.x >= 0 && r.y >= 0 && r.x + r.width <= innerWidth && r.y + r.height <= innerHeight;
  });
  const opts = await page.$$('[role=option]');
  let hit = false;
  for (const o of opts) {
    const t = await o.evaluate((el) => el.textContent.trim());
    if (t === optionLabel) { await o.click(); hit = true; break; }
  }
  await sleep(400);
  return { iv, hit };
};

const clickBtn = (text, exact = true) => page.evaluate((t, ex) => {
  const b = [...document.querySelectorAll('button')].find((x) => ex ? x.textContent.trim() === t : x.textContent.includes(t));
  if (b) { b.click(); return true; } return false;
}, text, exact);
const EMAIL = `audit${Date.now()}@example.com`;
try {

// ---- 1. REGISTER with validation errors first
await page.goto(BASE + 'register', { waitUntil: 'networkidle0' });
await sleep(800);
await page.screenshot({ path: `${SHOT}-01-register.png` });
await page.type('#name', 'Audit User');
await page.type('#remail', EMAIL);
await page.type('#rpassword', 'audit-pass-123');
await page.type('#confirm', 'mismatch-999');
await clickBtn('Create account');
await sleep(700);
const mismatchErr = await page.evaluate(() => document.body.innerText.includes('do not match'));
ok('register shows mismatch validation error', mismatchErr);
await page.screenshot({ path: `${SHOT}-02-register-error.png` });
await page.evaluate(() => { document.querySelector('#confirm').value = ''; });
await page.click('#confirm', { clickCount: 3 });
await page.type('#confirm', 'audit-pass-123');
await clickBtn('Create account');
await page.waitForFunction(() => document.querySelector('#overview'), { timeout: 9000 });
await sleep(1500);
const emptyState = await page.evaluate(() => document.body.innerText.includes('No tasks yet.'));
ok('register lands on dashboard with empty state', emptyState);
await page.screenshot({ path: `${SHOT}-03-empty-dashboard.png` });

// ---- 2. NEW TASK: dialog opens in viewport, empty-title validation, then create
ok('new-task dialog opens', await openNewTask());
await sleep(200);
const dlg = await page.evaluate(() => { const d = document.querySelector('[role=dialog]'); return d ? JSON.parse(JSON.stringify(d.getBoundingClientRect())) : null; });
ok('new-task dialog opens inside viewport', await page.evaluate((d) => d && d.width > 0 && d.x >= 0 && d.y >= 0 && d.x + d.width <= innerWidth && d.y + d.height <= innerHeight, dlg), JSON.stringify(dlg));
await clickBtn('Create task');
await sleep(500);
const titleErr = await page.evaluate(() => document.body.innerText.includes('Please enter a task title.'));
ok('empty title shows validation error', titleErr);
await page.type('#task-title', 'Audit task one');
await page.type('#task-desc', 'First audit description');
// set status In Progress via dialog Radix select
const dlgPick = await pickSelect('#task-status', 'In Progress');
ok('dialog status select listbox opens in viewport', dlgPick.iv && dlgPick.hit);
await clickBtn('Create task');
await sleep(1500);
const taskVisible = await page.evaluate(() => document.body.innerText.includes('Audit task one'));
const toastVisible = await page.evaluate(() => document.body.innerText.includes('Task added.'));
ok('task created and visible', taskVisible);
ok('success toast shown', toastVisible);
await page.screenshot({ path: `${SHOT}-04-task-created.png` });

// ---- 3. Add second task (Pending) for filter tests
ok('second new-task dialog opens', await openNewTask());
await page.type('#task-title', 'Audit task two');
await clickBtn('Create task');
await sleep(1500);
ok('second task created', await page.evaluate(() => document.body.innerText.includes('Audit task two')));

// ---- 4. TOGGLE circle -> Completed -> line-through -> toggle back
const toggled = await page.evaluate(() => {
  const row = [...document.querySelectorAll('button[aria-label^="Mark"]')].find((b) => b.getAttribute('aria-label').includes('Audit task two'));
  if (row) { row.click(); return true; } return false;
});
await sleep(1500);
const doneState = await page.evaluate(() => {
  const row = [...document.querySelectorAll('div')].find((d) => d.className.includes('truncate') && d.textContent === 'Audit task two');
  return row ? row.className.includes('line-through') : false;
});
ok('toggle marks Completed (line-through)', toggled && doneState);
await page.screenshot({ path: `${SHOT}-05-toggle-completed.png` });
await page.evaluate(() => {
  const row = [...document.querySelectorAll('button[aria-label^="Mark"]')].find((b) => b.getAttribute('aria-label').includes('Audit task two'));
  if (row) row.click();
});
await sleep(1200);
ok('toggle back to pending removes line-through', await page.evaluate(() => {
  const row = [...document.querySelectorAll('div')].find((d) => d.className.includes('truncate') && d.textContent === 'Audit task two');
  return row ? !row.className.includes('line-through') : false;
}));

// ---- 5. STATUS FILTER actually filters (Radix select on the dashboard)
const pick1 = await pickSelect('#tasks button[role=combobox]', 'Pending');
ok('dashboard filter listbox opens in viewport', pick1.iv && pick1.hit);
await sleep(1200);
let vis = await page.evaluate(() => ({ one: document.body.innerText.includes('Audit task one'), two: document.body.innerText.includes('Audit task two') }));
ok('filter Pending shows only task two (task one is In Progress)', !vis.one && vis.two, JSON.stringify(vis));
await pickSelect('#tasks button[role=combobox]', 'In Progress');
await sleep(1200);
vis = await page.evaluate(() => ({ one: document.body.innerText.includes('Audit task one'), two: document.body.innerText.includes('Audit task two') }));
ok('filter In Progress shows only task one', vis.one && !vis.two, JSON.stringify(vis));
await pickSelect('#tasks button[role=combobox]', 'Completed');
await sleep(1200);
const filteredEmpty = await page.evaluate(() => document.body.innerText.includes('No tasks match that.'));
ok('filter Completed shows filtered empty state', filteredEmpty);
await page.screenshot({ path: `${SHOT}-06-filter-empty.png` });
await pickSelect('#tasks button[role=combobox]', 'All statuses');
await sleep(1000);

// ---- 6. SEARCH actually filters
await page.type('input[aria-label="Search tasks by title"]', 'two');
await sleep(1200);
vis = await page.evaluate(() => ({ one: document.body.innerText.includes('Audit task one'), two: document.body.innerText.includes('Audit task two') }));
ok('search "two" shows only task two', !vis.one && vis.two, JSON.stringify(vis));
await page.click('input[aria-label="Search tasks by title"]', { clickCount: 3 });
await page.type('input[aria-label="Search tasks by title"]', 'zzzz');
await sleep(1200);
ok('search "zzzz" shows filtered empty state', await page.evaluate(() => document.body.innerText.includes('No tasks match that.')));
await page.evaluate(() => {
  const i = document.querySelector('input[aria-label="Search tasks by title"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(i, '');
  i.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForFunction(() => document.querySelectorAll('button[aria-label^="Actions for"]').length === 2, { timeout: 6000 });
await sleep(600);

// ---- 7. EDIT via row menu: prefilled, save, persists after reload
const openMenu = async (title) => {
  for (let i = 0; i < 4; i++) {
    // Radix DropdownMenu.Trigger opens on pointerdown: use a trusted click.
    const handles = await page.$$('button[aria-label^="Actions for"]');
    for (const h of handles) {
      const label = await h.evaluate((el) => el.getAttribute('aria-label'));
      if (label.includes(title)) { await h.click(); break; }
    }
    try {
      await page.waitForSelector('[role=menuitem]', { timeout: 1500 });
      await sleep(400);
      const iv = await page.evaluate(() => {
        const mi = document.querySelector('[role=menuitem]');
        const c = mi && (mi.closest('[role=menu]') || mi.parentElement);
        if (!c) return false;
        const r = c.getBoundingClientRect();
        return r.width > 0 && r.x >= 0 && r.y >= 0 && r.x + r.width <= innerWidth && r.y + r.height <= innerHeight;
      });
      if (iv) return true;
    } catch (e) { console.log('openMenu attempt', i, 'no menuitem in DOM'); }
    await page.keyboard.press('Escape').catch(() => {});
    await sleep(300);
  }
  const diag = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button[aria-label^="Actions for"]')].map((b) => b.getAttribute('aria-label'));
    const mi = document.querySelector('[role=menuitem]');
    const c = mi && (mi.closest('[role=menu]') || mi.parentElement);
    const r = c ? JSON.parse(JSON.stringify(c.getBoundingClientRect())) : null;
    return { btns, menuRect: r, searchVal: document.querySelector('input[aria-label="Search tasks by title"]')?.value, scrollY: window.scrollY };
  });
  console.log('openMenu DIAG:', JSON.stringify(diag));
  await page.screenshot({ path: '/tmp/rt/shots/audit-menu-fail.png' });
  return false;
};
ok('row menu opens in viewport for task one', await openMenu('Audit task one'));
await page.screenshot({ path: `${SHOT}-07-menu-open.png` });
await page.evaluate(() => [...document.querySelectorAll('[role=menuitem]')].find((e) => e.innerText.trim() === 'Edit')?.click());
await page.waitForSelector('#task-title', { timeout: 5000 });
await sleep(400);
const prefill = await page.evaluate(() => ({ title: document.querySelector('#task-title').value, desc: document.querySelector('#task-desc').value }));
ok('edit dialog prefilled', prefill.title === 'Audit task one' && prefill.desc === 'First audit description', JSON.stringify(prefill));
await page.click('#task-title', { clickCount: 3 });
await page.type('#task-title', 'Audit task one renamed');
await clickBtn('Save changes');
await sleep(1500);
ok('edit saved and visible', await page.evaluate(() => document.body.innerText.includes('Audit task one renamed')));
await page.reload({ waitUntil: 'networkidle0' });
await sleep(2000);
ok('edit persists after reload', await page.evaluate(() => document.body.innerText.includes('Audit task one renamed')));

// ---- 8. DELETE with cancel then confirm
await openMenu('Audit task two');
await page.evaluate(() => [...document.querySelectorAll('[role=menuitem]')].find((e) => e.innerText.trim() === 'Delete')?.click());
await page.waitForFunction(() => document.body.innerText.includes('Delete this task?'), { timeout: 5000 });
await sleep(400);
const delDlg = await rectOf('[role=dialog]');
ok('delete dialog opens inside viewport', await page.evaluate((d) => d && d.width > 0 && d.x >= 0 && d.y >= 0 && d.x + d.width <= innerWidth && d.y + d.height <= innerHeight, delDlg));
await clickBtn('Keep task');
await sleep(800);
ok('Keep task cancels delete', await page.evaluate(() => document.body.innerText.includes('Audit task two')));
await openMenu('Audit task two');
await page.evaluate(() => [...document.querySelectorAll('[role=menuitem]')].find((e) => e.innerText.trim() === 'Delete')?.click());
await page.waitForFunction(() => document.body.innerText.includes('Delete this task?'), { timeout: 5000 });
await sleep(300);
await clickBtn('Delete');
await sleep(1500);
ok('task deleted after confirm', await page.evaluate(() => !document.body.innerText.includes('Audit task two')));
await page.screenshot({ path: `${SHOT}-08-deleted.png` });

} catch (e) { results.push('SCRIPT ERROR | ' + e.message.split('\n')[0]); }
console.log(results.join('\n'));
console.log('====');
console.log(`PASSED=${results.filter((r) => r.startsWith('PASS')).length} FAILED=${results.filter((r) => r.startsWith('FAIL')).length}`);
console.log('AUDIT_USER=' + EMAIL);
await browser.close();
