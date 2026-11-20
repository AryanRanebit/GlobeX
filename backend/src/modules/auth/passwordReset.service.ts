import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { AppError } from '../../middleware/error.middleware';
import { logger } from '../../utils/logger';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
// 32 random bytes = 256 bits of entropy, hex-encoded (64 chars).
const TOKEN_BYTES = 32;

/**
 * Delivery is how the raw token reaches the user (email, once a provider is
 * wired). It is injected, never constructed here:
 *  - production startup configures an email-backed delivery;
 *  - tests configure an in-memory sink;
 *  - when nothing is configured the reset flow FAILS CLOSED: no token is
 *    created and the raw token never touches an API response or a log line.
 */
export interface ResetDelivery {
  sendReset(email: string, rawToken: string): Promise<void>;
}

let delivery: ResetDelivery | null = null;

export function configureResetDelivery(d: ResetDelivery | null): void {
  delivery = d;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const passwordResetService = {
  /**
   * Start a reset. From the caller's point of view the outcome is always the
   * same ("if an account exists..."), so the endpoint cannot be used to
   * enumerate registered emails or to tell whether email is configured.
   * Returns nothing a caller could use: the raw token only ever flows into
   * the injected delivery.
   */
  async requestReset(email: string): Promise<void> {
    if (!delivery) {
      // Fail closed: without a delivery channel a token could never reach the
      // user, so none is created. Same external behavior either way.
      logger.warn('Password reset requested but no reset delivery is configured');
      return;
    }
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return;
    }
    // One live reset at a time: supersede any earlier unused tokens.
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });
    try {
      await delivery.sendReset(user.email, rawToken);
    } catch (err) {
      // Never log the token; kill it so a failed send leaves nothing usable.
      logger.error(`Password reset delivery failed for user ${user.id}: ${(err as Error).message}`);
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
    }
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
