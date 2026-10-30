import { Request, Response, NextFunction } from 'express';
import { historyService } from './history.service';
import { sendSuccess, sendError } from '../../utils/apiResponse';

/**
 * @swagger
 * tags:
 *   name: Analysis History
 *   description: Saved snapshots of a user's market searches and full analyses
 */
export const historyController = {
  /**
   * @swagger
   * /history:
   *   get:
   *     summary: List the authenticated user's saved analyses (newest first)
   *     tags: [Analysis History]
   *     parameters:
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 50, maximum: 100 }
   *       - in: query
   *         name: offset
   *         schema: { type: integer, default: 0 }
   *     responses:
   *       200:
   *         description: History entries without result payloads
   */
  list: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const { entries, total, stats } = await historyService.listForUser(req.user!.userId, limit, offset);
      sendSuccess(res, entries, 'Analysis history retrieved', 200, {
        pagination: { limit, offset, total },
        stats,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * @swagger
   * /history/{id}:
   *   get:
   *     summary: Get one saved analysis including its stored result snapshot
   *     tags: [Analysis History]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: The stored entry; reopening it costs no external API calls
   *       404:
   *         description: Entry not found (or not owned by the requester)
   */
  getById: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entry = await historyService.getForUser(req.user!.userId, req.params.id);
      if (!entry) {
        return sendError(res, 'History entry not found', 404);
      }
      return sendSuccess(res, entry, 'History entry retrieved');
    } catch (err) {
      next(err);
    }
  },
};
