#!/usr/bin/env node
/**
 * 节奏审计 —— 实跑统计：什么时候到哪一境、每年发几张卡、阶段×境界覆盖矩阵
 * ============================================================================
 *
 * 守的是什么
 * ----------
 * 「归山记」的节奏问题不是某张卡写坏了，而是**整条时间轴错位**：
 * 玩家 50 岁还在炼气，而内容是按「50 岁该是金丹」写的。
 *
 * 本脚本用**实跑**（不是读代码猜）量出三件事：
 *
 *   ① **突破年龄**：每一境是什么时候到的（目标见 `content/cadence-table.js`）。
 *   ② **每年几张卡**：一局人生总共发多少张决策卡、平均每年几张
 *      （决定「每个阶段该有多少内容」这个门槛该定多少）。
 *   ③ **阶段 × 境界覆盖矩阵**：每个「人生阶段」里，玩家实际处在哪个境界、
 *      那个组合下真的发出来过几张卡。**空格 = 那段人生没内容可看。**
 *
 * 用法
 * ----
 *   node scripts/audit-cadence.mjs              # 报告（改动前后对比用这个）
 *   node scripts/audit-cadence.mjs --check      # 核对目标（回归门禁用这个）
 *   node scripts/audit-cadence.mjs --count=60   # 多跑几条命（默认 40）
 *   node scripts/audit-cadence.mjs --json       # 机器可读输出
 */
import {playCultivation} from './play-cultivation.mjs';
import {CADENCE, STAGES, REALM_NAMES, expectedRealmBand} from '../content/cadence-table.js';
import {ROOTS} from '../content/cultivation-world.js';

/** 灵根等级：≥ 0 才可能修行（未显灵根连引气资格都没有）。 */
const ROOT_GRADES = Object.fromEntries(Object.entries(ROOTS).map(([k, v]) => [k, v.grade]));

/* ── 跑一批人生 ───────────────────────────────────────────────────────── */

/** 五条路 × 不同性格/结局/技艺，尽量覆盖各种走向。 */
function specFor(i) {
  const paths = ['orthodox', 'loose', 'demonic', 'beast', 'mortal'];
  return {
    seed: '节奏审计-' + i,
    /* 必须是当前版本 12 —— 旧版本（5–11）各有自己的执行器与候选池，节奏不归这里管。 */
    rulesVersion: 12,
    path: paths[i % 5],
    conduct: i % 7 === 0 ? 'selfish' : i % 3 === 0 ? 'cautious' : 'care',
    ending: i % 4 === 0 ? 'dao' : 'guard',
    family: i % 9 === 0 ? 'sever' : 'keep',
    school: ['sword', 'alchemy', 'array'][i % 3],
  };
}

/** 跑一条命，把它的节奏事实收拢起来。 */
function runOne(spec) {
  try {
    const run = playCultivation(spec);
    const last = run.snapshots.at(-1);
    const finalAge = last ? last.age : 0;
    /*
     * 每一境的**突破卡发出年龄** —— 窗口管的就是这个（卡片一发，闭关才起算）。
     * 另外单记「真正踏入那一境」的年龄：发卡之后还要闭关 / 做工换材料，
     * 境界才落地，两者差着一段闭关年月。
     */
    const reached = {};
    for (const snap of run.snapshots) {
      if (!snap.event.startsWith('breakthrough_')) continue;
      const tier = Number(snap.event.split('_')[1]);
      if (reached[tier] === undefined) reached[tier] = snap.age;
    }
    const entered = {};
    for (const entry of run.state.journal || []) {
      for (const change of entry.changes || []) {
        if (!change.startsWith('踏入')) continue;
        const realm = REALM_NAMES.indexOf(change.slice(2));
        if (realm > 0 && entered[realm] === undefined) entered[realm] = Math.floor(entry.month / 12);
      }
    }
    /* 突破卡选了哪个选项 —— 看是真闭关还是靠做工换材料。 */
    const breakthroughChoices = run.snapshots
      .filter(s => s.event.startsWith('breakthrough_'))
      .map(s => s.option);
    return {
      ok: true,
      seed: spec.seed,
      path: run.path,
      actualPath: run.state.life.cultivation.path,
      root: run.state.player.root,
      ending: run.ending,
      finalAge,
      decisions: run.snapshots.length,
      reached,
      entered,
      breakthroughChoices,
      snapshots: run.snapshots,
    };
  } catch (error) {
    return {ok: false, seed: spec.seed, error: String(error && error.message || error)};
  }
}

/* ── 统计 ─────────────────────────────────────────────────────────────── */

function median(list) {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(list, p) {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

function stageOf(age) {
  return STAGES.find(s => age >= s.from && age <= s.to) || STAGES[STAGES.length - 1];
}

export function collect(count = 40) {
  const runs = [];
  for (let i = 0; i < count; i++) runs.push(runOne(specFor(i)));
  const good = runs.filter(r => r.ok);

  /* ① 突破卡发出年龄：每一境各在什么岁数发的卡。 */
  const byRealm = {};
  const enteredByRealm = {};
  for (const realm of [1, 2, 3, 4]) {
    const ages = good.map(r => r.reached[realm]).filter(a => a !== undefined);
    const enteredAges = good.map(r => r.entered && r.entered[realm]).filter(a => a !== undefined);
    byRealm[realm] = {
      reached: ages.length,
      of: good.length,
      min: ages.length ? Math.min(...ages) : null,
      max: ages.length ? Math.max(...ages) : null,
      median: median(ages),
      p10: percentile(ages, 0.1),
      p90: percentile(ages, 0.9),
    };
    enteredByRealm[realm] = {
      min: enteredAges.length ? Math.min(...enteredAges) : null,
      max: enteredAges.length ? Math.max(...enteredAges) : null,
      median: median(enteredAges),
    };
  }

  /* ② 每年几张卡。 */
  const cardsPerYear = good.map(r => (r.finalAge > 0 ? r.decisions / r.finalAge : 0));
  const lifeAges = good.map(r => r.finalAge);
  const years = good.map(r => r.finalAge);

  /* ③ 阶段 × 境界覆盖矩阵。 */
  const matrix = {};
  for (const stage of STAGES) matrix[stage.id] = new Array(REALM_NAMES.length).fill(0);
  for (const run of good) {
    for (const snap of run.snapshots) {
      const stage = stageOf(snap.age);
      matrix[stage.id][snap.realm] += 1;
    }
  }
  const matrixPlain = {};
  for (const stage of STAGES) matrixPlain[stage.id] = matrix[stage.id].slice();

  /* ④ 30/50/70 岁的境界分布。 */
  const atAge = {};
  for (const age of [30, 50, 70, 90]) {
    const dist = new Array(REALM_NAMES.length).fill(0);
    for (const run of good) {
      const last = run.snapshots.filter(s => s.age <= age).at(-1);
      if (last) dist[last.realm] += 1;
    }
    atAge[age] = dist;
  }

  /*
   * ⑤ 「修士」是哪几条命 —— 判定境界分布时只看它们。
   *
   * 三条都要卡准，缺一条就量错：
   *   · **实际走的路**（`state.life.cultivation.path`），不是「请求走的那条路」——
   *     请求走修行路的人可能生成了凡俗路的人生，那条命不该算进修士；
   *   · **灵根够格**（`grade >= 0`）—— 未显灵根连引气资格都没有；
   *   · **活到了那个岁数** —— 二十岁就走的，不该被算成「三十岁还没筑基」。
   */
  const cultivators = good.filter(r => r.actualPath !== 'mortal' && ROOT_GRADES[r.root] >= 0);
  const cultivatorAt = {};
  const cultivatorsByAge = {};
  for (const age of [30, 50, 70, 90]) {
    const dist = new Array(REALM_NAMES.length).fill(0);
    let alive = 0;
    for (const run of cultivators) {
      if (run.finalAge < age) continue;          /* 没活到那个岁数，不参与这项判定 */
      alive++;
      const last = run.snapshots.filter(s => s.age <= age).at(-1);
      if (last) dist[last.realm] += 1;
    }
    cultivatorAt[age] = dist;
    cultivatorsByAge[age] = alive;
  }

  return {
    count,
    failed: runs.filter(r => !r.ok).map(r => ({seed: r.seed, error: r.error})),
    good: good.length,
    byRealm,
    enteredByRealm,
    breakthroughChoices: good.flatMap(r => r.breakthroughChoices).reduce((acc, id) => {
      acc[id] = (acc[id] || 0) + 1;
      return acc;
    }, {}),
    lifeAges: {min: Math.min(...lifeAges), max: Math.max(...lifeAges), median: median(lifeAges)},
    cardsPerYear: {
      min: Math.min(...cardsPerYear).toFixed(2),
      median: median(cardsPerYear).toFixed(2),
      max: Math.max(...cardsPerYear).toFixed(2),
    },
    matrix: matrixPlain,
    atAge,
    cultivators: cultivators.length,
    cultivatorAt,
    cultivatorsByAge,
  };
}

/* ── 核对目标 ─────────────────────────────────────────────────────────── */

/**
 * 核对节奏是否落在目标区间里。
 *
 * 判定口径（每条都要说清「凭什么」）：
 *   · 突破卡年龄：每一境的发卡年龄都应落在该境的窗口内；
 *     窗口取自 `content/cadence-table.js`（拍板数字）。
 *   · 年龄分布：**修士**（走修行路、灵根够格的那批）30 岁不该还是凡身、
 *     50 / 70 岁不该还在炼气。凡俗人生与无灵根者不参与这项判定 ——
 *     拿他们量「该突破而没突破」是拿错尺子。
 *   · 覆盖矩阵：每个阶段的**主境界**都该发得出卡（那一段不许是空的）。
 */
export function check(report) {
  const problems = [];

  for (const realm of [1, 2, 3, 4]) {
    const window = CADENCE.find(c => c.realm === realm);
    const stat = report.byRealm[realm];
    if (!stat || !stat.reached) continue;   /* 没人到这一境 —— 不报（由下面的分布项兜底） */
    if (stat.min < window.from || stat.max > window.to) {
      problems.push(
        `${window.name}突破卡年龄超窗：${stat.min}–${stat.max} 岁，目标 ${window.from}–${window.to} 岁` +
        `（${stat.reached}/${report.good} 条命到了这一境）`
      );
    }
    /*
     * **真正踏入那一境**的年龄（发卡之后还要闭关，落地自然晚一截）——
     * 看中位数：**大多数**人该在窗口里到得了。
     *
     * 为什么看中位数而不是最大值：
     * 连输四次的修士是存在的（灵根最差、散修没材料、旧伤未愈）——
     * 那是合法的人生，不是 bug。要挡住的是「**大多数人**都赶不上」。
     */
    const entered = report.enteredByRealm && report.enteredByRealm[realm];
    if (entered && entered.median !== null && (entered.median < window.from || entered.median > window.to)) {
      problems.push(
        `${window.name}踏入年龄中位数超窗：${entered.median} 岁，目标 ${window.from}–${window.to} 岁`
        + `（范围 ${entered.min}–${entered.max} 岁）`
      );
    }
  }

  /* 修士的年龄分布 —— 按比例判定。 */
  const at = report.cultivatorAt || {};
  /*
   * 分母只算**活到了那个岁数**的修士。
   * 二十岁就走的不是「三十岁还没筑基」，是「二十岁就走了」——
   * 把他算进落后的人里，等于用一条没走完的人生去量另一件事。
   */
  const aliveAt = {};
  for (const age of [30, 50, 70, 90]) {
    aliveAt[age] = (report.cultivatorsByAge || {})[age] || 0;
  }
  const share = (age, fromRealm) => {
    const row = at[age] || [];
    const behind = row.slice(0, fromRealm).reduce((sum, v) => sum + v, 0);
    const total = aliveAt[age] || 0;
    return total ? (total - behind) / total : 1;
  };
  /*
   * 门槛为什么是比例、不是「一条都不许落后」：
   * 连输四次的修士是存在的（灵根最差、散修没材料、旧伤未愈）——
   * 那是**合法的人生**，不是 bug。要挡住的是「大多数人都跟不上」。
   */
  const gates = [
    {age: 30, from: 1, need: 0.9, text: '至少炼气'},
    {age: 50, from: 2, need: 0.85, text: '至少筑基'},
    {age: 70, from: 2, need: 0.9, text: '至少筑基'},
  ];
  for (const gate of gates) {
    const got = share(gate.age, gate.from);
    if (got < gate.need) {
      problems.push(`${gate.age} 岁：只有 ${(got * 100).toFixed(0)}% 的修士到了${gate.text}（门槛 ${(gate.need * 100).toFixed(0)}%）`);
    }
  }

  /* 覆盖矩阵：每个阶段的主境界都该有卡。 */
  const empty = [];
  for (const stage of STAGES) {
    const row = report.matrix[stage.id] || [];
    if (!row[stage.primary]) empty.push(`${stage.name}×${REALM_NAMES[stage.primary]}`);
  }
  if (empty.length) problems.push('这些阶段的主境界一张卡都没发出来：' + empty.join('、'));

  return problems;
}

/* ── 输出 ─────────────────────────────────────────────────────────────── */

function renderMatrix(report) {
  const lines = [];
  const header = ['阶段\\境界', ...REALM_NAMES.map(n => n.padStart(4))];
  lines.push(header.join(' '));
  for (const stage of STAGES) {
    const row = report.matrix[stage.id] || [];
    lines.push(
      (stage.name + ' ' + stage.from + '–' + (stage.to >= 999 ? '∞' : stage.to)).padEnd(10) +
      ' ' + row.map(v => String(v).padStart(4)).join(' ')
    );
  }
  return lines.join('\n');
}

function renderByRealm(report) {
  const lines = [];
  lines.push('境界   发卡人数   最早   最晚   中位   目标窗口   （踏入那一境：中位）');
  for (const realm of [1, 2, 3, 4]) {
    const w = CADENCE.find(c => c.realm === realm);
    const s = report.byRealm[realm];
    const e = report.enteredByRealm ? report.enteredByRealm[realm] : null;
    lines.push(
      `${w.name.padEnd(4)}  ${String(s.reached).padStart(6)}/${report.good}  ` +
      `${String(s.min ?? '—').padStart(4)}  ${String(s.max ?? '—').padStart(4)}  ` +
      `${String(s.median ?? '—').padStart(4)}   ${w.from}–${w.to} 岁   ` +
      `${e && e.median !== null ? e.median + ' 岁' : '—'}`
    );
  }
  return lines.join('\n');
}

function renderAges(report) {
  const lines = [];
  lines.push('年龄   凡身  炼气  筑基  金丹  元婴');
  for (const age of [30, 50, 70, 90]) {
    const row = report.atAge[age] || [];
    lines.push(String(age).padStart(3) + '岁  ' + row.map(v => String(v).padStart(4)).join('  '));
  }
  return lines.join('\n');
}

/* ── CLI ──────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const count = Number(argv.find(a => a.startsWith('--count='))?.split('=')[1] || 40);
const report = collect(count);

if (argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log('节奏审计（实跑 ' + report.count + ' 条命，成功 ' + report.good + ' 条）\n');
console.log('【一】突破年龄\n' + renderByRealm(report));
console.log('\n【二】一生长度与发卡密度');
console.log('  一生年龄：最短 ' + report.lifeAges.min + ' 岁，最长 ' + report.lifeAges.max + ' 岁，中位 ' + report.lifeAges.median + ' 岁');
console.log('  每年几张卡：最少 ' + report.cardsPerYear.min + '，中位 ' + report.cardsPerYear.median + '，最多 ' + report.cardsPerYear.max);
console.log('\n【三】年龄分布\n' + renderAges(report));
console.log('  其中修士 ' + report.cultivators + ' 条（走修行路、灵根够格）');
console.log('  修士的境界分布：');
for (const age of [30, 50, 70, 90]) {
  const row = report.cultivatorAt[age] || [];
  console.log('   ' + String(age).padStart(3) + '岁  ' + row.map((v, i) => REALM_NAMES[i] + ' ' + v).join('  '));
}
const choiceText = Object.entries(report.breakthroughChoices || {})
  .map(([id, n]) => id + '×' + n).join('，') || '（无）';
console.log('\n【三之二】突破卡选的选项：' + choiceText);
console.log('\n【四】阶段 × 境界覆盖矩阵\n' + renderMatrix(report));
if (report.failed.length) {
  console.log('\n【失败】' + report.failed.length + ' 条命没跑完：');
  for (const f of report.failed.slice(0, 5)) console.log('  ' + f.seed + '：' + f.error);
}

if (argv.includes('--check')) {
  const problems = check(report);
  console.log('');
  if (problems.length) {
    console.log('════════ 节奏核对 ════════');
    for (const p of problems) console.log('  ✗ ' + p);
    console.log('\n结果：' + problems.length + ' 个问题');
    process.exit(1);
  }
  console.log('✓ 突破年龄、年龄分布、覆盖矩阵都在目标区间内');
  process.exit(0);
}
process.exit(0);
