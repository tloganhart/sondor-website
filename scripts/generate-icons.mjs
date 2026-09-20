// Generates favicon and social assets for both sites from the delivered icon-only logo
// (sondor final-04.svg, Fog Bone). Favicon treatment per Decision Log Aug 25, 2026:
// Signal Amber mark on a flat Petrol Depth disc, no gradient, 9% inset (16px uses a tighter inset).
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const markSvg = readFileSync(resolve(root, 'packages/design/assets/sondor-mark-fog.svg'), 'utf8');
const horizontalSvg = readFileSync(resolve(root, 'packages/design/assets/sondor-horizontal-fog.svg'), 'utf8');
const paths = [...markSvg.matchAll(/<path[^>]*d="([^"]+)"/g)].map((m) => m[1]);
const PETROL = '#050D14';
const AMBER = '#E8A23C';
const V = 249.3;

function faviconSvg(inset = 0.09) {
  const s = 1 - 2 * inset;
  const t = (V * inset).toFixed(2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${V} ${V}">` +
    `<circle cx="${V / 2}" cy="${V / 2}" r="${V / 2}" fill="${PETROL}"/>` +
    `<g transform="translate(${t} ${t}) scale(${s.toFixed(4)})" fill="${AMBER}">` +
    paths.map((d) => `<path d="${d}"/>`).join('') + `</g></svg>`;
}

// Open Graph image: horizontal wordmark on Petrol Depth. Logo and colour only.
function ogSvg() {
  const inner = horizontalSvg.replace(/<\?xml[^>]*>/, '').replace(/<svg[^>]*>/, '').replace('</svg>', '');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<rect width="1200" height="630" fill="${PETROL}"/>` +
    `<g transform="translate(212 236) scale(1.64)">${inner}</g>` +
    `</svg>`;
}

for (const site of ['sites/sondor-ai/public', 'sites/beta/public']) {
  const out = resolve(root, site);
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'favicon.svg'), faviconSvg());
  for (const n of [16, 32, 48, 180, 192, 512]) {
    const svg = Buffer.from(faviconSvg(n === 16 ? 0.04 : 0.09));
    const name = n === 180 ? 'apple-touch-icon.png' : `icon-${n}.png`;
    await sharp(svg, { density: 384 }).resize(n, n).png({ compressionLevel: 9 }).toFile(resolve(out, name));
  }
  await sharp(Buffer.from(ogSvg()), { density: 96 }).png({ compressionLevel: 9 }).toFile(resolve(out, 'og.png'));
  writeFileSync(resolve(out, 'site.webmanifest'), JSON.stringify({
    name: 'Sondor', short_name: 'Sondor',
    icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
    theme_color: PETROL, background_color: PETROL, display: 'browser'
  }, null, 2));
}
console.log('icons written');
