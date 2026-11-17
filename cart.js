const productLabels = {
  ru: new Map([['model', 'Модель'], ['hat', 'Шапка'], ['weapon', 'Оружие']]),
  en: new Map([['model', 'Model'], ['hat', 'Hat'], ['weapon', 'Weapon']]),
};
const periods = {
  ru: new Map([
    ['day', 'день'], ['week', 'неделя'], ['month', 'месяц'],
    ['year', 'год'], ['lifetime', 'навсегда'],
  ]),
  en: new Map([
    ['day', 'day'], ['week', 'week'], ['month', 'month'],
    ['year', 'year'], ['lifetime', 'lifetime'],
  ]),
};

export function productKey(product) {
  if (!productLabels.ru.has(product?.type) || typeof product.id !== 'string' || !product.id.trim()) return null;
  return product.type + ':' + product.id;
}

function indexProducts(products) {
  const index = new Map();
  for (const product of products) {
    const key = productKey(product);
    if (key && typeof product.name === 'string' && product.name.trim() && !index.has(key)) {
      index.set(key, product);
    }
  }
  return index;
}

export function restoreCart(savedRefs, catalogProducts) {
  if (!Array.isArray(savedRefs)) return [];
  const catalog = indexProducts(catalogProducts);
  const restored = new Map();
  for (const ref of savedRefs) {
    const key = productKey(ref);
    if (catalog.has(key)) restored.set(key, catalog.get(key));
  }
  return [...restored.values()];
}

function readPrice(price) {
  const currency = price?.currency;
  const period = price?.period ?? null;
  if (!Number.isFinite(price?.amount) || price.amount < 0 ||
      typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency) ||
      (period !== null && !periods.ru.has(period))) return null;

  const cents = Math.round(price.amount * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) return null;
  return {cents, currency, period};
}

export function summarizeCart(products) {
  const groups = new Map();
  let unknownCount = 0;
  for (const product of indexProducts(products).values()) {
    const price = readPrice(product.price);
    if (!price) {
      unknownCount++;
      continue;
    }
    const {cents, currency, period} = price;
    const key = currency + '/' + (period ?? '');
    const group = groups.get(key);
    if (group) group.cents += cents;
    else groups.set(key, {cents, currency, period});
  }
  const totals = [...groups.values()].map(({cents, currency, period}) => ({
    amount: cents / 100,
    currency,
    period,
  }));
  return {totals, unknownCount};
}

function localizedPrice(price, locale) {
  if (price.amount === 0) return locale === 'en' ? 'Free' : 'Бесплатно';
  const amount = new Intl.NumberFormat(locale === 'en' || price.currency === 'USD' ? 'en-US' : 'ru-RU', {
    style: 'currency',
    currency: price.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price.amount);
  const period = periods[locale].get(price.period);
  if (price.period === 'lifetime') return amount + ' · ' + period;
  return period ? amount + ' / ' + period : amount;
}

export function cartDraft(products, seller, {
  locale = 'ru',
  formatPrice = localizedPrice,
} = {}) {
  const entries = [...indexProducts(products).values()];
  if (entries.length === 0) return null;

  let link;
  try {
    link = new URL(seller);
  } catch {
    return null;
  }
  if (link.origin !== 'https://t.me' || link.username || link.password ||
      !/^\/[A-Za-z][A-Za-z0-9_]*\/?$/.test(link.pathname)) return null;

  const lang = locale === 'en' ? 'en' : 'ru';
  const title = lang === 'en'
    ? 'Hello! I would like to buy these items on ZMRush:'
    : 'Здравствуйте! Хочу купить эти товары на сервере ZMRush:';
  const unknown = lang === 'en' ? 'Price on request' : 'Цена по запросу';
  const lines = entries.map((product, index) => {
    const price = readPrice(product.price);
    const label = productLabels[lang].get(product.type);
    const nameEn = typeof product.nameEn === 'string' && product.nameEn.trim();
    const name = (lang === 'en' && nameEn ? nameEn : product.name).replace(/\s+/g, ' ').trim();
    const cost = price
      ? formatPrice({amount: price.cents / 100, currency: price.currency, period: price.period}, lang)
      : unknown;
    return (index + 1) + '. ' + label + ' «' + name + '» — ' + cost;
  });
  const {totals, unknownCount} = summarizeCart(entries);
  if (totals.length) {
    lines.push('', (lang === 'en' ? 'Known prices: ' : 'Итого по указанным ценам: ') +
      totals.map(price => formatPrice(price, lang)).join(' + '));
  }
  if (unknownCount) lines.push((lang === 'en' ? 'Items with price on request: ' : 'Товаров с ценой по запросу: ') + unknownCount);

  const text = [title, ...lines].join('\n');
  link.search = '';
  link.hash = '';
  return {text, url: link.href + '?text=' + encodeURIComponent(text)};
}
