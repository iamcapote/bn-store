import { env } from '$env/dynamic/private';
import { normalizeProduct } from './catalog.js';

const apiRoot = 'https://api.printful.com';
export function printfulConfigured() { return Boolean(env.PRINTFUL_TOKEN && env.PRINTFUL_STORE_ID); }

async function printful(path, options = {}) {
  if (!printfulConfigured()) throw new Error('Printful credentials not configured.');
  const response = await fetch(`${apiRoot}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.PRINTFUL_TOKEN}`,
      'X-PF-Store-Id': env.PRINTFUL_STORE_ID,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  if (options.allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    // Never include sensitive request headers, addresses or full API responses in errors.
    throw new Error(`Printful HTTP ${response.status} on ${path.split('?')[0]}`);
  }
  const payload = await response.json();
  return payload.result;
}

export async function getPrintfulProducts() {
  // Deliberately capped to a small initial product collection; expand pagination before >24 products.
  const summaries = await printful('/store/products?limit=24&offset=0&status=synced');
  const results = [];
  for (let i = 0; i < summaries.length; i += 4) {
    const group = summaries.slice(i, i + 4);
    const details = await Promise.all(group.map(p => printful(`/store/products/${p.id}`)));
    for (const detail of details) {
      const product = normalizeProduct(detail);
      if (product) results.push(product);
    }
  }
  return results;
}

export async function sendPaidOrderToPrintful({ externalId, recipient, items }) {
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(externalId)) throw new Error('Invalid order reference.');
  const path = `/orders/@${externalId}`;
  const existing = await printful(path, { allowNotFound: true });
  if (existing && ['failed', 'canceled'].includes(existing.status)) throw new Error(`Existing Printful order is ${existing.status}; operator review required.`);
  if (existing && existing.status !== 'draft') return existing;
  if (existing?.status === 'draft') {
    // A previous attempt created a draft but did not complete confirmation.
    return await printful(`/orders/${existing.id}/confirm`, { method: 'POST' });
  }
  try {
    return await printful('/orders?confirm=true', {
      method: 'POST',
      body: JSON.stringify({ external_id: externalId, shipping: 'STANDARD', recipient, items })
    });
  } catch (error) {
    // Reconcile ambiguous outcome after a timeout / webhook retry. Printful enforces unique external IDs.
    const reconciled = await printful(path, { allowNotFound: true });
    if (reconciled && reconciled.status !== 'draft') return reconciled;
    throw error;
  }
}
