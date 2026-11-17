// Seller-confirmed USD prices per month. CT is free.
// Models 1–121: ss.txt (2026-11-17); additions: $10, Jerry Small $100, Panther/Gangle Small $30.
const monthly = amount => Object.freeze({amount, currency: 'USD', period: 'month'});

export const modelPrices = Object.freeze({
  'gign': monthly(0), // 1. CT
  'dobby': monthly(30), // 2. Добби
  'p_14_kopishon': monthly(9), // 3. Джава · белый плащ
  'p_anb_pm_skin6': monthly(9), // 4. Парень в кепке
  'p_anubis': monthly(9), // 5. Анубис
  'p_arctic': monthly(9), // 6. Номер К
  'p_arctic1': monthly(9), // 7. Дэррил
  'p_barbara': monthly(12), // 8. Барбара
  'p_bombardier_batman': monthly(12), // 9. Бэтмен
  'p_chick': monthly(250), // 10. Крыса · Half-Life
  'p_clown': monthly(9), // 11. Пеннивайз
  'p_coko_female': monthly(9), // 12. Коко
  'p_combinepolice_v2': monthly(9), // 13. Метрокоп · Half-Life 2
  'p_cs_dream_id5_1': monthly(30), // 14. Банан
  'p_deadpool_malysh_blue': monthly(17), // 15. Дэдпул · синий малыш
  'p_death_blade': monthly(9), // 16. Дэт Блейд
  'p_donald': monthly(9), // 17. Дональд Дак
  'p_enot_blue': monthly(17), // 18. Енот · синий костюм
  'p_female': monthly(9), // 19. Хацунэ Мику
  'p_fg_premium_woman': monthly(9), // 20. Девушка-спецназовец
  'p_frank': monthly(9), // 21. Фрэнк · HD
  'p_gaara_suit_v2': monthly(9), // 22. Гаара · в костюме
  'p_gaarashippudden': monthly(9), // 23. Гаара · Шиппуден
  'p_gign2': monthly(9), // 24. Ичиго Куросаки
  'p_gign4': monthly(9), // 25. Гоуст · Modern Warfare 2
  'p_gojo': monthly(12), // 26. Сатору Годжо
  'p_goku': monthly(9), // 27. Гоку
  'p_gsg9': monthly(30), // 28. Том · Том и Джерри
  'p_guerilla': monthly(9), // 29. Даффи Дак
  'p_haru_female': monthly(9), // 30. Хару
  'p_hatake': monthly(9), // 31. Какаши
  'p_itachi': monthly(9), // 32. Итачи Учиха
  'p_itachi1': monthly(9), // 33. Итачи Учиха · другая версия
  'p_jack_sparrow': monthly(9), // 34. Джек Воробей
  'p_jbmmgirlnew_s': monthly(12), // 35. Девушка с кошачьими ушками
  'p_joker': monthly(9), // 36. Джокер
  'p_kakashi': monthly(9), // 37. Какаши Хатакэ
  'p_kaze': monthly(9), // 38. Кадзэ · CSO2
  'p_kirara': monthly(9), // 39. Кирара
  'p_kisame': monthly(9), // 40. Кисаме Хосигаки
  'p_kittyy': monthly(9), // 41. Китти
  'p_kizuna_cs': monthly(12), // 42. Кизуна
  'p_leet': monthly(12), // 43. Гоустфейс · Крик
  'p_leet1': monthly(9), // 44. 2B · NieR: Automata
  'p_leet2': monthly(9), // 45. Дэррил · Майами
  'p_madara': monthly(9), // 46. Мадара Учиха
  'p_makima': monthly(12), // 47. Макима
  'p_mcduck': monthly(9), // 48. Скрудж Макдак
  'p_mejiro_bright': monthly(17), // 49. Мэдзиро Брайт
  'p_mikenoble': monthly(9), // 50. Нобл · бронекостюм
  'p_minihalk': monthly(30), // 51. Халк · мини
  'p_model_ct': monthly(15), // 52. GIGN · рюкзак и кроссовки
  'p_model_t': monthly(15), // 53. Leet · рюкзак и кроссовки
  'p_model_30_te': monthly(15), // 54. Девушка в красном
  'p_moonman': monthly(9), // 55. Мунмен
  'p_naruto': monthly(9), // 56. Наруто Узумаки
  'p_obito_juubi': monthly(9), // 57. Обито · Джуби
  'p_ousii1': monthly(9), // 58. Йода
  'p_paimon': monthly(12), // 59. Паймон
  'p_pain': monthly(9), // 60. Пейн
  'p_pila': monthly(9), // 61. Билли · Пила
  'p_player_123': monthly(9), // 62. Чейнс · PAYDAY
  'p_purple_hy': monthly(9), // 63. Пурпурное сердце
  'p_rick': monthly(9), // 64. Рик Санчес
  'p_rime_female': monthly(9), // 65. Райм
  'p_rimurus': monthly(12), // 66. Римуру Темпест
  'p_roronoa_zoro': monthly(15), // 67. Ророноа Зоро
  'p_ruoyin': monthly(9), // 68. Хацунэ Мику · худи
  'p_sara14': monthly(9), // 69. Сара · костюм с цветами
  'p_sas': monthly(30), // 70. Троллфейс
  'p_sas1': monthly(12), // 71. Девушка в голубом платье
  'p_sas3': monthly(9), // 72. Сенатор Армстронг
  'p_sasuke': monthly(9), // 73. Саске Учиха
  'p_silent_darryl': monthly(9), // 74. Дэррил · Тихий
  'p_simen_arcticct3': monthly(15), // 75. SAS · чёрная форма
  'p_simen_arctict3': monthly(15), // 76. T · чёрная форма
  'p_simen_checkins': monthly(12), // 77. Арона
  'p_skirk': monthly(9), // 78. Скирк
  'p_speedball': monthly(9), // 79. Спидбол
  'p_spongebob': monthly(12), // 80. Губка Боб
  'p_terror': monthly(15), // 81. Рафталия
  'p_terror1': monthly(9), // 82. Розовая пантера
  'p_tg_cutes': monthly(9), // 83. Ванилла
  'p_tg_dittzy': monthly(9), // 84. Маршмелло
  'p_tg_sara': monthly(9), // 85. Городская разведчица · аниме
  'p_tiger_ct': monthly(9), // 86. Тигр · воин
  'p_uk_djinni': monthly(9), // 87. Джинн
  'p_uk_shrek': monthly(12), // 88. Шрек
  'p_urban': monthly(9), // 89. Шериф Вуди
  'p_urban1': monthly(9), // 90. Багз Банни
  'p_urban3': monthly(9), // 91. Слэш
  'p_urban5': monthly(9), // 92. Агент Фрэнк
  'p_vector': monthly(9), // 93. Вектор
  'p_venti': monthly(9), // 94. Венти
  'p_vip': monthly(9), // 95. Агент Смит
  'p_vip_d3e77d67': monthly(9), // 96. Супер Соник
  'p_vip1': monthly(12), // 97. Персонаж Minecraft
  'p_vip_lb1': monthly(9), // 98. Кибербоец
  'p_waluigi': monthly(9), // 99. Валуиджи
  'p_werewolf': monthly(9), // 100. Оборотень
  'p_wolfie_angel': monthly(9), // 101. Волк-ангел
  'p_x': monthly(9), // 102. Боец XAAX
  'p_xiannv': monthly(9), // 103. Котори Ицука
  'p_yanfei': monthly(9), // 104. Янь Фэй
  'p_yoimiya': monthly(9), // 105. Ёимия
  'p_zara': monthly(9), // 106. Зара
  'p_ze_summowner': monthly(15), // 107. Бендер
  'p_zhongli': monthly(9), // 108. Чжун Ли
  'p_chaos': monthly(9), // 109. Хаос
  'p_espio': monthly(9), // 110. Эспио
  'p_knucles': monthly(9), // 111. Наклз
  'p_mephiles_shadow_form': monthly(9), // 112. Мефилес · форма Шэдоу
  'p_mephiles': monthly(9), // 113. Мефилес
  'p_shadow': monthly(9), // 114. Шэдоу
  'p_silver': monthly(9), // 115. Сильвер
  'p_sonic': monthly(9), // 116. Соник
  'p_super_shadow': monthly(9), // 117. Супер Шэдоу
  'p_small_shadow': monthly(9), // 118. Шэдоу · маленький
  'p_small_silver': monthly(30), // 119. Сильвер · маленький
  'p_small_sonic': monthly(30), // 120. Соник · маленький
  'p_itsuki': monthly(9), // 121. Ицуки
  'p2_5pb': monthly(10), // 122. 5pb.
  'p2_ace': monthly(10), // 123. Портгас Д. Эйс
  'p2_admincs2': monthly(10), // 124. Гоку · Ультраинстинкт
  'p2_agentp': monthly(10), // 125. Агент Пи
  'p2_amongus': monthly(10), // 126. Among Us
  'p2_anmalpc2': monthly(10), // 127. Anmalpc2
  'p2_artclown': monthly(10), // 128. Клоун Арт
  'p2_asamitaka': monthly(10), // 129. Аса Митака
  'p2_billykid': monthly(10), // 130. Билли Кид
  'p2_chickens_kf': monthly(10), // 131. Чикенатор · Killing Floor
  'p2_cisrm': monthly(10), // 132. Cisrm
  'p2_deku': monthly(10), // 133. Deku
  'p2_denji': monthly(10), // 134. Дэндзи
  'p2_doom': monthly(10), // 135. Доктор Дум
  'p2_drsimi': monthly(10), // 136. Доктор Сими
  'p2_fluorite': monthly(10), // 137. Флюорит
  'p2_fnaf': monthly(10), // 138. Фредди Фазбер
  'p2_fox': monthly(10), // 139. Фокс Макклауд
  'p2_fubuki': monthly(10), // 140. Фубуки
  'p2_fuji': monthly(10), // 141. Фудзи Кисэки
  'p2_fukua': monthly(10), // 142. Фукуа
  'p2_hxh01': monthly(10), // 143. Киллуа · светлая футболка
  'p2_jerry_small': monthly(100), // 144. Джерри · маленький
  'p2_jessie': monthly(10), // 145. Джесси
  'p2_jjk1': monthly(10), // 146. Юдзи Итадори
  'p2_joker': monthly(10), // 147. Джокер · цилиндр
  'p2_jokerp5': monthly(10), // 148. Джокер · Persona 5
  'p2_joniscarlet': monthly(10), // 149. Джони Скарлет
  'p2_kasaneteto': monthly(10), // 150. Касане Тето
  'p2_killua': monthly(10), // 151. Киллуа · синяя футболка
  'p2_luffyg5': monthly(10), // 152. Луффи · Гир 5
  'p2_luffy_v2': monthly(10), // 153. Монки Д. Луффи
  'p2_marihuanin': monthly(10), // 154. Марихуанин
  'p2_martymcfly': monthly(10), // 155. Марти Макфлай
  'p2_mrfoster': monthly(10), // 156. Мистер Фостер
  'p2_panther_small': monthly(30), // 157. Розовая пантера · маленькая
  'p2_peakscout': monthly(10), // 158. Peak Scout
  'p2_protogen_b3': monthly(10), // 159. Протоген
  'p2_reinhard': monthly(10), // 160. Райнхард
  'p2_ronaldmc_v2': monthly(10), // 161. Рональд Макдональд
  'p2_sassault': monthly(10), // 162. Штурмовик
  'p2_scorpion': monthly(10), // 163. Скорпион
  'p2_skelep': monthly(10), // 164. Скелет-боксёр
  'p2_slayer01': monthly(10), // 165. Нэдзуко Камадо
  'p2_slayer02': monthly(10), // 166. Тандзиро Камадо
  'p2_small_gangle': monthly(30), // 167. Гэнгл · маленький
  'p2_spawn': monthly(10), // 168. Спаун
  'p2_squigly': monthly(10), // 169. Сквигли
  'p2_subaru': monthly(10), // 170. Субару Нацуки
  'p2_superbuu': monthly(10), // 171. Супер Буу
  'p2_tetobbrain': monthly(10), // 172. Касане Тето · Birdbrain
  'p2_thanos': monthly(10), // 173. Танос
  'p2_tlizard': monthly(10), // 174. Том · ящерица
  'p2_umas1_v3': monthly(10), // 175. Голд Шип
});
