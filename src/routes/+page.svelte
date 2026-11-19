<script>
  import { onMount } from 'svelte';
  export let data;

  let cart = [];
  let cartOpen = false;
  let selectedProduct = null;
  let selectedVariantId = null;
  let checkoutBusy = false;
  let checkoutError = '';
  let productFilter = 'All products';
  let search = '';
  const price = amount => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  $: itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  $: subtotal = cart.reduce((sum, item) => sum + item.quantity * item.price, 0);
  $: selectedVariant = selectedProduct?.variants?.find(v => v.id === selectedVariantId);
  $: categories = ['All products', ...new Set(data.products.map(p => p.category).filter(Boolean))];
  $: visibleProducts = data.products.filter(p => (productFilter === 'All products' || p.category === productFilter) &&
    (!search.trim() || `${p.name} ${p.description || ''} ${p.category || ''}`.toLowerCase().includes(search.trim().toLowerCase())));

  onMount(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('basednut-cart-v2') || '[]');
      if (Array.isArray(saved)) cart = saved.filter(item => item && Number.isSafeInteger(item.variantId) && item.quantity > 0 && item.quantity <= 10 && data.products.some(p => p.variants.some(v => v.id === item.variantId)));
    } catch { cart = []; }
    if (new URLSearchParams(window.location.search).has('cart')) cartOpen = true;
  });
  function rememberCart() {
    cart = [...cart];
    try { localStorage.setItem('basednut-cart-v2', JSON.stringify(cart)); } catch { /* cart remains usable in memory */ }
  }
  function openProduct(p) { selectedProduct = p; selectedVariantId = p.variants[0]?.id ?? null; }
  function addToCart() {
    if (!selectedProduct || !selectedVariant) return;
    const existing = cart.find(c => c.variantId === selectedVariant.id);
    if (existing) existing.quantity = Math.min(10, existing.quantity + 1);
    else cart.push({variantId: selectedVariant.id, name: selectedProduct.name,
      variantName: [selectedVariant.color, selectedVariant.size].filter(Boolean).join(' / ') || selectedVariant.name,
      price: selectedVariant.price, image: selectedVariant.image || selectedProduct.image, quantity: 1});
    rememberCart(); selectedProduct = null; cartOpen = true; checkoutError = '';
  }
  function changeQuantity(variantId, delta) {
    const item = cart.find(c => c.variantId === variantId);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) cart = cart.filter(c => c.variantId !== variantId);
    else item.quantity = Math.min(10, item.quantity);
    rememberCart();
  }
  async function checkout() {
    if (!data.checkoutEnabled || !cart.length || checkoutBusy) return;
    checkoutBusy = true; checkoutError = '';
    try {
      const response = await fetch('/api/checkout', {method:'POST', headers:{'content-type':'application/json'},
        body:JSON.stringify({items:cart.map(c => ({variantId:c.variantId, quantity:c.quantity}))})});
      const result = await response.json();
      if (!response.ok || !result.url) throw new Error(result.error || 'Checkout could not be started.');
      window.location.assign(result.url);
    } catch (error) { checkoutError = error.message || 'Checkout unavailable.'; checkoutBusy = false; }
  }
</script>

<svelte:head>
  <title>BASED NUT | The Store</title>
  <meta name="description" content="Based Nut's corner of the Orchard. Go absolutely nuts. Products appear when the official store catalog opens." />
  <meta property="og:title" content="BASED NUT — Go absolutely nuts" />
  <meta property="og:description" content="A new branch of the Orchard. The Based Nut store." />
</svelte:head>

<div class="announcement"><span>🌰</span> EVERY FOREST STARTS WITH ONE NUT <span>🌱</span></div>
<header class="site-header" id="top">
  <a href="/" class="brand" aria-label="Based Nut Store home"><span class="brand-mark" aria-hidden="true">🌰</span><span class="brand-type">BASED NUT<small>THE STORE · ON BASE</small></span></a>
  <nav aria-label="Store navigation">
    <a href="#shop">Shop</a><a href="#about">Our world</a><a href="https://orchard.basednut.com/" target="_blank" rel="noopener noreferrer">The Orchard ↗</a>
  </nav>
  <button class="bag-button" on:click={() => cartOpen = true} aria-label={`Open shopping bag with ${itemCount} items`}><span>Bag</span><b>{itemCount}</b></button>
</header>

<main>
  <section class="hero" aria-labelledby="hero-title">
    <div class="hero-copy">
      <div class="eyebrow"><span class="seed-icon">✤</span> A NEW BRANCH OF THE ORCHARD</div>
      <h1 id="hero-title">GO<br/><span>ABSOLUTELY</span><br/>NUTS<span class="dot">.</span></h1>
      <p>The Based Nut store. Rooted in the Orchard, grown with an unreasonable amount of personality.</p>
      <a class="primary-cta" href="#shop">Explore the store <span aria-hidden="true">↗</span></a>
      <div class="hero-footnote">BASED NUT <span>✦</span> EVERY FOREST STARTS WITH ONE NUT</div>
    </div>
    <div class="hero-illustration" aria-hidden="true">
      <div class="illustration-frame">
        <div class="seal-top">THE ORCHARD <span>·</span> BASED NUT</div>
        <div class="tree-illustration"><div class="sun"></div><div class="hill far"></div><div class="hill near"></div><div class="tree"><div class="tree-crown crown-a"></div><div class="tree-crown crown-b"></div><div class="tree-crown crown-c"></div><div class="tree-trunk"></div></div><span class="falling-nut nut-a">🌰</span><span class="falling-nut nut-b">🌰</span><span class="falling-nut nut-c">🌰</span></div>
        <div class="seal-bottom"><span>ROOTED IN CHAOS</span><span>EST. IN THE ORCHARD</span></div>
      </div>
      <span class="hero-small-nut" aria-hidden="true">✷</span>
    </div>
  </section>

  <div class="ribbon" aria-label="Store identity"><span>🌰</span> ONE NUT. MANY BRANCHES. <span>✻</span> A LITTLE BIT OF CHAOS. <span>🌳</span> ONE NUT. MANY BRANCHES. <span>✻</span></div>

  <section id="shop" class="shop-section" aria-labelledby="shop-title">
    <div class="shop-heading">
      <div><div class="eyebrow">THE ORCHARD / THE STORE</div><h2 id="shop-title">The good stuff<span>.</span></h2><p>Whatever grows here, you'll find it below.</p></div>
      <div class="shelf-count">{data.products.length.toString().padStart(2, '0')} <span>IN THE SHOP</span></div>
    </div>

    {#if data.catalogError}<div class="catalog-alert" role="status">The store catalog is temporarily unavailable. Please check back later.</div>{/if}
    {#if data.products.length}
      <div class="catalog-toolbar">
        <div class="category-filter" role="group" aria-label="Product categories">
          {#each categories as category}
            <button class:active={productFilter === category} on:click={() => productFilter = category}>{category}</button>
          {/each}
        </div>
        <label class="catalog-search"><span class="sr-only">Search products</span><input bind:value={search} type="search" placeholder="Search the store…" /></label>
      </div>
      <div class="product-grid">
        {#each visibleProducts as product (product.id)}
          <article class="product-card">
            <button class="product-image" on:click={() => openProduct(product)} aria-label={`View ${product.name}`}>
              {#if product.image}<img src={product.image} alt={product.name} loading="lazy" />{:else}<div class="image-empty" aria-hidden="true">🌰</div>{/if}
            </button>
            <div class="product-meta"><div><p class="product-category">{product.category || 'THE STORE'}</p><h3>{product.name}</h3></div><b>{price(Math.min(...product.variants.map(v => v.price)))}</b></div>
            <button class="product-view" on:click={() => openProduct(product)}>See details <span>↗</span></button>
          </article>
        {/each}
      </div>
      {#if !visibleProducts.length}<div class="no-results">Nothing matches that search.</div>{/if}
    {:else if !data.catalogError}
      <div class="empty-catalog">
        <div class="empty-symbol" aria-hidden="true">🌱</div>
        <div><span class="eyebrow">THE FIRST SEED IS STILL GROWING</span><h3>Nothing has dropped <i>yet.</i></h3><p>Our shelves are taking root. Come back soon to see what grows.</p></div>
        <a href="https://basednut.com" target="_blank" rel="noopener noreferrer">Discover Based Nut <span>↗</span></a>
      </div>
    {/if}
  </section>

  <section class="orchard-section" id="about">
    <div class="orchard-copy"><div class="eyebrow">SAME ROOTS. A NEW BRANCH.</div><h2>Every forest starts with <em>one nut.</em></h2><p>The store is part of the wider Based Nut universe. Wander into the Orchard, explore the project, or just enjoy the nonsense.</p><div class="world-links"><a href="https://orchard.basednut.com/" target="_blank" rel="noopener noreferrer">Explore the Orchard ↗</a><a href="https://docs.basednut.com/" target="_blank" rel="noopener noreferrer">Read the docs ↗</a></div></div>
    <div class="orchard-stamp" aria-hidden="true"><span>🌰</span><strong>BASED<br/>NUT</strong><small>THE ORCHARD</small></div>
  </section>
</main>

<footer class="site-footer"><div class="footer-row"><a href="/" class="footer-name">BASED NUT <span>🌰</span></a><div><a href="https://basednut.com/">Website ↗</a><a href="https://orchard.basednut.com/">Orchard ↗</a><a href="https://docs.basednut.com/">Docs ↗</a></div></div><div class="footer-lower"><span>© {new Date().getFullYear()} BASED NUT</span><strong>GO ABSOLUTELY NUTS.</strong><span>PLEASE NUT RESPONSIBLY.</span></div></footer>

{#if selectedProduct}
<div class="overlay" role="presentation">
  <button class="overlay-backdrop" aria-label="Close product" on:click={() => selectedProduct = null}></button>
  <section class="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-title">
    <button class="close-button" on:click={() => selectedProduct = null} aria-label="Close product">×</button>
    <div class="modal-image">{#if selectedVariant?.image || selectedProduct.image}<img src={selectedVariant?.image || selectedProduct.image} alt={selectedProduct.name}/>{:else}<span>🌰</span>{/if}</div>
    <div class="modal-content"><p class="eyebrow">BASED NUT / THE STORE</p><h2 id="product-title">{selectedProduct.name}</h2><p>{selectedProduct.description}</p><label for="variant-choice">Choose an option</label><select id="variant-choice" bind:value={selectedVariantId}>{#each selectedProduct.variants as v}<option value={v.id}>{[v.color,v.size].filter(Boolean).join(' / ') || v.name} — {price(v.price)}</option>{/each}</select><button class="primary-cta modal-add" disabled={!selectedVariant} on:click={addToCart}>Add to bag — {selectedVariant ? price(selectedVariant.price) : 'Unavailable'} <span>↗</span></button></div>
  </section>
</div>
{/if}
{#if cartOpen}
<div class="overlay" role="presentation">
  <button class="overlay-backdrop" aria-label="Close shopping bag" on:click={() => cartOpen = false}></button>
  <section class="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="bag-title">
    <header><h2 id="bag-title">Your bag <small>({itemCount})</small></h2><button class="close-button" aria-label="Close shopping bag" on:click={() => cartOpen = false}>×</button></header>
    {#if cart.length}<div class="bag-items">{#each cart as item (item.variantId)}<div class="bag-item">{#if item.image}<img src={item.image} alt={item.name} />{:else}<span>🌰</span>{/if}<div><strong>{item.name}</strong><small>{item.variantName}</small><p>{price(item.price)}</p><div class="quantity"><button aria-label="Remove one" on:click={() => changeQuantity(item.variantId,-1)}>−</button><b>{item.quantity}</b><button aria-label="Add one" on:click={() => changeQuantity(item.variantId,1)}>+</button></div></div></div>{/each}</div><div class="bag-footer"><div><span>Subtotal</span><strong>{price(subtotal)}</strong></div><p>Shipping and applicable taxes are calculated at checkout.</p>{#if checkoutError}<p role="alert">{checkoutError}</p>{/if}<button class="primary-cta" disabled={!data.checkoutEnabled || checkoutBusy} on:click={checkout}>{checkoutBusy ? 'Starting checkout…' : data.checkoutEnabled ? 'Secure checkout' : 'Checkout not live'} <span>↗</span></button>{#if !data.checkoutEnabled}<small>Payments are disabled until the store is configured and verified.</small>{/if}</div>
    {:else}<div class="bag-empty"><span>🌰</span><h3>A very empty bag.</h3><p>Good things take root.</p><button class="primary-cta" on:click={() => {cartOpen = false; document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});}}>Back to the store <span>↗</span></button></div>{/if}
  </section>
</div>
{/if}
