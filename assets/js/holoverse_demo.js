(() => {
  'use strict';

  const VERSION = '20260429-pass12-holoverse-visual-io';
  const $ = (id) => document.getElementById(id);
  const CHUNK = 72;
  const RADIUS = 5;
  const SEED = 74219;
  const EYE = 1.85;
  const KEY_SET = new Set(['w','a','s','d','q','e','arrowleft','arrowright','arrowup','arrowdown','shift','tab','h','r','m','p','f10',' ']);

  let canvas, ctx, audioCtx;
  let active = false;
  let muted = false;
  let paused = false;
  let showHud = true;
  let workstation = false;
  let last = 0;
  let time = 0;
  let score = 0;
  let hp = 100;
  let player = { x: 0, y: 0, a: 0 };
  let io = { x: 18, y: -22, hp: 160, charge: 0, pulse: 0 };
  let keys = Object.create(null);
  let chunks = new Map();
  let enemies = [];
  let tracers = [];
  let impacts = [];
  let overhead = [];
  let notes = [];
  let noteQueue = [];
  let noteToast = null;
  let messages = [];
  let weaponIndex = 0;
  let fireCd = 0;
  let banner = 2;
  let mouseDown = false;
  let pointerLocked = false;

  const weapons = [
    'Null Carbine', 'Etch Revolver', 'Wire Splicer', 'Noir Scatter', 'Vector Pike',
    'Horizon Drill', 'Ink Needle', 'Longline Pulse', 'Static Crown', 'Gleeb Signal'
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, f) => a + (b - a) * f;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const key = (cx, cy) => `${cx},${cy}`;
  const hash = (i, j = 0, k = 0) => {
    const n = Math.sin((i * 127.1 + j * 311.7 + k * 74.7 + SEED) * 0.017453292519943295) * 43758.5453;
    return n - Math.floor(n);
  };
  const hue = (offset = 0) => (time * 5 + offset) % 360;
  const rgba = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
  const dist = (a, b, c, d) => Math.hypot(a - c, b - d);
  const angleDelta = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

  function weapon() {
    const h = weaponIndex;
    return {
      name: `${weapons[h % weapons.length]} ${String(h + 1).padStart(2, '0')}`,
      damage: 18 + hash(h, 1) * 34,
      spread: 0.010 + hash(h, 2) * 0.055,
      rate: 0.105 + hash(h, 3) * 0.25,
      range: 190 + hash(h, 4) * 340,
      pellets: hash(h, 5) > 0.78 ? 5 : hash(h, 5) > 0.58 ? 3 : 1
    };
  }
  let currentWeapon = weapon();

  function addStyle() {
    const style = document.createElement('style');
    style.textContent = `
      .demo-head .btn[href*=demo_manifest],#demoGalleryGrid,.demo-gallery-grid{display:none!important}
      .demo-canvas-shell{position:relative;overflow:hidden;background:#03030a;padding:12px;min-height:390px}
      .holoverse-demo-canvas,.demo-canvas{min-height:360px;background:#03030a;outline:none;border:1px solid rgba(130,210,255,.24);box-shadow:inset 0 0 80px rgba(0,0,0,.58),0 0 36px rgba(80,150,255,.16)}
      .demo-runtime-ready .demo-loading-overlay{display:none!important}
      .demo-audio-button[aria-pressed=true]{background:rgba(120,180,255,.16);border-color:rgba(180,220,255,.64)}
    `;
    document.head.appendChild(style);
  }

  function beep(freq = 260, dur = 0.04, gain = 0.006, type = 'square') {
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

  function status(text) {
    messages.unshift({ text, life: 4 });
    messages = messages.slice(0, 5);
  }

  function chunk(cx, cy) {
    const buildings = [];
    const spawn = [];
    for (let i = 0; i < 13; i++) {
      const ox = cx * CHUNK + 7 + hash(cx, cy, i) * 58;
      const oy = cy * CHUNK + 7 + hash(cx, cy, i + 22) * 58;
      const w = 5 + hash(cx, cy, i + 4) * 17;
      const d = 5 + hash(cx, cy, i + 5) * 17;
      const h = 7 + hash(cx, cy, i + 6) * 58;
      if (dist(ox, oy, 0, 0) > 28) buildings.push({ x: ox, y: oy, w, d, h, seed: i + cx * 91 + cy * 113 });
    }
    for (let i = 0; i < 2 + hash(cx, cy, 77) * 3; i++) {
      const ex = cx * CHUNK + 8 + hash(cx, cy, i + 100) * 55;
      const ey = cy * CHUNK + 8 + hash(cx, cy, i + 200) * 55;
      if (dist(ex, ey, 0, 0) > 60) spawn.push({ x: ex, y: ey, seed: cx * 7001 + cy * 911 + i });
    }
    return { cx, cy, buildings, spawn, spawned: false };
  }

  function ensureChunks() {
    const pcx = Math.floor(player.x / CHUNK);
    const pcy = Math.floor(player.y / CHUNK);
    const needed = new Set();
    for (let cy = pcy - RADIUS; cy <= pcy + RADIUS; cy++) {
      for (let cx = pcx - RADIUS; cx <= pcx + RADIUS; cx++) {
        const k = key(cx, cy);
        needed.add(k);
        if (!chunks.has(k)) chunks.set(k, chunk(cx, cy));
      }
    }
    for (const k of [...chunks.keys()]) {
      if (!needed.has(k)) chunks.delete(k);
    }
    for (const ch of chunks.values()) {
      if (!ch.spawned && Math.abs(ch.cx - pcx) < 4 && Math.abs(ch.cy - pcy) < 4 && enemies.length < 28) {
        ch.spawned = true;
        for (const s of ch.spawn) {
          if (enemies.length < 28) {
            enemies.push({
              x: s.x, y: s.y, homeX: s.x, homeY: s.y,
              hp: 55 + hash(s.seed) * 45,
              speed: 2.2 + hash(s.seed, 1) * 3.0,
              seed: s.seed, phase: hash(s.seed, 2) * 7,
              dead: false
            });
          }
        }
      }
    }
  }

  function allBuildings(rad = RADIUS) {
    const pcx = Math.floor(player.x / CHUNK);
    const pcy = Math.floor(player.y / CHUNK);
    const out = [];
    for (let cy = pcy - rad; cy <= pcy + rad; cy++) {
      for (let cx = pcx - rad; cx <= pcx + rad; cx++) {
        const ch = chunks.get(key(cx, cy));
        if (ch) out.push(...ch.buildings);
      }
    }
    return out;
  }

  function blocked(nx, ny, r = 0.45) {
    for (const o of allBuildings(1)) {
      if (nx > o.x - o.w / 2 - r && nx < o.x + o.w / 2 + r && ny > o.y - o.d / 2 - r && ny < o.y + o.d / 2 + r) return true;
    }
    return false;
  }

  function reset() {
    player = { x: 0, y: 0, a: 0 };
    io = { x: 22, y: -24, hp: 160, charge: 0, pulse: 0 };
    hp = 100;
    score = 0;
    chunks.clear();
    enemies = [];
    tracers = [];
    impacts = [];
    overhead = [];
    messages = [];
    weaponIndex = 0;
    currentWeapon = weapon();
    banner = 2;
    paused = false;
    ensureChunks();
    status('HOLOVERSE DEMO ONLINE');
  }

  function project(wx, wy, wz = 0) {
    const dx = wx - player.x;
    const dy = wy - player.y;
    const ca = Math.cos(-player.a);
    const sa = Math.sin(-player.a);
    const rx = dx * ca - dy * sa;
    const rz = dx * sa + dy * ca;
    if (rz < 3) return null;
    const scale = Math.min(2600, canvas.width * 0.78 / rz);
    return { x: canvas.width / 2 + rx * scale, y: canvas.height * 0.63 - (wz - EYE) * scale, s: scale, z: rz };
  }

  function line3(a, b, alpha = 1) {
    const p = project(a[0], a[1], a[2]);
    const q = project(b[0], b[1], b[2]);
    if (!p || !q) return;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function poly(points, fill) {
    const pts = points.map((p) => project(p[0], p[1], p[2])).filter(Boolean);
    if (pts.length !== points.length) return;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.fill();
  }

  function drawBuilding(o) {
    const x0 = o.x - o.w / 2, x1 = o.x + o.w / 2;
    const y0 = o.y - o.d / 2, y1 = o.y + o.d / 2;
    const z = o.h;
    const d = dist(o.x, o.y, player.x, player.y);
    const alpha = clamp(1 - d / 640, 0.05, 0.95);
    const h = hue(o.seed * 11);
    const faces = [
      [[x0,y0,0],[x1,y0,0],[x1,y0,z],[x0,y0,z], rgba(h + 10, 75, 24, 0.18 * alpha)],
      [[x1,y0,0],[x1,y1,0],[x1,y1,z],[x1,y0,z], rgba(h + 55, 78, 30, 0.15 * alpha)],
      [[x1,y1,0],[x0,y1,0],[x0,y1,z],[x1,y1,z], rgba(h + 100, 80, 34, 0.13 * alpha)],
      [[x0,y1,0],[x0,y0,0],[x0,y0,z],[x0,y1,z], rgba(h + 170, 70, 26, 0.14 * alpha)],
      [[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z], rgba(h + 220, 85, 42, 0.20 * alpha)]
    ];
    ctx.globalCompositeOperation = 'source-over';
    for (const face of faces) poly(face.slice(0, 4), face[4]);
    ctx.strokeStyle = rgba(h + 210, 90, 78, alpha);
    ctx.lineWidth = Math.max(0.75, 2.2 - d / 270);
    const pts = [[x0,y0,0],[x1,y0,0],[x1,y1,0],[x0,y1,0],[x0,y0,z],[x1,y0,z],[x1,y1,z],[x0,y1,z]];
    const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
    for (const e of edges) line3(pts[e[0]], pts[e[1]], alpha);
  }

  function drawEnemy(e) {
    const q = project(e.x, e.y, 1.4);
    if (!q || q.z > 220) return;
    const s = clamp(q.s * 0.017, 0.25, 2.7);
    const wob = Math.sin(time * 6 + e.phase) * 4 * s;
    const h = hue(120 + e.seed);
    ctx.strokeStyle = rgba(h, 80, 72, clamp(1 - q.z / 190, 0.18, 1));
    ctx.lineWidth = clamp(2 * s, 1, 4);
    const sx = q.x, sy = q.y;
    function L(a,b,c,d) { ctx.beginPath(); ctx.moveTo(sx + a*s, sy + b*s); ctx.lineTo(sx + c*s, sy + d*s); ctx.stroke(); }
    ctx.beginPath(); ctx.ellipse(sx, sy - 35*s, 12*s, 16*s, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeRect(sx - 18*s, sy - 18*s, 36*s, 42*s);
    L(0,-18,0,28); L(-16,-4,-34,20+wob); L(16,-4,34,20-wob); L(0,28,-18,58-wob); L(0,28,18,58+wob);
  }

  function drawIo() {
    const q = project(io.x, io.y, 1.6);
    if (!q) return;
    const s = clamp(q.s * 0.025, 0.45, 3.2);
    const h = hue(205);
    ctx.strokeStyle = rgba(h, 95, 78, 0.95);
    ctx.fillStyle = rgba(h, 90, 42, 0.22);
    ctx.lineWidth = clamp(2 * s, 1.5, 5);
    ctx.beginPath(); ctx.arc(q.x, q.y - 20*s, 17*s, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.strokeRect(q.x - 18*s, q.y - 2*s, 36*s, 42*s);
    ctx.beginPath(); ctx.arc(q.x, q.y + 18*s, (42 + Math.sin(time * 5) * 6) * s, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = rgba(h, 100, 84, 0.95);
    ctx.font = `${Math.max(11, 12 * s)}px Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('IO', q.x, q.y - 48*s);
  }

  function hitRay(angle, range, sourceX = player.x, sourceY = player.y) {
    let best = { type: 'none', x: sourceX + Math.cos(angle) * range, y: sourceY + Math.sin(angle) * range, d: range };
    for (const e of enemies) {
      const dx = e.x - sourceX, dy = e.y - sourceY, d = Math.hypot(dx, dy);
      const da = Math.abs(angleDelta(Math.atan2(dy, dx), angle));
      if (d < best.d && da < 0.14) best = { type: 'enemy', enemy: e, x: e.x, y: e.y, d };
    }
    for (const o of allBuildings(3)) {
      const dx = o.x - sourceX, dy = o.y - sourceY, d = Math.hypot(dx, dy);
      const da = Math.abs(angleDelta(Math.atan2(dy, dx), angle));
      if (d < best.d && da < 0.055) best = { type: 'wall', x: o.x, y: o.y, d };
    }
    return best;
  }

  function firePlayer() {
    if (fireCd > 0 || !active || paused) return;
    fireCd = currentWeapon.rate;
    let hit = false;
    for (let i = 0; i < currentWeapon.pellets; i++) {
      const angle = player.a + rnd(-currentWeapon.spread, currentWeapon.spread);
      const h = hitRay(angle, currentWeapon.range);
      tracers.push({ x1: player.x, y1: player.y, z1: EYE - 0.12, x2: h.x, y2: h.y, z2: 1.1, life: 0.08, age: 0, hue: hue(80) });
      impacts.push({ x: h.x, y: h.y, z: h.type === 'enemy' ? 0.9 : 0.35, life: 1.6, age: 0, hue: hue(150) });
      if (h.type === 'enemy') {
        h.enemy.hp -= currentWeapon.damage;
        score += 12;
        hit = true;
        if (h.enemy.hp <= 0) {
          h.enemy.dead = true;
          score += 75;
          status('WIRE HOSTILE CUT');
        }
      }
    }
    beep(hit ? 420 : 240, 0.035, 0.009, 'sawtooth');
  }

  function ioProtect(dt) {
    const desiredAngle = player.a + Math.PI * 0.72;
    const desiredDist = 24;
    const tx = player.x + Math.cos(desiredAngle) * desiredDist;
    const ty = player.y + Math.sin(desiredAngle) * desiredDist;
    io.x = lerp(io.x, tx, 0.026);
    io.y = lerp(io.y, ty, 0.026);
    io.charge -= dt;
    if (io.charge <= 0 && enemies.length) {
      let target = null, best = 999;
      for (const e of enemies) {
        const d = dist(io.x, io.y, e.x, e.y);
        if (d < best && d < 160) { best = d; target = e; }
      }
      if (target) {
        io.charge = 0.55;
        target.hp -= 30;
        tracers.push({ x1: io.x, y1: io.y, z1: 1.5, x2: target.x, y2: target.y, z2: 1.0, life: 0.16, age: 0, hue: hue(205) });
        impacts.push({ x: target.x, y: target.y, z: 0.85, life: 1.0, age: 0, hue: hue(205) });
        if (target.hp <= 0) { target.dead = true; score += 45; status('IO CLEARED A THREAT'); }
        beep(720, 0.045, 0.006, 'triangle');
      }
    }
  }

  function enemyPatrol(dt) {
    for (const e of enemies) {
      const targetX = e.homeX + Math.sin(time * 0.25 + e.phase) * 38;
      const targetY = e.homeY + Math.cos(time * 0.21 + e.phase) * 38;
      const dx = targetX - e.x, dy = targetY - e.y, d = Math.hypot(dx, dy) || 1;
      e.x += dx / d * e.speed * dt;
      e.y += dy / d * e.speed * dt;
      if (dist(e.x, e.y, io.x, io.y) < 4.0) {
        io.hp = Math.max(0, io.hp - 2.5 * dt);
        impacts.push({ x: io.x, y: io.y, z: 0.9, life: 0.35, age: 0, hue: hue(330) });
      }
    }
    enemies = enemies.filter((e) => !e.dead && dist(e.x, e.y, player.x, player.y) < CHUNK * 7);
  }

  function update(dt) {
    if (paused) return;
    time += dt;
    ensureChunks();
    const forward = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0);
    const side = (keys.d ? 1 : 0) - (keys.a ? 1 : 0);
    const keyTurn = (keys.e || keys.arrowright ? 1 : 0) - (keys.q || keys.arrowleft ? 1 : 0);
    player.a += keyTurn * dt * 2.2;
    const speed = (keys.shift ? 76 : 46) * dt;
    const fx = Math.cos(player.a), fy = Math.sin(player.a);
    const rx = Math.cos(player.a + Math.PI / 2), ry = Math.sin(player.a + Math.PI / 2);
    const nx = player.x + (fx * forward + rx * side) * speed;
    const ny = player.y + (fy * forward + ry * side) * speed;
    if (!blocked(nx, player.y)) player.x = nx;
    if (!blocked(player.x, ny)) player.y = ny;
    if (mouseDown) firePlayer();
    fireCd = Math.max(0, fireCd - dt);
    ioProtect(dt);
    enemyPatrol(dt);
    for (const tr of tracers) tr.age += dt;
    tracers = tracers.filter((tr) => tr.age < tr.life);
    for (const im of impacts) im.age += dt;
    impacts = impacts.filter((im) => im.age < im.life);
    for (const m of messages) m.life -= dt;
    messages = messages.filter((m) => m.life > 0);
    if (noteToast) {
      noteToast.age += dt;
      if (noteToast.age > 4.1) noteToast = null;
    }
    if (Math.random() < dt * 0.9) overhead.push({ x: rnd(-0.1, 1.1), y: rnd(0.04, 0.28), vx: rnd(-0.08, 0.08), life: rnd(1.1, 2.3), age: 0, h: hue(rnd(0, 360)) });
    for (const o of overhead) o.age += dt;
    overhead = overhead.filter((o) => o.age < o.life);
    banner = Math.max(0, banner - dt);
  }

  function drawSky() {
    const top = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.64);
    top.addColorStop(0, 'rgb(0,0,9)');
    top.addColorStop(0.42, rgba(hue(210), 72, 9, 1));
    top.addColorStop(1, rgba(hue(20), 86, 28, 1));
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const horizon = ctx.createLinearGradient(0, canvas.height * 0.28, canvas.width, canvas.height * 0.68);
    horizon.addColorStop(0, rgba(hue(0), 85, 45, 0.32));
    horizon.addColorStop(0.5, rgba(hue(95), 80, 36, 0.24));
    horizon.addColorStop(1, rgba(hue(190), 86, 42, 0.32));
    ctx.fillStyle = horizon;
    ctx.fillRect(0, canvas.height * 0.22, canvas.width, canvas.height * 0.48);
    for (const o of overhead) {
      const a = 1 - o.age / o.life;
      ctx.strokeStyle = rgba(o.h, 95, 68, 0.45 * a);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(o.x * canvas.width, o.y * canvas.height);
      ctx.lineTo((o.x + o.vx * 1.2) * canvas.width, (o.y + 0.04) * canvas.height);
      ctx.stroke();
    }
  }

  function drawGround() {
    const pcx = Math.floor(player.x / CHUNK), pcy = Math.floor(player.y / CHUNK);
    ctx.strokeStyle = rgba(hue(260), 80, 70, 0.16);
    ctx.lineWidth = 1;
    for (let gx = (pcx - 7) * CHUNK; gx <= (pcx + 8) * CHUNK; gx += 18) line3([gx, (pcy - 7) * CHUNK, 0], [gx, (pcy + 8) * CHUNK, 0], 0.14);
    for (let gy = (pcy - 7) * CHUNK; gy <= (pcy + 8) * CHUNK; gy += 18) line3([(pcx - 7) * CHUNK, gy, 0], [(pcx + 8) * CHUNK, gy, 0], 0.14);
    ctx.fillStyle = rgba(hue(280), 70, 28, 0.10);
    ctx.fillRect(0, canvas.height * 0.58, canvas.width, canvas.height * 0.42);
  }

  function render(now = 0) {
    resize();
    const dt = Math.min(0.033, ((now - last) || 16) / 1000);
    last = now;
    if (active) update(dt);
    drawSky();
    drawGround();
    allBuildings(RADIUS).sort((a,b) => dist(b.x,b.y,player.x,player.y) - dist(a.x,a.y,player.x,player.y)).forEach(drawBuilding);
    for (const im of impacts) {
      const q = project(im.x, im.y, im.z);
      if (q) {
        const a = 1 - im.age / im.life;
        ctx.fillStyle = rgba(im.hue, 90, 65, 0.28 * a);
        ctx.beginPath();
        ctx.ellipse(q.x, q.y, clamp(q.s * 0.022, 3, 32), clamp(q.s * 0.014, 2, 22), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    for (const tr of tracers) {
      ctx.strokeStyle = rgba(tr.hue, 95, 78, 1 - tr.age / tr.life);
      ctx.lineWidth = 2;
      line3([tr.x1,tr.y1,tr.z1], [tr.x2,tr.y2,tr.z2], 1 - tr.age / tr.life);
    }
    enemies.sort((a,b) => dist(b.x,b.y,player.x,player.y) - dist(a.x,a.y,player.x,player.y)).forEach(drawEnemy);
    drawIo();
    drawHud();
    requestAnimationFrame(render);
  }

  function drawHud() {
    const cx = canvas.width / 2, cy = canvas.height * 0.56;
    ctx.strokeStyle = rgba(hue(210), 95, 86, 0.9);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy); ctx.lineTo(cx - 5, cy);
    ctx.moveTo(cx + 5, cy); ctx.lineTo(cx + 15, cy);
    ctx.moveTo(cx, cy - 15); ctx.lineTo(cx, cy - 5);
    ctx.moveTo(cx, cy + 5); ctx.lineTo(cx, cy + 15);
    ctx.stroke();
    if (showHud) {
      ctx.textAlign = 'left';
      ctx.fillStyle = 'rgba(0,0,0,.52)';
      ctx.fillRect(18,16,500,126);
      ctx.strokeStyle = rgba(hue(205), 95, 80, 0.45);
      ctx.strokeRect(18,16,500,126);
      ctx.fillStyle = rgba(hue(200), 100, 88, 0.98);
      ctx.font = 'bold 16px Consolas, monospace';
      ctx.fillText('HOLOVERSE DEMO // NOIR CITY ASSAULT',32,42);
      ctx.font = '13px Consolas, monospace';
      ctx.fillText(`HP ${Math.ceil(hp)}  IO ${Math.ceil(io.hp)}  SCORE ${Math.floor(score)}  ENEMIES ${enemies.length}`,32,66);
      ctx.fillText(`WEAPON ${currentWeapon.name}  CHUNKS ${chunks.size}`,32,88);
      ctx.fillText(`POINTER ${pointerLocked ? 'LOCKED' : 'FREE'}  POS ${Math.floor(player.x)}, ${Math.floor(player.y)}`,32,110);
      ctx.fillText('ENEMIES IGNORE PLAYER // IO IS YOUR ONLY OBSERVER',32,132);
      let y = 164;
      for (const m of messages) {
        ctx.fillStyle = rgba(hue(160), 100, 84, Math.min(1, m.life));
        ctx.fillText('> ' + m.text, 32, y);
        y += 17;
      }
      ctx.fillStyle = 'rgba(0,0,0,.50)';
      ctx.fillRect(canvas.width - 386, 16, 368, 180);
      ctx.strokeStyle = rgba(hue(265), 85, 78, 0.35);
      ctx.strokeRect(canvas.width - 386, 16, 368, 180);
      ctx.fillStyle = rgba(hue(290), 100, 88, 0.95);
      ['CLICK GAME TO FOCUS / POINTER LOCK','ESC RELEASES CONTROLS','WASD MOVE  SHIFT SPRINT','MOUSE LOOKS LIKE FPS','LMB FIRE  TAB NEXT WEAPON','CLICK IO FOR PATCH NOTES','H HUD  R RESET  M MUTE'].forEach((s,i) => ctx.fillText(s, canvas.width - 364, 43 + i*19));
    }
    if (banner > 0) {
      ctx.textAlign = 'center';
      ctx.font = 'bold 22px Consolas, monospace';
      ctx.fillStyle = rgba(hue(30), 100, 82, Math.min(1, banner));
      ctx.fillText(currentWeapon.name, canvas.width / 2, canvas.height * 0.16);
    }
    if (noteToast) {
      const fade = Math.min(1, noteToast.age / 0.7, (4.1 - noteToast.age) / 0.8);
      const w = Math.min(canvas.width * 0.76, 760);
      const h = 118;
      const x0 = canvas.width / 2 - w / 2;
      const y0 = canvas.height * 0.68;
      ctx.globalAlpha = clamp(fade, 0, 1);
      ctx.fillStyle = 'rgba(0,0,0,.72)';
      ctx.fillRect(x0, y0, w, h);
      ctx.strokeStyle = rgba(hue(205), 95, 75, 0.8);
      ctx.strokeRect(x0, y0, w, h);
      ctx.fillStyle = rgba(hue(42), 95, 82, 1);
      ctx.font = 'bold 14px Consolas, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('IO PATCH MEMORY', x0 + 18, y0 + 26);
      ctx.font = '13px Consolas, monospace';
      wrapText(noteToast.text, x0 + 18, y0 + 51, w - 36, 18);
      ctx.globalAlpha = 1;
    }
    if (workstation) {
      ctx.fillStyle = 'rgba(0,0,0,.76)';
      ctx.fillRect(canvas.width*.18, canvas.height*.22, canvas.width*.64, canvas.height*.54);
      ctx.strokeStyle = rgba(hue(190), 95, 75, 0.75);
      ctx.strokeRect(canvas.width*.18, canvas.height*.22, canvas.width*.64, canvas.height*.54);
      ctx.fillStyle = rgba(hue(200), 100, 86, 0.95);
      ctx.font = 'bold 18px Consolas, monospace';
      ctx.fillText('F10 WORKSTATION // HOLOVERSE DEMO', canvas.width*.22, canvas.height*.30);
      ctx.font = '13px Consolas, monospace';
      ['Smooth horizon colors replace hard inversion.', 'Solid translucent building faces fill the wireframe city.', 'Pointer lock makes mouse-look feel like an FPS.', 'IO guards at distance and speaks patch-note memories.', 'Enemies patrol and ignore the player in this demo.'].forEach((s,i) => ctx.fillText(s, canvas.width*.22, canvas.height*.37 + i*28));
    }
    if (!active) {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba(hue(210), 100, 88, 0.98);
      ctx.font = 'bold 28px Consolas, monospace';
      ctx.fillText('CLICK GAME TO FOCUS', canvas.width/2, canvas.height/2 - 10);
      ctx.font = '14px Consolas, monospace';
      ctx.fillText('Pointer lock enables FPS mouse-look. Esc releases controls. Scroll stays free outside the game.', canvas.width/2, canvas.height/2 + 22);
    }
    if (paused) {
      ctx.fillStyle = 'rgba(0,0,0,.58)';
      ctx.fillRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 42px Consolas, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED', canvas.width/2, canvas.height/2);
    }
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = String(text).split(/\s+/);
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        y += lineHeight;
        line = word;
      } else line = test;
    }
    if (line) ctx.fillText(line, x, y);
  }

  function resize() {
    const box = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(640, Math.floor(box.width * dpr));
    const h = Math.floor(w * 9 / 16);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  function syncMuteButton() {
    const b = $('demoMuteBtn');
    if (b) { b.textContent = muted ? 'Audio Muted' : 'Mute Audio'; b.setAttribute('aria-pressed', String(muted)); }
  }

  function setUiText() {
    const pairs = [
      ['demoSectionTitle','HoloVerse Demo — IO Memory Guard'],
      ['demoSectionIntro','A smoother browser canvas HoloVerse slice: slow colorful horizon cycles, solidified neon line buildings, FPS-style pointer look, IO guard companion, passive enemies, overhead battle color, and patch-note memories.'],
      ['demoTitle','HoloVerse Demo'],
      ['demoSummary','Explore a generated city while IO protects from a distance. Enemies ignore the player here; only IO can see you.'],
      ['demoObjective','Move through the city, test weapons, click IO for patch-note memories, and watch the sky/battle effects shift smoothly.'],
      ['demoControls','Click the game first. WASD move, Shift sprint, mouse looks like FPS, LMB fire, TAB next weapon, click IO for patch notes, H HUD, F10 workstation, R reset, M mute. Esc releases controls.'],
      ['demoDetails','Pass 12 notes: smooth color fades, filled building faces, pointer-lock mouse look, IO companion/patch-note interactions, and enemies ignoring the player.']
    ];
    for (const [id, value] of pairs) { const el = $(id); if (el) el.textContent = value; }
    const note = $('demoSectionNote'); if (note) note.textContent = 'Pass 12: HoloVerse Demo keeps one playable canvas and adds smoother visuals, IO protection, and non-repeating patch-note interactions.';
    const tags = $('demoTags');
    if (tags) {
      tags.innerHTML = '';
      ['HoloVerse Demo','Smooth color cycle','Solid line city','FPS mouse look','IO patch memories'].forEach((t) => { const s = document.createElement('span'); s.textContent = t; tags.appendChild(s); });
    }
  }

  function parsePatchNotes(text) {
    const entries = [];
    const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
    for (const block of blocks) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) continue;
      const title = lines[0].replace(/^-\s*/, '');
      const bullets = lines.filter((l) => l.startsWith('-')).map((l) => l.replace(/^[-\s]+/, '')).slice(0, 2);
      if (bullets.length) entries.push(`${title}: ${bullets.join(' ')}`);
    }
    if (!entries.length) entries.push('HoloVerse Demo: smooth visual pass, IO guard behavior, passive enemies, and patch-note memories are active.');
    notes = entries;
    try {
      const used = JSON.parse(sessionStorage.getItem('holoverse-demo-note-used-v1') || '[]');
      noteQueue = notes.map((_, i) => i).filter((i) => !used.includes(i));
      if (!noteQueue.length) { sessionStorage.removeItem('holoverse-demo-note-used-v1'); noteQueue = notes.map((_, i) => i); }
    } catch { noteQueue = notes.map((_, i) => i); }
  }

  function showNextPatchNote() {
    if (!notes.length) parsePatchNotes('');
    if (!noteQueue.length) {
      noteQueue = notes.map((_, i) => i);
      try { sessionStorage.removeItem('holoverse-demo-note-used-v1'); } catch {}
    }
    const idx = noteQueue.shift();
    const text = notes[idx] || notes[0];
    noteToast = { text, age: 0 };
    try {
      const used = JSON.parse(sessionStorage.getItem('holoverse-demo-note-used-v1') || '[]');
      if (!used.includes(idx)) used.push(idx);
      sessionStorage.setItem('holoverse-demo-note-used-v1', JSON.stringify(used));
    } catch {}
    status('IO SHARED A PATCH MEMORY');
    beep(880, 0.08, 0.006, 'triangle');
  }

  function clickInteractsWithIo() {
    const q = project(io.x, io.y, 1.4);
    if (!q) return false;
    const dx = q.x - canvas.width / 2;
    const dy = q.y - canvas.height * 0.56;
    return Math.hypot(dx, dy) < 72;
  }

  function requestFocus(ev) {
    active = true;
    canvas.focus({ preventScroll: true });
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      audioCtx.resume && audioCtx.resume();
    } catch {}
    if (canvas.requestPointerLock && document.pointerLockElement !== canvas) canvas.requestPointerLock();
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  }

  function releaseFocus() {
    active = false;
    keys = Object.create(null);
    mouseDown = false;
    if (document.pointerLockElement === canvas && document.exitPointerLock) document.exitPointerLock();
  }

  function captured(ev) {
    const k = ev.key === ' ' ? ' ' : ev.key.toLowerCase();
    if (k === 'escape') { releaseFocus(); return false; }
    if (!active || ev.ctrlKey || ev.metaKey || ev.altKey || !KEY_SET.has(k)) return false;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation && ev.stopImmediatePropagation();
    return k;
  }

  function boot() {
    canvas = $('demoCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    canvas.tabIndex = 0;
    document.body.classList.add('demo-runtime-ready','single-demo-runtime','holoverse-demo-port');
    const old = document.querySelector('.demo-head .btn[href*=demo_manifest]'); if (old) old.remove();
    const grid = $('demoGalleryGrid'); if (grid) grid.remove();
    const overlay = $('demoLoadingOverlay'); if (overlay) overlay.hidden = true;
    const head = document.querySelector('.demo-head');
    if (head && !$('demoMuteBtn')) {
      const b = document.createElement('button');
      b.id = 'demoMuteBtn'; b.className = 'btn btn-secondary demo-audio-button'; b.type = 'button'; b.textContent = 'Mute Audio';
      b.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); muted = !muted; syncMuteButton(); };
      head.appendChild(b);
    }
    setUiText();
    fetch('./assets/data/site_patch_notes_current.txt?v=' + VERSION, { cache: 'no-store' })
      .then((r) => r.ok ? r.text() : '')
      .then(parsePatchNotes)
      .catch(() => parsePatchNotes(''));
    canvas.addEventListener('pointerdown', (ev) => {
      requestFocus(ev);
      mouseDown = true;
      if (clickInteractsWithIo()) showNextPatchNote(); else firePlayer();
    }, true);
    canvas.addEventListener('pointerup', () => { mouseDown = false; }, true);
    canvas.addEventListener('pointerleave', () => { if (!pointerLocked) mouseDown = false; }, true);
    canvas.addEventListener('contextmenu', (ev) => { ev.preventDefault(); ev.stopPropagation(); }, true);
    canvas.addEventListener('blur', () => { if (!pointerLocked) active = false; });
    document.addEventListener('pointerlockchange', () => {
      pointerLocked = document.pointerLockElement === canvas;
      if (!pointerLocked) { active = false; keys = Object.create(null); mouseDown = false; }
    });
    window.addEventListener('mousemove', (ev) => {
      if (!active) return;
      if (pointerLocked) player.a += ev.movementX * 0.0022;
    }, true);
    window.addEventListener('keydown', (ev) => {
      const k = captured(ev); if (!k) return;
      keys[k] = true;
      if (k === 'tab' && !keys.tabLatch) { weaponIndex = (weaponIndex + (ev.shiftKey ? -1 : 1) + weapons.length) % weapons.length; currentWeapon = weapon(); banner = 2; status('WEAPON ' + currentWeapon.name); keys.tabLatch = true; beep(620,0.07,0.007,'triangle'); }
      if (k === 'h' && !keys.hLatch) { showHud = !showHud; keys.hLatch = true; }
      if (k === 'f10' && !keys.f10Latch) { workstation = !workstation; keys.f10Latch = true; }
      if (k === 'r' && !keys.rLatch) { reset(); keys.rLatch = true; }
      if (k === 'm' && !keys.mLatch) { muted = !muted; syncMuteButton(); keys.mLatch = true; }
      if (k === 'p' && !keys.pLatch) { paused = !paused; keys.pLatch = true; }
    }, true);
    window.addEventListener('keyup', (ev) => {
      const k = ev.key === ' ' ? ' ' : ev.key.toLowerCase();
      if (KEY_SET.has(k)) {
        keys[k] = false;
        if (k === 'tab') keys.tabLatch = false;
        if (k === 'h') keys.hLatch = false;
        if (k === 'f10') keys.f10Latch = false;
        if (k === 'r') keys.rLatch = false;
        if (k === 'm') keys.mLatch = false;
        if (k === 'p') keys.pLatch = false;
      }
    }, true);
    window.addEventListener('resize', resize);
    resize();
    reset();
    requestAnimationFrame(render);
  }

  addStyle();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
