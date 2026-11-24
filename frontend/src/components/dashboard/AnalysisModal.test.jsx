// @vitest-environment jsdom
// Offline tests for AnalysisModal state reset and poll timing. apiFetch is
// mocked; nothing leaves the machine.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn() }));
import { apiFetch } from '../../lib/api';
import AnalysisModal from './AnalysisModal';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
const stored = { product: 'Turmeric', candidateHsCode: '091030', recommendedCountries: [] };

let container, root;
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const render = (props) => act(() => root.render(<AnalysisModal onClose={() => {}} {...props} />));
const input = () => container.querySelector('input[type="text"]');

describe('AnalysisModal state reset', () => {
  it('opens straight into a stored result without calling the API', () => {
    render({ isOpen: true, storedResult: stored });
    expect(container.textContent).toContain('Top Export Markets: Turmeric');
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('opens idle with the initial product and an empty result', () => {
    render({ isOpen: true, initialProduct: 'Rice' });
    expect(input().value).toBe('Rice');
    expect(container.textContent).toContain('Run Full Market Analysis');
  });

  it('resets when closed and reopened with different inputs', () => {
    render({ isOpen: true, storedResult: stored });
    render({ isOpen: false, storedResult: stored });
    expect(container.textContent).toBe('');
    render({ isOpen: true, initialProduct: 'Cotton' });
    expect(input().value).toBe('Cotton');
    expect(container.textContent).not.toContain('Top Export Markets');
  });
});

describe('AnalysisModal poll timing', () => {
  it('reads the clock only from the poll path, never during render', async () => {
    vi.useFakeTimers();
    const realNow = Date.now;
    const stacks = [];
    vi.spyOn(Date, 'now').mockImplementation(() => { stacks.push(new Error().stack); return realNow(); });
    apiFetch
      .mockResolvedValueOnce(json(200, { success: true, data: { jobId: 'j1' } }))
      .mockResolvedValue(json(200, { data: { status: 'running' } }));

    render({ isOpen: true, initialProduct: 'Rice' });
    const during = stacks.filter((s) => s.includes('nowMs'));
    expect(during).toHaveLength(0); // no AnalysisModal clock read while rendering

    await act(async () => {
      container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    const reads = stacks.filter((s) => s.includes('nowMs'));
    expect(reads.length).toBeGreaterThanOrEqual(2); // start time + at least one poll
    // Every read came from the async handler/timer, none from React's render phase.
    for (const s of reads) {
      expect(s).not.toMatch(/renderWithHooks|performUnitOfWork|beginWork/);
      expect(s).toMatch(/pollStatus|runAnalysis/);
    }
  });

  it('gives up with a failure message after the poll timeout', async () => {
    vi.useFakeTimers();
    apiFetch
      .mockResolvedValueOnce(json(200, { success: true, data: { jobId: 'j1' } }))
      .mockResolvedValue(json(200, { data: { status: 'running' } }));
    render({ isOpen: true, initialProduct: 'Rice' });
    await act(async () => {
      container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(160000); });
    expect(container.textContent).toContain('taking longer than expected');
  });
});
