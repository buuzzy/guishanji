import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {createRun,choose,advanceToChoice,validateRun,cloneRun,options,currentNode,nodeText} from '../packages/adventure/engine.js';
import {decide} from './play-cultivation.mjs';
import {rules12,lifespan12} from '../packages/adventure/story-rules12.js';
import {CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
export function decision12(s,mode='retreat'){
 const id=s.pending.event,os=options(s).filter(o=>o.enabled),preferred=[];
 if(id.startsWith('r12_direction_'))preferred.push(mode==='work'?'work':mode==='travel'?'travel':'retreat');
 if(id==='r12_child_fever')preferred.push(mode==='risk'?'rest':'medicine');
 if(id==='r12_home_resolve')preferred.push('talk');
 if(id==='r12_home_leave')preferred.push('return','stay');
 if(id==='r12_patron')preferred.push(mode==='work'?'work':'prepare');
 if(id==='r12_sect_clue')preferred.push(mode==='risk'?'accept':'report');
 if(id==='road_turn')preferred.push('book','keep');
 if(id==='r12_bazaar_follow')preferred.push(mode==='risk'?'ask':'leave');
 if(id.startsWith('breakthrough_2')&&mode==='risk')preferred.push('force');
 const found=os.find(o=>preferred.includes(o.id));return found||decide(s,{conduct:mode==='risk'?'selfish':'care'});
}
export function play12(seed,mode='retreat'){
 const s=createRun({seed}),events=[],cards=[];
 for(let i=0;i<240&&s.phase==='life';i++){
  advanceToChoice(s);try{validateRun(s);}catch(e){throw Error(seed+' '+s.pending?.event+' '+s.month+' '+e.message);}if(!s.pending)break;const before=cloneRun(s),node=currentNode(s),os=options(s),body=nodeText(node,s);
  assert.deepEqual(s,before,'presentation changes simulation');
  assert.ok(os.some(o=>o.enabled),'no enabled choice '+node.id);
  assert.equal(new Set(os.map(o=>o.id)).size,os.length,'duplicate '+node.id);
  if(s.life.cultivation.path!=='demonic'&&node.id==='network_method')assert.ok(!os.some(o=>o.id==='shade'));
  if(node.id==='sect_feud_2'&&!s.life.cultivation.story10.facts.feud?.assault)assert.ok(!os.some(o=>o.id==='selfish'));
  if(node.id==='family_support'&&s.birth.family!=='clan')assert.ok(!os.some(o=>['supplies','notes'].includes(o.id)));
  cards.push({id:node.id,body,characters:[...body].length,options:os.map(o=>({id:o.id,label:o.label,hint:o.hint,enabled:o.enabled}))});events.push(node.id);choose(s,decision12(s,mode).id);validateRun(s);
 }
 assert.equal(s.phase,'ended',seed+' not completed');return {s,events,cards};
}
if(process.argv[1]?.endsWith('audit-story-rules12.mjs')){
 const count=Number(process.argv.find(a=>a.startsWith('--count='))?.split('=')[1]||400),report={rulesVersion:12,count,scope:'Seeded scripted natural births; no injected state. Controlled branch tests are reported separately; this is not human retention.',events:{},endings:{},realms:{},bodies:{},sects:{},samples:[],editorial:[],longestQuietYears:0};
 for(let i=0;i<count;i++){
  const seed='规则十二人生-'+i,mode=['retreat','work','travel','risk'][i%4],{s,events,cards}=play12(seed,mode);
  for(const id of events)report.events[id]=(report.events[id]||0)+1;
  for(const row of cards)if(row.characters>160&&!report.editorial.some(e=>e.id===row.id))report.editorial.push(row);
  for(const [key,id] of [['endings',s.ending.id],['realms',s.player.realm],['bodies',rules12(s).body.type],['sects',rules12(s).sect]])report[key][id]=(report[key][id]||0)+1;
  const meaningful=s.journal.filter(j=>j.kind!=='plan');let gap=0;for(let n=1;n<meaningful.length;n++)gap=Math.max(gap,(meaningful[n].month-meaningful[n-1].month)/12);report.longestQuietYears=Math.max(report.longestQuietYears,gap);
  if(i<12)report.samples.push({seed,mode,age:Math.floor(s.month/12),realm:s.player.realm,ending:s.ending.id,events,maxQuietYears:gap,lifespan:lifespan12(s)});
 }
 const ids=Object.keys(CULTIVATION_EVENTS);report.table={events:ids.length,uniqueChoices:ids.every(id=>new Set(CULTIVATION_EVENTS[id].choices.map(o=>o.id)).size===CULTIVATION_EVENTS[id].choices.length),newIds:ids.filter(id=>id.startsWith('r12_')),unreachedNewIds:ids.filter(id=>id.startsWith('r12_')&&!report.events[id])};assert.ok(report.table.uniqueChoices);
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/rules12-natural-audit.json',JSON.stringify(report,null,2)+'\n');console.log('RULES12 NATURAL PASS '+count+' completed lives; '+Object.keys(report.events).length+' naturally reached IDs; '+report.table.unreachedNewIds.length+' new IDs not naturally reached; '+report.editorial.length+' long-card candidates; max quiet '+report.longestQuietYears.toFixed(1)+' years');
}
