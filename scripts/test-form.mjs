// Exercises the beta application form: validation, the unset-endpoint state, success, and failure.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';

let dist = 'sites/beta/dist';
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
let received = [];
let mode = 'ok';
const server = createServer(async (req, res) => {
  if (req.url === '/api/apply') {
    let body = ''; for await (const c of req) body += c;
    received.push({ headers: req.headers, body: JSON.parse(body) });
    res.writeHead(mode === 'ok' ? 201 : 500, { 'content-type': 'application/json', 'access-control-allow-origin': '*' }); res.end('{}'); return;
  }
  let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
  try { const d = await readFile(join(dist, p)); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }); res.end(d); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4322, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto('http://localhost:4322/');

// 1. Empty submit: validation blocks, first invalid field focused.
await page.click('#apply-submit');
const invalid = await page.$$eval('.field[data-invalid]', (els) => els.length);
const focused = await page.evaluate(() => document.activeElement?.id);
console.log('invalid fields on empty submit:', invalid, 'focused:', focused);

// 2. Fill everything, source=other with no detail: detail becomes required.
await page.fill('#f-name', 'Test Person');
await page.fill('#f-email', 'Test@Example.com');
await page.selectOption('#f-source', 'other');
await page.fill('#f-writing', 'Essays about craft.');
await page.fill('#f-publishing', 'Substack, weekly.');
await page.check('#f-commitment');
await page.click('#apply-submit');
console.log('detail required when other:', await page.$eval('#f-source-detail', (el) => el.closest('.field').hasAttribute('data-invalid')));
await page.fill('#f-source-detail', 'A newsletter');

// 3. Endpoint unset (as built): closed state, nothing sent.
await page.click('#apply-submit');
await page.waitForSelector('#apply-status:not([hidden])');
console.log('closed state kind:', await page.$eval('#apply-status', (el) => el.dataset.kind), 'received:', received.length);

// 4. Point at a mock endpoint: success.
dist = 'sites/beta/dist-test';
await page.goto('http://localhost:4322/');
await page.fill('#f-name', 'Test Person');
await page.fill('#f-email', 'Test@Example.com ');
await page.selectOption('#f-source', 'friend');
await page.fill('#f-writing', 'Essays about craft.');
await page.fill('#f-publishing', 'Substack, weekly.');
await page.check('#f-commitment');
await page.fill('#f-notes', 'Hello.');
await page.click('#apply-submit');
await page.waitForSelector('#apply-status:not([hidden])');
console.log('success kind:', await page.$eval('#apply-status', (el) => el.dataset.kind));
console.log('payload:', JSON.stringify(received[0]?.body, null, 2));
console.log('content-type:', received[0]?.headers['content-type']);
console.log('form reset after success:', await page.$eval('#f-name', (el) => el.value === ''));

// 5. Failure: server 500.
mode = 'fail';
await page.fill('#f-name', 'Again');
await page.fill('#f-email', 'a@b.co');
await page.selectOption('#f-source', 'youtube');
await page.fill('#f-writing', 'x');
await page.fill('#f-publishing', 'y');
await page.check('#f-commitment');
await page.click('#apply-submit');
await page.waitForFunction(() => document.getElementById('apply-status').dataset.kind === 'err');
console.log('error kind shown, values kept:', await page.$eval('#f-name', (el) => el.value));

// 6. Honeypot: nothing sent.
const before = received.length;
await page.fill('#f-website', 'spam');
await page.click('#apply-submit');
await page.waitForFunction(() => document.getElementById('apply-status').dataset.kind === 'ok');
console.log('honeypot sent nothing:', received.length === before);
console.log('page errors:', errors);
await browser.close(); server.close();
