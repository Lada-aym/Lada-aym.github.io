/* ==========================================================================
   Поиск по сайту / руководству LADA Granta
   Функции: поиск по всем SECTIONS, история запросов, подсветка совпадений,
   клавиатурная навигация, голосовой ввод, переход к разделу.
   ========================================================================== */
(function () {
  "use strict";
  const SEARCH_LIMIT = 80;
  const MIN_QUERY = 2;
  const HISTORY_KEY = "ladaGrantaSearchHistory";
  const VOICE_LANG = "ru-RU";
  let activeIndex = -1;
  let lastResults = [];
  let recognition = null;
  let recognizing = false;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
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
      .split(/[\s,.;:!?()\[\]{}\"']+/)
      .map(t => t.trim())
      .filter(t => t.length >= MIN_QUERY);
  }
  function getSections() {
    try {
      if (typeof SECTIONS !== "undefined" && Array.isArray(SECTIONS)) return SECTIONS;
    } catch (e) { /* ignore */ }
    return [];
  }
  function blockText(block) {
    if (!block) return "";
    const parts = [];
    if (block.v) parts.push(block.v);
    if (block.caption) parts.push(block.caption);
    if (block.alt) parts.push(block.alt);
    if (Array.isArray(block.items)) parts.push(block.items.join(" "));
    if (Array.isArray(block.rows)) parts.push(block.rows.flat().join(" "));
    if (Array.isArray(block.headers)) parts.push(block.headers.join(" "));
    return parts.join(" ");
  }
  function sectionText(section) {
    return [section.category, section.title, ...(section.tags || []),
      ...(section.blocks || []).map(blockText)].join(" ");
  }

  /* ---------------- Индекс ---------------- */
  let INDEX = null;
  function buildIndex() {
    if (INDEX) return INDEX;
    INDEX = getSections().map(s => ({
      section: s,
      text: normalize(sectionText(s)),
      title: normalize(s.title),
      category: normalize(s.category),
      tags: normalize((s.tags || []).join(" "))
    }));
    return INDEX;
  }

  function search(query) {
    const tokens = tokenize(query);
    if (!tokens.length) return [];
    const out = [];
    for (const rec of buildIndex()) {
      let score = 0;
      let ok = true;
      for (const t of tokens) {
        const inText = rec.text.indexOf(t);
        if (inText === -1) { ok = false; break; }
        score += 1;
        if (rec.title.includes(t)) score += 6;
        if (rec.title.startsWith(t)) score += 2;
        if (rec.tags.includes(t)) score += 3;
        if (rec.category.includes(t)) score += 2;
        if (inText < 400) score += 1;
      }
      if (ok) out.push({ rec, score });
    }
    out.sort((a, b) => b.score - a.score);
    return out.slice(0, SEARCH_LIMIT).map(o => o.rec.section);
  }

  function snippetFor(section, tokens) {
    const raw = section.blocks.map(blockText).join(" ").replace(/\s+/g, " ").trim();
    if (!raw) return "";
    const low = raw.toLowerCase();
    let pos = -1;
    for (const t of tokens) {
      const p = low.indexOf(t);
      if (p !== -1 && (pos === -1 || p < pos)) pos = p;
    }
    if (pos === -1) pos = 0;
    const start = Math.max(0, pos - 60);
    const end = Math.min(raw.length, pos + 160);
    let s = (start > 0 ? "… " : "") + raw.slice(start, end) + (end < raw.length ? " …" : "");
    for (const t of tokens) {
      s = s.replaceAll(t, `${t}`);
    }
    return esc(s).replaceAll("", "<mark>").replaceAll("", "</mark>");
  }

  /* ---------------- История ---------------- */
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
    catch (e) { return []; }
  }
  function saveHistory(q) {
    try {
      let h = loadHistory().filter(x => x !== q);
      h.unshift(q);
      h = h.slice(0, 8);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    } catch (e) { /* ignore */ }
  }

  /* ---------------- UI ---------------- */
  let overlay, input, resultsEl, metaEl, historyEl, statusEl, voiceBtn;

  function buildUi() {
    overlay = document.createElement("div");
    overlay.className = "os-search-overlay";
    overlay.innerHTML = `
      <div class="os-search-modal" role="dialog" aria-modal="true" aria-label="Поиск по руководству">
        <div class="os-search-head">
          <span class="os-search-title">Поиск по руководству LADA Granta</span>
          <button type="button" class="os-search-close" aria-label="Закрыть">✕</button>
        </div>
        <div class="os-search-box">
          <div class="os-search-input-row">
            <input type="search" class="os-search-input" placeholder="Например: давление в шинах, предохранитель, ABS…" autocomplete="off" spellcheck="false">
            <button type="button" class="os-search-tool os-search-voice" title="Голосовой ввод" aria-label="Голосовой ввод">🎤</button>
            <button type="button" class="os-search-tool os-search-go" title="Найти" aria-label="Найти">→</button>
          </div>
          <div class="os-search-history"></div>
          <div class="os-search-meta"><span class="os-search-status"></span></div>
        </div>
        <div class="os-search-results"></div>
      </div>`;
    document.body.appendChild(overlay);
    input = overlay.querySelector(".os-search-input");
    resultsEl = overlay.querySelector(".os-search-results");
    metaEl = overlay.querySelector(".os-search-meta");
    statusEl = overlay.querySelector(".os-search-status");
    historyEl = overlay.querySelector(".os-search-history");
    voiceBtn = overlay.querySelector(".os-search-voice");

    overlay.querySelector(".os-search-close").addEventListener("click", closeSearch);
    overlay.addEventListener("click", e => { if (e.target === overlay) closeSearch(); });
    overlay.querySelector(".os-search-go").addEventListener("click", () => runSearch(input.value));
    input.addEventListener("input", () => runSearch(input.value));
    input.addEventListener("keydown", onInputKeydown);
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && overlay.classList.contains("open")) closeSearch();
      if (e.key === "/" && !overlay.classList.contains("open") && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        e.preventDefault();
        openSearch();
      }
    });
    voiceBtn.addEventListener("click", toggleVoice);
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) voiceBtn.disabled = true;
  }

  function onInputKeydown(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!lastResults.length) return;
      activeIndex = e.key === "ArrowDown"
        ? Math.min(activeIndex + 1, lastResults.length - 1)
        : Math.max(activeIndex - 1, 0);
      highlightActive();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIndex >= 0 ? lastResults[activeIndex] : lastResults[0];
      if (target) goToSection(target);
    }
  }
  function highlightActive() {
    resultsEl.querySelectorAll(".os-search-result").forEach((el, i) => {
      el.classList.toggle("active", i === activeIndex);
      if (i === activeIndex) el.scrollIntoView({ block: "nearest" });
    });
  }

  function renderHistory() {
    const h = loadHistory();
    historyEl.innerHTML = h.map(q => `<button type="button" class="os-search-chip">${esc(q)}</button>`).join("");
    historyEl.querySelectorAll(".os-search-chip").forEach(chip => {
      chip.addEventListener("click", () => { input.value = chip.textContent; runSearch(chip.textContent); input.focus(); });
    });
  }

  function runSearch(query) {
    const tokens = tokenize(query);
    activeIndex = -1;
    if (!tokens.length) {
      resultsEl.innerHTML = `<div class="os-search-empty">Введите не менее ${MIN_QUERY} символов. Работает поиск по разделам, таблицам и подписям иллюстраций.</div>`;
      statusEl.textContent = "";
      lastResults = [];
      return;
    }
    lastResults = search(query);
    if (lastResults.length) saveHistory(normalize(query));
    statusEl.textContent = lastResults.length
      ? `Найдено разделов: ${lastResults.length}`
      : "Ничего не найдено. Попробуйте изменить запрос.";
    resultsEl.innerHTML = lastResults.length
      ? lastResults.map((s, i) => `
        <button type="button" class="os-search-result" data-path="${esc(s.path)}" data-i="${i}">
          <span class="os-search-result-cat">${esc(s.category)}</span>
          <span class="os-search-result-title">${esc(s.title)}</span>
          <span class="os-search-result-snippet">${snippetFor(s, tokens)}</span>
        </button>`).join("")
      : "";
    resultsEl.querySelectorAll(".os-search-result").forEach(btn => {
      btn.addEventListener("click", () => goToSection(btn.getAttribute("data-path")));
      btn.addEventListener("mousemove", () => { activeIndex = +btn.getAttribute("data-i"); highlightActive(); });
    });
    renderHistory();
  }

  function goToSection(path) {
    closeSearch();
    if (typeof window.goToPath === "function") window.goToPath(path);
    else location.hash = "#/" + path.replace(/\.html$/, "");
    setTimeout(() => {
      const sec = (typeof SECTIONS !== "undefined") && SECTIONS.find(s => s.path === path);
      if (sec) {
        const el = document.getElementById(path.replace(/\.html$/, "").replaceAll("/", "-"));
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 60);
  }

  function toggleVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (recognizing && recognition) { recognition.stop(); return; }
    recognition = new SR();
    recognition.lang = VOICE_LANG;
    recognition.interimResults = false;
    recognizing = true;
    voiceBtn.classList.add("listening");
    statusEl.textContent = "Говорите…";
    recognition.onresult = e => {
      const text = e.results[0][0].transcript;
      input.value = text;
      runSearch(text);
    };
    recognition.onend = () => { recognizing = false; voiceBtn.classList.remove("listening"); };
    recognition.onerror = () => { recognizing = false; voiceBtn.classList.remove("listening"); statusEl.textContent = "Голосовой ввод недоступен."; };
    recognition.start();
  }

  function openSearch() {
    if (!overlay) buildUi();
    overlay.classList.add("open");
    renderHistory();
    if (!resultsEl.innerHTML) {
      resultsEl.innerHTML = `<div class="os-search-empty">Поиск по ${getSections().length} разделам руководства LADA Granta. Клавиша «/» — быстрый вызов поиска.</div>`;
    }
    setTimeout(() => input.focus(), 30);
  }
  function closeSearch() {
    if (overlay) overlay.classList.remove("open");
    if (recognizing && recognition) recognition.stop();
  }

  document.addEventListener("DOMContentLoaded", () => {
    const headerBtn = document.getElementById("headerSearchBtn");
    const sideBtn = document.getElementById("osIntegratedSearchBtn");
    if (headerBtn) headerBtn.addEventListener("click", openSearch);
    if (sideBtn) sideBtn.addEventListener("click", openSearch);
  });

  window.osSearch = { open: openSearch, close: closeSearch };
})();
