import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRun,choose,advance,advanceToChoice,options,cloneRun,validateRun,setActivity,travelTo,leaveExpedition,upgradeRun} from './helpers/rules12-engine.mjs';
import {activityOptions,routeOptions,currentContinent} from '../packages/adventure/cultivation.js';
import {ROOTS} from '../content/cultivation-world.js';
import {ROAD_CHAINS} from '../content/cultivation-stories.js';
import {decide,playCultivation,naturalSeed} from './helpers/rules12-play.mjs';
import {AdventureStore,ADVENTURE_KEY} from '../packages/adventure/store.js';
const follow=(s,id,policy={})=>{for(let i=0;i<130&&s.phase==='life';i++){if(!s.pending)advanceToChoice(s);if(s.pending?.event===id)return s;if(!s.pending)break;choose(s,decide(s,policy).id);if(policy.activity&&activityOptions(s).find(a=>a.id===policy.activity)?.enabled)setActivity(s,policy.activity);}return null;};
/*
 * ⚠ **章节感补强后 garden_accident 不再走自然扫**（2026-11-08）：
 *   新节奏把 20–36 岁的大半给了突破闭关与指导卡 ⇒ 日常池的这张机会卡
 *   在自然命里撞不到窗口（触达台账「闭关化吞掉的日常窗口」族，登记在案）。
 *   这两条测试量的是**处分与作证的后果**，不是可达性 ⇒ 直接把卡摆上待选。
 */
const pendingCard=(event,{years=28}={})=>{
  const s=createRun({seed:'cultivation-case-'+event});
  s.month=years*12;s.player.practice=s.month;s.player.root='松骨灵根';s.player.realm=1;s.player.stones=30;
  Object.assign(s.life.cultivation,{rootKnown:true,path:'orthodox',admissionDone:true,entered:192,worldDone:true,queue:[],activeChain:null,context:null,punishmentUntil:0});
  s.life.cultivation.story10.rootStatus='present';s.life.cultivation.story10.body='human';
  s.life.cultivation.network.method={id:'clear',source:'first_method',months:144,acquired:192};s.life.cultivation.network.methods=[{...s.life.cultivation.network.method}];
  s.pending={event,month:s.month};s.journey=null;return s;
};
/*
 * ⚠ **取样窗口 250 → 800**（2026-11-08 · 阶段一：出身真正驱动剧情）。
 * 身世卡改成按出身分池抽 ⇒ 固定种子的决策序列整体位移 ⇒ 有些卡在原来的 250 条里撞不上了。
 * 实测「家族基础抄本」那张卡（要 clan 出身 + 散修路 + 窗口未关）在第 508 条才第一次出现。
 * ⚠ **放宽窗口不改变任何断言**：循环仍然是「碰到第一条就返回」，
 *   只有原来一条都找不到时才会往后多找。
 * ⚠ 这些卡**没有失联** —— 触达门禁（200 条命 × 2 种策略）证实它们仍发得出来。
 */
const find=(id,policy={},filter=()=>true)=>{for(let i=0;i<800;i++){const s=follow(createRun({seed:'万千道途-'+i}),id,policy);if(s&&filter(s))return s;}throw Error('自然规则未到达 '+id);};
const resolve=s=>{while(s.journey&&!s.journey.open&&s.phase==='life'&&!s.pending)advance(s,1);};
class Memory{data=new Map();getItem(k){return this.data.get(k)??null;}setItem(k,v){this.data.set(k,v);}}
test('出生自然分化且先天灵根没有因读书重抽',()=>{
 const types=new Set(),roots=new Set();for(let i=0;i<350;i++){const s=createRun({seed:'万千道途-'+i});types.add(s.birth.upbringing);roots.add(s.player.root);assert.equal(s.birth.goal,'free');validateRun(s);}assert.deepEqual([...types].sort(),['beast','demonic','loose','ordinary']);assert.equal(roots.size,Object.keys(ROOTS).length);
});
test('正式测灵根后录取结果与灵根等级相符，弱灵根可当杂役',()=>{
 /*
  * ⚠ 规则十二：录取结果**按灵根等级定**（`cultivation.js` 的 `admit` 分支）——
  *   五行杂灵根（grade 0）录取也是**杂役**，松骨灵根（grade 3）才是外门弟子。
  *   未显灵根（grade -1）**根本不走这张卡** ⇒ 走「药师再替你测一次」（root_review）。
  */
 for(const grade of [0,3]){const s=find('root_result',{path:'orthodox'},s=>ROOTS[s.player.root].grade===grade);choose(s,'join');resolve(s);assert.equal(s.life.cultivation.rank,grade===0?'杂役':'外门弟子');validateRun(s);}
 let review=null;for(let i=0;i<250&&!review;i++){const s=follow(createRun({seed:'万千道途-'+i}),'root_review',{path:'orthodox'});if(s&&ROOTS[s.player.root].grade===-1)review=s;}
 assert.ok(review,'未显灵根的人走的是「药师再测一次」，不是宗门录取那张卡');
 assert.ok(options(review).every(o=>!['join','servant'].includes(o.id)),'复核那张卡不给录取选项');
});
test('重心与路线查询只读；按实际月数练习，不能无限点击刷点',()=>{
 const s=find('first_method',{path:'loose'});choose(s,'array');resolve(s);const before=cloneRun(s);for(let i=0;i<20;i++){activityOptions(s);routeOptions(s);}assert.deepEqual(s,before);const root=s.player.root,skill=s.player.skills.array;setActivity(s,'study');assert.equal(s.player.skills.array,skill);advance(s,6);assert.ok(s.player.skills.array>skill);assert.equal(s.player.root,root);validateRun(s);
});
test('药田事故有实际处分，造假之后不能直接参加专业活动',()=>{
  const s=pendingCard('garden_accident');choose(s,'frame');assert.equal(s.life.cultivation.punishmentUntil,s.month+12);assert.equal(s.life.cultivation.activity,'work');assert.equal(activityOptions(s).find(a=>a.id==='sword').enabled,false);assert.throws(()=>setActivity(s,'sword'));validateRun(s);
});
test('目击者如实作证不承担他人点火的赔偿或禁闭',()=>{
  const s=pendingCard('garden_accident'),month=s.month,stones=s.player.stones,activity=s.life.cultivation.activity;
  choose(s,'honest');assert.equal(s.month,month);assert.equal(s.player.stones,stones);assert.equal(s.life.cultivation.activity,activity);assert.equal(s.life.cultivation.punishmentUntil,0);assert.ok(activityOptions(s).some(a=>a.enabled));assert.ok(!s.flags.unpaidGarden);validateRun(s);
});
test('外出不弹宗门考核现场，截止后返回不能补领成绩与奖励',()=>{
 const s=find('selection_1',{path:'orthodox',activity:'work'},s=>s.month<26*12&&s.player.stones>=14);choose(s,'array');const deadline=s.life.cultivation.exam.deadline,origin=currentContinent(s),target=routeOptions(s).find(p=>p.enabled);travelTo(s,target.id);resolve(s);
 /* ⚠ 故事重写 W1 后赶路途中有同门/章节卡待选 ⇒ 排空待选推进到截止之后，再断言「已过截止」。
  *    排空时避开多年计划与花钱项：指导卡选「维持现状」（闭关 4 年会把回程拖没），小满卡选送行（免费）。 */
 const drainPolicyOverride={r12_peer_xiaoman:'send'};
 for(let i=0;i<80&&s.month<=deadline&&s.phase==='life';i++){
  if(s.pending){
   const ev=s.pending.event;
   if(/^r12_direction_\d$/.test(ev)){choose(s,'continue');continue;}
   if(drainPolicyOverride[ev]){choose(s,drainPolicyOverride[ev]);continue;}
   choose(s,decide(s,{path:'orthodox',activity:'work'}).id);continue;
  }
  advance(s,1);
 }
 assert.ok(s.month>deadline);assert.equal(s.pending,null);assert.ok(s.life.cultivation.exam.preparation<=24);const returnRoute=routeOptions(s).find(p=>p.id===origin);assert.ok(returnRoute.enabled);travelTo(s,origin);resolve(s);assert.equal(s.pending.event,'selection_1_result');assert.equal(options(s).find(o=>o.id==='fair').enabled,false);assert.throws(()=>choose(s,'fair'));choose(s,'withdraw');assert.equal(s.life.cultivation.exam,null);validateRun(s);
});
test('突破需要实际闭关，独立记录在完成之月出现',()=>{
 /*
  * ⚠ 规则十二：冲关是**一次判定**（`story-rules12.js` 给它算 base/skill/insight）
  *   ⇒ 可能失败（失败只留旧伤，不掉体力）。
  *   ⇒ 这里验的是**机制**（闭关没满不能破境、记录出现在完成之月），
  *     再单独找一条真的成功的命，证明这条机制会真的把人送进炼气。
  */
 let passed=false;
 for(let i=0;i<250&&!passed;i++){
  const s=follow(createRun({seed:'万千道途-'+i}),'breakthrough_1_0',{path:'orthodox'});
  if(!s)continue;
  const tryOption=options(s).find(o=>o.id==='try');
  if(!tryOption||!tryOption.enabled)continue;
  const month=s.month;
  choose(s,'try');
  assert.equal(s.player.realm,0,'闭关没结束不能破境');
  advance(s,11);
  assert.equal(s.player.realm,0,'闭关没满十二个月不能破境');
  advance(s,1);
  if(s.phase!=='life')continue;
  assert.equal(s.month,month+12,'闭关整整十二个月');
  const record=s.journal.find(e=>e.kind==='breakthrough'&&e.month===s.month);
  if(s.player.realm===1){
   assert.ok(record,'突破记录出现在完成之月');
   passed=true;validateRun(s);
  }else{
   /* 冲关失败：只留旧伤、不掉体力（规则十二），也**没有**突破记录。 */
   assert.equal(record,undefined,'没破境就不该有突破记录');
  }
 }
 assert.ok(passed,'至少有一条人生真的冲关成功');
});
test('战事中止闭关会取消本次结果，继续守阵则恢复原剩余月份',()=>{
 const original=find('world_raid',{path:'loose',activity:'work'},s=>s.life.cultivation.suspended?.journey?.resolution?.event?.startsWith('breakthrough_'));
 const interrupted=original.life.cultivation.suspended.journey,tier=Number(interrupted.resolution.event.split('_')[1]),left=interrupted.to-original.month;
 const escaped=cloneRun(original);choose(escaped,'escape');assert.equal(escaped.life.cultivation.suspended,undefined);assert.equal(escaped.life.cultivation.attempts[tier],Number(interrupted.resolution.event.split('_')[2])+1);assert.equal(escaped.player.realm,original.player.realm);validateRun(escaped);
 const defended=cloneRun(original);choose(defended,'defend');assert.equal(defended.journey.resolution.event,interrupted.resolution.event);assert.equal(defended.journey.to-defended.month,left);assert.equal(defended.life.cultivation.attempts[tier],original.life.cultivation.attempts[tier]);advance(defended,left);assert.equal(defended.life.cultivation.attempts[tier],original.life.cultivation.attempts[tier]+1);assert.equal(defended.player.realm,interrupted.resolution.success?tier:original.player.realm);validateRun(defended);
});
test('旅行扣实际路费，抵达前地址不变，完成路线进入地图',()=>{
 const s=find('first_method',{path:'loose'},s=>s.player.stones>=3);choose(s,'array');resolve(s);const target=routeOptions(s).find(p=>p.enabled),origin=s.player.location,stones=s.player.stones;assert.ok(target);travelTo(s,target.id);assert.equal(s.player.stones,stones-target.fee);assert.equal(s.player.location,origin);advance(s,target.months-1);assert.equal(s.player.location,origin);advance(s,1);assert.equal(currentContinent(s),target.id);assert.deepEqual(s.life.cultivation.routes.at(-1),target.route);validateRun(s);
});
test('探险中的日常受限；主动撤出取消后续并保留已得物品',()=>{
 /*
  * ⚠ 规则十二：「留在谷口照看补给」（cautious）已经改成**主动退出**这条线
  *   （`content/story-shared.js` 给它加了 `stopChain`）⇒ 走它就没有探险可撤。
  *   ⇒ 这里走「随队进谷」（care），那条路才真的开一条探险。
  */
 const s=find('sect_trial_0',{path:'orthodox'});choose(s,'care');resolve(s);const inventory=[...s.inventory];assert.ok(s.life.cultivation.activeChain);assert.ok(activityOptions(s).every(a=>!a.enabled));const month=s.month;leaveExpedition(s);assert.equal(s.life.cultivation.activeChain,null);assert.deepEqual(s.inventory,inventory);assert.ok(!s.life.cultivation.queue.some(q=>q.event.startsWith('sect_trial_')));advance(s,6);assert.equal(s.month,month+6);validateRun(s);
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
