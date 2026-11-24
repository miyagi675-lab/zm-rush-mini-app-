import test from 'node:test';import assert from 'node:assert/strict';
import worker,{privileges,home,shop,card,handleUpdate,handleUpdateOnce} from './worker.js';
test('the grenade video is sent after editing the description',async()=>{
  const calls=[];
  await handleUpdate({callback_query:{id:'grenades',from:{id:42},message:{message_id:9,chat:{id:42,type:'private'}},data:'ze:item:1'}},async (...args)=>calls.push(args));
  assert.deepEqual(calls.map(([method])=>method),['answerCallbackQuery','editMessageText','sendVideo']);
  assert.equal(calls[2][1].reply_parameters.message_id,9);
  assert.match(calls[2][1].video,/\/grenade-modes\.mp4$/);
});
test('grenade video reuses the stored Telegram file ID and refreshes an invalid ID',async()=>{
  const data=new Map();
  const preferences={get:async key=>data.get(key),put:async (key,value)=>data.set(key,value)};
  const update={callback_query:{id:'grenade-cache',from:{id:42},message:{message_id:9,chat:{id:42,type:'private'}},data:'ze:item:1'}};
  const videos=[];
  let rejectCached=false;
  const call=async (method,body)=>{
    if(method!=='sendVideo')return;
    videos.push(body.video);
    if(body.video==='stored-video'&&rejectCached)throw Object.assign(Error('Invalid ID'),{invalidVideoId:true});
    return {video:{file_id:rejectCached?'new-video':'stored-video'}};
  };
  await handleUpdate(update,call,preferences);
  await handleUpdate(update,call,preferences);
  assert.deepEqual(videos.map(path=>path.startsWith('https:')?'upload':path),['upload','stored-video']);
  rejectCached=true;
  await handleUpdate(update,call,preferences);
  await handleUpdate(update,call,preferences);
  assert.deepEqual(videos.map(path=>path.startsWith('https:')?'upload':path),
    ['upload','stored-video','stored-video','upload','new-video']);
});
test('duplicate webhook deliveries share work and failed updates remain retryable',async()=>{
  const update={update_id:1000};
  let calls=0;
  let complete;
  const processUpdate=()=>{calls++;return new Promise(resolve=>{complete=resolve;});};
  const original=handleUpdateOnce(update,processUpdate);
  const duplicate=handleUpdateOnce(update,processUpdate);
  await Promise.resolve();
  assert.equal(calls,1);
  complete('sent');
  assert.deepEqual(await Promise.all([original,duplicate]),['sent','sent']);
  assert.equal(await handleUpdateOnce(update,()=>{throw Error('Duplicate call');}),'sent');
  const failed={update_id:1001};
  await assert.rejects(handleUpdateOnce(failed,()=>{throw Error('Temporary error');}),/Temporary error/);
  assert.equal(await handleUpdateOnce(failed,()=> 'retried'),'retried');
});
test('the main menu uses the premium title and shop icon in both languages', () => {
  assert.equal(home().text.split('\n')[0], 'ZMRush - PREMIUM');
  assert.equal(home().reply_markup.inline_keyboard[0][0].text, '☣️ VIP магазин');
  assert.equal(home('en').reply_markup.inline_keyboard[0][0].text, '☣️ VIP Shop');
});
test('first start asks for language, then restores it on subsequent starts', async () => {
  const data = new Map();
  const preferences = {get: async key => data.get(key), put: async (key, value) => data.set(key, value)};
  const calls = [], call = async (method, body) => { calls.push({method, body}); };
  const chat = {id:42,type:'private'};
  const start = {message:{chat,text:'/start'}};
  const callback = value => ({callback_query:{id:'lang',from:{id:42},message:{chat,message_id:9},data:value}});

  await handleUpdate(start, call, preferences);
  const options = calls.at(-1).body.reply_markup.inline_keyboard[0];
  assert.deepEqual(options.map(option => option.text), ['🇬🇧 English','🇷🇺 Русский']);
  await handleUpdate(callback(options[0].callback_data), call, preferences);
  assert.equal(data.get('lang:42'), 'en');
  assert.match(calls.at(-1).body.text, /Welcome!/);
  await handleUpdate(start, call, preferences);
  assert.match(calls.at(-1).body.text, /Welcome!/);
  await handleUpdate(callback('ze:item:3'), call, preferences);
  assert.match(calls.at(-1).body.text, /Weapon Models/);
  assert.equal(calls.at(-1).body.reply_markup.inline_keyboard[0][0].text, 'View in 3D');
  await handleUpdate({message:{chat:{id:43,type:'private'},text:'/start shop'}}, call, preferences);
  const russian = calls.at(-1).body.reply_markup.inline_keyboard[0][1];
  assert.equal(russian.callback_data, 'ze:lang:ru:shop');
  await handleUpdate({callback_query:{id:'ru',from:{id:43},message:{message_id:10,chat:{id:43,type:'private'}},data:russian.callback_data}}, call, preferences);
  assert.equal(data.get('lang:43'), 'ru');
  assert.match(calls.at(-1).body.text, /Выберите привилегию/);
});
test('language command and button share the 20-language picker and persist changes', async () => {
  const calls=[];
  const data=new Map([['lang:42','ru']]);
  const preferences={get:async key=>data.get(key),put:async (key,value)=>data.set(key,value)};
  const chat={id:42,type:'private'};
  const call=async (method,body)=>calls.push({method,body});
  const callback=data=>({callback_query:{id:'language',from:{id:42},message:{chat,message_id:9},data}});
  await handleUpdate({message:{chat,text:'/language@zm_rushbot'}},call,preferences);
  const keyboard=calls.at(-1).body.reply_markup.inline_keyboard;
  const choices=keyboard.flat().filter(option=>option.callback_data.startsWith('ze:lang:'));
  assert.equal(new Set(choices.map(option=>option.callback_data)).size,20);
  assert.match(choices[1].text,/^✅/);
  await handleUpdate(callback(home().reply_markup.inline_keyboard.at(-1)[0].callback_data),call,preferences);
  assert.deepEqual(calls.at(-1).body.reply_markup.inline_keyboard,keyboard);
  for(const choice of choices){
    await handleUpdate(callback(choice.callback_data),call,preferences);
    const lang=choice.callback_data.split(':')[2];
    assert.equal(data.get('lang:42'),lang);
    assert.equal(calls.at(-1).body.text,home(lang).text);
    assert.equal(shop(lang).reply_markup.inline_keyboard.length,5);
    for(const {id} of privileges)assert.ok(card(id,lang).text.length);
    for(const [id,price] of [[1,9],[5,19],[6,60]]){
      const premium=card(id,lang);
      assert.equal(premium.parse_mode,'HTML');
      assert.match(premium.text,/ZMRush — PREMIUM/);
      assert.ok(premium.text.includes(lang==='ru'?price+'$':'$'+price));
      assert.equal(premium.reply_markup.inline_keyboard[0][0].url,'https://t.me/name_f1');
      assert.match(premium.text,/<blockquote>[^<]*(?:<b>)?.+<\/blockquote>/s);
    }
    assert.match(card(6,lang).text,/\[sad\], \[relax\], \[crazy\]/);
  }
  await handleUpdate({message:{chat,text:'/start'}},call,preferences);
  assert.match(calls.at(-1).body.text,/欢迎/);
});
test('the weapon card opens the weapon tab as a Telegram Mini App', async () => {
  const calls = [];
  await handleUpdate({callback_query:{id:'preview',from:{id:42},
    message:{message_id:9,chat:{id:42,type:'private'}},data:'ze:item:3'}}, async (...args) => calls.push(args));
  const keyboard = calls[1][1].reply_markup.inline_keyboard;
  assert.deepEqual(keyboard[0][0], {
    text:'Посмотреть в 3D',
    web_app:{url:'https://miyagi675-lab.github.io/zm-rush-mini-app-/?tab=weapons&lang=ru'},
  });
  assert.equal(keyboard[1][0].url, 'https://t.me/name_f1');
  assert.equal(keyboard[2][0].callback_data, 'ze:shop');
});
test('menu numbers the four visible privileges consecutively',()=>{assert.equal(privileges.length,7);const menu=shop().reply_markup.inline_keyboard;assert.equal(shop().text.split('\n')[0],'☣️ZMRush - shop');assert.deepEqual(menu.map(row=>row[0].callback_data),['ze:item:7','ze:item:1','ze:item:5','ze:item:6','ze:home']);assert.deepEqual(menu.slice(0,-1).map(row=>row[0].text.split('.')[0]),['1','2','3','4']);assert.match(card(7,'en').text,/1\. Double Jump/);for(let id=1;id<=7;id++){const view=card(id);assert.ok(view.text.includes(id===1?'Стоимость: 9$':id===5?'19$':id===6?'60$':'Стоимость: 10$'));assert.equal(view.reply_markup.inline_keyboard.at(-2)[0].url,'https://t.me/name_f1');}assert.match(card(7).text,/только команде Human/);assert.match(card(7).text,/Zombie эта возможность недоступна/);assert.equal(card(8),null);});
test('clicking double jump acknowledges callback and replaces same message',async()=>{const calls=[];await handleUpdate({callback_query:{id:'click1',from:{id:42},message:{message_id:9,chat:{id:42,type:'private'}},data:'ze:item:7'}},async(...a)=>calls.push(a));assert.deepEqual(calls.map(a=>a[0]),['answerCallbackQuery','editMessageText']);assert.equal(calls[1][1].message_id,9);assert.match(calls[1][1].text,/Двойной прыжок/);});
test('shop start works; group messages and unrelated text do not trigger broadcasts',async()=>{const calls=[];const call=async(...a)=>calls.push(a);await handleUpdate({message:{chat:{id:42,type:'private'},text:'/shop'}},call);assert.equal(calls[0][0],'sendMessage');assert.equal(calls[0][1].reply_markup.inline_keyboard.length,5);await handleUpdate({message:{chat:{id:-10,type:'group'},text:'/shop'}},call);await handleUpdate({message:{chat:{id:42,type:'private'},text:'hello'}},call);assert.equal(calls.length,1);});
test('unauthenticated webhook and setup cannot call Telegram',async()=>{const env={BOT_TOKEN:'12345:fake-test-token'};assert.equal((await worker.fetch(new Request('https://example.com/telegram',{method:'POST',body:'{}'}),env)).status,403);assert.equal((await worker.fetch(new Request('https://example.com/setup',{method:'POST',headers:{origin:'https://attacker.example'},body:'token=x'}),env)).status,403);assert.equal((await worker.fetch(new Request('https://example.com/setup',{method:'POST',headers:{origin:'https://example.com','content-type':'application/x-www-form-urlencoded'},body:'token=wrong'}),env)).status,403);});
