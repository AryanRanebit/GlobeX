import { Router } from 'express';
import { tradeController } from './trade.controller';

const router = Router();

// Public endpoint for trade market data with Comtrade attribution
// (also accessible without auth so buyers, landing, or unauthenticated research can display real data)
router.get('/markets', tradeController.getMarkets);

// Admin / background refresh
router.post('/refresh', tradeController.refresh);

export { router as tradeRoutes };
