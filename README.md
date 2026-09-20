# sondor-web

Two static Astro sites and one shared design system.

| Path | What | Deploys to |
| --- | --- | --- |
| `sites/sondor-ai` | Marketing and sales front door. Home, How it works, Pricing (with trial terms), About, Privacy, Terms, 404. | `sondor.ai` (held off the custom domain until public launch) |
| `sites/beta` | Single-page closed beta landing page with the application form built in. | `beta.sondor.ai` (replaces the live page after review) |
| `packages/design` | Tokens, fonts, brand assets, shared Astro components, and `config.ts` (prices, tier names, trial facts, cap). | consumed by both |

Static output only. No SSR, no adapter, no Workers runtime, no React. The main site ships zero JavaScript. The beta site ships one small script for the form.

## Run it

```
npm install
npm run dev:main      # sondor.ai on http://localhost:4321
npm run dev:beta      # beta.sondor.ai on http://localhost:4321
npm run build         # builds both into sites/*/dist
npm run check         # Humanizer copy lint + SEO length lint against the built HTML
node scripts/lighthouse.mjs   # Lighthouse (PageSpeed engine) on the built output
node scripts/test-form.mjs    # exercises the beta form end to end against a mock endpoint
```

Node 22 (`.nvmrc`).

## Cloudflare Pages settings

Two Pages projects, both connected to this repo. Same build for each, different root directory.

| Setting | sondor.ai project | beta.sondor.ai project |
| --- | --- | --- |
| Framework preset | Astro | Astro |
| Root directory | `sites/sondor-ai` | `sites/beta` |
| Build command | `cd ../.. && npm ci && npm run build:main` | `cd ../.. && npm ci && npm run build:beta` |
| Build output directory | `dist` | `dist` |
| Node version | `NODE_VERSION=22` (environment variable) | same |
| Custom domain | none until launch | none until review is done |

The `cd ../..` is needed because the workspace root holds the lockfile. Do not bind either custom domain from this repo; that is a dashboard step taken on purpose, later.

## Environment variables

Every one is optional. Unset means the feature renders nothing or degrades on purpose. Copy `sites/*/.env.example` to `.env` for local use, or set them on the Pages project.

| Variable | Site | Effect when set | State |
| --- | --- | --- | --- |
| `PUBLIC_BETA_APPLY_ENDPOINT` | beta | The URL the application form POSTs to. While unset, submitting shows a "not open yet" message and sends nothing. | **unset**, endpoint not built yet |
| `PUBLIC_CF_ANALYTICS_TOKEN` | both (one token per Pages project) | Renders the Cloudflare Web Analytics beacon. | **unset** |
| `PUBLIC_NOINDEX` | both | `1` adds `<meta name="robots" content="noindex">` to every page. Set it on the sondor.ai Pages project until launch so the production pages.dev URL stays out of search. | unset |
| `PUBLIC_SITE_URL` | both | Overrides the canonical origin used in `<link rel="canonical">`, Open Graph URLs and the sitemap. Defaults to `https://sondor.ai` / `https://beta.sondor.ai`. | unset, correct for production |

## Where things are decided once

- **Prices, tier names, trial length, cap, contact email:** `packages/design/src/config.ts`. Tier names are placeholders (`Basic`, `Premium`) pending the beta naming poll; rename there and nowhere else.
- **Palette and type scale:** `packages/design/src/styles/tokens.css`.
- **Tracking scripts:** `packages/design/src/components/Tracking.astro`. The only place a third-party tag may be added. Cloudflare Web Analytics is the only tag today.
- **Trial CTA destination:** `trial.url` in `config.ts`. Currently `https://sondor.app`; point it at the real signup route when it exists.
- **Legal text:** `sites/sondor-ai/src/pages/privacy.astro` and `terms.astro` mirror the Notion page verbatim. Edit Notion first, then mirror.

## Beta application form contract

The form POSTs JSON. The receiving endpoint (Railway) and the Notion database that stores rows do not exist yet; build them against this.

```
POST <PUBLIC_BETA_APPLY_ENDPOINT>
Content-Type: application/json
Accept: application/json

{
  "form_version": 1,
  "submitted_at": "2026-09-13T18:04:11.532Z",
  "page": "beta.sondor.ai",
  "name": "string, required, trimmed, 1..120",
  "email": "string, required, trimmed, lowercased, valid email, max 200",
  "source": "friend | facebook | instagram | youtube | other",
  "source_detail": "string, may be empty, required when source is other, max 300",
  "writing": "string, required, 1..600",
  "publishing": "string, required, 1..600",
  "commitment": true,
  "notes": "string, may be empty, max 2000"
}
```

Any 2xx is success. Anything else, a network error, or a 15-second timeout shows the error state and keeps the visitor's answers in the form. The browser never reads the response body. The endpoint must answer CORS preflight for `https://beta.sondor.ai` (and the pages.dev preview origin while reviewing) with `POST` and `Content-Type` allowed. A hidden honeypot field is never sent; a filled honeypot shows success without sending.

## Fonts

Self-hosted in `packages/design/src/fonts/`. Newsreader is instanced from the variable font (`@fontsource-variable/newsreader`, opsz 36) at weights 400 and 500 plus 400 italic; Hanken Grotesk ships as the latin variable font. Cormorant Garamond is not loaded because the wordmark is vector paths inside the logo SVG. To regenerate, see the fontTools snippet in `scripts/README-fonts.md`.

## Placeholders

Marked, dashed-border regions where real media drops in later. Each states its export size. Swap the `<Placeholder>` for an `<img>` or `<video>` at the same aspect ratio and the layout holds.

| Page | What | Size |
| --- | --- | --- |
| sondor.ai home | Screen-share clip of a full session | 1600 × 900, 16:9 |
| sondor.ai how-it-works | Topical map screenshot | 1600 × 1000, 16:10 |
| sondor.ai how-it-works | Finished piece + provenance page screenshot | 1600 × 1000, 16:10 |
| sondor.ai about | Founder photograph | 1200 × 1500, 4:5 |
| beta.sondor.ai | Founder photograph | 800 × 1000, 4:5 |
