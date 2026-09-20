// Runs Lighthouse (the same engine as PageSpeed Insights) against the built sites on a local server.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import lighthouse from 'lighthouse';
import { chromium } from 'playwright';

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
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--remote-debugging-port=9333'] });
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
