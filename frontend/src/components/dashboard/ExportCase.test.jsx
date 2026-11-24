// @vitest-environment jsdom
// Offline tests for ExportCase mount load and RequirementsPanel request keying.
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/api', () => ({ apiFetch: vi.fn() }));
import { apiFetch } from '../../lib/api';
import ExportCase, { RequirementsPanel } from './ExportCase';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

let container, root;
beforeEach(() => {
  vi.clearAllMocks();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); });

describe('ExportCase mount load', () => {
  it('fetches the case list once and shows the empty state', async () => {
    apiFetch.mockResolvedValue(json(200, { success: true, data: [] }));
    await act(async () => { root.render(<ExportCase onNavigate={() => {}} />); });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch.mock.calls[0][0]).toContain('/api/v1/export-cases');
    expect(container.textContent).toContain('No export cases yet');
  });

  it('shows an error when loading fails', async () => {
    apiFetch.mockRejectedValue(new Error('network'));
    await act(async () => { root.render(<ExportCase onNavigate={() => {}} />); });
    expect(container.textContent).toContain('Could not load export cases');
  });

  it('ignores a response that arrives after unmount', async () => {
    const d = deferred();
    apiFetch.mockReturnValue(d.promise);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => { root.render(<ExportCase onNavigate={() => {}} />); });
    act(() => root.unmount());
    await act(async () => { d.resolve(json(200, { success: true, data: [] })); });
    expect(err).not.toHaveBeenCalled();
    root = createRoot(container); // so afterEach unmount is valid
  });
});

describe('RequirementsPanel', () => {
  const covered = { covered: true, entries: [], gaps: [], coverage: 'partial' };

  it('is idle without a country, and loading right after props change', async () => {
    const d = deferred();
    apiFetch.mockReturnValue(d.promise);
    await act(async () => { root.render(<RequirementsPanel hsCode="0910" targetCountry="" />); });
    expect(container.textContent).toContain('Choose a target country first');
    expect(apiFetch).not.toHaveBeenCalled();
    await act(async () => { root.render(<RequirementsPanel hsCode="0910" targetCountry="USA" />); });
    expect(container.textContent).toContain('Checking source-checked requirements');
  });

  it('shows not-cleared text when nothing is on file', async () => {
    apiFetch.mockResolvedValue(json(200, { data: { covered: false } }));
    await act(async () => { root.render(<RequirementsPanel hsCode="0910" targetCountry="USA" />); });
    expect(container.textContent).toContain('unknown, not cleared');
  });

  it('shows the error notice on a failed request', async () => {
    apiFetch.mockResolvedValue(json(500, {}));
    await act(async () => { root.render(<RequirementsPanel hsCode="0910" targetCountry="USA" />); });
    expect(container.textContent).toContain('Requirements could not be loaded');
  });

  it('drops a stale response when the country changes mid-request', async () => {
    const first = deferred();
    apiFetch.mockReturnValueOnce(first.promise).mockResolvedValueOnce(json(200, { data: { covered: false } }));
    await act(async () => { root.render(<RequirementsPanel hsCode="0910" targetCountry="USA" />); });
    await act(async () => { root.render(<RequirementsPanel hsCode="0910" targetCountry="Germany" />); });
    expect(container.textContent).toContain('Nothing source-checked is on file');
    await act(async () => { first.resolve(json(200, { data: covered })); });
    // The late USA response must not replace the Germany result.
    expect(container.textContent).toContain('Nothing source-checked is on file');
    expect(container.textContent).not.toContain('Partial source-checked guidance');
  });
});
