#!/usr/bin/env node
/**
 * 事件表保真门禁 —— 当前版本的事件表必须逐值全等，且**旧执行器不许回来**。
 *
 * 守什么（两件事）：
 *   ① **表不许变**：当前唯一在跑的事件表（`CULTIVATION_EVENTS`，347 张卡）必须与基线逐值全等。
 *      为什么不能只靠人生基线：人生基线守的是「跑出来的一生」，覆盖不到
 *      「表里到底有没有多一个事件、少一条选项」。本门禁守的是**表的结构本身**。
 *   ② **旧档不许回来**：清旧档（2026-11-08）删掉的 24 个历史执行器 / 内容副本，
 *      谁把它们放回来，门禁必须报红。
 *      为什么这道断言重要：旧执行器回来不会让**任何现门禁**变红 ——
 *      它们只是各自多跑一条分支 ⇒ 仓库会悄悄长胖（实测：多 519 KB 进小程序包），
 *      而「旧档还在支持」这件事会重新变成真的。
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

/**
 * 当前唯一在跑的事件表。
 *
 * ⚠ 2026-11-08 清旧档后只剩一张 —— 旧的九份快照（`RULES5..RULES11_CULTIVATION_EVENTS`、
 *   `LEGACY_CULTIVATION_EVENTS`）连同它们的历史执行器一起删掉了。
 */
export const VERSION_EXPORTS = ['CULTIVATION_EVENTS'];

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

/* ══════════════════════════════════════════════ 旧副本与旧执行器不许回来 */

/**
 * 2026-11-08「清旧档」删掉的全部文件（24 个）。
 *
 *   · 旧事件表副本 —— 归一（S1）时留下的九条快照。
 *   · 旧规则执行器 —— 规则 5–11 各自那一份引擎。
 *   · 旧内容副本 —— 规则 6–11 各自的日常旁白 / 长线 / 修订九 / 事件表。
 *
 * ⚠ 它们**一个都不许回来**：回来不会让任何现门禁变红（旧分支只是多跑一条路），
 *   但小程序包会白白多长几百 KB，而且「旧档还在支持」会重新变成真的。
 */
export const OLD_COPIES = [
  'content/cultivation-stories-v5.js',
  'content/cultivation-stories-v6.js',
  'content/cultivation-stories-v7.js',
  'content/cultivation-stories-v8.js',
  'content/cultivation-stories-v9.js',
  'content/cultivation-stories-v10.js',
  'content/cultivation-stories-v11.js',
  'packages/adventure/cultivation-v5.js',
  'packages/adventure/cultivation-v6.js',
  'packages/adventure/cultivation-v7.js',
  'packages/adventure/cultivation-v8.js',
  'packages/adventure/cultivation-v9.js',
  'packages/adventure/cultivation-v10.js',
  'packages/adventure/cultivation-v11.js',
  'packages/adventure/revision9-v9.js',
  'packages/adventure/story-network-v9.js',
  'content/cultivation-revision-v6.js',
  'content/cultivation-revision-v7.js',
  'content/cultivation-revision-v8.js',
  'content/cultivation-revision-v9.js',
  'content/cultivation-revision-v10.js',
  'content/cultivation-revision-v11.js',
  'content/cultivation-daily-v6.js',
  'content/cultivation-daily-v7.js',
  'content/mundane-stories-v11.js',
  'content/progression-stories-v11.js',
  'content/revision9-stories-v11.js',
  'content/story-network-v9.js',
  'content/story-network-v10.js',
  'content/story-network-v11.js',
  'content/story-rules10-v11.js',
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
  /*
   * ⚠ 扫描要**递归** —— 旧执行器在 `packages/adventure/` 里面，
   *   只扫一层目录的话 `packages/adventure/cultivation-v5.js` 这类 import 根本看不见。
   */
  const scanDirs = ['content', 'packages', 'scripts', 'tests', 'apps', 'miniprogram'];
  const specifier = /(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g;
  for (const dir of scanDirs) {
    const full = join(ROOT, dir);
    if (!existsSync(full)) continue;
    for (const file of walk(full)) {
      if (!file.endsWith('.js') && !file.endsWith('.mjs')) continue;
      if (file.includes('/runtime/engine.js')) continue;   /* 生成物，不手改 */
      const text = readFileSync(file, 'utf8');
      for (const copy of OLD_COPIES) {
        const base = copy.split('/').pop();
        specifier.lastIndex = 0;
        let hit = null;
        let m;
        while ((m = specifier.exec(text)) !== null) {
          if (m[1].endsWith(base)) { hit = m[1]; break; }
        }
        if (hit) problems.push(`${file.slice(ROOT.length + 1)} 还在 import 旧副本 ${hit}`);
      }
    }
  }
  return problems;
}

/** 递归列出一个目录下的所有文件。 */
function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir, {withFileTypes: true})) {
    const full = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === 'node_modules' || name.name.startsWith('.')) continue;
      out.push(...walk(full));
    } else if (name.isFile()) {
      out.push(full);
    }
  }
  return out;
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
  console.log('✓ 当前版本的事件表逐值全等（' + counts + '）');
  console.log('✓ 旧副本与旧执行器没有回来（' + OLD_COPIES.length + ' 个文件盯着）');
  process.exit(0);
}

const payload = { generatedAt: new Date().toISOString(), tool: 'verify-events-fidelity', versions: actual.versions, roadChains: actual.roadChains };
mkdirSync(dirname(FIXTURE), { recursive: true });
writeFileSync(FIXTURE, JSON.stringify(payload, null, 2) + '\n');
console.log('✓ 已写入基线 ' + FIXTURE);
console.log('  ' + VERSION_EXPORTS.map(n => n.replace('_CULTIVATION_EVENTS', '') + '=' + actual.versions[n].count).join(' · '));
console.log('  旧执行器守卫：' + OLD_COPIES.length + ' 个文件');
console.log('  ROAD_CHAINS=' + actual.roadChains.count);
process.exit(0);
