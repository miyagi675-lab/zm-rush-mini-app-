const pairs=`Купить|Buy
Выбор модели|Select model
Подборка|Collection
КОЛЛЕКЦИЯ|COLLECTION
шапок|hats
в коллекции|in collection
Коллекция|Collection
В полный рост|Full body
Крупный план|Close-up
Автоматическое вращение|Auto rotate
Спереди|Front
Сбоку|Side
Сзади|Back
Ракурс спереди|Front view
Ракурс сбоку|Side view
Ракурс сзади|Back view
Ракурс три четверти|Three-quarter view
СЕЙЧАС НА ПЕРСОНАЖЕ|CURRENTLY EQUIPPED
Без шапки|No hat
Снять шапку|Remove hat
Вращай модель|Rotate the model
Приближай двумя пальцами|Pinch to zoom
Найти свой образ|Find your look
Поиск шапок|Search hats
Избранное|Favorites
Персонажи|Characters
Звери|Animals
Другое|Other
Все|All
ПЕРСОНАЖ|CHARACTER
ЗВЕРИ|ANIMALS
ДРУГОЕ|OTHER
Добавить в избранное|Add to favorites
Убрать из избранного|Remove from favorites
Примерить|Try on
Настройки образа|Look settings
Движение|Animation
Статичная поза|Static pose
Ожидание|Idle
Ходьба|Walk
Бег|Run
Пауза|Pause
Продолжить|Resume
Скорость|Speed
СРАВНЕНИЕ A / B|COMPARE A / B
Выбери слот и примерь шапку. Ракурс остаётся тем же.|Choose a slot and try on a hat. The camera angle stays the same.
ВЫБРАННЫЙ ПРЕДМЕТ|SELECTED ITEM
Классическая модель|Classic model
Оригинальная модель CT|Original CT model
Вариант|Variant
Снимок образа|Take snapshot
Сохранить образ|Save look
Примерка не меняет скин на сервере|Trying on items does not change your server skin
Открыть бота|Open bot
Твой образ|Your look
Закрыть снимок|Close snapshot
Скачать PNG|Download PNG
Поделиться|Share
Если скачивание недоступно в Telegram, зажми картинку и выбери сохранение.|If downloading is unavailable in Telegram, press and hold the image to save it.
Снимок выбранного образа на выбранной модели|Snapshot of your selected look and model
Добби|Dobby
Модель персонажа|Player model
Модель|Model
Загружаем|Loading
Примеряем|Trying on
Снимаем шапку|Removing hat
Образ сохранён на этом устройстве.|Look saved on this device.
Не удалось сохранить образ.|Could not save look.
Не удалось поделиться снимком.|Could not share snapshot.
Добавь понравившиеся модели звёздочкой.|Use the star to add items to favorites.
Ничего не нашли. Попробуй другое название.|Nothing found. Try another name.
избранных|favorites
Не удалось загрузить модель. Попробуйте ещё раз.|Could not load model. Please try again.
Не удалось запустить 3D. Обновите приложение или откройте его в современном браузере.|Could not start 3D. Reload the app or use a modern browser.
3D-показ прерван. Обновите приложение.|3D interrupted. Reload the app.
Не удалось загрузить|Could not load
попробуйте ещё раз.|please try again.
Категории|Categories
Ракурсы|Camera angles
3D-примерочная|3D fitting room
Алкаш|Drunkard
Бэтмен|Batman
Заяц|Bunny
Капитан|Captain
Чебурашка|Cheburashka
Корова|Cow
Дьявол|Devil
Енот|Raccoon
Крокодил Гена|Gena the Crocodile
Генки|Genki
Джейсон|Jason
Рыцарь|Knight
Наклз|Knuckles
Кот|Cat
Мишка|Bear
Пантера|Panther
Фараон|Pharaoh
Пони · коллекция|Pony · collection
Пони · новая версия|Pony · new version
Пони|Pony
Пила|Saw
Пугало|Scarecrow
Слэш|Slash
Соник|Sonic
Супермен|Superman
Ужас|Horror
Волк|Wolf
Эмодзи|Emoji
Фермер|Farmer
Гарфилд|Garfield
Харли Квинн|Harley Quinn
Игги|Iggy
Медсестра|Nurse
Микки Маус|Mickey Mouse
Пингвин|Penguin
Веном|Venom
Шапка 228|228 hat
Крылья ангела|Angel wings
Бочка|Barrel
Большая голова|Big head
Коническая шляпа|Conical hat
Костюм человека|Human costume
Гомер Симпсон|Homer Simpson
Дарт Вейдер · шлем|Darth Vader · helmet
Дарт Вейдер · маска|Darth Vader · mask
Кепка Dodgers|Dodgers cap
Маска старейшины|Elder mask
Эльфийский шлем|Elven helmet
Эльф|Elf
Злая тыква|Evil pumpkin
Гоаулд|Goa'uld
Добро и зло|Good and evil
Хоккейная маска|Hockey mask
Колпак|Hood
Железный человек|Iron Man
Тыква-фонарь|Jack-o'-lantern
Ямайская шапка|Jamaican hat
Молоко|Milk
Гаара|Gaara
Итачи|Itachi
Какаши|Kakashi
Киба|Kiba
Кисаме|Kisame
Маска АНБУ|ANBU mask
Маска Хаку|Haku mask
Маска Наруто|Naruto mask
Маска Тилк|Teal'c mask
Маска Тоби|Tobi mask
Медвежья шапка|Bear hat
Поварской колпак|Chef's hat
Шляпа Робин Гуда|Robin Hood hat
Смайлик|Smiley
Снегирь|Bullfinch
Сора|Sora
Маска Губки Боба|SpongeBob mask
Меч|Sword
Тигр|Tiger
Маска Гая Фокса|Guy Fawkes mask`.split('\n').map(line=>line.split('|')).sort((a,b)=>b[0].length-a[0].length);
export const english=text=>pairs.reduce((value,[ru,en])=>value.split(ru).join(en),text);
let language='ru';try{language=localStorage.getItem('zm-rush-language')==='en'?'en':'ru';}catch{}
const originals=new WeakMap();
function translateNode(node,key,value){let saved=originals.get(node)||{};if(!saved[key]||saved[key].shown!==value)saved[key]={source:value};const item=saved[key];item.shown=language==='en'?english(item.source):item.source;originals.set(node,saved);return item.shown;}
const observer=new MutationObserver(applyLanguage);
function applyLanguage(){
 observer.disconnect();document.documentElement.lang=language;
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;
 while(node=walker.nextNode()){if(node.parentElement.closest('script,style'))continue;const next=translateNode(node,'text',node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;}
 for(const el of document.querySelectorAll('[aria-label],[title],[placeholder],[alt]'))for(const attr of ['aria-label','title','placeholder','alt'])if(el.hasAttribute(attr)){const next=translateNode(el,attr,el.getAttribute(attr));if(next!==el.getAttribute(attr))el.setAttribute(attr,next);}
 document.querySelectorAll('[data-language]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.language===language)));
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','placeholder','alt']});
}
const switcher=document.createElement('div');switcher.style.cssText='display:flex;gap:8px;align-items:center';switcher.setAttribute('aria-label','Language');
for(const [code,label] of [['ru','RU'],['en','ENG']]){const button=document.createElement('button');button.textContent=label;button.dataset.language=code;button.style.cssText='padding:8px 12px;border:1px solid #88a65a;border-radius:12px;background:#1c291e;color:#d6e1cc;cursor:pointer';button.onclick=()=>{language=code;try{localStorage.setItem('zm-rush-language',code);}catch{}applyLanguage();};switcher.append(button);}
document.querySelector('header').append(switcher);applyLanguage();

