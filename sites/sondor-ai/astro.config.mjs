// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static output, no adapter, no SSR. Deploys to Cloudflare Pages as plain files.
// PUBLIC_SITE_URL lets a pages.dev preview build a sitemap for its own origin;
// production leaves it unset and uses the custom domain.
const site = process.env.PUBLIC_SITE_URL || 'https://sondor.ai';

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  integrations: [sitemap()],
  compressHTML: true,
  vite: { build: { assetsInlineLimit: 0 } },
});
