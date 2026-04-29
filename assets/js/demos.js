
(() => {
  'use strict';

  const VERSION = '20260429-pass9-original-blockbusters-port';
  const $ = (id) => document.getElementById(id);
  const TILE = 16, VIEW_W = 1600, VIEW_H = 900, WORLD_W = 240, WORLD_H = 82;
  const GRAVITY_STRENGTH = 0.35, JUMP_VELOCITY = 12.5, DOUBLE_JUMP_VELOCITY = 11.0, MAX_VERTICAL_SPEED = 14.0;
  const MOVE_SPEED = 2.2, DASH_SPEED = 7.5, DASH_DURATION = 10, ATTACK_COOLDOWN = 18;
  const SHOCKWAVE_COOLDOWN = 60 * 10, BOSS_DROP_DELAY = 60 * 10, POWERUP_DROP_INTERVAL = 60 * 4, POWERUP_SPECIAL_DURATION = 60 * 8;
  const METEOR_INTERVAL = 60 * 32, RESPAWN_INVULN_TIME = 60 * 2, BOSS_NAME = 'Gleebs';
  const BLOCK_HP = {1:1,2:2,3:3,4:4,5:5,6:3,7:3,8:3,9:4,10:999};
  const BLOCK_THROW_DAMAGE = {1:1,2:2,3:1,4:1,5:2,6:2,7:2,8:1,9:2,10:2};
  const BLOCK_COLORS = {
    1:[80,190,255,170],2:[160,95,55,190],3:[80,255,220,170],4:[200,90,255,170],5:[255,160,70,170],
    6:[80,255,120,200],7:[255,80,80,200],8:[120,220,120,200],9:[255,230,120,200],10:[20,20,25,220]
  };
  const POWERUP_WEIGHTS = {heal:10,vital:12,dash:5,shield:6,frenzy:6,grow:4,haste:4,fury:4,bomb:3,rush:4,rapid:4,cleave:3,pulse:3,lunge:3,shock:4,snare:4,blast:3};
  const POWERUP_COLORS = {
    heal:[120,255,160],vital:[140,220,255],dash:[120,200,255],shield:[180,200,255],frenzy:[255,80,120],
    grow:[255,180,120],haste:[120,255,220],fury:[255,120,120],bomb:[255,100,160],rush:[120,255,255],
    rapid:[255,200,120],cleave:[200,160,255],pulse:[140,255,140],lunge:[255,180,80],shock:[160,200,255],
    snare:[120,180,255],blast:[255,140,140]
  };
  const POWER_DAMAGE = {heal:1,vital:2,dash:1,shield:1,frenzy:2,grow:2,haste:1,fury:2,bomb:2,rush:2,rapid:1,cleave:2,pulse:1,lunge:2,shock:1,snare:1,blast:2};
  const ROSTER = [
    ['Archivist',[90,240,130],'alien'],['Mirror',[220,140,90],'fatman'],['Orbit',[150,180,200],'robot'],
    ['Solace',[80,200,110],'reptilian'],['Nyx',[120,255,140],'mantis'],['Vanta',[150,90,50],'monkey'],
    ['Sable',[230,230,230],'skeleton'],['Ember',[120,80,200],'witch'],['Nova',[140,220,255],'blob'],
    ['Kite',[180,180,200],'knight'],['Rook',[90,200,255],'cyber'],['Mira',[255,160,220],'pixie']
  ];
  const BACKGROUNDS = [
    [[6,8,18],[12,8,28],[5,28,48]], [[10,6,20],[18,8,36],[6,24,40]],
    [[5,10,22],[8,14,32],[4,20,38]], [[8,6,16],[14,10,30],[6,18,34]]
  ];
  const GLOW = [[80,200,255],[255,80,255],[80,255,200]];
  const DATA_IMAGES = {};
  const images = {};
  for (const [name, src] of Object.entries(DATA_IMAGES)) { const im = new Image(); im.src = src; images[name] = im; }

  const style = document.createElement('style');
  style.textContent = `
    .demo-section{overflow:hidden}.demo-head{align-items:center}.demo-head .btn[href*="demo_manifest"]{display:none!important}
    #demoGalleryGrid,.demo-gallery-grid{display:none!important}.single-demo-layout,.demo-player-layout{grid-template-columns:minmax(185px,.62fr) minmax(0,1.72fr) minmax(220px,.75fr);gap:14px}
    .demo-canvas-shell{position:relative;overflow:hidden;background:radial-gradient(circle at 50% 20%,rgba(79,220,255,.08),transparent 34%),linear-gradient(180deg,rgba(8,8,18,.95),rgba(2,2,4,.98));padding:12px;min-height:390px}
    .block-busters-canvas,.demo-canvas{aspect-ratio:16/9;height:auto;min-height:360px;background:#03060b;border:1px solid rgba(92,220,255,.2);image-rendering:pixelated;box-shadow:inset 0 0 60px rgba(0,0,0,.5),0 0 32px rgba(255,40,60,.12);outline:none}
    .demo-audio-button[aria-pressed="true"]{border-color:rgba(255,80,96,.72);background:rgba(255,34,50,.16)}
    .demo-loading-overlay{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:24px;text-align:center;color:#fff4f4;background:radial-gradient(circle at 50% 40%,rgba(160,0,20,.34),rgba(0,0,0,.88) 58%),#050505;border-radius:inherit;letter-spacing:.08em;text-transform:uppercase;font-weight:800}
    .demo-loading-overlay[hidden],.demo-runtime-ready .demo-loading-overlay{display:none!important}.demo-loading-overlay span{max-width:360px;color:rgba(235,210,210,.75);font-size:.78rem;line-height:1.5;letter-spacing:.02em;text-transform:none;font-weight:500}
    @media(max-width:1480px){.demo-player-layout{grid-template-columns:minmax(170px,.62fr) minmax(0,1.55fr)}.demo-info-right{grid-column:1/-1}}
    @media(max-width:980px){.demo-player-layout{grid-template-columns:1fr}.demo-info-right{grid-column:auto}.demo-canvas{min-height:300px}.demo-head{align-items:start;flex-direction:column}}
  `;
  document.head.appendChild(style);

  const clamp = (v,a,b) => Math.max(a, Math.min(b, v));
  const lerp = (a,b,t) => a + (b-a)*t;
  const choice = (a) => a[(Math.random()*a.length)|0];
  const rgb = (a, alpha=1) => `rgba(${a[0]},${a[1]},${a[2]},${alpha})`;
  const weighted = (weights) => {
    const entries = Object.entries(weights); let total = 0;
    for (const [,w] of entries) total += w;
    let r = Math.random() * total;
    for (const [k,w] of entries) { r -= w; if (r <= 0) return k; }
    return entries[0][0];
  };

  let canvas, outCtx, buffer, ctx, world, hp, players, player, boss, projectiles, powerShots, powerups, meteors, particles;
  const state = {
    keys:Object.create(null), muted:false, audio:null, paused:false, help:true, frame:0, gravity:1,
    cam:{x:0,y:0}, viewIndex:1, viewScales:[1.0,0.8,0.6], status:[], bg:choice(BACKGROUNDS), stars:[],
    powerTimer:POWERUP_DROP_INTERVAL, meteorTimer:METEOR_INTERVAL, bossTimer:BOSS_DROP_DELAY, best:0
  };

  function text(id, value) { const el = $(id); if (el) el.textContent = value; }
  function addStatus(value) { state.status.unshift({text:value, life:240}); state.status = state.status.slice(0,5); }
  function play(freq=260, dur=.055, type='square', gain=.012) {
    if (state.muted) return;
    try {
      state.audio ||= new (window.AudioContext || window.webkitAudioContext)();
      const ac = state.audio, o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = freq; g.gain.value = gain;
      o.connect(g); g.connect(ac.destination); o.start();
      g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + dur);
      o.stop(ac.currentTime + dur + .02);
    } catch {}
  }
  function toggleMute() {
    state.muted = !state.muted;
    const b = $('demoMuteBtn');
    if (b) { b.textContent = state.muted ? 'Audio Muted' : 'Mute Audio'; b.setAttribute('aria-pressed', String(state.muted)); }
  }

  function createWorld() {
    world = new Uint8Array(WORLD_W*WORLD_H); hp = new Int16Array(WORLD_W*WORLD_H);
    const set = (x,y,t) => { if(x<0||y<0||x>=WORLD_W||y>=WORLD_H) return; const i=y*WORLD_W+x; world[i]=t; hp[i]=BLOCK_HP[t]||0; };
    const noise = x => Math.sin(x*.19)*4 + Math.sin(x*.047)*8 + Math.sin(x*.73)*1.5;
    for (let x=0;x<WORLD_W;x++) {
      const surface = Math.floor(51 + noise(x));
      for (let y=surface;y<WORLD_H;y++) {
        const d = y-surface;
        const t = d>14 ? 10 : (d>9 ? 2 : (d>5 ? 5 : choice([1,3,4,8,9])));
        if (Math.random() < .06 && d < 14) continue;
        set(x,y,t);
      }
    }
    for (let band=0; band<6; band++) {
      const y = 15 + band*5 + (Math.random()*2|0);
      for (let x=8; x<WORLD_W-8; x+=6) if (Math.random() < .68) {
        const len = 2 + (Math.random()*5|0), t = choice([1,3,4,6,7,8,9]);
        for (let k=0;k<len;k++) if (Math.random()>.14) set(x+k,y,t);
      }
    }
    for (let i=0;i<34;i++) {
      const cx = 20 + (Math.random()*(WORLD_W-40)|0), cy = 30 + (Math.random()*28|0), r = 2 + (Math.random()*4|0);
      for (let y=cy-r;y<=cy+r;y++) for (let x=cx-r;x<=cx+r;x++) {
        if (Math.hypot(x-cx,y-cy) <= r + Math.random()*.6 && x>1&&y>1&&x<WORLD_W-1&&y<WORLD_H-1) { const idx=y*WORLD_W+x; world[idx]=0; hp[idx]=0; }
      }
    }
  }
  function getTile(tx,ty) { if(tx<0||ty<0||tx>=WORLD_W||ty>=WORLD_H) return 10; return world[ty*WORLD_W+tx]; }
  function damageTile(tx,ty,amount=1) {
    if(tx<0||ty<0||tx>=WORLD_W||ty>=WORLD_H) return false;
    const i=ty*WORLD_W+tx, t=world[i];
    if(!t || t===10) return false;
    hp[i]-=amount;
    if(hp[i]<=0) { world[i]=0; hp[i]=0; spawnParticles((tx+.5)*TILE,(ty+.5)*TILE,BLOCK_COLORS[t]||[255,255,255],8); return true; }
    return false;
  }
  function solidAt(x,y) { return getTile(Math.floor(x/TILE), Math.floor(y/TILE)) !== 0; }
  function findSurface(px) { const tx=clamp(Math.floor(px/TILE),1,WORLD_W-2); for(let y=8;y<WORLD_H-2;y++) if(getTile(tx,y)) return y*TILE-10; return (WORLD_H-8)*TILE; }

  class Actor {
    constructor(name, sprite, color, x, y, ai=false) {
      Object.assign(this,{name,sprite,color,x,y,vx:0,vy:0,w:18,h:27,ai,facing:1,hp:5,maxHp:5,score:0,jumps:0,onGround:false,attackCd:0,dashTimer:0,dashCd:0,shockCd:0,invuln:0,power:null,powerTimer:0,sizeMul:1,dead:0,targetX:x});
      this.title = ai ? choice(['debugger','optimizer','teacher','planner','developer','artist','strategist']) : 'player';
    }
    rect() { return {x:this.x-this.w*this.sizeMul/2,y:this.y-this.h*this.sizeMul/2,w:this.w*this.sizeMul,h:this.h*this.sizeMul}; }
    takeDamage(n, source=null) {
      if (this.invuln || this.dead) return;
      if (this.power === 'shield') n = Math.max(1,n-1);
      this.hp -= n; this.invuln = 30; if (source) { this.vx += Math.sign(this.x-source.x || 1)*5; this.vy -= 4*state.gravity; }
      play(82,.08,'sawtooth',.014);
      if (this.hp <= 0) this.respawn();
    }
    respawn() { this.dead=80; this.hp=this.maxHp; this.x=(28+Math.random()*22)*TILE; this.y=findSurface(this.x)-40; this.vx=0; this.vy=0; this.invuln=RESPAWN_INVULN_TIME; this.score=Math.max(0,this.score-50); if(!this.ai)addStatus('RESPAWNED - SCORE PENALTY'); }
    applyPower(kind) {
      this.power=kind; this.powerTimer=POWERUP_SPECIAL_DURATION;
      if(kind==='heal')this.hp=Math.min(this.maxHp,this.hp+2);
      if(kind==='vital'){this.maxHp=Math.min(9,this.maxHp+1);this.hp=this.maxHp;}
      if(kind==='grow')this.sizeMul=1.35;
      if(kind==='bomb')radialDamage(this.x,this.y,5,3,this);
      if(kind==='shock')this.shockCd=0;
      this.score += 15; addStatus(`${this.name.toUpperCase()} GOT ${kind.toUpperCase()}`); play(760,.09,'triangle',.018);
    }
    update() {
      if(this.dead>0){this.dead--;return;}
      this.attackCd=Math.max(0,this.attackCd-1);this.dashCd=Math.max(0,this.dashCd-1);this.shockCd=Math.max(0,this.shockCd-1);this.invuln=Math.max(0,this.invuln-1);
      if(this.powerTimer>0)this.powerTimer--; else {this.power=null;this.sizeMul=1;}
      this.ai ? this.aiMove() : this.inputMove();
      const speedMul = (this.power==='haste'||this.power==='rush') ? 1.45 : 1, dashMul = this.dashTimer>0 ? DASH_SPEED/MOVE_SPEED : 1;
      if(this.dashTimer>0)this.dashTimer--;
      this.vx*=.82; this.vy=clamp(this.vy+GRAVITY_STRENGTH*state.gravity,-MAX_VERTICAL_SPEED,MAX_VERTICAL_SPEED);
      this.moveAxis(this.vx*speedMul*dashMul,0); this.moveAxis(0,this.vy);
      for(const o of powerups) if(!o.dead && Math.hypot(this.x-o.x,this.y-o.y)<22){o.dead=true;this.applyPower(o.kind);}
    }
    inputMove() {
      let ax=0; if(state.keys.a||state.keys.arrowleft)ax--; if(state.keys.d||state.keys.arrowright)ax++;
      if(ax){this.facing=ax;this.vx+=ax*MOVE_SPEED;}
      if((state.keys.w||state.keys.arrowup||state.keys[' '])&&!state.jumpLatch&&this.jumps<2){this.vy=(this.jumps?-DOUBLE_JUMP_VELOCITY:-JUMP_VELOCITY)*state.gravity;this.jumps++;this.onGround=false;state.jumpLatch=true;play(210,.06,'triangle',.010);}
      if(!(state.keys.w||state.keys.arrowup||state.keys[' ']))state.jumpLatch=false;
      if(state.keys.shift&&this.dashCd<=0){this.dashTimer=DASH_DURATION;this.dashCd=45;this.vx+=this.facing*5;play(160,.06,'sawtooth',.014);}
      if(state.keys.f&&!state.attackLatch){this.attack();state.attackLatch=true;} if(!state.keys.f)state.attackLatch=false;
      if(state.keys.e&&!state.powerLatch){this.castPower();state.powerLatch=true;} if(!state.keys.e)state.powerLatch=false;
      if(state.keys.q&&!state.throwLatch){this.throwBlock();state.throwLatch=true;} if(!state.keys.q)state.throwLatch=false;
    }
    aiMove() {
      if(Math.random()<.016 || Math.abs(this.targetX-this.x)<28)this.targetX=clamp(player.x+(Math.random()*2-1)*500,40,WORLD_W*TILE-40);
      const dir=Math.sign(this.targetX-this.x); this.facing=dir||this.facing; this.vx+=dir*MOVE_SPEED*.72;
      if((solidAt(this.x+this.facing*18,this.y)||Math.random()<.004)&&this.jumps<2){this.vy=-JUMP_VELOCITY*state.gravity;this.jumps++;}
      if(this.attackCd<=0&&Math.random()<.035)this.attack();
      if(boss&&boss.active&&Math.random()<.016)this.castPower();
    }
    attack() {
      if(this.attackCd>0)return; this.attackCd=this.power==='rapid'?7:ATTACK_COOLDOWN;
      const reach=(this.power==='lunge'||this.power==='cleave')?4:2, cx=Math.floor((this.x+this.facing*TILE*1.6)/TILE), cy=Math.floor(this.y/TILE);
      for(let dy=-1;dy<=1;dy++)for(let dx=0;dx<reach;dx++)damageTile(cx+dx*this.facing,cy+dy,this.power==='fury'?2:1);
      for(const p of players)if(p!==this&&!p.dead&&Math.hypot(p.x-this.x,p.y-this.y)<TILE*3){p.takeDamage(this.power==='fury'?2:1,this);this.score+=5;}
      if(boss&&boss.active&&Math.hypot(boss.x-this.x,boss.y-this.y)<TILE*5)boss.takeDamage(this.power==='fury'?2:1,this);
      play(360,.04,'square',.012);
    }
    throwBlock() {
      const tx=Math.floor((this.x+this.facing*TILE*1.8)/TILE),ty=Math.floor(this.y/TILE),t=getTile(tx,ty)||choice([1,3,7,9]);
      if(getTile(tx,ty))damageTile(tx,ty,99);
      projectiles.push({x:this.x+this.facing*18,y:this.y-6,vx:this.facing*9,vy:-4*state.gravity,t,owner:this,life:240,r:8}); play(280,.05,'triangle',.012);
    }
    castPower() {
      if(this.shockCd>0)return; this.shockCd=this.power==='shock'?60:SHOCKWAVE_COOLDOWN;
      const kind=this.power||'pulse',target=boss&&boss.active?boss:nearestOpponent(this);
      powerShots.push({x:this.x,y:this.y,vx:this.facing*7,vy:-1,target,kind,owner:this,life:240,r:7});
      if(kind==='pulse'||kind==='shock')radialDamage(this.x,this.y,5,1,this); play(500,.08,'sine',.018);
    }
    moveAxis(dx,dy) {
      const steps=Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/8)||1;
      for(let s=0;s<steps;s++){
        this.x+=dx/steps;this.y+=dy/steps;const r=this.rect(),minTx=Math.floor(r.x/TILE),maxTx=Math.floor((r.x+r.w)/TILE),minTy=Math.floor(r.y/TILE),maxTy=Math.floor((r.y+r.h)/TILE);
        for(let ty=minTy;ty<=maxTy;ty++)for(let tx=minTx;tx<=maxTx;tx++)if(getTile(tx,ty)){
          const tr={x:tx*TILE,y:ty*TILE,w:TILE,h:TILE};
          if(r.x<tr.x+tr.w&&r.x+r.w>tr.x&&r.y<tr.y+tr.h&&r.y+r.h>tr.y){
            if(dx>0)this.x=tr.x-r.w/2;if(dx<0)this.x=tr.x+tr.w+r.w/2;
            if(dy*state.gravity>0){this.y=state.gravity>0?tr.y-r.h/2:tr.y+tr.h+r.h/2;this.vy=0;this.onGround=true;this.jumps=0;}
            if(dy*state.gravity<0){this.y=state.gravity>0?tr.y+tr.h+r.h/2:tr.y-r.h/2;this.vy=0;}
          }
        }
      }
      this.x=clamp(this.x,20,WORLD_W*TILE-20);this.y=clamp(this.y,20,WORLD_H*TILE-20);
    }
  }

  class Boss {
    constructor(){this.x=WORLD_W*TILE*.55;this.y=-120;this.vx=2.2;this.hp=18;this.maxHp=18;this.active=false;this.special=0;}
    update(){
      if(!this.active)return;this.x+=this.vx;if(this.x<80||this.x>WORLD_W*TILE-80)this.vx*=-1;this.y=lerp(this.y,Math.max(120,player.y-250),.01);this.special++;
      if(this.special%55===0)for(let i=0;i<3;i++)projectiles.push({x:this.x,y:this.y+18,vx:(Math.random()*2-1)*4,vy:3+i*.8,t:choice([7,5,4]),owner:null,life:220,r:9});
      if(this.special%180===0)radialDamage(this.x,this.y,6,1,null);
    }
    takeDamage(n,attacker){
      if(!this.active)return;this.hp-=n;spawnParticles(this.x,this.y,[140,220,255],22);play(110,.06,'sawtooth',.018);
      if(this.hp<=0){this.active=false;state.bossTimer=BOSS_DROP_DELAY;this.hp=this.maxHp;this.y=-140;addStatus('GLEEBS DOWN — PLAYERS RESPAWNED');for(const p of players){p.hp=p.maxHp;p.score+=p===attacker?250:75;}}
    }
  }

  function nearestOpponent(me){let best=null,bd=Infinity;for(const p of players)if(p!==me&&!p.dead){const d=Math.hypot(p.x-me.x,p.y-me.y);if(d<bd){bd=d;best=p;}}return best;}
  function radialDamage(x,y,rTiles,damage,owner){const r=rTiles*TILE;for(let ty=Math.floor((y-r)/TILE);ty<=Math.floor((y+r)/TILE);ty++)for(let tx=Math.floor((x-r)/TILE);tx<=Math.floor((x+r)/TILE);tx++)if(Math.hypot((tx+.5)*TILE-x,(ty+.5)*TILE-y)<r)damageTile(tx,ty,damage);for(const p of players)if(p!==owner&&!p.dead&&Math.hypot(p.x-x,p.y-y)<r)p.takeDamage(damage,{x,y});if(boss&&boss.active&&owner&&Math.hypot(boss.x-x,boss.y-y)<r)boss.takeDamage(damage,owner);spawnParticles(x,y,[160,220,255],22);}
  function spawnParticles(x,y,color=[255,255,255],n=8){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()*2-1)*3,vy:(Math.random()*2-1)*3,life:24+Math.random()*18,color});}
  function spawnPowerup(){const kind=weighted(POWERUP_WEIGHTS),x=clamp(state.cam.x-VIEW_W/2+80+Math.random()*(VIEW_W-160),60,WORLD_W*TILE-60);powerups.push({x,y:state.cam.y-VIEW_H/2+40,vy:1.6,kind,dead:false,life:POWERUP_SPECIAL_DURATION+260});}
  function spawnMeteor(){const x=clamp(state.cam.x-VIEW_W/2+40+Math.random()*(VIEW_W-80),40,WORLD_W*TILE-40);meteors.push({x,y:state.cam.y-VIEW_H/2-60,vx:(Math.random()*2-1)*2,vy:8,t:choice([7,5,10]),r:12});}

  function resetGame(){
    createWorld();players=[];projectiles=[];powerShots=[];powerups=[];meteors=[];particles=[];state.status=[];state.frame=0;state.gravity=1;state.powerTimer=POWERUP_DROP_INTERVAL;state.meteorTimer=METEOR_INTERVAL;state.bossTimer=BOSS_DROP_DELAY;
    const spawnX=35*TILE,spawnY=findSurface(spawnX)-34;player=new Actor('PLAYER','blob',[140,220,255],spawnX,spawnY,false);players.push(player);
    ROSTER.forEach((r,i)=>{const x=(50+i*8)*TILE,p=new Actor(r[0],r[2],r[1],x,findSurface(x)-34,true);p.score=(Math.random()*40)|0;players.push(p);});
    boss=new Boss();state.cam.x=player.x;state.cam.y=player.y-80;addStatus('NEON ARENA: GRAVITY FLIP');
  }

  function update(){
    if(state.paused)return;state.frame++;for(const s of state.status)s.life--;state.status=state.status.filter(s=>s.life>0);
    for(const p of players)p.update();
    if(--state.powerTimer<=0){spawnPowerup();state.powerTimer=POWERUP_DROP_INTERVAL;} if(--state.meteorTimer<=0){spawnMeteor();state.meteorTimer=METEOR_INTERVAL;addStatus('METEORITES');}
    if(--state.bossTimer<=0&&!boss.active){boss.active=true;boss.y=state.cam.y-VIEW_H/2-80;addStatus('GLEEBS HAS ENTERED');play(130,.2,'sawtooth',.02);} boss.update();
    for(const o of powerups){o.vy+=.025;o.y+=o.vy;o.life--;if(solidAt(o.x,o.y+10))o.vy=-Math.abs(o.vy)*.15;if(o.life<0)o.dead=true;} powerups=powerups.filter(o=>!o.dead);
    for(const pr of projectiles){pr.x+=pr.vx;pr.y+=pr.vy;pr.vy+=.25*state.gravity;pr.life--;const tx=Math.floor(pr.x/TILE),ty=Math.floor(pr.y/TILE);if(getTile(tx,ty)){damageTile(tx,ty,BLOCK_THROW_DAMAGE[pr.t]||1);pr.life=0;}for(const p of players)if(p!==pr.owner&&!p.dead&&Math.hypot(p.x-pr.x,p.y-pr.y)<20){p.takeDamage(BLOCK_THROW_DAMAGE[pr.t]||1,pr);pr.life=0;if(pr.owner)pr.owner.score+=10;}if(boss.active&&pr.owner&&Math.hypot(boss.x-pr.x,boss.y-pr.y)<38){boss.takeDamage(BLOCK_THROW_DAMAGE[pr.t]||1,pr.owner);pr.life=0;}} projectiles=projectiles.filter(p=>p.life>0&&p.y>-200&&p.y<WORLD_H*TILE+200);
    for(const pr of powerShots){if(pr.target&&!pr.target.dead){const dx=pr.target.x-pr.x,dy=pr.target.y-pr.y,d=Math.hypot(dx,dy)||1;pr.vx=lerp(pr.vx,dx/d*7.5,.16);pr.vy=lerp(pr.vy,dy/d*7.5,.16);}pr.x+=pr.vx;pr.y+=pr.vy;pr.life--;for(const p of players)if(p!==pr.owner&&!p.dead&&Math.hypot(p.x-pr.x,p.y-pr.y)<22){p.takeDamage(POWER_DAMAGE[pr.kind]||1,pr.owner);pr.life=0;if(pr.owner)pr.owner.score+=20;}if(boss.active&&pr.owner&&Math.hypot(boss.x-pr.x,boss.y-pr.y)<42){boss.takeDamage(POWER_DAMAGE[pr.kind]||1,pr.owner);pr.life=0;}} powerShots=powerShots.filter(p=>p.life>0);
    for(const m of meteors){m.x+=m.vx;m.y+=m.vy;m.vy+=.11;const tx=Math.floor(m.x/TILE),ty=Math.floor(m.y/TILE);if(getTile(tx,ty)){radialDamage(m.x,m.y,3,2,null);m.dead=true;}for(const p of players)if(!p.dead&&Math.hypot(p.x-m.x,p.y-m.y)<38){p.takeDamage(2,m);m.dead=true;}} meteors=meteors.filter(m=>!m.dead&&m.y<WORLD_H*TILE+80);
    for(const q of particles){q.x+=q.vx;q.y+=q.vy;q.vy+=.05;q.life--;} particles=particles.filter(q=>q.life>0);
    state.cam.x=lerp(state.cam.x,player.x,.08);state.cam.y=lerp(state.cam.y,player.y-120*state.gravity,.08);state.best=Math.max(state.best,...players.map(p=>p.score));
  }

  function ws(x,y){const s=state.viewScales[state.viewIndex]||.8;return{x:(x-state.cam.x)*s+VIEW_W/2,y:(y-state.cam.y)*s+VIEW_H/2+80,s};}
  function drawBg(){
    const [top,mid,bot]=state.bg,g=ctx.createLinearGradient(0,0,0,VIEW_H);g.addColorStop(0,rgb(top,1));g.addColorStop(.55,rgb(mid,1));g.addColorStop(1,rgb(bot,1));ctx.fillStyle=g;ctx.fillRect(0,0,VIEW_W,VIEW_H);
    for(const st of state.stars){let x=(st.x-state.cam.x*st.parallax)%VIEW_W;if(x<0)x+=VIEW_W;ctx.fillStyle=rgb(st.color,st.a);ctx.fillRect(x,st.y,st.r,st.r);}
    for(let layer=0;layer<3;layer++){ctx.fillStyle=`rgba(${30+layer*25},${55+layer*25},${85+layer*25},${.14+layer*.06})`;ctx.beginPath();ctx.moveTo(0,VIEW_H);for(let x=0;x<=VIEW_W;x+=32){const y=660+layer*62+Math.sin((x+state.cam.x*(.03+layer*.02))*.006+layer)*42+Math.sin(x*.021+layer)*18;ctx.lineTo(x,y);}ctx.lineTo(VIEW_W,VIEW_H);ctx.closePath();ctx.fill();}
    ctx.strokeStyle='rgba(80,255,255,.08)';ctx.lineWidth=1;for(let x=0;x<VIEW_W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,VIEW_H);ctx.stroke();}for(let y=0;y<VIEW_H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(VIEW_W,y);ctx.stroke();}
  }
  function drawWorld(){
    const scale=state.viewScales[state.viewIndex]||.8,startTx=Math.max(0,Math.floor((state.cam.x-VIEW_W/(2*scale))/TILE)-2),endTx=Math.min(WORLD_W-1,Math.floor((state.cam.x+VIEW_W/(2*scale))/TILE)+2),startTy=Math.max(0,Math.floor((state.cam.y-VIEW_H/(2*scale))/TILE)-4),endTy=Math.min(WORLD_H-1,Math.floor((state.cam.y+VIEW_H/(2*scale))/TILE)+4);
    ctx.imageSmoothingEnabled=false;for(let ty=startTy;ty<=endTy;ty++)for(let tx=startTx;tx<=endTx;tx++){const t=getTile(tx,ty);if(!t)continue;const p=ws(tx*TILE,ty*TILE),sz=Math.ceil(TILE*p.s)+1,img=images[`block_${t}`];if(img&&img.complete)ctx.drawImage(img,Math.round(p.x),Math.round(p.y),sz,sz);else{const c=BLOCK_COLORS[t]||[255,255,255,255];ctx.fillStyle=rgb(c,c[3]/255);ctx.fillRect(p.x,p.y,sz,sz);}}
  }
  function drawActor(a){
    if(a.dead>0&&Math.floor(a.dead/5)%2)return;const p=ws(a.x,a.y),frame=Math.floor(state.frame/10)%4,img=images[`player_${a.sprite}_${frame}`]||images[`player_${a.sprite}_0`],w=Math.round(40*p.s*a.sizeMul),h=Math.round(40*p.s*a.sizeMul);
    ctx.save();ctx.translate(p.x,p.y);ctx.scale(a.facing<0?-1:1,state.gravity<0?-1:1);ctx.imageSmoothingEnabled=false;if(a.invuln>0)ctx.globalAlpha=.55;if(img&&img.complete)ctx.drawImage(img,-w/2,-h/2,w,h);else{ctx.fillStyle=rgb(a.color,.95);ctx.fillRect(-w/2,-h/2,w,h);}ctx.restore();
    const labelY=p.y-h*.72;ctx.font=`${Math.max(10,Math.round(12*p.s))}px Consolas, monospace`;ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,.58)';ctx.fillRect(p.x-42*p.s,labelY-13,84*p.s,15);ctx.fillStyle=a.ai?rgb(a.color,.95):'#eff8ff';ctx.fillText(a.name.toUpperCase(),p.x,labelY-2);const hpW=36*p.s;ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(p.x-hpW/2,p.y+h*.52,hpW,4);ctx.fillStyle='#78ff9c';ctx.fillRect(p.x-hpW/2,p.y+h*.52,hpW*(a.hp/a.maxHp),4);
  }
  function drawBoss(){if(!boss||!boss.active)return;const p=ws(boss.x,boss.y),img=images.boss_blob;ctx.save();ctx.translate(p.x,p.y);ctx.imageSmoothingEnabled=false;ctx.shadowColor='rgba(140,220,255,.85)';ctx.shadowBlur=24;const size=82*p.s;if(img&&img.complete)ctx.drawImage(img,-size/2,-size/2,size,size);else{ctx.fillStyle='#8ce6ff';ctx.beginPath();ctx.arc(0,0,size/2,0,Math.PI*2);ctx.fill();}ctx.restore();ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillRect(p.x-80,p.y-70,160,32);ctx.fillStyle='#ffd6ff';ctx.textAlign='center';ctx.font='bold 15px Consolas, monospace';ctx.fillText('GLEEBS',p.x,p.y-50);ctx.fillStyle='rgba(255,255,255,.18)';ctx.fillRect(p.x-64,p.y-43,128,6);ctx.fillStyle='#ff65d8';ctx.fillRect(p.x-64,p.y-43,128*(boss.hp/boss.maxHp),6);}
  function drawObjects(){
    for(const o of powerups){const p=ws(o.x,o.y),c=POWERUP_COLORS[o.kind]||[255,255,255];ctx.fillStyle=rgb(c,.22);ctx.beginPath();ctx.arc(p.x,p.y,22*p.s,0,Math.PI*2);ctx.fill();ctx.fillStyle=rgb(c,.95);ctx.beginPath();ctx.arc(p.x,p.y,8*p.s,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff';ctx.font=`${Math.max(8,10*p.s)}px Consolas`;ctx.textAlign='center';ctx.fillText(o.kind[0].toUpperCase(),p.x,p.y+3);}
    for(const pr of projectiles){const p=ws(pr.x,pr.y),img=images[`block_${pr.t}`],sz=20*p.s;if(img&&img.complete)ctx.drawImage(img,p.x-sz/2,p.y-sz/2,sz,sz);else{ctx.fillStyle='#fff';ctx.fillRect(p.x-sz/2,p.y-sz/2,sz,sz);}}
    for(const pr of powerShots){const p=ws(pr.x,pr.y),c=POWERUP_COLORS[pr.kind]||[160,220,255];ctx.fillStyle=rgb(c,.85);ctx.beginPath();ctx.arc(p.x,p.y,7*p.s,0,Math.PI*2);ctx.fill();ctx.strokeStyle=rgb(c,.25);ctx.beginPath();ctx.arc(p.x,p.y,16*p.s,0,Math.PI*2);ctx.stroke();}
    for(const m of meteors){const p=ws(m.x,m.y);ctx.fillStyle='rgba(255,70,60,.88)';ctx.beginPath();ctx.arc(p.x,p.y,m.r*p.s,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,180,80,.5)';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-m.vx*8*p.s,p.y-m.vy*8*p.s);ctx.stroke();}
    for(const q of particles){const p=ws(q.x,q.y);ctx.fillStyle=rgb(q.color,q.life/42);ctx.fillRect(p.x,p.y,3,3);}
  }
  function drawHUD(){
    ctx.textAlign='left';ctx.fillStyle='rgba(10,15,30,.82)';ctx.fillRect(20,20,440,138);ctx.strokeStyle='rgba(80,255,255,.42)';ctx.strokeRect(20,20,440,138);ctx.fillStyle='#d8f6ff';ctx.font='bold 18px Consolas, monospace';ctx.fillText('NEON ARENA: GRAVITY FLIP',36,48);ctx.font='14px Consolas, monospace';ctx.fillStyle='#b7c8df';ctx.fillText(`SCORE ${Math.floor(player.score)}   BEST ${Math.floor(state.best)}`,36,72);ctx.fillText(`HP ${player.hp}/${player.maxHp}   POWER ${(player.power||'NONE').toUpperCase()}`,36,94);ctx.fillText(`GRAVITY ${state.gravity>0?'NORMAL':'INVERTED'}   VIEW ${state.viewScales[state.viewIndex].toFixed(1)}`,36,116);ctx.fillText(`BOSS ${boss.active?'ACTIVE':'IN '+Math.ceil(state.bossTimer/60)+'s'}`,36,138);let y=174;for(const s of state.status.slice(0,4)){ctx.fillStyle=`rgba(220,235,255,${Math.min(1,s.life/60)})`;ctx.fillText('> '+s.text,36,y);y+=20;}
    const champ=[...players].sort((a,b)=>b.score-a.score)[0];if(champ){ctx.save();ctx.globalAlpha=.58;const img=images[`player_${champ.sprite}_0`];ctx.fillStyle='rgba(10,15,30,.45)';ctx.beginPath();ctx.arc(VIEW_W/2,92,88,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(80,255,255,.3)';ctx.stroke();if(img&&img.complete){ctx.imageSmoothingEnabled=false;ctx.drawImage(img,VIEW_W/2-44,40,88,88);}ctx.fillStyle='#d8f6ff';ctx.font='bold 13px Consolas';ctx.textAlign='center';ctx.fillText('LEADER '+champ.name.toUpperCase(),VIEW_W/2,154);ctx.restore();}
    ctx.fillStyle='rgba(10,15,30,.82)';ctx.fillRect(VIEW_W-395,20,375,state.help?332:170);ctx.strokeStyle='rgba(80,255,255,.32)';ctx.strokeRect(VIEW_W-395,20,375,state.help?332:170);ctx.fillStyle='#d8f6ff';ctx.font='bold 16px Consolas';ctx.fillText('LEADERBOARD',VIEW_W-375,48);ctx.font='12px Consolas';[...players].sort((a,b)=>b.score-a.score).slice(0,8).forEach((p,i)=>{ctx.fillStyle=p===player?'#ffffff':rgb(p.color,.9);ctx.fillText(`${String(i+1).padStart(2,' ')}. ${p.name.padEnd(10,' ')} ${String(Math.floor(p.score)).padStart(4,' ')}`,VIEW_W-375,74+i*18);});
    if(state.help){const lines=['CONTROLS','A/D: MOVE     W/SPACE: JUMP','SHIFT: DASH   F: ATTACK','E: CAST POWER Q: THROW BLOCK','G: FLIP GRAVITY   Z: VIEW','H: TOGGLE HELP   P: PAUSE','R: RESET       M: MUTE'];let yy=234;ctx.font='12px Consolas';for(const line of lines){ctx.fillStyle=line==='CONTROLS'?'#e8f8ff':'#b7c8df';ctx.fillText(line,VIEW_W-375,yy);yy+=18;}}
    if(state.paused){ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(0,0,VIEW_W,VIEW_H);ctx.fillStyle='#fff';ctx.font='bold 54px Consolas';ctx.textAlign='center';ctx.fillText('PAUSED',VIEW_W/2,VIEW_H/2);}
  }
  function render(){
    resizeCanvas(); update(); ctx.clearRect(0,0,VIEW_W,VIEW_H); drawBg(); drawWorld(); drawObjects(); players.forEach(drawActor); drawBoss(); drawHUD();
    outCtx.imageSmoothingEnabled=false; outCtx.clearRect(0,0,canvas.width,canvas.height); outCtx.drawImage(buffer,0,0,canvas.width,canvas.height);
    requestAnimationFrame(render);
  }
  function resizeCanvas(){const b=canvas.getBoundingClientRect(),r=Math.min(2,window.devicePixelRatio||1),w=Math.max(640,Math.floor(b.width*r)),h=Math.max(360,Math.floor(w*9/16));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
  function bindKeys(){
    window.addEventListener('keydown',e=>{const k=e.key===' '?' ':e.key.toLowerCase();state.keys[k]=true;if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k)&&document.activeElement===canvas)e.preventDefault();if(k==='p'&&!state.pauseLatch){state.paused=!state.paused;state.pauseLatch=true;}if(k==='m'&&!state.muteLatch){toggleMute();state.muteLatch=true;}if(k==='r'&&!state.resetLatch){resetGame();state.resetLatch=true;}if(k==='h'&&!state.helpLatch){state.help=!state.help;state.helpLatch=true;}if(k==='z'&&!state.viewLatch){state.viewIndex=(state.viewIndex+1)%state.viewScales.length;state.viewLatch=true;}if(k==='g'&&!state.gravLatch){state.gravity*=-1;state.gravLatch=true;addStatus(state.gravity<0?'GRAVITY INVERTED':'GRAVITY NORMAL');play(420,.09,'triangle',.018);}});
    window.addEventListener('keyup',e=>{const k=e.key===' '?' ':e.key.toLowerCase();state.keys[k]=false;if(k==='p')state.pauseLatch=false;if(k==='m')state.muteLatch=false;if(k==='r')state.resetLatch=false;if(k==='h')state.helpLatch=false;if(k==='z')state.viewLatch=false;if(k==='g')state.gravLatch=false;});
  }
  function boot(){
    canvas=$('demoCanvas'); if(!canvas)return; outCtx=canvas.getContext('2d'); buffer=document.createElement('canvas');buffer.width=VIEW_W;buffer.height=VIEW_H;ctx=buffer.getContext('2d');ctx.imageSmoothingEnabled=false;
    document.body.classList.add('demo-runtime-ready','single-demo-runtime','block-busters-original-port');
    const oldBtn=document.querySelector('.demo-head .btn[href*="demo_manifest"]'); if(oldBtn)oldBtn.remove(); const grid=$('demoGalleryGrid'); if(grid)grid.remove(); const overlay=$('demoLoadingOverlay'); if(overlay)overlay.hidden=true;
    const head=document.querySelector('.demo-head'); if(head&&!$('demoMuteBtn')){const b=document.createElement('button');b.id='demoMuteBtn';b.className='btn btn-secondary demo-audio-button';b.type='button';b.textContent='Mute Audio';b.onclick=toggleMute;head.appendChild(b);}
    text('demoSectionTitle','Block Busters — Original Web Arena'); text('demoSectionIntro','A browser conversion rebuilt from the original Block Busters constants, sprites, roster, powerups, boss rules, controls, and Neon Arena: Gravity Flip presentation.'); text('demoStatus','Playable now'); text('demoTitle','Block Busters');
    text('demoSummary','Original-style chunked block world, HoloVerse bot roster, Gleebs boss drop, powerups, thrown blocks, gravity flip, meteors, HUD, help panel, and leaderboard.'); text('demoObjective','Break blocks, collect powerups, survive Gleebs, and outscore the bot roster.'); text('demoControls','A/D move, W/Space jump, Shift dash, F attack, E cast power, Q throw block, G flip gravity, Z view, H help, P pause, R reset, M mute.'); text('demoDetails','Converted for GitHub Pages as a JavaScript canvas game using embedded original Block Busters pixel sprites. Audio is low-volume and can be muted.'); text('demoSectionNote','Single-game live pass: Block Busters now uses original prototype rules and sprite art instead of generic placeholder demos.');
    const tags=$('demoTags'); if(tags){tags.innerHTML='';['Original sprites','Gleebs boss','12 bot roster','Powerups','Gravity flip'].forEach(t=>{const s=document.createElement('span');s.textContent=t;tags.appendChild(s);});}
    try{for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key&&key.startsWith('glitched-prototype-site-config-'))localStorage.removeItem(key);}}catch{}
    state.stars=Array.from({length:140},()=>({x:Math.random()*VIEW_W,y:Math.random()*VIEW_H,r:choice([1,1,2]),color:choice(GLOW),a:.35+Math.random()*.55,parallax:.02+Math.random()*.08}));
    bindKeys(); resetGame(); canvas.addEventListener('pointerdown',()=>{try{state.audio ||= new (window.AudioContext||window.webkitAudioContext)(); state.audio.resume&&state.audio.resume();}catch{} canvas.focus({preventScroll:true});}); window.addEventListener('resize',resizeCanvas);
    setTimeout(()=>{if(typeof config!=='undefined'){fetch('./assets/data/site_patch_notes_current.txt?v='+VERSION,{cache:'no-store'}).then(r=>r.ok?r.text():'').then(t=>{if(t){config.updatesRaw=t.trim();config.updatesNote='Newest live-site notes first, followed by HoloVerse route updates and Prototype Lab inventory highlights.';if(typeof applyConfig==='function')applyConfig();}}).catch(()=>{});}},700);
    requestAnimationFrame(render);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
