import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createClassicRun as createRun,choose,advance,advanceToChoice,cloneRun,validateRun,upgradeRun,options,EVENTS} from '../packages/adventure/engine.js';
import {AdventureStore,ADVENTURE_KEY} from '../packages/adventure/store.js';
import {trainingOptions} from '../packages/adventure/life.js';
import {reach,advanceThroughMessages} from './adventure-scenarios.mjs';
import {NOVEL_NAMES} from '../content/novel-names.js';
import {play} from '../scripts/play-adventure.mjs';

test('同伴早逝后，后来的废墟救援不会将她复活',()=>{
 const s=play({seed:'浏览器长生-329',strategy:'varied',goal:'free'}).state;
 assert.equal(s.people.ally.status,'dead');validateRun(s);
});

test('选项保留线索，不预告概率、收益、伤亡结果和精确行程',()=>{
 for(const node of Object.values(EVENTS).filter(n=>!n.legacyOnly&&!n.cultivationOnly))for(const c of node.choices){assert.equal(typeof c.hint,'string');assert.ok(!/成功率|确定成功|得到|获得|失败会死亡|结束本世|\d+%/u.test(c.hint),node.id+'/'+c.id);}
});
test('姓名来自有来源的完整角色名，男女出生匹配名称库',()=>{
 const seen=new Set();for(let i=0;i<400;i++){const s=createRun({seed:'小说名字-'+i});assert.ok(NOVEL_NAMES.some(n=>n.name===s.player.name&&n.sex===s.player.sex));seen.add(s.player.name);}
 assert.ok(seen.size>35);assert.ok(new Set(NOVEL_NAMES.map(n=>n.book)).size>=8);
});
test('刚突破不能自动报名，核实任务后才开放试炼',()=>{
 const state=reach('valley_notice');assert.ok(!trainingOptions(state).find(g=>g.id==='valley').enabled);
 choose(state,'listen');advanceThroughMessages(state,state.month+6);assert.ok(state.flags.valleyBriefed);
 assert.ok(trainingOptions(state).find(g=>g.id==='valley').enabled);
 const declined=reach('valley_notice');choose(declined,'later');assert.ok(!trainingOptions(declined).find(g=>g.id==='valley').enabled);
});
test('突发事故暂存原奖励和剩余时间，处理后继续同一阶段',()=>{
 const state=reach('expedition_obstacle',{filter:s=>options(s).find(o=>o.id==='survey').enabled&&!!s.life.arcPause.journey.resolution});
 const pause=cloneRun(state.life.arcPause),start=state.month;choose(state,'survey');advanceThroughMessages(state,start+6);
 assert.equal(state.life.arcPause,null);assert.equal(state.journey.resolution.event,pause.journey.resolution.event);assert.equal(state.journey.to,pause.journey.to+6);validateRun(state);
});
test('探险中撤退取消未完成奖励，保留已得物品，真实返回',()=>{
 const s=reach('expedition_obstacle');const items=[...s.inventory],pending=s.life.arcPause.journey.resolution;
 choose(s,'leave');advanceThroughMessages(s,s.month+3);assert.equal(s.life.arcPause,null);assert.equal(s.journey.open,true);
 advanceToChoice(s);assert.ok(['trial_return','cavern_exit','outer_return'].includes(s.pending.event));assert.deepEqual(s.inventory,items);
 assert.ok(!s.journal.some(e=>e.kind==='choice'&&e.event===pending?.event&&e.month>s.decisions.at(-1).month));validateRun(s);
});
test('同伴死亡留在本局，撤出后不能再显示活着归来',()=>{
 const s=reach('expedition_companion',{filter:s=>{const copy=cloneRun(s);choose(copy,'press');return !copy.decisions.at(-1).success;}});
 const id=s.life.arc.id==='valley'?'trialmate':'ally';choose(s,'press');advanceThroughMessages(s,s.month+3);assert.equal(s.people[id].status,'dead');
 advanceToChoice(s);assert.equal(s.people[id].alive,false);validateRun(s);
});
test('家族援助按往来条件与实际月份送达，家中积蓄会减少',()=>{
 const s=reach('family_help',{origin:'clan'}),before=s.player.stones,reserve=s.life.family.reserve;
 choose(s,'supplies');assert.equal(s.player.stones,before);advanceThroughMessages(s,s.month+6);
 assert.equal(s.life.family.reserve,reserve-12);assert.ok(s.flags.familyReceived);assert.ok(s.player.stones>=before+10);validateRun(s);
});
test('preview.2升级不重算出生、随机流与已选故事，首次写入保留原字节',async()=>{
 const raw=await readFile('tests/fixtures/adventure-preview2.json','utf8'),old=JSON.parse(raw).lives[0];const migrated=upgradeRun(old);
 assert.deepEqual(migrated.birth,old.birth);assert.deepEqual(migrated.random,old.random);assert.equal(migrated.player.name,old.player.name);assert.deepEqual(migrated.journal,old.journal);assert.deepEqual(migrated.pending,old.pending);
 const data=new Map([[ADVENTURE_KEY,raw]]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const store=new AdventureStore(storage);const loaded=store.load();assert.equal(data.get(ADVENTURE_KEY),raw);choose(loaded,'array');store.save(loaded);
 assert.ok([...data].some(([k,v])=>k.startsWith(ADVENTURE_KEY+'.preserved.preview2.')&&v===raw));
});
