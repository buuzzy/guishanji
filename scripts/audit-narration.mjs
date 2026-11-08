#!/usr/bin/env node
/**
 * 叙述密度门禁 —— 「一件大事 + 六件小事」
 * ============================================================================
 *
 * ## 守什么
 * --------
 * 官方的节奏是「一件大事 + 六件小事」：
 * **每弹 1 张决策卡，平均伴随 6.5 条人生经历**
 * （官方对照报告 §6.2：一生流水中位 362 ÷ 一生决策卡中位 56 = 6.46；
 *   平均 345 ÷ 53.3 = 6.47）。
 *
 * 我们这边同口径一度只有 **3.99** ⇒ 骨架有了，肉不够 ⇒ 玩家读到的全是「决定」，
 * 没有「正在过的日子」。2026-11-08（阶段 5）补了「人生场景」这条旁白通道。
 *
 * ## 四条断言
 * ----------
 *   1. **叙述:决策 的比值**（一生流水 ÷ 一生决策卡，中位/中位）落在 [6.3, 8.0]。
 *      · 下限 6.3 = 官方那个数的下限（官方 6.46）；
 *      · 上限 8.0 是防「过度加密」—— 旁白比官方还密，玩家同样读不动。
 *   2. **每条路径都达标**（≥ 5.5）：凡人线的决策卡本来就少，
 *      比值天然偏高；这里管的是「没有哪一条路被落下」。
 *   3. **场景池没有发霉**：每一行都至少被走到过一次（样本内）。
 *      ⇒ 走池的步长必须与池长互素，否则只能走到池子的一部分。
 *   4. **场景通道不许碰随机流** —— 调排期与挑行**不许**消耗任何随机数。
 *      ⚠ 这是本阶段最要紧的一条：决策卡抽签用的是 `events` 流，
 *        旁白一旦也抽这个流 ⇒ 抽签次数变了 ⇒ **整条决策序列跟着变**。
 *        这道断言就是钉死「两者解耦」的。
 *
 * ## 用法
 * ------
 *   node scripts/audit-narration.mjs              # 跑一遍并打印
 *   node scripts/audit-narration.mjs --check      # 判定（回归门禁用这个）
 *   node scripts/audit-narration.mjs --count=120  # 样本量
 *   node scripts/audit-narration.mjs --json       # 机器可读
 */
import {createRun, choose, advance, validateRun} from '../packages/adventure/engine.js';
import {cultivationContext} from '../packages/adventure/cultivation.js';
import {SCENES, sceneDue, sceneStory, sceneStride} from '../content/cultivation-scenes.js';
import {decide} from './lib/decide-policy.js';

const RATIO_MIN = 6.3;      /* 官方 6.46 的下限（交接文档阶段 5 的目标） */
const RATIO_MAX = 8.0;      /* 防过度加密 */
const PATH_MIN = 5.5;       /* 每条路径的下限 */
const GAP_MAX = 60;         /* 场景间隔中位不得超过的月数 */

const PATHS = ['orthodox', 'loose', 'demonic', 'beast', 'mortal'];
const SCHOOLS = ['sword', 'alchemy', 'array'];

/** 场景池里的所有标题（用来把场景旁白从流水里认出来）。 */
const SCENE_TITLES = new Set(Object.values(SCENES).flat().map(row => row[0]));

/** 最大公约数（走池步长要与池长互素）。 */
function gcd(a, b) {
  let x = a, y = b;
  while (y) { const t = y; y = x % y; x = t; }
  return x;
}

function median(list) {
  const sorted = list.slice().sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
}

/**
 * 跑一条命，量出这一生的流水、决策卡、场景与间隔。
 * @param {number} index 样本序号
 */
function runLife(index) {
  const seed = '叙述审计-' + index;
  const spec = {
    seed,
    path: PATHS[index % PATHS.length],
    conduct: index % 7 === 0 ? 'selfish' : index % 3 === 0 ? 'cautious' : 'care',
    ending: index % 4 === 0 ? 'dao' : 'guard',
    family: index % 9 === 0 ? 'sever' : 'keep',
    school: SCHOOLS[index % SCHOOLS.length],
  };
  const state = createRun({seed, rulesVersion: 12});
  const months = [];
  for (let step = 0; step < 200 && state.phase === 'life'; step++) {
    while (state.phase === 'life' && !state.pending) { advance(state, 1); months.push(state.month); }
    if (!state.pending) break;
    const choice = decide(state, spec);
    if (!choice) throw new Error('没有可选项 ' + state.pending.event);
    choose(state, choice.id);
    validateRun(state);
  }
  if (state.phase !== 'ended') throw new Error('没有完成一生 ' + seed);
  const journal = state.journal;
  /* 决策卡数用**引擎自己的计数**（`state.decisions`，一张卡一条）——
     ⚠ 不许拿 journal 里的 'story'/'choice' 两条记录去数：
     一张卡会留下「卡面」与「选择」两条记录，数出来会翻倍。 */
  const decisions = state.decisions.length;
  const scenes = journal.filter(e => SCENE_TITLES.has(e.title));
  const gaps = [];
  for (let i = 1; i < scenes.length; i++) gaps.push(scenes[i].month - scenes[i - 1].month);
  return {
    path: spec.path,
    journal: journal.length,
    decisions,
    scenes: scenes.length,
    /* 「没有场景通道时」的比值 —— 用来量这条通道到底补了多少（对照用，不是断言） */
    withoutScenes: journal.length - scenes.length,
    gaps,
    state,
  };
}

/**
 * 断言四：场景通道不许消耗任何随机流，也不许改状态。
 * @param {object} state 一条命跑完后的状态
 */
function assertNoRandomDraw(state) {
  const before = JSON.stringify(state.random);
  const beforeCultivation = JSON.stringify(state.life.cultivation);
  const savedMonth = state.month;
  for (const context of ['home', 'work', 'retreat', 'abroad', 'childhood']) {
    for (let m = 0; m < 600; m += 7) {
      state.month = m;
      sceneDue(state, context);
      sceneStory(state, context);
    }
  }
  state.month = savedMonth;
  if (JSON.stringify(state.random) !== before) return '场景排期/挑行消耗了随机流';
  if (JSON.stringify(state.life.cultivation) !== beforeCultivation) return '场景排期/挑行改写了人生状态';
  return null;
}

const count = Number(process.argv.find(a => a.startsWith('--count='))?.split('=')[1] || 120);
const lives = [];
for (let i = 0; i < count; i++) lives.push(runLife(i));

const ratios = lives.map(l => l.journal / Math.max(1, l.decisions));
const byPath = {};
for (const life of lives) (byPath[life.path] ||= []).push(life);
const covered = new Set();
for (const life of lives) for (const entry of life.state.journal) if (SCENE_TITLES.has(entry.title)) covered.add(entry.title);
const allTitles = Object.values(SCENES).flat().map(row => row[0]);
const missed = allTitles.filter(t => !covered.has(t));
const gaps = lives.flatMap(l => l.gaps);
const streamProblem = lives.map(l => assertNoRandomDraw(l.state)).find(Boolean) || null;

const problems = [];
const ratioMedian = median(ratios);
if (ratioMedian < RATIO_MIN) problems.push(`叙述:决策 中位 ${ratioMedian.toFixed(2)} 低于下限 ${RATIO_MIN}`);
if (ratioMedian > RATIO_MAX) problems.push(`叙述:决策 中位 ${ratioMedian.toFixed(2)} 高于上限 ${RATIO_MAX}`);
for (const [path, group] of Object.entries(byPath)) {
  const value = median(group.map(l => l.journal / Math.max(1, l.decisions)));
  if (value < PATH_MIN) problems.push(`${path} 路径的叙述:决策 中位 ${value.toFixed(2)} 低于 ${PATH_MIN}`);
}
if (missed.length) problems.push(`场景池有 ${missed.length} 行一次都没被走到：${missed.slice(0, 5).join('、')}${missed.length > 5 ? '…' : ''}`);
/* 走池的步长必须与池长互素 —— 否则「一条命里」只能走到池子的一部分，
   那些行看着写了很多、其实一辈子轮不到（跨命并集看不出来 ⇒ 要单独断言）。 */
for (const [group, pool] of Object.entries(SCENES)) {
  const stride = sceneStride(pool.length, group);
  const g = gcd(stride, pool.length);
  if (g !== 1) problems.push(`${group} 组走池步长 ${stride} 与池长 ${pool.length} 不互素（最大公约数 ${g}）⇒ 只能走到 1/${g} 的行`);
}
const gapMedian = median(gaps);
if (gapMedian > GAP_MAX) problems.push(`场景间隔中位 ${gapMedian} 个月，超过 ${GAP_MAX}`);
if (streamProblem) problems.push(streamProblem);

const ratioWithout = lives.map(l => l.withoutScenes / Math.max(1, l.decisions));
const report = {
  count,
  ratioMedian: Number(ratioMedian.toFixed(2)),
  ratioWithoutScenes: Number(median(ratioWithout).toFixed(2)),
  ratioMean: Number((ratios.reduce((a, b) => a + b, 0) / ratios.length).toFixed(2)),
  journalMedian: median(lives.map(l => l.journal)),
  decisionsMedian: median(lives.map(l => l.decisions)),
  scenesMedian: median(lives.map(l => l.scenes)),
  sceneGapMedian: gapMedian,
  poolSize: allTitles.length,
  poolCovered: covered.size,
  byPath: Object.fromEntries(Object.entries(byPath).map(([p, g]) => [p, Number((median(g.map(l => l.journal / Math.max(1, l.decisions)))).toFixed(2))])),
  missed: missed.slice(0, 20),
  problems,
};

if (process.argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else {
  console.log('叙述密度审计（口径：一生流水 ÷ 一生决策卡；官方 6.46）');
  console.log(`  样本 ${count} 条命`);
  console.log(`  比值 中位 ${report.ratioMedian}（下限 ${RATIO_MIN} / 上限 ${RATIO_MAX}）　平均 ${report.ratioMean}`);
  console.log(`  若没有「人生场景」这条通道，比值只有 ${report.ratioWithoutScenes}（阶段 5 之前就是这个数）`);
  console.log(`  一生流水 中位 ${report.journalMedian}　一生决策卡 中位 ${report.decisionsMedian}　场景 中位 ${report.scenesMedian}`);
  console.log(`  场景间隔 中位 ${report.sceneGapMedian} 个月（上限 ${GAP_MAX}）`);
  console.log(`  场景池 ${report.poolSize} 行，走到 ${report.poolCovered} 行`);
  console.log('  各路径比值：' + Object.entries(report.byPath).map(([p, v]) => p + ' ' + v).join('　'));
  console.log('  随机流解耦：' + (streamProblem ? '✗ ' + streamProblem : '✓ 场景通道没有消耗任何随机流'));
  for (const problem of problems) console.log('  ✗ ' + problem);
  if (!problems.length) console.log('\n结果：全绿');
}

if (process.argv.includes('--check') && problems.length) process.exit(1);
