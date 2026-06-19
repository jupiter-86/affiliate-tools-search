# tp-affiliate-tools-research — affiliate tools on travel blogs (any country)

> English copy of `SKILL.md` (the loadable skill is the Russian `SKILL.md`; this file is documentation).

You are given a **country** (e.g. "for Japan", "Korea", "Thailand"). You:
1. find that country's travel blogs (sources — yourself, via `WebSearch`);
2. load them through **Playwright** and screenshot the **actual tool elements**;
3. validate (non-empty, real tools, not junk);
4. **step-by-step** append the result to the **HTML report** `<country>-blogs.html`.

**Output is ALWAYS HTML.** No "final .md as the main deliverable" — the primary artifact is the HTML,
and it must **grow as the analysis proceeds** (analyze one blog → append → next → append).

Everything needed sits next to this file: `scan-tools.js`, `gen-html.js`, the hook
`.claude/hooks/validate-html-page.js`.

---

## 0. Environment setup (once)
- Needs **Playwright**. If missing: `npm run setup` (or `npm install && npx playwright install chromium`).
- Browser: **default HEADLESS on bundled Chromium** (no window pops up; stable on macOS; important when
  several scans run in parallel). System Chrome (headed) only via `HEADED=1`.
- (Optional) **Playwright MCP** for interactive browser driving:
  `claude mcp add playwright npx '@playwright/mcp@latest'` (or the bundled `.mcp.json` auto-offers it).
  But the main path is `scan-tools.js` (custom logic: element-level screenshots, Shadow DOM,
  validation — not available from the MCP out of the box).

## 1. WHAT we look for — affiliate tools
Any element that drives the reader toward booking/buying a travel service (often via an OTA affiliate
link/widget: Booking, Agoda, Klook, KKday, Trip.com, Expedia, GetYourGuide, Viator, Kayak, Rentalcars,
Stay22, Hostelworld, and regional ones — ezTravel, LionTravel, Jalan, Rakuten, etc.).

Types (NOT exhaustive — don't dismiss the unfamiliar if it leads to booking):
- **OTA hyperlinks** (text/buttons), **widgets** (iframe AND non-iframe: inline `<script>`, class markers),
- **popups / popunders / tabunders / interstitials**, **sticky buttons/sliders**,
- **inline cards** for hotels/tours (photo+price+rating), **affiliate blocks** (multi-OTA + prices),
- **coupon/promo pages** (折扣碼/優惠碼/coupon/promo), **banners**,
- **invisible JS integrations** (loaded by a script, rendered into Shadow DOM): Stay22 `lma`/`letmeallez`,
  **Travelpayouts Emerald** (`emrld.cc`, `<emerald-block>`), Klook/GYG widget JS.

❌ **NOT tools** (the scanner already filters these; if one slips through, drop it in validation):
video/social embeds (**YouTube/Vimeo/Instagram/Facebook/TikTok**), ad slots (AdSense), social follow buttons,
navigation/menus, related-posts. None of these lead to booking a travel service.

## 2. WHAT counts as a "blog OF country X" (KEY definition)
"A travel blog of Japan / Korea / Thailand…" = a **local blog**: the author is **from that country and
lives there**, writes **in the country's language** (ja/ko/th/zh-TW…) **for the local audience**
(fellow locals planning trips). NOT an "English-language guide about the country for Western tourists".

- ✅ Count: local author, local language, content for the country's residents (where to go, where to stay,
  what to try) — guides, itineraries, hotel/activity reviews, with monetization.
- ⚠️ **English-language expat / digital-nomad / "travel guide for foreigners" blogs are NOT a "blog of the
  country"** — they're blogs *about* the country for visitors. Include them only as a **minority** (see the
  ratio in Step 3), and only if the author is genuinely local / lives there. Don't make the whole report out
  of them — that's unrepresentative.
- ❌ Not of interest: purely informational sites without recommendations/monetization, OTAs/aggregators, news.
- ❌ **NO coupon sites / deal aggregators / "offer-roundup" sites (hard gate).** These are sites whose CORE
  is a feed of promo codes / coupons / "deals" across many brands (often not even travel), not original
  travel content. Symptoms: homepage = a catalog of store coupons/discounts; no personal author/itineraries/
  place reviews; "travel" is just one category next to electronics/clothing; domain/name built around
  *coupon / promo / deals / discount / savings / benefits / zone*. Caught offenders: **WannaZone, benefitshub**
  — they carry travel coupons, but they're discount aggregators, not blogs; including them **skews the
  results** (coupons there aren't a blogger's tool, they're the site's whole product).
  - 🔑 **Positive blog criterion:** the site has its **own travel content** (guides, itineraries, place/
    hotel/activity reviews, personal "where to go / where to stay" recommendations). A blog may have
    coupons/promos — but as **ONE monetization tool on top of content**, not as the site's substance. No
    editorial travel content beyond coupon/offer feeds → it's an aggregator, **exclude it**.
- ❌ **NO non-travel sites: content farms / MFA ("made for affiliate") / off-topic or repurposed-domain sites
  (hard gate).** The site must be **about travel** (travel is its main subject), not a "general blog about
  everything" where a travel post happens to land. Symptoms: mixed unrelated topics (smartphones/finance/
  insurance/loans next to travel); domain **unrelated to travel** (a random acronym+year, a conference name,
  an expired/repurposed domain); thin keyword-targeted SEO posts (often freshly mass-published) existing only
  to host affiliate links/promo codes. Caught offender: **`icems2021.com`** (posed as a Korean travel blog
  "지식채널", actually a content farm on the ICEMS-2021 conference domain: Galaxy S23 posts + Trip.com/Klook
  promo codes). Simple test: **open the homepage / a few posts — is this an author writing about travel, or an
  SEO-page generator on random topics?** The latter → **exclude it**.
- Borderline — flag it (language, who the author is, who it targets), don't silently drop it.

🔑 **SELF-HOSTED blogs ONLY (hard scope).** We care about the **author's own site with a CMS**, where they
**control the code** and can freely embed widgets/scripts/popups/iframes (WordPress, Ghost, own markup, and
platforms that allow custom HTML/JS). That's where the tools we study live.
- ❌ **Walled-garden platforms where you cannot inject third-party code are NOT of interest — skip them:**
  Naver Blog (네이버 블로그), Brunch/Kakao (strips/nofollows external links), and any similar builder where the
  author doesn't control the HTML/scripts. Real tools can't exist there — skip those domains.
- Simple test: "can the author put a third-party `<script>`/widget on the page?" No → skip.
  Unsure (Tistory, Ameba, note, blogspot, livedoor) — include only if you actually see embedded
  widgets/scripts; otherwise prefer own domains.

For each blog, record the **language** and the type (local / English-for-foreigners) — it goes into the report.
**Classify by the DOMINANT language of the page's actual content**, not by domain/expectation. Some blogs are
**multilingual / pan-regional** (one site serves zh/th/en) — don't force them into one country; tag them
"multilingual" and account for it in conclusions (else you count a foreign blog as local — as happened with itravelblog).

## 3. SOURCES — how to find a country's blogs (Step 1)

🛑 **STOP-GATE (follow literally — this skew has recurred three times):**
- **Do NOT run any English `WebSearch` and do NOT build the `targets` file until you've run ≥4 queries in the
  LOCAL language and gathered the MAJORITY of candidates from them.** WebSearch is US/English-biased — going
  English-first guarantees expat / "guide for foreigners" results.
- **Do NOT copy `targets-<other_country>.json` as a template.** Prior files may be skewed (e.g. Korea came out
  all-English — that's a bug, not a model). The reference is the Taiwan slice in `examples/` (a healthy local
  mix). Every country starts from scratch with local-language search.
- **Self-check BEFORE scanning:** count local vs English in your shortlist. For big local-language markets,
  local should be **≥60–70%**. If lower — you skewed: go back to local queries and top up before running.
- Reasons you usually drift to English (remember and resist): a precedent file in the repo; US-centric
  WebSearch; the English affiliate stack is easier to detect. None justify an unrepresentative report.

Procedure:
0. **Figure out the country's language(s) yourself** (you know them): Japan→ja, Korea→ko, Thailand→th,
   Taiwan→zh-TW, Iceland→is, Netherlands→nl, etc. In small/touristy countries some locals also write in
   English — that's fine, see step 3.
1. **First, 4–6 queries in the local language** — build the bulk from these.
2. Only then 1–2 English queries — top up a little.
3. **Goal = a representative mix that fits the country's reality, not a fixed number.** For big
   local-language markets (Japan/Korea/Taiwan/Thailand) that's ~70–80% local. For small / "English-heavy"
   countries (Iceland, Netherlands…) the English share is naturally higher — but still hunt for **genuinely
   local authors** (live there, write for locals), not international/expat travel sites. Failure = a shortlist
   made entirely of big English "guide for tourists" sites.
4. **Take SELF-HOSTED only (own domain/CMS, author controls the code)** — see the hard scope in Step 2.
   Walled gardens (Naver Blog, Brunch/Kakao, and similar where you can't inject a third-party `<script>`/
   widget) **skip** — the tools we study can't exist there. Discover the platform on the fly (universality —
   Iceland or any country): search in the local language; see which **domains recur**; keep the ones where the
   author can actually embed code (own domains, WordPress/Ghost; Tistory/blogspot/pixnet — if you see embedded
   widgets). A personal domain on WordPress/CMS is priority #1.

🎯 **SEARCH FOR TRAVEL CONTENT, NOT MONETIZATION (the Korea lesson — don't repeat it).** Queries built on
monetization keywords (`제휴`/`쿠폰`/`할인코드`/`优惠`/`coupon`/`promo code`/`affiliate`) **systematically push
the sample into coupon sites and discount aggregators** — those words are in every one of their headlines, so
they rank first. Search by **content**: itineraries, hotel reviews, travel diaries of real people, "what to
see / where to stay". You'll find the monetization tools LATER, on the blogs themselves (Step 4) — not by
searching the word "coupon". Monetization keywords belong **only** in partner recon (Step 3a), NOT as a way to
find blogs.

Gather ~12–20 candidates; for each — a **home URL** and (ideally) one **tool-rich seed article** (hotel
roundup / itinerary). **Local-language** query templates (substitute the country):
- Japan: "日本 旅行 ブログ ホテル 予約", "<city> 観光 ブログ おすすめ", "日本人 旅行ブロガー 人気".
- Korea: "국내여행 블로그 추천 호텔 예약", "<city> 여행 블로그 후기", "여행 블로거 추천".
- Thailand: "รีวิว ที่พัก บล็อก เที่ยว <province>", "บล็อกเกอร์ ท่องเที่ยว ไทย".
- Taiwan (the reference): "台灣 旅遊 部落格 推薦", "<city> 自由行 部落客", "飯店 訂房 部落格".
- English (top-up, minority): "best local <country> travel bloggers", "<country> travel blog (in <language>)".
- hooks (content, not monetization): hotel reviews, itineraries (行程/일정/itinerary), "things to do",
  roundups, travel diaries/후기. Platforms above. ⚠️ Do **not** add coupon keywords (折扣碼/쿠폰/优惠/coupon)
  to blog-finding queries — they surface coupon sites; record coupons later, on the travel blogs you find.
Don't invent domains — verify they open. For each candidate record its language and local/foreign type.

🚦 **Before adding a candidate to `targets-<country>.json` — open its homepage and confirm it's actually a
TRAVEL blog** (travel is the main subject, with authored content: guides/itineraries/reviews), and **not**:
a coupon site / discount aggregator, a mixed-topic content farm/MFA, or a repurposed/expired domain with
keyword-targeted SEO posts (see the hard gates in Step 2). WebSearch happily surfaces such sites because they
carry a travel post with a promo code (that's how `icems2021.com` — a content farm on a conference domain —
got into the Korea slice). Don't trust "it turned up for a travel query" — **verify the site's topic by eye
before scanning.**

**The local monetization stack ≠ the Western one (Booking/Stay22/Klook).** Local blogs monetize via THEIR
networks/OTAs — find and detect those (extend `OTA_MAP`/`SHORT`, Step 3a). Cheat-sheet (NOT exhaustive):
- 🇯🇵 **Japan**: networks A8.net, ValueCommerce (バリューコマース), moshimo (もしも), Rakuten Affiliate,
  AccessTrade; OTAs Rakuten Travel (楽天トラベル), Jalan (じゃらん), Ikyu (一休), JTB, Rurubu; formats — A8
  text/banner links, Rakuten product widgets. (some already in `OTA_MAP`/`SHORT`.)
- 🇰🇷 **Korea**: networks Coupang Partners (쿠팡파트너스, `link.coupang.com`+`lptag`), LinkPrice (링크프라이스),
  tenping/adpick; OTAs Yanolja (야놀자), GoodChoice (여기어때), MyRealTrip, Interpark, Hana Tour, Agoda via the
  `app.ac` deeplink. ⚠️ self-hosted: take **own domains**; skip Naver Blog/Brunch.
- 🇹🇭 **Thailand**: networks Involve Asia, AccessTrade TH; OTAs Agoda/Traveloka; platform Blockdit.
- 🇹🇼 **Taiwan** (reference): Klook/KKday/Agoda, Travelpayouts shortlinks, iChannels 通路王, pse.is/reurl.cc.
- **Any other country** (Iceland, etc.): the local networks/OTAs are their own — discover them via recon
  (Step 3a) and search the local blogosphere for THOSE, not Booking/Stay22.

Build `targets-<country>.json`. **Put the language/type in `name`** (`ja, local` / `EN, for foreigners`) —
it shows in the report and makes the sample balance obvious at a glance:
```json
[ { "slug": "mimmin", "name": "ミンミンの旅行記 (ja, local)",
    "home": "https://example.jp/", "seed": "https://example.jp/tokyo-hotels/" },
  { "slug": "nickkembel", "name": "Nick Kembel Travels (EN, for foreigners)",
    "home": "https://www.nickkembel.com/", "seed": "https://www.nickkembel.com/taiwan-itinerary-1-2-3-weeks/" } ]
```

### 3a. 🚦 MANDATORY partner recon for the country (do NOT skip — especially with no examples for the country)
`OTA_MAP`/`SHORT` in `scan-tools.js` are a **SEED for Taiwan/West/Japan, not a full registry**. The scanner
physically can't see an affiliate that isn't there — and every country has its own redirectors/networks/OTAs
(Korea: `app.ac` (Agoda deeplink), `link.coupang.com`+`lptag` (Coupang Partners), `linkprice`, tenping/adpick,
Yanolja/GoodChoice/MyRealTrip/HanaTour; Iceland: Guide to Iceland, etc.). **Without this step, new countries
are SYSTEMATICALLY undercounted** (exactly what happened with Korea). So BEFORE scanning, ALWAYS:
1. `WebSearch` (local + en): "<country> travel affiliate programs / networks", "<country> 제휴마케팅 /
   アフィリエイト / 聯盟行銷", "how do <country> travel blogs monetize" — list the local **networks** and **OTAs**.
2. Open 2–3 candidate articles (via WebFetch/Playwright) and inspect **outbound external domains** and
   **redirect shortlinks** (recurring commerce hosts, links with tracking params = affiliate).
3. **Add the found hosts** to `scan-tools.js`: OTAs/tour platforms → `OTA_MAP` (with a name), redirectors/
   networks/deeplinks → `SHORT`; if a network uses a specific tracking param (e.g. `lptag`, `a8mat`) add it to
   the `monParams` regex. Only then run the scan.
4. If unsure whether a domain is affiliate → run with `INCLUDE_UNKNOWN=1` (Step 4): it flags suspicious
   outbound links as `unknown`, and you confirm/add them from the screenshots (Step 5).
This is how "a country with no examples" works: derive the language yourself → learn the partners via recon →
extend the detector → scan. Never treat the seed list as complete.

## 4. SCAN + STEP-BY-STEP HTML BUILD (Step 2) — run the scanner
```bash
node scan-tools.js targets-<country>.json <country> <locale>
# locale: zh-TW / ja-JP / ko-KR / th-TH / en-US ...
# show the browser window (default is headless — no window pops up):
HEADED=1 node scan-tools.js targets-<country>.json <country> <locale>
# + catch UNKNOWN affiliates (external links with params / repeated commerce hosts):
INCLUDE_UNKNOWN=1 node scan-tools.js targets-<country>.json <country> <locale>
```
`INCLUDE_UNKNOWN=1` flags `unknown` candidates ("external/unknown (?) — to review"). It's a deliberately
"noisy" wide net: then **YOU validate them by eye** (Step 5) and either confirm (better — add the host to
`OTA_MAP` and re-scan so it gets a precise type) or discard. Turn it on when you need recall / an unfamiliar
market (Iceland, etc.).
**Default is headless** (no window pops up). 🚫 **Do NOT auto-switch to `HEADED`** (not even on 403/captcha):
headed opens a browser window and **breaks multi-agent / parallel runs** (the user often runs several
countries at once — windows must not pop up). On 403/block, just mark the page "couldn't verify" and move on.
`HEADED=1` is **only when the user explicitly asks** to see the window. The Emerald
class still won't render under automation anyway (needs CDP, see below).
Per blog the scanner auto-discovers up to 5 different pages (home + sections/articles by navigation
clusters), loads them, **scrolls to the true bottom** (important: articles can be 100k+ px), detects tools,
screenshots the elements, and **after each blog rewrites** `<country>-manifest.json` and
`<country>-blogs.html` (this is the "step-by-step": the HTML grows live).

Show the user the path to `<country>-blogs.html` right away — they can open and refresh it as it runs.

### Dynamic / anti-bot widgets (Travelpayouts Emerald, Stay22)
- Rendered in **Shadow DOM**, loaded by a script, **lazily** on scroll; some are served only to a trusted
  session and **don't appear under automation**. The scanner already: recursively walks Shadow DOM, slow-
  scrolls (`slowScroll`), waits for Emerald, and `page.locator` pierces open shadow.
- If such blocks are needed as a screenshot — run via **CDP against a real Chrome** (see README, `CDP_URL=...`).
  Whatever isn't caught is recorded as a **JS integration** (we see the `emrld.cc`/`travelpayouts`/`stay22`
  script) and/or captured manually. Don't fabricate — flag honestly.

## 5. VALIDATION — two layers
**(a) In the scanner (at capture time)** — so the screenshot is of a "tool", not "whatever":
- visibility (`display/visibility/opacity`, size ≥ a button, not the whole page);
- **non-empty**: file ≥1.5 KB AND not "large-but-white" (bytes-per-pixel filter `area>40000 && bytes<area*0.03`);
- contains text/`img`/`iframe`/button;
- **non-tool rejection**: site chrome (`nav/header/footer`), menus (≥5 links with no OTA/prices/prose),
  photo credits (`Source:/圖片來源`), social/community (`LINE/社群/facebook`), related-posts/pagination,
  internal funnel links (OTA word in the path of the same domain — we match OTA by **host**), ad slots
  (`adsbygoogle/googlesyndication/doubleclick`).
An OTA link = host in the OTA list **or** in shorteners (`tpk.lu/tp.st/tp-em.cc/emrld.cc/pse.is/reurl.cc/
stay22/i-tm.com.tw`) **or** an affiliate query param (`aid/cid/marker/trs/tag/...`) with an external host;
plus same-domain cloaked redirects (`/go/ /recommends/ /aff/`).

**(b) The `validate-html-page.js` hook** (PreToolUse on Write `.html`) — a structural gate: if you write an
HTML page yourself via the Write tool, pass the body as JSON `{title, rows:[{"#","Блог","Краткое описание",
"Инструменты","Скриншоты"}]}`; the hook checks there are no empty required fields and renders the table
(otherwise it blocks the Write with a reason). The rich screenshot report is produced by `gen-html.js`
directly (bypassing the hook) — the hook is the "no-empty-page" guard for manual HTML outputs.

**(c) YOU are the final noise filter (the main validation layer).** The scanner is tuned for recall
(especially with `INCLUDE_UNKNOWN=1`); you create cleanliness from the screenshots. This is not optional —
it's part of the process:
- **Open the `tools/` screenshots** of every `unknown` and any doubtful candidate (via Read);
- for each decide: **(1) a real booking/affiliate tool** → confirm; if it's a recognizable OTA/network —
  **add the host to `OTA_MAP`/`SHORT` and re-scan** (so it gets a precise type, not `unknown`); **(2) noise**
  (an ordinary external link, social, ad, nav, credit) → **drop it** (remove from the manifest / exclude via a
  filter in `scan-tools.js`);
- **unconfirmed `unknown`s must not appear in the final report** — either reclassify to a real type or remove.
  If you keep one as tentative, label it clearly "candidate, unconfirmed".
- Heuristics also err in normal mode — spot-check screenshots of known types too; on systematic false
  positives, fix the filters in `scan-tools.js` and re-scan.
- 🚫 **"Real travel blog" gate — check at the SITE level, not per screenshot.** Before keeping a blog in the
  report, confirm (from its homepage + page types) it's an **authored travel site**, not: (1) a discount/offer
  aggregator; (2) a mixed-topic/off-topic content farm/MFA or repurposed domain (see both hard gates in
  Step 2). If a "blog" is entirely a feed of coupons/deals across brands, **or** an SEO-page generator on
  random topics (smartphones/finance/insurance + a stray travel post with a promo code) → **drop the whole
  site from the manifest** (not just individual screenshots). That's how **WannaZone / benefitshub** (coupon
  sites) and **`icems2021.com`** (a content farm on a conference domain) slipped in — they skew the whole slice.
  - 🔔 The scanner itself prints `⚠ REVIEW <slug>: only N thin link/coupon tool(s)…` for blogs with the thin
    content-farm signature (only thin link/coupon, no widgets/cards/cta/integrations — like icems2021). It's a
    **manual-review signal, not auto-drop**: open the site and decide by the gates above. (Coupon aggregators
    with a rich tool set are NOT caught this way — you exclude those by judging the site's topic.)
Net: wide net (B) + your visual validation = high recall without noise in the report.

## 6. GENERATION — always HTML
- The main report is built by `gen-html.js` (module + CLI). Columns: **# · Blog (name/URL/page types) ·
  Description · Tools (grouped by type + JS integrations) · Tool screenshots**. Thumbnails are **embedded
  base64** (cross-platform resize via Playwright-canvas — no `sips`/`sharp`), deduped per blog. The file is
  self-contained — opens anywhere.
- Rebuild manually: `node gen-html.js <country>-manifest.json <country>-blogs.html "<Title>"`.
- ✅ **Record a valid travel blog HONESTLY even if it has zero tools.** "0 tools" is a valid result (the blog
  exists, no monetization found), not a reason to drop it or to pad the sample with coupon sites. Don't tune
  the report toward "more tools".
- 🗂️ **Coupon sites / aggregators — NOT in the main blog table, but in a separate observation section.** You
  will run into coupon sites / discount aggregators; don't count them as blogs and don't silently delete them
  — put **a couple of illustrative examples with screenshots into a separate "Observation: coupon sites /
  aggregators" section** (bottom of the report) as market context, apart from the authored travel blogs. Keeps
  the slice honest and unskewed.
- (Optional) a coupons-only sub-report with translations — on request: a separate HTML where each card =
  screenshot + original + translation (you provide the translation; don't hardcode a per-country dictionary).

## 7. Rules
- This is research/data collection. Don't modify anyone's code.
- Didn't open / 403 / captcha — flag honestly, don't fabricate a verdict.
- "A tool is present" = an observed fact from a screenshot/snapshot, not a guess.
- An unfamiliar tool format that leads to booking — capture and describe it (don't dismiss).
- At the end give a summary: how many blogs, how many tools, which types dominate, the **language balance
  (local vs English)**, the path to `<country>-blogs.html`. If it skewed English, say so.
- How the Taiwan/Asia market differs: heavy on Klook/KKday/Agoda, Travelpayouts shortlinks
  (`tpk.lu/tp.st/tp-em.cc/emrld.cc`), coupon/promo pages, local shorteners (`pse.is/reurl.cc`), the local
  affiliate network iChannels 通路王 (`i-tm.com.tw`) — vs the Western Booking/Expedia/Amazon.
