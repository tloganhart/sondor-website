/**
 * Single source of truth for product facts that appear in site copy.
 * Change a value here and it lands everywhere on both sites.
 *
 * Tier names are placeholders pending the beta naming poll (Decision Log, Aug 25 2026:
 * Mark/Signature vs Desk/Studio). Rename here and nowhere else.
 */
export const tiers = {
  basic: {
    name: 'Basic',
    price: 39,               // USD per month, standard rate (founding rates are not shown on sondor.ai)
    summary: 'One voice. The whole method.',
  },
  premium: {
    name: 'Premium',
    price: 59,
    summary: 'More than one voice, and the heavier tools.',
  },
} as const;

/**
 * Annual billing. Ten months charged for twelve, which is the literal meaning of
 * "2 months free" and the reason the saving is never shown as a percentage
 * (Decision Log, "Referral program compensation", Aug 25 2026; the $390 and $590
 * figures confirmed Sep 22 2026).
 *
 * Derived from the monthly price rather than typed a second time, so the yearly
 * figure cannot drift away from the monthly one it is meant to be ten times.
 */
export const annual = {
  monthsCharged: 10,
  /** Always this phrasing. Never "17%", never any other percentage. */
  label: '2 months free',
} as const;

export const annualPrice = (monthlyPrice: number): number => monthlyPrice * annual.monthsCharged;

export const trial = {
  days: 14,
  cardRequired: false,
  /** Where "Start your free trial" sends people. Payment and trial start live in the app, never on the website. */
  url: 'https://sondor.app',
  ctaLabel: 'Start your free trial',
  ctaNote: 'No credit card required. 14 days.',
} as const;

export const beta = {
  cap: 100,
  weeks: 4,
  weeksWord: 'four',
  foundingBasic: 29,
  foundingPremium: 39,
} as const;

export const contact = {
  email: 'hello@sondor.ai',
} as const;

export const urls = {
  main: 'https://sondor.ai',
  beta: 'https://beta.sondor.ai',
  app: 'https://sondor.app',
} as const;

export const tagline = 'Your words. Sharpened, never outsourced.';
