import type { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

const AGENT_SERVICE_URL = env.AGENT_SERVICE_URL || 'http://localhost:8000/api/v1';

/**
 * Builds a handler that forwards the request body to the Python agent service
 * and relays its status and JSON payload as `{ data }`.
 */
const proxyToAgentService =
  (path: string, timeoutMs?: number) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await fetch(`${AGENT_SERVICE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        ...(timeoutMs ? { signal: AbortSignal.timeout(timeoutMs) } : {}),
      });
      const data = await response.json();
      res.status(response.status).json({ data });
    } catch (err) {
      next(err);
    }
  };

export const agentsController = {
  scoreLeadDirect: proxyToAgentService('/agents/lead-scoring'),
  generateOutreachDirect: proxyToAgentService('/agents/outreach'),
  assessComplianceDirect: proxyToAgentService('/agents/compliance'),
  lookupHsCodeDirect: proxyToAgentService('/tools/hs-code'),
  calculateDutyDirect: proxyToAgentService('/tools/duty-calculator'),
  generateInvoiceDirect: proxyToAgentService('/tools/invoice'),
  generatePackingListDirect: proxyToAgentService('/tools/packing-list'),
  understandProductDirect: proxyToAgentService('/agents/product-understanding', 20000),
};
