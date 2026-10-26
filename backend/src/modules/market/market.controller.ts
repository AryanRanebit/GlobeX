import { Request, Response, NextFunction } from 'express';
import { marketService } from './market.service';
import { researchJobService } from './researchJob.service';
import { sendSuccess } from '../../utils/apiResponse';

/**
 * @swagger
 * tags:
 *   name: Market Intelligence
 *   description: AI-powered export opportunity analysis and resilient background jobs
 */
export const marketController = {
  /**
   * @swagger
   * /market/analyze:
   *   post:
   *     summary: Create and enqueue an export market research job
   *     tags: [Market Intelligence]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [product]
   *             properties:
   *               product: { type: string, example: "Organic Honey" }
   *               productId: { type: string, format: uuid }
   *               targetRegions: { type: array, items: { type: string } }
   *               idempotencyKey: { type: string }
   *     responses:
   *       200:
   *         description: Prompt response returning the persistent job ID and queued status
   */
  analyze: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idempotencyKey =
        (req.headers['x-idempotency-key'] as string) ||
        (req.headers['idempotency-key'] as string) ||
        req.body.idempotencyKey;

      const maxRetries = req.body.maxRetries ? parseInt(req.body.maxRetries, 10) : undefined;
      const job = await marketService.analyze(req.user!.userId, req.body, { idempotencyKey, maxRetries });

      sendSuccess(
        res,
        {
          jobId: job.id,
          id: job.id,
          status: job.status,
          createdAt: job.createdAt,
        },
        'Market analysis job started'
      );
    } catch (err) {
      next(err);
    }
  },

  /**
   * @swagger
   * /market/analyze/status/{jobId}:
   *   get:
   *     summary: Retrieve status and result of a market research job
   *     tags: [Market Intelligence]
   *     parameters:
   *       - in: path
   *         name: jobId
   *         required: true
   *         schema: { type: string }
   *     responses:
   *       200:
   *         description: Current job status (queued, running, succeeded, failed) and result/error
   *       403:
   *         description: Forbidden if accessing another user's job
   *       404:
   *         description: Job not found
   */
  getAnalyzeStatus: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params;
      const job = await marketService.getJobStatus(jobId, req.user!.userId);

      if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
      }

      res.json({ success: true, data: job });
    } catch (err: any) {
      if (err.name === 'JobAuthorizationError') {
        return res.status(403).json({ success: false, message: 'Unauthorized to view this job' });
      }
      next(err);
    }
  },

  /**
   * @swagger
   * /market/jobs:
   *   get:
   *     summary: List research jobs for authenticated user
   *     tags: [Market Intelligence]
   */
  listJobs: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const jobs = await researchJobService.getUserJobs(req.user!.userId, limit, offset);
      sendSuccess(res, jobs, 'Research jobs retrieved successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * @swagger
   * /market/opportunities:
   *   get:
   *     summary: Get persisted market opportunities for the authenticated user
   *     tags: [Market Intelligence]
   */
  getOpportunities: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const opportunities = await marketService.getOpportunities(req.user!.userId);
      sendSuccess(res, opportunities, 'Opportunities fetched');
    } catch (err) {
      next(err);
    }
  },
};
