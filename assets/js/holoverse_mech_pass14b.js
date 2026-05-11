(()=>{
'use strict';
const LIVE_SCRIPT='./assets/js/holoverse_dashboard_pass35.js?v=20260511-pass40-updates-clean';
const STYLE_ID='vector-wars-loader-pass40-style';
const publicUpdates=[
  {group:'Vector Wars',title:'Urban Arena Preview',meta:'2026-05-11',bullets:[
    'Vector Wars is now the main public preview: Sable’s Urban arena with capture posts, cover lanes, drones, mechs, and machine pressure.',
    'The old ring/bullseye dashboard has been removed from the Vector Wars slot.',
    'Next direction is turning this preview into a lightweight playable browser slice.'
  ]},
  {group:'HoloVerse',title:'World Shell',meta:'2026-05-11',bullets:[
    'HoloVerse remains the visible world around the games and regions.',
    'The site now keeps the action hook in front while using HoloVerse as the larger setting.',
    'Region identity and bot-owned activities remain the main long-term structure.'
  ]},
  {group:'HoloCore',title:'Hidden Mind',meta:'2026-05-11',bullets:[
    'HoloCore is framed as the mind beneath HoloVerse, not as a normal arcade mode.',
    'It should feel like something observing, timing, and unlocking deeper systems.',
    'The public site keeps it mysterious while Vector Wars carries the visible gameplay preview.'
  ]}
];
const publicCopy={roadmap:[
  'Turn Vector Wars from animated preview into a playable browser combat slice.',
  'Add movement, fire, capture-post pressure, drone waves, and score readouts.',
  'Keep HoloCore mysterious as the hidden mind beneath HoloVerse.',
  'Use HoloVerse as the world shell for region identity, bots, and future activities.'
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
function updates(){const h=document.getElementById('updatesList');if(!h)return;h.innerHTML='';publicUpdates.forEach(e=>{const a=document.createElement('article');a.className='update-card public-update-card';a.innerHTML=`<span class="update-group">${e.group}</span><h3 class="update-heading">${e.title}</h3><div class="update-meta">${e.meta}</div><ul class="update-bullets">${e.bullets.map(b=>`<li>${b}</li>`).join('')}</ul>`;h.appendChild(a)});h.dataset.publicUpdatesVersion='pass40'}
function copy(){
  const meta=document.querySelector('meta[name="description"]');
  if(meta)meta.content='A dark connected arcade where HoloVerse, Vector Wars, HoloCore, Gleebs, playable prototypes, bots, creator tools, and mod-friendly experiments keep evolving inside one digital lab.';
  document.querySelectorAll('.nav a[href="#demos"], .footer-links a[href="#demos"]').forEach(a=>a.textContent='Vector Wars');
  setKey('heroEyebrow','> HoloVerse + Vector Wars <');
  setKey('heroLead','Explore HoloVerse, a living digital world built from recovered systems, prototype games, hidden archives, and the strange mind beneath it all: HoloCore.');
  setKey('stat3Value','HoloVerse + Vector Wars');
  setKey('aboutTitle','A connected digital world with something watching underneath');
  setKey('aboutBody1','GLITCHED MATRIX Prototype Lab is a dark sci-fi hub where HoloVerse, Vector Wars, bots, standalone prototypes, and creation tools all live inside one evolving system.');
  setKey('aboutBody2','The current build focuses on turning separate experiments into connected places: a walkable HoloVerse, in-world region runtimes, site-replaceable media, and stronger playable previews.');
  setKey('fictionLabel','HoloCore');
  setKey('fictionTitle','The hidden mind beneath HoloVerse');
  setKey('fictionBody1','HoloCore is not simply another place to enter. It is the buried intelligence under HoloVerse: watching, remembering, and deciding when deeper systems should surface.');
  setKey('fictionBody2','Gleebs, IO, Sable, Archivist, and the other region bots guide players through fragments of the digital wreckage while HoloCore remains mostly unseen. Some regions are built. Some are recovered. Some only appear when HoloCore allows it.');
  setKey('roadmapLabel','Future');setKey('roadmapTitle','Where the lab is going');setKey('directionLabel','Now');setKey('directionTitle','What the current release is about');
  setKey('directionBody1','GLITCHED MATRIX Prototype Lab is a dark sci-fi collection of connected experiments: HoloVerse, Vector Wars, HoloCore, Gleebs, bots, playable prototypes, and creation tools inside one evolving lab.');
  setKey('directionBody2','The current public focus is clarity: stronger presentation, cleaner information, a clearer playable hook, and mystery around the hidden system beneath HoloVerse.');
  setKey('updatesLabel','Updates');setKey('updatesTitle','Public Update Notes');setKey('updatesNote','Player-facing progress, world direction, Vector Wars, HoloCore mystery, and major Prototype Lab updates.');
  setText('demoSectionTitle','Vector Wars — Urban Arena Preview');setText('demoSectionIntro','A direct Urban Vector Wars preview: posts, cover lanes, Sable, drones, mechs, and machine pressure inside HoloVerse.');
  setText('demoSectionNote','Site pass 40: cleaned the public update notes layout and kept the Vector Wars arena framing locked in.');
  setText('demoObjective','Preview Sable’s Urban Vector Wars arena.');setText('demoControls','Preview only for now. Future pass: move, fire, capture posts, survive waves.');setText('demoDetails','This browser preview represents Vector Wars directly instead of showing the HoloVerse ring map.');
  list('roadmapList',publicCopy.roadmap);updates();
  const secondary=document.getElementById('secondaryCta');if(secondary){secondary.textContent='Vector Wars Preview';secondary.href='#demos'}
}
function loadScript(src){if(document.querySelector('script[data-holoverse-pass35-loader="true"]'))return;const s=document.createElement('script');s.src=src;s.async=false;s.dataset.holoversePass35Loader='true';document.head.appendChild(s)}
function mount(){installLayoutStyle();promoteDemo();copy();[120,480,1200,2600,5200,9000].forEach(t=>setTimeout(copy,t));loadScript(LIVE_SCRIPT)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();