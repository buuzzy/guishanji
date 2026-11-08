import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,advance,advanceToChoice,choose,options,cloneRun,validateRun,upgradeRun,currentNode,nodeText} from '../packages/adventure/engine.js';
import {mundane,person,mundaneMonth,mundaneQuote,mundanePeople} from '../packages/adventure/mundane-life.js';
import {canCultivate,hasMana} from '../packages/adventure/story-shared.js';
import {CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
import {playMortal,mortalChoice} from '../scripts/audit-mundane-life.mjs';
import {playCultivation} from '../scripts/play-cultivation.mjs';
import {MUNDANE_KEPT,MUNDANE_DISABLED} from '../content/mundane-kept.js';
const c=s=>s.life.cultivation;
/*
 * ⚠ **本文件只测规则十二**（2026-11-08 · 清旧档）。
 *   旧版本（9/10/11）的执行器与事件表快照已全部删除 ⇒ 引擎只认 12，
 *   旧档一律拒收（`validateRun` 报「修行规则版本」）。
 *   ⇒ 原来那条「旧10引擎基线继续六次决策逐值一致」**整条删掉**：
 *     它测的是「旧档在旧版本下继续跑」，那个功能已经不存在了。
 *   ⇒ 凡人线在规则十二是**五张直线**（`content/mundane-kept.js`），
 *     旧版那条 44/56/67 三段弧制不再参与 ⇒ 相关断言按新规则改写。
 */
function base(){const s=createRun({seed:'root-audit-15',rulesVersion:12});for(let i=0;i<40&&s.phase==='life';i++){advanceToChoice(s);if(s.pending?.event==='m11_start'){choose(s,'shop');return s;}if(s.pending)choose(s,mortalChoice(s).id);}throw Error('凡人出生路线未到达');}
function stage(kind,index=0){const s=base(),m=mundane(s);s.pending={event:`m11_${kind}_${index}`,month:s.month};s.journey=null;c(s).queue=[];c(s).context=null;m.arc={kind,stage:index,due:s.month,location:c(s).continent};m.done=[kind];return s;}
function finish(s){while(s.phase==='life'&&s.journey&&!s.journey.open&&!s.pending)advance(s,1);}

test('凡人自然一生持续有流水，旧44/56/67补丁不参与新规则',()=>{
 /*
  * ⚠ 规则十二的凡人线是**五张直线**（`content/mundane-kept.js`）⇒ 一生最多 5 张抉择卡；
  *   旧版本那条「44/56/67 三段补丁」已随旧版本一起退出 ⇒ 这里量的是**新规则**：
  *   抉择卡不超过五张、旧补丁不写进来、流水不许空过（相邻两行不超过 48 个月）。
  */
 for(const seed of ['凡人世事-24','凡人世事-28','凡人世事-74']){const {s,events}=playMortal(seed);assert.ok(mundane(s).started);assert.equal(s.player.realm,0);
  const m11=events.filter(id=>id.startsWith('m11_'));assert.ok(m11.length>=1&&m11.length<=5,seed+' 凡人线的抉择卡不是 1–5 张：'+m11.join(' > '));
  assert.equal(c(s).story10.facts.mundaneOlder44,undefined);
  const rows=s.journal.filter(j=>j.month>=192);for(let i=1;i<rows.length;i++)assert.ok(rows[i].month-rows[i-1].month<=48,seed);validateRun(s);}
});
test('凡人线新人生只发五张卡：起承转合结；停用的四十五张一张都不许再发',()=>{
 /*
  * 交接文档 §3.3 的验收口径：**凡人线单命触发 ≤ 5 张**（改前实测 12–20 张）。
  * ⚠ 这是**当前版本（规则十二）**的口径 —— 规则十一的旧人生仍走原来的弧
  *   （上面那条「凡人自然一生持续有抉择」量的是规则十一，仍是 10 张以上）。
  */
 const expect=['m11_start','m11_work_2','m11_family_1','m11_corpse_0','m11_end'];
 assert.deepEqual(MUNDANE_KEPT,expect,'在用的五张清单与设计不一致');
 for(const seed of ['凡人五张-2','凡人五张-31','凡人五张-36']){
  const r=playCultivation({seed,rulesVersion:12,path:'mortal',conduct:'care',school:'sword'});
  const m11=r.events.filter(id=>id.startsWith('m11_'));
  assert.equal(m11.length,5,seed+' 凡人线不止五张：'+m11.join(' > '));
  assert.deepEqual(m11,expect,seed+' 凡人线的顺序不对：'+m11.join(' > '));
  assert.equal(m11.filter(id=>MUNDANE_DISABLED.includes(id)).length,0,seed+' 停用的卡又发出来了');
  validateRun(r.state);
 }
 /* 停用的卡**一张都不许删**（停用但不删 ⇒ 随时能放回来）。 */
 for(const id of MUNDANE_DISABLED)assert.ok(CULTIVATION_EVENTS[id],'停用的卡被删了：'+id);
});
test('钱粮守恒，个人工钱与家中财产及仙门灵石分开',()=>{
 const s=base(),m=mundane(s),family=s.life.family.money,stones=s.player.stones;const before=m.money;advance(s,12);assert.ok(m.money>before);assert.equal(s.life.family.money,family);assert.equal(s.player.stones,stones);assert.equal(m.money,24+m.earned-m.spent);validateRun(s);
 const bad=cloneRun(s);mundane(bad).money++;assert.throws(()=>validateRun(bad),/钱粮不守恒/);
});
test('长期做工进度使用整程，普通推进与快进逐月一致',()=>{
 const a=base();a.pending={event:'m11_life_0',month:a.month};a.journey=null;choose(a,'steady');
 /*
  * ⚠ 规则十一那条「m11_ 的 24 个月也算长行动」的特例，已随旧版本一起删除
  *   （`packages/adventure/progression.js` 的 `longAction` 阈值统一成 60 个月）
  *   ⇒ 这里直接量**行程本身**：整段 24 个月一次性定下，不按月分摊。
  */
 assert.equal(a.journey.to-a.journey.from,24,'长期做工的进度要用整程');
 const b=cloneRun(a);advance(a,24);for(let i=0;i<24;i++)advance(b,1);assert.deepEqual(a,b);assert.equal(mundane(a).stage,1);validateRun(a);
});
test('未完成做工不领额外报酬，存档恢复保留实际进度',()=>{
 const s=stage('shop',1),m=mundane(s);m.money=24;const extra=m.earned;choose(s,'deliver');advance(s,5);assert.equal(m.earned-extra,m.money-24);assert.equal(m.trust,0);const restored=upgradeRun(cloneRun(s));assert.deepEqual(restored,s);advance(restored,13);assert.ok(mundane(restored).earned>m.earned);assert.equal(mundane(restored).trust,2);
});
test('没有钱不能支付合伙本金，查询选项不改变随机数或状态',()=>{
 const s=base();s.pending={event:'m11_life_0',month:s.month};s.journey=null;mundane(s).money=0;mundane(s).spent=24;const before=cloneRun(s);assert.equal(options(s).find(o=>o.id==='speculate').enabled,false);assert.deepEqual(s,before);assert.throws(()=>choose(s,'speculate'));assert.deepEqual(s,before);
});
test('收殓未取物者在核实后结束，不被强制拉入追查',()=>{
 /*
  * ⚠ 规则十二的「合」只有一张卡（`m11_corpse_0`）⇒ 收殓 / 报信 / 取物 是同一次抉择，
  *   不再走旧版「核实 → 追查」那一串 ⇒ 这里守的是**收殓之后不再有后续**。
  */
 const s=stage('corpse'),m=mundane(s);choose(s,'bury');
 assert.equal(s.inventory.includes('mortal_wood'),false,'收殓不该拿到旧物');
 assert.equal(m.corpse.buried,true,'收殓要记下来');
 assert.equal(m.arc,null,'收殓之后这段差事就结束了');
 assert.equal(m.corpse.trace,false,'没有被拉进追查');
 validateRun(s);
});
test('只取实物不会自动打开储物囊或获得法力',()=>{
 /*
  * ⚠ 规则十二的「合」是一张卡：取走旧物就是取走，**没有单独的「取物出售」那一段**
  *   ⇒ 这里守的是：只拿实物不会给你法力，储物囊也不会自己打开。
  */
 const s=stage('corpse'),m=mundane(s);choose(s,'take');
 assert.ok(s.inventory.includes('mortal_wood'),'取走的旧物要真的进行囊');
 assert.ok(s.inventory.includes('mortal_sword'),'断铁剑也跟着一起拿到');
 assert.equal(canCultivate(s),false,'拿到旧物不等于能修炼');
 assert.equal(hasMana(s),false,'拿到旧物不等于有法力');
 assert.equal(m.corpse.taken,true,'账目上要记着东西被取走了');
 assert.equal(m.corpse.sale,false,'没有「取物出售」那一段');
 assert.equal(m.arc,null,'这段差事到取物为止，不再拉出下一段');
 validateRun(s);
});
test('交回全部旧物后不能继续出售断剑',()=>{
 const s=stage('corpse',1),m=mundane(s);m.corpse={truth:0,origin:c(s).continent,found:s.month,taken:true};s.inventory.push('mortal_wood','mortal_sword');choose(s,'return');assert.equal(m.corpse.closed,true);assert.equal(m.arc,null);assert.ok(!s.inventory.includes('mortal_wood'));validateRun(s);
});
test('逃亡只移动同住的人，异地家人不被同步迁移',()=>{
 const s=stage('corpse',2),m=mundane(s);m.corpse={truth:1,origin:c(s).continent,found:s.month,taken:true};m.spouse={id:'spouse',name:'测试伴侣',born:-12,deathAt:1500,status:'alive',location:m.home,known:true};m.child={id:'child',name:'测试孩子',born:s.month-60,deathAt:1800,status:'alive',location:'tide:sect',known:true};choose(s,'move');finish(s);assert.equal(m.spouse.location,m.home+':refuge');assert.equal(m.child.location,'tide:sect');validateRun(s);
});
test('护路符用完消失，消耗外物不赋予角色自身法力',()=>{
 const s=stage('corpse',3),m=mundane(s);m.corpse={truth:1,origin:c(s).continent,found:s.month,taken:true};s.inventory.push('mortal_charm');choose(s,'charm');assert.ok(!s.inventory.includes('mortal_charm'));finish(s);assert.equal(hasMana(s),false);assert.ok(m.notes.includes('corpse-survivor'));validateRun(s);
});
test('植灵材料必须做完三年才能获得，取得材料仍无修为',()=>{
 const s=stage('gift',1),m=mundane(s);m.corpse={truth:0,found:s.month,origin:m.home,closed:true};m.gift={source:'river-remains',relicFound:s.month,stage:'verified',materials:false,changed:false};s.inventory.push('mortal_wood');choose(s,'labour');advance(s,35);assert.equal(m.gift.materials,false);assert.equal(hasMana(s),false);advance(s,1);assert.equal(m.gift.materials,true);assert.equal(s.player.realm,0);validateRun(s);
});
test('假造植灵能力没有材料与尸体来源，存档被拒绝',()=>{
 const s=base();mundane(s).gift={source:'bought-book',stage:'changed',changed:true,materials:true,relicFound:0};assert.throws(()=>validateRun(s),/植灵没有真实来源/);
});
test('植灵成功不跳过基础引气，失败实际消耗药引',()=>{
 for(const succeed of [true,false]){const s=stage('gift',2),m=mundane(s);m.corpse={truth:0,found:s.month,origin:m.home,closed:true};m.gift={source:'river-remains',relicFound:s.month,stage:'prepared',materials:true,changed:false};s.inventory.push('mortal_wood');choose(s,'attempt');s.decisions.at(-1).success=succeed;s.journey.resolution.success=succeed;finish(s);assert.equal(s.inventory.includes('mortal_wood'),false);assert.equal(s.player.realm,0);assert.equal(canCultivate(s),succeed);assert.equal(hasMana(s),false);assert.equal(m.gift.stage,succeed?'changed':'failed');validateRun(s);}
});
test('临终微光有真实身体改变与引气过程，不复活死者或重置年龄',()=>{
 const s=stage('gift',3),m=mundane(s);s.player.root='五行杂灵根';c(s).story10.rootStatus='present';m.corpse={truth:0,found:s.month,origin:m.home,closed:true};m.gift={source:'river-remains',relicFound:s.month,stage:'changed',materials:true,changed:true,terminal:true};const birth=s.birth.year,month=s.month;choose(s,'learn');advance(s,6);assert.equal(s.phase,'ended');assert.equal(s.ending.id,'mundane_glimmer');assert.equal(s.player.realm,1);assert.equal(s.month,month+6);assert.equal(s.birth.year,birth);validateRun(s);
});
test('没有伴侣不能凭空生孩子，死者不能参与婚事',()=>{
 const s=stage('family',2);assert.equal(options(s).find(o=>o.id==='child').enabled,false);assert.throws(()=>choose(s,'child'));
 const t=stage('family',1);mundane(t).money=80;mundane(t).earned=56;person(t,'worker').status='dead';assert.equal(options(t).find(o=>o.id==='marry').enabled,false);
});
test('孩子测灵读取孩子自身结果，无灵根者不会被送为修炼弟子',()=>{
 const s=stage('child',1),m=mundane(s);m.spouse={id:'spouse',name:'伴侣',born:-12,deathAt:1400,status:'alive',location:m.home,known:true};m.child={id:'child',name:'孩子',born:s.month-120,deathAt:1800,status:'alive',location:m.home,known:true,root:false,admitted:false};assert.match(nodeText(currentNode(s),s),/没有亮/);choose(s,'send');finish(s);assert.equal(m.child.admitted,false);assert.equal(m.child.location,m.home);validateRun(s);
});
test('营地粮房差事不授宗主身份，也不把公粮变成私人灵石',()=>{
 const s=stage('siege',2),stones=s.player.stones,treasury=c(s).progression.sect.treasury;choose(s,'stay');finish(s);assert.equal(c(s).rank,'营地粮房管事');assert.equal(c(s).progression.sect.role,null);assert.equal(c(s).progression.sect.treasury,treasury);assert.equal(s.player.stones,stones);validateRun(s);
});
test('家产汇款按路程等待，收物人已故时退回而非交给死者',()=>{
 const s=stage('inheritance'),m=mundane(s);const family=s.life.family.money;choose(s,'send');assert.equal(s.life.family.money,family);for(const p of s.life.family.members)p.status='dead';finish(s);assert.equal(s.life.family.money,family);assert.equal(m.money,24+m.earned-m.spent);assert.ok(s.journal.some(j=>j.title==='没有收物人的钱退回来了'));validateRun(s);
});
test('凡俗人物与钱粮在规则层登记得清清楚楚，查询不改人生状态',()=>{
 const s=base(),before=cloneRun(s);
 assert.ok(mundanePeople(s).some(p=>p.role==='药铺师傅'),'凡人线的人要登记在册');
 assert.ok(Number.isFinite(mundane(s).money),'凡人线的钱粮要记着数');
 /* ⚠ 网页端曾把「钱粮与家产」画成一块面板，并逐个人名上屏；
    网页端 2026-11-08 已清理 ⇒ 这里守的是**规则层**（人物名册与钱粮账）。
    ⚠ **已知缺口**：小程序端的人物面板目前只列家人 / 后代 / 旧相识 / 同行者，
      **凡人线结识的人（药铺师傅、同住的伙计…）还没有落屏** ——
      登记在 `docs/story-gap-ledger.md`，随阶段 3（凡人线精简到 5 张）一起补。 */
 assert.deepEqual(s,before);
});
test('拒绝租契的熟手不会在后续凭空成为掌柜',()=>{
 const s=stage('shop',2);mundane(s).notes.push('shop:worker');assert.equal(options(s).find(o=>o.id==='keep').label,'继续在铺里做验药熟手');choose(s,'keep');assert.equal(c(s).rank,'药铺熟手');assert.equal(mundane(s).assets.length,0);validateRun(s);
});
test('异地灾荒不向现居地继续加征粮钱',()=>{
 const s=base(),m=mundane(s);const normal=mundaneQuote(s).upkeep;m.local={place:c(s).continent==='sky'?'tide':'sky',kind:'water',until:s.month+36,tax:6,history:[]};assert.equal(mundaneQuote(s).upkeep,normal);m.local.place=c(s).continent;assert.equal(mundaneQuote(s).upkeep,normal+6);
});
test('闭关期间亲人实际老去，消息在出关接触后才确认',()=>{
 const s=base(),p=person(s,'employer');p.deathAt=s.month;c(s).context='retreat';const entries=[];const cb={log:j=>entries.push(j),arrive:()=>{}};mundaneMonth(s,cb);assert.equal(p.status,'dead');assert.equal(entries.length,0);assert.equal(mundanePeople(s).find(x=>x.id===p.id).status,'尚未收到近况');c(s).context=null;mundaneMonth(s,cb);assert.ok(entries.some(j=>j.title===p.name+'走完了这一生'));assert.equal(mundanePeople(s).find(x=>x.id===p.id).status,'已确认离世');
});
test('同住避难处的亲人不被组件误标成住在异地',()=>{
 const s=base(),m=mundane(s);m.residence=m.home+':refuge';person(s,'employer').location=m.residence;assert.equal(mundanePeople(s).find(p=>p.id==='employer').description,'在你现在的住处附近');
});
test('旧版本的人生建不起来，新规则拒绝错配长事件存档',()=>{
 /*
  * ⚠ 旧版本（9/10/11）已删 ⇒ 引擎只认规则十二 ⇒ 「旧规则装不下这张卡」那一半
  *   改成「旧版本的人生根本建不起来」；另一半（错配长事件）照旧。
  */
 assert.throws(()=>createRun({seed:'旧人生',rulesVersion:10}),/不支持创建此规则的人生/);
 const t=stage('corpse');t.pending.event='m11_gift_3';assert.throws(()=>validateRun(t),/不对应/);
});
test('不同人生的平静期抉择次序稳定且不同，不是固定章节',()=>{
 const a=createRun({seed:'凡人世事-24'}),b=createRun({seed:'凡人世事-28'}),copy=createRun({seed:'凡人世事-24'});assert.notDeepEqual(mundane(a).lifeOrder,mundane(b).lifeOrder);assert.deepEqual(mundane(a).lifeOrder,mundane(copy).lifeOrder);
});
test('新决策卡选项唯一，正文可读取且不公开内部成功率',()=>{
 const s=base();mundane(s).corpse={truth:1,taken:true};
 for(const n of Object.values(CULTIVATION_EVENTS).filter(n=>n.id.startsWith('m11_'))){
  assert.equal(n.choices.length,new Set(n.choices.map(o=>o.id)).size,n.id);
  if(n.id.includes('gift'))mundane(s).gift={stage:'prepared'};
  const text=typeof n.text==='function'?n.text(s):n.text;assert.ok(text.length>35,n.id);assert.ok(!/\d+%/.test(text),n.id);
  /* ⚠ 2026-11-08：原来**只量正文** ⇒ 选项名与选项提示语没人管。
     网页端那道浏览器门禁量的是整段弹层文本（标题 + 正文 + 选项）⇒ 这里补齐。 */
  for(const o of n.choices){
   assert.ok(!/\d+%/.test(String(o.label||'')),n.id+' 的选项名「'+o.label+'」不该有内部成功率');
   let hint='';if(typeof o.hint==='function'){try{hint=String(o.hint(s)??'');}catch{hint='';}}else hint=String(o.hint||'');
   assert.ok(!/\d+%/.test(hint),n.id+' 的选项提示语不该有内部成功率');
  }
 }
});
test('凡人线可以迟入：走到「转机」最后一段的人真的入了道',()=>{
 /*
  * ⚠ 规则十二的凡人线只发五张卡 ⇒ 「迟入」那一段（`m11_gift_3`）不再自然调度
  *   ⇒ 这里用**规则十二的引擎**直接搭出那一段的门路（与本文件其它弧段同法），
  *   验的还是同一件事：迟入的人真的多了一重境界。
  */
 const s=stage('gift',3),m=mundane(s);
 s.player.root='五行杂灵根';c(s).story10.rootStatus='present';
 m.corpse={truth:0,found:s.month,origin:m.home,closed:true};
 m.gift={source:'river-remains',relicFound:s.month,stage:'changed',materials:true,changed:true};
 s.inventory.push('mortal_wood');
 choose(s,'learn');advance(s,6);
 assert.equal(s.player.realm,1,'迟入的人最后要入了道（境界 ≥ 1）');
 assert.equal(c(s).rank,'迟入道的散修');
 validateRun(s);
});
test('收殓之后走不到「取物出售」那一段',()=>{
 /*
  * ⚠ 规则十二的「合」是一张卡 ⇒ 收殓 / 报信 / 取物在同一次抉择里，
  *   **没有「取物出售」那一段**（`m11_corpse_1..4` 已停用）。
  *   五条自然人生在**收殓**走法下真的会走到 m11_corpse_0，但收殓之后**拿不到旧物**。
  */
 for(const seed of ['凡人世事-38','凡人世事-74','凡人世事-89','凡人世事-152','凡人世事-177']){
  const {s,events}=playMortal(seed,'burial');
  assert.ok(events.includes('m11_corpse_0'),seed+'：这条命要真的走到收殓那一段（否则下面那句是空跑）');
  assert.ok(!events.includes('m11_corpse_2'),seed+'：收殓之后不该走到「取物出售」');
  assert.ok(!s.inventory.includes('mortal_wood'),seed+'：收殓之后不该拿到旧物');
  assert.ok(!s.inventory.includes('mortal_sword'),seed+'：收殓之后不该拿到断铁剑');
 }
 /* 正面对照：同一个种子换个走法就会取走旧物 ⇒ 上面那句不是恒真。 */
 const {s,events}=playMortal('凡人世事-38','farm');
 assert.ok(events.includes('m11_corpse_0'),'正面对照也要真的走到收殓那一段');
 assert.ok(s.inventory.includes('mortal_wood'),'换个走法就该拿到旧物（证明上面那句真的在管事）');
});
