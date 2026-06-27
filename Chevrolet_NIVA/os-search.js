/* ====================================================================
   OSSearch ULTRA PRO MAX — HYBRID NEURAL CONTEXT EDITION (CLEAN CSS) 🤖🚀
==================================================================== */
window.OSSearch = (() => {
  let DATA = [];
  let MENU = [];
  let HEADINGS = [];
  let INDEX = new Map();
  let TOKEN_INDEX = new Map();
  let QUERY_CACHE = new Map();
  let RESULTS = [];
  let ACTIVE_INDEX = -1;
  let isListening = false;
  const HISTORY_KEY = "search_history_v10";
  const els = {};
  
  let aiExtractor = null; 
  let aiVectors = new Map(); 
  let isAiLoading = false; 

  const KEYBOARD_MAP = {
    'q':'й','w':'ц','e':'у','r':'к','t':'е','y':'н','u':'г','i':'ш','o':'щ','p':'з','[':'х',']':'ъ',
    'a':'ф','s':'ы','d':'в','f':'а','g':'п','h':'р','j':'о','k':'л','l':'д',';':'ж','\'':'э',
    'z':'я','x':'ч','c':'с','v':'м','b':'и','n':'т','m':'ь',',':'б','.':'ю','/':'.'
  };
  const REVERSE_KEYBOARD_MAP = {};
  for(let k in KEYBOARD_MAP) { REVERSE_KEYBOARD_MAP[KEYBOARD_MAP[k]] = k; }

  // 🛠️ ДИНАМИЧЕСКАЯ ИНТЕГРАЦИЯ ЭЛЕМЕНТОВ В ИНТЕРФЕЙС
  function injectLayoutAndStyles() {
    const appContainer = document.querySelector('.app-container') || document.body;

    // SVG иконка лупы без инлайновых стилей оформления
    const searchSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
    `;

    const mobileTabBar = document.querySelector('.bottom-nav, .tabbar, .nav-panel, footer [style*="position: fixed"]');
    const sidebarHeader = document.querySelector('#appSidebar .sidebar-header, #appSidebar h3, #appSidebar .sidebar-top, .sidebar-brand, .sidebar-header-title');

    if (window.innerWidth <= 768 && mobileTabBar) {
      // КЛИЕНТ НА МОБИЛКЕ: Встраиваем лупу третьим элементом в нижнюю панель
      if (!document.getElementById("osIntegratedSearchBtn")) {
        const tabButton = document.createElement("button");
        tabButton.id = "osIntegratedSearchBtn";
        tabButton.className = "bottom-nav-item nav-item-search"; 
        tabButton.type = "button";
        tabButton.setAttribute("aria-label", "Поиск");
        
        tabButton.innerHTML = `
          <div class="tabbar-icon">${searchSvg}</div>
          <span class="tabbar-label">Поиск</span>
        `;
        tabButton.addEventListener("click", open);
        mobileTabBar.appendChild(tabButton);
      }
    } else if (sidebarHeader) {
      // КЛИЕНТ НА ПК: Заменяем текст заголовка сайдбара на аккуратное поле-кнопку
      if (!document.getElementById("osIntegratedSearchBtn")) {
        const sidebarSearchContainer = document.createElement("div");
        sidebarSearchContainer.id = "osIntegratedSearchBtn";
        sidebarSearchContainer.className = "sidebar-search-trigger";
        sidebarSearchContainer.innerHTML = `
          <button class="sidebar-search-btn" type="button">
            ${searchSvg}
            <span>Поиск по мануалу...</span>
          </button>
        `;
        
        sidebarHeader.innerHTML = "";
        sidebarHeader.appendChild(sidebarSearchContainer);
        sidebarSearchContainer.addEventListener("click", open);
      }
    }

    // Создаем модальное окно поиска (оверлей), если его нет
    if (!document.getElementById("osOverlay")) {
      const container = document.createElement("div");
      container.innerHTML = `
        <style>
          .os-overlay {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.85);
            z-index: 999999;
            display: none;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
          }
          .os-overlay.active { display: block; }
          .os-modal {
            width: 100%;
            max-width: 700px;
            margin: 0 auto;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: var(--bg, #0f0f10);
          }
          .os-bar {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 16px;
            border-bottom: 1px solid var(--line, #34363b);
            box-sizing: border-box;
            width: 100%;
          }
          .os-bar-icon { font-size: 18px; flex-shrink: 0; }
          
          /* 🔥 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ДЛЯ ИНПУТА */
          #osInput {
            flex: 1;
            min-width: 0;
            background: var(--input-bg, #101113);
            border: 1px solid var(--line, #34363b);
            color: var(--text, #f4f4f5);
            padding: 10px 12px;
            border-radius: 8px;
            font-size: 16px;
            outline: none;
            box-sizing: border-box;
          }
          #osInput:focus { border-color: var(--os-accent, #ff4d4d); }
          
          .os-btn-action {
            background: none;
            border: none;
            color: var(--muted, #b9bcc3);
            cursor: pointer;
            padding: 8px;
            font-size: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .os-mic-icon { width: 20px; height: 20px; color: var(--muted, #b9bcc3); }
          .os-btn-action.listening .os-mic-icon { color: #ef4444; animation: os-pulse 1.5s infinite; }
          
          /* 🔥 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ ДЛЯ КНОПКИ ЗАКРЫТЬ */
          #osCloseMobile {
            background: var(--panel-2, #222326);
            border: none;
            color: var(--text, #f4f4f5);
            padding: 10px 14px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.05em;
            cursor: pointer;
            flex-shrink: 0;
            white-space: nowrap;
          }
          
          @keyframes os-pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
        <div id="osOverlay" class="os-overlay">
          <div class="os-modal">
            <div class="os-bar">
              <span class="os-bar-icon">🔍</span>
              <input id="osInput" type="text" autocomplete="off" placeholder="Поиск мануала..." />
              <button id="osVoiceBtn" class="os-btn-action" type="button" title="Голосовой поиск">
                <svg class="os-mic-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14Z" fill="currentColor"/>
                  <path d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.47 11 17.93V21H13V17.93C16.39 17.47 19 14.53 19 11H17Z" fill="currentColor"/>
                </svg>
              </button>
              <button id="osClear" class="os-btn-action" type="button" aria-label="Очистить">✕</button>
              <button id="osCloseMobile" type="button" aria-label="Закрыть">ЗАКРЫТЬ</button>
            </div>
            <div id="osResults" class="os-results"></div>
          </div>
        </div>
      `;
      // Add results + item styles using CSS vars
    if (!document.getElementById('os-results-styles')) {
      var rstyle = document.createElement('style');
      rstyle.id = 'os-results-styles';
      rstyle.textContent = '.os-results{flex:1;overflow-y:auto;padding:8px}.os-item{padding:12px 14px;border-radius:10px;cursor:pointer;margin-bottom:4px;transition:background .12s}.os-item:hover,.os-item.active{background:var(--panel-2,#222326)}.os-row{display:flex;justify-content:space-between;align-items:start;gap:8px}.os-title{font-size:14px;font-weight:600;color:var(--text,#f4f4f5)}.os-type{font-size:10px;color:var(--muted,#b9bcc3);text-transform:uppercase;flex-shrink:0;padding-top:2px}.os-desc{font-size:12px;color:var(--muted,#b9bcc3);margin-top:4px;line-height:1.4}.os-group{padding:10px 14px 6px;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#b9bcc3);font-weight:700}.os-empty{text-align:center;padding:40px 20px;color:var(--muted,#b9bcc3)}.os-empty-icon{font-size:32px;margin-bottom:8px}.os-suggestion{padding:10px 14px;background:var(--accent-glow,rgba(242,178,27,.18));border-radius:8px;margin-bottom:8px;font-size:13px;color:var(--text,#f4f4f5)}.os-go-suggest{color:var(--accent,#f2b21b);cursor:pointer;font-weight:700}.os-ai-badge{background:var(--accent,#f2b21b);color:var(--on-accent,#151515);font-size:9px;padding:2px 5px;border-radius:4px;margin-right:4px;font-weight:700}.os-ai-spin{display:inline-block;animation:os-spin 2s linear infinite}@keyframes os-spin{to{transform:rotate(360deg)}}.os-ai-loader{text-align:center;padding:30px;color:var(--muted,#b9bcc3)}.os-overlay mark{background:var(--accent,#f2b21b);color:var(--on-accent,#151515);padding:0 2px;border-radius:2px}';
      document.head.appendChild(rstyle);
    }
      appContainer.appendChild(container);
      document.getElementById("osCloseMobile")?.addEventListener("click", close);
    }
  } /* <--- ЭТА СКОБКА ТЕПЕРЬ НА МЕСТЕ, ФУНКЦИЯ ЗАКРЫТА КОРРЕКТНО */

  function cache() {
    els.openBtn = document.getElementById("osIntegratedSearchBtn");
    els.overlay = document.getElementById("osOverlay");
    els.input = document.getElementById("osInput");
    els.results = document.getElementById("osResults");
    els.clear = document.getElementById("osClear");
    els.voiceBtn = document.getElementById("osVoiceBtn");
  }

  function normalizeText(text = "") {
    return String(text).toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9\s]/gi, " ").replace(/\s+/g, " ").trim();
  }

  function fixKeyboardLayout(text) {
    let corrected = "";
    for (let char of text.toLowerCase()) {
      corrected += KEYBOARD_MAP[char] ? KEYBOARD_MAP[char] : char;
    }
    return corrected;
  }

  function cleanPathForContext(path = "") {
    return path.toLowerCase().replace(/\/index\.html$/i, "").replace(/\/+$/, "").replace(/^\/+/, "");
  }

  function getFirstUrlSegment() {
    const segments = window.location.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      const first = segments[0].toLowerCase();
      if (!first.endsWith(".html") && first !== "index.html") {
        return first;
      }
    }
    return "";
  }

  function escapeHTML(str = "") {
    return String(str).replace(/[&<>"']/g, m => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"}[m]));
  }

  var tokenize = function(text = "") {
    const clean = normalizeText(text);
    if (!clean) return [];
    const words = clean.split(/\s+/).filter(word => word.trim().length >= 2);
    return [...new Set(words)];
  }

  function highlight(text = "", q = "") {
    if (!q) return escapeHTML(text);
    const safe = q.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
    return escapeHTML(text).replace(new RegExp(`(${safe})`, "gi"), "<mark>$1</mark>");
  }

  function lev(a, b) {
    if (!a || !b) return Math.abs((a || "").length - (b || "").length);
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        matrix[i][j] = b[i - 1] === a[j - 1] ? matrix[i - 1][j - 1] : 
        Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
    return matrix[b.length][a.length];
  }

  function fuzzyMatch(query, text) {
    const words = normalizeText(text).split(/\s+/);
    return words.some(word => word && Math.abs(word.length - query.length) <= 2 && lev(query, word) <= 2);
  }

  function getSpellingSuggestion(query) {
    if (!query) return null;
    const cleanQuery = query.toLowerCase().trim().replace(/ё/g, "е");
    if (cleanQuery.length < 3) return null;
    const AUTO_FIX_MAP = {
      "двигатиль": "двигатель", "двигател": "двигатель", "двиготель": "двигатель",
      "мсло": "масло", "масла": "масло", "маслом": "масло", "мтр": "мотор", "матоp": "мотор",
      "предохранител": "предохранитель", "предохранители": "предохранители",
      "придохранитель": "предохранитель", "аккум": "аккумулятор",
      "аккамулятор": "аккумулятор", "аккумулатор": "аккумулятор",
      "тормаза": "тормоза", "тармаза": "тормоза", "тормаз": "тормоз",
      "диагностика": "диагностика", "деогностика": "диагностика",
      "электрика": "электрика", "иликтрика": "электрика", "кузов": "кузов", "кузав": "кузов"
    };
    if (AUTO_FIX_MAP[cleanQuery]) return AUTO_FIX_MAP[cleanQuery];

    const CORE_WORDS = ["двигатель", "мотор", "масло", "смазка", "предохранитель", "тормоза", "аккумулятор", "диагностика", "подвеска", "коробка", "генератор", "стартер", "радиатор"];
    let bestMatch = null;
    let minDistance = 3;
    for (const word of CORE_WORDS) {
      if (Math.abs(word.length - cleanQuery.length) <= 2) {
        const distance = lev(cleanQuery, word);
        if (distance < minDistance) { minDistance = distance; bestMatch = word; }
      }
    }
    if (bestMatch && bestMatch !== cleanQuery) return bestMatch;
    return null;
  }

  function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0.0, normA = 0.0, normB = 0.0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async function initAIModel() {
    if (window.location.protocol === 'file:') return;
    if (aiExtractor || isAiLoading) return;
    isAiLoading = true;
    try {
      // Подключаем полноценный рабочий CDN для веб-нейросети
      const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2');
      
      // Инициализируем легковесную модель для работы с русским языком
      aiExtractor = await pipeline('feature-extraction', 'Xenova/rubert-tiny2');
      
      log("🤖 Нейросеть ИИ успешно загружена в браузер!");

      for (const [id, item] of INDEX.entries()) {
        const textToAnalyze = `${item.title}. ${item.description}`;
        const output = await aiExtractor(textToAnalyze, { pooling: 'mean', normalize: true });
        aiVectors.set(id, Array.from(output.data));
      }
    } catch (e) {
      console.error("Ошибка инициализации ИИ:", e);
      aiExtractor = null;
    } finally {
      isAiLoading = false;
    }
  }

  async function searchByAI(query) {
    if (!aiExtractor || !aiVectors.size) return [];
    try {
      const output = await aiExtractor(query, { pooling: 'mean', normalize: true });
      const queryVector = Array.from(output.data);
      let aiResults = [];
      const currentSection = getFirstUrlSegment();
      
      const path = window.location.pathname.toLowerCase().replace(/\/+/g, '/');
      const isAbsoluteHome = path === "/" || path === "" || path === "/index.html" || document.body.classList.contains("home-page");
      for (const [id, itemVector] of aiVectors.entries()) {
        const similarity = cosineSimilarity(queryVector, itemVector);
        if (similarity > 0.65) {
          const item = INDEX.get(id);
              // Фильтр по секции отключён — все разделы доступны
          aiResults.push({ ...item, score: similarity * 10000, isAI: true });
        }
      }
      aiResults.sort((a, b) => b.score - a.score);
      return aiResults.slice(0, 5); 
    } catch (e) {
      return [];
    }
  }

  function normalizeData(json) {
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.items)) return json.items;
    if (Array.isArray(json?.data)) return json.data;
    return [];
  }

  async function loadIndex() {
    try {
      const res = await fetch((window.location.pathname.replace(/[^\/]+$/,"")) + "search.json");
      if (!res.ok) throw new Error("HTTP " + res.status);
      const json = await res.json();
      DATA = normalizeData(json);
    } catch (e) {
      DATA = [];
    }
  }

  function collectMenu() {
    MENU = [];
    const items = document.querySelectorAll(".sidebar a, .sidebar-menu a");
    if (!items.length) return;
    items.forEach(a => {
      MENU.push({ title: a.textContent.trim(), description: "Раздел меню", url: a.getAttribute("href"), type: "menu" });
    });
  }

  function collectHeadings() {
    HEADINGS = [];
    const elements = document.querySelectorAll("h1,h2,h3,main h1,main h2,main h3,#appMainStage h1,#appMainStage h2,#appMainStage h3");
    if (!elements.length) return;
    elements.forEach(h => {
      if (h.id) HEADINGS.push({ title: h.textContent.trim(), description: "Раздел страницы", url: location.pathname + "#" + h.id, type: "heading" });
    });
  }

  function buildIndex() {
    INDEX.clear(); TOKEN_INDEX.clear();
    const all = [...DATA.map(item => ({ ...item, type: "page" })), ...MENU, ...HEADINGS];
    all.forEach((item, index) => {
      const prepared = { id: index, title: item.title || "", description: item.description || item.desc || "", content: item.content || "", url: item.url || "#", type: item.type || "page" };
      INDEX.set(index, prepared);
      const tokens = tokenize(prepared.title + " " + prepared.description + " " + prepared.content);
      tokens.forEach(token => {
        if (token) {
          if (!TOKEN_INDEX.has(token)) TOKEN_INDEX.set(token, new Set());
          TOKEN_INDEX.get(token).add(index);
        }
      });
    });
    initAIModel();
  }

  function search(query) {
    let q = normalizeText(query);
    if (!q) return [];
    if (QUERY_CACHE.has(q)) return QUERY_CACHE.get(q);
    let tokens = tokenize(q);
    let matchedIds = new Set();
    
    tokens.forEach(token => {
      TOKEN_INDEX.forEach((ids, key) => { 
        if (key.includes(token) || token.includes(key) || fuzzyMatch(token, key)) {
          ids.forEach(id => matchedIds.add(id)); 
        }
      });
    });
    let results = [...matchedIds].map(id => {
      const item = INDEX.get(id);
      return { ...item, score: advancedScore(item, q) };
    }).filter(item => item.score > 0);
    results.sort((a, b) => b.score - a.score);
    results = results.slice(0, 20);
    QUERY_CACHE.set(q, results);
    return results;
  }

  function advancedScore(item, query) {
    const title = normalizeText(item.title);
    const content = normalizeText(item.content || item.description || "");
    let score = 0;
    if (title === query) score += 5000; 
    if (title.startsWith(query)) score += 2000; 
    const qWords = query.split(/\s+/);
    let matchedPositions = [];
    qWords.forEach(word => {
      if (title.includes(word) || word.includes(title)) {
        score += 800;
        matchedPositions.push(title.indexOf(word));
      } else if (fuzzyMatch(word, title)) {
        score += 400; 
      }
      if (content.includes(word)) score += 150;
    });
    if (matchedPositions.length > 1) {
      matchedPositions.sort((a, b) => a - b);
      const distance = matchedPositions[matchedPositions.length - 1] - matchedPositions[0];
      if (distance < 20) score += 1000; 
    }
    if (item.type === "page") score += 50;
    if (item.type === "menu") score += 20;
    return score;
  }

  function createSnippet(text, query) {
    if (!text) return "";
    const cleanText = String(text).replace(/\s+/g, " ");
    const index = cleanText.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return cleanText.slice(0, 140) + "...";
    return "..." + cleanText.slice(Math.max(0, index - 50), Math.min(cleanText.length, index + 90)) + "...";
  }

  function getHistory() { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  
  function saveHistory(q) {
    let history = getHistory().filter(item => item !== q);
    history.unshift(q);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 6)));
  }

  function render(list, query) {
    if (!els.results) return;
    RESULTS = list; ACTIVE_INDEX = -1;
    const suggestion = getSpellingSuggestion(query);
    let suggestionHTML = "";
    if (suggestion) {
      suggestionHTML = `
        <div class="os-suggestion">
          <span>💡</span> Возможно, вы имели в виду: 
          <strong class="os-go-suggest" data-q="${suggestion}">${suggestion}</strong>
        </div>
      `;
    }
    if (!list.length) {
      els.results.innerHTML = `${suggestionHTML}<div class="os-empty"><div class="os-empty-icon">🔍</div>Ничего не найдено</div>`;
      return;
    }
    els.results.innerHTML = suggestionHTML + list.map((item, index) => `
      <div class="os-item" data-index="${index}" data-url="${item.url}">
        <div class="os-row">
          <div class="os-title">
            ${item.isAI ? `<span class="os-ai-badge">🤖 ИИ</span>` : ''}
            ${highlight(item.title, query)}
          </div>
          <div class="os-type">${item.type}</div>
        </div>
        <div class="os-desc">${highlight(createSnippet(item.content || item.description, query), query)}</div>
      </div>
    `).join("");
  }

  function updateActiveResult() {
    els.results?.querySelectorAll(".os-item").forEach(item => item.classList.remove("active"));
    const active = els.results?.querySelector(`.os-item[data-index="${ACTIVE_INDEX}"]`);
    if (active) { active.classList.add("active"); active.scrollIntoView({ block: "nearest" }); }
  }

  // Обновлен рендеринг саджестов
  function renderSuggestions() {
    if (!els.results) return;
    const history = getHistory();
    els.results.innerHTML = `
      ${history.length ? `<div class="os-group">Недавние запросы</div>${history.map(q => `<div class="os-item" data-q="${q}">⏱️ ${escapeHTML(q)}</div>`).join("")}` : ""}
      <div class="os-group">Популярные разделы мануала</div>
      <div class="os-item" data-q="двигатель">Двигатель</div>
      <div class="os-item" data-q="масло">Масло и смазка</div>
    `;
  }

  const run = debounce(async () => {
    if (!els.input) return;
    let query = els.input.value.trim();
    if (!query) { RESULTS = []; renderSuggestions(); return; }
    let res = search(query);
    if (res.length === 0 && aiExtractor) {
      if (els.results) {
        els.results.innerHTML = `<div class="os-ai-loader"><span class="os-ai-spin">🤖</span><div>Нейросеть ищет смысл...</div></div>`;
      }
      const aiFound = await searchByAI(query);
      if (aiFound.length > 0) { res = aiFound; }
    }
    if (!res.length) {
      const fixed = fixKeyboardLayout(query);
      let altRes = search(fixed);
      if (altRes.length) { res = altRes; }
    }
    render(res, query);
  }, 120);

  function initVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !els.voiceBtn) return;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ru-RU'; recognition.interimResults = false; recognition.maxAlternatives = 1;
    els.voiceBtn.addEventListener("click", () => { if (isListening) { recognition.stop(); } else { try { recognition.start(); } catch(e){} } });
    recognition.addEventListener("start", () => { isListening = true; els.voiceBtn.classList.add("listening"); });
    recognition.addEventListener("result", (e) => { if (els.input && e.results && e.results.length > 0) { const transcript = e.results[0][0].transcript; if (transcript) { els.input.value = transcript; run(); } } });
    recognition.addEventListener("end", () => { isListening = false; els.voiceBtn.classList.remove("listening"); });
    recognition.addEventListener("error", () => { isListening = false; els.voiceBtn.classList.remove("listening"); });
  }

  function navigateTo(targetUrl) {
    if (!targetUrl || targetUrl === "#") return;
    
    // 1. Очищаем путь от лишних точек и косых черт (избавляемся от ../ и /)
    let cleanUrl = targetUrl.replace(/^\.\.\//, "").replace(/^\/+/, "");
    
    // 2. Если цель — главная страница, просто сбрасываем хэш
    const lowerUrl = cleanUrl.toLowerCase();
    if (lowerUrl === "" || lowerUrl.endsWith("index.html") || lowerUrl === "index") {
      window.location.hash = "";
      return;
    }
    
    // 3. Безопасный SPA-переход через изменение хэша
    // Сначала принудительно переводим пользователя на главную index.html (если он был внутри папки)
    // и добавляем хэш. Роутер в app.js мгновенно подхватит этот путь!
    const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
    
    if (isIndex) {
      window.location.hash = cleanUrl;
    } else {
      // Если пользователь искал, находясь внутри физической SEO-страницы подпапки,
      // вычисляем путь к корню и отправляем его на главную с правильным хэшем
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      const currentSectionPath = pathParts.slice(-2).join("/");
      const rootPath = window.location.pathname.replace(currentSectionPath, '');
      
      window.location.replace(window.location.origin + rootPath + "index.html#" + cleanUrl);
    }
  }

  function open() { 
    els.overlay?.classList.add("active"); 
    document.body.classList.add("os-lock"); 
    setTimeout(() => { els.input?.focus(); renderSuggestions(); }, 40); 
  }
  
  function close() { 
    els.overlay?.classList.remove("active"); 
    document.body.classList.remove("os-lock"); 
    if (els.input) els.input.value = ""; 
    RESULTS = []; renderSuggestions(); 
  }

  function prefetch(url) { if (!url || url.startsWith("#") || document.querySelector(`link[href="${url}"]`)) return; const link = document.createElement("link"); link.rel = "prefetch"; link.href = url; document.head.appendChild(link); }
  function debounce(fn, delay) { let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); }; }

  function bind() {
    els.openBtn?.addEventListener("click", open);
    
    // 🔥 СВЯЗУЮЩИЙ ИНТЕРФЕЙСНЫЙ ШЛЮЗ ДЛЯ КОРНЯ ГЛАВНОЙ СТРАНИЦЫ
    document.querySelector('.core-search-trigger')?.addEventListener('click', open);
    document.querySelector('.bottom-nav, .tabbar, .nav-panel')?.addEventListener('click', e => {
      if (e.target.closest('#osIntegratedSearchBtn')) open();
    });
    document.querySelector('#appSidebar')?.addEventListener('click', e => {
      if (e.target.closest('#osIntegratedSearchBtn')) open();
    });
    els.overlay?.addEventListener("click", e => { if (e.target === els.overlay) close(); });
    els.input?.addEventListener("input", run);
    els.clear?.addEventListener("click", () => { if (els.input) { els.input.value = ""; els.input.focus(); } renderSuggestions(); });
    
    document.addEventListener("keydown", e => {
      const opened = els.overlay?.classList.contains("active");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); open(); return; }
      if (!opened) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); ACTIVE_INDEX++; if (ACTIVE_INDEX >= RESULTS.length) ACTIVE_INDEX = 0; updateActiveResult(); }
      if (e.key === "ArrowUp") { e.preventDefault(); ACTIVE_INDEX--; if (ACTIVE_INDEX < 0) ACTIVE_INDEX = RESULTS.length - 1; updateActiveResult(); }
      
      if (e.key === "Enter" && ACTIVE_INDEX >= 0) { 
        e.preventDefault(); 
        if (els.input) saveHistory(els.input.value); 
        const targetUrl = RESULTS[ACTIVE_INDEX].url;
        close();
        navigateTo(targetUrl);
      }
    });

    els.results?.addEventListener("click", e => {
      const item = e.target.closest(".os-item");
      const suggest = e.target.closest(".os-go-suggest");
      if (suggest && els.input) { els.input.value = suggest.dataset.q; run(); return; }
      if (!item) return;
      if (item.dataset.q && els.input) { els.input.value = item.dataset.q; run(); return; }
      
      if (els.input) saveHistory(els.input.value);
      const targetUrl = item.dataset.url;
      close();
      navigateTo(targetUrl);
    });
    
    els.results?.addEventListener("mouseover", e => { const item = e.target.closest(".os-item"); if (item) prefetch(item.dataset.url); });
  }

  async function init() {
    injectLayoutAndStyles();
    cache();
    if (!DATA || DATA.length === 0) {
      await loadIndex(); 
    }
    collectMenu();
    collectHeadings();
    buildIndex(); 
    bind();
    initVoiceSearch();

    // Перехват фокуса плоского инпута на главной
    const rootHomeInput = document.getElementById('globalSearchInput');
    if (rootHomeInput) {
      rootHomeInput.addEventListener('focus', (e) => {
        e.preventDefault();
        rootHomeInput.blur();
        open();
      });
    }
  }
  return { init, open, close };
})();

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => window.OSSearch.init());
} else {
  window.OSSearch.init();
}