(()=>{
  'use strict';

  const $ = (id) => document.getElementById(id);
  const TAU = Math.PI * 2;
  const WORLD_OUTER_RADIUS = 11100;
  const SPACE_PAD = 3900;
  const ANCHOR_ANGLE = -Math.PI / 2;

  const RINGS = [
    { key: 1, name: 'FLAT', label: 'FLAT / HUB CORE', bot: 'IO', kind: 'flat', r0: 30, r1: 620, color: [205, 214, 220], line: [245, 250, 255], accent: [255, 255, 225], note: 'Imported from HoloVerse world.py ring 1. The compact hub core where IO watches the center routes.' },
    { key: 2, name: 'FORESTS', label: 'FORESTS', bot: 'Vanta', kind: 'forest', r0: 620, r1: 1920, color: [22, 166, 75], line: [80, 255, 120], accent: [172, 255, 92], note: 'Imported from HoloVerse world.py ring 2. A green living belt around the hub.' },
    { key: 3, name: 'GREEN HILLS', label: 'GREEN HILLS', bot: 'Nyx', kind: 'hills', r0: 1920, r1: 3300, color: [154, 216, 48], line: [214, 255, 82], accent: [255, 245, 84], note: 'Imported from HoloVerse world.py ring 3. Rolling yellow-green terrain compressed into a readable top-down band.' },
    { key: 4, name: 'MUSHROOM', label: 'MUSHROOM', bot: 'Solace', kind: 'mushroom', r0: 3300, r1: 4700, color: [236, 66, 190], line: [255, 125, 240], accent: [70, 255, 255], note: 'Imported from HoloVerse world.py ring 4. The strange fantasy/life ring before the hard environment bands.' },
    { key: 5, name: 'DESERT', label: 'DESERT', bot: 'Ember', kind: 'desert', r0: 4700, r1: 6100, color: [224, 144, 45], line: [255, 210, 94], accent: [255, 140, 82], note: 'Imported from HoloVerse world.py ring 5. Amber desert archive terrain with room for pyramids later.' },
    { key: 6, name: 'ICE', label: 'ICE', bot: 'Mirror', kind: 'ice', r0: 6100, r1: 7500, color: [96, 197, 255], line: [190, 245, 255], accent: [255, 255, 255], note: 'Imported from HoloVerse world.py ring 6. Cool blue ice array terrain, ready for crystal/cube detail later.' },
    { key: 7, name: 'URBAN', label: 'URBAN', bot: 'Sable', kind: 'urban', r0: 7500, r1: 9100, color: [126, 130, 142], line: [220, 226, 236], accent: [255, 70, 70], note: 'Imported from HoloVerse world.py ring 7. Grey ruined urban war-zone belt, kept as a visual ring only in this site pass.' },
    { key: 8, name: 'METROPOLIS', label: 'METROPOLIS', bot: 'Archivist', kind: 'metropolis', r0: 9100, r1: 11100, color: [118, 70, 204], line: [205, 145, 255], accent: [110, 190, 255], note: 'Imported from HoloVerse world.py ring 8. The outer city shell; visually compact here even though the game ring streams outward.' },
  ];

  let canvas, ctx, last = 0, t = 0;
  let focused = false;
  let dragging = null;
  let keys = Object.create(null);
  let muted = false;
  let message = null;
  const camera = { x: 0, y: 0, zoom: 1.0 };
  let hits = [];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, u) => a + (b - a) * u;
  const lerpColor = (a, b, u) => [mix(a[0], b[0], u), mix(a[1], b[1], u), mix(a[2], b[2], u)];
  const rgba = (rgb, a = 1) => `rgba(${rgb[0]|0},${rgb[1]|0},${rgb[2]|0},${a})`;
  const noise = (x, y = 0, z = 0) => {
    const n = Math.sin((x * 127.1 + y * 311.7 + z * 74.7 + 734871) * 0.0174532925) * 43758.5453;
    return n - Math.floor(n);
  };

  const style = document.createElement('style');
  style.textContent = [
    '.demo-head .btn[href*=demo_manifest],#demoGalleryGrid,.demo-gallery-grid{display:none!important}',
    '.demo-canvas-shell{background:#020608;padding:12px;min-height:390px;overflow:hidden}',
    '.demo-canvas{min-height:360px;background:#020607;outline:none;border:1px solid rgba(0,240,255,.38);box-shadow:inset 0 0 80px #000,0 0 38px rgba(0,220,255,.18);cursor:grab}',
    '.demo-canvas:active{cursor:grabbing}',
    '.demo-runtime-ready .demo-loading-overlay{display:none!important}',
    '.demo-audio-button[aria-pressed=true]{background:rgba(0,220,255,.16);border-color:rgba(120,255,255,.65)}'
  ].join('');
  document.head.appendChild(style);

  function tone(freq = 460) {
    if (muted) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const audio = window.__holoRingAudio || (window.__holoRingAudio = new AudioCtx());
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.value = 0.004;
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.07);
      osc.stop(audio.currentTime + 0.09);
    } catch (_) {}
  }

  function baseScale() {
    const usable = Math.min(canvas.width, canvas.height) * 0.425;
    return usable / WORLD_OUTER_RADIUS;
  }

  function worldToScreen(x, y) {
    const s = baseScale() * camera.zoom;
    return [canvas.width / 2 + (x - camera.x) * s, canvas.height / 2 + (y - camera.y) * s];
  }

  function screenToWorld(x, y) {
    const s = baseScale() * camera.zoom;
    return [(x - canvas.width / 2) / s + camera.x, (y - canvas.height / 2) / s + camera.y];
  }

  function screenRadius(worldRadius) {
    return worldRadius * baseScale() * camera.zoom;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    const w = Math.max(640, Math.floor(rect.width * dpr));
    const h = Math.max(360, Math.floor(w * 9 / 16));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function drawBackground() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const maxR = Math.max(canvas.width, canvas.height) * 0.72;
    const gradient = ctx.createRadialGradient(cx, cy, 20, cx, cy, maxR);
    gradient.addColorStop(0, '#071d22');
    gradient.addColorStop(0.42, '#041016');
    gradient.addColorStop(0.75, '#020509');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const spaceR = screenRadius(WORLD_OUTER_RADIUS + SPACE_PAD * 0.42);
    ctx.strokeStyle = 'rgba(95,180,255,.18)';
    ctx.lineWidth = Math.max(1, 1.2 * camera.zoom);
    ctx.setLineDash([4, 8]);
    ctx.beginPath();
    ctx.arc(cx, cy, spaceR, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < 130; i++) {
      const a = noise(i, 8) * TAU;
      const r = screenRadius(WORLD_OUTER_RADIUS + 300 + noise(i, 2) * SPACE_PAD * 1.35);
      const x = cx + Math.cos(a + t * 0.006 * (noise(i, 4) - 0.5)) * r;
      const y = cy + Math.sin(a + t * 0.006 * (noise(i, 5) - 0.5)) * r;
      const twinkle = 0.22 + 0.42 * noise(i, Math.floor(t * 2));
      ctx.fillStyle = `rgba(180,230,255,${twinkle})`;
      ctx.fillRect(x, y, Math.max(1, camera.zoom * 1.1), Math.max(1, camera.zoom * 1.1));
    }
  }

  function drawAnnulus(inner, outer, fill, stroke, alpha = 1) {
    const [cx, cy] = worldToScreen(0, 0);
    const r0 = screenRadius(inner);
    const r1 = screenRadius(outer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(cx, cy, r1, 0, TAU);
    ctx.arc(cx, cy, r0, TAU, 0, true);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1, 1.5 * camera.zoom);
    ctx.stroke();
    ctx.restore();
  }

  function drawRingPattern(ring, index) {
    const mid = (ring.r0 + ring.r1) * 0.5;
    const thickness = ring.r1 - ring.r0;
    const count = ring.kind === 'metropolis' ? 72 : ring.kind === 'urban' ? 56 : ring.kind === 'forest' ? 48 : 36;
    const patternAlpha = camera.zoom < 0.6 ? 0.12 : 0.24;

    for (let i = 0; i < count; i++) {
      const n = noise(index, i);
      const a = (i / count) * TAU + t * (ring.kind === 'metropolis' ? 0.015 : 0.004) * (0.4 + n);
      const rr = mid + (n - 0.5) * thickness * 0.58;
      const [x, y] = worldToScreen(Math.cos(a) * rr, Math.sin(a) * rr);
      const size = Math.max(1.2, screenRadius(thickness * (0.012 + 0.018 * noise(i, index))));
      ctx.fillStyle = rgba(ring.accent, patternAlpha + 0.12 * noise(i, Math.floor(t)));

      if (ring.kind === 'metropolis') {
        ctx.fillRect(x - size * 0.55, y - size * 1.4, size * 1.1, size * 2.8);
      } else if (ring.kind === 'urban') {
        ctx.fillRect(x - size, y - size * 0.35, size * 2, size * 0.7);
      } else if (ring.kind === 'forest' || ring.kind === 'hills') {
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TAU);
        ctx.fill();
      } else if (ring.kind === 'mushroom') {
        ctx.beginPath();
        ctx.arc(x, y, size * 1.35, Math.PI, 0);
        ctx.lineTo(x + size * 0.35, y + size * 1.4);
        ctx.lineTo(x - size * 0.35, y + size * 1.4);
        ctx.closePath();
        ctx.fill();
      } else if (ring.kind === 'desert') {
        ctx.beginPath();
        ctx.moveTo(x, y - size * 1.4);
        ctx.lineTo(x + size * 1.2, y + size);
        ctx.lineTo(x - size * 1.2, y + size);
        ctx.closePath();
        ctx.fill();
      } else if (ring.kind === 'ice') {
        ctx.strokeStyle = rgba(ring.accent, patternAlpha + 0.14);
        ctx.lineWidth = Math.max(1, camera.zoom);
        ctx.strokeRect(x - size, y - size, size * 2, size * 2);
      }
    }
  }

  function drawHub() {
    const [cx, cy] = worldToScreen(0, 0);
    const core = screenRadius(350);
    const pulse = 1 + Math.sin(t * 2.2) * 0.035;
    ctx.strokeStyle = 'rgba(0,255,245,.76)';
    ctx.lineWidth = Math.max(1, 2.4 * camera.zoom);
    for (const r of [160, 260, 390, 520]) {
      ctx.beginPath();
      ctx.arc(cx, cy, screenRadius(r) * pulse, 0, TAU);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(0,16,20,.72)';
    ctx.beginPath();
    ctx.arc(cx, cy, core * 0.46, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.stroke();

    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 + Math.PI / 8;
      const [x1, y1] = worldToScreen(Math.cos(a) * 85, Math.sin(a) * 85);
      const [x2, y2] = worldToScreen(Math.cos(a) * 560, Math.sin(a) * 560);
      ctx.strokeStyle = i % 2 ? 'rgba(0,245,255,.45)' : 'rgba(255,255,255,.35)';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(235,250,255,.95)';
    ctx.font = `${Math.max(11, 13 * camera.zoom)}px Consolas, monospace`;
    ctx.textAlign = 'center';
    if (camera.zoom > 0.52) ctx.fillText('HUB', cx, cy + 4);
    hits.push({ kind: 'hub', x: 0, y: 0, r0: 0, r1: 620, title: 'HoloVerse Hub Core', body: 'Miniature top-down hub. The next pass can add civilization traffic flowing outward through every ring.' });
  }

  function drawBoundaryGuides() {
    const routeAngles = [-Math.PI / 2, 0, Math.PI / 2, Math.PI];
    for (const a of routeAngles) {
      const [x1, y1] = worldToScreen(Math.cos(a) * 620, Math.sin(a) * 620);
      const [x2, y2] = worldToScreen(Math.cos(a) * WORLD_OUTER_RADIUS, Math.sin(a) * WORLD_OUTER_RADIUS);
      ctx.strokeStyle = 'rgba(220,245,255,.18)';
      ctx.lineWidth = Math.max(1, camera.zoom);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  function drawLabels() {
    const [cx, cy] = worldToScreen(0, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < RINGS.length; i++) {
      const ring = RINGS[i];
      const mid = (ring.r0 + ring.r1) * 0.5;
      const a = ANCHOR_ANGLE + (i - 3.5) * 0.025;
      const [x, y] = worldToScreen(Math.cos(a) * mid, Math.sin(a) * mid);
      const minSize = ring.key >= 7 ? 10 : 9;
      const fontSize = Math.max(minSize, Math.min(15, 10.5 * camera.zoom));
      if (camera.zoom < 0.48 && ring.key < 4) continue;
      ctx.fillStyle = 'rgba(2,8,12,.55)';
      const text = ring.name;
      const width = ctx.measureText(text).width + 16;
      ctx.fillRect(x - width / 2, y - fontSize, width, fontSize * 1.8);
      ctx.strokeStyle = rgba(ring.line, 0.32);
      ctx.strokeRect(x - width / 2, y - fontSize, width, fontSize * 1.8);
      ctx.fillStyle = rgba(ring.line, 0.96);
      ctx.font = `bold ${fontSize}px Consolas, monospace`;
      ctx.fillText(text, x, y);
    }

    if (camera.zoom <= 0.7) {
      ctx.fillStyle = 'rgba(150,210,255,.58)';
      ctx.font = 'bold 13px Consolas, monospace';
      ctx.fillText('SPACE / ORBITAL EXTERIOR', cx, cy - screenRadius(WORLD_OUTER_RADIUS + 1850));
    }
  }

  function drawBotAnchors() {
    for (let i = 0; i < RINGS.length; i++) {
      const ring = RINGS[i];
      const mid = (ring.r0 + ring.r1) * 0.5;
      const a = ANCHOR_ANGLE + i * 0.045 + Math.sin(t * 0.65 + i) * 0.01;
      const [x, y] = worldToScreen(Math.cos(a) * mid, Math.sin(a) * mid);
      const r = Math.max(3, 5.4 * camera.zoom);
      ctx.fillStyle = rgba(ring.accent, 0.95);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.7)';
      ctx.stroke();
      if (camera.zoom > 0.78) {
        ctx.fillStyle = 'rgba(235,250,255,.85)';
        ctx.font = `${Math.max(8, 10 * camera.zoom)}px Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(ring.bot, x, y - r - 9 * camera.zoom);
      }
    }
  }

  function drawSpaceOrbit() {
    const orbitCount = 22;
    for (let i = 0; i < orbitCount; i++) {
      const a = i * TAU / orbitCount + t * 0.028;
      const r = WORLD_OUTER_RADIUS + 650 + noise(i, 9) * 2100;
      const [x, y] = worldToScreen(Math.cos(a) * r, Math.sin(a) * r);
      const size = Math.max(2, 4 * camera.zoom);
      ctx.strokeStyle = 'rgba(110,200,255,.45)';
      ctx.lineWidth = Math.max(1, camera.zoom);
      ctx.beginPath();
      ctx.moveTo(x - size * 1.8, y);
      ctx.lineTo(x + size * 1.8, y);
      ctx.moveTo(x, y - size * 1.8);
      ctx.lineTo(x, y + size * 1.8);
      ctx.stroke();
    }

    const a = t * 0.022 - 1.2;
    const [ox, oy] = worldToScreen(Math.cos(a) * (WORLD_OUTER_RADIUS + 2500), Math.sin(a) * (WORLD_OUTER_RADIUS + 2500));
    ctx.fillStyle = 'rgba(255,190,70,.9)';
    ctx.beginPath();
    ctx.arc(ox, oy, Math.max(4, 7 * camera.zoom), 0, TAU);
    ctx.fill();
    if (camera.zoom < 1.8) {
      ctx.fillStyle = 'rgba(255,220,140,.85)';
      ctx.font = `${Math.max(9, 12 * camera.zoom)}px Consolas, monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('Orbit', ox, oy - 14 * camera.zoom);
    }
  }

  function registerRingHits() {
    for (const ring of RINGS) {
      hits.push({
        kind: 'ring',
        r0: ring.r0,
        r1: ring.r1,
        title: `${ring.name} // ${ring.bot}`,
        body: `${ring.note} Radius ${Math.round(ring.r0)}-${Math.round(ring.r1)} compressed into the mini ring-world.`
      });
    }
  }

  function drawWorld() {
    hits = [];
    drawBackground();

    const [cx, cy] = worldToScreen(0, 0);
    const outerGlow = ctx.createRadialGradient(cx, cy, screenRadius(WORLD_OUTER_RADIUS * 0.72), cx, cy, screenRadius(WORLD_OUTER_RADIUS * 1.08));
    outerGlow.addColorStop(0, 'rgba(0,0,0,0)');
    outerGlow.addColorStop(1, 'rgba(120,60,255,.14)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(cx, cy, screenRadius(WORLD_OUTER_RADIUS * 1.08), 0, TAU);
    ctx.fill();

    for (let i = RINGS.length - 1; i >= 0; i--) {
      const ring = RINGS[i];
      const fill = rgba(lerpColor(ring.color, [0, 0, 0], 0.18), ring.key === 8 ? 0.72 : 0.68);
      const stroke = rgba(ring.line, ring.key === 8 ? 0.86 : 0.72);
      drawAnnulus(ring.r0, ring.r1, fill, stroke, 1);
    }

    drawBoundaryGuides();
    registerRingHits();
    for (let i = 0; i < RINGS.length; i++) drawRingPattern(RINGS[i], i);
    drawHub();
    drawBotAnchors();
    drawSpaceOrbit();
    drawLabels();
  }

  function drawPanel() {
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = 'rgba(0,8,12,.70)';
    ctx.fillRect(16, 16, 490, 132);
    ctx.strokeStyle = 'rgba(0,245,255,.45)';
    ctx.strokeRect(16, 16, 490, 132);
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(0,245,255,.95)';
    ctx.font = 'bold 16px Consolas, monospace';
    ctx.fillText('MINI HOLOVERSE // LIVING RING-WORLD BASE', 30, 43);
    ctx.font = '13px Consolas, monospace';
    ctx.fillStyle = 'rgba(220,245,255,.82)';
    ctx.fillText('WORLD.PY ORDER: FLAT > FORESTS > HILLS > MUSHROOM > DESERT > ICE > URBAN > METROPOLIS', 30, 68);
    ctx.fillText(`ZOOM ${camera.zoom.toFixed(2)}x  //  DRAG PAN  WHEEL ZOOM  CLICK RINGS`, 30, 92);
    ctx.fillText('SPACE IS OUTSIDE THE OUTER RING; ZOOM OUT TO SEE MORE ORBITAL ROOM.', 30, 116);
    ctx.fillText('THIS PASS STARTS WITH THE SHRUNK RINGS + COLORS ONLY.', 30, 138);
  }

  function drawMessage() {
    if (!message) return;
    message.age += 1 / 60;
    message.life -= 1 / 60;
    const alpha = clamp(Math.min(message.age * 2, message.life), 0, 1);
    const w = Math.min(canvas.width * 0.72, 680);
    const h = 96;
    const x = (canvas.width - w) / 2;
    const y = canvas.height - h - 28;
    ctx.fillStyle = `rgba(0,8,14,${0.75 * alpha})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = `rgba(255,80,220,${0.68 * alpha})`;
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(235,250,255,${alpha})`;
    ctx.font = 'bold 16px Consolas, monospace';
    ctx.fillText(message.title, canvas.width / 2, y + 30);
    ctx.font = '13px Consolas, monospace';
    wrapText(message.body, canvas.width / 2, y + 55, w - 60, 17, alpha);
    if (message.life <= 0) message = null;
  }

  function wrapText(text, x, y, width, lineHeight, alpha) {
    const words = text.split(' ');
    let line = '';
    const lines = [];
    for (const word of words) {
      const test = `${line}${word} `;
      if (ctx.measureText(test).width > width && line) {
        lines.push(line.trim());
        line = `${word} `;
      } else {
        line = test;
      }
    }
    if (line.trim()) lines.push(line.trim());
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      ctx.fillStyle = `rgba(210,240,255,${0.9 * alpha})`;
      ctx.fillText(lines[i], x, y + i * lineHeight);
    }
  }

  function drawFocusOverlay() {
    if (focused) return;
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,245,255,.96)';
    ctx.font = 'bold 24px Consolas, monospace';
    ctx.fillText('CLICK TO FOCUS MINI HOLOVERSE', canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '14px Consolas, monospace';
    ctx.fillText('Top-down compressed ring world. Drag, zoom, and click each region.', canvas.width / 2, canvas.height / 2 + 22);
  }

  function clickCanvas(px, py) {
    const [wx, wy] = screenToWorld(px, py);
    const r = Math.hypot(wx, wy);
    let selected = null;
    for (const hit of hits) {
      if (hit.kind === 'hub' && r <= hit.r1) selected = hit;
      else if (hit.kind === 'ring' && r >= hit.r0 && r <= hit.r1) selected = hit;
    }
    if (!selected && r > WORLD_OUTER_RADIUS) {
      selected = { title: 'SPACE // Orbit', body: 'Space is outside the ground rings. This pass shows the exterior orbital layer without making it a normal biome ring.' };
    }
    if (!selected) {
      selected = { title: 'Mini HoloVerse Ring World', body: 'The world is now a compact top-down terrarium. Next passes can add civilization loops inside these colored rings.' };
    }
    message = { title: selected.title, body: selected.body, life: 5, age: 0 };
    tone(selected.title.includes('SPACE') ? 620 : 460);
  }

  function update(dt) {
    const speed = (keys.shift ? 1550 : 900) * dt / Math.max(0.55, camera.zoom);
    if (keys.w || keys.arrowup) camera.y -= speed;
    if (keys.s || keys.arrowdown) camera.y += speed;
    if (keys.a || keys.arrowleft) camera.x -= speed;
    if (keys.d || keys.arrowright) camera.x += speed;
    const limit = WORLD_OUTER_RADIUS * 0.45;
    camera.x = clamp(camera.x, -limit, limit);
    camera.y = clamp(camera.y, -limit, limit);
  }

  function frame(now) {
    resize();
    const dt = Math.min(0.05, ((now - last) || 16) / 1000);
    last = now;
    t += dt;
    if (focused) update(dt);
    drawWorld();
    drawPanel();
    drawMessage();
    drawFocusOverlay();
    window.requestAnimationFrame(frame);
  }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function updatePageCopy() {
    setText('demoSectionTitle', 'HoloVerse Demo — Mini Living Ring World');
    setText('demoSectionIntro', 'A compact top-down HoloVerse terrarium using the real ring order from the Panda3D world: hub core, natural rings, hard-environment rings, Urban, and outer Metropolis, with space outside the world edge.');
    setText('demoTitle', 'Mini HoloVerse Ring World');
    setText('demoSummary', 'The full HoloVerse region stack is compressed into one watchable overhead world. This pass starts with the correct rings and colors before civilization simulation is added.');
    setText('demoObjective', 'Inspect the shrunken ring world from above, confirm the region order and colors, zoom out for the space exterior, and click rings for imported route notes.');
    setText('demoControls', 'Click the demo first. Drag or WASD/Arrows pan, mouse wheel zooms, Shift pans faster, click regions for info, M mutes, Esc releases focus.');
    setText('demoDetails', 'Pass 18 replaces the infinite survey field with a bounded miniature HoloVerse layout based on data/HoloVerse/world.py: Flat, Forests, Green Hills, Mushroom, Desert, Ice, Urban, then Metropolis.');
    setText('demoSectionNote', 'Miniature-world pass: this starts with the correct shrunken rings and color bands so future passes can add citizens, traffic, construction, weather, and region events.');
    const tags = $('demoTags');
    if (tags) {
      tags.innerHTML = '';
      ['Mini ring world', 'Actual biome order', 'Top-down view', 'Space exterior', 'Living world base'].forEach((text) => {
        const span = document.createElement('span');
        span.textContent = text;
        tags.appendChild(span);
      });
    }
  }

  function boot() {
    canvas = $('demoCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.tabIndex = 0;
    document.body.classList.add('demo-runtime-ready', 'single-demo-runtime', 'holoverse-mini-ringworld');
    const overlay = $('demoLoadingOverlay');
    if (overlay) overlay.hidden = true;
    updatePageCopy();

    const head = document.querySelector('.demo-head');
    if (head && !$('demoMuteBtn')) {
      const btn = document.createElement('button');
      btn.id = 'demoMuteBtn';
      btn.className = 'btn btn-secondary demo-audio-button';
      btn.type = 'button';
      btn.textContent = 'Mute Audio';
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        muted = !muted;
        btn.textContent = muted ? 'Audio Muted' : 'Mute Audio';
        btn.setAttribute('aria-pressed', String(muted));
      });
      head.appendChild(btn);
    }

    canvas.addEventListener('pointerdown', (event) => {
      focused = true;
      canvas.focus({ preventScroll: true });
      const sx = event.offsetX * (canvas.width / canvas.clientWidth);
      const sy = event.offsetY * (canvas.height / canvas.clientHeight);
      dragging = { x: event.clientX, y: event.clientY, sx, sy, moved: false };
      event.preventDefault();
      event.stopPropagation();
    }, true);

    window.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const dx = event.clientX - dragging.x;
      const dy = event.clientY - dragging.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) dragging.moved = true;
      const s = baseScale() * camera.zoom;
      camera.x -= dx / s;
      camera.y -= dy / s;
      dragging.x = event.clientX;
      dragging.y = event.clientY;
      const rect = canvas.getBoundingClientRect();
      dragging.sx = (event.clientX - rect.left) * (canvas.width / canvas.clientWidth);
      dragging.sy = (event.clientY - rect.top) * (canvas.height / canvas.clientHeight);
      event.preventDefault();
      event.stopPropagation();
    }, true);

    window.addEventListener('pointerup', () => {
      if (dragging && !dragging.moved) clickCanvas(dragging.sx, dragging.sy);
      dragging = null;
    }, true);

    canvas.addEventListener('wheel', (event) => {
      focused = true;
      canvas.focus({ preventScroll: true });
      const px = event.offsetX * (canvas.width / canvas.clientWidth);
      const py = event.offsetY * (canvas.height / canvas.clientHeight);
      const before = screenToWorld(px, py);
      camera.zoom = clamp(camera.zoom * (event.deltaY < 0 ? 1.14 : 0.88), 0.48, 3.35);
      const after = screenToWorld(px, py);
      camera.x += before[0] - after[0];
      camera.y += before[1] - after[1];
      event.preventDefault();
      event.stopPropagation();
    }, { passive: false });

    window.addEventListener('keydown', (event) => {
      const key = event.key.toLowerCase();
      if (key === 'escape') {
        focused = false;
        keys = Object.create(null);
        dragging = null;
        return;
      }
      if (!focused) return;
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift', 'm'].includes(key)) {
        if (key === 'm') {
          muted = !muted;
          const btn = $('demoMuteBtn');
          if (btn) {
            btn.textContent = muted ? 'Audio Muted' : 'Mute Audio';
            btn.setAttribute('aria-pressed', String(muted));
          }
        } else {
          keys[key] = true;
        }
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);

    window.addEventListener('keyup', (event) => {
      keys[event.key.toLowerCase()] = false;
    }, true);

    canvas.addEventListener('blur', () => {
      focused = false;
      keys = Object.create(null);
      dragging = null;
    });

    window.addEventListener('resize', resize);
    message = { title: 'Pass 18 Ring Base Online', body: 'The demo now starts as a compact top-down HoloVerse ring world using the actual region order, with Metropolis as the outer ground ring and space outside.', life: 6, age: 0 };
    resize();
    window.requestAnimationFrame(frame);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
