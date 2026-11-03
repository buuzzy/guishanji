import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClassicRun as createRun, choose, options, acknowledge, advance, advanceToChoice, cloneRun, validateRun, review, currentNode, nodeText, aid, age, date, seekTraining, upgradeRun, EVENTS, ALL_ENDINGS } from '../packages/adventure/engine.js';
import { AdventureStore, ADVENTURE_KEY } from '../packages/adventure/store.js';
import { classicBirthFacts as birthFacts } from '../packages/adventure/birth.js';
import { trainingOptions, regionInfo, monthSeconds, practiceRate } from '../packages/adventure/life.js';
import { activityContext, presentPeople, messageChannel } from '../packages/adventure/context.js';
import { CONTENT_REVISION, REALMS } from '../content/adventure.js';
import { WORLD_ERAS, FAMILIES } from '../content/living-world.js';
import { play, selectOption, POLICIES } from '../scripts/play-adventure.mjs';
import { reach, choiceRun, advanceThroughMessages } from './adventure-scenarios.mjs';

class Memory {
  data = new Map(); fail = null; writes = 0;
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key, raw) { if (this.fail?.(key, raw)) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } this.data.set(key, raw); this.writes++; }
}

test('出生命盘与真实人生一致，覆盖时代、大陆、家世与初始财物', () => {
  const eras = new Set(), continents = new Set(), families = new Set();
  for (let i = 0; i < 180; i++) {
    const seed = '出生命盘-' + i, preview = birthFacts(seed), run = createRun({ seed });
    assert.equal(run.player.name, preview.name); assert.equal(run.player.sex, preview.sex); assert.equal(run.player.root, preview.root);
    assert.deepEqual(run.birth, { era: preview.era, continent: preview.continent, family: preview.family, address: preview.address, startAge: 0, year: preview.year, goal: preview.goal });
    assert.equal(run.player.stones, FAMILIES[preview.family].stones); assert.equal(age(run), 0);
    eras.add(preview.era); continents.add(preview.continent); families.add(preview.family);
  }
  assert.equal(eras.size, 3); assert.equal(continents.size, 4); assert.equal(families.size, 3);
  const named = createRun({ seed: '有名字', name: '望舒', goal: 'protect' });
  assert.equal(named.player.name, '望舒'); assert.equal(named.birth.goal, 'protect');
});

test('成长与寻常事件自动发生，幼年不获得成人收入或修行', () => {
  const state = createRun({ seed: '自动长大的日子' }), stones = state.player.stones, skill = state.player.skills.array;
  assert.equal(state.pending, null); assert.ok(state.journey.open);
  advanceToChoice(state);
  assert.equal(state.pending.event, 'childhood'); assert.equal(age(state), 6);
  assert.equal(state.player.stones, stones); assert.equal(state.player.skills.array, skill);
  assert.ok(state.journal.filter(e => e.automatic).length >= 2);
  const frozen = cloneRun(state); assert.equal(advance(state, 1000), 0); assert.deepEqual(state, frozen);
  choose(state, 'books'); assert.equal(state.waiting, false); advanceToChoice(state);
  assert.equal(state.pending.event, 'entry'); assert.ok(age(state) >= 16); assert.equal(state.player.realm, 0);
  assert.ok(state.inventory.includes('signal_talisman')); assert.ok(state.people.master.known);
  choose(state, 'array'); advanceToChoice(state);
  assert.equal(state.player.realm, 1); assert.ok(state.journal.find(e => e.title === '灵息终于稳在气府里').month >= 18 * 12);
});

test('出生、普通逐月、任意批量与快进始终得到同一状态和随机流', () => {
  const month = createRun({ seed: '三种同一生' }), batch = cloneRun(month), quick = cloneRun(month);
  for (let step = 0; step < 100 && month.phase !== 'ended'; step++) {
    for (let guard = 0; !month.pending && month.phase !== 'ended' && guard < 12000; guard++) advance(month, 1);
    for (let guard = 0; !batch.pending && batch.phase !== 'ended' && guard < 12000; guard++) advance(batch, [3, 7, 29, 41][guard % 4]);
    advanceToChoice(quick);
    assert.deepEqual(batch, month); assert.deepEqual(quick, month); validateRun(month);
    if (month.phase === 'ended') break;
    const selected = selectOption(month, 'nascent', step);
    for (const state of [month, batch, quick]) choose(state, selected.id);
  }
  assert.equal(month.phase, 'ended');
});

test('界面、物品、概率、地图、同行与修炼场查询不消耗任何随机数', () => {
  for (const state of [createRun({ seed: '纯命盘' }), reach('gate'), reach('urgent_message', { strategy: 'nascent' }), reach('outer_heart', { strategy: 'dao' })]) {
    const before = cloneRun(state);
    for (let i = 0; i < 12; i++) { options(state); if (currentNode(state)) nodeText(currentNode(state), state); review(state); aid(state); trainingOptions(state); presentPeople(state); regionInfo(state); messageChannel(state); monthSeconds(state); practiceRate(state); }
    assert.deepEqual(state, before);
  }
});

test('抉择冻结时间，选择之后自动继续，重复选择不会重复扣费', () => {
  const state = reach('cave'), before = state.player.stones, month = state.month;
  assert.equal(advance(state, 50), 0); choose(state, 'ruin'); assert.equal(state.player.stones, before - 6);
  assert.equal(state.waiting, false); assert.equal(state.month, month);
  const after = cloneRun(state); assert.throws(() => choose(state, 'ruin')); assert.deepEqual(state, after);
  assert.equal(advance(state, 1), 1); assert.equal(state.month, month + 1);
});

test('不满足实际资源时先拒绝，不扣钱、不抽挑战随机数', () => {
  const state = reach('cave'); state.player.stones = 0; const before = cloneRun(state);
  assert.equal(options(state).find(o => o.id === 'ruin').enabled, false);
  assert.throws(() => choose(state, 'ruin'), /灵石/); assert.deepEqual(state, before);
  const entry = choiceRun('门口的错误'); const snapshot = cloneRun(entry);
  assert.throws(() => choose(entry, 'unknown')); assert.deepEqual(entry, snapshot);
});

test('境界、开放地域和同行者共同限制修炼场，读查询不改变条件', () => {
  const born = createRun({ seed: '不能越级' }); assert.ok(trainingOptions(born).every(g => !g.enabled));
  const state = reach('cavern_invitation', { strategy: 'nascent' });
  assert.equal(state.player.realm, 2); assert.ok(options(state).find(o => o.id === 'enter').enabled);
  const away = cloneRun(state); away.people.ally.location = away.player.location === 'tide' ? 'sky' : 'tide';
  assert.equal(options(away).find(o => o.id === 'enter').enabled, false);
  assert.throws(() => choose(away, 'enter'), /会合/);
  const wrongRealm = cloneRun(state); wrongRealm.player.realm = 3;
  assert.equal(options(wrongRealm).find(o => o.id === 'enter').enabled, false);
  const home = reach('trial_invitation'); choose(home, 'stay'); advanceToChoice(home);
  assert.ok(!trainingOptions(home).find(g => g.id === 'valley').enabled);
  assert.throws(() => seekTraining(home, 'valley'));
});

test('筑基只在实际两年完成后生效，闭关期间没有宗门或港口日常', () => {
  const state = reach('foundation', { origin: 'village' }), start = state.month;
  choose(state, 'medicine'); assert.equal(state.player.realm, 1); assert.ok(!state.inventory.includes('herb_kit'));
  assert.equal(activityContext(state), 'retreat'); assert.deepEqual(presentPeople(state), []);
  advanceThroughMessages(state, start + 23); assert.equal(state.player.realm, 1);
  const inside = state.journal.filter(e => e.automatic && e.month > start);
  assert.ok(inside.every(e => e.context === 'retreat')); assert.ok(inside.every(e => !['first_lesson', 'sister_practice', 'tide_work', 'ember_work', 'sky_work'].includes(e.event)));
  advance(state, 1); assert.equal(state.player.realm, 2); assert.equal(state.waiting, false); assert.ok(state.result.completed); validateRun(state);
});

test('探险阶段经过真实月份才获得物品',()=>{
 const state=reach('trial_entry',{strategy:'nascent',filter:s=>s.life.arc.threatAt>s.month+12&&s.month+12<s.life.upheavalAt-12});
 const start=state.month;choose(state,'rope');advance(state,11);assert.equal(state.month,start+11);assert.ok(!state.inventory.includes('wind_seed'));
 advance(state,1);assert.ok(state.inventory.includes('wind_seed'));assert.ok(state.result.completed);validateRun(state);
});

test('冒险失败的死亡在真实路程结束后发生，未取得的宝物不到账', () => {
  const state = reach('trial_entry', { strategy: 'warrior', filter: s => { const probe = cloneRun(s); choose(probe, 'race'); return !probe.decisions.at(-1).success && s.month + 3 < s.life.upheavalAt - 12; } });
  const start = state.month; assert.ok(options(state).find(o => o.id === 'race').lethal);
  choose(state, 'race'); assert.equal(state.phase, 'life'); assert.equal(state.month, start);
  advance(state, 2); assert.equal(state.phase, 'life'); advance(state, 1);
  assert.equal(state.phase, 'ended'); assert.equal(state.month, start + 3); assert.equal(state.ending.id, 'trial_lost');
  assert.equal(state.journey, null); assert.equal(state.life.expeditions.at(-1).status, 'died'); validateRun(state);
});

test('继续急讯前的计划，完整恢复剩余月份和阶段队列，不重置危机期限', () => {
  for (const state of [
    reach('urgent_message', { strategy: 'nascent', filter: s => Boolean(s.life.suspended.resolution) }),
    reach('urgent_message', { strategy: 'nascent', filter: s => Boolean(s.life.suspended.open) }),
  ]) {
    const suspended = cloneRun(state.life.suspended), queue = suspended.continuationQueue, deadline = state.life.crisis.deadline, now = state.month;
    delete suspended.continuationQueue;
    choose(state, 'continue');
    assert.deepEqual(state.journey, suspended); assert.deepEqual(state.life.queue, queue);
    assert.equal(state.month, now); assert.equal(state.life.crisis.deadline, deadline); assert.equal(state.life.suspended, null); validateRun(state);
  }
});

test('离开长事件只取消未完成奖励，保留所得并实际行路进入危机', () => {
  const state = reach('urgent_message', { strategy: 'nascent', filter: s => Boolean(s.life.arc && s.life.suspended.resolution) });
  const inventory = [...state.inventory], deadline = state.life.crisis.deadline, travel = state.life.crisis.travel, now = state.month;
  choose(state, 'leave');
  assert.deepEqual(state.inventory, inventory); assert.equal(state.life.arc, null); assert.equal(state.life.queue, null);
  assert.equal(state.life.expeditions.at(-1).status, 'interrupted'); assert.equal(state.life.crisis.deadline, deadline);
  assert.equal(state.journey.resolution, undefined);
  advance(state, travel - 1); assert.equal(state.pending, null); advance(state, 1);
  assert.equal(state.month, now + travel); assert.ok(state.pending); validateRun(state);
});

test('阶段间中断没有虚构的一万余月计划，阶段也不能在之后复活', () => {
  const state = reach('urgent_message', { strategy: 'nascent', filter: s => Boolean(s.life.arc && s.life.suspended.open) });
  choose(state, 'leave');
  const record = state.life.interruptions.at(-1);
  assert.ok(record.plannedTo === null || record.plannedTo < 12000);
  assert.doesNotMatch(state.journal.at(-1).body, /余下1[01][0-9]{3}个月/);
  assert.equal(state.life.arc, null); assert.equal(state.life.queue, null);
});

test('派遣已有援军花真实灵石、只为当前危机争取三年', () => {
  const state = reach('urgent_message', { strategy: 'nascent', filter: s => s.life.crisis.kind === 'cityAttack' && options(s).find(o => o.id === 'aid').enabled });
  const crisis = cloneRun(state.life.crisis), worldDeadline = state.world.masterDeadline, balance = state.player.stones, plan = state.life.suspended.to;
  choose(state, 'aid');
  assert.equal(state.player.stones, balance - 12); assert.equal(state.life.crisis.deadline, crisis.deadline + 36);
  assert.equal(state.life.foreignAt, crisis.deadline + 36); assert.equal(state.world.masterDeadline, worldDeadline);
  assert.equal(state.journey.to, plan); assert.ok(state.life.crisis.aided); validateRun(state);
});

test('没有传音和定位时不弹急讯，灾变仍发生，迟到消息保留真实日期', () => {
  const state = reach('trial_core', { strategy: 'nascent', filter: s => !s.flags.homeNoticeSent && s.month < s.life.upheavalAt - 12 && s.month + 24 >= s.life.upheavalAt });
  state.inventory = state.inventory.filter(id => !['signal_talisman', 'echo_jade'].includes(id));
  const fall = state.life.upheavalAt, start = state.month;
  choose(state, 'unweave'); advance(state, 24);
  assert.equal(state.month, start + 24); assert.ok(state.flags.sectLost); assert.ok(state.life.unreadNews.length);
  assert.equal(state.life.crisis.notified, false); assert.ok(!state.decisions.some(d => d.event === 'urgent_message'));
  assert.ok(!state.journal.some(e => e.month >= start && ['first_lesson', 'sister_practice', 'tide_work'].includes(e.event)));
  advanceToChoice(state); assert.equal(state.pending.event, 'trial_return');
  assert.doesNotMatch(nodeText(currentNode(state), state), /闻竹在外门/);
  choose(state, 'share'); advanceThroughMessages(state, state.month + 3); advance(state, 6);
  const delivered = state.journal.find(e => e.occurred === fall);
  assert.ok(delivered); assert.match(delivered.body, /山历[0-9]+年[0-9]+月/);
  assert.equal(state.life.unreadNews.length, 0); validateRun(state);
});

test('宝物确实能失去，后续问道不能使用已交出的界心', () => {
  const state = reach('treasure_claim', { strategy: 'collector', filter: s => s.inventory.includes('mirror_heart') });
  const before = state.inventory.length; choose(state, 'give');
  assert.equal(state.inventory.length, before - 1); assert.ok(!state.inventory.includes('mirror_heart')); assert.ok(state.flags.surrenderedTreasure);
  for (let step = 0; step < 100 && state.phase !== 'ended'; step++) {
    if (!state.pending) advanceToChoice(state);
    if (state.phase === 'ended') break;
    if (state.pending.event === 'last_vow') {
      const dao = options(state).find(o => o.id === 'dao');
      assert.equal(dao.enabled, false); assert.ok(dao.reasons.some(reason => reason.includes('界心'))); return;
    }
    choose(state, selectOption(state, 'collector', step).id);
  }
  throw new Error('失宝的人生没有到达后续终点');
});

test('界门按时代收费，身无分文可记欠账，年结余先还欠款', () => {
  const state = reach('gate'); state.player.stones = 0;
  const before = cloneRun(state), offered = options(state).find(o => o.enabled);
  assert.deepEqual(state, before); assert.ok(offered); assert.equal(offered.cost.stones, 0);
  assert.equal(offered.cost.debt, WORLD_ERAS[state.birth.era].gateCost);
  const origin = state.player.location; choose(state, offered.id);
  assert.equal(state.player.location, origin); assert.equal(activityContext(state), 'travel'); assert.equal(state.flags.debt, offered.cost.debt);
  const to = state.journey.to, oldDebt = state.flags.debt;
  advanceThroughMessages(state, to);
  assert.equal(state.player.location, offered.id); assert.ok(state.flags.debt <= oldDebt);
  assert.ok(state.player.stones >= 0); validateRun(state);
});

test('真实求援期限会造成死亡，后面的救援和读档不复活已死师父', () => {
  let run;
  for (let i = 0; i < 180 && !run; i++) {
    const candidate = play({ seed: '期限仍在走-' + i, strategy: 'healer' }).state;
    if (candidate.people.master.status === 'dead') run = candidate;
  }
  assert.ok(run); assert.equal(run.people.master.deathMonth, run.world.masterDeadline);
  assert.equal(run.people.master.alive, false); assert.equal(validateRun(cloneRun(run)).people.master.status, 'dead');
  const person = review(run).people.find(p => p.id === 'master');
  assert.equal(person.age, run.birth.startAge + Math.floor((run.people.master.deathMonth - run.people.master.born) / 12));
});

test('新人生的元婴闭关不预设第三年急报，按真实十年完成',()=>{
 const state=reach('retreat',{strategy:'nascent',filter:s=>options(s).find(o=>o.id==='nascent').enabled});const start=state.month;
 choose(state,'nascent');assert.equal(state.player.realm,3);assert.equal(state.journey.interrupt,undefined);assert.ok(!state.inventory.includes('ember_engine'));
 advanceThroughMessages(state,start+119);assert.equal(state.player.realm,3);
 advanceThroughMessages(state,start+120);assert.equal(state.player.realm,4);assert.ok(state.journal.some(e=>e.kind==='breakthrough'&&e.toRealm===4&&e.month===start+120));validateRun(state);
});

test('600条正常人生覆盖全部事件和不同结局，日常不会混入闭关与域外', () => {
  const events = new Set(), endings = new Set(), signatures = new Set(), birthplaces = new Set(), families = new Set();
  const strategies = [...Object.keys(POLICIES), 'varied'];
  for (let i = 0; i < 600; i++) {
    const state = play({ seed: '松风试走-' + i, strategy: strategies[i % strategies.length], offset: i }).state;
    validateRun(state); assert.equal(state.phase, 'ended'); assert.ok(state.decisions.length < 100);
    for (const decision of state.decisions) events.add(decision.event);
    endings.add(state.ending.id); birthplaces.add(state.birth.continent); families.add(state.birth.family);
    signatures.add(state.decisions.map(d => d.event).join(':'));
    for (const record of state.journal.filter(e => e.automatic)) {
      if (['valley', 'cavern', 'outer', 'retreat', 'travel', 'work'].includes(record.context)) assert.ok(!['first_lesson', 'sister_practice', 'teacher_rain', 'tide_work', 'ember_work', 'sky_work', 'town_clue', 'market_herbs'].includes(record.event));
    }
  }
  assert.deepEqual([...events].sort(), Object.values(EVENTS).filter(n=>!n.legacyOnly&&!n.cultivationOnly).map(n=>n.id).sort());
  endings.add(play({seed:'浏览器长生-160',strategy:'dao',goal:'dao'}).ending);
  assert.ok(endings.has('dao')); assert.ok(endings.has('guardian')); assert.ok(endings.has('trial_lost')); assert.ok(endings.has('void_lost'));
  assert.ok(signatures.size > 100); assert.equal(birthplaces.size, 4); assert.equal(families.size, 3);
});

test('实际出现的抉择都有不靠现金或宝物的退路，界门欠费仍可走', () => {
  for (let i = 0; i < 100; i++) {
    const state = createRun({ seed: '没钱也继续-' + i });
    for (let step = 0; step < 100 && state.phase !== 'ended'; step++) {
      if (!state.pending) advanceToChoice(state); if (state.phase === 'ended') break;
      const poor = cloneRun(state); poor.player.stones = 0; poor.inventory = [];
      assert.ok(options(poor).some(o => o.enabled), '没有退路：' + state.pending.event);
      choose(state, selectOption(state, 'varied', step + i).id);
    }
    assert.equal(state.phase, 'ended');
  }
});

test('同一种子与选择完整重现经历、物品、人物和随机状态', () => {
  const a = play({ seed: '同一封信', strategy: 'warrior' });
  const b = play({ seed: '同一封信', strategy: 'warrior' });
  assert.deepEqual(a.state, b.state); assert.deepEqual(a.transcript, b.transcript);
});

test('真正的旧版存档在副本升级，不改往事、年月和五条原随机流', async () => {
  const raw = await readFile(new URL('./fixtures/adventure-preview1.json', import.meta.url), 'utf8'), doc = JSON.parse(raw);
  for (const original of doc.lives) {
    const before = cloneRun(original), upgraded = upgradeRun(original);
    assert.deepEqual(original, before); assert.deepEqual(upgraded.journal, original.journal); assert.equal(upgraded.month, original.month);
    assert.equal(upgraded.birth.startAge, 16); assert.equal(upgraded.birth.year, 471);
    for (const key of Object.keys(original.random)) assert.deepEqual(upgraded.random[key], original.random[key]);
    assert.equal(upgraded.random.events.draws, 0); assert.equal(upgraded.random.daily.draws, 0);
    if (original.journey) assert.equal(upgraded.journey.legacyTarget, true);
  }
  const storage = new Memory(); storage.setItem(ADVENTURE_KEY, raw); const store = new AdventureStore(storage);
  const loaded = store.load(), old = doc.lives.find(s => s.id === doc.activeId), originalJournal = cloneRun(loaded.journal);
  assert.equal(storage.getItem(ADVENTURE_KEY), raw); assert.deepEqual(loaded.journal, originalJournal); assert.equal(loaded.month, old.month);
  advance(loaded, 1); store.save(loaded);
  assert.ok([...storage.data].some(([key, preserved]) => key.startsWith(ADVENTURE_KEY + '.preserved.preview1.') && preserved === raw));
  const continued = new AdventureStore(storage).load(); advanceToChoice(continued);
  assert.equal(continued.pending.event, old.journey.target); assert.equal(continued.player.realm, 2);
});

test('保存闭关与待选事件后恢复，不重抽挑战、不提前完成修行', () => {
  const original = reach('foundation', { origin: 'village' }), storage = new Memory(), store = new AdventureStore(storage);
  store.load(); choose(original, 'medicine'); advance(original, 13); store.save(original);
  const restored = new AdventureStore(storage).load();
  assert.deepEqual(restored, original); assert.equal(restored.player.realm, 1);
  advanceThroughMessages(original, original.journey.to); advanceThroughMessages(restored, restored.journey.to);
  assert.deepEqual(restored, original); assert.equal(restored.player.realm, 2);
  const challenge = reach('hunter', { strategy: 'warrior' }), another = new AdventureStore(new Memory());
  another.load(); another.save(challenge); const saved = new AdventureStore(another.storage).load();
  choose(challenge, 'duel'); choose(saved, 'duel'); assert.deepEqual(saved, challenge);
});

test('独立存档不读写原修仙和1in8b玩家数据', () => {
  const storage = new Memory(); storage.setItem('shanhai.life.v1', '旧修仙原文'); storage.setItem('1in8b.save.v3', '旧产品原文');
  const store = new AdventureStore(storage); store.load(); store.save(choiceRun('互不打扰'));
  assert.equal(storage.getItem('shanhai.life.v1'), '旧修仙原文'); assert.equal(storage.getItem('1in8b.save.v3'), '旧产品原文');
});

test('损坏与未来版本拒绝写入，原字节始终保留', () => {
  for (const raw of ['{损坏', JSON.stringify({ product: 'gui-shan-preview', format: 8, contentRevision: CONTENT_REVISION, lives: [] })]) {
    const storage = new Memory(); storage.setItem(ADVENTURE_KEY, raw); const store = new AdventureStore(storage);
    assert.throws(() => store.load()); assert.throws(() => store.save(choiceRun('安全失败')));
    assert.equal(storage.getItem(ADVENTURE_KEY), raw);
  }
});

test('写入配额失败保留主档和最后的有效备份', () => {
  const storage = new Memory(), store = new AdventureStore(storage), state = choiceRun('配额');
  store.load(); store.save(state); const raw = storage.getItem(ADVENTURE_KEY); choose(state, 'books');
  storage.fail = key => key === ADVENTURE_KEY;
  assert.throws(() => store.save(state), /写入失败/); assert.equal(storage.getItem(ADVENTURE_KEY), raw); assert.equal(storage.getItem(ADVENTURE_KEY + '.backup'), raw);
});

test('两个页面的原文基线冲突阻止覆盖，后保存者可保留自己的副本', () => {
  const storage = new Memory(), one = new AdventureStore(storage), two = new AdventureStore(storage), state = choiceRun('两扇窗');
  one.load(); one.save(state); const other = two.load(); choose(state, 'books'); one.save(state); const actual = storage.getItem(ADVENTURE_KEY);
  choose(other, 'roads'); assert.throws(() => two.save(other), /另一个页面/); assert.equal(storage.getItem(ADVENTURE_KEY), actual);
  assert.equal(JSON.parse(two.export(other)).state.decisions.at(-1).choice, 'roads');
});

test('重复保存无变化状态不写盘，旧版本进度也不能回写', () => {
  const storage = new Memory(), store = new AdventureStore(storage), state = choiceRun('不会磨损备份'); store.load(); store.save(state);
  const raw = storage.getItem(ADVENTURE_KEY), writes = storage.writes, older = cloneRun(state);
  store.save(cloneRun(state)); assert.equal(storage.writes, writes); assert.equal(storage.getItem(ADVENTURE_KEY), raw);
  choose(state, 'books'); store.save(state); const updated = storage.getItem(ADVENTURE_KEY);
  assert.throws(() => store.save(older), /已有更新/); assert.equal(storage.getItem(ADVENTURE_KEY), updated);
});

test('导入同一人生的分歧进度保留两个副本和原随机流', () => {
  const storage = new Memory(), store = new AdventureStore(storage), state = choiceRun('副本'); store.load(); store.save(state);
  const old = cloneRun(state); choose(state, 'books'); store.save(state); const imported = store.import(store.export(old));
  assert.equal(store.lives().length, 2); assert.notEqual(imported.id, state.id); assert.deepEqual(imported.random, old.random);
  assert.deepEqual(store.lives().find(r => r.id === state.id), state);
});

test('恢复备份前保存坏档原文，恢复也不覆盖备份', () => {
  const storage = new Memory(), store = new AdventureStore(storage), state = choiceRun('备份'); store.load(); store.save(state); choose(state, 'books'); store.save(state);
  const backup = storage.getItem(ADVENTURE_KEY + '.backup'); storage.setItem(ADVENTURE_KEY, '{坏档'); const broken = new AdventureStore(storage); assert.throws(() => broken.load());
  broken.recover(); assert.equal(broken.active().pending.event, 'childhood');
  assert.ok([...storage.data].some(([key, raw]) => key.startsWith(ADVENTURE_KEY + '.preserved.') && raw === '{坏档'));
  assert.equal(storage.getItem(ADVENTURE_KEY + '.backup'), backup);
});

test('档案数量上限安全失败，不自动删去旧人生', () => {
  const storage = new Memory(), store = new AdventureStore(storage); store.load();
  for (let i = 0; i < 64; i++) store.save(createRun({ seed: '保留的人生-' + i }));
  const raw = storage.getItem(ADVENTURE_KEY); assert.throws(() => store.save(createRun({ seed: '第六十五生' })), /不会自动删除/);
  assert.equal(store.lives().length, 64); assert.equal(storage.getItem(ADVENTURE_KEY), raw);
});

test('非法出生、人物、死亡与长事件数据不会被存档采用', () => {
  for (const mutate of [
    s => { s.player.origin = 'constructor'; }, s => { s.people.master.born = 1; },
    s => { s.people.master.status = 'dead'; s.people.master.alive = false; },
    s => { s.pending.event = 'constructor'; }, s => { s.player.skills.array = NaN; },
    s => { s.birth.continent = 'nowhere'; }, s => { s.life.crisis = { kind: 'homeFall' }; },
    s => { s.life.queue = { event: 'constructor', due: s.month + 3 }; },
  ]) {
    const state = choiceRun('坏结构'); mutate(state); assert.throws(() => validateRun(state), mutate.toString());
  }
});

test('寿元在同一整数月结算中终止，死亡后不能继续领取下一段奖励', () => {
  const state = createRun({ seed: '寿元边界' }); state.month = REALMS[0].lifespan * 12 - 1; state.player.practice = state.month; state.life.mode = 'home';
  state.journey = { from: state.month, to: state.month + 12, target: null, practice: 'array', event: 'entry' };
  advance(state, 1); assert.equal(state.ending.id, 'old_age'); assert.equal(state.phase, 'ended'); assert.equal(advance(state, 120), 0); validateRun(state);
});
