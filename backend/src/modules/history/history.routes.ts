import { Router } from 'express';
import { historyController } from './history.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// History is private per user: every route requires a valid access token.
router.use(authenticate);

router.get('/', historyController.list);
router.get('/:id', historyController.getById);

export { router as historyRoutes };
