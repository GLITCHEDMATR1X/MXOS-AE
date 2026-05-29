(() => {
  'use strict';

  const DATA_URL = './assets/data/matrixcore_chapters.json?v=20260529-pass42-preview-cleanup';
  const SECTION_ID = 'matrixcoreLoreSection';
  const STYLE_ID = 'matrixcore-lore-reader-no-notes-style';
  const MAX_PREVIEW_CHARS = 118;
  const bodyCache = new Map();
  let activeChapterId = '';

  const fallbackChapters = [
    {
      id: '00',
      title: 'The Utopia Project',
      summary: 'A controlled artificial island promises a managed future while deeper systems begin to surface.',
      body: 'The Utopia Project\n\nThe full MatrixCore chapter feed is still loading. Hard refresh once if this fallback remains visible.'
    }
  ];

  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .matrixcore-lore-section { margin-top: clamp(18px, 1.4vw, 30px) !important; padding: clamp(18px, 1.4vw, 30px) !important; border-color: rgba(190, 20, 30, .28) !important; background: linear-gradient(180deg, rgba(12, 5, 7, .98), rgba(3, 7, 10, .98)) !important; }
      .matrixcore-lore-head { display: flex; justify-content: space-between; align-items: end; gap: 18px; margin-bottom: 18px; }
      .matrixcore-lore-head h2 { margin: 8px 0 0; font-size: clamp(2rem, 2vw, 4rem); line-height: 1.02; }
      .matrixcore-lore-head p { margin: 10px 0 0; color: var(--muted, #b8b8b8); max-width: 105ch; line-height: 1.6; }
      .matrixcore-reader-layout { display: grid; grid-template-columns: minmax(260px, 360px) minmax(0, 1fr); gap: clamp(14px, 1.2vw, 22px); align-items: stretch; }
      .matrixcore-chapter-list, .matrixcore-reader-panel { border: 1px solid rgba(255, 60, 70, .16); border-radius: 16px; background: rgba(0, 10, 14, .56); }
      .matrixcore-chapter-list { display: grid; align-content: start; gap: 8px; max-height: min(78vh, 760px); overflow: auto; padding: 12px; }
      .matrixcore-chapter-button { display: grid; gap: 4px; width: 100%; text-align: left; color: #e9f7fb; border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.035); border-radius: 12px; padding: 12px; cursor: pointer; }
      .matrixcore-chapter-button:hover, .matrixcore-chapter-button.active { border-color: rgba(255, 58, 58, .48); background: rgba(170, 20, 26, .18); }
      .matrixcore-chapter-button strong { font-size: .98rem; line-height: 1.25; }
      .matrixcore-chapter-button span { color: var(--muted, #b8b8b8); font-size: .82rem; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      .matrixcore-reader-panel { padding: clamp(18px, 1.4vw, 28px); min-height: 520px; max-height: min(82vh, 820px); overflow: auto; }
      .matrixcore-reader-panel h3 { margin: 0 0 12px; font-size: clamp(1.8rem, 1.7vw, 3rem); line-height: 1.05; }
      .matrixcore-reader-meta { color: #ff5058; letter-spacing: .14em; text-transform: uppercase; font-size: .78rem; margin-bottom: 12px; }
      .matrixcore-reader-body { white-space: pre-wrap; color: #dbe6ea; line-height: 1.72; font-size: clamp(1rem, .76vw, 1.16rem); max-width: 112ch; }
      .matrixcore-loading { color: #ff7b7b; letter-spacing: .08em; text-transform: uppercase; font-size: .85rem; }
      .matrixcore-search { width: 100%; padding: 12px 14px; color: #fff; border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: rgba(0,0,0,.42); margin-bottom: 10px; }
      @media (max-width: 1180px) { .matrixcore-reader-layout { grid-template-columns: 1fr; } .matrixcore-chapter-list, .matrixcore-reader-panel { max-height: none; } }
    `;
    document.head.appendChild(style);
  }

  function sanitizePublicCopy() {
    document.querySelectorAll('.gallery-note').forEach((el) => {
      const text = el.textContent || '';
      if (/assets\/images|replace files|click any image/i.test(text)) {
        el.textContent = 'Prototype media and screenshots from GLITCHED MATRIX Prototype Lab.';
      }
    });
    document.querySelectorAll('.tag-cloud span, .tag-cloud-secondary span').forEach((el) => {
      if (/route cleanup|setup instructions|site-replaceable/i.test(el.textContent || '')) {
        el.remove();
      }
    });
    document.querySelectorAll('[data-key="aboutBody2"], [data-key="roadmapTitle"], [data-key="roadmapLabel"]').forEach((el) => {
      el.textContent = (el.textContent || '').replace('site-replaceable media', 'new public media');
    });
  }

  function schedulePublicCopyCleanup() {
    [0, 120, 500, 1200, 2600, 5200].forEach((delay) => window.setTimeout(sanitizePublicCopy, delay));
  }

  function collapseWhitespace(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function stripRepeatedTitle(text, chapter) {
    const title = collapseWhitespace(chapter && chapter.title);
    let output = collapseWhitespace(text);
    if (title && output.toLowerCase().startsWith(title.toLowerCase())) {
      output = output.slice(title.length).replace(/^[\s:—-]+/, '').trim();
    }
    return output || collapseWhitespace(text);
  }

  function clampPreview(value, maxChars = MAX_PREVIEW_CHARS) {
    const text = collapseWhitespace(value);
    if (text.length <= maxChars) return text;
    const cut = text.slice(0, maxChars);
    const lastSpace = cut.lastIndexOf(' ');
    const safeEnd = lastSpace > 72 ? lastSpace : maxChars;
    return `${cut.slice(0, safeEnd).trim()}…`;
  }

  function makeChapterPreview(chapter) {
    const raw = collapseWhitespace((chapter && (chapter.teaser || chapter.preview || chapter.summary)) || '');
    const cleaned = stripRepeatedTitle(raw, chapter);
    return clampPreview(cleaned || 'Open recovered chapter record.');
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function makeSection() {
    let section = document.getElementById(SECTION_ID);
    if (section) return section;
    section = document.createElement('section');
    section.id = SECTION_ID;
    section.className = 'panel content-card matrixcore-lore-section';
    section.innerHTML = `
      <div class="matrixcore-lore-head">
        <div>
          <span class="section-label">Lore Archive</span>
          <h2>MatrixCore Chapters</h2>
          <p>Read the recovered chapter archive behind HoloVerse, HoloCore, Gleebs, Utopia, and the prototype realities.</p>
        </div>
      </div>
      <div class="matrixcore-reader-layout">
        <aside>
          <input id="matrixcoreSearch" class="matrixcore-search" type="search" placeholder="Search chapters..." aria-label="Search MatrixCore chapters" />
          <div id="matrixcoreChapterList" class="matrixcore-chapter-list"></div>
        </aside>
        <article id="matrixcoreReaderPanel" class="matrixcore-reader-panel"></article>
      </div>`;
    const main = document.querySelector('main.main-shell') || document.querySelector('main') || document.body;
    main.appendChild(section);
    const nav = document.querySelector('.nav');
    if (nav && !nav.querySelector('a[href="#matrixcoreLoreSection"]')) {
      const link = document.createElement('a');
      link.href = '#matrixcoreLoreSection';
      link.textContent = 'Lore';
      nav.appendChild(link);
    }
    return section;
  }

  async function loadBody(chapter) {
    const bundledBody = chapter.body || '';
    if (!chapter.bodyUrl) return bundledBody || 'Full chapter text is not bundled yet.';
    if (bodyCache.has(chapter.bodyUrl)) return bodyCache.get(chapter.bodyUrl);
    const response = await fetch(chapter.bodyUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Chapter text returned ${response.status}`);
    const text = await response.text();
    if (!text.trim()) throw new Error('Chapter text was empty');
    bodyCache.set(chapter.bodyUrl, text);
    return text;
  }

  async function renderChapter(chapter) {
    const panel = document.getElementById('matrixcoreReaderPanel');
    if (!panel || !chapter) return;
    activeChapterId = chapter.id;
    panel.innerHTML = `<div class="matrixcore-reader-meta">Chapter ${escapeHtml(chapter.id || '')}</div><h3>${escapeHtml(chapter.title || 'Untitled')}</h3><div class="matrixcore-loading">Loading full chapter...</div>`;
    try {
      const body = await loadBody(chapter);
      if (activeChapterId !== chapter.id) return;
      panel.innerHTML = `<div class="matrixcore-reader-meta">Chapter ${escapeHtml(chapter.id || '')}</div><h3>${escapeHtml(chapter.title || 'Untitled')}</h3><div class="matrixcore-reader-body">${escapeHtml(body)}</div>`;
    } catch (err) {
      console.warn('MatrixCore chapter text unavailable:', err);
      if (activeChapterId !== chapter.id) return;
      const fallback = chapter.body || 'Full chapter text is temporarily unavailable. The short chapter preview remains on the left, but the full story was not loaded into this panel.';
      panel.innerHTML = `<div class="matrixcore-reader-meta">Chapter ${escapeHtml(chapter.id || '')}</div><h3>${escapeHtml(chapter.title || 'Untitled')}</h3><div class="matrixcore-reader-body">${escapeHtml(fallback)}</div>`;
    }
  }

  function renderList(chapters, activeId) {
    const host = document.getElementById('matrixcoreChapterList');
    if (!host) return;
    host.innerHTML = '';
    chapters.forEach((chapter) => {
      const button = document.createElement('button');
      const preview = makeChapterPreview(chapter);
      button.type = 'button';
      button.className = 'matrixcore-chapter-button' + (chapter.id === activeId ? ' active' : '');
      button.setAttribute('aria-label', `Open chapter ${chapter.id || ''}: ${chapter.title || 'Untitled'}`);
      button.innerHTML = `<strong>${escapeHtml(chapter.id)} — ${escapeHtml(chapter.title)}</strong><span>${escapeHtml(preview)}</span>`;
      button.addEventListener('click', () => {
        renderList(chapters, chapter.id);
        renderChapter(chapter);
      });
      host.appendChild(button);
    });
  }

  function bindSearch(allChapters) {
    const search = document.getElementById('matrixcoreSearch');
    if (!search) return;
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      const filtered = allChapters.filter((chapter) => `${chapter.id} ${chapter.title} ${makeChapterPreview(chapter)} ${chapter.searchText || ''}`.toLowerCase().includes(q));
      renderList(filtered, filtered[0] && filtered[0].id);
      if (filtered[0]) renderChapter(filtered[0]);
    });
  }

  async function loadChapters() {
    try {
      const res = await fetch(DATA_URL, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Chapter data returned ${res.status}`);
      const data = await res.json();
      return Array.isArray(data.chapters) && data.chapters.length ? data.chapters : fallbackChapters;
    } catch (err) {
      console.warn('MatrixCore reader fallback:', err);
      return fallbackChapters;
    }
  }

  async function boot() {
    installStyle();
    makeSection();
    schedulePublicCopyCleanup();
    const chapters = await loadChapters();
    renderList(chapters, chapters[0] && chapters[0].id);
    if (chapters[0]) renderChapter(chapters[0]);
    bindSearch(chapters);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
