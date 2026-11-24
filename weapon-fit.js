import {Box3, Matrix4, Vector3} from './vendor/three.module.js';

export function prepareWeapon(model, entry) {
  const toGrip = new Matrix4();
  if (entry.viewTransform) {
    // First-person exports use a different coordinate system from held models.
    toGrip.fromArray(entry.viewTransform);
  } else {
    const hand = model.userData.bones.get(entry.sourceHand || 'Bip01 R Hand');
    if (!hand) throw Error('Не удалось определить рукоять');
    toGrip.copy(hand);
    // Use the handle as the origin while keeping the source hand's orientation.
    if (entry.grip) toGrip.setPosition(...entry.grip);
    toGrip.invert();
  }
  for (const mesh of model.children) mesh.geometry.applyMatrix4(toGrip);
  model.matrixAutoUpdate = false;
  model.userData.gripInPalm = Boolean(entry.grip);
  return model;
}

const palmByPlayer = new WeakMap();
const bounds = new Box3();
const vertex = new Vector3();
function palmFor(player) {
  if (palmByPlayer.has(player)) return palmByPlayer.get(player);
  const {definitions, meshes} = player.userData;
  const hand = definitions.findIndex(bone => bone.name === 'Bip01 R Hand');
  bounds.makeEmpty();
  for (const {boneIds, local} of meshes) {
    for (let i = 0; i < boneIds.length; i++) {
      if (boneIds[i] === hand) bounds.expandByPoint(vertex.fromArray(local, i * 3));
    }
  }
  if (bounds.isEmpty()) {
    // Some skins weight the glove entirely to finger bones.
    const toHand = player.userData.bones.get('Bip01 R Hand').clone().invert();
    for (const {boneIds, geometry} of meshes) {
      for (let i = 0; i < boneIds.length; i++) {
        if (definitions[boneIds[i]]?.name.startsWith('Bip01 R Finger')) {
          bounds.expandByPoint(vertex.fromBufferAttribute(geometry.attributes.position, i).applyMatrix4(toHand));
        }
      }
    }
  }
  const palm = bounds.getCenter(new Vector3());
  palmByPlayer.set(player, palm);
  return palm;
}

const handScale = new Matrix4();
const handPosition = new Vector3();
const elbowPosition = new Vector3();
export function fitWeapon(weapon, player, height) {
  const bones = player.userData.bones;
  const hand = bones.get('Bip01 R Hand');
  const elbow = bones.get('Bip01 R Forearm');
  if (!hand) return;
  const heightScale = height / 60;
  let scale = heightScale;
  if (elbow) {
    handPosition.setFromMatrixPosition(hand);
    elbowPosition.setFromMatrixPosition(elbow);
    scale = Math.min(scale, handPosition.distanceTo(elbowPosition) / 11);
  }
  scale = Math.max(.22, Math.min(1.1, scale));
  handScale.makeScale(scale, scale, scale);
  if (weapon.userData.gripInPalm) handScale.setPosition(palmFor(player));
  weapon.matrix.multiplyMatrices(hand, handScale);
  weapon.matrixWorldNeedsUpdate = true;
}
