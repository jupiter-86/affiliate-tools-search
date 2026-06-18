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

## 2. WHAT counts as a travel blog (site validation)
Count sites that **recommend** where to go, where to stay, what to try (guides, itineraries, hotel/activity
reviews). NOT of interest (or "weak candidate"): purely informational sites without recommendations/
monetization, OTAs/aggregators themselves, news portals. Borderline — flag it, don't silently drop it.

## 3. SOURCES — how to find a country's blogs (Step 1)
Via `WebSearch`, in the local language AND in English. Gather ~12–20 candidates; for each — a **home URL**
and (ideally) one **tool-rich seed article** (hotel roundup / itinerary).
Query templates (substitute country/language):
- "<country> travel blog", "best <country> travel bloggers", "<country> hotel guide Agoda Klook".
- local: e.g. Taiwan "台灣 旅遊 部落格 推薦", Japan "日本 旅行 ブログ ホテル",
  Korea "한국 여행 블로그 호텔", Thailand "เที่ยว <...> บล็อก".
- hooks: hotel reviews, itineraries (行程/itinerary), "things to do", roundups, Klook-vs-KKday comparisons,
  coupon pages (折扣碼/优惠/coupon). Platforms: own domains, pixnet, blogspot, wordpress.
Don't invent domains — verify they open.

Build `targets-<country>.json`:
```json
[ { "slug": "nickkembel", "name": "Nick Kembel Travels",
    "home": "https://www.nickkembel.com/", "seed": "https://www.nickkembel.com/taiwan-itinerary-1-2-3-weeks/" } ]
```

## 4. SCAN + STEP-BY-STEP HTML BUILD (Step 2) — run the scanner
```bash
node scan-tools.js targets-<country>.json <country> <locale>
# locale: zh-TW / ja-JP / ko-KR / th-TH / en-US ...
```
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

**Eyes.** Heuristics make mistakes — open a few fresh screenshots and confirm they're really tools; on false
positives, tweak the filters in `scan-tools.js`.

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
- At the end give a summary: how many blogs, how many tools, which types dominate, the path to `<country>-blogs.html`.
- How the Taiwan/Asia market differs: heavy on Klook/KKday/Agoda, Travelpayouts shortlinks
  (`tpk.lu/tp.st/tp-em.cc/emrld.cc`), coupon/promo pages, local shorteners (`pse.is/reurl.cc`), the local
  affiliate network iChannels 通路王 (`i-tm.com.tw`) — vs the Western Booking/Expedia/Amazon.
