export function purchaseDraft(entry,seller){
 if(!entry?.id||!entry?.name)return null;
 const text=`Здравствуйте! Хочу купить аксессуар „${entry.name}“ на сервере ZMRush.`;
 const url=new URL(seller);url.search='';url.hash='';
 return {text,url:url.href+'?text='+encodeURIComponent(text)};
}
export function setupPurchase(getSelected,isBusy){
 const buy=document.getElementById('buy'),seller=buy.href;
 const fallback=document.createElement('div');fallback.hidden=true;fallback.style.cssText='margin:12px 0;display:none';
 const en=()=>document.documentElement.lang==='en';
 const hint=document.createElement('p'),field=document.createElement('textarea'),copy=document.createElement('button');
 field.readOnly=true;field.rows=3;field.style.cssText='width:100%;box-sizing:border-box;padding:12px;background:#1c291e;color:#e8f0dc;border:1px solid #88a65a;border-radius:12px';
 field.setAttribute('aria-label','Purchase message');copy.className='secondary';copy.type='button';
 fallback.append(hint,field,copy);document.getElementById('toast').after(fallback);
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(field.value);hint.textContent=en()?'Message copied. Paste it into the seller’s chat.':'Текст скопирован. Вставьте его в чат продавца.';}catch{field.focus();field.select();field.setSelectionRange(0,field.value.length);hint.textContent=en()?'Select and copy the message, then paste it into the seller’s chat.':'Выделите и скопируйте текст, затем вставьте его в чат продавца.';}};
 buy.removeAttribute('onclick');
 buy.onclick=event=>{
  event.preventDefault();
  const draft=purchaseDraft(getSelected(),seller);
  if(isBusy()||!draft){document.getElementById('toast').textContent=en()?'Select an accessory and wait for it to load.':'Выберите аксессуар и дождитесь его загрузки.';return;}
  field.value=draft.text;hint.textContent=en()?'If Telegram did not fill in the message, copy it below.':'Если Telegram не подставил сообщение, скопируйте его ниже.';copy.textContent=en()?'Copy message':'Скопировать текст';fallback.hidden=false;fallback.style.display='block';
  const tg=window.Telegram?.WebApp;
  try{if(tg?.openTelegramLink){tg.openTelegramLink(draft.url);return;}}catch{}
  window.open(draft.url,'_blank','noopener,noreferrer');
 };
}

