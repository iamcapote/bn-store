/** Pure normalization functions shared by checkout validation and tests. */

const CATEGORY_COPY = {
  Tees: 'Certified organic, certified unhinged. 100% ring-spun organic cotton (GOTS + OEKO-TEX 100, PETA-approved vegan), soft 5.3 oz single jersey, medium fit. Stanley/Stella blank, printed to order in Black or White, S–3XL. Heads up: runs a size small for US — when in doubt, go bigger. Bigger is the BASED way.',
  Hoodies: 'Heavyweight organic armor for the nut ahead of schedule. 350 g/m² of GOTS-certified organic cotton, double-layered hood for maximum lurk, pouch pocket rated for emergency trail mix, regular fit S–2XL. OEKO-TEX 100, PETA-vegan, printed to order. Runs a size small for US — size up or live with regret.',
  Stickers: 'Slap-grade vinyl for surfaces that deserve better. High-opacity, bubble-free, 95µ durable adhesive film, kiss-cut in four sizes — 3″, 4″, 5.5″, and the 15″×3.75″ laptop banner. Impossible to see through, hard to argue with. Clean the surface first — even nuts have standards.'
};
function describeProduct(category) { return CATEGORY_COPY[category] || 'Printed to order by the Orchard. 100% BASED.'; }
export function usdCents(value) {
  const raw = String(value ?? '').trim();
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(raw)) return null;
  const [dollars, fraction = ''] = raw.split('.');
  const cents = Number(dollars) * 100 + Number(fraction.padEnd(2, '0'));
  return cents > 0 && cents <= 10000000 ? cents : null;
}
export function normalizeProduct(detail) {
  const product = detail?.sync_product;
  if (!product || product.is_ignored) return null;
  const variants = (detail.sync_variants ?? []).filter(v => v.synced && !v.is_ignored &&
    v.currency === 'USD' && usdCents(v.retail_price) !== null).map(v => {
    // Structured size/color first (sync variants carry both); name-parsing only as fallback.
    const option = String(v.name || '').split(/ [-–—] /).slice(1).join(' - ');
    const chunks = option.split(' / ').map(s => s.trim()).filter(Boolean);
    const size = v.size || chunks.at(-1) || 'One size';
    const color = v.color || (chunks.length > 1 ? chunks.slice(0, -1).join(' / ') : 'Default');
    const image = (v.files || []).find(f => f.type === 'preview' && f.preview_url)?.preview_url
      || (v.files || []).find(f => f.preview_url)?.preview_url
      || null;
    return {
      id: Number(v.id),
      name: String(v.name || ''),
      size, color,
      price: usdCents(v.retail_price) / 100,
      image: image || product.thumbnail_url || v.product?.image || null
    };
  });
  if (!variants.length) return null;
  const productName = String(product.name || 'Unnamed product');
  const category = /sticker/i.test(productName) ? 'Stickers'
    : /hoodie/i.test(productName) ? 'Hoodies'
    : /tee|t-shirt|shirt/i.test(productName) ? 'Tees'
    : null;
  return {
    id: Number(product.id),
    name: productName,
    description: describeProduct(category),
    category,
    source: 'printful',
    image: product.thumbnail_url || variants[0].image,
    label: 'PRINTFUL',
    isDemo: false,
    variants
  };
}
export function validateCart(raw, products) {
  if (!Array.isArray(raw) || raw.length < 1 || raw.length > 12) throw new Error('Cart must contain 1–12 variants.');
  const indexed = new Map(products.flatMap(p => p.variants.map(v => [v.id, { ...v, product: p }])));
  const merged = new Map();
  for (const item of raw) {
    const variantId = Number(item?.variantId);
    const qty = Number(item?.quantity);
    if (!Number.isSafeInteger(variantId) || !Number.isSafeInteger(qty) || qty < 1 || qty > 10) throw new Error('Invalid cart item.');
    const variant = indexed.get(variantId);
    if (!variant || variant.product.isDemo) throw new Error('A selected variant is unavailable.');
    const nextQty = (merged.get(variantId)?.quantity || 0) + qty;
    if (nextQty > 10) throw new Error('Maximum ten of each variant per order.');
    merged.set(variantId, { ...variant, quantity: nextQty });
  }
  return [...merged.values()];
}
