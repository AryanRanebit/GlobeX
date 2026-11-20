import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { authRepository } from './auth.repository';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
import { generateTokenPair, verifyRefreshToken } from '../../utils/jwt';
import { AppError } from '../../middleware/error.middleware';
import type { SignupDto, LoginDto, UpdateProfileDto } from './auth.schema';

/**
 * Resolves the account for an already-normalized (trimmed, lowercased) email.
 *
 * - Exact match wins: the normal path for every account stored lowercase.
 * - One case-insensitive match: a legacy row stored with capital letters
 *   before normalization. Safe to use - it can only be that one account.
 * - Two or more matches: duplicate accounts differing only by letter case
 *   already exist. Fail CLOSED with 409 rather than authenticate whichever
 *   row the database happened to return first.
 */
async function resolveUserByEmail(email: string) {
  const exact = await authRepository.findByEmail(email);
  if (exact) return exact;

  const matches = await authRepository.findAllByEmailInsensitive(email);
  if (matches.length > 1) {
    throw new AppError(
      'Multiple accounts exist for this email address. Please contact support to merge them before signing in.',
      409,
    );
  }
  return matches[0] ?? null;
}

export const authService = {
  async signup(dto: SignupDto) {
    // Case-insensitive: blocks a second account that differs only by letter
    // casing, including rows stored before emails were normalized.
    const existing = await authRepository.findAllByEmailInsensitive(dto.email);
    if (existing.length > 0) throw new AppError('Email already in use', 400);

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const user = await authRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
      companyName: dto.companyName,
      companyType: dto.companyType,
      industry: dto.industry,
    });

    const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });
    await authRepository.updateRefreshToken(user.id, tokens.refreshToken);

    const { password, refreshToken, ...safeUser } = user;
    return { user: safeUser, tokens };
  },

  async login(dto: LoginDto) {
    // The schema has already trimmed and lowercased the email. Resolution
    // falls back to a single legacy mixed-case row and refuses collisions.
    const user = await resolveUserByEmail(dto.email);
    if (!user) throw new AppError('Invalid email or password', 401);
    if (!user.isActive) throw new AppError('Account is disabled', 403);

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new AppError('Invalid email or password', 401);

    const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });
    await authRepository.updateRefreshToken(user.id, tokens.refreshToken);

    const { password, refreshToken, ...safeUser } = user;
    return { user: safeUser, tokens };
  },

  async refresh(token: string) {
    const payload = verifyRefreshToken(token);
    const user = await authRepository.findByEmail(payload.email);
    if (!user || user.refreshToken !== token) throw new AppError('Invalid refresh token', 401);

    const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });
    await authRepository.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  },

  async googleLogin(accessToken: string) {
    // 1. Fetch user info from Google using the access token
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!res.ok) throw new AppError('Invalid Google Token', 401);
    
    const payload = await res.json() as { email?: string; name?: string };
    if (!payload || !payload.email) throw new AppError('Invalid Google Token payload', 401);

    const email = payload.email.trim().toLowerCase();
    const name = payload.name || 'Google User';

    // 2. Check if user exists (exact first, then a single legacy mixed-case
    // row; a case-variant collision fails closed with 409)
    let user = await resolveUserByEmail(email);

    // 3. Create if new
    if (!user) {
      // Create random secure password since they use Google to login
      const randomPass = await bcrypt.hash(Math.random().toString(36).slice(-10) + 'Aa1@', 12);
      user = await authRepository.create({
        email,
        name,
        password: randomPass,
        companyName: 'Set up required',
        companyType: 'Other',
        industry: 'Other',
      });
    }

    if (!user.isActive) throw new AppError('Account is disabled', 403);

    // 4. Generate tokens
    const tokens = generateTokenPair({ userId: user.id, email: user.email, role: user.role });
    await authRepository.updateRefreshToken(user.id, tokens.refreshToken);

    const { password, refreshToken, ...safeUser } = user;
    return { user: safeUser, tokens };
  },

  async logout(userId: string) {
    await authRepository.updateRefreshToken(userId, null);
  },

  async getProfile(userId: string) {
    const user = await authRepository.findById(userId);
    if (!user) throw new AppError('User not found', 404);
    return user;
  },

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return authRepository.updateProfile(userId, dto);
  },
};
