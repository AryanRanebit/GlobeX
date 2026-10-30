import { Router } from 'express';
import { tariffController } from './tariff.controller';

const router = Router();

// Public (same policy as /api/trade/markets): free WITS data, no secrets.
router.get('/', tariffController.getTariff);

export { router as tariffRoutes };
