import {modelGroups,modelGroupById,modelPreview} from './model-groups.js?v=5';
import {createPreviewLoader} from './preview-loader.js?v=1';
import {normalizeCatalogSearch} from './catalog-search.js?v=1';

const cardStatus = {
 unavailable: 'Примерка недоступна',
 loading: 'Загрузка…',
 selected: 'Выбрано',
 available: 'Смотреть в 3D',
};

export function setupModelBrowser({models,selectedId,onChoose,english,isReady=()=>true,isSceneAvailable=()=>true,initialTab=null,createCartButton,priceLabel=()=>''}){
 const $=id=>document.getElementById(id),byId=new Map(models.map(m=>[m.id,m]));
 const searchById=new Map(models.map(model=>[
  model.id, normalizeCatalogSearch([model.name,model.nameEn||english(model.name),model.id].join(' ')),
 ]));
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
 const store=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
 const savedFavorites=read('zm-rush-model-favorites',[]),savedRecent=read('zm-rush-model-recent',[]);
 const favorites=new Set((Array.isArray(savedFavorites)?savedFavorites:[]).filter(id=>byId.has(id)));
 let recent=(Array.isArray(savedRecent)?savedRecent:[]).filter(id=>byId.has(id)),category='all',busy=false,pending=null,rendered=false;
 const list=$('model-items'),search=$('model-search'),filters=$('model-filters'),sort=$('model-sort');
 const loadModelPreviews = createPreviewLoader();
 const tabs = ['hats','models','weapons'];
 const grids = {hats:$('items'),models:list,weapons:$('weapon-items')};
 let activeTab = 'hats';
 const displayName=model=>document.documentElement.lang==='en'?(model.nameEn||english(model.name)):model.name;
 function button(text,fn){const el=document.createElement('button');el.type='button';el.textContent=text;el.onclick=fn;return el;}
 function showTab(tab,focus=false,resetScroll=true){
  if (!tabs.includes(tab)) return;
  activeTab=tab;
  for(const name of tabs){const active=name===tab;$('tab-'+name).setAttribute('aria-selected',String(active));$('tab-'+name).tabIndex=active?0:-1;$(name+'-panel').hidden=!active;}
  if(tab==='models'&&!rendered)render();
  if(focus)$('tab-'+tab).focus({preventScroll:true});
  if(resetScroll){
   grids[tab].scrollTop=0;
   if(matchMedia('(max-width:800px)').matches){
    const catalogTop=document.querySelector('.catalog').getBoundingClientRect().top+window.scrollY;
    const previewHeight=document.querySelector('.studio').getBoundingClientRect().height;
    const start=Math.max(0,catalogTop-previewHeight-12);
    // Switching tabs keeps the preview in place and only returns upward if
    // the catalog had already been scrolled beyond its first row.
    if(window.scrollY>start)window.scrollTo({top:start,behavior:'auto'});
   }
  }
  updateBackToTop();
 }
 $('model-total').textContent=models.length;
 $('tab-model-count').textContent=models.length;
 $('tab-hat-count').textContent=$('count').textContent.split('/').pop()?.trim()||'86';
 function selectTab(tab,focus=false){
  showTab(tab,focus);
  store('zm-rush-catalog-tab',tab);
 }
 for (const tab of tabs) $('tab-'+tab).onclick=()=>selectTab(tab);
 $('catalog-tabs').onkeydown=event=>{
  const index=tabs.indexOf(activeTab);
  let target;
  switch (event.key) {
   case 'ArrowLeft': target=(index+tabs.length-1)%tabs.length;break;
   case 'ArrowRight': target=(index+1)%tabs.length;break;
   case 'Home':target=0;break;
   case 'End':target=tabs.length-1;break;
   default:return;
  }
  event.preventDefault();
  selectTab(tabs[target],true);
 };
 for(const group of [{id:'all',name:'Все'},{id:'favorites',name:'★ Избранное'},{id:'recent',name:'Недавние'},...modelGroups]){
  const el=button(group.name,()=>{category=group.id;render();});el.dataset.modelFilter=group.id;el.setAttribute('aria-pressed','false');filters.append(el);
 }
 function syncCards(){
  const available=isSceneAvailable();
  const ready=available&&isReady();
  for(const card of list.children){const id=card.dataset.modelId,active=id===selectedId&&ready,loading=busy&&id===pending;
   card.classList.toggle('selected',active);card.classList.toggle('is-loading',loading);
   const pick=card.querySelector('.model-pick');pick.disabled=busy||!available;pick.setAttribute('aria-pressed',String(active));pick.setAttribute('aria-busy',String(loading));
   card.querySelector('.model-check').hidden=!active;
   const status=card.querySelector('.model-card-status');
   const state=!available?'unavailable':loading?'loading':active?'selected':'available';
   if (status.dataset.state!==state) {
    status.dataset.state=state;
    status.textContent=cardStatus[state];
   }
  }
 }
 function syncFavorite(button,model){
  const selected=favorites.has(model.id);
  button.textContent=selected?'★':'☆';
  button.setAttribute('aria-label',(selected?'Убрать модель из избранного: ':'Добавить модель в избранное: ')+model.name);
  button.setAttribute('aria-pressed',String(selected));
 }
 function createModelCard(model){
   const group=modelGroupById.get(model.id),card=document.createElement('article');card.className='model-card';card.dataset.modelId=model.id;
   const pick=button('',async()=>{if(busy||!isSceneAvailable()||model.id===selectedId&&isReady())return;
    pending=model.id;setBusy(true);try{await onChoose(model.id);}finally{pending=null;setBusy(false);}
   });pick.className='model-pick';pick.setAttribute('aria-label','Выбрать модель: '+model.name);
   const picture=document.createElement('div');picture.className='model-picture';
   const img=document.createElement('img');img.dataset.preview=modelPreview(model.id);img.alt='';img.loading='lazy';img.decoding='async';img.width=320;img.height=280;
   img.onerror=()=>{img.hidden=true;const fallback=document.createElement('span');fallback.className='model-image-fallback';fallback.textContent=model.name.slice(0,2).toUpperCase();picture.append(fallback);};picture.append(img);
   const name=document.createElement('span');name.className='model-name';name.textContent=model.name;
   const genre=document.createElement('span');genre.className='model-genre';genre.textContent=group?.name||'Другое';
   const price=document.createElement('span');price.className='catalog-item-price';price.textContent=priceLabel(model);
   const status=document.createElement('span');status.className='model-card-status';
   pick.append(picture,name,genre,price,status);
   const fav=button('',()=>{
    if(favorites.has(model.id))favorites.delete(model.id);
    else favorites.add(model.id);
    store('zm-rush-model-favorites',[...favorites]);
    syncFavorite(fav,model);
    if(category==='favorites'&&!favorites.has(model.id)){
     const neighbor=(card.nextElementSibling||card.previousElementSibling)?.querySelector('.model-favorite');
     render(true);
     (neighbor||filters.querySelector('[data-model-filter="favorites"]')).focus({preventScroll:true});
    }
   });
   fav.className='model-favorite';
   syncFavorite(fav,model);
   const check=document.createElement('span');check.className='model-check';check.textContent='✓';check.setAttribute('aria-hidden','true');card.append(pick,fav,check);
   const cartButton = createCartButton?.(model);
   if (cartButton) card.append(cartButton);
   return card;
 }
 function render(keepScroll=false){
  const scrollTop=keepScroll===true?list.scrollTop:0;
  rendered=true;
  const term=normalizeCatalogSearch(search.value);
  const group=modelGroups.find(group=>group.id===category);
  const acceptedIds=category==='favorites'?favorites:category==='recent'?new Set(recent):
   category==='all'?null:new Set(group?.models);
  const visible=models.filter(model=>(!acceptedIds||acceptedIds.has(model.id))&&searchById.get(model.id).includes(term));
  if(category==='recent')visible.sort((a,b)=>recent.indexOf(a.id)-recent.indexOf(b.id));
  else if(sort.value==='name')visible.sort((a,b)=>displayName(a).localeCompare(displayName(b),document.documentElement.lang));
  $('model-count').textContent=visible.length+' / '+models.length;
  for(const el of filters.children){const active=el.dataset.modelFilter===category;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));}
  sort.disabled=category==='recent';
  const visibleIds=new Set(visible.map(model=>model.id));
  const existingCards=new Map();
  for(const card of Array.from(list.children)){
   if(visibleIds.has(card.dataset.modelId))existingCards.set(card.dataset.modelId,card);
   else card.remove();
  }
  const target=existingCards.size?list:document.createDocumentFragment();
  let cursor=target.firstElementChild;
  for(const model of visible){
   const card=existingCards.get(model.id)||createModelCard(model);
   if(card===cursor)cursor=cursor.nextElementSibling;
   else target.insertBefore(card,cursor);
  }
  if(target!==list)list.append(target);
  list.scrollTop=scrollTop;
  loadModelPreviews(list);
  const empty=!visible.length;$('model-empty').hidden=!empty;
  $('model-empty-title').textContent=category==='favorites'&&!term?'В избранном пока пусто':category==='recent'&&!term?'Здесь появятся выбранные модели':'Модель не найдена';
  $('model-empty-copy').textContent=category==='favorites'?'Нажми на звёздочку у понравившегося персонажа.':category==='recent'?'Выбери персонажа — он сохранится в этом списке.':'Попробуй другое имя или сбрось фильтры.';
  syncCards();
 }
 function setBusy(value){busy=value;syncCards();}
 function setSelected(id,remember=true){if(!byId.has(id))return;selectedId=id;if(remember){recent=[id,...recent.filter(x=>x!==id)].slice(0,12);store('zm-rush-model-recent',recent);}if(rendered&&category==='recent')render();else syncCards();}
 search.oninput=render;sort.onchange=render;
 $('model-reset').onclick=()=>{search.value='';category='all';render();};
 window.addEventListener('zm-rush:languagechange',()=>{if(rendered&&sort.value==='name'&&category!=='recent')render(true);});
 const topButton=$('back-to-top');let scrollFrame=0;
 function updateBackToTop(){
  topButton.hidden=Math.max(window.scrollY,grids[activeTab].scrollTop)<=Math.max(240,window.innerHeight*.5);
 }
 function scheduleScrollUpdate(){if(scrollFrame)return;scrollFrame=requestAnimationFrame(()=>{scrollFrame=0;updateBackToTop();});}
 window.addEventListener('scroll',scheduleScrollUpdate,{passive:true});window.addEventListener('resize',scheduleScrollUpdate);
 for(const grid of Object.values(grids))grid.addEventListener('scroll',scheduleScrollUpdate,{passive:true});
 topButton.onclick=()=>{for(const grid of Object.values(grids))grid.scrollTop=0;window.scrollTo({top:0,behavior:'auto'});document.querySelector('.brand').focus({preventScroll:true});updateBackToTop();};
 const savedTab = read('zm-rush-catalog-tab','hats');
 showTab(tabs.includes(initialTab) ? initialTab : tabs.includes(savedTab) ? savedTab : 'hats',false,false);
 return {setBusy,setSelected};
}
