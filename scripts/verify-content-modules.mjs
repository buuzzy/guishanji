#!/usr/bin/env node
/**
 * verify-content-modules.mjs —— 内容模块拆分核对（S9）
 * ============================================================================
 *
 * 守的是什么
 * ----------
 * `content/adventure.js` 原来是一个 450 行的「大杂烩」：版本常量、幕、地区、
 * 境界、技艺、道具、人物、冒险节点、结局、期间选择全挤在一个文件里。
 * S9 把它按域拆成五个文件（境界与技艺 / 道具 / 地区与人物 / 结局与版本 / 节点），
 * 老文件留作**门面**（只转发，不写内容）。
 *
 * 拆分是**纯重构** ⇒ 一个字都不该变。这道门禁就是证明这句话的：
 *
 *   1. **门面只转发** —— `content/adventure.js` 里不许有自己写的内容，
 *      只能是 `export {…} from '…'`（用 AST 核对，不是用正则猜）。
 *   2. **各管各的** —— 五个文件各自导出的名字必须正好是它该管的那些，
 *      而且**没有两个文件导出同一个名字**（导出重了会悄悄盖掉其中一个）。
 *   3. **逐值全等** —— 门面转出来的每个值，与拆分前的基线
 *      `tests/fixtures/content-modules.json` **逐值全等**
 *      （函数按**源码文本**比，改一个字就报红）。
 *
 * ⚠ 为什么函数要按源码文本比：
 *   节点表里有大量 `s => …` 这种「按当时情形现写」的函数。
 *   用 `===` 比函数对象，拆分后必然不相等（对象换了）⇒ 什么也证明不了；
 *   用「深比较」比又会把函数一律当成相等 ⇒ 改一个字也不报红。
 *   ⇒ 只能把函数**源码文本**记进基线。
 *
 * 用法
 * ----
 *   node scripts/verify-content-modules.mjs          # 核对（回归门禁用这个）
 *   node scripts/verify-content-modules.mjs --gen    # 重新生成基线（只在真要改内容时）
 *
 * 退出码：0 = 全部通过；1 = 有硬伤。
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const acorn = require('acorn');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = path.join(ROOT, 'tests/fixtures/content-modules.json');
const FACADE = 'content/adventure.js';

/**
 * 每个内容模块各自该管哪些导出。
 * ⚠ 这张表是**门禁的判据**：改归属就是改架构，必须先改这张表并在提交里说清。
 */
const OWNERSHIP = {
  'content/realms.js': ['REALMS', 'SKILLS'],
  'content/regions.js': ['REGIONS', 'CAST'],
  'content/items.js': ['ITEMS'],
  'content/ends.js': [
    'PREVIOUS_VERSION', 'PREVIOUS_CONTENT_REVISION',
    'PREVIEW3_VERSION', 'PREVIEW3_CONTENT_REVISION',
    'ADVENTURE_VERSION', 'CONTENT_REVISION',
    'LEGACY_VERSION', 'LEGACY_CONTENT_REVISION',
    'ACTS', 'ENDINGS',
  ],
  'content/nodes.js': ['NODES'],
};

let failures = 0;
function ok(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.error(`  ✗ ${msg}`); }
}

/* ── 序列化：函数按源码文本记，其余按结构记 ────────────────────────────── */

function serialize(value, seen = new Set()) {
  if (typeof value === 'function') return {'@fn': value.toString()};
  if (value === null) return null;
  if (typeof value === 'undefined') return {'@undef': true};
  if (typeof value === 'number' && !Number.isFinite(value)) return {'@num': String(value)};
  if (typeof value !== 'object') return value;
  if (seen.has(value)) return {'@circ': true};
  seen.add(value);
  let out;
  if (Array.isArray(value)) {
    out = value.map(item => serialize(item, seen));
  } else {
    out = {};
    for (const key of Object.keys(value)) out[key] = serialize(value[key], seen);
  }
  seen.delete(value);
  return out;
}

/* ── 找出两棵结构里不一样的路径 ───────────────────────────────────────── */

function diffPaths(expected, actual, prefix = '', out = []) {
  if (out.length >= 200) return out;
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  if (Array.isArray(expected) !== Array.isArray(actual)) {
    out.push(prefix || '（根）');
    return out;
  }
  if (Array.isArray(expected)) {
    if (expected.length !== actual.length) out.push(`${prefix}（长度 ${expected.length} → ${actual.length}）`);
    const n = Math.min(expected.length, actual.length);
    for (let i = 0; i < n; i++) diffPaths(expected[i], actual[i], `${prefix}[${i}]`, out);
    return out;
  }
  if (isObj(expected) && isObj(actual)) {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])];
    for (const key of keys) {
      if (!(key in expected)) { out.push(`${prefix}.${key}（多出来的）`); continue; }
      if (!(key in actual)) { out.push(`${prefix}.${key}（少掉的）`); continue; }
      diffPaths(expected[key], actual[key], `${prefix}.${key}`, out);
    }
    return out;
  }
  if (expected !== actual) out.push(prefix || '（根）');
  return out;
}

/* ── 读一个模块的导出（AST 口径，不是正则猜）─────────────────────────── */

/**
 * 取一个模块导出的名字，以及每个名字**来自哪个模块**（门面用）。
 * @returns {{names:string[], sources:Map<string,string>, statements:object[]}}
 */
function readExports(relPath) {
  const file = path.join(ROOT, relPath);
  const src = fs.readFileSync(file, 'utf8');
  const ast = acorn.parse(src, {ecmaVersion: 2022, sourceType: 'module'});
  const names = [];
  const sources = new Map();
  for (const stmt of ast.body) {
    if (stmt.type !== 'ExportNamedDeclaration') continue;
    if (stmt.declaration) {
      const decl = stmt.declaration;
      if (decl.type === 'VariableDeclaration') {
        for (const d of decl.declarations) {
          if (d.id.type !== 'Identifier') throw new Error(`${relPath}：暂不支持解构形式的导出。`);
          names.push(d.id.name);
        }
      } else if (decl.id) {
        names.push(decl.id.name);
      }
    } else if (stmt.source) {
      for (const s of stmt.specifiers) {
        const exported = s.exported.name || s.exported.value;
        names.push(exported);
        sources.set(exported, stmt.source.value);
      }
    } else {
      for (const s of stmt.specifiers) names.push(s.exported.name || s.exported.value);
    }
  }
  return {names, sources, statements: ast.body};
}

/* ── 取门面实际转出来的值 ─────────────────────────────────────────────── */

const facadeModule = await import(path.join(ROOT, FACADE));

/** 门面导出的名字 → 值。 */
function facadeValues() {
  const out = {};
  for (const name of Object.keys(facadeModule)) out[name] = facadeModule[name];
  return out;
}

/** 五个内容模块各自导出的名字 → 值（文件还不存在时先跳过，--gen 用得上）。 */
async function moduleValues() {
  const out = {};
  for (const rel of Object.keys(OWNERSHIP)) {
    if (!fs.existsSync(path.join(ROOT, rel))) continue;
    const mod = await import(path.join(ROOT, rel));
    out[rel] = {};
    for (const name of Object.keys(mod)) out[rel][name] = mod[name];
  }
  return out;
}

console.log('内容模块拆分核对（各管各的 · 门面只转发 · 逐值全等）\n');

const values = facadeValues();
const modValues = await moduleValues();

/* ── 生成基线（只在真要改内容时跑；拆分之前先跑一次存下原样）────────── */

if (process.argv.includes('--gen')) {
  const snapshot = {};
  for (const name of Object.keys(values).sort()) snapshot[name] = serialize(values[name]);
  fs.mkdirSync(path.dirname(BASELINE), {recursive: true});
  fs.writeFileSync(BASELINE, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`  ✓ 基线已生成：${path.relative(ROOT, BASELINE)}（${Object.keys(snapshot).length} 个导出）`);
  process.exit(0);
}

/* ── 1. 门面只转发，不自己写内容 ─────────────────────────────────────── */

{
  const {statements, names, sources} = readExports(FACADE);
  const notReExport = statements.filter(s =>
    s.type !== 'ExportNamedDeclaration' || !s.source
  );
  ok(notReExport.length === 0,
    `门面 ${FACADE} 里全是转发语句（自己写的内容 ${notReExport.length} 处）`);
  for (const s of notReExport.slice(0, 5)) {
    console.error(`      第 ${s.loc.start.line} 行不是转发：${s.type}`);
  }
  ok(names.length === new Set(names).size,
    `门面没有重复导出（${names.length} 个）`);

  const expected = Object.values(OWNERSHIP).flat();
  const missing = expected.filter(n => !names.includes(n));
  const extra = names.filter(n => !expected.includes(n));
  ok(missing.length === 0 && extra.length === 0,
    `门面导出的名字不多不少（${names.length} 个；少 ${missing.length} 个、多 ${extra.length} 个）`);
  for (const n of missing) console.error(`      少了：${n}`);
  for (const n of extra) console.error(`      多了：${n}`);

  /* 每个名字必须从**它该管的那个文件**转发过来（接错线也得报红）。 */
  const misrouted = [];
  for (const [rel, list] of Object.entries(OWNERSHIP)) {
    const want = './' + path.basename(rel);
    for (const name of list) {
      const from = sources.get(name);
      if (from !== want) misrouted.push(`${name}：从「${from || '（没转发，是自己写的）'}」来，应来自「${want}」`);
    }
  }
  ok(misrouted.length === 0, `门面里的每个名字都从它该管的文件转发（接错线 ${misrouted.length} 处）`);
  for (const line of misrouted) console.error(`      ${line}`);
}

/* ── 2. 各管各的：五个文件各自的导出名单，且没有重名 ─────────────────── */

{
  const owner = new Map();
  const dup = [];
  const mismatch = [];
  for (const [rel, list] of Object.entries(OWNERSHIP)) {
    let got;
    try {
      got = readExports(rel);
    } catch (error) {
      failures++;
      console.error(`  ✗ 读不了 ${rel}：${error.message}`);
      continue;
    }
    const missing = list.filter(n => !got.names.includes(n));
    const extra = got.names.filter(n => !list.includes(n));
    if (missing.length || extra.length) {
      mismatch.push(`${rel}：少 ${missing.join('、') || '无'}；多 ${extra.join('、') || '无'}`);
    }
    for (const name of got.names) {
      if (owner.has(name)) dup.push(`${name}（${owner.get(name)} 与 ${rel}）`);
      else owner.set(name, rel);
    }
  }
  ok(mismatch.length === 0, `五个内容模块各自导出的名字都对得上（对不上 ${mismatch.length} 个文件）`);
  for (const line of mismatch) console.error(`      ${line}`);
  ok(dup.length === 0, `没有两个文件导出同一个名字（重名 ${dup.length} 处）`);
  for (const line of dup) console.error(`      ${line}`);
}

/* ── 3. 逐值全等（与拆分前的基线）──────────────────────────────────────── */

if (!fs.existsSync(BASELINE)) {
  failures++;
  console.error(`  ✗ 缺少内容模块基线：${path.relative(ROOT, BASELINE)}`);
  console.error('    ⇒ 生成一次：node scripts/verify-content-modules.mjs --gen');
} else {
  const expected = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const actual = {};
  for (const name of Object.keys(values).sort()) actual[name] = serialize(values[name]);

  const missing = Object.keys(expected).filter(n => !(n in actual));
  const extra = Object.keys(actual).filter(n => !(n in expected));
  ok(missing.length === 0 && extra.length === 0,
    `门面导出的名字与基线一致（基线 ${Object.keys(expected).length} 个；少 ${missing.length} 个、多 ${extra.length} 个）`);
  for (const n of missing) console.error(`      少了：${n}`);
  for (const n of extra) console.error(`      多了：${n}`);

  const diffs = [];
  for (const name of Object.keys(expected)) {
    if (!(name in actual)) continue;
    diffPaths(expected[name], actual[name], name, diffs);
  }
  ok(diffs.length === 0, `门面转出来的值与拆分前逐值全等（差异 ${diffs.length} 处）`);
  for (const line of diffs.slice(0, 20)) console.error(`      ${line}`);
  if (diffs.length > 20) console.error(`      …还有 ${diffs.length - 20} 处`);

  /* 每个模块自己的值也要与基线对应的那一份全等（门面转错线也得报红）。 */
  const modDiffs = [];
  for (const [rel, list] of Object.entries(OWNERSHIP)) {
    for (const name of list) {
      if (!(name in expected)) continue;
      const own = modValues[rel] ? modValues[rel][name] : undefined;
      if (own === undefined) { modDiffs.push(`${rel} → ${name}：这个文件里没有这个导出`); continue; }
      const d = diffPaths(expected[name], serialize(own), `${rel}:${name}`, []);
      if (d.length) modDiffs.push(...d.slice(0, 3));
    }
  }
  ok(modDiffs.length === 0, `五个模块各自的值与基线逐值全等（差异 ${modDiffs.length} 处）`);
  for (const line of modDiffs.slice(0, 20)) console.error(`      ${line}`);
}

if (failures) {
  console.error(`\n${failures} 处硬伤。`);
  process.exit(1);
}
console.log('\n结果：0 个问题');
