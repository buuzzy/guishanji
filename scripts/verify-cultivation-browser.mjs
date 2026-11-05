import assert from 'node:assert/strict';
import {mkdir,mkdtemp,readFile,writeFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {startServer,projectRoot} from './serve.mjs';
import {launchBrowser,delay} from './lib/browser.mjs';
import {createRun,choose,advance,advanceToChoice,options,cloneRun,validateRun,setActivity,travelTo,leaveExpedition,upgradeRun} from '../packages/adventure/engine.js';
import {routeOptions,currentContinent} from '../packages/adventure/cultivation.js';
import {ADVENTURE_KEY} from '../packages/adventure/store.js';
import {decide,playCultivation,naturalSeed} from './play-cultivation.mjs';
const built=process.argv.includes('--built'),artifact=join(projectRoot,'artifacts',built?'cultivation-browser-static':'cultivation-browser-source');
await mkdir(artifact,{recursive:true});
const report={startedAt:new Date().toISOString(),built,checks:[],lives:[],scope:'Actual Chrome mouse/touch decisions and automatic playback; accelerated full lives are not human retention evidence'};
let service,browser;
const snap=p=>p.eval('adventurePreview.snapshot()');
const saved=p=>p.waitFor('adventurePreview.status().saved||adventurePreview.status().blocked');
async function pause(p){if(await p.eval('adventurePreview.status().screen==="life"&&adventurePreview.status().intendsToPlay&&!document.querySelector("dialog[open]")'))await p.click('#play-control');await saved(p);assert.equal(await p.eval('adventurePreview.status().blocked'),false);}
async function menu(p){await p.click('[data-action=menu]');await p.waitFor('!!document.querySelector("dialog[open] [data-action=next]")');}
async function birth(p,seed,touch=false){
 await p.navigate(service.url+'preview/?replay='+encodeURIComponent(seed));await p.waitFor('!!window.adventurePreview');
 assert.equal(await p.eval('!!document.querySelector("#birth-form")'),false);
 await p.click('[data-action=new]',touch);await p.waitFor('adventurePreview.status().screen==="life"');await pause(p);
 const actual=await snap(p),expected=createRun({seed,id:actual.id});advance(expected,actual.month);assert.deepEqual(actual,expected);return expected;
}
async function next(p,s,touch=false){
 if(s.pending||s.phase==='ended')return;
 await menu(p);advanceToChoice(s);await p.click('[data-action=next]',touch);
 await p.waitFor('!!adventurePreview.snapshot().pending||adventurePreview.snapshot().phase==="ended"');await saved(p);
 assert.deepEqual(await snap(p),s);
}
async function select(p,s,id,touch=false){
 await p.waitFor('!!document.querySelector("#decision-title")');
 const text=await p.eval('document.querySelector("#decision-options").textContent');assert.ok(!/成功率|成功机会|这次安排|\d+%/u.test(text));
 choose(s,id);await p.click('[data-action=choose][data-choice='+id+']',touch);
 await p.waitFor('!document.querySelector("dialog[open]")');
 if(s.phase!=='ended')await pause(p);else await saved(p);
 const actual=await snap(p);advance(s,actual.month-s.month);assert.deepEqual(actual,s);validateRun(actual);
}
async function layout(p){
 const view=await p.eval('({width:innerWidth,scroll:document.documentElement.scrollWidth,chapter:document.querySelectorAll(".chapter-strip,#birth-form").length,rect:document.querySelector("dialog[open]")?.getBoundingClientRect().toJSON(),ids:[...document.querySelectorAll("#life-log [data-record]")].map(e=>Number(e.dataset.record))})');
 assert.ok(view.scroll<=view.width+1);assert.equal(view.chapter,0);if(view.rect){assert.ok(view.rect.left>=0);assert.ok(view.rect.right<=view.width+1);}assert.ok(view.ids.every((v,i)=>!i||v<view.ids[i-1]));
}
async function automatic(p){
 const s=await birth(p,naturalSeed('orthodox'));await p.click('#play-control');
 const widths=await p.eval('(async()=>{const a=[];for(let i=0;i<20;i++){await new Promise(r=>requestAnimationFrame(r));a.push(parseFloat(document.querySelector("#year-progress").style.width));}return a;})()');assert.ok(new Set(widths).size>8);
 await p.click('#play-control');const month=(await snap(p)).month,width=await p.eval('document.querySelector("#year-progress").style.width');await delay(250);assert.equal((await snap(p)).month,month);assert.equal(await p.eval('document.querySelector("#year-progress").style.width'),width);
 await p.click('[data-action=set-speed][data-speed="4"]');await p.click('#play-control');await p.waitFor('!!adventurePreview.snapshot().pending',30000);
 const pending=await snap(p);assert.ok(pending.life.automaticCount>=1);await delay(250);assert.deepEqual(await snap(p),pending);assert.ok(pending.pending.event.startsWith('child_'));
 await p.screenshot(join(artifact,'automatic-admission.png'));const childhoodOption=options(pending).find(o=>o.enabled);choose(pending,childhoodOption.id);await p.click('[data-action=choose][data-choice='+childhoodOption.id+']');await p.waitFor('adventurePreview.status().intendsToPlay');const before=(await snap(p)).month;await p.waitFor('adventurePreview.snapshot().month>'+before,18000);await pause(p);
 report.checks.push('one-click random birth; automatic childhood with meaningful choices; smooth frame progress; fractional pause; automatic decision pause; readable result hold and automatic continuation');
}
async function fullLife(p,path,conduct='care',mobile=false,offset=0){
 const seed=naturalSeed(path,offset),policy={path,conduct};
 await p.send('Emulation.setDeviceMetricsOverride',{width:mobile?390:1280,height:mobile?844:960,deviceScaleFactor:1,mobile});
 let s=await birth(p,seed,mobile),restored=false,events=[];
 for(let i=0;i<100&&s.phase==='life';i++){
  await next(p,s,mobile);if(s.phase==='ended')break;events.push(s.pending.event);await layout(p);
  if(!restored&&i>=4){const original=cloneRun(s);await p.navigate(service.url+'preview/');await p.click('[data-action=continue]',mobile);await pause(p);assert.deepEqual(await snap(p),original);restored=true;}
  if(i===4)await p.screenshot(join(artifact,path+'-'+conduct+'-life.png'));
  await select(p,s,decide(s,policy).id,mobile);
 }
 assert.equal(s.phase,'ended');const independent=playCultivation({seed,...policy}).state;independent.id=s.id;assert.deepEqual(s,independent,'browser route must match independently played life');
 return {seed,requestedPath:path,path:s.life.cultivation.path,conduct,mobile,events,ending:s.ending.id,decisions:s.decisions.length};
}
async function activities(p){
 let travelSeed;for(let i=0;i<500;i++){const candidate=naturalSeed('loose',i);if(createRun({seed:candidate}).player.stones>=3){travelSeed=candidate;break;}}assert.ok(travelSeed);let s=await birth(p,travelSeed);
 for(let i=0;i<20&&s.pending?.event!=='first_method';i++){await next(p,s);if(s.pending.event==='first_method')break;await select(p,s,decide(s,{path:'loose'}).id);}
 assert.equal(s.pending.event,'first_method');await select(p,s,'array');
 await menu(p);await p.click('[data-action=focus]');setActivity(s,'sword');await p.click('[data-action=activity][data-activity=sword]');await saved(p);assert.deepEqual(await snap(p),s);
 const target=routeOptions(s).find(r=>r.enabled);assert.ok(target);await menu(p);await p.click('[data-action=world]');await p.screenshot(join(artifact,'continent-map.png'));travelTo(s,target.id);await p.click('[data-action=travel][data-place='+target.id+']');await pause(p);let actual=await snap(p);advance(s,actual.month-s.month);assert.deepEqual(actual,s);
 await next(p,s);assert.equal(currentContinent(s),target.id);assert.deepEqual(s.life.cultivation.routes.at(-1),target.route);await select(p,s,decide(s,{path:'loose'}).id);
 report.checks.push('native daily focus; real travel payment, elapsed route and continent map');
 let trialSeed;for(let i=0;i<500;i++){const candidate=naturalSeed('orthodox',i),played=playCultivation({seed:candidate,path:'orthodox'});if(played.events.includes('sect_trial_0')){trialSeed=candidate;break;}}assert.ok(trialSeed);s=await birth(p,trialSeed);
 for(let i=0;i<70&&s.phase==='life'&&s.pending?.event!=='sect_trial_0';i++){await next(p,s);if(s.pending?.event==='sect_trial_0')break;await select(p,s,decide(s,{path:'orthodox'}).id);}
 assert.equal(s.pending.event,'sect_trial_0');await select(p,s,'care');const owned=[...s.inventory];await menu(p);assert.equal(await p.eval('!!document.querySelector("[data-action=withdraw]")'),true);leaveExpedition(s);await p.click('[data-action=withdraw]');await pause(p);actual=await snap(p);advance(s,actual.month-s.month);assert.deepEqual(actual,s);assert.deepEqual(s.inventory,owned);assert.equal(s.life.cultivation.activeChain,null);
 report.checks.push('active expedition withdrawal cancels unfinished stages and retains owned items');
}
async function archives(p,downloads){
 let s=await birth(p,naturalSeed('orthodox'));await next(p,s);
 const other=await browser.page();await other.navigate(service.url+'preview/');await other.click('[data-action=continue]');await other.waitFor('!!adventurePreview.snapshot().pending');
 const conflictOptions=options(s).filter(o=>o.enabled);await select(p,s,conflictOptions[0].id);await other.waitFor('adventurePreview.status().blocked');const raw=await p.eval('localStorage.getItem('+JSON.stringify(ADVENTURE_KEY)+')');
 await other.click('[data-action=choose][data-choice='+conflictOptions.at(-1).id+']');await other.waitFor('!document.querySelector("dialog[open]")');assert.equal(await other.eval('localStorage.getItem('+JSON.stringify(ADVENTURE_KEY)+')'),raw);
 await menu(other);await other.click('[data-action=export]');await p.waitFor('true');
 for(let i=0;i<100;i++){if((await readdir(downloads)).some(n=>n.endsWith('.json')))break;await delay(70);}
 const file=(await readdir(downloads)).find(n=>n.endsWith('.json'));assert.ok(file);const doc=JSON.parse(await readFile(join(downloads,file),'utf8'));validateRun(doc.state);assert.equal(doc.state.decisions.at(-1).choice,conflictOptions.at(-1).id);assert.deepEqual(other.errors,[]);await other.close();
 report.checks.push('two-tab write conflict protects original; actual native JSON export keeps unsaved choice');
 const fixture=join(projectRoot,'tests/fixtures/adventure-preview3.json'),original=await readFile(fixture,'utf8'),old=JSON.parse(original);
 await menu(p);await p.click('[data-action=history]');await p.click('[data-action=import]');const {root}=await p.send('DOM.getDocument');const {nodeId}=await p.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#import-file'});await p.send('DOM.setFileInputFiles',{nodeId,files:[fixture]});
 await p.waitFor('document.querySelector("#notice").textContent.includes("存档已导入")');const migrated=await snap(p);assert.deepEqual(migrated,upgradeRun(old.lives.find(l=>l.id===old.activeId)));assert.equal(await readFile(fixture,'utf8'),original);await p.click('[data-action=continue]');await pause(p);s=await snap(p);await next(p,s);assert.equal(s.life.cultivation,undefined);await p.screenshot(join(artifact,'preview3-compatible.png'));
 report.checks.push('native preview.3 file import and original story continuation');
}
try{
 service=await startServer({root:built?join(projectRoot,'dist'):projectRoot,port:0});browser=await launchBrowser();report.browser=browser.version;
 const downloads=await mkdtemp(join(artifact,'downloads-'));await browser.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath:downloads});const p=await browser.page();
 await automatic(p);await activities(p);
 for(const [i,path]of ['orthodox','loose','demonic','beast','mortal'].entries()){console.log('CULTIVATION BROWSER '+path);report.lives.push(await fullLife(p,path,'care',i===3));}
 // A separately selected natural seed makes the destructive branch actually lethal.
 let badSeed;for(let i=0;i<300;i++){const candidate=naturalSeed('demonic',i),r=playCultivation({seed:candidate,path:'demonic',conduct:'selfish'});if(r.ending==='battle_lost'){badSeed=Number(candidate.split('-').at(-1));break;}}
 assert.ok(Number.isInteger(badSeed));report.lives.push(await fullLife(p,'demonic','selfish',false,badSeed));
 await archives(p,downloads);assert.deepEqual(p.errors,[]);assert.ok(!p.requests.some(u=>/^https?:/u.test(u)&&!u.startsWith(service.url)));assert.ok(!p.responses.some(r=>r.status>=400));report.checks.push('desktop/mobile no overflow, newest-first feed, no runtime errors or external requests');report.passed=true;
}catch(e){report.passed=false;report.failure=e.stack;console.error(e);process.exitCode=1;}
finally{report.finishedAt=new Date().toISOString();await writeFile(join(artifact,'report.json'),JSON.stringify(report,null,2)+'\n');if(browser)await browser.close();if(service)await service.close();}
console.log('CULTIVATION BROWSER '+(report.passed?'PASS':'FAIL')+' '+(built?'STATIC':'SOURCE')+' '+report.lives.length+' complete lives');
