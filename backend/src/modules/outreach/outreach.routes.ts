import { Router } from 'express';
import { outreachController } from './outreach.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { generateOutreachSchema, localizeOutreachSchema } from './outreach.schema';

const router = Router();
router.use(authenticate);

router.post('/generate', validate(generateOutreachSchema), outreachController.generate);
router.post('/localize', validate(localizeOutreachSchema), outreachController.localize);
router.get('/history', outreachController.getHistory);

export { router as outreachRoutes };
