#!/usr/bin/env node
/**
 * build-xianxia-mp.mjs — 把**本仓库自己的**修仙规则同源生成成小程序能跑的 CommonJS
 * ============================================================================
 *
 * 用法
 * ----
 *   node scripts/build-xianxia-mp.mjs                    # 用本仓库的源码构建
 *   node scripts/build-xianxia-mp.mjs --check            # 只校验：产物 == 重新构建的结果
 *   node scripts/build-xianxia-mp.mjs --verify-upstream=<目录>   # 核对上游目录与本仓库是否一致
 *
 * ## 「唯一来源」现在指哪里
 * --------------------------
 * ⭐ **本仓库自己的源码**就是唯一来源：
 *   · packages/adventure/          修仙规则（引擎、境界、剧情、宗门…）
 *   · content/                     修仙内容表（人物、大陆、事件、故事…）
 *   · packages/core/random.js      随机流（种子 ⇒ 同一串随机数）
 *   · apps/preview/pixel-style.js  画面调色板与人物像素（纯数据）
 *
 * ⇒ **改规则 = 改上面这些文件，然后重新构建**；
 *   生成物（runtime/engine.js）**永远不许手改**。
 *
 * ## vendor/ 是什么了
 * ------------------
 * `vendor/xianxia-r12/` 与 `vendor/xianxia-r12-art/` 现在是**历史证据**，不再是构建输入：
 * 它们锁着「这份字节当初是从上游哪个提交搬过来的」。
 * 见 vendor/xianxia-r12/README.md。
 *
 * ## 与上游的关系（如实写，不伪造）
 * ------------------------------
 * 这份字节有**两个来源**：
 *   · 本仓库的 packages/ + content/（现在改的就是它们）；
 *   · 上游 buuzzy/xianxia-life 的 feature/adventure-preview-v01
 *     （commit b519ac06… / tree c780c6c4…，见 vendor/xianxia-r12/baseline.lock.json）。
 * 两边**逐字节相同** —— 门禁 `scripts/test-xianxia-build.mjs` 逐个核对。
 * build-manifest.json 里 `source` 记本仓库，`upstreamOrigin` 记上游 —— 不合并、不假装只有一个。
 *
 * ⚠ **上游仓库已于 2026-11-07 删除**（字节已完整迁入本仓库）⇒
 *   门禁现在核对的是**仓库内的锁定快照** `vendor/xianxia-r12/`，
 *   不再需要那个目录在场。
 *
 * ## 硬规矩
 * --------
 * ① 只允许 packages/adventure/、content/、packages/core/random.js、
 *    apps/preview/pixel-style.js 进产物；
 *    `content/` 里那几份**旧 0.2.0 Web 产品**的表（world.js / stories.js /
 *    expansion.js）明确排除 —— 它们与修仙那套 REALMS/ROOTS/ITEMS **同名但不同源**。
 * ② 产物必须能被 **ES2019** 解析（微信上传校验 + 门禁）。
 * ③ 产物里不许残留 `?.` / `??`（微信拒收 ES2020 语法）。
 * ④ **同样的输入 ⇒ 逐字节相同的输出**（清单里不写时间戳、不写绝对路径）。
 * ⑤ 清单里的 git 身份（branch/commit/tree）是**快照信息**：记的是构建那一刻仓库的状态。
 *    它**不参与**逐字节复现校验（一次提交就会让它变，而产物本身没变）；
 *    产物的复现由 inputs/output 的 SHA-256 保证。
 *
 * ## 产物
 * ----
 *   miniprogram/subpkg/xianxia/runtime/engine.js            （生成的规则）
 *   miniprogram/subpkg/xianxia/runtime/pixel-style.js       （生成的画面调色板）
 *   miniprogram/subpkg/xianxia/runtime/build-manifest.json  （来源与哈希）
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {bundle, downlevelAndVerify, minifyAndVerify} from './lib/xianxia-bundle.mjs';

const require = createRequire(import.meta.url);
const acorn = require('acorn');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'miniprogram', 'subpkg', 'xianxia', 'runtime');
const OUT_FILE = path.join(OUT_DIR, 'engine.js');
const MANIFEST_FILE = path.join(OUT_DIR, 'build-manifest.json');
const STYLE_FILE = path.join(OUT_DIR, 'pixel-style.js');
/** 全局样式：也从官方 app.wxss 提取生成（见下面「全局样式」一节）。 */
const APP_WXSS_FILE = path.join(ROOT, 'miniprogram', 'app.wxss');
const OFFICIAL_APP_WXSS = path.join(ROOT, 'reference', 'official', 'app.wxss');

/** 规则入口：从小程序只需要这一个入口 + 它牵进来的东西。 */
const ENTRY = 'packages/adventure/engine.js';

/** 画面入口：调色板与人物像素（纯数据，不含 DOM 代码）。 */
const STYLE_ENTRY = 'apps/preview/pixel-style.js';

/** 规则版本（与 bridge/storage.js 的默认值一致，门禁会核对）。 */
const RULES_VERSION = 12;

/**
 * 允许进入小程序的源文件范围（其余一律报错）。
 *
 * ⚠ 以前这里是「packages/adventure/ + content/ + packages/core/random.js」三选一，
 *   现在多了一条 apps/preview/pixel-style.js（画面调色板）——
 *   它是**唯一**进产物的画面文件（另两个参考实现只被等价门禁拿来对比）。
 */
const ALLOWED = [
  {prefix: 'packages/adventure/', label: '修仙规则'},
  {prefix: 'content/', label: '修仙内容表'},
  {exact: 'packages/core/random.js', label: '随机流'},
  {exact: 'apps/preview/pixel-style.js', label: '画面调色板'},
];

/** 明确排除的旧 Web 内容表（与修仙那套同名但不同源）。 */
const EXCLUDED = new Set([
  'content/world.js',
  'content/stories.js',
  'content/expansion.js',
]);

/**
 * 小程序端要拿到的导出（模块 id → 导出名）。
 * 构建时逐个核对：**模块里没有这个名字就直接报错**，
 * 免得源码改了导出名、小程序端拿到 undefined 却不报错。
 */
const EXPORTS = {
  'packages/adventure/engine.js': [
    'createRun', 'createClassicRun', 'upgradeRun', 'cloneRun', 'ORIGINS',
    'advance', 'advanceToChoice', 'options', 'currentNode', 'nodeText',
    'choose', 'acknowledge', 'seekTraining', 'setActivity', 'travelTo',
    'leaveExpedition', 'aid', 'chance', 'unmet', 'review', 'validateRun',
    'age', 'date', 'duration', 'EVENTS', 'ALL_ENDINGS',
  ],
  /* S9：内容按域拆开了 ⇒ 导出指向各域自己的文件，不再从「什么都有的」大杂烩门面取。
     （门面 content/adventure.js 仍然转发同样的名字，旧路径照样能用。） */
  'content/realms.js': ['REALMS', 'SKILLS'],
  'content/regions.js': ['REGIONS', 'CAST'],
  'content/items.js': ['ITEMS'],
  'content/ends.js': ['ACTS'],
  'content/living-world.js': [
    'NEW_CAST', 'FAMILIES', 'BIRTHPLACES', 'WORLD_ERAS', 'LIFE_GOALS', 'TRAINING_GROUNDS',
  ],
  'content/cultivation-world.js': ['PATHS', 'ROOTS', 'ACTIVITIES', 'GEOGRAPHY', 'OFFICERS'],
  'packages/adventure/realm.js': ['REALM_ABILITIES'],
  'packages/adventure/life.js': [
    'regionInfo', 'activityLabel', 'monthSeconds', 'income', 'practiceRate', 'trainingOptions',
  ],
  'packages/adventure/context.js': ['activityContext', 'presentPeople'],
  'packages/adventure/cultivation.js': ['activityOptions', 'routeOptions', 'currentContinent', 'mapView'],
  'packages/adventure/cultivation-economy.js': ['economyQuote'],
  'content/story-network.js': ['METHODS'],
  /* 2026-11-07（T1）：门槛与「还差什么」必须**只从规则层取** ——
     以前两端界面各写一份门槛（260 / 140），规则层一改界面就说谎
     （用户撞到的「进度条满了却几十年不给突破提示」）。
     ⇒ 小程序端也改成读引擎导出的 `progressNeeded` / `breakthroughStatus`。 */
  'content/cadence-table.js': [
    'progressNeeded', 'REQUIRED_PROGRESS', 'METHOD_MONTHS', 'MATERIAL_TIERS', 'CADENCE',
  ],
  'packages/adventure/cadence.js': ['breakthroughStatus'],
  'packages/adventure/progression.js': [
    'longAction', 'prose', 'sceneFor', 'materialSlots', 'progressionText',
  ],
  'packages/adventure/birth.js': ['birthFacts'],
  'content/expressions/people.js': ['PEOPLE_BACKGROUNDS'],
  /* 规则12 的专用模块：体质 / 寿限 / 炼气阶段 / 宗门 —— 小程序端要显示它们，
     不能拿 REALMS[].lifespan 顶（那只是旧规则与境界基础值）。 */
  'packages/adventure/story-rules12.js': [
    'rules12', 'lifespan12', 'lifespanPlan12', 'stage12', 'sectProfile', 'active12',
    /* 2026-11-07（T4）：雷达图换轴后，小程序端要画「体魄」——
       它的数只能从规则层取（两端同一份），不许界面自己编。 */
    'constitution12',
  ],
  'content/expressions/lifespan.js': ['LIFESPAN_TEXT', 'fillLifespan'],
  'content/rules12-world.js': ['BODY_TYPES', 'REGIONAL_METHODS'],
};

function parseArgs(argv) {
  const args = {check: false, verifyUpstream: null};
  for (const arg of argv) {
    if (arg.startsWith('--verify-upstream=')) args.verifyUpstream = arg.slice('--verify-upstream='.length);
    else if (arg === '--check') args.check = true;
    else throw new Error(`不认识的参数：${arg}`);
  }
  return args;
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function git(args) {
  try {
    return execFileSync('git', ['-C', ROOT, ...args], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
  } catch (error) {
    return null;
  }
}

/**
 * 本仓库的 git 身份（快照信息，不参与逐字节复现校验）。
 * 取不到 git（没装 / 不是仓库）时如实写 null，不编。
 */
function repoIdentity() {
  const commit = git(['rev-parse', 'HEAD']);
  const tree = git(['rev-parse', 'HEAD^{tree}']);
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  return {
    repo: 'buuzzy/guishanji',
    branch: branch || null,
    commit: commit || null,
    tree: tree || null,
    note: '构建那一刻本仓库的 HEAD 身份（快照信息，不参与逐字节复现校验）',
  };
}

/**
 * 上游来源（历史证据，见 vendor/xianxia-r12/baseline.lock.json）。
 * 如实记：这份字节当初是从上游哪个提交搬过来的。
 */
function upstreamOrigin() {
  const lockFile = path.join(ROOT, 'vendor', 'xianxia-r12', 'baseline.lock.json');
  if (!fs.existsSync(lockFile)) return null;
  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
  } catch (error) {
    return null;
  }
  if (!lock.source) return null;
  return {
    repo: lock.source.repo,
    branch: lock.source.branch,
    commit: lock.source.commit,
    tree: lock.source.tree,
    note: '同一批字节的两个来源之一：本仓库的 packages/ + content/ 与上游那个提交逐字节相同'
      + '（门禁 scripts/test-xianxia-build.mjs 逐个核对）；vendor/xianxia-r12 是当时锁下的历史证据。',
  };
}

/** 判断某个模块 id 是否允许进入小程序。 */
function allowed(id) {
  if (EXCLUDED.has(id)) {
    throw new Error(`模块 ${id} 属于旧 0.2.0 Web 产品，与修仙那套同名但不同源，禁止打包。`);
  }
  for (const rule of ALLOWED) {
    if (rule.exact && id === rule.exact) return true;
    if (rule.prefix && id.startsWith(rule.prefix)) return true;
  }
  throw new Error(`模块 ${id} 不在允许清单内（只允许 packages/adventure/、content/、packages/core/random.js、apps/preview/pixel-style.js）。`);
}

/** 收集一个模块的依赖（import 与 export ... from）。 */
function depsOf(id, src) {
  const ast = acorn.parse(src, {ecmaVersion: 2022, sourceType: 'module'});
  const out = [];
  for (const stmt of ast.body) {
    if (stmt.type === 'ImportDeclaration') out.push(stmt.source.value);
    else if (stmt.type === 'ExportNamedDeclaration' && stmt.source) out.push(stmt.source.value);
    else if (stmt.type === 'ExportAllDeclaration') throw new Error(`${id}：不支持 export * from。`);
  }
  return out;
}

/** 相对路径解析（与打包器内部同一套规则）。 */
function resolveId(fromId, spec) {
  const base = spec.startsWith('./') ? spec.slice(2) : spec;
  const dir = fromId.includes('/') ? fromId.slice(0, fromId.lastIndexOf('/')) : '';
  const joined = dir ? `${dir}/${base}` : base;
  return joined.split('/').reduce((acc, part) => {
    if (part === '.' || part === '') return acc;
    if (part === '..') return acc.includes('/') ? acc.slice(0, acc.lastIndexOf('/')) : '';
    return acc ? `${acc}/${part}` : part;
  }, '');
}

/**
 * 计算依赖闭包。
 *
 * ⭐ 源目录就是**本仓库根目录** ⇒ 模块 id 形如
 *   `packages/adventure/engine.js` / `content/adventure.js` / `packages/core/random.js`
 *   —— 与当年从 vendor 快照构建时**完全一样** ⇒ 产物逐字节可比。
 *
 * @param {string} sourceRoot  源目录（本仓库根）
 * @param {string} [entry]     入口（默认规则入口）
 */
function closure(sourceRoot, entry) {
  const modules = new Map();
  const queue = [entry || ENTRY];
  while (queue.length) {
    const id = queue.shift();
    if (modules.has(id)) continue;
    allowed(id);
    const file = path.join(sourceRoot, id);
    if (!fs.existsSync(file)) throw new Error(`源仓库缺少文件：${id}`);
    const src = fs.readFileSync(file, 'utf8');
    modules.set(id, {src});
    for (const spec of depsOf(id, src)) {
      const depId = resolveId(id, spec);
      if (!depId) throw new Error(`${id}：无法解析依赖「${spec}」。`);
      queue.push(depId);
    }
  }
  return modules;
}

/* ══════════════════════════════════════════════ 核对上游（只读工具） */

/**
 * `--verify-upstream=<目录>`：把上游 checkout 里的对应文件与**本仓库源码**逐字节比一遍。
 *
 * ⚠ 这是「核对」工具，**不是**构建路径：
 *   · 它**不写**任何文件；
 *   · 它只回答一个问题：「本仓库现在的源码，还跟上游那份一样吗？」
 * 差集列出来是为了让人知道「哪几个文件开始分家了」，
 * 而不是为了让构建偷偷去读旁边那个目录。
 */
function verifyUpstream(checkout) {
  const upstream = path.resolve(ROOT, checkout);
  if (!fs.existsSync(upstream)) throw new Error(`上游目录不存在：${upstream}`);

  const ids = [...closure(ROOT).keys()].sort();
  const same = [];
  const differ = [];
  const missing = [];
  for (const id of ids) {
    const upstreamFile = path.join(upstream, id);
    if (!fs.existsSync(upstreamFile)) { missing.push(id); continue; }
    const a = fs.readFileSync(path.join(ROOT, id));
    const b = fs.readFileSync(upstreamFile);
    if (a.equals(b)) same.push(id); else differ.push(id);
  }

  console.log(`核对上游目录：${upstream}`);
  console.log(`  相同：${same.length} 个`);
  console.log(`  不同：${differ.length} 个${differ.length ? '（' + differ.join('、') + '）' : ''}`);
  console.log(`  上游没有：${missing.length} 个${missing.length ? '（' + missing.join('、') + '）' : ''}`);
  if (differ.length || missing.length) {
    console.log('');
    console.log('  ⇒ 本仓库的规则已经与那份上游分家了。');
    console.log('    这**不影响**构建（构建只读本仓库源码），但要记得：');
    console.log('    上游那份只是历史证据，本仓库才是唯一来源。');
  }
  return {same: same.length, differ, missing};
}

/* ══════════════════════════════════════════════ 全局样式（app.wxss） */

/**
 * `miniprogram/app.wxss` 是**生成物**：从 `reference/official/app.wxss`
 * （= 1in8b 官方设计系统，逐字节副本）里**逐条提取**本小程序真正用得到的规则。
 *
 * ## 为什么提取而不是整份照搬
 * --------------------------
 * 官方那份 app.wxss 里有大量 1in8b 自己页面才用的规则（商店、追思馆、寿终记录…），
 * 归山记没有那些页面 ⇒ 整份照搬会把一堆用不上的样式带进新产品。
 *
 * ## 为什么提取**不会**改变任何页面的观感
 * --------------------------------------
 * 一条 CSS 规则只可能作用在**带它那些类名**的元素上。
 * 我们只删「它的类名在本小程序里根本不会出现」的规则 ⇒ 被删的规则**永远匹配不到**
 * 任何一个元素 ⇒ 删掉它对渲染**零影响**。
 * （这是可证明的，不是「看起来应该没事」。）
 *
 * ## 提取口径
 * ----------
 * ① **永远保留**没有类名的规则：`page{…}`（CSS 变量与深色模式）、
 *    `@media (prefers-color-scheme: dark)`、元素选择器（`button` 等）。
 * ② 其余规则：**逗号分隔的每个选择器单独判**——
 *    只要其中**任意一个**选择器的全部类名都在「用得到的类名」集合里，就整条保留。
 *    （`.wx-b, .wx-strong` 这种合写规则不能拆开判，否则会丢样式。）
 * ③ 「用得到的类名」来自：
 *    · 本小程序所有 `.wxml` 的 `class="…"`（含 `{{…}}` 里的引号字符串）；
 *    · 本小程序所有 `.wxss`（页面层）的选择器 —— 页面层样式会用到全局层的类；
 *    · 官方 app.wxss 里所有规则的类名（用于「前缀通配」，见 addToken）。
 * ④ `class="kind-{{item.k}}"` 这种**动态类名**：字面量部分 `kind-` 视为**前缀通配** ⇒
 *    官方所有 `kind-*` 的规则都保留（运行时才知道具体是哪个）。
 * ⑤ 主题类 `.theme-light` / `.theme-dark` 恒定保留（`bridge/theme.js` 决定）。
 *
 * ## 想改样式怎么办
 * ----------------
 * 改 `reference/official/app.wxss` 的来源，或改页面上的 class，
 * 然后重新 `node scripts/build-xianxia-mp.mjs`。
 * ⚠ **不要手改 `miniprogram/app.wxss`**（下次构建会被覆盖）。
 */

/** 递归列出目录下的文件（按名排序，保证结果稳定）。 */
function walk(dir, filter, out) {
  const acc = out || [];
  let entries;
  try {
    entries = fs.readdirSync(dir, {withFileTypes: true});
  } catch (error) {
    return acc;
  }
  entries.sort((a, b) => (a.name < b.name ? -1 : (a.name > b.name ? 1 : 0)));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, filter, acc);
    else if (!filter || filter(full)) acc.push(full);
  }
  return acc;
}

/** 选择器里的类名（先去掉注释，免得注释里提到的类名被当真）。 */
function classTokens(selector) {
  const stripped = selector.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const tokens = [];
  const re = /\.(-?[_a-zA-Z][\w-]*)/g;
  let m;
  while ((m = re.exec(stripped))) tokens.push(m[1]);
  return tokens;
}

/**
 * 把注释内容替换成等长空白（保留换行）。
 *
 * ⚠ **必须这么做**：官方 app.wxss 的注释里**含有右花括号**（例如
 *   「官方 .agebox .age { … font-variant-numeric:tabular-nums }」那一行注释），
 *   直接按花括号数切块会**错位** ⇒ 切出来的块里会多出注释的结尾符、
 *   少掉开头，生成的 CSS 是坏的。
 * ⇒ 用掩码后的文本数花括号，用原文切片输出（注释逐字保留）。
 */
function maskComments(text) {
  const chars = text.split('');
  let i = 0;
  while (i < text.length) {
    if (chars[i] === '/' && chars[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? text.length : end + 2;
      for (let j = i; j < stop; j++) {
        if (chars[j] !== '\n') chars[j] = ' ';
      }
      i = stop;
      continue;
    }
    i++;
  }
  return chars.join('');
}

/** 把一段文本按顶层规则切开（每块含它前面的注释与空白）。 */
export function splitTopLevel(text) {
  const masked = maskComments(text);
  const chunks = [];
  let depth = 0;
  let start = 0;
  let prevEnd = 0;
  for (let i = 0; i < masked.length; i++) {
    const c = masked[i];
    if (c === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (c === '}') {
      depth--;
      if (depth === 0) {
        chunks.push({
          sel: text.slice(prevEnd, start),
          full: text.slice(prevEnd, i + 1),
        });
        prevEnd = i + 1;
      }
    }
  }
  return chunks;
}

/** 收集一段 CSS 里**所有层级**的选择器文本（@media 里面的也要）。 */
export function collectSelectors(text) {
  const masked = maskComments(text);
  const out = [];
  let i = 0;
  while (i < masked.length) {
    const open = masked.indexOf('{', i);
    if (open < 0) break;
    let depth = 1;
    let j = open + 1;
    while (j < masked.length && depth > 0) {
      if (masked[j] === '{') depth++;
      else if (masked[j] === '}') depth--;
      j++;
    }
    const sel = text.slice(i, open);
    const body = masked.slice(open + 1, j - 1);
    if (body.indexOf('{') >= 0) out.push(...collectSelectors(body));
    else out.push(sel);
    i = j;
  }
  return out;
}

/** 「用得到的类名」集合：确切名字 + 前缀通配。 */
function newUsedSet() {
  return {names: new Set(), prefixes: new Set()};
}

/**
 * 记一个类名。
 * ⚠ 以 `-` 结尾 = 前缀通配（`kind-{{…}}` 这种动态类名）。
 */
function addToken(token, used) {
  if (!token) return;
  if (token.endsWith('-')) {
    used.prefixes.add(token);
    return;
  }
  used.names.add(token);
}

/** 从 `class="…"` 的属性值里取类名（含 mustache 里的引号字符串）。 */
function classesFromClassAttr(value, used) {
  const inner = [];
  value.replace(/\{\{([\s\S]*?)\}\}/g, function (_all, expr) {
    const re = /'([^']*)'|"([^"]*)"/g;
    let m;
    while ((m = re.exec(expr))) inner.push(m[1] !== undefined ? m[1] : m[2]);
    return '';
  });
  const literal = value.replace(/\{\{[\s\S]*?\}\}/g, ' ');
  for (const token of literal.split(/\s+/)) addToken(token, used);
  for (const chunk of inner) {
    for (const token of chunk.split(/\s+/)) addToken(token, used);
  }
}

/**
 * 扫本小程序（`miniprogram/`），收集「用得到的类名」。
 * @param {string} root 小程序根目录
 */
export function collectUsedClasses(root) {
  const used = newUsedSet();

  /* ① WXML 的 class 属性。 */
  for (const file of walk(root, (f) => f.endsWith('.wxml'))) {
    const text = fs.readFileSync(file, 'utf8');
    const re = /class\s*=\s*("([^"]*)"|'([^']*)')/g;
    let m;
    while ((m = re.exec(text))) {
      classesFromClassAttr(m[2] !== undefined ? m[2] : m[3], used);
    }
  }

  /* ② 页面层样式（wxss）的选择器 —— 它们会用到全局层的类。
   *    ⚠ `app.wxss` 本身排除（它就是被提取的那一份）。 */
  for (const file of walk(root, (f) => f.endsWith('.wxss'))) {
    if (path.basename(file) === 'app.wxss') continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const selector of collectSelectors(text)) {
      for (const token of classTokens(selector)) addToken(token, used);
    }
  }

  return used;
}

/**
 * 从官方 app.wxss 提取出本小程序用得到的部分。
 * @param {string} officialText 官方 app.wxss 原文
 * @param {{names:Set<string>, prefixes:Set<string>}} used
 * @returns {string}
 */
export function deriveAppWxss(officialText, used) {
  let chunks = splitTopLevel(officialText);

  /* 官方全部类名（用来做前缀通配）。 */
  const officialClasses = new Set();
  for (const chunk of chunks) {
    for (const token of classTokens(chunk.sel)) officialClasses.add(token);
  }

  const keep = new Set(used.names);
  for (const prefix of used.prefixes) {
    for (const name of officialClasses) {
      if (name.startsWith(prefix)) keep.add(name);
    }
  }
  /* 主题类恒定保留（bridge/theme.js 的三态：跟随系统 / 日读 / 夜读）。 */
  keep.add('theme-light');
  keep.add('theme-dark');

  /* 闭包：保留一条规则时，把它涉及的类名也加进来（可能让别的规则也能保留）。 */
  let changed = true;
  while (changed) {
    changed = false;
    const next = [];
    for (const chunk of chunks) {
      const parts = chunk.sel.split(',');
      const hit = parts.some((part) => {
        const tokens = classTokens(part);
        if (!tokens.length) return false;
        return tokens.every((token) => keep.has(token));
      });
      if (!hit && classTokens(chunk.sel).length > 0) continue;
      next.push(chunk);
      for (const token of classTokens(chunk.sel)) {
        if (!keep.has(token)) {
          keep.add(token);
          changed = true;
        }
      }
    }
    if (next.length !== chunks.length) changed = true;
    chunks = next;
  }

  return chunks.map((chunk) => chunk.full).join('');
}

/** app.wxss 顶上的说明（说清它是生成物、来源与改法）。 */
export const APP_WXSS_NOTE = [
  '/* ==========================================================================',
  '   归山记 · 全局样式（app.wxss）',
  '   ==========================================================================',
  '',
  '   ⚠ **生成物，不要手改**',
  '      生成：node scripts/build-xianxia-mp.mjs',
  '      校验：node scripts/build-xianxia-mp.mjs --check',
  '',
  '   来源：reference/official/app.wxss（1in8b 官方设计系统的逐字节副本）。',
  '   做法：只保留本小程序**真正用得到**的那些规则，其余整条删掉。',
  '        被删的规则匹配不到本页任何一个元素 ⇒ 观感零变化（可证明，不是估计）。',
  '',
  '   想改样式：改页面的 class，或改官方那份的来源，然后重新构建。',
  '   ========================================================================== */',
  '',
].join('\n');

/**
 * 生成 `miniprogram/app.wxss` 的内容。
 * @returns {Buffer}
 */
export function buildAppWxss() {
  if (!fs.existsSync(OFFICIAL_APP_WXSS)) {
    throw new Error(`缺少官方样式来源：${path.relative(ROOT, OFFICIAL_APP_WXSS)}`);
  }
  const official = fs.readFileSync(OFFICIAL_APP_WXSS, 'utf8');
  const used = collectUsedClasses(path.join(ROOT, 'miniprogram'));
  const body = deriveAppWxss(official, used);
  return Buffer.from(APP_WXSS_NOTE + body, 'utf8');
}

/* ══════════════════════════════════════════════ 构建 */

function build() {
  const modules = closure(ROOT);
  const map = new Map();
  for (const [id, info] of modules) map.set(id, {src: info.src});

  /* 降级到 ES2019 → 再压一道（省分包体积）→ 产物。 */
  const body = minifyAndVerify(downlevelAndVerify(bundle(map, [ENTRY], {exportsMap: EXPORTS})));

  /**
   * 产物说明头（babel 的紧凑输出会把注释全部去掉，所以这里在降级**之后**补上）。
   * 这一段是给「半年后看这个文件的人」看的：
   * 它说清楚这文件是**生成物**、从哪来、能不能手改。
   */
  const header = [
    '/*',
    ' * 修仙规则运行时 —— **生成物，不要手改**',
    ' *',
    ' * 来源：**本仓库自己的源码**',
    ' *         packages/adventure/ + content/ + packages/core/random.js',
    ' *         （画面调色板另出 apps/preview/pixel-style.js）',
    ' * 生成：node scripts/build-xianxia-mp.mjs',
    ' * 校验：node scripts/build-xianxia-mp.mjs --check',
    ' *         （逐字节比对产物与重新构建的结果）',
    ' *',
    ' * 源提交与各输入文件的 SHA-256 见同目录 build-manifest.json',
    ' *（`source` 记本仓库，`upstreamOrigin` 记上游那份历史证据 —— 同一批字节的两个来源）。',
    ' * 想改规则请改**本仓库的源码**，然后重新生成 —— 手改这里，下次构建会被覆盖，',
    ' * 而且「小程序里的规则 = 本仓库那份」这句话就不成立了。',
    ' *',
    ' * 语法：ES2019（小程序上传校验拒收 ES2020 的 ?. 与 ??，构建时已降级）。',
    ' */',
    '',
  ].join('\n');

  const code = Buffer.from(header + body, 'utf8');

  const inputs = [...modules.keys()].sort().map((id) => {
    const bytes = Buffer.from(modules.get(id).src, 'utf8');
    return {id, bytes: bytes.length, sha256: sha256(bytes)};
  });

  /* ── 调色板（纯数据，单独一个产物） ── */
  const styleModules = closure(ROOT, STYLE_ENTRY);
  const styleMap = new Map();
  for (const [id, info] of styleModules) styleMap.set(id, {src: info.src});
  const styleBody = minifyAndVerify(downlevelAndVerify(bundle(styleMap, [STYLE_ENTRY], {
    exportsMap: {[STYLE_ENTRY]: ['PIXEL_STYLE']},
  })));
  const styleHeader = [
    '/*',
    ' * 修仙画面调色板与人物像素 —— **生成物，不要手改**',
    ' *',
    ' * 来源：**本仓库自己的源码** apps/preview/pixel-style.js',
    ' * 生成：node scripts/build-xianxia-mp.mjs',
    ' *',
    ' * 为什么单独一份而不是并进 engine.js：',
    ' *   engine.js 是**规则**，这份是**画面数据**。',
    ' *   两者分开，将来规则升版不影响画面，画面也不进规则的哈希。',
    ' */',
    '',
  ].join('\n');
  const styleCode = Buffer.from(styleHeader + styleBody, 'utf8');

  const manifest = {
    generatedBy: 'scripts/build-xianxia-mp.mjs',
    source: {
      ...repoIdentity(),
      paths: [
        'packages/adventure/',
        'content/',
        'packages/core/random.js',
        'apps/preview/pixel-style.js',
      ],
    },
    upstreamOrigin: upstreamOrigin(),
    rulesVersion: RULES_VERSION,
    moduleCount: modules.size,
    inputs,
    output: {file: 'engine.js', bytes: code.length, sha256: sha256(code)},
    styleOutput: {file: 'pixel-style.js', bytes: styleCode.length, sha256: sha256(styleCode)},
  };

  return {
    code,
    manifest: Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8'),
    styleCode,
    appWxss: buildAppWxss(),
  };
}

/**
 * 清单比较：**忽略 git 身份那三个字段**。
 *
 * ⚠ 为什么：`source.branch / source.commit / source.tree` 记的是构建那一刻仓库的状态。
 *   一次普通提交就会让它们变，而产物本身一个字节都没变 ⇒
 *   把它们算进「逐字节复现」判据，等于每次提交都让门禁假红。
 * ⇒ 复现由 `inputs` / `output` 的 SHA-256 保证（那才是产物真正的依赖）。
 */
function manifestsEqual(a, b) {
  const normalize = (text) => {
    const doc = JSON.parse(text);
    if (doc.source) {
      doc.source.branch = '<git-identity>';
      doc.source.commit = '<git-identity>';
      doc.source.tree = '<git-identity>';
    }
    return JSON.stringify(doc);
  };
  return normalize(a) === normalize(b);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.verifyUpstream) {
    verifyUpstream(args.verifyUpstream);
    return;
  }

  const {code, manifest, styleCode, appWxss} = build();

  if (args.check) {
    const problems = [];
    if (!fs.existsSync(OUT_FILE)) problems.push(`缺少产物：${path.relative(ROOT, OUT_FILE)}`);
    else if (!fs.readFileSync(OUT_FILE).equals(code)) problems.push('产物内容与重新构建的结果不一致');
    if (!fs.existsSync(MANIFEST_FILE)) problems.push(`缺少来源清单：${path.relative(ROOT, MANIFEST_FILE)}`);
    else if (!manifestsEqual(fs.readFileSync(MANIFEST_FILE), manifest)) {
      problems.push('来源清单与重新构建的结果不一致');
    }
    if (!fs.existsSync(STYLE_FILE)) problems.push(`缺少产物：${path.relative(ROOT, STYLE_FILE)}`);
    else if (!fs.readFileSync(STYLE_FILE).equals(styleCode)) problems.push('调色板产物与重新构建的结果不一致');
    if (!fs.existsSync(APP_WXSS_FILE)) problems.push(`缺少产物：${path.relative(ROOT, APP_WXSS_FILE)}`);
    else if (!fs.readFileSync(APP_WXSS_FILE).equals(appWxss)) {
      problems.push('全局样式 app.wxss 与重新提取的结果不一致');
    }
    if (problems.length) {
      console.error('✖ 修仙运行时不是最新的：');
      for (const p of problems) console.error('  · ' + p);
      console.error('  修法：node scripts/build-xianxia-mp.mjs');
      process.exit(1);
    }
    console.log('✔ 修仙运行时与本仓库源码一致（逐字节相同）');
    console.log('✔ 全局样式 app.wxss 与官方来源的提取结果一致（逐字节相同）');
    return;
  }

  fs.mkdirSync(OUT_DIR, {recursive: true});
  fs.writeFileSync(OUT_FILE, code);
  fs.writeFileSync(MANIFEST_FILE, manifest);
  fs.writeFileSync(STYLE_FILE, styleCode);
  fs.writeFileSync(APP_WXSS_FILE, appWxss);
  const m = JSON.parse(manifest.toString('utf8'));
  console.log(`✔ 已生成修仙运行时：${path.relative(ROOT, OUT_FILE)}（${m.output.bytes} 字节，${m.moduleCount} 个模块）`);
  console.log(`✔ 已生成画面调色板：${path.relative(ROOT, STYLE_FILE)}（${styleCode.length} 字节）`);
  console.log(`✔ 已生成全局样式：${path.relative(ROOT, APP_WXSS_FILE)}（${appWxss.length} 字节）`);
  console.log(`  来源：本仓库 ${m.source.repo}（分支 ${m.source.branch}）`);
  if (m.upstreamOrigin) {
    console.log(`  上游（历史证据）：${m.upstreamOrigin.repo}@${m.upstreamOrigin.commit.slice(0, 8)}`);
  }
}

/* 直接运行时才执行（被 import 时只导出函数）。 */
const invokedDirectly = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (invokedDirectly) {
  try {
    main();
  } catch (error) {
    console.error('✖ 构建失败：' + (error && error.message ? error.message : error));
    process.exit(1);
  }
}
