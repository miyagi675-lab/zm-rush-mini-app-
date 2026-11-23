import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import test from 'node:test';

let moduleId = 0;
const payload = new TextEncoder().encode('preview model data');
const packed = gzipSync(payload);
const response = () => new Response(packed, {headers:{'Content-Length':String(packed.length)}});
async function loader(t, storage, fetcher) {
  const previousFetch = globalThis.fetch;
  const previousCache = Object.getOwnPropertyDescriptor(globalThis, 'caches');
  globalThis.fetch = fetcher;
  Object.defineProperty(globalThis, 'caches', {configurable:true, value:storage});
  t.after(() => {
    globalThis.fetch = previousFetch;
    if (previousCache) Object.defineProperty(globalThis, 'caches', previousCache);
    else delete globalThis.caches;
  });
  return import('../asset-loader.js?test=' + ++moduleId);
}

test('a hanging cache API cannot block a requested model', async t => {
  const start = performance.now();
  let fetchedAt;
  const {loadModel} = await loader(t, {open:()=>new Promise(()=>{})}, async () => {
    fetchedAt = performance.now();
    return response();
  });
  const bytes = await loadModel('weapons-v1/test-model.mdl');
  assert.deepEqual(new Uint8Array(bytes), payload);
  assert(fetchedAt - start < 750, 'The download waited for unavailable storage');
});

test('parallel fits and repeated requests share one decoded buffer', async t => {
  let downloads = 0;
  const {loadModel} = await loader(t, {open:async()=>null}, async () => {
    downloads++;
    return response();
  });
  const [first, second] = await Promise.all([
    loadModel('weapons-v1/test-model.mdl'), loadModel('weapons-v1/test-model.mdl'),
  ]);
  assert.strictEqual(first, second);
  assert.strictEqual(await loadModel('weapons-v1/test-model.mdl'), first);
  assert.equal(downloads, 1);
});

test('a valid disk entry loads without a network request', async t => {
  const {loadModel} = await loader(t, {open:async()=>({match:async()=>response()})}, async () => {
    assert.fail('Cached model was downloaded again');
  });
  assert.deepEqual(new Uint8Array(await loadModel('weapons-v1/test-model.mdl')), payload);
});

test('a corrupted cache entry is removed and replaced from the network', async t => {
  let removed = 0, downloads = 0;
  const cache = {match:async()=>new Response('broken gzip'), delete:async()=>removed++, put:async()=>{}, keys:async()=>[]};
  const {loadModel} = await loader(t, {open:async()=>cache}, async () => {downloads++;return response();});
  assert.deepEqual(new Uint8Array(await loadModel('weapons-v1/test-model.mdl')), payload);
  assert.equal(downloads, 1);
  assert.equal(removed, 1);
});
