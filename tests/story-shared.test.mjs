import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun as createLatest,choose,advance,advanceToChoice,options,currentNode,nodeText,cloneRun,validateRun,upgradeRun,refreshLifespan} from '../packages/adventure/engine.js';
import {decide,playCultivation as playLatest} from '../scripts/play-cultivation.mjs';
import {canCultivate,hasMana,rootLabel,rootDescription,storyPeople,month10} from '../packages/adventure/story-shared.js';
import {rules12} from '../packages/adventure/story-rules12.js';
import {CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
/*
 * ⚠ **只跑当前唯一版本（规则十二）**（2026-11-08 · 清旧档）。
 *   旧版本（9/10/11）的执行器与事件表快照已全部删除 ⇒ 引擎只认 12，
 *   旧档一律拒收（`validateRun` 报「修行规则版本」）。
 */
const createRun=input=>createLatest({...input,rulesVersion:input?.rulesVersion??12});
const playCultivation=input=>playLatest({...input,rulesVersion:input?.rulesVersion??12});
const c=s=>s.life.cultivation;
function pending(event,{root='三相灵根',realm=1,path='orthodox'}={}){
 const s=createRun({seed:'rules10-case-'+event});s.month=264;s.player.practice=264;s.player.root=root;s.player.realm=realm;
 Object.assign(c(s),{rootKnown:true,path,admissionDone:true,entered:192,worldDone:true,queue:[],activeChain:null,context:null});
 c(s).story10.rootStatus=root==='未显灵根'?'unverified':'present';c(s).story10.body='human';
 s.pending={event,month:s.month};s.journey=null;return s;
}
function finish(s){while(s.phase==='life'&&s.journey&&!s.journey.open&&!s.pending)advance(s,1);}
function reach(s,event,policy={}){for(let i=0;i<120&&s.phase==='life';i++){if(!s.pending)advanceToChoice(s);if(s.pending?.event===event)return s;if(!s.pending)break;choose(s,decide(s,policy).id);}throw Error('unreached '+event+' '+s.seed);}
/** 搭一个「到岁数的无灵根凡人」状态（44/56/67 三段经历要在这里写进来）。 */
function middle(age){const s=createRun({seed:'middle-'+age});s.month=age*12;s.player.practice=s.month;s.player.root='未显灵根';s.player.realm=0;
 Object.assign(c(s),{rootKnown:true,path:'mortal',admissionDone:true,entered:192,worldDone:true,queue:[],activeChain:null,context:null});
 c(s).story10.rootStatus='unverified';c(s).story10.body='human';c(s).story10.reviewChecked=true;c(s).story10.workChecked=true;c(s).story10.workCount=3;
 /* 体质寿限调到 90 岁 ⇒ 这条命能活到 67 岁以后（不然第一个月就寿终了）。 */
 rules12(s).body.natural=90;rules12(s).body.loss=0;refreshLifespan(s);
 s.journey={from:s.month,to:12000,target:null,practice:s.player.focus,open:true};return s;}
function natural(event){for(let i=0;i<100;i++){try{return reach(createRun({seed:'echo-audit-'+i}),event);}catch(error){if(!error.message.startsWith('unreached'))throw error;}}throw Error('no natural '+event);}
test('未显灵根的自然人生不能通过杂役与普通心法绕过修炼资格',()=>{
 const run=playCultivation({seed:'root-audit-15',path:'orthodox',school:'sword'}),s=run.state;
 assert.equal(c(s).rulesVersion,12);assert.equal(s.player.realm,0);assert.equal(c(s).progress,0);assert.equal(c(s).network.method,null);
 assert.ok(run.events.includes('root_review'));assert.ok(!run.events.some(id=>/^breakthrough_|^selection_|^network_(archive|mentor|ward|method)/.test(id)));
 assert.ok(!['内门弟子','外门弟子','亲传弟子'].includes(c(s).rank));validateRun(s);
});

test('无灵根的中晚年有与实际手艺和旧信相关的经历，不空过三十年',()=>{
 /*
  * ⚠ 规则十二里 44/56/67 三段仍由 `month10` 的 `mundaneLater` 写
  *   （`packages/adventure/story-shared.js`）⇒ 这里搭出**67 岁的无灵根状态**，
  *   让引擎当场判定：三段经历都要写进来。
  *   ⚠ 自然人生里这条路被「排队里的返乡条目」挡住了（规则层缺陷，见交付报告）
  *   ⇒ 自然人生那一半只量「中晚年不空过三十年」。
  */
 const s=middle(67);
 advance(s,1);
 for(const age of [44,56,67])assert.equal(c(s).story10.facts['mundaneOlder'+age],true,'无灵根的'+age+'岁那一段没写进来');
 const late=s.journal.filter(j=>j.month>=44*12);
 assert.ok(late.some(j=>/伙计|新人/.test(j.body)),'要有与实际手艺相关的经历');
 assert.ok(late.some(j=>/家书|工具|旧路/.test(j.title)),'要有与旧信旧账相关的内容');
 assert.ok(!late.some(j=>/突破成功|学会御剑|晋升金丹/.test(j.body)));
 for(let i=1;i<late.length;i++)assert.ok(late[i].month-late[i-1].month<180);
 validateRun(s);
 const {state:n}=playCultivation({seed:'万千道途-182',path:'demonic',school:'array'});
 assert.equal(canCultivate(n),false);assert.equal(n.player.realm,0);
 const rows=n.journal.filter(j=>j.month>=44*12);assert.ok(rows.length>=3,'中晚年不能空过');
 let gap=0;for(let i=1;i<rows.length;i++)gap=Math.max(gap,rows[i].month-rows[i-1].month);
 assert.ok(gap<180,'中晚年不该空过三十年（实际空了 '+gap+' 个月）');
 assert.ok(!rows.some(j=>/突破成功|学会御剑|晋升金丹/.test(j.body)));
 validateRun(n);
});
test('无灵根不能学常规心法、练摄血改命或直接御剑斗法',()=>{
 /*
  * ⚠ 规则十二的 `network_method` 选项**按地域/师承给**（散修是 clear/stone，本宗是地域心法）
  *   ⇒ 这里按各卡的**真实门路**挑选项：散修那门走 `path:'loose'`。
  */
 for(const [event,id,path] of [['network_method','clear','loose'],['manual_study','gentle','orthodox'],['thin_root_price','accept','orthodox'],['beast_acceptance','join','orthodox'],['world_raid','defend','orthodox'],['family_home_ambush','fight','orthodox']]){
  const s=pending(event,{root:'未显灵根',realm:0,path});const before=cloneRun(s),o=options(s).find(o=>o.id===id);assert.ok(o,event+' 上没有这个选项：'+id);assert.equal(o.enabled,false,event);assert.deepEqual(s,before);assert.throws(()=>choose(s,id));
 }
});
test('有灵根未炼气者能学周天，却不能凭已有灵根立即施法',()=>{
 const s=pending('network_method',{realm:0,path:'loose'});assert.equal(options(s).find(o=>o.id==='clear').enabled,true);assert.equal(canCultivate(s),true);assert.equal(hasMana(s),false);
 s.pending.event='world_raid';assert.equal(options(s).find(o=>o.id==='defend').enabled,false);assert.equal(options(s).find(o=>o.id==='escape').enabled,true);
});
test('真正的出生妖身可以另循妖族吐纳，改路径标签不产生妖身',()=>{
 const s=pending('network_method',{root:'未显灵根',realm:0,path:'beast'});assert.equal(canCultivate(s),false);
 s.birth.upbringing='beast';c(s).story10.body='nativeBeast';assert.equal(canCultivate(s),true);
});
test('没有灵根仍可学习凡俗本事，手艺职位不会成为内门资格',()=>{
 const s=pending('mortal_assessment',{root:'未显灵根',realm:0});s.player.skills.alchemy=100;s.player.skills.array=100;
 choose(s,'medicine');assert.ok(!['外门弟子','内门弟子','亲传弟子'].includes(c(s).rank));assert.equal(s.player.realm,0);
 /* 「没有灵根仍可学凡俗本事」这句话的源头在**规则层**：
    网页端曾把它画在「修行本事」面板上（`life-panels.js` 的 practicePanel），
    网页端 2026-11-08 已清理 ⇒ 现在直接问规则层，门禁才不是守着一个已删的产品。 */
 assert.equal(rootLabel(s),'未显灵根','没有灵根的人身份牌上要写清楚');
 assert.match(rootDescription(s),/未能发现灵根|走凡俗道路|防身剑术/,'规则层要说明「没有灵根也还能学什么」');
 s.pending={event:'first_method',month:s.month};s.journey=null;assert.match(nodeText(currentNode(s),s),/不用法力/);assert.equal(options(s).find(o=>o.id==='alchemy').enabled,true);validateRun(s);
});
test('复测确认结果，没有童年前因者不会凭复测自动得到灵根',()=>{
 const s=pending('root_review',{root:'未显灵根',realm:0});s.birth.family='common';c(s).network.marks={};choose(s,'test');assert.equal(rootLabel(s),'未显灵根');advance(s,5);assert.equal(rootLabel(s),'未显灵根');advance(s,1);assert.equal(rootLabel(s),'无灵根');assert.equal(canCultivate(s),false);validateRun(s);
});

test('确认无灵根的展示与鉴定一致，杂役考核成功不跳过第一条谋生故事',()=>{
 const s=pending('root_review',{root:'未显灵根',realm:0});s.birth.family='common';c(s).network.marks={};
 choose(s,'test');finish(s);assert.match(rootDescription(s),/两次测灵/);
 s.pending={event:'mortal_assessment',month:s.month};s.journey=null;s.player.skills.array=100;
 choose(s,'ledger');assert.equal(c(s).story10.workCount,0);
});

test('事件查询拒绝原型属性，当前规则的待选事件仍能有效载入',()=>{
 const s=createRun({seed:'event-validation-12',rulesVersion:12});advanceToChoice(s);
 const bad=cloneRun(s);bad.pending.event='constructor';assert.throws(()=>validateRun(bad));
 /*
  * ⚠ 旧规则那条「待选旧友事件（network_echo）」随旧版本一起删了（规则十二的表里没有那张卡）
  *   ⇒ 改用**当前规则真实存在**的旧友卡（echo_friend）。
  */
 const t=natural('echo_friend');validateRun(t);
 const restored=upgradeRun(t);assert.deepEqual(restored,t);choose(restored,options(restored).find(o=>o.enabled).id);validateRun(restored);
});

test('战事打断旧约后可继续核实拜访，没有重复决定同一事件',()=>{
 const s=pending('world_raid');c(s).story10.echo={kind:'friend',origin:s.birth.continent,status:'checking',sent:s.month,due:s.month,stage:0};
 choose(s,'escape');finish(s);assert.equal(c(s).story10.echo.status,'deferred');
 s.month=Math.max(s.month,c(s).story10.echo.due);s.pending=null;s.journey={open:true,from:s.month,to:13000};
 c(s).admissionDone=true;c(s).activeChain=null;c(s).context=null;c(s).queue=[];let arrived;
 assert.equal(month10(s,{arrive:id=>arrived=id,log:()=>{},gate:()=>true}),true);assert.equal(arrived,'echo_resume');
 s.pending={event:arrived,month:s.month};s.journey=null;choose(s,'continue');assert.equal(c(s).story10.echo.status,'checking');
});
test('旧友卡回顾实际帮助，随机姓名在童年与成年一致',()=>{
 const s=natural('echo_friend');const text=nodeText(currentNode(s),s),friend=c(s).network.contacts[0];assert.ok(text.includes(friend.name));assert.match(text,/替病母领赊粮|粮铺查清/);assert.ok(s.journal.some(j=>j.event==='child_friend'&&j.body.includes(friend.name)));assert.ok(!text.includes('旧渡口的名字又出现了'));
});
test('暂缓保留真实入口，后续核实与拜访分别耗时，完成后才结奖励',()=>{
 const s=natural('echo_friend');choose(s,'wait');assert.equal(c(s).story10.echo.status,'deferred');reach(s,'echo_resume');choose(s,'continue');reach(s,'echo_friend_check');choose(s,'visit');assert.equal(c(s).story10.echo.status,'checking');finish(s);assert.equal(c(s).story10.echo.status,'visiting');reach(s,'echo_friend_visit');const stones=s.player.stones;choose(s,'help');assert.equal(s.player.stones,stones);finish(s);assert.equal(c(s).story10.echo,null);assert.ok(s.player.stones>=stones+1);validateRun(s);
});
test('拒绝旧线索不抹掉童年人物，但不再留下待办',()=>{
 const s=natural('echo_friend'),friend=cloneRun(c(s).network.contacts[0]);choose(s,'forget');assert.equal(c(s).story10.echo,null);assert.deepEqual(c(s).network.contacts[0],friend);
});
test('商队介绍陌生药师时不伪称童年已认识，铜匣线不默认免费传承',()=>{
 /*
  * ⚠ 规则十二的表达域接管了修仙线的说法（**事实没变，只是换了措辞**）：
  *   「拿来对照」⇒「拿去对照」、「不能证明」⇒「说明不了」⇒ 断言跟着改说法。
  */
 const s=pending('echo_teacher');c(s).network.marks={route_contact:{event:'child_caravan',month:120}};c(s).story10.echo={kind:'teacher',origin:s.birth.continent,status:'message',due:s.month,sent:s.month,stage:0};assert.match(nodeText(currentNode(s),s),/并不相识/);
 s.pending.event='echo_relic';c(s).network.marks={old_page:{event:'child_relic',month:120}};assert.match(nodeText(currentNode(s),s),/拿去对照/);assert.ok(!nodeText(currentNode(s),s).includes('当年替你留下'));
 s.pending.event='echo_relic_visit';assert.match(nodeText(currentNode(s),s),/说明不了/);
});
test('跨大陆童年消息须等待路线送达，封路时不能瞬间来信',()=>{
 const s=pending('echo_friend');s.pending=null;s.journey={open:true,from:s.month,to:13000};s.birth.continent='home';c(s).continent='sky';c(s).network.echoChecked=true;c(s).story10.echo={kind:'friend',origin:'home',status:'message',due:s.month,sent:s.month,stage:0};
 let arrived=null;const cb={arrive:id=>arrived=id,log:()=>{},gate:()=>true};month10(s,cb);assert.equal(arrived,null);s.month+=36;month10(s,cb);assert.equal(arrived,'echo_friend');
 arrived=null;c(s).closed=['home-tide','ember-home'];month10(s,cb);assert.equal(arrived,null);
});
test('重要人物正文带职责，人物查询保持纯函数',()=>{
 /*
  * ⚠ 规则十二的表达域换了说法：「由两宗长老商定」⇒「执法长老…负责谈放人」（事实没变）。
  * ⚠ **种子换过**（2026-11-08 · 阶段一）：身世卡改成按出身分池抽 ⇒
  *   固定种子的决策序列整体位移 ⇒ 原来那个种子（`echo-audit-1`）不再走到 `sect_feud_0`。
  *   重新挑了一个能走到、且正文与人物查询都对得上的种子（`echo-audit-6`）。
  *   ⇒ 这张卡**没有失联**：触达门禁证实 `sect_feud` 这条线 36/36 全部发得出。
  */
 const s=reach(createRun({seed:'echo-audit-6'}),'sect_feud_0');const text=nodeText(currentNode(s),s);assert.match(text,/执法长老/);assert.match(text,/负责谈放人/);const before=cloneRun(s),people=storyPeople(s);assert.ok(people.some(p=>p.role==='执法长老'));assert.ok(people.some(p=>p.role==='外门执事'));assert.deepEqual(s,before);
});
test('争水没有调查时不生成角色发现的刻痕，没有袭击不能隐瞒袭击',()=>{
 /*
  * ⚠ 规则十二的表达域换了说法：
  *   「没有亲自察看」⇒「你没有查泉水」；选项名从「照实说你实际做过的事」
  *   换成「说明粮车已经接回」（**还是只让你说自己真做过的事**）；
  *   「巡水弟子提供」⇒「不让你再替两宗谈水泉」；
  *   没有袭击时，「认罪」那一档**整个选项都不出现**（旧版是出现但禁用）。
  */
 const s=pending('sect_feud_1');c(s).story10.facts.feud={evidence:false,grain:true,assault:false,released:false};assert.match(nodeText(currentNode(s),s),/没有查泉水/);
 const care=options(s).find(o=>o.id==='care');assert.match(care.label,/说明粮车已经接回/,'选项名说的是实际做过的事');assert.match(care.hint,/不替别人补证词/,'选项不许替没做过的事作证');
 s.pending.event='sect_feud_2';assert.match(nodeText(currentNode(s),s),/不让你再替两宗谈水泉/);assert.ok(!options(s).some(o=>o.id==='selfish'),'没有袭击就不该显示认罪那一档');
});
test('选择洞外或不跨界会结束本次探索，不强行触发异界下一章',()=>{
 /*
  * ⚠ 规则十二里**下一条线**会接手 `activeChain`（调度器的正常行为）
  *   ⇒ 断的是「这一条线」，不是「整个探险」⇒ 断言改成看线本身。
  */
 for(const id of ['loose_relic_0','loose_portal_0']){const chain=id.replace('_0','');const s=pending(id,{path:'loose'});c(s).activeChain=chain;choose(s,'cautious');finish(s);
  assert.equal(c(s).chains[chain].skipped,true,chain+' 停了就要记成跳过');
  assert.ok(!c(s).queue.some(q=>q.event===chain+'_1'),chain+' 不许被硬拉着走下一章');
  if(c(s).activeChain)assert.notEqual(c(s).activeChain,chain,chain+' 停了就不该还挂着它');
  validateRun(s);}
});
test('运棺留驿站与未取囚犯血的后续分别读取真实来源',()=>{
 /* ⚠ 规则十二的表达域换了说法：「没有取人血或兽血」⇒「没取过人血或兽血」（事实没变）。 */
 const s=pending('loose_escort_1',{path:'loose'});c(s).story10.facts.coffin={at:'station',opened:false};assert.match(nodeText(currentNode(s),s),/驿站/);choose(s,'cautious');finish(s);assert.equal(c(s).story10.facts.coffin.at,'station');
 s.pending={event:'dark_method_1',month:s.month};c(s).story10.facts.bloodSource='herbs';assert.match(nodeText(currentNode(s),s),/没取过人血或兽血/);assert.equal(options(s).find(o=>o.id==='selfish').enabled,false);
});
test('每张当前决策卡都具有唯一选项和可读正文，旧渡口合并卡不再自然调度',()=>{
 for(const [id,event] of Object.entries(CULTIVATION_EVENTS)){assert.ok(event.title&&event.text,id);assert.ok(event.choices.length>=2,id);assert.equal(new Set(event.choices.map(o=>o.id)).size,event.choices.length,id);}
 const s=natural('echo_friend');assert.ok(!s.decisions.some(d=>d.event==='network_echo'));assert.equal(s.pending.event,'echo_friend');
});
