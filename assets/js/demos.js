(() => {
  'use strict';

  const VERSION = '20260429-pass10-input-infinite-blockbusters';
  const $ = (id) => document.getElementById(id);
  const TILE = 16;
  const VIEW_SCALE = 0.82;
  const WORLD_H = 72;
  const SEED = 4386390;
  const GAME_KEYS = new Set(['a','d','w','s','arrowleft','arrowright','arrowup','arrowdown',' ','shift','f','e','q','g','p','r','h','m','z']);
  const COLORS = ['','#50beff','#a05f37','#50ffdc','#c85aff','#ffa046','#50ff78','#ff5050','#78dc78','#ffe678','#202025'];
  const POWERUPS = ['heal','vital','dash','shield','frenzy','grow','haste','fury','bomb','rush','rapid','cleave','pulse','lunge','shock','snare','blast'];
  const BOT_ROSTER = [
    ['Archivist','#5af082'],['Mirror','#dc8c5a'],['Orbit','#96b4c8'],['Solace','#50c86e'],['Nyx','#78ff8c'],['Vanta','#965a32'],
    ['Sable','#eeeeee'],['Ember','#7850c8'],['Nova','#8cdcff'],['Kite','#b4b4c8'],['Rook','#5ac8ff'],['Mira','#ffa0dc']
  ];

  let canvas, ctx, audioCtx;
  let player, bots, boss, powerups = [], shots = [], meteors = [], particles = [];
  let keys = Object.create(null), worldEdits = new Map(), generatedMin = Infinity, generatedMax = -Infinity;
  let cam = {x: 0, y: 0}, gravity = 1, frame = 0, score = 0, best = 0;
  let bossTimer = 60 * 10, powerTimer = 60 * 4, meteorTimer = 60 * 26;
  let muted = false, paused = false, help = true, gameActive = false, status = [];

  const rnd = (a,b) => a + Math.random() * (b-a);
  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const lerp = (a,b,t) => a + (b-a) * t;
  const key = (x,y) => `${x},${y}`;
  const col = (t) => COLORS[t] || '#fff';
  const hash = (x,y=0,s=SEED) => {
    const n = Math.sin((x * 127.1 + y * 311.7 + s * 0.013) * 0.017453292519943295) * 43758.5453123;
    return n - Math.floor(n);
  };
  const surfaceY = (tx) => Math.floor(40 + Math.sin(tx * 0.105) * 5 + Math.sin(tx * 0.031) * 11 + (hash(tx, 77) - 0.5) * 4);

  function generatedTile(tx, ty) {
    if (ty < 0) return 0;
    if (ty >= WORLD_H) return 10;
    const band = Math.floor((ty - 8) / 5);
    if (ty > 7 && ty < 36 && band >= 0 && band < 6) {
      const anchor = Math.floor(tx / 7);
      const local = ((tx % 7) + 7) % 7;
      if (hash(anchor, band * 19) > 0.36 && local < 2 + Math.floor(hash(anchor, band) * 4)) {
        return [1,3,4,6,7,8,9][Math.floor(hash(anchor, band + 31) * 7)];
      }
    }
    const surf = surfaceY(tx);
    if (ty < surf) return 0;
    const depth = ty - surf;
    if (depth < 13 && hash(tx, ty) < 0.055) return 0;
    if (depth > 15) return 10;
    if (depth > 9) return 2;
    if (depth > 4) return 5;
    return [1,3,4,8,9][Math.floor(hash(tx, ty + 100) * 5)];
  }
  function tile(tx,ty) {
    const k = key(tx,ty);
    if (worldEdits.has(k)) return worldEdits.get(k);
    return generatedTile(tx,ty);
  }
  function setTile(tx,ty,t) { worldEdits.set(key(tx,ty), t); }
  function damageTile(tx,ty,n=1) {
    const t = tile(tx,ty);
    if (!t || t === 10) return false;
    const hp = t >= 6 ? 3 : t === 5 ? 2 : 1;
    if (n >= hp) {
      setTile(tx,ty,0);
      score += 5;
      for (let i=0;i<8;i++) particles.push({x:(tx+.5)*TILE,y:(ty+.5)*TILE,vx:rnd(-2.2,2.2),vy:rnd(-2.2,2.2),life:30,t});
      return true;
    }
    return false;
  }
  function solid(px,py) { return tile(Math.floor(px/TILE), Math.floor(py/TILE)) !== 0; }
  function surface(px) {
    const tx = Math.floor(px / TILE);
    for (let y=4; y<WORLD_H; y++) if (tile(tx,y)) return y*TILE - 12;
    return (WORLD_H - 5) * TILE;
  }

  function ensureWorldAround(list) {
    let minTx = Infinity, maxTx = -Infinity;
    for (const e of list) {
      if (!e) continue;
      const tx = Math.floor(e.x / TILE);
      minTx = Math.min(minTx, tx - 90);
      maxTx = Math.max(maxTx, tx + 90);
    }
    if (minTx < generatedMin || maxTx > generatedMax) {
      generatedMin = Math.min(generatedMin, minTx);
      generatedMax = Math.max(generatedMax, maxTx);
      addStatus(`WORLD STREAM ${generatedMin}..${generatedMax}`);
    }
  }

  function beep(freq=260,dur=.045,gain=.010,type='square') {
    if (muted) return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = type; o.frequency.value = freq; g.gain.value = gain;
      o.connect(g); g.connect(audioCtx.destination); o.start();
      g.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + dur);
      o.stop(audioCtx.currentTime + dur + .02);
    } catch {}
  }
  function addStatus(text) { status.unshift({text, life:210}); status = status.slice(0,5); }

  function makeActor(name, color, x, ai=false) {
    return {name,color,x,y:surface(x)-30,vx:0,vy:0,w:18,h:28,face:1,jumps:0,hp:5,maxHp:5,ai,cd:0,shock:0,power:null,pt:0,dead:0,target:x,score:0,inv:0};
  }
  function resetGame() {
    worldEdits.clear(); generatedMin = Infinity; generatedMax = -Infinity;
    player = makeActor('PLAYER','#8cdcff',35*TILE,false);
    bots = BOT_ROSTER.map((p,i) => makeActor(p[0], p[1], (50+i*8)*TILE, true));
    boss = {x:100*TILE,y:-120,vx:2.2,hp:22,maxHp:22,on:false,cool:0};
    powerups = []; shots = []; meteors = []; particles = []; status = [];
    cam.x = player.x; cam.y = player.y; gravity = 1; score = 0; frame = 0; paused = false;
    bossTimer = 60 * 10; powerTimer = 60 * 4; meteorTimer = 60 * 26;
    ensureWorldAround([player, ...bots, boss]);
    addStatus('NEON ARENA: GRAVITY FLIP');
  }
  function respawn(a) {
    a.dead = 70; a.hp = a.maxHp; a.x = player.x + rnd(-480,480); a.y = surface(a.x) - 35; a.vx = 0; a.vy = 0; a.inv = 120;
    if (a === player) score = Math.max(0, score - 40);
  }
  function hurt(a,n,src) {
    if (a.inv > 0 || a.dead > 0) return;
    if (a.power === 'shield') n = Math.max(1, n-1);
    a.hp -= n; a.inv = 25; a.vx += Math.sign(a.x - src.x || 1) * 5; a.vy -= 4 * gravity;
    beep(82,.06,.012,'sawtooth');
    if (a.hp <= 0) respawn(a);
  }
  function applyPower(a, kind) {
    a.power = kind; a.pt = 60 * 8;
    if (kind === 'heal') a.hp = Math.min(a.maxHp, a.hp + 2);
    if (kind === 'vital') { a.maxHp = Math.min(9, a.maxHp + 1); a.hp = a.maxHp; }
    if (kind === 'bomb') radial(a.x,a.y,5,3,a);
    a.score += 15;
    if (a === player) score += 25;
    addStatus(`${a.name} ${kind.toUpperCase()}`);
    beep(760,.07,.014,'triangle');
  }
  function radial(x,y,rTiles,dmg,owner) {
    const cx = Math.floor(x/TILE), cy = Math.floor(y/TILE), r = rTiles*TILE;
    for (let yy=-rTiles; yy<=rTiles; yy++) for (let xx=-rTiles; xx<=rTiles; xx++) {
      if (Math.hypot(xx,yy) <= rTiles) damageTile(cx+xx, cy+yy, dmg);
    }
    for (const a of [player,...bots]) if (a !== owner && Math.hypot(a.x-x,a.y-y) < r) hurt(a,dmg,{x,y});
    if (boss.on && owner && Math.hypot(boss.x-x,boss.y-y) < r) boss.hp -= dmg;
    for (let i=0;i<22;i++) particles.push({x,y,vx:rnd(-3,3),vy:rnd(-3,3),life:32,t:6});
  }

  function moveActor(a, dx, dy) {
    const steps = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 7) || 1;
    for (let s=0; s<steps; s++) {
      a.x += dx / steps; a.y += dy / steps;
      const rx = a.x - a.w/2, ry = a.y - a.h/2;
      for (let ty=Math.floor(ry/TILE)-1; ty<=Math.floor((ry+a.h)/TILE)+1; ty++) for (let tx=Math.floor(rx/TILE)-1; tx<=Math.floor((rx+a.w)/TILE)+1; tx++) {
        if (!tile(tx,ty)) continue;
        const bx = tx*TILE, by = ty*TILE;
        if (rx < bx+TILE && rx+a.w > bx && ry < by+TILE && ry+a.h > by) {
          if (dx > 0) a.x = bx - a.w/2;
          if (dx < 0) a.x = bx + TILE + a.w/2;
          if (dy*gravity > 0) { a.y = gravity > 0 ? by - a.h/2 : by + TILE + a.h/2; a.vy = 0; a.jumps = 0; }
          if (dy*gravity < 0) { a.y = gravity > 0 ? by + TILE + a.h/2 : by - a.h/2; a.vy = 0; }
        }
      }
    }
    if (a.y > (WORLD_H+8)*TILE || a.y < -28*TILE) respawn(a);
  }
  function melee(a) {
    if (a.cd > 0) return;
    a.cd = a.power === 'rapid' ? 7 : 18;
    const reach = a.power === 'cleave' || a.power === 'lunge' ? 4 : 3;
    const cx = Math.floor((a.x + a.face * 24) / TILE), cy = Math.floor(a.y/TILE);
    for (let y=-1; y<=1; y++) for (let d=0; d<reach; d++) damageTile(cx + d*a.face, cy+y, a.power === 'fury' ? 2 : 1);
    for (const o of [player,...bots]) if (o !== a && Math.hypot(o.x-a.x,o.y-a.y) < 44) { hurt(o, a.power === 'fury' ? 2 : 1, a); a.score += 5; }
    if (boss.on && Math.hypot(boss.x-a.x,boss.y-a.y) < 90) { boss.hp -= a.power === 'fury' ? 3 : 2; a.score += 8; }
    beep(360,.035,.010);
  }
  function cast(a) {
    if (a.shock > 0) return;
    a.shock = a.power === 'shock' ? 55 : 120;
    const kind = a.power || 'pulse';
    shots.push({x:a.x+a.face*14,y:a.y-4,vx:a.face*8,vy:-1,owner:a,t:0,kind,life:190});
    if (kind === 'pulse' || kind === 'bomb' || kind === 'shock') radial(a.x,a.y,kind==='bomb'?5:3,kind==='bomb'?3:1,a);
    beep(520,.08,.014,'sine');
  }
  function throwBlock(a) {
    shots.push({x:a.x+a.face*18,y:a.y-5,vx:a.face*9,vy:-4*gravity,owner:a,t:1+Math.floor(Math.random()*9),life:190});
    beep(260,.04,.010,'triangle');
  }
  function stepActor(a) {
    if (a.dead > 0) { a.dead--; return; }
    a.cd = Math.max(0,a.cd-1); a.shock = Math.max(0,a.shock-1); a.inv = Math.max(0,a.inv-1);
    if (a.pt > 0) a.pt--; else a.power = null;
    let ax = 0;
    if (a.ai) {
      if (Math.random() < .018 || Math.abs(a.target-a.x) < 24) a.target = player.x + rnd(-520,520);
      ax = Math.sign(a.target - a.x); a.face = ax || a.face;
      if ((solid(a.x+a.face*20,a.y) || Math.random()<.006) && a.jumps < 2) { a.vy = -12 * gravity; a.jumps++; }
      if (Math.random() < .026) melee(a);
      if (Math.random() < .012) cast(a);
      if (Math.random() < .006) throwBlock(a);
    } else if (gameActive) {
      ax = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0);
      if ((keys.w || keys.arrowup || keys[' ']) && !keys.jumpLatch && a.jumps < 2) { a.vy = (a.jumps ? -11 : -12.5) * gravity; a.jumps++; keys.jumpLatch = true; beep(210,.055,.010,'triangle'); }
      if (!(keys.w || keys.arrowup || keys[' '])) keys.jumpLatch = false;
      if (keys.shift) a.vx += a.face * 2.0;
      if (keys.f && !keys.fLatch) { melee(a); keys.fLatch = true; } if (!keys.f) keys.fLatch = false;
      if (keys.e && !keys.eLatch) { cast(a); keys.eLatch = true; } if (!keys.e) keys.eLatch = false;
      if (keys.q && !keys.qLatch) { throwBlock(a); keys.qLatch = true; } if (!keys.q) keys.qLatch = false;
    }
    if (ax) { a.face = ax; a.vx += ax * (a.power === 'haste' || a.power === 'rush' ? 3.0 : 2.2); }
    a.vx *= .82; a.vy = clamp(a.vy + .35 * gravity, -14, 14);
    moveActor(a, a.vx, a.vy);
    for (const p of powerups) if (!p.dead && Math.hypot(a.x-p.x,a.y-p.y) < 24) { p.dead = true; applyPower(a,p.kind); }
  }

  function updateGame() {
    if (paused) return;
    frame++;
    for (const s of status) s.life--; status = status.filter(s => s.life > 0);
    ensureWorldAround([player, ...bots, boss]);
    stepActor(player); bots.forEach(stepActor);
    if (--powerTimer <= 0) {
      powerups.push({x:cam.x - canvas.width/(2*VIEW_SCALE) + rnd(90, canvas.width/VIEW_SCALE-90), y:cam.y - canvas.height/(2*VIEW_SCALE) + 60, vy:1.2, kind:POWERUPS[Math.floor(Math.random()*POWERUPS.length)], dead:false});
      powerTimer = 60 * 4;
    }
    if (--meteorTimer <= 0) {
      meteors.push({x:cam.x - canvas.width/(2*VIEW_SCALE) + rnd(60, canvas.width/VIEW_SCALE-60), y:cam.y - canvas.height/(2*VIEW_SCALE)-80, vx:rnd(-2,2), vy:8});
      meteorTimer = 60 * 26;
      addStatus('METEORITES');
    }
    if (--bossTimer <= 0 && !boss.on) { boss.on = true; boss.y = cam.y - canvas.height/(2*VIEW_SCALE) - 80; boss.x = player.x + 520; boss.hp = boss.maxHp; addStatus('GLEEBS HAS ENTERED'); beep(130,.18,.018,'sawtooth'); }
    if (boss.on) {
      boss.x += boss.vx; boss.y = lerp(boss.y, Math.max(90, player.y - 250), .012);
      if (Math.abs(boss.x - player.x) > 760) boss.vx *= -1;
      if (frame % 70 === 0) shots.push({x:boss.x,y:boss.y+20,vx:rnd(-4,4),vy:6,owner:null,t:7,life:180});
      if (boss.hp <= 0) { boss.on = false; bossTimer = 60 * 10; score += 500; addStatus('GLEEBS CLEARED'); }
    }
    for (const p of powerups) { p.vy += .02; p.y += p.vy; if (solid(p.x,p.y+10)) p.vy = -Math.abs(p.vy)*.12; }
    powerups = powerups.filter(p => !p.dead && Math.abs(p.x-cam.x) < 2200);
    for (const s of shots) {
      s.x += s.vx; s.y += s.vy; s.vy += .22 * gravity; s.life--;
      const tx = Math.floor(s.x/TILE), ty = Math.floor(s.y/TILE);
      if (tile(tx,ty)) { damageTile(tx,ty,s.t ? 2 : 1); s.life = 0; }
      for (const a of [player,...bots]) if (a !== s.owner && Math.hypot(a.x-s.x,a.y-s.y) < 22) { hurt(a,1,s); s.life = 0; if (s.owner) s.owner.score += 10; }
      if (boss.on && s.owner && Math.hypot(boss.x-s.x,boss.y-s.y) < 45) { boss.hp -= s.t ? 2 : 1; s.life = 0; }
    }
    shots = shots.filter(s => s.life > 0);
    for (const m of meteors) { m.x += m.vx; m.y += m.vy; m.vy += .1; if (tile(Math.floor(m.x/TILE),Math.floor(m.y/TILE))) { radial(m.x,m.y,3,2,null); m.dead = true; } for (const a of [player,...bots]) if (Math.hypot(a.x-m.x,a.y-m.y)<34) { hurt(a,2,m); m.dead = true; } }
    meteors = meteors.filter(m => !m.dead && Math.abs(m.x-cam.x)<2200);
    for (const p of particles) { p.x += p.vx; p.y += p.vy; p.vy += .05; p.life--; }
    particles = particles.filter(p => p.life > 0);
    cam.x = lerp(cam.x, player.x, .085); cam.y = lerp(cam.y, player.y - 120*gravity, .085);
    best = Math.max(best, score, ...bots.map(b=>b.score));
  }

  function screen(px,py) { return {x:(px-cam.x)*VIEW_SCALE + canvas.width/2, y:(py-cam.y)*VIEW_SCALE + canvas.height/2 + 55, s:VIEW_SCALE}; }
  function drawActor(a) {
    if (a.dead && Math.floor(a.dead/5)%2) return;
    const p = screen(a.x,a.y), sz = (a.power === 'grow' ? 42 : 34) * p.s;
    ctx.save(); ctx.translate(p.x,p.y); ctx.scale(a.face < 0 ? -1 : 1, gravity < 0 ? -1 : 1);
    ctx.fillStyle = a.color; ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(-sz/2,-sz/2,sz,sz,sz*.28); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#061018'; ctx.fillRect(-sz*.18,-sz*.13,sz*.10,sz*.10); ctx.fillRect(sz*.10,-sz*.13,sz*.10,sz*.10);
    if (a.shock > 0) { ctx.strokeStyle = 'rgba(125,240,255,.55)'; ctx.beginPath(); ctx.arc(0,0,44*(a.shock/120),0,Math.PI*2); ctx.stroke(); }
    ctx.restore();
    ctx.textAlign = 'center'; ctx.font = `${Math.max(10,11*p.s)}px Consolas, monospace`; ctx.fillStyle = a.color; ctx.fillText(a.name.toUpperCase(), p.x, p.y - sz/2 - 5);
    ctx.fillStyle='rgba(255,255,255,.16)'; ctx.fillRect(p.x-18,p.y+sz/2+4,36,4); ctx.fillStyle='#78ff9c'; ctx.fillRect(p.x-18,p.y+sz/2+4,36*(a.hp/a.maxHp),4);
  }
  function drawGame() {
    resize(); updateGame();
    const g = ctx.createLinearGradient(0,0,0,canvas.height); g.addColorStop(0,'#050816'); g.addColorStop(.55,'#11081f'); g.addColorStop(1,'#04172b'); ctx.fillStyle=g; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='rgba(80,255,255,.08)'; for(let gx=0; gx<canvas.width; gx+=32){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,canvas.height);ctx.stroke();}
    const sx=Math.floor((cam.x-canvas.width/(2*VIEW_SCALE))/TILE)-2, ex=Math.floor((cam.x+canvas.width/(2*VIEW_SCALE))/TILE)+2;
    const sy=Math.floor((cam.y-canvas.height/(2*VIEW_SCALE))/TILE)-3, ey=Math.floor((cam.y+canvas.height/(2*VIEW_SCALE))/TILE)+3;
    for (let ty=Math.max(0,sy); ty<Math.min(WORLD_H,ey); ty++) for (let tx=sx; tx<=ex; tx++) {
      const t = tile(tx,ty); if (!t) continue; const p = screen(tx*TILE,ty*TILE), s = Math.ceil(TILE*VIEW_SCALE)+1;
      ctx.fillStyle = col(t); ctx.fillRect(p.x,p.y,s,s); ctx.strokeStyle='rgba(0,0,0,.35)'; ctx.strokeRect(p.x,p.y,s,s);
    }
    for (const pwr of powerups) { const p=screen(pwr.x,pwr.y); ctx.fillStyle='#78eaff'; ctx.beginPath(); ctx.arc(p.x,p.y,9,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#fff'; ctx.font='9px Consolas'; ctx.textAlign='center'; ctx.fillText(pwr.kind[0].toUpperCase(),p.x,p.y+3); }
    for (const s of shots) { const p=screen(s.x,s.y); ctx.fillStyle=s.t?col(s.t):'#8cf'; ctx.beginPath(); ctx.arc(p.x,p.y,7,0,Math.PI*2); ctx.fill(); }
    for (const m of meteors) { const p=screen(m.x,m.y); ctx.fillStyle='#f34'; ctx.beginPath(); ctx.arc(p.x,p.y,12,0,Math.PI*2); ctx.fill(); }
    for (const p0 of particles) { const p=screen(p0.x,p0.y); ctx.fillStyle=col(p0.t); ctx.globalAlpha=Math.max(0,p0.life/30); ctx.fillRect(p.x,p.y,3,3); ctx.globalAlpha=1; }
    bots.forEach(drawActor); drawActor(player);
    if (boss.on) { const p=screen(boss.x,boss.y); ctx.fillStyle='#a2f5ff'; ctx.beginPath(); ctx.arc(p.x,p.y,34,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#071016'; ctx.font='bold 28px Consolas'; ctx.textAlign='center'; ctx.fillText('G',p.x,p.y+10); ctx.fillStyle='#ffd6ff'; ctx.font='12px Consolas'; ctx.fillText('GLEEBS',p.x,p.y-45); ctx.fillStyle='#ff65d8'; ctx.fillRect(p.x-52,p.y-36,104*(boss.hp/boss.maxHp),5); }
    drawHud(); requestAnimationFrame(drawGame);
  }
  function drawHud() {
    ctx.textAlign='left'; ctx.fillStyle='rgba(0,0,0,.64)'; ctx.fillRect(18,16,455,105); ctx.strokeStyle='rgba(80,255,255,.42)'; ctx.strokeRect(18,16,455,105);
    ctx.fillStyle='#fff'; ctx.font='bold 16px Consolas'; ctx.fillText('NEON ARENA: GRAVITY FLIP',32,40);
    ctx.font='13px Consolas'; ctx.fillStyle='#b7c8df'; ctx.fillText(`SCORE ${Math.floor(score)}  BEST ${Math.floor(best)}  HP ${player.hp}/${player.maxHp}`,32,63);
    ctx.fillText(`POWER ${(player.power||'NONE').toUpperCase()}  GRAVITY ${gravity>0?'NORMAL':'INVERTED'}  X ${Math.floor(player.x/TILE)}`,32,84);
    ctx.fillText(`BOSS ${boss.on?'ACTIVE':'IN '+Math.ceil(bossTimer/60)+'s'}  WORLD ${generatedMin}..${generatedMax}`,32,105);
    const rightW = 306, rightH = help ? 244 : 142; ctx.fillStyle='rgba(0,0,0,.64)'; ctx.fillRect(canvas.width-rightW-18,16,rightW,rightH); ctx.strokeStyle='rgba(80,255,255,.35)'; ctx.strokeRect(canvas.width-rightW-18,16,rightW,rightH);
    ctx.fillStyle='#d8f6ff'; ctx.font='bold 14px Consolas'; ctx.fillText('LEADERBOARD',canvas.width-rightW,42);
    [player,...bots].sort((a,b)=>(b.score+b.hp*9)-(a.score+a.hp*9)).slice(0,6).forEach((a,i)=>{ctx.fillStyle=a.color;ctx.font='11px Consolas';ctx.fillText(`${i+1}. ${a.name}`,canvas.width-rightW,65+i*17);});
    if (help) ['CLICK GAME TO FOCUS','ESC RELEASES CONTROLS','A/D MOVE  W/SPACE JUMP','SHIFT DASH  F ATTACK','E POWER  Q THROW','G FLIP GRAVITY','P PAUSE  R RESET  M MUTE'].forEach((t,i)=>{ctx.fillStyle=i<2?'#fff':'#b7c8df';ctx.fillText(t,canvas.width-rightW,180+i*14);});
    let y=138; for(const s of status){ctx.fillStyle=`rgba(220,235,255,${Math.min(1,s.life/60)})`;ctx.fillText('> '+s.text,32,y);y+=17;}
    if (!gameActive) { ctx.fillStyle='rgba(0,0,0,.50)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.textAlign='center'; ctx.fillStyle='#fff'; ctx.font='bold 26px Consolas'; ctx.fillText('CLICK GAME TO FOCUS',canvas.width/2,canvas.height/2-8); ctx.font='14px Consolas'; ctx.fillStyle='#b7c8df'; ctx.fillText('Esc releases controls. Mouse wheel keeps scrolling the page.',canvas.width/2,canvas.height/2+22); }
    if (paused) { ctx.fillStyle='rgba(0,0,0,.55)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fff'; ctx.font='bold 42px Consolas'; ctx.textAlign='center'; ctx.fillText('PAUSED',canvas.width/2,canvas.height/2); }
  }
  function resize(){ const box=canvas.getBoundingClientRect(), dpr=Math.min(2,window.devicePixelRatio||1), w=Math.max(640,Math.floor(box.width*dpr)), h=Math.floor(w*9/16); if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;} }

  function armGame(ev) {
    gameActive = true; canvas.focus({preventScroll:true}); keys = Object.create(null);
    try { audioCtx ||= new (window.AudioContext || window.webkitAudioContext)(); audioCtx.resume && audioCtx.resume(); } catch {}
    if (ev) { ev.preventDefault(); ev.stopPropagation(); }
  }
  function releaseGame() { gameActive = false; keys = Object.create(null); }
  function captureKeyEvent(ev) {
    const k = ev.key === ' ' ? ' ' : ev.key.toLowerCase();
    if (k === 'escape') { releaseGame(); return false; }
    if (!gameActive || ev.ctrlKey || ev.metaKey || ev.altKey || !GAME_KEYS.has(k)) return false;
    ev.preventDefault(); ev.stopPropagation(); ev.stopImmediatePropagation && ev.stopImmediatePropagation();
    return k;
  }
  function bindInput() {
    canvas.addEventListener('pointerdown', armGame, true);
    canvas.addEventListener('mousedown', (ev) => { if (gameActive) { ev.preventDefault(); ev.stopPropagation(); } }, true);
    canvas.addEventListener('contextmenu', (ev) => { ev.preventDefault(); ev.stopPropagation(); }, true);
    canvas.addEventListener('blur', releaseGame);
    window.addEventListener('keydown', (ev) => {
      const k = captureKeyEvent(ev); if (!k) return; keys[k] = true;
      if (k==='p'&&!keys.pLatch){paused=!paused;keys.pLatch=true;}
      if (k==='m'&&!keys.mLatch){muted=!muted; syncMuteButton(); keys.mLatch=true;}
      if (k==='r'&&!keys.rLatch){resetGame();keys.rLatch=true;}
      if (k==='h'&&!keys.hLatch){help=!help;keys.hLatch=true;}
      if (k==='z'&&!keys.zLatch){keys.zLatch=true;}
      if (k==='g'&&!keys.gLatch){gravity*=-1;keys.gLatch=true;addStatus(gravity<0?'GRAVITY INVERTED':'GRAVITY NORMAL');beep(420,.08,.014,'triangle');}
    }, true);
    window.addEventListener('keyup', (ev) => { const k = ev.key === ' ' ? ' ' : ev.key.toLowerCase(); if (GAME_KEYS.has(k)) { keys[k]=false; if(k==='p')keys.pLatch=false;if(k==='m')keys.mLatch=false;if(k==='r')keys.rLatch=false;if(k==='h')keys.hLatch=false;if(k==='g')keys.gLatch=false; } }, true);
  }
  function syncMuteButton(){ const b=$('demoMuteBtn'); if(b){b.textContent=muted?'Audio Muted':'Mute Audio'; b.setAttribute('aria-pressed',String(muted));} }

  function boot() {
    canvas = $('demoCanvas'); if (!canvas) return; ctx = canvas.getContext('2d'); canvas.setAttribute('tabindex','0');
    document.body.classList.add('demo-runtime-ready','single-demo-runtime','block-busters-original-port');
    const old = document.querySelector('.demo-head .btn[href*=demo_manifest]'); if (old) old.remove(); const grid=$('demoGalleryGrid'); if(grid) grid.remove(); const ov=$('demoLoadingOverlay'); if(ov) ov.hidden=true;
    const head=document.querySelector('.demo-head'); if(head&&!$('demoMuteBtn')){const b=document.createElement('button');b.id='demoMuteBtn';b.className='btn btn-secondary demo-audio-button';b.type='button';b.textContent='Mute Audio';b.onclick=(ev)=>{ev.preventDefault();ev.stopPropagation();muted=!muted;syncMuteButton();};head.appendChild(b);}
    [['demoSectionTitle','Block Busters — Original Web Arena'],['demoSectionIntro','A browser conversion with original-style Block Busters rules: infinite side-streaming block world, destructible terrain, Gleebs boss, bot roster, powerups, meteors, gravity flip, and safer web-page input focus.'],['demoTitle','Block Busters'],['demoSummary','Original-style generated arena with focused controls, throwable blocks, powers, bot pressure, and a world that streams both directions as entities approach the edge.'],['demoObjective','Break blocks, collect powerups, survive Gleebs, and keep moving through an endless arena.'],['demoControls','Click the game first. A/D move, W/Space jump, Shift dash, F attack, E power, Q throw, G gravity, P pause, R reset, M mute. Esc releases controls.'],['demoDetails','Controls are captured only while the canvas is focused; Esc releases the game and mouse wheel remains free for page scrolling.']].forEach(([id,value])=>{const el=$(id); if(el) el.textContent=value;});
    const tags=$('demoTags'); if(tags){tags.innerHTML='';['Original-style rules','Focused controls','Infinite sides','Gleebs boss','Powerups'].forEach(t=>{const s=document.createElement('span');s.textContent=t;tags.appendChild(s);});}
    bindInput(); window.addEventListener('resize',resize); resize(); resetGame(); requestAnimationFrame(drawGame);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
