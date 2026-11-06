#!/usr/bin/env node
/**
 * 事件表版本保真门禁 —— 九个历史版本的事件表必须逐值全等。
 *
 * 守什么：
 *   `content/` 里曾经有 9 份事件表副本（cultivation-stories{,-v5..-v11}.js），
 *   每份自带一张完整的表字面量 + 一段递增的装配尾巴。
 *   归一（S1）把它们收敛成一份主表之后，**每个历史版本拿到的内容必须一模一样**。
 *   这道门禁就是「归一没有偷偷改变任何历史版本」的证据。
 *
 * 为什么不能只靠旧基线：
 *   旧基线（tests/fixtures/adventure-rules*-baseline.json）守的是「跑出来的人生」，
 *   覆盖不到「表里到底有没有多一个事件、少一条选项」。本门禁守的是**表的结构本身**。
 *
 * 用法：
 *   node scripts/verify-events-fidelity.mjs            # 生成基线
 *   node scripts/verify-events-fidelity.mjs --check    # 比对（回归门禁用这个）
 *   node scripts/verify-events-fidelity.mjs --print    # 打印当前实际内容（排查用）
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, digest, tableDigest, idDiff } from './serialize-content.mjs';
import * as tables from '../content/cultivation-stories.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = join(ROOT, 'tests', 'fixtures', 'events-versions.json');

/** 九个历史版本，顺序即装配顺序。 */
export const VERSION_EXPORTS = [
  'CULTIVATION_EVENTS',
  'RULES11_CULTIVATION_EVENTS',
  'RULES10_CULTIVATION_EVENTS',
  'RULES9_CULTIVATION_EVENTS',
  'RULES8_CULTIVATION_EVENTS',
  'RULES7_CULTIVATION_EVENTS',
  'RULES6_CULTIVATION_EVENTS',
  'RULES5_CULTIVATION_EVENTS',
  'LEGACY_CULTIVATION_EVENTS',
];

/** 采当前实际内容。 */
export function collect() {
  const versions = {};
  for (const name of VERSION_EXPORTS) {
    const table = tables[name];
    if (!table) throw new Error('内容文件缺少导出：' + name);
    versions[name] = Object.assign(tableDigest(table), { ids: Object.keys(table).sort() });
  }
  const chains = tables.ROAD_CHAINS;
  if (!Array.isArray(chains)) throw new Error('内容文件缺少导出：ROAD_CHAINS');
  return {
    versions,
    roadChains: { count: chains.length, digest: digest(chains), ids: chains.map(c => c.id) },
  };
}

/** 比对当前内容与基线，返回问题清单。 */
export function compare(actual, expected) {
  const problems = [];
  if (!expected || !expected.versions) return ['基线文件不可用或格式不对：' + FIXTURE];
  for (const name of VERSION_EXPORTS) {
    const a = actual.versions[name];
    const e = expected.versions[name];
    if (!e) { problems.push('基线缺少版本 ' + name); continue; }
    if (a.count !== e.count) problems.push(name + '：条目数 ' + e.count + ' → ' + a.count);
    if (a.digest !== e.digest) {
      problems.push(name + '：内容摘要变了（' + e.digest + ' → ' + a.digest + '）');
    }
    const diff = idDiff(a.ids, e.ids);
    if (diff.added.length) {
      problems.push(name + '：多出 ' + diff.added.length + ' 个事件（' + diff.added.slice(0, 5).join('、') + '）');
    }
    if (diff.removed.length) {
      problems.push(name + '：少了 ' + diff.removed.length + ' 个事件（' + diff.removed.slice(0, 5).join('、') + '）');
    }
  }
  if (actual.roadChains.count !== expected.roadChains.count) {
    problems.push('ROAD_CHAINS：条数 ' + expected.roadChains.count + ' → ' + actual.roadChains.count);
  }
  if (actual.roadChains.digest !== expected.roadChains.digest) {
    problems.push('ROAD_CHAINS：内容摘要变了（' + expected.roadChains.digest + ' → ' + actual.roadChains.digest + '）');
  }
  const chainDiff = idDiff(actual.roadChains.ids, expected.roadChains.ids);
  if (chainDiff.added.length) problems.push('ROAD_CHAINS：多出 ' + chainDiff.added.join('、'));
  if (chainDiff.removed.length) problems.push('ROAD_CHAINS：少了 ' + chainDiff.removed.join('、'));
  return problems;
}

/* ── CLI ───────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
if (argv.includes('--print')) {
  console.log(JSON.stringify(canonical(collect()), null, 2));
  process.exit(0);
}

const actual = collect();

if (argv.includes('--check')) {
  if (!existsSync(FIXTURE)) {
    console.error('✗ 缺少基线：' + FIXTURE);
    process.exit(1);
  }
  const expected = JSON.parse(readFileSync(FIXTURE, 'utf8'));
  const problems = compare(actual, expected);
  if (problems.length) {
    console.log('════════ 事件表版本保真 ════════');
    for (const p of problems) console.log('  ✗ ' + p);
    console.log('\n结果：' + problems.length + ' 个问题');
    process.exit(1);
  }
  const counts = VERSION_EXPORTS.map(n => n.replace('_CULTIVATION_EVENTS', '') + '=' + actual.versions[n].count).join(' · ');
  console.log('✓ 九个历史版本的事件表逐值全等（' + counts + '）');
  process.exit(0);
}

const payload = { generatedAt: new Date().toISOString(), tool: 'verify-events-fidelity', versions: actual.versions, roadChains: actual.roadChains };
mkdirSync(dirname(FIXTURE), { recursive: true });
writeFileSync(FIXTURE, JSON.stringify(payload, null, 2) + '\n');
console.log('✓ 已写入基线 ' + FIXTURE);
console.log('  ' + VERSION_EXPORTS.map(n => n.replace('_CULTIVATION_EVENTS', '') + '=' + actual.versions[n].count).join(' · '));
console.log('  ROAD_CHAINS=' + actual.roadChains.count);
process.exit(0);
