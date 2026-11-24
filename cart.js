import {checkoutLocale, checkoutLocales} from './checkout-locales.js?v=1';

const productTypes = new Set(['model', 'hat', 'weapon']);
const pricePeriods = ['day', 'week', 'month', 'year', 'lifetime'];
const maxDraftCodePoints = 4096;
// Keep the encoded link within an application limit as well. Non-ASCII
// product names can reach this before Telegram's message limit.
const maxDraftUrlLength = 4096;

export function productKey(product) {
  if (!productTypes.has(product?.type) || typeof product.id !== 'string' || !product.id.trim()) return null;
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
      (period !== null && !pricePeriods.includes(period))) return null;

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
  const words = checkoutLocales[locale];
  if (price.amount === 0) return words.free;
  const amount = new Intl.NumberFormat(locale === 'en' || price.currency === 'USD' ? 'en-US' : 'ru-RU', {
    style: 'currency',
    currency: price.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price.amount);
  const period = words.periods[pricePeriods.indexOf(price.period)];
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

  const lang = checkoutLocale(locale) || 'ru';
  const words = checkoutLocales[lang];
  const lines = entries.map((product, index) => {
    const price = readPrice(product.price);
    const label = words[product.type];
    const nameEn = typeof product.nameEn === 'string' && product.nameEn.trim();
    const name = (lang !== 'ru' && nameEn ? nameEn : product.name).replace(/\s+/g, ' ').trim();
    const cost = price
      ? formatPrice({amount: price.cents / 100, currency: price.currency, period: price.period}, lang)
      : words.unknown;
    return (index + 1) + '. ' + label + ' «' + name + '» — ' + cost;
  });
  const {totals, unknownCount} = summarizeCart(entries);
  if (totals.length) {
    lines.push('', words.total + ': ' +
      totals.map(price => formatPrice(price, lang)).join(' + '));
  }
  if (unknownCount) lines.push(words.unknownCount + ': ' + unknownCount);

  const text = [words.intro, ...lines].join('\n');
  link.search = '';
  link.hash = '';
  const url = link.href + '?text=' + encodeURIComponent(text);
  if ([...text].length > maxDraftCodePoints || url.length > maxDraftUrlLength) {
    return {text, url: null, tooLong: true};
  }
  return {text, url};
}
