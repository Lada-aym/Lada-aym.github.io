#!/usr/bin/env node
/**
 * generate_seo.js — создаёт статические SEO-страницы по разделам руководства.
 * Запускайте после изменений data.js:
 *     node generate_seo.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = __dirname;
const BASE = 'https://lada-aym.github.io/Lada_Samara';
const OG_DEFAULT = `${BASE}/images/og-cover.svg`;
const SECTIONS = vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') + '; SECTIONS;');

/* ---------------------------------------------------------------------------
   Редиректы со СТАРЫХ URL сайта (корень раздела) на новые SEO-страницы.
   Формат: [старое имя файла, целевой путь нового SEO-раздела, title старой страницы].
   Имена взяты со старого сайта (см. <title> старых страниц), в т.ч. «opisanie2 .html»
   с пробелом — это реальный исторический URL: /Lada_Samara/opisanie2%20.html
   --------------------------------------------------------------------------- */
const OLD_REDIRECTS = [
  // Для раздела LADA Samara старых страниц не было — список пуст.
];
const OLD_REDIRECT_NAMES = new Set(OLD_REDIRECTS.map(r => r[0]));

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
/* Белый список: в текстах SECTIONS разрешён только <b>…</b> (только для текста, не атрибутов) */
function escB(s) {
  return esc(s).replace(/&lt;b&gt;/g, '<b>').replace(/&lt;\/b&gt;/g, '</b>');
}
function textPreview(blocks, maxLen = 170) {
  const parts = [];
  for (const b of blocks) {
    if (b.t === 'p' || b.t === 'note' || b.t === 'warning') parts.push(b.v);
    else if (b.t === 'h') parts.push(b.v);
    else if ((b.t === 'list' || b.t === 'ol') && Array.isArray(b.items)) parts.push(b.items.join('; '));
    if (parts.join(' ').length > maxLen + 40) break;
  }
  let txt = parts.join(' ').replace(/<\/?b>/g, '').replace(/\s+/g, ' ').trim();
  if (txt.length > maxLen) txt = txt.slice(0, maxLen).replace(/\s+\S*$/, '') + '…';
  return txt;
}
function firstImage(blocks) {
  for (const b of blocks) {
    if (b.t === 'figure' && b.src) return `${BASE}/${b.src}`;
    if (b.t === 'table') for (const row of (b.rows||[])) for (const c of row)
      if (c && c.img) return `${BASE}/${c.img}`;
  }
  return OG_DEFAULT;
}
function keywords(section) {
  const baseKW = ['LADA Samara', 'Лада Самара', 'руководство по эксплуатации'];
  const tags = (section.tags||[]).filter(t => t !== section.title && t !== 'LADA Samara');
  return [...new Set([section.title, ...tags, ...baseKW])].slice(0, 12).join(', ');
}
function renderBlock(b) {
  switch (b.t) {
    case 'h': return `<h2>${escB(b.v)}</h2>`;
    case 'p': return `<p>${escB(b.v).replace(/\n/g,'<br>')}</p>`;
    case 'list': return `<ul>${(b.items||[]).map(i=>`<li>${escB(i).replace(/\n/g,'<br>')}</li>`).join('')}</ul>`;
    case 'ol': return `<ol>${(b.items||[]).map(i=>`<li>${escB(i).replace(/\n/g,'<br>')}</li>`).join('')}</ol>`;
    case 'warning': case 'note': {
      const cls = b.t; const icon = b.t==='warning'?'⚠️ ВНИМАНИЕ!':'Примечание:';
      return `<div class="${cls}"><strong>${icon}</strong><br>${escB(b.v).replace(/\n/g,'<br>')}</div>`;
    }
    case 'indicator': return `<div class="indicator"><span class="indicator-num">${esc(b.num||'')}</span><div>${escB(b.v).replace(/\n/g,'<br>')}</div></div>`;
    case 'switch': return `<div class="switch"><span class="switch-icon">${esc(b.num||'')}</span><div>${escB(b.v).replace(/\n/g,'<br>')}</div></div>`;
    case 'figure': {
      const abs = b.src.startsWith('http')?b.src:`${BASE}/${b.src}`;
      return `<figure><img src="${esc(abs)}" alt="${esc(b.alt||b.caption||'')}"><figcaption>${escB(b.caption||b.alt||'')}</figcaption></figure>`;
    }
    case 'table': {
      const renderCell = (c,tag='td')=>{
        if(c==null)return`<${tag}></${tag}>`;
        if(typeof c!=='object')return`<${tag}>${escB(c).replace(/\n/g,'<br>')}</${tag}>`;
        const attrs=[];if(c.colspan)attrs.push(`colspan="${c.colspan}"`);if(c.rowspan)attrs.push(`rowspan="${c.rowspan}"`);
        if(c.th)tag='th';
        const img=c.img?`<img src="${esc(c.img.startsWith('http')?c.img:BASE+'/'+c.img)}" alt="${esc(c.alt||c.text||'')}" loading="lazy" style="max-width:100%;height:auto">`:'';
        const txt=c.text?escB(c.text).replace(/\n/g,'<br>'):'';
        return`<${tag}${attrs.length?' '+attrs.join(' '):''}>${img}${txt}</${tag}>`;
      };
      const headerRows = Array.isArray(b.headers)&&Array.isArray(b.headers[0])?b.headers:[b.headers];
      return`<table><thead>${headerRows.map(r=>`<tr>${r.map(c=>renderCell(c,'th')).join('')}</tr>`).join('')}</thead><tbody>${(b.rows||[]).map(r=>`<tr>${r.map(c=>renderCell(c,'td')).join('')}</tr>`).join('')}</tbody></table>`;
    }
    default: return '';
  }
}
function renderSection(section) {
  const desc = textPreview(section.blocks);
  const ogImg = firstImage(section.blocks);
  const url = `${BASE}/${section.path}`;
  const catSlug = section.path.split('/')[0];
  const catUrl = `${BASE}/${catSlug}/`;
  const tags = (section.tags||[]).slice(0,10).map(t=>`<span class="tag">${esc(t)}</span>`).join('');
  const content = section.blocks.map(renderBlock).join('\n      ');
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(section.title)} — LADA Samara</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="keywords" content="${esc(keywords(section))}">
  <link rel="canonical" href="${url}">
  <meta property="og:title" content="${esc(section.title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${ogImg}">
  <meta name="theme-color" content="#151515">
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:820px;margin:0 auto;padding:1rem 1rem 2rem;line-height:1.6;color:#222;background:#fff}
    h1{font-size:1.6rem;line-height:1.25;margin:.2rem 0 .6rem}h2{font-size:1.2rem;margin-top:1.5rem}
    .cat{color:#c99a2c;font-size:.82rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
    .breadcrumbs{font-size:.85rem;color:#666;margin-bottom:.6rem}.breadcrumbs a{color:#c99a2c;text-decoration:none}
    .warning{background:#fff5f5;border:1px solid #fcc;padding:.8rem 1rem;border-radius:8px;margin:.8rem 0;border-left:4px solid #e53e3e}
    .note{background:#f0fdf4;border:1px solid #c6f6d5;padding:.8rem 1rem;border-radius:8px;margin:.8rem 0;border-left:4px solid #38a169}
    table{width:100%;border-collapse:collapse;margin:.9rem 0;font-size:.9rem}th,td{border:1px solid #ddd;padding:.5rem .6rem;text-align:left;vertical-align:top}th{background:#f5f5f5}
    img{max-width:100%;height:auto;display:block;margin:0 auto}figure{margin:1rem 0;text-align:center}figcaption{font-size:.82rem;color:#777;padding-top:.35rem;line-height:1.4}
    a{color:#c99a2c;text-decoration:none}.tagline{display:flex;flex-wrap:wrap;gap:.35rem;margin:.2rem 0 .4rem}.tag{font-size:.75rem;background:#eee;color:#333;padding:.2rem .55rem;border-radius:99px}
    .indicator,.switch{display:flex;gap:.6rem;align-items:flex-start;margin:.5rem 0}
    .indicator-num,.switch-icon{flex:0 0 auto;min-width:1.6rem;height:1.6rem;border-radius:50%;background:#151515;color:#fff;font-size:.85rem;font-weight:700;display:inline-flex;align-items:center;justify-content:center}
    ol,ul{padding-left:1.4rem}p{margin:.55rem 0}
    .footer{margin-top:2rem;padding-top:1rem;border-top:1px solid #eee;font-size:.85rem;color:#777}
  </style>
  <script>
  (function(){
    var isBot=/bot|google|baidu|bing|msn|duckduckbot|teoma|slurp|yandex|facebookexternalhit|twitterbot|vkShare|mediatoolkitbot|whatsapp|telegrambot/i.test(navigator.userAgent);
    var isIndex=window.location.pathname.endsWith('index.html')||window.location.pathname.replace(/\\/+$/,'/').endsWith('/');
    if(!isBot&&!isIndex){
      var pathParts=window.location.pathname.split('/').filter(Boolean);
      var p=pathParts.slice(-2).join('/');
      var rootPath=window.location.pathname.replace(p,'');
      window.location.replace(window.location.origin+rootPath+'index.html#'+p);
    }
  })();
  </script>
</head>
<body>
  <p class="breadcrumbs"><a href="${BASE}/index.html">LADA Samara — руководство</a> › <a href="${catUrl}">${esc(section.category)}</a></p>
  <article>
    <div class="cat">${esc(section.category)}</div>
    <h1>${esc(section.title)}</h1>
    <div class="tagline">${tags}</div>
    ${content}
  </article>
  <div class="footer">LADA Samara — интерактивное офлайн-руководство владельца. Постоянная ссылка: <a href="${url}">${url}</a></div>
</body>
</html>`;
}
function renderRedirect(oldFile, newPath, title, desc, keywords) {
  const to = `${BASE}/${newPath}`;
  const sec = SECTIONS.find(s => s.path === newPath);
  const h1 = sec ? sec.title : title;
  // метаданные берём со СТАРОЙ страницы (сниппет в выдаче не меняется до переиндексации);
  // если описания не было — собираем из контента нового раздела
  const metaDesc = desc || (sec ? textPreview(sec.blocks) : '');
  const kw = (keywords || (sec ? (sec.tags || []).join(', ') : '')).replace(/[;.]\s*$/, '');
  const tags = kw ? kw.split(/[,;]\s*/).filter(Boolean).slice(0, 12)
    .map(t => `<span class="tag">${esc(t)}</span>`).join('') : '';
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(metaDesc)}">
  ${kw ? `<meta name="keywords" content="${esc(kw)}">` : ''}

  <!-- SEO-SAFE REDIRECT: canonical + noindex -->
  <link rel="canonical" href="${to}">
  <meta name="robots" content="noindex, follow">
  <meta name="yandex" content="noindex, follow">

  <!-- Open Graph -->
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(metaDesc)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:url" content="${to}">

  <meta name="theme-color" content="#151515">

  <!-- Styles in PWA manual style -->
  <style>
    body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:1rem;line-height:1.6;color:#222;background:#fff}
h1{font-size:1.5rem;margin:1rem 0}
.cat{color:#d99e0a;font-size:.8rem;font-weight:700;text-transform:uppercase}
.redirect-notice{background:#fff8e1;border:1px solid #ffe08a;padding:1rem;border-radius:8px;margin:1rem 0;display:flex;align-items:flex-start;gap:.75rem}
.redirect-notice strong{color:#d99e0a;display:block;margin-bottom:.25rem}
.redirect-link{display:inline-block;margin-top:.5rem;padding:.6rem 1.2rem;background:#d99e0a;color:#151515;text-decoration:none;border-radius:8px;font-weight:700;transition:all .2s}
.redirect-link:hover{background:#f2b21b;transform:translateY(-1px)}
.warning{background:#fff5f5;border:1px solid #fcc;padding:.8rem;border-radius:8px;margin:.8rem 0}
.note{background:#f0fdf4;border:1px solid #c6f6d5;padding:.8rem;border-radius:8px;margin:.8rem 0}
.tagline{display:flex;flex-wrap:wrap;gap:.3rem;margin:.75rem 0}
.tag{font-size:.75rem;background:#eee;padding:.2rem .5rem;border-radius:99px}
a{color:#d99e0a}
.back-link{display:inline-block;margin-top:1.5rem}
  </style>

  <!-- Soft redirect via JS after 10 seconds (only for real users, not bots) -->
  <script>
  (function(){
    var isBot=/bot|google|baidu|bing|msn|duckduckbot|teoma|slurp|yandex/i.test(navigator.userAgent);
    if(!isBot){
      setTimeout(function(){
        window.location.replace(${JSON.stringify(to)});
      }, 10000);
    }
  })();
  </script>
</head>
<body>
  <p><a href="${BASE}/index.html">← LADA Samara — руководство</a></p>
  <article>
    <div class="cat">РАЗДЕЛ ПЕРЕМЕЩЁН</div>
    <h1>${esc(h1)}</h1>

    <div class="redirect-notice">
      <div>
        <strong>📍 Этот раздел перемещён</strong>
        Актуальная версия этого руководства находится по новому адресу.
        <a href="${to}" class="redirect-link">Перейти к актуальной версии →</a>
      </div>
    </div>

    ${tags ? `<div class="tagline">${tags}</div>` : ''}

    <div class="note">
      <strong>ℹ️ Примечание:</strong>
      Содержимое этого раздела было перенесено в новую интерактивную версию руководства
      с улучшенным поиском и навигацией.
      <a href="${to}">Перейти к обновлённому разделу →</a>
    </div>

    <p class="back-link"><a href="${BASE}/index.html">← Вернуться к руководству</a></p>
  </article>
</body>
</html>`;
}
function cleanGenerated(){
  function walk(dir){
    for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
      const full=path.join(dir,entry.name);
      if(entry.isDirectory()){
        if(['icons','images','.git'].includes(entry.name)) continue;
        walk(full);
        try{fs.rmdirSync(full);}catch(e){}
      }else if(entry.isFile()&&entry.name.endsWith('.html')&&entry.name!=='index.html'){
        if(OLD_REDIRECT_NAMES.has(entry.name)&&dir===ROOT) continue; // стабы-редиректы не трогаем
        fs.unlinkSync(full);
      }
    }
  }
  walk(ROOT);
  for(const f of ['sitemap.xml','robots.txt']){
    try{fs.unlinkSync(path.join(ROOT,f));}catch(e){}
  }
}
function writeSitemap(){
  const today=new Date().toISOString().slice(0,10);
  const urls=[{loc:BASE+'/',priority:'1.0'},...SECTIONS.map(s=>({loc:BASE+'/'+s.path,priority:'0.7'}))];
  let sm='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for(const u of urls) sm+=`  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>\n`;
  sm+='</urlset>\n';
  fs.writeFileSync(path.join(ROOT,'sitemap.xml'),sm);
  fs.writeFileSync(path.join(ROOT,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${BASE}/sitemap.xml\n`);
}
function main(){
  cleanGenerated();
  for(const s of SECTIONS){
    fs.mkdirSync(path.dirname(path.join(ROOT,s.path)),{recursive:true});
    fs.writeFileSync(path.join(ROOT,s.path),renderSection(s),'utf8');
  }
  // стабы-редиректы со старых URL (шаблон как в разделах LADA Granta / Kalina)
  const known=new Set(SECTIONS.map(s=>s.path));
  for(const [oldFile,to,title,desc,keywords] of OLD_REDIRECTS){
    if(!known.has(to)) console.warn(`⚠️  цель редиректа не найдена: ${oldFile} -> ${to}`);
    if(oldFile==='index.html'){ console.warn('⚠️  index.html нельзя перезаписывать стабом:',oldFile); continue; }
    fs.writeFileSync(path.join(ROOT,oldFile),renderRedirect(oldFile,to,title,desc,keywords),'utf8');
  }
  writeSitemap();
  console.log(`Generated ${SECTIONS.length} SEO pages + ${OLD_REDIRECTS.length} legacy redirects + sitemap.xml + robots.txt`);
}
main();
