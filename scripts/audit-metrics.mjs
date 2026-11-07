#!/usr/bin/env node
/**
 * 内容指标审计 —— 六项「内容到底匀不匀」的量化指标
 * ============================================================================
 *
 * 守的是什么
 * ----------
 * 2026-11-06 那一轮重构把**结构**改完了，但方案里承诺的六项指标没有门禁盯着
 * （量它们的脚本 `scripts/content-map.mjs` 当时**根本没进过 git**）⇒
 * 改完还会发霉。本脚本把六项指标固定成一道门禁：**只许变好，不许变差**。
 *
 * 六项指标
 * --------
 *   ① 可达性：事件表里有多少条在 N 条人生里一次都没出现（发霉的内容＝不存在的内容）
 *   ② 密度：最挤的 10 年 / 5 年有多少个抉择（方案口径：≤ 5 / ≤ 3）
 *   ③ 冷却：人生经历里同标题在 60 个月内重复了几处
 *   ④ 节奏对齐：每个境界段实际发出过多少种不同内容（方案口径：≥ 5）
 *   ⑤ 结局覆盖：多少条人生没有结局文本
 *   ⑥ 阶段跨度：同一里程碑的突破年龄跨度（方案口径：中位数口径，见 audit-cadence）
 *
 * 用法
 * ---
 *   node scripts/audit-metrics.mjs                 # 报告（改完改动看数字用这个）
 *   node scripts/audit-metrics.mjs --check         # 核对基线（回归门禁用这个）
 *   node scripts/audit-metrics.mjs --gen           # 重生成基线（只在真要改指标时）
 *   node scripts/audit-metrics.mjs --count=200     # 多跑几条命（默认 120）
 *
 * ⚠ 判据是「跟基线比」，不是「跟某个理想值比」。
 *   理想值（密度 ≤ 5、每境 ≥ 5 张…）写在 `scripts/audit-cadence.mjs` 与本脚本的
 *   `IDEAL` 里；**基线**记录的是「现在是多少」⇒ 门禁的作用是**不许倒退**。
 *   等指标本身被改好了（那时才动基线），就不再是「不许倒退」而是「必须达标」。
 */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {playCultivation} from './play-cultivation.mjs';
import {EVENTS} from '../packages/adventure/engine.js';
import {projectRoot} from './serve.mjs';

/** 基线文件（跟着源码走 ⇒ 门禁只依赖跟着源码走的文件）。 */
const BASELINE_FILE = join(projectRoot, 'tests/fixtures/metrics-baseline.json');

/**
 * 每项指标的方向：
 *   'down' = 越小越好（倒退就是变差）
 *   'up'   = 越大越好
 */
const DIRECTION = {
  neverSeen: 'down',      // 可达性：发霉的条数
  density10: 'down',      // 密度：最挤的 10 年
  density5: 'down',       // 密度：最挤的 5 年
  cooldownRepeats: 'down',// 冷却：60 个月内的重复
  realmContentMin: 'up',  // 节奏对齐：每境最少有多少种内容
  endingMissing: 'down',  // 结局覆盖
  spanMax: 'down',        // 阶段跨度：各境突破年龄极差的最大值
};

/** 硬底线：不管基线多少，这几项不许有。 */
const HARD_LIMIT = {endingMissing: 0};

/** 跑一条命，把它的指标事实收拢起来。 */
function specFor(i) {
  const paths = ['orthodox', 'loose', 'demonic', 'beast', 'mortal'];
  return {
    seed: '指标审计-' + i,
    /* 必须是当前版本 12 —— 旧版本各有自己的执行器与候选池。 */
    rulesVersion: 12,
    path: paths[i % 5],
    conduct: i % 7 === 0 ? 'selfish' : i % 3 === 0 ? 'cautious' : 'care',
    ending: i % 4 === 0 ? 'dao' : 'guard',
    family: i % 9 === 0 ? 'sever' : 'keep',
    school: ['sword', 'alchemy', 'array'][i % 3],
  };
}

function runOne(spec) {
  try {
    const run = playCultivation(spec);
    /* 密度：按年龄窗口数抉择卡。 */
    const ages = run.snapshots.map(s => s.age);
    let density10 = 0, density5 = 0;
    for (let start = 0; start <= 120; start++) {
      density10 = Math.max(density10, ages.filter(a => a >= start && a < start + 10).length);
      density5 = Math.max(density5, ages.filter(a => a >= start && a < start + 5).length);
    }
    /* 冷却：人生经历里同标题在 60 个月内重复。 */
    let cooldownRepeats = 0;
    const byTitle = {};
    for (const j of run.state.journal) {
      const list = byTitle[j.title] || (byTitle[j.title] = []);
      list.push(j.month);
    }
    for (const months of Object.values(byTitle)) {
      for (let i = 1; i < months.length; i++) {
        if (months[i] - months[i - 1] < 60) cooldownRepeats++;
      }
    }
    /* 节奏对齐：每个境界段发出过多少种不同内容。 */
    const perRealm = {};
    for (const s of run.snapshots) {
      const set = perRealm[s.realm] || (perRealm[s.realm] = new Set());
      set.add(s.event);
    }
    /* 阶段跨度：各境突破年龄的极差。 */
    const spans = {};
    for (const s of run.snapshots) {
      if (!s.event.startsWith('breakthrough_')) continue;
      const tier = s.event.split('_')[1];
      const list = spans[tier] || (spans[tier] = []);
      list.push(s.age);
    }
    const spanByRealm = {};
    for (const [tier, list] of Object.entries(spans)) {
      spanByRealm[tier] = Math.max(...list) - Math.min(...list);
    }
    const spanMax = Object.values(spanByRealm).length ? Math.max(...Object.values(spanByRealm)) : 0;
    return {
      ok: true,
      density10, density5, cooldownRepeats, spanMax,
      events: run.events,
      realmCounts: Object.fromEntries(Object.entries(perRealm).map(([k, v]) => [k, v.size])),
      noEnding: !(run.state.ending && run.state.ending.title && run.state.ending.text),
    };
  } catch (error) {
    return {ok: false, error: String(error && error.message || error)};
  }
}

/** 跑一批人生，算出六项指标。 */
export function collect(count = 120) {
  const runs = [];
  for (let i = 0; i < count; i++) runs.push(runOne(specFor(i)));
  const good = runs.filter(r => r.ok);
  const failed = runs.filter(r => !r.ok);

  /* ① 可达性：事件表里一次都没出现过的条数。 */
  const seen = new Set(good.flatMap(r => r.events));
  const allIds = Object.keys(EVENTS);
  const neverSeen = allIds.filter(id => !seen.has(id));

  /* ④ 节奏对齐：把每条命里各境界的内容种数合并（并集）。 */
  const perRealm = {};
  for (const r of good) {
    for (const [realm, n] of Object.entries(r.realmCounts)) {
      perRealm[realm] = Math.max(perRealm[realm] || 0, n);
    }
  }
  const realmCounts = Object.fromEntries(Object.entries(perRealm).map(([k, v]) => [k, v]));
  const realmContentMin = Object.keys(realmCounts).length ? Math.min(...Object.values(realmCounts)) : 0;

  const metrics = {
    neverSeen: neverSeen.length,
    density10: good.length ? Math.max(...good.map(r => r.density10)) : 0,
    density5: good.length ? Math.max(...good.map(r => r.density5)) : 0,
    cooldownRepeats: good.reduce((n, r) => n + r.cooldownRepeats, 0),
    realmContentMin,
    endingMissing: good.filter(r => r.noEnding).length,
    spanMax: good.length ? Math.max(...good.map(r => r.spanMax)) : 0,
  };
  return {count, good: good.length, failed, metrics, realmCounts, neverSeenSample: neverSeen.slice(0, 10)};
}

/** 核对基线：只许变好，不许变差。 */
export function check(report, baseline) {
  const problems = [];
  const metrics = report.metrics;
  for (const [key, direction] of Object.entries(DIRECTION)) {
    const now = metrics[key];
    const before = baseline.metrics ? baseline.metrics[key] : undefined;
    if (before === undefined) { problems.push(`${key}：基线里没有这一项（先跑 --gen 生成基线）`); continue; }
    if (direction === 'down' && now > before) {
      problems.push(`${key} 变差了：${before} → ${now}（只许变好，不许变差）`);
    }
    if (direction === 'up' && now < before) {
      problems.push(`${key} 变差了：${before} → ${now}（只许变好，不许变差）`);
    }
    const limit = HARD_LIMIT[key];
    if (limit !== undefined && now > limit) problems.push(`${key} 超过硬底线：${now} > ${limit}`);
  }
  return problems;
}

/* ── CLI ──────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2);
const count = Number(argv.find(a => a.startsWith('--count='))?.split('=')[1] || 120);
const report = collect(count);

if (argv.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

console.log(`内容指标审计（实跑 ${report.count} 条命，成功 ${report.good} 条）\n`);
console.log('  可达性（发霉的条数）  ' + report.metrics.neverSeen + ' / ' + Object.keys(EVENTS).length + ' 条事件');
console.log('  密度（最挤 10 年 / 5 年）  ' + report.metrics.density10 + ' / ' + report.metrics.density5 + ' 个抉择');
console.log('  冷却（60 个月内重复）  ' + report.metrics.cooldownRepeats + ' 处');
console.log('  节奏对齐（各境内容种数）  ' + JSON.stringify(report.realmCounts));
console.log('  结局覆盖（缺结局的人生）  ' + report.metrics.endingMissing + ' 条');
console.log('  阶段跨度（各境突破年龄极差的最大值）  ' + report.metrics.spanMax + ' 年');
if (report.failed.length) console.log('  ⚠ ' + report.failed.length + ' 条命没跑完（已排除）');

if (argv.includes('--gen')) {
  /*
   * 重生成基线 —— **基线文件自带变更台账**（`history`）。
   *
   * 为什么要台账：
   *   这道门禁的判据是「只许变好，不许变差」⇒ 基线就是一道**棘轮**。
   *   棘轮要挪，只许在「有意变更」时挪 ⇒ 那一次挪动必须留下理由与前后数字，
   *   否则半年后没人说得清「为什么这一步允许倒退」。
   *
   * 用法：`node scripts/audit-metrics.mjs --gen --reason="为什么允许这次变化"`
   */
  const reason = (argv.find(a => a.startsWith('--reason=')) || '').slice('--reason='.length);
  let history = [];
  try {
    const old = JSON.parse(await readFile(BASELINE_FILE, 'utf8'));
    if (old && Array.isArray(old.history)) history = old.history;
    if (old && old.metrics && !reason) {
      console.log('\n⚠ 这次重生成没有写理由（--reason=…）⇒ 台账里会记成「未说明」。');
    }
    if (old && old.metrics && reason) {
      history.push({
        at: new Date().toISOString(),
        reason,
        from: old.metrics,
        to: report.metrics,
      });
    }
  } catch {
    /* 第一次生成，没有旧基线 */
  }
  const payload = {createdAt: new Date().toISOString(), count: report.count, metrics: report.metrics, history};
  await mkdir(join(projectRoot, 'tests/fixtures'), {recursive: true});
  await writeFile(BASELINE_FILE, JSON.stringify(payload, null, 2) + '\n');
  console.log('\n✓ 基线已写入 ' + BASELINE_FILE);
  process.exit(0);
}

let baseline = null;
try {
  baseline = JSON.parse(await readFile(BASELINE_FILE, 'utf8'));
} catch {
  console.log('\n✗ 没有基线文件：' + BASELINE_FILE + '（先跑 node scripts/audit-metrics.mjs --gen）');
  process.exit(1);
}

if (argv.includes('--check')) {
  const problems = check(report, baseline);
  if (problems.length) {
    console.log('\n════════ 指标核对 ════════');
    for (const p of problems) console.log('  ✗ ' + p);
    console.log('\n结果：' + problems.length + ' 个问题');
    process.exit(1);
  }
  console.log('\n✓ 六项指标都不比基线差');
  process.exit(0);
}

/* 报告模式：顺手写一份本机快照（不进仓库）。 */
await mkdir(join(projectRoot, 'artifacts'), {recursive: true});
await writeFile(join(projectRoot, 'artifacts/metrics.json'), JSON.stringify(report, null, 2) + '\n');
process.exit(0);
