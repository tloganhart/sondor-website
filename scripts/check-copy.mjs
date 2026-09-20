// Humanizer lint against built HTML. Fails the build on hard rules; warns on softer ones.
// Legal pages are verbatim source text and are skipped. Founder-story blocks are Logan's own
// words (voice outranks the ruleset) and are reported separately rather than failed.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const roots = ['sites/sondor-ai/dist', 'sites/beta/dist'];
const skip = new Set(['privacy.html', 'terms.html']);
const hard = [
  [/—/g, 'em dash'],
  [/!/g, 'exclamation mark'],
  [/\b(it|this|that)['’]?s not (about )?[^.,;]{1,60}?,? (it|this|that)['’]?s\b/gi, "it's not X, it's Y"],
  [/\bnot (about )?[^.,;]{1,40}?, but\b/gi, 'not X, but Y'],
  [/\b(delve|tapestry|realm|paradigm|embark|beacon|testament to|robust|comprehensive|cutting-edge|pivotal|foster|navigate|seamless|unlock|elevate|empower|supercharge|game-changer|revolutionary)\b/gi, 'banned vocabulary'],
  [/\b(furthermore|moreover|additionally)\b/gi, 'connective opener'],
  [/\b(genuinely|truly|to be honest|let['’]s be clear|it['’]s worth noting|it is worth noting|it['’]s important to note|it is important to note)\b/gi, 'hollow intensifier or hedge'],
];
const soft = [
  [/\bleverag(e|ing|ed)\b/gi, 'leverage (banned unless in a quoted founder line)'],
  [/\bnot only\b/gi, 'not only'],
];
let failures = 0;
function walk(d) { return readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') ? [p] : []; }); }
for (const root of roots) for (const file of walk(root)) {
  const name = file.split('/').pop();
  if (skip.has(name)) continue;
  const html = readFileSync(file, 'utf8');
  // Strip scripts/styles, then tags, keep text with paragraph breaks.
  const text = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  // Founder-voice blocks: anything inside <article class="prose story"> or <div class="prose story"> or blockquote
  const story = [...html.matchAll(/<(article|div|blockquote)[^>]*class="[^"]*(story|founder-note|pull)[^"]*"[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => m[3].replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'")).join(' ');
  for (const [re, label] of hard) {
    for (const m of text.matchAll(re)) {
      const inStory = story.includes(m[0]) || (label === 'em dash' && false);
      const ctx = text.slice(Math.max(0, m.index - 50), m.index + m[0].length + 50);
      if (inStory) console.log(`  (founder voice) ${file}: ${label}: …${ctx}…`);
      else { failures++; console.log(`FAIL ${file}: ${label}: …${ctx}…`); }
    }
  }
  for (const [re, label] of soft) for (const m of text.matchAll(re)) {
    const ctx = text.slice(Math.max(0, m.index - 50), m.index + m[0].length + 50);
    console.log(`  warn ${file}: ${label}: …${ctx}…`);
  }
  // Title-case heading check (headings with 3+ capitalised words in a row that are not proper nouns)
  for (const h of html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/g)) {
    const t = h[1].replace(/<[^>]+>/g, '').trim();
    const words = t.split(/\s+/);
    const caps = words.filter((w) => /^[A-Z][a-z]/.test(w)).length;
    if (words.length >= 4 && caps / words.length > 0.7 && !/Privacy Policy|Terms of Service/.test(t)) { failures++; console.log(`FAIL ${file}: title-case heading: ${t}`); }
    if (/^[^:]{2,40}: [A-Z]/.test(t)) { failures++; console.log(`FAIL ${file}: colon-title heading: ${t}`); }
  }
}
console.log(failures ? `\n${failures} hard failure(s)` : '\ncopy check passed');
process.exit(failures ? 1 : 0);
