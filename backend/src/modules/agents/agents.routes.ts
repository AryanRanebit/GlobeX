import { Router } from 'express';
import { agentsController } from './agents.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.post('/lead-scoring', agentsController.scoreLeadDirect);
router.post('/outreach', agentsController.generateOutreachDirect);
router.post('/compliance', agentsController.assessComplianceDirect);
router.post('/product-understanding', agentsController.understandProductDirect);

// Trade tools endpoints
router.post('/tools/hs-code', agentsController.lookupHsCodeDirect);
router.post('/tools/duty-calculator', agentsController.calculateDutyDirect);
router.post('/tools/invoice', agentsController.generateInvoiceDirect);
router.post('/tools/packing-list', agentsController.generatePackingListDirect);

export { router as agentsRoutes };
