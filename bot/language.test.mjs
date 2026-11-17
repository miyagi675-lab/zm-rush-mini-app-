import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import worker, {home, card} from './worker.js';
import {checkoutLocales} from '../checkout-locales.js';

const token = '12345:fake-test-token';
const origin = 'https://zmrush.pages.dev';
const endpoint = 'https://example.com/catalog-language';
function initData(id = 42, date = Math.floor(Date.now() / 1000)) {
  const values = new URLSearchParams({auth_date: String(date), query_id: 'test',
    user: JSON.stringify({id, first_name: 'A + B & C', language_code: 'ru'}), signature: 'test-signature'});
  values.sort();
  const secret = createHmac('sha256', 'WebAppData').update(token).digest();
  const data = [...values].map(([key, value]) => key + '=' + value).join('\n');
  values.set('hash', createHmac('sha256', secret).update(data).digest('hex'));
  return values.toString();
}
const request = data => new Request(endpoint, {method: 'POST', headers: {origin, 'content-type': 'application/json'}, body: JSON.stringify({initData: data})});

test('catalog links carry the chosen language and preserve the weapons tab', () => {
  for (const language of Object.keys(checkoutLocales)) {
    const link = new URL(home(language).reply_markup.inline_keyboard[1][0].web_app.url);
    assert.equal(link.searchParams.get('lang'), language);
    const weapons = new URL(card(3, language).reply_markup.inline_keyboard[0][0].web_app.url);
    assert.equal(weapons.searchParams.get('lang'), language);
    assert.equal(weapons.searchParams.get('tab'), 'weapons');
  }
});

test('verified Mini App reads the saved bot language rather than the Telegram UI language', async () => {
  for (const language of Object.keys(checkoutLocales)) {
    const reads = [];
    const response = await worker.fetch(request(initData()), {BOT_TOKEN: token, ZMRUSH_LANGUAGES: {
      get: async key => {reads.push(key);return language;},
    }});
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {language});
    assert.deepEqual(reads, ['lang:42']);
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }
});

test('tampered, expired, future and duplicate user data cannot read preferences', async () => {
  let reads = 0;
  const env = {BOT_TOKEN: token, ZMRUSH_LANGUAGES: {get: async () => {reads++;return 'en';}}};
  const tampered = new URLSearchParams(initData());
  tampered.set('user', JSON.stringify({id: 43}));
  for (const data of [tampered.toString(), initData(42, 1), initData(42, Math.floor(Date.now()/1000)+3600),
    initData() + '&user=' + encodeURIComponent('{"id":43}'), '', 'hash=bad']) {
    assert.equal((await worker.fetch(request(data), env)).status, 401);
  }
  assert.equal(reads, 0);
});

test('only the two catalog origins get CORS access', async () => {
  for (const allowed of [origin, 'https://miyagi675-lab.github.io']) {
    const response = await worker.fetch(new Request(endpoint, {method: 'OPTIONS', headers: {origin: allowed}}), {});
    assert.equal(response.status, 204);
    assert.equal(response.headers.get('access-control-allow-origin'), allowed);
  }
  const response = await worker.fetch(new Request(endpoint, {method: 'OPTIONS', headers: {origin: 'https://attacker.example'}}), {});
  assert.equal(response.status, 403);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});
