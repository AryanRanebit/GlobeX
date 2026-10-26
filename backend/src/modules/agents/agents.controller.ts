import type { Request, Response, NextFunction } from 'express';
import { env } from '../../config/env';

const AGENT_SERVICE_URL = env.AGENT_SERVICE_URL || 'http://localhost:8000/api/v1';

export const agentsController = {
  scoreLeadDirect: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await fetch(`${AGENT_SERVICE_URL}/agents/lead-scoring`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(response.status).json({ data });
    } catch (err) {
      next(err);
    }
  },

  generateOutreachDirect: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await fetch(`${AGENT_SERVICE_URL}/agents/outreach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(response.status).json({ data });
    } catch (err) {
      next(err);
    }
  },

  assessComplianceDirect: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await fetch(`${AGENT_SERVICE_URL}/agents/compliance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(response.status).json({ data });
    } catch (err) {
      next(err);
    }
  },

  lookupHsCodeDirect: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await fetch(`${AGENT_SERVICE_URL}/tools/hs-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(response.status).json({ data });
    } catch (err) {
      next(err);
    }
  },

  calculateDutyDirect: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await fetch(`${AGENT_SERVICE_URL}/tools/duty-calculator`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(response.status).json({ data });
    } catch (err) {
      next(err);
    }
  },

  generateInvoiceDirect: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await fetch(`${AGENT_SERVICE_URL}/tools/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(response.status).json({ data });
    } catch (err) {
      next(err);
    }
  },

  generatePackingListDirect: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await fetch(`${AGENT_SERVICE_URL}/tools/packing-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      res.status(response.status).json({ data });
    } catch (err) {
      next(err);
    }
  },

  understandProductDirect: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const response = await fetch(`${AGENT_SERVICE_URL}/agents/product-understanding`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
        signal: AbortSignal.timeout(20000),
      });
      const data = await response.json();
      res.status(response.status).json({ data });
    } catch (err) {
      next(err);
    }
  },
};

