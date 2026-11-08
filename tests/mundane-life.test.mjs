import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRun,advance,advanceToChoice,choose,options,cloneRun,validateRun,upgradeRun,currentNode,nodeText} from '../packages/adventure/engine.js';
import {mundane,person,mundaneMonth,mundaneQuote,mundanePeople} from '../packages/adventure/mundane-life.js';
import {canCultivate,hasMana} from '../packages/adventure/story-rules10.js';
import {longAction} from '../packages/adventure/progression.js';
import {CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
import {playMortal,mortalChoice} from '../scripts/audit-mundane-life.mjs';
const c=s=>s.life.cultivation;
function base(){const s=createRun({seed:'root-audit-15',rulesVersion:11});for(let i=0;i<40&&s.phase==='life';i++){advanceToChoice(s);if(s.pending?.event==='m11_start'){choose(s,'shop');return s;}if(s.pending)choose(s,mortalChoice(s).id);}throw Error('凡人出生路线未到达');}
function stage(kind,index=0){const s=base(),m=mundane(s);s.pending={event:`m11_${kind}_${index}`,month:s.month};s.journey=null;c(s).queue=[];c(s).context=null;m.arc={kind,stage:index,due:s.month,location:c(s).continent};m.done=[kind];return s;}
function finish(s){while(s.phase==='life'&&s.journey&&!s.journey.open&&!s.pending)advance(s,1);}
function nextStage(s){while(!s.pending&&s.phase==='life')advance(s,1);}

test('旧10引擎基线继续六次决策逐值一致，原文件保持原样',async()=>{
 const raw=await readFile(new URL('./fixtures/adventure-rules10-baseline.json',import.meta.url),'utf8');
 for(const row of JSON.parse(raw).samples){const s=upgradeRun(row.state);assert.deepEqual(s,row.state);for(let i=0;i<6&&s.phase==='life';i++){advanceToChoice(s);if(s.pending)choose(s,options(s).find(o=>o.enabled).id);}assert.deepEqual(s,row.continued);}
 assert.equal(await readFile(new URL('./fixtures/adventure-rules10-baseline.json',import.meta.url),'utf8'),raw);
});
test('凡人自然一生持续有抉择，旧44/56/67补丁不参与新规则',()=>{
 for(const seed of ['凡人世事-24','凡人世事-28','凡人世事-74']){const {s,events}=playMortal(seed);assert.ok(mundane(s).started);assert.equal(s.player.realm,0);assert.ok(events.filter(id=>id.startsWith('m11_')).length>=10);assert.equal(c(s).story10.facts.mundaneOlder44,undefined);
  const rows=s.journal.filter(j=>j.month>=192);for(let i=1;i<rows.length;i++)assert.ok(rows[i].month-rows[i-1].month<=48,seed);validateRun(s);}
});
test('钱粮守恒，个人工钱与家中财产及仙门灵石分开',()=>{
 const s=base(),m=mundane(s),family=s.life.family.money,stones=s.player.stones;const before=m.money;advance(s,12);assert.ok(m.money>before);assert.equal(s.life.family.money,family);assert.equal(s.player.stones,stones);assert.equal(m.money,24+m.earned-m.spent);validateRun(s);
 const bad=cloneRun(s);mundane(bad).money++;assert.throws(()=>validateRun(bad),/钱粮不守恒/);
});
test('长期做工进度使用整程，普通推进与快进逐月一致',()=>{
 const a=base();a.pending={event:'m11_life_0',month:a.month};a.journey=null;choose(a,'steady');const b=cloneRun(a);assert.equal(longAction(a).months,24);advance(a,24);for(let i=0;i<24;i++)advance(b,1);assert.deepEqual(a,b);assert.equal(mundane(a).stage,1);validateRun(a);
});
test('未完成做工不领额外报酬，存档恢复保留实际进度',()=>{
 const s=stage('shop',1),m=mundane(s);m.money=24;const extra=m.earned;choose(s,'deliver');advance(s,5);assert.equal(m.earned-extra,m.money-24);assert.equal(m.trust,0);const restored=upgradeRun(cloneRun(s));assert.deepEqual(restored,s);advance(restored,13);assert.ok(mundane(restored).earned>m.earned);assert.equal(mundane(restored).trust,2);
});
test('没有钱不能支付合伙本金，查询选项不改变随机数或状态',()=>{
 const s=base();s.pending={event:'m11_life_0',month:s.month};s.journey=null;mundane(s).money=0;mundane(s).spent=24;const before=cloneRun(s);assert.equal(options(s).find(o=>o.id==='speculate').enabled,false);assert.deepEqual(s,before);assert.throws(()=>choose(s,'speculate'));assert.deepEqual(s,before);
});
test('收殓未取物者在核实后结束，不被强制拉入追查',()=>{
 const s=stage('corpse'),m=mundane(s);m.corpse={truth:1,origin:c(s).continent,found:s.month,taken:false};choose(s,'bury');assert.equal(s.inventory.includes('mortal_wood'),false);nextStage(s);choose(s,'inspect');assert.equal(m.arc,null);assert.equal(m.corpse.closed,true);assert.equal(m.corpse.trace,false);validateRun(s);
});
test('取物出售留下账目，只取实物不会自动打开储物囊或获得法力',()=>{
 const s=stage('corpse'),m=mundane(s);m.corpse={truth:1,origin:c(s).continent,found:s.month,taken:false};choose(s,'take');assert.ok(s.inventory.includes('mortal_wood'));assert.equal(canCultivate(s),false);nextStage(s);choose(s,'sell');assert.equal(s.inventory.includes('mortal_sword'),false);assert.ok(s.inventory.includes('mortal_wood'));assert.equal(m.corpse.sale,true);assert.equal(m.corpse.trace,true);validateRun(s);
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
test('旧规则拒绝新凡人待选事件，新规则拒绝错配长事件存档',()=>{
 const s=createRun({seed:'旧人生',rulesVersion:10});s.pending={event:'m11_gift_3',month:0};s.journey=null;assert.throws(()=>validateRun(s));const t=stage('corpse');t.pending.event='m11_gift_3';assert.throws(()=>validateRun(t),/不对应/);
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
 const {s,events}=playMortal('凡人世事-177','sell');
 assert.ok(events.includes('m11_gift_3'),'迟入的那条路要走到 m11_gift_3');
 assert.ok(s.player.realm>=1,'迟入的人最后要入了道（境界 ≥ 1）');
});
test('收殓之后走不到「取物出售」那一段',()=>{
 /* 五条自然人生在**收殓**走法下真的会走到 m11_corpse_0，但**永远到不了** m11_corpse_2。 */
 for(const seed of ['凡人世事-38','凡人世事-74','凡人世事-89','凡人世事-152','凡人世事-177']){
  const {events}=playMortal(seed,'burial');
  assert.ok(events.includes('m11_corpse_0'),seed+'：这条命要真的走到收殓那一段（否则下面那句是空跑）');
  assert.ok(!events.includes('m11_corpse_2'),seed+'：收殓之后不该走到「取物出售」');
 }
 /* 正面对照：同一个种子换个走法就会走到 corpse_2 ⇒ 上面那句不是恒真。 */
 const {events}=playMortal('凡人世事-38','farm');
 assert.ok(events.includes('m11_corpse_2'),'换个走法就该走到 corpse_2（证明上面那句真的在管事）');
});
