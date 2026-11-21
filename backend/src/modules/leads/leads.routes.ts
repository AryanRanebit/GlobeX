import { Router } from 'express';
import { leadsController } from './leads.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { createLeadSchema, updateLeadSchema, createLeadEvidenceSchema } from './leads.schema';

const router = Router();
router.use(authenticate);

router.post('/', validate(createLeadSchema), leadsController.create);
router.get('/', leadsController.getAll);
router.get('/follow-ups', leadsController.followUps);
router.get('/stats', leadsController.getStats);
router.patch('/:id', validate(updateLeadSchema), leadsController.update);
router.delete('/:id', leadsController.delete);
router.post('/:id/evidence', validate(createLeadEvidenceSchema), leadsController.addEvidence);
router.get('/:id/evidence', leadsController.listEvidence);
router.delete('/:id/evidence/:evidenceId', leadsController.removeEvidence);

export { router as leadsRoutes };
