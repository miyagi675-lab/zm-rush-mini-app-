import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import test from 'node:test';
import {parseMDL, disposeMDL} from '../mdl.js';
import {modelAssets} from '../model-assets.js';
import {optimizePreviewTextures} from './optimize-preview-textures.mjs';

test('lighter player previews preserve geometry, bones and animation channels', async () => {
  for (const id of ['p_fg_premium_woman', 'p_arctic1', 'p_itachi']) {
    const optimized = modelAssets['players-v1/' + id + '.mdl'];
    assert(optimized.startsWith('player-fast-v1/'));
    const files = ['player-motion-v1/' + id + '.mdl.gz', optimized];
    const models = [];
    const sizes = [];
    const decoded = [];
    try {
      for (const file of files) {
        const packed = await readFile(new URL('../assets/' + file, import.meta.url));
        sizes.push(packed.byteLength);
        const bytes = gunzipSync(packed);
        decoded.push(bytes);
        models.push(parseMDL(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), null, 1));
      }
      const [original, fast] = models;
      assert.deepEqual(decoded[1], optimizePreviewTextures(decoded[0]), id + ': optimized asset cannot be reproduced');
      assert(sizes[1] < sizes[0] * .9, id + ': preview has not become smaller');
      assert.equal(fast.children.length, original.children.length);
      assert.deepEqual(fast.userData.sequences, original.userData.sequences);
      assert.deepEqual(fast.userData.definitions, original.userData.definitions);
      for (const sequence of [1, 3, 10]) {
        for (const model of models) model.userData.updatePose(sequence, .25);
        for (let i = 0; i < original.children.length; i++) {
          assert.deepEqual(fast.children[i].geometry.attributes.position.array, original.children[i].geometry.attributes.position.array);
          assert.deepEqual(fast.children[i].geometry.attributes.normal.array, original.children[i].geometry.attributes.normal.array);
          assert.equal(fast.children[i].material.userData.name, original.children[i].material.userData.name);
          assert(fast.children[i].material.userData.w <= 256 && fast.children[i].material.userData.h <= 256);
        }
      }
    } finally { for (const model of models) disposeMDL(model); }
  }
});
