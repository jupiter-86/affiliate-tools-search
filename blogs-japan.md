# Тревел-блоги с аффилиатными инструментами — 🇯🇵 Япония

> Это **японский** срез исследования (по аналогии с `examples/blogs-taiwan.md`).
> Сбор сделан скиллом `tp-affiliate-tools-research` через `scan-tools.js` (реальный
> Chromium, locale `ja-JP`), с автодискавери до 5 страниц на блог (главная + статьи/гайды),
> медленным скроллом и **element-level скриншотами самих инструментов**. Сырые данные
> детекции — `japan-manifest.json`; визуальный отчёт — `japan-blogs.html` (≈7.8 МБ,
> 446 скриншотов инструментов + JS-интеграции). Проверено: 2026-06-18.

## Итог по охвату
- Проверено блогов: **20**. С аффилиатными инструментами: **16** (+ 1 маргинальный).
  Без инструментов на просмотренных страницах: **3** (см. секцию ниже).
- Валидных скриншотов инструментов: **446**.
- Чаще всего встречались: **инлайн-ссылки на OTA** (link), **CTA-кнопки** («View prices»,
  «Check rates and availability»), **инлайн-карточки отелей/активностей** (card),
  **виджеты Stay22** (iframe-карты/блоки сравнения цен), баннеры.

> **Главное отличие от тайваньского среза и от «локального азиатского» блога.**
> Японский сегмент почти целиком — это **западные англоязычные блоги о Японии для
> иностранцев**, а не японоязычные блоги. Отсюда другой стек монетизации:
> - **Доминирует Stay22** (`stay22.com`, виджеты/карты `lma`/`gm`) — агрегатор-метапоиск,
>   который white-label'ит Booking/Agoda/Hotels.com в единую карточку «View prices».
>   Засветился на 11 из 20 блогов как JS-интеграция и как самый частый «OTA» в ссылках.
> - **Активности** — связка **GetYourGuide + Viator + Klook** (Klook здесь не как
>   на Тайване — он один из трёх, а не главный).
> - **Жильё** — **Booking.com** напрямую, **Hostelworld** у бэкпекерских блогов,
>   Agoda эпизодически.
> - **Travelpayouts** (как JS-интеграция/смартлинк) виден на 4 блогах
>   (Two Wandering Soles, The Broke Backpacker, What's Up Courtney, Will Fly for Food).
> - **Японские внутренние OTA (Jalan, Rakuten Travel, Ikyu) почти НЕ используются** —
>   единичный Rakuten на Japan Cheapo. Это ключевой контраст с тем, как монетизировался
>   бы японоязычный блог для местных.
>
> Язык инструментов — английский (locale ja-JP, но контент EN). Цены часто в ¥ + конвертация
> в USD/GBP/EUR под западную аудиторию.

> ⚠️ **Про точность скриншотов.** Кинды `widget`/`card`/`cta` — надёжные true-positive
> (проверено глазами: карточки Stay22 с «CHECK RATES AND AVAILABILITY», карточки Klook
> «Universal Studios Japan Tickets», блоки сравнения отелей). В киндах `coupon` и части
> `banner`/`link` встречаются ложные срабатывания (навигационное меню с пунктом «Travel
> Coupons», обрезанные фото-врезки). Цифры ниже — «сигнал детекции», финальную картинку
> по каждому инструменту смотри в `japan-blogs.html`.

---

## The Invisible Tourist — https://www.theinvisibletourist.com/
- Проверённая страница: /2-weeks-in-japan-itinerary-first-time/
- Тип сайта: тревел-блог (рекомендации) — автор ездит в Японию по нескольку раз в год, маршруты/гайды.
- Инструменты (текстом): инлайн-ссылки на OTA в тексте статьи (Klook, Trip.com, Viator),
  CTA «check availability and book here», аффилиатные текст-блоки с инлайн-ссылками (Klook/Trip.com).
- Сигналы: 29 инструментов — link:24, block:3, cta:2.
- К каким OTA ведёт: **Klook (15), Trip.com (13), Viator (1)**.
- JS-интеграции: —
- Отличия от US-аналогов: упор на **Trip.com + Klook** (азиатский активити-стек) вместо Viator/Booking — ближе к азиатской модели, чем у остальных в выборке.

## Travel with a Pen — https://travelwithapen.com/
- Проверённая страница: /2-week-japan-itinerary-first-time-visitors/
- Тип сайта: тревел-блог (маршруты/гайды по Японии и Азии).
- Инструменты (текстом): инлайн-ссылки на OTA, CTA-кнопки, аффилиат-блоки; **виджеты Stay22** (карта/блок отелей).
- Сигналы: 37 — link:30, block:4, cta:3.
- К каким OTA ведёт: **Stay22 (10), Klook (3), GetYourGuide (2)**.
- JS-интеграции: **Stay22** (скрипт + inline + widget).
- Отличия от US-аналогов: классический «западный» стек со Stay22 как агрегатором отелей.

## The Navigatio — https://thenavigatio.com/
- Проверённая страница: /japan-itinerary-two-weeks/
- Тип сайта: тревел-блог (детальные 2-недельные маршруты).
- Инструменты (текстом): **виджеты Stay22 (iframe)** — карточки отелей Park Hotel Tokyo / Hotel
  Sunroute Asakusa / Grand Hyatt с кнопкой «View prices →» (подтверждено скриншотом); много CTA;
  инлайн-ссылки; баннеры; блок «Travel Coupons».
- Сигналы: 50 — link:20, cta:15, coupon:5, block:5, widget:3, banner:2.
- К каким OTA ведёт: **Stay22 (24), Klook (3)** + GetYourGuide (интеграция).
- JS-интеграции: **Stay22, GetYourGuide**.
- Отличия от US-аналогов: самый «виджетный» блог выборки — Stay22-карточки прямо в тексте маршрута. (Часть «coupon»-сигналов = пункт навигационного меню, не инструмент.)

## A Wandering Turtle — https://awanderingturtle.com/
- Проверённая страница: /2-week-japan-itinerary-tokyo-kyoto-osaka/
- Тип сайта: тревел-блог (маршруты Tokyo/Kyoto/Osaka).
- Инструменты (текстом): инлайн-ссылки на OTA, аффилиат-блоки.
- Сигналы: 11 — link:7, block:4.
- К каким OTA ведёт: **Klook (3), GetYourGuide (1)**.
- JS-интеграции: —

## A Brummie Home and Abroad — https://abrummiehomeandabroad.com/
- Проверённая страница: /9-day-japanese-golden-route-itinerary/ (плюс /osaka-48-hours/)
- Тип сайта: тревел-блог (маршруты по «золотому треугольнику» Японии).
- Инструменты (текстом): **инлайн-карточка Klook** («…secured digital tickets via Klook, ¥2,000»
  — подтверждено скриншотом), инлайн-ссылки, аффилиат-блок; виджеты Stay22.
- Сигналы: 6 — link:4, card:1, block:1.
- К каким OTA ведёт: **Stay22 (5), Klook (1)**.
- JS-интеграции: **Stay22, GetYourGuide**.

## She Needs Less — https://www.sheneedsless.com/
- Проверённая страница: /japan-travel-guide/
- Тип сайта: тревел-блог (гайды/маршруты, slow travel).
- Инструменты (текстом): инлайн-ссылки на OTA (в т.ч. инлайн-рекомендации рёканов через Stay22),
  аффилиат-блоки, **карточки** и **виджет** Stay22, ссылки GetYourGuide/Viator.
- Сигналы: 34 — link:22, block:9, card:2, widget:1.
- К каким OTA ведёт: **Stay22 (22), GetYourGuide (6), Viator (5)**.
- JS-интеграции: **Stay22, GetYourGuide**.

## Adventures with Pinny — https://adventureswithpinny.com/
- Проверённая страница: /blog/one-week-in-japan-itinerary
- Тип сайта: тревел-блог (недельные маршруты).
- Инструменты (текстом): инлайн-ссылки (в т.ч. Tripadvisor), аффилиат-блоки.
- Сигналы: 6 — link:4, block:2.
- К каким OTA ведёт: **Tripadvisor (1)** + прочие инлайн-ссылки.
- JS-интеграции: —
- Примечание: слабее остальных по плотности инструментов.

## The Keenan-Blogger — https://www.thekeenanblogger.com/
- Проверённая страница: японский 9-дневный маршрут Tokyo/Kyoto (Squarespace-блог).
- Тип сайта: тревел-блог (премиум-маршруты, отели, рестораны).
- Инструменты (текстом): инлайн-ссылки на OTA, аффилиат-блоки.
- Сигналы: 13 — link:8, block:5.
- К каким OTA ведёт: **Hotels.com (6), Klook (2), Booking (2), GetYourGuide (2), Tripadvisor (1)**.
- JS-интеграции: —
- Отличия: редкий в выборке упор на **Hotels.com** (а не Stay22/Booking).

## Two Wandering Soles — https://www.twowanderingsoles.com/
- Проверённая страница: /blog/one-wild-week-itinerary-japan, /blog/15-must-do-things-in-japan
- Тип сайта: крупный тревел-блог (маршруты, бюджет, упаковочные листы).
- Инструменты (текстом): **баннеры**, много **CTA-кнопок** на Booking/Trip.com, инлайн-ссылки, аффилиат-блоки.
- Сигналы: 35 — link:14, cta:12, block:5, banner:4.
- К каким OTA ведёт: **Booking (12), Trip.com (4), Stay22 (1)**.
- JS-интеграции: **Travelpayouts, Stay22**.
- Отличия: один из блогов с **Travelpayouts**-интеграцией; ставка на Booking напрямую.

## Japan Cheapo — https://japancheapo.com/
- Проверённые страницы: /locations/kyoto/, /itineraries/ и др. (контентная сеть Cheapo).
- Тип сайта: крупный travel-портал/блог о Японии (бюджетные гайды).
- Инструменты (текстом): богатые **инлайн-карточки** Stay22 (отель RIHGA Royal Osaka ¥14,500
  «CHECK RATES AND AVAILABILITY» — подтверждено) и Klook («Universal Studios Japan Tickets» —
  подтверждено), **баннеры** Viator/Klook, блоки, ссылки.
- Сигналы: 35 — card:15, banner:8, block:6, link:5, cta:1.
- К каким OTA ведёт: **Stay22 (13), Viator (11), Klook (2), Rakuten (2), Skyscanner (2), Agoda (2), KKday (1), Booking (1)**.
- JS-интеграции: **Stay22**.
- Отличия: самый диверсифицированный OTA-микс выборки + **единственный с Rakuten (японский внутренний OTA)**.

## The Broke Backpacker — https://www.thebrokebackpacker.com/
- Проверённые страницы: /backpacking-in-japan/, /hakone-itinerary/, /hostel-life-guide-101/
- Тип сайта: бэкпекерский тревел-блог (бюджетные гайды).
- Инструменты (текстом): **баннеры**, **CTA**, **карточки** хостелов/жилья, инлайн-ссылки.
- Сигналы: 22 — link:6, banner:5, cta:5, block:4, card:2.
- К каким OTA ведёт: **Hostelworld (8), Stay22 (6), Airbnb (2), Agoda (1)**.
- JS-интеграции: **Stay22, Travelpayouts**.
- Отличия: бэкпекерский профиль → **Hostelworld** как основной партнёр (нетипично для остальных).

## Nomadic Matt — https://www.nomadicmatt.com/
- Проверённая страница: /travel-guides/japan-travel-tips/
- Тип сайта: один из крупнейших англоязычных тревел-блогов (гайды по странам).
- Инструменты (текстом): инлайн-ссылки на OTA, аффилиат-блоки.
- Сигналы: 26 — link:20, block:6.
- К каким OTA ведёт: **GetYourGuide (8), Booking (4), Skyscanner (3), Hostelworld (3), Stay22 (1)**.
- JS-интеграции: **Stay22, GetYourGuide**.
- Отличия: «учебниковый» западный стек (GYG + Booking + Skyscanner + Hostelworld).

## NOMADasaurus — https://www.nomadasaurus.com/
- Проверённая страница: /budget-travel-in-japan/
- Тип сайта: тревел-блог (приключенческий/бюджетный).
- Инструменты (текстом): **виджеты** Stay22, инлайн-ссылки, блоки.
- Сигналы: 12 — link:8, widget:2, block:2.
- К каким OTA ведёт: **Stay22 (4), Agoda (1)**.
- JS-интеграции: **Stay22**.

## What's Up Courtney — https://whatsupcourtney.com/
- Проверённая страница: /first-time-japan-travel-guide/
- Тип сайта: тревел/лайфстайл-блог (гайды для первой поездки).
- Инструменты (текстом): много инлайн-ссылок, **виджеты** Stay22, **баннеры**, **карточки**, CTA.
- Сигналы: 39 — link:25, widget:4, banner:3, card:3, cta:3, block:1.
- К каким OTA ведёт: **Stay22 (16), Viator (6), GetYourGuide (2), Hostelworld (1)**.
- JS-интеграции: **Stay22, GetYourGuide, Travelpayouts**.
- Отличия: одна из трёх с Travelpayouts; широкий микс инструментов.

## Inside Kyoto — https://www.insidekyoto.com/
- Проверённые страницы: /kyoto-itineraries, /kyoto-ryokan
- Тип сайта: нишевый блог-гайд по Киото (резидент-эксперт Chris Rowthorn).
- Инструменты (текстом): **виджеты** (5) и **карточки** (8) отелей, аффилиат-блоки (12), инлайн-ссылки.
- Сигналы: 34 — block:12, link:9, card:8, widget:5.
- К каким OTA ведёт: **Booking.com (19)** — моно-партнёр.
- JS-интеграции: —
- Отличия: чистая **Booking-only** монетизация через инлайн-карточки/виджеты отелей — нетипично узко.

## Will Fly for Food — https://www.willflyforfood.net/
- Проверённая страница: /the-ultimate-japanese-food-guide… (и фуд-гайды по городам)
- Тип сайта: фуд-тревел-блог (что и где есть + где остановиться).
- Инструменты (текстом): очень много инлайн-ссылок на отели (Booking), **виджеты**, баннеры, блоки.
- Сигналы: 56 (максимум выборки) — link:49, widget:3, banner:2, block:2.
- К каким OTA ведёт: **Booking (40), Klook (4), GetYourGuide (4), Rentalcars (1)**.
- JS-интеграции: **Stay22, GetYourGuide, Travelpayouts**.
- Отличия: фуд-контент монетизируется через **массовые инлайн-ссылки Booking** (отель к каждому городу) + активности.

---

## Проверено, инструментов на просмотренных страницах нет (честный учёт)
- **Boutique Japan — https://boutiquejapan.com/** — 0. Это **бутиковое тур-агентство**: продаёт
  собственные индивидуальные туры по Японии, OTA-аффилиатных инструментов нет by design.
  (5 страниц, включая 2 маршрута — чисто.)
- **The Real Japan — https://www.therealjapan.com/** — 0 на просмотренных страницах
  (home, destinations, experiences, guides, things-to-do). В сыром HTML внешних OTA-ссылок не нашли;
  у блога есть отдельные аффилиат-обзоры («Is Klook/GetYourGuide legit?»), но они не попали в выборку
  страниц — **не верифицировано как «нет инструментов вообще»**, только на этих 5 страницах.
- **Go Backpacking — https://gobackpacking.com/** — 0. Проверено: совпадения «aff» в HTML —
  это CSS-цвета (`#0a7aff`) и слово «affordable», не ссылки. Японский гайд инлайн-OTA-виджетов
  не содержит (US-центричный блог; дискавери ушёл на страницы Seattle/South Padre).
- **Super Cheap Japan — https://supercheapjapan.com/** — маргинально (1 «coupon»-сигнал).
  Монетизируется в основном через **собственные книги** (магазин `matthewbaxter.jp`), а не OTA-аффилиат.

---

### Технические заметки
- Локаль браузера `ja-JP`, но контент блогов английский — японский сегмент адресован иностранцам.
- Дискавери иногда выбирал не японскую, а самую «инструменто-богатую» страницу блога
  (San Miguel de Allende у Keenan, hostel-guide у Broke Backpacker) — инструменты те же по типу,
  но для строго-японского среза смотри страницы с японскими URL в `japan-manifest.json`.
- Полный визуальный отчёт со встроенными скриншотами: `japan-blogs.html`.
