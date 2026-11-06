#!/usr/bin/env node
/**
 * test-xianxia-build.mjs — 修仙运行时的「生成物」门禁
 * =========================================================================
 *
 * 小程序里的修仙规则是**生成物**（scripts/build-xianxia-mp.mjs 产出）。
 * 生成物最容易出的问题是「悄悄过期」——
 * 源仓库改了、构建脚本改了、依赖变了，产物却还是老的，
 * 于是「小程序里的规则 = 源仓库里那份」这句话悄悄变成假的。
 *
 * 这一道门禁盯住：
 *   ① **可复现**：同样的输入，连续构建两次 ⇒ 逐字节相同；
 *   ② **一致**：仓库里已提交的产物 = 现在重新构建的结果（--check 通过）；
 *   ③ **来源可查**：manifest 里每个输入文件的 SHA-256 = 源仓库里那个文件的 SHA-256；
 *   ④ **语法合格**：产物能被 ES2019 解析，且没有 ?. / ??（微信上传校验拒收）；
 *   ⑤ **没有浏览器依赖**：产物里不许出现 window / document / localStorage /
 *      navigator / performance（小程序端没有这些）；
 *   ⑥ **没有混进旧产品**：闭包里不许出现旧 0.2.0 Web 的内容表；
 *   ⑦ **导出面完整**：页面要用到的常量与函数都真的导出了。
 *
 * ## 「唯一来源」现在指哪里
 * --------------------------
 * ⭐ **本仓库自己的源码**（`packages/adventure/`、`content/`、`packages/core/random.js`、
 *   `apps/preview/pixel-style.js`）就是唯一来源 ⇒ 本门禁**只读本仓库**，
 *   不依赖任何相邻目录（`../xianxia-life`、`../1in8b` 都不存在也能跑）。
 *
 * `vendor/xianxia-r12/` 降级为**历史证据**（当年从上游搬过来时锁下的字节）。
 * 本门禁仍然核对它：
 *   ① 它自己有没有被人手改过（对照它那份 baseline.lock.json）；
 *   ② 它与本仓库现在的源码**是不是同一批字节**（这就是「两个来源」那句话的依据）。
 *
 * ## 迁移等价性
 * ------------
 * `reference/migrated-runtime/engine.js` 是**从 1in8b 迁进来时**的那份产物。
 * ⇒ 新构建的产物与它**除文件头注释外逐字节一致** ⇒ 「迁移没改规则」这件事可证。
 *
 * 用法：node scripts/test-xianxia-build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {scanForOfVarScope} from './lib/es2015-downlevel.mjs';

/** 本仓库根目录（门禁**只读本仓库**，不依赖任何相邻目录）。 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const require = createRequire(import.meta.url);
const acorn = require('acorn');

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
};
const section = (t) => console.log(`\n▸ ${t}`);

/** 唯一来源 = 本仓库根目录。 */
const SOURCE = ROOT;
/** vendor 里的历史证据快照（不再是构建输入，但要核对它没被改过）。 */
const VENDOR = path.join(ROOT, 'vendor', 'xianxia-r12');
const RUNTIME_DIR = path.join(ROOT, 'miniprogram', 'subpkg', 'xianxia', 'runtime');
const RUNTIME = path.join(RUNTIME_DIR, 'engine.js');
const MANIFEST = path.join(RUNTIME_DIR, 'build-manifest.json');
const STYLE_FILE = path.join(RUNTIME_DIR, 'pixel-style.js');
const LOCK = path.join(VENDOR, 'baseline.lock.json');
/** 从 1in8b 迁进来时的那份产物（迁移等价性的基线）。 */
const MIGRATED = path.join(ROOT, 'reference', 'migrated-runtime', 'engine.js');
const MIGRATED_STYLE = path.join(ROOT, 'reference', 'migrated-runtime', 'pixel-style.js');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/**
 * 在 CommonJS 形状的沙箱里装载产物（产物是自包含的 IIFE，只用 module.exports）。
 * ⚠ 不能用 require()：本仓库 package.json 是 "type": "module"，.js 会被当 ESM。
 */
function loadRuntime(file) {
  const code = fs.readFileSync(file, 'utf8');
  const mod = {exports: {}};
  const fn = vm.runInThisContext(
    `(function (module, exports, console, globalThis) {\n${code}\n})`,
    {filename: file}
  );
  fn(mod, mod.exports, console, globalThis);
  return mod.exports;
}

/* ══════════════════════════════════════════════ ① 可复现 + ② 一致 */

section('可复现与一致性');
{
  ok(fs.existsSync(RUNTIME), '产物存在');
  ok(fs.existsSync(MANIFEST), '来源清单存在');

  /* 连跑两次 --check：每次都重新构建并逐字节比对。 */
  const run = () => execFileSync('node', [
    path.join(ROOT, 'scripts', 'build-xianxia-mp.mjs'), '--check',
  ], {cwd: ROOT, encoding: 'utf8'});
  let first = null;
  let checkOk = true;
  try {
    first = run();
  } catch (error) {
    checkOk = false;
    console.log('    ' + String(error.stdout || error.message).split('\n').slice(0, 4).join('\n    '));
  }
  ok(checkOk, '--check 通过（仓库里的产物 = 现在重新构建的结果）');

  let second = null;
  try {
    second = run();
  } catch (error) {
    second = null;
  }
  ok(!!first && !!second && first === second, '连续两次 --check 的结果完全一致（可复现）');
}

/* ══════════════════════════════════════════════ ①b 快照本身没被手改 */

section('历史证据快照与 baseline.lock.json 对得上');
{
  ok(fs.existsSync(LOCK), '锁定清单存在（baseline.lock.json）');
  if (fs.existsSync(LOCK)) {
    const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
    ok(lock.source && lock.source.repo === 'buuzzy/xianxia-life', '清单记了上游仓库名');
    ok(!!(lock.source.commit && lock.source.tree), '清单记了上游 commit 与 tree');

    let allMatch = true;
    for (const file of lock.files) {
      const target = path.join(VENDOR, file.id);
      if (!fs.existsSync(target)) { allMatch = false; console.log(`    ✗ 快照缺文件：${file.id}`); continue; }
      const bytes = fs.readFileSync(target);
      if (sha256(bytes) !== file.sha256 || bytes.length !== file.bytes) {
        allMatch = false;
        console.log(`    ✗ 快照文件被改过：${file.id}`);
      }
    }
    ok(allMatch, `快照的 ${lock.files.length} 个文件与锁定清单逐字节一致`);

    /* 快照里不许多出清单没记的文件（有人偷偷塞文件进来也会被抓到）。 */
    const listed = new Set(lock.files.map((f) => f.id));
    const extra = [];
    const walkDir = (dir, prefix) => {
      for (const name of fs.readdirSync(dir)) {
        const full = path.join(dir, name);
        const id = prefix ? `${prefix}/${name}` : name;
        if (fs.statSync(full).isDirectory()) walkDir(full, id);
        /* README.md 是给人看的说明（讲清这个目录已是历史证据），
         *   不属于「锁定内容」⇒ 不算多出来的文件。 */
        else if (id !== 'baseline.lock.json' && id !== 'README.md' && !listed.has(id)) extra.push(id);
      }
    };
    if (fs.existsSync(VENDOR)) walkDir(VENDOR, '');
    ok(extra.length === 0, extra.length ? `快照里多了未登记的文件：${extra.join('、')}` : '快照里没有多出来的文件');
  }
}

/* ══════════════════════════════════════════════ ②b 两个来源是不是同一批字节 */

section('本仓库源码与 vendor 历史快照逐字节一致');
{
  const lock = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : {files: []};
  let same = 0;
  const differ = [];
  const missing = [];
  for (const file of lock.files) {
    const inRepo = path.join(ROOT, file.id);
    const inVendor = path.join(VENDOR, file.id);
    if (!fs.existsSync(inRepo)) { missing.push(file.id); continue; }
    if (!fs.existsSync(inVendor)) { missing.push(file.id); continue; }
    if (fs.readFileSync(inRepo).equals(fs.readFileSync(inVendor))) same++;
    else differ.push(file.id);
  }
  ok(differ.length === 0 && missing.length === 0,
    `快照的 ${lock.files.length} 个文件与本仓库源码逐字节一致（相同 ${same}）`
    + (differ.length ? `；不同：${differ.join('、')}` : '')
    + (missing.length ? `；缺：${missing.join('、')}` : ''));
}

/* ══════════════════════════════════════════════ ②c 迁移等价性 */

section('迁移等价性（与从 1in8b 迁进来时的那份逐字节比）');
{
  /** 去掉文件头的那段块注释（说明文字，允许不同）。 */
  const withoutHeader = (buf) => {
    if (buf[0] !== 0x2f || buf[1] !== 0x2a) return buf;
    const end = buf.indexOf('*/', 2);
    if (end < 0) return buf;
    let i = end + 2;
    while (i < buf.length && buf[i] === 0x0a) i++;
    return buf.slice(i);
  };
  ok(fs.existsSync(MIGRATED), '迁移基线存在（reference/migrated-runtime/engine.js）');
  ok(fs.existsSync(MIGRATED_STYLE), '迁移基线存在（reference/migrated-runtime/pixel-style.js）');
  if (fs.existsSync(MIGRATED)) {
    const a = withoutHeader(fs.readFileSync(MIGRATED));
    const b = withoutHeader(fs.readFileSync(RUNTIME));
    const ha = sha256(a);
    const hb = sha256(b);
    ok(ha === hb, `规则产物除文件头注释外逐字节一致（${a.length} 字节，sha ${ha.slice(0, 16)}）`);
  }
  if (fs.existsSync(MIGRATED_STYLE)) {
    const a = withoutHeader(fs.readFileSync(MIGRATED_STYLE));
    const b = withoutHeader(fs.readFileSync(STYLE_FILE));
    const ha = sha256(a);
    const hb = sha256(b);
    ok(ha === hb, `画面调色板除文件头注释外逐字节一致（${a.length} 字节，sha ${ha.slice(0, 16)}）`);
  }
}

/* ══════════════════════════════════════════════ ③ 来源可查 */

section('来源清单与源仓库对得上');
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
{
  ok(manifest.source && manifest.source.repo === 'buuzzy/guishanji', '清单记了本仓库名');
  ok(!!(manifest.source.commit && manifest.source.tree), '清单记了本仓库的 commit 与 tree');
  ok(!!manifest.upstreamOrigin && manifest.upstreamOrigin.repo === 'buuzzy/xianxia-life',
    '清单同时记了上游来源（两个来源，不合并）');
  ok(manifest.rulesVersion === 12, `规则版本是 12（实际 ${manifest.rulesVersion}）`);

  let allMatch = true;
  for (const input of manifest.inputs) {
    const file = path.join(SOURCE, input.id);
    if (!fs.existsSync(file)) { allMatch = false; console.log(`    ✗ 源仓库没有 ${input.id}`); continue; }
    const bytes = fs.readFileSync(file);
    if (sha256(bytes) !== input.sha256 || bytes.length !== input.bytes) {
      allMatch = false;
      console.log(`    ✗ ${input.id} 的哈希对不上`);
    }
  }
  ok(allMatch, `${manifest.inputs.length} 个输入文件的 SHA-256 与源仓库一致`);

  const output = fs.readFileSync(RUNTIME);
  ok(sha256(output) === manifest.output.sha256, '产物的 SHA-256 与清单一致');
  ok(output.length === manifest.output.bytes, '产物的字节数与清单一致');
}

/* ══════════════════════════════════════════════ ④ 语法合格 */

section('产物语法（微信上传校验的硬要求）');
const code = fs.readFileSync(RUNTIME, 'utf8');
{
  let parsed = null;
  try {
    parsed = acorn.parse(code, {ecmaVersion: 2019, sourceType: 'script', allowReturnOutsideFunction: true});
    ok(true, '能被 ES2019 解析');
  } catch (error) {
    ok(false, `能被 ES2019 解析（${error.message}）`);
  }
  if (parsed) {
    let optionalChain = 0;
    let nullish = 0;
    const walk = (node) => {
      if (!node || typeof node !== 'object') return;
      if (Array.isArray(node)) { node.forEach(walk); return; }
      if (node.type === 'ChainExpression') optionalChain++;
      if (node.type === 'LogicalExpression' && node.operator === '??') nullish++;
      for (const key of Object.keys(node)) {
        if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
        walk(node[key]);
      }
    };
    walk(parsed);
    ok(optionalChain === 0, `没有 ?. 残留（${optionalChain} 处）`);
    ok(nullish === 0, `没有 ?? 残留（${nullish} 处）`);
  }
}

/* ══════════════════════════════════════════════ ④bis for-of 的 var 作用域 */
//
// 2026-11-05 用户真机报「点归山记 → 空白页只剩『命盘转动』」的根因：
// 降级把可选链展开成带临时变量的写法，而那些 `var` 声明落在 **for-of 循环体**里，
// 循环**头部**（迭代表达式）已经在用它。
//   · Node 里 `var` 是函数级提升 ⇒ 一切正常 ⇒ **所有 Node 门禁都看不见**；
//   · 微信开发者工具转译时把循环体抽成独立函数（因为体内有闭包引用循环变量），
//     `var` 跟着被关进那个函数，头部引用不到 ⇒ `ReferenceError` ⇒ 页面初始化中断。
//
// ⇒ 这道门禁**直接扫产物**，把这类形态挡在真机之前。
section('for-of 的 var 作用域（微信转译后才会炸的那类坑）');
{
  const scan = scanForOfVarScope(code);
  ok(scan.count === 0,
    scan.count === 0
      ? '没有「for-of 头部引用循环体内 var」的写法'
      : `有 ${scan.count} 处会在微信里炸：${scan.hits.map((h) => `第 ${h.line} 行 ${h.vars.join(',')}`).join('；')}`);
}

/* ══════════════════════════════════════════════ ⑤ 没有浏览器依赖 */

section('产物里没有浏览器依赖');
{
  const parsed = acorn.parse(code, {ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true});
  const forbidden = ['window', 'document', 'localStorage', 'sessionStorage', 'navigator', 'performance',
    'location', 'history', 'fetch', 'XMLHttpRequest', 'requestAnimationFrame', 'alert', 'confirm'];

  /* 先收集「文件里声明过的名字」——变量、函数、参数、类、catch 参数。
     ⚠ 这是**过近似**：某个名字在别处声明过，这里也算声明过。
     对这道门禁来说够用：宁可少报，也不能把 `location` 这种局部变量当成浏览器全局。 */
  const declared = new Set();
  /** 收集「绑定位置」上的名字（含解构：const {a, b: c} = x / function f({d}) {}）。 */
  const collectPattern = (pattern) => {
    if (!pattern) return;
    if (pattern.type === 'Identifier') { declared.add(pattern.name); return; }
    if (pattern.type === 'ObjectPattern') {
      for (const property of pattern.properties) {
        if (property.type === 'RestElement') collectPattern(property.argument);
        else collectPattern(property.value);
      }
      return;
    }
    if (pattern.type === 'ArrayPattern') {
      for (const element of pattern.elements) collectPattern(element);
      return;
    }
    if (pattern.type === 'AssignmentPattern') { collectPattern(pattern.left); return; }
    if (pattern.type === 'RestElement') { collectPattern(pattern.argument); return; }
  };
  const walkAll = (node, visit) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((n) => walkAll(n, visit)); return; }
    visit(node);
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
      walkAll(node[key], visit);
    }
  };
  walkAll(parsed, (node) => {
    if (node.type === 'VariableDeclarator') collectPattern(node.id);
    if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression')
      && node.id && node.id.name) declared.add(node.id.name);
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      for (const p of node.params) collectPattern(p);
    }
    if (node.type === 'CatchClause') collectPattern(node.param);
    if (node.type === 'ClassDeclaration' && node.id) declared.add(node.id.name);
  });

  const hits = {};
  const walk = (node, parent) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((n) => walk(n, parent)); return; }
    if (node.type === 'Identifier' && forbidden.includes(node.name) && !declared.has(node.name)) {
      const isMemberObject = parent && parent.type === 'MemberExpression' && parent.object === node;
      const isMemberProp = parent && parent.type === 'MemberExpression' && parent.property === node && !parent.computed;
      const isPropKey = parent && parent.type === 'Property' && parent.key === node && !parent.computed;
      const isShorthandValue = parent && parent.type === 'Property' && parent.shorthand && parent.value === node;
      const isLabel = parent && (parent.type === 'LabeledStatement' || parent.type === 'BreakStatement' || parent.type === 'ContinueStatement');
      if (!isMemberObject && !isMemberProp && !isPropKey && !isShorthandValue && !isLabel) {
        hits[node.name] = (hits[node.name] || 0) + 1;
      }
    }
    for (const key of Object.keys(node)) {
      if (key === 'type' || key === 'start' || key === 'end' || key === 'loc') continue;
      walk(node[key], node);
    }
  };
  walk(parsed, null);
  const names = Object.keys(hits);
  ok(names.length === 0, names.length ? `出现了浏览器全局：${names.join('、')}` : '一个浏览器全局都没有');
}

/* ══════════════════════════════════════════════ ⑥ 没有混进旧产品 */

section('闭包里没有旧 0.2.0 Web 的内容表');
{
  const legacy = ['content/world.js', 'content/stories.js', 'content/expansion.js',
    'packages/core/engine.js', 'packages/media/exports.js', 'packages/render/canvas.js'];
  const ids = manifest.inputs.map((i) => i.id);
  const bad = ids.filter((id) => legacy.includes(id));
  ok(bad.length === 0, bad.length ? `混进了：${bad.join('、')}` : '闭包干净');
  ok(ids.every((id) => id.startsWith('packages/adventure/') || id.startsWith('content/') || id === 'packages/core/random.js'),
    '闭包只含 packages/adventure/、content/、packages/core/random.js');
}

/* ══════════════════════════════════════════════ ⑦ 导出面完整 */

section('导出面完整');
{
  /**
   * 装载产物。
   * ⚠ 不能直接 `require()`：本仓库 package.json 是 `"type": "module"`，
   *   .js 会被当成 ESM ⇒ 产物里的 `module.exports` 直接炸。
   * ⇒ 用 vm 在 CommonJS 形状的沙箱里跑它。
   */
  const bundle = loadRuntime(RUNTIME);
  const needed = [
    'createRun', 'advance', 'advanceToChoice', 'options', 'currentNode', 'nodeText',
    'choose', 'acknowledge', 'setActivity', 'travelTo', 'leaveExpedition', 'seekTraining',
    'review', 'validateRun', 'age', 'date', 'duration', 'cloneRun', 'upgradeRun', 'aid',
    'REALMS', 'REGIONS', 'ITEMS', 'SKILLS', 'ACTS', 'CAST', 'NEW_CAST', 'PATHS', 'ROOTS',
    'ACTIVITIES', 'GEOGRAPHY', 'OFFICERS', 'FAMILIES', 'BIRTHPLACES', 'WORLD_ERAS',
    'LIFE_GOALS', 'TRAINING_GROUNDS', 'PEOPLE_BACKGROUNDS', 'REALM_ABILITIES', 'METHODS',
    'monthSeconds', 'activityContext', 'presentPeople', 'activityOptions', 'routeOptions',
    'currentContinent', 'longAction', 'sceneFor', 'materialSlots', 'income', 'practiceRate',
    'trainingOptions', 'regionInfo', 'activityLabel', 'birthFacts', 'economyQuote',
  ];
  const missing = needed.filter((name) => !(name in bundle));
  ok(missing.length === 0, missing.length ? `缺少导出：${missing.join('、')}` : `${needed.length} 个导出都在`);
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
