#!/usr/bin/env node
/**
 * Генератор красивых 404 страниц в стиле PWA SEO
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://lada-aym.github.io/GAZel_next';

function generate404Page(pageName, pageNumber) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Страница не найдена — GAZelle Next</title>
  <meta name="description" content="Запрашиваемая страница руководства по эксплуатации GAZelle Next не найдена. Вернитесь на главную страницу для поиска нужной информации.">
  <meta name="robots" content="noindex">
  <link rel="canonical" href="${BASE_URL}/">
  <meta property="og:title" content="Страница не найдена">
  <meta property="og:description" content="Запрашиваемая страница руководства по эксплуатации GAZelle Next не найдена.">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ru_RU">
  <meta name="theme-color" content="#151515">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #0f0f10 0%, #1a1a1f 100%);
      color: #f4f4f5;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      text-align: center;
    }
    .container {
      max-width: 600px;
      background: rgba(24, 25, 27, 0.88);
      border: 1px solid #34363b;
      border-radius: 18px;
      padding: 3rem 2rem;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28);
    }
    .error-code {
      font-size: 6rem;
      font-weight: 900;
      background: linear-gradient(135deg, #f2b21b, #ffe08a);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.75rem;
      margin-bottom: 1rem;
      color: #ffe08a;
    }
    p {
      color: #b9bcc3;
      line-height: 1.6;
      margin-bottom: 2rem;
    }
    .search-box {
      margin: 2rem 0;
      padding: 1.5rem;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 14px;
      border: 1px solid #34363b;
    }
    .search-box h2 {
      font-size: 1.1rem;
      margin-bottom: 1rem;
      color: #f4f4f5;
    }
    .search-links {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: center;
    }
    .search-links a {
      padding: 0.5rem 1rem;
      background: rgba(242, 178, 27, 0.1);
      border: 1px solid rgba(242, 178, 27, 0.3);
      border-radius: 999px;
      color: #ffe08a;
      text-decoration: none;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .search-links a:hover {
      background: rgba(242, 178, 27, 0.2);
      border-color: #f2b21b;
      transform: translateY(-2px);
    }
    .btn-home {
      display: inline-block;
      padding: 0.85rem 2rem;
      background: #f2b21b;
      color: #151515;
      text-decoration: none;
      border-radius: 999px;
      font-weight: 700;
      font-size: 1rem;
      transition: all 0.2s;
      margin-top: 1rem;
    }
    .btn-home:hover {
      background: #ffe08a;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(242, 178, 27, 0.3);
    }
    .info {
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #34363b;
      font-size: 0.85rem;
      color: #65666f;
    }
    @media (prefers-color-scheme: light) {
      body {
        background: linear-gradient(135deg, #f0f1f4 0%, #e5e6ea 100%);
        color: #1a1a1f;
      }
      .container {
        background: rgba(255, 255, 255, 0.95);
        border-color: #d2d3da;
      }
      h1 {
        color: #d99e0a;
      }
      p {
        color: #65666f;
      }
      .search-box {
        background: rgba(0, 0, 0, 0.03);
        border-color: #d2d3da;
      }
      .search-box h2 {
        color: #1a1a1f;
      }
      .search-links a {
        background: rgba(217, 158, 10, 0.1);
        border-color: rgba(217, 158, 10, 0.3);
        color: #d99e0a;
      }
      .search-links a:hover {
        background: rgba(217, 158, 10, 0.2);
        border-color: #d99e0a;
      }
      .btn-home {
        background: #d99e0a;
        color: #151515;
      }
      .btn-home:hover {
        background: #b8850a;
      }
      .info {
        border-top-color: #d2d3da;
        color: #65666f;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="error-code">404</div>
    <h1>Страница не найдена</h1>
    <p>К сожалению, запрашиваемая вами страница руководства по эксплуатации GAZelle Next не существует или была перемещена.</p>
    
    <div class="search-box">
      <h2>Возможно, вы искали:</h2>
      <div class="search-links">
        <a href="${BASE_URL}/">Главная страница</a>
        <a href="${BASE_URL}/#pered-nachalom-ekspluatacii">Перед началом эксплуатации</a>
        <a href="${BASE_URL}/#ekspluataciya-avtomobilya">Эксплуатация автомобиля</a>
        <a href="${BASE_URL}/#tehnicheskoe-obsluzhivanie">Техническое обслуживание</a>
        <a href="${BASE_URL}/#prakticheskie-sovety">Практические советы</a>
      </div>
    </div>
    
    <a href="${BASE_URL}/" class="btn-home">Вернуться на главную</a>
    
    <div class="info">
      <p>Если вы перешли по ссылке из поисковой системы, пожалуйста, сообщите нам об этом.</p>
      <p>Интерактивное руководство по эксплуатации GAZelle Next</p>
    </div>
  </div>
  
  <script>
    // Автоматическое перенаправление через 30 секунд
    setTimeout(function() {
      const redirectUrl = '${BASE_URL}/';
      const countdown = document.createElement('p');
      countdown.style.cssText = 'margin-top:1rem;color:#f2b21b;font-size:0.9rem;';
      document.body.appendChild(countdown);
      
      let seconds = 30;
      const timer = setInterval(function() {
        seconds--;
        countdown.textContent = 'Автоматическое перенаправление через ' + seconds + ' сек...';
        if (seconds <= 0) {
          clearInterval(timer);
          window.location.replace(redirectUrl);
        }
      }, 1000);
    }, 3000);
  </script>
</body>
</html>`;
}

// Список файлов для создания
const FILES_TO_CREATE = [
  // Ekspluatatsiya (пропущенные номера)
  { name: 'ekspluatatsiya4⚠️.html', number: 4 },
  { name: 'ekspluatatsiya5⛔.html', number: 5 },
  { name: 'ekspluatatsiya6⛔.html', number: 6 },
  { name: 'ekspluatatsiya8⛔.html', number: 8 },
  { name: 'ekspluatatsiya10⛔.html', number: 10 },
  
  // Obeduzhivanie (пропущенные номера)
  { name: 'obsluzhivanie2⛔.html', number: 2 },
  { name: 'obsluzhivanie5⛔.html', number: 5 },
  { name: 'obsluzhivanie10⛔.html', number: 10 },
  
  // Opisanie (пропущенные номера)
  { name: 'opisanie6⛔.html', number: 6 },
  
  // Tekhnicheskaya-harakteristika (пропущенные номера)
  { name: 'tehnicheskaya-harakteristika2⛔.html', number: 2 }
];

console.log('🎨 Генерация красивых 404 страниц в стиле PWA...\n');

let created = 0;
let errors = 0;

for (const file of FILES_TO_CREATE) {
  const filePath = path.join(__dirname, file.name);
  
  try {
    const html = generate404Page(file.name, file.number);
    fs.writeFileSync(filePath, html, 'utf-8');
    created++;
    console.log(`✓ ${file.name}`);
  } catch (err) {
    errors++;
    console.error(`✗ Ошибка при создании ${file.name}: ${err.message}`);
  }
}

console.log(`\n✅ Готово! Создано 404 страниц: ${created}`);
if (errors > 0) {
  console.log(`❌ Ошибок: ${errors}`);
}

console.log('\n🎯 Особенности созданных страниц:');
console.log('   • Современный дизайн в стиле PWA');
console.log('   • Поддержка светлой и тёмной темы');
console.log('   • Адаптивная верстка для мобильных устройств');
console.log('   • Быстрые ссылки на основные разделы');
console.log('   • Автоматическое перенаправление на главную через 30 секунд');
console.log('   • SEO-оптимизация (noindex, canonical)');
console.log('   • Красивая анимация и градиенты');
