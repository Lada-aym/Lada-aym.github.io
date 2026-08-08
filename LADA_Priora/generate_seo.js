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
const BASE = 'https://lada-aym.github.io/LADA_Priora';
const OG_DEFAULT = `${BASE}/images/og-cover.svg`;
const SECTIONS = vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') + '; SECTIONS;');

/* ---------------------------------------------------------------------------
   Редиректы со СТАРЫХ URL сайта (корень раздела) на новые SEO-страницы.
   Формат: [старое имя файла, целевой путь нового SEO-раздела, title старой страницы].
   Имена взяты со старого сайта (см. <title> старых страниц), в т.ч. «opisanie2 .html»
   с пробелом — это реальный исторический URL: /LADA_Priora/opisanie2%20.html
   --------------------------------------------------------------------------- */
const OLD_REDIRECTS = [
  ["ekspluatatsiya1.html", "ekspluatatsiya/osnovy-bezopasnoy-ekspluatatsii.html", "Основы безопасной эксплуатации автомобиля LADA Priora", "Рекомендации по эксплуатации автомобиля для повышения безопасности и сохранения транспортного средства в исправном состоянии.", "LADA Priora, эксплуатация автомобиля, безопасность, рекомендации, техническое обслуживание."],
  ["ekspluatatsiya2.html", "ekspluatatsiya/pusk-dvigatelya.html", "Запуск двигателя LADA Priora: рекомендации и особенности", "Узнайте, как правильно запустить двигатель LADA Priora, следуя рекомендациям и учитывая особенности холодного времени года.", "LADA Priora, запуск двигателя, холодный пуск, рекомендации, особенности."],
  ["ekspluatatsiya3.html", "ekspluatatsiya/dvizhenie-avtomobilya.html", "Движение автомобиля LADA Priora: советы и рекомендации", "Узнайте, как правильно прогревать двигатель и коробку передач, особенности движения зимой и в горной местности.", "LADA Priora, движение автомобиля, прогрев двигателя, коробка передач, зима, горная местность."],
  ["ekspluatatsiya4.html", "ekspluatatsiya/tormozhenie-i-stoyanka-abs.html", "LADA Priora: Торможение и стоянка", "Узнайте, как правильно тормозить на LADA Priora, избегая блокировки колес и обеспечивая курсовую устойчивость. Получите советы по использованию ABS и EBD для минимизации тормозного пути. Узнайте о важности правильной стоянки и буксировки автомобиля.", "LADA Priora, торможение, ABS, EBD, парковка, буксировка."],
  ["obsluzhivanie1.html", "to/tehnicheskoe-obsluzhivanie-i-tekuschiy-remont-avtomobilya.html", "Обслуживание и ремонт LADA Priora: советы и рекомендации", "В этой статье приведены подробные инструкции по техническому обслуживанию и ремонту автомобиля LADA Priora. Особое внимание уделено системе смазки двигателя, проверке уровня масла в картере и коробке передач, системе охлаждения двигателя и тормозной системе.", "LADA Priora, техническое обслуживание, ремонт, автомобиль, система смазки двигателя, проверка уровня масла, коробка передач, система охлаждения двигателя, тормозная система."],
  ["obsluzhivanie2.html", "to/gidrousilitel-rulya-obsluzhivanie.html", "Гидроусилитель руля Lada Priora: обслуживание и устранение неисправностей", "В статье рассказывается о важности регулярного контроля уровня рабочей жидкости в гидроусилителе руля Lada Priora и обслуживания аккумуляторной батареи.", "Lada Priora, гидроусилитель руля, обслуживание, неисправности, рабочая жидкость, аккумуляторная батарея, электролит, уровень жидкости, дилеры LADA, техническое обслуживание, гарантийный ремонт."],
  ["obsluzhivanie3.html", "to/zamena-koles.html", "Замена колёс и уход за шинами в LADA Priora", "Советы по уходу за шинами, таблица рекомендованного давления, замена колёс и советы по безопасности.", "LADA Priora, замена колёс, уход за шинами, давление в шинах, безопасность."],
  ["obsluzhivanie4.html", "to/zamena-elementa-pitaniya-pulta-du.html", "Замена элемента питания пульта дистанционного управления Lada Priora: инструкция и рекомендации", "замена элемента питания пульта дистанционного управления Lada Priora.", "Lada Priora, замена элемента питания, пульт дистанционного управления, литиевый элемент питания, CR2032, напряжение питания, индикатор, порядок действий, замена элемента питания, последовательность действий."],
  ["obsluzhivanie5.html", "to/predohraniteli-i-montazhnyy-blok.html", "Как заменить плавкие предохранители в LADA Priora", "Замена плавких предохранителей в LADA Priora: руководство по безопасности и устранению неисправностей.", "замена плавких предохранителей, LADA Priora, монтажный блок, плавкие предохранители, безопасность автомобиля, эксплуатация автомобиля."],
  ["obsluzhivanie6.html", "to/kuzov-uhod-i-remont.html", "Уход за кузовом и салоном автомобиля LADA Priora", "Информация об уходе за кузовом и салоном автомобиля LADA Priora, включая рекомендации по мойке, уходу за лакокрасочным покрытием, хранению и обслуживанию автомобиля.", "LADA Priora, уход за автомобилем, кузов, салон, мойка, лакокрасочное покрытие, хранение, обслуживание."],
  ["obsluzhivanie7.html", "to/zamena-lamp.html", "Замена ламп в LADA Priora: типы ламп, инструкции и рекомендации", "LADA Priora, замена ламп, рекомендации по замене ламп, блок-фары, типы ламп, инструкция, безопасность", "LADA Priora, замена ламп, блок-фары, типы ламп, инструкция, безопасность;"],
  ["opisanie1.html", "kuzov-i-salon/sistema-distantsionnogo-upravleniya.html", "LADA Granta: Ключи, выключатель зажигания и иммобилизатор — руководство по использованию", "LADA Granta: информация о ключах автомобиля, выключателе зажигания и иммобилизаторе. Описание рабочего и обучающего ключей, их функции и правила хранения. Как пользоваться выключателем зажигания и работать с иммобилизатором для защиты автомобиля от несанкционированного доступа.", "LADA Granta, ключи Granta, рабочий ключ Granta, обучающий ключ Granta, выключатель зажигания Granta, иммобилизатор Granta, защита автомобиля Granta, запуск двигателя Granta, хранение ключей Granta, использование иммобилизатора Granta, безопасность Granta"],
  ["opisanie2 .html", "kuzov-i-salon/dveri.html", "Особенности конструкции и управления дверями, стеклами и зеркалами в LADA Priora", "В статье описывается устройство и особенности работы дверей, электростеклоподъемников и электропривода наружных зеркал в автомобилях LADA Priora. Также упоминается возможность блокировки замков передних и задних дверей, а также использование пульта дистанционного управления для управления замками и стеклами.", "LADA Priora, передние двери, задние двери, электростеклоподъемники, пульт дистанционного управления, блокировка замков, электропривод наружных зеркал."],
  ["opisanie3.html", "kuzov-i-salon/sidenya.html", "Передние и задние сиденья LADA Priora", "Информация о регулировке передних и задних сидений, подголовниках, обогреве и трансформации задних сидений автомобиля LADA Priora.", "LADA Priora, передние сиденья, задние сиденья, подголовники, обогрев сидений, трансформация сидений."],
  ["opisanie4.html", "kuzov-i-salon/remni-i-podushki-bezopasnosti.html", "Ремни безопасности и подушки безопасности в автомобиле LADA Priora", "В статье рассказывается о ремнях безопасности и подушках безопасности в автомобиле LADA Priora. Приводятся инструкции по использованию ремней безопасности и правила поведения при авариях. Также описывается принцип работы подушек безопасности и их роль в обеспечении безопасности водителя и пассажиров.", "LADA Priora, ремни безопасности, подушки безопасности, безопасность автомобиля, аварии, защита водителя и пассажиров."],
  ["opisanie5.html", "kuzov-i-salon/regulirovka-polozheniya-rulevogo-kolesa.html", "LADA Priora: регулировка положения рулевого колеса, электростеклоподъёмники, зеркала с электроприводом", "LADA Priora: регулировка положения рулевого колеса, электростеклоподъёмники, зеркала с электроприводом, внутреннее зеркало, контейнер для хранения, датчик дождя, прикуриватель, выключатель замка багажника, вещевой ящик, радиоприёмник и проигрыватель звуковых файлов", "LADA Priora, оборудование салона, регулировка положения рулевого колеса, электростеклоподъёмники, зеркала с электроприводом, внутреннее зеркало, контейнер для хранения, датчик дождя, прикуриватель, выключатель замка багажника, вещевой ящик, радиоприёмник, проигрыватель звуковых файлов;"],
  ["opisanie6.html", "kuzov-i-salon/kapot.html", "Капот автомобиля LADA Priora: инструкция по открытию и закрытию", "LADA Priora, капот автомобиля, доступ в моторный отсек, рукоятка, панель приборов, предохранительный крючок, упор, держатель, основание крыла, закрытие капота, щелчок, фиксация, держатель, дети, очиститель ветрового стекла, безопасность.", "LADA Priora, капот, автомобиль, моторный отсек, рукоятка, панель приборов, левая сторона, предохранительный крючок, упор, держатель, основание крыла, закрытие капота, тяжесть, щелчок, безопасность."],
  ["opisanie7.html", "organy-upravleniya/organy-upravleniya-i-pribory.html", "Органы управления LADA Priora: приборная панель и основные элементы управления", "LADA Priora, органы управления, описание приборной панели и органов управления", "LADA Priora, панель приборов, управление автомобилем, безопасность;"],
  ["opisanie8.html", "organy-upravleniya/kombinatsiya-priborov.html", "Комбинация приборов Lada Priora: описание и функции", "Описание комбинации приборов автомобиля Lada Priora, включая сигнализаторы, индикаторы и жидкокристаллический дисплей.", "Lada Priora, комбинация приборов, сигнализаторы, индикаторы, жидкокристаллический дисплей."],
  ["opisanie9.html", "organy-upravleniya/kruiz-kontrol-i-ogranichitel-skorosti.html", "Функции подрулевых переключателей LADA Priora: установка часов, круиз-контроль и ограничитель скорости", "Подрулевые переключатели, функции бортового компьютера, установка часов, принцип работы круиз-контроля и ограничителя скорости", "LADA Priora, подрулевые переключатели, функции бортового компьютера, установка часов, круиз-контроль, ограничитель скорости;"],
  ["opisanie10.html", "kuzov-i-salon/oborudovanie-salona.html", "LADA Priora: основные компоненты и их функции", "Узнайте о выключателе зажигания, модуле управления светотехникой, переключателе световой сигнализации, переключателе стеклоочистителей и рычаге переключения передач в автомобиле LADA Priora.", "LADA Priora, выключатель зажигания, модуль управления светотехникой, переключатель световой сигнализации, переключатель стеклоочистителей, рычаг переключения передач."],
  ["opisanie11.html", "organy-upravleniya/upravlenie-sistemoy-otopleniya-i-ventilyatsii-salona.html", "Управление вентиляцией и отоплением салона Lada Priora", "Управление вентиляцией и отоплением салона Lada Priora, поворотные переключатели, предпусковой подогреватель, воздухозаборник, воздушный фильтр, центральные и боковые сопла вентиляции, отопление салона, предотвращение запотевания и обмерзания стёкол, кондиционирование (в некоторых версиях), техническое обслуживание, стеклоочистители.", "Lada Priora, вентиляция, отопление, предпусковой подогреватель, воздухозаборник, воздушный фильтр, сопла вентиляции, обогрев стёкол, кондиционирование, техническое обслуживание, стеклоочистители."],
  ["opisanie12.html", "organy-upravleniya/marshrutnyy-kompyuter.html", "LADA Priora: маршрутный компьютер", "информация о маршрутных компьютерах, их функциях и возможностях.", "LADA Priora, маршрутный компьютер, функции, возможности, дисплей, индикация времени, расход топлива, скорость, температура."],
  ["opisanie13.html", "to/avtomatizirovannaya-transmissiya-amt.html", "LADA Priora с автоматизированной коробкой передач: комфорт и контроль на дороге", "LADA Priora с автоматизированной коробкой передач предлагает комфортное вождение с минимальными усилиями благодаря автоматической системе переключения передач. Водитель может выбирать между автоматическим режимом (А), который обеспечивает плавное переключение передач в зависимости от скорости и оборотов двигателя, и мануальным режимом (М), позволяющим самостоятельно переключать передачи вверх или вниз.", "LADA Priora, автоматизированная коробка передач, трансмиссия АМТ, автоматический режим, мануальный режим, переключение передач, сцепление, безопасность, диагностика."],
  ["prilozheniya.html", "prilozheniya/prilozhenie-1-toplivo-i-motornye-masla.html", "Особенности топлива, моторного масла и ламп для автомобиля LADA Priora", "LADA Priora, топливо, моторное масло, лампы, свечи зажигания.", "LADA Priora, топливо, моторное масло, лампы, свечи зажигания, неэтилированный бензин, моторное масло 5W-40, API SL/CF, ACEA A3/B4, лампы H7, H1, PY21W, W5W, H11, P21W, фонарь освещения номерного знака, плафон освещения багажника, плафон освещения салона, освещение вещевого ящика, свечи зажигания Denso Iridium Power."],
  ["tehnicheskaya-harakteristika1.html", "harakteristiki/osnovnye-parametry-i-razmery.html", "LADA Priora: основные параметры и размеры автомобилей семейства LADA Priora", "LADA Priora, основные эксплуатационные параметры и размеры, габаритные размеры автомобилей семейства", "LADA Priora, Priora, габариты, размеры, автомобили, семейство LADA Priora."],
  ["tehnicheskaya-harakteristika2.html", "harakteristiki/fakticheskiy-rashod-topliva.html", "Расход топлива LADA Priora: реальный и заявленный", "Узнайте, как снизить расход топлива LADA Priora и какие факторы влияют на него.", "LADA Priora, расход топлива, эксплуатация, советы, рекомендации, экономия."],
  ["tehnicheskaya-harakteristika3.html", "harakteristiki/pasportnye-dannye.html", "LADA Priora: паспортные данные и технические характеристики", "Узнайте больше о модели LADA Priora, её паспортных данных и технических характеристиках.", "LADA Priora, автомобиль, технические характеристики, паспортные данные, безопасность, колёсные транспортные средства."],
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
  const baseKW = ['LADA Priora', 'Лада Приора', 'руководство по эксплуатации'];
  const tags = (section.tags||[]).filter(t => t !== section.title && t !== 'LADA Priora');
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
  <title>${esc(section.title)} — LADA Priora</title>
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
  <p class="breadcrumbs"><a href="${BASE}/index.html">LADA Priora — руководство</a> › <a href="${catUrl}">${esc(section.category)}</a></p>
  <article>
    <div class="cat">${esc(section.category)}</div>
    <h1>${esc(section.title)}</h1>
    <div class="tagline">${tags}</div>
    ${content}
  </article>
  <div class="footer">LADA Priora — интерактивное офлайн-руководство владельца. Постоянная ссылка: <a href="${url}">${url}</a></div>
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
  <p><a href="${BASE}/index.html">← LADA Priora — руководство</a></p>
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
