import test from 'node:test';
import assert from 'node:assert/strict';
import { newLife, renameBirth, clone, personAge, calendar } from '../packages/core/state.js';
import { beginLife, advance, choose, decisionView, setFocus, act, focusOptions, autoChoice, breakthroughChance, incomePreview, travelPreview, summarize } from '../packages/core/engine.js';
import { validateState } from '../packages/core/validate.js';
import { playLife, toAge, policyChoice } from './scenarios.mjs';

test('出生、同一策略和独立随机流可重现；姓名不改变机缘', () => {
  const first = newLife({ seed: '同一场机缘' }), second = newLife({ seed: '同一场机缘' });
  assert.deepEqual(first, second); validateState(first);
  const renamed = renameBirth(first, '沈知微');
  assert.deepEqual(renamed.random, first.random); assert.equal(first.player.name, second.player.name);
  assert.equal(renamed.player.name, '沈知微'); assert.throws(() => renameBirth(first, ''), /姓名/u);
  assert.deepEqual(playLife('相同道路', 'family'), playLife('相同道路', 'family'));
});

test('同种子可另启一世，保留不同人生与人物 ID', () => {
  const a = newLife({ seed: 'repeat', runId: 'a' }), b = newLife({ seed: 'repeat', runId: 'b' });
  assert.notEqual(a.id, b.id); assert.notEqual(a.people[0].id, b.people[0].id);
  assert.deepEqual(a.random, b.random); assert.equal(a.player.root, b.player.root);
});

test('查询、汇总和可选回应不消耗随机数，也不修改状态', () => {
  const state = advance(beginLife(newLife({ seed: 'read-only' })), 1200), before = clone(state);
  for (let i = 0; i < 10; i++) { focusOptions(state); autoChoice(state); breakthroughChance(state); incomePreview(state); travelPreview(state, 'landu'); summarize(state); calendar(state); decisionView(state, state.pending); }
  assert.deepEqual(state, before);
});

test('逐月与成批推进产生相同年月、事件、世界和随机结果', () => {
  const origin = beginLife(newLife({ seed: 'month-clock' }));
  let monthly = origin;
  while (!monthly.pending) monthly = advance(monthly, 1);
  const batch = advance(origin, 12000);
  const normalize = value => { const result = clone(value); delete result.revision; return result; };
  assert.deepEqual(normalize(monthly), normalize(batch)); assert.equal(batch.month, 72);
});

test('出生、待选与终章不能跳过；抉择连发保持同一个月份', () => {
  const born = newLife({ seed: 'pause' }); assert.equal(advance(born, 500), born);
  const pending = advance(beginLife(born), 12000); assert.equal(advance(pending, 12000), pending);
  const ended = playLife('finished', 'family'); assert.equal(advance(ended, 12000), ended);
  assert.throws(() => choose(ended, 'read'));
  const age18 = toAge('adjacent', 17);
  let state = advance(age18, 12); assert.equal(state.month, 216); assert.equal(state.pending.event, 'profession');
  state = choose(state, policyChoice(state, 'cultivate')); assert.equal(state.month, 216); assert.ok(state.pending);
});

test('无效选项、资源不足、非法行程与月份都保持输入原样', () => {
  const pending = advance(beginLife(newLife({ seed: 'atomic' })), 72), before = clone(pending);
  assert.throws(() => choose(pending, 'not-a-choice')); assert.throws(() => act(pending, { type: 'heal' }));
  assert.deepEqual(pending, before);
  const state = toAge('poor', 18, 'family', { root: 'none' }); state.player.stones = 0;
  const unchanged = clone(state); assert.throws(() => act(state, { type: 'buy', item: 'sword' }), /不足/u);
  assert.throws(() => act(state, { type: 'travel', to: 'missing' })); assert.throws(() => advance(state, 1.5));
  assert.deepEqual(state, unchanged);
});

test('六岁学艺可进入同一重心；十八岁修士可保留修行', () => {
  let state = advance(beginLife(newLife({ seed: 'craft-child' })), 72);
  state = choose(state, 'hands'); assert.ok(focusOptions(state).some(item => item.id === 'craft'));
  const before = state.player.craft; state = advance(state, 12); assert.ok(state.player.craft > before);
  const grown = toAge('maintain', 18, 'cultivate', { root: 'dual' }); assert.equal(grown.player.focus, 'cultivate');
});

test('没有灵根的自然人生仍有家庭与完整终章，不能进入不适用山门', () => {
  let state = toAge('mortal-route', 11, 'family', { root: 'none' }); state = advance(state, 12);
  assert.equal(state.pending.event, 'path'); assert.ok(state.pending.options.find(item => item.id === 'songyin').disabled);
  assert.throws(() => choose(state, 'songyin'));
  const ended = playLife('mortal-route', 'family', { root: 'none', validateEach: true });
  assert.equal(ended.player.realm, 0); assert.equal(ended.ending.type, 'family'); assert.ok(ended.people.some(person => person.relation === 'child'));
});

test('闭关推进真实岁月，亲友变老，世况改变；要事会打断', () => {
  let state = toAge('retreat-clock', 18, 'cultivate', { root: 'single' });
  const father = state.people.find(person => ['father', 'guardian'].includes(person.relation)), age = personAge(state, father);
  const worldBefore = clone(state.world);
  state = act(state, { type: 'retreat', years: 3 }); assert.throws(() => setFocus(state, 'craft'), /闭关/u);
  const targetMonth = state.month + 36;
  let result = advance(state, 36);
  while (result.month < targetMonth || result.pending) result = result.pending ? choose(result, policyChoice(result, 'cultivate')) : advance(result, targetMonth - result.month);
  validateState(result);
  assert.equal(result.month, state.month + 36); assert.equal(personAge(result, result.people.find(person => person.id === father.id)), age + 3);
  assert.notDeepEqual(result.world.regions, worldBefore.regions); assert.equal(result.player.retreat, null);
  let interrupted = act(result, { type: 'retreat', years: 10 }); interrupted = advance(interrupted, 120);
  assert.ok(interrupted.pending); assert.ok(interrupted.month < result.month + 120); assert.ok(interrupted.player.retreat);
  let replied = interrupted;
  while (replied.pending) replied = choose(replied, policyChoice(replied, 'cultivate'));
  const exit = act(replied, { type: 'leaveRetreat' });
  assert.equal(exit.month, interrupted.month); assert.equal(exit.player.retreat, null);
});

test('旅行按月份抵达，路资真实扣除，地点和足迹同步', () => {
  const state = toAge('travel-clock', 18, 'family', { root: 'none' }); state.player.money = 200;
  const preview = travelPreview(state, 'wenxue');
  const travelling = act(state, { type: 'travel', to: 'wenxue' }); assert.equal(travelling.player.money, state.player.money - preview.money);
  assert.equal(travelling.player.location, state.player.location); assert.throws(() => act(travelling, { type: 'travel', to: 'landu' }));
  const arrived = advance(travelling, preview.months); assert.equal(arrived.player.location, 'wenxue'); assert.ok(arrived.player.visited.includes('wenxue'));
  assert.equal(arrived.player.travel, null); validateState(arrived);
});

test('书、剑、符、草和住处使用真实资源，已拥有的唯一物品不能重复购入', () => {
  let state = toAge('items', 24, 'cultivate', { root: 'single' });
  state.player.stones = 150; state.player.health = 60; state.player.inventory.book = 0; const input = clone(state);
  state = act(state, { type: 'buy', item: 'book' }); assert.equal(state.player.stones, 128); assert.equal(state.player.inventory.book, 1);
  assert.throws(() => act(state, { type: 'buy', item: 'book' }));
  state = act(state, { type: 'heal' }); assert.equal(state.player.health, 80);
  state = act(state, { type: 'home', style: 'bamboo' }); assert.equal(state.player.homeStyle, 'bamboo');
  assert.equal(input.player.inventory.book, 0); validateState(state);
});

test('独立人物选择道路、突破和离世，死亡年龄不会随主角长寿继续增加', () => {
  const ended = playLife('long-person-history', 'cultivate', { root: 'single', validateEach: true });
  const friend = ended.people.find(person => ['friend', 'partner'].includes(person.relation));
  assert.ok(friend.history.some(point => point.kind === 'path'));
  const parent = ended.people.find(person => person.relation === 'mother' && !person.alive);
  assert.ok(parent); assert.equal(personAge(ended, parent), Math.floor((parent.deathMonth - parent.bornMonth) / 12));
  assert.equal(personAge({ ...ended, month: ended.month + 120 }, parent), personAge(ended, parent));
});

test('同一世界的生计随繁荣与风险变化，负责人引用保持有效', () => {
  const state = toAge('economy', 18), poor = clone(state), rich = clone(state);
  poor.world.regions.find(item => item.id === poor.player.location).prosperity = 20;
  rich.world.regions.find(item => item.id === rich.player.location).prosperity = 90;
  assert.ok(incomePreview(rich).money > incomePreview(poor).money);
  const ended = playLife('leaders', 'cultivate', { root: 'single' });
  for (const faction of ended.world.factions) assert.ok(ended.people.some(person => person.id === faction.leaderId && person.alive));
});

test('版本、非有限数、人物引用和篡改的待选条件被拒绝', () => {
  const state = advance(beginLife(newLife({ seed: 'validation' })), 72);
  const invalid = clone(state); invalid.player.health = NaN; assert.throws(() => validateState(invalid));
  const future = clone(state); future.rulesVersion = 'future'; assert.throws(() => validateState(future), /版本/u);
  const missing = clone(state); missing.player.partnerId = 'nonexistent'; assert.throws(() => validateState(missing), /人物/u);
  const tampered = clone(state); tampered.pending.options[0].disabled = true; assert.throws(() => validateState(tampered), /规则/u);
  validateState(state);
});

test('受伤失败会立即终章，清空待选、行程和闭关，原状态保留', () => {
  let success = false;
  for (let i = 0; i < 20; i++) {
    const state = toAge('injury-' + i, 18, 'family', { root: 'none' });
    state.player.health = 1;
    const eventId = state.id + ':event:' + state.sequence++;
    state.pending = decisionView(state, { id: eventId, event: 'danger', payload: {} });
    const input = clone(state), result = choose(state, 'protect');
    if (result.phase === 'ended') {
      assert.equal(result.ending.type, 'fallen'); assert.equal(result.pending, null); assert.deepEqual(result.queue, []); assert.equal(result.player.travel, null); assert.deepEqual(state, input); validateState(result); success = true; break;
    }
  }
  assert.ok(success, '受控伤势场景应覆盖一次实际随机失败');
});

test('自然人生采样覆盖多条可达终章、突破成功与失败，所有状态有效', () => {
  const endings = new Set(), stats = { failures: 0, breakthroughs: 0 };
  let count = 0;
  const distribution = {};
  for (const policy of ['cultivate', 'family', 'artisan', 'teacher', 'guardian', 'wanderer', 'quiet']) {
    for (let seed = 0; seed < 8; seed++) {
      const state = playLife('sample-' + policy + '-' + seed, policy, { root: policy === 'cultivate' ? 'single' : 'none' });
      endings.add(state.ending.type); stats.failures += state.stats.failures; stats.breakthroughs += state.stats.breakthroughs;
      count++; distribution[state.ending.type] = (distribution[state.ending.type] || 0) + 1;
      assert.ok(state.month <= 10800); assert.ok(state.player.money >= 0 && state.player.stones >= 0 && state.player.herbs >= 0);
      assert.equal(state.stats.decisions, state.choices.length);
    }
  }
  for (const ending of ['ascension', 'family', 'artisan', 'teacher', 'guardian', 'wanderer', 'quiet']) assert.ok(endings.has(ending), '自然采样缺少终章 ' + ending);
  assert.ok(stats.failures > 0); assert.ok(stats.breakthroughs > 0);
  console.log('NATURAL_SAMPLE ' + JSON.stringify({ count, distribution, ...stats }));
});

test('闭关中的回应转向家庭或职业时，结束闭关并保留已过年月', () => {
  let state = act(toAge('retreat-new-priority', 17, 'cultivate', { root: 'dual' }), { type: 'retreat', years: 10 });
  for (let i = 0; i < 30 && state.pending?.event !== 'profession'; i++) state = state.pending ? choose(state, policyChoice(state, 'cultivate')) : advance(state, 1200);
  assert.equal(state.pending.event, 'profession'); assert.ok(state.player.retreat);
  const month = state.month, progress = state.player.progress; state = choose(state, 'farmer');
  assert.equal(state.month, month); assert.equal(state.player.focus, 'family'); assert.equal(state.player.retreat, null); assert.equal(state.player.progress, progress);
  validateState(state);
});

test('损坏的事件计数、人物计数、年度记录和负责人被拒绝', () => {
  const state = toAge('invalid-counters', 32, 'family');
  for (const damage of [copy => { copy.sequence = 1; }, copy => { copy.nextPerson = 1; }, copy => { copy.years.pop(); }, copy => { copy.people.find(person => person.id === copy.world.factions[0].leaderId).alive = false; }]) {
    const copy = clone(state); damage(copy); assert.throws(() => validateState(copy));
  }
  validateState(state);
});

test('损坏存档不能在最高境界再递增，也不能与离世人物建立关系', () => {
  const state = advance(beginLife(newLife({ seed: 'wrong-boundary', root: 'dual' })), 72);
  state.player.realm = 5; state.player.progress = 620; state.player.lifespan = 900; state.player.training.learned = true; state.player.training.progress = 12;
  state.pending = decisionView(state, { id: state.pending.id, event: 'breakthrough', payload: {} });
  assert.throws(() => validateState(state), /境界条件/u); assert.throws(() => choose(state, 'attempt'), /不适用/u);
  const family = toAge('ghost-partner', 24, 'family'), actor = family.people.find(person => person.id === family.player.partnerId);
  actor.alive = false; actor.deathMonth = family.month;
  const eventId = family.id + ':event:' + family.sequence++;
  family.pending = decisionView(family, { id: eventId, event: 'bond', payload: { actorId: actor.id } });
  assert.throws(() => validateState(family), /不适用/u); assert.throws(() => choose(family, 'together'), /不适用/u);
});
