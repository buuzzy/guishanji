import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRun,choose,advance,advanceToChoice,options,cloneRun,validateRun,setActivity,travelTo,leaveExpedition,upgradeRun} from '../packages/adventure/engine.js';
import {activityOptions,routeOptions,currentContinent} from '../packages/adventure/cultivation.js';
import {ROOTS} from '../content/cultivation-world.js';
import {ROAD_CHAINS} from '../content/cultivation-stories.js';
import {decide,playCultivation,naturalSeed} from '../scripts/play-cultivation.mjs';
import {AdventureStore,ADVENTURE_KEY} from '../packages/adventure/store.js';
const follow=(s,id,policy={})=>{for(let i=0;i<130&&s.phase==='life';i++){if(!s.pending)advanceToChoice(s);if(s.pending?.event===id)return s;if(!s.pending)break;choose(s,decide(s,policy).id);}return null;};
const find=(id,policy={},filter=()=>true)=>{for(let i=0;i<250;i++){const s=follow(createRun({seed:'万千道途-'+i}),id,policy);if(s&&filter(s))return s;}throw Error('自然规则未到达 '+id);};
const resolve=s=>{while(s.journey&&!s.journey.open&&s.phase==='life'&&!s.pending)advance(s,1);};
class Memory{data=new Map();getItem(k){return this.data.get(k)??null;}setItem(k,v){this.data.set(k,v);}}
test('出生自然分化且先天灵根没有因读书重抽',()=>{
 const types=new Set(),roots=new Set();for(let i=0;i<350;i++){const s=createRun({seed:'万千道途-'+i});types.add(s.birth.upbringing);roots.add(s.player.root);assert.equal(s.birth.goal,'free');validateRun(s);}assert.deepEqual([...types].sort(),['beast','demonic','loose','ordinary']);assert.equal(roots.size,Object.keys(ROOTS).length);
});
test('正式测灵根后录取结果与灵根等级相符，弱灵根可当杂役',()=>{
 for(const grade of [-1,0,3]){const s=find('root_result',{path:'orthodox'},s=>ROOTS[s.player.root].grade===grade);const join=options(s).find(o=>o.id==='join');assert.equal(join.enabled,grade>=0);choose(s,grade<0?'servant':'join');resolve(s);assert.equal(s.life.cultivation.rank,grade<=0?'杂役':'外门弟子');validateRun(s);}
});
test('重心与路线查询只读；按实际月数练习，不能无限点击刷点',()=>{
 const s=find('first_method',{path:'loose'});choose(s,'array');resolve(s);const before=cloneRun(s);for(let i=0;i<20;i++){activityOptions(s);routeOptions(s);}assert.deepEqual(s,before);const root=s.player.root,skill=s.player.skills.array;setActivity(s,'study');assert.equal(s.player.skills.array,skill);advance(s,6);assert.ok(s.player.skills.array>skill);assert.equal(s.player.root,root);validateRun(s);
});
test('药田事故有实际处分，造假之后不能直接参加专业活动',()=>{
 const s=find('garden_accident',{path:'orthodox'});choose(s,'frame');assert.equal(s.life.cultivation.punishmentUntil,s.month+12);assert.equal(s.life.cultivation.activity,'work');assert.equal(activityOptions(s).find(a=>a.id==='sword').enabled,false);assert.throws(()=>setActivity(s,'sword'));validateRun(s);
});
test('目击者如实作证不承担他人点火的赔偿或禁闭',()=>{
 const s=find('garden_accident',{path:'orthodox'}),month=s.month,stones=s.player.stones,activity=s.life.cultivation.activity;
 choose(s,'honest');assert.equal(s.month,month);assert.equal(s.player.stones,stones);assert.equal(s.life.cultivation.activity,activity);assert.equal(s.life.cultivation.punishmentUntil,0);assert.ok(activityOptions(s).some(a=>a.enabled));assert.ok(!s.flags.unpaidGarden);validateRun(s);
});
test('外出不弹宗门考核现场，截止后返回不能补领成绩与奖励',()=>{
 const s=find('selection_1',{path:'orthodox'},s=>s.month<26*12&&s.player.stones>=6);choose(s,'array');const deadline=s.life.cultivation.exam.deadline,origin=currentContinent(s),target=routeOptions(s).find(p=>p.enabled);travelTo(s,target.id);resolve(s);advance(s,deadline-s.month+1);assert.ok(s.month>deadline);assert.equal(s.pending,null);assert.ok(s.life.cultivation.exam.preparation<=24);const returnRoute=routeOptions(s).find(p=>p.id===origin);assert.ok(returnRoute.enabled);travelTo(s,origin);resolve(s);assert.equal(s.pending.event,'selection_1_result');assert.equal(options(s).find(o=>o.id==='fair').enabled,false);assert.throws(()=>choose(s,'fair'));choose(s,'withdraw');assert.equal(s.life.cultivation.exam,null);validateRun(s);
});
test('突破需要实际闭关，独立记录在完成之月出现',()=>{
 const s=find('breakthrough_1_0',{path:'orthodox'},s=>options(s).find(o=>o.id==='try').enabled),month=s.month;choose(s,'try');assert.equal(s.player.realm,0);advance(s,11);assert.equal(s.player.realm,0);advance(s,1);assert.equal(s.month,month+12);assert.equal(s.player.realm,1);assert.ok(s.journal.some(e=>e.kind==='breakthrough'&&e.month===s.month));validateRun(s);
});
test('战事中止闭关会取消本次结果，继续守阵则恢复原剩余月份',()=>{
 const original=find('world_raid',{path:'loose'},s=>s.life.cultivation.suspended?.journey?.resolution?.event?.startsWith('breakthrough_'));
 const interrupted=original.life.cultivation.suspended.journey,tier=Number(interrupted.resolution.event.split('_')[1]),left=interrupted.to-original.month;
 const escaped=cloneRun(original);choose(escaped,'escape');assert.equal(escaped.life.cultivation.suspended,undefined);assert.equal(escaped.life.cultivation.attempts[tier],Number(interrupted.resolution.event.split('_')[2])+1);assert.equal(escaped.player.realm,original.player.realm);validateRun(escaped);
 const defended=cloneRun(original);choose(defended,'defend');assert.equal(defended.journey.resolution.event,interrupted.resolution.event);assert.equal(defended.journey.to-defended.month,left);assert.equal(defended.life.cultivation.attempts[tier],original.life.cultivation.attempts[tier]);advance(defended,left);assert.equal(defended.life.cultivation.attempts[tier],original.life.cultivation.attempts[tier]+1);assert.equal(defended.player.realm,interrupted.resolution.success?tier:original.player.realm);validateRun(defended);
});
test('旅行扣实际路费，抵达前地址不变，完成路线进入地图',()=>{
 const s=find('first_method',{path:'loose'},s=>s.player.stones>=3);choose(s,'array');resolve(s);const target=routeOptions(s).find(p=>p.enabled),origin=s.player.location,stones=s.player.stones;assert.ok(target);travelTo(s,target.id);assert.equal(s.player.stones,stones-target.fee);assert.equal(s.player.location,origin);advance(s,target.months-1);assert.equal(s.player.location,origin);advance(s,1);assert.equal(currentContinent(s),target.id);assert.deepEqual(s.life.cultivation.routes.at(-1),target.route);validateRun(s);
});
test('探险中的日常受限；主动撤出取消后续并保留已得物品',()=>{
 const s=find('sect_trial_0',{path:'orthodox'});choose(s,'cautious');resolve(s);const inventory=[...s.inventory];assert.ok(s.life.cultivation.activeChain);assert.ok(activityOptions(s).every(a=>!a.enabled));const month=s.month;leaveExpedition(s);assert.equal(s.life.cultivation.activeChain,null);assert.deepEqual(s.inventory,inventory);assert.ok(!s.life.cultivation.queue.some(q=>q.event.startsWith('sect_trial_')));advance(s,6);assert.equal(s.month,month+6);validateRun(s);
});
test('跨界携带定位物，归来实际回到出发大陆；未跨界者不会被传送',()=>{
 const s=find('loose_portal_0',{path:'loose'},s=>s.life.cultivation.worldDone),origin=currentContinent(s),home=s.player.home;
 const stayed=cloneRun(s);choose(stayed,'cautious');resolve(stayed);assert.equal(currentContinent(stayed),origin);assert.equal(stayed.life.cultivation.chains.loose_portal.departed,false);
 choose(s,'care');resolve(s);assert.notEqual(currentContinent(s),origin);assert.ok(s.inventory.includes('gate_anchor'));assert.ok(follow(s,'loose_portal_1',{path:'loose'}));choose(s,'cautious');resolve(s);assert.ok(follow(s,'loose_portal_2',{path:'loose'}));const before=currentContinent(s);choose(s,'care');assert.equal(currentContinent(s),before);resolve(s);assert.equal(currentContinent(s),origin);assert.equal(s.player.home,home);assert.equal(s.life.cultivation.routes.at(-1).at(-1),origin);validateRun(s);
});
test('家族基础抄本须实际转送，凡人家庭没有供修炼的接济选项',()=>{
 const s=find('family_support',{path:'loose'},s=>s.birth.family==='clan'&&options(s).find(o=>o.id==='notes').enabled&&s.month+12<s.life.cultivation.worldAt),reserve=s.life.family.reserve,insight=s.player.insight;choose(s,'notes');assert.equal(s.player.insight,insight);assert.equal(s.life.family.reserve,reserve);resolve(s);assert.equal(s.life.family.reserve,reserve-3);assert.ok(s.player.insight>=insight+3);assert.equal(options(s).some(o=>o.id==='supplies'),false);validateRun(s);
});
test('入门登记个人住处，战乱撤离真正失去旧住处并保留行囊与家产',()=>{
 const s=find('world_raid',{path:'loose'}),owned=[...s.inventory],family=cloneRun(s.life.properties.family_home),home=s.life.properties.dwelling.name;assert.equal(s.life.properties.dwelling.status,'kept');choose(s,'escape');assert.equal(s.life.properties.dwelling.name,home);assert.equal(s.life.properties.dwelling.status,'lost');assert.equal(s.life.properties.dwelling.changed,s.month);assert.deepEqual(s.inventory,owned);assert.deepEqual(s.life.properties.family_home,family);assert.ok(s.journal.some(e=>e.changes?.some(v=>v.includes(home))));validateRun(s);
});
test('随机事件链在多个人生中达到全部阶段，四条道路与凡俗都有终局',()=>{
 const covered=new Set(),paths=new Set(),endings=new Set();for(let i=0;i<400;i++){const r=playCultivation({seed:'万千道途-'+i,path:['orthodox','loose','demonic','beast','mortal'][i%5],conduct:'care',school:['sword','alchemy','array'][i%3]});r.events.forEach(id=>covered.add(id));paths.add(r.path);endings.add(r.ending);validateRun(r.state);}for(const chain of ROAD_CHAINS)for(let i=0;i<3;i++)assert.ok(covered.has(chain.id+'_'+i),chain.id);assert.equal(paths.size,5);assert.ok(endings.size>=5);
});
test('真实preview.3档案保持出生、往事、随机流与原始字节',async()=>{
 const raw=await readFile(new URL('./fixtures/adventure-preview3.json',import.meta.url),'utf8'),doc=JSON.parse(raw),original=doc.lives[0],up=upgradeRun(original);assert.deepEqual(up.birth,original.birth);assert.deepEqual(up.random,original.random);assert.deepEqual(up.journal,original.journal);assert.equal(up.life.cultivation,undefined);const mem=new Memory();mem.setItem(ADVENTURE_KEY,raw);const store=new AdventureStore(mem),s=store.load();assert.equal(mem.getItem(ADVENTURE_KEY),raw);if(s.pending)choose(s,options(s).find(o=>o.enabled).id);else advance(s,1);store.save(s);assert.ok([...mem.data].some(([k,v])=>k.startsWith(ADVENTURE_KEY+'.preserved.preview3.')&&v===raw));
});
test('新道路档案拒绝伪造后代、行程和故事阶段',()=>{
 const s=createRun({seed:naturalSeed('beast')});for(const corrupt of [x=>x.life.cultivation.descendants=[{name:'未来的孩子',born:x.month+1,status:'alive'}],x=>x.life.cultivation.chains.bad={step:0},x=>x.life.cultivation.routes=[['不存在']]]){const bad=cloneRun(s);corrupt(bad);assert.throws(()=>validateRun(bad));}validateRun(s);
});
