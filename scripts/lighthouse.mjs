// Runs Lighthouse (the same engine as PageSpeed Insights) against the built sites on a local server.
import { createServer } from 'node:http';
import { existsSync } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { platform } from 'node:os';
import { join, extname } from 'node:path';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

// Where Chromium lives differs by machine, so it is resolved here rather than hardcoded.
// The script used to pin the Linux container path, which made it unrunnable on Windows.
// Order: an explicit CHROMIUM_PATH wins; then the original container path whenever it
// exists, so the environment this script was first written for behaves exactly as before;
// then the system Chrome for this platform; then the container path again, so a machine
// with no browser still fails naming the path that was expected.
const CONTAINER_CHROMIUM = '/opt/pw-browsers/chromium';
function resolveChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (existsSync(CONTAINER_CHROMIUM)) return CONTAINER_CHROMIUM;
  const systemChrome = {
    win32: [
      join(process.env.PROGRAMFILES ?? 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(process.env['PROGRAMFILES(X86)'] ?? 'C:\\Program Files (x86)', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    ],
    darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
  }[platform()] ?? [];
  return systemChrome.find((p) => p && existsSync(p)) ?? CONTAINER_CHROMIUM;
}
const executablePath = resolveChromium();
console.log(`Chromium: ${executablePath}`);

const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };
function serve(dist, port) {
  const s = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = join(dist, p);
    try { await stat(file); } catch { file = join(dist, p + '.html'); }
    try { const d = await readFile(file); res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'public, max-age=31536000' }); res.end(d); }
    catch { res.writeHead(404); res.end(); }
  });
  return new Promise((r) => s.listen(port, () => r(s)));
}
const targets = [
  ['sites/sondor-ai/dist', 4331, '/', 'main-home'],
  ['sites/sondor-ai/dist', 4331, '/pricing', 'main-pricing'],
  ['sites/beta/dist', 4332, '/', 'beta'],
];
const browser = await chromium.launch({ executablePath, args: ['--remote-debugging-port=9333'] });
const servers = {};
for (const [dist, port, path, name] of targets) {
  servers[port] ??= await serve(dist, port);
  for (const formFactor of ['mobile', 'desktop']) {
    const opts = { port: 9333, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'], formFactor, screenEmulation: formFactor === 'desktop' ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false } : undefined, throttlingMethod: 'simulate', throttling: formFactor === 'desktop' ? { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 } : undefined };
    const r = await lighthouse(`http://localhost:${port}${path}`, opts);
    const c = r.lhr.categories;
    const a = r.lhr.audits;
    console.log(`${name} ${formFactor}: perf ${Math.round(c.performance.score * 100)} a11y ${Math.round(c.accessibility.score * 100)} bp ${Math.round(c['best-practices'].score * 100)} seo ${Math.round(c.seo.score * 100)} | LCP ${a['largest-contentful-paint'].displayValue} CLS ${a['cumulative-layout-shift'].displayValue} TBT ${a['total-blocking-time'].displayValue}`);
    const fails = Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode === 'binary').map((x) => x.id);
    if (fails.length) console.log('   failing audits:', fails.join(', '));
  }
}
await browser.close();
Object.values(servers).forEach((s) => s.close());
