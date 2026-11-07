/**
 * model.js —— 开发者面板的**数据模型**（纯函数，不碰 DOM）
 * ============================================================================
 *
 * ## 这个文件是干什么的
 * ------------------
 * 面板要给人看三样东西：人生进程轴、决策框、地图。
 * 这里只负责**把引擎的状态翻译成这三样东西的数据**，画的部分在
 * `axis.js` / `decision.js` / `map.js`。
 *
 * 分成两层是为了**能验**：
 *   · 纯函数可以在 Node 里直接 import ⇒ 门禁能拿真数据跑一遍，
 *     再拿**故意改坏的**数据跑一遍，确认断言真的会报红（反向验证）。
 *   · 画的部分只负责画，不掺任何判断 ⇒ 画错了能一眼看出来是数据错还是画错。
 *
 * ## ⚠ 这里**不许重算规则**
 * --------------------
 * 轴上的刻度来自 `content/cadence-table.js`（节奏表），
 * 寿元来自引擎写进状态的 `lifespanLimit`，
 * 选项的代价/把握/能不能点来自引擎的 `options()`。
 * 本文件只做搬运与排版，**不自己算任何规则数字** ——
 * 否则面板显示的会和游戏里发生的对不上，而现有门禁抓不到这种不一致。
 */

/* 规则层与内容层：面板读的就是游戏本身那一份。 */
import { CADENCE, STAGES, deathLine, progressNeeded } from '../../content/cadence-table.js';
import { GEOGRAPHY, PATHS, ROOTS } from '../../content/cultivation-world.js';
import { REALMS, ITEMS } from '../../content/adventure.js';
import { METHODS } from '../../content/story-network.js';
import { REGIONAL_METHODS, SECT_PROFILES, BODY_TYPES } from '../../content/rules12-world.js';
import { WORLD_ERAS, BIRTHPLACES, FAMILIES, LIFE_GOALS, TRAINING_GROUNDS } from '../../content/living-world.js';
import { mapView, routeOptions } from '../../packages/adventure/cultivation.js';
import { declarationOf } from '../../packages/adventure/gates.js';
/* ⚠ 底线数字**只住这一份**（与两个审计脚本共用 ⇒ 面板说的与门禁守的是同一个数）。 */
import { REALM_KINDS_MIN, LATE_AGE, LATE_KINDS_MIN, SPAN_TARGET } from '../../scripts/lib/completeness-limits.js';
import { currentNode, nodeText, options, review, ALL_ENDINGS, EVENTS } from '../../packages/adventure/engine.js';
import {
  CULTIVATION_EVENTS, RULES11_CULTIVATION_EVENTS, RULES10_CULTIVATION_EVENTS, RULES9_CULTIVATION_EVENTS,
  RULES8_CULTIVATION_EVENTS, RULES7_CULTIVATION_EVENTS, RULES6_CULTIVATION_EVENTS, RULES5_CULTIVATION_EVENTS,
  LEGACY_CULTIVATION_EVENTS,
} from '../../content/cultivation-stories.js';
import { rootLabel } from '../../packages/adventure/story-rules10.js';
import { networkRate } from '../../packages/adventure/story-network.js';
import { breakthroughStatus } from '../../packages/adventure/cadence.js';
import { REALM_ABILITIES } from '../../packages/adventure/realm.js';
import { sectProfile, rules12 } from '../../packages/adventure/story-rules12.js';

/* ── 横轴刻度 ────────────────────────────────────────────────────────────
 *
 * 为什么不是「一岁一格」的线性轴：
 *   实测 12 条命，年龄跨度 45–336 岁，寿元上限最高 574 岁，
 *   而绝大多数抉择发生在**头几十年**。线性轴上 0–50 岁只占全部宽度的 9%
 *   ⇒ 真正要看的部分被压成一条线。
 *
 * ⇒ 三段折线刻度（显示上的决定，不是规则）：
 *     0–50 岁    7 px/岁   ← 少年到立身，看得最细
 *     50–150 岁  3 px/岁   ← 中年
 *     150–600 岁 0.9 px/岁 ← 晚年，长尾压缩
 *
 * ⚠ 刻度是**固定的**（不随这条命自适应）⇒ 两条命可以直接叠着比。
 */
export const AXIS_SCALE = [
  { from: 0, to: 50, px: 9 },
  { from: 50, to: 150, px: 4 },
  { from: 150, to: 600, px: 1.2 },
];
export const AXIS_LEFT = 64;

/** 年龄 → 横轴像素。 */
export function axisX(age) {
  let x = AXIS_LEFT, rest = Math.max(0, age);
  for (const band of AXIS_SCALE) {
    const span = band.to - band.from;
    if (rest <= span) return x + rest * band.px;
    rest -= span;
    x += span * band.px;
  }
  return x + rest * AXIS_SCALE[AXIS_SCALE.length - 1].px;
}

/** 整条轴的宽度（含左侧标签栏与右侧留白）。 */
export const AXIS_WIDTH = AXIS_LEFT + AXIS_SCALE.reduce((sum, band) => sum + (band.to - band.from) * band.px, 0) + 26;

/** 某个年龄属于哪一段人生（规则来自节奏表，不自己分）。 */
export function stageAt(age) {
  return STAGES.find(stage => age >= stage.from && age <= stage.to) || STAGES[STAGES.length - 1];
}

/** 这个月是几岁。 */
export function ageAt(state, month) {
  return (state.birth?.startAge ?? 16) + Math.floor(month / 12);
}

/* ── 人生进程轴 ───────────────────────────────────────────────────────── */

/**
 * 把一条人生铺成轴上的数据。
 *
 * @param {object} state 引擎的人生状态
 * @param {object[]} steps 面板记下的每一步（提供标题等引擎没记的细节）
 */
export function buildAxis(state, steps = []) {
  const decisions = state.decisions || [];
  const journal = state.journal || [];
  return {
    startAge: state.birth?.startAge ?? 16,
    endAge: ageAt(state, state.month),
    endMonth: state.month,
    /** 这条命实际能活到几岁（引擎算的，规则十二写进状态的那个数）。 */
    lifespan: state.life?.cultivation?.lifespanLimit ?? 0,
    /** 人生阶段（来自节奏表）。 */
    stages: STAGES.map(stage => ({ id: stage.id, name: stage.name, from: stage.from, to: stage.to })),
    /** 每一境：典型年龄窗口 + 停在这一境会活到几岁。 */
    cadences: CADENCE.map(row => ({ realm: row.realm, name: row.name, from: row.from, to: row.to, death: deathLine(row.realm) })),
    /** 抉择点（以引擎记的 decisions 为准，不是以面板自己记的为准）。 */
    points: decisions.map((row, index) => ({
      index,
      month: row.month,
      age: ageAt(state, row.month),
      event: row.event,
      choice: row.choice,
      success: row.success,
      chance: row.chance,
      title: steps[index]?.title ?? row.event,
    })),
    /** 经历标记（日志里的每一条）。 */
    marks: journal.map(row => ({ month: row.month, age: ageAt(state, row.month), kind: row.kind, title: row.title })),
    /** 突破（哪年到的哪一境）。 */
    breakthroughs: journal.filter(row => row.kind === 'breakthrough').map(row => ({
      month: row.month, age: ageAt(state, row.month), realm: row.toRealm, title: row.title,
    })),
    realm: state.player?.realm ?? 0,
    ending: state.ending ? { id: state.ending.id, title: state.ending.title } : null,
    phase: state.phase,
  };
}

/**
 * 真门禁断言：轴上的抉择点必须与引擎记的**逐条**对得上。
 *
 * ⚠ 这条断言是「面板没有自己编数据」的证明 ——
 *   面板只负责画，点位是引擎写的；少一个、多一个、月份错位都要报红。
 *
 * @param {object} model buildAxis 的产物
 * @param {object[]} decisions 引擎记的 state.decisions
 */
export function assertAxisMatchesDecisions(model, decisions) {
  if (!Array.isArray(decisions)) throw new Error('抉择表不是数组');
  if (!model || !Array.isArray(model.points)) throw new Error('轴上没有抉择点');
  if (model.points.length !== decisions.length) {
    throw new Error('轴上的抉择点有 ' + model.points.length + ' 个，引擎记了 ' + decisions.length + ' 个');
  }
  for (let index = 0; index < decisions.length; index++) {
    const shown = model.points[index], truth = decisions[index];
    if (shown.month !== truth.month) throw new Error('第 ' + index + ' 个抉择的月份对不上：轴 ' + shown.month + ' ≠ 引擎 ' + truth.month);
    if (shown.event !== truth.event) throw new Error('第 ' + index + ' 个抉择的卡对不上：轴 ' + shown.event + ' ≠ 引擎 ' + truth.event);
    if (shown.choice !== truth.choice) throw new Error('第 ' + index + '个抉择的选择对不上：轴 ' + shown.choice + ' ≠ 引擎 ' + truth.choice);
  }
  return true;
}

/* ── 决策框 ───────────────────────────────────────────────────────────── */

/**
 * 把引擎给的选项压成面板要显示的形状（只留显示要的字段，别把整份状态搬过来）。
 *
 * ⚠ 导出给门禁用：门禁要拿「面板显示的样子」与「引擎给的原样」逐条比对，
 *   两边必须用**同一个**压形状的函数 ⇒ 否则比对的是两套口径，比了也白比。
 */
export function presentOption(option) {
  return {
    id: option.id,
    label: option.label,
    hint: option.hint,
    enabled: option.enabled,
    reasons: option.reasons ? [...option.reasons] : [],
    chance: option.chance ?? null,
    cost: option.cost && Object.keys(option.cost).length ? { ...option.cost } : null,
    months: option.months ?? 0,
  };
}

/**
 * 当前等着你点的那张卡。
 * @returns {object|null} 没有待决的卡时返回 null
 */
export function buildPending(state) {
  if (!state.pending) return null;
  const node = currentNode(state);
  if (!node) return null;
  return {
    event: node.id,
    title: node.title,
    text: nodeText(node, state),
    age: ageAt(state, state.month),
    month: state.month,
    offered: options(state).map(presentOption),
  };
}

/**
 * 真门禁断言：决策框里列出的选项必须与引擎当时给的**完全一致**。
 *
 * ⚠ 这一条守的是「面板没有自己算代价/把握/能不能点」——
 *   面板若自己算，规则一改它就会悄悄过期，且没人发现。
 */
export function assertDecisionMatchesOptions(view, offered) {
  if (!view || !Array.isArray(view.offered)) throw new Error('决策框没有选项列表');
  if (!Array.isArray(offered)) throw new Error('引擎给的选项不是数组');
  if (view.offered.length !== offered.length) {
    throw new Error('决策框列了 ' + view.offered.length + ' 个选项，引擎给了 ' + offered.length + ' 个');
  }
  for (let index = 0; index < offered.length; index++) {
    const shown = view.offered[index], truth = offered[index];
    if (shown.id !== truth.id) throw new Error('第 ' + index + ' 个选项对不上：框 ' + shown.id + ' ≠ 引擎 ' + truth.id);
    if (shown.label !== truth.label) throw new Error('选项 ' + truth.id + ' 的文字对不上');
    if (shown.enabled !== truth.enabled) throw new Error('选项 ' + truth.id + ' 的「能不能点」对不上');
    if (shown.chance !== (truth.chance ?? null)) throw new Error('选项 ' + truth.id + ' 的把握值对不上');
    if (JSON.stringify(shown.reasons) !== JSON.stringify(truth.reasons ? [...truth.reasons] : [])) {
      throw new Error('选项 ' + truth.id + ' 的「为什么点不了」对不上');
    }
  }
  return true;
}

/**
 * 把这一步的结果补上。
 *
 * ⚠ 长线行动（闭关几年那种）选的时候还不知道结果，结果是后来才写进日志的
 *   ⇒ 这里按「同一张卡、同一个选择、且不早于选它的那个月」去日志里找那条结算。
 */
export function attachResults(state, steps) {
  const journal = state.journal || [];
  const buckets = new Map();
  for (const row of journal) {
    if (row.kind !== 'choice' || !row.event) continue;
    const key = row.event + '' + row.choice;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }
  for (const step of steps) {
    const candidates = buckets.get(step.event + '' + step.picked) || [];
    const found = candidates.find(row => row.month >= step.month);
    if (found) {
      step.result = { success: found.success ?? null, body: found.body, changes: found.changes || [], month: found.month, deferred: found.month > step.month };
    }
  }
  return steps;
}

/* ── 属性曲线 ───────────────────────────────────────────────────────── */

/**
 * 记录一个时间点上的属性。
 *
 * ⚠ 这是**采样**，不是另算一套规则 —— 每个数都是从状态里**读**出来的。
 *   引擎不保留属性的历史，所以面板在推进过程中按月拍一张快照。
 */
export function sampleCurve(state) {
  const cultivation = state.life?.cultivation;
  return {
    month: state.month,
    age: ageAt(state, state.month),
    insight: state.player.insight ?? 0,
    courage: state.player.courage ?? 0,
    empathy: state.player.empathy ?? 0,
    health: state.player.health ?? 0,
    mind: state.player.mind ?? 0,
    progress: cultivation?.progress ?? 0,
    realm: state.player.realm ?? 0,
    stones: Math.floor(state.player.stones ?? 0),
  };
}

/** 五个身体/心性的维度（游戏里的「五维」，雷达图用的也是这五个）。 */
export const ATTRIBUTES = [
  { key: 'insight', label: '悟性' },
  { key: 'courage', label: '胆识' },
  { key: 'empathy', label: '仁心' },
  { key: 'health', label: '体力' },
  { key: 'mind', label: '心境' },
];

/**
 * 把采样点变成折线图的数据模型。
 *
 * ⚠ 横轴与人生进程轴**同一把尺子**（`axisX`）⇒ 两张图上下对齐，
 *   一眼能看出「哪年突破、那个月体力掉了」。
 */
export function buildCurve(curve) {
  const points = curve.map(sample => ({ ...sample }));
  const line = key => points.map(sample => ({ x: axisX(sample.age), y: sample[key] }));
  const attributes = ATTRIBUTES.map(attribute => ({
    key: attribute.key,
    label: attribute.label,
    points: line(attribute.key),
    max: Math.max(100, ...points.map(sample => sample[attribute.key])),
    min: Math.min(0, ...points.map(sample => sample[attribute.key])),
  }));
  const progress = {
    key: 'progress',
    label: '修行进度',
    points: line('progress'),
    max: Math.max(1, ...points.map(sample => sample.progress)),
    min: 0,
    thresholds: [1, 2, 3, 4].map(realm => ({ realm, value: progressNeeded(realm) })).filter(row => row.value > 0),
  };
  const stones = {
    key: 'stones',
    label: '灵石',
    points: line('stones'),
    max: Math.max(1, ...points.map(sample => sample.stones)),
    min: Math.min(0, ...points.map(sample => sample.stones)),
  };
  return { attributes, progress, stones, raw: points };
}

/**
 * 真门禁断言：属性曲线的**末端采样**必须与引擎当前状态一致。
 *
 * ⚠ 曲线是面板自己按月拍的（引擎不保留属性的历史）⇒ 这里守的是
 *   「拍下来的数就是引擎里的数」，不是「拍得对不对」。
 */
export function assertCurveMatchesState(raw, state) {
  if (!Array.isArray(raw) || !raw.length) throw new Error('曲线没有采样点');
  const player = state?.player;
  if (!player) throw new Error('没有人生状态可比');
  const last = raw[raw.length - 1];
  for (const attribute of ATTRIBUTES) {
    if (last[attribute.key] !== (player[attribute.key] ?? 0)) {
      throw new Error('曲线末端的' + attribute.label + '与引擎对不上：曲线 ' + last[attribute.key] + ' ≠ 引擎 ' + (player[attribute.key] ?? 0));
    }
  }
  if (last.stones !== Math.floor(player.stones ?? 0)) throw new Error('曲线末端的灵石与引擎对不上');
  if (last.realm !== (player.realm ?? 0)) throw new Error('曲线末端的境界与引擎对不上');
  if (last.month !== state.month) throw new Error('曲线末端的月份与引擎对不上');
  return true;
}

/**
 * 真门禁断言：当前状态快照的属性与人物必须与引擎一致。
 */
export function assertSnapshotMatchesState(snapshot, state) {
  const player = state?.player;
  if (!player) throw new Error('没有人生状态可比');
  for (const attribute of ATTRIBUTES) {
    const shown = snapshot.attributes.find(row => row.key === attribute.key);
    if (!shown) throw new Error('快照少了' + attribute.label);
    if (shown.value !== (player[attribute.key] ?? 0)) throw new Error('快照的' + attribute.label + '与引擎对不上');
  }
  if (snapshot.stones !== Math.floor(player.stones ?? 0)) throw new Error('快照的灵石与引擎对不上');
  if (snapshot.realm !== (player.realm ?? 0)) throw new Error('快照的境界与引擎对不上');
  /* ⚠ 行囊必须与引擎的 state.inventory 逐件一致 ——
     早先读的是 player.inventory（那个字段根本不存在）⇒ 行囊永远空着，
     而当时的断言**没查行囊** ⇒ 静默错了一个版本。现在查。 */
  const truthItems = (state.inventory || []).map(id => ITEMS[id]?.name ?? id);
  if (snapshot.inventory.length !== truthItems.length) throw new Error('快照的行囊件数与引擎对不上');
  for (let index = 0; index < truthItems.length; index++) {
    if (snapshot.inventory[index] !== truthItems[index]) throw new Error('快照的行囊与引擎对不上');
  }
  const people = Object.values(state.people || {});
  if (snapshot.people.length !== people.length) throw new Error('快照的人物数与引擎对不上');
  for (const person of people) {
    const shown = snapshot.people.find(row => row.id === person.id);
    if (!shown) throw new Error('快照少了人物 ' + person.name);
    if (shown.name !== person.name) throw new Error('快照里 ' + person.id + ' 的名字对不上');
    if (shown.status !== person.status) throw new Error('快照里 ' + person.name + ' 的状态对不上');
    if (shown.bond !== (person.bond ?? 0)) throw new Error('快照里 ' + person.name + ' 的羁绊对不上');
  }
  return true;
}

/* ── 当前状态快照 ───────────────────────────────────────────────────── */

/**
 * 「此刻这个人是什么样」—— 身份、属性、修为、资源、人物。
 *
 * ⚠ 数字全部**读**状态，不自己算；人物名单也用状态里那份（名字已被规则层替换过）。
 */
export function buildSnapshot(state) {
  const player = state.player;
  const cultivation = state.life?.cultivation;
  const birth = state.birth || {};
  const realm = player.realm ?? 0;
  const statuses = { alive: '在世', captured: '被俘', dead: '已故', missing: '失踪', detained: '被扣' };
  /* 人物名单：列出**全部**角色（标出谁还没遇到过）——
     引擎的 `review()` 只给「见过的人」，对开发者不够（看不到「这个角色这条命里从没出现」）。
     见过的人从 `review()` 取年龄（那个公式属于引擎，面板不重写）。 */
  const reviewed = new Map((review(state)?.people || []).map(person => [person.id, person]));
  const people = Object.values(state.people || {}).map(person => ({
    id: person.id,
    name: person.name,
    role: person.role ?? '',
    known: Boolean(person.known),
    alive: Boolean(person.alive),
    status: person.status,
    statusLabel: statuses[person.status] ?? person.status,
    bond: person.bond ?? 0,
    location: person.location ?? '—',
    age: reviewed.get(person.id)?.age ?? null,
  }));
  return {
    name: player.name,
    age: ageAt(state, state.month),
    month: state.month,
    sex: player.sex,
    realm,
    realmName: REALMS[realm]?.name ?? '—',
    realmWindow: CADENCE.find(row => row.realm === realm) || null,
    root: cultivation?.rootKnown ? rootLabel(state) : '尚未测定',
    origin: birth.address ?? '—',
    continent: GEOGRAPHY.find(place => place.id === birth.continent)?.name ?? '—',
    family: birth.family ?? '—',
    path: cultivation?.path ?? '—',
    rank: cultivation?.rank ?? '—',
    attributes: ATTRIBUTES.map(attribute => ({ ...attribute, value: player[attribute.key] ?? 0 })),
    progress: cultivation?.progress ?? 0,
    progressNeeded: progressNeeded(realm + 1),
    stones: Math.floor(player.stones ?? 0),
    debt: state.flags?.debt ?? 0,
    /* ⚠ 道具在 **state.inventory**（顶层），不在 player 上
       —— 引擎写的是 `state.inventory`（`engine.js` 的 createRun），
       player 里根本没有 inventory 字段 ⇒ 早先读 player.inventory
       ⇒ 行囊永远显示「行囊空着」。 */
    inventory: (state.inventory || []).map(id => ITEMS[id]?.name ?? id),
    lifespan: cultivation?.lifespanLimit ?? 0,
    survivors: review(state)?.survivors ?? 0,
    ending: state.ending ? { id: state.ending.id, title: state.ending.title, text: state.ending.text } : null,
    people,
  };
}

/* ── 地图 ─────────────────────────────────────────────────────────────── */

/**
 * 世界结构 + 这条命实际走过哪儿。
 *
 * ⚠ 与游戏里那张画不一样：游戏那张**故意不画没去过的大陆**（玩家视角），
 *   这里是开发者视角 ⇒ 四块大陆全画，标出「当前 / 走过 / 可去 / 没到过」，
 *   外加哪条路被封了、哪些路线真的走过。
 */
export function buildMap(state) {
  const view = mapView(state);
  const cultivation = state.life?.cultivation;
  const closed = cultivation?.closed || [];
  const routes = cultivation?.routes || [];
  const walked = new Set();
  for (const route of routes) {
    for (let index = 1; index < route.length; index++) walked.add([route[index - 1], route[index]].sort().join('-'));
  }
  const nodes = GEOGRAPHY.map(place => ({
    id: place.id,
    name: place.name,
    x: place.pin[0],
    y: place.pin[1],
    /* ⚠ 这三段是**内容表里的原文**（GEOGRAPHY[i]）——
       面板早先一个都没用 ⇒ 「完整的地图细节」里最要紧的文字全在桌上没人看。 */
    places: [...(place.places || [])],
    description: place.description ?? '',
    specialty: place.specialty ?? '',
  }));
  const known = new Set(nodes.map(node => node.id));
  const edges = [];
  for (const place of GEOGRAPHY) {
    for (const other of place.connections || []) {
      if (!known.has(other)) continue;
      const key = [place.id, other].sort().join('-');
      if (edges.some(edge => edge.key === key)) continue;
      edges.push({ key, a: place.id, b: other, closed: closed.includes(key), walked: walked.has(key) });
    }
  }
  const statusOf = id => {
    if (view.current === id) return 'current';
    if ((view.visited || []).includes(id)) return 'visited';
    if ((view.unlocked || []).includes(id)) return 'known';
    return 'unknown';
  };
  return {
    current: view.current,
    birth: state.birth?.continent ?? null,
    nodes: nodes.map(node => ({ ...node, status: statusOf(node.id) })),
    edges,
    closed: [...closed],
    walked: [...walked],
    /* 「现在去哪儿」：路线、路费、耗时、还有为什么去不了 ——
       **全部由规则层给**（`routeOptions`），面板一个数都不自己算。 */
    routes: routeOptions(state).map(option => ({
      id: option.id,
      name: option.name,
      path: option.route ? [...option.route] : null,
      fee: option.fee ?? 0,
      months: option.months ?? 0,
      enabled: Boolean(option.enabled),
      reason: option.reason || '',
    })),
  };
}

/* ── 道具 ─────────────────────────────────────────────────────────────── */

/**
 * 真门禁断言：地图页显示的必须与**内容表 + 引擎状态**逐条一致。
 *
 * ⚠ 这条守的是「面板没有自己编地图」——
 *   大陆数、通路数、封路的边、走过的边、地名 / 描述 / 特产，
 *   全部必须等于内容表与状态里的原值。
 */
export function assertMapMatchesGeography(model, state) {
  if (!model || !Array.isArray(model.nodes)) throw new Error('地图页没有大陆列表');
  if (model.nodes.length !== GEOGRAPHY.length) throw new Error('地图页的大陆数与内容表对不上');
  for (const place of GEOGRAPHY) {
    const node = model.nodes.find(row => row.id === place.id);
    if (!node) throw new Error('地图页少了 ' + place.name);
    if (node.name !== place.name) throw new Error('地图页里 ' + place.id + ' 的名字对不上');
    if (node.places.length !== (place.places || []).length) throw new Error('地图页里 ' + place.id + ' 的地名数对不上');
    for (let index = 0; index < (place.places || []).length; index++) {
      if (node.places[index] !== place.places[index]) throw new Error('地图页里 ' + place.id + ' 的地名对不上');
    }
    if (node.description !== (place.description ?? '')) throw new Error('地图页里 ' + place.id + ' 的描述对不上');
    if (node.specialty !== (place.specialty ?? '')) throw new Error('地图页里 ' + place.id + ' 的特产对不上');
  }
  /* 通路：内容表里去重后的连接数。 */
  const truthEdges = new Set();
  for (const place of GEOGRAPHY) {
    for (const other of place.connections || []) truthEdges.add([place.id, other].sort().join('-'));
  }
  if (model.edges.length !== truthEdges.size) throw new Error('地图页的通路数与内容表对不上');
  for (const key of truthEdges) {
    if (!model.edges.some(edge => edge.key === key)) throw new Error('地图页少了一条通路 ' + key);
  }
  /* 封路：状态里的封路集合必须逐条标出来。 */
  const cultivation = state.life?.cultivation || {};
  const closed = cultivation.closed || [];
  for (const key of closed) {
    const edge = model.edges.find(row => row.key === key);
    if (!edge) throw new Error('地图页的封路边 ' + key + ' 不在图上');
    if (!edge.closed) throw new Error('地图页没把 ' + key + ' 标成封路');
  }
  /* 走过：由 routes 推导的边必须逐条标出来。 */
  const truthWalked = new Set();
  for (const route of cultivation.routes || []) {
    for (let index = 1; index < route.length; index++) truthWalked.add([route[index - 1], route[index]].sort().join('-'));
  }
  for (const key of truthWalked) {
    const edge = model.edges.find(row => row.key === key);
    if (!edge) throw new Error('地图页走过的边 ' + key + ' 不在图上');
    if (!edge.walked) throw new Error('地图页没把 ' + key + ' 标成走过');
  }
  /* 「现在去哪儿」的路费与耗时必须等于规则层给的。 */
  const truthRoutes = routeOptions(state);
  if (model.routes.length !== truthRoutes.length) throw new Error('地图页的 destinations 数与规则层对不上');
  for (const truth of truthRoutes) {
    const shown = model.routes.find(row => row.id === truth.id);
    if (!shown) throw new Error('地图页少了目的地 ' + truth.id);
    if (shown.fee !== (truth.fee ?? 0)) throw new Error('地图页里 ' + truth.id + ' 的路费与规则层对不上');
    if (shown.months !== (truth.months ?? 0)) throw new Error('地图页里 ' + truth.id + ' 的耗时与规则层对不上');
    if (shown.enabled !== Boolean(truth.enabled)) throw new Error('地图页里 ' + truth.id + ' 的「能不能去」与规则层对不上');
    if (shown.reason !== (truth.reason || '')) throw new Error('地图页里 ' + truth.id + ' 的「为什么去不了」与规则层对不上');
  }
  return true;
}
/**
 * 道具全表 + 这条命拿到了哪几件、哪个月拿的。
 *
 * ⚠ 引擎**没有**结构化的「哪件道具、哪个月」字段 ——
 *   它只在日志的 `changes` 里留「得到凝丹真解」这类文字。
 *   ⇒ 「哪个月拿的」由面板**自己采样**（按月 diff `state.inventory`）还原。
 *   这是采样（把状态读下来），不是算规则。
 *
 * @param {object} state 引擎的人生状态
 * @param {object[]} timeline 面板按月拍下的行囊快照
 */
export function buildItems(state, timeline = []) {
  const held = new Set(state.inventory || []);
  /* 从采样里还原「什么时候进的行囊 / 什么时候用掉的」。
     ⚠ 道具**会进也会出**（被消耗掉）⇒ 只记「拿到」是不够的：
       实测 beast_core 816 月到手、939 月被用掉 ⇒ 最终行囊里没有它，
       但这条命确实碰过它 ⇒ 面板该显示整条进出时间线。 */
  const events = new Map();
  const pushEvent = (id, event) => {
    if (!events.has(id)) events.set(id, []);
    events.get(id).push(event);
  };
  for (let index = 1; index < timeline.length; index++) {
    const before = timeline[index - 1].items || [];
    const after = timeline[index].items || [];
    for (const id of after) {
      if (before.includes(id)) continue;
      pushEvent(id, { kind: 'got', month: timeline[index].month, age: timeline[index].age });
    }
    for (const id of before) {
      if (after.includes(id)) continue;
      pushEvent(id, { kind: 'lost', month: timeline[index].month, age: timeline[index].age });
    }
  }
  /* ⚠ 开局就有的道具（出身自带）：第一张快照里就有 ⇒ 没有「进来的那一刻」。
     ⇒ 它的「第一次拥有」就是**第一张快照**（那是真实的月份，不是编的）。 */
  const atStart = new Set(timeline[0]?.items || []);
  const firstShot = timeline[0] || null;
  const rows = Object.entries(ITEMS).map(([id, item]) => {
    const list = events.get(id) || [];
    const got = list.find(event => event.kind === 'got') || null;
    const lost = list.filter(event => event.kind === 'lost').pop() || null;
    const startsWithIt = (held.has(id) || list.length > 0) && atStart.has(id);
    return {
      id,
      name: item.name,
      detail: item.detail ?? '',
      /** 现在还在行囊里吗。 */
      held: held.has(id),
      /** 这条命里碰到过吗（拿到过，或开局就有）。 */
      seen: held.has(id) || list.length > 0,
      /** 第一次拥有的那一刻（开局就有 ⇒ 第一张快照那个月）。 */
      gained: got || (startsWithIt && firstShot ? { kind: 'got', month: firstShot.month, age: firstShot.age, atStart: true } : null),
      /** 最后一次被用掉的那一刻。 */
      lost,
      /** 全部进出记录（**顺序即时间顺序**，渲染按它走 ⇒ 不会倒序）。 */
      events: list,
      atStart: startsWithIt && !got,
    };
  });
  return {
    total: rows.length,
    heldCount: held.size,
    rows,
    held: rows.filter(row => row.held),
    /** 这条命里碰到过的（拿到过，后来用掉了也算）。 */
    acquired: rows.filter(row => row.seen),
    missed: rows.filter(row => !row.seen),
  };
}

/**
 * 真门禁断言：道具页显示的「拿到」必须与引擎的行囊**逐件一致**。
 */
export function assertItemsMatchInventory(items, state) {
  if (!items || !Array.isArray(items.held)) throw new Error('道具页没有持有列表');
  const truth = state.inventory || [];
  const shown = items.held.map(row => row.id);
  if (shown.length !== truth.length) throw new Error('道具页列了 ' + shown.length + ' 件，引擎行囊里有 ' + truth.length + ' 件');
  for (const id of truth) {
    if (!shown.includes(id)) throw new Error('道具页漏了引擎行囊里的 ' + id);
  }
  for (const row of items.held) {
    const item = ITEMS[row.id];
    if (!item) throw new Error('道具页列了一个道具表里没有的道具 ' + row.id);
    if (row.name !== item.name) throw new Error('道具页里 ' + row.id + ' 的名字对不上');
    if (row.detail !== (item.detail ?? '')) throw new Error('道具页里 ' + row.id + ' 的说明对不上');
  }
  if (items.total !== Object.keys(ITEMS).length) throw new Error('道具页的全表件数对不上');
  return true;
}

/**
 * 真门禁断言：道具的获得时刻必须是**采样还原**出来的，且月份单调不减。
 */
export function assertItemsTimeline(items, timeline) {
  if (!Array.isArray(items.held)) throw new Error('道具页没有持有列表');
  /* ⚠ 持有列表按**道具表顺序**排（不按拿到的时间）⇒ 不能查它的顺序；
     要查的是「采样时间线本身按月递增」与「每件的进出记录 == 采样推导出的那些」。 */
  for (let index = 1; index < timeline.length; index++) {
    if (timeline[index].month < timeline[index - 1].month) throw new Error('行囊采样没有按时间排');
  }
  /* 由采样独立推一遍「谁在什么时候进来 / 出去」。 */
  const derived = new Map();
  const firstShot = timeline[0] || null;
  for (let index = 1; index < timeline.length; index++) {
    const before = timeline[index - 1].items || [];
    const after = timeline[index].items || [];
    for (const id of after) {
      if (before.includes(id)) continue;
      if (!derived.has(id)) derived.set(id, []);
      derived.get(id).push({ kind: 'got', month: timeline[index].month, age: timeline[index].age });
    }
    for (const id of before) {
      if (after.includes(id)) continue;
      if (!derived.has(id)) derived.set(id, []);
      derived.get(id).push({ kind: 'lost', month: timeline[index].month, age: timeline[index].age });
    }
  }
  /* 每一件在采样里出现过的，道具页都得有，且进出记录逐条对得上。 */
  for (const [id, list] of derived) {
    const row = items.rows.find(item => item.id === id);
    if (!row) throw new Error('采样里出现的道具 ' + id + ' 没列在道具页上');
    if (row.events.length !== list.length) throw new Error('道具 ' + id + ' 的进出记录条数与采样对不上');
    for (let index = 0; index < list.length; index++) {
      const shown = row.events[index], truth = list[index];
      if (shown.kind !== truth.kind) throw new Error('道具 ' + id + ' 的进出类型与采样对不上');
      if (shown.month !== truth.month) throw new Error('道具 ' + id + ' 的进出时刻与采样对不上');
    }
  }
  /* 反过来：页面写了记录，采样里也得有。 */
  for (const row of items.rows) {
    if (row.events.length && !derived.has(row.id)) throw new Error('道具 ' + row.id + ' 写了进出记录，但采样里没有');
    if (row.seen !== (row.held || row.events.length > 0)) throw new Error('道具 ' + row.id + ' 的「碰到过」判定自相矛盾');
    /* ⚠ 「开局就有」的那一件 ⇒ 它的第一次拥有就是第一张快照那个月（不是编的）。 */
    if (row.atStart) {
      if (!firstShot) throw new Error('道具 ' + row.id + ' 标成开局就有，但根本没有采样');
      if (row.gained.month !== firstShot.month) throw new Error('道具 ' + row.id + ' 的开局时刻与采样对不上');
    }
  }
  return true;
}

/* ── 世界观 ───────────────────────────────────────────────────────────── */

/**
 * 宗门、功法、境界、灵根、体质、时代出身、修炼场、结局 —— 世界观这一页的全貌。
 *
 * ⚠ 凡是规则层有现成接口的，一律调它：
 *   功法倍率 → `networkRate(state)`；冲关还差什么 → `breakthroughStatus(state)`；
 *   宗门风格 → `sectProfile(state)`；能否去某地 → `routeOptions(state)`。
 *   面板**不自己推导**这些数。
 */
export function buildWorld(state) {
  const cultivation = state.life?.cultivation || {};
  const network = cultivation.network || {};
  const progression = cultivation.progression || {};
  const sect = progression.sect || null;
  const method = network.method || null;
  const realm = state.player?.realm ?? 0;
  const body = rules12(state)?.body || null;
  const profile = sect ? sectProfile(state) : null;
  const status = breakthroughStatus(state);
  /* 19 部功法全表：8 部基础 + 11 部地域。 */
  const allMethods = { ...REGIONAL_METHODS, ...METHODS };
  return {
    sect: sect ? {
      name: sect.name,
      size: sect.size,
      highest: sect.highest,
      npcHighest: sect.npcHighest,
      phase: sect.phase,
      role: sect.role,
      treasury: sect.treasury ?? 0,
      care: sect.care ?? 0,
      development: sect.development ?? 0,
      councils: sect.councils ?? 0,
      yearsCount: progression.yearsCount ?? 0,
      style: profile?.style ?? '',
      source: profile?.source ?? '',
    } : null,
    method: method ? {
      id: method.id,
      name: allMethods[method.id]?.name ?? method.id,
      detail: allMethods[method.id]?.detail ?? '',
      root: [...(allMethods[method.id]?.root || [])],
      months: method.months ?? 0,
      acquired: method.acquired ?? 0,
      source: method.source ?? '',
      /* ⚠ 实际倍率由规则层算（灵根是否适配）—— 面板只显示，不自己乘。 */
      rate: networkRate(state),
    } : null,
    history: (network.methods || []).map(entry => ({
      id: entry.id,
      name: allMethods[entry.id]?.name ?? entry.id,
      acquired: entry.acquired ?? 0,
      months: entry.months ?? 0,
    })),
    methodCount: Object.keys(allMethods).length,
    allMethods: Object.entries(allMethods).map(([id, entry]) => ({
      id,
      name: entry.name,
      detail: entry.detail ?? '',
      root: [...(entry.root || [])],
      rate: entry.rate ?? 1,
      learned: (network.methods || []).some(item => item.id === id) || (method && method.id === id),
    })),
    realm: {
      index: realm,
      name: REALMS[realm]?.name ?? '—',
      ability: REALM_ABILITIES[realm] ?? '',
      window: CADENCE.find(row => row.realm === realm) || null,
      lifespan: cultivation.lifespanLimit ?? 0,
      progress: cultivation.progress ?? 0,
      needed: progressNeeded(realm + 1),
      /* 「冲关还差什么」整句由规则层拼好（`breakthroughStatus`）。 */
      advice: status?.advice ?? '',
    },
    root: cultivation.rootKnown ? {
      name: state.player?.root ?? '—',
      grade: ROOTS[state.player?.root]?.grade ?? 0,
      rate: ROOTS[state.player?.root]?.rate ?? 1,
      description: ROOTS[state.player?.root]?.description ?? '',
    } : null,
    body: body ? {
      type: BODY_TYPES[body.type]?.name ?? body.type,
      constitution: body.constitution ?? 0,
      damage: body.damage ?? 0,
      loss: body.loss ?? 0,
    } : null,
    path: cultivation.path ? {
      id: cultivation.path,
      name: PATHS[cultivation.path]?.name ?? cultivation.path,
      description: PATHS[cultivation.path]?.description ?? '',
      home: PATHS[cultivation.path]?.home ?? '',
      teacher: PATHS[cultivation.path]?.teacher ?? '',
      history: (cultivation.history || []).map(row => ({ path: row.path, month: row.month })),
    } : null,
    origin: {
      era: state.birth?.era ? {
        id: state.birth.era,
        name: WORLD_ERAS[state.birth.era]?.name ?? state.birth.era,
        description: WORLD_ERAS[state.birth.era]?.description ?? '',
      } : null,
      continent: BIRTHPLACES[state.birth?.continent]?.name ?? '—',
      address: state.birth?.address ?? '—',
      sect: BIRTHPLACES[state.birth?.continent]?.sect ?? '',
      family: FAMILIES[state.birth?.family]?.name ?? '—',
      familyText: FAMILIES[state.birth?.family]?.text ?? '',
      goal: LIFE_GOALS[state.birth?.goal]?.name ?? '—',
      goalText: LIFE_GOALS[state.birth?.goal]?.text ?? '',
    },
    grounds: TRAINING_GROUNDS.map(ground => ({
      id: ground.id,
      name: ground.name,
      realm: ground.realm,
      description: ground.description,
      invitation: ground.invitation,
    })),
    endings: Object.entries(ALL_ENDINGS).map(([id, ending]) => ({
      id,
      title: ending.title,
      reached: state.ending?.id === id,
    })),
    reachedEnding: state.ending ? { id: state.ending.id, title: state.ending.title, text: state.ending.text } : null,
  };
}

/**
 * 真门禁断言：世界观页显示的必须与引擎状态**逐条一致**。
 */
export function assertWorldMatchesState(world, state) {
  const cultivation = state.life?.cultivation || {};
  const progression = cultivation.progression || {};
  const network = cultivation.network || {};
  const sect = progression.sect || null;
  if (Boolean(world.sect) !== Boolean(sect)) throw new Error('世界观页的宗门与引擎对不上');
  if (sect) {
    if (world.sect.name !== sect.name) throw new Error('世界观页的宗门名与引擎对不上');
    if (world.sect.phase !== sect.phase) throw new Error('世界观页的宗门阶段与引擎对不上');
    if (world.sect.treasury !== (sect.treasury ?? 0)) throw new Error('世界观页的公库数与引擎对不上');
    if (world.sect.role !== (sect.role ?? null)) throw new Error('世界观页的差事与引擎对不上');
    if (world.sect.councils !== (sect.councils ?? 0)) throw new Error('世界观页的议事数与引擎对不上');
  }
  const method = network.method || null;
  if (Boolean(world.method) !== Boolean(method)) throw new Error('世界观页的功法与引擎对不上');
  if (method) {
    if (world.method.id !== method.id) throw new Error('世界观页的主修功法与引擎对不上');
    if (world.method.months !== (method.months ?? 0)) throw new Error('世界观页的功法月数与引擎对不上');
    /* ⚠ 倍率必须是规则层算出来的那个 —— 面板若自己乘一遍，这里就会红。 */
    if (world.method.rate !== networkRate(state)) throw new Error('世界观页的功法倍率与规则层对不上');
  }
  if (world.realm.index !== (state.player?.realm ?? 0)) throw new Error('世界观页的境界与引擎对不上');
  if (world.realm.ability !== (REALM_ABILITIES[state.player?.realm ?? 0] ?? '')) throw new Error('世界观页的境界能力与引擎对不上');
  return true;
}

/* ── 人物 ─────────────────────────────────────────────────────────────── */

/**
 * 这条命里出现过的所有角儿 —— 不只主角。
 *
 * ⚠ 早先只列 `state.people`（六位主角）⇒ 家人、后代、旧相识、宗门高管
 *   全都看不见 ⇒ 「这个角色这条命里从没出现」根本看不出来。
 */
export function buildPeople(state) {
  const cultivation = state.life?.cultivation || {};
  const family = state.life?.family || {};
  const network = cultivation.network || {};
  const reviewed = new Map((review(state)?.people || []).map(person => [person.id, person]));
  const statusLabels = { alive: '在世', captured: '被俘', dead: '已故', missing: '失踪', detained: '被扣' };
  const cast = Object.values(state.people || {}).map(person => ({
    group: 'cast',
    id: person.id,
    name: person.name,
    role: person.role ?? '',
    known: Boolean(person.known),
    status: person.status,
    statusLabel: statusLabels[person.status] ?? person.status,
    bond: person.bond ?? 0,
    location: person.location ?? '—',
    age: reviewed.get(person.id)?.age ?? null,
  }));
  const relatives = (family.members || []).map(person => ({
    group: 'family',
    id: person.id,
    name: person.name,
    role: person.role ?? '家人',
    known: true,
    status: person.status,
    statusLabel: statusLabels[person.status] ?? person.status,
    bond: family.bond ?? 0,
    location: person.location ?? '—',
    age: null,
  }));
  const descendants = (cultivation.descendants || []).map(person => ({
    group: 'descendant',
    id: person.id,
    name: person.name,
    role: person.relation ?? '后辈',
    known: Boolean(person.known),
    status: person.status,
    statusLabel: statusLabels[person.status] ?? person.status,
    bond: 0,
    location: person.location ?? '—',
    age: null,
  }));
  const officers = (cultivation.officers || []).map(person => ({
    group: 'officer',
    id: person.id,
    name: person.name,
    role: person.role ?? '宗门职务',
    known: true,
    status: person.status,
    statusLabel: statusLabels[person.status] ?? person.status,
    bond: 0,
    location: person.location ?? '—',
    age: null,
  }));
  const contacts = (network.contacts || []).map((person, index) => ({
    group: 'contact',
    id: 'contact-' + index,
    name: person.name,
    role: person.role ?? '旧相识',
    known: true,
    status: person.status ?? '—',
    statusLabel: person.status ?? '—',
    bond: 0,
    location: '—',
    age: null,
    detail: person.description ?? '',
  }));
  return {
    cast,
    relatives,
    descendants,
    officers,
    contacts,
    all: [...cast, ...relatives, ...descendants, ...officers, ...contacts],
    /* 已故亲人（引擎只记 id）。 */
    knownDeaths: [...(cultivation.knownDeaths || [])],
    family: {
      kind: family.kind ?? '',
      name: FAMILIES[family.kind]?.name ?? family.kind ?? '',
      bond: family.bond ?? 0,
      reserve: family.reserve ?? 0,
      money: family.money ?? 0,
    },
    properties: Object.values(state.life?.properties || {}).map(property => ({
      id: property.id,
      name: property.name,
      status: property.status,
      value: property.value,
      location: property.location,
    })),
  };
}

/**
 * 真门禁断言：人物页显示的必须与引擎状态**逐条一致**。
 */
export function assertPeopleMatchState(people, state) {
  const cast = Object.values(state.people || {});
  const shown = people.cast;
  if (shown.length !== cast.length) throw new Error('人物页的主角数与引擎对不上');
  for (const person of cast) {
    const row = shown.find(item => item.id === person.id);
    if (!row) throw new Error('人物页少了 ' + person.name);
    if (row.name !== person.name) throw new Error('人物页里 ' + person.id + ' 的名字对不上');
    if (row.status !== person.status) throw new Error('人物页里 ' + person.id + ' 的状态对不上');
    if (row.bond !== (person.bond ?? 0)) throw new Error('人物页里 ' + person.id + ' 的羁绊对不上');
  }
  const cultivation = state.life?.cultivation || {};
  if (people.relatives.length !== ((state.life?.family?.members || []).length)) throw new Error('人物页的家人数与引擎对不上');
  if (people.descendants.length !== ((cultivation.descendants || []).length)) throw new Error('人物页的后代数与引擎对不上');
  if (people.officers.length !== ((cultivation.officers || []).length)) throw new Error('人物页的宗门职务数与引擎对不上');
  return true;
}

/* ── 流水 ─────────────────────────────────────────────────────────────── */

/**
 * 一生的日志正文 + 抉择流水。
 *
 * ⚠ 日志与抉择都是引擎写的（`state.journal` / `state.decisions`）——
 *   面板只排版，不加工。
 */
export function buildJournal(state) {
  const journal = (state.journal || []).map(row => ({
    id: row.id,
    month: row.month,
    age: ageAt(state, row.month),
    kind: row.kind,
    title: row.title,
    body: row.body ?? '',
    event: row.event ?? '',
    context: row.context ?? '',
    location: row.location ?? '',
    changes: [...(row.changes || [])],
    automatic: Boolean(row.automatic),
  }));
  const decisions = (state.decisions || []).map((row, index) => ({
    index,
    month: row.month,
    age: ageAt(state, row.month),
    event: row.event,
    choice: row.choice,
    success: row.success,
    chance: row.chance ?? null,
  }));
  const kinds = [];
  for (const row of journal) if (!kinds.includes(row.kind)) kinds.push(row.kind);
  return { journal, decisions, kinds };
}

/**
 * 真门禁断言：流水页显示的必须与引擎**逐条一致**。
 */
export function assertJournalMatchesState(view, state) {
  const truth = state.journal || [];
  if (view.journal.length !== truth.length) throw new Error('流水页的日志条数与引擎对不上');
  for (let index = 0; index < truth.length; index++) {
    const shown = view.journal[index], real = truth[index];
    if (shown.id !== real.id) throw new Error('流水页第 ' + index + ' 条日志的编号对不上');
    if (shown.month !== real.month) throw new Error('流水页第 ' + index + ' 条日志的月份对不上');
    if (shown.kind !== real.kind) throw new Error('流水页第 ' + index + ' 条日志的类型对不上');
    if (shown.title !== real.title) throw new Error('流水页第 ' + index + ' 条日志的标题对不上');
    if (shown.body !== (real.body ?? '')) throw new Error('流水页第 ' + index + ' 条日志的正文对不上');
  }
  const decisions = state.decisions || [];
  if (view.decisions.length !== decisions.length) throw new Error('流水页的抉择条数与引擎对不上');
  for (let index = 0; index < decisions.length; index++) {
    const shown = view.decisions[index], real = decisions[index];
    if (shown.event !== real.event) throw new Error('流水页第 ' + index + ' 条抉择的卡对不上');
    if (shown.choice !== real.choice) throw new Error('流水页第 ' + index + ' 条抉择的选择对不上');
    if (shown.month !== real.month) throw new Error('流水页第 ' + index + ' 条抉择的月份对不上');
    if (shown.success !== real.success) throw new Error('流水页第 ' + index + ' 条抉择的成败对不上');
    if (shown.chance !== (real.chance ?? null)) throw new Error('流水页第 ' + index + ' 条抉择的把握值对不上');
  }
  return true;
}

/* ── 批量实测 ─────────────────────────────────────────────────────────── */

/**
 * 跑一批命，量出内容覆盖度。
 *
 * ⚠ 每条命都是引擎真跑出来的（不是模拟）⇒ 结论直接可用。
 *   ⚠ 某条命中途报错 ⇒ 计入 `lives` 但不计入完成数，**不静默丢弃**。
 *
 * @param {object[]} runs 每条命的 { state, seed, error }
 */
export function buildBatch(runs = []) {
  const finished = runs.filter(run => !run.error);
  const endings = {};
  const items = new Set();
  const realmAges = {};
  for (const run of finished) {
    const state = run.state;
    const title = state.ending?.title ?? '（未走到终章）';
    endings[title] = (endings[title] || 0) + 1;
    for (const id of state.inventory || []) items.add(id);
    for (const row of state.journal || []) {
      if (row.kind !== 'breakthrough') continue;
      const age = ageAt(state, row.month);
      const key = String(row.toRealm);
      if (!realmAges[key]) realmAges[key] = [];
      realmAges[key].push(age);
    }
  }
  const median = values => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  };
  const reach = Object.entries(realmAges).map(([realm, ages]) => ({
    realm: Number(realm),
    name: REALMS[Number(realm)]?.name ?? realm,
    count: ages.length,
    medianAge: median(ages),
  })).sort((a, b) => a.realm - b.realm);
  return {
    lives: runs.length,
    finished: finished.length,
    broken: runs.length - finished.length,
    endings,
    itemCount: items.size,
    itemTotal: Object.keys(ITEMS).length,
    items: [...items].sort(),
    reach,
    decisions: finished.reduce((sum, run) => sum + (run.state.decisions?.length || 0), 0),
    journal: finished.reduce((sum, run) => sum + (run.state.journal?.length || 0), 0),
  };
}

/**
 * 真门禁断言：批量统计必须能由那批命**逐条重算复现**。
 */
export function assertBatchMatchesRuns(batch, runs = []) {
  const finished = runs.filter(run => !run.error);
  if (batch.lives !== runs.length) throw new Error('批量统计的命数对不上');
  if (batch.finished !== finished.length) throw new Error('批量统计的完成数对不上');
  const items = new Set();
  let decisions = 0;
  for (const run of finished) {
    for (const id of run.state.inventory || []) items.add(id);
    decisions += run.state.decisions?.length || 0;
  }
  if (batch.itemCount !== items.size) throw new Error('批量统计的道具命中数对不上');
  if (batch.decisions !== decisions) throw new Error('批量统计的抉择总数对不上');
  const endings = {};
  for (const run of finished) {
    const title = run.state.ending?.title ?? '（未走到终章）';
    endings[title] = (endings[title] || 0) + 1;
  }
  if (JSON.stringify(batch.endings) !== JSON.stringify(endings)) throw new Error('批量统计的结局分布对不上');
  return true;
}

/* ── 内容覆盖（按规则版本分桶） ────────────────────────────────────────── */

/**
 * 各规则版本的修仙事件表 —— **与 `packages/adventure/engine.js` 查表用的是同一批**。
 *
 * ⚠ 引擎找一张卡时的顺序（`eventNode()`）：
 *   ① 当前规则版本的事件表 → ② 旧版本的事件表 → ③ 经典故事层（`NODES`）兜底。
 *   ⇒ 「这张卡归谁管」是**规则层自己说的**，面板照抄，不自己猜。
 */
const VERSION_TABLES = {
  12: CULTIVATION_EVENTS,
  11: RULES11_CULTIVATION_EVENTS,
  10: RULES10_CULTIVATION_EVENTS,
  9: RULES9_CULTIVATION_EVENTS,
  8: RULES8_CULTIVATION_EVENTS,
  7: RULES7_CULTIVATION_EVENTS,
  6: RULES6_CULTIVATION_EVENTS,
  5: RULES5_CULTIVATION_EVENTS,
  0: LEGACY_CULTIVATION_EVENTS,
};

/** 当前版本的卡定义（经典故事层打底，当前版本覆盖同名卡）—— 用来取标题与选项。 */
const NODE_DEFS = { ...EVENTS, ...CULTIVATION_EVENTS };

/**
 * 一张剧情卡的「同族名」。
 *
 * ⚠ 为什么要去掉序号：
 *   内容层给**同一个场景**准备了多个说法（`r12_home_resolve_2..5` 是「又回到这个住处」，
 *   `selection_3_result` 是「第三次选拔的结果」）⇒ 它们是同一场景的多个变体，
 *   不是几个不同的场景。
 *   覆盖统计若把它们当成不同的卡，就会把「一条命反复回到同一处才出现」误报成死角。
 */
export function cardFamily(id) {
  return String(id)
    .replace(/_(result|resume)$/, '')
    .replace(/_\d+$/, '')
    .replace(/_(result|resume)$/, '');
}

/**
 * 把所有剧情卡按**规则层的查表顺序**分桶。
 *
 * - `current` 当前版本的事件表（这一版真正会走的）
 * - `legacy`  只在旧版本事件表里、当前版本查不到 ⇒ 别的版本专属
 * - `classic` 只在经典故事层里（攻城 / 战议 / 难民 / 大陆登陆那一整条线）
 *
 * ⚠ 为什么要分桶：360 张卡里有一大半**当前版本根本不会走到**
 *   （实测规则十二下一张都没出现）—— 不分桶的话，
 *   一个「覆盖 55%」的数字会让人以为另外 45% 的内容写废了。
 */
export function cardBuckets(rulesVersion = 12) {
  const current = new Set(Object.keys(VERSION_TABLES[rulesVersion] || {}));
  const older = new Set();
  for (const [version, table] of Object.entries(VERSION_TABLES)) {
    if (Number(version) === Number(rulesVersion)) continue;
    for (const id of Object.keys(table)) older.add(id);
  }
  const buckets = [
    { id: 'current', label: '当前版本（规则' + rulesVersion + '）', ids: [] },
    { id: 'legacy', label: '旧版本专属', ids: [] },
    { id: 'classic', label: '经典故事层', ids: [] },
  ];
  for (const id of Object.keys(EVENTS)) {
    if (current.has(id)) buckets[0].ids.push(id);
    else if (older.has(id)) buckets[1].ids.push(id);
    else buckets[2].ids.push(id);
  }
  return buckets;
}

/**
 * 跑一批命之后，量出「内容覆盖度」。
 *
 * ⚠ 覆盖 = **这批命真的碰到过**，不是「内容表里写着」。
 *   剧本有 360 张卡，跑 60 条命只碰到 199 张 ⇒ 剩下的不是写废了，是没走到。
 *
 * ⚠ 地名是**采样**：引擎只留「当前在哪」，不留「去过哪些地方」
 *   ⇒ 由 `runBatch` 每轮把住处/所在地记下来，这里照着采样还原
 *   （跟道具进出行囊一个道理：采样，不是算规则）。
 *
 * @param {object[]} runs 每条命的 { state, seed, error, spots }
 */
export function buildCoverage(runs = [], { rulesVersion = 12 } = {}) {
  const finished = runs.filter(run => !run.error);
  const cards = new Set();
  const chosenByCard = new Map();
  const choices = new Set();
  const items = new Set();
  const endings = new Set();
  const spots = new Set();
  for (const run of finished) {
    const state = run.state;
    for (const row of state.journal || []) {
      if (row.event && Object.hasOwn(EVENTS, row.event)) cards.add(row.event);
    }
    for (const row of state.decisions || []) {
      if (!row.event) continue;
      cards.add(row.event);
      choices.add(row.choice);
      if (!chosenByCard.has(row.event)) chosenByCard.set(row.event, new Set());
      chosenByCard.get(row.event).add(row.choice);
    }
    for (const id of state.inventory || []) items.add(id);
    if (state.ending?.title) endings.add(state.ending.title);
    for (const spot of run.spots || []) if (spot) spots.add(String(spot));
  }

  const buckets = cardBuckets(rulesVersion).map(bucket => {
    const hit = bucket.ids.filter(id => cards.has(id));
    const hitSet = new Set(hit);
    const missed = bucket.ids.filter(id => !hitSet.has(id)).map(id => {
      const family = cardFamily(id);
      const siblings = bucket.ids.filter(other => cardFamily(other) === family);
      const familyHit = siblings.some(other => hitSet.has(other));
      const def = NODE_DEFS[id];
      return {
        id,
        label: def?.title ?? id,
        family,
        familySize: siblings.length,
        /* `scene` = 这一族一张都没走到；`variant` = 同一个场景的其它变体没走到；
           `line` = 属于另一条线（当前版本根本不走 ⇒ 不是缺口）。 */
        kind: bucket.id === 'current' ? (familyHit ? 'variant' : 'scene') : 'line',
      };
    });
    return { id: bucket.id, label: bucket.label, total: bucket.ids.length, hit: hit.length, missed };
  });

  /* 从没被选过的选项：这张卡出现过，但它的某个选项一条命都没选过。 */
  /* ⚠ 选项文案可能是**函数**（随当时的情况变，引擎在 `options()` 里当场求值）
   *   ⇒ 这里只取静态文案；取不到就退回选项 id（不能把函数塞进数据里：浏览器序列化后就不一样了）。 */
  const staticText = value => (typeof value === 'function' ? '' : (value ?? ''));
  const unused = [];
  for (const card of cards) {
    const def = NODE_DEFS[card];
    const defined = Array.isArray(def?.choices) ? def.choices : [];
    const picked = chosenByCard.get(card) ?? new Set();
    for (const choice of defined) {
      if (!choice || !choice.id || picked.has(choice.id)) continue;
      unused.push({
        card,
        cardLabel: staticText(def?.title) || card,
        choice: choice.id,
        label: staticText(choice.label) || choice.id,
      });
    }
  }

  const placeRows = [];
  for (const geo of GEOGRAPHY) for (const name of geo.places || []) placeRows.push({ id: name, continent: geo.id, continentName: geo.name });
  const placesHit = placeRows.filter(row => [...spots].some(spot => spot.includes(row.id)));

  /* 角儿（人物）覆盖 —— 「角儿够不够丰富」这件事，数据在 `state.people` /
     家人 / 后辈 / 宗门职务 / 旧相识里。
     ⚠ 这里**复用人物页那一套读法**（`buildPeople`）⇒ 面板不会出现
     「人物页说有、覆盖表说没有」这种自相矛盾。 */
  const GROUP_LABELS = { cast: '主角', family: '家人', descendant: '后辈', officer: '宗门职务', contact: '旧相识' };
  const groupMap = new Map();
  const slotMap = new Map();
  const metPerLife = [];
  for (const run of finished) {
    const view = buildPeople(run.state);
    const byGroup = new Map();
    for (const row of view.all) {
      /* ⚠ 位置**无论有没有遇到都要记下来** ——
       *   只记遇到过的，就答不出「哪个角儿这批命一次都没遇到过」。 */
      const key = row.group + ':' + row.id;
      if (!slotMap.has(key)) {
        slotMap.set(key, { group: row.group, id: row.id, label: row.role || row.name || row.id, lives: 0 });
      }
      if (!row.known) continue;
      byGroup.set(row.group, (byGroup.get(row.group) || 0) + 1);
      slotMap.get(key).lives++;
    }
    let met = 0;
    for (const [groupId, count] of byGroup) {
      met += count;
      if (!groupMap.has(groupId)) groupMap.set(groupId, { id: groupId, label: GROUP_LABELS[groupId] ?? groupId, lives: 0, counts: [] });
      const group = groupMap.get(groupId);
      group.lives++;
      group.counts.push(count);
    }
    metPerLife.push(met);
  }
  const sortedMet = [...metPerLife].sort((a, b) => a - b);
  const peopleGroups = [...groupMap.values()].map(group => {
    const counts = [...group.counts].sort((a, b) => a - b);
    const slots = [...slotMap.values()].filter(slot => slot.group === group.id);
    return {
      id: group.id,
      label: group.label,
      lives: group.lives,
      median: counts.length ? counts[Math.floor(counts.length / 2)] : 0,
      max: counts.length ? counts[counts.length - 1] : 0,
      slots: slots.sort((a, b) => (a.lives - b.lives) || a.id.localeCompare(b.id)),
    };
  });
  /* 「有机会但一次都没遇到」的位置：这一批命里从没遇上过的角儿。 */
  const neverMet = [...slotMap.values()].filter(slot => slot.lives === 0);

  const itemRows = Object.keys(ITEMS).map(id => ({ id, name: ITEMS[id].name }));
  const endingRows = Object.keys(ALL_ENDINGS).map(id => ({ id, title: ALL_ENDINGS[id].title }));

  return {
    lives: runs.length,
    finished: finished.length,
    rulesVersion,
    cards: { total: Object.keys(EVENTS).length, hit: cards.size, buckets },
    choices: { picked: choices.size, unused },
    places: {
      total: placeRows.length,
      hit: placesHit.length,
      missed: placeRows.filter(row => !placesHit.includes(row)),
    },
    /** 角儿覆盖：每一组出现了几次、有哪些角儿一次都没遇到。 */
    people: {
      groups: peopleGroups,
      neverMet,
      perLifeMedian: sortedMet.length ? sortedMet[Math.floor(sortedMet.length / 2)] : 0,
      perLifeMax: sortedMet.length ? sortedMet[sortedMet.length - 1] : 0,
    },
    items: {
      total: itemRows.length,
      hit: itemRows.filter(row => items.has(row.id)).length,
      missed: itemRows.filter(row => !items.has(row.id)),
    },
    endings: {
      total: endingRows.length,
      hit: endingRows.filter(row => endings.has(row.title)).length,
      missed: endingRows.filter(row => !endings.has(row.title)),
    },
  };
}

/**
 * 真门禁断言：覆盖统计必须能由那批命**逐条重算复现**。
 *
 * ⚠ 这里的重算**不调用 `buildCoverage`** —— 自己再算一遍，才算数。
 */
export function assertCoverageMatchesRuns(coverage, runs = [], { rulesVersion = 12 } = {}) {
  const finished = runs.filter(run => !run.error);
  if (coverage.lives !== runs.length) throw new Error('覆盖统计的命数对不上');
  if (coverage.finished !== finished.length) throw new Error('覆盖统计的完成数对不上');

  /* ① 出现过的剧情卡 */
  const cards = new Set();
  const choices = new Set();
  const chosenByCard = new Map();
  const items = new Set();
  const endings = new Set();
  const spots = new Set();
  for (const run of finished) {
    const state = run.state;
    for (const row of state.journal || []) if (row.event && Object.hasOwn(EVENTS, row.event)) cards.add(row.event);
    for (const row of state.decisions || []) {
      if (!row.event) continue;
      cards.add(row.event);
      choices.add(row.choice);
      if (!chosenByCard.has(row.event)) chosenByCard.set(row.event, new Set());
      chosenByCard.get(row.event).add(row.choice);
    }
    for (const id of state.inventory || []) items.add(id);
    if (state.ending?.title) endings.add(state.ending.title);
    for (const spot of run.spots || []) if (spot) spots.add(String(spot));
  }
  if (coverage.cards.hit !== cards.size) throw new Error('覆盖统计的剧情卡命中数对不上');
  if (coverage.choices.picked !== choices.size) throw new Error('覆盖统计的选项命中数对不上');
  if (coverage.items.hit !== items.size) throw new Error('覆盖统计的道具命中数对不上');
  if (coverage.endings.hit !== endings.size) throw new Error('覆盖统计的结局命中数对不上');

  /* ② 分桶：每一桶的总数与命中数都要对得上 */
  const buckets = cardBuckets(rulesVersion);
  if (coverage.cards.buckets.length !== buckets.length) throw new Error('覆盖统计的桶数对不上');
  for (let index = 0; index < buckets.length; index++) {
    const bucket = buckets[index], shown = coverage.cards.buckets[index];
    if (shown.id !== bucket.id) throw new Error('覆盖统计的桶顺序对不上');
    if (shown.total !== bucket.ids.length) throw new Error('「' + bucket.label + '」的卡总数与规则层对不上');
    const hit = bucket.ids.filter(id => cards.has(id));
    if (shown.hit !== hit.length) throw new Error('「' + bucket.label + '」的命中数对不上');
    const missed = bucket.ids.filter(id => !cards.has(id));
    if (shown.missed.length !== missed.length) throw new Error('「' + bucket.label + '」的没出现条数对不上');
    for (let row = 0; row < missed.length; row++) {
      if (shown.missed[row].id !== missed[row]) throw new Error('「' + bucket.label + '」的没出现清单对不上');
      const family = cardFamily(missed[row]);
      const siblings = bucket.ids.filter(other => cardFamily(other) === family);
      const familyHit = siblings.some(other => cards.has(other));
      const expected = bucket.id === 'current' ? (familyHit ? 'variant' : 'scene') : 'line';
      if (shown.missed[row].kind !== expected) throw new Error('「' + missed[row] + '」的分类（整族没走到 / 同场景变体 / 别的线）不对');
      if (shown.missed[row].family !== family) throw new Error('「' + missed[row] + '」的同族名不对');
    }
  }

  /* ③ 从没被选过的选项：必须真的没人选过，且它确实是这张卡的选项 */
  const unusedExpected = [];
  for (const card of cards) {
    const def = NODE_DEFS[card];
    const defined = Array.isArray(def?.choices) ? def.choices : [];
    const picked = chosenByCard.get(card) ?? new Set();
    for (const choice of defined) {
      if (!choice || !choice.id || picked.has(choice.id)) continue;
      unusedExpected.push(card + '/' + choice.id);
    }
  }
  const unusedShown = coverage.choices.unused.map(row => row.card + '/' + row.choice);
  if (unusedShown.length !== unusedExpected.length) throw new Error('「从没被选过的选项」条数对不上');
  for (let index = 0; index < unusedExpected.length; index++) {
    if (unusedShown[index] !== unusedExpected[index]) throw new Error('「从没被选过的选项」清单对不上');
  }

  /* ④ 地名：采样到的住处/所在地里含有这个地名才算去过 */
  const placeRows = [];
  for (const geo of GEOGRAPHY) for (const name of geo.places || []) placeRows.push(name);
  const placesHit = placeRows.filter(name => [...spots].some(spot => spot.includes(name)));
  if (coverage.places.total !== placeRows.length) throw new Error('覆盖统计的地名总数与内容表对不上');
  if (coverage.places.hit !== placesHit.length) throw new Error('覆盖统计的地名命中数对不上');
  if (coverage.places.missed.length !== placeRows.length - placesHit.length) throw new Error('覆盖统计的「没去过的地名」条数对不上');
  for (const row of coverage.places.missed) {
    if (!placeRows.includes(row.id)) throw new Error('「没去过的地名」里有内容表里没有的地名');
    if (placesHit.includes(row.id)) throw new Error('「没去过的地名」里混进了去过的地名');
  }

  /* ⑤ 道具与结局的没出现清单，必须是全表里真的一次都没碰到的 */
  for (const row of coverage.items.missed) {
    if (!Object.hasOwn(ITEMS, row.id)) throw new Error('「没碰到的道具」里有道具表里没有的东西');
    if (items.has(row.id)) throw new Error('「没碰到的道具」里混进了碰到的道具');
  }
  if (coverage.items.total !== Object.keys(ITEMS).length) throw new Error('覆盖统计的道具总数与内容表对不上');
  for (const row of coverage.endings.missed) {
    if (!Object.values(ALL_ENDINGS).some(ending => ending.title === row.title)) throw new Error('「没走到的结局」里有结局表里没有的东西');
    if (endings.has(row.title)) throw new Error('「没走到的结局」里混进了走到的结局');
  }
  if (coverage.endings.total !== Object.keys(ALL_ENDINGS).length) throw new Error('覆盖统计的结局总数与内容表对不上');

  /* ⑥ 角儿覆盖：每一组的「有几条命里出现过」「从没遇到的角儿」都要对得上 */
  const peopleGroups = new Map();
  const peopleSlots = new Map();
  for (const run of finished) {
    const view = buildPeople(run.state);
    const byGroup = new Map();
    for (const row of view.all) {
      /* ⚠ 与 `buildCoverage` 同口径：位置**无论遇到没有都要记**，只是「遇到过几次」才 +1。 */
      const key = row.group + ':' + row.id;
      if (!peopleSlots.has(key)) peopleSlots.set(key, { group: row.group, id: row.id, label: row.role || row.name || row.id, lives: 0 });
      if (!row.known) continue;
      byGroup.set(row.group, (byGroup.get(row.group) || 0) + 1);
      peopleSlots.get(key).lives++;
    }
    for (const [groupId, count] of byGroup) {
      if (!peopleGroups.has(groupId)) peopleGroups.set(groupId, { id: groupId, lives: 0, counts: [] });
      const group = peopleGroups.get(groupId);
      group.lives++;
      group.counts.push(count);
    }
  }
  if (coverage.people.groups.length !== peopleGroups.size) throw new Error('角儿覆盖的分组数对不上');
  for (const group of coverage.people.groups) {
    const real = peopleGroups.get(group.id);
    if (!real) throw new Error('角儿覆盖里多了一组「' + group.id + '」');
    if (group.lives !== real.lives) throw new Error('「' + group.label + '」出现过的命数对不上');
    const counts = [...real.counts].sort((a, b) => a - b);
    const median = counts.length ? counts[Math.floor(counts.length / 2)] : 0;
    if (group.median !== median) throw new Error('「' + group.label + '」的每条命中位对不上');
    if (group.max !== (counts.length ? counts[counts.length - 1] : 0)) throw new Error('「' + group.label + '」的最多位对不上');
    const realSlots = [...peopleSlots.values()].filter(slot => slot.group === group.id)
      .sort((a, b) => (a.lives - b.lives) || a.id.localeCompare(b.id));
    if (group.slots.length !== realSlots.length) throw new Error('「' + group.label + '」的位置数对不上');
    for (let index = 0; index < realSlots.length; index++) {
      if (group.slots[index].id !== realSlots[index].id) throw new Error('「' + group.label + '」的位置清单对不上');
      if (group.slots[index].lives !== realSlots[index].lives) throw new Error('「' + realSlots[index].label + '」出现过的命数对不上');
    }
  }
  const neverMet = [...peopleSlots.values()].filter(slot => slot.lives === 0);
  if (coverage.people.neverMet.length !== neverMet.length) throw new Error('「从没遇到的角儿」条数对不上');
  for (let index = 0; index < neverMet.length; index++) {
    if (coverage.people.neverMet[index].id !== neverMet[index].id) throw new Error('「从没遇到的角儿」清单对不上');
  }
  return true;
}

/* ── 两种玩法并排比 ─────────────────────────────────────────────────────── */

/**
 * 两种玩法（固定偏好 / 随机探索）跑出来的覆盖度，**并排比**。
 *
 * ⚠ 为什么要比：
 *   「跑一批」的价值不在平均数，而在**差异** ——
 *   · 只 A 走到的卡 ⇒ 只有某条路才碰得到的那部分内容；
 *   · 只 B 走到的卡 ⇒ 偏好策略永远不走的分支（= 死角候选）；
 *   · 两种都没走到 ⇒ 这一版谁都没碰到的内容。
 *
 * ⚠ 全部由那两份覆盖统计算出来，**不重新跑引擎**（跑命只在 `runBatch` 里做）。
 *
 * @param {object} left  `{ label, batch, coverage }`
 * @param {object} right `{ label, batch, coverage }`
 */
export function buildComparison(left, right, { rulesVersion = 12 } = {}) {
  const universe = cardBuckets(rulesVersion).find(bucket => bucket.id === 'current').ids;

  /* 每份覆盖统计里「命中了哪些」——由「没出现」清单取补集（不另存一份，避免两边对不上）。 */
  const hitCards = coverage => {
    const bucket = coverage.cards.buckets.find(row => row.id === 'current');
    const missed = new Set(bucket.missed.map(row => row.id));
    return new Set(universe.filter(id => !missed.has(id)));
  };
  const hitItems = coverage => new Set(Object.keys(ITEMS).filter(id => !coverage.items.missed.some(row => row.id === id)));
  const hitEndings = coverage => new Set(
    Object.keys(ALL_ENDINGS).map(id => ALL_ENDINGS[id].title).filter(title => !coverage.endings.missed.some(row => row.title === title)),
  );
  const hitPeople = coverage => {
    const map = new Map();
    for (const group of coverage.people.groups) {
      for (const slot of group.slots) map.set(group.id + ':' + slot.id, { label: slot.label, lives: slot.lives });
    }
    return map;
  };

  const leftCards = hitCards(left.coverage);
  const rightCards = hitCards(right.coverage);
  const leftItems = hitItems(left.coverage);
  const rightItems = hitItems(right.coverage);
  const leftEndings = hitEndings(left.coverage);
  const rightEndings = hitEndings(right.coverage);
  const leftPeople = hitPeople(left.coverage);
  const rightPeople = hitPeople(right.coverage);

  const cardLabel = id => NODE_DEFS[id]?.title ?? id;
  const itemLabel = id => ITEMS[id]?.name ?? id;

  const medianAge = batch => {
    const row = batch.reach.find(entry => entry.realm === 2);
    return row ? row.medianAge : null;
  };

  /* 角儿按「位置」比，但要比的是**遇到过几次**（位置两边常常都碰到过，只是次数不同）。 */
  const peopleDiff = [];
  for (const [key, row] of leftPeople) {
    const other = rightPeople.get(key);
    const rightLives = other ? other.lives : 0;
    if (row.lives !== rightLives) peopleDiff.push({ id: key, label: row.label, left: row.lives, right: rightLives });
  }
  for (const [key, row] of rightPeople) {
    if (leftPeople.has(key)) continue;
    peopleDiff.push({ id: key, label: row.label, left: 0, right: row.lives });
  }
  /* ⚠ 排序必须**逐字可比**：不能用 `localeCompare`（中文的排序结果在浏览器与 Node 里不一样
   *   ⇒ 同一批数据，两边排出来的顺序会不同 ⇒ 门禁的逐值全等就红了）。
   *   这里按「差得多不多」→ 「id 逐字」→ 「名字逐字」排 ⇒ 两个运行时结果必然一样。 */
  peopleDiff.sort((a, b) => (Math.abs(b.right - b.left) - Math.abs(a.right - a.left))
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
    || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0));

  return {
    left: { label: left.label, batch: left.batch, coverage: left.coverage },
    right: { label: right.label, batch: right.batch, coverage: right.coverage },
    rows: [
      { key: 'cards', label: '剧情卡（当前版本）', unit: '张', left: left.coverage.cards.buckets.find(b => b.id === 'current').hit, right: right.coverage.cards.buckets.find(b => b.id === 'current').hit },
      { key: 'endings', label: '结局种类', unit: '种', left: left.coverage.endings.hit, right: right.coverage.endings.hit },
      { key: 'items', label: '道具命中', unit: '件', left: left.coverage.items.hit, right: right.coverage.items.hit },
      { key: 'places', label: '地名', unit: '个', left: left.coverage.places.hit, right: right.coverage.places.hit },
      { key: 'decisions', label: '抉择总数', unit: '次', left: left.batch.decisions, right: right.batch.decisions },
      { key: 'perLife', label: '每条命平均抉择', unit: '次', left: Number((left.batch.decisions / Math.max(1, left.batch.finished)).toFixed(1)), right: Number((right.batch.decisions / Math.max(1, right.batch.finished)).toFixed(1)) },
      { key: 'journal', label: '每条命平均经历', unit: '条', left: Number((left.batch.journal / Math.max(1, left.batch.finished)).toFixed(1)), right: Number((right.batch.journal / Math.max(1, right.batch.finished)).toFixed(1)) },
      { key: 'foundation', label: '筑基到达年龄中位', unit: '岁', left: medianAge(left.batch), right: medianAge(right.batch) },
      { key: 'people', label: '遇到的角儿（每条命中位）', unit: '位', left: left.coverage.people.perLifeMedian, right: right.coverage.people.perLifeMedian },
    ],
    onlyLeft: {
      cards: [...leftCards].filter(id => !rightCards.has(id)).map(id => ({ id, label: cardLabel(id) })),
      items: [...leftItems].filter(id => !rightItems.has(id)).map(id => ({ id, label: itemLabel(id) })),
      endings: [...leftEndings].filter(title => !rightEndings.has(title)).map(title => ({ id: title, label: title })),
    },
    onlyRight: {
      cards: [...rightCards].filter(id => !leftCards.has(id)).map(id => ({ id, label: cardLabel(id) })),
      items: [...rightItems].filter(id => !leftItems.has(id)).map(id => ({ id, label: itemLabel(id) })),
      endings: [...rightEndings].filter(title => !leftEndings.has(title)).map(title => ({ id: title, label: title })),
    },
    /** 角儿：比的是「**遇到过几次**」（位置两边常常都碰到过，只是次数不同）。 */
    peopleDiff,
    neither: {
      cards: universe.filter(id => !leftCards.has(id) && !rightCards.has(id)).map(id => ({ id, label: cardLabel(id) })),
    },
  };
}

/**
 * 真门禁断言：两种玩法的并排比必须能由**那两批命本身**重算复现。
 *
 * ⚠ 这里的重算**不调用 `buildComparison`** —— 自己再算一遍差集，才算数。
 *   而且它是从「命」重算（`buildComparison` 是从「两份覆盖统计」重算）
 *   ⇒ 两条不同的路，终点必须一样。
 *
 * ⚠ 比的是**集合**，不是顺序 —— `buildComparison` 的差集按内容表顺序排，
 *   这里按字典序排 ⇒ 逐条比之前先各自排好，免得顺序不同就误报。
 */
export function assertComparisonMatchesRuns(cmp, leftRuns = [], rightRuns = [], { rulesVersion = 12 } = {}) {
  const universe = cardBuckets(rulesVersion).find(bucket => bucket.id === 'current').ids;
  const universeSet = new Set(universe);

  /* 独立重算：每一批命各自碰到了什么。 */
  const collect = runs => {
    const cards = new Set();
    const items = new Set();
    const endings = new Set();
    const spots = new Set();
    const metPerLife = [];
    const slotMap = new Map();
    const metGroups = new Set();
    for (const run of runs.filter(run => !run.error)) {
      const state = run.state;
      for (const row of state.journal || []) if (row.event && Object.hasOwn(EVENTS, row.event)) cards.add(row.event);
      for (const row of state.decisions || []) if (row.event) cards.add(row.event);
      for (const id of state.inventory || []) items.add(id);
      if (state.ending?.title) endings.add(state.ending.title);
      for (const spot of run.spots || []) if (spot) spots.add(String(spot));
      /* 角儿：位置**无论遇到没有都要记**（与 `buildCoverage` 同口径）；
         但只保留「这批里遇到过的组」—— 否则两边不可比。 */
      const view = buildPeople(state);
      let met = 0;
      for (const row of view.all) {
        const key = row.group + ':' + row.id;
        if (!slotMap.has(key)) slotMap.set(key, { group: row.group, label: row.role || row.name || row.id, lives: 0 });
        if (!row.known) continue;
        metGroups.add(row.group);
        slotMap.get(key).lives++;
        met++;
      }
      metPerLife.push(met);
    }
    const people = new Map();
    for (const [key, slot] of slotMap) if (metGroups.has(slot.group)) people.set(key, { label: slot.label, lives: slot.lives });
    return { cards, items, endings, spots, people, metPerLife };
  };

  const left = collect(leftRuns);
  const right = collect(rightRuns);

  const inUniverse = set => new Set([...set].filter(id => universeSet.has(id)));
  const leftCards = inUniverse(left.cards);
  const rightCards = inUniverse(right.cards);
  const leftItems = new Set(Object.keys(ITEMS).filter(id => left.items.has(id)));
  const rightItems = new Set(Object.keys(ITEMS).filter(id => right.items.has(id)));
  const endingTitles = new Set(Object.values(ALL_ENDINGS).map(ending => ending.title));
  const leftEndings = new Set([...left.endings].filter(title => endingTitles.has(title)));
  const rightEndings = new Set([...right.endings].filter(title => endingTitles.has(title)));

  const placeNames = [];
  for (const geo of GEOGRAPHY) for (const name of geo.places || []) placeNames.push(name);
  const placesHit = spots => placeNames.filter(name => [...spots].some(spot => spot.includes(name))).length;
  const median = values => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };

  /* ① 三块差集：只左 / 只右 / 两种都没走到 —— 逐条比对。 */
  const diff = (a, b) => [...a].filter(id => !b.has(id)).sort();
  const expect = {
    onlyLeft: { cards: diff(leftCards, rightCards), items: diff(leftItems, rightItems), endings: diff(leftEndings, rightEndings) },
    onlyRight: { cards: diff(rightCards, leftCards), items: diff(rightItems, leftItems), endings: diff(rightEndings, leftEndings) },
    neither: universe.filter(id => !leftCards.has(id) && !rightCards.has(id)).sort(),
  };
  const sideLabel = { onlyLeft: '只左边走到', onlyRight: '只右边走到' };
  for (const side of ['onlyLeft', 'onlyRight']) {
    for (const kind of ['cards', 'items', 'endings']) {
      const shown = [...cmp[side][kind]].map(row => row.id).sort();
      if (shown.length !== expect[side][kind].length) throw new Error('「' + sideLabel[side] + '」的' + kind + '条数对不上');
      for (let index = 0; index < shown.length; index++) {
        if (shown[index] !== expect[side][kind][index]) throw new Error('「' + sideLabel[side] + '」的' + kind + '清单对不上');
      }
    }
  }
  const shownNeither = [...cmp.neither.cards].map(row => row.id).sort();
  if (shownNeither.length !== expect.neither.length) throw new Error('「两种都没走到」的卡条数对不上');
  for (let index = 0; index < shownNeither.length; index++) {
    if (shownNeither[index] !== expect.neither[index]) throw new Error('「两种都没走到」的卡清单对不上');
  }

  /* ② 角儿差异：比的是「遇到过几次」，逐个位置比对。 */
  const expectPeople = new Map();
  for (const [key, row] of left.people) {
    const other = right.people.get(key);
    const rightLives = other ? other.lives : 0;
    if (row.lives !== rightLives) expectPeople.set(key, { left: row.lives, right: rightLives });
  }
  for (const [key, row] of right.people) {
    if (left.people.has(key)) continue;
    expectPeople.set(key, { left: 0, right: row.lives });
  }
  const shownPeople = new Map(cmp.peopleDiff.map(row => [row.id, { left: row.left, right: row.right }]));
  if (shownPeople.size !== expectPeople.size) throw new Error('角儿差异的条数对不上');
  for (const [key, expected] of expectPeople) {
    const shown = shownPeople.get(key);
    if (!shown) throw new Error('角儿差异里少了一个位置');
    if (shown.left !== expected.left || shown.right !== expected.right) throw new Error('角儿差异里「' + key + '」的次数对不上');
  }

  /* ③ 指标表：九项都要与那两批命重算的结果相等。 */
  const reach = batch => {
    const row = (batch?.reach || []).find(entry => entry.realm === 2);
    return row ? row.medianAge : null;
  };
  const perLife = (batch, key) => Number(((batch?.[key] ?? 0) / Math.max(1, batch?.finished ?? 0)).toFixed(1));
  const expectedRows = {
    cards: [leftCards.size, rightCards.size],
    endings: [leftEndings.size, rightEndings.size],
    items: [leftItems.size, rightItems.size],
    places: [placesHit(left.spots), placesHit(right.spots)],
    decisions: [cmp.left.batch?.decisions ?? 0, cmp.right.batch?.decisions ?? 0],
    perLife: [perLife(cmp.left.batch, 'decisions'), perLife(cmp.right.batch, 'decisions')],
    journal: [perLife(cmp.left.batch, 'journal'), perLife(cmp.right.batch, 'journal')],
    foundation: [reach(cmp.left.batch), reach(cmp.right.batch)],
    people: [median(left.metPerLife), median(right.metPerLife)],
  };
  for (const [key, [expectedLeft, expectedRight]] of Object.entries(expectedRows)) {
    const row = cmp.rows.find(entry => entry.key === key);
    if (!row) throw new Error('指标表里少了「' + key + '」这一行');
    if (row.left !== expectedLeft) throw new Error('指标表「' + row.label + '」左边的数对不上');
    if (row.right !== expectedRight) throw new Error('指标表「' + row.label + '」右边的数对不上');
  }
  return true;
}

/* ── 按阶段 / 境界看内容 ─────────────────────────────────────────────────── */

/**
 * 「按阶段 / 境界看内容」—— 回答**「不同阶段、境界的那段人生有没有内容可看」**。
 *
 * ⚠ 两侧口径都来自**别处**，这里只汇总，一个数都不自己算：
 *   · 阶段名与年龄段 —— `content/cadence-table.js` 的 `STAGES`；
 *   · 境界名 —— `content/realms.js` 的 `REALMS`；
 *   · 卡属于哪一段 / 哪一境 —— `packages/adventure/gates.js` 的 `declarationOf()`
 *     （**阶段闸用的就是这一份** ⇒ 面板说的与闸管的是同一批卡）；
 *   · 「这张卡是在哪个境界、哪一段人生发出的」—— **采样**（引擎不留这一项）。
 *
 * ⚠ 为什么同时给「并集」与「单条命最多」两个数：
 *   并集 = 这批命**合起来**碰到过几种（看着好看）；
 *   单条命最多 = 一个玩家**实际**能碰到几种（玩家碰不到的，并集里也算）。
 *   ⇒ 两个都摆出来，才不会拿「合起来的数」骗自己。
 */
export function buildStageCoverage(runs = [], { rulesVersion = 12 } = {}) {
  const finished = runs.filter(run => !run.error);
  const universe = cardBuckets(rulesVersion).find(bucket => bucket.id === 'current').ids;

  /* ── 命中侧：采样「发卡时人在哪一境 / 哪一段」 ── */
  const realmKinds = new Map();
  const realmPerLife = new Map();
  const realmAges = new Map();
  const stageKinds = new Map();
  const stagePerLife = new Map();
  const stageRealms = new Map();
  const hitCards = new Set();

  for (const run of finished) {
    const perRealm = new Map();
    const perStage = new Map();
    for (const row of run.issued || []) {
      const realm = Number(row.realm) || 0;
      const stage = row.stage || 'child';
      hitCards.add(row.event);
      if (!realmKinds.has(realm)) realmKinds.set(realm, new Set());
      realmKinds.get(realm).add(row.event);
      if (!realmAges.has(realm)) realmAges.set(realm, []);
      realmAges.get(realm).push(row.age);
      if (!stageKinds.has(stage)) stageKinds.set(stage, new Set());
      stageKinds.get(stage).add(row.event);
      if (!stageRealms.has(stage)) stageRealms.set(stage, new Map());
      const realms = stageRealms.get(stage);
      realms.set(realm, (realms.get(realm) || 0) + 1);
      if (!perRealm.has(realm)) perRealm.set(realm, new Set());
      perRealm.get(realm).add(row.event);
      if (!perStage.has(stage)) perStage.set(stage, new Set());
      perStage.get(stage).add(row.event);
    }
    for (const [realm, set] of perRealm) {
      if (!realmPerLife.has(realm)) realmPerLife.set(realm, []);
      realmPerLife.get(realm).push(set.size);
    }
    for (const [stage, set] of perStage) {
      if (!stagePerLife.has(stage)) stagePerLife.set(stage, []);
      stagePerLife.get(stage).push(set.size);
    }
  }

  const median = values => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  };
  const summarize = (kinds, perLife) => {
    const counts = perLife || [];
    const total = counts.reduce((sum, n) => sum + n, 0);
    return {
      /* 合起来碰到过几种 */
      kinds: kinds ? kinds.size : 0,
      /* 一个玩家实际最多能碰到几种 */
      perLifeMax: counts.length ? Math.max(...counts) : 0,
      /* 一个玩家平均碰到几种 */
      perLifeAvg: counts.length ? Number((total / counts.length).toFixed(1)) : 0,
    };
  };

  const realms = REALMS.map((row, realm) => ({
    realm,
    name: row.name,
    ...summarize(realmKinds.get(realm), realmPerLife.get(realm)),
    medianAge: median(realmAges.get(realm) || []),
    /* ⚠ 底线来自**内容完备度盘点那一份**（`scripts/lib/completeness-limits.js`）
     *   ⇒ 面板标的「低于底线」与那道门禁守的是同一个数、同一个口径。 */
    floor: REALM_KINDS_MIN,
    belowFloor: (realmPerLife.get(realm) || []).length
      ? Math.max(...(realmPerLife.get(realm) || [])) < REALM_KINDS_MIN
      : false,
  }));

  const stages = STAGES.map(stage => {
    const realmsIn = [...(stageRealms.get(stage.id) || new Map()).entries()]
      .sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]))
      .map(([realm, count]) => ({ realm, name: REALMS[realm]?.name ?? String(realm), count }));
    return {
      id: stage.id,
      name: stage.name,
      from: stage.from,
      to: stage.to,
      ...summarize(stageKinds.get(stage.id), stagePerLife.get(stage.id)),
      mainRealm: realmsIn[0]?.name ?? '—',
      realms: realmsIn,
    };
  });
  /* ⚠ 最薄的那一段 —— **相对**的说法，不自己编绝对底线
   *   （项目给境界段与晚年定了底线，没给人生阶段定 ⇒ 不许在这里发明一个）。 */
  const withContent = stages.filter(row => row.perLifeMax > 0);
  const thinnest = withContent.length
    ? withContent.reduce((min, row) => (row.perLifeMax < min.perLifeMax ? row : min)).id
    : null;

  /* ⚠ 晚年：75 岁以后碰到过多少种卡 —— 与「内容完备度盘点」同一口径、同一底线。 */
  const lateCards = new Set();
  for (const run of finished) {
    for (const row of run.issued || []) {
      if (row.age >= LATE_AGE) lateCards.add(row.event);
    }
  }
  const late = {
    age: LATE_AGE,
    kinds: lateCards.size,
    floor: LATE_KINDS_MIN,
    belowFloor: lateCards.size < LATE_KINDS_MIN,
  };

  /* ── 供给侧：规则层**声明**了「这张卡属于哪一段 / 哪一境」的那些卡 ──
   * ⚠ 用 `declarationOf()`（阶段闸同一份）⇒ 面板说的与闸管的是同一批卡。 */
  const declaredStages = STAGES.map(stage => {
    const cards = universe.filter(id => {
      const decl = declarationOf(id);
      return decl && decl.stage === stage.id;
    });
    const missed = cards.filter(id => !hitCards.has(id));
    return {
      id: stage.id,
      name: stage.name,
      total: cards.length,
      hit: cards.length - missed.length,
      missed: missed.map(id => ({ id, label: NODE_DEFS[id]?.title ?? id })),
    };
  });
  const declaredRealms = REALMS.map((row, realm) => {
    const cards = universe.filter(id => {
      const decl = declarationOf(id);
      return decl && decl.realm && realm >= decl.realm[0] && realm <= decl.realm[1];
    });
    const missed = cards.filter(id => !hitCards.has(id));
    return {
      realm,
      name: row.name,
      total: cards.length,
      hit: cards.length - missed.length,
      missed: missed.map(id => ({ id, label: NODE_DEFS[id]?.title ?? id })),
    };
  });

  return {
    lives: runs.length,
    finished: finished.length,
    realms,
    stages,
    thinnest,
    late,
    declaredStages,
    declaredRealms,
  };
}

/**
 * 真门禁断言：「按阶段 / 境界」必须能由那批命**逐条重算复现**。
 *
 * ⚠ 这里的重算**不调用 `buildStageCoverage`** —— 自己再算一遍，才算数。
 */
export function assertStageCoverageMatchesRuns(coverage, runs = [], { rulesVersion = 12 } = {}) {
  const finished = runs.filter(run => !run.error);
  if (coverage.lives !== runs.length) throw new Error('阶段覆盖的命数对不上');
  if (coverage.finished !== finished.length) throw new Error('阶段覆盖的完成数对不上');

  const universe = cardBuckets(rulesVersion).find(bucket => bucket.id === 'current').ids;
  const median = values => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  };

  /* ① 每个境界：碰到几种 / 单条命最多几种 / 平均几种 / 发卡年龄中位 */
  const realmKinds = new Map();
  const realmPerLife = new Map();
  const realmAges = new Map();
  const stageKinds = new Map();
  const stagePerLife = new Map();
  const stageRealms = new Map();
  const hitCards = new Set();
  for (const run of finished) {
    const perRealm = new Map();
    const perStage = new Map();
    for (const row of run.issued || []) {
      const realm = Number(row.realm) || 0;
      const stage = row.stage || 'child';
      hitCards.add(row.event);
      if (!realmKinds.has(realm)) realmKinds.set(realm, new Set());
      realmKinds.get(realm).add(row.event);
      if (!realmAges.has(realm)) realmAges.set(realm, []);
      realmAges.get(realm).push(row.age);
      if (!stageKinds.has(stage)) stageKinds.set(stage, new Set());
      stageKinds.get(stage).add(row.event);
      if (!stageRealms.has(stage)) stageRealms.set(stage, new Map());
      const realms = stageRealms.get(stage);
      realms.set(realm, (realms.get(realm) || 0) + 1);
      if (!perRealm.has(realm)) perRealm.set(realm, new Set());
      perRealm.get(realm).add(row.event);
      if (!perStage.has(stage)) perStage.set(stage, new Set());
      perStage.get(stage).add(row.event);
    }
    for (const [realm, set] of perRealm) {
      if (!realmPerLife.has(realm)) realmPerLife.set(realm, []);
      realmPerLife.get(realm).push(set.size);
    }
    for (const [stage, set] of perStage) {
      if (!stagePerLife.has(stage)) stagePerLife.set(stage, []);
      stagePerLife.get(stage).push(set.size);
    }
  }
  if (coverage.realms.length !== REALMS.length) throw new Error('境界段的条数对不上');
  for (let index = 0; index < REALMS.length; index++) {
    const shown = coverage.realms[index];
    const realm = index;
    if (shown.realm !== realm || shown.name !== REALMS[realm].name) throw new Error('境界段的顺序或名字对不上');
    const counts = realmPerLife.get(realm) || [];
    const total = counts.reduce((sum, n) => sum + n, 0);
    if (shown.kinds !== (realmKinds.get(realm)?.size ?? 0)) throw new Error('「' + shown.name + '」碰到几种内容对不上');
    if (shown.perLifeMax !== (counts.length ? Math.max(...counts) : 0)) throw new Error('「' + shown.name + '」单条命最多几种对不上');
    if (shown.perLifeAvg !== (counts.length ? Number((total / counts.length).toFixed(1)) : 0)) throw new Error('「' + shown.name + '」单条命平均几种对不上');
    if (shown.medianAge !== median(realmAges.get(realm) || [])) throw new Error('「' + shown.name + '」发卡年龄中位对不上');
    /* 底线标记：必须与「内容完备度盘点」那一份同口径、同底线。 */
    const perRealmCounts = realmPerLife.get(realm) || [];
    const below = perRealmCounts.length ? Math.max(...perRealmCounts) < REALM_KINDS_MIN : false;
    if (shown.floor !== REALM_KINDS_MIN) throw new Error('「' + shown.name + '」的底线数字对不上');
    if (shown.belowFloor !== below) throw new Error('「' + shown.name + '」低于底线的标记对不上');
  }

  /* ② 每个人生阶段：碰到几种 / 单条命最多几种 / 主要在哪个境界 */
  if (coverage.stages.length !== STAGES.length) throw new Error('人生阶段的条数对不上');
  for (let index = 0; index < STAGES.length; index++) {
    const shown = coverage.stages[index];
    const stage = STAGES[index];
    if (shown.id !== stage.id || shown.name !== stage.name) throw new Error('人生阶段的顺序或名字对不上');
    const counts = stagePerLife.get(stage.id) || [];
    const total = counts.reduce((sum, n) => sum + n, 0);
    if (shown.kinds !== (stageKinds.get(stage.id)?.size ?? 0)) throw new Error('「' + shown.name + '」碰到几种内容对不上');
    if (shown.perLifeMax !== (counts.length ? Math.max(...counts) : 0)) throw new Error('「' + shown.name + '」单条命最多几种对不上');
    if (shown.perLifeAvg !== (counts.length ? Number((total / counts.length).toFixed(1)) : 0)) throw new Error('「' + shown.name + '」单条命平均几种对不上');
    const realms = [...(stageRealms.get(stage.id) || new Map()).entries()].sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]));
    if (shown.mainRealm !== (realms[0] ? (REALMS[realms[0][0]]?.name ?? String(realms[0][0])) : '—')) throw new Error('「' + shown.name + '」的主要境界对不上');
    if (shown.realms.length !== realms.length) throw new Error('「' + shown.name + '」的境界分布条数对不上');
    for (let row = 0; row < realms.length; row++) {
      if (shown.realms[row].realm !== realms[row][0] || shown.realms[row].count !== realms[row][1]) {
        throw new Error('「' + shown.name + '」的境界分布对不上');
      }
    }
  }

  /* ③ 最薄的那一段（相对说法）与晚年（与完备度盘点同一口径、同一底线） */
  const withContent = coverage.stages.filter(row => row.perLifeMax > 0);
  const thinnest = withContent.length
    ? withContent.reduce((min, row) => (row.perLifeMax < min.perLifeMax ? row : min)).id
    : null;
  if (coverage.thinnest !== thinnest) throw new Error('「最薄的那一段」对不上');
  const lateCards = new Set();
  for (const run of finished) {
    for (const row of run.issued || []) {
      if (row.age >= LATE_AGE) lateCards.add(row.event);
    }
  }
  if (coverage.late.age !== LATE_AGE) throw new Error('晚年的起点岁数对不上');
  if (coverage.late.kinds !== lateCards.size) throw new Error('晚年碰到的卡种数对不上');
  if (coverage.late.floor !== LATE_KINDS_MIN) throw new Error('晚年的底线数字对不上');
  if (coverage.late.belowFloor !== (lateCards.size < LATE_KINDS_MIN)) throw new Error('晚年低于底线的标记对不上');

  /* ④ 供给侧：规则层声明的那些卡，必须与「当前版本的事件表 + declarationOf」对得上 */
  const checkDeclared = (rows, expected) => {
    if (rows.length !== expected.length) throw new Error('声明闸管的卡的条数对不上');
    for (let index = 0; index < expected.length; index++) {
      const shown = rows[index];
      const want = expected[index];
      if (shown.name !== want.name) throw new Error('声明闸管的卡的顺序对不上');
      if (shown.total !== want.cards.length) throw new Error('「' + shown.name + '」声明了几张卡对不上');
      if (shown.hit !== want.hit.length) throw new Error('「' + shown.name + '」碰到几张卡对不上');
      if (shown.missed.length !== want.missed.length) throw new Error('「' + shown.name + '」没碰到的卡条数对不上');
      for (let row = 0; row < want.missed.length; row++) {
        if (shown.missed[row].id !== want.missed[row]) throw new Error('「' + shown.name + '」没碰到的卡清单对不上');
      }
    }
  };
  checkDeclared(coverage.declaredStages, STAGES.map(stage => {
    const cards = universe.filter(id => {
      const decl = declarationOf(id);
      return decl && decl.stage === stage.id;
    });
    const hit = cards.filter(id => hitCards.has(id));
    return { name: stage.name, cards, hit, missed: cards.filter(id => !hitCards.has(id)) };
  }));
  checkDeclared(coverage.declaredRealms, REALMS.map((row, realm) => {
    const cards = universe.filter(id => {
      const decl = declarationOf(id);
      return decl && decl.realm && realm >= decl.realm[0] && realm <= decl.realm[1];
    });
    const hit = cards.filter(id => hitCards.has(id));
    return { name: row.name, cards, hit, missed: cards.filter(id => !hitCards.has(id)) };
  }));
  return true;
}

/* ── 角色进度（一批命怎么往上走） ─────────────────────────────────────────── */

/**
 * 「角色进度」—— 一批命**怎么往上走**：谁卡在哪一境、每一境待了多久。
 *
 * ⚠ 三个数，口径都写在明面上：
 *   · **到达的命数** —— 有多少条命真的到了这一境（漏斗：谁卡在下面）；
 *   · **到达年龄中位** —— 什么时候到的（与批量统计的「各境到达年龄」同一份）；
 *   · **在这一境待了几年** —— 到达这一境 → 到达下一境，中位数与最长那条。
 *   ⚠ 「待了几年」是**每条命先算差值再取中位**，不是「两个中位数相减」。
 *
 * ⚠ 另有一段「突破间隔」：同一境界段的突破卡在这条命里隔了多少年，
 *   **与 `scripts/audit-metrics.mjs` 的 `spanMedianOf` 同一口径**
 *   （那边量的是「最差的一条命」，这里量的是「多数人」—— 两者都留着，各说各的）。
 */
export function buildProgress(runs = []) {
  const finished = runs.filter(run => !run.error);
  const median = values => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  };

  /* ① 每条命：什么时候到的哪一境、在每一境待了多久 */
  const reachAges = REALMS.map(() => []);
  const dwellAges = REALMS.map(() => []);
  const tierSpans = new Map();

  for (const run of finished) {
    const state = run.state;
    const reached = new Map();
    for (const row of state.journal || []) {
      if (row.kind !== 'breakthrough') continue;
      const realm = Number(row.toRealm);
      if (!Number.isFinite(realm) || realm < 0 || realm >= REALMS.length) continue;
      const age = ageAt(state, row.month);
      if (!reached.has(realm) || age < reached.get(realm)) reached.set(realm, age);
    }
    const startAge = state.birth?.startAge ?? 0;
    for (let realm = 0; realm < REALMS.length; realm++) {
      if (realm === 0) {
        /* 凡身：人人都从出生开始。 */
        reachAges[0].push(startAge);
        if (reached.has(1)) dwellAges[0].push(reached.get(1) - startAge);
        continue;
      }
      if (!reached.has(realm)) continue;
      reachAges[realm].push(reached.get(realm));
      if (reached.has(realm + 1)) dwellAges[realm].push(reached.get(realm + 1) - reached.get(realm));
    }

    /* 突破间隔：同一 tier 的突破卡在这条命里隔了多少年（与审计脚本同口径）。 */
    const byTier = new Map();
    for (const row of run.issued || []) {
      if (!row.event || row.event.indexOf('breakthrough_') !== 0) continue;
      const tier = row.event.split('_')[1];
      if (!tier) continue;
      if (!byTier.has(tier)) byTier.set(tier, []);
      byTier.get(tier).push(row.age);
    }
    for (const [tier, ages] of byTier) {
      const span = Math.max(...ages) - Math.min(...ages);
      if (span <= 0) continue;
      if (!tierSpans.has(tier)) tierSpans.set(tier, []);
      tierSpans.get(tier).push(span);
    }
  }

  const realms = REALMS.map((row, realm) => ({
    realm,
    name: row.name,
    /** 有多少条命到了这一境（凡身人人都在）。 */
    reached: reachAges[realm].length,
    /** 占这批命的多少。 */
    share: finished.length ? reachAges[realm].length / finished.length : 0,
    /** 到达这一境的年龄中位（凡身 = 出生年龄）。 */
    medianAge: realm === 0 ? null : median(reachAges[realm]),
    /** 在这一境待了几年：中位 / 最长那条。 */
    dwellMedian: median(dwellAges[realm]),
    dwellMax: dwellAges[realm].length ? Math.max(...dwellAges[realm]) : null,
  }));

  const spans = [...tierSpans.entries()]
    .sort((a, b) => (Number(a[0]) - Number(b[0])))
    .map(([tier, list]) => {
      const value = median(list);
      return {
        tier: String(tier),
        name: REALMS[Number(tier)]?.name ?? String(tier),
        median: value,
        count: list.length,
        target: SPAN_TARGET,
        ok: value !== null && value <= SPAN_TARGET,
      };
    });

  return {
    lives: runs.length,
    finished: finished.length,
    realms,
    spans,
    spanWorst: spans.length ? Math.max(...spans.map(row => row.median ?? 0)) : 0,
    spanTarget: SPAN_TARGET,
  };
}

/**
 * 真门禁断言：「角色进度」必须能由那批命**逐条重算复现**。
 *
 * ⚠ 这里的重算**不调用 `buildProgress`** —— 自己再算一遍，才算数。
 */
export function assertProgressMatchesRuns(progress, runs = []) {
  const finished = runs.filter(run => !run.error);
  if (progress.lives !== runs.length) throw new Error('角色进度的命数对不上');
  if (progress.finished !== finished.length) throw new Error('角色进度的完成数对不上');
  const median = values => {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  };

  const reachAges = REALMS.map(() => []);
  const dwellAges = REALMS.map(() => []);
  const tierSpans = new Map();
  for (const run of finished) {
    const state = run.state;
    const reached = new Map();
    for (const row of state.journal || []) {
      if (row.kind !== 'breakthrough') continue;
      const realm = Number(row.toRealm);
      if (!Number.isFinite(realm) || realm < 0 || realm >= REALMS.length) continue;
      const age = ageAt(state, row.month);
      if (!reached.has(realm) || age < reached.get(realm)) reached.set(realm, age);
    }
    const startAge = state.birth?.startAge ?? 0;
    for (let realm = 0; realm < REALMS.length; realm++) {
      if (realm === 0) {
        reachAges[0].push(startAge);
        if (reached.has(1)) dwellAges[0].push(reached.get(1) - startAge);
        continue;
      }
      if (!reached.has(realm)) continue;
      reachAges[realm].push(reached.get(realm));
      if (reached.has(realm + 1)) dwellAges[realm].push(reached.get(realm + 1) - reached.get(realm));
    }
    const byTier = new Map();
    for (const row of run.issued || []) {
      if (!row.event || row.event.indexOf('breakthrough_') !== 0) continue;
      const tier = row.event.split('_')[1];
      if (!tier) continue;
      if (!byTier.has(tier)) byTier.set(tier, []);
      byTier.get(tier).push(row.age);
    }
    for (const [tier, ages] of byTier) {
      const span = Math.max(...ages) - Math.min(...ages);
      if (span <= 0) continue;
      if (!tierSpans.has(tier)) tierSpans.set(tier, []);
      tierSpans.get(tier).push(span);
    }
  }

  if (progress.realms.length !== REALMS.length) throw new Error('角色进度的境界条数对不上');
  for (let realm = 0; realm < REALMS.length; realm++) {
    const shown = progress.realms[realm];
    if (shown.realm !== realm || shown.name !== REALMS[realm].name) throw new Error('角色进度的境界顺序对不上');
    if (shown.reached !== reachAges[realm].length) throw new Error('「' + shown.name + '」到达的命数对不上');
    const share = finished.length ? reachAges[realm].length / finished.length : 0;
    if (shown.share !== share) throw new Error('「' + shown.name + '」的占比对不上');
    const expectedAge = realm === 0 ? null : median(reachAges[realm]);
    if (shown.medianAge !== expectedAge) throw new Error('「' + shown.name + '」到达年龄中位对不上');
    if (shown.dwellMedian !== median(dwellAges[realm])) throw new Error('「' + shown.name + '」停留年数中位对不上');
    const expectedMax = dwellAges[realm].length ? Math.max(...dwellAges[realm]) : null;
    if (shown.dwellMax !== expectedMax) throw new Error('「' + shown.name + '」停留年数最长那条对不上');
  }

  if (progress.spans.length !== tierSpans.size) throw new Error('突破间隔的条数对不上');
  const expectedSpans = [...tierSpans.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  for (let index = 0; index < expectedSpans.length; index++) {
    const [tier, list] = expectedSpans[index];
    const shown = progress.spans[index];
    if (shown.tier !== String(tier)) throw new Error('突破间隔的顺序对不上');
    if (shown.median !== median(list)) throw new Error('突破间隔的中位数对不上');
    if (shown.count !== list.length) throw new Error('突破间隔的样本数对不上');
    if (shown.target !== SPAN_TARGET) throw new Error('突破间隔的目标值对不上');
    if (shown.ok !== ((shown.median ?? Infinity) <= SPAN_TARGET)) throw new Error('突破间隔的达标标记对不上');
  }
  if (progress.spanTarget !== SPAN_TARGET) throw new Error('突破间隔的目标值对不上');
  return true;
}

/* ── 问题清单（跑完批，一眼看到有哪几类问题） ───────────────────────────── */

/**
 * 把「跑一批」的结果收成一份**问题清单**。
 *
 * ⚠ 为什么要有这一层：跑完批以后，数据散在流水页的好几块里
 *   （内容覆盖 / 角色进度 / 按阶段境界）⇒ 要自己扫才知道「有什么问题」。
 *   ⇒ 这里只做**汇总**：每一项都写着「几处」「是哪几个」「在哪看」，
 *   **一个数都不自己算**（全部取自上面三块已经算好的数据）。
 *
 * ⚠ 每一条都要写清**它到底说明什么** ——
 *   「这批命一次都没选过」≠「这条路是死的」（可能是这批命没走到那儿）。
 *   ⇒ 把话说准，别让人照着去修不存在的问题。
 *
 * @param {object} sources `{ coverage, stageCoverage, progress }`
 */
export function buildFindings({ coverage, stageCoverage, progress } = {}) {
  const findings = [];
  const push = (id, severity, title, count, unit, names, where, note) => {
    if (!count) return;
    findings.push({ id, severity, title, count, unit, names, where, note });
  };

  if (coverage) {
    /* ① 剧情卡：一族都没走到（当前版本）—— 这才是疑似死角。
     * ⚠ 数的是**族**不是张：同一个族的几张卡算一族。 */
    const current = coverage.cards.buckets.find(bucket => bucket.id === 'current');
    const sceneRows = (current?.missed || []).filter(row => row.kind === 'scene');
    const sceneFamilies = [...new Set(sceneRows.map(row => row.family))];
    push('scene-dead', 'warn', '有剧情卡一族都没走到', sceneFamilies.length, '族',
      sceneFamilies.slice(0, 8).map(family => {
        const row = sceneRows.find(item => item.family === family);
        return (row ? row.label : family) + '（' + sceneRows.filter(item => item.family === family).length + ' 张）';
      }),
      '内容覆盖 · 整族没走到',
      '同一场景的所有变体都没出现 ⇒ 疑似死角。⚠ 只是**这批命**没走到，得多跑几批或换随机探索再验。');

    /* ② 选项：这批命一次都没选过 —— 死路候选，但**不等于**死路。 */
    push('unused-choice', 'warn', '有些选项这批命一次都没选过', coverage.choices.unused.length, '个',
      coverage.choices.unused.slice(0, 6).map(row => row.label),
      '内容覆盖 · 从没被选过的选项',
      '⚠ 不等于死路 —— 可能是这批命没走到那张卡。');

    /* ③ 角儿：一次都没遇到过的那些。 */
    push('never-met', 'warn', '有些角儿这批命一次都没遇到', coverage.people.neverMet.length, '个',
      coverage.people.neverMet.slice(0, 6).map(row => row.label),
      '内容覆盖 · 角儿',
      '位置在、但没人碰上 ⇒ 看看是不是藏得太深。');

    /* ④ 结局 / 道具 / 地名：全表里没碰到过的。 */
    push('unreached-ending', 'warn', '有些结局没走到', coverage.endings.missed.length, '种',
      coverage.endings.missed.slice(0, 6).map(row => row.title),
      '内容覆盖 · 道具 / 地名 / 结局', '结局是玩家真正看得到的东西 ⇒ 没走到的那些值得一个个看。');
    push('unreached-item', 'note', '有些道具没碰到过', coverage.items.missed.length, '件',
      coverage.items.missed.slice(0, 6).map(row => row.name),
      '内容覆盖 · 道具 / 地名 / 结局', '道具少是常态，先看这一批的取法再说。');
    push('unvisited-place', 'note', '有些地名没去过', coverage.places.missed.length, '个',
      coverage.places.missed.slice(0, 6).map(row => row.id),
      '内容覆盖 · 道具 / 地名 / 结局', '⚠ 地名覆盖是**采样**还原的（引擎只留「当前在哪」）。');
  }

  if (stageCoverage) {
    /* ⑤ 境界：低于项目底线的那些（底线与完备度盘点同源）。 */
    const thin = stageCoverage.realms.filter(row => row.belowFloor);
    push('thin-realm', 'warn', '有些境界的内容低于底线', thin.length, '境',
      thin.map(row => row.name),
      '按阶段 / 境界 · 按境界段',
      '一条命在那一境最多碰到的内容种数，低于项目自己定的底线（与完备度盘点同一个数）。');
    /* ⑥ 人生阶段：最薄的那一段（相对说法，不自己编底线）。 */
    const thinnest = stageCoverage.stages.find(row => row.id === stageCoverage.thinnest);
    push('thin-stage', 'warn', '有一段人生内容最薄', thinnest ? 1 : 0, '段',
      thinnest ? [thinnest.name] : [],
      '按阶段 / 境界 · 按人生阶段',
      '⚠ 人生阶段这一层项目还没定底线 ⇒ 只说「最薄」，不自己编一个数。');
  }

  if (progress) {
    /* ⑦ 突破间隔：超过目标值的那几段（已登记为已知缺口，不许自己硬改）。 */
    const over = progress.spans.filter(row => !row.ok);
    push('span-over', 'warn', '有些境界段的突破间隔超标', over.length, '段',
      over.map(row => row.name),
      '角色进度 · 突破间隔',
      '目标 ' + progress.spanTarget + ' 年。⚠ 实测未达标，已登记为**已知缺口**（改它要走行为变更流程）。');
    /* ⑧ 没有人到达过的境界。 */
    const unreached = progress.realms.filter(row => row.reached === 0);
    push('unreached-realm', 'warn', '有些境界一条命都没到过', unreached.length, '境',
      unreached.map(row => row.name),
      '角色进度 · 各境推进',
      '⚠ 这批命里没人走那么远 —— 先看随机探索那一侧，别急着判定内容问题。');
  }

  return findings;
}

/**
 * 真门禁断言：问题清单里的每一条，数字与出处都必须与源头对得上。
 *
 * ⚠ 这里的重算**不调用 `buildFindings`** —— 自己再数一遍，才算数。
 */
export function assertFindingsMatchSources(findings, sources = {}) {
  const { coverage, stageCoverage, progress } = sources;
  const expected = [];
  if (coverage) {
    const current = coverage.cards.buckets.find(bucket => bucket.id === 'current');
    const sceneRows = (current?.missed || []).filter(row => row.kind === 'scene');
    const sceneFamilies = [...new Set(sceneRows.map(row => row.family))];
    if (sceneFamilies.length) expected.push({ id: 'scene-dead', count: sceneFamilies.length });
    if (coverage.choices.unused.length) expected.push({ id: 'unused-choice', count: coverage.choices.unused.length });
    if (coverage.people.neverMet.length) expected.push({ id: 'never-met', count: coverage.people.neverMet.length });
    if (coverage.endings.missed.length) expected.push({ id: 'unreached-ending', count: coverage.endings.missed.length });
    if (coverage.items.missed.length) expected.push({ id: 'unreached-item', count: coverage.items.missed.length });
    if (coverage.places.missed.length) expected.push({ id: 'unvisited-place', count: coverage.places.missed.length });
  }
  if (stageCoverage) {
    const thin = stageCoverage.realms.filter(row => row.belowFloor);
    if (thin.length) expected.push({ id: 'thin-realm', count: thin.length });
    if (stageCoverage.thinnest) expected.push({ id: 'thin-stage', count: 1 });
  }
  if (progress) {
    const over = progress.spans.filter(row => !row.ok);
    if (over.length) expected.push({ id: 'span-over', count: over.length });
    const unreached = progress.realms.filter(row => row.reached === 0);
    if (unreached.length) expected.push({ id: 'unreached-realm', count: unreached.length });
  }
  if (findings.length !== expected.length) throw new Error('问题清单的条数对不上');
  for (let index = 0; index < expected.length; index++) {
    if (findings[index].id !== expected[index].id) throw new Error('问题清单的顺序对不上');
    if (findings[index].count !== expected[index].count) throw new Error('「' + findings[index].title + '」的数量对不上');
    if (!findings[index].where) throw new Error('「' + findings[index].title + '」没写「在哪看」');
    if (!findings[index].note) throw new Error('「' + findings[index].title + '」没写「这说明什么」');
  }
  return true;
}

/* ── 与上一次跑批比（改完内容再跑，看变化） ─────────────────────────────── */

/**
 * 要拿来比的关键数字 —— **每一项写清「变大是好事还是坏事」**。
 *
 * ⚠ 方向不一样，比的时候不能一律当「多了就好」：
 *   覆盖类（剧情卡 / 结局 / 道具 / 地名 / 到境人数）**越多越好**；
 *   缺口类（一族没走到 / 没选过的选项 / 没遇到的角儿 / 没走到的结局）**越少越好**。
 */
export const SNAPSHOT_METRICS = [
  { key: 'cards', label: '剧情卡（当前版本）', better: 'up' },
  { key: 'endings', label: '结局种类', better: 'up' },
  { key: 'items', label: '道具命中', better: 'up' },
  { key: 'places', label: '地名', better: 'up' },
  { key: 'realm1', label: '到炼气的命', better: 'up' },
  { key: 'realm2', label: '到筑基的命', better: 'up' },
  { key: 'realm3', label: '到金丹的命', better: 'up' },
  { key: 'realm4', label: '到元婴的命', better: 'up' },
  { key: 'sceneFamilies', label: '一族都没走到', better: 'down' },
  { key: 'unusedChoices', label: '从没被选过的选项', better: 'down' },
  { key: 'neverMet', label: '从没遇到的角儿', better: 'down' },
  { key: 'unreachedEndings', label: '没走到的结局', better: 'down' },
];

/**
 * 把一批命的结果收成**一份可比的小快照**。
 *
 * ⚠ 数字全部取自已算好的数据（内容覆盖 / 角色进度），这里**不新算任何规则**。
 * ⚠ 只收「会随内容改动而变」的量 —— 纯随机的量（抉择总数之类）不放进来，
 *   免得每次都比出「变了」，看久了就麻木了。
 *
 * @param {object} sources `{ coverage, stageCoverage, progress }`
 * @param {object} meta `{ at, mode, count }`
 */
export function buildBatchSnapshot(sources = {}, meta = {}) {
  const { coverage, progress } = sources;
  const metrics = {};
  if (coverage) {
    const current = coverage.cards.buckets.find(bucket => bucket.id === 'current');
    metrics.cards = current ? current.hit : 0;
    metrics.endings = coverage.endings.hit;
    metrics.items = coverage.items.hit;
    metrics.places = coverage.places.hit;
    const sceneRows = (current?.missed || []).filter(row => row.kind === 'scene');
    metrics.sceneFamilies = new Set(sceneRows.map(row => row.family)).size;
    metrics.unusedChoices = coverage.choices.unused.length;
    metrics.neverMet = coverage.people.neverMet.length;
    metrics.unreachedEndings = coverage.endings.missed.length;
  }
  if (progress) {
    for (const row of progress.realms) {
      if (row.realm >= 1) metrics['realm' + row.realm] = row.reached;
    }
  }
  return {
    at: meta.at ?? null,
    mode: meta.mode ?? 'policy',
    count: meta.count ?? 0,
    metrics,
  };
}

/**
 * 比两份快照 ⇒ 只报**变了**的那些。
 *
 * @param {object|null} previous 上一次的那份
 * @param {object} next 这一次的那份
 * @returns {object[]} `{key, label, before, after, delta, better, good}` 列表
 */
export function diffBatchSnapshots(previous, next) {
  if (!previous || !previous.metrics) return [];
  const rows = [];
  for (const metric of SNAPSHOT_METRICS) {
    const before = previous.metrics[metric.key];
    const after = next?.metrics ? next.metrics[metric.key] : undefined;
    if (before === undefined || after === undefined) continue;
    if (before === after) continue;
    const delta = after - before;
    rows.push({
      key: metric.key,
      label: metric.label,
      before,
      after,
      delta,
      better: metric.better,
      /* 「变好了吗」：方向决定，不是绝对值决定。 */
      good: metric.better === 'up' ? delta > 0 : delta < 0,
    });
  }
  return rows;
}

/**
 * 真门禁断言：快照里的每个数字都必须与源头相等。
 */
export function assertBatchSnapshotMatchesSources(snapshot, sources = {}) {
  const expected = buildBatchSnapshot(sources, { at: snapshot.at, mode: snapshot.mode, count: snapshot.count });
  for (const metric of SNAPSHOT_METRICS) {
    const want = expected.metrics[metric.key];
    const got = snapshot.metrics ? snapshot.metrics[metric.key] : undefined;
    if (want === undefined) {
      if (got !== undefined) throw new Error('快照里多了一个不该有的「' + metric.label + '」');
      continue;
    }
    if (got !== want) throw new Error('快照里的「' + metric.label + '」对不上');
  }
  /* ⚠ 快照里不许有**没登记**的项（多一个自己编的数 ⇒ 比的时候会被当成真的）。 */
  for (const key of Object.keys(snapshot.metrics || {})) {
    if (!SNAPSHOT_METRICS.some(metric => metric.key === key)) throw new Error('快照里多了一个没登记的项：' + key);
  }
  return true;
}

/**
 * 真门禁断言：改动必须**被差异看出来**（不然「与上一次比」就是假的）。
 *
 * @param {object} previous 上一次的那份
 * @param {object} next 这一次的那份
 * @param {object[]} [rows] 面板画出来的那份差异（不给就自己算）
 *   ⚠ 传进来是为了让门禁能**把画出来的差异改坏** ⇒ 断言必须报红。
 */
export function assertBatchDiffDetectsChange(previous, next, rows = diffBatchSnapshots(previous, next)) {
  for (const metric of SNAPSHOT_METRICS) {
    const before = previous?.metrics?.[metric.key];
    const after = next?.metrics?.[metric.key];
    if (before === undefined || after === undefined || before === after) continue;
    const row = rows.find(item => item.key === metric.key);
    if (!row) throw new Error('「' + metric.label + '」变了，差异里却没有它');
    if (row.before !== before || row.after !== after) throw new Error('「' + metric.label + '」的差异数字对不上');
    if (row.delta !== after - before) throw new Error('「' + metric.label + '」的差值对不上');
    if (row.label !== metric.label) throw new Error('「' + metric.label + '」的名字对不上');
    if (row.better !== metric.better) throw new Error('「' + metric.label + '」的方向对不上');
    /* ⚠ 「变好了吗」由**方向**决定，不是看绝对值。 */
    const wantGood = metric.better === 'up' ? row.delta > 0 : row.delta < 0;
    if (row.good !== wantGood) throw new Error('「' + metric.label + '」的「变好了吗」对不上');
  }
  /* ⚠ 反过来：根本没变的项不许出现在差异里（不然会一直「有变化」，看久了就麻木了）。 */
  for (const row of rows) {
    const before = previous?.metrics?.[row.key];
    const after = next?.metrics?.[row.key];
    if (before === undefined || after === undefined) continue;
    if (before === after) throw new Error('「' + row.label + '」根本没变，却出现在差异里');
  }
  /* 什么都没变 ⇒ 差异必须为空。 */
  const unchanged = diffBatchSnapshots(previous, { ...next, metrics: { ...(previous?.metrics || {}) } });
  if (unchanged.length) throw new Error('什么都没变，差异却不为空');
  return true;
}
