// v2: capture ELEMENT-level screenshots of monetization tools, broadened detection.
// Adds: non-iframe widgets (class/id/data markers + inline-script render targets),
// invisible JS integrations (Stay22 lma / Travelpayouts integration_background, text-only),
// coupon pages/blocks, cloaked redirects (/go/ /recommends/), catch-all affiliate blocks,
// and a smarter menu-vs-tool filter. Full-page scroll, cap ~12/blog, looser dedupe.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
// Usage: node scan-tools.js <targets.json> <outName> [locale]
//   targets.json : [{ slug, name, home, seed? }]  (or [{slug,name,url}] for single pages)
//   outName      : e.g. "japan" -> writes japan-blogs.html + japan-manifest.json (grows step-by-step)
//   locale       : browser locale zh-TW / ja-JP / ko-KR / en-US (default en-US)
// Optional env CDP_URL: attach to a real Chrome (warm profile) for session-gated widgets (Emerald).
const { buildHtml } = require('./gen-html');

const targets = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT_NAME = process.argv[3] || 'blogs';
const LOCALE = process.argv[4] || 'en-US';
const OUT = path.resolve('tools');
fs.mkdirSync(OUT, { recursive: true });
const CAP = 40; // max screenshotted tools per page (very long, tool-rich pages)
// INCLUDE_UNKNOWN=1 -> also flag UNKNOWN outbound links (params or repeated commerce host) as
// candidate "affiliate (unknown network)". Higher recall + noise — the agent validates by eye.
const INCLUDE_UNKNOWN = process.env.INCLUDE_UNKNOWN === '1' || process.env.INCLUDE_UNKNOWN === 'true';

const OTA_MAP = [
  ['agoda', 'Agoda'], ['booking.com', 'Booking'], ['klook', 'Klook'], ['kkday', 'KKday'], ['kk.day', 'KKday'],
  ['trip.com', 'Trip.com'], ['ctrip', 'Trip.com'], ['expedia', 'Expedia'], ['getyourguide', 'GetYourGuide'],
  ['kayak', 'Kayak'], ['rentalcars', 'Rentalcars'], ['hotels.com', 'Hotels.com'], ['tripadvisor', 'Tripadvisor'],
  ['airbnb', 'Airbnb'], ['hostelworld', 'Hostelworld'], ['viator', 'Viator'], ['skyscanner', 'Skyscanner'],
  ['stay22', 'Stay22'], ['12go', '12Go'], ['discover-cars', 'DiscoverCars'], ['kiwi.com', 'Kiwi'],
  ['aviasales', 'Aviasales'], ['wayaway', 'WayAway'], ['hotellook', 'Hotellook'],
  // regional / Asia
  ['eztravel', 'ezTravel'], ['liontravel', 'LionTravel'], ['hotelscombined', 'HotelsCombined'],
  ['qeeq', 'QEEQ'], ['rentalcover', 'RentalCover'], ['easyrentcars', 'EasyRentCars'], ['funtime', 'FunTime'],
  ['hoteljp', 'HotelJP'], ['jalan', 'Jalan'], ['rakuten', 'Rakuten'], ['agora', 'Agora'],
  // Japan domestic OTAs
  ['ikyu', 'Ikyu'], ['jtb', 'JTB'], ['rurubu', 'Rurubu'], ['yukoyuko', 'Yukoyuko'], ['relux', 'Relux'],
  ['ozmall', 'OZmall'], ['ouchi-de', 'Ouchi'], ['travel.yahoo', 'YahooTravel'], ['rakutentravel', 'Rakuten'],
  // multi-region OTAs / tour platforms (seed — broadly useful beyond one country)
  ['traveloka', 'Traveloka'], ['rentcars', 'Rentcars'], ['civitatis', 'Civitatis'], ['123milhas', '123Milhas'],
  ['segurospromo', 'SegurosPromo'], ['decolar', 'Decolar'], ['travelfish', 'Travelfish'],
  // Korea domestic OTAs
  ['yanolja', 'Yanolja'], ['goodchoice', 'GoodChoice'], ['myrealtrip', 'MyRealTrip'], ['hanatour', 'HanaTour'],
  ['interpark', 'Interpark'], ['triple.guide', 'Triple'],
  ['myrealt.rip', 'MyRealTrip'], ['coupa.ng', 'Coupang'],
];
const SHORT = ['tpk.lu', 'tp.st', 'tp-em.cc', 'emrld.cc', 'pse.is', 'reurl.cc', 'i-tm.com.tw', 'stay22.com',
  'lihi.cc', 'lihi1.com', 'lihi2.com', 'lihi3.com', 'lihi.tv', 'pics.ee', 'risu.io', 'myship.7-11', 'travelpayouts',
  // Japan affiliate networks (redirect/tracking hosts): A8.net, moshimo, ValueCommerce, accesstrade, afb, felmat, rentracks
  'a8.net', 'af.moshimo.com', 'moshimo.com', 'valuecommerce.com', 'dalr8.net', 'accesstrade.net', 'h.accesstrade',
  'afi-b.com', 'afb.jp', 'felmat.net', 'rentracks', 'tg-affiliate', 'afl.rakuten.co.jp', 'ck.jp.ap',
  // GLOBAL affiliate networks / deeplinks (seed — used worldwide, benefit every country):
  // app.ac=Agoda deeplink; Involve Asia (SEA); CJ/Commission Junction; Awin; Skimlinks; ShareASale
  'app.ac', 'invol.co', 'involve.asia', 'anrdoezrs.net', 'dpbolvw.net', 'jdoqocy.com', 'kqzyfj.com',
  'tkqlhce.com', 'awin1.com', 'go.redirectingat', 'shareasale',
  // Korea networks: Coupang Partners (link.coupang.com + lptag param), LinkPrice, tenping
  'link.coupang.com', 'linkprice.com', 'tenping.kr',
  // Korea CPS coupon/deeplink redirectors (confirmed on coupon blogs: wannazone/benefitshub etc.)
  'myrealt.rip', 'coupa.ng', 'lase.kr', 'lpweb.kr', 'linkmoa.kr', 'bestmore.net', 'newtip.net', 's.click.aliexpress.com'];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function dismissConsent(page) {
  const sels = ['button:has-text("Accept")', 'button:has-text("I agree")', 'button:has-text("Got it")',
    'button:has-text("同意")', 'button:has-text("接受")', 'button:has-text("我知道了")', 'button:has-text("Allow all")'];
  for (const s of sels) { try { const b = page.locator(s).first(); if (await b.isVisible({ timeout: 250 })) { await b.click({ timeout: 700 }); await sleep(250); } } catch (e) {} }
}

async function fullScroll(page) {
  // reach the true bottom even on very long pages (some are 100k+ px); dwell so
  // IntersectionObserver/lazy widgets fire; cap by time, not a low step count.
  await page.evaluate(async () => {
    await new Promise((res) => {
      let y = 0, steps = 0, stalls = 0, lastH = 0;
      const t = setInterval(() => {
        window.scrollBy(0, 1400); y += 1400; steps++;
        const h = document.body.scrollHeight;
        if (h === lastH) stalls++; else { stalls = 0; lastH = h; }
        // stop only when we're truly at the bottom (and height stopped growing) or after a hard cap
        if ((y >= h - window.innerHeight && stalls > 2) || steps > 300) { clearInterval(t); res(); }
      }, 180);
    });
  });
  await sleep(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(900);
}

// Node-driven SLOW scroll: real awaited pauses per step so IntersectionObserver-based
// widgets (Travelpayouts Emerald etc.) actually render as their placeholders enter view.
async function slowScroll(page, px = 1300, dwell = 240) {
  const h = await page.evaluate(() => document.body.scrollHeight).catch(() => 30000);
  const steps = Math.min(140, Math.ceil(h / px) + 2);
  for (let i = 0; i < steps; i++) { await page.evaluate(y => window.scrollTo(0, y), i * px); await sleep(dwell); }
  await sleep(3000);
}

async function scan(context, t) {
  const page = await context.newPage();
  const res = { slug: t.slug, name: t.name, url: t.url, page_type: t.page_type || null, tools: [], integrations: [], note: '' };
  try {
    let resp = null;
    for (let a = 0; a < 2; a++) { try { resp = await page.goto(t.url, { waitUntil: 'domcontentloaded', timeout: 60000 }); break; } catch (e) { if (a === 1) throw e; await sleep(1500); } }
    if (resp && resp.status() >= 400) res.note = 'HTTP ' + resp.status();
    await sleep(3500);
    await dismissConsent(page);
    await fullScroll(page);
    // Travelpayouts Emerald (and similar) inject Shadow-DOM blocks late. If the loader
    // is present, re-scroll and wait longer for the blocks to render before detecting.
    const hasEmeraldLoader = await page.evaluate(() => [...document.scripts].some(s => /emrld\.cc|travelpayouts|tp\.media|emerald/i.test(s.src || '')) || /emerald|travelpayouts/i.test(document.documentElement.outerHTML)).catch(() => false);
    if (hasEmeraldLoader) {
      await slowScroll(page); // slow, awaited pass so IntersectionObserver fires & Emerald renders
      try { await page.waitForFunction(() => { const w = (r) => { for (const e of r.querySelectorAll('*')) { if (e.tagName.toLowerCase().includes('emerald')) return true; if (e.shadowRoot && w(e.shadowRoot)) return true; } return false; }; return w(document); }, { timeout: 15000 }); } catch (e) {}
      await sleep(1500);
    }

    const { cands, integrations } = await page.evaluate(({ OTA_MAP, SHORT, includeUnknown }) => {
      const hostOf = (s) => { try { return new URL(s, location.href).hostname.toLowerCase(); } catch (e) { return ''; } };
      const otaName = (s) => { const h = hostOf(s); for (const [f, n] of OTA_MAP) if (h.includes(f)) return n; return null; };
      const isShort = (s) => { const h = hostOf(s); return SHORT.some(x => h.includes(x)); };
      const monParams = (s) => /[?&](aid|cid|marker|shmarker|partner|partner_id|pid|mcid|trs|sub_id|campaign|tag|site_id|aff|adid|wid|irclickid|clickref|a8mat|a_id|vc_url|vcptn|f_id|m_id|lptag|ptag|subid|awinmid|awinaffid|ranMID|ranEAID)/i.test(s || '');
      const VIDEO_SOCIAL = /(youtube|youtu\.be|vimeo|dailymotion|instagram|facebook|twitter|x\.com|tiktok|soundcloud|spotify|pinterest)/i;
      const CLOAK = /\/(go|out|recommend|recommends|aff|affiliate|link|links|deal|deals|ref|visit|r)\//i;
      const isCloak = (s) => { try { const u = new URL(s, location.href); return u.hostname === location.hostname && CLOAK.test(u.pathname); } catch (e) { return false; } };
      const isToolLink = (h) => !!otaName(h) || isShort(h) || isCloak(h) || (monParams(h) && hostOf(h) !== location.hostname);

      const WIDGET_MARK = /(widget|stay22|\bs22\b|\blma\b|travelpayouts|tpwdgt|tp-?widget|integration_background|getyourguide|\bgyg\b|aviasales|hotellook|klook|kkday)/i;
      const PROVIDER_MARK = /(stay22|\bs22\b|\blma\b|travelpayouts|tpwdgt|tp-?widget|integration_background|getyourguide|\bgyg\b|aviasales|hotellook|klook|kkday)/i;
      const AD_MARK = /(adsbygoogle|googlesyndication|doubleclick|google_ads|gpt-?ad|ad-?slot|adslot|advert|dable|taboola|outbrain|popin|sponsor)/i;
      const PRICE = /(US?\$|NT\$|HK\$|TWD|￥|¥|€|£)\s?\d|\d[\d,.]*\s?(元|円|USD|TWD|NTD)/;
      const COUPON = /(coupon|promo\s*code|discount\s*code|voucher|折扣碼|優惠碼|優惠券|折扣码|序號|序号|promo\b|折扣)/i;
      const CTA = /(book|查看房價|看房價|查房價|查看價格|查詢房價|訂房|訂機票|預訂|立即預訂|馬上訂|check price|check rates|book it|book now|reserve|see on|view deal|優惠|deal|search hotels|find hotels|compare)/i;

      const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.2) return false; const r = el.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
      const inChrome = (el) => !!(el.closest && el.closest('nav,header,footer,[role=navigation],[role=banner],[role=contentinfo]'));
      const isCredit = (s) => /(^|\b)(source\s*:|photo\s*(by|credit)|image\s*credit|圖片來源|照片來源|攝影)/i.test((s || '').trim());
      const isSocial = (s) => /(\bline\b|line@|社群|加入.{0,4}(社群|群組|line|fb|粉絲)|粉絲團|fan\s?page|facebook|instagram|telegram|whatsapp|youtube|訂閱|subscribe|follow us|官方帳號)/i.test((s || ''));
      // related-posts / pagination containers are navigation, not tools
      const RELATED = /(related|popular[-_]?post|延伸閱讀|推薦閱讀|相關文章|相關閱讀|你可能|猜你|更多文章|read[-_]?more|post-?navigation|nav-?links|next-?prev|pagination|yarpp)/i;
      const isRelated = (el) => { let p = el; for (let i = 0; i < 6 && p; i++) { const c = (p.className && p.className.toString ? p.className.toString() : '') + ' ' + (p.id || ''); if (RELATED.test(c)) return true; p = p.parentElement; } return false; };
      // menu/nav: many links, NO external OTA/affiliate link, no price, little prose
      const isMenu = (el) => {
        const links = el.querySelectorAll('a[href]');
        if (links.length < 5) return false;
        for (const a of links) if (isToolLink(a.href)) return false; // has affiliate link => tool, not menu
        if (PRICE.test(el.innerText || '')) return false;
        const total = (el.innerText || '').replace(/\s+/g, '').length;
        let lt = 0; for (const a of links) lt += (a.innerText || '').replace(/\s+/g, '').length;
        const prose = total ? (total - lt) / total : 0;
        return prose < 0.35;
      };

      const out = []; let uid = 0;
      const tag = (el, kind, label, ota) => {
        if (!el || el.getAttribute('data-toolid')) return;
        if (inChrome(el)) return;
        if (kind !== 'widget' && kind !== 'coupon' && isMenu(el)) return; // smarter menu filter
        if ((kind === 'coupon' || kind === 'card' || kind === 'link' || kind === 'block') && isRelated(el)) return; // related-posts/pagination, not a tool
        let p = el.parentElement; while (p) { if (p.getAttribute && p.getAttribute('data-toolid')) return; p = p.parentElement; }
        const id = 'tl' + (uid++); el.setAttribute('data-toolid', id);
        const r = el.getBoundingClientRect();
        out.push({ id, kind, label, ota: ota || null, w: Math.round(r.width), h: Math.round(r.height) });
      };
      const ctxBox = (a) => { let el = a; for (let i = 0; i < 4; i++) { const p = el.parentElement; if (!p || inChrome(p)) break; const r = p.getBoundingClientRect(); if (r.height > 340 || r.width < 60) break; el = p; } return el; };

      // 0) INVISIBLE JS integrations (text-only evidence)
      const integrations = [];
      const prov = (u) => { u = (u || '').toLowerCase(); if (/stay22/.test(u)) return 'Stay22'; if (/tp\.media|travelpayouts|emrld|tpwdgt|aviasales/.test(u)) return 'Travelpayouts'; if (/getyourguide|gyg/.test(u)) return 'GetYourGuide'; if (/klook/.test(u)) return 'Klook'; if (/hotellook/.test(u)) return 'Hotellook'; return null; };
      const seenI = new Set();
      for (const s of document.scripts) { const p = prov(s.src); if (p && !seenI.has(p)) { seenI.add(p); integrations.push({ provider: p, via: 'script src', detail: (s.src || '').slice(0, 120) }); } }
      for (const s of document.querySelectorAll('script:not([src])')) {
        const txt = s.textContent || ''; if (txt.length > 200000) continue;
        if (/integration_background/i.test(txt) && !seenI.has('Travelpayouts:integration_background')) { seenI.add('Travelpayouts:integration_background'); integrations.push({ provider: 'Travelpayouts', via: 'inline script', detail: 'integration_background (фоновая интеграция)' }); }
        if (/stay22|S22|\blma\b/i.test(txt) && !seenI.has('Stay22:inline')) { seenI.add('Stay22:inline'); integrations.push({ provider: 'Stay22', via: 'inline script', detail: 'Stay22 / lma' }); }
        if (/TPWidget|window\.tp\b|travelpayouts/i.test(txt) && !seenI.has('Travelpayouts:inline')) { seenI.add('Travelpayouts:inline'); integrations.push({ provider: 'Travelpayouts', via: 'inline script', detail: 'TPWidget/window.tp' }); }
      }
      try { if (window.S22 || window.Stay22) integrations.push({ provider: 'Stay22', via: 'window global', detail: 'window.Stay22' }); } catch (e) {}
      try { if (window.TPWidget || window.tp) integrations.push({ provider: 'Travelpayouts', via: 'window global', detail: 'window.tp/TPWidget' }); } catch (e) {}

      // 1) WIDGET — iframes
      for (const f of document.querySelectorAll('iframe[src]')) {
        const src = f.src || ''; const nm = otaName(src);
        if (AD_MARK.test(src) || /googlesyndication|doubleclick|adservice|googleads/i.test(src)) continue; // skip ad iframes
        if (VIDEO_SOCIAL.test(src)) continue; // YouTube/Vimeo/IG/FB embeds are NOT booking tools
        if (!(nm || isShort(src) || /widget|stay22|hotellook|tp\.media|booking|search|getyourguide/i.test(src))) continue;
        if (!vis(f)) continue; const r = f.getBoundingClientRect(); if (r.width < 80 || r.height < 60) continue;
        tag(f, 'widget', (nm || 'Affiliate') + '-виджет (iframe)', nm);
      }
      // 1b) WIDGET — non-iframe: class/id/data marker containers (inline-script widgets)
      for (const el of document.querySelectorAll('div,section,aside,ins,span')) {
        if (el.getAttribute('data-toolid')) continue;
        const sig = (el.className && el.className.toString ? el.className.toString() : '') + ' ' + (el.id || '') + ' ' + [...el.attributes].map(a => a.name + '=' + a.value).join(' ');
        if (!WIDGET_MARK.test(sig)) continue;
        if (AD_MARK.test(sig)) continue; // ad slot, not a tool
        if (/googlead|廣告|advertisement|sponsored/i.test((el.innerText || '').slice(0, 40))) continue;
        if (el.querySelector('iframe[src*="googlesyndication"],iframe[src*="doubleclick"],iframe[src*="googleads"],ins.adsbygoogle')) continue; // contains an ad slot → it's a widget-area wrapping ads, not a tool
        if (!vis(el)) continue; const r = el.getBoundingClientRect();
        if (r.width < 120 || r.height < 60 || r.width * r.height > 1100000) continue;
        if (!el.querySelector('img,iframe,canvas,a,svg') && !PRICE.test(el.innerText || '')) continue; // not an empty hook
        if (isSocial(el.innerText || '')) continue; // sidebar LINE/social block, not a tool
        if ([...el.querySelectorAll('iframe[src]')].some(f => VIDEO_SOCIAL.test(f.src || ''))) continue; // wraps a YouTube/IG/FB embed → not a tool
        // must carry an affiliate signal: link to a KNOWN OTA host, a price, or a provider marker.
        // (shortlink-only image banners — e.g. LINE/社群 via pse.is — are NOT enough → dropped)
        const hasOTA = [...el.querySelectorAll('a[href]')].some(a => otaName(a.href));
        const providerAttr = PROVIDER_MARK.test(sig);
        if (!hasOTA && !PRICE.test(el.innerText || '') && !providerAttr) continue; // kills TOC / generic WP "widget" / ads / LINE banners
        let nm = otaName(sig) || null; if (!nm) { const a = el.querySelector('a[href]'); if (a) nm = otaName(a.href); }
        tag(el, 'widget', 'Виджет (inline/script)', nm);
      }
      // 1c) Travelpayouts EMERALD & other custom-element / Shadow-DOM widgets.
      // Content lives in a shadow root, so querySelectorAll/innerText can't see it —
      // detect the HOST element (by class or custom tag name) and screenshot it directly.
      {
        // recursively walk shadow roots (Emerald renders its blocks inside Shadow DOM)
        const hosts = [];
        const walk = (root) => {
          let nodes; try { nodes = root.querySelectorAll('*'); } catch (e) { return; }
          for (const el of nodes) {
            const tn = el.tagName.toLowerCase();
            const cls = (el.className && el.className.toString) ? el.className.toString() : '';
            if (tn.includes('emerald') || tn.startsWith('tp-') || /emerald|tp-?widget|travelpayouts/i.test(cls)) hosts.push(el);
            if (el.shadowRoot) walk(el.shadowRoot);
          }
        };
        walk(document);
        for (const el of hosts) {
          if (el.getAttribute('data-toolid')) continue;
          if (!vis(el)) continue; const r = el.getBoundingClientRect();
          if (r.width < 120 || r.height < 50 || r.width * r.height > 1400000) continue;
          // label by emerald block variant if present in class
          const cls = (el.className && el.className.toString) ? el.className.toString() : '';
          const variant = (cls.match(/emerald-block__([a-z0-9_-]+)/i) || [])[1];
          tag(el, 'widget', 'Travelpayouts Emerald' + (variant ? ' (' + variant + ')' : '') + '-блок', 'Travelpayouts');
        }
      }

      const anchors = [...document.querySelectorAll('a[href]')].filter(a => isToolLink(a.href) && vis(a));

      // 2) BANNER (a>img to OTA/short/cloak)
      for (const a of anchors) {
        const img = a.querySelector('img'); if (!img) continue; const r = a.getBoundingClientRect();
        if (r.width < 120 || r.height < 50) continue;
        // social filter: text is often baked into the banner image, so also check img src/alt
        // and a few ancestor levels of context text (e.g. «加入 LINE 社群 …» next to the banner)
        let ctx = a; for (let i = 0; i < 3 && ctx.parentElement; i++) ctx = ctx.parentElement;
        if (isSocial((a.innerText || '') + ' ' + (img.alt || '') + ' ' + (img.src || '') + ' ' + (ctx.innerText || ''))) continue;
        tag(a, 'banner', 'OTA/affiliate-баннер', otaName(a.href));
      }

      // 3) COUPON — coupon/promo pages or blocks (incl. internal funnel)
      for (const a of [...document.querySelectorAll('a[href]')].filter(vis)) {
        if (a.getAttribute('data-toolid')) continue;
        const txt = (a.innerText || '').trim().replace(/\s+/g, ' ');
        if (!txt || txt.length < 3 || !COUPON.test(txt) || isSocial(txt)) continue; // match coupon keyword in VISIBLE TEXT, not href
        const box = ctxBox(a);
        tag(box, 'coupon', 'Купон/промо «' + txt.slice(0, 32) + '»', otaName(a.href));
      }

      // 4) CARD — hotel/activity card (img + OTA link, few links, has prose)
      for (const a of anchors) {
        if (a.getAttribute('data-toolid')) continue;
        let el = a, host = null;
        for (let i = 0; i < 4 && el.parentElement; i++) { el = el.parentElement; if (inChrome(el)) break; const r = el.getBoundingClientRect(); if (r.height > 60 && r.height < 560 && r.width > 180 && el.querySelector('img')) { host = el; break; } }
        const htxt = host ? (host.innerText || '').trim() : '';
        if (host && htxt.length >= 12 && !isCredit(htxt) && !isSocial(htxt)) tag(host, 'card', 'Инлайн-карточка', otaName(a.href));
      }

      // 5) CTA — styled buttons or strong-CTA text
      for (const a of anchors) {
        if (a.getAttribute('data-toolid')) continue;
        const cs = getComputedStyle(a); const r = a.getBoundingClientRect();
        const txt = (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ');
        const bg = cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent';
        const buttonish = (cs.display.includes('block') || cs.display.includes('flex') || cs.display.includes('inline-block')) && (bg || parseFloat(cs.borderTopWidth) > 0) && r.height >= 26;
        const strongCTA = CTA.test(txt) && txt.length <= 44;
        if (!buttonish && !strongCTA) continue; if (r.height < 22 || r.width < 56) continue;
        const box = (buttonish && bg) ? a : ctxBox(a);
        if (isCredit(txt) || isCredit(box.innerText || '') || isSocial(txt)) continue;
        tag(box, 'cta', 'CTA «' + (txt.slice(0, 34) || '…') + '»', otaName(a.href));
      }

      // 6) CATCH-ALL block — non-chrome block w/ external OTA link + price/CTA (unknown formats)
      for (const a of anchors) {
        if (a.getAttribute('data-toolid')) continue;
        let el = a;
        for (let i = 0; i < 3 && el.parentElement; i++) { el = el.parentElement; if (inChrome(el)) break; const r = el.getBoundingClientRect(); const it = el.innerText || ''; if (r.height >= 40 && r.height < 420 && r.width > 160 && (PRICE.test(it) || CTA.test(it))) { tag(el, 'block', 'Аффилиатный блок', otaName(a.href)); break; } }
      }

      // 6b) COMPOSITE affiliate info-box: container with >=2 tool-links + price or
      // "Last Minute / Planning Your Trip" heading (e.g. Travelpayouts last-minute widget)
      for (const el of document.querySelectorAll('div,section,aside,table,ul')) {
        if (el.getAttribute('data-toolid')) continue;
        if (inChrome(el) || isMenu(el) || isRelated(el)) continue;
        const tl = [...el.querySelectorAll('a[href]')].filter(a => isToolLink(a.href));
        if (tl.length < 2) continue;
        const it = el.innerText || '';
        if (!PRICE.test(it) && !/last\s*minute|planning your trip|book your trip|最後一刻|規劃|懶人/i.test(it)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 200 || r.height < 60 || r.height > 950 || r.width * r.height > 1300000) continue;
        tag(el, 'block', 'Аффилиат-блок (мульти-OTA)', otaName(tl[0].href));
      }

      // 7) LINK — remaining inline OTA links
      for (const a of anchors) {
        if (a.getAttribute('data-toolid')) continue;
        const txt = (a.innerText || a.textContent || '').trim().replace(/\s+/g, ' ');
        if (!txt || isCredit(txt) || isSocial(txt)) continue;
        const box = ctxBox(a);
        if (isCredit(box.innerText || '') || isSocial(box.innerText || '')) continue;
        tag(box, 'link', 'OTA-ссылка «' + txt.slice(0, 30) + '»', otaName(a.href));
      }

      // 8) STICKY — fixed/sticky with OTA content
      for (const el of document.querySelectorAll('body *')) {
        if (el.getAttribute('data-toolid')) continue;
        const cs = getComputedStyle(el); if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
        if (!vis(el)) continue; if (!(otaName(el.innerHTML) || isShort(el.innerHTML))) continue;
        const r = el.getBoundingClientRect(); if (r.width < 80 || r.height < 28 || r.width * r.height > 800000) continue;
        tag(el, 'sticky', 'Sticky-виджет/кнопка', otaName(el.innerHTML));
      }

      // 9) UNKNOWN affiliate candidates (opt-in via INCLUDE_UNKNOWN): outbound external links to a
      // commerce-ish host we DON'T already recognize, that either carry tracking params or repeat on
      // the page (≥3×). High recall / noisy by design — the agent validates these by eye afterwards.
      if (includeUnknown) {
        const NONCOMMERCE = /(facebook|instagram|twitter|x\.com|pinterest|youtube|tiktok|google|gstatic|googleapis|wikipedia|wikimedia|maps\.|gov\b|gravatar|wp\.com|w\.org|schema\.org|paypal\.com\/cgi|line\.me|t\.me)/i;
        const TRACK = /[?&](utm_|aff|ref|tag|partner|sub|campaign|clickid|irclickid|fbclid|gclid|cmp|source|aid|cid|pid|mid)/i;
        const counts = {};
        const exts = [...document.querySelectorAll('a[href]')].filter(a => { const h = hostOf(a.href); return h && h !== location.hostname && !NONCOMMERCE.test(h); });
        for (const a of exts) counts[hostOf(a.href)] = (counts[hostOf(a.href)] || 0) + 1;
        for (const a of exts) {
          if (a.getAttribute('data-toolid')) continue;            // already a known tool
          if (isToolLink(a.href)) continue;                       // recognized — handled above
          if (!vis(a)) continue;
          const h = hostOf(a.href);
          const qualifies = TRACK.test(a.href) || counts[h] >= 3;  // tracking param OR repeated commerce host
          if (!qualifies) continue;
          const txt = (a.innerText || '').trim().replace(/\s+/g, ' ');
          if (isCredit(txt) || isSocial(txt) || isMenu(a) || isRelated(a)) continue;
          const box = ctxBox(a);
          if (isMenu(box) || isRelated(box)) continue;
          tag(box, 'unknown', 'Внешняя ссылка (?) → ' + h + (txt ? ' «' + txt.slice(0, 24) + '»' : ''), null);
        }
      }
      return { cands: out, integrations };
    }, { OTA_MAP, SHORT, includeUnknown: INCLUDE_UNKNOWN });

    res.integrations = integrations;

    // priority order; capture with cap + looser dedupe (keep <=2 per identical key, diff kinds kept)
    const order = { widget: 0, banner: 1, coupon: 2, card: 3, cta: 4, block: 5, sticky: 6, link: 7, unknown: 8 };
    cands.sort((a, b) => order[a.kind] - order[b.kind]);
    let n = 0; const seen = {};
    for (const c of cands) {
      const key = c.kind + '|' + c.label + '|' + (c.ota || '');
      const maxDup = (c.kind === 'cta' || c.kind === 'link' || c.kind === 'coupon') ? 1 : 2;
      if ((seen[key] || 0) >= maxDup) continue;
      const loc = page.locator(`[data-toolid="${c.id}"]`);
      try {
        await loc.scrollIntoViewIfNeeded({ timeout: 4000 });
        await sleep(c.kind === 'widget' ? 1600 : 400);
        const box = await loc.boundingBox();
        if (!box) continue;
        if (box.width < 56 || box.height < 22 || box.width > 1500 || box.height > 1300) continue;
        const ok = await loc.evaluate((el) => { const t = (el.innerText || '').trim(); return t.length > 0 || !!el.querySelector('img,iframe,svg,picture,button,canvas') || el.tagName === 'IFRAME'; }).catch(() => false);
        if (!ok) continue;
        const file = path.join(OUT, `${t.slug}-p${t.pageIdx}-${n}.png`);
        await loc.screenshot({ path: file, timeout: 8000 });
        const sz = fs.statSync(file).size; const area = box.width * box.height;
        if (sz < 1500 || (area > 40000 && sz < area * 0.03)) { fs.unlinkSync(file); continue; }
        seen[key] = (seen[key] || 0) + 1;
        res.tools.push({ kind: c.kind, label: c.label, ota: c.ota, w: Math.round(box.width), h: Math.round(box.height), file: path.relative(process.cwd(), file), bytes: sz });
        if (++n >= CAP) break;
      } catch (e) {}
    }

    // fallback if nothing visible captured (still may have integrations)
    if (res.tools.length === 0) {
      const fb = await page.evaluate(({ OTA_MAP, SHORT }) => {
        const hostOf = (s) => { try { return new URL(s, location.href).hostname.toLowerCase(); } catch (e) { return ''; } };
        const otaName = (s) => { const h = hostOf(s); for (const [f, n] of OTA_MAP) if (h.includes(f)) return n; return null; };
        const isShort = (s) => { const h = hostOf(s); return SHORT.some(x => h.includes(x)); };
        const vis = (el) => { const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.2) return false; const r = el.getBoundingClientRect(); return r.width > 40 && r.height > 12; };
        let uid = 900;
        for (const a of document.querySelectorAll('a[href]')) { const nm = otaName(a.href); if ((nm || isShort(a.href)) && hostOf(a.href) !== location.hostname && vis(a)) { const id = 'fb' + (uid++); a.setAttribute('data-toolid', id); return { id, label: 'OTA-ссылка «' + ((a.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 30) || nm || 'affiliate') + '»' }; } }
        return null;
      }, { OTA_MAP, SHORT });
      if (fb) { const loc = page.locator(`[data-toolid="${fb.id}"]`); try { await loc.scrollIntoViewIfNeeded({ timeout: 4000 }); await sleep(400); const box = await loc.boundingBox(); if (box) { const file = path.join(OUT, `${t.slug}-p${t.pageIdx}-fb.png`); await loc.screenshot({ path: file, timeout: 8000 }); const sz = fs.statSync(file).size; if (sz >= 1500) res.tools.push({ kind: 'link', label: fb.label, ota: null, w: Math.round(box.width), h: Math.round(box.height), file: path.relative(process.cwd(), file), bytes: sz }); else fs.unlinkSync(file); } } catch (e) {} }
    }
    if (res.tools.length === 0 && res.integrations.length === 0) res.note = (res.note ? res.note + '; ' : '') + 'no tool captured';
  } catch (e) {
    res.note = (res.note ? res.note + '; ' : '') + 'ERR: ' + e.message.slice(0, 120);
  } finally { await page.close(); }
  return res;
}

const MAX_PAGES = 5; // home + up to 4 discovered sections/articles

// heuristic page_type from URL/anchor text
function pageType(u, text) {
  const s = (u + ' ' + (text || '')).toLowerCase();
  if (/coupon|promo|折扣|優惠碼|優惠券/.test(s)) return 'coupon';
  if (/hotel|飯店|住宿|hostel|民宿|resort|ryokan|stay\b/.test(s)) return 'hotel_roundup';
  if (/itinerary|行程|攻略|day-?\d|days\b|懶人包|guide/.test(s)) return 'itinerary/guide';
  if (/things-to-do|景點|attraction|do-?in|see\b/.test(s)) return 'things_to_do';
  if (/\bvs\b|比較|compare/.test(s)) return 'comparison';
  return 'section';
}

async function discoverPages(context, t) {
  const page = await context.newPage();
  const pages = [{ url: t.home, page_type: 'home' }];
  try {
    await page.goto(t.home, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await sleep(2500);
    const links = await page.evaluate(() => {
      const host = location.hostname; const out = [];
      for (const a of document.querySelectorAll('a[href]')) {
        let u; try { u = new URL(a.href, location.href); } catch (e) { continue; }
        if (u.hostname !== host) continue;
        const p = u.pathname; if (p === '/' || p === '') continue;
        if (/\.(jpg|jpeg|png|gif|pdf|zip|webp|svg|mp4)$/i.test(p)) continue;
        if (/\/(wp-admin|wp-login|wp-json|feed|cart|checkout|account|author|tag|tags|category|page|search|privacy|terms|about|contact|sitemap)\b/i.test(p)) continue;
        const segs = p.split('/').filter(Boolean);
        out.push({ url: u.origin + p, text: (a.innerText || '').trim().slice(0, 40), seg: segs[0] || '', depth: segs.length, inNav: !!a.closest('nav,header,[role=navigation],[class*=menu],[class*=nav]') });
      }
      return out;
    });
    // score & diversify by section segment
    const TOOLKW = /(hotel|飯店|住宿|民宿|itinerary|行程|攻略|景點|guide|things|tour|stay|review|coupon|折扣|優惠|destination|taipei|kyoto|osaka|tokyo|台北|京都|大阪|東京|沖繩|首爾|曼谷)/i;
    const seen = new Set([t.home.replace(/\/$/, '')]); const bySeg = {};
    for (const l of links) {
      const key = l.url.replace(/\/$/, ''); if (seen.has(key)) continue;
      const score = (TOOLKW.test(l.url + ' ' + l.text) ? 3 : 0) + (l.inNav ? 1 : 0) + (l.depth <= 2 ? 1 : 0);
      const g = bySeg[l.seg]; if (!g || score > g.score) bySeg[l.seg] = { ...l, score, key };
    }
    const ranked = Object.values(bySeg).sort((a, b) => b.score - a.score);
    for (const l of ranked) { if (pages.length >= MAX_PAGES) break; if (seen.has(l.key)) continue; seen.add(l.key); pages.push({ url: l.url, page_type: pageType(l.url, l.text) }); }
    // ensure a known tool-rich seed article is included
    if (t.seed && !seen.has(t.seed.replace(/\/$/, ''))) { if (pages.length >= MAX_PAGES) pages.pop(); pages.push({ url: t.seed, page_type: pageType(t.seed, '') }); }
  } catch (e) { /* fall back to home + seed */ if (t.seed) pages.push({ url: t.seed, page_type: pageType(t.seed, '') }); }
  finally { await page.close(); }
  return pages.slice(0, MAX_PAGES);
}

(async () => {
  // CDP mode: drive a REAL Chrome the user started with --remote-debugging-port
  // (defeats ad/affiliate bot-suppression — no automation fingerprint). Else launch normally.
  const CDP = process.env.CDP_URL;
  let browser, context, ownBrowser = true;
  if (CDP) {
    browser = await chromium.connectOverCDP(CDP);
    context = browser.contexts()[0] || await browser.newContext();
    ownBrowser = false;
    process.stderr.write('CDP mode: attached to ' + CDP + '\n');
  } else {
    // DEFAULT = headless (no browser window popping in your face / covering your windows).
    // Set HEADED=1 to show the window (helps beat anti-bot/403 on aggressive sites).
    // (HEADLESS=0 also forces headed, for convenience.)
    // IMPORTANT: headless uses Playwright's BUNDLED Chromium (NOT channel:'chrome') —
    // real Chrome in headless on macOS crashes the renderer ("Target closed", exit 1).
    // Bundled Chromium headless is stable. Headed uses real Chrome (better vs anti-bot).
    const headed = process.env.HEADED === '1' || process.env.HEADED === 'true' || process.env.HEADLESS === '0';
    const launchOpts = { args: ['--disable-blink-features=AutomationControlled'] };
    if (headed) { launchOpts.headless = false; launchOpts.channel = 'chrome'; }
    else { launchOpts.headless = true; } // bundled Chromium
    browser = await chromium.launch(launchOpts);
    context = await browser.newContext({
      locale: LOCALE,
      viewport: { width: 1366, height: 950 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    });
    process.stderr.write('launch mode: ' + (headed ? 'headed' : 'headless (default — no window)') + '\n');
  }
  // dedicated page used only to downscale screenshots into the HTML (cross-platform, no sips/sharp)
  const thumbPage = await context.newPage();
  const MANIFEST = `${OUT_NAME}-manifest.json`;
  const HTML = `${OUT_NAME}-blogs.html`;
  const TITLE = `Affiliate monetization tools — ${OUT_NAME} travel blogs`;
  const out = [];
  // rewrite manifest + HTML after each blog so the output grows STEP-BY-STEP
  const flush = async () => {
    fs.writeFileSync(MANIFEST, JSON.stringify(out, null, 2));
    try { fs.writeFileSync(HTML, await buildHtml(out, { page: thumbPage, title: TITLE })); } catch (e) { process.stderr.write('  [html] ' + e.message.slice(0, 80) + '\n'); }
  };
  for (const t of targets) {
    const pages = t.home ? await discoverPages(context, t) : [{ url: t.url, page_type: t.page_type || 'page' }];
    const blog = { slug: t.slug, name: t.name, home: t.home || t.url, pages: [] };
    let idx = 0;
    for (const pg of pages) {
      const r = await scan(context, { slug: t.slug, name: t.name, url: pg.url, page_type: pg.page_type, pageIdx: idx });
      blog.pages.push(r); idx++;
      process.stderr.write(`  ${t.slug} p${idx} [${pg.page_type}] ${r.tools.length} shots, ${r.integrations.length} int — ${pg.url}\n`);
    }
    out.push(blog);
    await flush(); // <-- HTML + manifest updated as soon as this blog is done
    // Non-blocking content-farm / not-a-travel-blog signal (see SKILL Step 2 hard gate).
    // icems2021.com slipped in as a Korea "blog" but is a repurposed-domain content farm:
    // every page yielded ONLY a thin discount-code link, no widgets/cards/cta/integrations.
    // Flag that structural signature for manual review — never auto-drop (judgment is the human's).
    {
      const allTools = blog.pages.flatMap(p => p.tools);
      const allInt = blog.pages.flatMap(p => p.integrations);
      const RICH = ['widget', 'card', 'cta', 'banner', 'block', 'sticky'];
      const hasRich = allTools.some(x => RICH.includes(x.kind)) || allInt.length > 0;
      if (!hasRich && allTools.length <= blog.pages.length) {
        process.stderr.write(`  ⚠ REVIEW ${t.slug}: only ${allTools.length} thin link/coupon tool(s) across ${blog.pages.length} page(s), no widgets/cards/cta/integrations — verify this is a real TRAVEL BLOG, not an off-topic content-farm/coupon-aggregator (e.g. icems2021). See SKILL Step 2/5.\n`);
      }
    }
    process.stderr.write(`done ${t.slug}: ${blog.pages.length} pages, ${blog.pages.reduce((s, p) => s + p.tools.length, 0)} shots — wrote ${HTML}\n`);
  }
  await thumbPage.close().catch(() => {});
  if (ownBrowser) await browser.close(); // never close the user's own Chrome (CDP)
  console.log('-> ' + HTML + ' + ' + MANIFEST);
})();
