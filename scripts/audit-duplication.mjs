#!/usr/bin/env node
/**
 * 打重门禁 —— 同一拍不许讲两遍。
 * ============================================================================
 *
 * ## 守什么
 * --------
 * 2026-11-09 用户截图实测：「排队测灵」这一拍被场景旁白与决策卡同月各讲一遍，
 * 玩家在 14–17 岁间把「把手放到测灵石上」读了四遍。
 * 本门禁量化「重复讲述」，给故事重写（凡身炼气篇 W0–W5）当尺子：
 *
 *   · **同月重复讲述** —— 同一个月的两条流水共享 ≥10 字连续相同片段
 *     （10 字的复用不可能是巧合，只可能是文案复用）；
 *   · 每条命取处数，跨命取**中位数**（个别人的极端命不绑架指标）。
 *
 * ## 方向
 * ------
 * 故事重写每推一段（W1 入门同门 → W2 入门串拍子认领 → …），这个数**只许降**；
 * 抬升 ⇒ 报红。W0 钉现状值 1.5 处/命，验收目标 ≤0.5。
 *
 * 用法：
 *   node scripts/audit-duplication.mjs            # 实测并打印
 *   node scripts/audit-duplication.mjs --gen      # 重生成基线（有意变更后）
 *   node scripts/audit-duplication.mjs --check    # 比对（回归门禁用这个）
 */
import {readFileSync, writeFileSync, existsSync, mkdirSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {playCultivation} from './play-cultivation.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = join(ROOT, 'tests', 'fixtures', 'duplication-baseline.json');
const LIVES = 120;
const FRAG = 10;                       /* 共享片段长度阈值 */
const PATHS = ['orthodox', 'loose', 'demonic', 'beast', 'mortal'];

/** 两条流水是否共用 ≥FRAG 字连续片段，返回该片或 null。 */
function sharedFragment(a, b) {
  if (a.length < 20 || b.length < 20) return null;
  for (let i = 0; i + FRAG <= a.length; i++) {
    const frag = a.slice(i, i + FRAG);
    if (b.includes(frag)) return frag;
  }
  return null;
}

function collect() {
  const perLife = [];
  let crashes = 0;
  const samples = [];
  for (let i = 0; i < LIVES; i++) {
    let r;
    try {
      r = playCultivation({seed: '打重审计-' + i, rulesVersion: 12, path: PATHS[i % 5],
        conduct: i % 3 === 0 ? 'cautious' : 'care', ending: 'guard', family: 'keep', school: 'sword'});
    } catch (error) { crashes++; continue; }
    const byMonth = {};
    for (const j of r.state.journal)(byMonth[j.month] = byMonth[j.month] || []).push(j);
    let hits = 0;
    for (const list of Object.values(byMonth)) {
      if (list.length < 2) continue;
      for (let x = 0; x < list.length; x++)for (let y = x + 1; y < list.length; y++) {
        const a = (list[x].title || '') + (list[x].body || '');
        const b = (list[y].title || '') + (list[y].body || '');
        const frag = sharedFragment(a, b);
        if (frag) {
          hits++;
          if (samples.length < 10) samples.push({seed: i, month: list[x].month,
            t1: list[x].title, t2: list[y].title, frag});
        }
      }
    }
    perLife.push(hits);
  }
  const sorted = [...perLife].sort((a, b) => a - b);
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  return {lives: perLife.length, crashes, median, mean: perLife.length ? Math.round(perLife.reduce((a, b) => a + b, 0) / perLife.length * 10) / 10 : 0, samples};
}

const report = collect();
const args = process.argv.slice(2);
const baseline = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, 'utf8')) : null;

if (args.includes('--gen')) {
  const payload = {generatedAt: new Date().toISOString(), tool: 'audit-duplication', lives: LIVES,
    fragLength: FRAG, median: report.median, mean: report.mean,
    history: [...(baseline && baseline.history || []), {at: new Date().toISOString(), median: report.median,
      note: (args.find(a => a.startsWith('--reason=')) || '--reason=未注明').slice(9)}]};
  mkdirSync(dirname(FIXTURE), {recursive: true});
  writeFileSync(FIXTURE, JSON.stringify(payload, null, 2) + '\n');
  console.log('✓ 基线已写入 ' + FIXTURE.replace(ROOT + '/', '') + '（中位 ' + report.median + ' 处/命）');
  process.exit(0);
}

console.log('打重审计（实跑 ' + report.lives + ' 条命' + (report.crashes ? '，崩溃 ' + report.crashes + ' 条' : '') + '）');
console.log('  同月重复讲述（≥' + FRAG + ' 字共享片段）  中位 ' + report.median + ' 处/命 · 均值 ' + report.mean);
for (const s of report.samples.slice(0, 5))console.log('  · [' + s.seed + '] ' + Math.floor(s.month / 12) + '岁「' + s.t1 + '」×「' + s.t2 + '」共用「' + s.frag.slice(0, 12) + '…」');

let problems = [];
if (report.crashes) problems.push('有 ' + report.crashes + ' 条命崩了');
if (!baseline) problems.push('基线不存在（先 --gen）');
else if (report.median > baseline.median) problems.push('同月重复讲述抬升：' + baseline.median + ' → ' + report.median + '（重写只许降不许涨）');

if (args.includes('--check')) {
  if (problems.length) {console.log('  ✗ ' + problems.join('；'));console.log('结果：' + problems.length + ' 个问题');process.exit(1);}
  console.log('  ✓ 不高于基线 ' + baseline.median + ' 处/命');
  console.log('结果：0 个问题');
} else if (problems.length) {console.log('  ⚠ ' + problems.join('；'));}
