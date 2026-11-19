import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import Stripe from 'stripe';
import { getStoreCatalog, supportsPrintfulOrderFlow } from '$lib/server/store.js';
import { validateCart, usdCents } from '$lib/server/catalog.js';

export async function POST({ request, url }) {
  const enabled = env.ENABLE_CHECKOUT === 'true' && supportsPrintfulOrderFlow() &&
    Boolean(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.SITE_URL) &&
    (env.STRIPE_SECRET_KEY.startsWith('sk_test_') || env.ENABLE_PRINTFUL_FULFILLMENT === 'true');
  if (!enabled) return json({ error: 'Checkout is not enabled. This is a storefront preview.' }, { status: 503 });
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) return json({ error: 'Invalid origin.' }, { status: 403 });

  let liveCatalog;
  try { liveCatalog = await getStoreCatalog(); }
  catch (error) {
    console.error('Checkout catalog sync failed:', error.message);
    return json({ error: 'Product catalog is temporarily unavailable.' }, { status: 503 });
  }
  let cart;
  try {
    const input = await request.json();
    cart = validateCart(input.items, liveCatalog);
  } catch (err) {
    return json({ error: err.message || 'Invalid cart.' }, { status: 400 });
  }
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const shipping = Number(env.STANDARD_SHIPPING_CENTS || 599);
  if (!Number.isSafeInteger(shipping) || shipping < 0 || shipping > 100000) {
    return json({ error: 'Shipping configuration is invalid.' }, { status: 500 });
  }
  const countries = (env.SHIPPING_COUNTRIES || 'US').split(',').map(s => s.trim().toUpperCase()).filter(s => /^[A-Z]{2}$/.test(s));
  if (!countries.length) return json({ error: 'Shipping countries are not configured.' }, { status: 500 });
  let site;
  try {
    site = new URL(env.SITE_URL);
    if (site.protocol !== 'https:' && site.hostname !== 'localhost') throw new Error();
  } catch { return json({ error: 'SITE_URL must be a valid HTTPS URL.' }, { status: 500 }); }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: cart.map(item => ({
        quantity: item.quantity,
        price_data: {
          currency: 'usd', unit_amount: usdCents(item.price.toFixed(2)),
          product_data: { name: `${item.product.name} — ${item.color} / ${item.size}`,
            ...(item.product.image?.startsWith('https://') ? { images: [item.product.image] } : {}) }
        }
      })),
      shipping_address_collection: { allowed_countries: countries },
      shipping_options: [{ shipping_rate_data: {
        type: 'fixed_amount', fixed_amount: { amount: shipping, currency: 'usd' },
        display_name: 'Standard shipping'
      } }],
      phone_number_collection: { enabled: true },
      automatic_tax: { enabled: env.STRIPE_AUTOMATIC_TAX === 'true' },
      success_url: `${site.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site.origin}/?cart=1`,
      metadata: { basednut_store: 'v1', basednut_cart: JSON.stringify(cart.map(v => [v.id, v.quantity])) }
    });
    return json({ url: session.url });
  } catch (error) {
    console.error('Stripe session creation failed:', error.type || error.message);
    return json({ error: 'Unable to start checkout. Try again shortly.' }, { status: 502 });
  }
}
