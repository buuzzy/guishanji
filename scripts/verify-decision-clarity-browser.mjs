import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {startServer,projectRoot} from './serve.mjs';
import {launchBrowser} from './lib/browser.mjs';
import {createRun,choose,advanceToChoice,options,validateRun,setActivity} from '../tests/helpers/rules11-engine.mjs';
import {decide} from './play-cultivation.mjs';
import {activityOptions} from '../packages/adventure/cultivation.js';
import {GEOGRAPHY} from '../content/cultivation-world.js';
const built=process.argv.includes('--built'),out=join(projectRoot,'artifacts',built?'decision-browser-static':'decision-browser-source');
await mkdir(out,{recursive:true});const report={built,checks:[],flows:[],scope:'Real Chrome mouse/touch, no injected player state'};
let server,browser;
const snapshot=p=>p.eval('adventurePreview.snapshot()');
/**
 * 地图上「已经解锁的大陆」= 当前所在 + 走过 + 从这些地方能直接去的大陆（只隔一跳）。
 *
 * ⚠ 这里**故意不调用规则层的 mapView()**：
 *   地图画什么由 mapView 决定，若门禁也用它算期望值 ⇒ 两边同源 ⇒ 地图画错了也看不出来。
 *   ⇒ 门禁从**存档本身**（ continent + visited）独立算一遍，再跟地图画出来的比对。
 */
function unlockedOf(st){
  const c=(st&&st.life&&st.life.cultivation)||{};
  const here=c.continent||(['home','refuge'].includes(st?.player?.location)?st?.birth?.continent:st?.player?.location);
  const out=[];
  const push=id=>{if(id&&!out.includes(id))out.push(id);};
  push(here);
  for(const id of (c.visited||[]))push(id);
  /* 再补上「从这些地方能直接去的大陆」（只隔一跳）。 */
  const known=out.slice();
  for(const id of known){
    const g=GEOGRAPHY.find(x=>x.id===id);
    if(!g)continue;
    for(const b of (g.connections||[]))push(b);
  }
  return out;
}
/** 两端都在「已解锁大陆」里的通路条数。 */
function routeCount(unlocked){
  const set=new Set(unlocked),edges=new Set();
  for(const g of GEOGRAPHY)for(const b of (g.connections||[]))if(set.has(g.id)&&set.has(b))edges.add([g.id,b].sort().join('-'));
  return edges.size;
}
async function stop(p){if(await p.eval('adventurePreview.status().screen==="life"&&adventurePreview.status().intendsToPlay'))await p.click('#play-control');await p.waitFor('adventurePreview.status().saved');}
async function begin(p,seed){await p.navigate(server.url+'preview/?rules=11&replay='+encodeURIComponent(seed));await p.waitFor('!!window.adventurePreview');await p.click('[data-action=new]');await p.waitFor('adventurePreview.status().screen==="life"');await stop(p);}
async function next(p){if((await snapshot(p)).pending)return;await p.click('[data-action=menu]');await p.waitFor('!!document.querySelector("dialog[open] [data-action=next]")');await p.click('[data-action=next]');await p.waitFor('!!adventurePreview.snapshot().pending||adventurePreview.snapshot().phase==="ended"');await p.waitFor('adventurePreview.status().saved');}
async function select(p,id,touch=false){await p.click('[data-action=choose][data-choice='+id+']',touch);await p.waitFor('!document.querySelector("dialog[open]")');if((await snapshot(p)).phase!=='ended')await stop(p);}
async function reach(p,id,policy={}){for(let i=0;i<110;i++){await next(p);const s=await snapshot(p);if(s.pending?.event===id)return s;if(s.phase==='ended')throw Error('Died before '+id);await select(p,decide(s,policy).id);if(policy.activity&&activityOptions(await snapshot(p)).find(a=>a.id===policy.activity)?.enabled){await p.click('[data-action=menu]');await p.waitFor('!!document.querySelector("dialog[open] [data-action=focus]")');await p.click('dialog[open] [data-action=focus]');await p.waitFor('document.querySelectorAll("dialog[open] [data-action=activity]").length===7');await p.click('[data-action=activity][data-activity='+policy.activity+']');await p.waitFor('!document.querySelector("dialog[open]")');await stop(p);}}throw Error('Did not reach '+id);}
function seedFor(id,policy,filter=()=>true){for(let i=0;i<400;i++){const seed='决策查验-'+i,s=createRun({seed});for(let j=0;j<130&&s.phase==='life';j++){if(!s.pending)advanceToChoice(s);if(s.pending?.event===id){if(filter(s))return seed;break;}if(!s.pending)break;choose(s,decide(s,policy).id);if(policy.activity&&activityOptions(s).find(a=>a.id===policy.activity)?.enabled)setActivity(s,policy.activity);}}throw Error('No natural seed '+id);}
async function layout(p){const x=await p.eval('({w:innerWidth,scroll:document.documentElement.scrollWidth,tiles:document.querySelectorAll(".main-column .activity-tile").length,atlas:document.querySelector("#life-map")?.dataset.renderer,links:document.querySelector("#life-map")?.dataset.connections,here:document.querySelector("#life-map")?.dataset.current})');assert.ok(x.scroll<=x.w+1,JSON.stringify(x));assert.equal(x.tiles,0);assert.equal(x.atlas,'cultivation-dot-map');assert.equal(await p.eval('document.querySelectorAll(".main-column [data-value]").length'),5);assert.equal(await p.eval('document.querySelectorAll(".ability-radar .radar-label").length'),5);assert.equal(await p.eval('document.querySelectorAll(".main-column .family-panel,.main-column [data-action=item]").length'),0);
/* 地图只画「当前所在 + 走过的大陆」（S8 起的设计）⇒ 通路条数不是固定值，而是随存档变的。
   ⇒ 这里不写死数字，而是**从存档独立算一遍**再比对：地图多画/少画一条都报红。
   ⚠ 顺带守住「当前所在」：地图标的位置必须跟存档一致。 */
const st=await snapshot(p),unlocked=unlockedOf(st),expect=routeCount(unlocked);
assert.equal(x.here,unlocked[0]||'',"地图标出的「当前所在」与存档一致（"+(unlocked[0]||'（没有）')+"）");
assert.equal(x.links,String(expect),"地图上的通路条数 = 已解锁大陆之间的通路条数（"+expect+" 条）");}
async function screenshotSection(p,selector,file){await p.eval('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"start",behavior:"instant"})');await p.screenshot(join(out,file));}
try{
 server=await startServer({root:built?join(projectRoot,'dist'):projectRoot,port:0});report.servedRoot=built?'dist':'source';if(built){const manifest=JSON.parse(await readFile(join(projectRoot,'dist/xianxia-build.json'),'utf8')),asset=manifest.files.find(f=>f.path==='apps/preview/app.js'),response=await fetch(server.url+'apps/preview/app.js');assert.equal(response.status,200);assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),asset.sha256);report.build=manifest.builtAt;}browser=await launchBrowser();const p=await browser.page();
 const seed=seedFor('road_turn',{path:'loose',activity:'work'},s=>s.life.cultivation.worldDone&&options(s).find(o=>o.id==='dark').enabled);await begin(p,seed);await reach(p,'road_turn',{path:'loose',activity:'work'});await p.screenshot(join(out,'new-method-context.png'));const old=(await snapshot(p)).life.cultivation.path;await select(p,'dark');assert.equal((await snapshot(p)).life.cultivation.path,old);await reach(p,'dark_invitation');await p.screenshot(join(out,'dark-invitation.png'));await select(p,'accept');await reach(p,'dark_oath');await p.screenshot(join(out,'dark-registration.png'));await select(p,'leave');assert.equal((await snapshot(p)).life.cultivation.path,old);
 await layout(p);await screenshotSection(p,'.practice-panel','daily-desktop.png');await screenshotSection(p,'.people-panel','relationships-desktop.png');await screenshotSection(p,'#life-map','atlas-desktop.png');
 await p.send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await p.send('Emulation.setTouchEmulationEnabled',{enabled:true});await layout(p);await screenshotSection(p,'.practice-panel','daily-mobile.png');await screenshotSection(p,'#life-map','atlas-mobile.png');await p.click('#life-map + .map-legend [data-action=map-zoom]',true);assert.equal(await p.eval('document.querySelector("#life-map").closest(".wmap").classList.contains("zoomed")'),true);await layout(p);await p.click('#life-map + .map-legend [data-action=map-zoom]',true);
 await p.click('[data-action=world]',true);assert.ok(await p.eval('!!document.querySelector("dialog[open] #world-map")'));await p.screenshot(join(out,'world-mobile.png'));await p.click('[data-action=close]',true);
 report.checks.push('buying fragment and six-month trial do not change allegiance; refusal after trial preserves original path','modal-only seven activities, actual main-page values and unified relationships, desktop/mobile no overflow','four engine-backed dot-map links; touch zoom and navigation');report.flows.push({seed,event:'dark_oath',choice:'leave'});
 const beastSeed=seedFor('road_turn',{path:'loose'},s=>s.life.cultivation.worldDone&&s.player.realm>=1);await begin(p,beastSeed);await reach(p,'road_turn',{path:'loose'});await select(p,'beast',true);await reach(p,'beast_invitation');await p.screenshot(join(out,'beast-introduction.png'));await select(p,'help',true);await reach(p,'beast_acceptance');await select(p,'join',true);await next(p);assert.equal((await snapshot(p)).life.cultivation.path,'beast');assert.equal((await snapshot(p)).life.cultivation.teacher,'白苓');report.flows.push({seed:beastSeed,event:'beast_acceptance',choice:'join'});report.checks.push('named beast mentor, six-month mutual help, three-year transformation and actual allegiance transition');
 const captiveSeed=seedFor('system_warrant',{path:'demonic',conduct:'selfish'},s=>s.life.cultivation.worldDone&&!s.decisions.some(d=>d.event==='custody_terms'));await begin(p,captiveSeed);await reach(p,'system_warrant',{path:'demonic',conduct:'selfish'});await select(p,'submit',true);await reach(p,'custody_terms');await p.screenshot(join(out,'cruel-institution.png'));await select(p,'pretend',true);assert.equal((await snapshot(p)).life.cultivation.detained,true);await next(p);assert.equal((await snapshot(p)).pending.event,'custody_escape');await p.screenshot(join(out,'escape-decision.png'));await select(p,'stealth',true);validateRun(await snapshot(p));report.flows.push({seed:captiveSeed,event:'custody_escape',choice:'stealth',ending:(await snapshot(p)).ending?.id});report.checks.push('submission, real guarded work, later escape opening and actual lethal-risk settlement');
 assert.deepEqual(p.errors,[]);assert.ok(!p.requests.some(url=>/^https?:/u.test(url)&&!url.startsWith(server.url)));report.passed=true;report.browser=browser.version.product;console.log('DECISION BROWSER PASS '+(built?'STATIC':'SOURCE')+' · '+report.flows.length+' paths');
}catch(error){report.passed=false;report.error=error.stack;console.error(error);process.exitCode=1;}finally{await browser?.close();await server?.close();await writeFile(join(out,'report.json'),JSON.stringify(report,null,2)+'\n');}
