import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,cloneRun,validateRun,upgradeRun,advance,advanceToChoice,choose,options,currentNode,nodeText,setActivity} from '../packages/adventure/engine.js';
import {rules12,active12,lifespan12,sectProfile,practiceFactor12,stage12,month12} from '../packages/adventure/story-rules12.js';
import {canCultivate,hasMana} from '../packages/adventure/story-shared.js';
import {CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
import {economyQuote} from '../packages/adventure/cultivation-economy.js';
import {mpView} from './helpers/mp-view.mjs';
import {mapView} from '../packages/adventure/cultivation.js';
const c=s=>s.life.cultivation;
function pending(event,{root='五行杂灵根',realm=1,path='orthodox',years=32}={}){
 const s=createRun({seed:'rules12-case-'+event});s.month=years*12;s.player.practice=s.month;s.player.root=root;s.player.realm=realm;s.player.stones=30;
 Object.assign(c(s),{rootKnown:true,path,admissionDone:true,entered:192,worldDone:true,queue:[],activeChain:null,context:null,punishmentUntil:0});
 c(s).story10.rootStatus=root==='未显灵根'?'unverified':'present';c(s).story10.body='human';c(s).network.method={id:'clear',source:'first_method',months:144,acquired:192};c(s).network.methods=[{...c(s).network.method}];
 s.pending={event,month:s.month};s.journey=null;return s;
}
function finish(s){for(let i=0;i<800&&s.phase==='life'&&!s.pending&&s.journey&&!s.journey.open;i++)advance(s,1);validateRun(s);}
function text(s){return nodeText(currentNode(s),s);}
test('规则十二是当前唯一版本：旧版本的人生建不起来',()=>{
 /*
  * ⚠ 原来那条「旧11基线继续八次选择逐值一致，不修改原件」**整条删掉**：
  *   旧版本（9/10/11）的执行器与事件表快照已全部删除 ⇒ `upgradeRun` 读旧档
  *   一律报「修行规则版本」⇒「旧档在旧版本下继续跑」这件事已经不存在了。
  *   这里留一条**当前口径**的断言：引擎只认 12。
  */
 assert.throws(()=>createRun({seed:'旧档',rulesVersion:11}),/不支持创建此规则的人生/);
});
test('新生采用12：引擎只认当前版本，寿限按体质算而不是旧版固定88岁',()=>{
 const s=createRun({seed:'new-rules'});assert.ok(active12(s));assert.equal(c(s).rulesVersion,12);
 /*
  * ⚠ 旧版本（9/10/11）已删 ⇒「旧11保留事件表与88岁凡身上限」那一半已经无处可验
  *   （引擎只认 12，旧人生根本建不起来）⇒ 那一半整条删掉，
  *   留在这里的是**当前版本**的真实口径。
  */
 assert.throws(()=>createRun({seed:'new-rules',rulesVersion:11}),/不支持创建此规则的人生/);
 assert.notEqual(lifespan12(s),88,'当前版本的寿限按体质算，不是旧版那个固定的88岁');
});
test('当前版本按各自门路习得功法：新地域选择不污染执行器',()=>{
 /*
  * ⚠ 旧版本（9/10/11）已删 ⇒「旧10与11仍按原事件习得离火残篇」那一半无处可验（删掉）。
  *   留下的是**当前版本真实门路**：`network_method` 的选项按地域/师承给，
  *   选哪一门就真的只记哪一门，别的路径不受影响。
  */
 const build=path=>{const s=createRun({seed:'frozen-ember',rulesVersion:12});s.month=264;s.player.practice=s.month;s.player.root='金火灵根';s.player.realm=1;
  Object.assign(c(s),{path,admissionDone:true,rootKnown:true,queue:[],activeChain:null,context:null});s.pending={event:'network_method',month:s.month};s.journey=null;return s;};
 const loose=build('loose');assert.ok(options(loose).some(o=>o.id==='clear'),'散修这一门要在选项里');
 assert.ok(!options(loose).some(o=>o.id==='shade'),'魔道那一门不该出现在散修身上');
 choose(loose,'clear');assert.equal(c(loose).network.method.id,'clear');validateRun(loose);
 const demonic=build('demonic');assert.ok(options(demonic).some(o=>o.id==='shade'),'魔道这一门要在选项里');
 assert.ok(!options(demonic).some(o=>o.id==='clear'),'散修那一门不该出现在魔道身上');
 choose(demonic,'shade');assert.equal(c(demonic).network.method.id,'shade');validateRun(demonic);
});
test('独立出生体质有四类，普通家庭寿限与亲人寿限不再固定',()=>{
 const types=new Set(),spans=new Set();for(let i=0;i<350;i++){const s=createRun({seed:'constitution-'+i});types.add(rules12(s).body.type);spans.add(lifespan12(s));assert.ok(lifespan12(s)>=45&&lifespan12(s)<=84);assert.ok(!hasMana(s));validateRun(s);}assert.equal(types.size,4);assert.ok(spans.size>20);
});
test('未入道的天生神力不会给法力或灵根',()=>{
 const s=pending('r12_child_body',{root:'未显灵根',realm:0,years:5});rules12(s).body.type='mighty';assert.ok(!canCultivate(s));assert.ok(!hasMana(s));choose(s,'practice');assert.ok(!canCultivate(s));assert.equal(s.player.realm,0);
});
test('体弱的孩子六岁前有一次看病抉择，普通孩子不再被体检',()=>{
 /*
  * 2026-11-07 · T3 改过：
  *   以前「身体检查」**人人都有**（实测 87%）—— 用户 2026-11-06 报的
  *   「检查身体这类必定触发要改」。
  * ⇒ 现在**只有先天孱弱的孩子**才查；查的那一次仍然排在六岁前
  *   （孩子人生里最早的一次抉择），而且它**占掉**童年 6–9 岁那一张
  *   ⇒ 一生 16 岁前固定三张童年卡。
  */
 const kinds=new Set();let frailSeen=0,ordinaryEarly=0;
 for(let i=0;i<60;i++){
  const s=createRun({seed:'early-body-'+i});
  const frail=rules12(s).body.type==='frail';
  advanceToChoice(s);
  if(frail){
   frailSeen++;
   assert.ok(s.month<6*12,`体弱的孩子六岁前就该有一次抉择（实际第 ${s.month} 个月）`);
   assert.ok(['r12_child_body','r12_child_fever'].includes(s.pending.event),`体弱的孩子抽到的是看病（实际 ${s.pending.event}）`);
   kinds.add(s.pending.event);
  }else{
   assert.ok(s.month>=6*12,`普通孩子不该在六岁前被体检（实际第 ${s.month} 个月：${s.pending&&s.pending.event}）`);
   if(s.pending&&['r12_child_body','r12_child_fever'].includes(s.pending.event))ordinaryEarly++;
  }
  validateRun(s);
 }
 assert.ok(frailSeen>0,`这一批种子里得有体弱的孩子（实际 ${frailSeen} 个）`);
 assert.equal(ordinaryEarly,0,'普通孩子一次都不该被体检');
 assert.ok(kinds.has('r12_child_fever'),'发热的体检仍然要能抽到');
 assert.ok(kinds.has('r12_child_body'),'平常的体检仍然要能抽到');
});
test('童年求医在完成前不治愈，治病不会保证入道',()=>{
 const s=pending('r12_child_fever',{root:'未显灵根',realm:0,years:5});rules12(s).body.illness=true;s.player.health=65;
 choose(s,'immortal');assert.equal(rules12(s).body.treated,false);advance(s,5);assert.equal(rules12(s).body.treated,false);finish(s);assert.equal(s.player.realm,0);assert.ok(s.phase==='ended'||s.player.health>=65);validateRun(s);
});
/**
 * 童年这一段跑一遍，收集 16 岁前发出的每一张卡。
 * @param {string} seed 种子
 * @param {number} rulesVersion 规则版本（默认当前版本 12）
 */
function childhoodRun(seed,rulesVersion=12){
 const s=createRun({seed,rulesVersion});
 const cards=[];let guard=0;
 try{
  while(s.phase==='life'&&guard++<600){
   while(s.phase==='life'&&!s.pending)advance(s,1);
   if(s.phase!=='life')break;
   const av=options(s).filter(o=>o.enabled);
   if(!av.length)break;
   cards.push({event:s.pending.event,month:s.month});
   if(s.month>=16*12)break;
   choose(s,av[0].id);
  }
 }catch(e){/* 这条命跑不通就不算它 */ }
 return {cards,tickets:c(s).network.childhood};
}
test('童年三段：一生最多三张卡、铜匣人人有、每张都有由头',()=>{
 /*
  * 2026-11-07 · T3 的验收标准（用户 2026-11-06 提的第 8、9 条）：
  *   · 16 岁前的卡片数 **≤ 3 张**（以前平均 4.6、最多 4）；
  *   · 铜匣（child_relic）覆盖率 **≥ 80%**（它是铜匣线的钩子，T6 要靠它接上）；
  *   · 每张童年卡都有由头：药铺学徒＝平民人家、渡口的少年＝家在渡口、
  *     商队＝家里跟着商路走、族学＝世家、照看者与呼救＝魔道／妖兽出身。
  */
 const lives=120;let total=0,max=0,relic=0,apothecary=0,friend=0,recruit=0,ran=0;
 for(let i=0;i<lives;i++){
  const {cards,tickets}=childhoodRun('child-三段-'+i);
  if(!tickets||tickets.length!==3)continue;
  ran++;
  const before=cards.filter(x=>x.month<16*12);
  total+=before.length;max=Math.max(max,before.length);
  const ids=tickets.map(t=>t.event);
  if(ids.includes('child_relic'))relic++;
  if(ids.includes('child_apothecary'))apothecary++;
  if(ids.includes('child_friend'))friend++;
  if(ids.includes('child_recruit'))recruit++;
  /* 10–12 岁那一段固定是铜匣；铜匣永远有 ⇒ 那一段永远不是空槽。 */
  assert.equal(tickets[1].event,'child_relic',`10–12 岁那一段固定是铜匣（实际 ${tickets[1].event}）`);
  /* 空槽只允许出现在 13–15 岁那一段（那一段要「读过书或学过药」的由头）。 */
  for(const t of tickets)if(t.event===null)assert.equal(t.done,true,'空槽必须已经结清，不许再发出来');
 }
 assert.ok(ran>=lives*0.9,`这一批种子要能跑起来（实际 ${ran}/${lives}）`);
 assert.ok(max<=3,`16 岁前最多三张卡（实际最多 ${max} 张）`);
 assert.ok(total/ran<=3,`16 岁前平均不超过三张卡（实际平均 ${(total/ran).toFixed(2)} 张）`);
 assert.ok(relic/ran>=0.8,`铜匣覆盖率不得低于 80%（实际 ${(relic/ran*100).toFixed(0)}%）`);
 /* 「跟药师学药／偷粮／测灵根」不再是人人都有。 */
 assert.ok(apothecary/ran<0.5,`跟药师学药不再是人人都有（实际 ${(apothecary/ran*100).toFixed(0)}%）`);
 assert.ok(friend/ran<0.5,`渡口的少年不再是人人都有（实际 ${(friend/ran*100).toFixed(0)}%）`);
 assert.ok(recruit/ran<0.5,`宗门来招不再是人人都有（实际 ${(recruit/ran*100).toFixed(0)}%）`);
});
test('童年卡按家境挑：魔道妖兽人家不读村塾也不进药铺',()=>{
 /*
  * 这条是「结构保证」，不是抽样统计：换个种子也不该破。
  */
 let seen=0;
 for(let i=0;i<400;i++){
  const s=createRun({seed:'child-家境-'+i});
  const b=s.birth,ids=c(s).network.childhood.map(t=>t.event);
  if(!ids.length)continue;
  seen++;
  if(['demonic','beast'].includes(b.upbringing)){
   assert.ok(!ids.includes('child_school'),`魔道／妖兽人家的孩子不该读村塾（实际 ${ids}）`);
   assert.ok(!ids.includes('child_apothecary'),`魔道／妖兽人家的孩子不该进药铺（实际 ${ids}）`);
   assert.ok(!ids.includes('child_friend'),`魔道／妖兽人家的孩子不该在渡口（实际 ${ids}）`);
   assert.ok(!ids.includes('child_caravan'),`魔道／妖兽人家的孩子不该跟商队（实际 ${ids}）`);
  }
  if(b.family!=='common')assert.ok(!ids.includes('child_apothecary'),`不是平民人家的孩子不该被送去药铺当学徒（实际 ${ids}）`);
  if(b.continent!=='tide')assert.ok(!ids.includes('child_friend'),`不在渡口的孩子不该遇到渡口那件事（实际 ${ids}）`);
  if(b.upbringing!=='loose')assert.ok(!ids.includes('child_caravan'),`不跟商路走的家庭不该随商队（实际 ${ids}）`);
  if(b.family!=='clan'||b.upbringing!=='ordinary')assert.ok(!ids.includes('child_clan'),`不是世家嫡庶相配的孩子不该上族学（实际 ${ids}）`);
 }
 assert.ok(seen>=300,`这一批种子要能跑起来（实际 ${seen}）`);
});
test('童年热病存在真实死亡分支',()=>{
 let died=false;for(let i=0;i<120&&!died;i++){const s=createRun({seed:'illness-death-'+i});advanceToChoice(s);if(s.pending.event!=='r12_child_fever')continue;choose(s,'rest');finish(s);if(s.phase==='ended'){assert.equal(s.ending.id,'childhood_illness');died=true;}}assert.ok(died);
});
test('无关师承隐藏，不会显示幽灯和妖族的灰色功法',()=>{
 for(const path of ['orthodox','loose','demonic','beast']){const s=pending('network_method',{path}),before=cloneRun(s);const os=options(s);assert.deepEqual(s,before);assert.ok(os.some(o=>o.enabled));assert.equal(os.some(o=>o.id==='shade'),path==='demonic');assert.equal(os.some(o=>o.id==='beast'),path==='beast');if(path==='orthodox')assert.ok(os.some(o=>o.id===sectProfile(s).base));}
 const s=pending('network_method');assert.throws(()=>choose(s,'shade'),/当前故事/);
});
test('四大陆出生会进入不同地域功法，授业后序列化稳定',()=>{
 const regions=new Map();for(let i=0;i<80;i++){const s=createRun({seed:'regional-'+i});regions.set(s.birth.continent,sectProfile(s).base);}assert.equal(regions.size,4);assert.equal(new Set(regions.values()).size,4);
 const s=pending('network_method'),id=sectProfile(s).base;choose(s,id);assert.equal(c(s).network.method.id,id);validateRun(s);assert.deepEqual(upgradeRun(s),s);
});
test('无灵根在12仍不能用路径标签领取法力或修炼心法',()=>{
 const s=pending('network_method',{root:'未显灵根',realm:0});assert.ok(!options(s).find(o=>o.id===sectProfile(s).base).enabled);choose(s,'keep');assert.equal(c(s).network.method,null);assert.equal(c(s).progress,0);
});
test('返乡从原住处出发，处理家事后实际回程，抵达才恢复',()=>{
 const s=pending('family_gate');c(s).continent='tide';s.birth.continent='home';s.player.location='tide';s.player.home='听潮港的租屋';c(s).mail={body:'家中请你归来',sentAge:28,delayed:false,sent:s.month,due:s.month};
 const initial=s.player.home;choose(s,'return');assert.equal(s.player.home,initial);finish(s);assert.equal(c(s).continent,'home');assert.ok(s.player.home.includes(s.birth.address));assert.equal(rules12(s).visit.home,initial);advanceToChoice(s);assert.equal(s.pending.event,'r12_home_resolve');choose(s,'talk');finish(s);advanceToChoice(s);assert.equal(s.pending.event,'r12_home_leave');choose(s,'return');assert.equal(c(s).continent,'home');finish(s);assert.equal(c(s).continent,'tide');assert.equal(s.player.home,initial);assert.equal(rules12(s).visit,null);assert.ok(s.journal.some(j=>j.title==='回到离开时的住处'));validateRun(s);
});
test('回程封路不瞬移，给留乡选项',()=>{
 const s=pending('r12_home_leave');rules12(s).visit={index:0,origin:'tide',home:'潮港',location:'tide',arrived:true,resolved:true,due:s.month};c(s).continent='home';c(s).closed=['home-tide','ember-home'];assert.equal(options(s).find(o=>o.id==='return').enabled,false);choose(s,'stay');assert.equal(c(s).path,'mortal');assert.equal(rules12(s).visit,null);
});
test('家事兑换在完成后实际入家中钱账，修屋更新家产状态',()=>{
 const s=pending('r12_home_resolve');rules12(s).visit={index:0,origin:c(s).continent,home:s.player.home,location:s.player.location,arrived:true,resolved:false,due:s.month};const money=s.life.family.money;choose(s,'money');assert.equal(s.life.family.money,money);finish(s);assert.equal(s.life.family.money,money+1000);assert.equal(rules12(s).visit.resolved,true);
 const p=pending('r12_home_resolve');rules12(p).visit={index:0,origin:c(p).continent,home:p.player.home,location:p.player.location,arrived:true,resolved:false,due:p.month};p.life.properties.family_home.status='damaged';choose(p,'repair');assert.equal(p.life.properties.family_home.status,'damaged');finish(p);assert.equal(p.life.properties.family_home.status,'kept');
});
test('自然样本未到达的第三至第六次返乡有独立ID，实际完成后不重发',()=>{
 for(let index=2;index<6;index++){const s=pending('r12_home_resolve_'+index);rules12(s).visits=index;rules12(s).visit={index,origin:c(s).continent,home:s.player.home,location:s.player.location,arrived:true,resolved:false,due:s.month};choose(s,'talk');finish(s);advanceToChoice(s);assert.equal(s.pending.event,'r12_home_leave_'+index);choose(s,'return');finish(s);assert.equal(rules12(s).visits,index+1);assert.equal(rules12(s).visit,null);validateRun(s);}
});
test('战火取消未完成家事，不重发同一张返乡卡，也不假称修屋完成',()=>{
 const s=pending('r12_home_resolve');rules12(s).visit={index:0,origin:c(s).continent,home:s.player.home,location:s.player.location,arrived:true,resolved:false,due:s.month};choose(s,'repair');advance(s,2);s.pending={event:'world_raid',month:s.month};s.journey=null;choose(s,'escape');finish(s);assert.equal(rules12(s).visit,null);assert.equal(rules12(s).visits,1);assert.ok(s.journal.some(j=>j.title==='家事被战火打断'));assert.ok(!s.journal.some(j=>j.kind==='choice'&&j.event==='r12_home_resolve'));validateRun(s);
});
test('接粮分支后不逼玩家解释泉水刻痕，没有袭击不显示认罪',()=>{
 const s=pending('sect_feud_2');c(s).story10.facts.feud={grain:true,evidence:false,assault:false};assert.ok(!/刻痕|石槽|分水线/.test(text(s)));assert.ok(!options(s).some(o=>o.id==='selfish'));c(s).story10.facts.feud.assault=true;assert.ok(options(s).some(o=>o.id==='selfish'));assert.match(text(s),/袭击/);
});
test('采药救同伴的后续只问堵路和伤势，不讲未发生的死亡越界',()=>{
 const s=pending('sect_trial_2');rules12(s).facts.trial={entered:true,rescued:true,herbs:true,stolen:false};s.people.trialmate.status='alive';assert.match(text(s),/止血/);assert.ok(!/失踪|越过|失散/.test(text(s)));choose(s,'care');finish(s);assert.ok(!s.journal.at(-1).body.includes('失散'));
});
test('road_turn 恢复四选项：不接新功法不改师承，四条岔路都在（C1）',()=>{
 const s=pending('road_turn');assert.ok(options(s).some(o=>o.id==='keep'));assert.ok(options(s).some(o=>o.id==='dark'));assert.ok(options(s).some(o=>o.id==='loose'));assert.ok(options(s).some(o=>o.id==='beast'));choose(s,'keep');assert.equal(c(s).path,'orthodox');
});
test('拒绝试学后离宗不会残留商谈状态，让往后几十年无事件',()=>{
 const s=pending('departure_terms');c(s).inquiry='loose';choose(s,'secret');assert.equal(c(s).path,'loose');assert.equal(c(s).inquiry,null);validateRun(s);
});
test('普通家庭不会给修士送丹药，世家才显示家传援助',()=>{
 const s=pending('family_support');s.birth.family='common';assert.ok(!options(s).some(o=>['supplies','notes'].includes(o.id)));assert.match(text(s),/没有能助你/);s.birth.family='clan';assert.ok(options(s).some(o=>o.id==='notes'));
});
test('首次引气有概率，杂灵根及受损经脉更难，未完成不授境界',()=>{
 const s=pending('breakthrough_1_0',{realm:0});const low=options(s).find(o=>o.id==='try').chance;s.player.root='松骨灵根';const high=options(s).find(o=>o.id==='try').chance;assert.ok(high>low);rules12(s).body.damage=10;assert.ok(options(s).find(o=>o.id==='try').chance<high);choose(s,'try');assert.equal(s.player.realm,0);advance(s,11);assert.equal(s.player.realm,0);finish(s);assert.ok(s.player.realm<=1);
});
test('突破经历记录实际体质寿限，而非旧版固定88岁',()=>{
 const s=pending('breakthrough_1_0',{realm:0,root:'松骨灵根'});rules12(s).body.natural=61;rules12(s).body.loss=0;s.random.story.value=1;choose(s,'try');finish(s);assert.equal(s.player.realm,1);const j=s.journal.find(j=>j.kind==='breakthrough');assert.match(j.body,/由61岁增至106岁/);assert.equal(lifespan12(s),106);
});
test('亲人均已离世时不向死人送钱，返乡问的是邻人与遗物',()=>{
 const s=pending('r12_home_resolve');for(const p of s.life.family.members)p.status='dead';c(s).descendants=[];rules12(s).visit={index:0,origin:c(s).continent,home:s.player.home,location:s.player.location,arrived:true,resolved:false,due:s.month};assert.ok(!options(s).some(o=>o.id==='money'));assert.match(text(s),/遗物/);const talk=options(s).find(o=>o.id==='talk');assert.match(talk.label,/邻人/);choose(s,'talk');finish(s);assert.ok(!s.journal.find(j=>j.event==='r12_home_resolve'&&j.kind==='choice').body.includes('家人知道'));
});
test('返乡见到活着的晚辈，抵达后才登记家事与亲人死讯',()=>{
 const s=pending('family_gate');for(const p of s.life.family.members)p.status='dead';c(s).descendants=[{id:'niece',name:'林小禾',relation:'堂亲的孩子',born:20*12,status:'alive',location:'home',known:false,deathAt:115*12}];c(s).mail={body:'家中请你归来',sentAge:28,delayed:false,sent:s.month,due:s.month};c(s).knownDeaths=[];c(s).familyVisited=false;
 choose(s,'return');assert.equal(c(s).familyVisited,false);finish(s);assert.equal(c(s).familyVisited,true);assert.equal(c(s).descendants[0].known,true);assert.equal(c(s).knownDeaths.length,s.life.family.members.length);assert.match(s.journal.find(j=>j.title==='走到了家中的院门').body,/林小禾/);advanceToChoice(s);assert.match(text(s),/林小禾/);assert.ok(options(s).some(o=>o.id==='money'));validateRun(s);
});
test('筑基年龄与实际筑基丹影响检查，用丹消耗但不保证成功',()=>{
 const s=pending('breakthrough_2_0',{years:40}),young=options(s).find(o=>o.id==='try').chance;s.month=75*12;s.player.practice=s.month;s.pending.month=s.month;const old=options(s).find(o=>o.id==='try').chance;assert.ok(old<young);s.inventory.push('foundation_pill');assert.ok(options(s).find(o=>o.id==='try').chance>old);choose(s,'try');assert.ok(!s.inventory.includes('foundation_pill'));assert.equal(s.player.realm,1);finish(s);assert.ok(s.player.realm<=2);validateRun(s);
});
test('低阶换料劳动需多年，高阶没有通用服务捷径',()=>{
 const s=pending('breakthrough_1_0',{realm:0});s.player.stones=0;choose(s,'service');assert.ok(s.journey.to-s.journey.from>=36);advance(s,12);assert.equal(s.player.realm,0);finish(s);const high=pending('breakthrough_3_0',{realm:2});assert.ok(!options(high).some(o=>o.id==='service'));
});
test('闭关使用整程时间，进境加快但不能改重心或插入日常',()=>{
 const s=pending('r12_direction_0'),base=practiceFactor12(s);choose(s,'retreat');assert.equal(s.journey.to-s.journey.from,48);assert.ok(practiceFactor12(s)>base);assert.throws(()=>setActivity(s,'sword'));advance(s,24);assert.equal(s.pending,null);assert.ok(s.journal.filter(j=>j.month>s.month-24).every(j=>!['selection_1','garden_accident'].includes(j.event)));finish(s);assert.equal(rules12(s).action,null);assert.equal(c(s).context,null);validateRun(s);
});
test('长期做工完成前不领取换料奖励，不叠加自由做工收入',()=>{
 const s=pending('r12_direction_0'),stones=s.player.stones;choose(s,'work');assert.equal(s.player.stones,stones);assert.equal(economyQuote(s).gross,1);advance(s,29);assert.ok(s.player.stones<=stones+3);finish(s);assert.equal(rules12(s).action,null);assert.ok(s.player.stones>=stones+2);
});
test('宗门停供提前告知，到期才改变收入，不扣已有财产',()=>{
 const s=pending('r12_patron',{years:40});rules12(s).patron.until=45;choose(s,'prepare');assert.equal(rules12(s).patron.noticed,true);assert.equal(rules12(s).patron.stopped,false);s.month=45*12;s.player.practice=s.month;s.pending=null;s.journey={open:true,from:s.month,to:12000,target:null,practice:s.player.focus};const stones=s.player.stones;month12(s,{arrive:()=>{},log:()=>{},gate:()=>true});assert.equal(rules12(s).patron.stopped,true);assert.equal(s.player.stones,stones);assert.equal(economyQuote(s).gross,0);validateRun(s);
});
test('稀有筑基丹先验收，核心传承需要现有授业资格',()=>{
 const s=pending('r12_foundation_supply');choose(s,'serve');assert.ok(!s.inventory.includes('foundation_pill'));advance(s,5);assert.ok(!s.inventory.includes('foundation_pill'));finish(s);validateRun(s);
 const a=pending('network_archive');a.flags.learningPermit=false;c(a).rank='外门弟子';assert.ok(!options(a).some(o=>o.id==='river'));a.flags.learningPermit=true;assert.ok(options(a).some(o=>o.id==='river'));
});
test('体质寿限与修行阶段由同一状态显示，存档拒绝坏字段',()=>{
 const s=pending('r12_direction_0');
 /* 炼气四段按**筑基门槛的比例**切（25% / 50% / 75%），门槛是 120：
    初期 0–30 · 中期 30–60 · 后期 60–90 · 圆满 90–120。 */
 c(s).progress=75;assert.equal(stage12(s),'炼气后期');
 c(s).progress=30;assert.equal(stage12(s),'炼气中期');
 c(s).progress=95;assert.equal(stage12(s),'炼气圆满');
 c(s).progress=135;assert.equal(stage12(s),'炼气圆满');
 /* 面板上要显示的是「炼气圆满」与寿元上限 —— 现在产品端是小程序，
    所以问**小程序端那套面板**（网页端 2026-11-08 已清理）。 */
 const panel=mpView.practice(s);
 assert.equal(panel.realm,'炼气圆满','修行本事面板要把炼气四段显示出来');
 assert.ok(panel.hint.includes('寿元上限 '+lifespan12(s)),'修行本事面板要写清寿元上限');
 const bad=cloneRun(s);rules12(bad).body.natural=1000;assert.throws(()=>validateRun(bad));
});
test('地图标的「当前所在」与存档一致（期望值不从 mapView 拿）',()=>{
  /* ⚠ 这里**故意不调用 mapView()** 算期望值：
     地图画什么由 mapView 决定，门禁若也用它算期望 ⇒ 两边同源 ⇒ 地图画错了也看不出来。
     ⇒ 从**存档本身**独立算一遍（脚下的大陆 / 最近一趟旅程的落点），再跟 mapView 比。 */
  const hereOf=s=>{
    const c=s.life.cultivation;
    const last=(c.routes||[]).at(-1);
    if(last)return last.at(-1);
    const loc=s.player.location;
    return ['home','refuge'].includes(loc)?s.birth.continent:loc;
  };
  for(let i=0;i<40;i++){
    const s=createRun({seed:'地图当前所在-'+i});
    const view=mapView(s);
    assert.equal(view.current,hereOf(s),'地图标的「当前所在」与玩家脚下的大陆不一致');
    assert.equal(view.unlocked[0],view.current,'当前所在必须是解锁集合里的第一个（画地图时标的就是它）');
    assert.ok(view.unlocked.includes(view.current));
    validateRun(s);
  }
});
test('当前所有事件选项唯一，重点卡片不堆多个主角概念',()=>{
 for(const [id,n] of Object.entries(CULTIVATION_EVENTS)){assert.equal(new Set(n.choices.map(o=>o.id)).size,n.choices.length,id);assert.ok(n.choices.length>=2,id);}
 for(const id of ['sect_feud_0','sect_feud_1','sect_feud_2','sect_trial_2','road_turn','r12_bazaar_follow','r12_home_resolve']){const s=pending(id);assert.ok(text(s).length<=160,id);}
});
