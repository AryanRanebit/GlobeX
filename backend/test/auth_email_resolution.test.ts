// ─────────────────────────────────────────────────────────────────────────────
// Auth email resolution tests (offline: repository, jwt and bcrypt mocked)
//
// Locks in deterministic, fail-closed behaviour for capital-letter emails:
//  - exact (lowercase-normalized) match wins;
//  - exactly one case-insensitive match = one legacy mixed-case row, allowed;
//  - two or more = a case-variant collision, REFUSED with 409 before any
//    password check, so the wrong account can never be authenticated.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findByEmail: vi.fn(),
  findAllByEmailInsensitive: vi.fn(),
  create: vi.fn(),
  updateRefreshToken: vi.fn(),
  compare: vi.fn(),
  hash: vi.fn(async () => 'hashed-password'),
}));

vi.mock('../src/modules/auth/auth.repository', () => ({
  authRepository: {
    findByEmail: mocks.findByEmail,
    findAllByEmailInsensitive: mocks.findAllByEmailInsensitive,
    create: mocks.create,
    updateRefreshToken: mocks.updateRefreshToken,
    findById: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock('../src/utils/jwt', () => ({
  generateTokenPair: vi.fn(() => ({ accessToken: 'access', refreshToken: 'refresh' })),
  verifyRefreshToken: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: { compare: mocks.compare, hash: mocks.hash },
  compare: mocks.compare,
  hash: mocks.hash,
}));

import { authService } from '../src/modules/auth/auth.service';

const legacyRow = {
  id: 'user-legacy',
  name: 'Test User',
  email: 'Test@Example.COM', // stored before emails were lowercased
  password: 'hashed-password',
  role: 'USER',
  isActive: true,
  refreshToken: null,
  companyName: 'Test Inc',
  companyType: 'Manufacturer',
  industry: 'Textiles',
};

const otherRow = { ...legacyRow, id: 'user-other', email: 'test@example.com' };

const signupDto = {
  name: 'Test User',
  email: 'test@example.com', // already normalized by signupSchema
  password: 'Password123!',
  companyName: 'Test Inc',
  companyType: 'Manufacturer' as const,
  industry: 'Textiles',
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.updateRefreshToken.mockResolvedValue(undefined);
  mocks.compare.mockResolvedValue(true);
});

describe('Password login email resolution', () => {
  it('exact lowercase match signs in without the fallback', async () => {
    mocks.findByEmail.mockResolvedValue(otherRow);
    const result = await authService.login({ email: 'test@example.com', password: 'x' });
    expect(result.user.id).toBe('user-other');
    expect(mocks.findAllByEmailInsensitive).not.toHaveBeenCalled();
  });

  it('a single legacy mixed-case row signs in via the fallback', async () => {
    mocks.findByEmail.mockResolvedValue(null);
    mocks.findAllByEmailInsensitive.mockResolvedValue([legacyRow]);
    const result = await authService.login({ email: 'test@example.com', password: 'x' });
    expect(result.user.id).toBe('user-legacy');
  });

  it('a case-variant collision fails closed with 409 before any password check', async () => {
    mocks.findByEmail.mockResolvedValue(null);
    mocks.findAllByEmailInsensitive.mockResolvedValue([legacyRow, otherRow]);
    await expect(
      authService.login({ email: 'test@example.com', password: 'x' }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.compare).not.toHaveBeenCalled();
  });

  it('unknown email stays a 401', async () => {
    mocks.findByEmail.mockResolvedValue(null);
    mocks.findAllByEmailInsensitive.mockResolvedValue([]);
    await expect(
      authService.login({ email: 'nobody@example.com', password: 'x' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('wrong password on a legacy row stays a 401', async () => {
    mocks.findByEmail.mockResolvedValue(null);
    mocks.findAllByEmailInsensitive.mockResolvedValue([legacyRow]);
    mocks.compare.mockResolvedValue(false);
    await expect(
      authService.login({ email: 'test@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('Signup with case-variant emails', () => {
  it('rejects signup when any case-variant of the email exists', async () => {
    mocks.findAllByEmailInsensitive.mockResolvedValue([legacyRow]);
    await expect(authService.signup(signupDto)).rejects.toMatchObject({
      statusCode: 400,
      message: 'Email already in use',
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('creates the account with the normalized lowercase email', async () => {
    mocks.findAllByEmailInsensitive.mockResolvedValue([]);
    mocks.create.mockImplementation(async (data: any) => ({ id: 'new-user', refreshToken: null, ...data }));
    const result = await authService.signup(signupDto);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'test@example.com', password: 'hashed-password' }),
    );
    expect(result.tokens.accessToken).toBe('access');
  });
});

describe('Google login email resolution', () => {
  function stubGoogleUserinfo(email: string, name = 'Test User') {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ email, name }),
    })));
  }

  it('signs into the existing account even when Google returns capitals', async () => {
    stubGoogleUserinfo('Test@Example.COM');
    mocks.findByEmail.mockResolvedValue(null);
    mocks.findAllByEmailInsensitive.mockResolvedValue([legacyRow]);
    const result = await authService.googleLogin('google-access-token');
    expect(result.user.id).toBe('user-legacy');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('fails closed with 409 on a case-variant collision', async () => {
    stubGoogleUserinfo('test@example.com');
    mocks.findByEmail.mockResolvedValue(null);
    mocks.findAllByEmailInsensitive.mockResolvedValue([legacyRow, otherRow]);
    await expect(authService.googleLogin('google-access-token')).rejects.toMatchObject({
      statusCode: 409,
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('creates a brand-new Google account with a lowercase email', async () => {
    stubGoogleUserinfo('NewPerson@Example.COM');
    mocks.findByEmail.mockResolvedValue(null);
    mocks.findAllByEmailInsensitive.mockResolvedValue([]);
    mocks.create.mockImplementation(async (data: any) => ({ id: 'new-google', refreshToken: null, isActive: true, role: 'USER', password: null, ...data }));
    await authService.googleLogin('google-access-token');
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'newperson@example.com' }),
    );
  });
});
