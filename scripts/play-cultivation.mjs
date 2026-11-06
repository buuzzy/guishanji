import {createRun,options,choose,advance,validateRun,review,setActivity} from '../packages/adventure/engine.js';
import {monthSeconds} from '../packages/adventure/life.js';
import {activityOptions} from '../packages/adventure/cultivation.js';
import {ROAD_CHAINS,CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
import {writeFile,mkdir} from 'node:fs/promises';
export function decide(s,{path='birth',conduct='care',ending='guard',family='keep',school='array',method='clear',childhood='care',invitation='accept',material='safe',rebuild='lead',remit='coin',years='retreat'}={}){
 const id=s.pending.event,available=options(s).filter(o=>o.enabled),preferred=[];
 if(id.startsWith('advance_material_'))preferred.push(id.split('_')[4]==='0'?'learn':id.split('_')[4]==='1'?material==='risk'?'search':material==='substitute'?'substitute':'exchange':material==='risk'?'refine':'commission');
 if(id==='sect_rebuild')preferred.push(rebuild);
 if(id.startsWith('sect_council_'))preferred.push('teach','earn','ward');
 if(id==='sect_revenge')preferred.push(conduct==='selfish'?'fight':'investigate');
 if(id==='tribulation_prepare')preferred.push(ending==='dao'?'prepare':'decline');
 if(id.startsWith('years_practice_'))preferred.push(years,'stay');
 if(id==='family_support')preferred.push(remit==='stone'?'stones':'send','peace');
 if(id.startsWith('parcel_missing'))preferred.push('search');
 if(id.startsWith('parcel_exposed'))preferred.push(conduct==='selfish'?'guard':'convert');
 if(id==='reception')preferred.push(path==='mortal'?'home':path==='loose'?'leave':'test');
 if(id==='root_result')preferred.push(path==='demonic'?'dark':path==='loose'?'loose':path==='mortal'?'loose':'join','servant');
 if(id==='early_demonic')preferred.push(path==='loose'?'leave':'stay');
 if(id==='early_loose')preferred.push(path==='orthodox'?'sect':'learn');
 if(id==='early_beast')preferred.push(path==='loose'?'town':'stay');
 if(id==='first_method')preferred.push(school);
 if(id.startsWith('child_')&&childhood==='bold')preferred.push('claim','hide','trace','warn','accept','ask');
 if(id==='network_method')preferred.push(method,'clear','shade','beast','stone');
 if(id==='network_archive')preferred.push(invitation==='decline'?'decline':school==='sword'?'iron':'river');
 if(id==='network_mentor'||id==='network_ward')preferred.push(invitation==='decline'?'decline':'accept');
 if(id==='network_mentor_result')preferred.push('finish','escape','leave');
 if(id==='network_ward_result')preferred.push('evidence','investigate');
 if(id==='network_bottleneck')preferred.push('seek');
 if(id==='network_volume')preferred.push('verify','replace','decline');
 if(id==='garden_accident')preferred.push(conduct==='selfish'?'frame':'honest');
 if(id==='family_rules')preferred.push(family);
 if(id==='family_gate')preferred.push('return');
 if(id==='family_dispute')preferred.push(conduct==='selfish'?'take':'stop');
 if(id==='family_grave')preferred.push('stay');
 if(id.startsWith('breakthrough_'))preferred.push('try','service','wait');
 if(id.startsWith('selection_'))preferred.push(id.endsWith('_result')?'fair':school,'withdraw');
 if(id==='road_turn')preferred.push('keep');
 if(id==='world_raid')preferred.push(conduct==='selfish'?'loot':'escape');
 if(id==='system_final')preferred.push(ending,'guard');
 if(ROAD_CHAINS.some(a=>id.startsWith(a.id+'_')))preferred.push(conduct);
 return available.find(o=>preferred.includes(o.id)&&o.id===preferred.find(p=>available.some(a=>a.id===p)))||available[0];
}
export function playCultivation({seed='新版人生',rulesVersion=11,...policy}={}){
 const state=createRun({seed,rulesVersion}),events=[],snapshots=[],seconds={automatic:0,reading:0};
 for(let step=0;step<160&&state.phase==='life';step++){
  while(state.phase==='life'&&!state.pending){seconds.automatic+=monthSeconds(state);advance(state,1);}
  if(!state.pending)break;
  validateRun(state);events.push(state.pending.event);const o=decide(state,policy);if(!o)throw Error('没有可选项 '+state.pending.event);
  snapshots.push({event:state.pending.event,path:state.life.cultivation.path,age:Math.floor(state.month/12),option:o.id,realm:state.player.realm});
  seconds.reading+=8+state.journal.at(-1).body.length/9;choose(state,o.id);
  if(policy.activity&&activityOptions(state).find(a=>a.id===policy.activity)?.enabled)setActivity(state,policy.activity);
  /*
   * 「没钱就做工攒钱」—— 一个会算账的普通玩家会这么做。
   *
   * ⚠ 默认**不开**：事件序列保真门禁跑的是固定策略，行为必须一模一样，
   *    所以这条只在节奏审计里显式打开。
   */
  if(policy.workWhenBroke){
   const broke=state.player.stones<4,rich=state.player.stones>=8;
   const want=broke?'work':(rich?'study':null);
   if(want&&state.life.cultivation?.activity!==want&&activityOptions(state).find(a=>a.id===want)?.enabled)setActivity(state,want);
  }
  validateRun(state);
 }
 if(state.phase!=='ended')throw Error('没有完成一生 '+seed+' '+state.pending?.event);
 return{seed,policy,path:state.life.cultivation.path,ending:state.ending.id,events,snapshots,seconds,review:review(state),state};
}
export function naturalSeed(path,offset=0){for(let i=offset;i<offset+3000;i++){const seed='万千道途-'+i,s=createRun({seed});if((path==='orthodox'||path==='mortal')&&s.birth.upbringing==='ordinary'||path==='demonic'&&s.birth.upbringing==='demonic'||path==='beast'&&s.birth.upbringing==='beast'||path==='loose'&&s.birth.upbringing==='loose')return seed;}throw Error('没有自然出生 '+path);}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/play-cultivation.mjs')){
 const runs=[],count=Number(process.argv.find(a=>a.startsWith('--count='))?.split('=')[1]||400);
 for(let i=0;i<count;i++)runs.push(playCultivation({seed:'万千道途-'+i,path:['orthodox','loose','demonic','beast','mortal'][i%5],conduct:i%7===0?'selfish':i%3===0?'cautious':'care',ending:i%4===0?'dao':'guard',family:i%9===0?'sever':'keep',school:['sword','alchemy','array'][i%3]}));
 const visited=new Set(runs.flatMap(r=>r.events)),timings=runs.filter(r=>r.ending!=='battle_lost').map(r=>r.seconds.automatic+r.seconds.reading).sort((a,b)=>a-b);const report={createdAt:new Date().toISOString(),scope:'实际整数月模拟；阅读模型不代称真人时长或留存',count,modeledTimingSeconds:{scope:'Automatic 1x playback plus fixed reading model; not measured human duration',nonLethalLives:timings.length,p10:Math.round(timings[Math.floor(timings.length*.1)]),median:Math.round(timings[Math.floor(timings.length*.5)]),p90:Math.round(timings[Math.floor(timings.length*.9)])},events:Object.keys(CULTIVATION_EVENTS).length,unvisited:Object.keys(CULTIVATION_EVENTS).filter(id=>!visited.has(id)),chains:ROAD_CHAINS.map(a=>({id:a.id,stages:a.stages.length,covered:a.stages.filter((_,i)=>visited.has(a.id+'_'+i)).length})),paths:Object.fromEntries(['orthodox','loose','demonic','beast','mortal'].map(p=>[p,runs.filter(r=>r.path===p).length])),endings:[...new Set(runs.map(r=>r.ending))],samples:runs.slice(0,8).map(({state,...r})=>r)};
 await mkdir('artifacts',{recursive:true});await writeFile('artifacts/cultivation-playthroughs.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({...report,samples:report.samples.map(r=>({seed:r.seed,path:r.path,ending:r.ending,decisions:r.events.length,automaticSeconds:Math.round(r.seconds.automatic),readingModelSeconds:Math.round(r.seconds.reading)}))},null,2));
}
