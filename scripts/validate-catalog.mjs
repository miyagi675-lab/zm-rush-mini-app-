import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {entries, playerModels} from '../catalog.js';
import {parseMDL, disposeMDL} from '../mdl.js';
import {modelAssets} from '../model-assets.js';
import {modelGroups, modelPreview} from '../model-groups.js';
import {modelPrices} from '../model-prices.js';

const site = new URL('../', import.meta.url);
const modelPath = /^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*\.mdl$/;
const checkedFiles = new Set();

function validateCatalog(items, category) {
  assert(items.length > 0, category + ': empty catalog');
  const ids = new Set();
  for (const {id, name} of items) {
    assert.match(id, /^[A-Za-z0-9_-]+$/, category + ': invalid ID ' + id);
    assert(!ids.has(id), category + ': duplicate ID ' + id);
    assert(typeof name === 'string' && name.trim(), category + ': missing name for ' + id);
    ids.add(id);
  }
  return ids;
}

async function validateMdl(path, packed) {
  if (checkedFiles.has(path)) return;
  const bytes = await readFile(new URL('assets/' + path, site));
  const data = packed ? gunzipSync(bytes) : bytes;
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const model = parseMDL(buffer, null, 1);
  try {
    assert(model.userData.triangles > 0, path + ': empty geometry');
    for (const {geometry} of model.userData.meshes) {
      for (const name of ['position', 'normal', 'uv']) {
        assert(geometry.attributes[name].array.every(Number.isFinite), path + ': invalid ' + name);
      }
    }
  } finally {
    disposeMDL(model);
  }
  checkedFiles.add(path);
}

async function validateItem(asset, preview) {
  assert.match(asset, modelPath, 'Invalid model path ' + asset);
  const encoded = modelAssets[asset] || asset + '.gz';
  assert(encoded.endsWith('.gz') && modelPath.test(encoded.slice(0, -3)), 'Invalid gzip path ' + encoded);
  try {
    await validateMdl(encoded, true);
    // Old WebViews can use the uncompressed path where the loader supports it.
    if (!asset.startsWith('players-v1/')) await validateMdl(asset, false);
    const image = await readFile(new URL(preview, site));
    assert(image.length > 12 && image.toString('ascii', 0, 4) === 'RIFF'
      && image.toString('ascii', 8, 12) === 'WEBP', preview + ': invalid WebP');
  } catch (error) {
    throw Error(asset + ': ' + error.message, {cause: error});
  }
}

validateCatalog(entries, 'Hats');
const modelIds = validateCatalog(playerModels, 'Models');
for (const group of modelGroups) {
  for (const id of group.models) {
    assert(modelIds.has(id), group.id + ': unknown model ' + id);
  }
}
for (const [id, price] of Object.entries(modelPrices)) {
  assert(modelIds.has(id), 'Price refers to unknown model ' + id);
  assert(Number.isSafeInteger(price) && price > 0, 'Invalid RUB price for ' + id);
}

for (const item of entries) {
  await validateItem('hats/' + item.id + '.mdl', 'assets/previews-v2/' + item.id + '.webp');
}
for (const model of playerModels) {
  await validateItem(model.file, modelPreview(model.id));
}

console.log('Checked ' + entries.length + ' hats, ' + playerModels.length + ' models, '
  + Object.keys(modelPrices).length + ' prices and ' + checkedFiles.size + ' MDL files.');
