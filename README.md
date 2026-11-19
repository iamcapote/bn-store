# BASEDNUT™ — minimal Printful + Stripe storefront

A tiny, independently deployable SvelteKit product storefront for Vercel. **No Shopify, Builder.io, database, admin panel, or user accounts.** Printful is the product catalog and fulfillment back office; Stripe hosts checkout. The storefront is a custom-built implementation inspired by Vercel's SvelteKit Commerce template, not a fork of its Shopify integration.

> **Status:** Development starter. No credentials are included. Payments are disabled by default. **No sample products or prices are supplied.** The default storefront has an intentionally empty catalog. No live store has been deployed or charged.

See [BRAND_AND_ARCHITECTURE.md](BRAND_AND_ARCHITECTURE.md) for brand evidence and multi-provider extension plan.

## What works

- Responsive brand-aligned homepage and generic product grid with category filters, search and product quick-view
- Variant selection based on synced Printful variants
- Local shopping bag with quantity controls and persistence
- Printful-sourced product data and **server-validated retail prices**
- Stripe-hosted checkout, Stripe webhook verification, verified checkout status page
- Automatic order submission to Printful after verified **live** payment, guarded by explicit environment flags
- Unique external order reference and reconciliation to avoid duplicated Printful orders on Stripe webhook retries
- Intentional empty-catalog storefront when Printful is not configured; **no fictitious merchandise**

## Store operations: Printful-first

1. In your Printful account, go to **Stores → Connect via API**, creating a **Manual order / API store**.
2. In Printful, publish each T-shirt with its print files, color/size variants, accurate public retail prices, and mockups. Confirm each item is **synced** and has a positive **USD** retail price.
3. Generate a Printful OAuth/private token with permissions to read store products and create/confirm orders. Look up the relevant store ID from the Printful Stores API or dashboard. Store credentials only in Vercel environment variables.
4. Create a Stripe account. Configure Checkout, business identity, customer receipts, supported shipping regions, tax settings and the payment methods you intend to accept.
5. Set up a Stripe webhook destination at `https://YOURDOMAIN/api/webhooks/stripe` for `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Copy its webhook **signing secret** to the server-side environment variable.
6. Import the code into **your own GitHub repository and your own Vercel project**, choose SvelteKit, configure environment variables, build and deploy. No linked external account is required by this starter.
7. Verify real Printful catalog images, all size/color variants, shipping address processing, and a complete order life cycle. Only then turn on production payment and fulfillment flags.

Adding another product later: **Create and publish it in Printful. It appears on the storefront automatically on the next server render** (up to 24 products in the current Printful adapter). There is no CMS to update. For large catalogs or higher traffic, add a short cache and pagination.

## Environment variables

Copy `.env.example` to `.env` locally; set them in the Vercel project's environment settings for deployment. Never commit `.env`.

| Variable | Purpose |
| --- | --- |
| `STORE_CATALOG_PROVIDER` | Optional catalog provider key (currently only `printful` is implemented) |
| `PRINTFUL_TOKEN` | Secret Printful API bearer token |
| `PRINTFUL_STORE_ID` | Printful Manual order/API store ID |
| `STRIPE_SECRET_KEY` | Stripe private secret (`sk_test_…` during testing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signature key (`whsec_…`) |
| `SITE_URL` | Deployed site origin (`https://...`) |
| `STANDARD_SHIPPING_CENTS` | Simple fixed checkout shipping fee, charged once per order (default example `599`) |
| `SHIPPING_COUNTRIES` | Comma-separated 2-letter countries (default `US`) |
| `STRIPE_AUTOMATIC_TAX` | Set `true` only after proper Stripe Tax setup |
| `ENABLE_CHECKOUT` | Set `true` to allow Stripe checkout once configured |
| `ENABLE_PRINTFUL_FULFILLMENT` | Must be `true` to allow real paid Stripe orders to trigger real Printful orders |

**Important:** Stripe **test-mode payments never submit to Printful**, which would otherwise cause real production costs. To switch to real checkout, verify Printful billing has a valid payment method and explicitly enable both `ENABLE_CHECKOUT=true` and `ENABLE_PRINTFUL_FULFILLMENT=true` together with your actual live Stripe keys and webhook signing secret. A live key with fulfillment disabled will not allow checkout creation.

## Local development

Node.js 22+ recommended. From the project directory:

```sh
npm install
npm run dev
npm run test
npm run check
npm run build
```

Open `http://localhost:5173`. Without credentials, the UI loads with an empty catalog and checkout disabled. The deployment build command is `npm run build` with SvelteKit Vercel adapter. Leave output directory on its framework default.

## Order flow (live only)

1. Customer chooses synced Printful product/variant; site posts variant IDs + quantities to server.
2. Server re-fetches current Printful products, validates each variant, and creates Stripe Checkout using **server-side Printful retail prices**; it never trusts prices sent from the browser.
3. Stripe hosts payment and collects address. Browser redirect **does not** trigger fulfillment.
4. Signed Stripe webhook arrives; server retrieves payment session directly from Stripe and checks that it is paid.
5. A deterministic, unique reference derived from the Stripe Checkout Session ID is used to create or reconcile the Printful order with `confirm=true`.
6. Printful charges **you** for production and shipping; your Stripe customer payment belongs to **you**. Failures return HTTP 500 so Stripe can retry. Check both Printful Orders and Stripe webhook deliveries to reconcile failed cases.

## Launch caveats (must be resolved before selling)

- **Shipping:** Starter uses a **fixed shipping fee** instead of Printful's real-time shipping estimate. Compare it with Printful's actual production and shipping cost for your shirts and shipping regions. Real rates vary. Start with `US` only unless you validate rates and fulfillment countries. Puerto Rico delivery should be tested as an actual shipping destination, not assumed.
- **Taxes:** Set up tax collection and legal compliance in Stripe as required for the destinations you sell to. It is **off by default**; do not assume that is the correct live tax configuration.
- **Costs:** Printful charges production + shipping to your Printful billing method. Stripe payment processing fees and optional taxes reduce margin. Reconcile at least one real order before a public launch.
- **Fraud & support:** Add a visible support email, privacy policy, return/refund policy, shipping information, and store terms before inviting public sales. Configure Stripe receipt email. Configure Vercel abuse protection and webhook monitoring.
- **Order persistence:** This starter does **not** have an application database. It uses Stripe and Printful as authoritative records, plus unique Printful order references for idempotent retries. For advanced refund/partial-order/customer-service automation, introduce a durable job queue or order database.
- **Testing:** The included Node tests validate price/cart normalization. A full build, integration, security, address and payment end-to-end test require package installation and private keys. Do not assume those are completed here.
- **Commercial hosting:** Vercel states that selling products requires a **Pro or Enterprise** plan; Hobby is non-commercial only. Check current Vercel terms for the account that will deploy the store.
- **Brand:** This revision retains Based Nut and Orchard source-derived colors and identity rather than inventing new trademark claims.

## Verified documentation

- Vercel SvelteKit template: https://vercel.com/templates/svelte/sveltekit-commerce
- Printful Manual order/API store: https://help.printful.com/hc/en-us/articles/50262225690257
- Printful API (products, orders, store IDs): https://developers.printful.com/docs/
- Stripe Checkout: https://docs.stripe.com/payments/checkout
- Stripe webhooks: https://docs.stripe.com/webhooks
- Vercel commercial usage: https://vercel.com/docs/limits/fair-use-guidelines
