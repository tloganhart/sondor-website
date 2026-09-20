// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static output, no adapter, no SSR. Deploys to Cloudflare Pages as plain files.
const site = process.env.PUBLIC_SITE_URL || 'https://beta.sondor.ai';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [sitemap()],
  compressHTML: true,
  vite: { build: { assetsInlineLimit: 0 } },
});
