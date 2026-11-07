import {lifespan12,lifespanPlan12,constitution12} from '../../packages/adventure/story-rules12.js';
import {mundanePeople,mundane,activeMundane} from '../../packages/adventure/mundane-life.js';
import {autoChoice} from '../../packages/adventure/auto-choice.js';
import {storyPeople,rootLabel,rootDescription,canCultivate,active10} from '../../packages/adventure/story-rules10.js';
import { createRun, choose, acknowledge, advance, advanceToChoice, age, date, duration, options, currentNode, nodeText, review, aid, cloneRun, ORIGINS, seekTraining, setActivity, travelTo, leaveExpedition } from '../../packages/adventure/engine.js';
import { AdventureStore, ADVENTURE_KEY, MAX_ARCHIVE_BYTES } from '../../packages/adventure/store.js';
import { ITEMS, REGIONS, REALMS, SKILLS } from '../../content/adventure.js';
import { birthFacts } from '../../packages/adventure/birth.js';
import { WORLD_ERAS, BIRTHPLACES, FAMILIES, LIFE_GOALS, TRAINING_GROUNDS } from '../../content/living-world.js';
import { regionInfo, activityLabel, monthSeconds, income, practiceRate, trainingOptions } from '../../packages/adventure/life.js';
import { activityContext, presentPeople } from '../../packages/adventure/context.js';
import { registerScene, drawScene } from './cultivation-pixel.js';
import { PEOPLE_BACKGROUNDS } from '../../content/expressions/people.js';
import { LIFESPAN_TEXT, fillLifespan } from '../../content/expressions/lifespan.js';
import { REALM_ABILITIES } from '../../packages/adventure/realm.js';
import { PATHS,ROOTS,ACTIVITIES,GEOGRAPHY } from '../../content/cultivation-world.js';
import { activityOptions,routeOptions,currentContinent } from '../../packages/adventure/cultivation.js';
import { mapMarkup,drawMap } from './continent-atlas.js';
import {lifePanels,activityMeaning,abilityRadar} from './life-panels.js';
import {longAction,prose} from '../../packages/adventure/progression.js';

const app = document.querySelector('#app'), topbar = document.querySelector('#topbar'), sheet = document.querySelector('#sheet'), noticeEl = document.querySelector('#notice');
const escape = input => String(input ?? '').replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const statusNames = { alive: '在世', dead: '已逝', captured: '被困', missing: '失踪' };
const ui = { screen: 'welcome', modal: null, playing: false, speed: 1, timelineAll: false, theme: 'light', writes: Promise.resolve(), saved: true, blocked: false, startedAt: null, readUntil: 0, readPauses: true, readingHistory: false, birth: null, draft: null, birthTicket: 0, autoStopped: false, autoAt: 0, autoKey: null };
let state = null, storage, store, noticeTimer;
try { storage = window.localStorage; store = new AdventureStore(storage); state = store.load(); }
catch (error) { ui.blocked = true; storage ??= { getItem: () => { throw new Error('storage unavailable'); }, setItem: () => { throw new Error('storage unavailable'); } }; store ??= new AdventureStore(storage); announce(error.message); }
try { ui.theme = storage.getItem(ADVENTURE_KEY + '.theme') === 'dark' ? 'dark' : 'light'; } catch { /* play remains available */ }
document.body.className = 'theme-' + ui.theme;

function announce(message) {
  clearTimeout(noticeTimer); noticeEl.textContent = message; noticeEl.classList.add('visible');
  noticeTimer = setTimeout(() => noticeEl.classList.remove('visible'), 5000);
}
function save() {
  if (!state) return Promise.resolve();
  const snapshot = cloneRun(state); ui.saved = false;
  const operation = () => { store.save(snapshot); ui.saved = state?.id === snapshot.id && state.revision === snapshot.revision; updateBar(); };
  ui.writes = ui.writes.then(async () => {
    if (ui.blocked) return;
    try {
      if (navigator.locks?.request) await navigator.locks.request(ADVENTURE_KEY + '.write', operation);
      else operation();
    } catch (error) { ui.blocked = true; ui.playing = false; updateBar(); announce(error.message); }
  });
  return ui.writes;
}
function toolbar() {
  return `<div class="topbar-inner"><div class="brand">归<em class="em">山</em>记</div><span class="eyebrow">修仙人生</span><div class="nav-spacer"></div><button class="small-btn" data-action="theme">${ui.theme === 'light' ? '夜读' : '日读'}</button><button class="small-btn" data-action="history">往期人生</button></div>`;
}
function lifeToolbar() {
 return '<div class="topbar-inner"><div class="brand">归<em class="em">山</em>记</div><div class="agebox"><div class="age-num"><span id="life-age"></span><small>岁</small></div><div class="age-yr"><span class="t" id="life-date"></span><div class="t" id="life-span"></div><div class="prog"><div id="year-progress"></div></div></div></div><div class="speed"><button class="pause" data-action="play" id="play-control" aria-label="暂停"></button><div class="sps">'+[1,2,4].map((v,i)=>'<button class="sps-b '+(i===0?'first':i===2?'last':'')+'" data-action="set-speed" data-speed="'+v+'">'+v+'<small>×</small></button>').join('')+'</div><button class="exitbtn" data-action="home">离开</button><button class="morebtn" data-action="menu" aria-label="更多">⋯</button></div><span class="save-label" id="save-status"></span></div>';
}
function updateBar() {
  const life = ui.screen === 'life' && state;
  const mode = (life ? 'life' : 'welcome') + ':' + ui.theme;
  topbar.className = 'topbar' + (life ? ' life-bar' : '');
  if (topbar.dataset.mode !== mode) {
    topbar.innerHTML = life ? lifeToolbar() : toolbar(); topbar.dataset.mode = mode;
  }
  if (!life) return;
  const block=longAction(state),d = date(state,block?.from??state.month), pending = Boolean(state.pending);
  document.querySelector('#life-age').textContent = d.age;
  document.querySelector('#life-date').textContent = `山历 ${d.year} 年${block?'起':''} · ${state.player.name}${block?' · 此程 '+duration(block.months):''}`;
  /* ⚠ 寿元只有规则层能算（`lifespanPlan12`），呈现层只把数字填进表达域的句式。 */
  const plan = lifespanPlan12(state);
  document.querySelector('#life-span').textContent = fillLifespan(LIFESPAN_TEXT.line, plan);
  document.querySelector('#year-progress').style.width = yearProgress() + '%';

  const control = document.querySelector('#play-control');
  control.textContent = pending ? '待抉择' : ui.playing && !ui.readingHistory ? '❚❚' : '▶';
  control.setAttribute('aria-label',pending?'回应抉择':ui.playing&&!ui.readingHistory?'暂停':'继续');
  control.classList.toggle('active', ui.playing && !pending && !ui.readingHistory);
  document.querySelectorAll('[data-action=set-speed]').forEach(b=>b.classList.toggle('on',Number(b.dataset.speed)===ui.speed));
  document.querySelector('#save-status').textContent = ui.blocked ? '请导出进度' : ui.saved ? '已自动存档' : '存档中';
}
function readingHold(body) {
  ui.readUntil = ui.readPauses ? performance.now() + Math.min(14000, Math.max(4500, [...body].length * 55)) : 0;
}

function sceneMarkup(id = 'life-scene') {
  return `<div class="scene" id="${id}" role="img" aria-label="修仙生活场景"><canvas class="sky"></canvas><canvas class="back"></canvas><canvas class="mid"></canvas><canvas class="front"></canvas></div>`;
}
function apparentAge(person, run) {
  const actual = (run.birth?.startAge ?? 16) + Math.floor((run.month - (person.born || 0)) / 12);
  return person.realm >= 3 ? Math.min(actual, 44) : person.realm >= 2 ? Math.min(actual, 56) : Math.min(actual, 90);
}
function paintScene(id='life-scene',run=state) { registerScene(document.getElementById(id),run,ui.theme); }
function renderWelcome() {
 ui.birthTicket++;closeSheet();ui.screen='welcome';ui.playing=false;updateBar();
 app.innerHTML='<section class="home"><div class="hero"><span class="lbl">每一次出生，都是不同的一生</span><h1>你会成为<br><em>怎样的修行者？</em></h1><p>随机出生，年月自然流逝。<br>遇到必须决定的事情，再作选择。</p><button class="cta" data-action="new">转动出生命盘 →</button>'+(state?'<button class="ghost" data-action="continue">'+(state.phase==='ended'?'回看上一生':'继续 '+escape(state.player.name)+' 的人生')+'</button>':'')+'</div><section class="panel"><div class="panel-h"><span>这一方世界</span><span class="lbl">来处，由命盘决定</span></div>'+mapMarkup('welcome-map')+'</section></section>';
 drawMap(document.getElementById('welcome-map'),null,ui.theme);
}
async function renderBirth() {
 closeSheet();ui.screen='birth';ui.playing=false;updateBar();const ticket=++ui.birthTicket;
 const seed=new URL(location.href).searchParams.get('replay')?.slice(0,80)||'山海-'+crypto.randomUUID().slice(0,12),facts=birthFacts(seed);
 app.innerHTML='<section class="cert-wrap"><article class="cert"><div class="cert-band">出生命盘 · 来处将定</div><div class="cert-body"><div class="roller"><span class="lbl">命盘转动</span><div class="roller-name" id="roller-name"></div><div class="roller-meta" id="roller-meta"></div></div>'+mapMarkup('birth-map')+'</div></article></section>';
 let turn=0;const animate=()=>{if(ticket!==ui.birthTicket)return;const f=birthFacts(seed+':轮转:'+turn++);document.querySelector('#roller-name').textContent=f.name;document.querySelector('#roller-meta').textContent=f.place.name+' · '+f.address+' · '+f.household.name;drawMap(document.getElementById('birth-map'),{birth:f,player:{location:'home'}},ui.theme);};
 animate();const timer=setInterval(animate,90);await new Promise(r=>setTimeout(r,1800));clearInterval(timer);
 if(ticket!==ui.birthTicket||ui.screen!=='birth')return;
 ui.birth={seed,facts,draft:{}};ui.screen='certificate';
 document.querySelector('#roller-name').textContent=facts.name;document.querySelector('#roller-meta').textContent=facts.place.name+' · '+facts.address+' · '+facts.household.name;drawMap(document.getElementById('birth-map'),{birth:facts,player:{location:'home'}},ui.theme);
 await new Promise(r=>setTimeout(r,1100));if(ticket!==ui.birthTicket||ui.screen!=='certificate')return;
 state=createRun({seed,...([9,10,11,12].includes(Number(new URLSearchParams(location.search).get('rules')))?{rulesVersion:Number(new URLSearchParams(location.search).get('rules'))}:{}),id:'life-'+crypto.randomUUID().replaceAll('-','')});ui.startedAt=performance.now();ui.playing=true;ui.readUntil=0;renderLife();await save();
}
function statBar() {
  const p = state.player;
  return `<div class="minibar"><div class="mb-st">${[['体力', p.health], ['心境', p.mind], ['悟性', p.insight], ['胆识', p.courage]].map(([label, v]) => `<div class="mb-i"><span class="mb-n">${label}</span><b class="mb-v">${Math.round(v)}</b><div class="mb-b"><div style="width:${v}%"></div></div></div>`).join('')}</div><button class="mb-fo" data-action="focus"><span class="mb-fl">重心</span><span class="mb-fon">${state.life.cultivation ? ACTIVITIES[state.life.cultivation.activity].name : SKILLS[p.focus]}</span><span class="mb-ar">▾</span></button></div>`;
}
function expeditionTask(id){return ({valley:'此行采药坡灵草、查看古坛；外门有宗门接应。',cavern:'此行寻找失联前队、查看旧炼器炉；洞外有补给点。',outer:'此行沿定位绳寻找失联修士；另一端有守门人接应。'})[id];}
function passageMarkup(){
 const c=state.life.cultivation;
 return c?.exam?'<p class="hint exam-deadline">本届考核截止：山历 '+date(state,c.exam.deadline).year+' 年 '+date(state,c.exam.deadline).month+' 月</p>':'';
}
function personRows() {
  const unconfirmed = new Set(state.life.unreadNews.flatMap(news => news.people || []));
  const c=state.life.cultivation;
  const family=state.life.family.members.map(p=>`<div class="person-row ${c?.knownDeaths.includes(p.id)?'dead':''}"><div class="person-initial">${escape(p.name[0])}</div><div class="person-text"><strong>${escape(p.name)}</strong><span>${escape(p.role)}</span><small>${c?.knownDeaths.includes(p.id)?'已确认离世':state.month<192?'在故乡身边':'故乡近况以已送达消息为准'}</small></div></div>`).join('')+(c?.descendants||[]).filter(p=>p.known).map(p=>`<div class="person-row"><div class="person-initial">${escape(p.name[0])}</div><div class="person-text"><strong>${escape(p.name)}</strong><span>${escape(p.relation)}</span><small>最近一次家中消息提及</small></div></div>`).join('');
  const oldFriends=(c?.network?.contacts||[]).map(p=>'<div class="person-row"><div class="person-initial">'+escape(p.name[0])+'</div><div class="person-text"><strong>'+escape(p.name)+'</strong><span>'+escape(p.role)+' · '+escape(p.description)+'</span><small>'+escape(p.status)+'</small></div></div>').join('');
  const storyCast=[...storyPeople(state),...mundanePeople(state)].map(p=>'<div class="person-row"><div class="person-initial">'+escape(p.name[0])+'</div><div class="person-text"><strong>'+escape(p.name)+'</strong><span>'+escape(p.role)+'</span><small>'+escape(p.description)+' · '+escape(p.status)+'</small></div></div>').join('');
  return family+oldFriends+storyCast+Object.values(state.people).filter(p => p.known).map(p => {
    const unknown = unconfirmed.has(p.id), when = date(state, p.deathMonth ?? state.month);
    const years = (state.birth.startAge ?? 16) + Math.floor(((p.deathMonth ?? state.month) - p.born) / 12);
    return `<div class="person-row ${unknown ? 'unconfirmed' : p.status}"><div class="person-initial">${p.name.slice(0, 1)}</div><div class="person-text"><strong>${p.name}</strong><span>${p.role}</span><small>${escape(prose(PEOPLE_BACKGROUNDS[p.id],state))}</small><small>${unknown ? '远方近况尚待消息确认' : statusNames[p.status] + ' · ' + regionInfo(state, p.location).name}${!unknown && p.status === 'dead' ? ` · 山历${when.year}年离世` : !unknown ? ` · ${years}岁` : ''}</small></div></div>`;
  }).join('');
}
function groundsMarkup() {
  return trainingOptions(state).filter(g=>!state.life.feedback || state.flags[g.id+'Briefed']).map(ground => `<article class="ground"><button class="ground-button" data-action="training" data-ground="${ground.id}" ${ground.enabled ? '' : 'disabled'}><strong>${ground.name}</strong><span>${REALMS[ground.realm].name}${ground.maxRealm !== ground.realm ? '至' + REALMS[ground.maxRealm].name : ''}</span></button><small>${ground.enabled ? '任务与接应已核实，可以决定是否出发' : ground.reasons[0]}</small></article>`).join('') || '<p class="sidebar-note">新的历练会从来信、旧图和人物邀请中出现。先过好眼前的日子。</p>';
}
function familyStatus(p){const c=state.life.cultivation;return c?(c.knownDeaths.includes(p.id)?'已逝':age(state)<16?'在身边':'最近来信时在世 · '+regionInfo(state,p.location).name):statusNames[p.status];}

/* 下一境界的「死线」：不突破到下一境，这一世最多活到那一年。 */
function lifespanNextText(s){
  const plan = lifespanPlan12(s);
  if (plan.next == null) return LIFESPAN_TEXT.last;
  return fillLifespan(LIFESPAN_TEXT.next, plan);
}
function sidebarMarkup() {
  const p = state.player, allies = aid(state), grown = age(state) >= 16;
  return `<section class="panel"><span class="lbl">这一生的你</span><div class="identity-name">${escape(p.name)}</div><p class="identity-caption">${FAMILIES[state.birth.family].name} · ${rootLabel(state)}</p><div class="stat-line"><span>境界</span><b>${REALMS[p.realm].name}</b></div><p class="sidebar-note realm-benefits">${REALM_ABILITIES[p.realm]}寿元上限 ${lifespan12(state)} 岁。${fillLifespan(LIFESPAN_TEXT.line, lifespanPlan12(state))}。${lifespanNextText(state)}</p><div class="stat-line"><span>灵石</span><b id="stone-count">${Math.round(p.stones)}</b></div>${state.flags.debt ? `<div class="stat-line"><span>未还路费</span><b>${state.flags.debt}</b></div>` : ''}<div class="stat-line"><span>仁心</span><b>${Math.round(p.empathy)}</b></div><div class="stat-line"><span>世界</span><b>${WORLD_ERAS[state.birth.era].name}</b></div><p class="sidebar-note">${grown ? '每年净结余 +' + income(state) + ' 灵石，先还路费欠账。当前灵脉的修行倍率 ' + practiceRate(state) + '×。' : '幼年先经历成长与启蒙；十六岁后才开始修行与日常结余。'}</p></section><section class="panel"><h3 class="panel-h"><span>修行本事</span><span class="lbl">${SKILLS[p.focus]}为重</span></h3>${Object.entries(p.skills).map(([key, v]) => `<div class="skill-row ${key === p.focus ? 'active' : ''}"><strong>${SKILLS[key]}</strong><div class="meter"><div style="width:${v}%"></div></div><span class="mono">${Math.round(v)}</span></div>`).join('')}<p class="sidebar-note">平日练习会自动积累；大境界突破与危险经历仍由你决定。</p></section><section class="panel"><h3 class="panel-h"><span>随身行囊</span><span class="lbl">${state.inventory.length}件</span></h3><div class="inventory">${state.inventory.length ? state.inventory.map(id => `<span class="chip" data-item="${id}">${ITEMS[id].name}</span>`).join('') : '<span class="hint">行囊暂空，故事仍可继续。</span>'}</div>${allies.length ? `<p class="sidebar-note">已建立的援手与承诺</p><div class="inventory">${allies.map(promise => `<span class="chip positive">${promise}</span>`).join('')}</div>` : ''}</section><section class="panel"><h3 class="panel-h">家产与住处</h3>${Object.values(state.life.properties).map(p => `<div class="property-row ${p.status}"><strong>${escape(p.name)}</strong><small>${p.continent?GEOGRAPHY.find(g=>g.id===p.continent).name:regionInfo(state,p.location).name} · ${({ kept: '保有', damaged: '损坏', lost: '已失去' })[p.status]}</small></div>`).join('')}</section><section class="panel"><h3 class="panel-h">收到的历练消息</h3>${groundsMarkup()}</section><section class="panel people-panel"><h3 class="panel-h"><span>人物与牵挂</span><button class="sheet-close" data-action="people">全部 →</button></h3><div class="people-list">${personRows() || '<p class="hint">还没有遇见山门与异乡的人。</p>'}</div></section>`;
}
function timelineMarkup(all = ui.timelineAll) {
  const records = (all ? state.journal : state.journal.slice(-6)).slice().reverse();
  return `<section class="panel life-records"><h3 class="panel-h"><span>这一生的经历</span><span class="lbl" id="journal-count">${state.journal.length}段 · ${state.decisions.length}次抉择</span></h3><div class="timeline" id="life-log">${records.map(entry => {
    const d = date(state, entry.month);
    return `<article class="timeline-row ${entry.kind} ${entry.automatic ? 'automatic' : ''}" data-record="${entry.id}"><div class="timeline-date">${d.age}岁<br>${d.year}.${String(d.month).padStart(2, '0')}</div><div class="timeline-body"><strong>${escape(entry.title)}</strong><p>${escape(entry.body)}</p>${entry.changes?.length ? `<div class="delta">${entry.changes.map(escape).join(' · ')}</div>` : ''}</div></article>`;
  }).join('')}</div>${all ? '<button class="timeline-expand" data-action="timeline-recent">收起，只看最近的经历 ↑</button>' : state.journal.length > 6 ? '<button class="timeline-expand" data-action="timeline">展开完整人生 ↓</button>' : ''}</section>`;
}
function renderLife({ modal = true, preserveScroll = false } = {}) {
  if (state.phase === 'ended') { renderEnding(); return; }
  const scrollY = window.scrollY, oldLog = document.querySelector('#life-log');
  const oldScroll=oldLog?.scrollTop||0,pinned=!oldLog||oldScroll<20;
  const anchor=oldLog&&[...oldLog.querySelectorAll('[data-record]')].find(el=>el.getBoundingClientRect().bottom>oldLog.getBoundingClientRect().top);
  const anchorId=anchor?.dataset.record,anchorTop=anchor ? anchor.getBoundingClientRect().top-oldLog.getBoundingClientRect().top : 0;
  ui.screen = 'life'; updateBar();
  const region = regionInfo(state), companions = presentPeople(state);
  const breakthrough=state.journal.filter(e=>e.kind==='breakthrough').at(-1);
  app.innerHTML='<div class="life-grid"><div class="main-column"><section class="panel p-scene scene-panel">'+sceneMarkup()+'<div class="scene-cap"><span>'+region.name+' · '+escape(state.player.home)+'</span></div></section>'+statBar()+timelineMarkup()+'<div id="passage">'+passageMarkup()+'</div>'+lifePanels(state)+'<section class="panel people-panel"><h3 class="panel-h"><span>人物与牵挂</span><button class="ghost sm" data-action="details">授业与记录 →</button></h3>'+personRows()+'</section><section class="panel"><div class="panel-h"><span>人生地图</span><button class="ghost sm" data-action="world">查看大陆与路线 →</button></div>'+mapMarkup()+'</section></div></div>';
  paintScene(); drawMap(document.getElementById("life-map"),state,ui.theme);
  if(breakthrough && state.month-breakthrough.month<12){
    const box=document.createElement('section');box.className='panel breakthrough-announcement';
    box.innerHTML='<span class="eyebrow">修行有成</span><h2>'+escape(breakthrough.title)+'</h2><p>'+escape(breakthrough.body)+'</p>';
    document.querySelector('.main-column').insertBefore(box,document.getElementById('passage'));
  }
  const log = document.querySelector('#life-log');
  log.scrollTop=pinned?0:oldScroll;
  if(!pinned&&anchorId){const next=log.querySelector('[data-record="'+anchorId+'"]');if(next)log.scrollTop+=next.getBoundingClientRect().top-log.getBoundingClientRect().top-anchorTop;}
  ui.readingHistory=log.scrollTop>24;
  if (preserveScroll) window.scrollTo({ top: scrollY, behavior: 'instant' });
  if (modal && state.pending) showDecision();
}
function updateLifeClock() {
  updateBar();
  const journey = state.journey;
  if (journey && !journey.open) {
    const total = journey.to - journey.from, actual = state.month - journey.from;
    const progress = document.querySelector('#plan-progress'), elapsed = document.querySelector('#plan-elapsed');
    if (progress) progress.style.width = (total ? actual / total * 100 : 100) + '%';
    if (elapsed) elapsed.textContent = '已过 ' + duration(actual);
  }
  const status = document.querySelector('#life-activity-status');
  if (status) status.textContent = ui.readingHistory?'阅读经历，年月暂停':performance.now() < ui.readUntil ? '稍歇阅读，随后继续' : ui.playing ? '日子正在过去' : '人生已暂停';
  if(state.life.cultivation&& !sheet.open && document.querySelector('.practice-panel')){
   // Monthly state changes are visible even between new journal entries.
   const c=state.life.cultivation,p=state.player;
   for(const el of document.querySelectorAll('[data-value]')){const k=el.dataset.value;el.textContent=k==='money'?mundane(state).money:k==='mundaneDebt'?mundane(state).debt:k==='stones'?Math.floor(p.stones):k==='progress'?(p.realm<4?Math.round(Math.min(100,c.progress/[80,140,220,320][p.realm]*100))+'%':'已臻元婴'):(p.skills[k]??p[k]).toFixed(1);}
   const pct=p.realm<4?Math.min(100,c.progress/[80,140,220,320][p.realm]*100):100;const meter=document.querySelector('[data-progress-meter]');if(meter)meter.style.width=pct+'%';
   for(const el of document.querySelectorAll('.visible-meter')){const v=el.parentElement.querySelector('[data-value]');if(v)el.firstElementChild.style.width=(p.skills[v.dataset.value]??p[v.dataset.value])+'%';}
   /* 雷达图（2026-11-07 · T4）：五轴 = 悟性 / 胆识 / 仁心 / 心境 / **体魄** ——
      体力是资源，出雷达（它在页面顶部的状态条里），体魄是能力，进雷达。 */
   const radar=document.querySelector('.ability-radar'),radarValues=['insight','courage','empathy','mind','constitution'].map(k=>k==='constitution'?constitution12(state):p[k]).join(',');if(radar&&radar.dataset.values!==radarValues){radar.outerHTML=abilityRadar(p,constitution12(state));document.querySelector('.ability-radar').dataset.values=radarValues;}
   for(const el of document.querySelectorAll('.activity-tile')){const id=el.dataset.activity;el.querySelector('.activity-time').textContent='已练 '+(c.activityMonths?.[id]||0)+' 个月';}
  }
}

function showSheet(kind, heading, body, headerRight = '<button class="sheet-close" data-action="close">关闭</button>') {
  ui.modal = kind;ui.autoAt=0;ui.autoKey=null;
  sheet.dataset.kind=kind;
  sheet.innerHTML = `<div class="dec"><div class="hd"><span>${heading}</span>${headerRight}</div><div class="bd">${body}</div></div>`;
  if (!sheet.open) sheet.showModal();
  sheet.querySelector('.bd').scrollTop = 0;
}
function closeSheet() { if (sheet.open) sheet.close(); ui.modal = null; }
function showDecision() {
  const node = currentNode(state); if (!node) return;
  const d = date(state), offered = options(state);
  showSheet('decision', `${d.age}岁 · 这一刻由你决定`, `<div class="fact">${regionInfo(state).name} · ${REALMS[state.player.realm].name} · ${Math.round(state.player.stones)} 灵石${activeMundane(state)&&mundane(state).started?" · "+mundane(state).money+"文钱":""}</div><h2 id="decision-title">${node.title}</h2><p>${escape(nodeText(node, state))}</p><div class="ch" id="decision-options">${offered.map((o, i) => `<button type="button" data-action="choose" data-choice="${o.id}" ${o.enabled ? '' : 'disabled'} class="${o.lethal ? 'lethal' : ''}"><span class="k">${String(i + 1).padStart(2, '0')}</span><span class="choice-label">${escape(o.label)}</span><span class="choice-hint">${escape(o.hint)}</span><span class="choice-meta">${o.enabled ? `${o.lethal ? '可能危及性命 · ' : ''}${o.cost.stones ? `花费 ${o.cost.stones} 灵石` : ''}${o.cost.debt ? ` · 路费欠账 ${o.cost.debt} 灵石` : ''}${o.cost.items?.length ? ` · 使用${o.cost.items.map(id => ITEMS[id].name).join('、')}` : ''}` : `暂时无法这样做：${escape(o.reasons.join('；'))}`}</span></button>`).join('')}</div><div id="auto-countdown" class="sheet-note" aria-live="polite"></div>`, '<button class="sheet-close" data-action="later">稍后回应</button>');
}
function showResult() {
  if (!state.result || state.phase === 'ended') return;
  const result = state.result;
  showSheet('result', result.provisional ? '这段人生的安排' : '一件事的结果', `<span class="result-stamp ${result.success ? '' : 'failure'}">${result.provisional ? '准备启程' : result.success ? '已有回响' : '事情没有照计划发生'}</span><h2 id="result-title">${escape(result.title)}</h2><p id="result-body">${escape(result.body)}</p><div class="result-changes">${result.changes.map(change => `<span class="chip">${escape(change)}</span>`).join('')}</div><div class="result-footer"><span class="hint">${result.months ? `接下来 ${duration(result.months)}${result.planned ? '，急事会打断' : ''}` : '下一件事已在眼前'}</span><button class="cta" data-action="acknowledge">继续人生 →</button></div>`, '<button class="sheet-close" data-action="close">先停在这里</button>');
}
function showPeople() {
  showSheet('people', '那些和你走过这一生的人', `<h2>名字仍在</h2><p>获救、被困、失踪与离世会持续影响故事。这里记录${age(state)}岁这一刻的状态。</p>${personRows()}<div class="fact" style="margin-top:18px">当前同行与已安置者：${state.world.survivors}人。离散者不自动计为死亡。</div>`);
}
function showWorld(){
 const c=state.life.cultivation;
 const places=c?routeOptions(state):GEOGRAPHY.map(p=>({...p,enabled:false,reason:'旧人生沿原有故事行路'}));
 showSheet('world','人生地图','<h2>'+WORLD_ERAS[state.birth.era].name+'</h2>'+mapMarkup('world-map')+'<p>'+({tide:'灵气正在恢复，新药田与遗迹陆续出现，宗门争夺灵泉。',ebb:'灵气逐渐减少，修行较慢，宗门对材料和名额的限制更严格。',fracture:'大陆之间的界门不稳定，传送与域外探索需要核对路线。'})[state.birth.era]+'</p><div class="map-places">'+places.map(p=>'<article><h3>'+p.name+'</h3><p>'+p.description+'</p><small>'+p.places.join(' · ')+'</small><p class="hint">'+p.specialty+'</p><button class="ghost" data-action="travel" data-place="'+p.id+'" '+(p.enabled?'':'disabled')+'>'+(p.enabled?'前往 · '+p.fee+' 灵石 · '+duration(p.months):escape(p.reason))+'</button></article>').join('')+'</div>');
 drawMap(document.getElementById('world-map'),state,ui.theme);
}
function showFocus(){
 if(!state.life.cultivation){showSheet('focus','旧人生的修行安排','<p>旧人生保留原有的已选安排。新的日常重心在新人生中使用。</p>');return;}
 showSheet('focus','重心','<h2>接下来的日子，以什么为重？</h2><p>重心决定平日如何度过。实际本事与身体变化见主页面“修行本事”；赶路、探险和禁闭期间不能自由安排。</p><div class="ch">'+activityOptions(state).map(a=>'<button data-action="activity" data-activity="'+a.id+'" '+(a.enabled?'':'disabled')+'><strong>'+a.name+'</strong><span>'+a.description+'</span><small>影响：'+activityMeaning(a,state)+'</small>'+(a.reason?'<small>'+a.reason+'</small>':'')+'</button>').join('')+'</div>');
}
function lifeDetails(){
 const c=state.life.cultivation;
 const system=c?'<section class="panel"><h3>'+PATHS[c.path].name+' · '+c.rank+'</h3><p>'+rootDescription(state)+'</p><p>'+REALMS[state.player.realm].name+' · '+REALM_ABILITIES[state.player.realm]+'</p><p>灵石 '+Math.round(state.player.stones)+' · 每年净结余 '+income(state)+'</p>'+(state.month<c.punishmentUntil?'<p>处分尚余 '+duration(c.punishmentUntil-state.month)+'</p>':'')+'</section><section class="panel"><h3>授业与管理</h3>'+c.officers.filter(p=>c.path==='orthodox'&&(!active10(state)||c.story10.contacts.some(person=>person.id==='officer:'+p.id))).map(p=>'<p><strong>'+p.name+' · '+p.role+'</strong><br>'+p.description+'</p>').join('')+'</section>':'';
 showSheet('details',c?'授业与记录':'家人与生活',c?system:sidebarMarkup());
}
function showHistory() {
  ui.playing = false; updateBar();
  const lives = store.lives().slice().reverse();
  showSheet('history', '往期人生', `<h2>每一次，都有不同的归途</h2>${lives.length ? lives.map(life => `<article class="history-row"><div><strong>${escape(life.player.name)}</strong><p>${age(life)}岁 · ${REALMS[life.player.realm].name} · ${life.decisions.length}次抉择 · ${life.ending?.title || (life.life ? activityLabel(life) : '未完人生')}</p></div><button class="small-btn" data-action="activate" data-id="${life.id}">${life.phase === 'ended' ? '回看' : '继续'}</button></article>`).join('') : '<p class="empty-note">还没有留下人生。从山门的一盏灯开始。</p>'}<div class="utility-row"><button class="small-btn" data-action="import">导入存档</button>${lives.length ? '<button class="small-btn" data-action="export-all">导出全部人生</button>' : ''}${ui.blocked ? '<button class="small-btn" data-action="raw">导出原档</button><button class="small-btn" data-action="recover">读取备份</button>' : ''}</div>`);
}
function showMenu() {
  ui.playing = false; updateBar();
  showSheet('menu', '暂歇片刻', `<h2>故事可以等你</h2><p>${ui.blocked ? '当前浏览器无法完成自动存档，请导出本页进度。' : '选择与年月会自动保存。关闭页面后可从首页继续。'}</p><div class="utility-row"><button class="ghost" data-action="export">导出这一生</button><button class="ghost" data-action="history">往期人生</button><button class="ghost" data-action="people">人物近况</button><button class="ghost" data-action="world">世界地图</button><button class="ghost" data-action="details">授业与记录</button><button class="ghost" data-action="focus">重心</button>${state.life.cultivation?.activeChain&&!state.pending?'<button class="ghost" data-action="withdraw">离开当前探险</button>':''}${state.autoPolicy?'<button class="ghost" data-action="auto">自动抉择：'+(state.autoPolicy.enabled?'开':'关')+'</button>':''}<button class="ghost" data-action="next">下一个 »</button><button class="ghost" data-action="read-mode">${ui.readPauses ? '取消结果阅读稍歇' : '开启结果阅读稍歇'}</button><button class="ghost" data-action="theme">${ui.theme === 'light' ? '切换夜读' : '切换日读'}</button><button class="ghost" data-action="home">回到首页</button>${ui.blocked ? '<button class="ghost" data-action="reload-save">重新读取档案</button><button class="ghost" data-action="raw">导出原档</button><button class="ghost" data-action="recover">读取备份</button>' : ''}</div>`);
}
function endingConsequences() {
  const r = review(state), master = state.people.master, friend = state.people.friend, arcs = state.life.expeditions;
  return (master.known ? master.status === 'dead' ? '闻竹已逝，她的名字与最后一课留在这一生里。' : master.status === 'captured' ? '闻竹仍被困在旧山门，终章没有抹掉这段遗憾。' : '闻竹仍在世，现居' + regionInfo(state, master.location).name + '。' : '') + (friend.known ? friend.status === 'alive' ? '沈砚仍在世，现居' + regionInfo(state, friend.location).name + '。' : '沈砚仍留在未归者的名单里。' : '') + (state.flags.relocated ? '在世的师门中人迁到了异乡。' : state.flags.rebuilt ? '旧山门已经重建。' : '') + (arcs.length ? '此生有' + arcs.filter(e => e.status === 'returned').length + '次探险返回，' + arcs.filter(e => e.status === 'interrupted').length + '次因急事中断。' : '') + '共有' + r.automatic + '段自动发生的经历与' + r.failures + '次未达预期的冒险，获得、失去与未完成的事都留在记录里。';
}

function renderEnding() {
  closeSheet(); ui.screen = 'ending'; ui.playing = false; updateBar();
  const r = review(state), end = state.ending;
  app.innerHTML = `<section class="ending"><div class="ending-heading"><div><span class="eyebrow">${escape(state.player.name)}的一生 · 终章</span><h1><em>${end.title}</em></h1><p class="ending-copy">${end.final ? escape(end.final) : ''}</p><p class="ending-copy">${end.text}</p></div><div class="welcome-stamp">这一生<br>有了回响</div></div><div class="ending-metrics"><div><strong>${r.age}岁</strong><span>本页最后记录</span></div><div><strong>${r.realm}</strong><span>这一生的境界</span></div><div><strong>${r.decisions}次</strong><span>改变人生的抉择</span></div><div><strong>${r.survivors}人</strong><span>当前同行与已安置者</span></div></div><section class="panel scene-panel">${sceneMarkup('ending-scene')}<div class="scene-cap"><span>${regionInfo(state).name} · ${escape(state.player.home)}</span><span class="muted">${r.visited.map(id => regionInfo(state, id).name).join(' → ')}</span></div></section><div class="ending-grid"><section class="panel"><h3 class="panel-h">有些选择留了下来</h3><p>${endingConsequences()}</p><div class="inventory">${state.inventory.map(id => `<button class="chip" data-action="item" data-item="${id}">${ITEMS[id].name}</button>`).join('')}</div></section><section class="panel"><h3 class="panel-h">这一生的人</h3>${personRows()}</section></div><div class="ending-actions"><button class="cta" data-action="new">再走一条不同的路 →</button><button class="ghost" data-action="export">保存这一生</button><button class="ghost" data-action="ending-timeline">展开完整经历</button><button class="ghost" data-action="home">回到首页</button></div><section class="panel feedback"><h3 class="panel-h">愿不愿意再走一遍</h3><p class="hint">体验后可在这里记下感受；反馈只保存在这个浏览器。</p><form id="feedback-form"><div class="rating"><label><input type="radio" name="replay" value="yes" required> 想试另一条路线</label><label><input type="radio" name="replay" value="maybe"> 有兴趣，但还要调整</label><label><input type="radio" name="replay" value="no"> 目前不想再玩</label></div><label>哪一段有意思，哪一段想跳过？<textarea name="comment" maxlength="1200" placeholder="写最直接的感受就好。"></textarea></label><button class="small-btn" type="submit">记下感受</button><span class="hint" id="feedback-status"></span></form></section><div id="ending-timeline"></div></section>`;
  paintScene('ending-scene');
}
function download(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function action(name, button) {
  switch (name) {
    case 'map-zoom': {const map=button.closest('.wmap');map.classList.toggle('zoomed');button.textContent=map.classList.contains('zoomed')?'恢复全图':'放大地图';break;}
    case 'new': ui.playing = false; await save(); await renderBirth(); break;
    case 'reroll': renderBirth(); break;
    case 'begin': {
      if (!ui.birth || ui.screen !== 'certificate') return;
      await ui.writes;
      state = createRun({ id: 'life-' + crypto.randomUUID(), seed: ui.birth.seed, name: ui.birth.draft.name || undefined, goal: ui.birth.draft.goal });
      ui.startedAt = performance.now(); ui.timelineAll = false; ui.readingHistory=false; ui.readUntil = 0; ui.playing = true;
      renderLife(); await save(); break;
    }
    case 'home': ui.playing = false; await save(); renderWelcome(); break;
    case 'continue': closeSheet(); ui.startedAt ??= performance.now(); ui.playing = true; ui.readUntil = 0; state.phase === 'ended' ? renderEnding() : renderLife(); break;
    case 'respond': ui.autoStopped=false;ui.autoAt=0;showDecision(); break;
    case 'later': ui.autoStopped=true;ui.autoAt=0;ui.autoKey=null;ui.playing = false; closeSheet(); updateLifeClock(); break;
    case 'close': closeSheet(); updateBar(); break;
    case 'choose': {
      if (!state.pending || ui.modal !== 'decision') return;
      const result = choose(state, button.dataset.choice);if(button.dataset.automatic==='true'){state.autoPolicy.cursor++;state.revision++;}ui.autoAt=0;ui.autoKey=null;ui.autoStopped=false; ui.startedAt ??= performance.now();
      closeSheet(); ui.playing = true; readingHold(result.body); renderLife({ modal: false, preserveScroll: true }); await save();
      if (!result.success) announce('这次没有照计划发生，后果已留在这一生里。');
      break;
    }
    case 'result': showResult(); break;
    case 'acknowledge': closeSheet(); acknowledge(state); ui.playing = true; ui.readUntil = 0; renderLife(); await save(); break;
    case 'play':
      if (state.pending) { ui.autoStopped=false;ui.autoAt=0;showDecision(); break; }
      if (state.waiting) { acknowledge(state); ui.playing = true; }
      else if (ui.readingHistory) { document.querySelector('#life-log').scrollIntoView({block:'start',behavior:'instant'});ui.readingHistory=false;ui.readUntil=0;ui.playing=true; }
      else if (ui.playing) { ui.playing=false; }
      else { ui.readUntil=0;ui.readingHistory=false;ui.playing=true; }

      updateBar(); document.querySelector('#passage').innerHTML = passageMarkup(); await save(); break;
    case 'speed': ui.speed = ui.speed === 4 ? 1 : ui.speed * 2; updateBar(); break;
    case 'set-speed': ui.speed=Number(button.dataset.speed);updateBar();break;
    case 'focus': showFocus();break;
    case 'activity': setActivity(state,button.dataset.activity);closeSheet();ui.playing=true;renderLife({modal:false,preserveScroll:true});await save();break;
    case 'travel': travelTo(state,button.dataset.place);closeSheet();ui.playing=true;renderLife({modal:false,preserveScroll:true});await save();break;
    case 'details': lifeDetails();break;
    case 'withdraw': leaveExpedition(state);closeSheet();ui.playing=true;renderLife({modal:false,preserveScroll:true});await save();break;
    case 'next':
      if (state.pending) { showDecision(); break; }
      if (state.waiting) acknowledge(state);
      ui.readUntil = 0; advanceToChoice(state); renderLife({ preserveScroll: true }); await save(); break;
    case 'training': seekTraining(state, button.dataset.ground); renderLife({ preserveScroll: true }); await save(); break;
    case 'world': showWorld(); break;
    case 'region': {
      const region = BIRTHPLACES[button.dataset.region];
      showSheet('region', '已知的山海', `<h2>${region.name}</h2><p>${region.rule}</p><div class="fact">山门：${region.sect} · ${region.mountain}<br>城镇与地址：${region.addresses.join('、')}</div><button class="ghost" data-action="world">回到世界地图</button>`); break;
    }
    case 'people': showPeople(); break;
    case 'item': showSheet('item', '随身带着的故事', `<h2>${ITEMS[button.dataset.item].name}</h2><p class="item-detail">${ITEMS[button.dataset.item].detail}</p>`); break;
    case 'timeline': ui.timelineAll = true; ui.playing=false; renderLife({ modal: false, preserveScroll: true }); break;
    case 'timeline-recent': ui.timelineAll = false; renderLife({ modal: false, preserveScroll: true }); break;
    case 'ending-timeline': document.querySelector('#ending-timeline').innerHTML = timelineMarkup(true); document.querySelector('#ending-timeline').scrollIntoView({ behavior: 'smooth' }); break;
    case 'history': await ui.writes; showHistory(); break;
    case 'menu': ui.autoAt=0;await save(); showMenu(); break;
    case 'auto': if(state.autoPolicy){state.autoPolicy.enabled=!state.autoPolicy.enabled;state.revision++;ui.autoStopped=false;ui.autoAt=0;await save();showMenu();}break;
    case 'read-mode': ui.readPauses = !ui.readPauses; if (!ui.readPauses) ui.readUntil = 0; showMenu(); break;
    case 'activate': {
      await ui.writes; state = navigator.locks?.request ? await navigator.locks.request(ADVENTURE_KEY + '.write', () => store.activate(button.dataset.id)) : store.activate(button.dataset.id);
      ui.blocked = false; ui.playing = true; ui.readUntil = 0; closeSheet(); state.phase === 'ended' ? renderEnding() : renderLife(); break;
    }
    case 'theme':
      ui.theme = ui.theme === 'dark' ? 'light' : 'dark'; document.body.className = 'theme-' + ui.theme;
      try { storage.setItem(ADVENTURE_KEY + '.theme', ui.theme); } catch { /* visual preference only */ }
      updateBar(); paintScene('welcome-scene', null); paintScene('life-scene'); paintScene('ending-scene');
      if (ui.birth && ui.screen === 'certificate') paintScene('birth-scene', { seed: ui.birth.seed, month: 0, birth: ui.birth.facts, player: { location: 'home', sex: ui.birth.facts.sex, realm: 0 }, flags: {}, people: {} });
      break;
    case 'export': download(store.export(state), '归山记-' + state.player.name + '.json'); break;
    case 'export-all': download(store.export(), '归山记-全部人生.json'); break;
    case 'raw': download(store.raw() || '', '归山记-原始存档.json'); break;
    case 'import': document.querySelector('#import-file').click(); break;
    case 'recover': await ui.writes; state = navigator.locks?.request ? await navigator.locks.request(ADVENTURE_KEY + '.write', () => store.recover()) : store.recover(); ui.blocked = false; closeSheet(); renderWelcome(); announce('已读取备份，恢复前的原文另行保留。'); break;
    case 'reload-save': await ui.writes; state = store.load(); ui.blocked = false; closeSheet(); renderWelcome(); break;
  }
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  action(button.dataset.action, button).catch(error => { ui.playing = false; updateBar(); announce(error.message); });
});
document.addEventListener('submit', event => {
  if (event.target.id === 'birth-form') {
    event.preventDefault();
    renderBirth().catch(error => { ui.playing = false; announce(error.message); });
  } else if (event.target.id === 'feedback-form') {
    event.preventDefault();
    try {
      const data = new FormData(event.target), raw = storage.getItem(ADVENTURE_KEY + '.feedback') || '[]', feedback = JSON.parse(raw);
      feedback.push({ id: state.id, seed: state.seed, ending: state.ending.id, decisions: state.decisions.length, replay: data.get('replay'), comment: data.get('comment'), savedAt: new Date().toISOString() });
      storage.setItem(ADVENTURE_KEY + '.feedback', JSON.stringify(feedback)); document.querySelector('#feedback-status').textContent = '已在本地记下，欢迎直接把感受告诉我。';
    } catch (error) { announce('反馈暂未存下：' + error.message); }
  }
});
document.querySelector('#import-file').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (file.size > MAX_ARCHIVE_BYTES) throw new Error('存档超过本版导入上限，原档未改写。');
    const raw = await file.text(); await ui.writes;
    state = navigator.locks?.request ? await navigator.locks.request(ADVENTURE_KEY + '.write', () => store.import(raw)) : store.import(raw);
    closeSheet(); renderWelcome(); announce('存档已导入，同一人生的不同进度会保留为两个副本。');
  } catch (error) { announce(error.message); }
  finally { event.target.value = ''; }
});
sheet.addEventListener('cancel', () => { ui.autoStopped=true;ui.autoAt=0;ui.autoKey=null;ui.playing = false; ui.modal = null; updateBar(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { ui.autoStopped=true;ui.autoAt=0;ui.autoKey=null;ui.playing = false; if (state && ui.screen === 'life') { save(); updateBar(); } } });
window.addEventListener('storage', event => {
  if (event.key === ADVENTURE_KEY && event.newValue !== store.rawSnapshot) { ui.playing = false; ui.blocked = true; updateBar(); announce('另一个页面更新了档案。可先导出本页进度，再读取最新档案。'); }
});
window.addEventListener('pagehide', () => {
  if (!state || ui.blocked) return;
  // pagehide cannot wait for a promise. The store still checks the exact raw
  // baseline and monotonic run revision before this final synchronous checkpoint.
  try { store.save(cloneRun(state)); } catch { /* Existing confirmed archive remains; a conflict never overwrites it. */ }
});
// Read-only snapshot for the reproducible browser playthroughs.
window.adventurePreview = Object.freeze({
  snapshot: () => state ? cloneRun(state) : null,
  options: () => state ? options(state) : [],
  birth: () => ui.birth ? cloneRun(ui.birth.facts) : null,
  status: () => ({ screen: ui.screen, playing: ui.screen === 'life' && ui.playing && !sheet.open && !state?.pending && !state?.waiting && performance.now() >= ui.readUntil && !ui.readingHistory, intendsToPlay: ui.playing, saved: ui.saved, blocked: ui.blocked, reading: performance.now() < ui.readUntil || ui.readingHistory, auto: Boolean(state?.autoPolicy?.enabled), autoStopped:ui.autoStopped }),
});
let previousTime = performance.now(), bank = 0, lastPaint = 0, lastSave = 0, lastScenePaint = 0;
function yearProgress() {
  const fraction = ui.screen === 'life' && state?.phase !== 'ended' && !state?.pending && !state?.waiting ? bank : 0;
  const block=state&&longAction(state);if(block)return Math.min(100,(state.month-block.from+Math.min(fraction,block.to-state.month))/block.months*100);
  return ((state.month % 12 + fraction) / 12 * 100);
}
function frame(now) {
  const elapsed = Math.min(now - previousTime, 250); previousTime = now;
  if(ui.screen==='life'&&state?.pending&&state.autoPolicy?.enabled&&!ui.autoStopped&&!ui.blocked&&ui.modal==='decision'&&sheet.open&&!document.hidden&&now>=ui.readUntil){
   const key=state.id+':'+state.pending.event+':'+state.pending.month;
   if(ui.autoKey!==key){ui.autoKey=key;ui.autoAt=now;}
   const hint=document.getElementById('auto-countdown');if(hint)hint.textContent='自动抉择 · '+Math.max(0,(1200-(now-ui.autoAt))/1000).toFixed(1)+' 秒';
   if(now-ui.autoAt>=1200){const id=autoChoice(state.seed,state.autoPolicy.cursor,options(state).map(o=>({id:o.id,enabled:o.enabled})));ui.autoAt=0;ui.autoKey=null;if(id)action('choose',{dataset:{choice:id,automatic:'true'}}).catch(error=>{ui.playing=false;ui.autoStopped=true;announce(error.message);});}
  }else{ui.autoAt=0;ui.autoKey=null;const hint=document.getElementById('auto-countdown');if(hint)hint.textContent='';}

  if (ui.screen === 'life' && ui.playing && !sheet.open && state?.journey && !state.waiting && !state.pending && now >= ui.readUntil && !ui.readingHistory && !document.hidden) {
    bank += elapsed / 1000 / monthSeconds(state) * ui.speed;
    const months = Math.min(longAction(state)?24:1, Math.floor(bank));
    if (months > 0) {
      const records = state.journal.length, context = activityContext(state), realm = state.player.realm, priorResult = state.result;
      let actual=0;while(actual<months&&state.phase==='life'&&!state.pending){const spent=advance(state,1);actual+=spent;if(!spent||state.journal.length!==records)break;}bank=Math.max(0,bank-actual);
      if (state.journal.length !== records && ui.readPauses) {
        const added=state.journal.slice(records),body=added.map(e=>e.body).join('');
        ui.readUntil=now+Math.min(14000,Math.max(3500,[...body].length*55));
        bank=0;
      }
      if (state.result?.completed && state.result !== priorResult) readingHold(state.result.body);
      if (state.pending || state.phase === 'ended') { renderLife({ preserveScroll: true }); save(); bank = 0; }
      else if (state.journal.length !== records || activityContext(state) !== context || state.player.realm !== realm) { renderLife({ modal: false, preserveScroll: true }); save(); lastPaint = now; }
      else if (now - lastPaint > 180) { updateLifeClock(); lastPaint = now; }
      if (now - lastSave > 3500) { save(); lastSave = now; }
    }
  } else {
    if (ui.screen !== 'life' || state?.pending || state?.waiting || state?.phase === 'ended') bank = 0;
    if (ui.screen === 'life' && now - lastPaint > 250) { updateLifeClock(); lastPaint = now; }
  }
  const scene=document.getElementById(ui.screen==='life'?'life-scene':ui.screen==='certificate'?'birth-scene':ui.screen==='ending'?'ending-scene':'welcome-scene');
  if(scene && now-lastScenePaint>50){drawScene(scene,now,matchMedia('(prefers-reduced-motion: reduce)').matches);lastScenePaint=now;}
  const bar=document.getElementById('year-progress');
  if(bar&&state){bar.style.transition='none';bar.style.width=yearProgress()+'%';}
  requestAnimationFrame(frame);
}
renderWelcome(); requestAnimationFrame(frame);

app.addEventListener('scroll',event=>{
 if(event.target.id!=='life-log')return;
 ui.readingHistory=event.target.scrollTop>24;
 const status=document.querySelector('#life-activity-status');if(status)status.textContent=ui.readingHistory?'阅读旧经历，年月暂停':ui.playing?'日子正在过去':'人生已暂停';
},true);
window.addEventListener('scroll',()=>{
 if(ui.screen!=='life')return;
 const first=document.querySelector('#life-log .timeline-row');
 ui.readingHistory=!!first&&first.getBoundingClientRect().top<40;
},{passive:true});
window.addEventListener("resize",()=>{for(const canvas of document.querySelectorAll(".wmap canvas"))drawMap(canvas,canvas.id==="welcome-map"?null:state,ui.theme);});
