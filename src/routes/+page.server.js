import { env } from '$env/dynamic/private';
import { getStoreCatalog, catalogConfigured, supportsPrintfulOrderFlow } from '$lib/server/store.js';

export async function load() {
  let products = [];
  let catalogError = false;
  if (catalogConfigured()) {
    try { products = await getStoreCatalog(); }
    catch (error) {
      console.error('Catalog unavailable:', error.message);
      catalogError = true;
    }
  }
  const stripeIsTest = env.STRIPE_SECRET_KEY?.startsWith('sk_test_');
  const checkoutEnabled = supportsPrintfulOrderFlow() && products.length > 0 && env.ENABLE_CHECKOUT === 'true' &&
    Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.SITE_URL) &&
    (stripeIsTest || env.ENABLE_PRINTFUL_FULFILLMENT === 'true');
  return { products, catalogError, checkoutEnabled };
}
