(()=>{
'use strict';
const LIVE_SCRIPT='./assets/js/holomap_rts_pass43.js?v=20260529-pass43-holomap-rts';
const STYLE_ID='holomap-rts-loader-pass43-style';
const publicUpdates=[
  {group:'HoloMap',title:'Playable RTS Command Slice',meta:'2026-05-29',bullets:[
    'The website preview is shifting from a passive Vector Wars poster into a small tactical HoloMap slice.',
    'Visitors can command Sable and support bots, hold capture posts, and resist drone/mech pressure around HoloCore.',
    'The full Panda3D build remains the main game; the browser slice is a lightweight interactive teaser.'
  ]},
  {group:'HoloVerse',title:'World Shell',meta:'2026-05-29',bullets:[
    'HoloVerse remains the larger connected world around the public preview, regions, bots, and prototype realities.',
    'The HoloMap view gives the site a clearer command-layer identity without touching the full game routing.',
    'Region identity and bot-owned activities remain the long-term structure.'
  ]},
  {group:'HoloCore',title:'Hidden Mind',meta:'2026-05-29',bullets:[
    'HoloCore is framed as the buried intelligence beneath HoloVerse, monitoring stability and machine pressure.',
    'The HoloMap slice shows HoloCore as a tactical signal layer rather than a normal arcade mode.',
    'Future passes can add stronger event chains, audio pulses, and more readable win/loss presentation.'
  ]}
];
const publicCopy={roadmap:[
  'Keep the website preview lightweight, interactive, and safe to load in a browser.',
  'Build the HoloMap slice around command decisions: select units, capture posts, survive waves.',
  'Keep the full shooter/RTS depth inside the Panda3D Steam build instead of rebuilding it all on the site.',
  'Use HoloCore as the hidden stability system beneath the HoloVerse command layer.'
]};
function installLayoutStyle(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;
  s.textContent='body.vector-wars-site .stats-grid.below-featured-demo{display:none!important}.single-holoverse-section.demo-featured-top{overflow:hidden!important}.updates-panel{width:100%!important;max-height:none!important;overflow:visible!important}.updates-list{display:grid!important;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr))!important;gap:16px!important;overflow:visible!important;max-height:none!important}.update-card{min-width:0!important;max-width:100%!important;height:auto!important;max-height:360px!important;overflow:auto!important}.update-bullets{display:grid!important;gap:8px!important}.update-bullets li{line-height:1.45!important;white-space:normal!important;overflow-wrap:anywhere!important}';
  document.head.appendChild(s)
}
function promoteDemo(){const hero=document.querySelector('.hero'),demo=document.getElementById('demos'),stats=document.querySelector('.stats-grid');if(!hero||!demo)return;if(hero.nextElementSibling!==demo)hero.insertAdjacentElement('afterend',demo);demo.classList.add('demo-featured-top');document.body.classList.add('vector-wars-site','holoverse-demo-featured-top');if(stats)stats.classList.add('below-featured-demo')}
function setKey(k,v){document.querySelectorAll(`.editable[data-key="${k}"]`).forEach(e=>e.textContent=v)}
function setText(id,v){const e=document.getElementById(id);if(e)e.textContent=v}
function list(id,items){const h=document.getElementById(id);if(!h)return;h.innerHTML='';items.forEach(t=>{const li=document.createElement('li');li.textContent=t;h.appendChild(li)})}
function updates(){const h=document.getElementById('updatesList');if(!h)return;h.innerHTML='';publicUpdates.forEach(e=>{const a=document.createElement('article');a.className='update-card public-update-card';a.innerHTML=`<span class="update-group">${e.group}</span><h3 class="update-heading">${e.title}</h3><div class="update-meta">${e.meta}</div><ul class="update-bullets">${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul>`;h.appendChild(a)});h.dataset.publicUpdatesVersion='pass43'}
function copy(){
  const meta=document.querySelector('meta[name="description"]');
  if(meta)meta.content='A dark connected arcade where HoloVerse, HoloMap, Vector Wars, HoloCore, Gleebs, playable prototypes, bots, creator tools, and mod-friendly experiments keep evolving inside one digital lab.';
  document.querySelectorAll('.nav a[href="#demos"], .footer-links a[href="#demos"]').forEach(a=>a.textContent='HoloMap RTS');
  setKey('heroEyebrow','> HoloVerse + HoloMap RTS <');
  setKey('heroLead','Explore HoloVerse, a living digital world built from recovered systems, tactical command layers, prototype games, hidden archives, and the strange mind beneath it all: HoloCore.');
  setKey('stat3Value','HoloVerse + HoloMap RTS');
  setKey('aboutTitle','A connected digital world with something watching underneath');
  setKey('aboutBody1','GLITCHED MATRIX Prototype Lab is a dark sci-fi hub where HoloVerse, HoloMap command layers, Vector Wars, bots, standalone prototypes, and creation tools all live inside one evolving system.');
  setKey('aboutBody2','The current build focuses on turning separate experiments into connected places: a walkable HoloVerse, in-world region runtimes, site-replaceable media, and stronger playable previews.');
  setKey('fictionLabel','HoloCore');
  setKey('fictionTitle','The hidden mind beneath HoloVerse');
  setKey('fictionBody1','HoloCore is not simply another place to enter. It is the buried intelligence under HoloVerse: watching, remembering, and deciding when deeper systems should surface.');
  setKey('fictionBody2','Gleebs, IO, Sable, Archivist, and the other region bots guide players through fragments of the digital wreckage while HoloCore remains mostly unseen. Some regions are built. Some are recovered. Some only appear when HoloCore allows it.');
  setKey('roadmapLabel','Future');setKey('roadmapTitle','Where the lab is going');setKey('directionLabel','Now');setKey('directionTitle','What the current release is about');
  setKey('directionBody1','GLITCHED MATRIX Prototype Lab is a dark sci-fi collection of connected experiments: HoloVerse, HoloMap, Vector Wars, HoloCore, Gleebs, bots, playable prototypes, and creation tools inside one evolving lab.');
  setKey('directionBody2','The current public focus is clarity: stronger presentation, cleaner information, a clearer playable hook, and mystery around the hidden system beneath HoloVerse.');
  setKey('updatesLabel','Updates');setKey('updatesTitle','Public Update Notes');setKey('updatesNote','Player-facing progress, world direction, HoloMap RTS, Vector Wars, HoloCore mystery, and major Prototype Lab updates.');
  setText('demoSectionTitle','HoloMap RTS — Sable Command Slice');setText('demoSectionIntro','A lightweight tactical HoloMap: command Sable and support bots, hold capture posts, and resist machine waves around HoloCore.');
  setText('demoSectionNote','Site pass 43: replaced the passive arena poster with a small playable HoloMap RTS slice.');
  setText('demoObjective','Hold posts and keep HoloCore stability above zero.');setText('demoControls','Click a friendly unit, then click a map node. Press 1/2/3 to select Sable/Scout/Support. Press R to restart.');setText('demoDetails','This browser preview is a small tactical slice inspired by the older HoloMap idea; the full game remains in Panda3D.');
  list('roadmapList',publicCopy.roadmap);updates();
  const secondary=document.getElementById('secondaryCta');if(secondary){secondary.textContent='HoloMap RTS Preview';secondary.href='#demos'}
}
function loadScript(src){if(document.querySelector('script[data-holoverse-pass35-loader="true"]'))return;const s=document.createElement('script');s.src=src;s.async=false;s.dataset.holoversePass35Loader='true';document.head.appendChild(s)}
function mount(){installLayoutStyle();promoteDemo();copy();[120,480,1200,2600,5200,9000].forEach(t=>setTimeout(copy,t));loadScript(LIVE_SCRIPT)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
