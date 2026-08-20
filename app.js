const STORAGE_KEY = 'wondr-demo-v01';

const seed = {
  topics: [
    {
      id: crypto.randomUUID(),
      title: 'Linux Kernel',
      note: 'Kernel, donanım ile kullanıcı alanı arasındaki temel yönetim katmanıdır. Bugün kernel space ve user space ayrımını çalıştım.',
      createdAt: Date.now() - 1000 * 60 * 60 * 28,
      updatedAt: Date.now() - 1000 * 60 * 45
    },
    {
      id: crypto.randomUUID(),
      title: 'Atom Altı Parçacıklar',
      note: 'Proton ve nötronların quarklardan oluştuğunu not ettim. Quark türlerini ayrıca öğrenmek istiyorum.',
      createdAt: Date.now() - 1000 * 60 * 60 * 20,
      updatedAt: Date.now() - 1000 * 60 * 60 * 3
    }
  ],
  learnQueue: []
};
seed.learnQueue.push({
  id: crypto.randomUUID(),
  title: 'Instruction Set Architecture',
  parentTopicId: seed.topics[0].id,
  createdAt: Date.now() - 1000 * 60 * 20
});

let state = load();
let currentView = 'home';
let currentTopicId = null;

const app = document.getElementById('app');
const topicDialog = document.getElementById('topicDialog');
const learnDialog = document.getElementById('learnDialog');
const newTopicBtn = document.getElementById('newTopicBtn');

function load(){
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : seed;
  } catch { return seed; }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function esc(s=''){return s.replace(/[&<>'\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[m]));}
function relativeTime(ts){
  const mins=Math.max(1,Math.round((Date.now()-ts)/60000));
  if(mins<60) return `${mins} dk önce`;
  const h=Math.round(mins/60); if(h<24) return `${h} sa önce`;
  const d=Math.round(h/24); return `${d} gün önce`;
}
function setView(view){
  currentView=view; currentTopicId=null;
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  render();
}

document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
newTopicBtn.addEventListener('click',()=>{document.getElementById('topicTitle').value='';document.getElementById('topicNote').value='';topicDialog.showModal();});

document.getElementById('saveTopicBtn').addEventListener('click',(e)=>{
  e.preventDefault();
  const title=document.getElementById('topicTitle').value.trim();
  if(!title) return;
  const note=document.getElementById('topicNote').value.trim();
  state.topics.unshift({id:crypto.randomUUID(),title,note,createdAt:Date.now(),updatedAt:Date.now()});
  save(); topicDialog.close(); setView('topics');
});

document.getElementById('saveLearnBtn').addEventListener('click',(e)=>{
  e.preventDefault();
  const title=document.getElementById('learnTitle').value.trim();
  const parentTopicId=document.getElementById('learnParent').value || null;
  if(!title) return;
  state.learnQueue.unshift({id:crypto.randomUUID(),title,parentTopicId,createdAt:Date.now()});
  save(); learnDialog.close(); setView('queue');
});

function openLearnDialog(parentTopicId=''){
  const select=document.getElementById('learnParent');
  select.innerHTML='<option value="">Bağlantısız</option>'+state.topics.map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join('');
  select.value=parentTopicId || '';
  document.getElementById('learnTitle').value='';
  learnDialog.showModal();
}

function openTopic(id){currentTopicId=id;renderTopic(id);}

function homeView(){
  const recent=[...state.topics].sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,2);
  return `
    <section class="hero">
      <div class="meta">BUGÜN</div>
      <h1>Bunun nasıl çalıştığını merak ediyorum.</h1>
      <p>Araştırmanı sen yap. Öğrendiğini buraya bırak. Nerede kaldığını ve sırada ne olduğunu wondR hatırlasın.</p>
      <button class="primary" onclick="document.getElementById('newTopicBtn').click()">+ Öğrenme konusu aç</button>
    </section>

    <div class="section-title"><h2>Devam et</h2><span class="meta">${state.topics.length} konu</span></div>
    <div class="grid">
      ${recent.map(t=>topicCard(t)).join('') || '<div class="empty">Henüz konu yok.</div>'}
    </div>

    <div class="section-title"><h2>Öğren listesi</h2><button class="small-btn accent" onclick="openLearnDialog()">+ Ekle</button></div>
    <section class="card">
      ${state.learnQueue.slice(0,4).map(q=>queueRow(q)).join('') || '<div class="meta">Sonra öğrenmek istediğin kavramlar burada birikir.</div>'}
    </section>`;
}

function topicCard(t){
  return `<article class="card">
    <h3>${esc(t.title)}</h3>
    <div class="meta">Son güncelleme: ${relativeTime(t.updatedAt)}</div>
    <div class="note-preview">${esc((t.note||'Henüz not yok.').slice(0,180))}</div>
    <div class="card-actions">
      <button class="small-btn" onclick="openTopic('${t.id}')">Aç</button>
      <button class="small-btn accent" onclick="openLearnDialog('${t.id}')">+ Öğren</button>
    </div>
  </article>`;
}

function queueRow(q){
  const parent=state.topics.find(t=>t.id===q.parentTopicId);
  return `<div class="queue-item">
    <div><div class="queue-title">${esc(q.title)}</div><div class="meta">${parent?`${esc(parent.title)} içinde karşılaştın`:'Bağlantısız'} · ${relativeTime(q.createdAt)}</div></div>
    <button class="small-btn" onclick="startLearning('${q.id}')">Başla</button>
  </div>`;
}

function topicsView(){
  return `<div class="section-title"><h2>Tüm konular</h2><span class="meta">${state.topics.length} kayıt</span></div>
  <div class="grid">${state.topics.map(topicCard).join('') || '<div class="empty">İlk konunu ekle.</div>'}</div>`;
}

function queueView(){
  return `<div class="section-title"><h2>Öğren</h2><button class="small-btn accent" onclick="openLearnDialog()">+ Yeni kavram</button></div>
  <section class="card">${state.learnQueue.map(queueRow).join('') || '<div class="empty">Öğrenmek için işaretlediğin kavram yok.</div>'}</section>`;
}

function startLearning(queueId){
  const q=state.learnQueue.find(x=>x.id===queueId); if(!q) return;
  const existing=state.topics.find(t=>t.title.toLowerCase()===q.title.toLowerCase());
  if(existing){openTopic(existing.id);return;}
  const topic={id:crypto.randomUUID(),title:q.title,note:'',createdAt:Date.now(),updatedAt:Date.now()};
  state.topics.unshift(topic);
  state.learnQueue=state.learnQueue.filter(x=>x.id!==queueId);
  save(); openTopic(topic.id);
}

function renderTopic(id){
  const t=state.topics.find(x=>x.id===id); if(!t){setView('topics');return;}
  app.innerHTML=`<section class="topic-page">
    <div class="topic-head">
      <div><div class="meta">ÖĞRENME KONUSU</div><h1>${esc(t.title)}</h1><div class="meta">Son güncelleme: ${relativeTime(t.updatedAt)}</div></div>
      <button class="small-btn" onclick="setView('topics')">← Geri</button>
    </div>

    <section class="card">
      <h3>Notlarım</h3>
      <textarea id="noteEditor" class="note-editor" placeholder="Araştırırken öğrendiklerini buraya yaz...">${esc(t.note||'')}</textarea>
      <div class="card-actions"><button class="primary" onclick="saveNote('${t.id}')">Notu kaydet</button><button class="small-btn accent" onclick="openLearnDialog('${t.id}')">+ Bu konudan bir şeyi “Öğren”</button></div>
    </section>

    <section class="card">
      <h3>Bu konudan doğan öğrenmeler</h3>
      ${state.learnQueue.filter(q=>q.parentTopicId===t.id).map(queueRow).join('') || '<div class="meta">Henüz işaretlenmiş kavram yok.</div>'}
    </section>
  </section>`;
}

function saveNote(id){
  const t=state.topics.find(x=>x.id===id); if(!t) return;
  t.note=document.getElementById('noteEditor').value;
  t.updatedAt=Date.now(); save(); renderTopic(id);
}

function mapView(){
  const topics=state.topics.slice(0,8);
  const nodes=[]; const lines=[];
  const cx=410,cy=240,rad=155;
  topics.forEach((t,i)=>{
    const a=(Math.PI*2*i/Math.max(topics.length,1))-Math.PI/2;
    nodes.push({id:t.id,title:t.title,x:cx+Math.cos(a)*rad,y:cy+Math.sin(a)*rad,learn:false});
  });
  state.learnQueue.slice(0,12).forEach((q,i)=>{
    const parent=nodes.find(n=>n.id===q.parentTopicId);
    const x=parent?parent.x+70+((i%2)*22):80+(i%4)*170;
    const y=parent?parent.y+35+((i%3)*24):390+Math.floor(i/4)*40;
    const node={id:q.id,title:q.title,x,y,learn:true}; nodes.push(node);
    if(parent) lines.push([parent,node]);
  });
  if(nodes.length>1){for(let i=1;i<Math.min(topics.length,5);i++)lines.push([nodes[0],nodes[i]]);}
  return `<div class="section-title"><h2>Bilgi Haritam</h2><span class="meta">Beyaz: çalıştığın · Yeşil: öğren listesi</span></div>
  <div class="map-wrap"><svg viewBox="0 0 820 520" role="img" aria-label="Bilgi haritası">
    ${lines.map(([a,b])=>`<line class="map-line" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" />`).join('')}
    ${nodes.map(n=>`<g><circle class="map-node ${n.learn?'learn':''}" cx="${n.x}" cy="${n.y}" r="${n.learn?8:11}"/><text class="map-label" x="${n.x+14}" y="${n.y+5}">${esc(n.title.slice(0,28))}</text></g>`).join('')}
  </svg></div>`;
}

function render(){
  if(currentTopicId){renderTopic(currentTopicId);return;}
  if(currentView==='home') app.innerHTML=homeView();
  if(currentView==='topics') app.innerHTML=topicsView();
  if(currentView==='queue') app.innerHTML=queueView();
  if(currentView==='map') app.innerHTML=mapView();
}

window.openTopic=openTopic;
window.openLearnDialog=openLearnDialog;
window.startLearning=startLearning;
window.saveNote=saveNote;
window.setView=setView;

render();
