import { Router } from 'express';
import { tradeController } from './trade.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { Role } from '../../types/prisma';

const router = Router();

// Public endpoint for trade market data with Comtrade attribution
// (also accessible without auth so buyers, landing, or unauthenticated research can display real data)
router.get('/markets', tradeController.getMarkets);

// Admin-only refresh: pulls from the UN Comtrade API and burns daily quota,
// so it requires a signed-in ADMIN. (The seed creates admin@globex.ai.)
router.post('/refresh', authenticate, authorize(Role.ADMIN), tradeController.refresh);

// Admin-only batch seed of mirror (destination-reported import) data.
router.post('/seed-mirror', authenticate, authorize(Role.ADMIN), tradeController.seedMirror);

export { router as tradeRoutes };
