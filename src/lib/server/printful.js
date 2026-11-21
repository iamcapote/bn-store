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

const catalogCache = { data: null, expires: 0 };
const CATALOG_CACHE_TTL_MS = 10 * 60 * 1000;

export async function getPrintfulProducts() {
  // Cached, paginated catalog: every synced product, tolerant of single-product failures.
  if (catalogCache.data && Date.now() < catalogCache.expires) return catalogCache.data;
  const results = [];
  const limit = 100;
  const maxProducts = 200;
  let offset = 0;
  let failures = 0; // count failed detail fetches; only complete catalogs get cached
  while (offset < maxProducts) {
    const summaries = await printful(`/store/products?limit=${limit}&offset=${offset}&status=synced`);
    if (!Array.isArray(summaries) || summaries.length === 0) break;
    for (let i = 0; i < summaries.length; i += 8) {
      const group = summaries.slice(i, i + 8);
      const details = await Promise.allSettled(group.map(p => printful(`/store/products/${p.id}`)));
      for (const outcome of details) {
        if (outcome.status !== 'fulfilled') { failures += 1; continue; } // skip a failed product, keep the catalog alive
        const product = normalizeProduct(outcome.value);
        if (product) results.push(product);
      }
    }
    if (summaries.length < limit) break;
    offset += limit;
  }
  if (results.length && failures === 0) { // cache only fully-fetched catalogs; partial loads retry next visit
    catalogCache.data = results;
    catalogCache.expires = Date.now() + CATALOG_CACHE_TTL_MS;
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
