# BASED NUT store — branding and architecture

## Canonical brand references

- Official hub: https://basednut.com — established name **BASED NUT**, tagline **Every forest starts with one nut**, existing environment links.
- Original Orchard: https://orchard.basednut.com — warm, botanical Orchard; original source pinned at https://github.com/BASEDNUT/liquidity/blob/4fb30bc3ec9f02168c6322a4c724895a146d125a/pages/index.js
- Source CSS reference: `components/pools/Repair02.module.css` in same pinned repository uses `#573822` walnut, `#fffaf2` paper, `#b78b58` gold, `#d4bea1` line.
- Store tagline approved 2026-11-19: **Go absolutely nuts.**

**This version is an original store mockup using those source-derived colors, not a copy of the Orchard original.** The tree artwork is a decorative CSS illustration, not a claim to be an official existing brand asset. The earlier neon/acid palette and invented apparel catalog were discarded.

## Current boundaries

| Responsibility | Current implementation | Future seam |
|---|---|---|
| SvelteKit storefront | Renders normalized products/variants, category search, bag, checkout initiation | Layout does not contain Printful API calls |
| Catalog integration | `src/lib/server/store.js` uses named provider registry; Printful is the only implemented adapter | Register a provider exposing `configured()` and `list()`; normalize to shared model |
| Catalog shape | `{id,name,description,category,image,source,variants:[{id,name,size,color,price,image}]}` | Add optional variant attributes, stock, currency and product type for new catalog backends |
| Payment | Stripe Checkout route + Stripe webhook | New payment providers require new checkout and verified webhook handlers |
| Fulfillment | Printful paid-order submission | Add fulfillment routing and provider-specific order IDs; separate from product source |
| Orders | Stripe & Printful are sources of record; no local DB | Add durable order/outbox for multi-fulfiller scenarios and larger volume |

**Integration limitation:** This is architecturally prepared for new adapters, but only the Printful→Stripe→Printful path is implemented. A catalog provider is not automatically a fulfillment provider. Do NOT enable live checkout with a non-Printful provider without implementing and testing a compatible fulfillment handler.

## Launch and scale

1. Start with a real Printful API store and no fictional catalog entries. Products appear only when connected and published.
2. Add other product categories and variants based on provider data, not hardcoded shirt-specific UI.
3. For a larger catalog, replace the current Printful `limit=24` with pagination, caching and rate-limit management.
4. When integrating other backends, introduce a durable orders table, reserve/commit workflow and webhook-backed async fulfillment. Split orders by fulfillment provider with product/variant ownership.
5. Do not treat a static preview image or source syntax tests as a successfully compiled or deployed SvelteKit app.

## Preview

Open `preview.html` in a browser for an offline static representation of the store's current default empty-catalog state. This is not a running SvelteKit application, and cannot submit orders.
