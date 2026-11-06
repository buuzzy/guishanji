#!/usr/bin/env node
/**
 * test-xianxia-equivalence.mjs — 「同源」门禁：源仓库的规则与小程序产物必须逐值相同
 * =========================================================================
 *
 * 守的是什么
 * ----------
 * 修仙玩法只有**一份**规则实现（buuzzy/xianxia-life 的 packages/adventure + content）。
 * 小程序端跑的是**生成物**（scripts/build-xianxia-mp.mjs 产出）。
 * 这个门禁证明的就是那句话：**小程序里的规则 = 源仓库里那份**。
 *
 * 怎么证明
 * --------
 * 把两套规则**同时**装进同一个 Node 进程：
 *   · 源仓库那份：直接 import ESM 源码（packages/adventure/engine.js）
 *   · 小程序那份：require 生成的 CommonJS 产物
 * 然后给它们**同一个 seed、同一个 id**，用**同一串操作**去驱动，
 * 每一步都把两边的状态**逐值比较**（深比较，键序无关）。
 *
 * 比的是什么
 * ----------
 *   · createRun 的返回状态（出生、灵根、灵石、随机流…）
 *   · 每一个月的推进结果（推进月数、年月、境界、修为、日志条数、pending）
 *   · 每一个决策点的选项表（id / enabled / reasons / cost）
 *   · choose 之后的结果（result / decisions / ending）
 *   · 终局的回顾 review()
 *
 * ⚠ 为什么一定要**逐月**比，而不是「跑完一生比一次」
 *   一生跑完再比，途中任何一次分叉都可能被后面的随机流掩盖掉
 *   （后面的随机流是从同一状态继续的，一旦状态不同就会继续不同 ——
 *   但如果分叉发生在两个状态**等价**的地方，比到最后也看不出来）。
 *   逐月比才能把「第一次分叉」精确指出来。
 *
 * ## 源从哪来
 * ----------
 * ⭐ 读**本仓库自己的源码**：`packages/adventure/engine.js`（ESM）直接 import。
 * 不用上游那个目录当输入 —— CI 和 Windows 那台机器上不存在它，
 * 那样这道门禁在别人的机器上就是坏的。
 * 本仓库源码与 vendor 历史快照逐字节一致这件事，
 * 由 `scripts/test-xianxia-build.mjs` 核对。
 *
 * 用法：node scripts/test-xianxia-equivalence.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);

/** 本仓库根目录（门禁**只读本仓库**，不依赖任何相邻目录）。 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 装载小程序产物（CommonJS）。
 * ⚠ 不能直接 require()：本仓库 package.json 是 `"type": "module"`，
 *   .js 会被当成 ESM ⇒ 产物里的 `module.exports` 直接炸。
 */
function loadCjs(file) {
  const code = fs.readFileSync(file, 'utf8');
  const mod = {exports: {}};
  const fn = vm.runInThisContext(
    `(function (module, exports, console, globalThis) {\n${code}\n})`,
    {filename: file}
  );
  fn(mod, mod.exports, console, globalThis);
  return mod.exports;
}

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
};
const section = (t) => console.log(`\n▸ ${t}`);

/* ══════════════════════════════════════════════ 参数 */

/** 唯一来源 = 本仓库自己的源码（packages/adventure/ + content/ + packages/core/random.js）。 */
const SOURCE = ROOT;
const BUNDLE = path.join(ROOT, 'miniprogram', 'subpkg', 'xianxia', 'runtime', 'engine.js');

/** 种子表：覆盖不同出身、不同灵根、不同世界。 */
const SEEDS = [
  '松风有信', '山海-001', '云深不知处', '灯下故人书', '一剑霜寒',
  '归途未晚', '青灯照夜白', '三更听雨', '山门有灯', '渡口问舟人',
  '故纸残雪', '旧约重来',
];

/** 最多推进多少个月（一生大概 80~500 个月）。 */
const MAX_MONTHS = 600;

/* ══════════════════════════════════════════════ 工具 */

/** 深比较（键序无关）：两边都 JSON 化并按键排序。 */
function canonical(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const keys = Object.keys(value).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
}
const same = (a, b) => canonical(a) === canonical(b);

/** 比较两段文本的差异位置（报门禁时要说清「哪里不一样」）。 */
function firstDiff(a, b) {
  const x = canonical(a), y = canonical(b);
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  return {index: i, left: x.slice(Math.max(0, i - 60), i + 60), right: y.slice(Math.max(0, i - 60), i + 60)};
}

/* ══════════════════════════════════════════════ 装两套规则 */

section('装载源仓库规则与小程序产物');
const esm = await import(pathToFileURL(path.join(SOURCE, 'packages/adventure/engine.js')).href);
const bundle = loadCjs(BUNDLE);
ok(!!esm && typeof esm.createRun === 'function', '源仓库规则可加载（ESM）');
ok(!!bundle && typeof bundle.createRun === 'function', '小程序产物可加载（CommonJS）');

/* ══════════════════════════════════════════════ 逐月对拍 */

section(`同种子对拍（${SEEDS.length} 个种子，最多 ${MAX_MONTHS} 个月）`);

let comparedMonths = 0;
let comparedChoices = 0;

for (const [index, seed] of SEEDS.entries()) {
  /* 人生编号必须是 ASCII（引擎校验 /^[a-zA-Z0-9_-]{1,100}$/），
     所以用序号拼一个稳定的编号，而不是把中文种子直接塞进去。 */
  const id = `life-equivalence-${index}`;
  let a, b;
  let seedOk = true;
  try {
    a = esm.createRun({seed, id});
    b = bundle.createRun({seed, id});
  } catch (error) {
    ok(false, `${seed}：创建人生时抛错（${error.message}）`);
    seedOk = false;
  }
  if (!seedOk) continue;

  if (!same(a, b)) {
    const d = firstDiff(a, b);
    ok(false, `${seed}：出生状态就不一致 ⇒ ${d.left} ≠ ${d.right}`);
    continue;
  }

  let mismatch = null;
  for (let step = 0; step < MAX_MONTHS && !mismatch; step++) {
    if (a.phase !== 'life') break;

    if (a.pending) {
      /* 决策点：两边的选项表必须逐值相同。 */
      const oa = esm.options(a);
      const ob = bundle.options(b);
      if (!same(oa, ob)) {
        mismatch = `第 ${a.month} 月的选项表不同：${firstDiff(oa, ob).left} ≠ ${firstDiff(oa, ob).right}`;
        break;
      }
      comparedChoices++;
      /* 两边选**同一个**选项（取第一个可选的）。 */
      const pick = (oa.find((o) => o.enabled) || oa[0] || {}).id;
      if (!pick) break;
      const ra = esm.choose(a, pick);
      const rb = bundle.choose(b, pick);
      if (!same(ra, rb)) {
        mismatch = `第 ${a.month} 月选择「${pick}」后的结果不同`;
        break;
      }
      if (!same(a, b)) {
        mismatch = `第 ${a.month} 月选择「${pick}」后的状态不同`;
        break;
      }
      continue;
    }

    const ma = esm.advance(a, 1);
    const mb = bundle.advance(b, 1);
    comparedMonths++;
    if (ma !== mb) {
      mismatch = `第 ${step} 步推进月数不同：源 ${ma} ≠ 产物 ${mb}`;
      break;
    }
    if (!same(a, b)) {
      mismatch = `第 ${a.month} 月的状态不同`;
      break;
    }
    if (!same(esm.review(a), bundle.review(b))) {
      mismatch = `第 ${a.month} 月的回顾不同`;
      break;
    }
  }

  ok(!mismatch, `${seed}：${mismatch || `一路走到第 ${a.month} 个月，全程逐值相同`}`);
}

console.log(`  （本次共比对 ${comparedMonths} 个月、${comparedChoices} 个决策点）`);

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
