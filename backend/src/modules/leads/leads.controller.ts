import { Request, Response, NextFunction } from 'express';
import { LeadStatus } from '../../types/prisma';
import { leadsService } from './leads.service';
import { leadEvidenceService } from './leadEvidence.service';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';

export const leadsController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try { sendCreated(res, await leadsService.create(req.user!.userId, req.body), 'Lead created'); }
    catch (err) { next(err); }
  },
  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as LeadStatus | undefined;
      sendSuccess(res, await leadsService.getAll(req.user!.userId, status), 'Leads fetched');
    } catch (err) { next(err); }
  },
  update: async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await leadsService.update(req.params.id, req.user!.userId, req.body), 'Lead updated'); }
    catch (err) { next(err); }
  },
  delete: async (req: Request, res: Response, next: NextFunction) => {
    try { await leadsService.delete(req.params.id, req.user!.userId); sendSuccess(res, null, 'Lead deleted'); }
    catch (err) { next(err); }
  },
  getStats: async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await leadsService.getStats(req.user!.userId), 'Lead stats fetched'); }
    catch (err) { next(err); }
  },

  addEvidence: async (req: Request, res: Response, next: NextFunction) => {
    try { sendCreated(res, await leadEvidenceService.add(req.user!.userId, req.params.id, req.body), 'Evidence added'); }
    catch (err) { next(err); }
  },
  listEvidence: async (req: Request, res: Response, next: NextFunction) => {
    try { sendSuccess(res, await leadEvidenceService.list(req.user!.userId, req.params.id), 'Evidence fetched'); }
    catch (err) { next(err); }
  },
  removeEvidence: async (req: Request, res: Response, next: NextFunction) => {
    try { await leadEvidenceService.remove(req.user!.userId, req.params.id, req.params.evidenceId); sendSuccess(res, null, 'Evidence removed'); }
    catch (err) { next(err); }
  },
};
