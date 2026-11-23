import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import test from 'node:test';
import {parseMDL, disposeMDL} from '../mdl.js';
import {modelAssets} from '../model-assets.js';
import {weapons} from '../weapon-catalog.js';
import {prepareWeapon, fitWeapon} from '../weapon-browser.js';
import {applyMotionPose, resolveMotion} from '../motion.js';
import {Box3, Triangle, Vector3} from '../vendor/three.module.js';

const rebuilt = ['3567-v-mp5-11', '3669-fire-mp5', 'suppressed-mp5'];
const retargeted = [...rebuilt, 'mp5-agent', 'mp5-phosphor'];
async function load(file) {
  const bytes = gunzipSync(await readFile(new URL('../assets/' + (modelAssets[file] || file + '.gz'), import.meta.url)));
  return parseMDL(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
const center = (model, name) => new Box3().setFromObject(model.children.find(mesh => mesh.material.userData.name === name)).getCenter(new Vector3());
function nearestSurface(model, target) {
  const triangle = new Triangle(), candidate = new Vector3(), nearest = new Vector3();
  let distance = Infinity;
  for (const mesh of model.children) {
    const positions = mesh.geometry.attributes.position;
    for (let i = 0; i < positions.count; i += 3) {
      triangle.a.fromBufferAttribute(positions, i);
      triangle.b.fromBufferAttribute(positions, i + 1);
      triangle.c.fromBufferAttribute(positions, i + 2);
      if (triangle.getArea() < 1e-9) continue;
      triangle.closestPointToPoint(target, candidate);
      if (candidate.distanceToSquared(target) < distance) {
        distance = candidate.distanceToSquared(target);
        nearest.copy(candidate);
      }
    }
  }
  return nearest;
}

test('MP5 previews keep the pistol grip and handguard while excluding viewmodel arms', async () => {
  for (const id of rebuilt) {
    const model = await load('weapons-v1/' + id + '.mdl');
    try {
      const names = model.children.map(mesh => mesh.material.userData.name);
      for (const name of ['handle.bmp', 'forearm.bmp', 'barrel.bmp', 'clip.bmp', 'buttstock.bmp']) {
        assert(names.includes(name), id + ': missing ' + name);
      }
      assert(!names.some(name => /^view_(glove|skin|finger)/i.test(name)), id + ': viewmodel arms were retained');
    } finally { disposeMDL(model); }
  }
});

test('retargeted MP5 grips stay at the right hand across player motions', async () => {
  const player = await load('gign.mdl');
  try {
    const handIndex = player.userData.definitions.findIndex(bone => bone.name === 'Bip01 R Hand');
    const palmBounds = new Box3();
    for (const {boneIds, local} of player.userData.meshes) {
      for (let i = 0; i < boneIds.length; i++) {
        if (boneIds[i] === handIndex) palmBounds.expandByPoint(new Vector3().fromArray(local, i * 3));
      }
    }
    const palm = palmBounds.getCenter(new Vector3());
    for (const id of retargeted) {
      const entry = weapons.find(weapon => weapon.id === id);
      const model = await load('weapons-v1/' + id + '.mdl');
      try {
        prepareWeapon(model, entry);
        const grip = entry.sourceHand === 'Bone_Righthand'
          ? center(model, 'handle.bmp') : nearestSurface(model, palm);
        assert(grip.length() < 4, id + ': pistol grip is separated from the wrist');
        if (entry.sourceHand === 'Bone_Righthand') {
          const front = center(model, 'forearm.bmp');
          const stock = center(model, 'buttstock.bmp');
          assert(front.x > stock.x + 5, id + ': barrel points backward');
          assert(center(model, 'clip.bmp').z < center(model, 'barrel.bmp').z, id + ': magazine points upward');
        }
        for (const motion of ['aim', 'shoot', 'reload', 'walk', 'crouch_idle']) {
          const resolved = resolveMotion(player.userData.sequences, motion, entry);
          assert(resolved.supported, motion);
          for (const time of [0, resolved.duration / 2, resolved.duration]) {
            applyMotionPose(player, resolved, time);
            fitWeapon(model, player, 60);
            const wrist = new Vector3().setFromMatrixPosition(player.userData.bones.get('Bip01 R Hand'));
            const heldGrip = grip.clone().applyMatrix4(model.matrix);
            assert(heldGrip.distanceTo(wrist) < 4.5, id + ': grip detached during ' + motion);
          }
        }
      } finally { disposeMDL(model); }
    }
  } finally { disposeMDL(player); }
});

test('first-person straight knives point away from the wrist instead of across the palm', async () => {
  const referenceEntry = weapons.find(weapon => weapon.id === 'bayonet-white');
  const reference = prepareWeapon(await load('weapons-v1/bayonet-white.mdl'), referenceEntry);
  const direction = center(reference, 'KLINOK1.bmp').sub(center(reference, 'FRONTDRJAK.bmp')).normalize();
  disposeMDL(reference);
  const player = await load('gign.mdl');
  try {
    for (const id of ['default-knife-marble-fade', 'tron-knife-1', 'tron-knife-2', 'tron-knife-3', 'bayonet-blue-galaxy']) {
      const entry = weapons.find(weapon => weapon.id === id);
      const model = prepareWeapon(await load('weapons-v1/' + id + '.mdl'), entry);
      try {
        let tip = new Vector3();
        for (const mesh of model.children) {
          const positions = mesh.geometry.attributes.position;
          for (let i = 0; i < positions.count; i++) {
            const point = new Vector3().fromBufferAttribute(positions, i);
            if (point.lengthSq() > tip.lengthSq()) tip.copy(point);
          }
        }
        assert(tip.clone().normalize().dot(direction) > .85, id + ': blade points across the hand');
        assert(nearestSurface(model, new Vector3()).length() < .5, id + ': handle misses the palm');
        for (const motion of ['aim', 'shoot', 'walk', 'crouch_idle']) {
          const resolved = resolveMotion(player.userData.sequences, motion, entry);
          assert(resolved.supported, motion);
          for (const time of [0, resolved.duration / 2, resolved.duration]) {
            applyMotionPose(player, resolved, time);
            fitWeapon(model, player, 60);
            const wrist = new Vector3().setFromMatrixPosition(player.userData.bones.get('Bip01 R Hand'));
            const handle = new Vector3().applyMatrix4(model.matrix);
            assert(handle.distanceTo(wrist) < 4, id + ': handle detached during ' + motion);
          }
        }
      } finally { disposeMDL(model); }
    }
  } finally { disposeMDL(player); }
});
