import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Matrix4, Vector3} from '../vendor/three.module.js';
import {playerModels} from '../catalog.js';
import {modelAssetPaths} from '../asset-loader.js';
import {parseMDL, disposeMDL} from '../mdl.js';

function asset(path) {
  const data = gunzipSync(readFileSync(new URL('../' + modelAssetPaths(path).packed, import.meta.url)));
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

test('independent accessory rigs move with the chosen player socket', () => {
  const examples = [
    ...['19s1tr_head','a_head_m','boxing_head_m','cosmask','polarbear_head','provoke_head','pumpkin_head','snow_head','squirrel_face','squirrel_head'].map(id => [id, 'Bip01 Head']),
    ...['19s3ct_back','19s3tr_back','cat_back','polarbear_back','provoke_back','pumpkin_back','snow_back','squirrel_back','titan_back'].map(id => [id, 'Bip01 Spine2']),
    ...['coslantern','provoke_pelvis','squirrel_pelvis'].map(id => [id, 'Bip01 Pelvis']),
  ];
  for (const id of ['xmastree','gign','sugar','dobby','p_small_sonic']) {
    const player = playerModels.find(model => model.id === id);
    const model = parseMDL(asset(player.file), null, 1);
    const bones = model.userData.bones;
    for (const [accessoryId, socket] of examples) {
      const hat = parseMDL(asset('hats/' + accessoryId + '.mdl'), bones, 0, {}, player.hatScale, {accessoryId});
      const positions = hat.children[0].geometry.attributes.position;
      const vertex = () => new Vector3().fromBufferAttribute(positions, 0);
      const local = vertex().applyMatrix4(new Matrix4().copy(bones.get(socket)).invert());
      if (accessoryId === 'pumpkin_head') {
        hat.children[0].geometry.computeBoundingSphere();
        const center = hat.children[0].geometry.boundingSphere.center;
        const size = player.hatScale?.head ?? player.hatScale ?? 1;
        assert(center.distanceTo(new Vector3().setFromMatrixPosition(bones.get(socket))) < 14 * size, id);
      }
      for (const action of ['run','crouch_idle']) {
        const sequence = model.userData.sequences.find(s => s.name === action);
        assert.ok(sequence, id + ' / ' + action);
        model.userData.updatePose(sequence.index, .24);
        // Hold the accessory's own clip fixed to isolate motion inherited from the player.
        hat.userData.updatePose(0, 0, bones);
        assert(vertex().distanceTo(local.clone().applyMatrix4(bones.get(socket))) < .001, id + ' / ' + accessoryId);
      }
      disposeMDL(hat);
    }
    disposeMDL(model);
  }
});
