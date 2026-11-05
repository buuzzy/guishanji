import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRun,choose,advance,advanceToChoice,options,cloneRun,validateRun,setActivity,upgradeRun,currentNode} from './helpers/rules9-engine.mjs';
import {activityOptions,routeOptions,currentContinent,discoverableEvidence} from '../packages/adventure/cultivation.js';
import {CULTIVATION_EVENTS,LEGACY_CULTIVATION_EVENTS,ROAD_CHAINS} from '../content/cultivation-stories.js';
import {decide} from './helpers/rules9-play.mjs';
import {lifePanels} from '../apps/preview/life-panels.js';
const resolve=s=>{while(s.journey&&!s.journey.open&&!s.pending&&s.phase==='life')advance(s,1);};
function follow(s,id,policy={}){for(let i=0;i<140&&s.phase==='life';i++){if(!s.pending)advanceToChoice(s);if(s.pending?.event===id)return s;if(!s.pending)return null;choose(s,decide(s,policy).id);if(policy.activity&&activityOptions(s).find(o=>o.id===policy.activity)?.enabled)setActivity(s,policy.activity);}return null;}
function find(id,policy={},filter=()=>true){for(let i=0;i<400;i++){const s=follow(createRun({seed:'决策查验-'+i}),id,policy);if(s&&filter(s))return s;}throw Error('未自然到达 '+id);}
test('所有长事件选项有各自的行动与处境提示，书面查账不会变成致命剑战',()=>{
 const hints=[];for(const chain of ROAD_CHAINS)for(let step=0;step<3;step++)for(const c of CULTIVATION_EVENTS[chain.id+'_'+step].choices){assert.ok(c.hint.length>=12);assert.ok(!/先核对眼前|保留退路，处理|其他人也会记得|实际完成/u.test(c.hint+c.startReply));hints.push(c.hint);}assert.equal(new Set(hints).size,hints.length);assert.equal(CULTIVATION_EVENTS.dark_ledger_1.choices[2].check,undefined);
});
test('买禁术残卷仅开启询问，试学结束才能正式拜师，可在登记前反悔',()=>{
 const s=find('road_turn',{path:'loose',activity:'work'},s=>s.life.cultivation.worldDone&&options(s).find(o=>o.id==='dark').enabled),old=s.life.cultivation.path,root=s.player.root;
 choose(s,'dark');assert.equal(s.life.cultivation.path,old);assert.equal(s.life.cultivation.wanted,0);assert.equal(s.life.cultivation.inquiry,'demonic');assert.ok(follow(s,'dark_invitation'));choose(s,'accept');advance(s,5);assert.equal(s.life.cultivation.path,old);advance(s,1);assert.equal(s.player.root,root);assert.ok(follow(s,'dark_oath'));const leave=cloneRun(s);choose(leave,'leave');assert.equal(leave.life.cultivation.path,old);assert.equal(leave.life.cultivation.inquiry,null);choose(s,'join');assert.equal(s.life.cultivation.path,'demonic');assert.equal(s.player.root,root);validateRun(s);validateRun(leave);
});
test('妖修拜师先有相处与试练，三年淬体实际完成后才改变道路',()=>{
 const s=find('road_turn',{path:'loose'},s=>s.life.cultivation.worldDone&&s.player.realm>=1),old=s.life.cultivation.path,root=s.player.root,realm=s.player.realm;
 choose(s,'beast');assert.equal(s.life.cultivation.path,old);assert.ok(follow(s,'beast_invitation'));choose(s,'help');resolve(s);assert.ok(follow(s,'beast_acceptance'));const leave=cloneRun(s);choose(leave,'leave');assert.equal(leave.life.cultivation.path,old);choose(s,'join');advance(s,35);assert.equal(s.life.cultivation.path,old);advance(s,1);assert.equal(s.life.cultivation.path,'beast');assert.equal(s.life.cultivation.teacher,'白苓');assert.equal(s.player.root,root);assert.equal(s.player.realm,realm);validateRun(s);
});
test('测灵后拒绝魔门试学仍能留在坊市继续生活，不会卡在未入门状态',()=>{
 const s=find('root_result',{path:'orthodox'});choose(s,'dark');assert.ok(follow(s,'dark_invitation'));choose(s,'refuse');assert.equal(s.life.cultivation.admissionDone,true);assert.equal(s.life.cultivation.path,'loose');assert.equal(s.life.cultivation.inquiry,null);assert.ok(follow(s,'first_method'));validateRun(s);
});
test('离宗清账有实际费用，魔门的离开申请会进入审问而非自动自由',()=>{
 for(const path of ['orthodox','demonic']){const s=find('road_turn',{path,activity:'work'},s=>s.life.cultivation.path===path&&s.life.cultivation.worldDone&&s.player.stones>=4);choose(s,'loose');assert.equal(s.life.cultivation.path,path);assert.ok(follow(s,'departure_terms'));const before=s.player.stones,cost=options(s).find(o=>o.id==='settle').cost.stones;choose(s,'settle');assert.equal(s.player.stones,before-cost);assert.equal(s.life.cultivation.detained,path==='demonic');if(path==='demonic')assert.ok(follow(s,'custody_terms'));else assert.equal(s.life.cultivation.path,'loose');validateRun(s);}
});
test('私下复制账册不自动留下通缉，其他已被见证的行为才形成证据',()=>{
 const s=find('dark_ledger_1',{path:'demonic',conduct:'care'}),wanted=s.life.cultivation.wanted,count=s.life.cultivation.evidence.length;
 choose(s,'selfish');resolve(s);assert.equal(s.life.cultivation.wanted,wanted);assert.equal(s.life.cultivation.evidence.length,count);assert.equal(s.flags.secretLedger,true);validateRun(s);
});
test('跨大陆证据要经过开放路线与送达月数，封锁所有出口则不能找到人',()=>{
 const s=find('dark_ledger_0',{path:'demonic'});choose(s,'selfish');resolve(s);const evidence=s.life.cultivation.evidence.at(-1),origin=evidence.origin;s.life.cultivation.continent=origin==='home'?'sky':'home';
 assert.equal(discoverableEvidence(s),null);advance(s,1);assert.equal(discoverableEvidence(s),null);
 // A topology query is read-only, including when all paths out of the origin close.
 const next=cloneRun(s);next.life.cultivation.closed=['home-tide','ember-home','sky-tide','ember-sky'];next.month=evidence.due+100;assert.equal(discoverableEvidence(next),null);const before=cloneRun(next);discoverableEvidence(next);routeOptions(next);assert.deepEqual(next,before);
 const delivered=cloneRun(s);delivered.month=evidence.due+100;assert.ok(discoverableEvidence(delivered));
});
test('先认怂再逃有真实苦役时段，期间不能练剑或旅行，逃离后仍有证据',()=>{
 const s=find('system_warrant',{path:'demonic',conduct:'selfish'},s=>!s.decisions.some(d=>d.event==='custody_terms')&&s.life.cultivation.worldDone);
 choose(s,'submit');assert.equal(s.life.cultivation.detained,true);assert.ok(activityOptions(s).every(a=>!a.enabled));assert.ok(routeOptions(s).every(a=>!a.enabled));assert.ok(follow(s,'custody_terms'));choose(s,'pretend');const before=s.player.skills.sword;advance(s,2);assert.equal(s.player.skills.sword,before);assert.equal(s.life.cultivation.detained,true);advance(s,1);assert.ok(follow(s,'custody_escape'));const wanted=s.life.cultivation.wanted;choose(s,'stealth');if(s.phase!=='ended'){assert.equal(s.life.cultivation.detained,false);assert.equal(s.life.cultivation.path,'loose');assert.ok(s.life.cultivation.evidence.some(e=>e.hiddenUntil>s.month));assert.equal(s.life.cultivation.wanted,wanted);}validateRun(s);
});
test('严酷处罚可以死亡，斗法与脱逃也都实际有失败分支',()=>{
 for(const id of ['custody_terms','custody_escape']){const lethal=CULTIVATION_EVENTS[id].choices.filter(c=>c.check?.failEnding);assert.ok(lethal.length>=2);for(const c of lethal)assert.match(c.hint,/死亡/);}
 const outcomes=new Set();for(let i=0;i<220&&outcomes.size<2;i++){const s=follow(createRun({seed:'严酷处罚-'+i}),'system_warrant',{path:'demonic',conduct:'selfish'});if(!s||!options(s).find(o=>o.id==='submit')?.enabled)continue;choose(s,'submit');if(!follow(s,'custody_terms'))continue;choose(s,'accept');resolve(s);outcomes.add(s.phase==='ended'?'dead':'survived');validateRun(s);}assert.deepEqual([...outcomes].sort(),['dead','survived']);
});
test('七种日常都可查实际变化，交游不刷阵法，调养不刷丹术',()=>{
 const original=find('first_method',{path:'loose'});choose(original,'array');resolve(original);
 for(const id of ['study','sword','alchemy','array','work','social','rest']){const s=cloneRun(original),before=cloneRun(s.player),months=s.life.cultivation.activityMonths[id]||0;setActivity(s,id);advance(s,6);assert.equal(s.life.cultivation.activityMonths[id]-months,6);assert.ok(s.life.cultivation.activityGains[id].progress>0);if(id==='social'){assert.equal(s.player.skills.array,before.skills.array);assert.ok(s.player.empathy>before.empathy);}if(id==='rest'){assert.equal(s.player.skills.alchemy,before.skills.alchemy);assert.ok(s.player.health>before.health);}validateRun(s);}
 const markup=lifePanels(original);assert.equal((markup.match(/class="activity-tile/g)||[]).length,0);for(const title of ['灵石与家产','随身行囊','修行本事'])assert.ok(markup.includes(title));assert.ok(!markup.includes('家中人与来信'));assert.ok(!markup.includes('data-action="item"'));assert.equal((markup.match(/data-value=/g)||[]).length,5);assert.ok(markup.includes('ability-radar'));for(const label of ['悟性','胆识','仁心','体力','心境'])assert.ok(markup.includes(label));
});
test('真实旧preview.4导出保留规则、出生、往事和随机流，不植入新追查记录',async()=>{
 const raw=await readFile(new URL('./fixtures/adventure-preview4-original.json',import.meta.url),'utf8'),doc=JSON.parse(raw),s=upgradeRun(doc.state);assert.deepEqual(s,doc.state);assert.equal(s.life.cultivation.rulesVersion,undefined);assert.equal(s.life.cultivation.evidence,undefined);const reached=follow(s,'road_turn',{path:'mortal'});assert.ok(reached);assert.equal(currentNode(s),LEGACY_CULTIVATION_EVENTS.road_turn);validateRun(s);assert.equal(await readFile(new URL('./fixtures/adventure-preview4-original.json',import.meta.url),'utf8'),raw);
});
