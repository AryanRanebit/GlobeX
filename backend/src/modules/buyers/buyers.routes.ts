import { Router } from 'express';
import { buyersController } from './buyers.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { buyerSearchSchema } from './buyers.schema';

const router = Router();
router.use(authenticate);

router.get('/', validate(buyerSearchSchema, 'query'), buyersController.search);
router.get('/search', validate(buyerSearchSchema, 'query'), buyersController.search);
router.post('/discover', buyersController.discover);
router.get('/:id', buyersController.getById);

export { router as buyersRoutes };
