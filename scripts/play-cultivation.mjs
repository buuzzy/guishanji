import {createRun,choose,advance,validateRun,review,setActivity} from '../packages/adventure/engine.js';
import {monthSeconds} from '../packages/adventure/life.js';
import {activityOptions} from '../packages/adventure/cultivation.js';
import {ROAD_CHAINS,CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
import {writeFile,mkdir} from 'node:fs/promises';
/*
 * 「遇到这张卡按什么偏好选」的策略表搬到了 `scripts/lib/decide-policy.js` ——
 * 那里没有 Node 内置模块，纯函数谁都能 import 同一份。
 * 这里继续转发导出，既有调用方（各审计脚本、测试）一个字不用改。
 */
import {decide} from './lib/decide-policy.js';
export {decide};
export function playCultivation({seed='新版人生',rulesVersion=12,goal,...policy}={}){
 /*
  * 志向透传（2026-11-08 · 章节感补强）——
  *   以前 createRun 收了 goal 也在非经典档强制 'free'（engine.js），所以传不传没差别；
  *   志向生效（C2）之后，审计需要按命轮换志向来量「四个志向对结局分布的影响」。
  *   ⚠ 不传 goal ⇒ createRun 默认 'free' ⇒ 现有全部调用方（各审计、门禁）行为不变。
  */
 const state=createRun({seed,rulesVersion,goal}),events=[],snapshots=[],seconds={automatic:0,reading:0};
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
