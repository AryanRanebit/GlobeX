// ─────────────────────────────────────────────────────────────────────────────
// BuyerDiscoveryAgent
//
// Delegates to the ai-agent's grounded buyer discovery (Gemini + Google Search
// grounding). Returns only citation-backed companies; an empty list is an
// honest "nothing credible found", not an error.
// ─────────────────────────────────────────────────────────────────────────────

import type { IBuyerDiscoveryAgent, BuyerDiscoveryInput, BuyerDiscoveryOutput } from './AgentService';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8000/api/v1';

class BuyerDiscoveryAgentImpl implements IBuyerDiscoveryAgent {
  async discover(input: BuyerDiscoveryInput): Promise<BuyerDiscoveryOutput> {
    try {
      const response = await fetch(`${AGENT_SERVICE_URL}/agents/buyer-discovery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: input.product,
          target_countries: input.targetCountries,
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent service responded with status ${response.status}`);
      }

      let data;
      try {
        data = (await response.json()) as any;
      } catch (err) {
        throw new Error('BuyerDiscoveryAgent failed to parse response');
      }

      // The grounded agent returns only citation-backed companies and may
      // legitimately return an empty list when nothing credible is found.
      return {
        buyers: (Array.isArray(data.buyers) ? data.buyers : []).map((b: any) => ({
          companyName: b.companyName,
          country: b.country,
          countryCode: b.countryCode,
          industry: b.industry,
          website: b.website ?? null,
          email: b.email ?? null,
          estimatedLeadScore: typeof b.estimatedLeadScore === 'number' ? b.estimatedLeadScore : null,
          source: b.source ?? data.provider ?? 'gemini_google_search_grounding',
          sourceUrl: b.sourceUrl ?? null,
        })),
        searchedAt: data.searchedAt,
      };
    } catch (error: any) {
      if (error.message.includes('status') || error.message.includes('parse')) {
        throw error;
      }
      throw new Error(`BuyerDiscoveryAgent failed: ${error.message}`);
    }
  }
}

export const buyerDiscoveryAgent = new BuyerDiscoveryAgentImpl();
