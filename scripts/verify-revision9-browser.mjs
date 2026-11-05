import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {startServer,projectRoot} from './serve.mjs';
import {launchBrowser,delay} from './lib/browser.mjs';
import {createRun,advance,advanceToChoice,choose,options,validateRun} from '../tests/helpers/rules11-engine.mjs';
import {autoChoice} from '../packages/adventure/auto-choice.js';
import {decide} from './play-cultivation.mjs';
const built=process.argv.includes('--built'),out=join(projectRoot,'artifacts',built?'revision9-static':'revision9-source');
await mkdir(out,{recursive:true});
const report={built,rulesVersion:11,scope:'Actual mouse/touch and keyboard input; natural life and persisted save; no state injection; mobile emulation',checks:[]};
let server,browser;
const snapshot=p=>p.eval('adventurePreview.snapshot()');
async function stop(p){
 if(await p.eval('!!document.querySelector("dialog[open] [data-action=later]")'))await p.click('[data-action=later]');
 if(await p.eval('adventurePreview.status().screen==="life"&&adventurePreview.status().intendsToPlay'))await p.click('#play-control');
 await p.waitFor('adventurePreview.status().saved');
}
async function pauseAfterAuto(p,s,cursor){
 await p.waitFor('adventurePreview.snapshot().autoPolicy.cursor==='+cursor,25000);
 await stop(p);const actual=await snapshot(p);advance(s,actual.month-s.month);assert.deepEqual(actual,s);validateRun(s);
}
const storyPolicy={path:'demonic',conduct:'care',school:'array'};
function storyChoice(s,mode){
 const desired={manual:{dark_ledger_1:'cautious',manual_study:'gentle'},mine:{thin_root_offer:'mine',thin_root_mine:'leave',thin_root_return:'learn'}}[mode]?.[s.pending.event];
 return desired&&options(s).find(o=>o.id===desired&&o.enabled)?desired:decide(s,mode==='mine'?{path:'loose'}:storyPolicy).id;
}
function findStory(mode,target){
 for(let i=0;i<400;i++){
  const seed='规则九故事试玩-'+i,s=createRun({seed});
  for(let n=0;n<100&&s.phase==='life';n++){advanceToChoice(s);if(!s.pending)break;
   if(s.pending.event===target)return seed;choose(s,storyChoice(s,mode));
  }
 }
 throw Error('No natural story seed for '+target);
}
async function storyNext(p,s){
 if(s.pending||s.phase==='ended')return;
 await p.click('[data-action=menu]');await p.waitFor('!!document.querySelector("dialog[open] [data-action=next]")');advanceToChoice(s);await p.click('[data-action=next]');
 await p.waitFor('!!adventurePreview.snapshot().pending||adventurePreview.snapshot().phase==="ended"');await p.waitFor('adventurePreview.status().saved');assert.deepEqual(await snapshot(p),s);
}
async function storySelect(p,s,id){
 choose(s,id);await p.click('[data-action=choose][data-choice='+id+']');await p.waitFor('!document.querySelector("dialog[open]")');await stop(p);
 const actual=await snapshot(p);advance(s,actual.month-s.month);assert.deepEqual(actual,s);validateRun(s);
}
async function storyReach(p,s,mode,target){
 for(let n=0;n<100&&s.phase==='life';n++){await storyNext(p,s);if(s.pending?.event===target)return;if(!s.pending)break;await storySelect(p,s,storyChoice(s,mode));}
 throw Error('Browser did not reach '+target);
}
try{
 server=await startServer({root:built?join(projectRoot,'dist'):projectRoot,port:0});
 report.servedHashes={};
 for(const path of ['apps/preview/app.js','packages/adventure/revision9.js','packages/adventure/auto-choice.js','content/revision9-stories.js']){
  const response=await fetch(server.url+path);assert.equal(response.status,200);
  const hash=createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
  assert.equal(hash,createHash('sha256').update(await readFile(join(projectRoot,built?'dist':'',path))).digest('hex'));report.servedHashes[path]=hash;
 }
 browser=await launchBrowser();const p=await browser.page();
 await p.navigate(server.url+'preview/?rules=11&replay='+encodeURIComponent('规则九自动抉择-11'));
 await p.click('[data-action=new]');await p.waitFor('adventurePreview.status().screen==="life"');await stop(p);
 let actual=await snapshot(p),s=createRun({seed:actual.seed,id:actual.id});advance(s,actual.month);assert.deepEqual(actual,s);assert.equal(s.life.cultivation.rulesVersion,11);assert.equal(s.autoPolicy.enabled,false);
 assert.equal(await p.eval('document.querySelector("#life-activity-status")'),null);
 report.checks.push('new rules11 life agrees with source engine; automatic choices off by default; redundant status panel absent');
 await p.click('[data-action=menu]');await p.waitFor('!!document.querySelector("dialog[open] [data-action=auto]")');await p.click('[data-action=auto]');await p.waitFor('adventurePreview.status().saved');s.autoPolicy.enabled=true;s.revision++;
 await p.click('[data-action=next]');advanceToChoice(s);await p.waitFor('!!adventurePreview.snapshot().pending');await p.click('[data-action=later]');await p.waitFor('adventurePreview.status().saved');assert.deepEqual(await snapshot(p),s);
 await delay(1700);assert.deepEqual(await snapshot(p),s);
 await p.click('#play-control');await p.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await p.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await p.waitFor('!document.querySelector("dialog[open]")');await delay(1700);assert.deepEqual(await snapshot(p),s);
 report.checks.push('later and Escape cancel automatic choice without advancing time or consuming randomness');
 const selected=autoChoice(s.seed,s.autoPolicy.cursor,options(s).map(o=>({id:o.id,enabled:o.enabled})));
 choose(s,selected);s.autoPolicy.cursor++;s.revision++;
 await p.click('#play-control');await pauseAfterAuto(p,s,1);
 report.checks.push('reopening by play control restarts timer; exactly one enabled choice matches independent pure policy and normal choose path');
 await p.click('[data-action=menu]');await p.waitFor('!!document.querySelector("dialog[open] [data-action=auto]")');await delay(1700);assert.deepEqual(await snapshot(p),s);await p.click('[data-action=close]');
 await p.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await p.send('Emulation.setTouchEmulationEnabled',{enabled:true});
 await p.navigate(server.url+'preview/');await p.click('[data-action=continue]',true);await p.waitFor('adventurePreview.status().screen==="life"');await stop(p);actual=await snapshot(p);advance(s,actual.month-s.month);assert.deepEqual(actual,s);assert.equal(s.autoPolicy.cursor,1);assert.equal(s.autoPolicy.enabled,true);
 report.checks.push('reload restores enabled policy and independent cursor without repeating the previous choice');
 await p.click('[data-action=menu]',true);await p.waitFor('!!document.querySelector("dialog[open] [data-action=auto]")');await p.click('[data-action=next]',true);advanceToChoice(s);await p.click('[data-action=later]',true);await p.waitFor('adventurePreview.status().saved');assert.deepEqual(await snapshot(p),s);
 // A hidden page cancels the open decision; bringing it back must not resume silently.
 await p.click('#play-control',true);await p.send('Emulation.setPageVisibilityState',{visibilityState:'hidden'}).catch(async()=>{
  const other=await browser.page();await other.send('Page.bringToFront');await delay(150);await other.close();
 });
 // The headless browser does not implement visibility emulation consistently;
 // only claim this branch when document.hidden was actually observed.
 if(await p.eval('document.hidden||adventurePreview.status().autoStopped')){
  await delay(1700);assert.deepEqual(await snapshot(p),s);report.checks.push('actual background visibility cancels the timer');
 }else{
  await p.click('[data-action=later]',true);report.visibility='Headless visibility emulation unavailable; no background pass claimed';
 }
 await p.send('Page.bringToFront');if(await p.eval('!!document.querySelector("dialog[open]")'))await p.click('[data-action=later]',true);
 await p.click('[data-action=menu]',true);await p.waitFor('!!document.querySelector("dialog[open] [data-action=auto]")');await p.click('[data-action=auto]',true);await p.waitFor('adventurePreview.status().saved');s.autoPolicy.enabled=false;s.revision++;await p.click('[data-action=close]',true);
 await p.click('#play-control',true);await delay(1700);await p.waitFor('adventurePreview.status().saved');assert.deepEqual(await snapshot(p),s);
 await p.screenshot(join(out,'decision-mobile.png'));
 const manual=options(s).find(o=>o.enabled).id;choose(s,manual);await p.click('[data-action=choose][data-choice='+manual+']',true);await stop(p);actual=await snapshot(p);advance(s,actual.month-s.month);assert.deepEqual(actual,s);assert.equal(s.autoPolicy.cursor,1);
 assert.equal(await p.eval('document.documentElement.scrollWidth<=innerWidth+1'),true);await p.screenshot(join(out,'life-mobile.png'));
 report.checks.push('touch toggle off preserves manual choice and cursor; mobile fits viewport');
 await p.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await p.send('Emulation.setTouchEmulationEnabled',{enabled:false});
 report.storySeeds={};
 for(const [mode,target] of [['manual','manual_study'],['mine','thin_root_mine']]){
  const seed=findStory(mode,mode==='mine'?'thin_root_return':target);report.storySeeds[mode]=seed;
  await p.navigate(server.url+'preview/?rules=11&replay='+encodeURIComponent(seed));await p.click('[data-action=new]');await p.waitFor('adventurePreview.status().screen==="life"');await stop(p);
  actual=await snapshot(p);s=createRun({seed,id:actual.id});advance(s,actual.month);assert.deepEqual(actual,s);
  await storyReach(p,s,mode,target);await p.screenshot(join(out,mode+'-decision-desktop.png'));
  if(mode==='manual'){
   assert.ok(s.inventory.includes('shadow_manual'));assert.equal(s.life.cultivation.revision9.exchange.concealed,true);
   await storySelect(p,s,'gentle');assert.notEqual(s.life.cultivation.network.method?.id,'shadow');
   await storyNext(p,s);assert.equal(s.life.cultivation.network.method.id,'shadow');assert.ok(s.life.cultivation.network.method.months>=12);
   report.checks.push('natural mouse life exchanges actual full manual for concealment, then completes a separate year of study');
  }else{
   assert.equal(s.life.cultivation.revision9.arcNotes,2);assert.ok(!s.inventory.includes('thin_root_pill'));
   await storySelect(p,s,'leave');await storyReach(p,s,mode,'thin_root_return');assert.ok(!s.inventory.includes('thin_root_pill'));
   await p.screenshot(join(out,'mine-return-desktop.png'));await storySelect(p,s,'learn');
   report.checks.push('natural mine life has two related intervening experiences, actual withdrawal without pill and a later former-miner visit');
  }
 }
 assert.deepEqual(p.errors,[]);assert.ok(!p.responses.some(r=>r.status>=400));assert.ok(!p.requests.some(url=>/^https?:/u.test(url)&&!url.startsWith(server.url)));
 report.browser=browser.version.product;report.passed=true;console.log('REVISION9 BROWSER PASS '+(built?'STATIC':'SOURCE'));
}catch(error){report.passed=false;report.error=error.stack;console.error(error);process.exitCode=1;}
finally{await browser?.close();await server?.close();report.finishedAt=new Date().toISOString();await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
