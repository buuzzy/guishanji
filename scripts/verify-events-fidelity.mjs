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
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, digest, tableDigest, idDiff } from './serialize-content.mjs';

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
export function collect(tables) {
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

/* ══════════════════════════════════════════════ 旧副本不许回来 */

const OLD_COPIES = [
  'content/cultivation-stories-v5.js',
  'content/cultivation-stories-v6.js',
  'content/cultivation-stories-v7.js',
  'content/cultivation-stories-v8.js',
  'content/cultivation-stories-v9.js',
  'content/cultivation-stories-v10.js',
  'content/cultivation-stories-v11.js',
];

/**
 * 归一之后，表字面量只允许有一份。
 *
 * ⚠ 为什么这道断言很重要：
 *   副本回来的那一刻，「改一个事件条件要改 8 处」的老毛病就回来了 ——
 *   而这种回归**不会**让任何现门禁变红（九份副本里各改各的，行为照样一致），
 *   只会让内容重新僵住。所以必须显式拦。
 */
export function checkNoCopies() {
  const problems = [];
  for (const file of OLD_COPIES) {
    if (existsSync(join(ROOT, file))) problems.push('旧副本又回来了：' + file);
  }
  /*
   * 谁要是还 import 那些旧路径，门禁也得拦（否则下次构建直接断）。
   *
   * ⚠ 只认**真正的依赖**（import / export ... from / require / import()），
   *   不认「文字里提到了」——
   *   文件头的说明文字里写着「归一前有 cultivation-stories-v5.js …」是有用的事实，
   *   把说明文字判红，后人就得把这段历史删掉才能过门禁 ⇒ 那是倒退。
   */
  const scanDirs = ['content', 'packages', 'scripts', 'tests', 'apps'];
  const specifier = /(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g;
  for (const dir of scanDirs) {
    const full = join(ROOT, dir);
    if (!existsSync(full)) continue;
    for (const name of readdirSync(full, {withFileTypes: true})) {
      if (!name.isFile() || !name.name.endsWith('.js')) continue;
      const file = join(full, name.name);
      const text = readFileSync(file, 'utf8');
      for (const copy of OLD_COPIES) {
        const base = copy.slice('content/'.length);
        specifier.lastIndex = 0;
        let hit = null;
        let m;
        while ((m = specifier.exec(text)) !== null) {
          if (m[1].endsWith(base)) { hit = m[1]; break; }
        }
        if (hit) problems.push(`${dir}/${name.name} 还在 import 旧副本 ${hit}`);
      }
    }
  }
  return problems;
}

/* ── CLI ───────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
if (argv.includes('--print')) {
  const copyProblems = checkNoCopies();
  if (copyProblems.length) {
    for (const p of copyProblems) console.log('  ✗ ' + p);
    process.exit(1);
  }
  const tables = await import('../content/cultivation-stories.js');
  console.log(JSON.stringify(canonical(collect(tables)), null, 2));
  process.exit(0);
}

/* 先查「旧副本有没有回来」，再 import 内容表 ——
   顺序反过来的话，副本回来时会在 import 阶段先崩掉，报不出「哪一份回来了」。 */
const copyProblems = checkNoCopies();
if (copyProblems.length) {
  console.log('════════ 事件表版本保真 ════════');
  for (const p of copyProblems) console.log('  ✗ ' + p);
  console.log('\n结果：' + copyProblems.length + ' 个问题');
  process.exit(1);
}

const tables = await import('../content/cultivation-stories.js');
const actual = collect(tables);

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
  console.log('✓ 旧副本没有回来（表字面量只有一份）');
  process.exit(0);
}

const payload = { generatedAt: new Date().toISOString(), tool: 'verify-events-fidelity', versions: actual.versions, roadChains: actual.roadChains };
mkdirSync(dirname(FIXTURE), { recursive: true });
writeFileSync(FIXTURE, JSON.stringify(payload, null, 2) + '\n');
console.log('✓ 已写入基线 ' + FIXTURE);
console.log('  ' + VERSION_EXPORTS.map(n => n.replace('_CULTIVATION_EVENTS', '') + '=' + actual.versions[n].count).join(' · '));
console.log('  ROAD_CHAINS=' + actual.roadChains.count);
process.exit(0);
