import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRun,choose,advance,advanceToChoice,options,cloneRun,validateRun,setActivity,upgradeRun,currentNode,nodeText} from './helpers/rules9-engine.mjs';
import {activityOptions,routeOptions} from '../packages/adventure/cultivation.js';
import {economyQuote} from '../packages/adventure/cultivation-economy.js';
import {storyOpportunity,familyMessage} from '../content/cultivation-daily.js';
import {RULES5_CULTIVATION_EVENTS,ROAD_CHAINS} from '../content/cultivation-stories.js';
// 规则 5 的事件表：归一后由同一条装配链拍快照得到，内容与归一前逐值一致。
const FROZEN_EVENTS=RULES5_CULTIVATION_EVENTS;
import {decide,playCultivation} from './helpers/rules9-play.mjs';
const resolve=s=>{while(s.phase==='life'&&!s.pending&&s.journey&&!s.journey.open)advance(s,1);};
function find(id,filter=()=>true,policy={path:'orthodox'}){
 for(let i=0;i<500;i++){
  const s=createRun({seed:'丰实人生-'+i});
  for(let j=0;j<150&&s.phase==='life';j++){
   if(!s.pending)advanceToChoice(s);if(!s.pending)break;
   if(s.pending.event===id&&filter(s))return s;
   choose(s,decide(s,policy).id);if(policy.activity&&activityOptions(s).find(a=>a.id===policy.activity)?.enabled)setActivity(s,policy.activity);
  }
 }throw Error('No natural story '+id);
}
test('有限故事窗口只抽一次，错过和未发生不会多年重抽，后续队列不受影响',()=>{
 const outcomes=new Set();for(let i=0;i<100;i++){
  const s=createRun({seed:'故事窗口-'+i});assert.equal(storyOpportunity(s,'sect_repair',0,1),s.life.cultivation.opportunities.sect_repair.occurs);outcomes.add(s.life.cultivation.opportunities.sect_repair.occurs);
  const random=cloneRun(s.random);for(let j=0;j<10;j++)storyOpportunity(s,'sect_repair',0,1);assert.deepEqual(s.random,random);
  s.month=24;assert.equal(storyOpportunity(s,'sect_repair',0,1),false);assert.deepEqual(s.random,random);
 }assert.deepEqual([...outcomes].sort(),[false,true]);
});
test('四种家中线索有具体起因，跨大陆仍经中转，凡人不会瞬间找上异界住处',()=>{
 const origins=new Set();for(let i=0;i<100;i++){const s=createRun({seed:'家中线索-'+i}),body=familyMessage(s,s.life.family.members[0]);origins.add(s.life.cultivation.familyOrigin);assert.ok(body.length>45);assert.match(body,/故乡|家中/);}assert.equal(origins.size,4);
});
test('多条真实人生允许平静时期，但不会循环重复日常故事',()=>{
 const bodies=new Set();let maximum=0;
 for(let i=0;i<60;i++){
  const s=playCultivation({seed:'丰实人生-'+i,path:['orthodox','loose','demonic','beast','mortal'][i%5],school:['sword','alchemy','array'][i%3],activity:['study','sword','alchemy','array','work','social','rest'][i%7]}).state;
  for(let j=1;j<s.journal.length;j++)maximum=Math.max(maximum,s.journal[j].month-s.journal[j-1].month);
  for(const e of s.journal.filter(e=>e.automatic)){
   assert.ok(!/与附近的人交换消息|考核待遇已登记|执事登记：/u.test(e.body+e.title));if(e.body.length>45)bodies.add(e.body);
  }validateRun(s);
 }assert.ok(bodies.size>=80,bodies.size+' concrete prose variants');
});
test('出生与月例稀缺，年收支实际扣耗材，不把耗材不足当作无限债务或死亡',()=>{
 for(let i=0;i<100;i++){const s=createRun({seed:'灵石家计-'+i});assert.ok(s.player.stones<=6);advance(s,12);assert.ok(s.player.stones<=6);assert.equal(s.life.cultivation.economy.received,0);}
 const s=find('first_method',()=>true,{path:'loose'});choose(s,'array');resolve(s);advanceToChoice(s);if(s.pending?.event==='network_method')choose(s,options(s).find(o=>o.enabled).id);resolve(s);setActivity(s,'work');const q=economyQuote(s);assert.ok(q.gross>=3);assert.equal(q.net,1);const before=s.player.stones;advance(s,12);assert.equal(s.player.stones,before+q.net);assert.ok(s.life.cultivation.economy.last.upkeep<=s.life.cultivation.economy.last.gross+before);validateRun(s);
});
test('穷修士可以用真实劳作换突破材料，前一年不能冒充已经闭关成功',()=>{
 const s=find('breakthrough_1_0',s=>s.player.stones===0,{path:'loose'}),start=s.month,realm=s.player.realm;
 assert.equal(options(s).find(o=>o.id==='try').enabled,false);const service=options(s).find(o=>o.id==='service');assert.equal(service.enabled,true);assert.equal(service.cost.stones,undefined);assert.equal(service.months,24);
 choose(s,'service');const skill=s.player.skills.array;advance(s,11);assert.equal(s.player.realm,realm);assert.equal(s.player.skills.array,skill);advance(s,12);assert.equal(s.player.realm,realm);advance(s,1);assert.equal(s.month,start+24);assert.equal(s.player.realm,1);validateRun(s);
});
test('说谎会真正进入禁闭，法力、课程、月例和外出同时受限，期满恢复',()=>{
 const s=find('garden_accident',s=>s.month+12<s.life.cultivation.worldAt||s.life.cultivation.worldDone);choose(s,'frame');const skills=cloneRun(s.player.skills),month=s.month;
 assert.equal(s.life.cultivation.punishmentKind,'confinement');assert.ok(activityOptions(s).every(o=>!o.enabled));assert.ok(routeOptions(s).every(o=>!o.enabled));assert.equal(economyQuote(s).gross,0);advance(s,11);assert.deepEqual(s.player.skills,skills);advance(s,1);assert.equal(s.month,month+12);assert.equal(s.life.cultivation.punishmentKind,undefined);assert.ok(s.journal.some(e=>e.title==='重见山门晨光'));assert.ok(activityOptions(s).some(o=>o.enabled));validateRun(s);
});
test('三堂考核展示报名的本事，而不是把所有人都送去阵法台',()=>{
 const original=find('selection_1');for(const skill of ['sword','alchemy','array']){const s=cloneRun(original);choose(s,skill);while(!s.pending&&s.phase==='life')advance(s,1);assert.equal(s.pending.event,'selection_1_result');assert.match(nodeText(currentNode(s),s),({sword:/木剑/,alchemy:/药材/,array:/符纹/})[skill]);}
});
test('真实规则5原档保留原文与旧决策，不植入灵石收支或故事机会表',async()=>{
 const path=new URL('./fixtures/adventure-rules5-original.json',import.meta.url),raw=await readFile(path,'utf8'),original=JSON.parse(raw).state,s=upgradeRun(original);assert.deepEqual(s,original);assert.equal(s.life.cultivation.rulesVersion,5);assert.equal(s.life.cultivation.economy,undefined);
 advanceToChoice(s);assert.ok(s.pending);assert.equal(currentNode(s),RULES5_CULTIVATION_EVENTS[s.pending.event]);assert.equal(currentNode(s).title,FROZEN_EVENTS[s.pending.event].title);choose(s,options(s).find(o=>o.enabled).id);resolve(s);validateRun(s);assert.equal(s.life.cultivation.opportunities,undefined);assert.equal(await readFile(path,'utf8'),raw);
});
test('三枚灵石先兑粮钱，实际交付后家人只获得粮钱',()=>{
 const s=find('family_support',s=>options(s).find(o=>o.id==='send').enabled&&(s.life.cultivation.worldDone||s.month+12<s.life.cultivation.worldAt),{path:'orthodox',activity:'work'}),before=cloneRun(s),month=s.month;
 choose(s,'send');assert.equal(s.player.stones,before.player.stones-3);assert.equal(s.life.family.reserve,before.life.family.reserve);advance(s,5);assert.equal(s.life.family.reserve,before.life.family.reserve);advance(s,1);assert.equal(s.month,month+6);assert.equal(s.life.family.reserve,before.life.family.reserve);assert.equal(s.life.family.money,before.life.family.money+3000);assert.equal(s.life.cultivation.progression.parcels.at(-1).status,'delivered');validateRun(s);
});
test('新档拒绝伪造未来窗口、负数灵石账目与未知禁闭状态',()=>{
 const original=createRun({seed:'存档新规则'});for(const mutate of [s=>s.life.cultivation.economy.spent=-1,s=>s.life.cultivation.punishmentKind='unknown',s=>s.life.cultivation.opportunities.sect_repair={occurs:true,from:s.month+1,to:24}]){const s=cloneRun(original);mutate(s);assert.throws(()=>validateRun(s));}assert.equal(ROAD_CHAINS.length,16);
});
