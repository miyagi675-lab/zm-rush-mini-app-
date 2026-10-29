import {setupPurchase} from './purchase.js?v=3';
import {english} from './language.js?v=2';
import * as T from './vendor/three.module.js';
import {OrbitControls} from './vendor/OrbitControls.js';
import {parseMDL,disposeMDL} from './mdl.js?v=5';
import {entries,playerModels} from './catalog.js?v=3';
import {loadModel as load,prefetchModel} from './asset-loader.js?v=2';

const $=id=>document.getElementById(id);
const categories={heroes:'ПЕРСОНАЖ',animals:'ЗВЕРИ',other:'ДРУГОЕ'};
const fittedHats=new Map();
const playerCache=new Map();
function fittedHat(entry,nextBody,model=player){const key=model.id+':'+entry.id+':'+JSON.stringify(nextBody);const cached=fittedHats.get(key);if(cached){fittedHats.delete(key);fittedHats.set(key,cached);}return {key,cached};}
function trimHats(){for(const [key,value] of fittedHats){if(fittedHats.size<=8)break;if(value!==hat){fittedHats.delete(key);disposeMDL(value);}}}
const readJSON=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback));}catch{return fallback;}};
const favorites=new Set(readJSON('zm-rush-favorites',[]));
const slots=readJSON('zm-rush-slots',{a:null,b:null});
let ct,hat,scene,camera,renderer,controls,rig,current=null,body={},ticket=0,filter='all',ready=false;
let player=playerModels.find(m=>m.id===readJSON('zm-rush-player','gign'))||playerModels[0],modelHeight=62,modelHead=new T.Vector3(0,56,0),playerTicket=0;
let activeSlot='a',animationTime=0,animationSpeed=1,animationPlaying=true,motion='idle1',cameraView='angle';
const telegram=window.Telegram?.WebApp;
try{telegram?.ready();telegram?.expand();if(telegram?.isVersionAtLeast?.('6.1')){telegram.setHeaderColor('#101513');telegram.setBackgroundColor('#101513');}}catch{}

const toast=text=>{$('toast').textContent=text;};
setupPurchase(()=>current,()=>!ready||!$('loading').hidden);
function syncSelection(){for(const card of $('items').children){const selected=card.dataset.id===current?.id;card.classList.toggle('selected',selected);card.querySelector('.item-pick').setAttribute('aria-pressed',String(selected));card.querySelector('.check')?.remove();if(selected){const mark=document.createElement('span');mark.className='check';mark.textContent='✓';card.append(mark);}}}
function renderCatalog(){
 const term=$('search').value.trim().toLocaleLowerCase('ru');
 const visible=entries.filter(e=>(filter==='all'||filter==='favorites'||e.category===filter)&&(!term||(e.name+' '+english(e.name)+' '+e.id).toLocaleLowerCase('ru').includes(term))&&(filter!=='favorites'||favorites.has(e.id)));
 $('items').replaceChildren();$('count').textContent=filter==='favorites'?visible.length+' избранных':visible.length+' / '+entries.length;
 $('empty').hidden=!!visible.length;$('empty').textContent=filter==='favorites'?'Добавь понравившиеся модели звёздочкой.':'Ничего не нашли. Попробуй другое название.';
 for(const e of visible){
  const card=document.createElement('article');card.className='item'+(current?.id===e.id?' selected':'');card.dataset.id=e.id;
  const pick=document.createElement('button');pick.className='item-pick';pick.setAttribute('aria-label','Примерить: '+e.name);pick.setAttribute('aria-pressed',String(current?.id===e.id));
  const img=document.createElement('img');img.alt='';img.loading='lazy';img.decoding='async';img.width=256;img.height=256;img.src='assets/previews-v2/'+e.id+'.webp';
  const name=document.createElement('span');name.className='item-name';name.textContent=e.name;
  const category=document.createElement('span');category.className='item-type';category.textContent=categories[e.category];
  pick.append(img,name,category);pick.onclick=()=>selectLook(e,{},true);pick.onpointerenter=pick.onfocus=()=>{if(ready)prefetchModel('hats/'+e.id+'.mdl');};
  const fav=document.createElement('button');fav.className='favorite';fav.textContent=favorites.has(e.id)?'★':'☆';fav.title=favorites.has(e.id)?'Убрать из избранного':'Добавить в избранное';fav.setAttribute('aria-label',fav.title);fav.setAttribute('aria-pressed',String(favorites.has(e.id)));
  fav.onclick=ev=>{ev.stopPropagation();favorites.has(e.id)?favorites.delete(e.id):favorites.add(e.id);localStorage.setItem('zm-rush-favorites',JSON.stringify([...favorites]));renderCatalog();};
  card.append(pick,fav);if(current?.id===e.id){const check=document.createElement('span');check.className='check';check.textContent='✓';card.append(check);}$('items').append(card);
 }
}
function syncFilters(){document.querySelectorAll('[data-filter]').forEach(b=>{const on=b.dataset.filter===filter;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});}
function lighting(target){target.add(new T.HemisphereLight(0xe6f5d8,0x6b7866,2));const key=new T.DirectionalLight(0xfff1db,1.4);key.position.set(60,100,90);target.add(key);const fill=new T.DirectionalLight(0xa7d1ef,.7);fill.position.set(-65,30,-40);target.add(fill);}
function isClose(){return $('head').classList.contains('active');}
function frame(close=false){
 if(!ready)return;const ratio=modelHeight/62,target=close?modelHead.clone():new T.Vector3(0,modelHeight*.56,0);controls.target.copy(target);const far=(close?62:112)*ratio,high=(close?8:29)*ratio;
 const offsets={front:new T.Vector3(far,high,0),side:new T.Vector3(0,high,far),back:new T.Vector3(-far,high,0),angle:new T.Vector3(far,high,(close?34:65)*ratio)};
 camera.position.copy(target).add(offsets[cameraView]);controls.minDistance=12*ratio;controls.maxDistance=230*ratio;controls.update();
 $('full').classList.toggle('active',!close);$('full').setAttribute('aria-pressed',String(!close));$('head').classList.toggle('active',close);$('head').setAttribute('aria-pressed',String(close));
}
function setView(value){cameraView=value;document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===value));frame(isClose());}
function refreshSlots(){for(const key of ['a','b']){const button=$('slot-'+key),look=slots[key];button.setAttribute('aria-pressed',String(activeSlot===key));button.querySelector('span').textContent=look?.name||'Без шапки';}}
function setBusy(value){$('save').disabled=value;$('snapshot').disabled=value;$('pause').disabled=value||motion==='static';$('player-model').disabled=value;}
function progressFor(label){return ({percent})=>{if(!$('loading').hidden)$('loading').textContent=label+(percent?' '+percent+'%':'');};}
async function selectLook(entry,nextBody={},writeSlot=true){
 if(!ready)return;const started=performance.now(),token=++ticket;$('loading').hidden=false;$('loading').textContent=entry?'Примеряем '+entry.name+'…':'Снимаем шапку…';setBusy(true);
 try{
  let next=null,key;if(entry){const lookup=fittedHat(entry,nextBody);key=lookup.key;next=lookup.cached;if(!next){const buffer=await load('hats/'+entry.id+'.mdl',{onProgress:p=>{if(token===ticket)progressFor('Примеряем '+entry.name+'…')(p);}});if(token!==ticket)return;next=parseMDL(buffer,ct.userData.bones,0,nextBody,player.hatScale);fittedHats.set(key,next);}}
  if(token!==ticket)return;if(hat)rig.remove(hat);hat=next;if(hat)rig.add(hat);trimHats();current=entry;body=nextBody;
  $('selected-name').textContent=entry?.name||'Без шапки';$('detail-name').textContent=entry?.name||'Классическая модель';$('detail-file').textContent=entry?entry.id+'.mdl · '+player.name:'Модель '+player.name;$('variants').replaceChildren();
  for(const variant of hat?.userData.variants||[]){const label=document.createElement('label');label.textContent='Вариант';const select=document.createElement('select');variant.names.forEach((name,index)=>{const option=document.createElement('option');option.value=index;option.textContent=name;select.append(option);});select.value=body[variant.part]||0;select.onchange=()=>selectLook(current,{...body,[variant.part]:Number(select.value)},true);label.append(select);$('variants').append(label);}
  if(writeSlot){slots[activeSlot]=entry?{id:entry.id,name:entry.name,body:{...nextBody}}:null;localStorage.setItem('zm-rush-slots',JSON.stringify(slots));}
  refreshSlots();syncSelection();toast('');performance.measure('zm-rush:accessory-ready',{start:started});try{telegram?.HapticFeedback?.selectionChanged();}catch{}
 }catch(e){console.error(e);toast(e.message+' — попробуйте ещё раз.');}finally{if(token===ticket){$('loading').hidden=true;setBusy(false);}}
}
function chooseSlot(key){activeSlot=key;refreshSlots();const look=slots[key],entry=look?entries.find(e=>e.id===look.id):null;selectLook(entry,look?.body||{},false);}
function setMotion(value){motion=value;animationTime=0;animationPlaying=value!=='static';$('pause').disabled=value==='static';$('pause').setAttribute('aria-pressed',String(!animationPlaying));$('pause').textContent=animationPlaying?'Пауза':'Продолжить';}
function updateAnimation(delta){if(!ready||!ct?.userData.updatePose)return;if(animationPlaying)animationTime+=delta*animationSpeed;const wanted=motion==='idle1'?'idle1':motion;const sequence=motion==='static'?0:(ct.userData.sequences.find(s=>s.name.trim().toLowerCase()===wanted)?.index||1);ct.userData.updatePose(sequence,animationTime);hat?.userData.updatePose?.(sequence,animationTime,ct.userData.bones);}
function snapshot(){renderer.render(scene,camera);const url=renderer.domElement.toDataURL('image/png');$('photo').src=url;$('download-photo').href=url;$('photo-dialog').showModal();const share=$('share-photo');share.hidden=!navigator.share;share.onclick=async()=>{try{const blob=await (await fetch(url)).blob(),file=new File([blob],'zm-rush.png',{type:'image/png'});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:'Мой образ ZM RUSH'});else await navigator.share({title:'Мой образ ZM RUSH',text:current?.name||player.name});}catch(e){if(e.name!=='AbortError')toast('Не удалось поделиться снимком.');}};}

async function choosePlayer(id,initial=false){
 const started=performance.now(),nextPlayer=playerModels.find(m=>m.id===id)||playerModels[0],token=++playerTicket;
 ready=false;$('loading').hidden=false;$('loading').textContent='Загружаем '+nextPlayer.name+'…';setBusy(true);
 let next=null,nextHat=null;
 try{
  next=playerCache.get(nextPlayer.id);
  if(!next){next=parseMDL(await load(nextPlayer.file,{onProgress:p=>{if(token===playerTicket)progressFor('Загружаем '+nextPlayer.name+'…')(p);}}),null,1);playerCache.set(nextPlayer.id,next);}
  if(current){const lookup=fittedHat(current,body,nextPlayer);nextHat=lookup.cached;if(!nextHat){nextHat=parseMDL(await load('hats/'+current.id+'.mdl'),next.userData.bones,0,body,nextPlayer.hatScale);fittedHats.set(lookup.key,nextHat);}}
  if(token!==playerTicket)return;
  if(hat)rig.remove(hat);if(ct)rig.remove(ct);
  ct=next;hat=nextHat;player=nextPlayer;ct.userData.updatePose(1,0);rig.add(ct);if(hat){hat.userData.updatePose(1,0,ct.userData.bones);rig.add(hat);}trimHats();
  rig.position.y=0;rig.updateMatrixWorld(true);let bounds=new T.Box3().setFromObject(ct);rig.position.y=-bounds.min.y;rig.updateMatrixWorld(true);
  bounds.setFromObject(ct);modelHeight=bounds.max.y;modelHead.setFromMatrixPosition(ct.userData.bones.get('Bip01 Head')).applyMatrix4(rig.matrixWorld);
  animationTime=0;ready=true;frame(isClose());$('player-model').value=player.id;$('model-label').textContent=player.name;
  $('detail-name').textContent=current?.name||'Классическая модель';$('detail-file').textContent=current?current.id+'.mdl · '+player.name:'Модель '+player.name;
  localStorage.setItem('zm-rush-player',JSON.stringify(player.id));performance.measure('zm-rush:model-ready',{start:started});
 }catch(e){ready=!!ct;$('player-model').value=player.id;toast('Не удалось загрузить модель. Попробуйте ещё раз.');console.error(e);}
 finally{if(token===playerTicket){$('loading').hidden=ready;setBusy(!ready);}}
}
$('player-model').onchange=e=>choosePlayer(e.target.value);
$('search').oninput=renderCatalog;document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;syncFilters();renderCatalog();});document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('full').onclick=()=>frame(false);$('head').onclick=()=>frame(true);$('remove').onclick=()=>selectLook(null,{},true);$('rotate').onclick=()=>{controls.autoRotate=!controls.autoRotate;$('rotate').setAttribute('aria-pressed',String(controls.autoRotate));};
$('motion').onchange=e=>setMotion(e.target.value);$('speed').onchange=e=>animationSpeed=Number(e.target.value);$('pause').onclick=()=>{animationPlaying=!animationPlaying;$('pause').setAttribute('aria-pressed',String(!animationPlaying));$('pause').textContent=animationPlaying?'Пауза':'Продолжить';};
$('slot-a').onclick=()=>chooseSlot('a');$('slot-b').onclick=()=>chooseSlot('b');
$('save').onclick=()=>{try{localStorage.setItem('zm-rush-look',JSON.stringify({id:current?.id||null,body}));toast('Образ сохранён на этом устройстве.');}catch{toast('Не удалось сохранить образ.');}};
$('snapshot').onclick=snapshot;$('close-photo').onclick=()=>$('photo-dialog').close();$('photo-dialog').addEventListener('click',e=>{if(e.target===$('photo-dialog'))$('photo-dialog').close();});
document.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','SELECT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();$('search').focus();}});
document.querySelectorAll('[data-total]').forEach(el=>el.textContent=entries.length);$('player-model').value=player.id;
refreshSlots();syncFilters();renderCatalog();
try{
 renderer=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.95;$('viewport').append(renderer.domElement);
 scene=new T.Scene();lighting(scene);camera=new T.PerspectiveCamera(40,1,.1,500);controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.maxPolarAngle=Math.PI*.49;controls.autoRotateSpeed=.7;
 rig=new T.Group();rig.rotation.x=-Math.PI/2;rig.position.y=37;scene.add(rig);const floor=new T.Mesh(new T.CylinderGeometry(27,29,1,64),new T.MeshLambertMaterial({color:0x34432e}));floor.position.y=-.2;scene.add(floor);const ring=new T.Mesh(new T.TorusGeometry(28,.12,8,96),new T.MeshBasicMaterial({color:0x88a65a}));ring.rotation.x=-Math.PI/2;ring.position.y=.35;scene.add(ring);const grid=new T.GridHelper(280,28,0x40503a,0x2a3829);grid.position.y=-.8;scene.add(grid);
 const resize=()=>{const {width,height}=$('viewport').getBoundingClientRect();renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe($('viewport'));resize();
 await choosePlayer(player.id,true);if(!ready)throw Error('Модель недоступна');
 let previous=performance.now();renderer.setAnimationLoop(now=>{const delta=Math.min((now-previous)/1000,.1);previous=now;if(!document.hidden){updateAnimation(delta);controls.update(delta);renderer.render(scene,camera);}});
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('loading').hidden=false;$('loading').textContent='3D-показ прерван. Обновите приложение.';});
 const saved=readJSON('zm-rush-look',null);if(saved?.id){const entry=entries.find(e=>e.id===saved.id);if(entry)await selectLook(entry,saved.body||{},true);}
}catch(e){$('loading').hidden=false;$('loading').textContent='Не удалось запустить 3D. Обновите приложение или откройте его в современном браузере.';console.error(e);}
