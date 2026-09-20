// SEO conventions against built HTML: title 55 to 60 chars, meta description 150 to 160,
// exactly one h1, canonical present, slugs hyphenated lower-case.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const roots = ['sites/sondor-ai/dist', 'sites/beta/dist'];
let failures = 0;
function walk(d) { return readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []; }); }
const decode = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
for (const root of roots) for (const file of walk(root)) {
  const html = readFileSync(file, 'utf8');
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? '');
  const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  const canonical = /<link rel="canonical"/.test(html);
  // Separators normalised before the slug test below. Same Windows bug the
  // copy lint had: join() builds a path with backslashes, the slug pattern
  // only allows forward slashes, so EVERY page failed on "slug" locally while
  // Cloudflare's Linux builder passed. The check itself is about the page
  // name, not about which machine ran it.
  const slug = file.replace(root, '').replace(/\\/g, '/');
  const problems = [];
  if (title.length < 55 || title.length > 60) problems.push(`title ${title.length} chars`);
  if (desc.length < 150 || desc.length > 160) problems.push(`description ${desc.length} chars`);
  if (h1s !== 1) problems.push(`${h1s} h1`);
  if (!canonical) problems.push('no canonical');
  if (!/^[a-z0-9\/\-.]+$/.test(slug)) problems.push('slug');
  console.log(`${problems.length ? 'FAIL' : 'ok  '} ${file}  title=${title.length} desc=${desc.length} h1=${h1s}${problems.length ? '  ' + problems.join(', ') : ''}`);
  if (problems.length) failures++;
}
console.log(failures ? `\n${failures} page(s) failing` : '\nseo check passed');
process.exit(failures ? 1 : 0);
