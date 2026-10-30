/**
 * Deterministic "find buyers" handler for the Copilot.
 *
 * The LLM agent has no buyer-search tool, so buyer-finding questions used to
 * fall through to a generic (sometimes empty) LLM answer. This module
 * intercepts those queries BEFORE any LLM call: it parses product + country,
 * looks up the user's saved buyer pipeline (Prisma, same DB as Buyer
 * Discovery), and composes an honest answer. No Gemini spend.
 *
 * Honesty rules (match the app's fallback patterns):
 * - Only buyers actually in the pipeline are listed - never fabricated.
 * - If the country has no pipeline buyers, say so and offer the live
 *   (Gemini-backed) Buyer Discovery as an explicit opt-in next step.
 * - If the country has buyers but none tagged for the product, list the
 *   country buyers and say plainly that none are product-specific.
 */

import { prisma } from '../../config/database';
import { buyersService } from '../buyers/buyers.service';

export interface ParsedBuyerQuery {
  product?: string;
  /** Canonical country name as we present it (e.g. "United States"). */
  country?: string;
}

/** Canonical country name -> aliases. Short aliases (<=3 chars) are matched
 *  case-sensitively in their uppercase form to avoid "us" the pronoun. */
const COUNTRY_ALIASES: Record<string, string[]> = {
  'United States': ['united states', 'united states of america', 'america', 'USA', 'US', 'U.S.', 'U.S.A.'],
  'Germany': ['germany', 'german'],
  'United Arab Emirates': ['united arab emirates', 'uae', 'UAE', 'U.A.E.', 'emirates'],
  'Saudi Arabia': ['saudi arabia', 'saudi', 'ksa', 'KSA'],
  'United Kingdom': ['united kingdom', 'britain', 'great britain', 'england', 'UK', 'U.K.'],
  'Netherlands': ['netherlands', 'holland'],
  'France': ['france', 'french'],
  'Spain': ['spain', 'spanish'],
  'Italy': ['italy', 'italian'],
  'Japan': ['japan', 'japanese'],
  'China': ['china', 'chinese'],
  'India': ['india', 'indian'],
  'Australia': ['australia', 'australian'],
  'Canada': ['canada', 'canadian'],
  'Brazil': ['brazil', 'brazilian'],
  'Mexico': ['mexico', 'mexican'],
  'Singapore': ['singapore'],
  'Malaysia': ['malaysia'],
  'Indonesia': ['indonesia'],
  'Vietnam': ['vietnam'],
  'Thailand': ['thailand'],
  'South Korea': ['south korea', 'korea'],
  'Turkey': ['turkey', 'turkiye'],
  'Egypt': ['egypt'],
  'South Africa': ['south africa'],
  'Nigeria': ['nigeria'],
  'Kenya': ['kenya'],
  'Bangladesh': ['bangladesh'],
  'Pakistan': ['pakistan'],
  'Sri Lanka': ['sri lanka'],
  'Nepal': ['nepal'],
  'Belgium': ['belgium'],
  'Poland': ['poland'],
  'Switzerland': ['switzerland'],
  'Austria': ['austria'],
  'Sweden': ['sweden'],
  'Norway': ['norway'],
  'Denmark': ['denmark'],
  'Ireland': ['ireland'],
  'Portugal': ['portugal'],
  'Greece': ['greece'],
  'Russia': ['russia', 'russian'],
  'Qatar': ['qatar'],
  'Oman': ['oman'],
  'Kuwait': ['kuwait'],
  'Bahrain': ['bahrain'],
  'Jordan': ['jordan'],
  'Israel': ['israel'],
  'New Zealand': ['new zealand'],
  'Argentina': ['argentina'],
  'Chile': ['chile'],
  'Colombia': ['colombia'],
  'Peru': ['peru'],
  'Morocco': ['morocco'],
  'Philippines': ['philippines'],
};

/** Product word -> HS hint for the reply text, plus keywords used for
 *  lenient relevance matching against industry/tags/company name. */
const PRODUCT_HINTS: Record<string, { hs?: string; keywords: string[] }> = {
  cotton: { hs: 'HS 52', keywords: ['cotton', 'textile', 'garment', 'apparel', 'fabric', 'yarn', 'denim', 'clothing', 'fashion'] },
  textiles: { hs: 'HS 50-63', keywords: ['textile', 'garment', 'apparel', 'fabric', 'yarn', 'clothing', 'fashion'] },
  apparel: { hs: 'HS 61/62', keywords: ['apparel', 'garment', 'clothing', 'fashion', 'textile', 'fabric'] },
  garments: { hs: 'HS 61/62', keywords: ['garment', 'apparel', 'clothing', 'fashion', 'textile'] },
  cardamom: { hs: 'HS 0908', keywords: ['cardamom', 'spice', 'food', 'seasoning', 'herb'] },
  turmeric: { hs: 'HS 091030', keywords: ['turmeric', 'spice', 'food', 'seasoning', 'herb'] },
  spices: { hs: 'HS 09', keywords: ['spice', 'food', 'seasoning', 'herb', 'masala'] },
  rice: { hs: 'HS 1006', keywords: ['rice', 'grain', 'food', 'basmati'] },
  tea: { hs: 'HS 0902', keywords: ['tea', 'beverage', 'drink'] },
  coffee: { hs: 'HS 0901', keywords: ['coffee', 'beverage', 'drink'] },
  sugar: { hs: 'HS 1701', keywords: ['sugar', 'sweetener', 'food'] },
  wheat: { hs: 'HS 1001', keywords: ['wheat', 'grain', 'flour', 'food'] },
  leather: { hs: 'HS 41/42', keywords: ['leather', 'footwear', 'shoes', 'bags', 'hide'] },
  footwear: { hs: 'HS 64', keywords: ['footwear', 'shoes', 'leather'] },
  jewellery: { hs: 'HS 7113', keywords: ['jewel', 'gold', 'diamond', 'gems', 'ornament'] },
  jewelry: { hs: 'HS 7113', keywords: ['jewel', 'gold', 'diamond', 'gems', 'ornament'] },
  pharmaceuticals: { hs: 'HS 30', keywords: ['pharma', 'medicine', 'drug', 'healthcare', 'nutraceutical', 'supplement', 'herbal'] },
  pharma: { hs: 'HS 30', keywords: ['pharma', 'medicine', 'drug', 'healthcare', 'supplement'] },
  handicrafts: { hs: 'HS 44/69', keywords: ['handicraft', 'decor', 'art', 'craft', 'pottery', 'wood'] },
  furniture: { hs: 'HS 94', keywords: ['furniture', 'furnishing', 'wood', 'decor'] },
  electronics: { hs: 'HS 85', keywords: ['electronic', 'electrical', 'component', 'device', 'appliance'] },
  chemicals: { hs: 'HS 28-38', keywords: ['chemical', 'dye', 'pigment', 'solvent'] },
  seafood: { hs: 'HS 03', keywords: ['seafood', 'fish', 'shrimp', 'prawn', 'marine'] },
  fruits: { hs: 'HS 08', keywords: ['fruit', 'mango', 'banana', 'fresh produce', 'food'] },
  vegetables: { hs: 'HS 07', keywords: ['vegetable', 'onion', 'potato', 'fresh produce', 'food'] },
};

const BUYER_INTENT_RE = /\b(find|search(?:ing)?|get|show|list|source|need|want|looking for|give me|suggest)\b[\s\S]{0,50}\b(buyers?|importers?|distributors?|wholesalers?|buying agents?)\b/i;
const BUYER_NOUN_FIRST_RE = /\b(buyers?|importers?|distributors?|wholesalers?)\s+(for|in)\b/i;
const EXPLICIT_DISCOVERY_CMD_RE = /\b(run|start|trigger|do)\b[\s\S]{0,24}\b(buyer\s+)?discovery\b/i;

/** True when the message is asking to find/source buyers (not, say, "how do I
 *  verify this buyer's GST number"). */
export function detectFindBuyers(message: string): boolean {
  return BUYER_INTENT_RE.test(message) || BUYER_NOUN_FIRST_RE.test(message) || EXPLICIT_DISCOVERY_CMD_RE.test(message);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findCountry(message: string): string | undefined {
  for (const [canonical, aliases] of Object.entries(COUNTRY_ALIASES)) {
    for (const alias of aliases) {
      const bare = alias.replace(/\./g, '');
      const re = new RegExp(`\\b${escapeRegExp(alias)}\\b`, bare.length <= 3 ? '' : 'i');
      if (re.test(message)) return canonical;
    }
  }
  return undefined;
}

/** Canonicalize a stored buyer.country value (pipeline mixes "USA" and
 *  "United States") so both match the same parsed country. */
function canonicalCountry(stored: string): string {
  const found = findCountry(stored);
  return found ?? stored;
}

function findProduct(message: string): string | undefined {
  // "buyers for cotton in Germany" / "importers of turmeric" / "buyers for HS 52"
  const m =
    message.match(/\b(?:buyers?|importers?|distributors?|wholesalers?)\s+(?:for|of)\s+(.+?)(?:\s+in\s+[\p{L} .]+)?\s*[?.!]*$/iu) ||
    message.match(/\b(?:for|of)\s+([a-z0-9][a-z0-9 ,/&-]{1,40}?)(?:\s+in\s+[\p{L} .]+)\s*[?.!]*$/iu);
  if (!m) return undefined;
  let product = m[1].trim().toLowerCase();
  product = product.replace(/^(some|any|the|a|an|good|verified|real|potential|new)\s+/, '').trim();
  // Drop trailing filler words that are not part of the product name
  product = product.replace(/\s+(please|now|today|asap)$/i, '').trim();
  return product || undefined;
}

export function parseBuyerQuery(message: string): ParsedBuyerQuery {
  return { product: findProduct(message), country: findCountry(message) };
}

function productKeywords(product: string): { hs?: string; keywords: string[] } {
  for (const [name, hint] of Object.entries(PRODUCT_HINTS)) {
    if (product.includes(name)) return hint;
  }
  // Unknown product: match on the product words themselves
  return { keywords: product.split(/[\s,/]+/).filter((w) => w.length > 2) };
}

function buyerMatchesProduct(buyer: { companyName: string; industry: string; tags: string[] }, keywords: string[]): boolean {
  const hay = `${buyer.companyName} ${buyer.industry} ${(buyer.tags ?? []).join(' ')}`.toLowerCase();
  return keywords.some((k) => hay.includes(k));
}

function buyerLine(b: { companyName: string; industry: string; country: string; leadScore: number }): string {
  return `- **${b.companyName}** - ${b.industry}, ${b.country} (lead score ${b.leadScore})`;
}

function discoveryLink(country?: string, product?: string): { label: string; url: string } {
  const q = [product, country].filter(Boolean).join(' ');
  const url = `?search=${encodeURIComponent(q)}&tab=buyers`;
  return { label: 'Open Buyer Discovery', url };
}

// ── Pending live-discovery offers (per chat session) ───────────────────────
// The deterministic intercept bypasses the Python agent's session memory, so
// the "want me to run a live discovery?" offer is tracked here instead.
const PENDING_TTL_MS = 10 * 60 * 1000;

export interface PendingDiscovery {
  product?: string;
  country?: string;
  expiresAt: number;
}

const pendingDiscovery = new Map<string, PendingDiscovery>();

/** Test hook: wipe all pending offers. */
export function resetPendingDiscovery(): void {
  pendingDiscovery.clear();
}

function setPending(sessionId: string, offer: { product?: string; country?: string }): void {
  pendingDiscovery.set(sessionId, { ...offer, expiresAt: Date.now() + PENDING_TTL_MS });
}

function peekPending(sessionId: string): PendingDiscovery | null {
  const p = pendingDiscovery.get(sessionId);
  if (!p) return null;
  if (Date.now() > p.expiresAt) {
    pendingDiscovery.delete(sessionId);
    return null;
  }
  return p;
}

function clearPending(sessionId: string): void {
  pendingDiscovery.delete(sessionId);
}

/** Liberal yes-detection (English + Hinglish), only ever applied when a
 *  discovery offer is actually pending for the session. */
const CONFIRM_RE = /^\s*(yes|yeah|yep|yup|ok|okay|sure|haan+|han+|ha\b|go ahead|go for it|do it|karo|kar do|kardo|chalo|chal|theek hai|thik hai|bilkul|zaroor+z|zarur|please do|go)[.!\s]*$/i;
const DENY_RE = /^\s*(no|nope|nah|nahi+|nhi|not now|later|cancel|ruk|ruk ja|rehne do|bas)[.!\s]*$/i;

/** Explicit "spend now" phrasing. A plain "find buyers" question must NEVER
 *  match this - the offer-then-confirm flow covers those. */
const EXPLICIT_LIVE_RE = /\blive\b|\bdiscovery\b|\brun\b[\s\S]{0,24}\b(discovery|search)\b|\bgrounded\s+search\b/i;

function hsCodeFor(product?: string): string | undefined {
  if (!product) return undefined;
  const hint = productKeywords(product).hs;
  const m = hint?.match(/^HS (\d+)$/);
  return m ? m[1] : undefined;
}

async function runLiveDiscovery(
  userId: string,
  product: string | undefined,
  country: string | undefined,
): Promise<DeterministicChatAnswer> {
  const link = discoveryLink(country, product);
  const productLabel = product ? `**${product}**` : 'your product';
  const countryLabel = country ? ` in **${country}**` : '';

  if (!product) {
    // The discovery service needs a product; ask instead of guessing.
    return {
      session_id: '',
      response: `What product should I search for${countryLabel}? For example: "find new buyers for cotton${country ? ` in ${country.toLowerCase()}` : ''} live".`,
      intent: 'find_buyers',
      tools_used: [],
      rag_used: false,
      tool_results: { awaiting: 'product' },
    };
  }

  let result: Awaited<ReturnType<typeof buyersService.discover>>;
  try {
    // Exactly one grounded search per confirmation - no retries.
    result = await buyersService.discover(userId, product, country ? [country] : [], {
      hsCode: hsCodeFor(product),
    });
  } catch (err) {
    return {
      session_id: '',
      response:
        `The live Buyer Discovery search for ${productLabel}${countryLabel} failed just now (the AI provider returned an error). ` +
        `Nothing was added to your pipeline and no retry was run. You can try again from the Buyer Discovery page.

` +
        `[${link.label}](${link.url})`,
      intent: 'find_buyers',
      tools_used: ['live_buyer_discovery'],
      rag_used: false,
      tool_results: { error: err instanceof Error ? err.message : 'discovery failed' },
    };
  }

  const found = result.buyers ?? [];
  if (found.length === 0) {
    return {
      session_id: '',
      response:
        `I ran one grounded AI search for ${productLabel}${countryLabel} and it found no verifiable buyers - nothing was added to your pipeline. ` +
        `I'd rather show you nothing than invent companies. You can try a different product name or country.`,
      intent: 'find_buyers',
      tools_used: ['live_buyer_discovery'],
      rag_used: false,
      tool_results: { discovered: 0, provider: result.provider },
    };
  }

  const shown = found.slice(0, 5);
  const lines = shown.map((b) => `- **${b.companyName}** - ${b.industry}, ${b.country} (lead score ${b.leadScore})`);
  return {
    session_id: '',
    response:
      `Done - one grounded AI search for ${productLabel}${countryLabel} found ${found.length} buyer${found.length === 1 ? '' : 's'}, now saved in your pipeline with source citations:

` +
      lines.join('\n') +
      (found.length > shown.length ? `\n- …and ${found.length - shown.length} more` : '') +
      `\n\n[${link.label}](${link.url})`,
    intent: 'find_buyers',
    tools_used: ['live_buyer_discovery'],
    rag_used: false,
    tool_results: { discovered: found.length, provider: result.provider, buyers: found.map((b) => b.companyName) },
  };
}

interface BuyerRow {
  id: string; companyName: string; country: string; industry: string;
  tags: string[]; leadScore: number;
}

export interface DeterministicChatAnswer {
  session_id: string;
  response: string;
  intent: string;
  tools_used: string[];
  rag_used: boolean;
  tool_results: Record<string, unknown>;
}

/**
 * If `message` is a buyer-finding query, answer it from the pipeline and
 * return the ChatResponse. Returns null when the message is not a buyer
 * query, so the caller can continue to the LLM agent.
 */
export async function tryFindBuyersAnswer(message: string, sessionId: string, userId: string): Promise<DeterministicChatAnswer | null> {
  // 1. A pending live-discovery offer turns a bare "yes" into one grounded
  //    search, and a bare "no" into a clean no-spend exit. Anything else is
  //    treated as a new message (the offer stays valid until it expires).
  const pending = peekPending(sessionId);
  if (pending) {
    if (CONFIRM_RE.test(message)) {
      clearPending(sessionId);
      const ans = await runLiveDiscovery(userId, pending.product, pending.country);
      ans.session_id = sessionId;
      return ans;
    }
    if (DENY_RE.test(message)) {
      clearPending(sessionId);
      return {
        session_id: sessionId,
        response: 'No problem - no AI search was run and nothing was spent. Your pipeline is unchanged.',
        intent: 'find_buyers',
        tools_used: [],
        rag_used: false,
        tool_results: { declined: true },
      };
    }
  }

  if (!detectFindBuyers(message)) return null;

  const { product, country } = parseBuyerQuery(message);

  // 2. Explicit live commands ("find new buyers ... live", "run discovery")
  //    skip the pipeline answer and go straight to one grounded search. A
  //    plain "find buyers" question never lands here.
  if (EXPLICIT_LIVE_RE.test(message)) {
    const ans = await runLiveDiscovery(userId, product, country);
    ans.session_id = sessionId;
    return ans;
  }
  const buyers = (await prisma.buyer.findMany({
    select: { id: true, companyName: true, country: true, industry: true, tags: true, leadScore: true },
    orderBy: { leadScore: 'desc' },
    take: 500,
  })) as BuyerRow[];

  const countriesInPipeline = [...new Set(buyers.map((b) => b.country))].sort();
  const countryBuyers = country
    ? buyers.filter((b) => canonicalCountry(b.country) === country)
    : buyers;
  const hint = product ? productKeywords(product) : undefined;
  const productMatches = hint && product
    ? countryBuyers.filter((b) => buyerMatchesProduct(b, hint.keywords))
    : [];

  const link = discoveryLink(country, product);
  const productLabel = product ? `**${product}**${hint?.hs ? ` (${hint.hs})` : ''}` : '';
  let response: string;

  if (country && countryBuyers.length === 0) {
    // (b) Empty case: honest "not in pipeline" + offer the live discovery
    const coverage = countriesInPipeline.length
      ? `Your saved buyers currently cover ${countriesInPipeline.join(', ')}.`
      : 'Your buyer pipeline is empty so far.';
    response =
      `There are no buyers in **${country}** in your pipeline yet. ${coverage}\n\n` +
      (product
        ? `Want to run a live Buyer Discovery for ${productLabel} in **${country}**? It runs one grounded AI search and adds verified importers to your pipeline.\n\n`
        : `Want to run a live Buyer Discovery for **${country}**? It runs one grounded AI search and adds verified importers to your pipeline.\n\n`) +
      `[${link.label}](${link.url})`;
    setPending(sessionId, { product, country });
  } else if (product && productMatches.length > 0) {
    const shown = productMatches.slice(0, 5);
    response =
      `Here ${shown.length === 1 ? 'is the buyer' : `are ${productMatches.length === 1 ? '' : 'the '}buyers`} in your pipeline matching ${productLabel}${country ? ` in **${country}**` : ''}:\n\n` +
      shown.map(buyerLine).join('\n') +
      (productMatches.length > shown.length ? `\n- …and ${productMatches.length - shown.length} more` : '') +
      `\n\n[${link.label}](${link.url})`;
  } else if (country && countryBuyers.length > 0) {
    // (a) Country has buyers but none tagged for the product: list them and say so
    const shown = countryBuyers.slice(0, 5);
    const note = product
      ? `None of them are tagged for ${productLabel} specifically, but here ${shown.length === 1 && countryBuyers.length === 1 ? 'is the buyer' : `are the ${countryBuyers.length} buyers`} in your **${country}** pipeline:`
      : `Here ${countryBuyers.length === 1 ? 'is the buyer' : `are the ${countryBuyers.length} buyers`} in your **${country}** pipeline:`;
    response =
      `${note}\n\n` +
      shown.map(buyerLine).join('\n') +
      (countryBuyers.length > shown.length ? `\n- …and ${countryBuyers.length - shown.length} more` : '') +
      (product
        ? `\n\nFor verified ${product} importers in ${country}, you can run a live Buyer Discovery (one grounded AI search).\n\n[${link.label}](${link.url})`
        : `\n\n[${link.label}](${link.url})`);
    if (product) setPending(sessionId, { product, country });
  } else {
    // No country parsed and nothing product-matched in the whole pipeline
    const coverage = countriesInPipeline.length
      ? `Your saved buyers currently cover ${countriesInPipeline.join(', ')}.`
      : 'Your buyer pipeline is empty so far.';
    response =
      `I couldn't find buyers matching ${productLabel || 'that request'} in your pipeline. ${coverage}\n\n` +
      `You can run a live Buyer Discovery (one grounded AI search) to add verified importers for a specific product and country.\n\n` +
      `[${link.label}](${link.url})`;
    setPending(sessionId, { product, country });
  }

  return {
    session_id: sessionId,
    response,
    intent: 'find_buyers',
    tools_used: ['pipeline_buyer_lookup'],
    rag_used: false,
    tool_results: {
      matched: product ? productMatches.length : countryBuyers.length,
      country_matched: countryBuyers.length,
      parsed: { product: product ?? null, country: country ?? null },
    },
  };
}
