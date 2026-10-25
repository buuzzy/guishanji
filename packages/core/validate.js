import { SAVE_VERSION, GAME_VERSION, RULES_VERSION, CONTENT_VERSION, REGIONS, FACTIONS, ORIGINS, ROOTS, REALMS, TECHNIQUES, FOCUS, ENDINGS, ENTRY_PRACTICE } from '../../content/world.js';
import { STORIES } from '../../content/stories.js';
import { SMALL_STORIES, WORLD_EVENTS, STORY_VARIANTS } from '../../content/expansion.js';
import { decisionView, decisionEligible } from './engine.js';
import { isLegacyState, LEGACY_OPTIONS, legacyEligible, legacyOptionsValid } from './legacy-v1.js';

export class ValidationError extends Error {
  constructor(message) { super('存档校验未通过：' + message); this.name = 'ValidationError'; this.code = 'invalid'; }
}

const fail = message => { throw new ValidationError(message); };
const object = (value, path) => { if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path + ' 应为对象。'); };
const array = (value, path, max = 20000) => { if (!Array.isArray(value) || value.length > max) fail(path + ' 列表无效或过长。'); };
const number = (value, path, min = 0, max = 1e9, integer = false) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isSafeInteger(value))) fail(path + ' 数值无效。');
};
const string = (value, path, max = 2000, empty = false) => {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.length) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(value)) fail(path + ' 文字无效。');
};
const oneOf = (value, values, path) => { if (!values.includes(value)) fail(path + ' 使用了未知值。'); };
const ids = items => items.map(item => item.id);
const regionIds = ids(REGIONS), factionIds = ids(FACTIONS), events = [...Object.keys(STORIES), 'breakthrough', 'ascension'];

function safeTree(value, path = 'root', depth = 0) {
  if (depth > 32) fail('数据嵌套过深。');
  if (typeof value === 'number' && !Number.isFinite(value)) fail(path + ' 存在非有限数。');
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') fail(path + ' 不能序列化。');
  if (value && typeof value === 'object') {
    if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(path + ' 不是普通数据。');
    for (const [key, item] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) fail('存在不允许的数据键。');
      safeTree(item, path + '.' + key, depth + 1);
    }
  }
}

/** Validation is read-only; saved options must match the current rules exactly. */
export function validateState(state, { legacy = false } = {}) {
  object(state, '人生');
  if (legacy ? !isLegacyState(state) : state.format !== SAVE_VERSION || state.version !== GAME_VERSION || state.rulesVersion !== RULES_VERSION || state.contentVersion !== CONTENT_VERSION) fail('此文件的游戏、规则或内容版本尚不支持，请保留原文件。');
  safeTree(state);
  string(state.id, '人生 ID', 96); string(state.seed, '种子', 160);
  if (!/^life-[a-z0-9]+-[a-z0-9]+$/u.test(state.id)) fail('人生 ID 格式无效。');
  if (state.forkOf !== undefined) {
    object(state.forkOf, '副本来源');
    for (const key of ['originalId', 'sourceId']) { string(state.forkOf[key], '副本 ' + key, 96); if (!/^life-[a-z0-9]+-[a-z0-9]+$/u.test(state.forkOf[key])) fail('副本来源 ID 无效。'); }
    number(state.forkOf.revision, '副本原修订', 1, 1e8, true);
  }
  oneOf(state.phase, ['birth', 'life', 'ended'], '阶段');
  number(state.month, '月份', 0, 12000, true);
  for (const key of ['sequence', 'nextPerson', 'revision']) number(state[key], key, 1, 1e8, true);
  const serialId = (id, type) => {
    const match = new RegExp('^' + state.id + ':' + type + ':([1-9][0-9]*)$', 'u').exec(id);
    if (!match || !Number.isSafeInteger(Number(match[1])) || Number(match[1]) >= state.sequence) fail(type + ' ID 与后续计数不一致。');
  };
  object(state.random, '随机流');
  for (const key of ['birth', 'life', 'people', 'world', 'story']) {
    object(state.random[key], '随机流 ' + key);
    number(state.random[key].value, key + '.value', 1, 2147483646, true);
    number(state.random[key].draws, key + '.draws', 0, 1e9, true);
  }
  const p = state.player;
  object(p, '人物'); string(p.id, '人物 ID', 110);
  if (p.id !== state.id + ':me') fail('主角 ID 不一致。');
  string(p.name, '姓名', 40); oneOf(p.gender, ['F', 'M'], '性别');
  oneOf(p.origin, ids(ORIGINS), '出身'); oneOf(p.root, ids(ROOTS), '灵根');
  oneOf(p.birthRegion, regionIds, '出生地'); oneOf(p.location, regionIds, '所在地域');
  oneOf(p.technique, ids(TECHNIQUES), '功法'); oneOf(p.focus, ids(FOCUS), '重心');
  oneOf(p.role, ['child', 'scholar', 'farmer', 'herbalist', 'artisan', 'merchant', 'caregiver', 'cultivator'], '职业');
  oneOf(p.home, ['hut', 'wood'], '住处'); oneOf(p.homeStyle, ['plain', 'bamboo', 'stone', 'cloud'], '住处样式');
  if (p.faction !== null) oneOf(p.faction, factionIds, '所属组织');
  for (const key of ['talent', 'constitution', 'health', 'mind', 'insight', 'bond', 'craft']) number(p[key], key, 0, 100);
  number(p.realm, '境界', 0, REALMS.length - 1, true); number(p.progress, '修为', 0, REALMS[p.realm].threshold * 1.12 + 0.000001);
  const focus = FOCUS.find(item => item.id === p.focus);
  if (!legacy) {
    object(p.training, '入道练习');
    for (const key of ['learned', 'awakened']) if (typeof p.training[key] !== 'boolean') fail('入道练习标记无效。');
    number(p.training.progress, '引气练习', 0, ENTRY_PRACTICE);
    if ((!p.training.learned && p.training.progress) || (p.realm && (!p.training.learned || p.training.progress !== ENTRY_PRACTICE)) || (p.training.awakened && p.root !== 'none')) fail('入道准备与境界不一致。');
  }
  if (Math.floor(state.month / 12) < focus.minAge || (focus.cultivation && !p.realm && (legacy || !p.training.learned))) fail('生活重心不适用于当前年龄或境界。');
  number(p.lifespan, '寿元', 1, 2000, true);
  if (state.phase === 'life' && (p.health <= 0 || Math.floor(state.month / 12) >= p.lifespan)) fail('人物已到终章条件，人生阶段不一致。');
  for (const key of ['money', 'stones', 'herbs', 'debt']) number(p[key], key, 0, 1e9, true);
  if (p.root === 'none' && p.realm > 0 && (legacy || !p.training.awakened)) fail('未见灵根的路线与当前规则不一致。');
  object(p.inventory, '行囊');
  for (const key of ['charm', 'sword', 'book', 'lamp']) number(p.inventory[key], key, 0, key === 'charm' ? 10000 : 1, true);
  if (!legacy) number(p.inventory.pill, '养元丹', 0, 10000, true);
  array(p.visited, '足迹', 5); if (!p.visited.length || new Set(p.visited).size !== p.visited.length) fail('足迹重复或为空。');
  p.visited.forEach(value => oneOf(value, regionIds, '足迹'));
  if (!p.visited.includes(p.location) || !p.visited.includes(p.birthRegion)) fail('足迹缺少当前或出生地域。');
  array(p.keepsakes, '旧物', 2000); p.keepsakes.forEach(value => string(value, '旧物', 160));
  if (p.travel !== null) {
    object(p.travel, '行程'); oneOf(p.travel.from, regionIds, '起点'); oneOf(p.travel.to, regionIds, '终点');
    number(p.travel.departure, '启程月份', 0, state.month, true); number(p.travel.arrival, '抵达月份', state.month + 1, state.month + 12, true);
    if (p.travel.from !== p.location || p.travel.from === p.travel.to || p.retreat !== null) fail('行程状态矛盾。');
  }
  if (p.retreat !== null) {
    object(p.retreat, '闭关'); number(p.retreat.start, '闭关开始', 0, state.month, true); number(p.retreat.until, '出关月份', state.month + 1, p.retreat.start + 120, true);
    if (!p.realm || p.travel !== null) fail('闭关条件不一致。');
  }
  array(state.people, '人物表', 2000);
  const people = new Map();
  for (const person of state.people) {
    object(person, '亲友'); string(person.id, '亲友 ID', 160); string(person.name, '亲友姓名', 40);
    if (people.has(person.id) || person.id === p.id) fail('人物 ID 重复。'); people.set(person.id, person);
    const suffix = person.id.slice((state.id + ':').length);
    if (!person.id.startsWith(state.id + ':') || !/^(?:mother|father|guardian|companion|elder:(?:songyin|zhaochuan|yaohui)|person:[1-9][0-9]*)$/u.test(suffix)) fail('人物 ID 不属于这一生。');
    if (suffix.startsWith('person:') && Number(suffix.slice(7)) >= state.nextPerson) fail('人物 ID 与后续计数不一致。');
    oneOf(person.gender, ['F', 'M'], '亲友性别'); oneOf(person.relation, ['mother', 'father', 'guardian', 'friend', 'elder', 'mentor', 'partner', 'child', 'student', 'acquaintance'], '关系');
    oneOf(person.goal, ['live', 'cultivate'], '亲友打算'); oneOf(person.location, regionIds, '亲友所在地域');
    if (person.faction !== null) oneOf(person.faction, factionIds, '亲友组织');
    number(person.bornMonth, '亲友出生月份', -12000, state.month, true); number(person.realm, '亲友境界', 0, REALMS.length - 1, true);
    number(person.lifespan, '亲友寿元', 1, 2000, true);
    for (const key of ['health', 'talent', 'bond']) number(person[key], '亲友 ' + key, 0, 100);
    if (typeof person.alive !== 'boolean') fail('人物生死标记无效。');
    if (person.alive && person.deathMonth !== null) fail('在世人物存在离世日期。');
    if (!person.alive) number(person.deathMonth, '离世月份', Math.max(0, person.bornMonth), state.month, true);
    array(person.memories, '相处记忆', 5000);
    for (const memory of person.memories) { number(memory.month, '记忆月份', 0, state.month, true); string(memory.type, '记忆类型', 50); string(memory.detail, '记忆内容', 2000); }
    array(person.history, '亲友年表', 2000);
    for (const point of person.history) { number(point.month, '年表月份', 0, state.month, true); number(point.realm, '年表境界', 0, 5, true); oneOf(point.location, regionIds, '年表地域'); oneOf(point.kind, ['meet', 'path', 'realm', 'death'], '年表类型'); }
  }
  const reference = (id, path, nullable = true) => { if (nullable && id === null) return; if (typeof id !== 'string' || !people.has(id)) fail(path + ' 引用了不存在的人物。'); };
  reference(p.mentorId, '师长'); reference(p.partnerId, '伴侣');
  if (p.travel?.task) {
    object(p.travel.task, '行程中的安排'); oneOf(p.travel.task.kind, ['care', 'repair'], '行程安排');
    if (p.travel.task.kind === 'care') {
      reference(p.travel.task.actorId, '探望的长辈', false);
      if (!['mother', 'father', 'guardian'].includes(people.get(p.travel.task.actorId).relation)) fail('探望对象的身份不一致。');
    } else {
      oneOf(p.travel.task.region, regionIds, '修屋地域');
      if (p.travel.task.region !== p.travel.to) fail('修屋地点与行程目的地不一致。');
    }
  }
  if (!legacy) {
    array(p.mourning, '丧亲安排', 20);
    const mourned = new Set();
    for (const item of p.mourning) {
      object(item, '守丧'); reference(item.actorId, '守丧人物', false);
      const actor = people.get(item.actorId);
      if (actor.alive || !['mother', 'father', 'guardian'].includes(actor.relation) || mourned.has(item.actorId)) fail('守丧人物的身份、生死或重复安排不一致。');
      mourned.add(item.actorId); oneOf(item.region, regionIds, '治丧地域');
      if (item.region !== actor.location) fail('治丧地域与故人不一致。');
      oneOf(item.mode, ['full', 'simple', 'entrust'], '治丧方式'); oneOf(item.stage, ['returning', 'rites', 'observance', 'complete'], '守丧阶段');
      number(item.start, '守丧开始', actor.deathMonth, state.month, true);
      number(item.ritesAt, '治丧月份', item.start, item.start + 12, true);
      if (item.until !== item.ritesAt + (item.mode === 'full' ? 24 : 6)) fail('守丧期限不一致。');
      if (item.stage === 'complete' && item.until > state.month) fail('守丧尚未期满。');
      if (item.mode !== 'entrust' && p.retreat && item.stage !== 'complete') fail('返乡守丧与长期闭关矛盾。');
    }
    array(state.storyDeck, '故事抽选池', SMALL_STORIES.length);
    if (new Set(state.storyDeck).size !== state.storyDeck.length) fail('故事抽选池重复。');
    state.storyDeck.forEach(event => oneOf(event, SMALL_STORIES, '抽选故事'));
  }
  if (p.partnerId && people.get(p.partnerId).relation !== 'partner') fail('伴侣关系不一致。');
  object(state.world, '世界'); number(state.world.startYear, '起始纪年', 1, 5000, true); number(state.world.birthMonth, '出生月', 1, 12, true);
  oneOf(state.world.era, ['丰和', '待雨', '通商', '风雨'], '世局'); oneOf(state.world.weather, ['晴', '细雨', '长风', '云起'], '天气');
  if (!legacy) {
    oneOf(state.world.regime, ['澄川朝', '景澜朝', '延禾朝', '玄昭朝'], '架空王朝');
    array(state.world.eventDeck, '世局抽选池', WORLD_EVENTS.length);
    if (new Set(state.world.eventDeck).size !== state.world.eventDeck.length) fail('世局抽选池重复。');
    state.world.eventDeck.forEach(event => oneOf(event, ids(WORLD_EVENTS), '抽选世局'));
    array(state.world.activeEvents, '持续世事', 12);
    const active = new Set();
    for (const item of state.world.activeEvents) {
      object(item, '持续世事'); string(item.id, '世事 ID', 160);
      if (active.has(item.id) || item.id !== state.id + ':world:' + item.start) fail('世事 ID 重复或无效。'); active.add(item.id);
      oneOf(item.type, ids(WORLD_EVENTS), '持续世事类型');
      if (item.region !== null) oneOf(item.region, regionIds, '世事地域');
      number(item.start, '世事开始', 0, state.month, true); number(item.end, '世事结束', item.start + 1, item.start + 36, true);
      number(item.income, '世事收入影响', 0.35, 1.5); number(item.living, '世事家用影响', -30, 100, true); number(item.spirit, '世事修炼影响', 0.4, 1.5);
    }
  }
  array(state.world.regions, '地域状态', 5); array(state.world.factions, '势力状态', 3);
  if (state.world.regions.length !== 5 || new Set(state.world.regions.map(item => item.id)).size !== 5) fail('地域表不完整。');
  for (const region of state.world.regions) { oneOf(region.id, regionIds, '地域'); number(region.prosperity, '繁荣', 0, 100); number(region.danger, '风险', 0, 100); }
  if (state.world.factions.length !== 3 || new Set(state.world.factions.map(item => item.id)).size !== 3) fail('组织表不完整。');
  for (const faction of state.world.factions) {
    oneOf(faction.id, factionIds, '组织'); number(faction.influence, '组织积累', 0, 100); reference(faction.leaderId, '组织负责人', false); object(faction.relations, '组织关系');
    const leader = people.get(faction.leaderId);
    if (!leader.alive || leader.faction !== faction.id) fail('组织负责人已经离世或组织关联不一致。');
  }
  array(state.world.history, '世事记录', 5000);
  for (const item of state.world.history) { number(item.month, '世事月份', 0, state.month, true); string(item.text, '世事内容'); if (item.region) oneOf(item.region, regionIds, '世事地域'); }
  object(state.birth, '出生卡');
  for (const key of ['origin', 'region', 'story', 'root', 'rootDescription']) string(state.birth[key], '出生卡 ' + key);
  object(state.flags, '故事标记');
  for (const value of Object.values(state.flags)) if (typeof value !== 'boolean') number(value, '故事标记', 0, 25000, true);
  object(state.stats, '统计');
  for (const key of ['decisions', 'breakthroughs', 'failures', 'help', 'family', 'craft', 'journeys', 'students', 'earnings', 'retreats']) number(state.stats[key], '统计 ' + key, 0, 1e9, true);
  array(state.queue, '故事队列', 2000);
  const eventIds = new Set();
  const payload = (value, event) => {
    object(value, '故事关联'); if (value.actorId !== undefined) reference(value.actorId, '故事人物', false);
    if (value.region !== undefined && value.region !== null) oneOf(value.region, regionIds, '故事地域');
    if (value.variant !== undefined) number(value.variant, '故事场景', 0, (STORY_VARIANTS[event]?.length || 0) - 1, true);
    if (value.worldEventId !== undefined) { string(value.worldEventId, '世事关联 ID', 160); if (!value.worldEventId.startsWith(state.id + ':world:')) fail('世事关联不属于这段人生。'); }
  };
  for (const item of state.queue) {
    string(item.id, '故事 ID', 160); if (eventIds.has(item.id)) fail('故事 ID 重复。'); eventIds.add(item.id);
    serialId(item.id, 'event');
    oneOf(item.event, legacy ? Object.keys(LEGACY_OPTIONS) : events, '故事'); number(item.due, '故事日期', 0, 25000, true); number(item.order, '故事顺序', 1, 1e8, true); payload(item.payload, item.event);
  }
  if (state.pending !== null) {
    object(state.pending, '待选故事'); string(state.pending.id, '待选 ID', 160); oneOf(state.pending.event, legacy ? Object.keys(LEGACY_OPTIONS) : events, '待选故事'); payload(state.pending.payload, state.pending.event);
    serialId(state.pending.id, 'event');
    if (!(legacy ? legacyEligible : decisionEligible)(state, state.pending.event, state.pending.payload)) fail('待选故事的年龄、人物或境界条件已经不适用。');
    if (state.phase !== 'life' || state.pending.month !== state.month || eventIds.has(state.pending.id)) fail('待选故事日期或阶段矛盾。');
    try {
      if (legacy) { if (!legacyOptionsValid(state)) fail('旧待选故事的选项和资源条件不一致。'); }
      else { const fresh = decisionView(state, state.pending); if (JSON.stringify(fresh) !== JSON.stringify(state.pending)) fail('待选故事与当前规则不一致。'); }
    } catch (error) { if (error instanceof ValidationError) throw error; fail('待选故事无法读取。'); }
  }
  array(state.log, '经历', 20000); array(state.years, '年度记录', 2000); array(state.ledger, '账册', 20000); array(state.choices, '抉择记录', 10000);
  const logIds = new Set();
  for (const entry of state.log) {
    string(entry.id, '经历 ID', 160); if (logIds.has(entry.id)) fail('经历 ID 重复。'); logIds.add(entry.id);
    serialId(entry.id, 'log');
    number(entry.month, '经历月份', 0, state.month, true); string(entry.kind, '经历类型', 50); string(entry.text, '经历正文');
    if (entry.actorId !== undefined) reference(entry.actorId, '经历人物', false);
  }
  for (const year of state.years) { number(year.month, '年度月份', 12, state.month, true); number(year.age, '年度年龄', 1, 1000, true); number(year.realm, '年度境界', 0, 5, true); oneOf(year.location, regionIds, '年度地域'); for (const key of ['health', 'mind', 'craft']) number(year[key], key, 0, 100); for (const key of ['stones', 'money']) number(year[key], key, 0, 1e9, true); }
  for (const item of state.ledger) { number(item.month, '账册月份', 0, state.month, true); string(item.label, '账目'); for (const key of ['money', 'stones', 'herbs']) number(item[key], '账目 ' + key, -1e9, 1e9, true); }
  for (const item of state.choices) { number(item.month, '抉择月份', 0, state.month, true); oneOf(item.event, events, '抉择事件'); string(item.title, '抉择标题'); string(item.label, '抉择回应'); string(item.choice, '选项 ID', 60); reference(item.actorId, '抉择人物'); }
  if (state.stats.decisions !== state.choices.length) fail('抉择总数不一致。');
  if (state.years.length !== Math.floor(state.month / 12)) fail('年度记录与经历的年月不一致。');
  if (state.phase === 'ended') {
    object(state.ending, '终章'); oneOf(state.ending.type, Object.keys(ENDINGS), '终章类型');
    for (const key of ['title', 'subtitle', 'seal', 'cause', 'realm', 'location']) string(state.ending[key], '终章 ' + key);
    if (state.ending.month !== state.month || state.ending.age !== Math.floor(state.month / 12) || state.ending.realm !== REALMS[p.realm].name || state.pending !== null || state.queue.length || p.travel || p.retreat) fail('终章状态矛盾。');
  } else if (state.ending !== null) fail('未结束的人生存在终章。');
  if (state.phase === 'birth' && (state.month !== 0 || state.pending !== null || state.queue.length)) fail('出生卡阶段矛盾。');
  return state;
}
