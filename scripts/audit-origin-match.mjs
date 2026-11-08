#!/usr/bin/env node
/**
 * 出身门禁 —— **轮盘抽到什么身份，就只能遇到配得上那个身份的故事**
 * ============================================================================
 *
 * ## 守什么
 * --------
 * 2026-11-08 用户实测发现剧情「很奇怪」：轮盘上写着「名门大户」，
 * 玩家却看到「战乱里一名游方药师救下你」，16 岁又去坊市当学徒成了散修。
 *
 * ⇒ 查了源码才明白：**出身根本没参与抽卡**。
 *   背景故事线表（`content/background-stories.js`）以前只按「有没有灵根」分池，
 *   再用 `hashText(seed+':background')` 抽一条 ⇒ 出身与身世**两套独立的东西**。
 *   实测（每种出身 400 条命）：名门大户只有 **10%** 抽到配得上的身世卡，
 *   修仙世家 11%，山村药农 **0%**。
 *
 * ⇒ 这道门禁守的就是那根线：**出身 ↔ 身世 ↔ 童年 ↔ 路口**必须对得上。
 *
 * ## 四条断言
 * ----------
 *   1. **匹配率 100%** —— 每条命抽到的身世卡，必须写着「这种出身会抽到它」。
 *   2. **不该出现的绝不许出现** —— 名门/世家不许抽到「游方药师 / 幽灯堂 / 老猿」
 *      那三张（它们讲的是「没人照看」，对名门大户说不通）。
 *   3. **内容厚度** —— 每种出身：身世卡 ≥ 4 条，且**专属童年卡 ≥ 2 张**
 *      （「别的出身看不到的那些童年卡」按实跑统计，不靠人肉名单）。
 *   4. **路口分支齐全** —— 「去坊市谋生 / 去坊市找其他功法」这两句，
 *      **规则层与表达域必须按三种出身分三套说法，且两边一字不差**
 *      （表达域会覆盖规则层的说法 ⇒ 两边不一样，玩家读到的和门禁量的就对不上）。
 *
 * ⚠⚠ **为什么这道门禁必须存在**：
 *   以前的六道指标（可达性 / 密度 / 冷却 / 节奏 / 结局 / 阶段跨度）**全是横向平均**。
 *   「名门大户抽到游方药师」**不改变卡片数量、不改变触发率、不改变叙述密度**
 *   ⇒ 所有门禁都是绿的，问题一直没人看见。
 *   ⇒ 这道门禁是**逐条命对账**，不看平均。
 *
 * ## 用法
 * ------
 *   node scripts/audit-origin-match.mjs              # 跑一遍并打印
 *   node scripts/audit-origin-match.mjs --check      # 判定（回归门禁用这个）
 *   node scripts/audit-origin-match.mjs --count=200  # 每种出身的样本量
 */
import {createRun, advance} from '../packages/adventure/engine.js';
import {BACKGROUND_STORIES, SECT_BACKGROUNDS, MORTAL_BACKGROUNDS} from '../content/background-stories.js';
import {CULTIVATION_EVENTS} from '../content/cultivation-stories.js';
import {EVENT_ROWS} from '../content/expressions/events/index.js';

/**
 * ⚠ **轮盘只有三种出身**（实测 2000 次）：山村药农 / 名门大户 / 修仙世家。
 * `packages/adventure/engine.js` 的 `ORIGINS` 里另有「渡口匠人」「流浪少年」，
 * 但 `FAMILIES` 只有三族 ⇒ 那两条**轮盘永远转不到**（已知缺口，本轮不动）。
 */
const ORIGINS = ['village', 'noble', 'clan'];
const ORIGIN_NAMES = {village: '山村药农', noble: '名门大户', clan: '修仙世家'};
/** 「没人照看」那三张 —— 对名门/世家说不通。 */
const NOBODY_CARES = ['background_healer_note', 'background_dark_sect', 'background_beast_born'];
/** 每种出身最少要有的身世卡数。 */
const MIN_BACKGROUNDS = 4;
/** 每种出身最少要有的**专属**童年卡数。 */
const MIN_EXCLUSIVE_CHILD = 2;

const argv = process.argv.slice(2);
const countArg = argv.find(a => a.startsWith('--count='));
const COUNT = countArg ? Number(countArg.split('=')[1]) : 200;

/** 造一个只有出身不同的探针状态（给路口卡那两句分支用）。 */
function probeState(origin) {
  return {
    player: {origin, root: '松骨灵根', name: '陆青'},
    birth: {family: origin === 'noble' ? 'noble' : origin === 'clan' ? 'clan' : 'common', continent: 'home', startAge: 16, year: 471, upbringing: 'ordinary', address: '望渡镇'},
    life: {cultivation: {network: {marks: {}}}},
    month: 30, act: 1, seed: '松风有信',
  };
}

/**
 * 跑一条命，走到 16 岁（童年三段都排完了），把它看到的身世与童年卡记下来。
 * @param {string} origin 出身
 * @param {number} index 样本序号
 */
function runLife(origin, index) {
  const s = createRun({seed: '出身门禁-' + origin + '-' + index, origin});
  const childhood = s.life.cultivation.network.childhood || [];
  let guard = 0;
  while (s.month < 16 * 12 && s.phase === 'life' && guard++ < 400) advance(s, 1);
  return {
    origin,
    background: s.birth.background,
    upbringing: s.birth.upbringing,
    childhood: childhood.filter(t => t && t.event && !t.skipped).map(t => t.event),
  };
}

/* ── 断言 1 + 2：匹配率与「不该出现的」 ─────────────────────────────── */
const lives = [];
for (const origin of ORIGINS) {
  for (let i = 0; i < COUNT; i++) lives.push(runLife(origin, i));
}

const backgroundById = Object.fromEntries(BACKGROUND_STORIES.map(b => [b.id, b]));
const mismatched = [];
const forbidden = [];
for (const life of lives) {
  const bg = backgroundById[life.background];
  if (!bg) { mismatched.push(life.origin + ' 抽到不存在的身世卡 ' + life.background); continue; }
  if (!bg.origins.includes(life.origin)) mismatched.push(life.origin + ' 抽到 ' + life.background + '（那张卡不写这种出身）');
  if (life.origin !== 'village' && NOBODY_CARES.includes(life.background)) forbidden.push(life.origin + ' 抽到 ' + life.background);
}

/* ── 断言 3：内容厚度（专属童年卡按实跑统计）────────────────────────── */
const childByOrigin = {};
for (const origin of ORIGINS) childByOrigin[origin] = new Set();
for (const life of lives) for (const card of life.childhood) childByOrigin[life.origin].add(card);
const exclusive = {};
for (const origin of ORIGINS) {
  exclusive[origin] = [...childByOrigin[origin]].filter(card => ORIGINS.every(o => o === origin || !childByOrigin[o].has(card)));
}
const thin = [];
for (const origin of ORIGINS) {
  const cards = BACKGROUND_STORIES.filter(b => b.origins.includes(origin));
  if (cards.length < MIN_BACKGROUNDS) thin.push(ORIGIN_NAMES[origin] + ' 只有 ' + cards.length + ' 条身世卡（要 ≥ ' + MIN_BACKGROUNDS + '）');
  if (exclusive[origin].length < MIN_EXCLUSIVE_CHILD) thin.push(ORIGIN_NAMES[origin] + ' 只有 ' + exclusive[origin].length + ' 张专属童年卡（要 ≥ ' + MIN_EXCLUSIVE_CHILD + '）：' + (exclusive[origin].join(' ') || '一张都没有'));
}

/* ── 断言 4：路口那两句，规则层与表达域都要按出身分三套 ──────────────── */
const branchProblems = [];
const MARKET_CHOICE = {reception: 1, root_result: 2};
for (const [eventId, index] of Object.entries(MARKET_CHOICE)) {
  const ruleNode = CULTIVATION_EVENTS[eventId];
  const row = EVENT_ROWS[eventId];
  if (!ruleNode || !row) { branchProblems.push(eventId + ' 不在事件表/表达域里'); continue; }
  const ruleHint = ruleNode.choices[index].hint;
  const exprHint = row[2][index];
  const seen = new Map();
  for (const origin of ORIGINS) {
    const p = probeState(origin);
    const r = typeof ruleHint === 'function' ? ruleHint(p) : ruleHint;
    const e = typeof exprHint === 'function' ? exprHint(p) : exprHint;
    if (typeof r !== 'string' || typeof e !== 'string') { branchProblems.push(eventId + ' 的「去坊市」提示语不是字符串'); break; }
    if (r !== e) branchProblems.push(eventId + '：规则层说「' + r + '」，表达域说「' + e + '」—— 两边对不上');
    seen.set(origin, r);
  }
  const values = [...seen.values()];
  if (new Set(values).size !== ORIGINS.length) branchProblems.push(eventId + ' 的「去坊市」提示语没有按三种出身分三套说法（只分出 ' + new Set(values).size + ' 套）');
}

/* ── 报告 ────────────────────────────────────────────────────────────── */
console.log('出身门禁（每种出身 ' + COUNT + ' 条命，共 ' + lives.length + ' 条）');
console.log('');
console.log('出身'.padEnd(6), '身世卡', '  专属童年卡', '  抽到的身世卡');
for (const origin of ORIGINS) {
  const dist = {};
  for (const life of lives) if (life.origin === origin) dist[life.background] = (dist[life.background] || 0) + 1;
  const cards = BACKGROUND_STORIES.filter(b => b.origins.includes(origin));
  console.log(ORIGIN_NAMES[origin].padEnd(6),
    String(cards.length).padStart(4),
    String(exclusive[origin].length).padStart(6),
    '  ' + Object.entries(dist).map(([k, v]) => k.replace('background_', '') + ':' + v).join(' '));
}
console.log('');
console.log('专属童年卡：');
for (const origin of ORIGINS) console.log('  ' + ORIGIN_NAMES[origin].padEnd(6) + (exclusive[origin].join(' ') || '（一张都没有）'));
console.log('');
console.log('路口那两句（三种出身各一套）：');
for (const origin of ORIGINS) {
  const p = probeState(origin);
  const r = CULTIVATION_EVENTS.reception.choices[1].hint;
  const m = CULTIVATION_EVENTS.root_result.choices[2].hint;
  console.log('  ' + ORIGIN_NAMES[origin].padEnd(6) + '排队时：' + (typeof r === 'function' ? r(p) : r));
  console.log('  ' + ' '.repeat(6) + '测灵后：' + (typeof m === 'function' ? m(p) : m));
}

const problems = [];
if (mismatched.length) problems.push('出身与身世对不上 ' + mismatched.length + ' 处：' + mismatched.slice(0, 6).join('；'));
if (forbidden.length) problems.push('名门/世家抽到了「没人照看」那三张 ' + forbidden.length + ' 处：' + forbidden.slice(0, 6).join('；'));
for (const t of thin) problems.push(t);
for (const b of branchProblems) problems.push(b);

if (argv.includes('--check')) {
  if (problems.length) {
    console.log('\n════════ 出身 ════════');
    for (const p of problems) console.log('  ✗ ' + p);
    console.log('\n结果：' + problems.length + ' 个问题');
    process.exit(1);
  }
  console.log('\n✓ 出身与身世一条命一条命对得上；名门/世家不再当散修孤儿；每种出身都有专属童年卡；路口那两句两边一致');
  process.exit(0);
}
console.log('\n（加 --check 判定）');
if (problems.length) {
  for (const p of problems) console.log('  ✗ ' + p);
  process.exit(1);
}
