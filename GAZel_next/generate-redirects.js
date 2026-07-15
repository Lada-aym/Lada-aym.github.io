#!/usr/bin/env node
/**
 * Генератор редиректов со старых страниц на новые SEO-страницы
 * Создает HTML-файлы с meta refresh для мгновенного перенаправления
 */

const fs = require('fs');
const path = require('path');
const REDIRECTS = require('./redirects-map.js');

const BASE_URL = 'https://lada-aym.github.io/GAZel_next';

function generateRedirectPage(oldPath, newPath) {
  const newUrl = `${BASE_URL}/${newPath}`;
  
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="0; url=${newUrl}">
  <title>Перенаправление...</title>
  <meta name="robots" content="noindex">
  <link rel="canonical" href="${newUrl}">
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 600px;
      margin: 2rem auto;
      padding: 1rem;
      text-align: center;
      color: #333;
    }
    a {
      color: #d99e0a;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <h1>Перенаправление...</h1>
  <p>Если вы не были перенаправлены автоматически, <a href="${newUrl}">перейдите по этой ссылке</a>.</p>
  <script>
    window.location.replace("${newUrl}");
  </script>
</body>
</html>`;
}

console.log('🚀 Генерация редиректов со старых страниц на новые...\n');

let created = 0;
let errors = 0;

for (const redirect of REDIRECTS) {
  const oldPath = redirect.old;
  const newPath = redirect.new;
  
  const fullPath = path.join(__dirname, oldPath);
  
  try {
    // Генерируем HTML
    const html = generateRedirectPage(oldPath, newPath);
    fs.writeFileSync(fullPath, html, 'utf-8');
    created++;
    console.log(`✓ ${oldPath} → ${newPath}`);
  } catch (err) {
    errors++;
    console.error(`✗ Ошибка при создании ${oldPath}: ${err.message}`);
  }
}

console.log(`\n✅ Готово! Создано редиректов: ${created}`);
if (errors > 0) {
  console.log(`❌ Ошибок: ${errors}`);
}

console.log('\n📋 Что было сделано:');
console.log('   • Созданы HTML-файлы для всех старых страниц');
console.log('   • Каждый файл содержит meta refresh для мгновенного редиректа');
console.log('   • Добавлен JavaScript fallback для браузеров без meta refresh');
console.log('   • Установлен canonical URL на новую страницу (для SEO)');
console.log('   • Добавлен noindex чтобы поисковики не индексировали редиректы');

console.log('\n🎯 Как это работает:');
console.log('   1. Пользователь заходит на старую страницу (например, opisanie1.html)');
console.log('   2. Браузер мгновенно перенаправляется на новую страницу');
console.log('   3. Поисковые боты видят canonical URL и обновляют индексы');

console.log('\n📤 Следующий шаг:');
console.log('   Задеплойте все файлы (включая новые редиректы) на GitHub Pages.');
