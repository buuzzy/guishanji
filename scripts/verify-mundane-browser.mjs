import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {startServer,projectRoot} from './serve.mjs';
import {launchBrowser} from './lib/browser.mjs';
import {createRun,choose,advance,advanceToChoice,validateRun,options} from '../packages/adventure/engine.js';
import {mortalChoice} from './audit-mundane-life.mjs';
import {mundane,mundanePeople} from '../packages/adventure/mundane-life.js';
const built=process.argv.includes('--built'),out=join(projectRoot,'artifacts',built?'mundane-static':'mundane-source');
await mkdir(out,{recursive:true});let server,browser;
const report={rulesVersion:11,built,scope:'Actual Chrome mouse/touch with natural births and no state injection; emulated mobile, not mini-program or physical-device verification',lives:[],checks:[],hashes:{}};
const snapshot=p=>p.eval('adventurePreview.snapshot()');
async function stop(p){if(await p.eval('!!document.querySelector("dialog[open] [data-action=later]")'))await p.click('[data-action=later]');if(await p.eval('adventurePreview.status().screen==="life"&&adventurePreview.status().intendsToPlay'))await p.click('#play-control');await p.waitFor('adventurePreview.status().saved');}
async function next(p,s){if(s.pending||s.phase==='ended')return;await p.click('[data-action=menu]');await p.waitFor('!!document.querySelector("dialog[open] [data-action=next]")');advanceToChoice(s);await p.click('[data-action=next]');await p.waitFor('!!adventurePreview.snapshot().pending||adventurePreview.snapshot().phase==="ended"');await p.waitFor('adventurePreview.status().saved');assert.deepEqual(await snapshot(p),s);}
try{
 server=await startServer({root:built?join(projectRoot,'dist'):projectRoot,port:0});browser=await launchBrowser();report.browser=browser.version;
 for(const file of ['apps/preview/app.js','apps/preview/life-panels.js','packages/adventure/mundane-life.js','content/mundane-stories.js']){const response=await fetch(server.url+file);assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer());assert.deepEqual(bytes,await readFile(join(projectRoot,file)));report.hashes[file]=createHash('sha256').update(bytes).digest('hex');}
 const cases=[{seed:'凡人世事-24',mode:'steady'},{seed:'凡人世事-28',mode:'yard'},{seed:'凡人世事-74',mode:'farm'},{seed:'凡人世事-177',mode:'sell'},{seed:'root-audit-15',mode:'burial'}];
 for(let i=0;i<cases.length;i++){
  const row=cases[i],p=await browser.page();await p.send('Emulation.setDeviceMetricsOverride',{width:i%2?390:1280,height:900,deviceScaleFactor:1,mobile:!!(i%2)});
  await p.navigate(server.url+'preview/?replay='+encodeURIComponent(row.seed));await p.waitFor('!!document.querySelector("[data-action=new]")');await p.click('[data-action=new]');await p.waitFor('adventurePreview.status().screen==="life"');await stop(p);
  const born=await snapshot(p),s=createRun({seed:row.seed,id:born.id});advance(s,born.month);assert.deepEqual(born,s);assert.equal(s.life.cultivation.rulesVersion,11);
  const visited=[];let reloaded=false,moneyChecked=false,peopleChecked=false;
  for(let n=0;n<220&&s.phase==='life';n++){
   await next(p,s);if(!s.pending)break;const event=s.pending.event;visited.push(event);
   if(mundane(s).started){
    const html=await p.eval('document.querySelector("#app").textContent');assert.ok(html.includes('钱粮与家产'));assert.ok(await p.eval('!!document.querySelector("[data-value=money]")'));moneyChecked=true;
    if(event!=='m11_start'&&mundanePeople(s).length){for(const person of mundanePeople(s))assert.ok(html.includes(person.name));peopleChecked=true;}
    if(event.startsWith('m11_')){const text=await p.eval('document.querySelector("dialog[open]").textContent');assert.ok(!/\d+%/.test(text));report.checks.push(event+'：正文与选项无内部成功率');}
    if(!reloaded&&n>=9){await stop(p);await p.navigate(server.url+'preview/');await p.waitFor('!!document.querySelector("[data-action=continue]")');await p.click('[data-action=continue]');await p.waitFor('adventurePreview.status().screen==="life"');await stop(p);assert.deepEqual(await snapshot(p),s);reloaded=true;}
   }
   const id=mortalChoice(s,row.mode).id;if(!await p.eval('!!document.querySelector("dialog[open]")'))await p.click('#play-control');choose(s,id);await p.click('[data-action=choose][data-choice='+id+']',!!(i%2));await p.waitFor('!document.querySelector("dialog[open]")');await stop(p);const actual=await snapshot(p);advance(s,actual.month-s.month);assert.deepEqual(actual,s);validateRun(s);
  }
  assert.equal(s.phase,'ended');assert.ok(reloaded&&moneyChecked&&peopleChecked);assert.equal(p.errors.length,0);
  if(row.seed==='凡人世事-177')assert.ok(visited.includes('m11_gift_3')&&s.player.realm>=1,'natural late entry');
  if(row.mode==='burial'&&visited.includes('m11_corpse_0'))assert.ok(!visited.includes('m11_corpse_2'));
  await p.screenshot(join(out,'life-'+i+'.png'));report.lives.push({seed:row.seed,mode:row.mode,ending:s.ending.id,realm:s.player.realm,events:visited,errors:p.errors});await p.close();
 }
 report.checks=[...new Set(report.checks)];report.checks.push('五条完整人生鼠标／触控与整数月引擎逐步一致','钱粮和实际结识的人物可见，刷新存档恢复一致','自然迟入道路线完成植灵与引气后继续人生');report.passed=true;
}catch(error){report.passed=false;report.error=error.stack;process.exitCode=1;}finally{await browser?.close();await server?.close();await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,built,browser:report.browser,lives:report.lives.length,error:report.error},null,2));}
