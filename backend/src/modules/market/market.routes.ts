import { Router } from 'express';
import { marketController } from './market.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { analyzeMarketSchema } from './market.schema';

const router = Router();
router.use(authenticate);

// Market analysis job creation & status (preserving existing paths)
router.post('/analyze', validate(analyzeMarketSchema), marketController.analyze);
router.get('/analyze/status/:jobId', marketController.getAnalyzeStatus);

// Explicit job routes for Phase 6
router.post('/jobs', validate(analyzeMarketSchema), marketController.analyze);
router.get('/jobs/:jobId', marketController.getAnalyzeStatus);
router.get('/jobs', marketController.listJobs);

// Opportunities retrieval
router.get('/opportunities', marketController.getOpportunities);

export { router as marketRoutes };
