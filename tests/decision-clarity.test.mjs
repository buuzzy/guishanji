import test from 'node:test';
import assert from 'node:assert/strict';
import {createRun,choose,advance,advanceToChoice,options,cloneRun,validateRun,setActivity} from './helpers/rules12-engine.mjs';
import {activityOptions,routeOptions,currentContinent,discoverableEvidence} from '../packages/adventure/cultivation.js';
import {CULTIVATION_EVENTS,ROAD_CHAINS} from '../content/cultivation-stories.js';
import {decide} from './helpers/rules12-play.mjs';
import {mpView,mpPanelTitles} from './helpers/mp-view.mjs';
const resolve=s=>{while(s.journey&&!s.journey.open&&!s.pending&&s.phase==='life')advance(s,1);};
const c=s=>s.life.cultivation,r=s=>c(s).revision9;
/** 造一个「站在某张卡上」的合成状态（不靠自然流程走到那里）。 */
function pending(event){const s=createRun({seed:'离宗核验-'+event});s.month=264;s.player.practice=264;/* ⚠ 给一颗能修炼的灵根：凡人线（无灵根）有个排队饿死的老毛病（见 AGENTS.md §1.11），会挡住这张卡的投递。 */s.player.root='松骨灵根';c(s).path='orthodox';c(s).admissionDone=true;c(s).entered=192;c(s).worldDone=true;c(s).queue=[];r(s).membership.path='orthodox';s.pending={event,month:s.month};s.journey=null;return s;}
function follow(s,id,policy={}){for(let i=0;i<140&&s.phase==='life';i++){if(!s.pending)advanceToChoice(s);if(s.pending?.event===id)return s;if(!s.pending)return null;choose(s,decide(s,policy).id);if(policy.activity&&activityOptions(s).find(o=>o.id===policy.activity)?.enabled)setActivity(s,policy.activity);}return null;}
function find(id,policy={},filter=()=>true){for(let i=0;i<400;i++){const s=follow(createRun({seed:'决策查验-'+i}),id,policy);if(s&&filter(s))return s;}throw Error('未自然到达 '+id);}
test('所有长事件选项有各自的行动与处境提示，书面查账不会变成致命剑战',()=>{
 /*
  * ⚠ 规则十二的提示语**按状态生成**（表达域里写成 `s => ...`）⇒ 不能直接取 `.length`。
  *   这里用一条真实人生当尺子把提示语算出来再查（算不出来就跳过那一条的内容检查，
  *   但「有没有提示语」与「源码不许重样」照样查）。
  */
 const probe=createRun({seed:'提示语核对'});
 const texts=[],sources=[];
 for(const chain of ROAD_CHAINS)for(let step=0;step<3;step++)for(const c of CULTIVATION_EVENTS[chain.id+'_'+step].choices){
  assert.ok(c.hint!==undefined,chain.id+'_'+step+' 的选项「'+c.id+'」没有提示语');
  sources.push(String(c.hint));
  let text=null;
  try{const v=typeof c.hint==='function'?c.hint(probe):c.hint;if(typeof v==='string')text=v;}catch(e){text=null;}
  if(text===null)continue;
  assert.ok(text.length>=12,chain.id+'_'+step+' 的提示语太短：'+text);
  assert.ok(!/先核对眼前|保留退路，处理|其他人也会记得|实际完成/u.test(text+(c.startReply||'')),chain.id+'_'+step+' 的提示语是套话');
  texts.push(text);
 }
 assert.equal(new Set(texts).size,texts.length,'提示语不许重样');
 assert.equal(new Set(sources).size,sources.length,'提示语源码不许重样');
 assert.equal(CULTIVATION_EVENTS.dark_ledger_1.choices[2].check,undefined);
});
test('买禁术残卷仅开启询问，试学结束才能正式拜师，可在登记前反悔',()=>{
 /*
  * ⚠ 规则十二：魔门那条入口在**测灵根那张卡**上（选项「问一问门外的黑衣修士」），
  *   「坊市里两份陌生的功法」那张卡已被改成买残页的支线 ⇒ 入口换了，卡路不变。
  */
 const s=find('root_result',{path:'orthodox'},s=>options(s).find(o=>o.id==='dark').enabled),old=s.life.cultivation.path,root=s.player.root;
 choose(s,'dark');assert.equal(s.life.cultivation.path,old);assert.equal(s.life.cultivation.wanted,0);assert.equal(s.life.cultivation.inquiry,'demonic');assert.ok(follow(s,'dark_invitation'));choose(s,'accept');advance(s,5);assert.equal(s.life.cultivation.path,old);advance(s,1);assert.equal(s.player.root,root);assert.ok(follow(s,'dark_oath'));const leave=cloneRun(s);choose(leave,'leave');assert.equal(leave.life.cultivation.inquiry,null);assert.notEqual(leave.life.cultivation.path,'demonic','登记前反悔就不该是魔修');choose(s,'join');assert.equal(s.life.cultivation.path,'demonic');assert.equal(s.player.root,root);validateRun(s);validateRun(leave);
});
test('妖修由出身决定：走妖修自己的长线，不会被临时拜师改道',()=>{
 /*
  * ⚠ 规则十二：妖修这条路**由出身决定**（`early_beast` / 背景卡里选「留下」），
  *   「先相处半年、再拜师、三年淬体」那套卡（`beast_invitation` / `beast_acceptance`）
  *   在当前版本**发不出来**（唯一入口那张卡已被改写成别的内容）
  *   ⇒ 已登记在 `tests/fixtures/reach-gaps.json` 的零触达台账里。
  *   ⇒ 这里改验当前版本真实成立的那件事：妖修出身的命走的是妖修自己的三条长线。
  */
 const s=find('beast_home_0',{path:'beast'});
 assert.equal(s.life.cultivation.path,'beast','妖修出身的人一开始就在妖修路上');
 assert.ok(s.life.cultivation.activeChain||s.decisions.some(d=>d.event==='beast_home_0'),'妖修线真的走起来了');
 validateRun(s);
});
test('测灵后拒绝魔门试学仍能留在坊市继续生活，不会卡在未入门状态',()=>{
 const s=find('root_result',{path:'orthodox'});choose(s,'dark');assert.ok(follow(s,'dark_invitation'));choose(s,'refuse');assert.equal(s.life.cultivation.admissionDone,true);assert.equal(s.life.cultivation.path,'loose');assert.equal(s.life.cultivation.inquiry,null);assert.ok(follow(s,'first_method'));validateRun(s);
});
test('离宗清账有实际费用，魔门的离开申请会进入审问而非自动自由',()=>{
 /*
  * ⚠ 规则十二：离宗清账那张卡的入口是**魔门名册上的「先向旧师门辞行」**
  *   （借卷还没交还、且旧师门是宗门）⇒ 合成这个状态再走。
  */
 const s=pending('dark_oath');
 c(s).path='orthodox';Object.assign(r(s).membership,{path:'orthodox',borrowed:true});
 s.inventory.push('borrowed_volume');s.player.stones=20;
 const release=options(s).find(o=>o.id==='release');
 assert.equal(release.enabled,true,'有未交还的旧师门借卷才能辞行');
 choose(s,'release');
 assert.ok(follow(s,'departure_terms'),'离宗清账那张卡该发出来');
 const before=s.player.stones,cost=options(s).find(o=>o.id==='settle').cost.stones;
 assert.ok(cost>0,'清账要有实际费用');
 choose(s,'settle');
 assert.equal(s.player.stones,before-cost,'清账真的扣了灵石');
 assert.equal(s.life.cultivation.detained,false,'普通宗门清完账就走');
 assert.equal(s.life.cultivation.path,'loose');
 validateRun(s);
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
 /* 面板内容现在守**小程序端**（网页端 2026-11-08 已清理）：
    主栏给的是「修行本事 / 灵石与家产 / 随身行囊」三块 + 雷达那五根轴。 */
 const panel=mpView.practice(original);
 assert.deepEqual(panel.abilities.map(a=>a.key),['insight','courage','empathy','mind','constitution'],'雷达必须是那五根轴');
 for(const label of ['悟性','胆识','仁心','心境','体魄'])assert.ok(panel.abilities.some(a=>a.label===label),'雷达少了「'+label+'」');
 assert.ok(!panel.abilities.some(a=>a.label==='体力'),'体力是资源，不在雷达上');
 assert.equal(mpView.statusPanel(original).bars.length,5,'状态条就是那五根轴');
 assert.equal(mpView.inventory(original).count,original.inventory.length,'行囊件数要与存档一致');
 for(const title of ['修行本事','灵石与家产','随身行囊'])assert.ok(mpPanelTitles().includes(title),'人生页少了「'+title+'」这一块');
});
