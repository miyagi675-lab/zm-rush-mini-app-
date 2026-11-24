import test from 'node:test';
import assert from 'node:assert/strict';
import {cartDraft, summarizeCart} from '../cart.js';
import {checkoutLocale, checkoutLocales} from '../checkout-locales.js';

const monthly = amount => ({amount, currency: 'USD', period: 'month'});
const products = [
  {type: 'model', id: 'dobby', name: 'Добби', nameEn: 'Dobby', price: monthly(30)},
  {type: 'hat', id: 'bunny', name: 'Заяц', nameEn: 'Bunny', price: monthly(8)},
  {type: 'weapon', id: 'knife', name: 'Knife + A & B', price: monthly(9)},
];

test('English checkout translates all template text, periods, product types and names', () => {
  const draft = cartDraft(products, 'https://t.me/name_F1', {locale: 'en'});
  assert.equal(draft.text, 'Hello! I would like to buy these items on ZMRush:\n'
    + '1. Model «Dobby» — $30 / month\n2. Hat «Bunny» — $8 / month\n'
    + '3. Weapon «Knife + A & B» — $9 / month\n\nTotal for priced items: $47 / month');
  const link = new URL(draft.url);
  assert.equal(link.pathname, '/name_F1');
  assert.equal(link.searchParams.get('text'), draft.text);
  assert.equal(link.searchParams.size, 1);
  assert.doesNotMatch(draft.text, /[А-Яа-яЁё]/);
});

test('Russian checkout keeps original names and numeric totals', () => {
  const draft = cartDraft(products, 'https://t.me/name_F1', {locale: 'ru'});
  assert.match(draft.text, /^Здравствуйте!/);
  assert.match(draft.text, /Модель «Добби» — \$30 \/ месяц/);
  assert.match(draft.text, /Шапка «Заяц» — \$8 \/ месяц/);
  assert.match(draft.text, /Итого по указанным ценам: \$47 \/ месяц/);
  assert.deepEqual(summarizeCart(products).totals, [monthly(47)]);
});

test('checkout blocks a long encoded Telegram link without removing products from the draft', () => {
  const items = Array.from({length: 30}, (_, index) => ({
    type: 'model', id: 'long' + index, name: 'Модель «Новогодняя ёлка» ' + index,
    nameEn: 'Tree ' + index, price: monthly(10),
  }));
  const ru = cartDraft(items, 'https://t.me/name_F1', {locale: 'ru'});
  assert.equal(ru.tooLong, true);
  assert.equal(ru.url, null);
  assert.match(ru.text, /Новогодняя ёлка» 29/);
  assert.match(ru.text, /\$300 \/ месяц/);
  const en = cartDraft(items, 'https://t.me/name_F1', {locale: 'en'});
  assert.equal(new URL(en.url).searchParams.get('text'), en.text);
  const reduced = cartDraft(items.slice(0, 10), 'https://t.me/name_F1', {locale: 'ru'});
  assert.equal(new URL(reduced.url).searchParams.get('text'), reduced.text);
});

test('all 20 bot languages cover mixed periods, free and unknown prices', () => {
  assert.equal(Object.keys(checkoutLocales).length, 20);
  const items = [...products,
    {type: 'hat', id: 'forever', name: 'Exclusive', price: {amount: 600, currency: 'USD', period: 'lifetime'}},
    {type: 'model', id: 'free', name: 'CT', price: monthly(0)},
    {type: 'weapon', id: 'unknown', name: 'Unpriced'},
  ];
  for (const [locale, words] of Object.entries(checkoutLocales)) {
    const draft = cartDraft(items, 'https://t.me/name_F1', {locale});
    assert(draft.text.startsWith(words.intro), locale);
    assert(draft.text.includes(words.hat + ' «'), locale);
    assert(draft.text.includes('$47 / ' + words.periods[2]), locale);
    assert(draft.text.includes('$600 · ' + words.periods[4]), locale);
    assert(draft.text.includes('«CT» — ' + words.free), locale);
    assert(draft.text.includes(words.unknownCount + ': 1'), locale);
    assert.equal(new URL(draft.url).searchParams.get('text'), draft.text);
    assert(!draft.text.includes('undefined'), locale);
  }
});

test('language tags normalize and unsupported values preserve Russian fallback', () => {
  assert.equal(checkoutLocale('en-US'), 'en');
  assert.equal(checkoutLocale('pt_BR'), 'pt');
  assert.equal(checkoutLocale('zh-Hans'), 'zh');
  assert.equal(checkoutLocale('ckb'), 'ku');
  assert.equal(checkoutLocale('hinglish'), 'hinglish');
  assert.equal(checkoutLocale('constructor'), null);
  assert.equal(checkoutLocale(null), null);
  assert.equal(cartDraft(products, 'https://t.me/name_F1', {locale: 'bad'}).text,
    cartDraft(products, 'https://t.me/name_F1').text);
  assert.equal(cartDraft([], 'https://t.me/name_F1'), null);
  assert.equal(cartDraft(products, 'https://attacker.example/name_F1'), null);
});
