export function purchaseDraft(entry,seller){
 if(!entry?.id||!entry?.name)return null;
 const text=`Здравствуйте! Хочу купить аксессуар „${entry.name}“ на сервере ZMRush.`;
 const url=new URL(seller);url.search='';url.hash='';
 return {text,url:url.href+'?text='+encodeURIComponent(text)};
}
export function setupPurchase(getSelected,isBusy){
 const buy=document.getElementById('buy'),seller=buy.href;
 const en=()=>document.documentElement.lang==='en';
 buy.removeAttribute('onclick');
 buy.onclick=event=>{
  event.preventDefault();
  const draft=purchaseDraft(getSelected(),seller);
  if(isBusy()||!draft){document.getElementById('toast').textContent=en()?'Select an accessory and wait for it to load.':'Выберите аксессуар и дождитесь его загрузки.';return;}
  const tg=window.Telegram?.WebApp;
  try{if(tg?.openTelegramLink){tg.openTelegramLink(draft.url);return;}}catch{}
  window.open(draft.url,'_blank','noopener,noreferrer');
 };
}

