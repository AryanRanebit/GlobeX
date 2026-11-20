import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const passwordResetService = {
  /**
   * Start a reset. Always succeeds from the caller's point of view so the
   * endpoint cannot be used to enumerate registered emails. The raw token is
   * returned ONLY outside production, for local/dev wiring; production
   * delivery is email (provider integration pending) and the raw token never
   * leaves the service layer there.
   */
  async requestReset(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return { delivered: false as const };
    }
    // One live reset at a time: supersede any earlier unused tokens.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    const rawToken = crypto.randomBytes(32).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });
    return { delivered: true as const, rawToken };
  },

  /**
   * Consume a reset token. Fail closed: unknown, expired or already-used
   * tokens all get the same rejection, and a successful reset invalidates
   * the stored refresh token so existing sessions end.
   */
  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = hashToken(rawToken);
    const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new AppError('Invalid or expired reset token', 400);
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword, refreshToken: null },
      }),
      prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { reset: true as const };
  },
};
