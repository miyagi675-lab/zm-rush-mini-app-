import {productPrice,setupPurchase} from './purchase.js?v=15';
import {english} from './language.js?v=26';
import {entries,playerModels} from './catalog.js?v=16';
import {loadModel as load,prefetchModel,invalidateModel} from './asset-loader.js?v=12';
import {setupModelBrowser} from './model-browser.js?v=16';
import {createPreviewLoader} from './preview-loader.js?v=1';
import {modelPrices} from './model-prices.js?v=6';
import {setupWeaponBrowser, weaponPrice, weaponPriceLabel} from './weapon-browser.js?v=18';
import {hatPrices} from './hat-prices.js?v=1';
import {weapons} from './weapon-catalog.js?v=7';
import {motionDefinitions,resolveMotion,applyMotionPose,advanceMotionClock} from './motion.js?v=2';
import {normalizeCatalogSearch} from './catalog-search.js?v=1';

const $=id=>document.getElementById(id);
const categories={heroes:'ПЕРСОНАЖ',animals:'ЗВЕРИ',other:'ДРУГОЕ'};
const fittedHats=new Map();
const playerCache=new Map();
const weaponCache=new Map();
const indexedMesh = {indexed:true};
const platformTop = .3;
const coarsePointer = matchMedia('(pointer: coarse)');
const mobileLayout = matchMedia('(max-width: 800px)');
const HEAVY_MODEL_VERTICES = 25000;
function ensureHead(model, attachment) {
 if (model.userData.bones.has('Bip01 Head')) return;
 const parent = model.userData.bones.get(attachment?.bone || 'Bip01 Neck') || model.userData.bones.values().next().value;
 if (!parent) return;
 const bounds = new T.Box3().setFromObject(model);
 const offset = attachment?.matrix ? new T.Matrix4().fromArray(attachment.matrix)
  : new T.Matrix4().makeTranslation(0,0,Math.max(0,bounds.max.z-parent.elements[14]-3));
 const matrix = parent.clone().multiply(offset);
 model.userData.bones.set('Bip01 Head',matrix);
 const update = model.userData.updatePose;
 model.userData.updatePose = (...args) => {update(...args);matrix.copy(parent).multiply(offset);};
}
function trimPlayers(){for(const [id,model] of playerCache){if(playerCache.size<=2)break;if(id===player.id)continue;playerCache.delete(id);disposeMDL(model);for(const [key,look] of fittedHats)if(key.startsWith(id+':')){fittedHats.delete(key);disposeMDL(look);}}}
function fittedHat(entry,nextBody,model=player){const key=model.id+':'+entry.id+':'+JSON.stringify(nextBody);const cached=fittedHats.get(key);if(cached){fittedHats.delete(key);fittedHats.set(key,cached);}return {key,cached};}
function hatScaleFor(model,entry){const override=model.hatScaleOverrides?.[entry.id];if(override===undefined)return model.hatScale;const base=typeof model.hatScale==='number'?{head:model.hatScale,body:model.hatScale}:model.hatScale;return {...base,...(typeof override==='number'?{head:override}:override)};}
function trimHats(){for(const [key,value] of fittedHats){if(fittedHats.size<=8)break;if(value!==hat){fittedHats.delete(key);disposeMDL(value);}}}
function weaponBytes(model) {
 let bytes=0;
 for(const {geometry,local,localNormals,boneIds,normalIds} of model.userData.meshes){
  bytes+=local.byteLength+localNormals.byteLength+(boneIds.length+normalIds.length)*8;
  for(const attribute of Object.values(geometry.attributes))bytes+=attribute.array.byteLength*2;
  bytes+=(geometry.index?.array.byteLength||0)*2;
 }
 for(const material of model.userData.materials){const data=material?.map?.image?.data;if(data)bytes+=data.byteLength*2.34;}
 return bytes;
}
function trimWeapons() {
 let bytes=[...weaponCache.values()].reduce((sum,model)=>sum+model.userData.previewBytes,0);
 for(const [id,model] of weaponCache){
  if(weaponCache.size<=4&&bytes<=16*1024*1024)break;
  if(model===weapon)continue;
  weaponCache.delete(id);bytes-=model.userData.previewBytes;disposeMDL(model);
 }
}
const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}};
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
}
const storedFavorites = readJSON('zm-rush-favorites', []);
const favorites = new Set(Array.isArray(storedFavorites) ? storedFavorites : []);
const storedSlots = readJSON('zm-rush-slots', null);
const slots = { a: storedSlots?.a ?? null, b: storedSlots?.b ?? null };
let savedLook = readJSON('zm-rush-look', null);
if (!savedLook || typeof savedLook !== 'object' || Array.isArray(savedLook)) savedLook = null;
let ct,hat,scene,camera,renderer,controls,rig,current=null,body={},ticket=0,filter='all',ready=false,modelBrowser=null;
let player=playerModels.find(m=>m.id===readJSON('zm-rush-player','gign'))||playerModels[0],modelHeight=62,playerTicket=0;
let T, OrbitControls, parseMDL, disposeMDL, measureMDLPose, prepareWeapon, fitWeapon;
let modelHead, animatedHead, headShift;
let animatedFraming, crouchedFraming;
let reducedPreviewQuality = false;
const motionSelect = $('motion');
const motionGroups = new Map();
for (const definition of motionDefinitions) {
  let group = motionGroups.get(definition.group);
  if (!group) {
    group = document.createElement('optgroup');
    group.label = definition.group;
    motionGroups.set(definition.group, group);
  }
  const option = document.createElement('option');
  option.value = definition.id;
  option.textContent = definition.label;
  option.defaultSelected = definition.id === 'run';
  group.append(option);
}
motionSelect.replaceChildren(...motionGroups.values());
const storedMotion = readJSON('zm-rush-motion', null);
let motion = [...motionSelect.options].some(option => option.value === storedMotion)
  ? storedMotion
  : motionSelect.querySelector('option[selected]').value;
let activeSlot='a',animationTime=0,animationCycleTime=0,animationSpeed=1,animationPlaying=true,cameraView='angle';
let resolvedMotion = null, animationFinished = false;
let sceneAvailable = false;
let selectionBusy = false;
let retryPreview = null;
let needsLegacyLook = Boolean(savedLook && !savedLook.playerId);
let invalidatePreview = () => {};
let resizePreview = () => {};
let weapon = null;
let equippedWeapon = null;

const toast=text=>{$('toast').textContent=text;};
function modelProduct(model) {
  return {...model, nameEn: model.nameEn || english(model.name), type: 'model', price: modelPrices[model.id]};
}
const hatProduct = entry => ({...entry, nameEn: english(entry.name), type: 'hat', price: hatPrices[entry.id]});
const weaponProduct = entry => ({...entry, type: 'weapon', price: weaponPrice});
const purchase = setupPurchase(() => {
  if (!sceneAvailable || !ct) return [];
  return [
    modelProduct(player),
    current && hatProduct(current),
    equippedWeapon && weaponProduct(equippedWeapon),
  ];
}, () => selectionBusy || !ready, [
  ...playerModels.map(modelProduct),
  ...entries.map(hatProduct),
  ...weapons.map(weaponProduct),
]);

function connectTelegram() {
  const telegram = window.Telegram?.WebApp;
  if (!telegram) return;
  try {
    telegram.ready();
    telegram.expand();
    if (telegram.isVersionAtLeast?.('7.7')) telegram.disableVerticalSwipes?.();
    if (telegram.isVersionAtLeast?.('6.1')) {
      telegram.setHeaderColor('#101513');
      telegram.setBackgroundColor('#101513');
    }
  } catch {}
  purchase.connectTelegram(telegram);
}

if (window.Telegram?.WebApp) connectTelegram();
else $('telegram-sdk')?.addEventListener('load', connectTelegram, {once: true});

function syncSelection(){for(const card of $('items').children){const selected=card.dataset.id===current?.id;card.classList.toggle('selected',selected);card.querySelector('.item-pick').setAttribute('aria-pressed',String(selected));card.querySelector('.check')?.remove();if(selected){const mark=document.createElement('span');mark.className='check';mark.textContent='✓';card.append(mark);}}}
const loadHatPreviews = createPreviewLoader();
function renderCatalog(){
 const term=normalizeCatalogSearch($('search').value);
 const visible=entries.filter(e=>(filter==='all'||filter==='favorites'||e.category===filter)&&(!term||normalizeCatalogSearch(e.name+' '+english(e.name)+' '+e.id).includes(term))&&(filter!=='favorites'||favorites.has(e.id)));
 $('items').replaceChildren();$('count').textContent=filter==='favorites'?visible.length+' избранных':visible.length+' / '+entries.length;
 $('empty').hidden=!!visible.length;$('empty').textContent=filter==='favorites'?'Добавь понравившиеся модели звёздочкой.':'Ничего не нашли. Попробуй другое название.';
 for(const e of visible){
  const card=document.createElement('article');card.className='item'+(current?.id===e.id?' selected':'');card.dataset.id=e.id;
  const pick=document.createElement('button');pick.className='item-pick';pick.setAttribute('aria-label','Примерить: '+e.name);pick.setAttribute('aria-pressed',String(current?.id===e.id));
  pick.disabled = !ready;
  const img=document.createElement('img');img.alt='';img.loading='lazy';img.decoding='async';img.width=256;img.height=256;img.dataset.preview='assets/previews-v2/'+e.id+'.webp';
  const name=document.createElement('span');name.className='item-name';name.textContent=e.name;
  const category=document.createElement('span');category.className='item-type';category.textContent=categories[e.category];
  const price=document.createElement('span');price.className='catalog-item-price';price.textContent=productPrice(hatPrices[e.id], 'hat');
  pick.append(img,name,category,price);pick.onclick=()=>selectLook(e,{},true);pick.onpointerenter=pick.onfocus=()=>{if(ready)prefetchModel('hats/'+e.id+'.mdl');};
  const fav=document.createElement('button');fav.className='favorite';fav.textContent=favorites.has(e.id)?'★':'☆';fav.title=favorites.has(e.id)?'Убрать из избранного':'Добавить в избранное';fav.setAttribute('aria-label',fav.title);fav.setAttribute('aria-pressed',String(favorites.has(e.id)));
  fav.onclick=()=>{
    const wasFocused = document.activeElement === fav;
    const added = !favorites.has(e.id);
    if (added) favorites.add(e.id); else favorites.delete(e.id);
    writeJSON('zm-rush-favorites',[...favorites]);
    if (filter === 'favorites' && !added) {
      const nextId = card.nextElementSibling?.dataset.id || card.previousElementSibling?.dataset.id;
      renderCatalog();
      if (wasFocused) ($('items').querySelector('[data-id="'+nextId+'"] .favorite') || document.querySelector('[data-filter="favorites"]')).focus({preventScroll:true});
    } else {
      fav.textContent = added ? '★' : '☆';
      fav.title = added ? 'Убрать из избранного' : 'Добавить в избранное';
      fav.setAttribute('aria-label',fav.title);
      fav.setAttribute('aria-pressed',String(added));
    }
  };
  card.append(pick,fav,purchase.createCartButton(hatProduct(e)));if(current?.id===e.id){const check=document.createElement('span');check.className='check';check.textContent='✓';card.append(check);}$('items').append(card);
 }
 loadHatPreviews($('items'));
}
function syncFilters(){document.querySelectorAll('[data-filter]').forEach(b=>{const on=b.dataset.filter===filter;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function lighting(target){target.add(new T.HemisphereLight(0xe6f5d8,0x6b7866,2));const key=new T.DirectionalLight(0xfff1db,1.4);key.position.set(60,100,90);target.add(key);const fill=new T.DirectionalLight(0xa7d1ef,.7);fill.position.set(-65,30,-40);target.add(fill);}
function isClose(){return $('head').classList.contains('active');}
function viewHeight(close) {
 if (!close && Number.isFinite(player.previewHeight)) return Math.max(modelHeight,player.previewHeight);
 // Use the same camera and floor reference for both Sonics: the small model is 60% of the regular model's height.
 // 85.514 is the regular Sonic's full-body height in the supplied MDL.
 // Rat keeps its existing wider view instead of being enlarged to human size.
 if (!close && (player.id === 'p_sonic' || player.id === 'p_small_sonic')) return Math.max(modelHeight,85.514);
 if (!close && player.id === 'p_chick') return Math.max(modelHeight,32);
 return modelHeight;
}
function viewTarget(close) {
 if (close) return modelHead.clone();
 const height = player.id === 'p_chick' ? modelHeight : viewHeight(false);
 return new T.Vector3(0,platformTop+height*.56,0);
}
function frame(close=false){
 if(!ready)return;
 const ratio=viewHeight(close)/62,target=viewTarget(close);controls.target.copy(target);const far=(close?62:112)*ratio,high=(close?8:29)*ratio;
 const offsets={front:new T.Vector3(far,high,0),side:new T.Vector3(0,high,far),back:new T.Vector3(-far,high,0),angle:new T.Vector3(far,high,(close?34:65)*ratio)};
 camera.position.copy(target).add(offsets[cameraView]);controls.minDistance=12*ratio;controls.maxDistance=230*ratio;controls.update();
 $('full').classList.toggle('active',!close);$('full').setAttribute('aria-pressed',String(!close));$('head').classList.toggle('active',close);$('head').setAttribute('aria-pressed',String(close));
 invalidatePreview();
}
function setView(value){cameraView=value;document.querySelectorAll('[data-view]').forEach(b=>{const selected=b.dataset.view===value;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});frame(isClose());}
function refreshSlots(){for(const key of ['a','b']){const button=$('slot-'+key),look=slots[key];button.setAttribute('aria-pressed',String(activeSlot===key));button.querySelector('span').textContent=look?.name||'Без шапки';}}
function setBusy(value) {
  selectionBusy = value;
  $('save').disabled = value || !ready;
  $('restore-look').disabled = value || !ready;
  $('snapshot').disabled = value || !ready;
  for (const id of ['motion','speed','slot-a','slot-b','full','head','rotate','remove'])
    $(id).disabled = value || !ready;
  for (const button of document.querySelectorAll('[data-view]')) button.disabled = value || !ready;
  syncMotionControls();
  for (const pick of $('items').querySelectorAll('.item-pick')) pick.disabled = !ready;
  modelBrowser?.setBusy(value);
  syncWeapons(equippedWeapon, value || !ready);
  purchase.refresh();
}
function refreshPreviewPrices() {
  const prices = $('studio-prices');
  const modelPrice = modelPrices[player.id] ? productPrice(modelPrices[player.id]) : '';
  const weaponPrice = equippedWeapon ? 'Оружие · ' + weaponPriceLabel : '';
  const hatPrice = current ? 'Шапка · ' + productPrice(hatPrices[current.id], 'hat') : '';
  for (const [id, label] of [['model-price', modelPrice], ['weapon-price', weaponPrice], ['hat-price', hatPrice]]) {
    const badge = $(id);
    badge.textContent = label;
    badge.hidden = !label;
  }
  prices.hidden = !modelPrice && !weaponPrice && !hatPrice;
  const studio = prices.closest('.studio');
  studio.classList.toggle('has-preview-prices', !prices.hidden);
  studio.classList.toggle('has-three-prices', Boolean(modelPrice && weaponPrice && hatPrice));
}

function beginLoading(message) {
  retryPreview = null;
  $('retry-model').hidden = true;
  $('loading-message').textContent = message;
  $('loading').hidden = false;
  setBusy(true);
}
function showPreviewError(message, action, label = 'Повторить загрузку') {
  retryPreview = action;
  $('loading-message').textContent = message;
  $('retry-model').textContent = label;
  $('retry-model').hidden = !action;
  $('loading').hidden = false;
}
async function loadPreviewModel(file, parse, options, isCurrent, download) {
  const data = await (download || load(file, options));
  if (!isCurrent()) return null;
  try {
    return parse(data);
  } catch (error) {
    await invalidateModel(file, data).catch(() => {});
    throw error;
  }
}
function progressFor(label) {
  return ({percent}) => {
    if (!$('loading').hidden) $('loading-message').textContent = label + (percent ? ' ' + percent + '%' : '');
  };
}
async function selectLook(entry,nextBody={},writeSlot=true){
 if(!ready||selectionBusy)return false;
 const started=performance.now(),token=++ticket;
 const isCurrent = () => token === ticket;
 const label = entry ? 'Примеряем '+entry.name+'…' : 'Снимаем шапку…';
 beginLoading(label);
 try{
  let next = null;
  if (entry) {
    const {key,cached} = fittedHat(entry,nextBody);
    next = cached;
    if (!next) {
      const file = 'hats/'+entry.id+'.mdl';
      next = await loadPreviewModel(file, data=>parseMDL(data,ct.userData.bones,0,nextBody,hatScaleFor(player,entry),indexedMesh),
        {onProgress:p=>{if(isCurrent())progressFor(label)(p);}}, isCurrent);
      if (!next) return false;
      fittedHats.set(key,next);
    }
  }
  if(!isCurrent())return false;if(hat)rig.remove(hat);hat=next;if(hat)rig.add(hat);trimHats();current=entry;body=nextBody;
  refreshPreviewPrices();
  $('selected-name').textContent=entry?.name||'Без шапки';$('detail-name').textContent=entry?.name||player.name;$('detail-file').textContent=entry?entry.id+'.mdl · '+player.name:'Модель '+player.name;$('variants').replaceChildren();
  for(const variant of hat?.userData.variants||[]){const label=document.createElement('label');label.textContent='Вариант';const select=document.createElement('select');variant.names.forEach((name,index)=>{const option=document.createElement('option');option.value=index;option.textContent=name;select.append(option);});select.value=body[variant.part]||0;select.onchange=()=>selectLook(current,{...body,[variant.part]:Number(select.value)},true);label.append(select);$('variants').append(label);}
  if(writeSlot){slots[activeSlot]=entry?{id:entry.id,name:entry.name,body:{...nextBody}}:null;writeJSON('zm-rush-slots',slots);}
  refreshSlots();syncSelection();purchase.refresh(entry && writeSlot ? 'hat' : undefined);toast('');performance.measure('zm-rush:accessory-ready',{start:started});
  try { window.Telegram?.WebApp?.HapticFeedback?.selectionChanged(); } catch {}
  invalidatePreview();
  return true;
 }catch(error){
  if (isCurrent()) showPreviewError('Примерка не удалась.',()=>selectLook(entry,nextBody,writeSlot));
  console.error(error);
  return false;
 }finally{if(isCurrent()){$('loading').hidden=!retryPreview;setBusy(false);}}
}
async function selectWeapon(entry, purchaseWeapon = true) {
  if (!ready || selectionBusy) return false;
  if (entry?.id === equippedWeapon?.id) {
    purchase.refresh(entry && purchaseWeapon ? 'weapon' : undefined);
    return true;
  }
  const started = performance.now();
  const token = ++ticket;
  const isCurrent = () => token === ticket;
  const label = entry ? 'Примеряем ' + entry.name + '…' : 'Снимаем оружие…';
  beginLoading(label);
  try {
    let next = null;
    if (entry) {
      next = weaponCache.get(entry.id);
      if (next) { weaponCache.delete(entry.id); weaponCache.set(entry.id, next); }
      else {
        const file = 'weapons-v1/' + entry.id + '.mdl';
        const model = await loadPreviewModel(file, data=>parseMDL(data,null,0,{},1,indexedMesh),
          {onProgress: progress => { if (isCurrent()) progressFor(label)(progress); }}, isCurrent);
        if (!model) return false;
        try { next = prepareWeapon(model, entry); }
        catch (error) { disposeMDL(model); throw error; }
        next.userData.previewBytes = weaponBytes(next);
        weaponCache.set(entry.id, next);
      }
    }
    if (weapon) {
      rig.remove(weapon);
    }
    weapon = next;
    equippedWeapon = entry;
    if (weapon) {
      fitWeapon(weapon, ct, animatedFraming.height);
      rig.add(weapon);
    }
    trimWeapons();
    if (animationFinished) animationPlaying = motion !== 'static';
    animationTime = 0;
    animationCycleTime = 0;
    animationFinished = false;
    refreshMotionOptions();
    updateAnimation(0);
    refreshPreviewPrices();
    purchase.refresh(entry && purchaseWeapon ? 'weapon' : undefined);
    toast('');
    performance.measure('zm-rush:weapon-ready', {start:started});
    invalidatePreview();
    return true;
  } catch (error) {
    console.error(error);
    if (isCurrent()) showPreviewError('Примерка не удалась.',()=>selectWeapon(entry,purchaseWeapon));
    return false;
  } finally {
    if (isCurrent()) {
      $('loading').hidden = !retryPreview;
      setBusy(false);
    }
  }
}
function chooseSlot(key){if(!ready)return;activeSlot=key;refreshSlots();const look=slots[key],entry=look?entries.find(e=>e.id===look.id):null;selectLook(entry,look?.body||{},false);}
function syncMotionControls() {
  const supported = Boolean(ct && resolveMotion(ct.userData.sequences, motion, equippedWeapon).supported);
  const disabled = !ready || selectionBusy || motion === 'static' || !supported;
  $('pause').disabled = disabled;
  $('replay-motion').disabled = disabled;
  $('pause').setAttribute('aria-pressed', String(!animationPlaying));
  $('pause').textContent = animationFinished ? 'Повторить' : animationPlaying ? 'Пауза' : 'Продолжить';
}
function refreshMotionOptions() {
  if (!ct) { syncMotionControls(); return; }
  const sequences = ct.userData.sequences;
  for (const option of motionSelect.options) {
    option.disabled = !resolveMotion(sequences, option.value, equippedWeapon).supported;
  }
  const selected = resolveMotion(sequences, motion, equippedWeapon);
  resolvedMotion = selected.supported ? selected
    : ['idle1', 'static'].map(id => resolveMotion(sequences, id, equippedWeapon)).find(item => item.supported);
  const status = $('motion-status');
  status.hidden = selected.supported;
  status.textContent = selected.reason === 'weapon-has-no-reload'
    ? 'Для ножа перезарядка недоступна.'
    : 'Это движение недоступно для выбранной модели.';
  syncMotionControls();
}
function setMotion(value) {
  motion = motionDefinitions.some(item => item.id === value) ? value : 'run';
  motionSelect.value = motion;
  animationTime = 0;
  animationCycleTime = 0;
  animationFinished = false;
  animationPlaying = motion !== 'static';
  refreshMotionOptions();
  invalidatePreview();
}
const appliedPose = {player:null, hat:null, weapon:null, motion:null, time:null, resolution:null};
const posture = value => value === 'static' ? 'static' : value?.startsWith('crouch') ? 'crouch' : 'standing';
function placePlayer(previousMotion) {
  const close = isClose();
  const previousTarget = previousMotion === null ? null : viewTarget(close);
  const effectiveMotion = resolvedMotion.definition.id;
  const metrics = effectiveMotion === 'static' ? measureMDLPose(ct)
    : posture(effectiveMotion) === 'crouch' ? crouchedFraming || animatedFraming : animatedFraming;
  rig.position.y = platformTop - metrics.floor;
  rig.updateMatrixWorld(true);
  modelHeight = effectiveMotion === 'static' ? metrics.height : animatedFraming.height;
  modelHead.copy(metrics.head).applyMatrix4(rig.matrixWorld);
  if (previousTarget) {
    const shift = viewTarget(close).sub(previousTarget);
    controls.target.add(shift);
    camera.position.add(shift);
  }
}
function updateAnimation(delta, elapsed = delta) {
  if (!ready || !ct?.userData.updatePose) return;
  if (animationPlaying) {
    const step = resolvedMotion?.playback === 'repeat' ? elapsed : delta;
    const clock = advanceMotionClock(resolvedMotion, {time: animationTime, cycleTime: animationCycleTime}, step, animationSpeed);
    animationTime = clock.time;
    animationCycleTime = clock.cycleTime;
  }

  const motionChanged = appliedPose.player !== ct || appliedPose.motion !== motion || appliedPose.resolution !== resolvedMotion;
  if (!motionChanged && appliedPose.time === animationTime &&
      appliedPose.hat === hat && appliedPose.weapon === weapon) return;

  if (!resolvedMotion?.supported) return;
  const playback = applyMotionPose(ct, resolvedMotion, animationTime);
  animationTime = playback.time;
  if (playback.finished && !animationFinished) {
    animationTime = playback.time;
    animationFinished = true;
    animationPlaying = false;
    syncMotionControls();
  }
  const previousMotion = appliedPose.player === ct ? appliedPose.resolution?.definition.id : null;
  if (previousMotion == null || posture(previousMotion) !== posture(resolvedMotion.definition.id)) placePlayer(previousMotion ?? null);
  const head = ct.userData.bones.get('Bip01 Head');
  if (head) {
    animatedHead.setFromMatrixPosition(head).applyMatrix4(rig.matrixWorld);
    if (isClose()) {
      headShift.subVectors(animatedHead, modelHead);
      controls.target.add(headShift);
      camera.position.add(headShift);
    }
    modelHead.copy(animatedHead);
  }
  hat?.userData.updatePose?.(resolvedMotion.sequenceIndex, playback.time, ct.userData.bones);
  if (weapon) fitWeapon(weapon, ct, animatedFraming.height);
  appliedPose.player = ct;
  appliedPose.hat = hat;
  appliedPose.weapon = weapon;
  appliedPose.motion = motion;
  appliedPose.time = animationTime;
  appliedPose.resolution = resolvedMotion;
}
function startPreviewLoop(viewport) {
  const canObserve = typeof IntersectionObserver === 'function';
  let inView = !canObserve;
  let request = null;
  let dirty = true;
  let previous = null;

  const blockingDialogs = [$('cart-dialog'), $('photo-dialog')];
  const canDraw = () => sceneAvailable && inView && !document.hidden && !blockingDialogs.some(dialog => dialog.open);
  const isAnimated = () => ready && (controls.autoRotate ||
    (animationPlaying && resolvedMotion?.supported && resolvedMotion.definition.id !== 'static'));
  function schedule() {
    if (request === null && canDraw()) request = requestAnimationFrame(draw);
  }
  function invalidate() {
    dirty = true;
    schedule();
  }
  function draw(now) {
    request = null;
    if (!canDraw()) { previous = null; return; }
    const elapsed = previous === null ? 0 : Math.max(0,(now - previous)/1000);
    const animating = isAnimated();
    if (animating && reducedPreviewQuality && previous !== null && elapsed < 0.031) {
      schedule();
      return;
    }
    const delta = Math.min(elapsed, .1);
    previous = now;
    updateAnimation(delta, elapsed);
    const cameraMoved = controls.update(delta);
    if (dirty || animating || cameraMoved) {
      renderer.render(scene, camera);
      dirty = false;
    }
    if (isAnimated() || cameraMoved) schedule();
    if (request === null) previous = null;
  }
  function sync() {
    previous = null;
    if (canDraw()) invalidate();
    else if (request !== null) {
      cancelAnimationFrame(request);
      request = null;
    }
  }
  const observer = canObserve ? new IntersectionObserver(records => {
    inView = records[records.length - 1].isIntersecting;
    sync();
  }) : null;
  const dialogObserver = new MutationObserver(sync);
  for (const dialog of blockingDialogs) dialogObserver.observe(dialog,{attributes:true,attributeFilter:['open']});
  observer?.observe(viewport);
  document.addEventListener('visibilitychange', sync);
  controls.addEventListener('change',invalidate);
  sync();
  return {
    invalidate,
    sync,
    stop() {
      observer?.disconnect();
      dialogObserver.disconnect();
      document.removeEventListener('visibilitychange', sync);
      controls.removeEventListener('change',invalidate);
      if (request !== null) cancelAnimationFrame(request);
      request = null;
    },
  };
}
function snapshot(){
  if (!ready) return;
  updateAnimation(0);
  renderer.render(scene,camera);
  // Read synchronously in the same frame so the renderer can discard its drawing buffer.
  const url=renderer.domElement.toDataURL('image/png');
  $('photo').src=url;
  $('download-photo').href=url;
  $('photo-dialog').showModal();
  const share=$('share-photo');
  share.hidden=!navigator.share;
  share.onclick=async()=>{
    try {
      const blob=await (await fetch(url)).blob(),file=new File([blob],'zm-rush.png',{type:'image/png'});
      if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'Мой образ ZM RUSH'});
      else await navigator.share({title:'Мой образ ZM RUSH',text:current?.name||player.name});
    }catch(error){if(error.name!=='AbortError')toast('Не удалось поделиться снимком.');}
  };
}

async function choosePlayer(id,initial=false,download){
 if (!sceneAvailable || selectionBusy) return false;
 const started=performance.now(),nextPlayer=playerModels.find(m=>m.id===id)||playerModels[0],token=++playerTicket;
 const isCurrent = () => token === playerTicket && sceneAvailable;
 ready=false;
 const message = 'Загружаем '+nextPlayer.name+'…';
 beginLoading(message);
 let next=null,nextHat=null;
 try{
  next=playerCache.get(nextPlayer.id);
  if(next){playerCache.delete(nextPlayer.id);playerCache.set(nextPlayer.id,next);}
  if(!next){
   next=await loadPreviewModel(nextPlayer.file,data=>parseMDL(data,null,1,{},1,indexedMesh),
    {onProgress:p=>{if(isCurrent())progressFor(message)(p);}},isCurrent,download);
   if (!next) return false;
   playerCache.set(nextPlayer.id,next);
  }
  ensureHead(next,nextPlayer.headAttachment);
  next.userData.updatePose(1,0);
  const nextFraming = measureMDLPose(next);
  const crouch = resolveMotion(next.userData.sequences, 'crouch_idle');
  let nextCrouchedFraming = null;
  if (crouch.supported) {
    // GoldSrc lowers the player's origin for the crouched hull. Anchor that
    // posture once instead of re-grounding every frame and cancelling jumps.
    applyMotionPose(next, crouch, 0);
    nextCrouchedFraming = measureMDLPose(next);
    next.userData.updatePose(1,0);
  }
  if(current){
   const {key,cached}=fittedHat(current,body,nextPlayer);nextHat=cached;
   if(!nextHat){
    nextHat=await loadPreviewModel('hats/'+current.id+'.mdl',
     data=>parseMDL(data,next.userData.bones,0,body,hatScaleFor(nextPlayer,current),indexedMesh),undefined,isCurrent);
    if (!nextHat) return false;
    fittedHats.set(key,nextHat);
   }
  }
  if(!isCurrent())return false;
  if(hat)rig.remove(hat);if(ct)rig.remove(ct);
  ct=next;hat=nextHat;player=nextPlayer;appliedPose.player=null;rig.add(ct);if(hat)rig.add(hat);trimHats();trimPlayers();
  animatedFraming=nextFraming;
  crouchedFraming=nextCrouchedFraming;
  animationTime=0;ready=true;
  refreshPreviewQuality();
  animationCycleTime=0;
  if (animationFinished) animationPlaying=motion!=='static';
  animationFinished=false;
  refreshMotionOptions();
  updateAnimation(0);
  frame(isClose());$('model-label').textContent=player.name;
  refreshPreviewPrices();
  $('detail-name').textContent=current?.name||player.name;$('detail-file').textContent=current?current.id+'.mdl · '+player.name:'Модель '+player.name;
  writeJSON('zm-rush-player',player.id);
  performance.measure('zm-rush:model-ready',{start:started});
  modelBrowser?.setSelected(player.id,!initial);
  purchase.refresh(initial ? undefined : 'model');
  toast('');
 } catch (error) {
  if (isCurrent()) {
    ready = Boolean(ct);
    showPreviewError('Не удалось загрузить модель. Повторите загрузку или выберите другую модель.',()=>choosePlayer(nextPlayer.id,initial));
  }
  console.error(error);
  return false;
 } finally {
  if (token === playerTicket) {
    $('loading').hidden = ready && !retryPreview;
    setBusy(false);
  }
 }
 if (needsLegacyLook) {
  needsLegacyLook = false;
  savedLook = {...savedLook,playerId:player.id};
  writeJSON('zm-rush-look',savedLook);
  await restoreLook(false);
 }
 return true;
}
function refreshPreviewQuality() {
  const vertices = ct?.userData.meshes.reduce((total,mesh)=>total+mesh.boneIds.length,0) || 0;
  reducedPreviewQuality = coarsePointer.matches && vertices > HEAVY_MODEL_VERTICES;
  if (renderer) renderer.setPixelRatio(Math.min(devicePixelRatio,reducedPreviewQuality ? 1.25 : 2));
  resizePreview();
}
async function restoreLook(notify = true) {
  if (!savedLook || !ready || selectionBusy) return;
  const look = savedLook;
  if (look.playerId !== player.id && playerModels.some(model=>model.id === look.playerId)) {
    if (!await choosePlayer(look.playerId)) return;
  }
  const savedHat = entries.find(entry=>entry.id === look.id) || null;
  const savedBody = look.body && typeof look.body === 'object' && !Array.isArray(look.body) ? look.body : {};
  if (!await selectLook(savedHat,savedBody,false)) return;
  if (!await selectWeapon(weapons.find(entry=>entry.id === look.weaponId) || null,false)) return;
  if (notify) toast('Образ восстановлен.');
}
$('retry-model').onclick = () => { if (!selectionBusy) return retryPreview?.(); };
$('search').oninput=renderCatalog;document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;syncFilters();renderCatalog();});document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('full').onclick=()=>frame(false);$('head').onclick=()=>frame(true);$('remove').onclick=()=>selectLook(null,{},true);$('rotate').onclick=()=>{if(!sceneAvailable)return;controls.autoRotate=!controls.autoRotate;$('rotate').setAttribute('aria-pressed',String(controls.autoRotate));invalidatePreview();};
motionSelect.onchange = () => {
  setMotion(motionSelect.value);
  try { localStorage.setItem('zm-rush-motion', JSON.stringify(motion)); } catch {}
};
$('speed').onchange=e=>animationSpeed=Number(e.target.value);
$('pause').onclick=()=>{
  if (animationFinished) setMotion(motion);
  else { animationPlaying=!animationPlaying; syncMotionControls(); }
  invalidatePreview();
};
$('replay-motion').onclick=()=>{setMotion(motion);updateAnimation(0);};
motionSelect.value = motion;
setMotion(motion);
$('slot-a').onclick=()=>chooseSlot('a');$('slot-b').onclick=()=>chooseSlot('b');
$('restore-look').hidden=!savedLook;
$('restore-look').onclick=()=>restoreLook();
$('save').onclick=()=>{
  const look = {playerId:player.id,id:current?.id||null,body,weaponId:equippedWeapon?.id||null};
  if (writeJSON('zm-rush-look',look)) {
    savedLook=look;
    $('restore-look').hidden=false;
    toast('Образ сохранён на этом устройстве.');
  } else toast('Не удалось сохранить образ.');
};
$('snapshot').onclick=snapshot;$('close-photo').onclick=()=>$('photo-dialog').close();$('photo-dialog').addEventListener('click',e=>{if(e.target===$('photo-dialog'))$('photo-dialog').close();});
document.addEventListener('keydown',e=>{
 if(e.key!=='/'||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName))return;
 const search = document.querySelector('.catalog-panel:not([hidden]) input[type="search"]');
 if(search){e.preventDefault();search.focus();}
});
document.querySelectorAll('[data-total]').forEach(el=>el.textContent=entries.length);
refreshSlots();syncFilters();renderCatalog();
const initialTab = new URLSearchParams(location.search).get('tab');
modelBrowser=setupModelBrowser({models:playerModels,selectedId:player.id,english,isReady:()=>sceneAvailable&&Boolean(ct),isSceneAvailable:()=>sceneAvailable,onChoose:choosePlayer,initialTab,
 priceLabel: model => productPrice(modelPrices[model.id]),
 createCartButton: model => purchase.createCartButton(modelProduct(model))});
const syncWeapons = setupWeaponBrowser(selectWeapon, entry => purchase.createCartButton(weaponProduct(entry)));
setBusy(false);
const studio = $('viewport').closest('.studio');
const toolsPanel = $('look-tools');
const quickActions = document.querySelector('.mobile-quick-actions');
const backToTop = $('back-to-top');
function showMotionTools(open) {
  toolsPanel.classList.toggle('is-docked',open);
  $('quick-motion').setAttribute('aria-expanded',String(open));
}
function pinPreview(pinned) {
  studio.classList.toggle('is-pinned',pinned);
  $('quick-preview').setAttribute('aria-pressed',String(pinned));
  $('quick-preview').textContent = pinned ? 'Скрыть 3D' : 'Показать 3D';
}
$('quick-preview').onclick = () => {
  showMotionTools(false);
  pinPreview(!studio.classList.contains('is-pinned'));
  if (studio.classList.contains('is-pinned') && studio.getBoundingClientRect().bottom <= 0)
    studio.scrollIntoView({block:'start'});
};
$('quick-motion').onclick = () => {
  const open = !toolsPanel.classList.contains('is-docked');
  showMotionTools(open);
  if (open) motionSelect.focus({preventScroll:true});
};
document.addEventListener('pointerdown',event=>{
  if (toolsPanel.classList.contains('is-docked') &&
      !event.target.closest('#look-tools, #quick-motion')) showMotionTools(false);
});
document.addEventListener('keydown',event=>{
  if (event.key === 'Escape' && toolsPanel.classList.contains('is-docked')) {
    showMotionTools(false);
    $('quick-motion').focus({preventScroll:true});
  }
});
function syncQuickActions() {
  if (mobileLayout.matches) quickActions.append(backToTop);
  else {
    quickActions.before(backToTop);
    pinPreview(false);
    showMotionTools(false);
  }
}
syncQuickActions();
mobileLayout.addEventListener?.('change',syncQuickActions);
coarsePointer.addEventListener?.('change',refreshPreviewQuality);

function createPreviewScene() {
  scene = new T.Scene();
  lighting(scene);
  camera = new T.PerspectiveCamera(40,1,.1,500);
  rig = new T.Group();
  rig.rotation.x = -Math.PI/2;
  rig.position.y = 37;
  scene.add(rig);
  const floor = new T.Mesh(new T.CylinderGeometry(27,29,1,64),new T.MeshLambertMaterial({color:0x34432e}));
  floor.position.y = -.2;
  const ring = new T.Mesh(new T.TorusGeometry(28,.12,8,96),new T.MeshBasicMaterial({color:0x88a65a}));
  ring.rotation.x = Math.PI/2;
  ring.position.y = .35;
  const grid = new T.GridHelper(280,28,0x40503a,0x2a3829);
  grid.position.y = -.8;
  scene.add(floor,ring,grid);
}

let releaseRenderer = null;
async function loadGraphics() {
  if (T) return;
  const [three,orbit,mdl,weapons] = await Promise.all([
    import('./vendor/three.module.js'), import('./vendor/OrbitControls.js'),
    import('./mdl.js?v=8'), import('./weapon-fit.js?v=1'),
  ]);
  T = three;
  OrbitControls = orbit.OrbitControls;
  ({parseMDL,disposeMDL,measureMDLPose} = mdl);
  ({prepareWeapon,fitWeapon} = weapons);
  modelHead = new T.Vector3(0,56,0);
  animatedHead = new T.Vector3();
  headShift = new T.Vector3();
}
async function openPreview() {
  const viewport = $('viewport');
  const oldTarget = controls?.target.clone();
  const wasRotating = controls?.autoRotate ?? false;
  releaseRenderer?.();
  releaseRenderer = null;
  renderer = null;
  const loadingLabel = 'Загружаем '+player.name+'…';
  beginLoading(loadingLabel);
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2',{alpha:true,antialias:true});
    if (!context) throw Error('WebGL2 unavailable');
    const download = ct ? null : load(player.file,{onProgress:progressFor(loadingLabel)});
    // The download overlaps the graphics imports. The fit handles its result.
    download?.catch(()=>{});
    await loadGraphics();
    renderer = new T.WebGLRenderer({canvas,context,alpha:true,antialias:true});
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .95;
    viewport.append(renderer.domElement);
    if (!scene) createPreviewScene();
    controls = new OrbitControls(camera,renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.maxPolarAngle = Math.PI*.49;
    controls.autoRotateSpeed = 2.1;
    controls.autoRotate = wasRotating;
    if (oldTarget) controls.target.copy(oldTarget);
    resizePreview = () => {
      const {width,height} = viewport.getBoundingClientRect();
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width,height);
      camera.aspect = width/height;
      camera.updateProjectionMatrix();
      invalidatePreview();
    };
    const observer = new ResizeObserver(resizePreview);
    observer.observe(viewport);
    sceneAvailable = true;
    const loop = startPreviewLoop(viewport);
    invalidatePreview = loop.invalidate;
    const lost = event => {
      event.preventDefault();
      ++ticket;
      ++playerTicket;
      sceneAvailable = false;
      ready = false;
      loop.sync();
      showPreviewError('3D-показ прерван. Попробуйте запустить заново.',openPreview,'Возобновить 3D');
      setBusy(false);
    };
    const restored = () => {
      if (sceneAvailable) return;
      sceneAvailable = true;
      ready = Boolean(ct);
      retryPreview = null;
      $('loading').hidden = ready;
      $('retry-model').hidden = true;
      setBusy(false);
      loop.sync();
      if (!ready) void choosePlayer(player.id,true);
    };
    canvas.addEventListener('webglcontextlost',lost);
    canvas.addEventListener('webglcontextrestored',restored);
    releaseRenderer = () => {
      observer.disconnect();
      loop.stop();
      canvas.removeEventListener('webglcontextlost',lost);
      canvas.removeEventListener('webglcontextrestored',restored);
      controls.dispose();
      renderer.dispose();
      canvas.remove();
      invalidatePreview = () => {};
      resizePreview = () => {};
    };
    ready = Boolean(ct);
    retryPreview = null;
    $('retry-model').hidden = true;
    $('loading').hidden = ready;
    refreshPreviewQuality();
    if (ready) frame(isClose());
    setBusy(false);
    if (!ready) await choosePlayer(player.id,true,download);
  } catch(error) {
    releaseRenderer?.();
    releaseRenderer = null;
    renderer = null;
    sceneAvailable = false;
    ready = false;
    showPreviewError('3D временно недоступно. Каталог и корзина работают.',openPreview,'Попробовать снова');
    setBusy(false);
    console.error(error);
  }
}
await openPreview();
