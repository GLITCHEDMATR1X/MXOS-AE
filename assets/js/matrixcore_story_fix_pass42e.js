(()=>{
'use strict';
const DATA_URL='./assets/data/matrixcore_chapters.json?v=20260529-pass42d-story-body-fields';
function esc(v){return String(v||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function story(ch){return String((ch&&(ch.body||ch.story||ch.summary||ch.preview||ch.teaser))||'Story text is not available in this website build yet.').trim()}
async function boot(){
  const host=document.getElementById('matrixcoreChapterList');
  const panel=document.getElementById('matrixcoreReaderPanel');
  if(!host||!panel)return;
  const res=await fetch(DATA_URL,{cache:'no-store'});
  if(!res.ok)return;
  const data=await res.json();
  const chapters=Array.isArray(data.chapters)?data.chapters:[];
  if(!chapters.length)return;
  function render(ch){
    panel.innerHTML=`<div class="matrixcore-reader-meta">Chapter ${esc(ch.id||'')}</div><h3>${esc(ch.title||'Untitled')}</h3><div class="matrixcore-reader-body">${esc(story(ch))}</div>`;
    host.querySelectorAll('.matrixcore-chapter-button').forEach(b=>b.classList.toggle('active',b.dataset.chapterId===String(ch.id)));
  }
  function list(items){
    host.innerHTML='';
    items.forEach(ch=>{const b=document.createElement('button');b.type='button';b.className='matrixcore-chapter-button';b.dataset.chapterId=String(ch.id);b.innerHTML=`<strong>${esc(ch.id)} — ${esc(ch.title)}</strong>`;b.addEventListener('click',()=>render(ch));host.appendChild(b)});
  }
  list(chapters);render(chapters[0]);
  const search=document.getElementById('matrixcoreSearch');
  if(search&&!search.dataset.storyFixPass42e){search.dataset.storyFixPass42e='1';search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();const found=chapters.filter(ch=>`${ch.id} ${ch.title} ${story(ch)}`.toLowerCase().includes(q));list(found);if(found[0])render(found[0])})}
}
function schedule(){[250,900,1800,3600].forEach(t=>setTimeout(()=>boot().catch(()=>{}),t))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule,{once:true});else schedule();
})();
