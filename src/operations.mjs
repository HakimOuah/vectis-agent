import { z } from 'zod';
const text = z.string().trim().min(1).max(500);
const domain = z.string().toLowerCase().regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/).max(253);
export const operations = {
  search_web: {
    provider: 'exa', endpoint: '/search',
    description: 'Retrieve web sources about athletes, brands and sponsorship signals. Your assistant analyzes the evidence.',
    schema: z.object({ query: text, limit: z.number().int().min(1).max(10).default(5) }).strict(),
    input: a => ({ body: { query: a.query, numResults: a.limit, type: 'fast', contents: { text: { maxCharacters: 2500 } } } }),
    limit: a => a.limit,
  },
  search_contacts: {
    provider: 'apollo', endpoint: '/mixed_people/api_search',
    description: 'Find decision makers at an exact company domain. Search results alone do not prove current employment or a usable email.',
    schema: z.object({ domain, titles: z.array(text).min(1).max(8) }).strict(),
    input: a => ({ queryParams: { 'q_organization_domains_list[]': [a.domain], 'person_titles[]': a.titles, include_similar_titles: false, page: 1, per_page: 10 } }),
    limit: () => 10,
  },
  enrich_contact: {
    provider: 'apollo', endpoint: '/people/match',
    description: 'Enrich a person ID returned by Apollo. Excludes personal emails and phone reveals.',
    schema: z.object({ personId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/) }).strict(),
    input: a => ({ queryParams: { id: a.personId, reveal_personal_emails: false, reveal_phone_number: false } }),
    limit: () => 1,
  },
  find_email: {
    provider: 'hunterio', endpoint: '/email-finder',
    description: 'Find a professional email from a person name and exact company domain.',
    schema: z.object({ name: text, domain }).strict(),
    input: a => ({ queryParams: { full_name: a.name, domain: a.domain, max_duration: 10 } }),
    limit: () => 1,
  },
  verify_email: {
    provider: 'hunterio', endpoint: '/email-verifier',
    description: 'Retrieve email verification evidence. Catch-all or unknown is not verified deliverability.',
    schema: z.object({ email: z.string().email().max(254) }).strict(),
    input: a => ({ queryParams: { email: a.email } }),
    limit: () => 1,
  },
};
export function dollars(money) {
  if (!money || money.currency !== 'USD' || typeof money.value !== 'number' || !Number.isFinite(money.value) || money.value < 0) return null;
  if (money.unit === 'MICRO_DOLLAR') return money.value / 1e6;
  return !money.unit || money.unit === 'DOLLAR' ? money.value : null;
}
export const round = n => Math.ceil(n * 1e6 - 1e-8) / 1e6;
export function quote(price, operation, limit) {
  if (price?.type === 'TIERED') {
    if (price.flatFee !== undefined || !Array.isArray(price.tiers) || !price.tiers.length) throw new Error('Unbounded price model');
    for (const tier of price.tiers) {
      if (operation === 'search_web') {
        const s = tier.selector;
        if (!s || s.key !== 'numResults' || s.in !== 'body' || s.offset !== 10 || limit > 10 || tier.when !== undefined || tier.price?.type !== 'PER_RESULT' || dollars(tier.price.amount) === null) throw new Error('Unbounded search price');
      } else if (operation === 'enrich_contact') {
        const entries = Object.entries(tier.when || {});
        if (entries.length !== 1 || !['reveal_personal_emails', 'reveal_phone_number'].includes(entries[0][0]) || ![true, 'true'].includes(entries[0][1])) throw new Error('Unbounded enrichment price');
        // The conditional add-on is disabled in our fixed request; its output selector cannot apply.
      } else throw new Error('Unsupported tiered price');
    }
    if (price.default?.type !== 'PER_CALL') throw new Error('Unbounded default price');
    return quote(price.default, operation, 1);
  }
  if (!['PER_CALL', 'PER_RESULT'].includes(price?.type)) throw new Error('Unsupported price model');
  const amount = dollars(price.amount), fee = price.flatFee === undefined ? 0 : dollars(price.flatFee);
  if (amount === null || fee === null) throw new Error('Unknown USD price');
  return round(amount * (price.type === 'PER_RESULT' ? limit : 1) + fee);
}
