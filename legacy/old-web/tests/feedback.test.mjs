import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { newLife, clone, personById, familyAt, homeMourning } from '../packages/core/state.js';
import { beginLife, advance, choose, act, setFocus, decisionView, decisionEligible, cultivationGuide, incomePreview, travelPreview, localActivityPreview, worldImpact } from '../packages/core/engine.js';
import { validateState } from '../packages/core/validate.js';
import { migrateState } from '../packages/core/migrate.js';
import { SaveStore, STORAGE_KEY } from '../packages/storage/store.js';
import { forkState } from '../packages/storage/fork.js';
import { WORLD_EVENTS, SMALL_STORIES } from '../content/expansion.js';
import { LOCAL_ACTIVITIES, REGIONS } from '../content/world.js';
import { lifeView } from '../apps/web/views.js';
import { dialogView } from '../apps/web/dialogs.js';
import { toAge, policyChoice, playLife } from './scenarios.mjs';

function pending(state, event, payload = {}) {
  const next = clone(state);
  const id = next.id + ':event:' + next.sequence++;
  next.pending = decisionView(next, { id, event, payload });
  return next;
}

function settle(state, months, policy = 'quiet') {
  const target = state.month + months;
  for (let count = 0; state.phase === 'life' && (state.month < target || state.pending); count++) {
    assert.ok(count < 300, '受控场景应能结束');
    state = state.pending ? choose(state, policyChoice(state, policy)) : advance(state, target - state.month);
    validateState(state);
  }
  return state;
}

function adult(seed, root = 'dual') {
  const state = toAge(seed, 18, 'family', { root });
  state.player.money = 500; state.player.stones = 60; state.player.herbs = 40;
  return validateState(state);
}

test('留乡、高悟性的人有明确的学习、按月引气和入道路径', () => {
  let state = adult('learn-without-sect'); state.player.insight = 100;
  assert.equal(state.player.realm, 0); assert.match(cultivationGuide(state).text, /12 点|12 灵石/u);
  assert.throws(() => act(state, { type: 'initiate' }), /学习调息/u);
  const random = clone(state.random);
  state = act(state, { type: 'learnBreath' }); assert.deepEqual(state.random, random);
  assert.equal(state.player.training.learned, true);
  const start = state.month;
  for (let count = 0; state.player.training.progress < 12; count++) {
    assert.ok(count < 24);
    if (state.pending) state = choose(state, policyChoice(state, 'quiet'));
    else state = act(state, { type: 'practiceMonth' });
  }
  while (state.pending && state.pending.event !== 'entry') state = choose(state, policyChoice(state, 'quiet'));
  assert.ok(state.month > start && state.month <= start + 24);
  const before = clone(state.player);
  state = state.pending ? choose(state, 'enter') : act(state, { type: 'initiate' });
  assert.equal(state.player.realm, 1); assert.equal(state.player.stones, before.stones - 12); assert.equal(state.player.herbs, before.herbs - 3);
  assert.equal(state.player.progress, 0); assert.equal(state.player.training.progress, 12); validateState(state);
  assert.match(cultivationGuide(state).text, /100|38 灵石/u);
});

test('未见灵根、悟性 100 可通过通窍入道，门槛和费用不靠随机消失', () => {
  let state = adult('root-attunement', 'none'); state.player.insight = 100;
  const before = clone(state), guide = cultivationGuide(state);
  assert.ok(guide.actions.some(item => item.id === 'attune' && !item.disabled));
  state = act(state, { type: 'attune' });
  assert.equal(state.player.root, 'none'); assert.equal(state.player.training.awakened, true); assert.equal(state.player.training.learned, true);
  assert.equal(state.player.stones, before.player.stones - 6); assert.equal(state.player.herbs, before.player.herbs - 8); assert.deepEqual(state.random, before.random);
  state = setFocus(state, 'cultivate'); state = settle(state, 18);
  assert.equal(state.player.training.progress, 12);
  state = act(state, { type: 'initiate' }); assert.equal(state.player.realm, 1); validateState(state);
  const low = adult('attunement-gate', 'none'); low.player.insight = 39; const original = clone(low);
  assert.throws(() => act(low, { type: 'attune' }), /悟性/u); assert.deepEqual(low, original);
});

test('药会学徒后来通窍入道时，保留已经学过的功法与师承', () => {
  let state = toAge('guild-attuned-cultivator', 18, 'teacher', { root: 'none', origin: 'farmer' });
  assert.equal(state.player.faction, 'yaohui'); assert.equal(state.player.technique, 'herbal');
  state.player.insight = 100; state.player.stones = 60; state.player.herbs = 40;
  state = act(state, { type: 'attune' }); state = setFocus(state, 'cultivate'); state = settle(state, 18);
  state = act(state, { type: 'initiate' });
  assert.equal(state.player.realm, 1); assert.equal(state.player.faction, 'yaohui'); assert.equal(state.player.technique, 'herbal');
  assert.ok(state.player.mentorId); validateState(state);
});

test('待选时修行指引、四属性含义和资源用途仍在主界面', () => {
  const state = pending(adult('visible-guide'), 'profession'), before = clone(state);
  const html = lifeView(state);
  for (const text of ['修行指引', '学习调息', '引气', '当前健康', '稳定专注', '理解功法', '谋生制作', '铜钱：家用', '灵草：疗伤']) assert.ok(html.includes(text), text);
  assert.ok(state.pending.options.find(item => item.id === 'cultivator' && !item.disabled));
  cultivationGuide(state); localActivityPreview(state); dialogView('world', state); dialogView('home', state); dialogView('inventory', state);
  assert.deepEqual(state, before);
});

test('远行自然进入抉择，选项给出用途、路资和月份，留乡不会自动迁居', () => {
  let state = toAge('natural-journey', 15, 'family', { root: 'none' });
  state.player.money = 500;
  while (state.pending?.event !== 'journey') state = state.pending ? choose(state, policyChoice(state, 'family')) : advance(state, 12);
  const original = clone(state), destinations = state.pending.options.filter(item => item.id !== 'stay');
  assert.equal(destinations.length, 4);
  for (const item of destinations) { assert.match(item.description, /年收入|家用/u); assert.ok(item.costs.money > 0); }
  const staying = choose(state, 'stay'); assert.equal(staying.player.location, original.player.location); assert.equal(staying.player.travel, null);
  const target = destinations[0], route = travelPreview(state, target.id), travelling = choose(state, target.id);
  assert.equal(travelling.player.location, original.player.location); assert.equal(travelling.player.money, original.player.money - route.money);
  const arrived = settle(travelling, route.months);
  assert.equal(arrived.player.location, target.id); assert.ok(arrived.player.visited.includes(target.id));
  assert.ok(arrived.log.some(item => item.kind === 'travel' && item.text.includes('可以') && item.text.includes('家用')));
});

test('五个地域都有可执行活动，遵守月份、费用与冷却', () => {
  for (const region of REGIONS) {
    let state = adult('local-' + region.id, 'none'); state.player.location = region.id;
    if (!state.player.visited.includes(region.id)) state.player.visited.push(region.id);
    const preview = localActivityPreview(state), before = clone(state);
    assert.equal(preview.name, LOCAL_ACTIVITIES[region.id].name); assert.equal(preview.disabled, false);
    state = act(state, { type: 'localActivity' });
    assert.equal(state.month, before.month + 1); assert.equal(state.player.money, before.player.money - (preview.costs.money || 0));
    assert.equal(localActivityPreview(state).disabled, true); assert.throws(() => act(state, { type: 'localActivity' }));
    if (region.id === 'hegu') assert.equal(state.player.herbs, before.player.herbs + 5);
    if (region.id === 'landu') { assert.equal(state.player.training.learned, true); assert.ok(state.player.training.progress >= 3); }
    if (region.id === 'zhaoshi') assert.equal(state.player.stones, before.player.stones + 8);
    if (region.id === 'mulan') assert.equal(state.player.stones, before.player.stones + 5);
    validateState(state);
  }
});

test('铜钱和灵石可兑换，灵草能按月炼丹，丹药能实际疗伤', () => {
  let state = adult('resource-loop', 'none'); state.player.craft = 30; state.player.health = 40;
  const before = clone(state);
  state = act(state, { type: 'exchange', direction: 'stones' }); assert.equal(state.player.money, before.player.money - 100); assert.equal(state.player.stones, before.player.stones + 5);
  state = act(state, { type: 'exchange', direction: 'money' }); assert.equal(state.player.money, before.player.money - 20); assert.equal(state.player.stones, before.player.stones);
  state = act(state, { type: 'brew' }); assert.equal(state.month, before.month + 1); assert.equal(state.player.inventory.pill, 1); assert.equal(state.player.herbs, before.player.herbs - 3); assert.equal(state.player.stones, before.player.stones - 1);
  const health = state.player.health; state = act(state, { type: 'usePill' });
  assert.equal(state.player.inventory.pill, 0); assert.equal(state.player.health, health + 30); validateState(state);
  assert.ok(state.ledger.some(item => item.label === '炼制养元丹' && item.herbs === -3 && item.stones === -1));
});

test('行路或闭关时不能隔空交易，抵达或出关后才恢复坊市行动', () => {
  let state = adult('market-at-location'); state.player.craft = 30;
  state = act(state, { type: 'travel', to: state.player.location === 'wenxue' ? 'hegu' : 'wenxue' });
  const travelling = clone(state);
  for (const action of [{ type: 'buy', item: 'herbs' }, { type: 'sell' }, { type: 'exchange', direction: 'stones' }, { type: 'brew' }]) {
    assert.throws(() => act(state, action), /行路|抵达/u); assert.deepEqual(state, travelling);
  }
  state = settle(state, state.player.travel.arrival - state.month);
  assert.equal(act(state, { type: 'exchange', direction: 'stones' }).player.stones, state.player.stones + 5);
  const monk = toAge('market-after-retreat', 18, 'cultivate', { root: 'single' });
  const closed = act(monk, { type: 'retreat', years: 1 });
  assert.throws(() => act(closed, { type: 'buy', item: 'herbs' }), /出关/u);
  assert.throws(() => act(closed, { type: 'home', style: 'bamboo' }), /闭关/u);
  validateState(closed);
});

test('返乡探望与亲手修屋到达后才结算，并重查在世亲人的地点', () => {
  let state = toAge('visit-arrival', 18, 'family', { root: 'single', origin: 'farmer' });
  state.player.money = 500; state.player.location = 'wenxue'; state.player.visited.push('wenxue');
  const actor = state.people.find(person => person.relation === 'mother');
  state = pending(state, 'care', { actorId: actor.id });
  const start = clone(state), travelling = choose(state, 'visit');
  assert.equal(travelling.player.bond, start.player.bond); assert.equal(travelling.stats.family, start.stats.family);
  assert.equal(travelling.people.find(person => person.id === actor.id).bond, actor.bond);
  const copy = forkState(travelling, 'life-visit-copy'); assert.ok(copy.player.travel.task.actorId.startsWith(copy.id + ':'));
  const arrived = settle(travelling, travelling.player.travel.arrival - travelling.month);
  assert.equal(arrived.stats.family, start.stats.family + 4); assert.ok(arrived.log.some(entry => entry.text.includes('抵达后亲自探望')));
  const missed = clone(travelling), departed = personById(missed, actor.id); departed.alive = false; departed.deathMonth = missed.month;
  const afterDeath = settle(missed, missed.player.travel.arrival - missed.month);
  assert.equal(afterDeath.stats.family, start.stats.family); assert.ok(afterDeath.log.some(entry => entry.text.includes('探望未能完成')));
  let monk = toAge('repair-out-of-retreat', 18, 'cultivate', { root: 'single', origin: 'farmer' });
  monk.player.money = 500; monk = act(monk, { type: 'retreat', years: 1 });
  const before = monk.stats.family, returning = choose(pending(monk, 'homecoming'), 'hands');
  assert.equal(returning.player.retreat, null); assert.ok(returning.player.travel); assert.equal(returning.stats.family, before);
  const repaired = settle(returning, returning.player.travel.arrival - returning.month);
  assert.equal(repaired.stats.family, before + 1); validateState(repaired);
});

test('住处改造说明旧新样式、费用、余额，修炼加成实际生效', () => {
  let state = toAge('home-explanation', 18, 'cultivate', { root: 'single' }); state.player.stones = 200;
  const previous = state.player.homeStyle; state = act(state, { type: 'home', style: 'cloud' });
  assert.equal(previous, 'plain'); assert.equal(state.player.stones, 152);
  assert.match(state.log.at(-1).text, /草庐.*云台.*48 灵石.*200 → 152/u);
  assert.equal(state.ledger.at(-1).stones, -48);
  const plain = clone(state); plain.player.homeStyle = 'plain';
  assert.ok(advance(state, 1).player.progress > advance(plain, 1).player.progress); validateState(state);
});

test('日常故事十年内避免短期重复，变体、地点和账目具体可见', () => {
  const state = playLife('anti-repeat', 'quiet', { root: 'none', validateEach: true });
  const last = new Map(), seen = new Set();
  for (const item of state.choices.filter(item => SMALL_STORIES.includes(item.event))) {
    if (last.has(item.event)) assert.ok(item.month - last.get(item.event) >= 96, item.event + ' 重复过近');
    last.set(item.event, item.month); seen.add(item.event);
  }
  assert.ok(seen.size >= 8); assert.ok(state.log.some(item => item.kind === 'economy' && item.text.includes('支付家用')));
  const yearEntries = state.log.filter(item => item.kind === 'year');
  assert.equal(new Set(yearEntries.map(item => item.text)).size, yearEntries.length);
  const variants = pending(adult('variant'), 'gathering', { variant: 0 });
  assert.match(variants.pending.text, /药铺|药材/u); assert.ok(variants.pending.text.includes(REGIONS.find(item => item.id === variants.player.location).name));
});

test('一轮世界事件覆盖十一种世局，包含灾乱、税役和王朝更替', () => {
  const state = toAge('full-world-cycle', 36, 'quiet', { root: 'none' });
  const events = state.world.history.filter(item => WORLD_EVENTS.some(source => source.id === item.type));
  assert.deepEqual(new Set(events.slice(0, 11).map(item => item.type)), new Set(WORLD_EVENTS.map(item => item.id)));
  for (const type of ['famine', 'flood', 'quake', 'tax', 'levy', 'regime', 'war', 'demonwar']) assert.ok(events.some(item => item.type === type), type);
  assert.ok(events.some(item => item.type === 'regime' && item.text.includes('澄川朝') && item.text.includes('景澜朝')));
  validateState(state);
});

test('世界灾害有地域、持续期和真实家用影响，异地事件不会误扣本地税费', () => {
  const state = adult('world-cost', 'none'); state.world.activeEvents = [];
  const before = incomePreview(state), famine = WORLD_EVENTS.find(item => item.id === 'famine');
  state.world.activeEvents = [{ id: state.id + ':world:' + state.month, type: 'famine', region: state.player.location, start: state.month, end: state.month + 36, income: famine.income, living: famine.living, spirit: famine.spirit }];
  const affected = incomePreview(state);
  assert.ok(affected.money < before.money); assert.equal(affected.living, before.living + 30);
  const original = clone(state); incomePreview(state); worldImpact(state); assert.deepEqual(state, original);
  state.world.activeEvents[0].region = REGIONS.find(item => item.id !== state.player.location).id;
  assert.deepEqual(incomePreview(state), before);
  state.world.activeEvents[0].region = null;
  const next = settle(state, 12); assert.ok(next.ledger.some(item => item.label === '世局追加家用与税役' && item.money < 0)); validateState(next);
});

test('父母讣告立即打断闭关，按月返乡、成服安葬、守丧和周年追思', () => {
  let state = toAge('parent-funeral', 30, 'cultivate', { root: 'single', origin: 'farmer' });
  state.player.location = 'wenxue'; if (!state.player.visited.includes('wenxue')) state.player.visited.push('wenxue');
  state.player.money = 0;
  const parent = state.people.find(item => item.relation === 'mother'); parent.health = 0;
  state = act(state, { type: 'retreat', years: 10 });
  const from = state.month;
  while (state.pending?.event !== 'bereavement') state = state.pending ? choose(state, policyChoice(state, 'cultivate')) : advance(state, 12);
  assert.equal(state.player.retreat, null); assert.equal(state.pending.payload.actorId, parent.id);
  assert.match(state.pending.title, /母亲.*享年/u); assert.ok(state.pending.text.includes('返乡'));
  const death = state.month, route = travelPreview(state, parent.location, { onFoot: true }); state.player.money = 0;
  state = choose(state, 'full');
  assert.equal(state.player.travel.to, parent.location); assert.equal(state.player.location, 'wenxue'); assert.equal(state.player.debt >= route.money + 60, true);
  assert.throws(() => act(state, { type: 'retreat', years: 1 }));
  state = settle(state, route.months + 1); assert.equal(state.player.location, parent.location); assert.equal(state.player.mourning[0].stage, 'observance');
  assert.ok(state.log.some(item => item.text.includes('素麻衣') && item.text.includes('入殓')));
  assert.equal(incomePreview(state).mourningFactor, 0.7);
  state = settle(state, 24); assert.equal(homeMourning(state).length, 0); assert.ok(state.month > from);
  assert.ok(state.choices.some(item => item.event === 'memorial' && item.month >= death + 12));
  assert.ok(state.choices.some(item => item.event === 'mourningEnd')); validateState(state);
});

test('双亲同时离世各自具名，行程不重复收费，空屋不再触发帮家里', () => {
  let state = toAge('two-parent-funerals', 30, 'cultivate', { root: 'single', origin: 'farmer' });
  state.player.money = 500; state.player.location = 'wenxue'; state.player.visited.push('wenxue');
  for (const person of state.people.filter(item => ['mother', 'father'].includes(item.relation))) person.health = 0;
  while (state.pending?.event !== 'bereavement') state = state.pending ? choose(state, policyChoice(state, 'quiet')) : advance(state, 12);
  state = choose(state, 'full'); assert.equal(state.pending.event, 'bereavement');
  const second = state.pending.options.find(item => item.id === 'full'); assert.equal(second.costs.money, 60);
  state = choose(state, 'full'); assert.equal(state.player.mourning.length, 2); assert.equal(familyAt(state).length, 0);
  assert.equal(decisionEligible(state, 'homecoming'), false);
  const copied = forkState(state, 'life-funeral-copy'); validateState(copied);
  assert.ok(copied.player.mourning.every(item => item.actorId.startsWith(copied.id + ':')));
  state = settle(state, 36); assert.equal(state.player.mourning.filter(item => item.stage === 'complete').length, 2);
  assert.ok(state.log.some(item => item.text.includes('当地已没有在世的家人')));
  const actor = state.people.find(item => item.relation === 'mother'), memorial = pending(state, 'inheritance', { actorId: actor.id });
  assert.match(memorial.pending.options.find(item => item.id === 'fund').label, /义仓/u);
});

test('旧档只升级副本，保留年月、原经历、RNG、人物及原文备份', () => {
  const archive = JSON.parse(readFileSync(new URL('./fixtures/v0.1.0-archive.json', import.meta.url), 'utf8'));
  const sourceRaw = JSON.stringify(archive), original = clone(archive);
  const map = new Map([[STORAGE_KEY, sourceRaw]]), storage = { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value) };
  const store = new SaveStore(storage), active = store.load(); assert.equal(store.raw(), sourceRaw);
  for (let index = 0; index < archive.lives.length; index++) {
    const previous = archive.lives[index], upgraded = store.lives()[index];
    for (const key of ['id', 'seed', 'month', 'people', 'random', 'log', 'years', 'choices', 'ledger']) assert.deepEqual(upgraded[key], previous[key], key);
    assert.equal(upgraded.version, '0.2.0'); validateState(upgraded); assert.deepEqual(migrateState(upgraded), upgraded);
  }
  assert.deepEqual(archive, original);
  store.save(advance(active, 1)); assert.equal(map.get(STORAGE_KEY + '.backup'), sourceRaw);
  assert.ok([...map.entries()].some(([key, value]) => key.startsWith(STORAGE_KEY + '.preserved.') && value === sourceRaw));
  store.save(advance(store.active(), 1));
  assert.ok([...map.entries()].some(([key, value]) => key.startsWith(STORAGE_KEY + '.preserved.') && value === sourceRaw));
  assert.equal(store.backup().lives.length, 3);
  const broken = clone(archive.lives[0]); broken.pending.options[0].costs = { stones: 999 };
  assert.throws(() => migrateState(broken), /旧待选|条件/u);
});

test('旧档尚待回应的父母讣告接入治丧流程，已走过的事实仍保留', () => {
  const archive = JSON.parse(readFileSync(new URL('./fixtures/v0.1.0-archive.json', import.meta.url), 'utf8'));
  const source = clone(archive.lives[1]), actor = source.people.find(person => person.relation === 'mother');
  actor.alive = false; actor.deathMonth = source.month;
  source.pending = { id: source.id + ':event:' + source.sequence++, event: 'farewell', month: source.month, title: '旧版告别', text: '母亲离世', kind: 'memory', payload: { actorId: actor.id }, options: ['remember', 'care', 'journey'].map(id => ({ id, label: id, description: '旧版说明', costs: {}, disabled: false, reason: '' })) };
  const upgraded = migrateState(source);
  assert.equal(upgraded.pending.event, 'bereavement'); assert.ok(upgraded.pending.options.some(option => option.id === 'full'));
  assert.deepEqual(upgraded.migration.previousPending, source.pending);
  for (const key of ['month', 'log', 'people', 'random', 'choices', 'ledger']) assert.deepEqual(upgraded[key], source[key]);
  validateState(choose(upgraded, 'simple'));
});

test('旧档中已失效的家庭待选留存原文并明确撤销，未知版本不覆盖', () => {
  const archive = JSON.parse(readFileSync(new URL('./fixtures/v0.1.0-archive.json', import.meta.url), 'utf8'));
  const source = clone(archive.lives[1]);
  for (const person of source.people.filter(item => ['mother', 'father'].includes(item.relation))) { person.alive = false; person.deathMonth = source.month; }
  const child = source.people.find(item => item.relation === 'friend'); child.relation = 'child'; child.location = 'wenxue';
  const id = source.id + ':event:' + source.sequence++;
  source.pending = { id, event: 'homecoming', month: source.month, title: '故乡修缮', text: '家中修屋', kind: 'relationship', payload: {}, options: ['repair', 'hands', 'later'].map(choice => ({ id: choice, label: choice, description: '旧版说明', costs: choice === 'repair' ? { money: 100 } : {}, disabled: choice === 'repair' && source.player.money < 100, reason: '' })) };
  const upgraded = migrateState(source);
  assert.equal(upgraded.pending, null); assert.deepEqual(upgraded.migration.previousPending, source.pending);
  assert.ok(upgraded.log.at(-1).text.includes('已不适用')); assert.deepEqual(upgraded.random, source.random); validateState(upgraded);
  const unknown = clone(source); unknown.rulesVersion = 'shanhai-rules-unknown'; assert.throws(() => migrateState(unknown), /版本/u);
});
