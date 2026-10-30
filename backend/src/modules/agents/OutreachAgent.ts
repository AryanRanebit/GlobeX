// ─────────────────────────────────────────────────────────────────────────────
// OutreachAgent
//
// Primary: Calls the Python GlobeX AI microservice (port 8000)
//   POST /api/v1/agents/outreach
//   → Gemini-powered personalised B2B email generation
//
// Fallback: Template-based generation (used when Python service is unavailable)
// ─────────────────────────────────────────────────────────────────────────────

import type { IOutreachAgent, OutreachInput, OutreachOutput } from './AgentService';

const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:8000/api/v1';
const LOCALIZE_TIMEOUT_MS = Number.parseInt(process.env.AGENT_TIMEOUT_MS || '45000', 10);

export interface LocalizeInput {
  subject?: string;
  content: string;
  targetLanguage: string;
  targetCountry?: string;
  userId: string;
}

export interface LocalizeOutput {
  subject?: string;
  content: string;
  model: string;
}

class OutreachAgentImpl implements IOutreachAgent {
  async generate(input: OutreachInput): Promise<OutreachOutput> {
    try {
      const response = await fetch(`${AGENT_SERVICE_URL}/agents/outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer: {
            companyName: input.buyer.companyName,
            country: input.buyer.country,
            industry: input.buyer.industry,
            importVolume: (input.buyer as any).importVolume ?? null,
          },
          sender: {
            name: input.sender.name,
            companyName: input.sender.companyName,
            industry: input.sender.industry,
          },
          tone: input.tone,
          language: input.language,
          custom_context: input.customContext ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Agent service responded with status ${response.status}`);
      }

      const data = (await response.json()) as any;
      return {
        subject: data.subject,
        content: data.content,
        model: data.model ?? 'gemini-ai',
        prompt: data.prompt,
      };
    } catch (error) {
      console.warn('OutreachAgent: Python service unavailable, falling back to template:', error);
      return this.generateTemplate(input);
    }
  }

  // ── Fallback: deterministic template ──────────────────────────────────────

  private generateTemplate(input: OutreachInput): OutreachOutput {
    const greeting =
      input.tone === 'formal' ? 'Dear Sir/Madam' : `Dear ${input.buyer.companyName} Procurement Team`;
    const sign = input.tone === 'friendly' ? 'Warm regards' : 'Best regards';

    const content = `${greeting},

I hope this message finds you well. My name is ${input.sender.name}, and I represent ${input.sender.companyName}, a ${input.sender.industry} company based in India.

We have been closely following ${input.buyer.companyName}'s impressive growth in the ${input.buyer.industry} sector in ${input.buyer.country}. I would welcome a conversation about whether there is a fit between our companies.

I would be glad to share our product specifications and the certifications we can provide for ${input.buyer.country}.

I would love the opportunity to share our product catalogue and discuss how we can support ${input.buyer.companyName}'s sourcing needs. Would you be open to a brief call this week or next?

${sign},
${input.sender.name}
${input.sender.companyName}, India
[Phone] | [Email]`;

    const prompt = `You are an expert international trade consultant.
Write a ${input.tone} B2B outreach email in ${input.language === 'en' ? 'English' : input.language} from:
- Sender: ${input.sender.name} at ${input.sender.companyName} (${input.sender.industry} industry, India)
- To: Procurement team at ${input.buyer.companyName} (${input.buyer.industry} in ${input.buyer.country})
${input.customContext ? `Additional context: ${input.customContext}` : ''}`;

    return {
      subject: `Export Partnership Inquiry — ${input.sender.companyName} × ${input.buyer.companyName}`,
      content,
      model: 'template-v1 (fallback)',
      prompt,
    };
  }


  // ── Localization: translate an existing draft via the chat agent ────────
  // Unlike generate(), there is NO template fallback here: a fabricated
  // "translation" would put wrong words in front of a real buyer, so an
  // unavailable agent surfaces as an honest error to the caller.
  async localize(input: LocalizeInput): Promise<LocalizeOutput> {
    const marketNote = input.targetCountry
      ? ` as business correspondence for a recipient in ${input.targetCountry}`
      : '';
    const message = `You are localizing a B2B export outreach email for an Indian exporter.
Translate the email between <<< and >>> from English into ${input.targetLanguage}${marketNote}.

Rules:
- Output ONLY the translated email. No commentary, no explanations, no markdown.
- Preserve the greeting, paragraph structure, line breaks, and sign-off.
- Keep company names, product names, certifications, numbers, and email addresses unchanged.
- Use a formal business register natural for the target market.
- Respond in exactly this format:
SUBJECT: <translated subject line>
BODY:
<translated email body>

<<<
SUBJECT: ${input.subject ?? 'Export Inquiry'}
${input.content}
>>>`;

    const response = await fetch(`${AGENT_SERVICE_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Id': input.userId },
      body: JSON.stringify({ session_id: null, message }),
      signal: AbortSignal.timeout(LOCALIZE_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Agent service responded with status ${response.status}`);
    }

    const data = (await response.json()) as any;
    const text = String(data?.response ?? '').trim();
    if (!text) {
      throw new Error('Agent service returned an empty localization');
    }

    const subjectMatch = text.match(/^SUBJECT:\s*(.+)$/m);
    const bodyMatch = text.match(/BODY:\s*\n([\s\S]+)$/);
    return {
      subject: subjectMatch ? subjectMatch[1].trim() : input.subject,
      content: bodyMatch ? bodyMatch[1].trim() : text,
      model: data.model ?? 'gemini-ai',
    };
  }
}

export const outreachAgent = new OutreachAgentImpl();
