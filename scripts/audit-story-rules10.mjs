import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createRun,advance,choose,options,currentNode,nodeText,validateRun} from '../packages/adventure/engine.js';
import {RULES10_CULTIVATION_EVENTS as CULTIVATION_EVENTS,ROAD_CHAINS} from '../content/cultivation-stories.js';
import {canCultivate,rootLabel,storyPeople} from '../packages/adventure/story-rules10.js';
import {decide} from './play-cultivation.mjs';
import {hashText} from '../packages/core/random.js';

const count=600,visits=new Map(),choices=new Map(),roots=[],samples=[],errors=[];
for(let i=0;i<count;i++){
 const seed='完整剧情核实-'+i,s=createRun({rulesVersion:10,seed}),initial=s.player.root,events=[];let peak=0;
 const policy={path:['orthodox','loose','demonic','beast','mortal'][i%5],conduct:['care','cautious','selfish'][i%3],school:['sword','alchemy','array'][i%3],method:i%3===0?'ember':'clear',childhood:i%2?'bold':'care',ending:i%4===0?'dao':'guard'};
 for(let step=0;step<180&&s.phase==='life';step++){
  while(s.phase==='life'&&!s.pending){advance(s,1);peak=Math.max(peak,s.player.realm);}
  if(!s.pending)break;
  const event=s.pending.event,available=options(s).filter(o=>o.enabled);
  assert.ok(available.length,event+' has no enabled choice');
  const selected=i%4===0?available[hashText(seed+':audit-choice:'+step)%available.length]:decide(s,policy);
  assert.ok(selected?.enabled,event);validateRun(s);
  const text=nodeText(currentNode(s),s);assert.ok(text.length>8,event);
  if(!visits.has(event))visits.set(event,{seed,root:rootLabel(s),realm:s.player.realm,path:s.life.cultivation.path,body:text,people:storyPeople(s).map(p=>({name:p.name,role:p.role}))});
  choices.set(event+':'+selected.id,(choices.get(event+':'+selected.id)||0)+1);events.push(event);
  if(!canCultivate(s)){assert.equal(s.player.realm,0);assert.equal(s.life.cultivation.progress,0);assert.equal(s.life.cultivation.network.method,null);assert.ok(!/^(breakthrough_|selection_|network_(method|archive|mentor|ward|senior))/.test(event),'unqualified '+event);}
  choose(s,selected.id);validateRun(s);peak=Math.max(peak,s.player.realm);
 }
 assert.equal(s.phase,'ended',seed);
 assert.ok(!events.includes('network_echo'),seed);
 if(initial==='未显灵根')roots.push({seed,initial,final:rootLabel(s),body:s.life.cultivation.story10.body,peak,ending:s.ending.id});
 if(i<8)samples.push({seed,events,ending:s.ending.id,peak});
}
const catalog=Object.entries(CULTIVATION_EVENTS).map(([id,event])=>({id,title:event.title,choices:event.choices.map(o=>({id:o.id,label:typeof o.label==='string'?o.label:'根据实际状态生成',needsSpirit:!!o.requires?.spirit,needsMana:!!o.requires?.mana,next:o.next||null,completedCount:choices.get(id+':'+o.id)||0})),naturalExample:visits.get(id)||null,coverage:visits.has(id)?'自然人生已到达':'仅静态结构检查／专项受控测试另见测试报告'}));
for(const row of catalog){assert.equal(new Set(row.choices.map(o=>o.id)).size,row.choices.length,row.id);assert.ok(row.choices.length>=2,row.id);}
const sources=['content/cultivation-stories.js','content/story-rules10.js','content/cultivation-revision.js','content/decision-details.js','content/allegiance-stories.js','content/revision9-stories.js','content/story-network.js','content/progression-stories.js','content/cultivation-daily.js','packages/adventure/story-rules10.js'];
const sourceHashes={};for(const path of sources)sourceHashes[path]=createHash('sha256').update(await readFile(path)).digest('hex');
const report={createdAt:new Date().toISOString(),rulesVersion:10,passed:true,scope:'全部当前决策结构与相关自动经历源文件；600次实际整数月自然人生。未到达事件不宣称试玩通过，自动策略不代称真人可玩性或留存。',sourceHashes,count,decisions:catalog.length,naturallyReached:visits.size,unreached:catalog.filter(r=>!r.naturalExample).map(r=>r.id),roots,chains:ROAD_CHAINS.map(c=>({id:c.id,stages:c.stages.length,reached:c.stages.map((_,i)=>visits.has(c.id+'_'+i))})),errors,samples,catalog};
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/story-rules10-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true,count,decisions:catalog.length,naturallyReached:visits.size,undetectedRoots:roots.length,confirmedAbsent:roots.filter(r=>r.final==='无灵根').length,discovered:roots.filter(r=>r.final!=='无灵根'&&r.final!=='未显灵根').length,unreached:report.unreached,chains:report.chains},null,2));
