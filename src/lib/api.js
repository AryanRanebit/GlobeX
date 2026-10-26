/**
 * GlobeX API Client
 * Wraps all backend REST calls with the stored JWT token.
 */

const API_BASE = '/api/v1';

function getToken() {
  return localStorage.getItem('globex_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.message || `API error ${res.status}`);
  }

  return data?.data ?? data;
}

// ── Market Intelligence ──────────────────────────────────────────────────────
export async function analyzeMarket({ product, targetRegions }) {
  const res = await request('/market/analyze', {
    method: 'POST',
    body: JSON.stringify({ product, targetRegions }),
  });

  if (res.jobId) {
    // Poll the status
    while (true) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusRes = await request(`/market/analyze/status/${res.jobId}`, {
        method: 'GET'
      });
      if (statusRes.status === 'completed' || statusRes.status === 'succeeded') {
        return statusRes.result;
      } else if (statusRes.status === 'failed') {
        throw new Error(statusRes.error || 'Agent failed to complete analysis.');
      }
    }
  }

  return res;
}

export async function getOpportunities() {
  return request('/market/opportunities', { method: 'GET' });
}

export async function understandProduct({ product, description, materials }) {
  return request('/agents/product-understanding', {
    method: 'POST',
    body: JSON.stringify({
      product_name: product,
      description,
      materials,
    }),
  });
}

export async function discoverBuyers({ product, targetCountries }) {
  return request('/buyers/discover', {
    method: 'POST',
    body: JSON.stringify({ product, targetCountries }),
  });
}

// ── Lead Scoring (direct AI agent endpoint — no buyer DB needed) ─────────────
export async function scoreLeadDirect({ buyer, product }) {
  return request('/agents/lead-scoring', {
    method: 'POST',
    body: JSON.stringify({ buyer, product }),
  });
}

// ── Outreach Generation (direct AI agent endpoint) ───────────────────────────
export async function generateOutreachDirect({ buyer, sender, tone, language, customContext }) {
  return request('/agents/outreach', {
    method: 'POST',
    body: JSON.stringify({ buyer, sender, tone, language, custom_context: customContext }),
  });
}

// ── Trade Compliance & Customs (direct AI agent endpoint) ──────────────────────
export async function assessComplianceDirect({ product, destinationCountry, hsCode, originCountry = 'India' }) {
  return request('/agents/compliance', {
    method: 'POST',
    body: JSON.stringify({
      product,
      destination_country: destinationCountry,
      hs_code: hsCode,
      origin_country: originCountry,
    }),
  });
}

// ── Trade Tools (HS Lookup, Duty Calculator, Invoice, Packing List) ────────────
export async function lookupHsCode({ productName }) {
  return request('/agents/tools/hs-code', {
    method: 'POST',
    body: JSON.stringify({ product_name: productName }),
  });
}

export async function calculateDuty({ product, destinationCountry, productValueUsd, hsCode }) {
  return request('/agents/tools/duty-calculator', {
    method: 'POST',
    body: JSON.stringify({
      product,
      destination_country: destinationCountry,
      product_value_usd: productValueUsd,
      hs_code: hsCode,
    }),
  });
}

export async function generateInvoice(payload) {
  return request('/agents/tools/invoice', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function generatePackingList(payload) {
  return request('/agents/tools/packing-list', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ── Products API ─────────────────────────────────────────────────────────────
export async function getUserProducts() {
  return request('/products', { method: 'GET' });
}

export async function createProduct(payload) {
  return request('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
