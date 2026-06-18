// Generic, incremental HTML report builder for the affiliate-tools research agent.
// Country-agnostic: derives everything from the manifest (blog -> pages[] -> tools[]).
// Cross-platform thumbnails: uses a Playwright page (canvas) to downscale screenshots
// to inline base64 — NO native image lib (sharp) and NO macOS-only `sips` needed.
//
// Used two ways:
//   1) as a module:  const { buildHtml } = require('./gen-html');  (scanner rebuilds the
//      HTML after every blog, so the output file grows step-by-step)
//   2) standalone:    node gen-html.js <manifest.json> <out.html> "<Title>"
const fs = require('fs');
const path = require('path');

const KIND = {
  widget: 'Виджет (iframe)', banner: 'Баннер', card: 'Инлайн-карточка', cta: 'CTA-кнопка',
  link: 'Инлайн-ссылка', coupon: 'Купон/промо', block: 'Аффилиат-блок', sticky: 'Sticky',
  unknown: 'Внешняя/неизвестная (?) — на проверку',
};
const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// thumbnail cache (file path -> data URL) so incremental rebuilds only resize NEW shots
const thumbCache = new Map();

async function thumbB64(page, file, w = 420) {
  if (thumbCache.has(file)) return thumbCache.get(file);
  let buf; try { buf = fs.readFileSync(file); } catch (e) { return null; }
  const src = 'data:image/png;base64,' + buf.toString('base64');
  const out = await page.evaluate(async ({ src, w }) => {
    const img = new Image(); img.src = src;
    try { await img.decode(); } catch (e) { return null; }
    const nw = img.naturalWidth || w, nh = img.naturalHeight || w;
    const scale = Math.min(1, w / nw);
    const cw = Math.max(1, Math.round(nw * scale)), ch = Math.max(1, Math.round(nh * scale));
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    c.getContext('2d').drawImage(img, 0, 0, cw, ch);
    return c.toDataURL('image/jpeg', 0.72);
  }, { src, w }).catch(() => null);
  if (out) thumbCache.set(file, out);
  return out;
}

// Build the full HTML from the current manifest. `opts.page` is a Playwright page used
// only for resizing screenshots; `opts.title` overrides the <title>/<h1>.
async function buildHtml(manifest, opts = {}) {
  const page = opts.page;
  const title = opts.title || 'Affiliate monetization tools on travel blogs';
  let rows = '', i = 0, totalShots = 0, totalInt = 0; const kindCount = {};

  for (const b of manifest) {
    i++;
    const seen = new Set(); const tools = []; const integ = new Map();
    for (const pg of (b.pages || [])) {
      for (const t of (pg.tools || [])) {
        const k = t.kind + '|' + t.label + '|' + (t.ota || '');
        if (seen.has(k)) continue; seen.add(k);
        tools.push({ ...t, page_type: pg.page_type });
      }
      for (const it of (pg.integrations || [])) integ.set(it.provider + '|' + it.via, it);
    }
    totalShots += tools.length; totalInt += integ.size;
    for (const t of tools) kindCount[t.kind] = (kindCount[t.kind] || 0) + 1;
    const pageTypes = [...new Set((b.pages || []).map(p => p.page_type))];

    const byKind = {};
    for (const t of tools) (byKind[t.kind] = byKind[t.kind] || []).push(t);
    const list = Object.keys(byKind).map(k =>
      `<li><b>${KIND[k] || k}</b> ×${byKind[k].length} <span class="ex">${esc(byKind[k].slice(0, 3).map(t => t.label.replace(/^[^«]*«?/, '').replace(/»$/, '')).join('; ').slice(0, 80))}</span></li>`).join('');
    const intList = [...integ.values()].map(it =>
      `<li class="int"><b>${esc(it.provider)}</b> <span class="ex">JS-интеграция · ${esc(it.via)} (невидимая)</span></li>`).join('');

    let shots = '';
    for (const t of tools) {
      const img = page ? await thumbB64(page, t.file) : null;
      if (!img) continue;
      const cap = (KIND[t.kind] || t.kind) + (t.ota ? ' · ' + t.ota : '') + ' · ' + t.page_type;
      shots += `<figure><a href="${img}" target="_blank"><img src="${img}" alt="${esc(t.label)}"></a><figcaption>${esc(cap)}</figcaption></figure>`;
    }

    rows += `
      <tr>
        <td class="num">${i}</td>
        <td class="blog"><b>${esc(b.name)}</b><br><a href="${esc(b.home)}" target="_blank">${esc((b.home || '').replace(/^https?:\/\//, ''))}</a><div class="pt">${pageTypes.map(p => '<span>' + esc(p) + '</span>').join('')}</div></td>
        <td class="desc">${esc(b.note || '')}<div class="cnt">${tools.length} инстр. · ${(b.pages || []).length} стр.</div></td>
        <td><ul class="tools">${list}${intList}</ul></td>
        <td class="shots">${shots || '<i>—</i>'}</td>
      </tr>`;
  }

  const kindSummary = Object.entries(kindCount).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${KIND[k] || k}: ${n}`).join(' · ');
  return `<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
 body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#172b4d;max-width:1700px;margin:24px auto;padding:0 16px;line-height:1.45}
 h1{font-size:23px} .meta{color:#5e6c84;font-size:13px;margin-bottom:14px}
 .tldr{background:#deebff;border-radius:6px;padding:12px 16px;margin:14px 0;font-size:14px} .tldr li{margin:4px 0}
 table{border-collapse:collapse;width:100%;font-size:13px} th,td{border:1px solid #dfe1e6;padding:9px 10px;vertical-align:top;text-align:left} th{background:#f4f5f7}
 td.num{text-align:center;color:#5e6c84;width:24px} td.blog{width:180px} .pt{margin-top:5px} .pt span{display:inline-block;font-size:10px;background:#eef;color:#5243aa;border-radius:3px;padding:0 5px;margin:1px 2px 0 0}
 td.desc{width:150px;color:#42526e} .cnt{margin-top:6px;font-size:11px;color:#97a0af}
 ul.tools{margin:0;padding-left:15px} ul.tools li{margin:3px 0} ul.tools .ex{color:#7a869a;font-size:11px} li.int{color:#bf5b00}
 td.shots{width:520px} figure{display:inline-block;margin:0 8px 10px 0;vertical-align:top} figure img{max-width:200px;max-height:220px;border:1px solid #c1c7d0;border-radius:4px;display:block;cursor:zoom-in;background:#fff}
 figcaption{font-size:10px;color:#5e6c84;margin-top:2px;max-width:200px} code{background:#f4f5f7;padding:1px 4px;border-radius:3px;font-size:12px}
 .footer{color:#5e6c84;font-size:12px;margin-top:18px}
</style></head><body>
 <h1>${esc(title)}</h1>
 <div class="meta">Скилл <code>tp-affiliate-tools-research</code> · сгенерировано пошагово (по мере анализа блогов). Скриншоты — снимки самих элементов-инструментов с валидацией и фильтрами (меню/реклама/соц/related/кредиты/пустые). Дедуп на уровне блога. Невидимые JS-интеграции (Stay22/Travelpayouts/Klook/GYG) — детектятся из кода.</div>
 <div class="tldr"><b>TL;DR</b><ul>
   <li>Блогов: ${manifest.length} · <b>${totalShots} уникальных скриншотов инструментов</b> · ${totalInt} невидимых JS-интеграций.</li>
   <li>Типы инструментов: ${esc(kindSummary) || '—'}.</li>
 </ul></div>
 <table><thead><tr><th>#</th><th>Блог</th><th>Краткое описание</th><th>Инструменты</th><th>Скриншоты инструментов</th></tr></thead>
 <tbody>${rows}
 </tbody></table>
 <div class="footer">Клик по скриншоту — крупно. Подпись: тип · OTA · тип страницы. Данные — соседний <code>*-manifest.json</code>.</div>
</body></html>`;
}

module.exports = { buildHtml, thumbB64 };

// standalone CLI
if (require.main === module) {
  (async () => {
    const { chromium } = require('playwright');
    const manifest = JSON.parse(fs.readFileSync(process.argv[2] || 'manifest.json', 'utf8'));
    const outFile = process.argv[3] || 'report.html';
    const title = process.argv[4] || 'Affiliate monetization tools on travel blogs';
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const html = await buildHtml(manifest, { page, title });
    await browser.close();
    fs.writeFileSync(outFile, html);
    console.log('written', outFile, Math.round(fs.statSync(outFile).size / 1024) + ' KB /', manifest.length, 'blogs');
  })();
}
