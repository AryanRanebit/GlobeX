import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../middleware/validate.middleware';
import { authenticate } from '../../middleware/auth.middleware';
import { signupSchema, loginSchema, updateProfileSchema, refreshTokenSchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema';

const router = Router();

router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.post('/google', authController.google);
router.post('/refresh', validate(refreshTokenSchema), authController.refresh);
router.get('/password-reset/status', authController.passwordResetStatus);
router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.getProfile);
router.patch('/profile', authenticate, validate(updateProfileSchema), authController.updateProfile);

export { router as authRoutes };
