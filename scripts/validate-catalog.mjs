import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {entries, playerModels} from '../catalog.js';
import {parseMDL, disposeMDL} from '../mdl.js';
import {modelAssets} from '../model-assets.js';
import {modelGroups, modelPreview} from '../model-groups.js';
import {modelPrices} from '../model-prices.js';
import {weapons} from '../weapon-catalog.js';
import {prepareWeapon} from '../weapon-browser.js';
import {Triangle, Vector3} from '../vendor/three.module.js';

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

async function validateMdl(path, packed, weapon) {
  if (checkedFiles.has(path)) return;
  const bytes = await readFile(new URL('assets/' + path, site));
  const data = packed ? gunzipSync(bytes) : bytes;
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const model = parseMDL(buffer, null, weapon ? 0 : 1);
  try {
    if (weapon) {
      if (weapon.category === 'knife') {
        assert(weapon.grip?.length === 3 && weapon.grip.every(Number.isFinite), path + ': missing knife grip');
      }
      prepareWeapon(model, weapon);
      if (weapon.category === 'knife') {
        const triangle = new Triangle();
        const origin = new Vector3();
        const nearest = new Vector3();
        const touchesGrip = model.children.some(({geometry}) => {
          const vertices = geometry.attributes.position;
          for (let i = 0; i < vertices.count; i += 3) {
            triangle.a.fromBufferAttribute(vertices, i);
            triangle.b.fromBufferAttribute(vertices, i + 1);
            triangle.c.fromBufferAttribute(vertices, i + 2);
            if (triangle.getArea() > 1e-9 && triangle.closestPointToPoint(origin, nearest).length() <= 0.5) return true;
          }
          return false;
        });
        assert(touchesGrip, path + ': knife geometry is separated from the grip');
      }
    }
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

async function validateItem(asset, preview, weapon) {
  assert.match(asset, modelPath, 'Invalid model path ' + asset);
  const encoded = modelAssets[asset] || asset + '.gz';
  assert(encoded.endsWith('.gz') && modelPath.test(encoded.slice(0, -3)), 'Invalid gzip path ' + encoded);
  try {
    await validateMdl(encoded, true, weapon);
    // Old WebViews can use the uncompressed path where the loader supports it.
    if (!weapon && !asset.startsWith('players-v1/')) await validateMdl(asset, false);
    const image = await readFile(new URL(preview, site));
    assert(image.length > 12 && image.toString('ascii', 0, 4) === 'RIFF'
      && image.toString('ascii', 8, 12) === 'WEBP', preview + ': invalid WebP');
  } catch (error) {
    throw Error(asset + ': ' + error.message, {cause: error});
  }
}

validateCatalog(entries, 'Hats');
validateCatalog(weapons, 'Weapons');
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
for (const weapon of weapons) {
  const base = 'weapons-v1/' + weapon.id;
  await validateItem(base + '.mdl', 'assets/' + base + '.webp', weapon);
}

console.log('Checked ' + entries.length + ' hats, ' + playerModels.length + ' models, '
  + weapons.length + ' weapons, ' + Object.keys(modelPrices).length + ' prices and ' + checkedFiles.size + ' MDL files.');
