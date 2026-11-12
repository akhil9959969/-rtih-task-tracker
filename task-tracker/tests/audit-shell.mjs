import puppeteer from 'puppeteer-core';
const BASE = 'http://127.0.0.1:8099/task-tracker/';
const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome-stable', headless: 'new', args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const ok = (name, pass, extra = '') => { results.push(`${pass ? 'PASS' : 'FAIL'} | ${name}${extra ? ' | ' + extra : ''}`); };
const badResponses = [];
page.on('response', (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`); });
const clickBtn = (text, exact = true) => page.evaluate((t, ex) => {
  const b = [...document.querySelectorAll('button')].find((x) => ex ? x.textContent.trim() === t : x.textContent.includes(t));
  if (b) { b.click(); return true; } return false;
}, text, exact);
const A = `audita${Date.now()}@example.com`;
const B = `auditb${Date.now()}@example.com`;

try {
// ---- register user A, add one task
await page.goto(BASE + 'register', { waitUntil: 'networkidle0' });
await sleep(700);
await page.type('#name', 'Audit A');
await page.type('#remail', A);
await page.type('#rpassword', 'audit-pass-123');
await page.type('#confirm', 'audit-pass-123');
await clickBtn('Create account');
await page.waitForFunction(() => document.querySelector('#overview'), { timeout: 9000 });
await sleep(1200);
await clickBtn('New task', false);
await page.waitForSelector('#task-title', { timeout: 4000 });
await page.type('#task-title', 'Isolation task A');
await clickBtn('Create task');
await sleep(1400);

// ---- nav flash + hash on all three links
for (const [label, id] of [['My Tasks', 'tasks'], ['Settings', 'settings'], ['Overview', 'overview']]) {
  const clicked = await page.evaluate((l) => { const a = [...document.querySelectorAll('a')].find((x) => x.textContent.trim() === l); if (a) { a.click(); return true; } return false; }, label);
  await sleep(300);
  const st = await page.evaluate((i) => ({ flash: document.getElementById(i).classList.contains('section-flash'), hash: location.hash }), id);
  ok(`nav ${label} gives visible feedback + hash`, clicked && st.flash && st.hash === '#' + id, JSON.stringify(st));
  await sleep(1100);
}

// ---- sidebar collapse hides labels, expand restores
await clickBtn('< Collapse');
await sleep(600);
let collapsedState = await page.evaluate(() => ({
  labelsVisible: [...document.querySelectorAll('aside a')].some((a) => a.textContent.includes('My Tasks') && a.offsetWidth > 0 && a.offsetHeight > 0 && getComputedStyle(a).visibility !== 'hidden'),
  width: document.querySelector('aside').getBoundingClientRect().width,
}));
// collapsed sidebar: links render icons only; the text node is not rendered
const labelGone = await page.evaluate(() => ![...document.querySelectorAll('aside')].some((a) => a.textContent.includes('My Tasks')));
ok('sidebar collapse hides labels', labelGone, `w=${collapsedState.width}`);
await page.screenshot({ path: '/tmp/rt/shots/audit-collapsed.png' });
await page.evaluate(() => [...document.querySelectorAll('aside button')].find((b) => b.textContent.trim() === '>')?.click());
await sleep(600);
ok('sidebar expand restores labels', await page.evaluate(() => [...document.querySelectorAll('aside')].some((a) => a.textContent.includes('My Tasks'))));

// ---- theme switch: dark applies + persists across reload, ivory restores
const bgBefore = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
await page.evaluate(() => [...document.querySelectorAll('aside button')].find((b) => b.textContent.trim() === 'Dark')?.click());
await sleep(600);
const darkApplied = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, bg: getComputedStyle(document.body).backgroundColor }));
ok('dark theme applies', darkApplied.theme === 'dark' && darkApplied.bg !== bgBefore, JSON.stringify(darkApplied));
await page.screenshot({ path: '/tmp/rt/shots/audit-dark.png' });
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1800);
ok('dark theme persists after reload', await page.evaluate(() => document.documentElement.dataset.theme === 'dark'));
await page.evaluate(() => [...document.querySelectorAll('aside button')].find((b) => b.textContent.trim() === 'Ivory')?.click());
await sleep(500);
ok('ivory theme restores', await page.evaluate(() => document.documentElement.dataset.theme === 'ivory'));

// ---- logout -> login page; root URL redirects to login while logged out
await page.evaluate(() => [...document.querySelectorAll('button[aria-label="Log out"]')][0]?.click());
await page.waitForSelector('input[type=email]', { timeout: 6000 });
ok('logout lands on login page', true);
await page.goto(BASE, { waitUntil: 'networkidle0' });
await sleep(1500);
ok('root URL redirects to login when logged out', await page.evaluate(() => Boolean(document.querySelector('input[type=email]')) && location.pathname.endsWith('/login'), ));

// ---- wrong password shows error
await page.type('input[type=email]', A);
await page.type('input[type=password]', 'wrong-pass-999');
await page.click('button[type=submit]');
await sleep(1500);
const errVisible = await page.evaluate(() => { const el = document.querySelector('[role=alert]'); return el && el.offsetHeight > 0 ? el.textContent : null; });
ok('wrong password shows visible error', Boolean(errVisible), errVisible || '');
await page.screenshot({ path: '/tmp/rt/shots/audit-wrong-pass.png' });

// ---- login correctly, task A visible
await page.evaluate(() => { document.querySelector('input[type=password]').value = ''; });
await page.click('input[type=password]', { clickCount: 3 });
await page.type('input[type=password]', 'audit-pass-123');
await page.click('button[type=submit]');
await page.waitForFunction(() => document.querySelector('#overview'), { timeout: 9000 });
await sleep(1500);
ok('correct login works, task A visible', await page.evaluate(() => document.body.innerText.includes('Isolation task A')));

// ---- second account isolation: register B, no task A
await page.evaluate(() => [...document.querySelectorAll('button[aria-label="Log out"]')][0]?.click());
await page.waitForSelector('input[type=email]', { timeout: 6000 });
await page.goto(BASE + 'register', { waitUntil: 'networkidle0' });
await sleep(700);
await page.type('#name', 'Audit B');
await page.type('#remail', B);
await page.type('#rpassword', 'audit-pass-123');
await page.type('#confirm', 'audit-pass-123');
await clickBtn('Create account');
await page.waitForFunction(() => document.querySelector('#overview'), { timeout: 9000 });
await sleep(1500);
const iso = await page.evaluate(() => ({ seesA: document.body.innerText.includes('Isolation task A'), empty: document.body.innerText.includes('No tasks yet.') }));
ok('second account sees empty dashboard (data isolation)', !iso.seesA && iso.empty, JSON.stringify(iso));
await page.screenshot({ path: '/tmp/rt/shots/audit-isolation.png' });
} catch (e) { results.push('SCRIPT ERROR | ' + e.message.split('\n')[0]); }

console.log(results.join('\n'));
console.log('====');
console.log(`PASSED=${results.filter((r) => r.startsWith('PASS')).length} FAILED=${results.filter((r) => r.startsWith('FAIL')).length}`);
console.log('non-2xx/3xx responses:', badResponses.length ? badResponses.join(' ; ') : 'none');
await browser.close();
