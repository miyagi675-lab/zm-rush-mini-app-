import {modelGroups,modelGroupById,modelPreview} from './model-groups.js?v=1';

export function setupModelBrowser({models,selectedId,onChoose,english}){
 const $=id=>document.getElementById(id),byId=new Map(models.map(m=>[m.id,m]));
 const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))||fallback;}catch{return fallback;}};
 const store=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));}catch{}};
 const savedFavorites=read('zm-rush-model-favorites',[]),savedRecent=read('zm-rush-model-recent',[]);
 const favorites=new Set((Array.isArray(savedFavorites)?savedFavorites:[]).filter(id=>byId.has(id)));
 let recent=(Array.isArray(savedRecent)?savedRecent:[]).filter(id=>byId.has(id)),category='all',busy=false,pending=null,rendered=false;
 const list=$('model-items'),search=$('model-search'),filters=$('model-filters'),opener=$('open-models');
 const displayName=model=>document.documentElement.lang==='en'?(model.nameEn||english(model.name)):model.name;
 function button(text,fn){const el=document.createElement('button');el.type='button';el.textContent=text;el.onclick=fn;return el;}
 function showTab(tab,focus=false){
  const wasModels=$('tab-models').getAttribute('aria-selected')==='true';
  for(const name of ['hats','models']){const active=name===tab;$('tab-'+name).setAttribute('aria-selected',String(active));$('tab-'+name).tabIndex=active?0:-1;$(name+'-panel').hidden=!active;}
  opener.setAttribute('aria-expanded',String(tab==='models'));
  document.body.classList.toggle('model-catalog-open',tab==='models');
  if(tab==='models'&&!rendered)render();
  if(focus)$('tab-'+tab).focus();
  if(tab==='models'&&matchMedia('(max-width:800px)').matches)$('catalog-tabs').scrollIntoView({block:'start',behavior:'auto'});
  if(tab==='hats'&&wasModels&&matchMedia('(max-width:800px)').matches)document.querySelector('.studio').scrollIntoView({block:'start',behavior:'auto'});
 }
 $('model-total').textContent=models.length;
 $('tab-model-count').textContent=models.length;
 $('tab-hat-count').textContent=$('count').textContent.split('/').pop()?.trim()||'86';
 $('tab-hats').onclick=()=>showTab('hats');$('tab-models').onclick=()=>showTab('models');
 $('catalog-tabs').onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const tab=e.key==='Home'?'hats':e.key==='End'?'models':$('tab-models').getAttribute('aria-selected')==='true'?'hats':'models';showTab(tab,true);};
 opener.onclick=()=>{showTab('models');if(!matchMedia('(max-width:800px)').matches)search.focus({preventScroll:true});};
 for(const group of [{id:'all',name:'Все'},{id:'favorites',name:'★ Избранное'},{id:'recent',name:'Недавние'},...modelGroups]){
  const el=button(group.name,()=>{category=group.id;render();});el.dataset.modelFilter=group.id;el.setAttribute('aria-pressed','false');filters.append(el);
 }
 function syncCards(){
  for(const card of list.children){const id=card.dataset.modelId,active=id===selectedId,loading=busy&&id===pending;
   card.classList.toggle('selected',active);card.classList.toggle('is-loading',loading);
   const pick=card.querySelector('.model-pick');pick.disabled=busy;pick.setAttribute('aria-pressed',String(active));pick.setAttribute('aria-busy',String(loading));
   card.querySelector('.model-check').hidden=!active;
   card.querySelector('.model-card-status').textContent=loading?'Загрузка…':active?'Выбрано':'Смотреть в 3D';
  }
 }
 function updateCurrent(){const model=byId.get(selectedId);if(!model)return;$('chosen-model-name').textContent=model.name;const img=$('chosen-model-preview');img.src=modelPreview(model.id);img.alt='';syncCards();}
 function render(keepScroll=false){
  const scrollTop=keepScroll===true?list.scrollTop:0;
  rendered=true;const term=search.value.trim().toLocaleLowerCase('ru');
  let visible=models.filter(m=>{const group=modelGroupById.get(m.id);return (category==='all'||category==='favorites'&&favorites.has(m.id)||category==='recent'&&recent.includes(m.id)||group?.id===category)&&(!term||(m.name+' '+(m.nameEn||english(m.name))).toLocaleLowerCase('ru').includes(term));});
  if(category==='recent')visible.sort((a,b)=>recent.indexOf(a.id)-recent.indexOf(b.id));
  else if($('model-sort').value==='name')visible.sort((a,b)=>displayName(a).localeCompare(displayName(b),document.documentElement.lang));
  $('model-count').textContent=visible.length+' / '+models.length;
  for(const el of filters.children){const active=el.dataset.modelFilter===category;el.classList.toggle('active',active);el.setAttribute('aria-pressed',String(active));}
  $('model-sort').disabled=category==='recent';const fragment=document.createDocumentFragment();
  for(const model of visible){
   const group=modelGroupById.get(model.id),card=document.createElement('article');card.className='model-card';card.dataset.modelId=model.id;
   const returnToPreview=()=>{if(matchMedia('(max-width:800px)').matches){showTab('hats');const studio=document.querySelector('.studio');studio.focus({preventScroll:true});studio.scrollIntoView({block:'start',behavior:'auto'});}};
   const pick=button('',async()=>{if(busy)return;if(model.id===selectedId){returnToPreview();return;}
    pending=model.id;setBusy(true);try{if(await onChoose(model.id)!==false)returnToPreview();}finally{pending=null;setBusy(false);}
   });pick.className='model-pick';pick.setAttribute('aria-label','Выбрать модель: '+model.name);
   const picture=document.createElement('div');picture.className='model-picture';
   const img=document.createElement('img');img.src=modelPreview(model.id);img.alt='';img.loading='lazy';img.decoding='async';img.width=320;img.height=280;
   img.onerror=()=>{img.hidden=true;const fallback=document.createElement('span');fallback.className='model-image-fallback';fallback.textContent=model.name.slice(0,2).toUpperCase();picture.append(fallback);};picture.append(img);
   const name=document.createElement('span');name.className='model-name';name.textContent=model.name;
   const genre=document.createElement('span');genre.className='model-genre';genre.textContent=group?.name||'Другое';
   const status=document.createElement('span');status.className='model-card-status';
   pick.append(picture,name,genre,status);
   const fav=button(favorites.has(model.id)?'★':'☆',()=>{favorites.has(model.id)?favorites.delete(model.id):favorites.add(model.id);store('zm-rush-model-favorites',[...favorites]);render(true);const next=list.querySelector('[data-model-id="'+model.id+'"] .model-favorite');(next||filters.querySelector('[data-model-filter="favorites"]')).focus({preventScroll:true});});fav.className='model-favorite';fav.setAttribute('aria-label',(favorites.has(model.id)?'Убрать модель из избранного: ':'Добавить модель в избранное: ')+model.name);fav.setAttribute('aria-pressed',String(favorites.has(model.id)));
   const check=document.createElement('span');check.className='model-check';check.textContent='✓';check.setAttribute('aria-hidden','true');card.append(pick,fav,check);fragment.append(card);
  }
  list.replaceChildren(fragment);list.scrollTop=scrollTop;
  const empty=!visible.length;$('model-empty').hidden=!empty;
  $('model-empty-title').textContent=category==='favorites'&&!term?'В избранном пока пусто':category==='recent'&&!term?'Здесь появятся выбранные модели':'Модель не найдена';
  $('model-empty-copy').textContent=category==='favorites'?'Нажми на звёздочку у понравившегося персонажа.':category==='recent'?'Выбери персонажа — он сохранится в этом списке.':'Попробуй другое имя или сбрось фильтры.';
  syncCards();
 }
 function setBusy(value){busy=value;opener.disabled=value;syncCards();}
 function setSelected(id,remember=true){if(!byId.has(id))return;selectedId=id;if(remember){recent=[id,...recent.filter(x=>x!==id)].slice(0,12);store('zm-rush-model-recent',recent);}updateCurrent();if(rendered&&category==='recent')render();}
 search.oninput=render;$('model-sort').onchange=render;
 $('model-reset').onclick=()=>{search.value='';category='all';render();};
 window.addEventListener('zm-rush:languagechange',()=>{if(rendered)render();});
 updateCurrent();showTab('hats');
 return {setBusy,setSelected,showTab};
}
