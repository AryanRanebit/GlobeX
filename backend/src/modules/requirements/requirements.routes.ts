import { Router } from 'express';
import { requirementsController } from './requirements.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/coverage', requirementsController.coverage);
router.get('/', requirementsController.lookup);

export { router as requirementsRoutes };
