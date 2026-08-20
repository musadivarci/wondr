const STORAGE_KEY = 'wondr-demo-v01';

const seed = {
  topics: [
    {
      id: crypto.randomUUID(),
      title: 'Linux Kernel',
      note: 'Kernel, donanım ile kullanıcı alanı arasındaki temel yönetim katmanıdır. Bugün kernel space ve user space ayrımını çalıştım.',
      createdAt: Date.now() - 1000 * 60 * 60 * 28,
      updatedAt: Date.now() - 1000 * 60 * 45,
      relation: { type: 'none', topicId: null }
    },
    {
      id: crypto.randomUUID(),
      title: 'Atom Altı Parçacıklar',
      note: 'Proton ve nötronların quarklardan oluştuğunu not ettim. Quark türlerini ayrıca öğrenmek istiyorum.',
      createdAt: Date.now() - 1000 * 60 * 60 * 20,
      updatedAt: Date.now() - 1000 * 60 * 60 * 3,
      relation: { type: 'none', topicId: null }
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
state.topics = (state.topics || []).map(t => ({...t, relation: t.relation || {type:'none', topicId:null}}));
state.learnQueue = state.learnQueue || [];
save();

let currentView = 'home';
let currentTopicId = null;
let currentTopicMode = 'view';

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
function esc(s=''){return String(s).replace(/[&<>'\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','\"':'&quot;'}[m]));}
function relativeTime(ts){
  const mins=Math.max(1,Math.round((Date.now()-ts)/60000));
  if(mins<60) return `${mins} dk önce`;
  const h=Math.round(mins/60); if(h<24) return `${h} sa önce`;
  const d=Math.round(h/24); return `${d} gün önce`;
}
function relationLabel(type){
  return ({child:'Alt öğrenme',parent:'Üst öğrenme',related:'İlişkili',none:'Bağlantısız'})[type] || 'Bağlantısız';
}
function topicById(id){ return state.topics.find(t=>t.id===id); }
function setView(view){
  currentView=view; currentTopicId=null; currentTopicMode='view';
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  render();
}

document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
newTopicBtn.addEventListener('click',()=>openTopicDialog());

function fillRelationSelect(excludeId=null){
  const select=document.getElementById('relatedTopic');
  select.innerHTML='<option value="">Konu seçilmedi</option>'+state.topics
    .filter(t=>t.id!==excludeId)
    .map(t=>`<option value="${t.id}">${esc(t.title)}</option>`).join('');
}

function openTopicDialog(id=null){
  const t=id ? topicById(id) : null;
  document.getElementById('topicDialogTitle').textContent=t?'Konuyu düzenle':'Yeni öğrenme konusu';
  document.getElementById('editingTopicId').value=t?.id||'';
  document.getElementById('topicTitle').value=t?.title||'';
  document.getElementById('topicNote').value=t?.note||'';
  fillRelationSelect(t?.id||null);
  document.getElementById('relatedTopic').value=t?.relation?.topicId||'';
  document.getElementById('relationType').value=t?.relation?.type||'none';
  topicDialog.showModal();
}

document.getElementById('saveTopicBtn').addEventListener('click',(e)=>{
  e.preventDefault();
  const id=document.getElementById('editingTopicId').value;
  const title=document.getElementById('topicTitle').value.trim();
  if(!title) return;
  const note=document.getElementById('topicNote').value.trim();
  const relatedTopicId=document.getElementById('relatedTopic').value || null;
  const relationType=relatedTopicId ? document.getElementById('relationType').value : 'none';
  if(id){
    const t=topicById(id); if(!t) return;
    t.title=title; t.note=note; t.updatedAt=Date.now();
    t.relation={type:relationType,topicId:relatedTopicId};
  }else{
    state.topics.unshift({
      id:crypto.randomUUID(), title, note,
      relation:{type:relationType,topicId:relatedTopicId},
      createdAt:Date.now(), updatedAt:Date.now()
    });
  }
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

function openTopic(id,mode='view'){
  currentTopicId=id; currentTopicMode=mode; renderTopic(id,mode);
}

function relationMeta(t){
  const rel=t.relation||{type:'none',topicId:null};
  const linked=topicById(rel.topicId);
  if(!linked || rel.type==='none') return '';
  return `<div class="relation-pill">${relationLabel(rel.type)} · ${esc(linked.title)}</div>`;
}

function homeView(){
  const recent=[...state.topics].sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,2);
  return `
    <section class="hero">
      <div class="meta">BUGÜN</div>
      <h1>Bunun nasıl çalıştığını merak ediyorum.</h1>
      <p>Araştırmanı sen yap. Öğrendiğini buraya bırak. Nerede kaldığını ve sırada ne olduğunu wondR hatırlasın.</p>
      <button class="primary" onclick="openTopicDialog()">+ Öğrenme konusu aç</button>
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
    ${relationMeta(t)}
    <div class="note-preview">${esc((t.note||'Henüz not yok.').slice(0,180))}</div>
    <div class="card-actions">
      <button class="small-btn" onclick="openTopicDialog('${t.id}')">Düzenle</button>
      <button class="small-btn accent" onclick="openTopic('${t.id}','study')">Çalış</button>
    </div>
  </article>`;
}

function queueRow(q){
  const parent=topicById(q.parentTopicId);
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
  if(existing){openTopic(existing.id,'study');return;}
  const topic={
    id:crypto.randomUUID(), title:q.title, note:'',
    relation:q.parentTopicId?{type:'child',topicId:q.parentTopicId}:{type:'none',topicId:null},
    createdAt:Date.now(), updatedAt:Date.now()
  };
  state.topics.unshift(topic);
  state.learnQueue=state.learnQueue.filter(x=>x.id!==queueId);
  save(); openTopicDialog(topic.id);
}

function renderTopic(id,mode='view'){
  const t=topicById(id); if(!t){setView('topics');return;}
  if(mode==='study'){
    app.innerHTML=`<section class="study-page">
      <div class="study-toolbar">
        <button class="small-btn" onclick="setView('topics')">← Konular</button>
        <button class="small-btn" onclick="openTopicDialog('${t.id}')">Düzenle</button>
      </div>
      <div class="study-content">
        <div class="meta">ÇALIŞ</div>
        <h1>${esc(t.title)}</h1>
        ${relationMeta(t)}
        <article class="reading-text">${esc(t.note||'Bu konuda henüz not yok.').replace(/\n/g,'<br>')}</article>
      </div>
    </section>`;
    return;
  }
  app.innerHTML=`<section class="topic-page">
    <div class="topic-head">
      <div><div class="meta">ÖĞRENME KONUSU</div><h1>${esc(t.title)}</h1>${relationMeta(t)}<div class="meta">Son güncelleme: ${relativeTime(t.updatedAt)}</div></div>
      <button class="small-btn" onclick="setView('topics')">← Geri</button>
    </div>
    <section class="card">
      <div class="note-preview">${esc(t.note||'Henüz not yok.')}</div>
      <div class="card-actions">
        <button class="small-btn" onclick="openTopicDialog('${t.id}')">Düzenle</button>
        <button class="primary" onclick="openTopic('${t.id}','study')">Çalış</button>
        <button class="small-btn accent" onclick="openLearnDialog('${t.id}')">+ Öğren</button>
      </div>
    </section>
  </section>`;
}

function buildMapData(){
  const nodes=[]; const edges=[];
  const cx=410,cy=245,rad=165;
  state.topics.slice(0,10).forEach((t,i)=>{
    const a=(Math.PI*2*i/Math.max(Math.min(state.topics.length,10),1))-Math.PI/2;
    nodes.push({id:t.id,title:t.title,x:cx+Math.cos(a)*rad,y:cy+Math.sin(a)*rad,learn:false});
  });
  state.topics.forEach(t=>{
    const rel=t.relation||{};
    const a=nodes.find(n=>n.id===t.id), b=nodes.find(n=>n.id===rel.topicId);
    if(a&&b&&rel.type!=='none') edges.push({a,b,type:rel.type});
  });
  state.learnQueue.slice(0,8).forEach((q,i)=>{
    const parent=nodes.find(n=>n.id===q.parentTopicId);
    const node={id:q.id,title:q.title,x:parent?parent.x+65:85+(i%4)*180,y:parent?parent.y+45:430+Math.floor(i/4)*45,learn:true};
    nodes.push(node); if(parent) edges.push({a:parent,b:node,type:'queue'});
  });
  return {nodes,edges};
}

function mapView(){
  const {nodes,edges}=buildMapData();
  return `<div class="section-title"><h2>Learning Path</h2><span class="meta">Alt · Üst · İlişkili</span></div>
  <div class="map-wrap"><svg viewBox="0 0 820 520" role="img" aria-label="Learning path">
    ${edges.map(e=>`<line class="map-line ${e.type}" x1="${e.a.x}" y1="${e.a.y}" x2="${e.b.x}" y2="${e.b.y}" />`).join('')}
    ${nodes.map(n=>`<g><circle class="map-node ${n.learn?'learn':''}" cx="${n.x}" cy="${n.y}" r="${n.learn?8:11}"/><text class="map-label" x="${n.x+14}" y="${n.y+5}">${esc(n.title.slice(0,28))}</text></g>`).join('')}
  </svg></div>`;
}

function render(){
  if(currentTopicId){renderTopic(currentTopicId,currentTopicMode);return;}
  if(currentView==='home') app.innerHTML=homeView();
  if(currentView==='topics') app.innerHTML=topicsView();
  if(currentView==='queue') app.innerHTML=queueView();
  if(currentView==='map') app.innerHTML=mapView();
}

window.openTopic=openTopic;
window.openTopicDialog=openTopicDialog;
window.openLearnDialog=openLearnDialog;
window.startLearning=startLearning;
window.setView=setView;

render();
