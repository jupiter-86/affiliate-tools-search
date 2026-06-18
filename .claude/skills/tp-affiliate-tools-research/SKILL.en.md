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
- Browser: default `chromium.launch({ headless:false, channel:'chrome' })` (beats part of anti-bot).
  If no system Chrome — the Playwright-Chromium from `npx playwright install chromium`.
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
- Borderline — flag it (language, who the author is, who it targets), don't silently drop it.

For each blog, record the **language** and the type (local / English-for-foreigners) — it goes into the report.

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
4. **Discover the platform on the fly — NOT from a hardcoded list** (this is the universality: Iceland or any
   country). Method: (a) search blogs in the local language; (b) if you don't know the local blog platforms —
   **ask the results**: `WebSearch` "popular blogging platform in <country>", "<country> 旅行/여행/travel
   bloggers", and see which **domains/platforms recur** — those are the local ones. Examples (illustration,
   NOT a lookup table): Japan — Ameba/Hatena/note; Korea — Naver/Tistory/Brunch; Taiwan — pixnet; Thailand —
   Blockdit. Iceland/Europe — more often own domains + social.

Gather ~12–20 candidates; for each — a **home URL** and (ideally) one **tool-rich seed article** (hotel
roundup / itinerary). **Local-language** query templates (substitute the country):
- Japan: "日本 旅行 ブログ ホテル 予約", "<city> 観光 ブログ おすすめ", "日本人 旅行ブロガー 人気".
- Korea: "국내여행 블로그 추천 호텔 예약", "<city> 여행 블로그 후기", "여행 블로거 추천".
- Thailand: "รีวิว ที่พัก บล็อก เที่ยว <province>", "บล็อกเกอร์ ท่องเที่ยว ไทย".
- Taiwan (the reference): "台灣 旅遊 部落格 推薦", "<city> 自由行 部落客", "飯店 訂房 部落格".
- English (top-up, minority): "best local <country> travel bloggers", "<country> travel blog (in <language>)".
- hooks: hotel reviews, itineraries (行程/일정/itinerary), "things to do", roundups, Klook-vs-KKday comparisons,
  coupon pages (折扣碼/쿠폰/优惠/coupon). Platforms above.
Don't invent domains — verify they open. For each candidate record its language and local/foreign type.

**The local monetization stack ≠ the Western one (Booking/Stay22/Klook).** Local blogs monetize via THEIR
networks/OTAs — find and detect those (extend `OTA_MAP`/`SHORT`, Step 3a). Cheat-sheet (NOT exhaustive):
- 🇯🇵 **Japan**: networks A8.net, ValueCommerce (バリューコマース), moshimo (もしも), Rakuten Affiliate,
  AccessTrade; OTAs Rakuten Travel (楽天トラベル), Jalan (じゃらん), Ikyu (一休), JTB, Rurubu; formats — A8
  text/banner links, Rakuten product widgets. (some already in `OTA_MAP`/`SHORT`.)
- 🇰🇷 **Korea**: networks Coupang Partners (쿠팡파트너스), LinkPrice (링크프라이스), AdPick (애드픽); OTAs
  Yanolja (야놀자), GoodChoice (여기어때), Interpark Tour, Hana Tour, Trip.com; platforms Naver Blog/Tistory.
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

### 3a. Partner recon — extend the OTA list for the country (key for recall)
`OTA_MAP`/`SHORT` in `scan-tools.js` are a **SEED, not a full registry**. The scanner won't recognize an
affiliate that isn't there (e.g. Iceland: **Guide to Iceland**, Reykjavik Excursions, a local tour platform,
an unknown affiliate network). So BEFORE scanning:
1. `WebSearch` "<country> travel affiliate programs", "<country> booking partners" — what OTAs/networks are used;
2. open 2–3 candidate articles and see which **external domains** they link to repeatedly (recurring commerce
   domains = likely affiliate);
3. **add the found hosts** to `OTA_MAP` (with a human-readable name) and/or redirect domains to `SHORT` in
   `scan-tools.js` — then the scanner captures them as first-class tools.

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
**Default is headless** (no window pops up / covers the user's work). If a site throws lots of 403/captcha —
try `HEADED=1` (a visible window beats more anti-bot), but warn the user a window will appear. The Emerald
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
Net: wide net (B) + your visual validation = high recall without noise in the report.

## 6. GENERATION — always HTML
- The main report is built by `gen-html.js` (module + CLI). Columns: **# · Blog (name/URL/page types) ·
  Description · Tools (grouped by type + JS integrations) · Tool screenshots**. Thumbnails are **embedded
  base64** (cross-platform resize via Playwright-canvas — no `sips`/`sharp`), deduped per blog. The file is
  self-contained — opens anywhere.
- Rebuild manually: `node gen-html.js <country>-manifest.json <country>-blogs.html "<Title>"`.
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
