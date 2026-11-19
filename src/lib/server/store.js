/**
 * Store catalog boundary: the UI reads provider-neutral products here.
 * New catalog sources implement {configured(), list()} and register under a unique key.
 * Payment and fulfillment are separate integrations; neither is implied by a catalog adapter.
 */
import { env } from '$env/dynamic/private';
import { printfulConfigured, getPrintfulProducts } from './printful.js';

const catalogAdapters = {
  printful: { configured: printfulConfigured, list: getPrintfulProducts }
};

function selectedProvider() { return env.STORE_CATALOG_PROVIDER || 'printful'; }
export function supportsPrintfulOrderFlow() { return selectedProvider() === 'printful' && printfulConfigured(); }
export function catalogConfigured() {
  const adapter = catalogAdapters[selectedProvider()];
  return Boolean(adapter && adapter.configured());
}
export async function getStoreCatalog() {
  const key = selectedProvider();
  const adapter = catalogAdapters[key];
  if (!adapter) throw new Error(`Unsupported catalog provider: ${key}`);
  if (!adapter.configured()) return [];
  const products = await adapter.list();
  if (!Array.isArray(products)) throw new Error('Catalog provider returned an invalid collection.');
  return products;
}
