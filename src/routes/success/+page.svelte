<script>
  import { onMount } from 'svelte';
  export let data;
  onMount(() => { if (data.confirmed) { try { localStorage.removeItem('basednut-cart-v1'); } catch {} } });
</script>
<svelte:head>
  <title>{data.confirmed ? 'Payment received' : 'Checkout status'} · BasedNut</title>
  <meta name="robots" content="noindex" />
</svelte:head>
<div class="success-screen">
  <a href="/" class="wordmark">BASED<span>NUT</span><sup>™</sup></a>
  <div class="success-icon">{data.confirmed ? '✓' : '?'}</div>
  <div class="eyebrow">{data.confirmed ? 'PAYMENT CONFIRMED' : 'CHECKOUT STATUS UNAVAILABLE'}</div>
  <h1>{#if data.confirmed}YOU'VE GOT<br/>GOOD TASTE.{:else}LET'S CHECK<br/>YOUR ORDER.{/if}</h1>
  <p>{data.confirmed ? 'Stripe confirms your payment. Your order will be sent to our print-on-demand partner for fulfillment. Keep your receipt for reference.' : 'We could not independently verify a paid checkout session. Please check your Stripe receipt before placing another order.'}</p>
  <a href="/" class="main-button">BACK TO THE GOOD STUFF <span>↗</span></a>
  <small>Contact the store operator using the contact information on your receipt if you need assistance.</small>
</div>
