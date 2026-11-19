import test from 'node:test';
import assert from 'node:assert/strict';
import { usdCents, normalizeProduct, validateCart } from '../src/lib/server/catalog.js';

test('currency conversion is exact and rejects unpriced products', () => {
  assert.equal(usdCents('29.99'), 2999);
  assert.equal(usdCents('30'), 3000);
  assert.equal(usdCents('0'), null);
  assert.equal(usdCents('10.234'), null);
  assert.equal(usdCents(null), null);
  assert.equal(usdCents('NaN'), null);
});
const fixture = {
  sync_product: { id: 55, name: 'BasedNut Test Shirt', thumbnail_url: 'https://example.com/mockup.png', is_ignored: false },
  sync_variants: [
    { id: 177, name: 'BasedNut Test Shirt - Black / M', synced: true, is_ignored: false, currency: 'USD', retail_price: '29.99', files: [] },
    { id: 178, name: 'BasedNut Test Shirt - Black / L', synced: false, currency: 'USD', retail_price: '29.99' },
    { id: 179, name: 'BasedNut Test Shirt - White / XL', synced: true, currency: 'USD', retail_price: null }
  ]
};

test('Printful normalization includes only synced, priced USD variants', () => {
  const p = normalizeProduct(fixture);
  assert.equal(p.variants.length, 1);
  assert.equal(p.variants[0].id, 177);
  assert.equal(p.variants[0].size, 'M');
  assert.equal(p.variants[0].color, 'Black');
  assert.equal(p.variants[0].price, 29.99);
});
test('checkout prices come from current server-side catalog, never client input', () => {
  const p = normalizeProduct(fixture);
  const cart = validateCart([{ variantId: 177, quantity: 2, price: 0.01 }], [p]);
  assert.equal(cart[0].price, 29.99);
  assert.equal(cart[0].quantity, 2);
});
test('unavailable variants and invalid quantities cannot enter checkout', () => {
  const p = normalizeProduct(fixture);
  assert.throws(() => validateCart([{ variantId: 179, quantity: 1 }], [p]));
  assert.throws(() => validateCart([{ variantId: 177, quantity: 11 }], [p]));
  assert.throws(() => validateCart([{ variantId: 177, quantity: 9 }, { variantId: 177, quantity: 9 }], [p]));
  assert.throws(() => validateCart([], [p]));
});

test('preview contains no invented product fixtures or fake prices', async () => {
  const { readFileSync } = await import('node:fs');
  const markup = readFileSync(new URL('../preview.html', import.meta.url), 'utf8');
  const server = readFileSync(new URL('../src/routes/+page.server.js', import.meta.url), 'utf8');
  assert.match(markup, /GO<br><span>ABSOLUTELY<\/span><br>NUTS/);
  assert.match(markup, /Nothing has dropped/);
  assert.doesNotMatch(markup, /class="product-card"/);
  assert.doesNotMatch(server, /demoProducts|fictional/i);
});
