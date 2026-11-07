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
 *   ② 密度：最挤的 10 年 / 5 年有多少个**日常抉择**（方案口径：≤ 5 / ≤ 3）
 *   ③ 冷却：同标题的**旁白**、同一张**抉择卡**在 60 个月内重复了几处
 *   ④ 节奏对齐：每个境界段实际发出过多少种不同内容（方案口径：≥ 5）
 *   ⑤ 结局覆盖：多少条人生没有结局文本
 *   ⑥ 阶段跨度：同一里程碑的突破年龄跨度（方案口径：中位数口径，见 audit-cadence）
 *
 * ## ②③ 的口径为什么改过（2026-11-07 · T2）
 * -------------------------------------------
 * 以前这两个指标**把人生节点也算进去**：
 *   · 密度：突破卡、长线卡（一生就那几次）都算 ⇒ 「最挤 10 年 14 张」，
 *     其实那张卡挤的是**玩家真正要做的日常决定**；
 *   · 冷却：玩家的**抉择记录**也算「同标题重复」——
 *     可玩家两次选了同一个选项，那是他自己的历史，不是「同一句话说两遍」。
 * ⇒ 现在按「日常卡」与「旁白」两个口径量（与规则层的闸同一份口径：
 *   `packages/adventure/gates.js`），量出来��是玩家真正感觉到的那件事。
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
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {playCultivation} from './play-cultivation.mjs';
import {EVENTS} from '../packages/adventure/engine.js';
import {isMilestone, SPEC as GATES_SPEC} from '../packages/adventure/gates.js';
import * as GATES from '../packages/adventure/gates.js';
import {projectRoot} from './serve.mjs';
/* ⚠ 底线数字**只住这一份**（浏览器也要用 ⇒ 这个文件不许 import node:*）。 */
import {REALM_KINDS_MIN} from './lib/completeness-limits.js';

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
  spanMedian: 'down',     // 阶段跨度：各段突破间隔的中位数（最差的一段）
};

/**
 * 硬底线：不管基线多少，这几项不许有。
 *
 * ⚠ 密度与冷却的**目标值是规格**（写在这里），规则层的闸另有一份实现值
 *   （`packages/adventure/gates.js` 的 `DENSITY_MAX_10Y` / `COOLDOWN_MONTHS`）。
 *   两份数字必须一样 —— 不一样就报红（见下面的「闸与规格对不对得上」）。
 *   分成两份是为了能做**反向验证**：把闸的实现值改小（冷却 60 → 12 个月），
 *   规格这一份不动 ⇒ 实测立刻出现重复 ⇒ 门禁报红 ⇒ 证明这道闸是真的在管事。
 *
 * ⚠ `spanMedian` 的规格目标是 **15 年**（`SPAN_TARGET`），但实测是 51 年 ——
 *   **尚未达标** ⇒ 硬底线先钉在今天的值（不许变宽），
 *   「未达标」这件事登记在完备度门禁的缺口台账里（`scripts/audit-completeness.mjs`）。
 *   ⇒ 门禁是绿的，但「还差多少」写在明面上，不是藏起来。
 */
const HARD_LIMIT = {endingMissing: 0, density10: 5, density5: 3, cooldownRepeats: 0, realmContentMin: REALM_KINDS_MIN, spanMedian: 51};


/** 跑一条命，把它的指标事实收拢起来。 */
export function specFor(i) {
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
    /* 密度：按**日常卡**数（人生节点不算 —— 突破卡与长线卡本来就该发生，
       玩家要喘口气的是那些日常决定）。口径与规则层的闸同一份：
       `packages/adventure/gates.js` 的 `isMilestone`。 */
    const ages = run.snapshots.filter(s => !isMilestone(s.event)).map(s => s.age);
    let density10 = 0, density5 = 0;
    for (let start = 0; start <= 120; start++) {
      density10 = Math.max(density10, ages.filter(a => a >= start && a < start + 10).length);
      density5 = Math.max(density5, ages.filter(a => a >= start && a < start + 5).length);
    }
    /* 冷却：**旁白**同标题在 60 个月内重复（这是「同一件事说两遍」），
       加上**同一张抉择卡**在 60 个月内重复（这是「同一张卡又来了」）。
       ⚠ 玩家的抉择记录（选了两次同一个选项）**不算**重复 —— 那是他的历史。 */
    let cooldownRepeats = 0;
    const byTitle = {};
    for (const j of run.state.journal) {
      if (!j.automatic) continue;
      const list = byTitle[j.title] || (byTitle[j.title] = []);
      list.push(j.month);
    }
    for (const months of Object.values(byTitle)) {
      for (let i = 1; i < months.length; i++) {
        if (months[i] - months[i - 1] < GATES_SPEC.cooldownMonths) cooldownRepeats++;
      }
    }
    const lastCard = {};
    for (const d of run.state.decisions) {
      const last = lastCard[d.event];
      if (last !== undefined && d.month - last < GATES_SPEC.cooldownMonths) cooldownRepeats++;
      lastCard[d.event] = d.month;
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
    /*
     * 同一里程碑的突破间隔（**这条命里**）——
     *   `spanMax` 是「最差的一条命隔了多久」，一条命就能把它顶爆；
     *   这里要的是**中位数口径**（方案里的说法）：多数人隔多久。
     *   ⇒ 每条命记下「每一境隔了多少年」，由 `spanMedianOf` 汇总。
     */
    const tierSpans = {};
    for (const [tier, span] of Object.entries(spanByRealm)) {
      if (span > 0) tierSpans[tier] = span;
    }
    return {
      ok: true,
      density10, density5, cooldownRepeats, spanMax,
      events: run.events,
      realmCounts: Object.fromEntries(Object.entries(perRealm).map(([k, v]) => [k, v.size])),
      noEnding: !(run.state.ending && run.state.ending.title && run.state.ending.text),
      tierSpans,
      /* 每条命的卡序列快照（年龄 / 卡 id / 境界）——
       * 完备度盘点（`scripts/audit-completeness.mjs`）要用**同一批人生**算
       * 「哪一年发什么卡」，所以这里把它带出来，别让那边再跑一遍。 */
      snapshots: run.snapshots,
    };
  } catch (error) {
    return {ok: false, error: String(error && error.message || error)};
  }
}

/** 跑一批人生，把每条命的事实收拢起来（**只跑，不管指标**）。 */
export function collectLives(count = 120) {
  const runs = [];
  for (let i = 0; i < count; i++) runs.push(runOne(specFor(i)));
  const good = runs.filter(r => r.ok);
  const failed = runs.filter(r => !r.ok);
  return {count, good, failed};
}

/**
 * 各境界段实际发出过多少种不同内容。
 *
 * ⚠ 口径：**取每条命里最多的那一档**，不是把所有人的并起来 ——
 *   并集会把「只有极少数命走到的内容」算进去，看着好看，其实玩家碰不到。
 *
 * 完备度盘点也用这个函数 ⇒ 两边**同一套口径**，数字必然一致
 * （不一致就说明有一边改过口径却没改另一边 ⇒ 那是要紧的事，不是噪音）。
 */
export function realmCountsOf(good) {
  const perRealm = {};
  for (const r of good) {
    for (const [realm, n] of Object.entries(r.realmCounts)) {
      perRealm[realm] = Math.max(perRealm[realm] || 0, n);
    }
  }
  return perRealm;
}

/**
 * 各境界段的「突破间隔中位数」（中位数口径）。
 *
 * ⚠ 口径：**一条命里**同一境界段的两次突破隔了多少年，再对所有命取中位数。
 *   为什么不用 `spanMax` 那个口径：它量的是「最差的一条命隔了多久」——
 *   一条命就能把它顶爆（实测 102 年），既不是典型情况，也不适合当底线。
 *
 * 规格目标：每段 ≤ 15 年（`docs/内容架构重构方案-2026-11-06.md` 六项指标第 6 条）。
 * ⚠ 实测**尚未达标**（炼气 5 · 筑基 4 · 金丹 27 · 元婴 51）⇒
 *   这条已登记成**已知缺口**（门禁 `completeness` 的缺口台账里），
 *   门禁本身只守「不许变得更宽」。
 *
 * @param {object[]} good 跑成功的命（每条带 `tierSpans`）
 * @returns {{tiers: object, worst: number, overall: number}}
 */
export function spanMedianOf(good) {
  const perTier = {};
  for (const life of good) {
    for (const [tier, span] of Object.entries(life.tierSpans || {})) {
      (perTier[tier] = perTier[tier] || []).push(span);
    }
  }
  const median = (list) => {
    if (!list.length) return null;
    const s = [...list].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
  };
  const tiers = {};
  for (const [tier, list] of Object.entries(perTier)) tiers[tier] = median(list);
  const numbers = Object.values(tiers).filter(v => v !== null);
  return {
    tiers,
    worst: numbers.length ? Math.max(...numbers) : 0,
    overall: numbers.length ? median(numbers) : 0,
  };
}

/** 规格里的目标值（第 6 条：跨度中位数 ≤ 15 年）。 */
export const SPAN_TARGET = 15;

/**
 * 算出一批人生的事实（**不跑人生**，只做汇总）。
 *
 * 拆出来是为了让完备度盘点能**只跑一批命**、同时拿到六项指标与逐年的卡分布
 * —— 两边共用同一批命 ⇒ 数字必然对得上。
 */
export function metricsOf(good, count = good.length) {
  /* ① 可达性：事件表里一次都没出现过的条数。 */
  const seen = new Set(good.flatMap(r => r.events));
  const allIds = Object.keys(EVENTS);
  const neverSeen = allIds.filter(id => !seen.has(id));

  /* ④ 节奏对齐：各境界段内容种数（口径见 `realmCountsOf`）。 */
  const realmCounts = realmCountsOf(good);
  const realmContentMin = Object.keys(realmCounts).length ? Math.min(...Object.values(realmCounts)) : 0;

  /* ⑥ 阶段跨度：各段突破间隔的**中位数**（口径见 `spanMedianOf`）。 */
  const span = spanMedianOf(good);

  const metrics = {
    neverSeen: neverSeen.length,
    density10: good.length ? Math.max(...good.map(r => r.density10)) : 0,
    density5: good.length ? Math.max(...good.map(r => r.density5)) : 0,
    cooldownRepeats: good.reduce((n, r) => n + r.cooldownRepeats, 0),
    realmContentMin,
    endingMissing: good.filter(r => r.noEnding).length,
    spanMax: good.length ? Math.max(...good.map(r => r.spanMax)) : 0,
    spanMedian: span.worst,
  };
  return {count, good: good.length, metrics, realmCounts, span, neverSeenSample: neverSeen.slice(0, 10)};
}

/** 跑一批人生，算出六项指标。 */
export function collect(count = 120) {
  const {good, failed} = collectLives(count);
  return {...metricsOf(good, count), failed};
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
    if (limit !== undefined) {
      /*
       * ⚠ 硬底线的比较方向**必须跟着指标方向走**：
       *   `density10` 越小越好 ⇒ 超过上限就报红；
       *   `realmContentMin` 越大越好 ⇒ **低于**下限才报红。
       *   （早先写成一律「超过就报红」⇒ 把「6 种内容 ≥ 下限 5 种」误判成超标。）
       */
      if (direction === 'down' && now > limit) {
        problems.push(`${key} 超过硬底线：${now} > ${limit}`);
      } else if (direction === 'up' && now < limit) {
        problems.push(`${key} 低于硬底线：${now} < ${limit}`);
      }
    }
  }
  /*
   * ⚠ **闸与规格对不对得上** —— 两份数字必须一致。
   *
   * 规则层的闸（`packages/adventure/gates.js`）有一份实现值，
   * 本脚本有一份规格值（`SPEC`）。两边不一样 ⇒ 有人的闸已经不听规格了 ⇒ 报红。
   * （这一条也让「反向验证」站得住：把闸的实现值改小，规格不动 ⇒ 这里立刻报红。）
   */
  if (GATES.DENSITY_MAX_10Y !== GATES_SPEC.density10) {
    problems.push(`密度闸的十年上限与规格不一致：闸 ${GATES.DENSITY_MAX_10Y} ≠ 规格 ${GATES_SPEC.density10}`);
  }
  if (GATES.DENSITY_MAX_5Y !== GATES_SPEC.density5) {
    problems.push(`密度闸的五年上限与规格不一致：闸 ${GATES.DENSITY_MAX_5Y} ≠ 规格 ${GATES_SPEC.density5}`);
  }
  if (GATES.COOLDOWN_MONTHS !== GATES_SPEC.cooldownMonths) {
    problems.push(`冷却闸的月份与规格不一致：闸 ${GATES.COOLDOWN_MONTHS} ≠ 规格 ${GATES_SPEC.cooldownMonths}`);
  }
  return problems;
}

/* ── CLI ──────────────────────────────────────────────────────────────── */

/*
 * ⚠ 这一段**只在直接运行时**才做（`node scripts/audit-metrics.mjs …`）。
 *   因为别的脚本要 import 本文件里的 `collectLives` / `realmCountsOf` / `specFor`
 *   （完备度盘点要用**同一批人生、同一套口径**算「哪一年发什么卡」）
 *   ⇒ import 时不能顺手把报告打出来、更不能 `process.exit`。
 */
async function main() {
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
  console.log('  阶段跨度（最差的一条命）  ' + report.metrics.spanMax + ' 年');
  const spanText = Object.entries(report.span.tiers)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([tier, n]) => `境界 ${tier} ${n} 年`)
    .join(' · ');
  console.log('  突破间隔（中位数口径）  ' + spanText + `（最差一段 ${report.metrics.spanMedian} 年）`);
  console.log(`    ⚠ 规格目标是每段 ≤ ${SPAN_TARGET} 年 —— 金丹以后**尚未达标**`
    + '（已登记在完备度门禁的缺口台账里；改它要走「有意行为变更」流程）');
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
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  await main();
}
