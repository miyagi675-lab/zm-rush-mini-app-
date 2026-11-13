const productTypes = new Map([
  ['model', {label: 'Модель', draftName: 'модель скина'}],
  ['hat', {label: 'Шапка', draftName: 'аксессуар'}],
  ['weapon', {label: 'Оружие', draftName: 'модель оружия'}],
]);
const periods = new Map([
  ['day', 'день'],
  ['week', 'неделя'],
  ['month', 'месяц'],
  ['year', 'год'],
]);

export function purchaseDraft(entry, seller) {
  const type = productTypes.get(entry?.type ?? entry?.purchaseType ?? 'hat');
  if (!type || !entry?.id || !entry.name) return null;

  const text = `Здравствуйте! Хочу купить ${type.draftName} „${entry.name}“ на сервере ZMRush.`;
  const url = new URL(seller);
  url.search = '';
  url.hash = '';
  return {text, url: url.href + '?text=' + encodeURIComponent(text)};
}

function productPrice(price) {
  if (!price || !Number.isFinite(price.amount) || price.amount <= 0) return 'Цена по запросу';

  const amount = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: price.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price.amount);
  const period = periods.get(price.period);
  return period ? amount + ' / ' + period : amount;
}

export function setupPurchase(getProducts, isBusy) {
  const buy = document.getElementById('buy');
  const seller = buy.dataset.sellerUrl;
  const options = document.getElementById('purchase-options');
  const name = document.getElementById('purchase-name');
  const price = document.getElementById('purchase-price');
  const choices = new Map();
  let selectedType = 'model';
  let draft = null;

  for (const [type, {label}] of productTypes) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.productType = type;
    button.textContent = label;
    button.onclick = () => refresh(type);
    options.append(button);
    choices.set(type, button);
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

    const product = products.get(selectedType);
    name.textContent = product?.name || 'Товар не выбран';
    price.hidden = !product;
    price.textContent = product ? productPrice(product.price) : '';
    draft = busy ? null : purchaseDraft(product, seller);
    buy.setAttribute('aria-disabled', String(!draft));
    if (draft) {
      buy.href = draft.url;
      buy.setAttribute('aria-label', 'Купить: ' + product.name);
    } else {
      buy.removeAttribute('href');
      buy.removeAttribute('aria-label');
    }
  }

  buy.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    if (isBusy() || !draft) return;

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

  refresh();
  return {refresh};
}
