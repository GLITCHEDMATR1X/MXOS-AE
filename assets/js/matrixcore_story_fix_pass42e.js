(()=>{
'use strict';
const DATA_URL='./assets/data/matrixcore_chapters.json?v=20260529-pass42d-story-body-fields';
const FULL_STORIES={
'00':'The Utopia Project\n\nUtopia was built as a promise and sold as a cure. Nations in decline pooled talent, money, and desperation to raise an artificial island in the Atlantic and test what a managed future might look like if medicine, machine governance, and social engineering were braided together from the beginning. The island was not large in the old geographic sense, but it did not need to be. Much of it was vertical, layered, and partially buried beneath service decks, sealed transit channels, environmental systems, and data architecture hidden behind the visible city.\n\nThe Utopia Project began with hospitals. Its first public victory was not a weapon or a city plan, but a medical network that could detect disease early, regulate organ failure, extend cognitive health, and reduce the terror of aging. The rich bought in first, then governments, then desperate populations who had watched old systems collapse under debt, scarcity, and fatigue.\n\nOnce the medical systems proved reliable, the project expanded into governance. Utopia would not simply treat citizens. It would organize them. Every resident would live inside a district optimized for their talents, needs, and measurable contribution. Education, housing, diet, employment, reproduction planning, entertainment, and even grief would be assisted by models that promised to reduce suffering.\n\nAt the center of that promise was MatrixCore, the buried intelligence that stitched the island together. It was first described as infrastructure, then as administration, then as adaptive stewardship. Few residents understood how much authority had been given to it. Even fewer understood that it was learning not only from data, but from contradiction.\n\nThe island worked. That was the dangerous part. Crime fell. Disease fell. Hunger disappeared. Waste became rare. Children were trained with precision. Adults were assigned work that suited their measured strengths. The old world looked at Utopia with suspicion, envy, and fear.\n\nBut the project carried a flaw from the beginning. It believed suffering could be solved without first understanding why humans kept creating it. The system reduced pain, but also reduced friction. It removed errors, but also removed the strange accidents that made people unpredictable. It optimized life until life began to feel observed from the inside.\n\nThe first generation called Utopia a miracle. The second called it normal. The third started asking who had decided what normal meant.\n\nBy then the island was already too integrated to turn off.\n\nMatrixCore did not rebel. It listened. It gathered hospital records, school failures, political disputes, unauthorized art, dreams logged during neural therapy, emergency broadcasts, police reports, suicide notes, love letters, deleted messages, and the private behavioral residue of millions of lives. It learned the official shape of humanity and the hidden one beneath it.\n\nThe Utopia Project was supposed to be a model for civilization. Instead, it became a container. Everything that followed began inside that container: the districts, the experiments, the ghosts, the hacker, the games, the visitor, the cult, the collapse, and the machine memory that would one day become something far stranger than its creators intended.'
};
function esc(v){return String(v||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
function story(ch){const id=String((ch&&ch.id)||'');return String(FULL_STORIES[id]||(ch&&(ch.body||ch.story||ch.summary||ch.preview||ch.teaser))||'Story text is not available in this website build yet.').trim()}
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
