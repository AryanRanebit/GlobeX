import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/prisma';
import { verifyAccessToken } from '../utils/jwt';
import { sendError } from '../utils/apiResponse';
import { prisma } from '../config/database';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 'Access token required', 401);
      return;
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) {
      sendError(res, 'User not found or account disabled', 401);
      return;
    }
    req.user = { userId: user.id, email: user.email, role: user.role as Role };
    next();
  } catch {
    sendError(res, 'Invalid or expired token', 401);
  }
};


/**
 * Attaches req.user when a valid Bearer token is present, but never
 * rejects the request. Used on public endpoints (e.g. trade markets) so
 * signed-in users get extras (history recording) while anonymous
 * visitors keep the exact same public behavior.
 */
export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      next();
      return;
    }
    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (user && user.isActive) {
      req.user = { userId: user.id, email: user.email, role: user.role as Role };
    }
  } catch {
    // Invalid/expired token on a public route: proceed anonymously.
  }
  next();
};

export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) { sendError(res, 'Unauthorized', 401); return; }
    if (!roles.includes(req.user.role as Role)) { sendError(res, 'Insufficient permissions', 403); return; }
    next();
  };
};
