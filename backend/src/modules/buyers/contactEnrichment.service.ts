/**
 * Buyer contact enrichment ("Option C").
 *
 * Stage 1 (free, always on): scrape the buyer's own website - the homepage
 * plus common contact/about pages - and extract published email addresses
 * (mailto: links first, then a conservative regex over visible markup).
 *
 * Stage 2 (optional fallback): Hunter.io domain search, enabled by setting
 * the HUNTER_API_KEY environment variable. The feature works end-to-end
 * WITHOUT the key; the key only adds the fallback. Free-tier exhaustion is
 * reported as status 'credit_limit_reached' so the UI can show an
 * "API Credit Limit Reached" message instead of failing silently.
 *
 * Integration point: set HUNTER_API_KEY in backend/.env (see .env.example).
 */
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export type EnrichmentStatus =
  | 'already_present'
  | 'enriched'
  | 'not_found'
  | 'no_website'
  | 'hunter_not_configured'
  | 'credit_limit_reached'
  | 'error';

export interface EnrichmentResult {
  status: EnrichmentStatus;
  email: string | null;
  source: 'website_scrape' | 'hunter' | 'existing' | null;
  note?: string;
}

const CONTACT_PATHS = [
  '/contact', '/contact-us', '/contactus', '/contact.html',
  '/about', '/about-us', '/about.html', '/company', '/imprint',
];
const PAGE_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 750_000;

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JUNK_LOCALPART = /^(noreply|no-reply|donotreply|mailer-daemon|postmaster|webmaster|privacy|abuse)@/i;
const JUNK_DOMAIN = /(example\.|sentry|wixpress|godaddy|squarespace|wordpress|schema\.org|w3\.org|sentry\.io|googleapis|gstatic|cloudflare)/i;
const JUNK_SUFFIX = /\.(png|jpe?g|gif|webp|svg|css|js)$/i;
const PREFERRED_LOCALPART = /^(info|sales|exports?|imports?|import|contact|enquir(y|ies)|inquir(y|ies)|trade|procurement|business|mail|hello|office|admin)@/i;

/** Extract candidate emails from HTML (exported for tests). */
export function extractEmailsFromHtml(html: string): string[] {
  const found = new Map<string, number>(); // email -> rank score

  // 1) mailto: links (highest confidence)
  const mailtoRe = /mailto:([^"'>\s?]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = mailtoRe.exec(html)) !== null) {
    const addr = decodeURIComponent(m[1]).trim().toLowerCase();
    if (addr) found.set(addr, (found.get(addr) ?? 0) + 3);
  }

  // 2) plain-text addresses
  const text = html.slice(0, MAX_HTML_BYTES);
  while ((m = EMAIL_RE.exec(text)) !== null) {
    const addr = m[0].trim().toLowerCase();
    found.set(addr, (found.get(addr) ?? 0) + 1);
  }

  const candidates = [...found.entries()]
    .map(([email, score]) => ({ email, score }))
    .filter(({ email }) =>
      !JUNK_SUFFIX.test(email) &&
      !JUNK_LOCALPART.test(email) &&
      !JUNK_DOMAIN.test(email) &&
      email.length <= 80,
    )
    .map((c) => ({ ...c, score: c.score + (PREFERRED_LOCALPART.test(c.email) ? 2 : 0) }));

  candidates.sort((a, b) => b.score - a.score);
  return candidates.map((c) => c.email);
}

function normalizeBaseUrl(website: string): string | null {
  let url = website.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return null;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; GlobeX-ContactFinder/1.0)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    if (type && !type.includes('html') && !type.includes('text')) return null;
    const body = await res.text();
    return body.slice(0, MAX_HTML_BYTES);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Stage 1: scrape the buyer's own website for a published email. */
export async function scrapeWebsiteForEmail(website: string): Promise<string | null> {
  const base = normalizeBaseUrl(website);
  if (!base) return null;

  const homepage = await fetchPage(base);
  if (homepage) {
    const emails = extractEmailsFromHtml(homepage);
    if (emails.length > 0) return emails[0];
  }

  // Fetch candidate contact pages sequentially; stop at first hit.
  for (const path of CONTACT_PATHS) {
    const page = await fetchPage(`${base}${path}`);
    if (!page) continue;
    const emails = extractEmailsFromHtml(page);
    if (emails.length > 0) return emails[0];
  }
  return null;
}

interface HunterResponse {
  data?: { emails?: Array<{ value?: string; type?: string }> };
  errors?: Array<{ id?: string; details?: string }>;
}

/** Stage 2: Hunter.io domain search (only when HUNTER_API_KEY is set). */
export async function hunterDomainSearch(
  domain: string,
): Promise<{ email: string | null; creditLimitReached: boolean }> {
  const url =
    `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}` +
    `&api_key=${encodeURIComponent(env.HUNTER_API_KEY ?? '')}&limit=5`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    // 401/402/429 = bad key, plan limit, or rate limit - all surface as a
    // credit/quota problem the UI can explain.
    if (res.status === 402 || res.status === 429) {
      return { email: null, creditLimitReached: true };
    }
    if (!res.ok) {
      logger.warn(`Hunter domain-search failed: HTTP ${res.status} for ${domain}`);
      return { email: null, creditLimitReached: false };
    }
    const payload = (await res.json()) as HunterResponse;
    const emails = payload.data?.emails ?? [];
    const generic = emails.find((e) => e.type === 'generic' && e.value);
    const any = emails.find((e) => e.value);
    return { email: (generic ?? any)?.value ?? null, creditLimitReached: false };
  } catch (err) {
    logger.warn(`Hunter domain-search error for ${domain}: ${(err as Error).message}`);
    return { email: null, creditLimitReached: false };
  } finally {
    clearTimeout(timer);
  }
}

export const contactEnrichmentService = {
  /**
   * Find a public contact email for a buyer and persist it.
   * Never throws for external failures; reports an honest status instead.
   */
  async enrich(buyerId: string): Promise<EnrichmentResult> {
    const buyer = await prisma.buyer.findUnique({ where: { id: buyerId } });
    if (!buyer) {
      return { status: 'error', email: null, source: null, note: 'Buyer not found' };
    }
    if (buyer.email) {
      return { status: 'already_present', email: buyer.email, source: 'existing' };
    }
    if (!buyer.website) {
      return {
        status: 'no_website',
        email: null,
        source: null,
        note: 'No website on record for this buyer, so there is nothing to scrape.',
      };
    }

    // Stage 1: free website scrape
    const scraped = await scrapeWebsiteForEmail(buyer.website);
    if (scraped) {
      await prisma.buyer.update({
        where: { id: buyer.id },
        data: {
          email: scraped,
          verificationEvidence: {
            ...(typeof buyer.verificationEvidence === 'object' && buyer.verificationEvidence !== null
              ? (buyer.verificationEvidence as Record<string, unknown>)
              : {}),
            contactEnrichment: {
              method: 'website_scrape',
              foundAt: new Date().toISOString(),
              website: buyer.website,
            },
          },
        },
      });
      return { status: 'enriched', email: scraped, source: 'website_scrape' };
    }

    // Stage 2: Hunter fallback (only when configured)
    if (!env.HUNTER_API_KEY) {
      return {
        status: 'hunter_not_configured',
        email: null,
        source: null,
        note:
          'No email published on the company website. The Hunter contact-finder ' +
          'fallback is not configured (set HUNTER_API_KEY in backend/.env to enable it).',
      };
    }

    const base = normalizeBaseUrl(buyer.website);
    const domain = base ? new URL(base).host.replace(/^www\./, '') : null;
    if (!domain) {
      return { status: 'not_found', email: null, source: null };
    }
    const hunter = await hunterDomainSearch(domain);
    if (hunter.creditLimitReached) {
      return {
        status: 'credit_limit_reached',
        email: null,
        source: null,
        note: 'Hunter free-tier quota is exhausted.',
      };
    }
    if (hunter.email) {
      await prisma.buyer.update({
        where: { id: buyer.id },
        data: {
          email: hunter.email,
          verificationEvidence: {
            ...(typeof buyer.verificationEvidence === 'object' && buyer.verificationEvidence !== null
              ? (buyer.verificationEvidence as Record<string, unknown>)
              : {}),
            contactEnrichment: {
              method: 'hunter_domain_search',
              foundAt: new Date().toISOString(),
              domain,
            },
          },
        },
      });
      return { status: 'enriched', email: hunter.email, source: 'hunter' };
    }
    return {
      status: 'not_found',
      email: null,
      source: null,
      note: 'Neither the company website nor the contact-finder API returned an email.',
    };
  },
};
