'use strict';

const API_URL = 'https://fakestoreapi.com/products';
const TAX_RATE = 0.05;
const FREE_SHIPPING_THRESHOLD = 5000;
const SHIPPING_FEE = 99;
const STORAGE_KEY = 'shopease-cart-v1';

const state = {
  products: [],
  category: 'all',
  search: '',
  sort: 'featured',
  cart: loadCart()
};

const $ = (selector) => document.querySelector(selector);
const productGrid = $('#productGrid');
const statusMessage = $('#statusMessage');
const resultsLabel = $('#resultsLabel');
const cartDrawer = $('#cartDrawer');
const drawerBackdrop = $('#drawerBackdrop');
const checkoutDialog = $('#checkoutDialog');
const successDialog = $('#successDialog');
let toastTimer;

function money(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter(item =>
      Number.isInteger(item.id) && Number.isInteger(item.quantity) && item.quantity > 0
    ) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
  } catch {
    showToast('Cart is available for this session only.');
  }
}

function categoryLabel(category) {
  return category === "men's clothing" ? "Men's clothing" :
    category === "women's clothing" ? "Women's clothing" :
    category === 'jewelery' ? 'Jewelry' :
    category.charAt(0).toUpperCase() + category.slice(1);
}

function badgeFor(product) {
  if (product.rating && product.rating.rate >= 4.5) return 'Top rated';
  if (product.price < 25) return 'Great find';
  return '';
}

async function fetchProducts() {
  statusMessage.textContent = 'Connecting to the product catalog…';
  statusMessage.classList.remove('error');
  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`API responded with ${response.status}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Unexpected product data');
    state.products = data.map(product => ({
      ...product,
      // FakeStoreAPI prices are in USD; this demo uses a simple display conversion.
      price: Number(product.price) * 83.5
    }));
    statusMessage.textContent = '';
    renderProducts();
    renderCart();
  } catch (error) {
    console.error('Unable to load products:', error);
    statusMessage.classList.add('error');
    statusMessage.innerHTML = 'Could not load products. Check your internet connection and <button class="inline-retry" id="retryBtn" type="button">try again</button>.';
    $('#retryBtn')?.addEventListener('click', fetchProducts);
    resultsLabel.textContent = 'Catalog unavailable';
  }
}

function getVisibleProducts() {
  let products = [...state.products];
  if (state.category !== 'all') products = products.filter(p => p.category === state.category);
  const search = state.search.trim().toLowerCase();
  if (search) products = products.filter(p =>
    p.title.toLowerCase().includes(search) ||
    p.category.toLowerCase().includes(search) ||
    p.description.toLowerCase().includes(search)
  );
  if (state.sort === 'price-low') products.sort((a, b) => a.price - b.price);
  if (state.sort === 'price-high') products.sort((a, b) => b.price - a.price);
  if (state.sort === 'rating') products.sort((a, b) => (b.rating?.rate || 0) - (a.rating?.rate || 0));
  return products;
}

function renderProducts() {
  const products = getVisibleProducts();
  resultsLabel.textContent = `${products.length} ${products.length === 1 ? 'item' : 'items'}`;
  statusMessage.textContent = products.length ? '' : 'No products match your search. Try another term or category.';
  productGrid.innerHTML = products.map(product => {
    const badge = badgeFor(product);
    return `<article class="product-card">
      <div class="product-image-wrap">
        ${badge ? `<span class="product-badge">${escapeHtml(badge)}</span>` : ''}
        <img class="product-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.title)}" loading="lazy" />
        <button class="quick-add" type="button" data-add="${product.id}" aria-label="Add ${escapeHtml(product.title)} to cart" title="Add to cart">+</button>
      </div>
      <p class="product-category">${escapeHtml(categoryLabel(product.category))}</p>
      <h3 class="product-title" title="${escapeHtml(product.title)}">${escapeHtml(product.title)}</h3>
      <div class="product-bottom"><span class="product-price">${money(product.price)}</span>
        <span class="product-rating" aria-label="Rating ${product.rating?.rate || 'not rated'} out of 5">★ ${Number(product.rating?.rate || 0).toFixed(1)} <span>(${product.rating?.count || 0})</span></span>
      </div>
    </article>`;
  }).join('');
}

function addToCart(id) {
  const product = state.products.find(p => p.id === id);
  if (!product) return;
  const existing = state.cart.find(item => item.id === id);
  if (existing) existing.quantity += 1;
  else state.cart.push({ id, quantity: 1 });
  saveCart();
  renderCart();
  showToast(`${product.title} added to your cart`);
}

function updateQuantity(id, change) {
  const item = state.cart.find(entry => entry.id === id);
  if (!item) return;
  item.quantity += change;
  if (item.quantity <= 0) state.cart = state.cart.filter(entry => entry.id !== id);
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  state.cart = state.cart.filter(item => item.id !== id);
  saveCart();
  renderCart();
  showToast('Item removed from cart');
}

function cartDetails() {
  const items = state.cart.map(item => {
    const product = state.products.find(p => p.id === item.id);
    return product ? { ...product, quantity: item.quantity } : null;
  }).filter(Boolean);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * TAX_RATE;
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  return { items, subtotal, tax, shipping, total: subtotal + tax + shipping };
}

function renderCart() {
  const { items, subtotal, tax, shipping, total } = cartDetails();
  const count = items.reduce((sum, item) => sum + item.quantity, 0);
  $('#cartCount').textContent = count;
  $('#drawerItemCount').textContent = `(${count})`;
  $('#cartItems').innerHTML = items.map(item => `
    <article class="cart-item">
      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" />
      <div><h3 class="cart-item-title">${escapeHtml(item.title)}</h3>
        <p class="cart-item-price">${money(item.price * item.quantity)}</p>
        <div class="quantity-control" aria-label="Quantity controls">
          <button type="button" data-qty="${item.id}" data-change="-1" aria-label="Decrease quantity">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-qty="${item.id}" data-change="1" aria-label="Increase quantity">+</button>
        </div>
      </div>
      <button class="remove-item" type="button" data-remove="${item.id}" aria-label="Remove ${escapeHtml(item.title)}">×</button>
    </article>`).join('');
  $('#emptyCart').hidden = items.length > 0;
  $('#cartSummary').hidden = items.length === 0;
  $('#subtotalValue').textContent = money(subtotal);
  $('#taxValue').textContent = money(tax);
  $('#shippingValue').textContent = shipping ? money(shipping) : 'Free';
  $('#totalValue').textContent = money(total);
  $('#shippingNote').textContent = subtotal >= FREE_SHIPPING_THRESHOLD
    ? 'Your order qualifies for free shipping!'
    : `Free shipping on orders of ${money(FREE_SHIPPING_THRESHOLD)} or more.`;
  $('#checkoutBtn').disabled = items.length === 0;
  $('#dialogTotal').textContent = money(total);
}

function openCart() {
  cartDrawer.classList.add('open');
  drawerBackdrop.classList.add('open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  $('#openCartBtn').setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  $('#closeCartBtn').focus();
}

function closeCart() {
  cartDrawer.classList.remove('open');
  drawerBackdrop.classList.remove('open');
  cartDrawer.setAttribute('aria-hidden', 'true');
  $('#openCartBtn').setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  $('#openCartBtn').focus();
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function selectCategory(category) {
  state.category = category;
  document.querySelectorAll('.filter-btn').forEach(button => {
    const active = button.dataset.category === category;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderProducts();
}

$('#searchForm').addEventListener('submit', event => {
  event.preventDefault();
  state.search = $('#searchInput').value;
  renderProducts();
  $('#catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
$('#searchInput').addEventListener('input', event => {
  state.search = event.target.value;
  renderProducts();
});
document.querySelectorAll('.filter-btn').forEach(button => {
  button.setAttribute('aria-pressed', String(button.classList.contains('active')));
  button.addEventListener('click', () => selectCategory(button.dataset.category));
});
$('#sortSelect').addEventListener('change', event => {
  state.sort = event.target.value;
  renderProducts();
});
productGrid.addEventListener('click', event => {
  const button = event.target.closest('[data-add]');
  if (button) addToCart(Number(button.dataset.add));
});
$('#cartItems').addEventListener('click', event => {
  const qtyButton = event.target.closest('[data-qty]');
  const removeButton = event.target.closest('[data-remove]');
  if (qtyButton) updateQuantity(Number(qtyButton.dataset.qty), Number(qtyButton.dataset.change));
  if (removeButton) removeFromCart(Number(removeButton.dataset.remove));
});
$('#openCartBtn').addEventListener('click', openCart);
$('#closeCartBtn').addEventListener('click', closeCart);
$('#continueShoppingBtn').addEventListener('click', closeCart);
drawerBackdrop.addEventListener('click', closeCart);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && cartDrawer.classList.contains('open')) closeCart();
});
$('#checkoutBtn').addEventListener('click', () => {
  if (!state.cart.length) return;
  $('#dialogTotal').textContent = money(cartDetails().total);
  checkoutDialog.showModal();
});
$('#checkoutForm').addEventListener('submit', event => {
  event.preventDefault();
  if (!$('#customerName').value.trim() || !$('#customerEmail').validity.valid || !$('#customerAddress').value.trim()) {
    $('#checkoutForm').reportValidity();
    return;
  }
  const name = $('#customerName').value.trim();
  const orderId = `SE-${Date.now().toString().slice(-8)}`;
  $('#successName').textContent = name.split(/\s+/)[0];
  $('#successMessage').textContent = `Your demo order total is ${money(cartDetails().total)}. No payment has been collected.`;
  $('#orderNumber').textContent = `Order reference: ${orderId}`;
  checkoutDialog.close();
  successDialog.showModal();
  state.cart = [];
  saveCart();
  renderCart();
  $('#checkoutForm').reset();
});
successDialog.addEventListener('close', () => {
  if (!successDialog.open) {
    if (cartDrawer.classList.contains('open')) closeCart();
  }
});
$('#year').textContent = new Date().getFullYear();

fetchProducts();
