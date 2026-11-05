import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {startServer,projectRoot} from './serve.mjs';
import {launchBrowser} from './lib/browser.mjs';
import {createRun,choose,advance,advanceToChoice,setActivity,options,validateRun,cloneRun} from '../tests/helpers/rules11-engine.mjs';
import {activityOptions} from '../packages/adventure/cultivation.js';
import {decide} from './play-cultivation.mjs';
const built=process.argv.includes('--built'),out=join(projectRoot,'artifacts',built?'family-transfer-static':'family-transfer-source');
await mkdir(out,{recursive:true});const report={built,scope:'Actual browser mouse/touch and integer-month state comparisons; no state injection',checks:[]};
let server,browser;
const snap=p=>p.eval('adventurePreview.snapshot()');
async function stop(p){if(await p.eval('!!document.querySelector("dialog[open] [data-action=later]")')){await p.click('[data-action=later]');await p.waitFor('!document.querySelector("dialog[open]")');}if(await p.eval('adventurePreview.status().screen==="life"&&adventurePreview.status().intendsToPlay'))await p.click('#play-control');await p.waitFor('adventurePreview.status().saved');}
function seedFor(id){for(let i=0;i<500;i++){
 const seed='家计交付-'+i,s=createRun({seed});for(let j=0;j<120&&s.phase==='life';j++){
  if(!s.pending)advanceToChoice(s);if(!s.pending)break;
  if(s.pending.event===id&&(id!=='family_support'||options(s).find(o=>o.id==='send').enabled)&&(s.life.cultivation.worldDone||s.month+12<s.life.cultivation.worldAt))return seed;
  choose(s,decide(s,{path:'orthodox'}).id);if(activityOptions(s).find(a=>a.id==='work')?.enabled)setActivity(s,'work');
 }
}throw Error('No natural seed '+id);}
async function birth(p,seed){await p.navigate(server.url+'preview/?rules=11&replay='+encodeURIComponent(seed));await p.waitFor('!!window.adventurePreview');await p.click('[data-action=new]');await p.waitFor('adventurePreview.status().screen==="life"');await stop(p);const actual=await snap(p),s=createRun({seed,id:actual.id});advance(s,actual.month);assert.deepEqual(actual,s);return s;}
async function next(p,s){if(s.pending||s.phase==='ended')return;await p.click('[data-action=menu]');await p.waitFor('!!document.querySelector("dialog[open] [data-action=next]")');advanceToChoice(s);await p.click('[data-action=next]');await p.waitFor('!!adventurePreview.snapshot().pending||adventurePreview.snapshot().phase==="ended"');await p.waitFor('adventurePreview.status().saved');assert.deepEqual(await snap(p),s);}
async function select(p,s,id,touch=false){choose(s,id);await p.click('[data-action=choose][data-choice='+id+']',touch);await p.waitFor('!document.querySelector("dialog[open]")');await stop(p);const actual=await snap(p);advance(s,actual.month-s.month);assert.deepEqual(actual,s);validateRun(actual);}
async function work(p,s){if(!activityOptions(s).find(a=>a.id==='work')?.enabled||s.life.cultivation.activity==='work')return;await p.click('[data-action=menu]');await p.waitFor('!!document.querySelector("dialog[open] [data-action=focus]")');await p.click('[data-action=focus]');await p.waitFor('document.querySelectorAll("dialog[open] [data-action=activity]").length===7');setActivity(s,'work');await p.click('[data-action=activity][data-activity=work]');await p.waitFor('!document.querySelector("dialog[open]")');await p.waitFor('adventurePreview.status().saved');assert.deepEqual(await snap(p),s);}
async function reach(p,s,id){for(let i=0;i<100&&s.phase==='life';i++){await next(p,s);if(s.pending?.event===id)return;await select(p,s,decide(s,{path:'orthodox'}).id);await work(p,s);}throw Error('Did not reach '+id);}
try{
 server=await startServer({root:built?join(projectRoot,'dist'):projectRoot,port:0});report.servedRoot=built?'dist':'source';if(built){const manifest=JSON.parse(await readFile(join(projectRoot,'dist/xianxia-build.json'),'utf8')),asset=manifest.files.find(f=>f.path==='apps/preview/app.js'),response=await fetch(server.url+'apps/preview/app.js');assert.equal(response.status,200);assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),asset.sha256);report.build=manifest.builtAt;}browser=await launchBrowser();const p=await browser.page();
 let s=await birth(p,seedFor('garden_accident'));await reach(p,s,'garden_accident');const month=s.month,stones=s.player.stones;await select(p,s,'honest');assert.equal(s.month,month);assert.equal(s.player.stones,stones);assert.equal(s.life.cultivation.punishmentUntil,0);report.checks.push('truthful witness has no invented compensation or forced replanting');
 await p.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await p.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 s=await birth(p,seedFor('family_support'));await reach(p,s,'family_support');const before=cloneRun(s);assert.equal(options(s).find(o=>o.id==='send').cost.stones,3);await select(p,s,'send',true);assert.equal(s.life.family.reserve,before.life.family.reserve);assert.ok(s.month<before.month+6);await next(p,s);assert.ok(s.month>=before.month+6);assert.equal(s.life.family.reserve,before.life.family.reserve);assert.equal(s.life.family.money,before.life.family.money+3000);assert.ok(s.life.cultivation.progression.parcels.some(p=>p.status==='delivered'&&p.received===before.month+6));report.checks.push('three-stone payment converts to household money after actual six-month delivery');
 if(s.pending)await p.click('[data-action=later]');await p.eval('document.querySelector(".cultivation-id").scrollIntoView({block:"start",behavior:"instant"})');await p.screenshot(join(out,'identity-mobile.png'));await p.eval('document.querySelector("#life-map").scrollIntoView({block:"start",behavior:"instant"})');await p.screenshot(join(out,'map-mobile.png'));
 assert.equal(await p.eval('document.documentElement.scrollWidth<=innerWidth+1'),true);assert.equal(await p.eval('document.querySelectorAll(".main-column .activity-tile,.main-column .family-panel,.main-column [data-action=item],.main-column .belongings-panel button").length'),0);
 const original=cloneRun(s);await p.navigate(server.url+'preview/');await p.click('[data-action=continue]',true);await stop(p);assert.deepEqual(await snap(p),original);report.checks.push('mobile simplified panels and native refresh restoration preserve the transfer');
 assert.deepEqual(p.errors,[]);assert.ok(!p.requests.some(url=>/^https?:/u.test(url)&&!url.startsWith(server.url)));assert.ok(!p.responses.some(r=>r.status>=400));report.passed=true;report.browser=browser.version.product;console.log('FAMILY TRANSFER BROWSER PASS '+(built?'STATIC':'SOURCE'));
}catch(error){report.passed=false;report.error=error.stack;console.error(error);process.exitCode=1;}finally{await browser?.close();await server?.close();report.finishedAt=new Date().toISOString();await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
