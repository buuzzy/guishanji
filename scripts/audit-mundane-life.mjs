import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRun,advanceToChoice,choose,options,validateRun,nodeText,currentNode} from '../packages/adventure/engine.js';
import {decide} from './play-cultivation.mjs';
import {mundane} from '../packages/adventure/mundane-life.js';
import {canCultivate} from '../packages/adventure/story-shared.js';
export function mortalChoice(s,mode='steady'){
 const event=s.pending.event,available=options(s).filter(o=>o.enabled);let preferred=[];
 if(event==='m11_start')preferred=[mode==='yard'?'yard':mode==='farm'?'farm':'shop'];
 if(event==='m11_family_0')preferred=[mode==='single'?'single':'court'];
 if(event==='m11_family_1')preferred=['marry','part'];
 if(event==='m11_family_2')preferred=['child'];
 if(event==='m11_corpse_0')preferred=[mode==='burial'?'bury':mode==='report'?'report':'take'];
 if(event==='m11_corpse_1')preferred=[mode==='sell'?'sell':'keep'];
 if(event==='m11_corpse_2')preferred=[mode==='disaster'?'keep':mode==='sell'?'sell':'move'];
 if(event==='m11_corpse_3')preferred=[mode==='disaster'?'stay':'testify'];
 if(event.startsWith('m11_gift'))preferred=[['verify','labour','attempt','learn'][Number(event.at(-1))]];
 if(event.startsWith('m11_life_'))preferred=[mode==='wander'?'move':'steady'];
 if(event==='m11_visitor_0')preferred=[mode==='sell'?'sell':'outside'];
 if(event==='m11_visitor_1')preferred=['witness'];
 return available.find(o=>o.id===preferred.find(p=>available.some(a=>a.id===p)))||decide(s).id&&available.find(o=>o.id===decide(s).id);
}
export function playMortal(seed,mode='steady'){
 const s=createRun({seed,rulesVersion:12}),events=[],cards=[];
 for(let i=0;i<220&&s.phase==='life';i++){
  advanceToChoice(s);validateRun(s);if(!s.pending)break;
  const event=s.pending.event,o=mortalChoice(s,mode);assert.ok(o,event);
  events.push(event);cards.push({month:s.month,event,title:currentNode(s).title,body:nodeText(currentNode(s),s),choice:o.label,hint:o.hint});choose(s,o.id);validateRun(s);
 }
 assert.equal(s.phase,'ended',seed+' '+s.pending?.event);
 return {s,events,cards};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/audit-mundane-life.mjs')){
 const count=Number(process.argv.find(a=>a.startsWith('--count='))?.split('=')[1]||400),report={rulesVersion:12,scope:'Natural seeded full lives with varied automated choices; not human enjoyment or retention',count,lives:0,mortalLives:0,reached:{},samples:[],maxUnexplainedGap:0,errors:[]};
 for(let i=0;i<count;i++){
  try{const seed='凡人世事-'+i,mode=['steady','yard','farm','single','burial','report','sell','disaster','wander'][i%9],{s,events,cards}=playMortal(seed,mode);report.lives++;
   if(mundane(s).started){report.mortalLives++;for(const id of events.filter(id=>id.startsWith('m11_')))report.reached[id]=(report.reached[id]||0)+1;
    const rows=s.journal.filter(j=>j.month>=192);let gap=0;for(let k=1;k<rows.length;k++)gap=Math.max(gap,rows[k].month-rows[k-1].month);report.maxUnexplainedGap=Math.max(report.maxUnexplainedGap,gap);
    if(report.samples.length<10||events.includes('m11_gift_2'))report.samples.push({seed,mode,ending:s.ending.id,realm:s.player.realm,canCultivate:canCultivate(s),gap,money:mundane(s).money,debt:mundane(s).debt,events,cards,journal:s.journal});
   }
  }catch(error){report.errors.push({seed:'凡人世事-'+i,error:error.stack});}
 }
 report.passed=report.errors.length===0;await mkdir('artifacts',{recursive:true});await writeFile('artifacts/mundane-life-audit.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,samples:report.samples.map(r=>({seed:r.seed,mode:r.mode,ending:r.ending,realm:r.realm,gap:r.gap,events:r.events.filter(id=>id.startsWith('m11_'))})),errors:report.errors.slice(0,5)},null,2));if(!report.passed)process.exitCode=1;
}
