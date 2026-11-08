#!/usr/bin/env node
/**
 * 长线覆盖率审计 —— 「每条长线都还发得出来吗」。
 * ============================================================================
 *
 * ## 守什么
 * --------
 * 一条长线（宗门试炼、坊市契约、魔道献祭……）是**内容**。
 * 如果它在玩家的一生里**一次都没发出来**，那这条内容等于不存在 ——
 * 而玩家不会知道自己错过了什么。
 *
 * 以前这类消失是**看不见的**：长线混在候选池里随机抽，抽签顺序一变，
 * 某条线就整条不见了（实测：S5 改动后 `sect_return` 从 8 条人生掉到 5 条，
 * `loose_portal` 从 8 掉到 4）。
 *
 * ⇒ 现在长线改由 `packages/adventure/scheduler.js` 的**长线档**发：
 *   条件齐了就发，**不含随机数** ⇒ 覆盖率只由「内容定义的区间 + 种子」决定。
 * ⇒ 这个门禁守的就是那句话：**有机会 ⇒ 一定发得出来**。
 *
 * ## 三条断言
 * ----------
 *   1. **每条长线至少触发一次** —— 防止「整条内容线消失」。
 *   2. **发卡年龄落在窗口内**（`age` ~ `ageEnd`）—— 防止「20 岁的宗门线拖到 80 岁才发」。
 *   3. **触发数 ≥ 机会抽中数 × 80%** —— 防止「明明有机会，却一直没抽到」。
 *      （剩下的 20% 容差留给：玩家在窗口内离开了宗门、境界没到、寿元到了。）
 *
 * ## 用法
 * ------
 *   node scripts/audit-chains.mjs              # 跑一遍并打印
 *   node scripts/audit-chains.mjs --check      # 判定（回归门禁用这个）
 *   node scripts/audit-chains.mjs --count=120  # 样本更多
 *   node scripts/audit-chains.mjs --json       # 机器可读
 */
import {playCultivation} from './play-cultivation.mjs';
import {ROAD_CHAINS} from '../content/cultivation-stories.js';
import {chainAgeEnd} from '../content/cadence-table.js';

/** 样本按路径铺开，保证每条路径都有足够的人生。 */
const PATHS = ['orthodox', 'loose', 'demonic', 'beast', 'mortal'];
const CHAIN_IDS = ROAD_CHAINS.map(c => c.id);

/** 跑一批人生，返回每条长线的统计。 */
export function collect(count) {
  const stats = new Map(CHAIN_IDS.map(id => [id, {
    id,
    fired: 0,
    eligible: 0,        /* 抽到了机会的人生数 */
    firedAges: [],      /* 发卡时的年龄 */
    window: null,
  }]));
  const windows = new Map(ROAD_CHAINS.map(c => [c.id, {age: c.age, ageEnd: c.ageEnd}]));
  for (const row of stats.values()) row.window = windows.get(row.id);

  const runs = [];
  for (let i = 0; i < count; i++) {
    const path = PATHS[i % PATHS.length];
    const spec = {
      seed: '长线审计-' + i,
      path,
      conduct: i % 7 === 0 ? 'selfish' : i % 3 === 0 ? 'cautious' : 'care',
      ending: i % 4 === 0 ? 'dao' : 'guard',
      school: ['sword', 'alchemy', 'array'][i % 3],
    };
    let run;
    try {
      run = playCultivation(Object.assign({rulesVersion: 12}, spec));
    } catch (error) {
      runs.push({seed: spec.seed, error: String(error && error.message || error)});
      continue;
    }
    const opportunities = (run.state.life.cultivation || {}).opportunities || {};
    const firedAt = new Map();
    for (const snapshot of run.snapshots || []) {
      for (const id of CHAIN_IDS) {
        if (snapshot.event === id + '_0' && !firedAt.has(id)) firedAt.set(id, snapshot.age);
      }
    }
    for (const id of CHAIN_IDS) {
      const row = stats.get(id);
      if (opportunities[id] && opportunities[id].occurs) row.eligible++;
      if (firedAt.has(id)) {
        row.fired++;
        row.firedAges.push(firedAt.get(id));
      }
    }
    runs.push({seed: spec.seed, path: run.path, ending: run.ending});
  }
  return {runs, stats: [...stats.values()]};
}

/** 判定：返回问题清单（空 = 全过）。 */
export function judge(report) {
  const problems = [];
  for (const row of report.stats) {
    /*
     * ⚠ 窗口的**取值**也要守 —— 不只是「发卡落在窗口里」。
     *   只守后者抓不到「把窗口改窄」：窗口一变窄，发卡也跟着提前，仍然落在窗口内，
     *   门禁却一声不吭（实测：把 `sect_repair` 的 ageEnd 从 32 改成 21，门禁照样绿）。
     * ⇒ 这里用**同一个规则函数**（`content/cadence-table.js` 的 `chainAgeEnd`）核对：
     *   谁想手填一个「看起来更合适」的值，这里立刻报红。
     */
    const chain = ROAD_CHAINS.find(c => c.id === row.id);
    const expected = chainAgeEnd(chain.realm, chain.age);
    if (row.window.ageEnd !== expected) {
      problems.push(row.id + '：年龄上界不是按规则算出来的（表里 ' + row.window.ageEnd
        + '，按规则应是 ' + expected + '）');
    }
    if (row.fired < 1) {
      problems.push(row.id + '：一条都没发出来（内容等于不存在）');
      continue;
    }
    const out = row.firedAges.filter(age => age < row.window.age || age > row.window.ageEnd);
    if (out.length) {
      problems.push(row.id + '：发卡年龄超出窗口 ' + row.window.age + '–' + row.window.ageEnd
        + ' 岁（越界 ' + out.length + ' 次，例如 ' + out.slice(0, 3).join('、') + ' 岁）');
    }
    /*
     * ⚠⚠ **「有机会就一定发出」= 100%，不是 80%**（2026-11-08 阶段 4 改）。
     *
     * 以前留了 20% 容差，理由写的是「玩家在窗口内离开了宗门、境界没到、寿元到了」。
     * ⇒ 实测 16 条线**一条都不需要这份容差**（发出数 == 机会数，缺口 0）。
     *
     * **为什么结构上就应该是 100%**：
     *   机会是在 `packages/adventure/scheduler.js` 的长线档里抽的 ——
     *   抽中的那一刻，循环**立刻**返回这条线并开起来（`return {chain}`）。
     *   ⇒ 「抽中了却没发出来」在结构上不可能发生，除非调度被改坏。
     *   ⇒ 所以这 20% 容差不是「留点余量」，是**给真缺陷开后门**。
     */
    if (row.eligible > 0 && row.fired < row.eligible) {
      problems.push(row.id + '：有机会却没发出来（有机会 ' + row.eligible + ' 条，发出 ' + row.fired + ' 条）');
    }
  }
  const failed = report.runs.filter(r => r.error);
  for (const r of failed.slice(0, 5)) problems.push('有一条人生没跑完（' + r.seed + '）：' + r.error);
  if (failed.length > 5) problems.push('……另有 ' + (failed.length - 5) + ' 条人生没跑完');
  return problems;
}

/* ── CLI ──────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const count = Number((argv.find(a => a.startsWith('--count=')) || '').split('=')[1] || 80);
const report = collect(count);

if (argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log('长线覆盖率审计（实跑 ' + count + ' 条命）');
console.log('故事线'.padEnd(16), '发出', '有机会', '发卡年龄');
for (const row of report.stats) {
  const ages = row.firedAges.length
    ? Math.min(...row.firedAges) + '–' + Math.max(...row.firedAges)
    : '—';
  console.log(
    row.id.padEnd(16),
    String(row.fired).padStart(4),
    String(row.eligible).padStart(7),
    ('  ' + ages + ' 岁（窗口 ' + row.window.age + '–' + row.window.ageEnd + '）').padStart(10)
  );
}

const problems = judge(report);
if (argv.includes('--check')) {
  if (problems.length) {
    console.log('\n════════ 长线覆盖率 ════════');
    for (const p of problems) console.log('  ✗ ' + p);
    console.log('\n结果：' + problems.length + ' 个问题');
    process.exit(1);
  }
  console.log('\n✓ 每条长线都发得出来，年龄都在窗口内');
  process.exit(0);
}
console.log('\n（加 --check 判定；加 --json 出机器可读结果）');
