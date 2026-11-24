// Cloudflare Workers Free. Set BOT_TOKEN as an encrypted Worker secret.
// Optional ZMRUSH_LANGUAGES KV binding stores the selected bot language.
const SELLER='https://t.me/name_f1';
const CATALOG='https://miyagi675-lab.github.io/zm-rush-mini-app-/';
function catalogUrl(lang,tab){const url=new URL(CATALOG);if(tab)url.searchParams.set('tab',tab);url.searchParams.set('lang',lang);return url.href;}
const GRENADE_VIDEO_REVISION='c6c12c531e2724bb5cf2a8cc77466d2b8b38b0c7';
const GRENADE_VIDEO_SOURCE='https://raw.githubusercontent.com/miyagi675-lab/zm-rush-mini-app-/'+GRENADE_VIDEO_REVISION+'/grenade-modes.mp4';
const GRENADE_VIDEO_PAGE='https://github.com/miyagi675-lab/zm-rush-mini-app-/blob/'+GRENADE_VIDEO_REVISION+'/grenade-modes.mp4';
const GRENADE_VIDEO_CACHE_KEY='bot:media:grenade-modes:'+GRENADE_VIDEO_REVISION;
const BOT_USERNAME='zm_rushbot';
export const privileges=[
 {id:1,title:'Режимы гранат HE / Flash',description:'Специальные режимы использования гранат HE и Flash: Impact / Standard. Уточните у продавца условия использования режимов на сервере ZE.'},
 {id:2,title:'Модели игроков',description:'Эксклюзивные модели персонажей для игроков Zombie Escape. Доступность выбранного скина на ZE уточняйте у продавца.',catalog:true},
 {id:3,title:'Модели оружия',description:'Уникальные модели оружия для вашего персонажа. Список доступных моделей и условия их использования можно узнать у продавца.'},
 {id:4,title:'Шапки и аксессуары',description:'Различные шапки и аксессуары для персонажа. Выберите интересующий предмет в 3D-каталоге и уточните у продавца его доступность на ZE.',catalog:true},
 {id:5,title:'Бронирование никнейма',description:'Возможность забронировать свой никнейм и защитить его от использования другими игроками. При обращении к продавцу укажите желаемый никнейм.'},
 {id:6,title:'Персональный префикс',description:'Уникальный персональный префикс перед вашим никнеймом в игровом чате. Желаемый текст и условия оформления согласуйте с продавцом.'},
 {id:7,title:'Двойной прыжок',description:'Возможность совершать два прыжка на картах Zombie Escape (ZE).\n\n⚠️ Второй прыжок доступен только команде Human (Люди). Для команды Zombie эта возможность недоступна.'}
];
const button=(text,data)=>({text,callback_data:data});
const englishPrivileges=[
 ['HE / Flash Grenade Modes','Special grenade modes for HE and Flash: Impact / Standard. Ask the seller about using these modes on the ZE server.'],
 ['Player Models','Exclusive player skins for Zombie Escape. Ask the seller whether your chosen skin is available on ZE.'],
 ['Weapon Models','Unique weapon models for your character. Ask the seller which models are available and how they can be used.'],
 ['Hats and Accessories','Browse hats and accessories for your character in the 3D catalog. Ask the seller whether your chosen item is available on ZE.'],
 ['Nickname Reservation','Reserve your nickname so other players cannot use it. Tell the seller which nickname you want to reserve.'],
 ['Personal Prefix','Add a personal prefix before your nickname in game chat. Discuss the wording and setup with the seller.'],
 ['Double Jump','Jump twice on Zombie Escape (ZE) maps.\n\n⚠️ The second jump is available to Humans only. Zombies cannot use it.'],
];
const copy={
 ru:{
  welcome:'Добро пожаловать! Откройте магазин привилегий или 3D-каталог персонажей и аксессуаров.',
  shop:'☣️ VIP магазин', catalog:'👕 Открыть 3D-каталог', weapons:'Посмотреть в 3D',
  shopIntro:'Выберите привилегию, чтобы узнать её возможности, стоимость и условия приобретения.',
  home:'← Главное меню', back:'← Все привилегии', buy:'🛒 Купить у продавца',
  term:'💰 Стоимость: 10$\n📅 Срок действия: 1 месяц.',
  seller:'Для покупки нажмите кнопку ниже и напишите продавцу. Выдача привилегии согласуется в личных сообщениях.',
  catalogIntro:'👕 Каталог моделей и аксессуаров ZMRush\n\nПримерка в 3D. Доступность и цены для ZE уточняйте у продавца.',
  stale:'Откройте магазин заново командой /shop.',
 },
 en:{
  welcome:'Welcome! Open the perks shop or browse the 3D catalog of characters and accessories.',
  shop:'☣️ VIP Shop', catalog:'👕 Open 3D catalog', weapons:'View in 3D',
  shopIntro:'Choose a perk to see what it includes, how much it costs, and how to buy it.',
  home:'← Main menu', back:'← All perks', buy:'🛒 Buy from the seller',
  term:'💰 Price: $10\n📅 Duration: 1 month.',
  seller:'To buy, tap the button below and message the seller. You can arrange perk activation in the private chat.',
  catalogIntro:'👕 ZMRush models and accessories catalog\n\nTry items on in 3D. Ask the seller about ZE availability and prices.',
  stale:'Reopen the shop with /shop.',
 },
};
const languages=[
 ['en','🇬🇧 English'],['ru','🇷🇺 Русский'],['es','🇪🇸 Español'],['uz','🇺🇿 Oʻzbekcha'],
 ['id','🇮🇩 Bahasa Indonesia'],['it','🇮🇹 Italiano'],['pt','🇵🇹 Português'],['uk','🇺🇦 Українська'],
 ['tr','🇹🇷 Türkçe'],['fr','🇫🇷 Français'],['de','🇩🇪 Deutsch'],['fa','🇮🇷 فارسی'],
 ['hi','🇮🇳 हिन्दी'],['az','🇦🇿 Azərbaycan'],['ku','🇮🇶 کوردی'],['hinglish','🇮🇳 हिंग्लिश'],
 ['kk','🇰🇿 Қазақша'],['nl','🇳🇱 Nederlands'],['ro','🇷🇴 Română'],['zh','🇨🇳 中文'],
];
const supportedLanguages=new Set(languages.map(([code])=>code));
const languageButton=button('🌐 Язык/Language','ze:languages');
// Welcome, shop, catalog, 3D preview, shop instructions, home, back, buy, price, duration, purchase instructions.
const translations={
 es:'¡Bienvenido! Abre la tienda o explora el catálogo 3D.|Tienda|Abrir catálogo 3D|Ver en 3D|Elige un privilegio para ver sus detalles.|Menú principal|Todos los privilegios|Comprar al vendedor|Precio|1 mes|Escribe al vendedor para acordar la compra y la activación.',
 uz:'Xush kelibsiz! Doʻkonni yoki 3D katalogni oching.|Doʻkon|3D katalogni ochish|3D koʻrish|Tafsilotlar uchun imtiyozni tanlang.|Bosh menyu|Barcha imtiyozlar|Sotuvchidan xarid qilish|Narx|1 oy|Xarid va faollashtirish uchun sotuvchiga yozing.',
 id:'Selamat datang! Buka toko atau jelajahi katalog 3D.|Toko|Buka katalog 3D|Lihat dalam 3D|Pilih hak istimewa untuk melihat detailnya.|Menu utama|Semua hak istimewa|Beli dari penjual|Harga|1 bulan|Hubungi penjual untuk mengatur pembelian dan aktivasi.',
 it:'Benvenuto! Apri il negozio o esplora il catalogo 3D.|Negozio|Apri il catalogo 3D|Visualizza in 3D|Scegli un vantaggio per vederne i dettagli.|Menu principale|Tutti i vantaggi|Acquista dal venditore|Prezzo|1 mese|Contatta il venditore per concordare acquisto e attivazione.',
 pt:'Bem-vindo! Abra a loja ou explore o catálogo 3D.|Loja|Abrir catálogo 3D|Ver em 3D|Selecione um privilégio para ver os detalhes.|Menu principal|Todos os privilégios|Comprar ao vendedor|Preço|1 mês|Fale com o vendedor para combinar a compra e a ativação.',
 uk:'Вітаємо! Відкрийте магазин або перегляньте 3D-каталог.|Магазин|Відкрити 3D-каталог|Переглянути в 3D|Оберіть привілей, щоб переглянути подробиці.|Головне меню|Усі привілеї|Купити у продавця|Ціна|1 місяць|Напишіть продавцю, щоб узгодити покупку й активацію.',
 tr:'Hoş geldiniz! Mağazayı açın veya 3D kataloğa göz atın.|Mağaza|3D kataloğu aç|3D görüntüle|Ayrıntıları görmek için bir ayrıcalık seçin.|Ana menü|Tüm ayrıcalıklar|Satıcıdan satın al|Fiyat|1 ay|Satın alma ve etkinleştirme için satıcıya yazın.',
 fr:'Bienvenue ! Ouvrez la boutique ou parcourez le catalogue 3D.|Boutique|Ouvrir le catalogue 3D|Voir en 3D|Choisissez un avantage pour voir les détails.|Menu principal|Tous les avantages|Acheter auprès du vendeur|Prix|1 mois|Contactez le vendeur pour convenir de l’achat et de l’activation.',
 de:'Willkommen! Öffne den Shop oder stöbere im 3D-Katalog.|Shop|3D-Katalog öffnen|In 3D ansehen|Wähle einen Vorteil aus, um Details zu sehen.|Hauptmenü|Alle Vorteile|Beim Verkäufer kaufen|Preis|1 Monat|Kontaktiere den Verkäufer für Kauf und Freischaltung.',
 fa:'خوش آمدید! فروشگاه یا کاتالوگ سه‌بعدی را باز کنید.|فروشگاه|باز کردن کاتالوگ سه‌بعدی|نمایش سه‌بعدی|برای دیدن جزئیات یک امتیاز انتخاب کنید.|منوی اصلی|همهٔ امتیازها|خرید از فروشنده|قیمت|۱ ماه|برای خرید و فعال‌سازی به فروشنده پیام دهید.',
 hi:'स्वागत है! दुकान खोलें या 3D कैटलॉग देखें।|दुकान|3D कैटलॉग खोलें|3D में देखें|विवरण के लिए कोई विशेष सुविधा चुनें।|मुख्य मेनू|सभी सुविधाएँ|विक्रेता से खरीदें|कीमत|1 महीना|खरीद और सक्रिय करने के लिए विक्रेता को संदेश भेजें।',
 az:'Xoş gəlmisiniz! Mağazanı açın və ya 3D kataloqa baxın.|Mağaza|3D kataloqu aç|3D-də bax|Ətraflı məlumat üçün imtiyaz seçin.|Əsas menyu|Bütün imtiyazlar|Satıcıdan al|Qiymət|1 ay|Alış və aktivləşdirmə üçün satıcıya yazın.',
 ku:'بەخێربێن! فرۆشگا یان کەتەلۆگی سێ ڕەهەندی بکەنەوە.|فرۆشگا|کردنەوەی کەتەلۆگی 3D|بینین بە 3D|بۆ وردەکاری ئیمتیازێک هەڵبژێرن.|مێنیوی سەرەکی|هەموو ئیمتیازەکان|کڕین لە فرۆشیار|نرخ|١ مانگ|بۆ کڕین و چالاککردن نامە بۆ فرۆشیار بنێرن.',
 hinglish:'Welcome! Shop खोलें या 3D catalog देखें।|Shop|3D catalog खोलें|3D में देखें|Details के लिए कोई perk चुनें।|Main menu|सभी perks|Seller से खरीदें|Price|1 महीना|Purchase और activation के लिए seller को message करें।',
 kk:'Қош келдіңіз! Дүкенді немесе 3D каталогты ашыңыз.|Дүкен|3D каталогты ашу|3D форматында көру|Толығырақ білу үшін артықшылықты таңдаңыз.|Басты мәзір|Барлық артықшылықтар|Сатушыдан сатып алу|Бағасы|1 ай|Сатып алу және іске қосу үшін сатушыға жазыңыз.',
 nl:'Welkom! Open de winkel of bekijk de 3D-catalogus.|Winkel|3D-catalogus openen|In 3D bekijken|Kies een voordeel om de details te bekijken.|Hoofdmenu|Alle voordelen|Kopen bij de verkoper|Prijs|1 maand|Stuur de verkoper een bericht over de aankoop en activering.',
 ro:'Bun venit! Deschide magazinul sau răsfoiește catalogul 3D.|Magazin|Deschide catalogul 3D|Vezi în 3D|Alege un privilegiu pentru a vedea detaliile.|Meniu principal|Toate privilegiile|Cumpără de la vânzător|Preț|1 lună|Contactează vânzătorul pentru cumpărare și activare.',
 zh:'欢迎！请打开商店或浏览 3D 目录。|商店|打开 3D 目录|查看 3D 模型|请选择一项特权以查看详情。|主菜单|全部特权|向卖家购买|价格|1 个月|请联系卖家确认购买和开通事宜。',
};
for(const [lang,translation] of Object.entries(translations)){
 const [welcome,shop,catalog,weapons,shopIntro,home,back,buy,price,duration,seller]=translation.split('|');
 copy[lang]={
  welcome,shop:'☣️ VIP '+shop,catalog:'👕 '+catalog,weapons,shopIntro,
  home:'← '+home,back:'← '+back,buy:'🛒 '+buy,term:'💰 '+price+': $10\n📅 '+duration,
  seller,catalogIntro:'👕 ZMRush · 3D',stale:'/shop',
 };
}
const catalogButton=lang=>({text:copy[lang].catalog,web_app:{url:catalogUrl(lang)}});
const view=(text,inline_keyboard)=>({text,reply_markup:{inline_keyboard}});
const productTitles={
 es:'Modos de granadas HE / Flash|Modelos de jugadores|Modelos de armas|Sombreros y accesorios|Reserva de apodo|Prefijo personal|Doble salto',
 uz:'HE / Flash granata rejimlari|Oʻyinchi modellari|Qurol modellari|Bosh kiyimlar va aksessuarlar|Nikni band qilish|Shaxsiy prefiks|Ikki marta sakrash',
 id:'Mode Granat HE / Flash|Model Pemain|Model Senjata|Topi dan Aksesori|Reservasi Nama Panggilan|Prefiks Pribadi|Lompat Ganda',
 it:'Modalità granate HE / Flash|Modelli giocatore|Modelli armi|Cappelli e accessori|Prenotazione nickname|Prefisso personale|Doppio salto',
 pt:'Modos de granadas HE / Flash|Modelos de jogadores|Modelos de armas|Chapéus e acessórios|Reserva de apelido|Prefixo pessoal|Salto duplo',
 uk:'Режими гранат HE / Flash|Моделі гравців|Моделі зброї|Шапки й аксесуари|Бронювання нікнейму|Персональний префікс|Подвійний стрибок',
 tr:'HE / Flash Bomba Modları|Oyuncu Modelleri|Silah Modelleri|Şapkalar ve Aksesuarlar|Takma Ad Ayırma|Kişisel Önek|Çift Zıplama',
 fr:'Modes de grenades HE / Flash|Modèles de joueurs|Modèles d’armes|Chapeaux et accessoires|Réservation de pseudo|Préfixe personnel|Double saut',
 de:'HE-/Blendgranaten-Modi|Spielermodelle|Waffenmodelle|Hüte und Zubehör|Nicknamen reservieren|Persönlicher Präfix|Doppelsprung',
 fa:'حالت‌های نارنجک HE / Flash|مدل‌های بازیکن|مدل‌های سلاح|کلاه‌ها و لوازم جانبی|رزرو نام مستعار|پیشوند شخصی|پرش دوگانه',
 hi:'HE / Flash ग्रेनेड मोड|खिलाड़ी मॉडल|हथियार मॉडल|टोपियाँ और एक्सेसरीज़|उपनाम आरक्षण|निजी प्रीफ़िक्स|दोहरी छलाँग',
 az:'HE / Flash qumbara rejimləri|Oyunçu modelləri|Silah modelləri|Papaqlar və aksesuarlar|Ləqəbin rezervasiyası|Şəxsi prefiks|İkiqat tullanma',
 ku:'دۆخەکانی نارنجۆکی HE / Flash|مۆدێلەکانی یاریزان|مۆدێلەکانی چەک|کڵاو و کەلوپەل|حجزکردنی نازناو|پێشگری تایبەت|بازدانی دووانە',
 hinglish:'HE / Flash Grenade Modes|Player Models|Weapon Models|Hats और Accessories|Nickname Reserve करें|Personal Prefix|Double Jump',
 kk:'HE / Flash граната режимдері|Ойыншы модельдері|Қару модельдері|Баскиімдер мен аксессуарлар|Лақап атты брондау|Жеке префикс|Қос секіру',
 nl:'HE- en flashgranaatmodi|Spelermodellen|Wapenmodellen|Hoeden en accessoires|Bijnaam reserveren|Persoonlijk voorvoegsel|Dubbele sprong',
 ro:'Moduri grenade HE / Flash|Modele de jucători|Modele de arme|Pălării și accesorii|Rezervare de poreclă|Prefix personal|Salt dublu',
 zh:'HE / 闪光弹模式|玩家模型|武器模型|帽子和配饰|昵称预留|个人前缀|二段跳',
};
const productCopy=(item,lang)=>{
 if(lang==='ru')return [item.title,item.description];
 const [title,description]=englishPrivileges[item.id-1];
 const index=item.id-1;
 return [productTitles[lang]?.split('|')[index]||title,productDescriptions[lang]?.split('|')[index]||description];
};
const productDescriptions={
 es:'Usa granadas HE y Flash en modo Impact o Standard.|Equipa un aspecto exclusivo para Zombie Escape.|Cambia el aspecto de tus armas.|Prueba sombreros y accesorios en el catálogo 3D.|Reserva tu apodo para que nadie más lo use.|Añade un prefijo delante de tu apodo en el chat.|Salta dos veces en mapas ZE. ⚠️ Solo para humanos.',
 uz:'HE va Flash granatalarini Impact yoki Standard rejimida ishlating.|Zombie Escape uchun noyob oʻyinchi koʻrinishini tanlang.|Qurollaringiz koʻrinishini oʻzgartiring.|Bosh kiyimlarni 3D katalogda sinab koʻring.|Nikni boshqalar ishlatmasligi uchun band qiling.|Chatda nik oldiga shaxsiy prefiks qoʻshing.|ZE xaritalarida ikki marta sakrang. ⚠️ Faqat odamlar uchun.',
 id:'Gunakan granat HE dan Flash dalam mode Impact atau Standard.|Pilih tampilan pemain eksklusif untuk Zombie Escape.|Ubah tampilan senjatamu.|Coba topi dan aksesori di katalog 3D.|Pesan nama panggilan agar pemain lain tidak dapat memakainya.|Tambahkan prefiks sebelum nama panggilanmu di chat.|Lompat dua kali di peta ZE. ⚠️ Hanya untuk tim manusia.',
 it:'Usa le granate HE e Flash in modalità Impact o Standard.|Scegli un aspetto esclusivo per Zombie Escape.|Cambia l’aspetto delle tue armi.|Prova cappelli e accessori nel catalogo 3D.|Riserva il tuo nickname per impedirne l’uso ad altri.|Aggiungi un prefisso al tuo nickname in chat.|Salta due volte nelle mappe ZE. ⚠️ Solo per gli umani.',
 pt:'Use granadas HE e Flash no modo Impact ou Standard.|Escolha uma aparência exclusiva em Zombie Escape.|Personalize a aparência das suas armas.|Experimente chapéus e acessórios no catálogo 3D.|Reserve seu apelido para impedir que outros o usem.|Adicione um prefixo antes do seu apelido no chat.|Salte duas vezes nos mapas ZE. ⚠️ Apenas para humanos.',
 uk:'Використовуйте гранати HE і Flash у режимі Impact або Standard.|Оберіть ексклюзивний вигляд у Zombie Escape.|Змініть зовнішній вигляд своєї зброї.|Приміряйте шапки й аксесуари в 3D-каталозі.|Забронюйте нікнейм, щоб інші гравці його не використовували.|Додайте особистий префікс перед ніком у чаті.|Стрибайте двічі на картах ZE. ⚠️ Лише для команди людей.',
 tr:'HE ve Flash bombalarını Impact veya Standard modunda kullan.|Zombie Escape için özel bir karakter görünümü seç.|Silahlarının görünümünü değiştir.|Şapka ve aksesuarları 3D katalogda dene.|Takma adını başkalarının kullanımına karşı ayır.|Sohbette takma adının önüne kişisel bir önek ekle.|ZE haritalarında iki kez zıpla. ⚠️ Yalnızca insanlar için.',
 fr:'Utilisez les grenades HE et Flash en mode Impact ou Standard.|Choisissez une apparence exclusive dans Zombie Escape.|Personnalisez vos armes.|Essayez les chapeaux et accessoires dans le catalogue 3D.|Réservez votre pseudo pour que personne d’autre ne l’utilise.|Ajoutez un préfixe à votre pseudo dans le chat.|Sautez deux fois sur les cartes ZE. ⚠️ Réservé aux humains.',
 de:'Verwende HE- und Blendgranaten im Impact- oder Standardmodus.|Wähle ein exklusives Aussehen für Zombie Escape.|Ändere das Aussehen deiner Waffen.|Probiere Hüte und Zubehör im 3D-Katalog an.|Reserviere deinen Nicknamen, damit ihn niemand sonst nutzt.|Setze deinem Nicknamen im Chat einen persönlichen Präfix voran.|Springe auf ZE-Karten zweimal. ⚠️ Nur für das Menschenteam.',
 fa:'از نارنجک‌های HE و Flash در حالت Impact یا Standard استفاده کنید.|در Zombie Escape ظاهر ویژه‌ای برای بازیکن انتخاب کنید.|ظاهر سلاح‌های خود را تغییر دهید.|کلاه‌ها و لوازم جانبی را در کاتالوگ سه‌بعدی امتحان کنید.|نام مستعار خود را رزرو کنید تا دیگران از آن استفاده نکنند.|در چت پیشوندی به نام مستعار خود اضافه کنید.|در نقشه‌های ZE دو بار بپرید. ⚠️ فقط برای تیم انسان‌ها.',
 hi:'HE और Flash ग्रेनेड Impact या Standard मोड में इस्तेमाल करें।|Zombie Escape में अपने खिलाड़ी का खास रूप चुनें।|अपने हथियारों का रूप बदलें।|3D कैटलॉग में टोपियाँ और एक्सेसरीज़ आज़माएँ।|अपना उपनाम आरक्षित करें ताकि कोई और उसका इस्तेमाल न करे।|चैट में अपने उपनाम के आगे निजी प्रीफ़िक्स जोड़ें।|ZE मैप पर दो बार छलाँग लगाएँ। ⚠️ केवल मानव टीम के लिए।',
 az:'HE və Flash qumbaralarını Impact və ya Standard rejimində istifadə edin.|Zombie Escape üçün xüsusi oyunçu görünüşü seçin.|Silahlarınızın görünüşünü dəyişin.|Papaq və aksesuarları 3D kataloqda sınayın.|Ləqəbinizi rezerv edin ki, başqaları ondan istifadə etməsin.|Çatda ləqəbinizdən əvvəl şəxsi prefiks əlavə edin.|ZE xəritələrində iki dəfə tullanın. ⚠️ Yalnız insanlar üçün.',
 ku:'نارنجۆکی HE و Flash لە دۆخی Impact یان Standard بەکاربهێنە.|لە Zombie Escape شێوەیەکی تایبەت بۆ یاریزان هەڵبژێرە.|دیمەنی چەکەکانت بگۆڕە.|کڵاو و کەلوپەل لە کەتەلۆگی 3D تاقی بکەرەوە.|نازناوەکەت حجز بکە تا کەسێکی تر بەکاری نەهێنێت.|لە چات پێشگرێکی تایبەت زیاد بکە بۆ نازناوەکەت.|لە نەخشەکانی ZE دوو جار باز بدە. ⚠️ تەنها بۆ تیمی مرۆڤەکان.',
 hinglish:'HE और Flash grenades को Impact या Standard mode में use करें।|Zombie Escape के लिए exclusive player skin चुनें।|अपने weapons का look बदलें।|3D catalog में hats और accessories try करें।|अपना nickname reserve करें ताकि कोई और उसे use न करे।|Chat में nickname के आगे अपना personal prefix लगाएँ।|ZE maps पर दो बार jump करें। ⚠️ सिर्फ Human team के लिए।',
 kk:'HE және Flash гранаталарын Impact немесе Standard режимінде қолданыңыз.|Zombie Escape үшін ерекше ойыншы бейнесін таңдаңыз.|Қаруыңыздың сыртқы көрінісін өзгертіңіз.|Баскиімдер мен аксессуарларды 3D каталогта киіп көріңіз.|Лақап атыңызды басқа ойыншылар қолданбауы үшін брондаңыз.|Чатта лақап атыңыздың алдына жеке префикс қосыңыз.|ZE карталарында екі рет секіріңіз. ⚠️ Тек адамдар командасына.',
 nl:'Gebruik HE- en flashgranaten in de Impact- of Standard-modus.|Kies een exclusieve spelersskin in Zombie Escape.|Pas het uiterlijk van je wapens aan.|Pas hoeden en accessoires in de 3D-catalogus.|Reserveer je bijnaam zodat anderen hem niet kunnen gebruiken.|Plaats een persoonlijk voorvoegsel voor je bijnaam in de chat.|Spring twee keer op ZE-kaarten. ⚠️ Alleen voor het mensenteam.',
 ro:'Folosește grenade HE și Flash în modul Impact sau Standard.|Alege un aspect exclusiv în Zombie Escape.|Schimbă aspectul armelor tale.|Probează pălării și accesorii în catalogul 3D.|Rezervă-ți porecla pentru ca alți jucători să nu o folosească.|Adaugă un prefix personal înaintea poreclei din chat.|Sari de două ori pe hărțile ZE. ⚠️ Doar pentru echipa oamenilor.',
 zh:'可在 Impact 或 Standard 模式下使用 HE 手雷和闪光弹。|为 Zombie Escape 选择专属角色外观。|更改武器的外观。|在 3D 目录中试戴帽子和配饰。|预留昵称，防止其他玩家使用。|在聊天昵称前添加个人前缀。|在 ZE 地图中可以跳两次。⚠️ 仅限人类阵营。',
};
export function home(lang='ru'){
 return view('ZMRush - PREMIUM\n\n'+copy[lang].welcome,[[button(copy[lang].shop,'ze:shop')],[catalogButton(lang)],[languageButton]]);
}
const shopPrivileges=[7,1,5,6].map(id=>privileges.find(p=>p.id===id));
export function shop(lang='ru'){
 return view('☣️ZMRush - shop\n\n'+copy[lang].shopIntro,[
  ...shopPrivileges.map((p,index)=>[button((index+1)+'. '+productCopy(p,lang)[0],'ze:item:'+p.id)]),
  [button(copy[lang].home,'ze:home')],
 ]);
}
export function card(id,lang='ru'){
 const p=privileges.find(p=>p.id===Number(id));
 if(!p)return null;
 const [title,description]=productCopy(p,lang), words=copy[lang];
 if(p.id===1&&lang==='ru'){
  const text=[
   '☣️ ZMRush — PREMIUM',
   '👑 Режимы гранат <b>HE / Flash</b>',
   '<b>Специальные режимы использования гранат HE и Flash: Impact / Standard.</b>',
   '<blockquote>Режим Impact позволяет гранатам взрываться практически мгновенно после столкновения с поверхностью. Это может помочь хотя бы немного отвлечь зомби и получить тактическое преимущество в игре.</blockquote>',
   '⚠️ <b>ПРИМЕЧАНИЕ:</b> Чтобы переключать режимы HE и Flash (Impact / Standard), нажмите правую кнопку мыши.',
   '💰 Стоимость: 9$\n📅 Срок действия: 1 месяц.',
   '⚠️ Пожалуйста, заранее согласуйте с продавцом условия получения привилегии.',
   'Для покупки нажмите кнопку ниже и напишите продавцу.👇',
  ].join('\n\n');
  return {...view(text,[[{text:words.buy,url:SELLER}],[button(words.back,'ze:shop')]]),parse_mode:'HTML'};
 }
 if(p.id===5&&lang==='ru'){
  const text=[
   '☣️ <b>ZMRush — PREMIUM</b>',
   '👑 <b>БРОНИРОВАНИЕ НИКНЕЙМА</b>',
   'Зарезервируйте свой никнейм и защитите его от использования другими игроками!',
   '<blockquote>1. Возможность забронировать свой никнейм.\n2. Защита никнейма от использования другими игроками.\n3. Эксклюзивное право на выбранный никнейм.</blockquote>',
   '💰 <b>Стоимость:</b> 19$\n<b>📅 Срок действия:</b> 12 месяцев.',
   '⚠️ Условия предоставления привилегии согласовываются в личных сообщениях.',
   'Для покупки нажмите кнопку ниже и напишите продавцу👇',
  ].join('\n\n');
  return {...view(text,[[{text:words.buy,url:SELLER}],[button(words.back,'ze:shop')]]),parse_mode:'HTML'};
 }
 if(p.id===6&&lang==='ru'){
  const text=[
   '☣️ <b>ZMRush — PREMIUM</b>',
   '👑 <b>Личный префикс</b>',
   'Уникальный персональный префикс, который отображается перед вашим никнеймом в игровом чате. Например, вы можете установить перед своим ником такие префиксы, как',
   '<blockquote><b>[sad], [relax], [crazy]</b></blockquote>',
   'и другие на ваш выбор.',
   '💰 <b>Цена:</b> 60$\n📅 <b>Срок действия:</b> 12 месяцев.',
   '⚠️ Пожалуйста, заранее согласуйте с продавцом желаемый текст префикса и условия его использования.',
   'Для покупки нажмите кнопку ниже и напишите продавцу 👇',
  ].join('\n\n');
  return {...view(text,[[{text:words.buy,url:SELLER}],[button(words.back,'ze:shop')]]),parse_mode:'HTML'};
 }
 if(premiumTranslations[lang]&&[1,5,6].includes(p.id))return translatedPremiumCard(p.id,lang,title,words);
 const preview=p.id===3?{text:words.weapons,web_app:{url:catalogUrl(lang,'weapons')}}:p.catalog?catalogButton(lang):null;
 const shopNumber=shopPrivileges.indexOf(p)+1;
 return view('☣️ ZOMBIE ESCAPE\n\n'+(shopNumber||p.id)+'. '+title+'\n\n'+description+'\n\n'+words.term+'\n\n'+words.seller,[
  ...(preview?[[preview]]:[]),
  [{text:words.buy,url:SELLER}],
  [button(words.back,'ze:shop')],
 ]);
}
const annualPrices=new Map([[5,19],[6,60]]);
// Grenade introduction, Impact explanation, controls, reservation introduction, three benefits,
// prefix introduction, example suffix, purchase terms and prefix-specific terms.
const premiumTranslations={
 en:'Special HE and Flash grenade modes: Impact / Standard.|In Impact mode, grenades explode almost immediately on contact with a surface. This can briefly distract zombies and give you a tactical advantage in the game.|To switch between HE and Flash modes (Impact / Standard), press the right mouse button.|Reserve your nickname and protect it from use by other players!|Reserve your nickname.~Prevent other players from using it.~Get exclusive use of your chosen nickname.|A unique personal prefix appears before your nickname in the in-game chat. For example, you can use|or another prefix of your choice.|Agree on the terms with the seller in advance.|Agree on the prefix text and conditions of use with the seller in advance.',
 es:'Modos especiales de granadas HE y Flash: Impact / Standard.|En Impact, las granadas explotan casi al instante al tocar una superficie. Esto puede distraer brevemente a los zombis y darte una ventaja táctica en el juego.|Pulsa el botón derecho del ratón para cambiar entre los modos HE y Flash (Impact / Standard).|¡Reserva tu apodo e impide que otros jugadores lo usen!|Reserva tu apodo.~Impide que otros jugadores lo utilicen.~Obtén el derecho exclusivo a usar el apodo elegido.|Un prefijo personal único aparece antes de tu apodo en el chat del juego. Por ejemplo, puedes usar|u otro prefijo que elijas.|Acuerda las condiciones con el vendedor de antemano.|Acuerda previamente con el vendedor el texto del prefijo y las condiciones de uso.',
 uz:'HE va Flash granatalari uchun maxsus rejimlar: Impact / Standard.|Impact rejimida granata sirtga tekkanda deyarli darhol portlaydi. Bu zombilarni qisqa vaqtga chalgʻitib, oʻyinda taktik ustunlik berishi mumkin.|HE va Flash rejimlarini (Impact / Standard) almashtirish uchun sichqonchaning oʻng tugmasini bosing.|Nikingizni band qiling va boshqa oʻyinchilar uni ishlatishidan himoyalaning!|Nikingizni band qiling.~Boshqa oʻyinchilar undan foydalanishiga yoʻl qoʻymang.~Tanlangan nikdan faqat oʻzingiz foydalaning.|Oʻyin chatida nikingizdan oldin noyob shaxsiy prefiks chiqadi. Masalan, quyidagilarni ishlatishingiz mumkin:|yoki oʻzingiz tanlagan boshqa prefiksni.|Shartlarni sotuvchi bilan oldindan kelishib oling.|Prefiks matni va foydalanish shartlarini sotuvchi bilan oldindan kelishib oling.',
 id:'Mode khusus granat HE dan Flash: Impact / Standard.|Dalam mode Impact, granat meledak nyaris seketika saat menyentuh permukaan. Ini bisa mengalihkan perhatian zombie sejenak dan memberi keuntungan taktis dalam permainan.|Klik kanan untuk mengganti mode HE dan Flash (Impact / Standard).|Reservasi nama panggilanmu agar pemain lain tidak bisa menggunakannya!|Reservasi nama panggilanmu.~Cegah pemain lain memakai nama itu.~Dapatkan hak eksklusif atas nama pilihanmu.|Prefiks pribadi yang unik muncul sebelum nama panggilanmu di chat dalam game. Misalnya, kamu bisa memakai|atau prefiks lain pilihanmu.|Sepakati ketentuan dengan penjual terlebih dahulu.|Sepakati teks prefiks dan ketentuan penggunaannya dengan penjual terlebih dahulu.',
 it:'Modalità speciali per granate HE e Flash: Impact / Standard.|In modalità Impact, le granate esplodono quasi subito al contatto con una superficie. Questo può distrarre per un attimo gli zombi e darti un vantaggio tattico nel gioco.|Premi il tasto destro del mouse per cambiare modalità HE e Flash (Impact / Standard).|Prenota il tuo nickname e impedisci agli altri giocatori di usarlo!|Prenota il tuo nickname.~Impedisci agli altri giocatori di usarlo.~Ottieni l’uso esclusivo del nickname scelto.|Un prefisso personale unico appare prima del tuo nickname nella chat di gioco. Ad esempio, puoi usare|o un altro prefisso a tua scelta.|Concorda prima le condizioni con il venditore.|Concorda in anticipo con il venditore il testo del prefisso e le condizioni di utilizzo.',
 pt:'Modos especiais para granadas HE e Flash: Impact / Standard.|No modo Impact, as granadas explodem quase instantaneamente ao tocar uma superfície. Isso pode distrair os zumbis por um instante e dar uma vantagem tática no jogo.|Pressione o botão direito do mouse para alternar os modos de HE e Flash (Impact / Standard).|Reserve seu apelido e impeça que outros jogadores o usem!|Reserve seu apelido.~Impeça que outros jogadores o usem.~Obtenha o direito exclusivo de usar o apelido escolhido.|Um prefixo pessoal único aparece antes do seu apelido no chat do jogo. Por exemplo, você pode usar|ou outro prefixo de sua escolha.|Combine as condições previamente com o vendedor.|Combine previamente com o vendedor o texto do prefixo e as condições de uso.',
 uk:'Спеціальні режими гранат HE і Flash: Impact / Standard.|У режимі Impact гранати вибухають майже миттєво після зіткнення з поверхнею. Це може ненадовго відволікти зомбі й дати тактичну перевагу в грі.|Щоб перемкнути режими HE і Flash (Impact / Standard), натисніть праву кнопку миші.|Забронюйте свій нікнейм і захистіть його від використання іншими гравцями!|Забронюйте свій нікнейм.~Захистіть його від використання іншими гравцями.~Отримайте ексклюзивне право на вибраний нікнейм.|Унікальний особистий префікс відображається перед вашим нікнеймом в ігровому чаті. Наприклад, можна встановити|або інший префікс на ваш вибір.|Заздалегідь узгодьте умови з продавцем.|Заздалегідь узгодьте з продавцем текст префікса та умови його використання.',
 tr:'HE ve Flash bombaları için özel modlar: Impact / Standard.|Impact modunda bombalar bir yüzeye değdiklerinde neredeyse anında patlar. Bu, zombileri kısa süreliğine oyalayıp oyunda taktik avantaj sağlayabilir.|HE ve Flash modları (Impact / Standard) arasında geçiş yapmak için farenin sağ düğmesine bas.|Takma adını ayır ve diğer oyuncuların kullanmasını engelle!|Takma adını ayır.~Diğer oyuncuların kullanmasını önle.~Seçtiğin takma adı yalnızca sen kullan.|Oyun sohbetinde takma adının önünde benzersiz bir kişisel önek görünür. Örneğin şunları kullanabilirsin:|veya kendi seçtiğin başka bir önek.|Koşulları önceden satıcıyla görüş.|Önek metnini ve kullanım koşullarını önceden satıcıyla görüş.',
 fr:'Modes spéciaux des grenades HE et Flash : Impact / Standard.|En mode Impact, les grenades explosent presque aussitôt au contact d’une surface. Cela peut distraire les zombies brièvement et vous donner un avantage tactique en jeu.|Appuyez sur le bouton droit de la souris pour changer de mode HE et Flash (Impact / Standard).|Réservez votre pseudo pour empêcher les autres joueurs de l’utiliser !|Réservez votre pseudo.~Empêchez les autres joueurs de l’utiliser.~Obtenez l’usage exclusif du pseudo choisi.|Un préfixe personnel unique s’affiche avant votre pseudo dans le chat du jeu. Vous pouvez par exemple utiliser|ou un autre préfixe de votre choix.|Convenez des conditions à l’avance avec le vendeur.|Convenez à l’avance du texte du préfixe et de ses conditions d’utilisation avec le vendeur.',
 de:'Spezialmodi für HE- und Blendgranaten: Impact / Standard.|Im Impact-Modus explodieren Granaten beim Kontakt mit einer Oberfläche fast sofort. Das kann Zombies kurz ablenken und dir im Spiel einen taktischen Vorteil verschaffen.|Drücke die rechte Maustaste, um die Modi für HE- und Blendgranaten zu wechseln (Impact / Standard).|Reserviere deinen Nicknamen, damit andere Spieler ihn nicht verwenden können!|Reserviere deinen Nicknamen.~Verhindere, dass andere Spieler ihn verwenden.~Sichere dir die exklusive Nutzung des gewählten Nicknamens.|Ein einzigartiger persönlicher Präfix erscheint vor deinem Nicknamen im Spielchat. Du kannst zum Beispiel|oder einen anderen Präfix deiner Wahl verwenden.|Kläre die Bedingungen vorab mit dem Verkäufer.|Kläre den Präfixtext und die Nutzungsbedingungen vorab mit dem Verkäufer.',
 fa:'حالت‌های ویژهٔ نارنجک‌های HE و Flash: Impact / Standard.|در حالت Impact نارنجک تقریباً بلافاصله پس از برخورد با سطح منفجر می‌شود. این کار می‌تواند برای مدتی کوتاه حواس زامبی‌ها را پرت کند و در بازی برتری تاکتیکی بدهد.|برای جابه‌جایی بین حالت‌های HE و Flash (Impact / Standard)، دکمهٔ راست ماوس را بزنید.|نام مستعار خود را رزرو کنید تا دیگر بازیکنان نتوانند از آن استفاده کنند!|نام مستعار خود را رزرو کنید.~مانع استفادهٔ دیگر بازیکنان شوید.~حق استفادهٔ انحصاری از نام انتخابی را بگیرید.|پیشوند شخصی منحصربه‌فردی پیش از نام مستعار شما در چت بازی نمایش داده می‌شود. برای نمونه می‌توانید از|یا پیشوند دیگری به انتخاب خود استفاده کنید.|شرایط را از پیش با فروشنده هماهنگ کنید.|متن پیشوند و شرایط استفاده را از پیش با فروشنده هماهنگ کنید.',
 hi:'HE और Flash ग्रेनेड के विशेष मोड: Impact / Standard।|Impact मोड में ग्रेनेड किसी सतह से टकराते ही लगभग तुरंत फटते हैं। इससे ज़ॉम्बी कुछ देर के लिए भटक सकते हैं और खेल में रणनीतिक बढ़त मिल सकती है।|HE और Flash के मोड (Impact / Standard) बदलने के लिए माउस का दायाँ बटन दबाएँ।|अपना उपनाम आरक्षित करें ताकि दूसरे खिलाड़ी उसे इस्तेमाल न कर सकें!|अपना उपनाम आरक्षित करें।~दूसरे खिलाड़ियों को इसका उपयोग करने से रोकें।~चुने हुए उपनाम के इस्तेमाल का विशेष अधिकार पाएँ।|गेम चैट में आपके उपनाम से पहले एक खास निजी प्रीफ़िक्स दिखता है। उदाहरण के लिए, आप ये इस्तेमाल कर सकते हैं:|या अपनी पसंद का कोई और प्रीफ़िक्स।|शर्तें पहले से विक्रेता से तय कर लें।|प्रीफ़िक्स का टेक्स्ट और इस्तेमाल की शर्तें पहले से विक्रेता से तय कर लें।',
 az:'HE və Flash qumbaraları üçün xüsusi rejimlər: Impact / Standard.|Impact rejimində qumbaralar səthə dəyən kimi, demək olar ki, dərhal partlayır. Bu, zombilərin diqqətini qısa müddətə yayındırıb oyunda taktiki üstünlük verə bilər.|HE və Flash rejimlərini (Impact / Standard) dəyişmək üçün siçanın sağ düyməsini basın.|Ləqəbinizi rezerv edin və digər oyunçuların istifadəsindən qoruyun!|Ləqəbinizi rezerv edin.~Başqa oyunçuların ondan istifadəsini əngəlləyin.~Seçilmiş ləqəbdən müstəsna istifadə hüququ qazanın.|Oyun çatında ləqəbinizdən əvvəl unikal şəxsi prefiks görünür. Məsələn, bunları seçə bilərsiniz:|və ya seçdiyiniz başqa prefiksi.|Şərtləri satıcı ilə əvvəlcədən razılaşdırın.|Prefiksin mətnini və istifadə şərtlərini satıcı ilə əvvəlcədən razılaşdırın.',
 ku:'دۆخە تایبەتەکانی نارنجۆکی HE و Flash: Impact / Standard.|لە دۆخی Impact نارنجۆکەکان کە بە ڕووێک دەکەون نزیکەی هەر دەستبەجێ دەتەقنەوە. ئەمە دەتوانێ زۆمبییەکان بۆ ماوەیەکی کورت سەرقاڵ بکات و باڵادەستی تاکتیکی لە یارییەکەدا بدات.|بۆ گۆڕینی دۆخی HE و Flash (Impact / Standard)، دوگمەی ڕاستی ماوس دابگرە.|نازناوەکەت حجز بکە تا یاریزانانی تر بەکاری نەهێنن!|نازناوەکەت حجز بکە.~ڕێگری بکە لە بەکارهێنانی لەلایەن یاریزانانی تر.~مافی تایبەتی بەکارهێنانی نازناوە هەڵبژێردراوەکە وەربگرە.|پێشگرێکی تایبەت پێش نازناوەکەت لە چاتی یاری دەردەکەوێت. بۆ نموونە دەتوانیت ئەمانە بەکاربهێنیت:|یان پێشگرێکی تر بە هەڵبژاردنی خۆت.|پێشتر لەگەڵ فرۆشیار لەسەر مەرجەکان ڕێک بکەوە.|دەقی پێشگر و مەرجەکانی بەکارهێنان پێشتر لەگەڵ فرۆشیار ڕێک بخە.',
 hinglish:'HE और Flash grenades के special modes: Impact / Standard।|Impact mode में grenade किसी surface से टकराते ही लगभग तुरंत explode होता है। इससे आप zombies को थोड़ी देर distract करके game में tactical advantage ले सकते हैं।|HE और Flash के modes (Impact / Standard) switch करने के लिए mouse का right button दबाएँ।|अपना nickname reserve करें ताकि दूसरे players उसे use न कर सकें!|अपना nickname reserve करें।~दूसरे players को नाम use करने से रोकें।~चुने हुए nickname का exclusive use पाएँ।|In-game chat में आपके nickname से पहले एक unique personal prefix दिखता है। जैसे आप ये लगा सकते हैं:|या अपनी पसंद का कोई दूसरा prefix।|Terms पहले से seller के साथ तय करें।|Prefix का text और use की terms पहले से seller के साथ तय करें।',
 kk:'HE және Flash гранаталарының арнайы режимдері: Impact / Standard.|Impact режимінде граната бетке тиген бойда дерлік жарылады. Бұл зомбилерді сәл алаңдатып, ойында тактикалық артықшылық беруі мүмкін.|HE және Flash режимдерін (Impact / Standard) ауыстыру үшін тінтуірдің оң жақ түймесін басыңыз.|Лақап атыңызды брондап, оны басқа ойыншылардың қолдануынан қорғаңыз!|Лақап атыңызды брондаңыз.~Оны басқа ойыншылардың қолдануына жол бермеңіз.~Таңдалған лақап атты тек өзіңіз қолдану құқығын алыңыз.|Ойын чатында лақап атыңыздың алдында ерекше жеке префикс көрсетіледі. Мысалы, келесілерді қолдануға болады:|немесе өзіңіз таңдаған басқа префиксті.|Шарттарды сатушымен алдын ала келісіңіз.|Префикс мәтінін және пайдалану шарттарын сатушымен алдын ала келісіңіз.',
 nl:'Speciale modi voor HE- en flashgranaten: Impact / Standard.|In Impact-modus ontploffen granaten bijna meteen bij contact met een oppervlak. Dit kan zombies kort afleiden en je een tactisch voordeel geven in het spel.|Klik met de rechtermuisknop om tussen de HE- en flashgranaatmodi te wisselen (Impact / Standard).|Reserveer je bijnaam zodat andere spelers hem niet kunnen gebruiken!|Reserveer je bijnaam.~Voorkom dat andere spelers hem gebruiken.~Krijg het exclusieve gebruiksrecht op de gekozen bijnaam.|Een uniek persoonlijk voorvoegsel staat vóór je bijnaam in de gamechat. Je kunt bijvoorbeeld|of een ander voorvoegsel naar keuze gebruiken.|Spreek de voorwaarden vooraf af met de verkoper.|Spreek de tekst en de gebruiksvoorwaarden van het voorvoegsel vooraf af met de verkoper.',
 ro:'Moduri speciale pentru grenadele HE și Flash: Impact / Standard.|În modul Impact, grenadele explodează aproape imediat la contactul cu o suprafață. Asta poate distrage zombi pentru scurt timp și îți poate oferi un avantaj tactic în joc.|Apasă butonul din dreapta al mouse-ului pentru a schimba modurile HE și Flash (Impact / Standard).|Rezervă-ți porecla ca să nu o poată folosi alți jucători!|Rezervă-ți porecla.~Împiedică alți jucători să o folosească.~Obține dreptul exclusiv de a folosi porecla aleasă.|Un prefix personal unic apare înaintea poreclei tale în chatul jocului. De exemplu, poți alege|sau un alt prefix la alegere.|Stabilește condițiile din timp cu vânzătorul.|Stabilește din timp cu vânzătorul textul prefixului și condițiile de utilizare.',
 zh:'HE 手雷和闪光弹的特殊模式：Impact / Standard。|在 Impact 模式下，手雷碰到表面后几乎会立即爆炸。这可以暂时分散僵尸的注意力，让你在游戏中获得战术优势。|按鼠标右键切换 HE 手雷和闪光弹的模式（Impact / Standard）。|预留你的昵称，防止其他玩家使用！|预留你的昵称。~防止其他玩家使用该昵称。~获得所选昵称的专属使用权。|专属个人前缀会显示在游戏聊天中的昵称之前。例如，你可以使用|或自行选择其他前缀。|请提前和卖家确认相关条款。|请提前与卖家确认前缀文字及使用条件。',
};
function translatedPremiumCard(id,lang,title,words){
 const [grenades,impact,controls,reservation,benefits,prefix,prefixEnd,terms,prefixTerms]=premiumTranslations[lang].split('|');
 const blocks=id===1
  ? ['<b>'+grenades+'</b>','<blockquote>'+impact+'</blockquote>','⚠️ '+controls]
  : id===5
   ? [reservation,'<blockquote>'+benefits.split('~').map((line,index)=>(index+1)+'. '+line).join('\n')+'</blockquote>']
   : [prefix,'<blockquote><b>[sad], [relax], [crazy]</b></blockquote>',prefixEnd];
 const term=id===1?words.term.replace('$10',()=>'$9'):annualTerm(lang,annualPrices.get(id));
 const text=['☣️ <b>ZMRush — PREMIUM</b>','👑 <b>'+title+'</b>',...blocks,term,'⚠️ '+(id===6?prefixTerms:terms),words.seller+' 👇'].join('\n\n');
 return {...view(text,[[{text:words.buy,url:SELLER}],[button(words.back,'ze:shop')]]),parse_mode:'HTML'};
}
const annualDurations={
 en:'12 months',es:'12 meses',uz:'12 oy',id:'12 bulan',it:'12 mesi',pt:'12 meses',uk:'12 місяців',
 tr:'12 ay',fr:'12 mois',de:'12 Monate',fa:'۱۲ ماه',hi:'12 महीने',az:'12 ay',ku:'١٢ مانگ',
 hinglish:'12 महीने',kk:'12 ай',nl:'12 maanden',ro:'12 luni',zh:'12 个月',
};
function annualTerm(lang,amount){
 const [price]=copy[lang].term.split('\n');
 const duration=annualDurations[lang];
 return price.replace('$10',()=>'$'+amount)+'\n📅 '+(lang==='en'?'Duration: ':'')+duration;
}
function catalog(lang){
 return view(copy[lang].catalogIntro,[[catalogButton(lang)],[button(copy[lang].shop,'ze:shop')]]);
}
function languagePrompt(destination,selected){
 const rows=[];
 for(let i=0;i<languages.length;i+=2){
  rows.push(languages.slice(i,i+2).map(([code,label])=>button((selected===code?'✅ ':'')+label,'ze:lang:'+code+':'+destination)));
 }
 rows.push([button(copy[selected||'en'].home,'ze:'+destination)]);
 return view('🌐 Язык / Language\n\nВыберите язык / Choose your language',rows);
}
async function storedLanguage(preferences,chatId){
 const lang=await preferences?.get('lang:'+chatId);
 return supportedLanguages.has(lang)?lang:null;
}
const commands=[
 {command:'start',description:'Главное меню ZMRush'},
 {command:'shop',description:'Магазин привилегий Zombie Escape'},
 {command:'catalog',description:'3D-каталог моделей и шапок'},
 {command:'language',description:'Язык / Language'},
 {command:'help',description:'Помощь и главное меню'},
];
async function syncCommands(call,preferences){
 const key='bot:commands:language-v1';
 if(!preferences||await preferences.get(key))return;
 await call('setMyCommands',{commands});
 await preferences.put(key,'1');
}
async function api(token,method,body){
 /** @type {RequestInit} */
 let request={headers:{'content-type':'application/json'},body:JSON.stringify(body)};
 if(method==='sendVideo'&&body.video===GRENADE_VIDEO_SOURCE){
  const media=await fetch(GRENADE_VIDEO_SOURCE,{signal:AbortSignal.timeout(10000)});
  if(!media.ok)throw Error('Grenade video unavailable');
  const form=new FormData();
  form.set('chat_id',String(body.chat_id));
  form.set('supports_streaming','true');
  form.set('reply_parameters',JSON.stringify(body.reply_parameters));
  form.set('video',new Blob([await media.arrayBuffer()],{type:'video/mp4'}),'grenade-modes.mp4');
  request={body:form};
 }
 const response=await fetch('https://api.telegram.org/bot'+token+'/'+method,{method:'POST',...request,signal:AbortSignal.timeout(method==='sendVideo'?25000:10000)});
 const data=await response.json();
 if(!response.ok||!data.ok){
  if(method==='editMessageText'&&data.description?.includes('message is not modified'))return true;
  const status=data.error_code||response.status;
  const invalidVideoId=method==='sendVideo'&&status===400&&/file[_ ]?id|file identifier/i.test(data.description||'');
  throw Object.assign(new Error('Telegram API request failed'),{method,status,invalidVideoId});
 }
 return data.result;
}

async function sendGrenadeVideo(call,preferences,chatId,messageId){
 const payload={
  chat_id:chatId,
  supports_streaming:true,
  reply_parameters:{message_id:messageId,allow_sending_without_reply:true},
 };
 let fileId;
 try{fileId=await preferences?.get(GRENADE_VIDEO_CACHE_KEY);}catch{}
 if(fileId){
  try{
   await call('sendVideo',{...payload,video:fileId});
   return;
  }catch(error){
   // Only try the original upload after an explicit invalid-file response.
   // A timeout leaves it unclear whether the cached video was already sent.
   if(!error.invalidVideoId)throw error;
  }
 }
 const sent=await call('sendVideo',{...payload,video:GRENADE_VIDEO_SOURCE});
 if(typeof sent?.video?.file_id==='string'){
  try{await preferences?.put(GRENADE_VIDEO_CACHE_KEY,sent.video.file_id);}catch{}
 }
}

export async function handleUpdate(update,call,preferences){
 const cb=update.callback_query;
 if(cb){
  if(cb.message?.chat?.type!=='private'||cb.message.chat.id!==cb.from?.id)return;
  const match=/^ze:lang:([a-z]+):(home|shop)$/.exec(cb.data||'');
  const choice=match&&supportedLanguages.has(match[1])?match:null;
  const saved=await storedLanguage(preferences,cb.from.id);
  let lang=saved||'ru';
  if(choice&&preferences){
   lang=choice[1];
   await preferences.put('lang:'+cb.from.id,lang);
  }
  const action=choice&&preferences?'ze:'+choice[2]:cb.data;
  const response=action==='ze:languages'?languagePrompt('home',saved):action==='ze:home'?home(lang):action==='ze:shop'?shop(lang):/^ze:item:[1-7]$/.test(action||'')?card(action.slice(8),lang):null;
  await call('answerCallbackQuery',{callback_query_id:cb.id,...(!response?{text:copy[lang].stale}:{})});
  if(response)await call('editMessageText',{chat_id:cb.message.chat.id,message_id:cb.message.message_id,...response});
  if(action==='ze:item:1'){
   await sendGrenadeVideo(call,preferences,cb.message.chat.id,cb.message.message_id).catch(async error=>{
    console.warn({event:'grenade_video_fallback',status:error.status});
    await call('sendMessage',{chat_id:cb.message.chat.id,text:GRENADE_VIDEO_PAGE});
   });
  }
  return;
 }
 const message=update.message;if(message?.chat?.type!=='private'||typeof message.text!=='string')return;
 const command=message.text.trim().split(/\s+/)[0].split('@')[0].toLowerCase();
 if(!['/start','/shop','/catalog','/help','/language'].includes(command))return;
 const lang=await storedLanguage(preferences,message.chat.id);
 const opensShop=command==='/shop'||/^\/start(?:@\w+)?\s+shop\s*$/i.test(message.text.trim());
 const response=command==='/language'||(command==='/start'&&preferences&&!lang)
  ? languagePrompt(opensShop?'shop':'home',lang)
  : opensShop?shop(lang||'ru'):command==='/catalog'?catalog(lang||'ru'):home(lang||'ru');
 await call('sendMessage',{chat_id:message.chat.id,...response});
}

// Telegram retries updates. Coalesce duplicates in the same Worker instance.
// KV is not used as a lock because writes can take time to appear elsewhere.
const recentUpdates=new Map();
const completedUpdateTtlMs=5*60*1000;
const maxRecentUpdates=256;

export async function handleUpdateOnce(update,run){
 const id=update.update_id;
 if(!Number.isSafeInteger(id))return run();
 const previous=recentUpdates.get(id);
 if(previous&&(!previous.expiresAt||previous.expiresAt>Date.now()))return previous.promise;
 const current={promise:Promise.resolve().then(run),expiresAt:0};
 recentUpdates.set(id,current);
 try{
  const result=await current.promise;
  const now=Date.now();
  current.expiresAt=now+completedUpdateTtlMs;
  for(const [key,entry] of recentUpdates){
   if(entry.expiresAt&&(entry.expiresAt<=now||recentUpdates.size>maxRecentUpdates))recentUpdates.delete(key);
  }
  return result;
 }catch(error){
  if(recentUpdates.get(id)===current)recentUpdates.delete(id);
  throw error;
 }
}
const safeEqual=(a,b)=>{if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;};
async function miniAppUser(initData,token){
 if(typeof initData!=='string'||initData.length>16384)return null;
 const values=new URLSearchParams(initData),keys=[...values.keys()];
 if(new Set(keys).size!==keys.length)return null;
 const hash=values.get('hash'),date=Number(values.get('auth_date')),now=Math.floor(Date.now()/1000);
 if(!/^[a-f0-9]{64}$/i.test(hash||'')||!Number.isSafeInteger(date)||date>now+300||now-date>86400)return null;
 values.delete('hash');values.sort();
 const data=[...values].map(([key,value])=>key+'='+value).join('\n');
 const encoder=new TextEncoder();
 const hmac=async(key,message)=>{
  const cryptoKey=await crypto.subtle.importKey('raw',typeof key==='string'?encoder.encode(key):key,{name:'HMAC',hash:'SHA-256'},false,['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC',cryptoKey,encoder.encode(message)));
 };
 const secret=await hmac('WebAppData',token),digest=await hmac(secret,data);
 const expected=Array.from(digest,byte=>byte.toString(16).padStart(2,'0')).join('');
 if(!safeEqual(expected,hash.toLowerCase()))return null;
 try{const user=JSON.parse(values.get('user'));return Number.isSafeInteger(user?.id)&&user.id>0?user:null;}catch{return null;}
}
async function catalogLanguage(request,env){
 const origin=request.headers.get('origin');
 if(!new Set([new URL(CATALOG).origin,'https://zmrush.pages.dev']).has(origin))return text('Forbidden',403);
 const cors={...headers,'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type','vary':'Origin'};
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json; charset=utf-8'}});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(!env.BOT_TOKEN)return json({error:'Not configured'},503);
 if(Number(request.headers.get('content-length'))>20000)return json({error:'Request too large'},413);
 let body;try{const raw=await request.text();if(raw.length>20000)return json({error:'Request too large'},413);body=JSON.parse(raw);}catch{return json({error:'Invalid request'},400);}
 const user=await miniAppUser(body?.initData,env.BOT_TOKEN);
 if(!user)return json({error:'Unauthorized'},401);
 const language=await storedLanguage(env.ZMRUSH_LANGUAGES,user.id);
 return json({language});
}
async function webhookSecret(token){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('zm-rush-ze-webhook-v1:'+token));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');}
const headers={'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'same-origin'};
function text(value,status=200){return new Response(value,{status,headers:{...headers,'content-type':'text/plain; charset=utf-8'}});}
const setupPage=`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ZMRush — подключение бота</title><style>body{font:16px system-ui;background:#101513;color:#edf2ec;max-width:540px;margin:8vh auto;padding:24px}input[type=password]{box-sizing:border-box;width:100%;padding:12px;margin:12px 0 20px}button{padding:14px;background:#ccff67;border:0;border-radius:8px;font:inherit}label{display:block;margin:18px 0}p{line-height:1.6;color:#b8c6b5}</style><h1>Подключение @zm_rushbot</h1><p>Сначала сохраните токен в зашифрованном секрете Worker с именем BOT_TOKEN. Затем введите его здесь для подтверждения подключения. Он не включается в адрес страницы и не сохраняется в коде.</p><form method="post" action="/setup"><label>Токен бота<input type="password" name="token" required autocomplete="off" spellcheck="false"></label><label><input type="checkbox" name="replace" value="yes"> Я разрешаю заменить существующий обработчик бота, если он уже настроен.</label><button>Подключить магазин к боту</button></form><p>Подключение регистрирует обработчик сообщений и команды /start, /shop, /catalog и /help. Сообщения пользователям автоматически не рассылаются.</p></html>`;
export default {async fetch(request,env,context){
 const url=new URL(request.url);
 if(url.pathname==='/catalog-language')return catalogLanguage(request,env);
 if(request.method==='GET'&&url.pathname==='/')return text('ZMRush ZE bot worker. Setup: /setup');
 if(url.pathname==='/setup'&&request.method==='GET')return new Response(setupPage,{headers:{...headers,'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}});
 if(!env.BOT_TOKEN)return text('BOT_TOKEN secret is not configured.',503);
 if(url.pathname==='/setup'&&request.method==='POST'){
  if(request.headers.get('origin')!==url.origin)return text('Forbidden',403);
  if(Number(request.headers.get('content-length'))>4096)return text('Request too large',413);
  let form;try{form=await request.formData();}catch{return text('Invalid form',400);}
  if(!safeEqual(form.get('token'),env.BOT_TOKEN))return text('Неверный токен.',403);
  try{
   const me=await api(env.BOT_TOKEN,'getMe',{});if(me.username?.toLowerCase()!==BOT_USERNAME)return text('Токен принадлежит другому боту. Нужен @'+BOT_USERNAME,409);
   const target=url.origin+'/telegram',existing=await api(env.BOT_TOKEN,'getWebhookInfo',{});
   if(existing.url&&existing.url!==target&&form.get('replace')!=='yes')return text('У бота уже есть другой обработчик. Подключение не изменено. Для замены вернитесь назад и подтвердите замену существующего обработчика.',409);
   await api(env.BOT_TOKEN,'setWebhook',{url:target,secret_token:await webhookSecret(env.BOT_TOKEN),allowed_updates:['message','callback_query']});
   await api(env.BOT_TOKEN,'setMyCommands',{commands});
   return text('Готово! Магазин подключён к @'+me.username+'. Откройте бота в Telegram и отправьте /shop.');
  }catch{return text('Не удалось подключить Telegram. Проверьте токен и повторите попытку.',502);}
 }
 if(url.pathname!=='/telegram'||request.method!=='POST')return text('Not found',404);
 if(!safeEqual(request.headers.get('x-telegram-bot-api-secret-token'),await webhookSecret(env.BOT_TOKEN)))return text('Forbidden',403);
 if(Number(request.headers.get('content-length'))>262144)return text('Request too large',413);
 let update;try{update=await request.json();}catch{return text('Invalid update',400);}
 if(!update||typeof update!=='object'||Array.isArray(update))return text('Invalid update',400);
 const call=async(method,body)=>{
  try{return await api(env.BOT_TOKEN,method,body);}
  catch(error){error.method=method;throw error;}
 };
 const started=Date.now();
 try{
  await handleUpdateOnce(update,()=>handleUpdate(update,call,env.ZMRUSH_LANGUAGES));
  context?.waitUntil(syncCommands(call,env.ZMRUSH_LANGUAGES).catch(()=>{}));
  return text('ok');
 }catch(error){
  console.error({
   event:'telegram_update_failed',
   updateId:Number.isSafeInteger(update.update_id)?update.update_id:undefined,
   method:error.method,
   status:error.status,
   durationMs:Date.now()-started,
  });
  return text('Temporary Telegram error',502);
 }
}};
