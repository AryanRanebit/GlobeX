// ─────────────────────────────────────────────────────────────────────────────
// "Normal user" hardening tests (offline: no DB, no network, no paid APIs)
//
// Covers:
//  1. Email normalization — capital letters and stray spaces in signup/login
//     emails must not strand accounts (Postgres compares text case-sensitively).
//  2. Buyer discovery in-flight guard — a second identical discovery run while
//     one is still running is rejected with 429 instead of paying for a
//     duplicate Gemini call.
// ─────────────────────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';

import { signupSchema, loginSchema } from '../src/modules/auth/auth.schema';
import { buyersService } from '../src/modules/buyers/buyers.service';
import { ProviderError } from '../src/modules/buyers/buyerDiscovery.providers';
import type { IBuyerDataProvider } from '../src/modules/buyers/buyerDiscovery.types';

const validSignup = {
  name: 'Test User',
  email: 'Test@Example.COM',
  password: 'Password123!',
  companyName: 'Test Inc',
  companyType: 'Manufacturer',
  industry: 'Textiles',
};

describe('Email normalization (capital-letter email)', () => {
  it('signup schema lowercases and trims the email', () => {
    const parsed = signupSchema.parse({ ...validSignup, email: '  Test@Example.COM ' });
    expect(parsed.email).toBe('test@example.com');
  });

  it('login schema lowercases and trims the email', () => {
    const parsed = loginSchema.parse({ email: ' TEST@example.com ', password: 'x' });
    expect(parsed.email).toBe('test@example.com');
  });

  it('still rejects malformed emails after normalization', () => {
    expect(() => signupSchema.parse({ ...validSignup, email: 'not-an-email' })).toThrow();
  });
});

// Provider that stays in flight briefly, then fails before any persistence,
// so the test never touches the database or a paid API.
const slowFailingProvider: IBuyerDataProvider = {
  name: 'slow_failing_mock',
  async searchCandidates() {
    await new Promise((resolve) => setTimeout(resolve, 60));
    throw new ProviderError('offline test abort', false);
  },
};

describe('Buyer discovery in-flight guard (double-tap protection)', () => {
  it('rejects an identical discovery while one is running, with 429', async () => {
    const first = buyersService.discover('user-1', 'Basmati Rice', ['USA'], {
      providerOverride: slowFailingProvider,
    });
    // Attach the rejection handler immediately so nothing is unhandled.
    const firstOutcome = expect(first).rejects.toMatchObject({ statusCode: 502 });
    // Same request with different casing/spacing must count as identical.
    await expect(
      buyersService.discover('user-1', '  basmati rice ', ['usa'], {
        providerOverride: slowFailingProvider,
      }),
    ).rejects.toMatchObject({ statusCode: 429 });
    await firstOutcome;
  });

  it('does not block a different product for the same user', async () => {
    const first = buyersService.discover('user-1', 'Basmati Rice', ['USA'], {
      providerOverride: slowFailingProvider,
    });
    const firstOutcome = expect(first).rejects.toMatchObject({ statusCode: 502 });
    // Different product: not a duplicate, so it must NOT be a 429.
    await expect(
      buyersService.discover('user-1', 'Turmeric', ['USA'], {
        providerOverride: slowFailingProvider,
      }),
    ).rejects.toMatchObject({ statusCode: 502 });
    await firstOutcome;
  });

  it('releases the key after the run settles, so it can run again', async () => {
    await expect(
      buyersService.discover('user-1', 'Cardamom', ['UAE'], {
        providerOverride: slowFailingProvider,
      }),
    ).rejects.toMatchObject({ statusCode: 502 });
    // Immediately after settling, the same request must not hit the guard.
    await expect(
      buyersService.discover('user-1', 'Cardamom', ['UAE'], {
        providerOverride: slowFailingProvider,
      }),
    ).rejects.toMatchObject({ statusCode: 502 });
  });
});
