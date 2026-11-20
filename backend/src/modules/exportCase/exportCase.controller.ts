import { Request, Response, NextFunction } from 'express';
import { exportCaseService } from './exportCase.service';
import { createExportCaseSchema, updateExportCaseSchema } from './exportCase.schema';
import { sendSuccess, sendError } from '../../utils/apiResponse';

export const exportCaseController = {
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const { cases, total } = await exportCaseService.listForUser(req.user!.userId, limit, offset);
      sendSuccess(res, cases, 'Export cases retrieved', 200, {
        pagination: { limit, offset, total },
      });
    } catch (err) {
      next(err);
    }
  },

  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const exportCase = await exportCaseService.getForUser(req.user!.userId, req.params.id);
      if (!exportCase) return sendError(res, 'Export case not found', 404);
      return sendSuccess(res, exportCase, 'Export case retrieved');
    } catch (err) {
      next(err);
    }
  },

  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createExportCaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0]?.message || 'Invalid export case', 400);
      }
      const created = await exportCaseService.createForUser(req.user!.userId, parsed.data);
      return sendSuccess(res, created, 'Export case created', 201);
    } catch (err) {
      next(err);
    }
  },

  update: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = updateExportCaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendError(res, parsed.error.errors[0]?.message || 'Invalid update', 400);
      }
      const updated = await exportCaseService.updateForUser(req.user!.userId, req.params.id, parsed.data);
      if (!updated) return sendError(res, 'Export case not found', 404);
      return sendSuccess(res, updated, 'Export case updated');
    } catch (err) {
      next(err);
    }
  },

  remove: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const removed = await exportCaseService.removeForUser(req.user!.userId, req.params.id);
      if (!removed) return sendError(res, 'Export case not found', 404);
      return sendSuccess(res, null, 'Export case deleted');
    } catch (err) {
      next(err);
    }
  },
};
