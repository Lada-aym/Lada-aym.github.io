/* ==========================================================================
   Поиск по сайту / руководству Chevrolet Niva
   Функции: поиск по всем SECTIONS, голосовой ввод, история запросов,
   подсветка совпадений, клавиатурная навигация, переход к разделу.
   ========================================================================== */
(function () {
  const SEARCH_LIMIT = 80;
  const MIN_QUERY = 2;
  const HISTORY_KEY = "chevroletNivaSearchHistory";
  const VOICE_LANG = "ru-RU";

  let activeIndex = -1;
  let lastResults = [];
  let recognition = null;
  let recognizing = false;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalize(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[«»“”„]/g, '"')
      .replace(/[‐‑‒–—]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(query) {
    return normalize(query)
      .split(/[\s,.;:!?()\[\]{}"']+/)
      .map(t => t.trim())
      .filter(t => t.length >= MIN_QUERY);
  }

  function getSections() {
    try {
      if (typeof SECTIONS !== "undefined" && Array.isArray(SECTIONS)) return SECTIONS;
    } catch (e) {
      /* ignore */
    }
    return [];
  }

  function blockText(block) {
    if (!block) return "";
    if (block.v) return block.v;
    if (Array.isArray(block.items)) return block.items.join(" ");
    if (Array.isArray(block.rows)) return block.rows.flat().join(" ");
    if (Array.isArray(block.headers)) return block.headers.join(" ");
    if (block.caption) return block.caption;
    if (block.alt) return block.alt;
    return "";
  }

  function sectionText(section) {
    return [
      section.category,
      section.title,
      ...(section.tags || []),
      ...(section.blocks || []).map(blockText)
    ].join(" ");
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlight(htmlEscapedText, terms) {
    const cleanTerms = [...new Set(terms.map(normalize).filter(t => t.length >= MIN_QUERY))]
      .sort((a, b) => b.length - a.length);
    if (!cleanTerms.length) return htmlEscapedText;

    const re = new RegExp(`(${cleanTerms.map(escapeRegExp).join("|")})`, "ig");
    return htmlEscapedText.replace(re, "<mark>$1</mark>");
  }

  function makeSnippet(rawText, query) {
    const text = String(rawText || "").replace(/\s+/g, " ").trim();
    const nText = normalize(text);
    const phrase = normalize(query);
    const terms = tokenize(query);

    let idx = phrase.length >= MIN_QUERY ? nText.indexOf(phrase) : -1;
    if (idx < 0) {
      for (const term of terms) {
        idx = nText.indexOf(term);
        if (idx >= 0) break;
      }
    }

    if (idx < 0) {
      const short = text.slice(0, 240) + (text.length > 240 ? "…" : "");
      return highlight(esc(short), terms.length ? terms : [phrase]);
    }

    const start = Math.max(0, idx - 95);
    const end = Math.min(text.length, idx + Math.max(phrase.length, 30) + 145);
    let snippet = text.slice(start, end);
    if (start > 0) snippet = "…" + snippet;
    if (end < text.length) snippet += "…";

    return highlight(esc(snippet), terms.length ? terms : [phrase]);
  }

  function scoreSection(section, query) {
    const phrase = normalize(query);
    const terms = tokenize(query);
    if (phrase.length < MIN_QUERY && !terms.length) return 0;

    const title = normalize(section.title);
    const category = normalize(section.category);
    const tags = normalize((section.tags || []).join(" "));
    const text = normalize(sectionText(section));

    const phraseMatch = phrase.length >= MIN_QUERY && text.includes(phrase);
    const termMatches = terms.filter(term => text.includes(term));

    if (!phraseMatch && !termMatches.length) return 0;

    let score = 0;

    if (phraseMatch) {
      score += 30;
      if (title === phrase) score += 160;
      if (title.includes(phrase)) score += 85;
      if (category.includes(phrase)) score += 35;
      if (tags.includes(phrase)) score += 55;
      score += Math.min(text.split(phrase).length - 1, 20);
    }

    for (const term of termMatches) {
      score += 5;
      if (title.includes(term)) score += 25;
      if (category.includes(term)) score += 10;
      if (tags.includes(term)) score += 18;
      score += Math.min(text.split(term).length - 1, 8);
    }

    // Бонус, если совпали все слова запроса.
    if (terms.length > 1 && termMatches.length === terms.length) score += 25;

    return score;
  }

  function search(query) {
    const q = normalize(query);
    if (q.length < MIN_QUERY) return [];

    return getSections()
      .map(section => ({
        section,
        score: scoreSection(section, q),
        text: sectionText(section)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, SEARCH_LIMIT);
  }

  function loadHistory() {
    try {
      const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      return Array.isArray(data) ? data.slice(0, 8) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(query) {
    const q = String(query || "").trim();
    if (q.length < MIN_QUERY) return;
    try {
      const next = [q, ...loadHistory().filter(item => normalize(item) !== normalize(q))].slice(0, 8);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
    } catch (e) {
      /* ignore */
    }
  }

  function clearHistory() {
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) { /* ignore */ }
  }

  function ensureStyles() {
    if (document.getElementById("osSearchStyles")) return;
    const style = document.createElement("style");
    style.id = "osSearchStyles";
    style.textContent = `
      .os-search-overlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: none;
        background: rgba(0, 0, 0, .58);
        backdrop-filter: blur(6px);
        padding: max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom));
      }
      .os-search-overlay.open { display: grid; place-items: start center; }
      .os-search-modal {
        width: min(960px, 100%);
        max-height: min(780px, calc(100dvh - 2rem));
        display: grid;
        grid-template-rows: auto auto minmax(0, 1fr);
        margin-top: clamp(.5rem, 5vh, 3rem);
        border: 1px solid var(--line, #34363b);
        border-radius: 18px;
        background: var(--panel, #18191b);
        color: var(--text, #f4f4f5);
        box-shadow: 0 24px 70px rgba(0, 0, 0, .45);
        overflow: hidden;
      }
      .os-search-head {
        display: flex;
        align-items: center;
        gap: .75rem;
        padding: .9rem 1rem;
        border-bottom: 1px solid var(--line, #34363b);
      }
      .os-search-title { font-weight: 900; font-size: 1.05rem; }
      .os-search-close {
        margin-left: auto;
        width: 38px;
        height: 38px;
        border-radius: 999px;
        border: 1px solid var(--line, #34363b);
        background: var(--panel-2, #222326);
        color: var(--text, #f4f4f5);
        cursor: pointer;
        font-size: 1.3rem;
        line-height: 1;
      }
      .os-search-box { padding: 1rem; border-bottom: 1px solid var(--line, #34363b); }
      .os-search-input-row { display: flex; gap: .5rem; align-items: center; }
      .os-search-input {
        flex: 1 1 auto;
        min-width: 0;
        min-height: 48px;
        padding: .85rem 1rem;
        border-radius: 14px;
        border: 1px solid var(--line, #34363b);
        background: var(--input-bg, #101113);
        color: var(--text, #f4f4f5);
        font: inherit;
        outline: none;
      }
      .os-search-input:focus { border-color: var(--accent, #f2b21b); }
      .os-search-tool {
        flex: 0 0 auto;
        width: 48px;
        height: 48px;
        display: grid;
        place-items: center;
        border-radius: 14px;
        border: 1px solid var(--line, #34363b);
        background: var(--panel-2, #222326);
        color: var(--text, #f4f4f5);
        cursor: pointer;
        font-size: 1.1rem;
      }
      .os-search-tool:hover { border-color: var(--accent, #f2b21b); color: var(--accent-2, #ffe08a); }
      .os-search-tool[disabled] { opacity: .45; cursor: not-allowed; }
      .os-search-voice.listening {
        background: rgba(255, 92, 92, .14);
        border-color: var(--danger, #ff5c5c);
        color: var(--danger, #ff5c5c);
        animation: osPulse 1s infinite;
      }
      @keyframes osPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
      .os-search-meta {
        margin-top: .55rem;
        color: var(--muted, #b9bcc3);
        font-size: .86rem;
        display: flex;
        flex-wrap: wrap;
        gap: .4rem .8rem;
        align-items: center;
      }
      .os-search-status { color: var(--accent-2, #ffe08a); }
      .os-search-history {
        display: flex;
        flex-wrap: wrap;
        gap: .35rem;
        margin-top: .75rem;
      }
      .os-search-chip {
        border: 1px solid var(--line, #34363b);
        background: var(--tag-bg, rgba(255,255,255,.07));
        color: var(--text, #f4f4f5);
        border-radius: 999px;
        padding: .35rem .6rem;
        cursor: pointer;
        font-size: .82rem;
      }
      .os-search-chip:hover { border-color: var(--accent, #f2b21b); }
      .os-search-results { overflow: auto; padding: .5rem; }
      .os-search-empty { padding: 1.2rem; color: var(--muted, #b9bcc3); }
      .os-search-result {
        display: block;
        width: 100%;
        text-align: left;
        padding: .85rem .9rem;
        border: 1px solid transparent;
        border-radius: 14px;
        background: transparent;
        color: var(--text, #f4f4f5);
        cursor: pointer;
      }
      .os-search-result:hover,
      .os-search-result:focus,
      .os-search-result.active {
        border-color: var(--accent, #f2b21b);
        background: var(--accent-glow, rgba(242,178,27,.12));
        outline: none;
      }
      .os-search-path {
        color: var(--accent, #f2b21b);
        font-size: .78rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: .02em;
      }
      .os-search-name { margin-top: .25rem; font-weight: 850; font-size: 1rem; }
      .os-search-snippet {
        margin-top: .4rem;
        color: var(--body-text, #e9e9eb);
        line-height: 1.45;
        font-size: .92rem;
      }
      .os-search-tags { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .55rem; }
      .os-search-tag {
        padding: .18rem .45rem;
        border-radius: 999px;
        background: var(--tag-bg, rgba(255,255,255,.07));
        color: var(--muted, #b9bcc3);
        font-size: .74rem;
      }
      .os-search-snippet mark {
        padding: .05rem .18rem;
        border-radius: .3rem;
        background: var(--accent, #f2b21b);
        color: var(--on-accent, #151515);
      }
      @media (max-width: 620px) {
        .os-search-overlay { padding: 0; }
        .os-search-modal {
          width: 100%; height: 100dvh; max-height: 100dvh; margin: 0;
          border-radius: 0; border-left: 0; border-right: 0;
        }
        .os-search-input-row { gap: .4rem; }
        .os-search-tool { width: 44px; height: 44px; }
      }
    `;
    document.head.appendChild(style);
  }

  function speechSupported() {
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  function ensureRecognition(input, renderResults, setStatus, voiceBtn) {
    if (!speechSupported()) return null;
    if (recognition) return recognition;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.lang = VOICE_LANG;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      recognizing = true;
      voiceBtn.classList.add("listening");
      voiceBtn.setAttribute("aria-label", "Остановить голосовой ввод");
      setStatus("Слушаю… говорите запрос");
    };

    recognition.onresult = event => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      transcript = transcript.trim();
      if (transcript) {
        input.value = transcript;
        renderResults(transcript);
      }
    };

    recognition.onerror = event => {
      setStatus(event.error === "not-allowed" ? "Доступ к микрофону запрещён" : "Голосовой ввод недоступен");
    };

    recognition.onend = () => {
      recognizing = false;
      voiceBtn.classList.remove("listening");
      voiceBtn.setAttribute("aria-label", "Голосовой ввод");
      if (input.value.trim()) setStatus("Голосовой запрос распознан");
      setTimeout(() => setStatus(""), 1800);
    };

    return recognition;
  }

  function ensureModal() {
    ensureStyles();
    let overlay = document.getElementById("osSearchOverlay");
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = "osSearchOverlay";
    overlay.className = "os-search-overlay";
    overlay.innerHTML = `
      <section class="os-search-modal" role="dialog" aria-modal="true" aria-labelledby="osSearchTitle">
        <div class="os-search-head">
          <div class="os-search-title" id="osSearchTitle">Поиск по сайту Chevrolet Niva</div>
          <button class="os-search-close" type="button" aria-label="Закрыть поиск">×</button>
        </div>
        <div class="os-search-box">
          <div class="os-search-input-row">
            <input class="os-search-input" type="search" placeholder="Введите запрос: двигатель, тормоза, свечи, предохранители…" autocomplete="off" />
            <button class="os-search-tool os-search-voice" type="button" title="Голосовой ввод" aria-label="Голосовой ввод">🎙️</button>
            <button class="os-search-tool os-search-clear" type="button" title="Очистить" aria-label="Очистить поиск">⌫</button>
          </div>
          <div class="os-search-meta">
            <span class="os-search-count">Поиск по всем разделам руководства.</span>
            <span class="os-search-status" aria-live="polite"></span>
          </div>
          <div class="os-search-history"></div>
        </div>
        <div class="os-search-results" role="listbox"></div>
      </section>
    `;
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector(".os-search-close");
    const input = overlay.querySelector(".os-search-input");
    const voiceBtn = overlay.querySelector(".os-search-voice");
    const clearBtn = overlay.querySelector(".os-search-clear");
    const countEl = overlay.querySelector(".os-search-count");
    const statusEl = overlay.querySelector(".os-search-status");
    const historyEl = overlay.querySelector(".os-search-history");
    const results = overlay.querySelector(".os-search-results");

    function setStatus(text) {
      statusEl.textContent = text || "";
    }

    if (!speechSupported()) {
      voiceBtn.disabled = true;
      voiceBtn.title = "Голосовой ввод не поддерживается этим браузером";
    }

    function close() {
      if (recognition && recognizing) recognition.stop();
      overlay.classList.remove("open");
      document.body.style.overflow = "";
      activeIndex = -1;
    }

    function openPath(path) {
      if (!path) return;
      saveHistory(input.value);
      close();
      location.hash = "/" + path.replace(/^#?\/?/, "");
    }

    function renderHistory() {
      const history = loadHistory();
      if (!history.length) {
        historyEl.innerHTML = "";
        return;
      }
      historyEl.innerHTML = [
        ...history.map(item => `<button class="os-search-chip" type="button" data-query="${esc(item)}">${esc(item)}</button>`),
        `<button class="os-search-chip" type="button" data-clear-history="true">Очистить историю</button>`
      ].join("");
    }

    function setActive(index) {
      const buttons = Array.from(results.querySelectorAll(".os-search-result"));
      buttons.forEach(btn => btn.classList.remove("active"));
      if (!buttons.length) {
        activeIndex = -1;
        return;
      }
      activeIndex = Math.max(0, Math.min(index, buttons.length - 1));
      buttons[activeIndex].classList.add("active");
      buttons[activeIndex].scrollIntoView({ block: "nearest" });
    }

    function renderResults(query) {
      const q = normalize(query);
      activeIndex = -1;

      if (q.length < MIN_QUERY) {
        lastResults = [];
        countEl.textContent = `Введите минимум ${MIN_QUERY} символа для поиска.`;
        results.innerHTML = `<div class="os-search-empty">Можно искать по разделам, таблицам, тегам и тексту руководства. Также доступен голосовой ввод.</div>`;
        renderHistory();
        return;
      }

      const found = search(q);
      lastResults = found;
      countEl.textContent = found.length
        ? `Найдено: ${found.length}${found.length === SEARCH_LIMIT ? "+" : ""}`
        : "Ничего не найдено";

      if (!found.length) {
        results.innerHTML = `<div class="os-search-empty">Ничего не найдено. Попробуйте другой запрос.</div>`;
        return;
      }

      results.innerHTML = found.map(({ section, text }, index) => `
        <button class="os-search-result" type="button" role="option" data-index="${index}" data-path="${esc(section.path)}">
          <div class="os-search-path">${esc(section.category)}</div>
          <div class="os-search-name">${esc(section.title)}</div>
          <div class="os-search-snippet">${makeSnippet(text, q)}</div>
          <div class="os-search-tags">
            ${(section.tags || []).slice(0, 7).map(tag => `<span class="os-search-tag">${esc(tag)}</span>`).join("")}
          </div>
        </button>
      `).join("");
    }

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close();
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && overlay.classList.contains("open")) close();
    });

    input.addEventListener("input", () => renderResults(input.value));
    input.addEventListener("keydown", event => {
      if (!overlay.classList.contains("open")) return;
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive(activeIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive(activeIndex <= 0 ? lastResults.length - 1 : activeIndex - 1);
      } else if (event.key === "Enter") {
        const selected = results.querySelector(".os-search-result.active") || results.querySelector(".os-search-result");
        if (selected) {
          event.preventDefault();
          openPath(selected.dataset.path);
        }
      }
    });

    clearBtn.addEventListener("click", () => {
      input.value = "";
      setStatus("");
      renderResults("");
      input.focus();
    });

    voiceBtn.addEventListener("click", () => {
      const rec = ensureRecognition(input, renderResults, setStatus, voiceBtn);
      if (!rec) {
        setStatus("Голосовой ввод не поддерживается этим браузером");
        return;
      }
      if (recognizing) rec.stop();
      else rec.start();
    });

    historyEl.addEventListener("click", event => {
      const clear = event.target.closest("[data-clear-history]");
      if (clear) {
        clearHistory();
        renderHistory();
        return;
      }
      const chip = event.target.closest("[data-query]");
      if (!chip) return;
      input.value = chip.dataset.query;
      renderResults(input.value);
      input.focus();
    });

    results.addEventListener("click", event => {
      const btn = event.target.closest(".os-search-result");
      if (!btn) return;
      openPath(btn.dataset.path);
    });

    overlay.__osSearchApi = {
      open(query = "") {
        overlay.classList.add("open");
        document.body.style.overflow = "hidden";
        input.value = query;
        setStatus("");
        renderResults(query);
        setTimeout(() => input.focus(), 0);
      },
      close
    };

    return overlay;
  }

  window.OSSearch = {
    open(query = "") { ensureModal().__osSearchApi.open(query); },
    close() { ensureModal().__osSearchApi.close(); },
    search,
    voiceSupported: speechSupported
  };

  function bindButtons() {
    document.getElementById("osIntegratedSearchBtn")?.addEventListener("click", () => window.OSSearch.open());
    document.getElementById("headerSearchBtn")?.addEventListener("click", () => window.OSSearch.open());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bindButtons);
  else bindButtons();
})();
