import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRun,choose,advance,advanceToChoice,options,currentNode,nodeText,cloneRun,validateRun,upgradeRun} from './helpers/rules9-engine.mjs';
import {revisionMonth} from '../packages/adventure/revision9.js';
import {autoChoice} from '../packages/adventure/auto-choice.js';
import {RULES9_CULTIVATION_EVENTS as CULTIVATION_EVENTS,RULES8_CULTIVATION_EVENTS,ROAD_CHAINS} from '../content/cultivation-stories.js';
import {activityOptions,routeOptions} from '../packages/adventure/cultivation.js';
const c=s=>s.life.cultivation,r=s=>c(s).revision9;
function pending(event){const s=createRun({seed:'因果核验-'+event});s.month=264;s.player.practice=264;c(s).path='demonic';c(s).admissionDone=true;c(s).entered=192;c(s).worldDone=true;c(s).queue=[];r(s).membership.path='demonic';s.pending={event,month:s.month};s.journey=null;return s;}
function finish(s){while(s.phase==='life'&&s.journey&&!s.journey.open&&!s.pending)advance(s,1);}
function probe(s){let arrived=null;revisionMonth(s,{arrive:id=>{arrived=id;},log:e=>s.journal.push({id:s.journal.length+1,month:s.month,act:s.act,...e})});return arrived;}
test('凡人和凡俗富户没有出生灵石，世家赠予有独立来源',()=>{
 for(const origin of ['village','noble','clan']){const s=createRun({seed:'资产-'+origin,origin});assert.equal(s.player.stones,origin==='clan'?4:0);assert.equal(c(s).rulesVersion,9);assert.equal(s.journal.some(e=>e.title==='长辈为你留下的灵石'),origin==='clan');}
});
test('真实规则8原档与原执行结果逐值相同，读取不改原文件',async()=>{
 const url=new URL('./fixtures/adventure-rules8-original.json',import.meta.url),raw=await readFile(url,'utf8'),doc=JSON.parse(raw),s=upgradeRun(doc.state);assert.deepEqual(s,doc.state);assert.equal(c(s).rulesVersion,8);assert.equal(r(s),undefined);if(s.pending){choose(s,options(s).find(o=>o.enabled).id);if(s.journey)advance(s,Math.min(12,s.journey.to-s.month));}assert.deepEqual(s,doc.continued);assert.equal(await readFile(url,'utf8'),raw);
});
test('散修正式拜入幽灯堂不凭空形成旧师门通缉',()=>{
 const s=pending('dark_oath');c(s).path='loose';r(s).membership.path='loose';choose(s,'join');assert.equal(c(s).path,'demonic');assert.equal(c(s).wanted,0);assert.deepEqual(c(s).evidence,[]);validateRun(s);
});
test('持有旧借卷时先辞师，结清后返回新师门，原卷真实交还',()=>{
 const s=pending('dark_oath');c(s).path='orthodox';Object.assign(r(s).membership,{path:'orthodox',borrowed:true});s.inventory.push('borrowed_volume');s.player.stones=2;assert.equal(options(s).find(o=>o.id==='join').enabled,false);choose(s,'release');assert.equal(c(s).path,'orthodox');advanceToChoice(s);assert.equal(s.pending.event,'departure_terms');choose(s,'settle');assert.equal(c(s).path,'loose');assert.ok(!s.inventory.includes('borrowed_volume'));assert.equal(s.player.stones,0);assert.equal(r(s).follow.event,'dark_oath_return');advanceToChoice(s);assert.equal(s.pending.event,'dark_oath_return');choose(s,'join');assert.equal(c(s).path,'demonic');assert.equal(c(s).wanted,0);validateRun(s);
});
test('带借卷私离有实际目击证据，普通登记没有共享去向',()=>{
 const s=pending('dark_oath');c(s).path='orthodox';Object.assign(r(s).membership,{path:'orthodox',borrowed:true});s.inventory.push('borrowed_volume');choose(s,'secret_join');assert.equal(c(s).path,'demonic');assert.equal(c(s).evidence.length,1);assert.equal(c(s).evidence[0].authority,'orthodox');assert.match(c(s).evidence[0].description,/送药弟子/);assert.ok(c(s).evidence[0].due>s.month);validateRun(s);
});
test('无借物的离去不凭空收药材钱',()=>{const s=pending('departure_terms');c(s).path='loose';r(s).membership.path='loose';assert.deepEqual(options(s).find(o=>o.id==='settle').cost,{});choose(s,'settle');assert.equal(s.player.stones,0);});
test('师兄以全卷换隐瞒，完成交换才实际得到功法并有修炼后续',()=>{
 const s=pending('dark_ledger_1');choose(s,'cautious');assert.ok(!s.inventory.includes('shadow_manual'));finish(s);assert.ok(s.inventory.includes('shadow_manual'));assert.equal(r(s).exchange.concealed,true);assert.equal(r(s).follow.event,'manual_study');assert.match(s.result.body,/交换两清/);assert.ok(!/欠.*人情/.test(s.result.body));validateRun(s);
});
test('拿书不等于学成，一年试练完成后才登记新的心法周天',()=>{
 const s=pending('manual_study');s.inventory.push('shadow_manual');choose(s,'gentle');assert.equal(c(s).network.method,null);advance(s,11);assert.equal(c(s).network.method,null);advance(s,1);assert.equal(c(s).network.method.id,'shadow');assert.equal(c(s).network.method.months,12);assert.ok(s.inventory.includes('shadow_manual'));validateRun(s);
});
test('作弊按专业展示实际工具，没拿到工具不能凭空使用',()=>{
 const data={sword:['exam_sword_charm','借力'],alchemy:['exam_powder','辨药散'],array:['exam_array_copy','底图']};for(const [skill,[item,text]] of Object.entries(data)){const s=pending('selection_1_result');c(s).exam={skill,deadline:s.month+12,preparation:10,tier:1};s.player.focus=skill;const before=cloneRun(s),o=options(s).find(o=>o.id==='cheat');assert.match(o.label,new RegExp(text));assert.equal(o.enabled,false);assert.deepEqual(s,before);s.inventory.push(item);assert.equal(options(s).find(o=>o.id==='cheat').enabled,true);choose(s,'cheat');assert.ok(!s.inventory.includes(item));assert.match(s.result.body,new RegExp(text==='借力'?'借力符':text));validateRun(s);}
});
test('药库先说明现场，查到证据之后才讲交换',()=>{const s=pending('dark_ledger_0');const text=nodeText(currentNode(s),s);assert.match(text,/钥匙/);assert.ok(!/炼气七层|能扣下你的月例|搜魂/.test(text));assert.ok(options(s).every(o=>o.hint.length<65));});
test('差灵根困境只抽一次，高资质不被强塞同一事件',()=>{
 const high=pending('manual_study');high.pending=null;high.month=360;high.journey={open:true,from:360,to:13000};high.player.root='松骨灵根';assert.equal(probe(high),null);assert.equal(r(high).hardshipChecked,false);
 const low=cloneRun(high);low.player.root='五行杂灵根';const first=probe(low);assert.ok(first===null||first==='thin_root_offer');assert.equal(r(low).hardshipChecked,true);assert.equal(probe(low),null);
});
test('矿役有两年中的相关经历，丹药在最后一年完成后才发',()=>{
 const s=pending('thin_root_offer');choose(s,'mine');finish(s);assert.equal(r(s).arc,'mine');assert.ok(!s.inventory.includes('thin_root_pill'));const start=s.month;advance(s,24);assert.equal(s.pending.event,'thin_root_mine');assert.equal(s.month-start,24);assert.equal(r(s).arcNotes,2);assert.ok(!s.inventory.includes('thin_root_pill'));choose(s,'leave');finish(s);assert.ok(!s.inventory.includes('thin_root_pill'));assert.equal(r(s).arc,null);assert.equal(r(s).follow.event,'thin_root_return');validateRun(s);
});
test('听禁术条件尚未入魔，拒绝后仍按原道路生活',()=>{
 const s=pending('thin_root_price');c(s).path='orthodox';r(s).membership.path='orthodox';r(s).arc='price';choose(s,'refuse');assert.equal(c(s).path,'orthodox');assert.equal(r(s).hardship,'refused');assert.equal(r(s).arc,null);validateRun(s);
});
test('接受摄血需实际修炼两年，并留下寻人追责的后续',()=>{
 const s=pending('thin_root_price');c(s).path='loose';r(s).membership.path='loose';choose(s,'accept');assert.equal(c(s).path,'loose');advance(s,23);assert.equal(c(s).path,'loose');advance(s,1);assert.equal(c(s).path,'demonic');assert.equal(r(s).hardship,'blood');assert.equal(r(s).follow.event,'thin_root_hunt');assert.ok(c(s).evidence.some(e=>/囚禁/.test(e.description)));validateRun(s);
});
test('自动策略只看有效选项，概率收益读取会抛错也不影响选择',()=>{
 const visible=['a','b','c'].map((id,i)=>({id,enabled:i!==1,get chance(){throw Error('Probability leak');},get effects(){throw Error('Future leak');}}));const sequence=Array.from({length:30},(_,i)=>autoChoice('同一人生',i,visible));assert.deepEqual(sequence,Array.from({length:30},(_,i)=>autoChoice('同一人生',i,visible)));assert.ok(sequence.every(id=>id==='a'||id==='c'));assert.equal(new Set(sequence).size,2);assert.equal(autoChoice('x',0,[]),null);
});
test('自动选择计数与后续事件损坏会被存档校验拦截',()=>{for(const mutate of [s=>s.autoPolicy.cursor=-1,s=>r(s).follow={event:'unknown',due:12}]){const s=createRun({seed:'坏状态'});mutate(s);assert.throws(()=>validateRun(s));}});

test('矿役换得的丹药有实际用途，配药时消耗，不能留下无限重复使用',()=>{
 const s=pending('thin_root_return');s.inventory.push('thin_root_pill');const o=options(s).find(o=>o.id==='learn');assert.deepEqual(o.cost.items,['thin_root_pill']);choose(s,'learn');assert.ok(!s.inventory.includes('thin_root_pill'));advance(s,12);assert.match(s.result.body,/丹药已经用尽/);validateRun(s);
});

test('新药库人物同局称呼稳定，不同人生不共用固定姓名',()=>{
 const a=createRun({seed:'药库人物甲'}),b=createRun({seed:'药库人物乙'});for(const alias of ['顾魇','阿栾']){const name=c(a).progression.names[alias];assert.ok(name&&name!==alias);assert.notEqual(name,c(b).progression.names[alias]);}
});

test('冻结的规则8与新事件表相互独立，长事件没有被重复安装拆成单字',()=>{
 for(const table of [CULTIVATION_EVENTS,RULES8_CULTIVATION_EVENTS])for(const chain of ROAD_CHAINS)for(let i=0;i<3;i++){
  const n=table[chain.id+'_'+i];assert.equal(n.choices.length,3);assert.deepEqual(n.choices.map(o=>o.id),['care','cautious','selfish']);assert.ok(n.choices.every(o=>o.hint.length>=12));
 }
});

test('矿役未结束时不能跨大陆或改重心，战乱逃离取消未完成报酬',()=>{
 const s=pending('thin_root_offer');choose(s,'mine');finish(s);s.player.stones=20;
 assert.ok(activityOptions(s).every(o=>!o.enabled));assert.ok(routeOptions(s).every(o=>!o.enabled));
 s.pending={event:'world_raid',month:s.month};s.journey=null;choose(s,'escape');finish(s);
 assert.equal(r(s).arc,null);assert.equal(r(s).follow,null);assert.ok(!s.inventory.includes('thin_root_pill'));validateRun(s);
});

test('跨大陆后续不能穿过封路或跳过传讯月份',()=>{
 const s=pending('manual_study');s.pending=null;s.journey={open:true,from:s.month,to:13000};c(s).continent='sky';r(s).follow={event:'thin_root_return',due:s.month,origin:'home'};
 c(s).closed=['home-tide','ember-home','sky-tide','ember-sky'];assert.equal(probe(s),null);
 c(s).closed=[];assert.equal(probe(s),null);s.month+=36;s.player.practice+=36;assert.equal(probe(s),'thin_root_return');
});

test('独立随机自动策略实际完成多种人生，按月保存校验不出现重复决策',()=>{
 const endings=new Set();
 for(let i=0;i<40;i++){
  const s=createRun({seed:'自动完整人生-'+i});s.autoPolicy.enabled=true;
  for(let step=0;step<160&&s.phase==='life';step++){
   advanceToChoice(s);validateRun(s);if(!s.pending)break;
   const id=autoChoice(s.seed,s.autoPolicy.cursor,options(s).map(o=>({id:o.id,enabled:o.enabled})));assert.ok(id);
   choose(s,id);s.autoPolicy.cursor++;s.revision++;validateRun(s);
  }
  assert.equal(s.phase,'ended');endings.add(s.ending.id);
 }
 assert.ok(endings.size>=3);
});
