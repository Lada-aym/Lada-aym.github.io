/* =========================================================================
   Блокировщик нежелательного рекламного блока R-A-537370-71
   Перехватывает push в yaContextCb и отменяет рендеринг этого ID
   ========================================================================= */
(function() {
  const FORBIDDEN_ID = 'R-A-537370-71';

  // Важно: не переприсваиваем window.yaContextCb, если он уже создан скриптом РСЯ.
  // Яндекс предупреждает в консоли: «Переприсваивать window.yaContextCb опасно».
  if (typeof window.yaContextCb === "undefined") {
    window.yaContextCb = [];
  }

  if (!window.yaContextCb || typeof window.yaContextCb.push !== "function") return;
  if (window.yaContextCb.__gazNextPushPatched) return;

  const originalPush = window.yaContextCb.push;

  window.yaContextCb.push = function(...args) {
    const filteredArgs = args.filter(item => {
      if (typeof item === 'function') return true;

      if (item && (item.renderTo === FORBIDDEN_ID || item.blockId === FORBIDDEN_ID)) {
        console.warn(`[РСЯ Блокировщик] Запрос на установку блока ${FORBIDDEN_ID} заблокирован.`);
        return false;
      }
      return true;
    });

    if (filteredArgs.length > 0) {
      return originalPush.apply(this, filteredArgs);
    }
    return window.yaContextCb.length;
  };

  window.yaContextCb.__gazNextPushPatched = true;
})();

/* --- Безопасный localStorage (защита от SecurityError в режиме инкогнито) --- */
const safeStorage = {
  get(key) {
    try { return localStorage.getItem(key); }
    catch (e) { return null; }
  },
  set(key, val) {
    try { localStorage.setItem(key, val); }
    catch (e) { /* игнорируем */ }
  }
};

/* Совместимость со старыми кэшированными сборками/внешними вставками.
   Не переприсваиваем window.yaContextCb, если он уже создан РСЯ. */
if (typeof window.yaContextCb === "undefined") window.yaContextCb = [];
if (typeof window.APExceptionBlocks === "undefined") window.APExceptionBlocks = [];

/* --- Переключатель темы (тёмная/светлая/авто) --- */
(function initTheme() {
  const root = document.documentElement;

  function systemTheme() {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function currentTheme() {
    return safeStorage.get("gazelleNextTheme") || root.dataset.theme || systemTheme();
  }

  const saved = safeStorage.get("gazelleNextTheme");
  if (saved) root.dataset.theme = saved;

  function syncBtn() {
    const btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.textContent = currentTheme() === "light" ? "☀️" : "🌙";
    btn.setAttribute("aria-label", currentTheme() === "light" ? "Включить тёмную тему" : "Включить светлую тему");
  }

  function bindThemeButton() {
    const btn = document.getElementById("themeToggle");
    if (!btn || btn.dataset.themeBound === "true") {
      syncBtn();
      return;
    }

    btn.dataset.themeBound = "true";
    btn.addEventListener("click", function() {
      const next = currentTheme() === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      safeStorage.set("gazelleNextTheme", next);
      syncBtn();
    });
    syncBtn();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindThemeButton);
  } else {
    bindThemeButton();
  }
})();

/* ---------------------------------------------------------------------------
   Сборка иерархического меню из данных (порядок сохраняется).
   --------------------------------------------------------------------------- */
function buildMenu() {
  const menu = [];
  const map = new Map();
  for (const s of SECTIONS) {
    if (!map.has(s.category)) {
      const group = { title: s.category, items: [] };
      map.set(s.category, group);
      menu.push(group);
    }
    map.get(s.category).items.push({ title: s.title, path: s.path });
  }
  return menu;
}
const MENU = buildMenu();

/* ---------------------------------------------------------------------------
   Выдвижной сайдбар (бургер) для мобильных.
   --------------------------------------------------------------------------- */
function isMobile() {
  return window.matchMedia("(max-width: 860px)").matches;
}

// Оборачиваем в DOMContentLoaded, чтобы элементы успели создаться в DOM
document.addEventListener("DOMContentLoaded", () => {
  const burgerBtn = document.getElementById("burgerBtn");
  const sidebarEl = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  if (!burgerBtn || !sidebarEl || !sidebarOverlay) return;

  function openSidebar() {
    sidebarEl.classList.add("open");
    sidebarOverlay.classList.add("show");
    burgerBtn.classList.add("open");
    burgerBtn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeSidebar() {
    sidebarEl.classList.remove("open");
    sidebarOverlay.classList.remove("show");
    burgerBtn.classList.remove("open");
    burgerBtn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  burgerBtn.addEventListener("click", () => {
    if (sidebarEl.classList.contains("open")) closeSidebar();
    else openSidebar();
  });

  // Кнопка поиска в шапке — открывает os-search
  document.getElementById("headerSearchBtn")?.addEventListener("click", () => {
    if (window.OSSearch) window.OSSearch.open();
  });

  sidebarOverlay.addEventListener("click", closeSidebar);

  // Закрытие при выборе пункта меню (только на мобильных)
  document.addEventListener("click", (e) => {
    if (!isMobile()) return;
    if (e.target.closest(".menu-item") || e.target.closest(".side-actions button")) {
      closeSidebar();
    }
  });
});

/* ---------------------------------------------------------------------------
   Состояние приложения.
   --------------------------------------------------------------------------- */
function loadFavorites() {
  try {
    const parsed = JSON.parse(safeStorage.get("gazelleNextFavorites") || "[]");
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch (e) {
    return new Set();
  }
}

const state = {
  path: null,        // выбран конкретный раздел (по path) → глубокая ссылка
  category: null,    // выбрана категория → показать все разделы категории
  query: "",         // поисковый запрос (перекрывает выбор)
  favoritesOnly: false,
  expanded: new Set(),
  favorites: loadFavorites()
};

let root;
let nav;
let statusLine;
let homeBtn;
let sideHomeBtn;
let showAllBtn;
let showFavBtn;
let toTopBtn;
let installBtn;
let staticEventsBound = false;

function cacheDomElements() {
  root = document.getElementById("manualRoot");
  nav = document.getElementById("categoryNav");
  statusLine = document.getElementById("statusLine");
  homeBtn = document.getElementById("homeBtn");
  sideHomeBtn = document.getElementById("sideHomeBtn");
  showAllBtn = document.getElementById("showAllBtn");
  showFavBtn = document.getElementById("showFavBtn");
  toTopBtn = document.getElementById("toTopBtn");
  installBtn = document.getElementById("installBtn");
}

cacheDomElements();

/* ---------------------------------------------------------------------------
   Утилиты.
   --------------------------------------------------------------------------- */
function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cssAttr(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\"');
}

function slug(path) {
  return path.split("/").pop().replace(/\.html$/, "");
}

function saveFavorites() {
  safeStorage.set("gazelleNextFavorites", JSON.stringify([...state.favorites]));
}

function sectionText(section) {
  return JSON.stringify(section).toLowerCase();
}

function sectionByPath(path) {
  return SECTIONS.find(s => s.path === path || s.path.replace(/^\//, "") === path);
}

/* ---------------------------------------------------------------------------
   Глубокие ссылки через location.hash (#/path/section.html)
   --------------------------------------------------------------------------- */
function syncFromHash() {
  let hash = "";
  try {
    hash = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  } catch (e) {
    hash = "";
  }

  if (hash === "fav-list-view" || hash === "favoritesOnly") {
    state.favoritesOnly = true;
    safeStorage.set("gazelleNextNavFilter", "fav");
    location.hash = "";
    return;
  }

  const sec = hash ? sectionByPath(hash) : null;
  if (sec) {
    state.path = hash;
    state.category = null;
    state.query = "";
    state.favoritesOnly = false;
    state.expanded.add(sec.category);
  } else {
    state.path = null;
  }
}

function goToPath(path) {
  if (path) {
    state.category = null;
    state.query = "";
    state.favoritesOnly = false;
    safeStorage.set("gazelleNextNavFilter", "all");

    const nextHash = "#/" + path.replace(/^#\/?/, "");
    if (location.hash === nextHash) {
      state.path = path.replace(/^#\/?/, "");
      render();
    } else {
      location.hash = "/" + path.replace(/^#\/?/, "");   // вызывает hashchange → render
    }
  } else {
    history.replaceState(null, "", location.pathname + location.search);
    state.path = null;
    render();
  }
}

function goRootHome() {
  window.location.href = "https://lada-aym.github.io/";
}

/* ---------------------------------------------------------------------------
   Фильтрация.
   --------------------------------------------------------------------------- */
function filteredSections() {
  const q = state.query.trim().toLowerCase();
  if (q) {
    return SECTIONS.filter(s =>
      sectionText(s).includes(q) &&
      (!state.favoritesOnly || state.favorites.has(s.path))
    );
  }
  if (state.favoritesOnly) {
    return SECTIONS.filter(s => state.favorites.has(s.path));
  }
  if (state.path) {
    return SECTIONS.filter(s => s.path === state.path);
  }
  if (state.category) {
    return SECTIONS.filter(s => s.category === state.category);
  }
  return SECTIONS;
}

/* ---------------------------------------------------------------------------
   Рендер иерархического меню (аккордеон).
   --------------------------------------------------------------------------- */
function renderMenu() {
  if (!nav) return;
  nav.innerHTML = MENU.map(group => {
    const open = state.expanded.has(group.title);
    const headActive = state.category === group.title && !state.path && !state.query && !state.favoritesOnly;
    const itemsHtml = group.items.map(item => {
      const active = state.path === item.path;
      const isFav = state.favorites.has(item.path);
      return `<button class="menu-item ${active ? "active" : ""}" data-path="${esc(item.path)}">
        <span class="menu-item-text">${esc(item.title)}</span>
        <span class="menu-item-dot ${isFav ? "on" : ""}" aria-hidden="true">★</span>
      </button>`;
    }).join("");

    return `
      <div class="menu-group ${open ? "open" : ""}">
        <button class="menu-group-head ${headActive ? "active" : ""}" data-category="${esc(group.title)}" aria-expanded="${open ? "true" : "false"}">
          <span class="menu-caret">▸</span>
          <span class="menu-group-title">${esc(group.title)}</span>
        </button>
        <div class="menu-items">${itemsHtml}</div>
      </div>
    `;
  }).join("");

  nav.querySelectorAll(".menu-group-head").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.dataset.category;
      const wasOpen = state.expanded.has(cat);

      if (wasOpen) {
        state.expanded.delete(cat);
        if (state.category === cat) state.category = null;
      } else {
        state.expanded.add(cat);
        state.category = cat;
      }

      state.path = null;
      state.query = "";
      state.favoritesOnly = false;
      scrollSpySuppressedUntil = Date.now() + 1200;
      history.replaceState(null, "", location.pathname + location.search);
      render();
    });
  });

  nav.querySelectorAll(".menu-item").forEach(btn => {
    btn.addEventListener("click", () => {
      const path = btn.dataset.path;
      const sec = sectionByPath(path);
      if (sec) state.expanded.add(sec.category);
      goToPath(path);
    });
  });
}

/* ---------------------------------------------------------------------------
   Рендер блоков контента.
   --------------------------------------------------------------------------- */
function renderBlock(block) {
  if (block.t === "p") {
    return `<p>${esc(block.v).replace(/\n/g, "<br>")}</p>`;
  }
  if (block.t === "h") {
    return `<h4 class="section-subtitle">${esc(block.v)}</h4>`;
  }
  if (block.t === "list") {
    return `<ul>${block.items.map(item => `<li>${esc(item)}</li>`).join("")}</ul>`;
  }
  if (block.t === "ol") {
    return `<ol>${block.items.map(item => `<li>${esc(item)}</li>`).join("")}</ol>`;
  }
  if (block.t === "warning") {
    const icon = block.icon || "⚠️";
    const level = block.level || "warning";
    const label = level === "danger" ? "ОПАСНО!" : "ВНИМАНИЕ!";
    return `<div class="warning warning-${esc(level)} ${esc(level)}"><strong>${icon} ${label}</strong><br>${esc(block.v).replace(/\n/g, "<br>")}</div>`;
  }
  if (block.t === "note") {
    return `<div class="note"><strong>Примечание:</strong><br>${esc(block.v)}</div>`;
  }
  if (block.t === "indicator") {
    const color = block.color || "default";
    const num = block.num || "";
    const iconSrc = block.icon || "";
    const iconHtml = iconSrc
      ? `<img class="indicator-icon" src="${esc(iconSrc)}" alt="Индикатор ${esc(num)}" loading="lazy">`
      : "";
    return `<div class="indicator indicator-${esc(color)}">${iconHtml}<div class="indicator-body">${esc(block.v).replace(/\n/g, "<br>")}</div></div>`;
  }
  if (block.t === "switch") {
    const num = block.num || "";
    const iconSrc = block.icon || "";
    const iconHtml = iconSrc
      ? `<img class="switch-icon" src="${esc(iconSrc)}" alt="Выключатель ${esc(num)}" loading="lazy">`
      : "";
    return `<div class="switch">${iconHtml}<div class="switch-body">${esc(block.v).replace(/\n/g, "<br>")}</div></div>`;
  }
  if (block.t === "figure") {
    const isWide = block.class === "wide";
    const classes = `figure${block.class ? " " + esc(block.class) : ""}`;
    const minWidth = isWide ? "" : ' style="--figure-min-width:320px"';

    return `<figure class="${classes}"${minWidth}>` +
      `<img src="${esc(block.src)}" alt="${esc(block.alt || block.caption || "")}" loading="lazy" decoding="async">` +
      `${block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : ""}` +
      `</figure>`;
  }
  if (block.t === "table") {
    return `
      <div class="table-scroll">
        <table>
          <thead>
            <tr>${block.headers.map(h => `<th>${esc(h)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${block.rows.map(row => `
              <tr>${row.map(cell => `<td>${esc(cell)}</td>`).join("")}</tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  return "";
}

function renderBlocks(blocks) {
  const html = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const next = blocks[i + 1];

    if (block.t === "figure" && block.class !== "wide" && next && (next.t === "p" || next.t === "list")) {
      html.push(`<div class="figure-text-block">${renderBlock(next)}${renderBlock(block)}</div>`);
      i++;
      continue;
    }
    if (block.t === "p" && block.class !== "no-figure" && next && next.t === "figure" && !next.class) {
      html.push(`<div class="figure-text-block">${renderBlock(block)}${renderBlock(next)}</div>`);
      i++;
      continue;
    }

    html.push(renderBlock(block));
  }

  return html.join("");
}

function renderSection(section) {
  const fav = state.favorites.has(section.path);
  return `
    <article id="${esc(slug(section.path))}" class="card">
      <div class="card-head">
        <div class="card-title">
          <small>${esc(section.category)}</small>
          <h3>${esc(section.title)}</h3>
          <div class="tagline">
            ${section.tags.map(tag => `<span class="tag">${esc(tag)}</span>`).join("")}
          </div>
        </div>
        <button class="fav-btn ${fav ? "active" : ""}" data-fav="${esc(section.path)}" title="${fav ? "Удалить из закладок" : "В закладки"}" aria-label="${fav ? "Удалить из закладок" : "Добавить в закладки"}">
          ${fav ? "★" : "☆"}
        </button>
      </div>
      <div class="card-body">
        ${renderBlocks(section.blocks)}
      </div>
    </article>
  `;
}

/* ---------------------------------------------------------------------------
   Статус-строка / «хлебные крошки».
   --------------------------------------------------------------------------- */
function renderStatus(items) {
  let label;
  const q = state.query.trim();
  if (state.favoritesOnly) {
    label = `★ Закладки — разделов: ${items.length}`;
  } else if (q) {
    label = `Поиск «${esc(q)}» — найдено: ${items.length}`;
  } else if (state.path) {
    const sec = sectionByPath(state.path);
    label = sec ? `Раздел › ${esc(sec.category)} › ${esc(sec.title)}` : `Разделов: ${items.length}`;
  } else if (state.category) {
    label = `${esc(state.category)} — разделов: ${items.length}`;
  } else {
    label = `Все разделы — ${items.length}`;
  }
  if (statusLine) {
    statusLine.textContent = label;
  }
}

/* ---------------------------------------------------------------------------
   Scroll Spy — авто-подсветка раздела в сайдбаре при прокрутке.
   --------------------------------------------------------------------------- */
let scrollSpyActive = false;
let scrollSpyRaf = null;
let scrollSpySuppressedUntil = 0;

function isScrollSpySuppressed() {
  return Date.now() < scrollSpySuppressedUntil;
}

function setupScrollSpy() {
  if (isScrollSpySuppressed()) {
    scrollSpyActive = false;
    return;
  }

  if (!root || !nav) {
    scrollSpyActive = false;
    return;
  }

  if (state.path || state.query || state.favoritesOnly) {
    scrollSpyActive = false;
    clearScrollSpyHighlight();
    return;
  }

  const cards = root.querySelectorAll(".card");
  if (!cards.length || cards.length < 2) {
    scrollSpyActive = false;
    clearScrollSpyHighlight();
    return;
  }

  scrollSpyActive = true;
}

function updateScrollSpy() {
  if (isScrollSpySuppressed()) return;
  if (!scrollSpyActive || !root || !nav) return;

  const cards = root.querySelectorAll(".card");
  if (!cards.length) return;

  const targetLine = window.innerHeight * 0.25;
  let activeId = null;
  let minDistance = Infinity;

  cards.forEach(card => {
    const rect = card.getBoundingClientRect();
    const cardTop = rect.top;
    const cardBottom = rect.bottom;

    if (cardTop <= targetLine && cardBottom > targetLine) {
      activeId = card.id;
      minDistance = 0;
    } else if (minDistance > 0) {
      const distance = Math.abs(cardTop - targetLine);
      if (cardTop < targetLine && distance < minDistance) {
        minDistance = distance;
        activeId = card.id;
      }
    }
  });

  if (!activeId) {
    for (let i = cards.length - 1; i >= 0; i--) {
      if (cards[i].getBoundingClientRect().top < targetLine) {
        activeId = cards[i].id;
        break;
      }
    }
  }
  if (!activeId && cards.length) activeId = cards[0].id;
  if (!activeId) return;

  nav.querySelectorAll(".menu-item.scroll-active").forEach(el =>
    el.classList.remove("scroll-active"));

  const section = SECTIONS.find(s => slug(s.path) === activeId);
  if (!section) return;

  const menuItem = nav.querySelector(`.menu-item[data-path="${cssAttr(section.path)}"]`);
  if (!menuItem) return;

  menuItem.classList.add("scroll-active");

  state.expanded = new Set([section.category]);
  nav.querySelectorAll(".menu-group").forEach(groupEl => {
    const isCurrentGroup = groupEl.contains(menuItem);
    groupEl.classList.toggle("open", isCurrentGroup);
    const head = groupEl.querySelector(".menu-group-head");
    if (head) head.setAttribute("aria-expanded", isCurrentGroup ? "true" : "false");
  });

  const sidebar = document.querySelector(".sidebar");
  if (sidebar && !isMobile()) {
    const r = menuItem.getBoundingClientRect();
    const sr = sidebar.getBoundingClientRect();
    if (r.top < sr.top + 20 || r.bottom > sr.bottom - 20) {
      const offset = r.top - sr.top + sidebar.scrollTop - sidebar.clientHeight / 2 + r.height / 2;
      sidebar.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
    }
  }
}

function onScrollSpy() {
  if (scrollSpyRaf) return;
  scrollSpyRaf = requestAnimationFrame(() => {
    scrollSpyRaf = null;
    updateScrollSpy();
  });
}

/* ---------------------------------------------------------------------------
   Реклама Яндекс inImage (инициализация после отрисовки контента)
   --------------------------------------------------------------------------- */
const YANDEX_INIMAGE_BLOCK_ID = "R-A-537370-42";
const INIMAGE_MIN_WIDTH = 320;

function ensureYandexQueue() {
  if (typeof window.yaContextCb === "undefined") {
    window.yaContextCb = [];
  }

  if (!window.yaContextCb || typeof window.yaContextCb.push !== "function") {
    console.warn("yaContextCb недоступен: inImage не будет инициализирован сейчас.");
    return null;
  }

  return window.yaContextCb;
}

function inImageTargetWidth(image) {
  const figure = image.closest(".figure");
  const target = figure || image;
  const rect = target.getBoundingClientRect();
  return Math.round(rect.width || image.clientWidth || image.naturalWidth || 0);
}

function canRenderInImage(image) {
  if (!image || image.dataset.adRendered === "true") return false;
  if (image.closest(".ad-ignore") || image.classList.contains("ad-ignore")) return false;
  if (image.closest(".figure.wide")) return false;

  // Если картинка ещё не загрузилась — проверим после load.
  if (!image.complete) return true;

  return inImageTargetWidth(image) >= INIMAGE_MIN_WIDTH;
}

function renderYandexInImage(image) {
  if (!canRenderInImage(image)) return;

  const width = inImageTargetWidth(image);
  if (image.complete && width < INIMAGE_MIN_WIDTH) {
    // Не дергаем РСЯ на неподходящих блоках: у inImage минимальная ширина 320px.
    image.dataset.adSkipped = "too-small";
    return;
  }

  if (!image.id) {
    image.id = `yandex_rtb_${YANDEX_INIMAGE_BLOCK_ID}_${Math.random().toString(16).slice(2)}`;
  }

  image.dataset.adRendered = "true";
  const yandexQueue = ensureYandexQueue();
  if (!yandexQueue) return;

  yandexQueue.push(() => {
    try {
      if (window.Ya?.Context?.AdvManager) {
        window.Ya.Context.AdvManager.render({
          renderTo: image.id,
          blockId: YANDEX_INIMAGE_BLOCK_ID,
          type: "inImage"
        });
      }
    } catch (err) {
      console.error("Yandex inImage render error:", err);
      image.dataset.adRendered = "false";
    }
  });
}

function initYandexInImage(container = root) {
  if (!container) return;

  ensureYandexQueue();

  // Запускаем после layout, чтобы getBoundingClientRect() вернул реальную ширину.
  requestAnimationFrame(() => {
    const images = Array.from(container.querySelectorAll(".figure img:not([data-ad-rendered='true'])"));

    images.forEach(image => {
      if (!canRenderInImage(image)) return;

      if (!image.complete) {
        image.addEventListener("load", () => renderYandexInImage(image), { once: true });
      } else {
        renderYandexInImage(image);
      }
    });
  });
}

/* ---------------------------------------------------------------------------
   Отложенная загрузка контента на главной странице.
   --------------------------------------------------------------------------- */
const HOME_INITIAL_CHUNK = 6;
const HOME_CHUNK_SIZE = 6;
let lazyRenderToken = 0;
let favoritesDelegationBound = false;
let lazyObserver = null;
let lazyScrollHandler = null;

function isHomeView() {
  return !state.path && !state.category && !state.query && !state.favoritesOnly;
}

function scheduleIdle(callback) {
  if ("requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, { timeout: 300 });
  }
  return window.setTimeout(callback, 16);
}

function clearScrollSpyHighlight() {
  if (!nav) return;
  nav.querySelectorAll(".menu-item.scroll-active").forEach(el =>
    el.classList.remove("scroll-active"));
}

function disconnectLazyLoader() {
  if (lazyObserver) {
    lazyObserver.disconnect();
    lazyObserver = null;
  }
  if (lazyScrollHandler) {
    window.removeEventListener("scroll", lazyScrollHandler);
    lazyScrollHandler = null;
  }
}

function bindFavoriteDelegation() {
  if (!root || favoritesDelegationBound) return;
  favoritesDelegationBound = true;

  root.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-fav]");
    if (!btn || !root.contains(btn)) return;

    const path = btn.dataset.fav;
    if (state.favorites.has(path)) state.favorites.delete(path);
    else state.favorites.add(path);
    saveFavorites();
    render();
  });
}

function renderSectionsLazy(items) {
  const token = ++lazyRenderToken;
  let index = 0;
  let loading = false;

  disconnectLazyLoader();
  root.innerHTML = "";

  const sentinel = document.createElement("div");
  sentinel.className = "lazy-load-sentinel";
  sentinel.setAttribute("aria-hidden", "true");

  function appendChunk(size) {
    if (token !== lazyRenderToken || loading) return;
    loading = true;

    scheduleIdle(() => {
      if (token !== lazyRenderToken) return;

      const chunk = items.slice(index, index + size);
      if (!chunk.length) {
        disconnectLazyLoader();
        if (sentinel.parentNode) sentinel.remove();
        loading = false;
        return;
      }

      if (sentinel.parentNode) sentinel.remove();
      root.insertAdjacentHTML("beforeend", chunk.map(renderSection).join(""));
      index += chunk.length;

      if (index < items.length) {
        root.appendChild(sentinel);
      } else {
        disconnectLazyLoader();
      }

      setupScrollSpy();
      updateScrollSpy();
      
      // Инициализируем рекламные блоки на только что подгруженных картинках
      initYandexInImage(); 
      loading = false;
    });
  }

  function loadMore() {
    if (index < items.length) appendChunk(HOME_CHUNK_SIZE);
  }

  appendChunk(HOME_INITIAL_CHUNK);

  if ("IntersectionObserver" in window) {
    lazyObserver = new IntersectionObserver((entries) => {
      if (entries.some(entry => entry.isIntersecting)) loadMore();
    }, { rootMargin: "600px 0px" });
    lazyObserver.observe(sentinel);
  } else {
    lazyScrollHandler = () => {
      const rect = sentinel.getBoundingClientRect();
      if (rect.top < window.innerHeight + 600) loadMore();
    };
    window.addEventListener("scroll", lazyScrollHandler, { passive: true });
  }
}

/* ---------------------------------------------------------------------------
   Главный рендер.
   --------------------------------------------------------------------------- */
let lastRenderedPath = null;

function render() {
  cacheDomElements();
  if (!root) return;

  lazyRenderToken++;
  bindFavoriteDelegation();
  renderMenu();

  const items = filteredSections();
  const homeView = isHomeView();
  if (!homeView) disconnectLazyLoader();
  const pathChanged = state.path !== lastRenderedPath;

  renderStatus(items);

  if (!items.length) {
    root.innerHTML = `<div class="card"><div class="card-body"><p>Ничего не найдено. Попробуйте другой запрос.</p></div></div>`;
  } else if (homeView) {
    renderSectionsLazy(items);
  } else {
    root.innerHTML = items.map(renderSection).join("");
    // Включаем рекламу на обычных страницах сразу после отрисовки
    initYandexInImage();
  }

  if (state.path && pathChanged) {
    const el = document.getElementById(slug(state.path));
    if (el) el.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  // Мобильный пейджер prev/next
  if (state.path) {
    const idx = SECTIONS.findIndex(s => s.path === state.path);
    const prev = idx > 0 ? SECTIONS[idx - 1] : null;
    const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;
    const prevHtml = prev
      ? `<a class="prev" data-path="${esc(prev.path)}" href="#/${esc(prev.path)}"><span class="pl">← Предыдущий</span><span class="pt">${esc(prev.title)}</span></a>`
      : "";
    const nextHtml = next
      ? `<a class="next" data-path="${esc(next.path)}" href="#/${esc(next.path)}"><span class="pl">Следующий →</span><span class="pt">${esc(next.title)}</span></a>`
      : "";

    const pagerDiv = document.createElement("nav");
    pagerDiv.className = "mobile-pager";
    pagerDiv.innerHTML = prevHtml + nextHtml;
    root.appendChild(pagerDiv);
  }

  lastRenderedPath = state.path;

  const allActive = !state.favoritesOnly && !state.category && !state.path && !state.query;
  showAllBtn?.classList.toggle("active-btn", allActive);
  showFavBtn?.classList.toggle("active-btn", state.favoritesOnly);

  setupScrollSpy();
  setTimeout(updateScrollSpy, 50);
}

/* ---------------------------------------------------------------------------
   Обработчики событий.
   --------------------------------------------------------------------------- */

function bindStaticEvents() {
  cacheDomElements();
  if (staticEventsBound) return;
  staticEventsBound = true;

  homeBtn?.addEventListener("click", goRootHome);
  sideHomeBtn?.addEventListener("click", goRootHome);

  showAllBtn?.addEventListener("click", () => {
    state.category = null;
    state.path = null;
    state.query = "";
    state.favoritesOnly = false;
    history.replaceState(null, "", location.pathname + location.search);
    render();
  });

  showFavBtn?.addEventListener("click", () => {
    state.favoritesOnly = true;
    state.category = null;
    state.path = null;
    state.query = "";
    history.replaceState(null, "", location.pathname + location.search);
    render();
  });

  toTopBtn?.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  installBtn?.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    if (installBtn) installBtn.hidden = true;
  });
}

window.addEventListener("hashchange", () => {
  syncFromHash();
  render();
});

window.addEventListener("scroll", () => {
  if (!toTopBtn) cacheDomElements();
  toTopBtn?.classList.toggle("visible", window.scrollY > 500);
  onScrollSpy();
}, { passive: true });

/* ---------------------------------------------------------------------------
   Установка PWA.
   --------------------------------------------------------------------------- */
let deferredPrompt;
window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  deferredPrompt = event;
  cacheDomElements();
  if (installBtn) installBtn.hidden = false;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .catch(err => console.error("Service worker registration failed:", err));
  });
}

/* ---------------------------------------------------------------------------
   Инициализация.
   --------------------------------------------------------------------------- */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    bindStaticEvents();
    syncFromHash();
    render();
  });
} else {
  bindStaticEvents();
  syncFromHash();
  render();
}
