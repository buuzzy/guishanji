#!/usr/bin/env node
/**
 * 事件序列保真门禁 —— 固定种子的完整人生必须逐条相同。
 *
 * 守什么：
 *   「同一颗种子、同一套决策策略，跑出来的这一生必须一模一样」。
 *   事件表保真门禁守的是**表的结构**；本门禁守的是**实际跑出来的行为** ——
 *   哪一年发哪张卡、玩家选了哪个选项、最后走到哪个结局。
 *
 *   任何调度顺序、触发条件、结算逻辑的改动，只要改变了行为，这里就会红。
 *
 *   ⚠️ 注意：`scripts/verify-events-fidelity.mjs` 守结构，本门禁守行为。
 *      纯重构阶段两个都必须全绿；有意行为变更阶段（突破必发 / 体力拆分 / 长线区间）
 *      只有本门禁允许变，且必须先存旧基线、逐条审差异、再更新基线。
 *
 * 用法：
 *   node scripts/verify-event-sequence.mjs            # 生成基线
 *   node scripts/verify-event-sequence.mjs --check    # 比对（回归门禁用这个）
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { playCultivation } from './play-cultivation.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = join(ROOT, 'tests', 'fixtures', 'event-sequences.json');

/**
 * 十二条固定人生：覆盖五条路径 × 不同性格 / 结局 / 技艺 / 宗门策略，
 * 目的是让「一条分支变了」这种改动无处可藏。
 */
export const RUNS = [
  { seed: '序列基线-0', path: 'orthodox', conduct: 'care', ending: 'guard', school: 'sword' },
  { seed: '序列基线-1', path: 'loose', conduct: 'care', ending: 'guard', school: 'alchemy' },
  { seed: '序列基线-2', path: 'demonic', conduct: 'selfish', ending: 'dao', school: 'array' },
  { seed: '序列基线-3', path: 'beast', conduct: 'care', ending: 'guard', school: 'sword' },
  { seed: '序列基线-4', path: 'mortal', conduct: 'care', ending: 'guard', school: 'alchemy' },
  { seed: '序列基线-5', path: 'orthodox', conduct: 'cautious', ending: 'dao', school: 'array', family: 'sever' },
  { seed: '序列基线-6', path: 'loose', conduct: 'selfish', ending: 'guard', school: 'sword', material: 'risk' },
  { seed: '序列基线-7', path: 'orthodox', conduct: 'care', ending: 'guard', school: 'alchemy', method: 'ember' },
  { seed: '序列基线-8', path: 'demonic', conduct: 'cautious', ending: 'guard', school: 'sword', childhood: 'bold' },
  { seed: '序列基线-9', path: 'beast', conduct: 'selfish', ending: 'dao', school: 'array' },
  { seed: '序列基线-10', path: 'mortal', conduct: 'care', ending: 'guard', school: 'sword', years: 'stay' },
  { seed: '序列基线-11', path: 'orthodox', conduct: 'care', ending: 'guard', school: 'sword', rebuild: 'revenge', remit: 'stone' },
];

/** 两个规则版本：11（旧一版）与 12（当前版）。 */
export const RULES_VERSIONS = [11, 12];

/** 跑出全部序列。 */
export function collect() {
  const runs = [];
  for (const rulesVersion of RULES_VERSIONS) {
    for (const spec of RUNS) {
      const input = Object.assign({ rulesVersion }, spec);
      try {
        const run = playCultivation(input);
        runs.push({
          seed: spec.seed,
          rulesVersion,
          path: run.path,
          ending: run.ending,
          steps: run.snapshots.map(s => [s.event, s.option, s.age]),
        });
      } catch (error) {
        runs.push({ seed: spec.seed, rulesVersion, error: String(error && error.message || error) });
      }
    }
  }
  return { runs };
}

/** 比对当前序列与基线，返回问题清单。 */
export function compare(actual, expected) {
  const problems = [];
  if (!expected || !Array.isArray(expected.runs)) return ['基线文件不可用或格式不对：' + FIXTURE];
  if (actual.runs.length !== expected.runs.length) {
    problems.push('人生条数变了：' + expected.runs.length + ' → ' + actual.runs.length);
    return problems;
  }
  for (let i = 0; i < actual.runs.length; i++) {
    const a = actual.runs[i];
    const e = expected.runs[i];
    const tag = a.seed + '(rules ' + a.rulesVersion + ')';
    if (!!a.error !== !!e.error) {
      problems.push(tag + '：一边报错一边没报错（' + (a.error || e.error) + '）');
      continue;
    }
    if (a.error) {
      if (a.error !== e.error) problems.push(tag + '：报错信息变了');
      continue;
    }
    if (a.path !== e.path) problems.push(tag + '：路径变了 ' + e.path + ' → ' + a.path);
    if (a.ending !== e.ending) problems.push(tag + '：结局变了 ' + e.ending + ' → ' + a.ending);
    const max = Math.max(a.steps.length, e.steps.length);
    let reported = 0;
    for (let k = 0; k < max && reported < 3; k++) {
      const as = a.steps[k];
      const es = e.steps[k];
      if (JSON.stringify(as) === JSON.stringify(es)) continue;
      reported++;
      problems.push(tag + '：第 ' + (k + 1) + ' 步变了 ' + JSON.stringify(es) + ' → ' + JSON.stringify(as));
    }
    if (a.steps.length !== e.steps.length) {
      problems.push(tag + '：步数变了 ' + e.steps.length + ' → ' + a.steps.length);
    }
  }
  return problems;
}

/* ── CLI ───────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const actual = collect();

if (argv.includes('--check')) {
  if (!existsSync(FIXTURE)) {
    console.error('✗ 缺少基线：' + FIXTURE);
    process.exit(1);
  }
  const expected = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const problems = compare(actual, expected);
  if (problems.length) {
    console.log('════════ 事件序列保真 ════════');
    for (const p of problems) console.log('  ✗ ' + p);
    console.log('\n结果：' + problems.length + ' 个问题');
    process.exit(1);
  }
  const steps = actual.runs.reduce((n, r) => n + (r.steps ? r.steps.length : 0), 0);
  console.log('✓ ' + actual.runs.length + ' 条固定人生的决策序列逐条全等（共 ' + steps + ' 步）');
  process.exit(0);
}

const payload = {
  generatedAt: new Date().toISOString(),
  tool: 'verify-event-sequence',
  rulesVersions: RULES_VERSIONS,
  runs: actual.runs,
};
mkdirSync(dirname(FIXTURE), { recursive: true });
writeFileSync(FIXTURE, JSON.stringify(payload, null, 2) + '\n');
const steps = actual.runs.reduce((n, r) => n + (r.steps ? r.steps.length : 0), 0);
console.log('✓ 已写入基线 ' + FIXTURE + '（' + actual.runs.length + ' 条人生 / ' + steps + ' 步）');
process.exit(0);
