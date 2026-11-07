import assert from 'node:assert/strict';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { startServer, projectRoot } from './serve.mjs';
import { launchBrowser, delay } from './lib/browser.mjs';
import { createRun, options, choose, advance } from '../packages/adventure/engine.js';
import { decide } from './lib/decide-policy.js';
import { GEOGRAPHY } from '../content/cultivation-world.js';
import { ITEMS } from '../content/adventure.js';
import {
  assertAxisMatchesDecisions, assertDecisionMatchesOptions, assertCurveMatchesState,
  assertSnapshotMatchesState, buildSnapshot,
  assertMapMatchesGeography, buildMap,
  assertItemsMatchInventory, assertItemsTimeline, buildItems,
  assertWorldMatchesState, buildWorld,
  assertPeopleMatchState, buildPeople,
  assertJournalMatchesState, buildJournal,
  assertBatchMatchesRuns, buildBatch,
  assertCoverageMatchesRuns, buildCoverage,
  assertComparisonMatchesRuns, buildComparison,
  assertStageCoverageMatchesRuns, buildStageCoverage,
  assertProgressMatchesRuns, buildProgress,
  assertFindingsMatchSources, buildFindings,
  buildBatchSnapshot, diffBatchSnapshots, assertBatchSnapshotMatchesSources, assertBatchDiffDetectsChange, SNAPSHOT_METRICS,
} from '../apps/viz/model.js';
import { HISTORY_KEY } from '../apps/viz/history.js';
import { ADVENTURE_KEY } from '../packages/adventure/store.js';
import { runBatch } from '../apps/viz/batch.js';
import { REALM_KINDS_MIN, LATE_AGE, LATE_KINDS_MIN } from '../scripts/lib/completeness-limits.js';
import { LIMITS } from '../scripts/audit-completeness.mjs';

/**
 * verify-viz-panel.mjs —— 开发者面板（`apps/viz/`）的真门禁
 * ============================================================================
 *
 * ## 这道门禁守什么
 * ----------------
 * 面板是**给我们自己看**的工具，它最大的风险不是「画得丑」，而是
 * **「它显示的跟游戏里发生的不是一回事」** —— 一旦面板自己编了一套数据，
 * 它就会安静地骗人，比没有还糟。
 *
 * ⇒ 这道门禁的核心断言只有一句：
 *   **面板上显示的，必须逐条等于引擎当场说的。**
 *
 * ## 它现在守着多少条
 * ------------------
 *   ① **逐步走完整条命**：每一张卡的每个选项（能不能点 / 代价 / 把握 /
 *      为什么点不了）必须与 `options(state)` 逐条全等；
 *   ② 跑完一生后，轴上的每一个抉择点必须与 `state.decisions` 逐条全等；
 *   ③ 面板自己记的步数必须与引擎记的抉择数相等；
 *   ④ 世界结构：四块大陆、通路、地名 / 描述 / 特产、封路、走过、
 *      「现在去哪儿」的路费 / 耗时 / 为什么去不了 —— 全部与内容表和规则层相等；
 *   ⑤ 道具：持有列表与 `state.inventory` 逐件相等；
 *      进出时间线必须能被**独立重推**出来（引擎没有结构化字段，面板是采样还原的）；
 *   ⑥ 世界观：宗门 / 功法倍率 / 境界 —— 全部与引擎相等（倍率必须是规则层算的那个）；
 *   ⑦ 人物：主角 / 家人 / 后辈 / 宗门职务的人数、名字、状态、羁绊 —— 与引擎相等；
 *   ⑧ 流水：日志与抉择的每一条（编号 / 月份 / 类型 / 标题 / 正文 / 成败 / 把握值）；
 *   ⑨ 批量实测：统计必须能由那批命**逐条重算复现**；
 *   ⑩ 页签：六个页签都能点开、各自内容对得上、**且一次只渲染当前页签**；
 *   ⑪ 布局：主区单列（右边没有决策卡那一列）；决策区收在页签里且不悬浮；页签区在固定区下方；
 *   ⑫ 内容覆盖：剧情卡**按规则版本分桶**（当前版本 / 旧版本专属 / 经典故事层），
 *      「没走到」要分清是**整族没走到**还是**同场景的其它变体**，
 *      三张「没出现」清单（卡 / 道具 / 地名 / 结局）必须与那批命逐条对得上；
 *   ⑬ 两种玩法并排比：固定偏好 vs 随机探索的**差集**（只谁走到 / 两种都没走到）、
 *      角儿差异、指标表 —— 必须能由那两批命**独立重算**复现；
 *   ⑭ 按阶段 / 境界：每个境界段、每个人生阶段**碰到几种内容**、
 *      一个玩家实际最多能碰到几种、发卡年龄中位；以及**阶段闸管的那些卡**
 *      （供给侧，用的是阶段闸同一份声明）—— 必须能由那批命**独立重算**复现；
 *   ⑮ 角色进度：每境**到达多少人**（漏斗：谁卡在哪一境）、到达年龄中位、
 *      「在这一境待了几年」、突破间隔 —— 必须能由那批命**独立重算**复现，
 *      且「到达年龄」与批量统计的「各境到达年龄」**同一口径**（不许两个数打架）。
 *   ⑯ 与上一次跑批比：快照里的每个数必须与源头相等；改动必须被差异看出来
 *      （方向也要对：覆盖类越多越好、缺口类越少越好；没变的项不许冒出来）；
 *      第一次跑批必须**明说「还没有可比的」**；本地存档键不许撞游戏的存档键。
 *
 * ## ⚠ 反向验证（不许省）
 * ----------------------
 * 断言本身也要被验证 —— 拿**故意改坏**的数据喂进去，必须**报红**。
 * 只测「好数据能过」的门禁是假门禁（断言写错了也照样绿）。
 * 下面 `reverseChecks()` 每次跑都真的把坏数据塞进去，确认断言会炸。
 *
 * ## ⚠ 为什么是「逐步走」而不是「只看第一张卡」
 * -------------------------------------------
 * 第一张卡的选项可能**全都点得了** ⇒「为什么点不了」那一栏是空的
 * ⇒ 把它抹掉也测不出来（这正是先前的假门禁：改坏那一栏，门禁照样绿）。
 * ⇒ 一路走到遇见「有选项点不了」的卡为止，并断言**至少走过一张**。
 */

const out = join(projectRoot, 'artifacts', 'viz-panel');
await mkdir(out, { recursive: true });
const report = { startedAt: new Date().toISOString(), scope: 'Real browser; the panel runs the same engine code as the game', checks: [] };
let server, browser, page;

/** 引擎给的选项压成面板显示的形状（与 `apps/viz/model.js` 的 presentOption 同口径）。 */
const shape = option => ({
  id: option.id,
  label: option.label,
  hint: option.hint,
  enabled: option.enabled,
  reasons: option.reasons ? [...option.reasons] : [],
  chance: option.chance ?? null,
  cost: option.cost && Object.keys(option.cost).length ? { ...option.cost } : null,
  months: option.months ?? 0,
});

/**
 * 布局断言：**右边不许再有那一列**，页签区要顶到页面右边。
 *
 * ⚠ 用户原话：「我不需要页面左侧悬浮的决策框」。
 *   决策内容已经收进「当前状态」页 ⇒ 主区是单列 ⇒ 页签区右边缘贴着页面右边缘。
 *   右边若又冒出一列（决策卡没搬走），这条就报红。
 */
function assertDecisionBoxPlacement(layout) {
  if (!(layout.panelRight >= layout.viewportRight - 60)) throw new Error('右侧还有一列（决策卡没搬走）');
  if (!(layout.panelTop >= layout.trackTop - 1)) throw new Error('页签区不在人生进程面板下方');
  return true;
}

/**
 * 布局断言（第二条）：页签区必须在固定区（轴 + 曲线）**下面**。
 *
 * ⚠ 用户拍板的分层：上面是操作层（轴与曲线一直都在），
 *   下面是检视层（页签）⇒ 页签区被挪到轴上面就报红。
 */
function assertTabsBelowTrack(layout) {
  if (!(layout.panelTop >= layout.trackBottom - 1)) throw new Error('页签区不在固定区下方');
  return true;
}

/**
 * 布局断言（第三条）：决策内容必须**收在页签里**，而且不许悬浮。
 *
 * ⚠ 决策区以前是右边一个独立的框（`position: sticky`）
 *   ⇒ 窄屏单列布局时它浮在页面左边、盖住下面的内容。
 *   ⇒ 现在它只出现在「当前状态」页里，跟着页面滚走。
 */
function assertDecisionInsideTabs(dom) {
  if (!dom.insideTabPanel) throw new Error('决策区不在页签区里');
  if (dom.rightColumnPresent) throw new Error('右边还有一列（决策卡没搬走）');
  if (dom.position === 'sticky' || dom.position === 'fixed') throw new Error('决策区又变回悬浮的了');
  return true;
}

/**
 * DOM 比对断言：页面文字里必须**出现**这些内容。
 *
 * ⚠ 这是「页面上真的画出来了」的那一层 —— 光比数据不够：
 *   数据对了但没画出来，也等于没做。
 */
function assertDomContainsAll(text, needles, label) {
  for (const needle of needles) {
    if (!needle) continue;
    if (!String(text).includes(needle)) throw new Error(label + ' 里少了「' + needle + '」');
  }
  return true;
}

/**
 * 在 Node 侧跑完一条命（与浏览器同一份 decide 策略）。
 * ⇒ 门禁拿到的这条命，和面板跑的是同一批数据。
 */
function runLife(seed, spec) {
  const state = createRun({ seed, rulesVersion: 12 });
  let guard = 0;
  try {
    while (state.phase === 'life' && guard++ < 400) {
      while (state.phase === 'life' && !state.pending) {
        if (!advance(state, 1)) break;
      }
      if (state.phase !== 'life') break;
      const available = options(state).filter(option => option.enabled);
      if (!available.length) break;
      const want = decide(state, spec);
      const pick = (want && available.find(option => option.id === want.id)) || available[0];
      choose(state, pick.id);
    }
  } catch (error) {
    return { state, error };
  }
  return { state, error: null };
}

/**
 * 反向验证：故意改坏一份数据，确认断言真的会报红。
 * ⚠ 每一条都要**真的抛错**才算通过 —— 断言写成空函数也会「不抛」。
 */
async function reverseChecks() {
  const truth = [{ event: 'a', choice: 'x', month: 10, success: true, chance: 50 }, { event: 'b', choice: 'y', month: 20, success: false, chance: 30 }];
  const good = { points: truth.map((row, index) => ({ index, month: row.month, event: row.event, choice: row.choice })) };

  /* ① 少一个抉择点 —— 必须报红 */
  assert.throws(() => assertAxisMatchesDecisions({ points: good.points.slice(0, 1) }, truth), /抉择点有 1 个，引擎记了 2 个/);
  /* ② 月份错位 —— 必须报红 */
  assert.throws(() => assertAxisMatchesDecisions({ points: good.points.map(point => ({ ...point, month: point.month + 1 })) }, truth), /月份对不上/);
  /* ③ 选了什么对不上 —— 必须报红 */
  assert.throws(() => assertAxisMatchesDecisions({ points: good.points.map((point, index) => ({ ...point, choice: index ? 'z' : point.choice })) }, truth), /选择对不上/);

  const offered = [
    { id: 'a', label: '甲', hint: '', enabled: true, reasons: [], chance: 60, cost: null, months: 3 },
    { id: 'b', label: '乙', hint: '', enabled: false, reasons: ['还差 4 灵石'], chance: null, cost: null, months: 0 },
  ];
  /* ④ 决策框说「能点」，引擎说「点不了」 —— 必须报红 */
  assert.throws(() => assertDecisionMatchesOptions({ offered: [offered[0], { ...offered[1], enabled: true, reasons: [] }] }, offered), /能不能点|为什么点不了/);
  /* ⑤ 「为什么点不了」的理由被抹掉 —— 必须报红（这一条曾经是假门禁） */
  assert.throws(() => assertDecisionMatchesOptions({ offered: [offered[0], { ...offered[1], reasons: [] }] }, offered), /为什么点不了/);
  /* ⑥ 把握值被改 —— 必须报红 */
  assert.throws(() => assertDecisionMatchesOptions({ offered: [{ ...offered[0], chance: 99 }] }, [offered[0]]), /把握值对不上/);
  /* ⑦ 选项文字被改 —— 必须报红 */
  assert.throws(() => assertDecisionMatchesOptions({ offered: [{ ...offered[0], label: '甲（自己加的字）' }] }, [offered[0]]), /文字对不上/);

  /* ⑧ 好数据必须通过（否则「见错误就报红」的断言没有意义） */
  assert.equal(assertAxisMatchesDecisions(good, truth), true);
  assert.equal(assertDecisionMatchesOptions({ offered: offered.map(shape) }, offered), true);

  /* ⑨ 曲线末端采样被改 —— 必须报红 */
  const fakeState = { month: 100, player: { insight: 10, courage: 20, empathy: 30, health: 40, mind: 50, stones: 7, realm: 2 } };
  const fakeRaw = [{ month: 100, insight: 10, courage: 20, empathy: 30, health: 40, mind: 50, stones: 7, realm: 2 }];
  assert.equal(assertCurveMatchesState(fakeRaw, fakeState), true);
  assert.throws(() => assertCurveMatchesState([{ ...fakeRaw[0], insight: 99 }], fakeState), /悟性与引擎对不上/);
  assert.throws(() => assertCurveMatchesState([{ ...fakeRaw[0], stones: 99 }], fakeState), /灵石与引擎对不上/);
  assert.throws(() => assertCurveMatchesState([{ ...fakeRaw[0], month: 3 }], fakeState), /月份与引擎对不上/);

  /* ⑩ 快照的属性或人物被改 —— 必须报红 */
  const realState = createRun({ seed: '反向验证用的种子', rulesVersion: 12 });
  const realSnapshot = buildSnapshot(realState);
  assert.equal(assertSnapshotMatchesState(realSnapshot, realState), true);
  assert.throws(() => assertSnapshotMatchesState({
    ...realSnapshot,
    attributes: realSnapshot.attributes.map(row => row.key === 'insight' ? { ...row, value: row.value + 1 } : row),
  }, realState), /悟性与引擎对不上/);
  assert.throws(() => assertSnapshotMatchesState({ ...realSnapshot, people: realSnapshot.people.slice(0, -1) }, realState), /人物数与引擎对不上/);

  /* ⑪ 布局被挪走 —— 必须报红 */
  const goodLayout = { trackRight: 1000, trackTop: 200, trackBottom: 800, panelLeft: 20, panelRight: 1580, panelTop: 900, viewportRight: 1600 };
  assert.equal(assertDecisionBoxPlacement(goodLayout), true);
  assert.equal(assertTabsBelowTrack(goodLayout), true);
  /* ⚠ 右边又冒出一列（页签区没顶到页面右边）⇒ 报红 */
  assert.throws(() => assertDecisionBoxPlacement({ ...goodLayout, panelRight: 900 }), /右侧还有一列/);
  assert.throws(() => assertDecisionBoxPlacement({ ...goodLayout, panelTop: 100 }), /页签区不在人生进程面板下方/);
  assert.throws(() => assertTabsBelowTrack({ ...goodLayout, panelTop: 100 }), /页签区不在固定区下方/);

  /* ⑪·三 决策区必须收在页签里、且不许悬浮（用户：「我不需要页面左侧悬浮的决策框」） */
  assert.equal(assertDecisionInsideTabs({ insideTabPanel: true, rightColumnPresent: false, position: 'static' }), true);
  assert.throws(() => assertDecisionInsideTabs({ insideTabPanel: false, rightColumnPresent: false, position: 'static' }), /不在页签区里/);
  assert.throws(() => assertDecisionInsideTabs({ insideTabPanel: true, rightColumnPresent: true, position: 'static' }), /右边还有一列/);
  assert.throws(() => assertDecisionInsideTabs({ insideTabPanel: true, rightColumnPresent: false, position: 'sticky' }), /又变回悬浮的了/);
  assert.throws(() => assertDecisionInsideTabs({ insideTabPanel: true, rightColumnPresent: false, position: 'fixed' }), /又变回悬浮的了/);

  /* ⑫ DOM 比对本身也要验：少一个字必须报红 */
  assert.equal(assertDomContainsAll('行囊：护身玉符', ['护身玉符'], '当前状态页'), true);
  assert.throws(() => assertDomContainsAll('行囊：护身玉符', ['护身玉符', '不存在的道具'], '当前状态页'), /少了「不存在的道具」/);

  /* ── 后面几组要用一条**真跑完**的命 ───────────────────────────────── */
  const spec = { path: 'orthodox', conduct: 'care', school: 'array', ending: 'dao' };
  const life = runLife('门禁反向验证用的种子', spec);
  assert.equal(life.error, null, '门禁用种子那条命不该出错：' + life.error);
  const state = life.state;

  /* ⑬ 地图：改坏大陆数 / 名字 / 地名 / 描述 / 特产 / 通路 / 封路 / 走过 / 路费 / 耗时 / 能不能去 / 理由 */
  const map = buildMap(state);
  assert.equal(assertMapMatchesGeography(map, state), true);
  assert.throws(() => assertMapMatchesGeography({ ...map, nodes: map.nodes.slice(1) }, state), /大陆数与内容表对不上/);
  assert.throws(() => assertMapMatchesGeography({ ...map, nodes: map.nodes.map(node => ({ ...node, name: '假的大陆名' })) }, state), /的名字对不上/);
  assert.throws(() => assertMapMatchesGeography({ ...map, nodes: map.nodes.map(node => node.places.length ? { ...node, places: [...node.places.slice(0, -1), '假地名'] } : node) }, state), /的地名对不上/);
  assert.throws(() => assertMapMatchesGeography({ ...map, nodes: map.nodes.map(node => ({ ...node, description: '假的描述' })) }, state), /的描述对不上/);
  assert.throws(() => assertMapMatchesGeography({ ...map, nodes: map.nodes.map(node => ({ ...node, specialty: '假的特产' })) }, state), /的特产对不上/);
  assert.throws(() => assertMapMatchesGeography({ ...map, edges: map.edges.slice(1) }, state), /通路数与内容表对不上/);
  const closedKey = (state.life?.cultivation?.closed || [])[0];
  if (closedKey) {
    assert.throws(() => assertMapMatchesGeography({ ...map, edges: map.edges.map(edge => edge.key === closedKey ? { ...edge, closed: false } : edge) }, state), /标成封路/);
  }
  const walkedKey = map.edges.find(edge => edge.walked)?.key;
  if (walkedKey) {
    assert.throws(() => assertMapMatchesGeography({ ...map, edges: map.edges.map(edge => edge.key === walkedKey ? { ...edge, walked: false } : edge) }, state), /标成走过/);
  }
  assert.ok(map.routes.length, '这条命至少该有一个「现在去哪儿」的目的地');
  assert.throws(() => assertMapMatchesGeography({ ...map, routes: map.routes.map(route => ({ ...route, fee: route.fee + 1 })) }, state), /的路费与规则层对不上/);
  assert.throws(() => assertMapMatchesGeography({ ...map, routes: map.routes.map(route => ({ ...route, months: route.months + 1 })) }, state), /的耗时与规则层对不上/);
  assert.throws(() => assertMapMatchesGeography({ ...map, routes: map.routes.map(route => ({ ...route, enabled: !route.enabled })) }, state), /的「能不能去」与规则层对不上/);
  assert.throws(() => assertMapMatchesGeography({ ...map, routes: map.routes.map(route => ({ ...route, reason: '（门禁塞进去的假理由）' })) }, state), /的「为什么去不了」与规则层对不上/);

  /* ⑭ 道具：抹掉 / 多一件 / 名字 / 说明 / 全表件数 / 采样顺序 / 进出记录 */
  const itemState = { inventory: ['foundation_pill'] };
  const itemTimeline = [
    { month: 0, age: 0, items: [] },
    { month: 120, age: 10, items: ['foundation_pill'] },
    { month: 240, age: 20, items: ['foundation_pill', 'ward'] },
    { month: 360, age: 30, items: ['foundation_pill'] },
  ];
  const items = buildItems(itemState, itemTimeline);
  assert.equal(assertItemsMatchInventory(items, itemState), true);
  assert.equal(assertItemsTimeline(items, itemTimeline), true);
  /* 这条命确实碰过一件「用过就没了」的道具（ward）⇒ 进出两次。 */
  const wardRow = items.rows.find(row => row.id === 'ward');
  assert.ok(wardRow, '道具表里应当有 ward');
  assert.equal(wardRow.events.length, 2, 'ward 应当是「拿到一次、用掉一次」');
  assert.throws(() => assertItemsMatchInventory({ ...items, held: items.held.slice(1) }, itemState), /引擎行囊里有/);
  assert.throws(() => assertItemsMatchInventory({ ...items, held: [...items.held, { id: 'ward', name: '假的', detail: '' }] }, itemState), /引擎行囊里有/);
  /* ⚠ 引擎行囊里出现「道具表里没有」的东西 ⇒ 必须报出来（不然道具页会悄悄吞掉一件）。 */
  assert.throws(() => assertItemsMatchInventory(
    { ...items, held: [...items.held, { id: 'ghost_item', name: '查无此物', detail: '' }] },
    { inventory: [...items.held.map(row => row.id), 'ghost_item'] },
  ), /道具表里没有的道具/);
  assert.throws(() => assertItemsMatchInventory({ ...items, held: items.held.map(row => ({ ...row, name: '假的名字' })) }, itemState), /的名字对不上/);
  assert.throws(() => assertItemsMatchInventory({ ...items, held: items.held.map(row => ({ ...row, detail: '假的说明' })) }, itemState), /的说明对不上/);
  assert.throws(() => assertItemsMatchInventory({ ...items, total: items.total + 1 }, itemState), /全表件数对不上/);
  assert.throws(() => assertItemsTimeline(items, [...itemTimeline, { month: 1, age: 0, items: [] }]), /没有按时间排/);
  assert.throws(() => assertItemsTimeline({ ...items, rows: items.rows.map(row => row.id === 'ward' ? { ...row, events: row.events.slice(0, 1) } : row) }, itemTimeline), /的进出记录条数与采样对不上/);
  assert.throws(() => assertItemsTimeline({ ...items, rows: items.rows.map(row => row.id === 'ward' ? { ...row, events: row.events.map(event => ({ ...event, month: event.month + 1 })) } : row) }, itemTimeline), /的进出时刻与采样对不上/);
  assert.throws(() => assertItemsTimeline({ ...items, rows: items.rows.map(row => row.id === 'ward' ? { ...row, events: row.events.map((event, index) => index === 0 ? { ...event, kind: 'lost' } : event) } : row) }, itemTimeline), /的进出类型与采样对不上/);
  const neverSeen = items.rows.find(row => row.id !== 'ward' && row.id !== 'foundation_pill' && !row.seen);
  assert.ok(neverSeen, '道具表里应当有「一次都没碰到」的道具');
  assert.throws(() => assertItemsTimeline({ ...items, rows: items.rows.map(row => row.id === neverSeen.id ? { ...row, seen: true } : row) }, itemTimeline), /的「碰到过」判定自相矛盾/);

  /* ⑮ 世界观：宗门 / 倍率 / 功法 / 境界 */
  const world = buildWorld(state);
  assert.equal(assertWorldMatchesState(world, state), true);
  assert.ok(world.sect, '这条命应当拜入了宗门');
  assert.throws(() => assertWorldMatchesState({ ...world, sect: { ...world.sect, name: '假宗门' } }, state), /宗门名与引擎对不上/);
  assert.throws(() => assertWorldMatchesState({ ...world, sect: { ...world.sect, phase: '（假阶段）' } }, state), /宗门阶段与引擎对不上/);
  assert.throws(() => assertWorldMatchesState({ ...world, sect: { ...world.sect, treasury: world.sect.treasury + 1 } }, state), /公库数与引擎对不上/);
  assert.throws(() => assertWorldMatchesState({ ...world, sect: { ...world.sect, role: '（假差事）' } }, state), /差事与引擎对不上/);
  assert.throws(() => assertWorldMatchesState({ ...world, sect: { ...world.sect, councils: world.sect.councils + 1 } }, state), /议事数与引擎对不上/);
  assert.ok(world.method, '这条命应当有主修功法');
  /* ⚠ 倍率被改成手算值 ⇒ 必须报红（面板一旦自己乘一遍，这里就红）。 */
  assert.throws(() => assertWorldMatchesState({ ...world, method: { ...world.method, rate: world.method.rate + 0.37 } }, state), /功法倍率与规则层对不上/);
  assert.throws(() => assertWorldMatchesState({ ...world, method: { ...world.method, months: world.method.months + 1 } }, state), /功法月数与引擎对不上/);
  assert.throws(() => assertWorldMatchesState({ ...world, method: { ...world.method, id: '（假功法）' } }, state), /主修功法与引擎对不上/);
  assert.throws(() => assertWorldMatchesState({ ...world, realm: { ...world.realm, index: world.realm.index + 1 } }, state), /境界与引擎对不上/);
  assert.throws(() => assertWorldMatchesState({ ...world, realm: { ...world.realm, ability: '假的能力' } }, state), /境界能力与引擎对不上/);

  /* ⑯ 人物：少一个 / 名字 / 状态 / 羁绊 / 家人 / 后辈 / 职务 */
  const people = buildPeople(state);
  assert.equal(assertPeopleMatchState(people, state), true);
  assert.throws(() => assertPeopleMatchState({ ...people, cast: people.cast.slice(1) }, state), /主角数与引擎对不上/);
  assert.throws(() => assertPeopleMatchState({ ...people, cast: people.cast.map(row => ({ ...row, name: '假名字' })) }, state), /的名字对不上/);
  assert.throws(() => assertPeopleMatchState({ ...people, cast: people.cast.map(row => ({ ...row, status: row.status === 'dead' ? 'alive' : 'dead' })) }, state), /的状态对不上/);
  assert.throws(() => assertPeopleMatchState({ ...people, cast: people.cast.map(row => ({ ...row, bond: row.bond + 1 })) }, state), /的羁绊对不上/);
  assert.ok(people.relatives.length, '这条命应当有家人');
  assert.throws(() => assertPeopleMatchState({ ...people, relatives: people.relatives.slice(1) }, state), /家人数与引擎对不上/);
  assert.ok(people.descendants.length, '这条命应当有后辈');
  assert.throws(() => assertPeopleMatchState({ ...people, descendants: people.descendants.slice(1) }, state), /后代数与引擎对不上/);
  assert.ok(people.officers.length, '这条命应当有宗门职务');
  assert.throws(() => assertPeopleMatchState({ ...people, officers: people.officers.slice(1) }, state), /宗门职务数与引擎对不上/);

  /* ⑰ 流水：少一条日志 / 编号 / 月份 / 类型 / 标题 / 正文 / 抉择 */
  const journal = buildJournal(state);
  assert.equal(assertJournalMatchesState(journal, state), true);
  assert.throws(() => assertJournalMatchesState({ ...journal, journal: journal.journal.slice(1) }, state), /日志条数与引擎对不上/);
  assert.throws(() => assertJournalMatchesState({ ...journal, journal: journal.journal.map((row, index) => index === 0 ? { ...row, id: '假编号' } : row) }, state), /的编号对不上/);
  assert.throws(() => assertJournalMatchesState({ ...journal, journal: journal.journal.map((row, index) => index === 0 ? { ...row, month: row.month + 1 } : row) }, state), /的月份对不上/);
  assert.throws(() => assertJournalMatchesState({ ...journal, journal: journal.journal.map((row, index) => index === 0 ? { ...row, kind: '假类型' } : row) }, state), /的类型对不上/);
  assert.throws(() => assertJournalMatchesState({ ...journal, journal: journal.journal.map((row, index) => index === 0 ? { ...row, title: '假标题' } : row) }, state), /的标题对不上/);
  assert.throws(() => assertJournalMatchesState({ ...journal, journal: journal.journal.map((row, index) => index === 0 ? { ...row, body: '假正文' } : row) }, state), /的正文对不上/);
  assert.ok(journal.decisions.length, '这条命至少该有一次抉择');
  assert.throws(() => assertJournalMatchesState({ ...journal, decisions: journal.decisions.slice(1) }, state), /抉择条数与引擎对不上/);
  assert.throws(() => assertJournalMatchesState({ ...journal, decisions: journal.decisions.map((row, index) => index === 0 ? { ...row, event: '假的卡' } : row) }, state), /的卡对不上/);
  assert.throws(() => assertJournalMatchesState({ ...journal, decisions: journal.decisions.map((row, index) => index === 0 ? { ...row, choice: '假的选择' } : row) }, state), /的选择对不上/);
  assert.throws(() => assertJournalMatchesState({ ...journal, decisions: journal.decisions.map((row, index) => index === 0 ? { ...row, success: !row.success } : row) }, state), /的成败对不上/);
  assert.throws(() => assertJournalMatchesState({ ...journal, decisions: journal.decisions.map((row, index) => index === 0 ? { ...row, chance: (row.chance ?? 0) + 7 } : row) }, state), /的把握值对不上/);

  /* ⑱ 批量统计：必须能由那批命逐条重算复现 */
  const runs = [
    { state, seed: 'a', error: null },
    { state: { ...state, inventory: [], decisions: [], journal: [], ending: { title: '假结局' } }, seed: 'b', error: null },
  ];
  const batch = buildBatch(runs);
  assert.equal(assertBatchMatchesRuns(batch, runs), true);
  assert.throws(() => assertBatchMatchesRuns({ ...batch, lives: batch.lives + 1 }, runs), /命数对不上/);
  assert.throws(() => assertBatchMatchesRuns({ ...batch, finished: batch.finished + 1 }, runs), /完成数对不上/);
  assert.throws(() => assertBatchMatchesRuns({ ...batch, itemCount: batch.itemCount + 1 }, runs), /道具命中数对不上/);
  assert.throws(() => assertBatchMatchesRuns({ ...batch, decisions: batch.decisions + 1 }, runs), /抉择总数对不上/);
  assert.throws(() => assertBatchMatchesRuns({ ...batch, endings: { ...batch.endings, '假结局': 99 } }, runs), /结局分布对不上/);

  /* ⑲ 内容覆盖：分桶 / 分类 / 三张「没出现」清单 —— 每一条都要能反向验证
   * ⚠ 这一组守的是「面板说的没走到 == 真的没走到，而且没走到的东西被正确分了类」。
   *   分错了 ⇒ 开发者会去修不存在的问题（把别版本专属的卡当成死角）。
   */
  const covRuns = [{ state, seed: 'a', error: null, spots: ['竹溪村的旧屋', '渡云宗山门'] }];
  const coverage = buildCoverage(covRuns, { rulesVersion: 12 });
  assert.equal(assertCoverageMatchesRuns(coverage, covRuns), true);
  const currentBucket = coverage.cards.buckets[0];
  assert.equal(currentBucket.id, 'current', '第一个桶必须是当前版本');
  assert.ok(coverage.cards.buckets.length === 3, '应当有三个桶（当前版本 / 旧版本专属 / 经典故事层）');
  assert.ok(currentBucket.total > 0 && currentBucket.missed.length > 0, '当前版本的桶必须有卡，也有没走到的卡');
  const missedRow = currentBucket.missed[0];
  /* 抹掉一张命中卡 ⇒ 命中数对不上 */
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, cards: { ...coverage.cards, hit: coverage.cards.hit - 1 } }, covRuns), /剧情卡命中数对不上/);
  /* 桶的总数改错 ⇒ 报红（桶是从规则层的事件表算出来的，不许手填） */
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, cards: { ...coverage.cards, buckets: coverage.cards.buckets.map((bucket, index) => index === 0 ? { ...bucket, total: bucket.total + 1 } : bucket) } }, covRuns), /的卡总数与规则层对不上/);
  /* 桶的顺序换 ⇒ 报红 */
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, cards: { ...coverage.cards, buckets: [...coverage.cards.buckets].reverse() } }, covRuns), /桶顺序对不上/);
  /* 命中数改错 ⇒ 报红 */
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, cards: { ...coverage.cards, buckets: coverage.cards.buckets.map((bucket, index) => index === 0 ? { ...bucket, hit: bucket.hit + 1 } : bucket) } }, covRuns), /的命中数对不上/);
  /* 没出现的清单多一张 ⇒ 报红 */
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, cards: { ...coverage.cards, buckets: coverage.cards.buckets.map((bucket, index) => index === 0 ? { ...bucket, missed: [...bucket.missed, missedRow] } : bucket) } }, covRuns), /的没出现条数对不上/);
  /* 没出现的清单换一张 ⇒ 报红 */
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, cards: { ...coverage.cards, buckets: coverage.cards.buckets.map((bucket, index) => index === 0 ? { ...bucket, missed: bucket.missed.map((row, position) => position === 0 ? { ...row, id: '根本没这张卡' } : row) } : bucket) } }, covRuns), /的没出现清单对不上/);
  /* 分类改错（整族没走到 ↔ 同场景变体）⇒ 报红 */
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, cards: { ...coverage.cards, buckets: coverage.cards.buckets.map((bucket, index) => index === 0 ? { ...bucket, missed: bucket.missed.map(row => row.id === missedRow.id ? { ...row, kind: row.kind === 'scene' ? 'variant' : 'scene' } : row) } : bucket) } }, covRuns), /的分类/);
  /* 同族名改错 ⇒ 报红 */
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, cards: { ...coverage.cards, buckets: coverage.cards.buckets.map((bucket, index) => index === 0 ? { ...bucket, missed: bucket.missed.map(row => row.id === missedRow.id ? { ...row, family: '假的族' } : row) } : bucket) } }, covRuns), /的同族名不对/);
  /* 「从没被选过的选项」里塞一个其实被选过的 ⇒ 报红 */
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, choices: { ...coverage.choices, unused: [{ card: '假的卡', cardLabel: '假的卡', choice: '假的选择', label: '假的选择' }, ...coverage.choices.unused] } }, covRuns), /条数对不上/);
  /* 「从没被选过的选项」删掉一条 ⇒ 报红 */
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, choices: { ...coverage.choices, unused: coverage.choices.unused.slice(1) } }, covRuns), /条数对不上/);
  /* 「没碰到的道具」里塞一个碰到的 ⇒ 报红 */
  const heldItem = (state.inventory || [])[0];
  if (heldItem) {
    assert.throws(() => assertCoverageMatchesRuns({ ...coverage, items: { ...coverage.items, missed: [{ id: heldItem, name: '碰到的' }, ...coverage.items.missed] } }, covRuns), /混进了碰到的道具/);
  }
  /* 「没去过的地名」里塞一个去过的 ⇒ 报红
   * ⚠ 必须是**替换**而不是追加 —— 追加会先撞上「条数对不上」那条，检查不到「混进去了」。 */
  assert.ok(coverage.places.missed.length > 0, '这条命应当有「没去过的地名」');
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, places: { ...coverage.places, missed: [{ id: '竹溪村' }, ...coverage.places.missed.slice(1)] } }, covRuns), /混进了去过的地名/);
  /* 「没走到的结局」里塞一个走到的 ⇒ 报红 */
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, endings: { ...coverage.endings, missed: [{ id: 'x', title: state.ending?.title ?? '走到的结局' }, ...coverage.endings.missed] } }, covRuns), /混进了走到的结局/);
  /* 命数改错 ⇒ 报红 */
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, lives: coverage.lives + 1 }, covRuns), /命数对不上/);

  /* ⑳ 角儿覆盖：分组的命数 / 中位 / 位置清单 / 「从没遇到的角儿」 */
  assert.ok(coverage.people.groups.length > 0, '角儿覆盖应当有分组');
  const castGroup = coverage.people.groups.find(group => group.id === 'cast');
  assert.ok(castGroup, '角儿覆盖应当有「主角」这一组');
  assert.ok(castGroup.slots.length > 0, '主角那组应当列出位置');
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, people: { ...coverage.people, groups: coverage.people.groups.map(group => group.id === 'cast' ? { ...group, lives: group.lives + 1 } : group) } }, covRuns), /出现过的命数对不上/);
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, people: { ...coverage.people, groups: coverage.people.groups.map(group => group.id === 'cast' ? { ...group, median: group.median + 1 } : group) } }, covRuns), /每条命中位对不上/);
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, people: { ...coverage.people, groups: coverage.people.groups.map(group => group.id === 'cast' ? { ...group, slots: group.slots.slice(1) } : group) } }, covRuns), /的位置数对不上/);
  assert.throws(() => assertCoverageMatchesRuns({ ...coverage, people: { ...coverage.people, neverMet: [...coverage.people.neverMet, { group: 'cast', id: '没这个人', label: '没这个人', lives: 0 }] } }, covRuns), /条数对不上/);

  /* ㉑ 两种玩法并排比：差集 / 角儿差异 / 指标表 —— 每一条都要能反向验证
   * ⚠ 这一组守的是「面板说「只 B 走到」== 真的是只有 B 走到」。
   *   差集算错 ⇒ 开发者会去改一条其实有人走过的内容（或者漏掉一条真的没人走的）。
   */
  const cmpRuns = await runBatch(12, null, { mode: 'policy' });
  const cmpRunsRight = await runBatch(12, null, { mode: 'random' });
  const cmpLeftCoverage = buildCoverage(cmpRuns.runs, { rulesVersion: 12 });
  const cmpRightCoverage = buildCoverage(cmpRunsRight.runs, { rulesVersion: 12 });
  const cmp = buildComparison(
    { label: '固定偏好', batch: cmpRuns.batch, coverage: cmpLeftCoverage },
    { label: '随机探索', batch: cmpRunsRight.batch, coverage: cmpRightCoverage },
    { rulesVersion: 12 },
  );
  assert.equal(assertComparisonMatchesRuns(cmp, cmpRuns.runs, cmpRunsRight.runs), true);
  /* 改一份清单：列表非空就换掉第一条（条数不变、id 变了），空的就塞一条进去。 */
  const tamper = (list, id) => list.length
    ? list.map((row, index) => index === 0 ? { ...row, id } : row)
    : [{ id, label: id }];
  for (const side of ['onlyLeft', 'onlyRight']) {
    for (const kind of ['cards', 'items', 'endings']) {
      assert.throws(() => assertComparisonMatchesRuns(
        { ...cmp, [side]: { ...cmp[side], [kind]: tamper(cmp[side][kind], '假的条目') } },
        cmpRuns.runs, cmpRunsRight.runs,
      ), /条数对不上|清单对不上/, side + '.' + kind + ' 被改坏时必须报红');
    }
  }
  /* 「两种都没走到」的清单被改坏 ⇒ 报红 */
  assert.throws(() => assertComparisonMatchesRuns({ ...cmp, neither: { cards: tamper(cmp.neither.cards, '假的卡') } }, cmpRuns.runs, cmpRunsRight.runs), /条数对不上|清单对不上/);
  /* 角儿差异的次数被改坏 ⇒ 报红 */
  const peopleTamper = cmp.peopleDiff.length
    ? cmp.peopleDiff.map((row, index) => index === 0 ? { ...row, left: row.left + 1 } : row)
    : [{ id: '假的位置', label: '假的位置', left: 1, right: 1 }];
  assert.throws(() => assertComparisonMatchesRuns({ ...cmp, peopleDiff: peopleTamper }, cmpRuns.runs, cmpRunsRight.runs), /角儿差异/);
  /* 指标表：左边 / 右边 / 少一行 ⇒ 都要报红 */
  assert.throws(() => assertComparisonMatchesRuns({ ...cmp, rows: cmp.rows.map(row => row.key === 'cards' ? { ...row, left: row.left + 1 } : row) }, cmpRuns.runs, cmpRunsRight.runs), /左边的数对不上/);
  assert.throws(() => assertComparisonMatchesRuns({ ...cmp, rows: cmp.rows.map(row => row.key === 'cards' ? { ...row, right: row.right + 1 } : row) }, cmpRuns.runs, cmpRunsRight.runs), /右边的数对不上/);
  assert.throws(() => assertComparisonMatchesRuns({ ...cmp, rows: cmp.rows.filter(row => row.key !== 'cards') }, cmpRuns.runs, cmpRunsRight.runs), /少了/);

  /* ㉒ 按阶段 / 境界：碰到几种 / 单条命最多 / 年龄中位 / 阶段闸管的卡
   * ⚠ 这一组守的是「面板说「这段人生只有 2 种内容」== 真的是 2 种」。
   *   算错了 ⇒ 开发者会以为某段人生内容够多（其实很薄），或者反过来去修一段不该修的。
   */
  const stageRuns = await runBatch(12, null, { mode: 'policy' });
  const stageCoverage = buildStageCoverage(stageRuns.runs, { rulesVersion: 12 });
  assert.equal(assertStageCoverageMatchesRuns(stageCoverage, stageRuns.runs), true);
  const realm0 = stageCoverage.realms[0];
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, realms: stageCoverage.realms.map((row, index) => index === 0 ? { ...row, kinds: row.kinds + 1 } : row) }, stageRuns.runs), /碰到几种内容对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, realms: stageCoverage.realms.map((row, index) => index === 0 ? { ...row, perLifeMax: row.perLifeMax + 1 } : row) }, stageRuns.runs), /单条命最多几种对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, realms: stageCoverage.realms.map((row, index) => index === 0 ? { ...row, perLifeAvg: row.perLifeAvg + 1 } : row) }, stageRuns.runs), /单条命平均几种对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, realms: stageCoverage.realms.map((row, index) => index === 0 ? { ...row, medianAge: (row.medianAge ?? 0) + 1 } : row) }, stageRuns.runs), /发卡年龄中位对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, realms: [...stageCoverage.realms].reverse() }, stageRuns.runs), /顺序或名字对不上/);
  const stage0 = stageCoverage.stages[0];
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, stages: stageCoverage.stages.map((row, index) => index === 0 ? { ...row, kinds: row.kinds + 1 } : row) }, stageRuns.runs), /碰到几种内容对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, stages: stageCoverage.stages.map((row, index) => index === 0 ? { ...row, mainRealm: '假境界' } : row) }, stageRuns.runs), /主要境界对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, stages: stageCoverage.stages.map((row, index) => index === 0 ? { ...row, realms: row.realms.slice(1) } : row) }, stageRuns.runs), /境界分布条数对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, stages: [...stageCoverage.stages].reverse() }, stageRuns.runs), /顺序或名字对不上/);
  /* 供给侧：声明了几张 / 碰到几张 / 没碰到哪几张 */
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, declaredStages: stageCoverage.declaredStages.map((row, index) => index === 0 ? { ...row, total: row.total + 1 } : row) }, stageRuns.runs), /声明了几张卡对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, declaredStages: stageCoverage.declaredStages.map((row, index) => index === 0 ? { ...row, hit: row.hit + 1 } : row) }, stageRuns.runs), /碰到几张卡对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, declaredStages: stageCoverage.declaredStages.map((row, index) => index === 0 ? { ...row, missed: row.missed.slice(1) } : row) }, stageRuns.runs), /没碰到的卡条数对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, declaredRealms: stageCoverage.declaredRealms.map((row, index) => index === 0 ? { ...row, total: row.total + 1 } : row) }, stageRuns.runs), /声明了几张卡对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, declaredRealms: stageCoverage.declaredRealms.map((row, index) => index === 0 ? { ...row, hit: row.hit + 1 } : row) }, stageRuns.runs), /碰到几张卡对不上/);
  /* 底线标记 / 最薄的一段 / 晚年 —— 数字与标记都要对得上 */
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, realms: stageCoverage.realms.map((row, index) => index === 0 ? { ...row, belowFloor: !row.belowFloor } : row) }, stageRuns.runs), /低于底线的标记对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, realms: stageCoverage.realms.map((row, index) => index === 0 ? { ...row, floor: row.floor + 1 } : row) }, stageRuns.runs), /底线数字对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, thinnest: '假的阶段' }, stageRuns.runs), /最薄的那一段/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, late: { ...stageCoverage.late, kinds: stageCoverage.late.kinds + 1 } }, stageRuns.runs), /晚年碰到的卡种数对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, late: { ...stageCoverage.late, floor: stageCoverage.late.floor + 1 } }, stageRuns.runs), /晚年的底线数字对不上/);
  assert.throws(() => assertStageCoverageMatchesRuns({ ...stageCoverage, late: { ...stageCoverage.late, belowFloor: !stageCoverage.late.belowFloor } }, stageRuns.runs), /晚年低于底线的标记对不上/);
  /* ⚠ 底线数字必须与「内容完备度盘点」那一份**同一个数**（不许各写一份）。 */
  assert.equal(stageCoverage.realms[0].floor, REALM_KINDS_MIN, '面板用的境界段底线必须与共享常量一致');
  assert.equal(stageCoverage.late.floor, LATE_KINDS_MIN, '面板用的晚年底线必须与共享常量一致');
  assert.equal(stageCoverage.late.age, LATE_AGE, '面板用的晚年起点必须与共享常量一致');
  assert.equal(LIMITS.realmKinds, REALM_KINDS_MIN, '完备度盘点的境界段底线必须与共享常量一致');
  assert.equal(LIMITS.lateKinds, LATE_KINDS_MIN, '完备度盘点的晚年底线必须与共享常量一致');

  report.checks.push('反向验证：好数据全部通过，四十余种坏数据全部报红');
  report.checks.push('反向验证：内容覆盖的分桶 / 分类 / 三张「没出现」清单，坏数据全部报红');
  report.checks.push('反向验证：两种玩法的并排比（差集 / 角儿差异 / 指标表），坏数据全部报红');
  report.checks.push('反向验证：按阶段 / 境界（碰到几种 / 单条命最多 / 年龄中位 / 闸管的卡），坏数据全部报红');

  /* ㉓ 角色进度：到达人数 / 占比 / 年龄中位 / 每境待了多久 / 突破间隔
   * ⚠ 这一组守的是「面板说「八成的人到炼气」== 真的是八成」。
   *   漏斗算错 ⇒ 开发者会以为进度没问题（其实很多命卡在半路）。
   */
  const progressRuns = await runBatch(12, null, { mode: 'policy' });
  const progress = buildProgress(progressRuns.runs);
  assert.equal(assertProgressMatchesRuns(progress, progressRuns.runs), true);
  assert.throws(() => assertProgressMatchesRuns({ ...progress, realms: progress.realms.map((row, index) => index === 0 ? { ...row, reached: row.reached + 1 } : row) }, progressRuns.runs), /到达的命数对不上/);
  assert.throws(() => assertProgressMatchesRuns({ ...progress, realms: progress.realms.map((row, index) => index === 0 ? { ...row, share: row.share + 0.1 } : row) }, progressRuns.runs), /的占比对不上/);
  assert.throws(() => assertProgressMatchesRuns({ ...progress, realms: progress.realms.map((row, index) => index === 1 ? { ...row, medianAge: (row.medianAge ?? 0) + 1 } : row) }, progressRuns.runs), /到达年龄中位对不上/);
  assert.throws(() => assertProgressMatchesRuns({ ...progress, realms: progress.realms.map((row, index) => index === 1 ? { ...row, dwellMedian: (row.dwellMedian ?? 0) + 1 } : row) }, progressRuns.runs), /停留年数中位对不上/);
  assert.throws(() => assertProgressMatchesRuns({ ...progress, realms: progress.realms.map((row, index) => index === 1 ? { ...row, dwellMax: (row.dwellMax ?? 0) + 1 } : row) }, progressRuns.runs), /停留年数最长那条对不上/);
  assert.throws(() => assertProgressMatchesRuns({ ...progress, realms: [...progress.realms].reverse() }, progressRuns.runs), /境界顺序对不上/);
  if (progress.spans.length) {
    assert.throws(() => assertProgressMatchesRuns({ ...progress, spans: progress.spans.map((row, index) => index === 0 ? { ...row, median: (row.median ?? 0) + 1 } : row) }, progressRuns.runs), /间隔的中位数对不上/);
    assert.throws(() => assertProgressMatchesRuns({ ...progress, spans: progress.spans.map((row, index) => index === 0 ? { ...row, count: row.count + 1 } : row) }, progressRuns.runs), /间隔的样本数对不上/);
    assert.throws(() => assertProgressMatchesRuns({ ...progress, spans: progress.spans.map((row, index) => index === 0 ? { ...row, target: row.target + 1 } : row) }, progressRuns.runs), /间隔的目标值对不上/);
    assert.throws(() => assertProgressMatchesRuns({ ...progress, spans: progress.spans.map((row, index) => index === 0 ? { ...row, ok: !row.ok } : row) }, progressRuns.runs), /间隔的达标标记对不上/);
    assert.throws(() => assertProgressMatchesRuns({ ...progress, spans: progress.spans.slice(1) }, progressRuns.runs), /间隔的条数对不上/);
  }
  report.checks.push('反向验证：角色进度（漏斗 / 占比 / 年龄中位 / 每境待了多久 / 突破间隔），坏数据全部报红');

  /* ㉔ 问题清单：每一条的数量与出处都要对得上源头
   * ⚠ 这一组守的是「清单上写 39 族 == 覆盖表里真的是 39 族」。
   *   清单是给人当入口用的 ⇒ 数字一旦对不上，照着它去查就会查错地方。
   */
  const findingRuns = await runBatch(12, null, { mode: 'policy' });
  const findingCoverage = buildCoverage(findingRuns.runs, { rulesVersion: 12 });
  const findingStage = buildStageCoverage(findingRuns.runs, { rulesVersion: 12 });
  const findingProgress = buildProgress(findingRuns.runs);
  const sources = { coverage: findingCoverage, stageCoverage: findingStage, progress: findingProgress };
  const findings = buildFindings(sources);
  assert.equal(assertFindingsMatchSources(findings, sources), true);
  assert.ok(findings.length > 0, '这批命应当查出几类问题');
  /* 少一条 ⇒ 报红 */
  assert.throws(() => assertFindingsMatchSources(findings.slice(1), sources), /条数对不上/);
  /* 数量改错 ⇒ 报红 */
  assert.throws(() => assertFindingsMatchSources(findings.map((row, index) => index === 0 ? { ...row, count: row.count + 1 } : row), sources), /的数量对不上/);
  /* 顺序换 ⇒ 报红 */
  assert.throws(() => assertFindingsMatchSources([...findings].reverse(), sources), /顺序对不上/);
  /* 漏了「在哪看」⇒ 报红 */
  assert.throws(() => assertFindingsMatchSources(findings.map((row, index) => index === 0 ? { ...row, where: '' } : row), sources), /没写「在哪看」/);
  /* 漏了「这说明什么」⇒ 报红 */
  assert.throws(() => assertFindingsMatchSources(findings.map((row, index) => index === 0 ? { ...row, note: '' } : row), sources), /没写「这说明什么」/);
  report.checks.push('反向验证：问题清单（条数 / 数量 / 顺序 / 出处 / 说明），坏数据全部报红');

  /* ㉕ 与上一次跑批比：快照里的数必须与源头相等；改动必须被差异看出来
   * ⚠ 这一组守的是「面板说「比上次多了 3 张卡」== 真的是多了 3 张」。
   *   算错了 ⇒ 开发者会以为自己的改动有效（其实没变），或者反过来去改不该改的地方。
   */
  const snapRuns = await runBatch(12, null, { mode: 'policy' });
  const snapCoverage = buildCoverage(snapRuns.runs, { rulesVersion: 12 });
  const snapStage = buildStageCoverage(snapRuns.runs, { rulesVersion: 12 });
  const snapProgress = buildProgress(snapRuns.runs);
  const snapSources = { coverage: snapCoverage, stageCoverage: snapStage, progress: snapProgress };
  const snapshot = buildBatchSnapshot(snapSources, { at: '2026-11-08T00:00:00.000Z', mode: 'policy', count: 12 });
  assert.equal(assertBatchSnapshotMatchesSources(snapshot, snapSources), true);
  assert.equal(Object.keys(snapshot.metrics).length, SNAPSHOT_METRICS.length, '快照里的项数应当与登记的一致');
  /* ⚠ 快照里的数被改坏 ⇒ 报红 */
  assert.throws(() => assertBatchSnapshotMatchesSources({ ...snapshot, metrics: { ...snapshot.metrics, cards: snapshot.metrics.cards + 1 } }, snapSources), /剧情卡（当前版本）/);
  /* ⚠ 快照里多一项自己编的数 ⇒ 报红（多出来的数会被当成真的去比） */
  assert.throws(() => assertBatchSnapshotMatchesSources({ ...snapshot, metrics: { ...snapshot.metrics, 瞎编的一项: 1 } }, snapSources), /没登记的项/);
  /* 没有上一次 ⇒ 没有差异；什么都没变 ⇒ 没有差异 */
  assert.deepEqual(diffBatchSnapshots(null, snapshot), [], '没有上一次就不该有差异');
  assert.deepEqual(diffBatchSnapshots(snapshot, snapshot), [], '什么都没变就不该有差异');
  /* 变了两项 ⇒ 差异里必须都有，且「变好了吗」按**方向**判（不是看绝对值） */
  const changed = { ...snapshot, metrics: { ...snapshot.metrics, cards: snapshot.metrics.cards + 3, sceneFamilies: snapshot.metrics.sceneFamilies - 2 } };
  const diffRows = diffBatchSnapshots(snapshot, changed);
  assert.equal(diffRows.length, 2, '变了两项 ⇒ 差异里应当有两项');
  assert.equal(assertBatchDiffDetectsChange(snapshot, changed, diffRows), true);
  const cardsRow = diffRows.find(row => row.key === 'cards');
  const sceneRow = diffRows.find(row => row.key === 'sceneFamilies');
  assert.equal(cardsRow.good, true, '覆盖类变多 ⇒ 变好');
  assert.equal(sceneRow.good, true, '缺口类变少 ⇒ 变好');
  /* ⚠ 反向验证：差异里漏一项 / 数字改坏 / 方向标错 ⇒ 都要报红 */
  assert.throws(() => assertBatchDiffDetectsChange(snapshot, changed, diffRows.slice(1)), /变了，差异里却没有它/);
  assert.throws(() => assertBatchDiffDetectsChange(snapshot, changed, diffRows.map((row, index) => index === 0 ? { ...row, after: row.after + 1 } : row)), /差异数字对不上/);
  assert.throws(() => assertBatchDiffDetectsChange(snapshot, changed, diffRows.map((row, index) => index === 0 ? { ...row, good: !row.good } : row)), /变好了吗/);
  /* ⚠ 根本没变的项不许出现在差异里（不然永远「有变化」，看久了就麻木了） */
  assert.throws(() => assertBatchDiffDetectsChange(snapshot, snapshot, [{ key: 'realm1', label: '到炼气的命', before: 1, after: 1, delta: 0, better: 'up', good: false }]), /根本没变/);
  /* ⚠ 本地存档键不许跟游戏的存档键撞（面板存的是「上一次跑批」，不是玩家存档） */
  assert.notEqual(HISTORY_KEY, ADVENTURE_KEY, '面板的本地存档键不许跟游戏的存档键撞');
  report.checks.push('反向验证：与上一次跑批比（快照对不对得上源头 / 改动有没有被看出来 / 方向判对没有），坏数据全部报红');
}

/* ── 页签清单（与 apps/viz/tabs.js 一致） ───────────────────────────────── */
const TABS = [
  { id: 'state', label: '当前状态', marker: '.viz-snap-attrs' },
  { id: 'items', label: '道具', marker: '.viz-item-stats' },
  { id: 'map', label: '地图', marker: '.viz-map' },
  { id: 'world', label: '世界观', marker: '.viz-world-grid' },
  { id: 'people', label: '人物', marker: '.viz-people-summary' },
  { id: 'journal', label: '流水', marker: '.viz-log-filters' },
];

try {
  await reverseChecks();

  server = await startServer({ port: 0 });
  browser = await launchBrowser();
  page = await browser.page();
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false });

  await page.navigate(server.url + 'apps/viz/');
  await page.waitFor('!!window.vizPanel');
  /* ⚠ 本地存档：先把「上一次跑批」的记录清掉 ⇒
   *   「第一次跑批没有可比的」才是确定的（不靠「浏览器是新开的」这种运气）。 */
  await page.eval('localStorage.removeItem(' + JSON.stringify(HISTORY_KEY) + ')');
  assert.deepEqual(page.errors, [], '页面不该有脚本报错');
  assert.deepEqual(page.responses.filter(response => response.status >= 400 && !response.url.endsWith('/favicon.ico')), [], '面板的资源不该有 404');
  report.checks.push('面板在真实浏览器里载入，无脚本报错、无资源缺失');

  /* ── ① 逐步走完这条命，每一张卡都比对 ──────────────────────────────── */
  const seed = await page.eval('window.vizPanel.seed');
  const policy = { path: 'orthodox', conduct: 'care', school: 'array' };
  const truth = createRun({ seed, rulesVersion: 12 });
  const advanceTo = state => { let guard = 0; while (!state.pending && state.phase === 'life' && guard++ < 20000) advance(state, 1); };
  advanceTo(truth);

  let cards = 0, cardsWithDisabled = 0;
  for (let step = 0; step < 120 && truth.phase === 'life' && truth.pending; step++) {
    const shown = await page.eval('window.vizPanel.pending && window.vizPanel.pending.offered');
    assert.ok(shown && shown.length, '第 ' + step + ' 张卡：面板没给出选项');
    assert.equal(assertDecisionMatchesOptions({ offered: shown }, options(truth).map(shape)), true, '第 ' + step + ' 张卡的选项与引擎对不上');
    const raw = await page.eval('window.vizPanel.truthOptions()');
    assert.equal(assertDecisionMatchesOptions({ offered: shown }, raw), true, '第 ' + step + ' 张卡：面板显示的与引擎原样对不上');
    cards++;
    if (shown.some(option => option.reasons.length > 0)) cardsWithDisabled++;
    if (cardsWithDisabled >= 2) break;
    const option = decide(truth, policy);
    assert.ok(option && option.enabled, '第 ' + step + ' 张卡：策略选不出可点的选项');
    await page.click('[data-pick="' + option.id + '"]');
    choose(truth, option.id);
    advanceTo(truth);
  }
  assert.ok(cards >= 3, '至少要比对三张卡，实际 ' + cards + ' 张');
  assert.ok(cardsWithDisabled >= 1, '必须走过一张「有选项点不了」的卡，否则「为什么点不了」那一栏等于没测');
  report.checks.push('逐步走了 ' + cards + ' 张卡，每张卡的选项（能不能点 / 代价 / 把握 / 为什么点不了）都与引擎逐条全等');
  report.checks.push('其中 ' + cardsWithDisabled + ' 张卡存在「点不了的选项」⇒ 那几栏不是空测');

  /* ── ② 跑完一生：轴上的抉择点 == 引擎记的 decisions ──────────────────── */
  await page.click('#run-all');
  await delay(300);
  const model = await page.eval('window.vizPanel.model');
  const decisions = await page.eval('window.vizPanel.state.decisions');
  const steps = await page.eval('window.vizPanel.steps.length');
  assert.equal(assertAxisMatchesDecisions(model, decisions), true);
  report.checks.push('轴上的抉择点与引擎记的 decisions 逐条全等（哪张卡 / 选了什么 / 哪个月）');

  /* ── ③ 面板记的步数 == 引擎记的抉择数 ──────────────────────────────── */
  assert.equal(steps, decisions.length, '面板记的步数应与引擎记的抉择数相等');
  assert.ok(decisions.length > 0, '这一条命至少该有一次抉择');
  report.checks.push('面板记的步数与引擎记的抉择数相等（' + decisions.length + ' 次）');

  /* ── ④ 世界结构 ───────────────────────────────────────────────────── */
  const map = await page.eval('window.vizPanel.map');
  const stateNow = await page.eval('window.vizPanel.state');
  assert.equal(map.nodes.length, GEOGRAPHY.length, '大陆数应与 GEOGRAPHY 相等');
  const expectedEdges = GEOGRAPHY.reduce((sum, place) => sum + (place.connections || []).length, 0) / 2;
  assert.equal(map.edges.length, expectedEdges, '通路数应与 GEOGRAPHY 相等');
  assert.equal(assertMapMatchesGeography(map, stateNow), true);
  report.checks.push('世界结构的 ' + map.nodes.length + ' 块大陆与 ' + map.edges.length + ' 条通路与内容表相等；地名 / 描述 / 特产 / 封路 / 走过 / 路费 / 耗时逐条相等');

  /* ── ⑤ 轴上真的有东西可看 ─────────────────────────────────────────── */
  assert.ok(model.points.length > 0, '轴上至少要有一个抉择点');
  assert.ok(model.marks.length > 0, '轴上至少要有一条经历');
  assert.ok(model.lifespan > 0, '这一条命该有寿元上限');
  await page.screenshot(join(out, 'panel-desktop.png'));
  report.checks.push('轴上有 ' + model.points.length + ' 个抉择点、' + model.marks.length + ' 条经历、寿元上限 ' + model.lifespan + ' 岁');

  /* ── ⑤·二 属性曲线与当前状态：也必须等于引擎 ─────────────────────── */
  const curve = await page.eval('window.vizPanel.curve');
  const snapshot = await page.eval('window.vizPanel.snapshot');
  assert.equal(assertCurveMatchesState(curve.raw, stateNow), true);
  assert.equal(assertSnapshotMatchesState(snapshot, stateNow), true);
  assert.ok(curve.raw.length > 0, '属性曲线至少要有一个采样点');
  assert.ok(curve.attributes.length === 5, '五维属性应当是五条线');
  assert.ok(snapshot.people.length > 0, '快照至少要列出一个人物');
  report.checks.push('属性曲线拍了 ' + curve.raw.length + ' 个采样点，末端与引擎一致；当前状态快照的属性与人物也与引擎一致');

  /* ── ⑥ 点开一个抉择点，决策框回看那一步 ───────────────────────────── */
  const last = steps - 1;
  await page.eval('document.querySelector("#track .viz-point[data-step=\\"' + last + '\\"]").dispatchEvent(new MouseEvent("click",{bubbles:true}))');
  await delay(150);
  assert.equal(await page.eval('window.vizPanel.selected'), last, '点轴上的点应当切到那一步');
  assert.equal(await page.eval('window.vizPanel.tab'), 'state', '回看那一步应当切到「当前状态」页（决策区在那里）');
  const step = await page.eval('window.vizPanel.steps[' + last + ']');
  assert.ok(step.offered.length, '那一步应当有选项列表');
  assert.ok(step.picked, '那一步应当记下了选了什么');
  const reviewText = await page.eval('document.querySelector("#tabpanel .viz-decision-block").textContent');
  assertDomContainsAll(reviewText, [step.event], '回看那一步的决策区');
  report.checks.push('点轴上的抉择点能回看那一步（切到「当前状态」页，决策区里显示当时的情况）');

  /* ── ⑦ 布局：右边没有别的列；页签区在固定区下方 ──────────────────── */
  await page.eval('window.scrollTo(0, 0)');
  await delay(120);
  const measure = '(() => { const track = document.querySelector(".viz-card-track").getBoundingClientRect(); const panel = document.querySelector(".viz-tabpanel").getBoundingClientRect(); return { trackRight: track.right, trackTop: track.top, trackBottom: track.bottom, panelLeft: panel.left, panelRight: panel.right, panelTop: panel.top, viewportRight: window.innerWidth }; })()';
  assert.equal(assertDecisionBoxPlacement(await page.eval(measure)), true);
  assert.equal(assertTabsBelowTrack(await page.eval(measure)), true);
  report.checks.push('主区是单列（右边没有决策卡那一列），页签区在固定区（轴 + 曲线）下方');

  /* ── ⑦·二 决策内容收在页签里，不许悬浮 ───────────────────────────
   * ⚠ 决策区以前是右边一个独立的框（`position: sticky`）
   *   ⇒ 窄屏单列布局时它浮在页面左边、盖住下面的内容。
   */
  const decisionDom = '(() => { const block = document.querySelector("#tabpanel .viz-decision-block"); const panel = document.querySelector(".viz-tabpanel").getBoundingClientRect(); return { insideTabPanel: !!(block && block.closest(".viz-tabpanel")), rightColumnPresent: !!document.querySelector(".viz-card-decision"), position: block ? getComputedStyle(block).position : "none" }; })()';
  assert.equal(assertDecisionInsideTabs(await page.eval(decisionDom)), true, '决策区应当收在页签里，而且不是悬浮的');
  report.checks.push('决策区收在「当前状态」页里（不再是右边那个框），也不是悬浮的');

  /* ⚠ 反向验证：把决策区真的改回吸顶 ⇒ 断言必须报红。 */
  await page.eval('document.querySelector("#tabpanel .viz-decision-block").style.position = "sticky";');
  await delay(200);
  const stickyDom = await page.eval(decisionDom);
  assert.throws(() => assertDecisionInsideTabs(stickyDom), /又变回悬浮的了/);
  await page.eval('document.querySelector("#tabpanel .viz-decision-block").style.position = "";');
  await delay(200);
  report.checks.push('反向验证：把决策区真的改回吸顶，「不许悬浮」那条确实报红');

  /* ⚠ 再来一次：把右边那一列塞回来（模拟没搬走）⇒ 断言必须报红。 */
  await page.eval('(() => { const card = document.createElement("section"); card.className = "viz-card viz-card-decision"; card.id = "fake-decision"; card.textContent = "假决策卡"; document.querySelector(".viz-main").appendChild(card); })()');
  await delay(200);
  const withColumn = await page.eval(decisionDom);
  assert.throws(() => assertDecisionInsideTabs(withColumn), /右边还有一列/);
  await page.eval('document.querySelector("#fake-decision").remove()');
  await delay(150);
  report.checks.push('反向验证：把右边那一列塞回来，「不许有右列」那条确实报红');

  /* ⚠ 再来一次：把页签区挪到固定区上面 ⇒ 「页签在下面」那条必须报红。 */
  await page.eval('document.querySelector(".viz-tabpanel").style.gridRow = "1"; document.querySelector(".viz-tabpanel").style.gridColumn = "1";');
  await delay(120);
  const raisedPanel = await page.eval(measure);
  assert.throws(() => assertTabsBelowTrack(raisedPanel), /页签区不在固定区下方/);
  await page.eval('document.querySelector(".viz-tabpanel").style.gridRow = ""; document.querySelector(".viz-tabpanel").style.gridColumn = "";');
  report.checks.push('反向验证：把页签区真的挪到轴上面，「页签在下方」那条确实报红');

  /* ── ⑧ 页签条本身 ─────────────────────────────────────────────────── */
  const tabButtons = await page.eval('[...document.querySelectorAll("#tabs [data-tab]")].map(button => ({ id: button.dataset.tab, current: button.getAttribute("aria-current"), active: button.classList.contains("active") }))');
  assert.equal(tabButtons.length, TABS.length, '页签应有 ' + TABS.length + ' 个，实际 ' + tabButtons.length + ' 个');
  for (let index = 0; index < TABS.length; index++) {
    assert.equal(tabButtons[index].id, TABS[index].id, '第 ' + (index + 1) + ' 个页签的 id 不对');
  }
  const currentTab = await page.eval('window.vizPanel.tab');
  assert.equal(tabButtons.filter(button => button.current === 'page').length, 1, '同一时间只能有一个页签被标成当前');
  assert.equal(tabButtons.find(button => button.current === 'page').id, currentTab, '被标成当前的页签与面板状态对不上');
  report.checks.push('页签条有 ' + TABS.length + ' 个页签（' + TABS.map(tab => tab.label).join(' / ') + '），当前项标记正确');

  /* ── ⑨ 逐个点开六个页签：内容对得上，且一次只渲染当前页签 ─────────── */
  const panelData = {
    state: () => page.eval('window.vizPanel.snapshot'),
    items: () => page.eval('window.vizPanel.items'),
    map: () => page.eval('window.vizPanel.map'),
    world: () => page.eval('window.vizPanel.world'),
    people: () => page.eval('window.vizPanel.people'),
    journal: () => page.eval('window.vizPanel.journal'),
  };
  for (const tab of TABS) {
    await page.click('#tabs [data-tab="' + tab.id + '"]');
    await page.waitFor('window.vizPanel.tab === "' + tab.id + '"');
    const text = await page.eval('document.querySelector("#tabpanel").textContent');
    const present = await page.eval('!!document.querySelector("#tabpanel ' + tab.marker + '")');
    assert.ok(present, '「' + tab.label + '」页签点开了，但内容没画出来');
    /* 一次只渲染当前页签 ⇒ 别的页签的标志物不许出现。 */
    for (const other of TABS) {
      if (other.id === tab.id) continue;
      const leaked = await page.eval('!!document.querySelector("#tabpanel ' + other.marker + '")');
      assert.equal(leaked, false, '「' + tab.label + '」页签里混进了「' + other.label + '」页签的内容');
    }
    /* 上面的固定区（轴 + 曲线）必须一直在。
     * ⚠ 决策区现在只出现在「当前状态」页里（它是「现在」的事）⇒ 别的页签里不许有。 */
    const trackSvgs = await page.eval('document.querySelectorAll("#track svg").length');
    assert.ok(trackSvgs >= 4, '「' + tab.label + '」页签时轴与曲线不见了');
    const decisionHere = await page.eval('!!document.querySelector("#tabpanel .viz-decision-block")');
    assert.equal(decisionHere, tab.id === 'state', '决策区只该出现在「当前状态」页里');
    /* 数据层断言：这一页的数据必须与引擎相等。 */
    const data = await panelData[tab.id]();
    if (tab.id === 'state') assert.equal(assertSnapshotMatchesState(data, stateNow), true);
    if (tab.id === 'items') {
      const timeline = await page.eval('window.vizPanel.itemTimeline');
      assert.equal(assertItemsMatchInventory(data, stateNow), true);
      assert.equal(assertItemsTimeline(data, timeline), true);
    }
    if (tab.id === 'map') assert.equal(assertMapMatchesGeography(data, stateNow), true);
    if (tab.id === 'world') assert.equal(assertWorldMatchesState(data, stateNow), true);
    if (tab.id === 'people') assert.equal(assertPeopleMatchState(data, stateNow), true);
    if (tab.id === 'journal') assert.equal(assertJournalMatchesState(data, stateNow), true);
    /* 画出来了吗？—— 数据对但没画出来，等于没做。 */
    if (tab.id === 'state') {
      assertDomContainsAll(text, [data.name, data.realmName, ...data.inventory], '当前状态页');
    }
    if (tab.id === 'items') {
      assertDomContainsAll(text, [
        '道具全表 ' + data.total + ' 件',
        '这条命碰到 ' + data.acquired.length + ' 件',
        '现在带着 ' + data.heldCount + ' 件',
        '一次都没碰到 ' + data.missed.length + ' 件',
        ...data.acquired.map(row => row.name),
      ], '道具页');
    }
    if (tab.id === 'map') {
      assertDomContainsAll(text, data.nodes.map(node => node.name), '地图页');
      assertDomContainsAll(text, data.nodes.map(node => node.specialty).filter(Boolean), '地图页');
    }
    if (tab.id === 'world') {
      const expected = [data.realm.name, '全部功法（' + data.methodCount + ' 部）'];
      if (data.sect) expected.push(data.sect.name);
      if (data.method) expected.push(data.method.name);
      assertDomContainsAll(text, expected, '世界观页');
    }
    if (tab.id === 'people') {
      assertDomContainsAll(text, ['家人羁绊 ' + data.family.bond, '家产 ' + data.properties.length + ' 处'], '人物页');
      assertDomContainsAll(text, data.all.map(row => row.name).filter(Boolean), '人物页');
    }
    if (tab.id === 'journal') {
      assertDomContainsAll(text, [
        '抉择流水' + data.decisions.length + ' 次',
        '一生的正文' + data.journal.length + ' 条',
        ...data.journal.map(row => row.title).filter(Boolean),
      ], '流水页');
    }
  }
  report.checks.push('六个页签逐个点开：各自内容与引擎逐条相等，且一次只渲染当前页签（固定区始终在）');

  /* ⚠ 切页签时若哪个页签渲染抛错，界面会**停在上一页**（看起来像「点不动」）——
     ⇒ 这里把整段交互期间的脚本报错捞出来，别让它们悄悄过去。 */
  assert.deepEqual(page.errors, [], '切页签的过程中有脚本报错：' + page.errors.join(' | '));
  report.checks.push('整个切页签过程零脚本报错');

  /* ⚠ 反向验证：页签切换一旦坏了（切了不换内容），上面那圈断言必须报红。 */
  await page.click('#tabs [data-tab="items"]');
  await page.waitFor('window.vizPanel.tab === "items"');
  const itemsText = await page.eval('document.querySelector("#tabpanel").textContent');
  const mapText = await page.eval('(() => { window.vizPanel.tab = "map"; return "假装这是地图页的内容"; })()');
  assert.throws(() => assertDomContainsAll(mapText, ['道具全表'], '地图页'), /少了「道具全表」/);
  assert.equal(assertDomContainsAll(itemsText, ['道具全表'], '道具页'), true);
  await page.click('#tabs [data-tab="map"]');
  await page.waitFor('window.vizPanel.tab === "map"');
  report.checks.push('反向验证：拿别的页签的内容冒充，道具页的内容比对确实报红');

  /* ── ⑩ 批量实测：浏览器跑一批，Node 侧独立跑一遍，两边必须一样 ────── */
  await page.click('#run-batch');
  await page.waitFor('window.vizPanel.batch && window.vizPanel.batch.lives > 0', 90000);
  const browserBatch = await page.eval('window.vizPanel.batch');
  const nodeBatch = await runBatch(40, null);
  assert.equal(assertBatchMatchesRuns(nodeBatch.batch, nodeBatch.runs), true);
  assert.equal(browserBatch.lives, 40, '浏览器应当跑了 40 条命');
  assert.equal(browserBatch.finished + browserBatch.broken, browserBatch.lives, '跑完的 + 中断的应当等于总数');
  assert.ok(browserBatch.decisions > 0, '这批命该有抉择');
  assert.ok(browserBatch.itemCount > 0, '这批命该碰到过道具');
  assert.ok(Object.keys(browserBatch.endings).length > 0, '这批命该有结局分布');
  assert.deepEqual(browserBatch, nodeBatch.batch, '浏览器跑的批量统计与 Node 侧独立跑一遍的结果不一致');
  report.checks.push('「跑一批」跑了 40 条命：统计能被那批命逐条重算复现，且与 Node 侧独立跑一遍完全一致');

  /* 批量结果要真的显示在流水页上。 */
  await page.click('#tabs [data-tab="journal"]');
  await page.waitFor('window.vizPanel.tab === "journal"');
  const journalText = await page.eval('document.querySelector("#tabpanel").textContent');
  assertDomContainsAll(journalText, ['跑了 ' + browserBatch.lives + ' 条', '结局分布', '各境到达年龄'], '流水页的批量实测');
  report.checks.push('批量实测的覆盖度表显示在流水页上');

  /* ── ⑫·五 与上一次跑批比：第一次跑 ⇒ 没有可比的（必须**明说**） ──────
   * ⚠ 第一次跑批本地没有「上一次」⇒ 面板必须写清楚「还没有可比的」，
   *   不能悄悄给一个空差异（看着像「没变化」，其实是从没比过）。
   */
  const firstHistory = await page.eval('window.vizPanel.history');
  assert.ok(firstHistory && firstHistory.policy, '跑完批应当有一份「与上一次跑批比」');
  assert.equal(firstHistory.policy.previous, null, '第一次跑批本地应当没有「上一次」');
  assert.deepEqual(firstHistory.policy.rows, [], '没有上一次 ⇒ 差异必须是空的');
  assertDomContainsAll(journalText, ['与上一次跑批比', '还没有上一次的记录'], '流水页的「与上一次跑批比」');
  report.checks.push('第一次跑批：面板明说「还没有上一次的记录可比」（不是悄悄给一个空差异）');

  /* ── ⑫ 内容覆盖：按规则版本分桶，浏览器与 Node 侧必须完全一致 ─────── */
  const browserCoverage = await page.eval('window.vizPanel.coverage');
  const nodeCoverage = buildCoverage(nodeBatch.runs, { rulesVersion: 12 });
  assert.equal(assertCoverageMatchesRuns(browserCoverage, nodeBatch.runs), true, '浏览器那份覆盖统计不能由那批命重算复现');
  assert.deepEqual(browserCoverage, nodeCoverage, '浏览器与 Node 侧的内容覆盖对不上');
  const currentBucket = browserCoverage.cards.buckets.find(bucket => bucket.id === 'current');
  const classicBucket = browserCoverage.cards.buckets.find(bucket => bucket.id === 'classic');
  assert.ok(currentBucket.total > 0, '当前版本的桶必须有卡');
  assert.ok(classicBucket.total > 0, '经典故事层的桶必须有卡');
  assert.equal(currentBucket.hit + currentBucket.missed.length, currentBucket.total, '命中 + 没出现 = 总数');
  assert.ok(browserCoverage.choices.unused.length > 0, '这批命应当有「从没被选过的选项」可看');
  report.checks.push('内容覆盖按规则版本分了 ' + browserCoverage.cards.buckets.length + ' 个桶（当前版本 ' + currentBucket.hit + '/' + currentBucket.total + '、经典故事层 ' + classicBucket.hit + '/' + classicBucket.total + '），浏览器与 Node 侧完全一致');

  /* ⚠ 覆盖表必须真的画在页面上，而且数字与数据一致。 */
  assertDomContainsAll(journalText, [
    '内容覆盖',
    '剧情卡覆盖',
    '当前版本（规则12）',
    '经典故事层',
    '整族没走到',
    '从没被选过的选项',
    '角儿',
    '剧情卡（当前版本）' + currentBucket.hit + ' / ' + currentBucket.total,
    '道具 ' + browserCoverage.items.hit + ' / ' + browserCoverage.items.total,
    '结局 ' + browserCoverage.endings.hit + ' / ' + browserCoverage.endings.total,
  ], '流水页的内容覆盖');
  /* 角儿：每一组的标签与「从没遇到的角儿」都要在页面上。 */
  assertDomContainsAll(journalText, browserCoverage.people.groups.map(group => group.label), '流水页的角儿覆盖');
  for (const slot of browserCoverage.people.neverMet) {
    assertDomContainsAll(journalText, [slot.label], '流水页的「从没遇到的角儿」');
  }
  report.checks.push('内容覆盖表画在流水页上：分桶、整族没走到、从没被选过的选项、角儿覆盖都在');

  /* ⚠ 反向验证：把页面上的覆盖数据改坏 ⇒ 断言必须报红（不然这条是假门禁）。 */
  const tampered = await page.eval('(() => { const copy = JSON.parse(JSON.stringify(window.vizPanel.coverage)); copy.cards.buckets[0].hit += 1; return copy; })()');
  assert.throws(() => assertCoverageMatchesRuns(tampered, nodeBatch.runs), /的命中数对不上/);
  report.checks.push('反向验证：把页面上的覆盖命中数改坏，重算断言确实报红');

  /* ── ⑫·二 按阶段 / 境界：这段人生有没有内容可看 ───────────────────── */
  const browserStage = await page.eval('window.vizPanel.stageCoverage');
  const nodeStage = buildStageCoverage(nodeBatch.runs, { rulesVersion: 12 });
  assert.equal(assertStageCoverageMatchesRuns(browserStage, nodeBatch.runs), true, '浏览器那份「按阶段 / 境界」不能由那批命重算复现');
  assert.deepEqual(browserStage, nodeStage, '浏览器与 Node 侧的「按阶段 / 境界」对不上');
  assert.equal(browserStage.realms.length, 5, '应当有五个境界段');
  assert.equal(browserStage.stages.length, 6, '应当有六个人生阶段');
  assert.ok(browserStage.realms.some(row => row.kinds > 0), '至少有一个境界段碰到过内容');
  assert.ok(browserStage.stages.some(row => row.kinds > 0), '至少有一段人生碰到过内容');
  /* ⚠ 供给侧必须与规则层**阶段闸用的同一份声明**对上（不许面板自己抄一份）。 */
  const declaredTotal = browserStage.declaredStages.reduce((sum, row) => sum + row.total, 0)
    + browserStage.declaredRealms.reduce((sum, row) => sum + row.total, 0);
  assert.ok(declaredTotal > 0, '阶段闸管的卡应当不为空');
  report.checks.push('「按阶段 / 境界」：浏览器与 Node 侧完全一致，且能被那批命重算复现（' + browserStage.realms.map(row => row.name + ' ' + row.kinds + ' 种').join('、') + '）');

  /* ⚠ 这一块必须真的画在流水页上，而且每个境界名、阶段名都在。 */
  assertDomContainsAll(journalText, [
    '按阶段 / 境界看内容',
    '按境界段',
    '按人生阶段',
    '阶段闸管的卡',
    browserStage.late.age + ' 岁以后共碰到 ' + browserStage.late.kinds + ' 种卡',
    '底线 ' + browserStage.late.floor + ' 种',
    ...browserStage.realms.map(row => row.name),
    ...browserStage.stages.map(row => row.name),
  ], '流水页的「按阶段 / 境界」');
  report.checks.push('「按阶段 / 境界」画在流水页上：五个境界段、六个人生阶段、阶段闸管的卡都在');

  /* ⚠ 反向验证：把页面上的阶段覆盖改坏 ⇒ 断言必须报红。 */
  const tamperedStage = await page.eval('(() => { const copy = JSON.parse(JSON.stringify(window.vizPanel.stageCoverage)); copy.realms[0].kinds += 1; return copy; })()');
  assert.throws(() => assertStageCoverageMatchesRuns(tamperedStage, nodeBatch.runs), /碰到几种内容对不上/);
  const tamperedStage2 = await page.eval('(() => { const copy = JSON.parse(JSON.stringify(window.vizPanel.stageCoverage)); copy.declaredStages[0].total += 1; return copy; })()');
  assert.throws(() => assertStageCoverageMatchesRuns(tamperedStage2, nodeBatch.runs), /声明了几张卡对不上/);
  report.checks.push('反向验证：把页面上的「按阶段 / 境界」改坏（命中数 / 声明数），重算断言确实报红');

  /* ── ⑫·三 角色进度：这批命怎么往上走 ───────────────────────────────── */
  const browserProgress = await page.eval('window.vizPanel.progress');
  const nodeProgress = buildProgress(nodeBatch.runs);
  assert.equal(assertProgressMatchesRuns(browserProgress, nodeBatch.runs), true, '浏览器那份「角色进度」不能由那批命重算复现');
  assert.deepEqual(browserProgress, nodeProgress, '浏览器与 Node 侧的「角色进度」对不上');
  assert.equal(browserProgress.realms.length, 5, '应当有五个境界');
  assert.ok(browserProgress.realms[0].reached === browserProgress.finished, '凡身人人都在');
  /* ⚠ 进度表里的「到达年龄」必须与批量统计的「各境到达年龄」**同一口径**（不许两个数打架）。 */
  for (const row of browserBatch.reach) {
    const shown = browserProgress.realms.find(entry => entry.realm === row.realm);
    assert.ok(shown, '角色进度里应当有「' + row.name + '」这一境');
    assert.equal(shown.reached, row.count, '「' + row.name + '」到达的命数与批量统计对不上');
    assert.equal(shown.medianAge, row.medianAge, '「' + row.name + '」到达年龄与批量统计对不上');
  }
  report.checks.push('「角色进度」：浏览器与 Node 侧完全一致，且能被那批命重算复现（各境到达人数与「各境到达年龄」同一口径）');

  assertDomContainsAll(journalText, [
    '角色进度',
    '各境推进',
    '突破间隔',
    ...browserProgress.realms.map(row => row.name),
  ], '流水页的「角色进度」');
  report.checks.push('「角色进度」画在流水页上：各境推进的漏斗与突破间隔都在');

  const tamperedProgress = await page.eval('(() => { const copy = JSON.parse(JSON.stringify(window.vizPanel.progress)); copy.realms[1].reached += 1; return copy; })()');
  assert.throws(() => assertProgressMatchesRuns(tamperedProgress, nodeBatch.runs), /到达的命数对不上/);
  report.checks.push('反向验证：把页面上的「角色进度」改坏（到达人数），重算断言确实报红');

  /* ── ⑫·四 问题清单：跑完批第一眼要看到「有什么问题」 ─────────────────── */
  const browserFindings = await page.eval('window.vizPanel.findings');
  assert.ok(browserFindings && browserFindings.length, '跑完批应当有一份问题清单');
  assert.equal(assertFindingsMatchSources(browserFindings, { coverage: browserCoverage, stageCoverage: browserStage, progress: browserProgress }), true, '页面上的问题清单与那三块源头对不上');
  assert.deepEqual(browserFindings, buildFindings({ coverage: nodeCoverage, stageCoverage: nodeStage, progress: nodeProgress }), '浏览器与 Node 侧的问题清单不一致');
  assertDomContainsAll(journalText, ['问题清单', ...browserFindings.map(row => row.title)], '流水页的问题清单');
  report.checks.push('问题清单画在流水页最上面：' + browserFindings.length + ' 类问题（' + browserFindings.map(row => row.title).join(' / ') + '）');

  const tamperedFindings = await page.eval('(() => { const copy = JSON.parse(JSON.stringify(window.vizPanel.findings)); copy[0].count += 1; return copy; })()');
  assert.throws(() => assertFindingsMatchSources(tamperedFindings, { coverage: browserCoverage, stageCoverage: browserStage, progress: browserProgress }), /的数量对不上/);
  report.checks.push('反向验证：把页面上的问题清单数量改坏，重算断言确实报红');

  /* ── ⑬ 批量观测台：能切玩法、能选条数，两种玩法都能跑 ─────────────── */
  const consoleControls = await page.eval('(() => ({ count: !!document.querySelector("#batch-count"), mode: !!document.querySelector("#batch-mode"), button: !!document.querySelector("#run-batch"), status: !!document.querySelector("#batch-status") }))()');
  assert.deepEqual(consoleControls, { count: true, mode: true, button: true, status: true }, '批量观测台的控件应当齐全（条数 / 玩法 / 跑一批 / 状态）');
  assertDomContainsAll(await page.eval('document.querySelector(".viz-card-batch").textContent'), ['批量观测台', '条数', '玩法', '固定偏好', '随机探索'], '批量观测台');
  report.checks.push('批量观测台常驻在轴的下面：条数、玩法（固定偏好 / 随机探索）、跑一批都在');

  /* ⚠ 随机探索：浏览器与 Node 侧必须**逐条一致**（同种子 ⇒ 同结果）。 */
  await page.eval('document.querySelector("#batch-mode").value = "random"; document.querySelector("#batch-count").value = "20";');
  await page.click('#run-batch');
  await page.waitFor('window.vizPanel.batchMode === "random" && window.vizPanel.batch && window.vizPanel.batch.lives > 0', 90000);
  const randomBatch = await page.eval('window.vizPanel.batch');
  const nodeRandom = await runBatch(20, null, { mode: 'random' });
  assert.equal(randomBatch.lives, 20, '随机探索应当跑了 20 条命');
  assert.deepEqual(randomBatch, nodeRandom.batch, '随机探索的批量统计与 Node 侧不一致');
  assert.notEqual(randomBatch.decisions, browserBatch.decisions, '随机探索与固定偏好不该走出一样的抉择数');
  const randomCoverage = await page.eval('window.vizPanel.coverage');
  assert.equal(assertCoverageMatchesRuns(randomCoverage, nodeRandom.runs), true, '随机探索那份覆盖统计不能由那批命重算复现');
  report.checks.push('随机探索：浏览器与 Node 侧逐条一致（' + randomBatch.decisions + ' 次抉择，固定偏好是 ' + browserBatch.decisions + ' 次），覆盖统计也能重算复现');

  /* ── ⑮ 两种玩法并排比：跑批的价值在**差异**，不在平均 ─────────────── */
  await page.eval('document.querySelector("#batch-mode").value = "both"; document.querySelector("#batch-count").value = "20";');
  await page.click('#run-batch');
  await page.waitFor('window.vizPanel.compare && window.vizPanel.batchMode === "both"', 120000);
  const browserCompare = await page.eval('window.vizPanel.compare');
  /* ⚠ Node 侧**独立**跑同样两批命 ⇒ 两边必须逐值全等（同种子 ⇒ 同结果）。 */
  const nodeLeft = await runBatch(20, null, { mode: 'policy' });
  const nodeRight = await runBatch(20, null, { mode: 'random' });
  const nodeLeftCoverage = buildCoverage(nodeLeft.runs, { rulesVersion: 12 });
  const nodeRightCoverage = buildCoverage(nodeRight.runs, { rulesVersion: 12 });
  const nodeCompare = buildComparison(
    { label: '固定偏好', batch: nodeLeft.batch, coverage: nodeLeftCoverage },
    { label: '随机探索', batch: nodeRight.batch, coverage: nodeRightCoverage },
    { rulesVersion: 12 },
  );
  assert.equal(assertComparisonMatchesRuns(browserCompare, nodeLeft.runs, nodeRight.runs), true, '浏览器那份并排比不能由那两批命重算复现');
  assert.deepEqual(browserCompare, nodeCompare, '浏览器与 Node 侧的并排比对不上');
  assert.ok(browserCompare.onlyLeft.cards.length > 0, '固定偏好应当有「只它走到」的卡（否则比了也看不出差别）');
  report.checks.push('两种玩法并排比：浏览器与 Node 侧完全一致，且能被那两批命重算复现（只固定偏好 ' + browserCompare.onlyLeft.cards.length + ' 张卡、只随机探索 ' + browserCompare.onlyRight.cards.length + ' 张卡、两种都没走到 ' + browserCompare.neither.cards.length + ' 张）');

  /* ⚠ 两种玩法各自的「按阶段 / 境界」也要对得上（随机探索那一侧不是装饰）。 */
  const browserStageAlt = await page.eval('window.vizPanel.stageCoverageAlt');
  assert.ok(browserStageAlt, '「两种都跑」时应当有随机探索那一侧的阶段覆盖');
  assert.equal(assertStageCoverageMatchesRuns(browserStageAlt, nodeRight.runs), true, '随机探索那侧的阶段覆盖不能由那批命重算复现');
  assert.deepEqual(browserStageAlt, buildStageCoverage(nodeRight.runs, { rulesVersion: 12 }), '随机探索那侧的阶段覆盖与 Node 侧对不上');
  report.checks.push('「两种都跑」时，两边各自的「按阶段 / 境界」都能由各自那批命重算复现');

  /* ⚠ 并排比的结果必须真的画在流水页上。 */
  await page.click('#tabs [data-tab="journal"]');
  await page.waitFor('window.vizPanel.tab === "journal"');
  const cmpText = await page.eval('document.querySelector("#tabpanel").textContent');
  assertDomContainsAll(cmpText, [
    '两种玩法并排比',
    '只「固定偏好」走到',
    '只「随机探索」走到',
    '两种都没走到',
    '角儿差异',
    '剧情卡（当前版本）',
  ], '流水页的并排比');
  report.checks.push('并排比的结果画在流水页上：只谁走到、两种都没走到、角儿差异都在');

  /* ⚠ 反向验证：把页面上的并排比数据改坏 ⇒ 断言必须报红。 */
  const tamperedCompare = await page.eval('(() => { const copy = JSON.parse(JSON.stringify(window.vizPanel.compare)); copy.rows[0].left += 1; return copy; })()');
  assert.throws(() => assertComparisonMatchesRuns(tamperedCompare, nodeLeft.runs, nodeRight.runs), /左边的数对不上/);
  const tamperedDiff = await page.eval('(() => { const copy = JSON.parse(JSON.stringify(window.vizPanel.compare)); copy.onlyLeft.cards[0].id = "假的卡"; return copy; })()');
  assert.throws(() => assertComparisonMatchesRuns(tamperedDiff, nodeLeft.runs, nodeRight.runs), /条数对不上|清单对不上/);
  report.checks.push('反向验证：把页面上的并排比数据改坏（指标表 / 差集），重算断言确实报红');

  /* ⚠ 换回单玩法 ⇒ 旧的对比必须**作废**（留着上一批的数字会骗人）。 */
  await page.eval('document.querySelector("#batch-mode").value = "policy"; document.querySelector("#batch-count").value = "20";');
  await page.click('#run-batch');
  await page.waitFor('window.vizPanel.batchMode === "policy" && window.vizPanel.compare === null', 120000);
  report.checks.push('换回单玩法后，旧的并排比会作废（不留着上一批的数字骗人）');

  /* ── ⑫·六 与上一次跑批比：塞一份「上一次」⇒ 再跑 ⇒ 必须看得出变化 ────
   * ⚠ 同一批命跑两遍 ⇒ 数字不该变 ⇒ 面板要说「没有变化」，
   *   而不是每次都比出点差异（看久了就麻木了）。
   */
  const sameHistory = await page.eval('window.vizPanel.history');
  assert.ok(sameHistory && sameHistory.policy, '跑完批应当有「与上一次跑批比」');
  assert.deepEqual(sameHistory.policy.rows, [], '同一批命跑两遍 ⇒ 数字不该变');
  assertDomContainsAll(await page.eval('document.querySelector("#tabpanel").textContent'), ['跟上次跑的一模一样'], '流水页的「与上一次跑批比」（没有变化）');
  report.checks.push('同一批命跑两遍：面板说「跟上次跑的一模一样」（不会每次都假装有变化）');

  /* ⚠ 塞一份「上一次」的记录（把两个数改掉）⇒ 再跑一批 ⇒ 必须看得出变化。 */
  const saved = await page.eval('window.vizPanel.history.policy.next');
  const older = JSON.parse(JSON.stringify(saved));
  older.at = '2026-11-01T00:00:00.000Z';
  older.metrics.cards = older.metrics.cards - 5;
  older.metrics.sceneFamilies = older.metrics.sceneFamilies + 3;
  await page.eval('localStorage.setItem(' + JSON.stringify(HISTORY_KEY) + ', ' + JSON.stringify(JSON.stringify({ policy: older })) + ')');
  await page.click('#run-batch');
  await page.waitFor('window.vizPanel.history && window.vizPanel.history.policy && window.vizPanel.history.policy.rows.length > 0', 120000);
  const hist = await page.eval('window.vizPanel.history');
  const cardsRow = hist.policy.rows.find(row => row.key === 'cards');
  const sceneRow = hist.policy.rows.find(row => row.key === 'sceneFamilies');
  assert.ok(cardsRow, '差异里应当有「剧情卡（当前版本）」');
  assert.equal(cardsRow.after - cardsRow.before, 5, '剧情卡的差值应当是 +5');
  assert.equal(cardsRow.good, true, '剧情卡变多 ⇒ 变好');
  assert.equal(sceneRow.after - sceneRow.before, -3, '「一族都没走到」的差值应当是 -3');
  assert.equal(sceneRow.good, true, '缺口类变少 ⇒ 变好');
  assert.equal(hist.policy.rows.length, 2, '只改了两个数 ⇒ 差异里就该只有两项（没变的项不许冒出来）');
  /* ⚠ 页面上的快照必须与那三块源头对得上；差异必须与两份快照对得上。 */
  const coverage2 = await page.eval('window.vizPanel.coverage');
  const stage2 = await page.eval('window.vizPanel.stageCoverage');
  const progress2 = await page.eval('window.vizPanel.progress');
  assert.equal(assertBatchSnapshotMatchesSources(hist.policy.next, { coverage: coverage2, stageCoverage: stage2, progress: progress2 }), true, '页面上的快照与那三块源头对不上');
  assert.equal(assertBatchDiffDetectsChange(hist.policy.previous, hist.policy.next, hist.policy.rows), true, '页面上的差异与两份快照对不上');
  /* ⚠ 差异必须真的画在页面上。 */
  const histText = await page.eval('document.querySelector("#tabpanel").textContent');
  assertDomContainsAll(histText, ['与上一次跑批比', '剧情卡（当前版本）', '一族都没走到', '变好了'], '流水页的「与上一次跑批比」（有变化）');
  report.checks.push('与上一次跑批比：塞一份旧记录再跑，差异真的算出来、真的画出来（剧情卡 +5、一族没走到 -3，两项都判「变好」）');

  /* ⚠ 反向验证：把页面上的差异 / 快照改坏 ⇒ 断言必须报红（不然这条是假门禁）。 */
  const tamperedRows = await page.eval('(() => { const c = JSON.parse(JSON.stringify(window.vizPanel.history)); c.policy.rows[0].after += 1; return c; })()');
  assert.throws(() => assertBatchDiffDetectsChange(tamperedRows.policy.previous, tamperedRows.policy.next, tamperedRows.policy.rows), /差异数字对不上/);
  const tamperedSnapshot = await page.eval('(() => { const c = JSON.parse(JSON.stringify(window.vizPanel.history)); c.policy.next.metrics.cards += 1; return c; })()');
  assert.throws(() => assertBatchSnapshotMatchesSources(tamperedSnapshot.policy.next, { coverage: coverage2, stageCoverage: stage2, progress: progress2 }), /剧情卡（当前版本）/);
  report.checks.push('反向验证：把页面上的差异 / 快照改坏，重算断言确实报红');

  /* ── ⑭ 自动播放：人一个决定都不用做，系统自己走这条命 ─────────────── */
  /* ⚠ 先换一条**新命** —— 前面点过「跑完一生」，那条命已经走完了，自动播放没东西可走。 */
  await page.eval('document.getElementById("run-form").requestSubmit()');
  await page.waitFor('window.vizPanel.state.phase === "life" && window.vizPanel.steps.length === 0');
  await page.click('#tabs [data-tab="state"]');
  await page.waitFor('window.vizPanel.tab === "state"');
  const beforeAuto = await page.eval('({ month: window.vizPanel.state.month, steps: window.vizPanel.steps.length })');
  assert.equal(await page.eval('!!document.querySelector("#auto-mode")'), true, '自动走法（按偏好 / 随机）的选择器应当存在');
  await page.click('#auto-play');
  let duringAuto = beforeAuto;
  for (let attempt = 0; attempt < 40; attempt++) {
    await delay(200);
    duringAuto = await page.eval('({ month: window.vizPanel.state.month, steps: window.vizPanel.steps.length })');
    if (duringAuto.steps > beforeAuto.steps && duringAuto.month > beforeAuto.month) break;
  }
  assert.ok(duringAuto.month > beforeAuto.month, '点了「让它自己走」之后，命应当自己往前走了');
  assert.ok(duringAuto.steps > beforeAuto.steps, '自动播放时系统应当自己做了抉择');
  assert.equal(await page.eval('document.querySelector("#auto-play").textContent'), '停下', '自动播放时按钮应当变成「停下」');
  assertDomContainsAll(await page.eval('document.querySelector("#tabpanel .viz-decision-block").textContent'), ['自动进行中'], '自动播放时的决策区');
  await page.click('#auto-play');
  await delay(250);
  assert.equal(await page.eval('document.querySelector("#auto-play").textContent'), '让它自己走', '停下之后按钮应当变回来');
  const afterStop = await page.eval('window.vizPanel.state.month');
  await delay(600);
  assert.equal(await page.eval('window.vizPanel.state.month'), afterStop, '停下之后命不该再自己走');
  report.checks.push('「让它自己走」：人一个决定都不用做 —— 系统自己选、自己往前跑，停下即停');

  /* ── ⑪ 出图（交付物） ─────────────────────────────────────────────── */
  await page.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1700, deviceScaleFactor: 1, mobile: false });
  for (const tab of TABS) {
    await page.click('#tabs [data-tab="' + tab.id + '"]');
    await page.waitFor('window.vizPanel.tab === "' + tab.id + '"');
    await delay(120);
    await page.screenshot(join(out, 'tab-' + tab.id + '.png'));
  }
  report.checks.push('六个页签各出一张图（artifacts/viz-panel/tab-*.png）');

  report.passed = true;
  report.browser = browser.version.product;
  console.log('VIZ PANEL PASS · ' + report.checks.length + ' 项');
} catch (error) {
  report.passed = false;
  report.error = error.stack || error.message;
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await server?.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
