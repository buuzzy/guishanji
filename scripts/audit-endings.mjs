#!/usr/bin/env node
/**
 * 结局分布审计 —— 25 个结局到底各自落了多少条命
 * ============================================================================
 *
 * 守的是什么
 * ----------
 * 2026-11-08 评审（章节感补强 · C3）：框架只盘过「结局覆盖」（没有哪条命缺结局），
 * 没盘过「分布」—— 大量人生落不落到 old_age（寿终而未走完的路），没人量过。
 * 一个 25 个结局的系统，如果九成命都落在同一两个结局上，其余结局就是摆设。
 *
 * 指标
 * ----
 *   · endings：每个结局 id → 出现次数（报告用）；
 *   · oldAgeShare：old_age 占比（越低越好）—— 收进 `audit-metrics.mjs` 的
 *     `HARD_LIMIT`（那边 120 命口径，进全量回归），本脚本 400 命做登记与细分布；
 *   · byGoal：**分志向的结局分布** —— 四种志向按命的编号轮流分配，
 *     用来验收「四个志向都对结局分布产生了可观测影响」（章节感补强 C2）。
 *
 * ## 志向轮换的口径（2026-11-08 · v3）
 * --------------------------------
 * 审计自己给每条命指定志向（free/dao/protect/wander 各 1/4），
 * 经典档不传志向仍用 'free' ⇒ 基线不受影响。
 * ⚠ 引擎在志向生效（C2）落地之前会把非经典档强制 'free'（engine.js），
 *   所以阶段一量到的分志向分布四组会**完全一样** —— 这是预期，
 *   阶段三 C2 落地重算时四组才会分开。分四组是为了让「C2 到底有没有生效」
 *   在阶段三一眼可验，不用另写验证脚本。
 *
 * 用法
 * ----
 *   node scripts/audit-endings.mjs                 # 报告（400 命）
 *   node scripts/audit-endings.mjs --check         # 核对基线（登记用，不进回归）
 *   node scripts/audit-endings.mjs --gen --reason=…# 重生成基线
 *   node scripts/audit-endings.mjs --count=200     # 少跑几条命
 *
 * ⚠ 本脚本**不在 run-regression 的 38 道门禁里**（400 命太慢，回归要快）；
 *   回归里判红的是 `audit-metrics.mjs` 的 `oldAgeShare`（120 命口径）。
 *   本脚本是登记与细分布的工具：`--gen` 写基线、`--check` 对照。
 */
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {playCultivation} from './play-cultivation.mjs';
import {projectRoot} from './serve.mjs';

const BASELINE_FILE = join(projectRoot, 'tests/fixtures/ending-distribution.json');

/** 四种志向按命编号轮换 —— 每种 1/4，保证分志向分布有足够样本。 */
export const GOALS = ['free', 'dao', 'protect', 'wander'];

/** 结局分布审计自己的取命口径（与 audit-metrics.specFor 同构，多一项志向）。
 *  ⚠ 志向用 floor(i/4)%4 轮换，不用 i%4 ——
 *    决策偏好里的「结局倾向」恰好也是 i%4（i%4===0 走问道结局），
 *    两个 i%4 会完全相关 ⇒ 每种志向绑定一种结局倾向，量出来的就是假差异。 */
export function specForEndings(i) {
  const paths = ['orthodox', 'loose', 'demonic', 'beast', 'mortal'];
  return {
    seed: '结局审计-' + i,
    rulesVersion: 12,
    path: paths[i % 5],
    conduct: i % 7 === 0 ? 'selfish' : i % 3 === 0 ? 'cautious' : 'care',
    ending: i % 4 === 0 ? 'dao' : 'guard',
    family: i % 9 === 0 ? 'sever' : 'keep',
    school: ['sword', 'alchemy', 'array'][i % 3],
    goal: GOALS[Math.floor(i / 4) % 4],
  };
}

/** 汇总一批命的结局分布（**不跑命**，只做统计——与基线核对共用口径）。 */
export function endingsOf(lives) {
  const endings = {};
  const byGoal = {};
  let oldAge = 0;
  for (const r of lives) {
    endings[r.ending] = (endings[r.ending] || 0) + 1;
    const g = r.goal || 'free';
    byGoal[g] = byGoal[g] || {};
    byGoal[g][r.ending] = (byGoal[g][r.ending] || 0) + 1;
    if (r.ending === 'old_age') oldAge++;
  }
  const total = lives.length;
  const share = {};
  for (const [id, n] of Object.entries(endings)) share[id] = Math.round(n / total * 1000) / 10;
  return {
    total,
    endings,
    share,
    oldAgeShare: total ? Math.round(oldAge / total * 1000) / 10 : 0,
    byGoal,
  };
}

/** 跑一批命，算结局分布。 */
export async function collectEndings(count = 400) {
  const lives = [];
  const failed = [];
  for (let i = 0; i < count; i++) {
    try {
      const r = playCultivation(specForEndings(i));
      lives.push({ending: r.ending, goal: specForEndings(i).goal, path: r.path});
    } catch (error) {
      failed.push({i, error: String(error && error.message || error)});
    }
  }
  return {...endingsOf(lives), failed};
}

/** 核对基线：oldAgeShare 只许变好（降），结局清单不许悄悄丢。 */
export function checkEndings(report, baseline) {
  const problems = [];
  if (!baseline || !baseline.endings) {
    problems.push('基线里没有结局分布（先跑 --gen 生成基线）');
    return problems;
  }
  if (report.oldAgeShare > baseline.oldAgeShare) {
    problems.push(`oldAgeShare 变差了：${baseline.oldAgeShare}% → ${report.oldAgeShare}%（只许变好，不许变差）`);
  }
  const beforeIds = Object.keys(baseline.endings);
  const nowIds = Object.keys(report.endings);
  for (const id of beforeIds) {
    if (!nowIds.includes(id)) problems.push(`结局 ${id} 从分布里消失了（以前有 ${baseline.endings[id]} 条）`);
  }
  return problems;
}

/* ── CLI ──────────────────────────────────────────────────────────────── */

async function main() {
  const argv = process.argv.slice(2);
  const count = Number(argv.find(a => a.startsWith('--count='))?.split('=')[1] || 400);
  const report = await collectEndings(count);

  if (argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(0);
  }

  console.log(`结局分布审计（实跑 ${report.total} 条命，失败 ${report.failed.length} 条）\n`);
  const sorted = Object.entries(report.endings).sort((a, b) => b[1] - a[1]);
  for (const [id, n] of sorted) {
    console.log(`  ${id.padEnd(22)} ${String(n).padStart(4)} 条  ${report.share[id]}%`);
  }
  console.log(`\n  oldAgeShare（寿终未走完的占比）  ${report.oldAgeShare}%`);
  console.log('\n  分志向的结局分布（志向轮换口径，见脚本头注）：');
  for (const [g, dist] of Object.entries(report.byGoal)) {
    const top = Object.entries(dist).sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([id, n]) => `${id} ${n}`).join(' · ');
    console.log(`    ${g.padEnd(8)} 共 ${Object.values(dist).reduce((a, b) => a + b, 0)} 条  头三名：${top}`);
  }
  if (report.failed.length) console.log('  ⚠ ' + report.failed.length + ' 条命没跑完（已排除）');

  if (argv.includes('--gen')) {
    const reason = (argv.find(a => a.startsWith('--reason=')) || '').slice('--reason='.length);
    let history = [];
    try {
      const old = JSON.parse(await readFile(BASELINE_FILE, 'utf8'));
      if (old && Array.isArray(old.history)) history = old.history;
      if (old && old.endings && reason) {
        history.push({at: new Date().toISOString(), reason, from: {oldAgeShare: old.oldAgeShare, endings: old.endings}, to: {oldAgeShare: report.oldAgeShare, endings: report.endings}});
      }
      if (old && old.endings && !reason) {
        console.log('\n⚠ 这次重生成没有写理由（--reason=…）⇒ 台账里会记成「未说明」。');
      }
    } catch {
      /* 第一次生成，没有旧基线 */
    }
    const payload = {createdAt: new Date().toISOString(), count: report.count ?? report.total, oldAgeShare: report.oldAgeShare, endings: report.endings, byGoal: report.byGoal, history};
    await mkdir(join(projectRoot, 'tests/fixtures'), {recursive: true});
    await writeFile(BASELINE_FILE, JSON.stringify(payload, null, 2) + '\n');
    console.log('\n✓ 基线已写入 ' + BASELINE_FILE);
    process.exit(0);
  }

  let baseline = null;
  try {
    baseline = JSON.parse(await readFile(BASELINE_FILE, 'utf8'));
  } catch {
    console.log('\n✗ 没有基线文件：' + BASELINE_FILE + '（先跑 node scripts/audit-endings.mjs --gen）');
    process.exit(1);
  }

  if (argv.includes('--check')) {
    const problems = checkEndings(report, baseline);
    if (problems.length) {
      console.log('\n════════ 结局分布核对 ════════');
      for (const p of problems) console.log('  ✗ ' + p);
      console.log('\n结果：' + problems.length + ' 个问题');
      process.exit(1);
    }
    console.log('\n✓ 结局分布不比基线差');
    process.exit(0);
  }

  process.exit(0);
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  await main();
}
