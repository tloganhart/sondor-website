// Screenshots of built pages for visual review. Usage: node scripts/shots.mjs <distDir> <outDir> [pages...]
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const [dist, out, ...pages] = process.argv.slice(2);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  let file = join(dist, p);
  try { await stat(file); } catch { file = join(dist, p + '.html'); }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(4321, r));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [name, w, h] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const p of pages) {
    await page.goto(`http://localhost:4321${p}`, { waitUntil: 'networkidle' });
    const slug = p === '/' ? 'home' : p.replace(/\//g, '_').replace(/^_/, '');
    await page.screenshot({ path: join(out, `${slug}-${name}.png`), fullPage: true });
  }
  await ctx.close();
}
await browser.close();
server.close();
console.log('done');
