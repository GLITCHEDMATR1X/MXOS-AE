const defaultConfig = {
  microLabel: 'GLITCHED MATRIX',
  heroEyebrow: '> Gaming Platform / Operating System / Game Engine <',
  heroTitle: 'GLITCHED MATRIX Prototype Lab',
  heroLead: 'A dark system hub for prototypes, creator tools, browser experiments, and modular apps — with VR support currently in development and a long-term goal of becoming an immersive platform for testers, modders, content creators, publishers, and gamers.',
  heroTags: ['Prototype Hub', 'Browser Experiments', 'VR Support in Progress', 'Immersive Platform Vision'],
  galleryNote: 'Click any image to open it at full size. Add more images from the admin panel without duplicating what is already here.',
  stat1Label: 'Status',
  stat1Value: 'Active Development',
  stat2Label: 'Current Focus',
  stat2Value: 'VR Support + Core Platform',
  stat3Label: 'Identity',
  stat3Value: 'Gaming Platform / Operating System / Game Engine',
  stat4Label: 'Long-Term Goal',
  stat4Value: 'Immersive Platform Ecosystem',
  aboutLabel: 'About This Project',
  aboutTitle: 'A prototype hub designed to grow',
  aboutBody1: 'GLITCHED MATRIX Prototype Lab is positioned as a digital lab where games, browser experiments, tools, workflows, and system modules can live inside one branded environment.',
  aboutBody2: 'The goal is not just a single title page. It is the front end of a growing platform for testing, modding, creation, publishing, and play across multiple kinds of experiences.',
  fictionLabel: 'Lore',
  fictionTitle: 'The world behind the lab',
  fictionBody1: 'The brand gains more identity when it feels like a surviving system: damaged infrastructure, preserved prototypes, and unfinished experiments being pushed back online.',
  fictionBody2: 'That fiction helps the lab, the tools, and the future services all feel like part of the same world instead of separate products.',
  featuresLabel: 'Current Focus',
  featuresTitle: 'What Prototype Lab is building toward',
  features: [
    { title: 'Prototype Library', body: 'A growing collection of games, apps, experiments, and internal tools can live under one branded hub.' },
    { title: 'Browser Game Section', body: 'Small playable site games can act as an instant demo layer for visitors before they ever download anything.' },
    { title: 'Creator Tools & Workflows', body: 'The platform can support editing utilities, setup helpers, showcase tools, and other workstation-like systems.' },
    { title: 'VR Support in Progress', body: 'VR support is an active direction and should be communicated clearly as an in-development capability.' },
    { title: 'Modding and Testing Surface', body: 'The long-term platform should feel useful for testers, modders, builders, and people exploring unfinished ideas.' },
    { title: 'Platform Identity', body: 'It should read as a gaming platform, operating system, and game engine prototype space rather than a single-page store clone.' }
  ],
  roadmapLabel: 'Vision',
  roadmapTitle: 'Ultimate platform goal',
  roadmap: [
    'Become an immersive platform for testers, modders, content creators of all types, publishers, and gamers',
    'Expand into browser-playable demos, downloadable builds, and richer prototype showcases',
    'Add stronger creator workflows, utilities, and content management systems',
    'Develop VR support into a meaningful part of the platform experience',
    'Support more modular tools, custom media, and user-replaceable assets',
    'Keep improving clarity, stability, performance, and presentation quality'
  ],
  directionLabel: 'Next Phase',
  directionTitle: 'What should improve next',
  directionBody1: 'The presentation should keep pushing clarity, stability, better media presentation, and easier content swapping for the site and the platform.',
  directionBody2: 'Over time this can expand into browser-playable demos, downloadable builds, creator services, platform utilities, and deeper immersive support.',
  mediaLabel: 'Media',
  mediaTitle: 'Brand art, headers, and presentation assets',
  metaLabel: 'Platform Keywords',
  metaTitle: 'Identity and audience',
  metaTags: [
    'Gaming Platform', 'Operating System', 'Game Engine', 'Prototype Lab', 'Browser Games',
    'VR Support', 'Modding', 'Testing', 'Content Creation', 'Publishing',
    'Gamers', 'Developers', 'Workflow Tools', 'Arcade Hub', 'Creative Sandbox',
    'Interactive Media', 'Indie Tech'
  ],
  communityLabel: 'Who It Is For',
  communityTitle: 'The people the platform is meant to serve',
  community: [
    { title: 'Testers', body: 'A space for trying unfinished ideas, breaking systems, reporting issues, and helping shape what improves next.' },
    { title: 'Modders', body: 'A platform that can eventually support replaceable assets, custom content, tinkering, and deeper community experimentation.' },
    { title: 'Content creators', body: 'A hub for people who stream, record, build, design, write, animate, and produce around interactive media.' },
    { title: 'Publishers and gamers', body: 'A branded front end that can grow into a discoverable showcase for projects, partners, releases, and play.' }
  ],
  footerCopy: '© GLITCHED MATRIX — Prototype Lab',
  links: {
    primaryText: 'View on Steam',
    primaryHref: 'https://store.steampowered.com/app/4386390/Matrix_OS_Arcade_Evolution/',
    secondaryText: 'Enter the Lab',
    secondaryHref: '#about',
    trailerHref: 'https://www.youtube.com/watch?v=d78EOS1a1-8',
    trailerText: 'Watch on YouTube'
  },
  images: {
    heroHeader: 'assets/images/capsule_header.png',
    navLogo: 'assets/images/capsule_small.png',
    footerLogo: 'assets/images/capsule_small.png',
    gallery: [
      'assets/images/capsule_main.png',
      'assets/images/capsule_vertical.png',
      'assets/images/bg.png',
      'assets/images/business_card.png',
      'assets/images/qr_code.png'
    ]
  },
  theme: {
    accent: '#cc1414',
    bg: '#060606',
    panel: '#140a0a'
  },
  assetVersion: ''
};

const STORAGE_KEY = 'glitched-prototype-site-config-v2';
let config = loadConfig();
let adminOpen = false;

const IMAGE_FALLBACK_BASES = [
  '',
  './',
  'assets/images/',
  './assets/images/',
  'site_bundle/assets/images/',
  './site_bundle/assets/images/',
  'steamtemp/',
  './steamtemp/'
];

function isDirectUrl(value) {
  return /^(data:|blob:|https?:|\/)/i.test(value);
}

function uniqueList(values) {
  return [...new Set(values.filter(Boolean))];
}

function fileNameOnly(path) {
  return String(path).split('/').pop();
}

function normalizeAssetKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (isDirectUrl(raw)) return raw.toLowerCase();
  return fileNameOnly(raw).toLowerCase();
}

function appendVersion(url) {
  if (!config.assetVersion || (isDirectUrl(url) && (url.startsWith('data:') || url.startsWith('blob:')))) return url;
  const join = url.includes('?') ? '&' : '?';
  return `${url}${join}v=${encodeURIComponent(config.assetVersion)}`;
}

function makeImageCandidates(path) {
  const input = String(path || '').trim();
  if (!input) return [];
  if (isDirectUrl(input)) return [input];

  const name = fileNameOnly(input);
  const converted = [];
  if (input.includes('assets/images/')) {
    converted.push(input.replace(/^\.\//, ''));
    converted.push(input.replace('assets/images/', 'site_bundle/assets/images/'));
    converted.push(input.replace('assets/images/', 'steamtemp/'));
  } else if (input.includes('site_bundle/assets/images/')) {
    converted.push(input.replace('site_bundle/assets/images/', 'assets/images/'));
    converted.push(input.replace('site_bundle/assets/images/', 'steamtemp/'));
  } else if (input.includes('steamtemp/')) {
    converted.push(input.replace('steamtemp/', 'assets/images/'));
    converted.push(input.replace('steamtemp/', 'site_bundle/assets/images/'));
  }

  return uniqueList([
    input,
    input.replace(/^\.\//, ''),
    ...converted,
    ...IMAGE_FALLBACK_BASES.map(base => `${base}${name}`)
  ]).map(appendVersion);
}

function applyResolvedSource(el, candidates) {
  if (!el || !candidates.length) return;
  let index = 0;
  const tryNext = () => {
    if (index >= candidates.length) return;
    el.src = candidates[index++];
  };
  el.onerror = tryNext;
  tryNext();
}

function loadConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return structuredClone(defaultConfig);
    const parsed = JSON.parse(stored);
    const merged = deepMerge(structuredClone(defaultConfig), parsed);
    merged.images.gallery = dedupeGallery(merged.images.gallery);
    return merged;
  } catch {
    return structuredClone(defaultConfig);
  }
}

function deepMerge(base, extra) {
  for (const key in extra) {
    if (extra[key] && typeof extra[key] === 'object' && !Array.isArray(extra[key]) && base[key]) {
      base[key] = deepMerge(base[key], extra[key]);
    } else {
      base[key] = extra[key];
    }
  }
  return base;
}

function saveConfig() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

function setRootTheme() {
  document.documentElement.style.setProperty('--accent', config.theme.accent);
  document.documentElement.style.setProperty('--accent-bright', lighten(config.theme.accent, 26));
  document.documentElement.style.setProperty('--bg-0', config.theme.bg);
  document.documentElement.style.setProperty('--bg-1', darken(config.theme.bg, 10));
  document.documentElement.style.setProperty('--bg-2', config.theme.panel);
  document.documentElement.style.setProperty('--panel-rgb', hexToRgb(config.theme.panel));
}

function hexToRgb(hex) {
  const cleaned = hex.replace('#', '');
  const bigint = parseInt(cleaned, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

function lighten(hex, amount) { return alterHex(hex, amount); }
function darken(hex, amount) { return alterHex(hex, -amount); }

function alterHex(hex, amt) {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amt));
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

function renderList(targetId, items, formatter) {
  const node = document.getElementById(targetId);
  if (!node) return;
  node.innerHTML = '';
  items.forEach((item) => node.appendChild(formatter(item)));
}

function makeFeatureCard(item) {
  const div = document.createElement('article');
  div.className = 'feature-box';
  div.innerHTML = `<h3>${escapeHtml(item.title)}</h3><p class="feature-body">${escapeHtml(item.body)}</p>`;
  return div;
}

function makeTag(item) {
  const span = document.createElement('span');
  span.textContent = item;
  return span;
}

function makeRoadmapItem(item) {
  const li = document.createElement('li');
  li.textContent = item;
  return li;
}

function extractYouTubeId(input) {
  const value = String(input || '').trim();
  if (!value) return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  const patterns = [
    /youtu\.be\/([A-Za-z0-9_-]{11})/i,
    /[?&]v=([A-Za-z0-9_-]{11})/i,
    /youtube\.com\/embed\/([A-Za-z0-9_-]{11})/i,
    /youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/i
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return '';
}

function toYouTubeEmbedUrl(input) {
  const id = extractYouTubeId(input);
  return id ? `https://www.youtube.com/embed/${id}?rel=0` : '';
}

function applyText() {
  document.querySelectorAll('.editable[data-key]').forEach((el) => {
    const key = el.dataset.key;
    if (config[key] != null) el.innerText = config[key];
  });
  document.title = config.heroTitle || 'GLITCHED MATRIX Prototype Lab';
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute('content', config.heroLead || defaultConfig.heroLead);
}

function applyLinks() {
  const primary = document.getElementById('primaryCta');
  const secondary = document.getElementById('secondaryCta');
  const trailerLink = document.getElementById('trailerLink');
  const trailerEmbed = document.getElementById('trailerEmbed');
  primary.textContent = config.links.primaryText;
  primary.href = config.links.primaryHref;
  secondary.textContent = config.links.secondaryText;
  secondary.href = config.links.secondaryHref;
  if (trailerLink) {
    trailerLink.textContent = config.links.trailerText || 'Watch on YouTube';
    trailerLink.href = config.links.trailerHref || defaultConfig.links.trailerHref;
  }
  if (trailerEmbed) {
    trailerEmbed.src = toYouTubeEmbedUrl(config.links.trailerHref) || 'https://www.youtube.com/embed/d78EOS1a1-8?rel=0';
  }
}

function applyImages() {
  applyResolvedSource(document.getElementById('heroHeaderImage'), makeImageCandidates(config.images.heroHeader));
  applyResolvedSource(document.getElementById('navLogo'), makeImageCandidates(config.images.navLogo));
  applyResolvedSource(document.getElementById('footerLogo'), makeImageCandidates(config.images.footerLogo));
}

function dedupeGallery(items) {
  const seen = new Set();
  const out = [];
  for (const item of items || []) {
    const raw = String(item || '').trim();
    if (!raw) continue;
    const key = normalizeAssetKey(raw);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(raw);
  }
  return out;
}

function renderGallery() {
  const host = document.getElementById('mediaGallery');
  if (!host) return;
  host.innerHTML = '';
  config.images.gallery = dedupeGallery(config.images.gallery);
  config.images.gallery.forEach((path, index) => {
    const fig = document.createElement('figure');
    fig.className = 'media-card gallery-item';

    const img = document.createElement('img');
    img.alt = `GLITCHED MATRIX gallery image ${index + 1}`;
    img.loading = 'lazy';
    applyResolvedSource(img, makeImageCandidates(path));

    fig.appendChild(img);
    fig.addEventListener('click', () => openLightbox(path, img.alt));
    host.appendChild(fig);
  });
}

function openLightbox(path, alt = 'Expanded gallery image') {
  const modal = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImage');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  img.alt = alt;
  applyResolvedSource(img, makeImageCandidates(path));
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const modal = document.getElementById('lightbox');
  const img = document.getElementById('lightboxImage');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  img.removeAttribute('src');
  document.body.style.overflow = '';
}

function applyConfig() {
  setRootTheme();
  applyText();
  applyLinks();
  applyImages();
  renderGallery();
  renderList('heroTags', config.heroTags, makeTag);
  renderList('metaTags', config.metaTags, makeTag);
  renderList('featuresGrid', config.features, makeFeatureCard);
  renderList('roadmapList', config.roadmap, makeRoadmapItem);
  renderList('communityGrid', config.community, makeFeatureCard);
  syncAdminInputs();
}

function syncAdminInputs() {
  const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
  setVal('accentColor', config.theme.accent);
  setVal('bgColor', config.theme.bg);
  setVal('panelColor', config.theme.panel);
  setVal('primaryCtaText', config.links.primaryText);
  setVal('primaryCtaLink', config.links.primaryHref);
  setVal('secondaryCtaText', config.links.secondaryText);
  setVal('secondaryCtaLink', config.links.secondaryHref);
  setVal('trailerUrlInput', config.links.trailerHref);
  setVal('trailerLinkTextInput', config.links.trailerText || 'Watch on YouTube');
  setVal('heroHeaderInput', config.images.heroHeader);
  setVal('navLogoInput', config.images.navLogo);
  setVal('footerLogoInput', config.images.footerLogo);
  setVal('assetVersionInput', config.assetVersion || '');
  setVal('heroTagsInput', config.heroTags.join('\n'));
  setVal('metaTagsInput', config.metaTags.join('\n'));
  setVal('featuresInput', config.features.map(f => `${f.title} | ${f.body}`).join('\n'));
  setVal('roadmapInput', config.roadmap.join('\n'));
  setVal('communityInput', config.community.map(c => `${c.title} | ${c.body}`).join('\n'));
  setVal('galleryImagesInput', dedupeGallery(config.images.gallery).join('\n'));
}

function readEditableTextFromPage() {
  document.querySelectorAll('.editable[data-key]').forEach((el) => {
    const key = el.dataset.key;
    config[key] = el.innerText.trim();
  });
}

function parseLineItems(text) {
  return text.split('\n').map(v => v.trim()).filter(Boolean);
}

function parseCardLines(text) {
  return parseLineItems(text).map((line) => {
    const [title, ...rest] = line.split('|');
    return { title: (title || '').trim(), body: rest.join('|').trim() };
  }).filter(item => item.title && item.body);
}

function pullAdminValues() {
  readEditableTextFromPage();
  config.theme.accent = document.getElementById('accentColor').value;
  config.theme.bg = document.getElementById('bgColor').value;
  config.theme.panel = document.getElementById('panelColor').value;
  config.links.primaryText = document.getElementById('primaryCtaText').value.trim() || defaultConfig.links.primaryText;
  config.links.primaryHref = document.getElementById('primaryCtaLink').value.trim() || defaultConfig.links.primaryHref;
  config.links.secondaryText = document.getElementById('secondaryCtaText').value.trim() || defaultConfig.links.secondaryText;
  config.links.secondaryHref = document.getElementById('secondaryCtaLink').value.trim() || defaultConfig.links.secondaryHref;
  config.links.trailerHref = document.getElementById('trailerUrlInput').value.trim() || defaultConfig.links.trailerHref;
  config.links.trailerText = document.getElementById('trailerLinkTextInput').value.trim() || defaultConfig.links.trailerText;
  config.images.heroHeader = document.getElementById('heroHeaderInput').value.trim() || defaultConfig.images.heroHeader;
  config.images.navLogo = document.getElementById('navLogoInput').value.trim() || defaultConfig.images.navLogo;
  config.images.footerLogo = document.getElementById('footerLogoInput').value.trim() || defaultConfig.images.footerLogo;
  config.assetVersion = document.getElementById('assetVersionInput').value.trim();
  config.heroTags = parseLineItems(document.getElementById('heroTagsInput').value);
  config.metaTags = parseLineItems(document.getElementById('metaTagsInput').value);
  config.features = parseCardLines(document.getElementById('featuresInput').value);
  config.roadmap = parseLineItems(document.getElementById('roadmapInput').value);
  config.community = parseCardLines(document.getElementById('communityInput').value);
  config.images.gallery = dedupeGallery(parseLineItems(document.getElementById('galleryImagesInput').value));
}

function toggleAdmin(force = null) {
  adminOpen = force == null ? !adminOpen : force;
  const panel = document.getElementById('adminPanel');
  panel.classList.toggle('open', adminOpen);
  panel.setAttribute('aria-hidden', String(!adminOpen));
  document.querySelectorAll('.editable').forEach((el) => {
    el.contentEditable = adminOpen ? 'true' : 'false';
    el.classList.toggle('admin-editing', adminOpen);
  });
}

function exportJson() {
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'glitched-matrix-prototype-lab-config.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      config = deepMerge(structuredClone(defaultConfig), parsed);
      config.images.gallery = dedupeGallery(config.images.gallery);
      saveConfig();
      applyConfig();
    } catch {
      alert('Invalid JSON file.');
    }
  };
  reader.readAsText(file);
}

function bindFileInput(id, onLoad, multiple = false) {
  const input = document.getElementById(id);
  if (!input) return;
  input.addEventListener('change', (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (multiple) {
      let remaining = files.length;
      const results = [];
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          results.push(reader.result);
          remaining -= 1;
          if (remaining === 0) {
            onLoad(results);
            saveConfig();
            applyConfig();
            input.value = '';
          }
        };
        reader.readAsDataURL(file);
      });
      return;
    }

    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      onLoad(reader.result);
      saveConfig();
      applyConfig();
      input.value = '';
    };
    reader.readAsDataURL(file);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setupLightbox() {
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightbox').addEventListener('click', (event) => {
    if (event.target.id === 'lightbox') closeLightbox();
  });
}

function setupAdmin() {
  document.getElementById('adminToggle').addEventListener('click', () => toggleAdmin());
  document.getElementById('closeAdmin').addEventListener('click', () => toggleAdmin(false));
  document.getElementById('saveAdmin').addEventListener('click', () => {
    pullAdminValues();
    saveConfig();
    applyConfig();
  });
  document.getElementById('resetAdmin').addEventListener('click', () => {
    if (!confirm('Reset the page to default content?')) return;
    config = structuredClone(defaultConfig);
    saveConfig();
    applyConfig();
  });
  document.getElementById('exportAdmin').addEventListener('click', exportJson);
  document.getElementById('importAdmin').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) importJson(file);
  });

  bindFileInput('uploadNavLogo', (data) => {
    config.images.navLogo = data;
    document.getElementById('navLogoInput').value = data;
  });
  bindFileInput('uploadHeroHeader', (data) => {
    config.images.heroHeader = data;
    document.getElementById('heroHeaderInput').value = data;
  });
  bindFileInput('uploadFooterLogo', (data) => {
    config.images.footerLogo = data;
    document.getElementById('footerLogoInput').value = data;
  });
  bindFileInput('uploadGalleryImages', (list) => {
    config.images.gallery = dedupeGallery([...(config.images.gallery || []), ...list]);
    document.getElementById('galleryImagesInput').value = config.images.gallery.join('\n');
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      toggleAdmin();
    }
    if (event.key === 'Escape') {
      if (document.getElementById('lightbox').classList.contains('open')) {
        closeLightbox();
      } else if (adminOpen) {
        toggleAdmin(false);
      }
    }
  });

  if (new URLSearchParams(window.location.search).get('admin') === '1') {
    toggleAdmin(true);
  }
}

applyConfig();
setupLightbox();
setupAdmin();
