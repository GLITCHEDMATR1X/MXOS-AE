(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  const VERSION = '20260430-pass16-satellite-tour';
  const SEED = 81221;
  const TILE = 96;
  const DISTRICT = 8;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
  const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const hash = (x, y = 0, z = 0) => {
    const n = Math.sin((x * 127.1 + y * 311.7 + z * 74.7 + SEED) * 0.0174532925) * 43758.5453;
    return n - Math.floor(n);
  };
  const key = (x, y) => `${x},${y}`;
  const districts = [
    { name: 'Metropolis Archive', color: [136, 82, 255], note: 'Archivist territory. Robot selection, skyline memory towers, and archive relays.' },
    { name: 'Urban Warzone Gate', color: [120, 126, 134], note: 'Sable route watch. Urban remains route-check-first before bigger combat expansion.' },
    { name: 'Green Hills Preserve', color: [60, 220, 96], note: 'Nyx hill region. Persistent hills, grown animal life, and calmer terrain loops.' },
    { name: 'Mushroom Oddities', color: [255, 96, 210], note: 'Oddities field. Persistent mushroom growth, rare props, and playful anomaly paths.' },
    { name: 'Water Depths', color: [40, 160, 255], note: 'Solace water route. Blue life currents, swimming craft ideas, and shoreline signal rings.' },
    { name: 'Desert Ember Belt', color: [255, 160, 44], note: 'Ember route. Pyramids, hangar concepts, amber grid sand, and long horizon silhouettes.' },
    { name: 'Ice Mirror Shelf', color: [120, 220, 255], note: 'Mirror route. Blue cube fields, floating ice blocks, and reflective terrain patterns.' },
    { name: 'Flat IO Ring', color: [218, 222, 232], note: 'IO route. Clean silver guidance layer, safe tour beacons, and patch-note relays.' }
  ];

  let canvas, ctx, audioCtx;
  let cam = { x: 0, y: 0, zoom: 0.72, targetZoom: 0.72 };
  let keys = Object.create(null);
  let dragging = false;
  let lastPointer = null;
  let last = 0;
  let time = 0;
  let hover = null;
  let panel = null;
  let muted = false;
  let roadPulse = 0;

  function style() {
    const el = document.createElement('style');
    el.textContent = `
      .demo-head .btn[href*=demo_manifest],#demoGalleryGrid,.demo-gallery-grid{display:none!important}
      .demo-runtime-ready .demo-loading-overlay{display:none!important}
      .demo-canvas-shell{background:#02050a;padding:12px;min-height:390px;overflow:hidden}
      .holoverse-demo-canvas,.demo-canvas{min-height:360px;background:#01040a;outline:none;border:1px solid rgba(80,180,255,.36);box-shadow:inset 0 0 90px rgba(0,0,0,.72),0 0 34px rgba(40,160,255,.16);cursor:grab;touch-action:none}
      .holoverse-demo-canvas:active{cursor:grabbing}
      .demo-audio-button[aria-pressed=true]{background:rgba(60,160,255,.18);border-color:rgba(130,220,255,.65)}
    `;
    document.head.appendChild(el);
  }

  function beep(freq = 240, dur = 0.04, gain = 0.004, type = 'sine') {
    if (muted) return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(audioCtx.destination);
      osc.start();
      g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
      osc.stop(audioCtx.currentTime + dur + 0.02);
    } catch {}
  }

  function districtAt(wx, wy) {
    const gx = Math.floor(wx / (TILE * DISTRICT));
    const gy = Math.floor(wy / (TILE * DISTRICT));
    const id = Math.floor(hash(gx, gy, 41) * districts.length) % districts.length;
    return { ...districts[id], gx, gy, id };
  }

  function tileAt(wx, wy) {
    return { tx: Math.floor(wx / TILE), ty: Math.floor(wy / TILE) };
  }

  function tileInfo(tx, ty) {
    const d = districtAt((tx + 0.5) * TILE, (ty + 0.5) * TILE);
    const h = hash(tx, ty, 7);
    const roadX = tx % 4 === 0;
    const roadY = ty % 4 === 0;
    const water = h > 0.91 && d.name.includes('Water');
    const park = !water && h > 0.84;
    const plaza = !water && !park && h < 0.09;
    const height = plaza || park || water ? 0 : 1 + Math.floor(hash(tx, ty, 12) * 9);
    return { d, roadX, roadY, road: roadX || roadY, water, park, plaza, height, seed: h };
  }

  function worldToScreen(wx, wy) {
    return { x: (wx - cam.x) * cam.zoom + canvas.width / 2, y: (wy - cam.y) * cam.zoom + canvas.height / 2 };
  }

  function screenToWorld(sx, sy) {
    return { x: (sx - canvas.width / 2) / cam.zoom + cam.x, y: (sy - canvas.height / 2) / cam.zoom + cam.y };
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const w = Math.max(640, Math.floor(r.width * dpr));
    const h = Math.max(360, Math.floor(w * 9 / 16));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function visibleTiles(pad = 2) {
    const tl = screenToWorld(0, 0);
    const br = screenToWorld(canvas.width, canvas.height);
    const x0 = Math.floor(Math.min(tl.x, br.x) / TILE) - pad;
    const x1 = Math.ceil(Math.max(tl.x, br.x) / TILE) + pad;
    const y0 = Math.floor(Math.min(tl.y, br.y) / TILE) - pad;
    const y1 = Math.ceil(Math.max(tl.y, br.y) / TILE) + pad;
    const out = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push({ x, y });
    return out;
  }

  function drawSky() {
    const u = (Math.sin(time * 0.035) + 1) / 2;
    const top = mix([1, 4, 12], [12, 10, 30], u);
    const mid = mix([10, 52, 86], [85, 35, 118], u);
    const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    g.addColorStop(0, rgba(top, 1));
    g.addColorStop(0.56, rgba(mid, 1));
    g.addColorStop(1, '#02040a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(160,220,255,.07)';
    ctx.lineWidth = 1;
    const step = 40 * cam.zoom;
    if (step > 10) {
      const origin = worldToScreen(0, 0);
      for (let x = ((origin.x % step) + step) % step; x < canvas.width; x += step) line(x, 0, x, canvas.height);
      for (let y = ((origin.y % step) + step) % step; y < canvas.height; y += step) line(0, y, canvas.width, y);
    }
  }

  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  function rect(x, y, w, h, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.strokeRect(x, y, w, h);
    }
  }

  function drawTile(tx, ty) {
    const info = tileInfo(tx, ty);
    const p = worldToScreen(tx * TILE, ty * TILE);
    const s = TILE * cam.zoom;
    if (p.x + s < -20 || p.y + s < -20 || p.x > canvas.width + 20 || p.y > canvas.height + 20) return;
    const base = info.d.color;
    let fill = rgba(mix([8, 13, 22], base, 0.13), 0.94);
    let stroke = rgba(mix([20, 80, 115], base, 0.5), 0.28);
    if (info.water) fill = rgba([5, 38, 76], 0.96);
    if (info.park) fill = rgba(mix([8, 42, 24], base, 0.18), 0.92);
    if (info.plaza) fill = rgba(mix([24, 20, 32], base, 0.32), 0.9);
    rect(p.x, p.y, s + 0.5, s + 0.5, fill, stroke);

    if (info.water) {
      ctx.strokeStyle = rgba([70, 200, 255], 0.18 + Math.sin(time * 2 + tx + ty) * 0.04);
      for (let i = 0; i < 3; i++) line(p.x + s * 0.12, p.y + s * (0.28 + i * 0.22), p.x + s * 0.88, p.y + s * (0.35 + i * 0.22));
      return;
    }

    if (info.road) {
      const road = rgba([12, 18, 24], 0.98);
      if (info.roadX) rect(p.x + s * 0.38, p.y, s * 0.24, s, road, null);
      if (info.roadY) rect(p.x, p.y + s * 0.38, s, s * 0.24, road, null);
      ctx.strokeStyle = rgba(mix([60, 170, 255], base, 0.5), 0.22 + roadPulse * 0.08);
      if (info.roadX) line(p.x + s * 0.5, p.y, p.x + s * 0.5, p.y + s);
      if (info.roadY) line(p.x, p.y + s * 0.5, p.x + s, p.y + s * 0.5);
    }

    if (info.park) {
      ctx.fillStyle = rgba([70, 255, 130], 0.34);
      for (let i = 0; i < 5; i++) {
        const ax = p.x + s * (0.18 + hash(tx, ty, i) * 0.64);
        const ay = p.y + s * (0.18 + hash(tx, ty, i + 20) * 0.64);
        ctx.beginPath();
        ctx.arc(ax, ay, Math.max(1.5, s * (0.035 + hash(tx, ty, i + 44) * 0.035)), 0, TAU);
        ctx.fill();
      }
    } else if (!info.road && info.height) {
      const b = s * (0.18 + hash(tx, ty, 33) * 0.17);
      const bx = p.x + s * (0.18 + hash(tx, ty, 34) * 0.18);
      const by = p.y + s * (0.18 + hash(tx, ty, 35) * 0.18);
      const bw = s * (0.48 + hash(tx, ty, 36) * 0.18);
      const bh = s * (0.48 + hash(tx, ty, 37) * 0.18);
      const shade = clamp(0.14 + info.height * 0.045, 0.16, 0.58);
      rect(bx, by, bw, bh, rgba(mix([20, 28, 42], base, shade), 0.92), rgba(mix([85, 220, 255], base, 0.55), 0.36));
      if (cam.zoom > 0.45) {
        ctx.fillStyle = rgba([220, 245, 255], 0.14);
        const cols = Math.max(2, Math.floor(bw / 12));
        const rows = Math.max(2, Math.floor(bh / 12));
        for (let iy = 0; iy < rows; iy++) for (let ix = 0; ix < cols; ix++) if (hash(tx + ix, ty + iy, 71) > 0.5) ctx.fillRect(bx + 5 + ix * 12, by + 5 + iy * 12, 3, 3);
      }
      if (cam.zoom > 0.28) {
        ctx.fillStyle = rgba([255, 255, 255], 0.06);
        ctx.fillRect(bx + b * 0.15, by + b * 0.15, bw * 0.72, bh * 0.12);
      }
    }
  }

  function trafficPoint(i) {
    const lane = Math.floor(hash(i, 2) * 160) - 80;
    const road = Math.floor(hash(i, 3) * 160) - 80;
    const horizontal = hash(i, 4) > 0.5;
    const speed = 42 + hash(i, 5) * 92;
    const phase = (time * speed + hash(i, 6) * TILE * 120) % (TILE * 160);
    if (horizontal) return { x: phase - TILE * 80, y: road * TILE + TILE * 0.5 + (hash(i, 7) - 0.5) * 12, horizontal, i };
    return { x: road * TILE + TILE * 0.5 + (hash(i, 8) - 0.5) * 12, y: phase - TILE * 80, horizontal, i };
  }

  function drawTraffic() {
    const count = clamp(Math.floor(90 * cam.zoom + 90), 70, 180);
    for (let i = 0; i < count; i++) {
      const v = trafficPoint(i);
      const p = worldToScreen(v.x, v.y);
      if (p.x < -30 || p.y < -30 || p.x > canvas.width + 30 || p.y > canvas.height + 30) continue;
      const d = districtAt(v.x, v.y);
      const len = clamp(14 * cam.zoom, 3, 18);
      const wid = clamp(6 * cam.zoom, 2, 8);
      ctx.save();
      ctx.translate(p.x, p.y);
      if (!v.horizontal) ctx.rotate(Math.PI / 2);
      ctx.fillStyle = rgba(mix([120, 220, 255], d.color, hash(i, 11)), 0.9);
      ctx.fillRect(-len / 2, -wid / 2, len, wid);
      ctx.fillStyle = 'rgba(255,255,255,.62)';
      ctx.fillRect(len * 0.05, -wid / 2, len * 0.18, wid);
      ctx.restore();
    }
  }

  function drawCivilians() {
    if (cam.zoom < 0.42) return;
    const visible = visibleTiles(1);
    ctx.fillStyle = 'rgba(240,245,255,.45)';
    for (const t of visible) {
      if (hash(t.x, t.y, 88) < 0.55) continue;
      for (let i = 0; i < 3; i++) {
        const wx = t.x * TILE + TILE * (0.18 + hash(t.x, t.y, i) * 0.64) + Math.sin(time + i) * 4;
        const wy = t.y * TILE + TILE * (0.18 + hash(t.x, t.y, i + 9) * 0.64) + Math.cos(time * 0.9 + i) * 4;
        const p = worldToScreen(wx, wy);
        ctx.beginPath();
        ctx.arc(p.x, p.y, clamp(2.2 * cam.zoom, 1, 3.2), 0, TAU);
        ctx.fill();
      }
    }
  }

  function drawBeacons() {
    const visible = visibleTiles(1);
    for (const t of visible) {
      const info = tileInfo(t.x, t.y);
      if (hash(t.x, t.y, 55) < 0.08 || (t.x === 0 && t.y === 0)) {
        const p = worldToScreen((t.x + 0.5) * TILE, (t.y + 0.5) * TILE);
        const r = clamp((14 + Math.sin(time * 2 + t.x) * 3) * cam.zoom, 4, 20);
        ctx.strokeStyle = rgba(info.d.color, 0.7);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = rgba([255, 255, 255], 0.08);
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.45, 0, TAU);
        ctx.fill();
      }
    }
  }

  function drawLabels() {
    if (cam.zoom < 0.22) return;
    const visible = visibleTiles(0);
    const seen = new Set();
    ctx.font = `${Math.max(11, 12 * cam.zoom)}px Consolas, monospace`;
    ctx.textAlign = 'center';
    for (const t of visible) {
      const info = tileInfo(t.x, t.y);
      const dKey = key(info.d.gx, info.d.gy);
      if (seen.has(dKey)) continue;
      seen.add(dKey);
      const center = worldToScreen((info.d.gx * DISTRICT + DISTRICT / 2) * TILE, (info.d.gy * DISTRICT + DISTRICT / 2) * TILE);
      if (center.x < -100 || center.y < -100 || center.x > canvas.width + 100 || center.y > canvas.height + 100) continue;
      ctx.fillStyle = rgba(info.d.color, 0.42);
      ctx.fillText(info.d.name.toUpperCase(), center.x, center.y);
    }
  }

  function findClicked(wx, wy) {
    for (let i = 0; i < 180; i++) {
      const v = trafficPoint(i);
      if (Math.hypot(v.x - wx, v.y - wy) < 16 / cam.zoom) {
        const d = districtAt(v.x, v.y);
        return { title: 'Civilian Traffic Flow', body: `${d.name}: autonomous routes, supply movement, commuting drones, and population signals are active in this tour layer.` };
      }
    }
    const { tx, ty } = tileAt(wx, wy);
    const info = tileInfo(tx, ty);
    if (info.water) return { title: info.d.name, body: info.d.note + ' Clicked a waterway / shoreline current tile.' };
    if (info.park) return { title: info.d.name, body: info.d.note + ' Clicked a park / life-preserve tile.' };
    if (info.road) return { title: 'HoloVerse Transit Grid', body: `${info.d.name}: roads stream traffic and connect bot-owned districts across the demo city.` };
    if (hash(tx, ty, 55) < 0.08 || (tx === 0 && ty === 0)) return { title: 'Tour Beacon', body: info.d.note };
    if (info.height) return { title: `${info.d.name} Structure`, body: `Building height tier ${info.height}. ${info.d.note}` };
    return { title: info.d.name, body: info.d.note };
  }

  function drawPanel() {
    if (!panel) return;
    panel.life -= 1 / 60;
    if (panel.life <= 0) { panel = null; return; }
    const a = clamp(panel.life, 0, 1);
    const x = 24, y = canvas.height - 134, w = Math.min(520, canvas.width - 48), h = 108;
    ctx.fillStyle = `rgba(2,8,16,${0.78 * a})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = `rgba(120,210,255,${0.55 * a})`;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = `rgba(210,240,255,${0.95 * a})`;
    ctx.textAlign = 'left';
    ctx.font = 'bold 15px Consolas, monospace';
    ctx.fillText(panel.title, x + 16, y + 28);
    ctx.font = '13px Consolas, monospace';
    wrap(panel.body, x + 16, y + 53, w - 32, 17, a);
  }

  function wrap(text, x, y, max, lh, a) {
    const words = String(text).split(' ');
    let lineText = '';
    for (const word of words) {
      const test = lineText + word + ' ';
      if (ctx.measureText(test).width > max && lineText) {
        ctx.fillText(lineText, x, y);
        y += lh;
        lineText = word + ' ';
      } else lineText = test;
    }
    ctx.fillText(lineText, x, y);
  }

  function drawHud() {
    const d = districtAt(cam.x, cam.y);
    ctx.fillStyle = 'rgba(1,5,12,.62)';
    ctx.fillRect(16, 16, 430, 106);
    ctx.strokeStyle = 'rgba(100,210,255,.42)';
    ctx.strokeRect(16, 16, 430, 106);
    ctx.fillStyle = 'rgba(214,244,255,.94)';
    ctx.font = 'bold 16px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('HOLOVERSE SATELLITE TOUR', 30, 42);
    ctx.font = '13px Consolas, monospace';
    ctx.fillText(`DISTRICT ${d.name.toUpperCase()}`, 30, 66);
    ctx.fillText(`CAM ${Math.round(cam.x)}, ${Math.round(cam.y)}   ZOOM ${cam.zoom.toFixed(2)}   ${VERSION}`, 30, 88);
    ctx.fillText('PAN: DRAG / WASD / ARROWS   ZOOM: WHEEL   CLICK: INFO   M: MUTE', 30, 110);

    const r = 70;
    const cx = canvas.width - 90, cy = 90;
    ctx.fillStyle = 'rgba(1,5,12,.48)';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,210,255,.35)';
    ctx.stroke();
    ctx.fillStyle = rgba(d.color, 0.9);
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.26)';
    line(cx - r * 0.65, cy, cx + r * 0.65, cy);
    line(cx, cy - r * 0.65, cx, cy + r * 0.65);
  }

  function update(dt) {
    time += dt;
    roadPulse = (Math.sin(time * 2.2) + 1) / 2;
    cam.zoom = lerp(cam.zoom, cam.targetZoom, 1 - Math.pow(0.001, dt));
    const speed = 620 * dt / Math.sqrt(cam.zoom);
    const mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
    const my = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0);
    cam.x += mx * speed;
    cam.y += my * speed;
  }

  function draw(now) {
    resize();
    const dt = Math.min(0.04, ((now - last) || 16) / 1000);
    last = now;
    update(dt);
    drawSky();
    const tiles = visibleTiles(2);
    for (const t of tiles) drawTile(t.x, t.y);
    drawTraffic();
    drawCivilians();
    drawBeacons();
    drawLabels();
    drawHud();
    drawPanel();
    requestAnimationFrame(draw);
  }

  function setCopy() {
    const pairs = [
      ['demoSectionTitle', 'HoloVerse Demo — Satellite City Tour'],
      ['demoSectionIntro', 'A peaceful satellite POV tour of the HoloVerse city layer. Pan across districts, zoom into traffic and civilization, and click buildings, beacons, roads, parks, water, or vehicles for route info.'],
      ['demoTitle', 'HoloVerse Demo'],
      ['demoSummary', 'A top-down satellite view of the HoloVerse city with living traffic, districts, transit grids, beacons, parks, waterways, and clickable info nodes.'],
      ['demoObjective', 'Tour the HoloVerse from above. Pan around, zoom in and out, follow traffic patterns, and click points of interest for brief notes.'],
      ['demoControls', 'Drag or use WASD / arrow keys to pan. Mouse wheel zooms. Click roads, buildings, beacons, parks, water, or traffic for info. M mutes. No first-person controls or weapons.'],
      ['demoDetails', 'Pass 16 removes mech-suit and player-weapon gameplay from the web demo and reframes it as a satellite civilization tour.']
    ];
    for (const [id, text] of pairs) {
      const el = $(id);
      if (el) el.textContent = text;
    }
    const tags = $('demoTags');
    if (tags) {
      tags.innerHTML = '';
      ['Satellite POV', 'City tour', 'Traffic', 'Clickable info', 'No weapons'].forEach((t) => {
        const s = document.createElement('span');
        s.textContent = t;
        tags.appendChild(s);
      });
    }
  }

  function addButtons() {
    const head = document.querySelector('.demo-head');
    if (!head || $('demoMuteBtn')) return;
    const b = document.createElement('button');
    b.id = 'demoMuteBtn';
    b.className = 'btn btn-secondary demo-audio-button';
    b.type = 'button';
    b.textContent = 'Mute Audio';
    b.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      muted = !muted;
      b.textContent = muted ? 'Audio Muted' : 'Mute Audio';
      b.setAttribute('aria-pressed', String(muted));
    };
    head.appendChild(b);
  }

  function boot() {
    canvas = $('demoCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.tabIndex = 0;
    document.body.classList.add('demo-runtime-ready', 'single-demo-runtime', 'holoverse-satellite-tour');
    const old = document.querySelector('.demo-head .btn[href*=demo_manifest]');
    if (old) old.remove();
    const grid = $('demoGalleryGrid');
    if (grid) grid.remove();
    const overlay = $('demoLoadingOverlay');
    if (overlay) overlay.hidden = true;
    style();
    setCopy();
    addButtons();

    canvas.addEventListener('pointerdown', (e) => {
      canvas.focus({ preventScroll: true });
      dragging = true;
      lastPointer = { x: e.clientX, y: e.clientY };
      try { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume && audioCtx.resume(); } catch {}
      e.preventDefault();
      e.stopPropagation();
    }, true);
    window.addEventListener('pointerup', (e) => {
      if (!dragging) return;
      const moved = lastPointer && Math.hypot(e.clientX - lastPointer.x, e.clientY - lastPointer.y) > 6;
      dragging = false;
      if (!moved) {
        const r = canvas.getBoundingClientRect();
        const w = screenToWorld((e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height));
        panel = { ...findClicked(w.x, w.y), life: 6 };
        beep(520, 0.05, 0.006, 'triangle');
      }
      lastPointer = null;
    }, true);
    window.addEventListener('pointermove', (e) => {
      if (!dragging || !lastPointer) return;
      const dx = e.clientX - lastPointer.x;
      const dy = e.clientY - lastPointer.y;
      cam.x -= dx / cam.zoom;
      cam.y -= dy / cam.zoom;
      lastPointer = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }, true);
    canvas.addEventListener('wheel', (e) => {
      cam.targetZoom = clamp(cam.targetZoom * Math.exp(-e.deltaY * 0.0012), 0.16, 2.25);
      e.preventDefault();
      e.stopPropagation();
    }, { passive: false, capture: true });
    canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); e.stopPropagation(); }, true);
    window.addEventListener('keydown', (e) => {
      const k = e.key === ' ' ? ' ' : e.key.toLowerCase();
      if (['w','a','s','d','arrowleft','arrowright','arrowup','arrowdown','m'].includes(k)) {
        keys[k] = true;
        if (k === 'm' && !keys.ml) {
          muted = !muted;
          keys.ml = true;
          const b = $('demoMuteBtn');
          if (b) { b.textContent = muted ? 'Audio Muted' : 'Mute Audio'; b.setAttribute('aria-pressed', String(muted)); }
        }
        if (document.activeElement === canvas || dragging) e.preventDefault();
      }
    }, true);
    window.addEventListener('keyup', (e) => {
      const k = e.key === ' ' ? ' ' : e.key.toLowerCase();
      keys[k] = false;
      if (k === 'm') keys.ml = false;
    }, true);
    window.addEventListener('resize', resize);
    panel = { title: 'Satellite Tour Online', body: 'Pan across the HoloVerse city, zoom into traffic and civilian activity, and click points of interest for route notes.', life: 7 };
    resize();
    requestAnimationFrame(draw);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
