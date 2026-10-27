// ─────────────────────────────────────────────────────────────────────────────
// MarketResearchAgent
//
// Current state: Returns realistic mock data
// Plug in: OpenAI GPT-4o, Gemini 1.5 Pro, Claude 3.5, or CrewAI workflow
//
// Integration example (OpenAI):
//   import OpenAI from 'openai';
//   const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
//   const resp = await client.chat.completions.create({
//     model: 'gpt-4o',
//     messages: [{ role: 'user', content: buildPrompt(input) }],
//     response_format: { type: 'json_object' },
//   });
//   return JSON.parse(resp.choices[0].message.content!);
// ─────────────────────────────────────────────────────────────────────────────

import type { IMarketResearchAgent, MarketResearchInput, MarketResearchOutput } from './AgentService';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8000/api/v1';

class MarketResearchAgentImpl implements IMarketResearchAgent {
  async analyze(input: MarketResearchInput): Promise<MarketResearchOutput> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(`${AGENT_SERVICE_URL}/agents/market-research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: input.product,
          target_regions: input.targetRegions || null,
          user_industry: input.userIndustry || null,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Agent service responded with status ${response.status}`);
      }

      let data: any;
      try {
        data = await response.json();
      } catch (err) {
        throw new Error('MarketResearchAgent failed to parse response JSON');
      }

      if (!data || !Array.isArray(data.recommendedCountries)) {
        throw new Error('MarketResearchAgent returned malformed data: recommendedCountries is missing');
      }

      return {
        product: data.product || input.product,
        category: data.category,
        candidateHsCodes: data.candidateHsCodes || [],
        analyzedAt: data.analyzedAt || new Date().toISOString(),
        summary: data.summary || 'Market research completed.',
        dataSourceMode: data.dataSourceMode || 'ai_qualitative_estimate',
        disclaimer: data.disclaimer,
        recommendedCountries: data.recommendedCountries.map((c: any) => ({
          country: c.country,
          countryCode: (c.countryCode || 'XX').slice(0, 2).toUpperCase(),
          demandScore: typeof c.demandScore === 'number' ? Math.max(0, Math.min(100, c.demandScore)) : 70,
          growthRate: c.growthRate || 'N/A',
          competition: ['Low', 'Medium', 'High'].includes(c.competition) ? c.competition : 'Medium',
          marketSize: c.marketSize || 'N/A',
          trend: c.trend || 'Stable',
          insights: c.insights || '',
        })),
      };
    } catch (error: any) {
      if (error.name === 'AbortError') {
        throw new Error('MarketResearchAgent request timed out after 30 seconds');
      }
      if (error.message.includes('status') || error.message.includes('malformed') || error.message.includes('parse')) {
        throw error;
      }
      throw new Error(`MarketResearchAgent failed: ${error.message}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  private toCode(country: string): string {
    const map: Record<string, string> = {
      Germany: 'DE', 'United States': 'US', 'United Arab Emirates': 'AE',
      'United Kingdom': 'GB', Australia: 'AU', Japan: 'JP', Canada: 'CA', Netherlands: 'NL',
    };
    return map[country] ?? 'XX';
  }
}

export const marketResearchAgent = new MarketResearchAgentImpl();
