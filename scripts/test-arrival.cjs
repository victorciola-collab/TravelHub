// Browser integration checks using Chromium's native debugging protocol.
// Run with Node >= 22. No application dependency is installed.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const base = path.resolve(__dirname, '..');
const browser = process.env.TRAVELHUB_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'travelhub-qa-'));
const errors = [];
const results = [];
const report = path.join(base, 'qa-arrival-results.json');
function record(status, label) {
  results.push({ status, label });
  fs.writeFileSync(report, JSON.stringify(results, null, 2));
}
let child, socket;
const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const relative = pathname.replace(/^\/TravelHub\//, '');
  const file = path.resolve(base, relative || 'index.html');
  if (!file.startsWith(base + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    response.writeHead(404); response.end(); return;
  }
  response.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' })[path.extname(file)] || 'application/octet-stream');
  response.end(fs.readFileSync(file));
});
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let sequence = 0;
const pending = new Map();
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.has(id)) { pending.delete(id); reject(new Error(`Timeout: ${method}`)); } }, 10000).unref();
  });
}
async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(JSON.stringify(response.exceptionDetails));
  return response.result.value;
}
function assert(value, label) {
  if (!value) throw new Error(label);
  record('pass', label);
  console.log(`PASS ${label}`);
}
async function ready() {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (await evaluate(`!!document.querySelector('#page-transportes') && document.querySelector('#breadcrumb-current').textContent === 'Transportes'`)) return;
    await delay(100);
  }
  throw new Error('App did not initialize');
}
async function run() {
  record('started', 'Local browser integration checks');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  child = spawn(browser, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  child.on('error', error => errors.push(error.message));
  const activePort = path.join(profile, 'DevToolsActivePort');
  for (let attempt = 0; !fs.existsSync(activePort) && attempt < 100; attempt++) await delay(100);
  if (!fs.existsSync(activePort)) throw new Error('Browser debugging unavailable: ' + errors.join('; '));
  const debugPort = fs.readFileSync(activePort, 'utf8').split('\n')[0];
  const tabs = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then(response => response.json());
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; setTimeout(() => reject(new Error('WebSocket connection timed out')), 10000).unref(); });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const waiter = pending.get(message.id); pending.delete(message.id);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error))); else waiter.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') errors.push(JSON.stringify(message.params.exceptionDetails));
  };
  await command('Runtime.enable');
  await command('Page.enable');
  await command('Page.navigate', { url: `http://127.0.0.1:${port}/TravelHub/index.html#transportes` });
  await ready();
  assert(await evaluate(`document.querySelectorAll('[data-arrival-check]').length === 14`), '14 checklist items');
  const snapshot = await evaluate('JSON.stringify(window.TRAVEL_DATA)');
  for (const width of [320, 375, 390, 768, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 768 });
    for (const theme of ['dark', 'light']) {
      await evaluate(`document.documentElement.dataset.theme = '${theme}'; document.querySelectorAll('#arrival-guide details').forEach(item => item.open = true)`);
      assert(await evaluate(`document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('#arrival-guide .arrival-card, #arrival-guide .arrival-intro')].every(item => item.getBoundingClientRect().right <= innerWidth + 1)`), `${width}px / ${theme}: no horizontal overflow`);
    }
  }
  for (const page of ['dashboard', 'roteiro', 'hoteis', 'voos', 'locais', 'transportes']) {
    await evaluate(`document.querySelector('[data-page="${page}"]').click()`);
    assert(await evaluate(`document.querySelector('#page-${page}').classList.contains('active-page') && document.querySelectorAll('.active-page').length === 1`), `navigation ${page}`);
  }
  assert(await evaluate(`document.querySelectorAll('#hotels-grid .content-card').length > 0 && document.querySelectorAll('#flights-list .flight-segment-card').length > 0 && document.querySelectorAll('#places-grid .place-card').length > 0 && document.querySelector('#itinerary-list').children.length > 0`), 'existing sections render records');
  await command('Emulation.setDeviceMetricsOverride', { width: 375, height: 900, deviceScaleFactor: 1, mobile: true });
  await evaluate(`document.querySelector('#menu-button').click()`);
  assert(await evaluate(`document.querySelector('#sidebar').classList.contains('open') && document.querySelector('#menu-button').getAttribute('aria-expanded') === 'true'`), 'mobile menu opens');
  await evaluate(`document.querySelector('[data-page="transportes"]').click()`);
  assert(await evaluate(`!document.querySelector('#sidebar').classList.contains('open') && location.hash === '#transportes'`), 'mobile navigation closes menu');
  await evaluate(`document.querySelector('[data-arrival-jump="arrival-step-3"]').click()`);
  assert(await evaluate(`document.activeElement.id === 'arrival-step-3' && location.hash === '#transportes'`), 'step jump preserves app route and focuses content');
  await evaluate(`localStorage.removeItem('travelhub-arrival-narita-2026-v1')`);
  await command('Page.reload'); await ready();
  await evaluate(`document.querySelector('[data-arrival-check="immigration"]').click()`);
  assert(await evaluate(`document.querySelector('[data-arrival-progress]').value === 1 && JSON.parse(localStorage.getItem('travelhub-arrival-narita-2026-v1'))[0] === 'immigration'`), 'checklist stores progress');
  await command('Page.reload'); await ready();
  assert(await evaluate(`document.querySelector('[data-arrival-check="immigration"]').checked`), 'checklist survives reload');
  await evaluate(`document.querySelector('[data-arrival-check="immigration"]').click()`);
  assert(await evaluate(`document.querySelector('[data-arrival-progress]').value === 0`), 'unchecking updates progress');
  await evaluate(`document.querySelectorAll('[data-arrival-check]').forEach(item => { if (!item.checked) item.click(); })`);
  assert(await evaluate(`document.querySelector('[data-arrival-progress-label]').textContent.includes('100%')`), 'all items reach 100 percent');
  await evaluate(`window.confirm = () => false; document.querySelector('[data-reset-arrival]').click()`);
  assert(await evaluate(`document.querySelector('[data-arrival-progress]').value === 14`), 'reset cancellation preserves progress');
  await evaluate(`window.confirm = () => true; document.querySelector('[data-reset-arrival]').click()`);
  assert(await evaluate(`document.querySelector('[data-arrival-progress]').value === 0 && localStorage.getItem('travelhub-arrival-narita-2026-v1') === '[]'`), 'confirmed reset persists');
  await command('Page.addScriptToEvaluateOnNewDocument', { source: `Object.defineProperty(Storage.prototype, 'getItem', { value() { throw new Error('Blocked'); } }); Object.defineProperty(Storage.prototype, 'setItem', { value() { throw new Error('Blocked'); } });` });
  await command('Page.reload'); await ready();
  await evaluate(`document.querySelector('[data-arrival-check="immigration"]').click()`);
  assert(await evaluate(`document.querySelector('[data-arrival-progress]').value === 1 && document.querySelector('[data-arrival-storage]').textContent.includes('bloqueou')`), 'blocked storage has usable checklist and clear notice');
  assert(await evaluate(`JSON.stringify(window.TRAVEL_DATA) === ${JSON.stringify(snapshot)}`), 'guide does not mutate travel records');
  await evaluate(`document.querySelector('[data-copy-arrival-address]').click()`);
  await delay(200);
  assert(await evaluate(`document.querySelector('[data-copy-feedback]').textContent.length > 0`), 'address copy provides feedback');
  const links = await evaluate(`[...document.querySelectorAll('#arrival-guide a')].map(a => a.href)`);
  assert(links.every(link => /^(https:\/\/|tel:|http:\/\/127\.0\.0\.1:)/.test(link)), 'all guide links use supported schemes');
  const download = await fetch(`http://127.0.0.1:${port}/TravelHub/chegada-japao-offline.html`);
  assert(download.ok, 'offline download resolves under GitHub Pages subpath');
  await command('Network.enable');
  await command('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await command('Page.navigate', { url: pathToFileURL(path.join(base, 'chegada-japao-offline.html')).href });
  for (let attempt = 0; attempt < 50 && !await evaluate(`!!document.querySelector('[data-offline]')`); attempt++) await delay(100);
  assert(await evaluate(`!!document.querySelector('[data-offline]') && document.querySelectorAll('[data-arrival-check]').length === 14 && document.querySelector('.arrival-japanese').textContent.includes('2-4-10')`), 'offline file opens without network and contains guide');
  await evaluate(`document.querySelector('[data-arrival-check="walk"]').click()`);
  assert(await evaluate(`document.querySelector('[data-arrival-progress]').value === 1`), 'offline checklist works');
  assert(errors.length === 0, 'no browser JavaScript exceptions');
}
run().catch(error => { record('fail', error.message); console.error(error); process.exitCode = 1; }).finally(async () => {
  socket?.close();
  child?.kill();
  server.close();
  await delay(500);
  // The generated profile is a dedicated temporary directory outside the repository.
  // Leave cleanup to the OS if Windows still holds browser file handles.
  console.log('Browser and local test server stopped.');
  record('stopped', 'Browser and local test server stopped');
});
