// ─────────────────────────────────────────────────────────────────────────────
// BuyerDiscoveryAgent
//
// Plug in: LinkedIn scraper, Apollo.io API, Clearbit, or custom web-search LLM agent
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

      return {
        buyers: data.buyers.map((b: any) => ({
          companyName: b.companyName,
          country: b.country,
          countryCode: b.countryCode,
          industry: b.industry,
          website: b.website,
          email: b.email,
          estimatedLeadScore: b.estimatedLeadScore,
          source: b.source,
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
