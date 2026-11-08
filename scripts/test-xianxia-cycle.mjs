/**
 * 依赖图门禁：小程序包里的模块**不许互相绕成环**。
 *
 * ## 守的是什么
 * ------------
 *   小程序端的产物不是原生 ESM，是一个手写的 CommonJS 小包：
 *   它的 `require` 在模块**正在加载时**会返回「半成品」⇒
 *   两个模块互相依赖 + 其中一个在**加载时**就读对方的顶层常量
 *   ⇒ 那个常量是 `undefined` ⇒ 运行时崩（小程序一打开就白屏）。
 *
 *   2026-11-08 实测踩到：
 *     content/adventure.js → content/items.js → content/mundane-stories.js
 *       → packages/adventure/mundane-life.js → packages/adventure/story-rules10.js
 *       → packages/adventure/gates.js → content/cadence-table.js → content/adventure.js
 *   网页端（原生 ESM）跑得通、小程序端崩、Node 侧门禁也看不见
 *   ⇒ 必须有一道**专门**看环的门禁。
 *
 * ## 真门禁 ⇒ 必须做反向验证
 * --------------------------
 *   ① 拿**真图的坏值**（人为造一个环）验证探测器真的会报；
 *   ② 拿**好图**（无环）验证探测器不会误报。
 *   两条都过 ⇒ 这道门禁不是「永远绿」的摆设。
 *
 * 用法：node scripts/test-xianxia-cycle.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildGraph, findCycles, formatCycle, parseRelativeSpecifiers} from './lib/import-graph.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'miniprogram', 'subpkg', 'xianxia', 'runtime', 'build-manifest.json');

let pass = 0, fail = 0;
const ok = (cond, label, detail) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${detail ? '\n      ' + detail : ''}`); }
};
const section = (t) => console.log(`\n▸ ${t}`);

/* ── ① 先证明探测器本身管用（反向验证） ─────────────────────────────── */

section('探测器本身（反向验证：坏图必须报、好图必须不报）');
{
  /* 坏图：a → b → a。 */
  const bad = new Map([['a.js', ['b.js']], ['b.js', ['a.js']]]);
  const badCycles = findCycles(bad);
  ok(badCycles.length > 0, '人为造的环被抓到了',
    badCycles.length ? '' : '探测器对坏图没反应 ⇒ 这道门禁是假的');
  ok(badCycles.some((c) => c[0] === c[c.length - 1]),
    '抓到的环首尾相接（能画成回路）');

  /* 好图：a → b → c，无环。 */
  const good = new Map([['a.js', ['b.js']], ['b.js', ['c.js']], ['c.js', []]]);
  ok(findCycles(good).length === 0, '没有环的图不会被误报');

  /* 自己依赖自己也算环。 */
  const self = new Map([['a.js', ['a.js']]]);
  ok(findCycles(self).length > 0, '自己依赖自己也算环');
}

/* ── ② 解析口径：门面转发（export ... from）也算边 ──────────────────── */

section('解析口径');
{
  /* ⚠ 这段源码是**拼出来的** —— 门面的转发写法若直接写在这里，
     `scripts/check.mjs` 的导入检查器会把它当成真的导入（路径不存在）⇒ 误报红。 */
  const facade = ['export {REALMS} from', " './realms.js';", 'export {X} from', " './ends.js';"].join('\n');
  const specs = parseRelativeSpecifiers(facade);
  ok(specs.includes('./realms.js') && specs.includes('./ends.js'),
    '门面的 export ... from 转发也算依赖（2026-11-08 漏掉过这条）',
    `解析到：${JSON.stringify(specs)}`);
  const bare = "import fs from 'node:fs';\nimport x from 'some-pkg';\n";
  ok(parseRelativeSpecifiers(bare).length === 0, '裸模块名不算依赖边');
}

/* ── ③ 真图：小程序包里那 87 个模块不许有环 ─────────────────────────── */

section('小程序包里的模块不许绕成环');
{
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  const ids = manifest.inputs.map((x) => x.id);
  ok(ids.length > 0, `来源清单里有 ${ids.length} 个模块`);

  const sources = new Map();
  const missing = [];
  for (const id of ids) {
    const file = path.join(ROOT, id);
    if (!fs.existsSync(file)) { missing.push(id); continue; }
    sources.set(id, fs.readFileSync(file, 'utf8'));
  }
  ok(missing.length === 0, missing.length ? `清单里的模块在仓库里找不到：${missing.join('、')}` : '清单里的模块都找得到');

  const resolvePath = (fromId, spec) => {
    const base = path.posix.join(path.posix.dirname(fromId), spec);
    const norm = path.posix.normalize(base);
    return sources.has(norm) ? norm : null;
  };
  const graph = buildGraph(sources, resolvePath);
  const cycles = findCycles(graph);
  ok(cycles.length === 0,
    cycles.length ? `发现 ${cycles.length} 条环` : `${sources.size} 个模块，没有环`,
    cycles.map((c) => '      ' + formatCycle(c)).join('\n'));

  /* 环里最常见的一类：「加载时读对方顶层常量」。 */
  /* 这一条不需要额外断言 —— 探测器报出来的每条环都要人来判。 */
}

/* ── ④ 产物本身必须真能加载起来（症状那一层） ───────────────────────── */

section('产物必须真能加载起来');
{
  const RUNTIME = path.join(ROOT, 'miniprogram', 'subpkg', 'xianxia', 'runtime', 'engine.js');
  let bundle = null;
  let err = null;
  try {
    const vm = await import('node:vm');
    const code = fs.readFileSync(RUNTIME, 'utf8');
    const mod = {exports: {}};
    const fn = vm.runInThisContext(
      `(function (module, exports, console, globalThis) {\n${code}\n})`,
      {filename: RUNTIME}
    );
    fn(mod, mod.exports, console, globalThis);
    bundle = mod.exports;
  } catch (e) {
    err = e;
  }
  ok(!err, '小程序产物加载时不炸',
    err ? `${err.message}\n      （多半是依赖绕成了环：某个模块在加载时读到了还没赋值的顶层常量）` : '');
  ok(bundle && Object.keys(bundle).length > 40, '产物导出了足够多的接口',
    bundle ? `只导出 ${Object.keys(bundle).length} 个` : '');
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
