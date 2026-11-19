import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import Stripe from 'stripe';
import { createHash } from 'node:crypto';
import { sendPaidOrderToPrintful } from '$lib/server/printful.js';

export async function POST({ request }) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY || env.ENABLE_CHECKOUT !== 'true') {
    return json({ error: 'Webhook not configured.' }, { status: 503 });
  }
  const signature = request.headers.get('stripe-signature');
  if (!signature) return json({ error: 'Missing Stripe signature.' }, { status: 400 });
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  let event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, env.STRIPE_WEBHOOK_SECRET); }
  catch { return json({ error: 'Invalid Stripe signature.' }, { status: 400 }); }

  if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    return json({ received: true });
  }
  // Stripe test payments never trigger real Printful fulfillment (which costs actual money).
  if (!event.livemode) return json({ received: true, test: true, fulfillment: 'skipped' });
  if (env.ENABLE_PRINTFUL_FULFILLMENT !== 'true') return json({ error: 'Live fulfillment is disabled.' }, { status: 503 });
  const checkoutId = event.data.object?.id;
  if (!checkoutId) return json({ error: 'Missing Checkout Session.' }, { status: 400 });
  try {
    // Retrieve authoritative session data from Stripe, not user-supplied request payloads.
    const session = await stripe.checkout.sessions.retrieve(checkoutId);
    if (session.payment_status !== 'paid') return json({ received: true, state: 'awaiting_payment' });
    if (session.metadata?.basednut_store !== 'v1') return json({ received: true, state: 'unrelated_session' });
    const details = session.collected_information?.shipping_details || session.shipping_details;
    const address = details?.address;
    const customer = session.customer_details;
    const recipientName = details?.name || customer?.name;
    if (!address?.line1 || !address?.city || !address?.country || !address?.postal_code || !recipientName) {
      throw new Error('Paid session is missing shipping information.');
    }
    const rawItems = JSON.parse(session.metadata?.basednut_cart || 'null');
    if (!Array.isArray(rawItems) || !rawItems.length || rawItems.length > 12) throw new Error('Missing fulfillment item mapping.');
    const items = rawItems.map(([variantId, quantity]) => {
      if (!Number.isSafeInteger(variantId) || variantId < 1 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 10) {
        throw new Error('Invalid fulfillment item mapping.');
      }
      return { sync_variant_id: variantId, quantity };
    });
    const externalId = `bn_${createHash('sha256').update(checkoutId).digest('hex').slice(0, 27)}`;
    const recipient = {
      name: recipientName,
      address1: address.line1,
      ...(address.line2 ? { address2: address.line2 } : {}),
      city: address.city,
      ...(address.state ? { state_code: address.state } : {}),
      country_code: address.country,
      zip: address.postal_code,
      ...(customer?.email ? { email: customer.email } : {}),
      ...(customer?.phone ? { phone: customer.phone } : {})
    };
    const order = await sendPaidOrderToPrintful({ externalId, recipient, items });
    console.info('Paid Checkout Session reconciled with Printful order:', { reference: externalId, printfulId: order.id, status: order.status });
    return json({ received: true });
  } catch (error) {
    // A non-2xx response makes Stripe retry. An operator must investigate persistent failures.
    console.error('Paid order fulfillment failed:', { session: checkoutId, reason: error.message });
    return json({ error: 'Fulfillment unavailable; retry requested.' }, { status: 500 });
  }
}
