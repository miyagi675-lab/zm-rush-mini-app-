import {cartDraft, productKey, restoreCart, summarizeCart} from './cart.js?v=1';

const productTypes = new Map([
  ['model', 'Модель'],
  ['hat', 'Шапка'],
  ['weapon', 'Оружие'],
]);
const periods = new Map([
  ['day', 'день'],
  ['week', 'неделя'],
  ['month', 'месяц'],
  ['year', 'год'],
]);

export function productPrice(price) {
  if (!price || !Number.isFinite(price.amount) || price.amount <= 0) return 'Цена по запросу';

  const amount = new Intl.NumberFormat(price.currency === 'USD' ? 'en-US' : 'ru-RU', {
    style: 'currency',
    currency: price.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price.amount);
  const period = periods.get(price.period);
  if (price.period === 'lifetime') return amount + ' · навсегда';
  return period ? amount + ' / ' + period : amount;
}

export function setupPurchase(getProducts, isBusy, catalogProducts) {
  const dialog = document.getElementById('cart-dialog');
  const items = document.getElementById('cart-items');
  const totals = document.getElementById('cart-totals');
  const empty = document.getElementById('cart-empty');
  const add = document.getElementById('cart-add');
  const checkout = document.getElementById('cart-checkout');
  const storageKey = 'zm-rush-cart';
  const counters = document.querySelectorAll('[data-cart-count]');
  const cardCartIcon = document.createElement('template');
  cardCartIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4h2l2.4 11h11.8l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></svg><span aria-hidden="true">+</span>';
  const options = document.getElementById('purchase-options');
  const name = document.getElementById('purchase-name');
  const price = document.getElementById('purchase-price');
  const choices = new Map();
  let selectedType = 'model';
  let selected = null;
  let cart = loadCart();
  let cartKeys = new Set();
  let draft = null;

  for (const [type, label] of productTypes) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.productType = type;
    button.textContent = label;
    button.onclick = () => refresh(type);
    options.append(button);
    choices.set(type, button);
  }

  function loadCart() {
    try {
      return restoreCart(JSON.parse(localStorage.getItem(storageKey) || '[]'), catalogProducts);
    } catch {
      return [];
    }
  }

  function saveCart() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(cart.map(({type, id}) => ({type, id}))));
    } catch {}
    renderCart();
    refresh();
  }

  function addProduct(product) {
    const key = productKey(product);
    if (!key || cartKeys.has(key)) return;
    cart = [...cart, product];
    saveCart();
  }

  function updateCardCartButton(button) {
    const inCart = cartKeys.has(button.dataset.cartKey);
    const label = (inCart ? 'Уже в корзине: ' : 'Добавить в корзину: ') + button.dataset.productName;
    button.disabled = inCart;
    button.lastElementChild.textContent = inCart ? '✓' : '+';
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  function createCartButton(product) {
    const button = document.createElement('button');
    button.className = 'card-cart-button';
    button.type = 'button';
    button.dataset.cartKey = productKey(product);
    button.dataset.productName = product.name;
    button.append(cardCartIcon.content.cloneNode(true));
    button.onclick = event => {
      event.stopPropagation();
      addProduct(product);
    };
    updateCardCartButton(button);
    return button;
  }

  function renderCart() {
    const rows = document.createDocumentFragment();
    for (const product of cart) {
      const row = document.createElement('li');
      row.dataset.cartItem = productKey(product);
      const details = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = product.name;
      const meta = document.createElement('small');
      meta.textContent = productTypes.get(product.type) + ' · ' + productPrice(product.price);
      details.append(title, meta);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'secondary cart-remove';
      remove.dataset.cartRemove = productKey(product);
      remove.textContent = 'Убрать из корзины';
      remove.onclick = () => {
        cart = cart.filter(entry => productKey(entry) !== productKey(product));
        saveCart();
        const next = items.querySelector('[data-cart-remove]') || document.getElementById('cart-close');
        next.focus();
      };
      row.append(details, remove);
      rows.append(row);
    }
    items.replaceChildren(rows);

    const {totals: groups, unknownCount} = summarizeCart(cart);
    totals.replaceChildren();
    for (const group of groups) {
      const line = document.createElement('li');
      line.dataset.cartTotal = group.currency + ':' + (group.period || 'once');
      line.textContent = productPrice(group);
      totals.append(line);
    }
    if (unknownCount) {
      const line = document.createElement('li');
      line.dataset.cartUnknown = '';
      line.textContent = 'Цена по запросу: ' + unknownCount;
      totals.append(line);
    }
    empty.hidden = cart.length > 0;
    document.getElementById('cart-summary').hidden = cart.length === 0;
    checkout.hidden = cart.length === 0;
    for (const counter of counters) counter.textContent = String(cart.length);
    cartKeys = new Set(cart.map(productKey));
    for (const button of document.querySelectorAll('.card-cart-button')) {
      updateCardCartButton(button);
    }
    draft = cartDraft(cart, checkout.dataset.sellerUrl, {formatPrice: productPrice});
    if (draft) checkout.href = draft.url;
    else checkout.removeAttribute('href');
  }

  function refresh(preferredType) {
    const products = new Map(getProducts().filter(Boolean).map(product => [product.type, product]));
    if (products.has(preferredType)) selectedType = preferredType;
    if (!products.has(selectedType) && products.size) selectedType = products.keys().next().value;

    const busy = isBusy();
    options.hidden = products.size < 2;
    for (const [type, button] of choices) {
      button.hidden = !products.has(type);
      button.disabled = busy;
      button.setAttribute('aria-pressed', String(type === selectedType && products.has(type)));
    }

    selected = products.get(selectedType);
    name.textContent = selected?.name || 'Товар не выбран';
    price.hidden = !selected;
    price.textContent = selected ? productPrice(selected.price) : '';
    const inCart = selected && cartKeys.has(productKey(selected));
    add.textContent = inCart ? 'Уже в корзине' : 'Добавить в корзину';
    add.disabled = busy || !selected || Boolean(inCart);
  }

  add.onclick = () => {
    if (!add.disabled && selected) addProduct(selected);
  };
  for (const opener of document.querySelectorAll('[data-cart-open]')) {
    opener.onclick = () => {
      if (!dialog.open) dialog.showModal();
    };
  }
  document.getElementById('cart-close').onclick = () => dialog.close();
  window.addEventListener('storage', event => {
    if (event.key !== storageKey) return;
    cart = loadCart();
    renderCart();
    refresh();
  });

  checkout.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    if (!draft) return;

    const tg = window.Telegram?.WebApp;
    try {
      // iOS Mini App navigation can drop the chat draft.
      if (tg?.platform === 'ios' && tg.openLink) {
        tg.openLink(draft.url, {try_browser: 'safari'});
        return;
      }
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(draft.url);
        return;
      }
    } catch {}
    window.open(draft.url, '_blank', 'noopener,noreferrer');
  };

  renderCart();
  refresh();
  return {refresh, createCartButton};
}
