import { Request, Response, NextFunction } from 'express';
import { authService } from './auth.service';
import { passwordResetService } from './passwordReset.service';
import { AppError } from '../../middleware/error.middleware';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication and user profile management
 */

export const authController = {
  /**
   * @swagger
   * /auth/signup:
   *   post:
   *     summary: Register a new user
   *     tags: [Auth]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, email, password, companyName, companyType, industry]
   *             properties:
   *               name: { type: string, example: "Rajesh Kumar" }
   *               email: { type: string, format: email, example: "rajesh@spices.in" }
   *               password: { type: string, example: "Secure@123" }
   *               companyName: { type: string, example: "Kumar Spices Pvt Ltd" }
   *               companyType: { type: string, enum: [Manufacturer, Trader, MSME, Exporter, Distributor, Other] }
   *               industry: { type: string, example: "Food & Spices" }
   *     responses:
   *       201:
   *         description: User registered successfully
   *       409:
   *         description: Email already registered
   */
  signup: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.signup(req.body);
      sendCreated(res, result, 'Account created successfully');
    } catch (err) { next(err); }
  },

  /**
   * @swagger
   * /auth/login:
   *   post:
   *     summary: Login and receive JWT tokens
   *     tags: [Auth]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [email, password]
   *             properties:
   *               email: { type: string, format: email }
   *               password: { type: string }
   *     responses:
   *       200:
   *         description: Login successful
   *       401:
   *         description: Invalid credentials
   */
  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      sendSuccess(res, result, 'Login successful');
    } catch (err) { next(err); }
  },

  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await authService.refresh(req.body.refreshToken);
      sendSuccess(res, tokens, 'Tokens refreshed');
    } catch (err) { next(err); }
  },

  google: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { accessToken } = req.body;
      if (!accessToken) {
        return sendSuccess(res, null, 'Access Token is required');
      }
      const result = await authService.googleLogin(accessToken);
      sendSuccess(res, result, 'Google login successful');
    } catch (err) { next(err); }
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.user!.userId);
      sendSuccess(res, null, 'Logged out successfully');
    } catch (err) { next(err); }
  },

  /**
   * @swagger
   * /auth/profile:
   *   get:
   *     summary: Get current user profile
   *     tags: [Auth]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Profile fetched
   *       401:
   *         description: Unauthorized
   */
  getProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.getProfile(req.user!.userId);
      sendSuccess(res, user, 'Profile fetched');
    } catch (err) { next(err); }
  },

  /**
   * @swagger
   * /auth/profile:
   *   patch:
   *     summary: Update current user profile
   *     tags: [Auth]
   */
  updateProfile: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await authService.updateProfile(req.user!.userId, req.body);
      sendSuccess(res, user, 'Profile updated');
    } catch (err) { next(err); }
  },

  forgotPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await passwordResetService.requestReset(req.body.email);
      if (!result.configured) {
        // Honest product state, uniform for every email: no account signal.
        throw new AppError('Password reset by email is not set up yet. Please contact support to reset your password.', 503);
      }
      // Uniform response: no account enumeration, and never a token in the
      // API response. The raw token only ever travels through the injected
      // delivery channel (email once wired).
      sendSuccess(res, null, 'If an account exists for that email, a reset link has been sent');
    } catch (err) { next(err); }
  },

  resetPassword: async (req: Request, res: Response, next: NextFunction) => {
    try {
      await passwordResetService.resetPassword(req.body.token, req.body.password);
      sendSuccess(res, null, 'Password has been reset');
    } catch (err) { next(err); }
  },
};
