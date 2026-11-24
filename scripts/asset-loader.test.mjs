import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import test from 'node:test';

let moduleId = 0;
const payload = new Uint8Array(readFileSync(new URL('../assets/hats/bunny.mdl', import.meta.url)));
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

test('a gzip archive with a malformed MDL does not enter either cache', async t => {
  const malformed = Buffer.from(payload);
  malformed.writeInt32LE(malformed.length - 1, 208); // Body table lacks room for its records.
  let stored = 0;
  let downloads = 0;
  let retryCacheMode;
  const cache = {
    match:async () => null, delete:async () => true, keys:async () => [],
    put:async () => {stored++;},
  };
  const {loadModel} = await loader(t, {open:async () => cache}, async (url, options) => {
    if (++downloads === 1) return new Response(gzipSync(malformed));
    retryCacheMode = options.cache;
    return response();
  });
  const file = 'players-v1/test-model.mdl';
  await assert.rejects(loadModel(file), /повреждённый MDL/);
  assert.equal(stored, 0);
  assert.deepEqual(new Uint8Array(await loadModel(file)), payload);
  assert.equal(downloads, 2);
  assert.equal(retryCacheMode, 'reload');
});

test('a parser rejection bypasses the disk cache even while its initial write is pending', async t => {
  const writes = [];
  const {promise:firstPut, resolve:reportFirstPut} = Promise.withResolvers();
  const {promise:allowFirstPut, resolve:releaseFirstPut} = Promise.withResolvers();
  const {promise:replacementPut, resolve:reportReplacement} = Promise.withResolvers();
  const cache = {
    match:async () => null,
    async put() {
      writes.push('put');
      if (writes.length === 1) {
        reportFirstPut();
        await allowFirstPut;
      } else {
        reportReplacement();
      }
    },
    async delete() {writes.push('delete');},
    keys:async () => [],
  };
  const requests = [];
  const {loadModel, invalidateModel} = await loader(t, {open:async () => cache}, async (url, options) => {
    requests.push(options.cache);
    return response();
  });
  const file = 'players-v1/test-model.mdl';
  const original = await loadModel(file);
  await firstPut;
  try {
    await invalidateModel(file, original);
    const replacement = await loadModel(file);
    assert.notStrictEqual(replacement, original);
    // A late parser failure from the first caller must not discard the replacement.
    await invalidateModel(file, original);
    assert.strictEqual(await loadModel(file), replacement);
    assert.deepEqual(requests, [undefined, 'reload']);
  } finally {
    releaseFirstPut();
  }
  await replacementPut;
  assert.deepEqual(writes, ['put', 'delete', 'put']);
});
