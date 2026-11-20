import { Router } from 'express';
import { exportCaseController } from './exportCase.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

// Export cases are private per user: every route requires a valid token.
router.use(authenticate);

router.get('/', exportCaseController.list);
router.post('/', exportCaseController.create);
router.get('/:id', exportCaseController.getById);
router.patch('/:id', exportCaseController.update);
router.delete('/:id', exportCaseController.remove);

export { router as exportCaseRoutes };
