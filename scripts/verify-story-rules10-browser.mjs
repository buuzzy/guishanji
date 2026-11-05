import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {startServer,projectRoot} from './serve.mjs';
import {launchBrowser} from './lib/browser.mjs';
import {createRun,choose,advance,advanceToChoice,options,validateRun} from '../packages/adventure/engine.js';
import {decide} from './play-cultivation.mjs';
import {storyPeople,canCultivate} from '../packages/adventure/story-rules10.js';
const built=process.argv.includes('--built'),out=join(projectRoot,'artifacts',built?'story-rules10-static':'story-rules10-source');
await mkdir(out,{recursive:true});const report={rulesVersion:10,built,scope:'Actual browser mouse/touch, natural births, persisted saves and full lives; no state injection; mobile emulation, not WeChat or physical device testing',checks:[],lives:[]};let server,browser;
const snapshot=p=>p.eval('adventurePreview.snapshot()');
async function stop(p){if(await p.eval('!!document.querySelector("dialog[open] [data-action=later]")'))await p.click('[data-action=later]');if(await p.eval('adventurePreview.status().screen==="life"&&adventurePreview.status().intendsToPlay'))await p.click('#play-control');await p.waitFor('adventurePreview.status().saved');}
async function next(p,s){if(s.pending||s.phase==='ended')return;await p.click('[data-action=menu]');await p.waitFor('!!document.querySelector("dialog[open] [data-action=next]")');advanceToChoice(s);await p.click('[data-action=next]');await p.waitFor('!!adventurePreview.snapshot().pending||adventurePreview.snapshot().phase==="ended"');await p.waitFor('adventurePreview.status().saved');assert.deepEqual(await snapshot(p),s);}
async function select(p,s,id,touch){if(!await p.eval('!!document.querySelector("dialog[open]")'))await p.click('#play-control');choose(s,id);await p.click('[data-action=choose][data-choice='+id+']',touch);await p.waitFor('!document.querySelector("dialog[open]")');await stop(p);const actual=await snapshot(p);advance(s,actual.month-s.month);assert.deepEqual(actual,s);validateRun(s);}
function find(event){for(let i=0;i<200;i++){const seed='浏览器剧情核实-'+i,s=createRun({rulesVersion:10,seed});for(let n=0;n<120&&s.phase==='life';n++){advanceToChoice(s);if(!s.pending)break;if(s.pending.event===event)return seed;choose(s,decide(s).id);}}throw Error('No natural '+event);}
try{
 server=await startServer({root:built?join(projectRoot,'dist'):projectRoot,port:0});browser=await launchBrowser();report.browser=browser.version;
 report.hashes={};for(const file of ['apps/preview/app.js','apps/preview/life-panels.js','packages/adventure/story-rules10.js','content/story-rules10.js']){const response=await fetch(server.url+file);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.deepEqual(bytes,await readFile(join(projectRoot,file)));report.hashes[file]=createHash('sha256').update(bytes).digest('hex');}
 const cases=[{seed:'root-audit-15',mode:'root'},{seed:find('echo_friend'),mode:'friend'},{seed:find('echo_relic'),mode:'relic'},{seed:find('echo_teacher'),mode:'teacher'},{seed:find('sect_feud_0'),mode:'feud'}];
 for(let i=0;i<cases.length;i++){
  const row=cases[i],p=await browser.page();await p.send('Emulation.setDeviceMetricsOverride',{width:i%2?390:1280,height:900,deviceScaleFactor:1,mobile:!!(i%2)});
  await p.navigate(server.url+'preview/?rules=10&replay='+encodeURIComponent(row.seed));await p.waitFor('!!document.querySelector("[data-action=new]")');await p.click('[data-action=new]');await p.waitFor('adventurePreview.status().screen==="life"');await stop(p);
  const born=await snapshot(p),s=createRun({seed:row.seed,id:born.id,rulesVersion:10});advance(s,born.month);assert.deepEqual(born,s);assert.equal(s.life.cultivation.rulesVersion,10);let savedRoundTrip=false;const visited=[];
  for(let n=0;n<150&&s.phase==='life';n++){
   await next(p,s);if(!s.pending)break;const event=s.pending.event;visited.push(event);
   if(event==='sect_feud_0'){
    const names=storyPeople(s).filter(p=>['执法长老','外门执事'].includes(p.role));assert.equal(names.length,2);
    const text=await p.eval('document.querySelector("#app").textContent');for(const person of names)assert.ok(text.includes(person.name)&&text.includes(person.role));
    const card=await p.eval('document.querySelector("dialog[open]").textContent');assert.ok(card.includes('两宗长老'));report.checks.push('宗门管理者已登记，卡片说明派遣与权限');
   }
   if(event==='echo_friend')assert.ok((await p.eval('document.querySelector("dialog[open]").textContent')).includes('病母'));
   if(!savedRoundTrip&&n>=6){await stop(p);await p.navigate(server.url+'preview/');await p.waitFor('!!document.querySelector("[data-action=continue]")');await p.click('[data-action=continue]');await p.waitFor('adventurePreview.status().screen==="life"');await stop(p);assert.deepEqual(await snapshot(p),s);savedRoundTrip=true;}
   let id=decide(s).id;
   if(row.mode==='friend'){const preferences={echo_friend:'wait',echo_resume:'continue',echo_friend_check:'visit',echo_friend_visit:'talk'};if(preferences[event]&&options(s).find(o=>o.id===preferences[event]&&o.enabled))id=preferences[event];}
   if(!canCultivate(s))assert.equal(s.player.realm,0);
   await select(p,s,id,!!(i%2));
  }
  assert.equal(s.phase,'ended',row.seed);assert.equal(p.errors.length,0);assert.ok(savedRoundTrip);
  if(row.mode==='friend')assert.ok(visited.includes('echo_resume')&&visited.includes('echo_friend_visit'));
  if(row.mode==='root'){assert.equal(s.player.realm,0);assert.equal(s.life.cultivation.network.method,null);}
  await p.screenshot(join(out,row.mode+'.png'));report.lives.push({seed:row.seed,mode:row.mode,ending:s.ending.id,events:visited,errors:p.errors});await p.close();
 }
 report.checks.push('五条自然人生完成，鼠标／触控操作与引擎逐步一致','暂缓后继续旧友拜访','刷新恢复存档逐值一致','无引气资格的人生没有修炼心法或境界');report.passed=true;
}catch(error){report.passed=false;report.error=error.stack;process.exitCode=1;}finally{await browser?.close();await server?.close();await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,built,lives:report.lives.length,checks:report.checks,error:report.error},null,2));}
