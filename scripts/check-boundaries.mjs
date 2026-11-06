#!/usr/bin/env node
/**
 * check-boundaries.mjs —— 结构边界门禁：谁归谁管、依赖朝哪个方向、越界有没有许可证
 * ============================================================================
 *
 * 守的是什么
 * ----------
 * 「归山记」的内容按**六域**分：依据「这件事由谁说了算」划分，
 * 依赖是单向直线 —— ⑥呈现 → ⑤表达 → ④节奏 → ③因果 → ②角色 → ①世界 → ⓪基础设施。
 *
 * 归属表在 `docs/owners.json`，章程在 `docs/结构章程.md`。本脚本核对四条：
 *
 *   ① **每个源文件都有归属** —— 新加文件忘了登记 ⇒ 报红。
 *      （归属表漏登记 = 没人负责改它 = 内容越滚越僵的开始。）
 *   ② **域方向不越界** —— 序号大的域可以依赖序号小的，反过来不行；
 *      基础设施（随机流）是所有域的共同底座；入口（engine / store）是枢纽，两个方向都放行。
 *   ③ **层方向不越界** —— `content/` 是数据层，`packages/adventure/` 是规则层；
 *      **数据层不许反向依赖规则层**（规则读数据天经地义，数据回头找规则就会互相踩脚）。
 *   ④ **越界必须有许可证** —— 已经存在的越界，登记在归属表的 `permits` 里并写清原因；
 *      **没登记的越界 ⇒ 报红**，**登记了但已经用不上的 ⇒ 也报红**（许可证不许发霉）。
 *
 * 为什么值得守
 * ------------
 * 归一事件表（S1）时实测到：**层间反向依赖 7 条**（`content/` 里的内容反过来
 * import `packages/adventure/` 里的规则）。这类反向依赖不会立刻出错，
 * 但它会让「改规则」和「改内容」互相踩脚 —— 时间一长就没人敢动任何东西。
 * ⇒ 现有 7 条登记成许可证（写清原因与去留），**新的不许再增加**。
 *
 * 用法
 * ----
 *   node scripts/check-boundaries.mjs          # 核对（回归门禁用这个）
 *   node scripts/check-boundaries.mjs --print  # 打印归属表与越界清单（排查用）
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNERS_FILE = path.join(ROOT, 'docs', 'owners.json');

/* ── 读归属表 ────────────────────────────────────────────────────────── */

if (!fs.existsSync(OWNERS_FILE)) {
  console.error('✗ 缺少归属表：docs/owners.json');
  process.exit(1);
}
const owners = JSON.parse(fs.readFileSync(OWNERS_FILE, 'utf8'));

/** 域 / 角色 → 序号（数字越大越靠上）。 */
const order = new Map(owners.domains.map(d => [d.id, d.order]));
for (const [id, role] of Object.entries(owners.roles || {})) {
  if (typeof role.order === 'number') order.set(id, role.order);
}
const HUB = 'entry';   /* 枢纽：两个方向都放行 */
const BASE = 'infra';  /* 底座：所有域都可以依赖它，它只能依赖自己 */

/* ── 收集源文件与依赖 ────────────────────────────────────────────────── */

/** 哪些目录算「源文件」。 */
const SOURCE_ROOTS = ['content', 'packages', 'apps', 'miniprogram'];
/** 这些目录不进边界核对（生成物 / 测试 / 第三方）。 */
const SKIP_DIR = /(^|\/)(node_modules|runtime|dist|\.git|artifacts)(\/|$)/;

function walk(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, {withFileTypes: true});
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (SKIP_DIR.test(full)) continue;
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|mjs)$/.test(entry.name) && !/\.test\.mjs$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = [];
for (const root of SOURCE_ROOTS) {
  const full = path.join(ROOT, root);
  if (fs.existsSync(full)) walk(full, files);
}
const relative = (file) => path.relative(ROOT, file).split(path.sep).join('/');
const fileSet = new Set(files.map(relative));

/** 取一个文件里的本地依赖（import / export ... from / require / import()）。 */
function localSpecifiers(source) {
  const spec = /(?:from|import|require)\s*\(?\s*['"]([^'"]+)['"]/g;
  const out = [];
  let m;
  while ((m = spec.exec(source)) !== null) {
    if (!m[1].startsWith('.')) continue;
    out.push(m[1]);
  }
  return out;
}

/** 文件 → 它依赖的本地文件。 */
const edges = [];
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const spec of localSpecifiers(source)) {
    const target = path.normalize(path.join(path.dirname(file), spec));
    if (!fileSet.has(relative(target))) continue;
    edges.push({from: relative(file), to: relative(target)});
  }
}

/* ── 归属判定 ────────────────────────────────────────────────────────── */

/** 呈现域的目录根（整个目录算呈现域）。 */
const presentRoots = owners.presentRoots || [];

/** 一个文件归哪个域 / 角色。 */
function ownerOf(file) {
  if (presentRoots.some(root => file.startsWith(root))) return 'present';
  return owners.files[file] || null;
}

/** 许可证能不能覆盖这条边。 */
function permitCovers(permit, edge) {
  if (permit.from && permit.from !== edge.from) return false;
  if (permit.to && permit.to !== edge.to) return false;
  return true;
}

/* ── 核对 ────────────────────────────────────────────────────────────── */

const unregistered = [];
const violations = [];
const permitted = [];

for (const file of fileSet) {
  if (!ownerOf(file)) unregistered.push(file);
}

/**
 * 一条边是否越界。
 * @returns {string|null} 越界理由；不越界则返回 null。
 */
function whyViolation(edge) {
  const from = ownerOf(edge.from);
  const to = ownerOf(edge.to);
  if (!from || !to) return null;

  /*
   * ⚠ 顺序要紧：**层规则要先判**。
   *   层方向说的是「数据层 vs 规则层」，跟两边属于哪个域无关 ——
   *   两边都在因果域里，那条反向依赖照样是反向依赖。
   */
  const fromLayer = edge.from.split('/')[0];
  const toLayer = edge.to.split('/')[0];
  const toPath = edge.to.split('/');
  if (fromLayer === 'content' && toLayer === 'packages' && toPath[1] === 'adventure') {
    return '层方向：数据层（content/）不许反向依赖规则层（packages/adventure/）';
  }

  /* 规则②：域方向。 */
  if (from === to) return null;
  if (from === HUB || to === HUB) return null;
  if (from === BASE) return to === BASE ? null : '域方向：基础设施只能依赖基础设施';
  const a = order.get(from);
  const b = order.get(to);
  if (a === undefined || b === undefined) return null;
  if (a >= b) return null;
  return `域方向：${from}（${a}）不许依赖 ${to}（${b}）`;
}

for (const edge of edges) {
  const why = whyViolation(edge);
  if (!why) continue;
  const permit = (owners.permits || []).find(p => permitCovers(p, edge));
  if (permit) {
    permitted.push({...edge, why, permit});
  } else {
    violations.push({...edge, why});
  }
}

/* 许可证不许发霉：登记了、但其实没有对应的越界边 ⇒ 报红。 */
const stalePermits = [];
for (const permit of owners.permits || []) {
  const used = permitted.some(p => p.permit === permit);
  if (!used) {
    stalePermits.push(`${permit.from || '*'} → ${permit.to || '*'}（${permit.reason || '没写原因'}）`);
  }
}

/* 许可证必须写原因。 */
const reasonless = [];
for (const permit of owners.permits || []) {
  if (!permit.reason || !String(permit.reason).trim()) {
    reasonless.push(`${permit.from || '*'} → ${permit.to || '*'}`);
  }
}

/* 同一对依赖不许登记两次（重复登记会让其中一条永远「发霉」，把门禁搞糊涂）。 */
const duplicated = [];
const permitKeys = new Map();
for (const permit of owners.permits || []) {
  const key = `${permit.from || '*'} → ${permit.to || '*'}`;
  if (permitKeys.has(key)) duplicated.push(key);
  else permitKeys.set(key, permit);
}

/* ── 输出 ────────────────────────────────────────────────────────────── */

if (process.argv.includes('--print')) {
  console.log(JSON.stringify({
    domains: owners.domains,
    registeredFiles: Object.keys(owners.files).length,
    edges: edges.length,
    unregistered,
    violations,
    permitted: permitted.map(p => `${p.from} → ${p.to}（${p.why}）`),
    stalePermits,
    reasonless,
    duplicated,
  }, null, 2));
  process.exit(0);
}

console.log('结构边界核对（谁归谁管 · 依赖方向 · 越界许可证）\n');
console.log(`归属表：docs/owners.json（${Object.keys(owners.files).length} 个文件登记 + ${(owners.presentRoots || []).join('、')} 整个目录算呈现域）`);
console.log(`依赖边：${edges.length} 条\n`);

if (unregistered.length) {
  console.log('  ✗ 有源文件没登记归属（新加文件忘了登记 ⇒ 没人负责改它）：');
  for (const file of unregistered) console.log(`      ${file}`);
}
if (violations.length) {
  console.log('  ✗ 越界依赖（方向反了，又没有许可证）：');
  for (const v of violations) console.log(`      ${v.from} → ${v.to}\n        ${v.why}`);
}
if (reasonless.length) {
  console.log('  ✗ 许可证没写理由：');
  for (const r of reasonless) console.log(`      ${r}`);
}
if (stalePermits.length) {
  console.log('  ✗ 许可证发霉了（登记了，但已经没有对应的越界）：');
  for (const s of stalePermits) console.log(`      ${s}`);
}
if (duplicated.length) {
  console.log('  ✗ 同一对依赖登记了两次许可证：');
  for (const d of duplicated) console.log(`      ${d}`);
}

const problemsCount = unregistered.length + violations.length + stalePermits.length + reasonless.length + duplicated.length;
if (problemsCount) {
  console.log(`\n结果：${problemsCount} 个问题`);
  process.exit(1);
}

console.log(`  ✓ ${fileSet.size} 个源文件都有归属，没有漏登记`);
console.log(`  ✓ ${edges.length} 条依赖边没有越界`);
console.log(`  ✓ ${permitted.length} 条既有越界都登记在案（许可证 ${(owners.permits || []).length} 条），没有发霉的`);
console.log('\n结果：0 个问题');
