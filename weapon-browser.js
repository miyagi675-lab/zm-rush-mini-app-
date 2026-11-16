import {Matrix4, Vector3} from './vendor/three.module.js';
import {createPreviewLoader} from './preview-loader.js?v=1';
import {weapons} from './weapon-catalog.js?v=1';

export function prepareWeapon(model, entry) {
  const hand = model.userData.bones.get(entry.sourceHand || 'Bip01 R Hand');
  if (!hand) throw Error('Не удалось определить рукоять');
  const toGrip = hand.clone().invert();
  for (const mesh of model.children) mesh.geometry.applyMatrix4(toGrip);
  model.matrixAutoUpdate = false;
  return model;
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
  weapon.matrix.multiplyMatrices(hand, handScale.makeScale(scale, scale, scale));
  weapon.matrixWorldNeedsUpdate = true;
}

const categories = {all:'Все', rifle:'Винтовки', pistol:'Пистолеты', knife:'Ножи'};

export function setupWeaponBrowser(onChoose) {
  const list = document.getElementById('weapon-items');
  const filters = document.getElementById('weapon-filters');
  const search = document.getElementById('weapon-search');
  const remove = document.getElementById('remove-weapon');
  const empty = document.getElementById('weapon-empty');
  const loadPreviews = createPreviewLoader();
  let category = 'all';
  let selected = null;
  let disabled = true;

  function sync(entry, busy) {
    selected = entry;
    disabled = busy;
    remove.disabled = busy || !entry;
    for (const card of list.children) {
      const equipped = card.dataset.weaponId === entry?.id;
      card.classList.toggle('selected', equipped);
      const button = card.firstElementChild;
      button.disabled = busy;
      button.setAttribute('aria-pressed', String(equipped));
    }
  }

  function render() {
    const term = search.value.trim().toLowerCase();
    const visible = weapons.filter(item => (category === 'all' || item.category === category) &&
      (item.name.toLowerCase().includes(term) || item.id.includes(term)));
    const fragment = document.createDocumentFragment();
    for (const entry of visible) {
      const card = document.createElement('article');
      card.className = 'item';
      card.dataset.weaponId = entry.id;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'item-pick';
      button.onclick = () => onChoose(entry);
      const image = document.createElement('img');
      image.alt = '';
      image.width = 280;
      image.height = 180;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.dataset.preview = 'assets/weapons-v1/' + entry.id + '.webp';
      const name = document.createElement('span');
      name.className = 'item-name';
      name.textContent = entry.name;
      button.append(image, name);
      card.append(button);
      fragment.append(card);
    }
    list.replaceChildren(fragment);
    empty.hidden = visible.length !== 0;
    list.scrollTop = 0;
    for (const button of filters.children) {
      const active = button.dataset.category === category;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    sync(selected, disabled);
    loadPreviews(list);
  }

  for (const [id, label] of Object.entries(categories)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.category = id;
    button.textContent = label;
    button.onclick = () => { category = id; render(); };
    filters.append(button);
  }
  search.oninput = render;
  remove.onclick = () => onChoose(null);
  document.getElementById('tab-weapon-count').textContent = weapons.length;
  render();
  return sync;
}
