/* ==========================================================================
   LADA Granta — руководство по эксплуатации (app.js)
   Оболочка раздела: меню, избранное, маршрутизация по hash, тема, scrollspy.
   Формат данных SECTIONS совместим с разделом GAZelle Next
   (блоки: p, h, list, ol, warning, note, indicator, switch, figure, table).
   ========================================================================== */
"use strict";

/* --- Безопасный localStorage (защита от SecurityError в режиме инкогнито) --- */
const store = (() => {
  let mem = {};
  try {
    const k = "__test__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch (e) {
    return {
      getItem: k => (k in mem ? mem[k] : null),
      setItem: (k, v) => { mem[k] = String(v); },
      removeItem: k => { delete mem[k]; }
    };
  }
})();

/* ---------------------------------------------------------------------------
   РСЯ: блокировщик нежелательного рекламного блока (как в разделе GAZelle Next)
   Перехватывает push в yaContextCb и отменяет рендеринг этого ID.
   TODO: замените FORBIDDEN_ID на ID блока, который хотите запретить у себя.
   --------------------------------------------------------------------------- */
(function() {
  const FORBIDDEN_ID = 'R-A-537370-71';
  // Важно: не переприсваиваем window.yaContextCb, если он уже создан скриптом РСЯ.
  // Яндекс предупреждает в консоли: «Переприсваивать window.yaContextCb опасно».
  if (typeof window.yaContextCb === "undefined") {
    window.yaContextCb = [];
  }
  if (!window.yaContextCb || typeof window.yaContextCb.push !== "function") return;
  if (window.yaContextCb.__grantaPushPatched) return;
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
  window.yaContextCb.__grantaPushPatched = true;
})();
/* Совместимость с внешними вставками. Не переприсваиваем window.yaContextCb,
   если он уже создан РСЯ. */
if (typeof window.yaContextCb === "undefined") window.yaContextCb = [];
if (typeof window.APExceptionBlocks === "undefined") window.APExceptionBlocks = [];

const LS_FAV = "ladaGrantaFavorites";
const LS_THEME = "ladaGrantaTheme";

/* --- Переключатель темы (авто/тёмная/светлая) --- */
function applyTheme(mode) {
  if (mode === "light") document.documentElement.setAttribute("data-theme", "light");
  else if (mode === "dark") document.documentElement.setAttribute("data-theme", "dark");
  else document.documentElement.removeAttribute("data-theme");
}
function initTheme() {
  const saved = store.getItem(LS_THEME) || "auto";
  applyTheme(saved);
  const btn = document.getElementById("themeToggle");
  const titles = { auto: "Тема: авто (по системе). Нажмите — тёмная", dark: "Тема: тёмная. Нажмите — светлая", light: "Тема: светлая. Нажмите — авто" };
  btn.title = titles[saved] || "Сменить тему";
  btn.addEventListener("click", () => {
    const cur = store.getItem(LS_THEME) || "auto";
    const next = cur === "auto" ? "dark" : cur === "dark" ? "light" : "auto";
    store.setItem(LS_THEME, next);
    applyTheme(next);
    btn.title = titles[next];
  });
}

/* ---------------------------------------------------------------------------
   Меню и состояние
   --------------------------------------------------------------------------- */
function buildMenu() {
  const seen = new Set();
  const menu = [];
  for (const s of SECTIONS) {
    if (!seen.has(s.category)) {
      seen.add(s.category);
      menu.push({ category: s.category, sections: SECTIONS.filter(x => x.category === s.category) });
    }
  }
  return menu;
}
const MENU = buildMenu();

function isMobile() { return window.matchMedia("(max-width: 980px)").matches; }

const state = {
  view: "all",          // all | path | favorites | category
  path: null,
  category: null,
  favorites: loadFavorites(),
  openCats: new Set()
};

function loadFavorites() {
  try {
    const raw = store.getItem(LS_FAV);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (e) { return new Set(); }
}
function saveFavorites() {
  try { store.setItem(LS_FAV, JSON.stringify([...state.favorites])); } catch (e) { /* ignore */ }
}

let root, nav, statusEl, sidebar, overlay;
function cacheDomElements() {
  root = document.getElementById("manualRoot");
  nav = document.getElementById("categoryNav");
  statusEl = document.getElementById("statusLine");
  sidebar = document.getElementById("appSidebar");
  overlay = document.getElementById("sidebarOverlay");
}

/* ---------------------------------------------------------------------------
   Утилиты
   --------------------------------------------------------------------------- */
function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
function slug(path) { return path.replace(/\.html$/, "").replaceAll("/", "-"); }
function sectionText(section) {
  return [section.category, section.title, ...(section.tags || []),
    ...section.blocks.map(b => [b.v, b.caption, (b.items || []).join(" "),
      (b.rows || []).flat().join(" "), (b.headers || []).join(" ")].filter(Boolean).join(" "))
  ].join(" ").toLowerCase();
}
function sectionByPath(path) {
  return SECTIONS.find(s => s.path === path || s.path.replace(/^\//, "") === path);
}

/* ---------------------------------------------------------------------------
   Маршрутизация (hash)
   --------------------------------------------------------------------------- */
function syncFromHash() {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  if (!h || h === "all") {
    state.view = "all"; state.path = null; state.category = null;
  } else if (h === "favorites") {
    state.view = "favorites";
  } else if (h.startsWith("cat/")) {
    state.view = "category";
    state.category = h.slice(4);
    state.path = null;
  } else {
    const sec = sectionByPath(h + ".html") || sectionByPath(h);
    if (sec) { state.view = "path"; state.path = sec.path; state.category = sec.category; }
    else { state.view = "all"; state.path = null; state.category = null; }
  }
  renderApp();
}
function goToPath(path) {
  location.hash = "#/" + path.replace(/\.html$/, "");
}
function goRootHome() {
  if (location.hash) location.hash = "#/all"; else renderApp();
}
function goCategory(cat) {
  location.hash = "#/cat/" + encodeURIComponent(cat);
}
function goFavorites() {
  location.hash = "#/favorites";
}

/* ---------------------------------------------------------------------------
   Фильтрация разделов
   --------------------------------------------------------------------------- */
function filteredSections() {
  if (state.view === "favorites") return SECTIONS.filter(s => state.favorites.has(s.path));
  if (state.view === "path") return SECTIONS.filter(s => s.path === state.path);
  if (state.view === "category") return SECTIONS.filter(s => s.category === state.category);
  return SECTIONS;
}

/* ---------------------------------------------------------------------------
   Рендер меню
   --------------------------------------------------------------------------- */
function renderMenu() {
  nav.innerHTML = MENU.map(group => {
    const open = state.openCats.has(group.category) || state.category === group.category || state.view === "favorites";
    const activeHead = state.category === group.category && state.view !== "all";
    const items = group.sections.map(s => {
      const fav = state.favorites.has(s.path);
      const active = state.path === s.path;
      return `<button class="menu-item${active ? " active" : ""}" data-path="${esc(s.path)}" type="button">
        <span class="menu-item-text">${esc(s.title)}</span>
        <span class="menu-item-dot${fav ? " on" : ""}" title="${fav ? "В закладках" : ""}">★</span>
      </button>`;
    }).join("");
    const count = group.sections.length;
    return `<div class="menu-group${open ? " open" : ""}" data-cat="${esc(group.category)}">
      <button class="menu-group-head${activeHead ? " active" : ""}" data-cat-head="${esc(group.category)}" type="button">
        <span class="menu-caret" aria-hidden="true">›</span>
        <span class="menu-group-title">${esc(group.category)}</span>
        <span class="menu-group-count" aria-hidden="true">${count}</span>
      </button>
      <div class="menu-items">${items}</div>
    </div>`;
  }).join("");

  nav.querySelectorAll(".menu-group-head").forEach(btn => {
    btn.addEventListener("click", () => {
      const cat = btn.getAttribute("data-cat-head");
      if (state.openCats.has(cat)) state.openCats.delete(cat); else state.openCats.add(cat);
      state.category = cat;
      goCategory(cat);
      if (isMobile()) closeSidebar();
    });
  });
  nav.querySelectorAll(".menu-item").forEach(btn => {
    btn.addEventListener("click", (e) => {
      if (e.target.closest(".menu-item-dot")) {
        toggleFavorite(btn.getAttribute("data-path"));
        return;
      }
      const path = btn.getAttribute("data-path");
      const sec = SECTIONS.find(s => s.path === path);
      if (sec) state.openCats.add(sec.category);
      goToPath(path);
      if (isMobile()) closeSidebar();
    });
  });
}

/* ---------------------------------------------------------------------------
   Рендер блоков (схема совместима с GAZelle Next)
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
    return `<div class="note"><strong>Примечание:</strong><br>${esc(block.v).replace(/\n/g, "<br>")}</div>`;
  }
  if (block.t === "indicator") {
    const color = block.color || "default";
    const num = block.num || "";
    const iconSrc = block.icon || "";
    const iconHtml = iconSrc
      ? `<img class="indicator-icon" src="${esc(iconSrc)}" alt="Индикатор ${esc(num)}" loading="lazy">`
      : (num ? `<span class="indicator-num">${esc(num)}</span>` : "");
    return `<div class="indicator indicator-${esc(color)}">${iconHtml}<div class="indicator-body">${esc(block.v).replace(/\n/g, "<br>")}</div></div>`;
  }
  if (block.t === "switch") {
    const num = block.num || "";
    const iconSrc = block.icon || "";
    const iconHtml = iconSrc
      ? `<img class="switch-icon" src="${esc(iconSrc)}" alt="Выключатель ${esc(num)}" loading="lazy">`
      : (num ? `<span class="indicator-num">${esc(num)}</span>` : "");
    return `<div class="switch">${iconHtml}<div class="switch-body">${esc(block.v).replace(/\n/g, "<br>")}</div></div>`;
  }
  if (block.t === "figure") {
    const isWide = block.class === "wide";
    const classes = `figure${block.class ? " " + esc(block.class) : ""}`;
    const minWidth = isWide ? "" : ` style="--figure-min-width:320px"`;
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
            ${block.rows.map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </div>`;
  }
  return "";
}

function renderBlocks(blocks) {
  const html = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const next = blocks[i + 1];
    const next2 = blocks[i + 2];
    // текст + две фигуры подряд: текст слева, обе фигуры друг под другом справа
    if (block.t === "figure" && block.class !== "wide" && next && next.t === "figure" && next.class !== "wide"
        && next2 && (next2.t === "p" || next2.t === "list")) {
      html.push(`<div class="figure-text-block multi">${renderBlock(next2)}${renderBlock(block)}${renderBlock(next)}</div>`);
      i += 2;
      continue;
    }
    if (block.t === "p" && block.class !== "no-figure" && next && next.t === "figure" && next.class !== "wide"
        && next2 && next2.t === "figure" && next2.class !== "wide") {
      html.push(`<div class="figure-text-block multi">${renderBlock(block)}${renderBlock(next)}${renderBlock(next2)}</div>`);
      i += 2;
      continue;
    }
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

/* ---------------------------------------------------------------------------
   Рендер раздела и контента
   --------------------------------------------------------------------------- */
function renderSection(section) {
  const fav = state.favorites.has(section.path);
  return `
    <article id="${esc(slug(section.path))}" class="card">
      <header class="card-head">
        <div class="card-title">
          <small>${esc(section.category)}</small>
          <h3>${esc(section.title)}</h3>
        </div>
        <button class="fav-btn${fav ? " active" : ""}" data-fav="${esc(section.path)}" type="button"
          title="${fav ? "Убрать из закладок" : "В закладки"}" aria-label="Закладка">${fav ? "★" : "☆"}</button>
      </header>
      <div class="card-body">
        ${renderBlocks(section.blocks)}
        ${(section.tags && section.tags.length) ? `<div class="tagline">${section.tags.slice(0, 7).map(t => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
      </div>
    </article>`;
}

function renderStatus(items) {
  const total = SECTIONS.length;
  if (state.view === "favorites") {
    statusEl.textContent = items.length
      ? `Закладки: показано разделов ${items.length} из ${total}`
      : "Закладок пока нет. Нажмите ☆ в заголовке раздела, чтобы добавить его в закладки.";
    return;
  }
  if (state.view === "path" && items[0]) {
    statusEl.textContent = `${items[0].category} — раздел ${SECTIONS.indexOf(items[0]) + 1} из ${total}`;
    return;
  }
  if (state.view === "category" && state.category) {
    statusEl.textContent = `${state.category}: показано разделов ${items.length} из ${total}`;
    return;
  }
  statusEl.textContent = `Все разделы руководства LADA Granta — всего ${total}.`;
}

function renderPrevNext() {
  if (state.view !== "path") return "";
  const idx = SECTIONS.findIndex(s => s.path === state.path);
  const prev = idx > 0 ? SECTIONS[idx - 1] : null;
  const next = idx < SECTIONS.length - 1 ? SECTIONS[idx + 1] : null;
  return `<div class="card-nav">
    <button type="button" data-nav="${prev ? esc(prev.path) : ""}" ${prev ? "" : "disabled"}>← ${prev ? esc(prev.title) : "Нет"}</button>
    <button type="button" data-nav="${next ? esc(next.path) : ""}" ${next ? "" : "disabled"}>${next ? esc(next.title) : "Нет"} →</button>
  </div>`;
}

/* ---------------------------------------------------------------------------
   Отложенная загрузка контента на главной странице (как в разделе GAZelle Next):
   при виде «все разделы» карточки подгружаются порциями по мере прокрутки.
   --------------------------------------------------------------------------- */
const HOME_INITIAL_CHUNK = 6;
const HOME_CHUNK_SIZE = 6;
let lazyRenderToken = 0;
let contentDelegationBound = false;
let lazyObserver = null;
let lazyScrollHandler = null;

function isHomeView() {
  return state.view === "all";
}
function scheduleIdle(callback) {
  if ("requestIdleCallback" in window) {
    return window.requestIdleCallback(callback, { timeout: 300 });
  }
  return window.setTimeout(callback, 16);
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
/* Делегированные обработчики кликов по карточкам: работают и для карточек,
   добавленных ленивой догрузкой (элемент #manualRoot не пересоздается). */
function bindContentDelegation() {
  if (!root || contentDelegationBound) return;
  contentDelegationBound = true;
  root.addEventListener("click", (event) => {
    const favBtn = event.target.closest("[data-fav]");
    if (favBtn && root.contains(favBtn)) {
      toggleFavorite(favBtn.getAttribute("data-fav"));
      return;
    }
    const navBtn = event.target.closest("[data-nav]");
    if (navBtn && root.contains(navBtn)) {
      const p = navBtn.getAttribute("data-nav");
      if (p) { goToPath(p); window.scrollTo({ top: 0, behavior: "instant" }); }
    }
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
      // Рекламные блоки на только что подгруженных картинках
      initYandexInImage(root);
      loading = false;
    });
  }
  function loadMore() {
    if (index < items.length) appendChunk(HOME_CHUNK_SIZE);
  }
  bindContentDelegation();
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

function renderContent() {
  lazyRenderToken++;
  const items = filteredSections();
  renderStatus(items);
  if (isHomeView() && items.length > HOME_INITIAL_CHUNK) {
    renderSectionsLazy(items);
    return;
  }
  disconnectLazyLoader();
  root.innerHTML = renderPrevNext() + items.map(renderSection).join("") + renderPrevNext();
  bindContentDelegation();
  initYandexInImage(root);
}

/* ---------------------------------------------------------------------------
   Избранное
   --------------------------------------------------------------------------- */
function toggleFavorite(path) {
  if (state.favorites.has(path)) state.favorites.delete(path);
  else state.favorites.add(path);
  saveFavorites();
  renderMenu();
  renderContent();
}

/* ---------------------------------------------------------------------------
   ScrollSpy
   --------------------------------------------------------------------------- */
let scrollSpyObserver = null;
function setupScrollSpy() {
  if (scrollSpyObserver) scrollSpyObserver.disconnect();
  if (state.view === "path") return;
  const cardEls = [...root.querySelectorAll(".card")];
  if (!cardEls.length) return;
  scrollSpyObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const id = entry.target.id;
      const section = SECTIONS.find(s => slug(s.path) === id);
      if (!section) continue;
      // аккордеон: раскрываем только группу активного раздела (как в образце)
      if (!state.openCats.has(section.category) || state.openCats.size !== 1) {
        state.openCats = new Set([section.category]);
        renderMenu();
      }
      nav.querySelectorAll(".menu-item").forEach(btn => {
        btn.classList.toggle("scroll-active", btn.getAttribute("data-path") === section.path);
      });
      // держим активный пункт в видимой области меню
      const activeBtn = nav.querySelector(".menu-item.scroll-active");
      if (activeBtn && sidebar && sidebar.scrollHeight > sidebar.clientHeight) {
        const btnRect = activeBtn.getBoundingClientRect();
        const sideRect = sidebar.getBoundingClientRect();
        const offset = sidebar.scrollTop + (btnRect.top - sideRect.top)
          - sidebar.clientHeight / 2 + activeBtn.clientHeight / 2;
        sidebar.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
      }
    }
  }, { rootMargin: "-30% 0px -60% 0px", threshold: 0 });
  cardEls.forEach(el => scrollSpyObserver.observe(el));
}

/* ---------------------------------------------------------------------------
   Реклама Яндекс inImage (как в разделе GAZelle Next).
   Инициализация после отрисовки контента: реклама показывается поверх крупных
   иллюстраций. TODO: замените YANDEX_INIMAGE_BLOCK_ID на свой ID блока РСЯ.
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
function initYandexInImage(container) {
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
   Общий рендер
   --------------------------------------------------------------------------- */
function renderApp() {
  if (state.view === "path" && state.category) state.openCats.add(state.category);
  renderMenu();
  renderContent();
  setupScrollSpy();
  closeSidebar();
}

/* ---------------------------------------------------------------------------
   Sidebar (mobile)
   --------------------------------------------------------------------------- */
function openSidebar() {
  sidebar.classList.add("open");
  overlay.classList.add("show");
  document.getElementById("burgerBtn").setAttribute("aria-expanded", "true");
}
function closeSidebar() {
  sidebar.classList.remove("open");
  overlay.classList.remove("show");
  const b = document.getElementById("burgerBtn");
  if (b) b.setAttribute("aria-expanded", "false");
}

/* ---------------------------------------------------------------------------
   Инициализация
   --------------------------------------------------------------------------- */
function goSiteHome() { window.location.href = "https://lada-aym.github.io/"; }

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  cacheDomElements();

  document.getElementById("homeBtn").addEventListener("click", goSiteHome);
  document.getElementById("sideHomeBtn").addEventListener("click", goSiteHome);
  document.getElementById("showAllBtn").addEventListener("click", goRootHome);
  document.getElementById("showFavBtn").addEventListener("click", goFavorites);
  document.getElementById("burgerBtn").addEventListener("click", () => {
    sidebar.classList.contains("open") ? closeSidebar() : openSidebar();
  });
  overlay.addEventListener("click", closeSidebar);

  const toTop = document.getElementById("toTopBtn");
  toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  window.addEventListener("scroll", () => {
    toTop.classList.toggle("visible", window.scrollY > 600);
  }, { passive: true });

  window.addEventListener("hashchange", syncFromHash);
  syncFromHash();

  // PWA: установка приложения
  let deferredPrompt = null;
  const installBtn = document.getElementById("installBtn");
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.hidden = true;
  });
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* офлайн-поддержка недоступна */ });
  }
});
