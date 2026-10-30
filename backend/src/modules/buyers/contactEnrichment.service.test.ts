import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { extractEmailsFromHtml, scrapeWebsiteForEmail } from './contactEnrichment.service';

const originalFetch = global.fetch;
const fetchMock = vi.fn();

const htmlResponse = (body: string) => ({
  ok: true,
  headers: { get: (k: string) => (k === 'content-type' ? 'text/html; charset=utf-8' : null) },
  text: async () => body,
});

describe('extractEmailsFromHtml', () => {
  it('extracts a mailto: address', () => {
    const html = '<a href="mailto:sales@alwaslfood.com">Contact us</a>';
    expect(extractEmailsFromHtml(html)).toContain('sales@alwaslfood.com');
  });

  it('extracts plain-text addresses and strips mailto parameters', () => {
    const html = '<a href="mailto:info@aysarco.com?subject=Inquiry">mail</a> Call: +966... or write export@aysarco.com';
    const emails = extractEmailsFromHtml(html);
    expect(emails).toContain('info@aysarco.com');
    expect(emails).toContain('export@aysarco.com');
  });

  it('filters junk addresses (images, noreply, sentry, w3.org)', () => {
    const html = `
      <img src="logo@2x.png">
      <a href="mailto:noreply@aysarco.com">x</a>
      <script>window.sentry={dsn:"abc@sentry.io"}</script>
      <a href="https://www.w3.org/2000/svg">w3@w3.org</a>
      <p>Reach us at sales@aysarco.com</p>`;
    const emails = extractEmailsFromHtml(html);
    expect(emails).toEqual(['sales@aysarco.com']);
  });

  it('ranks a generic contact mailbox above a personal one', () => {
    const html = '<p>ceo: fatima.k@aysarco.com / general: info@aysarco.com</p>';
    expect(extractEmailsFromHtml(html)[0]).toBe('info@aysarco.com');
  });
});

describe('scrapeWebsiteForEmail', () => {
  beforeEach(() => {
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it('finds an email on the homepage without hitting contact pages', async () => {
    fetchMock.mockResolvedValueOnce(htmlResponse('<footer>info@aysarco.com</footer>'));
    const email = await scrapeWebsiteForEmail('https://www.aysarco.com');
    expect(email).toBe('info@aysarco.com');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('falls back to /contact when the homepage has none', async () => {
    fetchMock
      .mockResolvedValueOnce(htmlResponse('<html><body>Welcome</body></html>'))
      .mockResolvedValueOnce(htmlResponse('<h1>Contact</h1><a href="mailto:export@mkyksa.com">Mail</a>'));
    const email = await scrapeWebsiteForEmail('mkyksa.com');
    expect(email).toBe('export@mkyksa.com');
    expect(fetchMock.mock.calls[1][0]).toBe('https://mkyksa.com/contact');
  });

  it('returns null when no page yields an email', async () => {
    fetchMock.mockResolvedValue(htmlResponse('<html><body>No contact info</body></html>'));
    const email = await scrapeWebsiteForEmail('https://example.sa');
    expect(email).toBeNull();
  });

  it('returns null when the site is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const email = await scrapeWebsiteForEmail('https://dead-site.example');
    expect(email).toBeNull();
  });
});
