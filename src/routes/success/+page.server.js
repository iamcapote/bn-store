import { env } from '$env/dynamic/private';
import Stripe from 'stripe';

export async function load({ url }) {
  const sessionId = url.searchParams.get('session_id');
  if (!sessionId?.startsWith('cs_') || !env.STRIPE_SECRET_KEY) return { confirmed: false };
  try {
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return { confirmed: session.payment_status === 'paid' };
  } catch { return { confirmed: false }; }
}
