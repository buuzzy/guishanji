import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {startServer,projectRoot} from './serve.mjs';
import {launchBrowser} from './lib/browser.mjs';
import {createRun,advance,advanceToChoice,choose,options,validateRun} from '../packages/adventure/engine.js';
import {decision12} from './audit-story-rules12.mjs';
import {lifespan12} from '../packages/adventure/story-rules12.js';
const built=process.argv.includes('--built'),out=join(projectRoot,'artifacts',built?'rules12-static':'rules12-source');
await mkdir(out,{recursive:true});let browser,server;
const report={rulesVersion:12,built,scope:'Actual Chrome mouse/touch, natural seeded births, full lives and save reload. Mobile emulation; not WeChat developer tools or physical-device testing.',lives:[],checks:[],hashes:{}};
const snap=p=>p.eval('adventurePreview.snapshot()');
async function stop(p){if(await p.eval('!!document.querySelector("dialog[open] [data-action=later]")'))await p.click('[data-action=later]');if(await p.eval('adventurePreview.status().screen==="life"&&adventurePreview.status().intendsToPlay'))await p.click('#play-control');await p.waitFor('adventurePreview.status().saved');}
async function next(p,s){if(s.pending||s.phase==='ended')return;await p.click('[data-action=menu]');await p.waitFor('!!document.querySelector("dialog[open] [data-action=next]")');advanceToChoice(s);await p.click('[data-action=next]');await p.waitFor('!!adventurePreview.snapshot().pending||adventurePreview.snapshot().phase==="ended"');await p.waitFor('adventurePreview.status().saved');assert.deepEqual(await snap(p),s);}
try{
 server=await startServer({root:built?join(projectRoot,'dist'):projectRoot,port:0});browser=await launchBrowser();report.browser=browser.version;
 for(const file of ['apps/preview/app.js','apps/preview/life-panels.js','packages/adventure/story-rules12.js','content/story-rules12.js']){const r=await fetch(server.url+file);assert.equal(r.status,200);const bytes=Buffer.from(await r.arrayBuffer());assert.deepEqual(bytes,await readFile(join(projectRoot,file)));report.hashes[file]=createHash('sha256').update(bytes).digest('hex');}
 const cases=[{seed:'规则十二人生-0',mode:'retreat'},{seed:'规则十二人生-4',mode:'retreat'},{seed:'规则十二人生-5',mode:'work'},{seed:'规则十二人生-6',mode:'travel'},{seed:'规则十二人生-11',mode:'risk'}];
 for(let i=0;i<cases.length;i++){
  const row=cases[i],p=await browser.page(),mobile=!!(i%2);await p.send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1280,height:900,deviceScaleFactor:1,mobile});
  await p.navigate(server.url+'preview/?replay='+encodeURIComponent(row.seed));await p.waitFor('!!document.querySelector("[data-action=new]")');await p.click('[data-action=new]');await p.waitFor('adventurePreview.status().screen==="life"');await stop(p);
  let actual=await snap(p),s=createRun({seed:row.seed,id:actual.id});advance(s,actual.month);assert.deepEqual(actual,s);assert.equal(s.life.cultivation.rulesVersion,12);
  let reload=false;const visited=[];
  for(let n=0;n<240&&s.phase==='life';n++){
   await next(p,s);if(!s.pending)break;visited.push(s.pending.event);const os=options(s);
   if(!await p.eval('!!document.querySelector("dialog[open]")'))await p.click('#play-control');
   const shown=await p.eval('[...document.querySelectorAll("dialog[open] [data-choice]")].map(el=>el.dataset.choice)');assert.deepEqual(shown,os.map(o=>o.id));
   const body=await p.eval('document.querySelector("dialog[open] #decision-title").nextElementSibling.textContent');assert.ok([...body].length<=160,'card too long '+s.pending.event);
   if(s.pending.event==='network_method'){assert.ok(!shown.includes('shade')||s.life.cultivation.path==='demonic');assert.ok(!shown.includes('beast')||s.life.cultivation.path==='beast');report.checks.push('无关师承选项完全隐藏');}
   const id=decision12(s,row.mode).id;choose(s,id);await p.click('[data-action=choose][data-choice='+id+']',mobile);await p.waitFor('!document.querySelector("dialog[open]")');await stop(p);actual=await snap(p);advance(s,actual.month-s.month);assert.deepEqual(actual,s);validateRun(s);
   if(!reload&&n>=7&&s.phase==='life'){await p.navigate(server.url+'preview/');await p.waitFor('!!document.querySelector("[data-action=continue]")');await p.click('[data-action=continue]');await p.waitFor('adventurePreview.status().screen==="life"');await stop(p);assert.deepEqual(await snap(p),s);reload=true;report.checks.push('新版存档刷新恢复一致');}
  }
  assert.equal(s.phase,'ended');assert.equal(p.errors.length,0);assert.ok(await p.eval('document.documentElement.scrollWidth<=innerWidth+1'));await p.screenshot(join(out,'life-'+i+'.png'));
  report.lives.push({seed:row.seed,mode:row.mode,realm:s.player.realm,age:Math.floor(s.month/12),lifespan:lifespan12(s),ending:s.ending.id,reload,events:visited,errors:p.errors});await p.close();
 }
 report.checks=[...new Set(report.checks)];report.passed=true;
}catch(e){report.passed=false;report.error=e.stack;process.exitCode=1;}finally{await browser?.close();await server?.close();await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:report.passed,built,lives:report.lives.length,error:report.error},null,2));}
