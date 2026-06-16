/* =========================================================================
   📦 OSApp CORE SYSTEM — GLOBAL PRODUCTION MONOLITH JAVASCRIPT
   ========================================================================= */
let osModelFolder = '/';
let isGitHubPages = false;
let cachedMenuData = null; 

document.addEventListener('DOMContentLoaded', () => {
  // 1. Сразу запускаем ленивую загрузку сквозных метрик и рекламы (через 5 секунд)
  initLazyScripts();

  // 2. Определяем окружение (Локальный сервер Android или GitHub Pages)
  const startPath = window.location.pathname.toLowerCase();
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  
  if (pathSegments.length > 0 && startPath.includes('/' + pathSegments[0].toLowerCase() + '/')) {
    osModelFolder = `/${pathSegments[0]}/`;
    isGitHubPages = true;
  } else {
    osModelFolder = '/';
    isGitHubPages = false;
  }
  console.log("[OSApp] Окружение зафиксировано. Корень модели: " + osModelFolder + ", GitHub Pages: " + isGitHubPages);

  // 3. Инициализируем модули ядра
  initMobileMenu();
  initPWARouter();
});

/* -------------------------------------------------------------------------
   ⏱️ ЛЕНИВАЯ ЗАГРУЗКА (Lazy Loading — Срабатывает строго через 5 секунд)
   ------------------------------------------------------------------------- */
function initLazyScripts() {
  window.gtmInitialized = false;
  window.adsInitialized = false;

  setTimeout(() => {
    // =========================================================================
    // 📊 ИНИЦИАЛИЗАЦИЯ GOOGLE TAG MANAGER
    // =========================================================================
    if (!window.gtmInitialized) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

      const gtmScript = document.createElement('script');
      gtmScript.async = true;
      gtmScript.src = 'https://www.googletagmanager.com/gtm.js?id=GTM-PRQ33NW3';
      
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(gtmScript, firstScript);
      } else {
        document.head.appendChild(gtmScript);
      }
      window.gtmInitialized = true;
      console.log('LazyLoad: GTM успешно запущен.');
    }

    // =========================================================================
    // 🌟 ПОДКЛЮЧЕНИЕ РЕАЛЬНЫХ ФИКСИРОВАННЫХ БЛОКОВ РСЯ (БЕЗ AUTO-PLACEMENT)
    // =========================================================================
    if (!window.adsInitialized) {
      window.yaContextCb = window.yaContextCb || [];

      if (!document.getElementById('yandex-context-script')) {
        const yandexContext = document.createElement('script');
        yandexContext.id = 'yandex-context-script';
        yandexContext.async = true;
        yandexContext.src = "https://yandex.ru/ads/system/context.js";
        
        yandexContext.onload = () => {
          console.log('[OSApp РСЯ] Базовый контекст загружен. Запускаем первый рендер рекламы...');
          window.adsInitialized = true;
          
          renderGlobalAds();
          initInImageAds();
        };
        document.head.appendChild(yandexContext);
      } else {
        window.adsInitialized = true;
        renderGlobalAds();
        initInImageAds();
      }
    }
  }, 5000);
}

/* -------------------------------------------------------------------------
   🚀 ПЕРЕЗАПУСК СКВОЗНЫХ БЛОКОВ РСЯ (FloorAd и Fullscreen) ПРИ СМЕНЕ СТРАНИЦ
   ------------------------------------------------------------------------- */
function renderGlobalAds() {
  if (!window.Ya || !window.Ya.Context) return;

  console.log('[OSApp РСЯ] Перезапуск сквозных форматов для текущего URL...');

  window.yaContextCb.push(() => {
    // 1. FloorAd для мобильных
    Ya.Context.AdvManager.render({ "blockId": "R-A-537370-36", "type": "floorAd", "platform": "touch" });
    // 2. FloorAd для ПК
    Ya.Context.AdvManager.render({ "blockId": "R-A-537370-44", "type": "floorAd", "platform": "desktop" });
    // 3. Fullscreen для мобильных
    Ya.Context.AdvManager.render({ "blockId": "R-A-537370-35", "type": "fullscreen", "platform": "touch" });
    // 4. Fullscreen для ПК
    Ya.Context.AdvManager.render({ "blockId": "R-A-537370-43", "type": "fullscreen", "platform": "desktop" });
  });
}

/* -------------------------------------------------------------------------
   🖼️ СИСТЕМА ИНТЕГРАЦИИ РЕКЛАМЫ В ИЗОБРАЖЕНИЯ (InImage Блок: R-A-537370-42)
   ------------------------------------------------------------------------- */
function initInImageAds() {
  if (!window.Ya || !window.Ya.Context) return;

  const render = (imageId) => {
    window.yaContextCb.push(() => {
      Ya.Context.AdvManager.render({
        "renderTo": imageId,
        "blockId": "R-A-537370-42",
        "type": "inImage"
      });
    });
  };

  const renderInImage = (images) => {
    if (!images.length) return;
    const image = images.shift();

    if (image.id && image.id.startsWith('yandex_rtb_R-A-537370-42-')) {
      renderInImage(images);
      return;
    }

    if (image.hasAttribute('loading') && image.getAttribute('loading') === 'lazy') {
      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            image.id = `yandex_rtb_R-A-537370-42-${Math.random().toString(16).slice(2)}`;
            render(image.id);
            observer.unobserve(entry.target);
          }
        });
      });
      observer.observe(image);
    } else {
      image.id = `yandex_rtb_R-A-537370-42-${Math.random().toString(16).slice(2)}`;
      if (image.tagName === "IMG" && !image.complete) {
        image.addEventListener("load", () => {
          render(image.id);
        }, { once: true });
      } else {
        render(image.id);
      }
    }
    renderInImage(images);
  };

  const stage = document.getElementById('appMainStage');
  if (stage) {
    renderInImage(Array.from(stage.querySelectorAll("img")));
  }
}

/* -------------------------------------------------------------------------
   1. УПРАВЛЕНИЕ МОБИЛЬНЫМ МЕНЮ (БУРГЕР, ШТОРКА И ОВЕРЛЕЙ)
   ------------------------------------------------------------------------- */
function initMobileMenu() {
  const burgerBtn = document.getElementById('menuToggleBtn');
  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('sidebarOverlay');

  if (!burgerBtn || !sidebar || !overlay) return;

  burgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    burgerBtn.classList.toggle('open');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
    document.body.classList.toggle('os-lock');
  });

  overlay.addEventListener('click', () => {
    burgerBtn.classList.remove('open');
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    document.body.classList.remove('os-lock');
  });

  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      burgerBtn.classList.remove('open');
      sidebar.classList.remove('open');
      overlay.classList.remove('active');
      document.body.classList.remove('os-lock');
    }
  });
}

/* -------------------------------------------------------------------------
   2. SPA-РОУТЕР, АВТО-ШАПКА И ДИНАМИЧЕСКАЯ СБОРКА КАРКАСА ИЗ JSON
   ------------------------------------------------------------------------- */
function initPWARouter() {
  const accordionMenu = document.getElementById('accordionMenu');
  const headerTitleContainer = document.getElementById('headerModelTitle');

  if (!accordionMenu) return;

  function ensureAbsolute(path) {
    let clean = ('/' + osModelFolder + '/' + path).replace(/\/+/g, '/');
    const segments = window.location.pathname.split('/').filter(Boolean);
    
    if (!isGitHubPages && segments.length > 0 && clean.toLowerCase().startsWith('/' + segments[0].toLowerCase() + '/')) {
      clean = clean.replace(new RegExp('^\\/' + segments[0], 'i'), '').replace(/\/+/g, '/');
    }
    return clean;
  }

  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const currentFolderFromUrl = pathSegments.length > 0 ? pathSegments[0].toLowerCase() : '';

  fetch('/assets/data/site-data.json')
    .then(res => res.ok ? res.json() : null)
    .then(siteData => {
      if (!siteData || !siteData.models) return;
      
      const currentModel = siteData.models.find(m => m.folder.toLowerCase().includes(currentFolderFromUrl));
      
      if (currentModel && headerTitleContainer) {
        headerTitleContainer.textContent = currentModel.name;
        const currentPath = window.location.pathname.toLowerCase().replace(/\/+/g, '/');
        const modelFolderClean = osModelFolder.toLowerCase().replace(/\/+/g, '/');
        if (currentPath === modelFolderClean || currentPath === '/' || currentPath === '/index.html') {
          renderModelHome();
        }
      }
    })
    .catch(err => console.warn('Предупреждение чтения site-data.json:', err));

  const menuJsonUrl = ensureAbsolute('assets/data/menu.json');
  
  fetch(menuJsonUrl)
    .then(response => {
      if (!response.ok) throw new Error('Не найден menu.json');
      return response.json();
    })
    .then(menuData => {
      cachedMenuData = menuData;
      let menuHtml = '';

      menuData.forEach((section, sIdx) => {
        const sectionTitle = section.title || `Раздел ${sIdx + 1}`;
        menuHtml += `
          <div class="sidebar-item" data-index="${sIdx}">
            <button class="sidebar-toggle">${sectionTitle}</button>
            <div class="sidebar-content">
        `;
        if (section.items && section.items.length > 0) {
          section.items.forEach(item => {
            const webPath = ('/' + osModelFolder + '/' + item.path).replace(/\/+/g, '/');
            menuHtml += `<a href="${webPath}">${item.title}</a>`;
          });
        }
        menuHtml += `
            </div>
          </div>
        `;
      });

      accordionMenu.innerHTML = menuHtml;
      initAccordionLogic();
      bindSPALinks();
      routeCurrentPath();
    })
    .catch(error => {
      console.error('Критическая ошибка построения меню:', error);
      accordionMenu.innerHTML = `<div style="color:#ff4d4d; padding:16px; font-size:12px;">Ошибка карты мануала</div>`;
    });

  function initAccordionLogic() {
    const toggles = accordionMenu.querySelectorAll('.sidebar-toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        const currentItem = toggle.closest('.sidebar-item');
        const isActive = currentItem.classList.contains('active');

        accordionMenu.querySelectorAll('.sidebar-item').forEach(item => {
          item.classList.remove('active');
        });

        if (!isActive) {
          currentItem.classList.add('active');
        }
      });
    });
  }

  function bindSPALinks() {
    document.body.addEventListener('click', (e) => {
      const targetLink = e.target.closest('a');
      if (!targetLink) return;

      const href = targetLink.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('#')) return;

      const cleanHref = href.toLowerCase().trim();
      const linkText = targetLink.textContent.toLowerCase().trim();
      
      if (
        cleanHref === '/' || 
        cleanHref === '/index.html' || 
        cleanHref.startsWith('/?') || 
        cleanHref.includes('garage') ||
        linkText === 'главная' || 
        targetLink.classList.contains('sidebar-back-btn')
      ) {
        return; 
      }

      e.preventDefault();
      loadPage(href);
      history.pushState({ path: href }, '', href);
    });
  }

  function renderModelHome() {
    const mainStage = document.getElementById('appMainStage');
    if (!mainStage || !cachedMenuData) return;

    let gridHtml = '';
    cachedMenuData.forEach((section, index) => {
      const sectionTitle = section.title || `Раздел ${index + 1}`;
      const itemsCount = section.items ? section.items.length : 0;
      const firstItemPath = itemsCount > 0 ? ('/' + osModelFolder + '/' + section.items[0].path).replace(/\/+/g, '/') : '#';

      let titleFontSize = '15px';
      let badgeFontSize = '10px';
      let infoFontSize = '11px';

      if (sectionTitle.length > 55) {
        titleFontSize = '13px'; badgeFontSize = '9px'; infoFontSize = '10px';
      } else if (sectionTitle.length > 38) {
        titleFontSize = '14px';
      }

      gridHtml += `
        <a href="${firstItemPath}" class="car-card section-card" style="display: flex; flex-direction: column; justify-content: space-between; min-height: 125px; padding: 14px; text-decoration: none; box-sizing: border-box;">
          <div style="flex: 1;">
            <div style="font-size: ${badgeFontSize}; text-transform: uppercase; color: var(--os-accent); font-weight: 700; margin-bottom: 4px; letter-spacing: 0.03em;">
              Раздел ${index + 1}
            </div>
            <h2 style="font-size: ${titleFontSize}; font-weight: 700; color: var(--os-text); margin: 0 0 6px 0; line-height: 1.25; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${sectionTitle}
            </h2> 
          </div>
          <div style="font-size: ${infoFontSize}; color: var(--os-sub); font-weight: 500; display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 4px;">
            <span>Статей: ${itemsCount}</span>
            <span style="color: var(--os-accent); font-weight: bold; font-size: 14px;">→</span>
          </div>
        </a>
      `;
    });

    const modelName = headerTitleContainer && headerTitleContainer.textContent ? headerTitleContainer.textContent : 'Руководство';
    mainStage.innerHTML = `
      <div class="section-home-main">
        <div class="section-hero-pwa">
          <div class="hero-overlay"></div>
          <div class="hero-content">
            <span class="section-badge">Interactive Manual</span>
            <h1 class="hero-title">${modelName}</h1>
            <p class="hero-subtitle">Полное интерактивное руководство по эксплуатации, техническому обслуживанию и ремонту автомобиля.</p>
          </div>
        </div>
        <div class="section-grid" id="modelSectionsGrid">
          ${gridHtml}
        </div>
      </div>
    `;

    document.title = `${modelName} — Бортовое Руководство`;
    highlightActiveLink(window.location.pathname);

    if (window.OSSearch && typeof window.OSSearch.init === 'function') {
      window.OSSearch.init();
    }
  }

  function routeCurrentPath() {
    const urlParams = new URLSearchParams(window.location.search);
    const targetPage = urlParams.get('page');

    if (targetPage) {
      console.log("[OSApp Router] Переход по прямой ссылке. Загружаю:", targetPage);
      window.history.replaceState({}, '', targetPage);
      loadPage(targetPage);
      return;
    }

    const currentPath = window.location.pathname.toLowerCase().replace(/\/+/g, '/');
    const modelFolderClean = osModelFolder.toLowerCase().replace(/\/+/g, '/');
    
    const isHome = currentPath === modelFolderClean || 
                   currentPath === `${modelFolderClean}index.html` || 
                   currentPath === '/' || 
                   currentPath === '/index.html';

    if (isHome) {
      renderModelHome();
    } else {
      loadPage(window.location.pathname);
    }
  }

  window.addEventListener('popstate', routeCurrentPath);
  window.routeCurrentPath = routeCurrentPath;
}

/* -------------------------------------------------------------------------
   3. АСИНХРОННАЯ ЗАГРУЗКА, АВТО-СКРОЛЛ И ОБНОВЛЕНИЕ SEO-МЕТАДАННЫХ СТАТЬИ
   ------------------------------------------------------------------------- */
async function loadPage(url) {
  const mainStage = document.getElementById('appMainStage');
  if (!mainStage) return;

  let cleanUrl = url.replace(/\/+/g, '/');
  let fetchUrl = cleanUrl;
  const segments = window.location.pathname.split('/').filter(Boolean);

  if (!isGitHubPages && segments.length > 0 && fetchUrl.toLowerCase().startsWith('/' + segments[0].toLowerCase() + '/')) {
    fetchUrl = fetchUrl.replace(new RegExp('^\\/' + segments[0], 'i'), '').replace(/\/+/g, '/');
  }

  mainStage.style.opacity = '0.4';

  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) throw new Error(`Статья не найдена (${response.status})`);
    
    const htmlText = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');
    const incomingContent = doc.querySelector('.os-main') || doc.querySelector('.section-home-main');
    
    if (incomingContent) {
      mainStage.innerHTML = '';
      mainStage.appendChild(incomingContent.cloneNode(true));
      
      const currentFullUrl = window.location.href; 
      const baseDomain = window.location.origin;   

      // 1. Поисковый канонический тег
      const canonicalTag = document.querySelector('.os-canonical-tag') || document.querySelector('link[rel="canonical"]');
      if (canonicalTag) canonicalTag.setAttribute('href', currentFullUrl);

      // 2. Open Graph
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) ogUrl.setAttribute('content', currentFullUrl);
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && ogImage.getAttribute('content') === 'https://github.io') {
        ogImage.setAttribute('content', (baseDomain + osModelFolder + 'assets/img/og-preview.jpg').replace(/\/+/g, '/'));
      }

      // 3. Twitter Cards
      const twitterUrl = document.querySelector('meta[name="twitter:url"]');
      if (twitterUrl) twitterUrl.setAttribute('content', currentFullUrl);
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage && twitterImage.getAttribute('content') === 'https://github.io') {
        twitterImage.setAttribute('content', (baseDomain + osModelFolder + 'assets/img/og-preview.jpg').replace(/\/+/g, '/'));
      }

      // Навигационные кнопки внизу статьи
      const singlePageContent = mainStage.querySelector('.os-single-page-content') || mainStage.querySelector('.os-article-layout');
      if (singlePageContent) {
        let currentRelativePath = fetchUrl.replace(/^\//, '');
        const cleanFolder = osModelFolder.replace(/\/+/g, '');

        if (cleanFolder && cleanFolder !== '/' && currentRelativePath.toLowerCase().startsWith(cleanFolder.toLowerCase())) {
          currentRelativePath = currentRelativePath.substring(cleanFolder.length).replace(/^\//, '');
        }

        const buttonsHtml = generateFooterNavigation(currentRelativePath);
        singlePageContent.insertAdjacentHTML('beforeend', buttonsHtml);

        singlePageContent.querySelectorAll('.page-footer-nav [data-pwa-link]').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetHref = btn.getAttribute('href');
            if (targetHref && targetHref !== '#') {
              loadPage(targetHref);
              history.pushState({ path: targetHref }, '', targetHref); // Ошибка с href исправлена
            }
          });
        });
      }

      mainStage.scrollTop = 0;
      window.scrollTo(0, 0); 
      document.body.classList.remove('os-lock');

      if (doc.title) document.title = doc.title;

      if (typeof generateDynamicBreadcrumbs === 'function') {
        generateDynamicBreadcrumbs(cleanUrl, doc.title || "Статья");
      }

      if (window.OSSearch && typeof window.OSSearch.init === 'function') {
        window.OSSearch.init();
      }

      // ⚡ РЕИНЖЕКТ ВСЕЙ РЕКЛАМЫ РСЯ ПРИ SPA-ПЕРЕХОДЕ
      if (window.adsInitialized) {
        setTimeout(() => {
          renderGlobalAds(); // Перезапуск сквозных FloorAd и Fullscreen
          initInImageAds();  // Поиск картинок на новой странице
        }, 200); // 200мс — оптимально для завершения перестроения DOM
      }

    } else {
      mainStage.innerHTML = `<div class="os-main" style="padding:16px;">${doc.body.innerHTML}</div>`;
      if (doc.title) document.title = doc.title;
    }

    if (typeof highlightActiveLink === 'function') {
      highlightActiveLink(cleanUrl);
    }

  } catch (error) {
    console.error('Ошибка навигации роутера:', error);
    mainStage.innerHTML = `
      <div style="color: #ff4d4d; padding: 40px 16px; text-align: center; font-weight: 600;">
        ⚠️ Ошибка загрузки материала.<br>
        <span style="font-size:13px; font-weight:400; color:var(--os-sub);">Файл по пути <b>${cleanUrl}</b> отсутствует.</span>
      </div>
    `;
  } finally {
    mainStage.style.opacity = '1';
  }
}

/* -------------------------------------------------------------------------
   4. СИНХРОНИЗАЦИЯ СЛЕЖЕНИЯ И АВТОМАТИЧЕСКАЯ ПОДСВЕТКА ССЫЛОК В МЕНЮ
   ------------------------------------------------------------------------- */
function highlightActiveLink(url) {
  const accordionMenu = document.getElementById('accordionMenu');
  if (!accordionMenu) return;

  accordionMenu.querySelectorAll('a').forEach(a => a.classList.remove('active'));
  let lookupPath = url.replace(window.location.origin, '').replace(/\/+/g, '/');

  const segments = window.location.pathname.split('/').filter(Boolean);
  const currentModelFolder = segments.length > 0 ? segments[0] : '';
  const normalizedLookup = lookupPath.replace(new RegExp('^\\/' + currentModelFolder, 'i'), '').replace(/\/+/g, '/');
  
  if (normalizedLookup === '/' || normalizedLookup === '/index.html' || normalizedLookup === '') {
    accordionMenu.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    return; 
  }

  let targetLink = null;
  const allLinks = accordionMenu.querySelectorAll('a');
  
  for (let a of allLinks) {
    const aHref = a.getAttribute('href').replace(new RegExp('^\\/' + currentModelFolder, 'i'), '').replace(/\/+/g, '/');
    if (aHref === normalizedLookup || normalizedLookup.includes(aHref) || aHref.includes(normalizedLookup)) {
      targetLink = a;
      break;
    }
  }

  if (targetLink) {
    targetLink.classList.add('active');
    const parentSection = targetLink.closest('.sidebar-item');
    if (parentSection) {
      accordionMenu.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
      parentSection.classList.add('active'); 
    }
  }
}

/* -------------------------------------------------------------------------
   5. ДИНАМИЧЕСКАЯ ГЕНЕРАЦИЯ МИКРОРАЗМЕТКИ BREADCRUMBLIST (SCHEMA.ORG)
   ------------------------------------------------------------------------- */
function generateDynamicBreadcrumbs(currentUrl, articleTitle) {
  const oldScript = document.getElementById('os-dynamic-breadcrumbs');
  if (oldScript) oldScript.remove();

  const baseOrigin = window.location.origin;
  const segments = window.location.pathname.split('/').filter(Boolean);
  const currentModelFolder = segments.length > 0 ? segments[0] : '';
  const normalizedUrl = currentUrl.replace(new RegExp('^\\/' + currentModelFolder, 'i'), '').replace(/\/+/g, '/');

  if (normalizedUrl === '/' || normalizedUrl === '/index.html' || normalizedUrl === '') {
    return; 
  }

  let parentSectionTitle = "Раздел";
  
  if (cachedMenuData) {
    for (let section of cachedMenuData) {
      if (section.items) {
        const hasItem = section.items.some(item => {
          const itemPath = ('/' + item.path).replace(/\/+/g, '/');
          return normalizedUrl.includes(itemPath) || itemPath.includes(normalizedUrl);
        });
        if (hasItem) {
          parentSectionTitle = section.title;
          break;
        }
      }
    }
  }

  const headerTitleContainer = document.getElementById('headerModelTitle');
  const modelName = headerTitleContainer && headerTitleContainer.textContent ? headerTitleContainer.textContent : "Бортовое Руководство";
  const modelRoot = currentModelFolder ? `/${currentModelFolder}/` : '/';

  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Главная", "item": `${baseOrigin}/` },
      { "@type": "ListItem", "position": 2, "name": modelName, "item": `${baseOrigin}${modelRoot}` },
      { "@type": "ListItem", "position": 3, "name": parentSectionTitle },
      { "@type": "ListItem", "position": 4, "name": articleTitle.split('—')[0].trim() }
    ]
  };

  const script = document.createElement('script');
  script.id = 'os-dynamic-breadcrumbs';
  script.type = 'application/ld+json';
  script.innerHTML = JSON.stringify(breadcrumbData, null, 2);
  document.head.appendChild(script);
}

/* =========================================================================
   🔄 АВТОМАТИЧЕСКАЯ ГЕНЕРАЦИЯ КНОПОК ПОСТРАНИЧНОЙ НАВИГАЦИИ
   ========================================================================= */
function generateFooterNavigation(currentPath) {
  if (!cachedMenuData) return ''; 

  let flatArticles = [];
  cachedMenuData.forEach(section => {
    if (section.items && section.items.length > 0) {
      section.items.forEach(item => {
        flatArticles.push(item);
      });
    }
  });

  const cleanCurrent = currentPath.replace(/^\//, '').toLowerCase();
  const currentIndex = flatArticles.findIndex(item => item.path.replace(/^\//, '').toLowerCase() === cleanCurrent);

  if (currentIndex === -1) return '';

  const prevArticle = flatArticles[currentIndex - 1];
  const nextArticle = flatArticles[currentIndex + 1];

  let footerHtml = `<div class="page-footer-nav">`;

  if (prevArticle) {
    const prevLink = ('/' + osModelFolder + '/' + prevArticle.path).replace(/\/+/g, '/');
    footerHtml += `<a href="${prevLink}" class="page-nav-btn" data-pwa-link>◀ ${prevArticle.title}</a>`;
  } else {
    footerHtml += `<a href="#" class="page-nav-btn disabled">◀ Назад</a>`;
  }

  if (nextArticle) {
    const nextLink = ('/' + osModelFolder + '/' + nextArticle.path).replace(/\/+/g, '/');
    footerHtml += `<a href="${nextLink}" class="page-nav-btn" data-pwa-link>${nextArticle.title} ▶</a>`;
  } else {
    footerHtml += `<a href="#" class="page-nav-btn disabled">Вперед ▶</a>`;
  }

  footerHtml += `</div>`;
  return footerHtml;
}
