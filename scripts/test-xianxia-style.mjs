#!/usr/bin/env node
/**
 * test-xianxia-style.mjs — 修仙页面的「与 1in8b 对齐」门禁
 * ============================================================================
 *
 * 2026-11-03 用户指出：修仙页**没有与 1in8b 对齐** —— 没有轮盘、界面是另做的一套、
 * 倍速也对不齐。本门禁就是钉死这件事的。
 *
 * 守五样
 * ------
 *   ① **样式同源**：修仙分包里那几份官方样式副本，与
 *      `miniprogram/subpkg/engine/styles/` 的源文件**逐字节一致**
 *      （不许各改各的 ⇒ 不许漂移）。
 *   ② **结构对齐**：修仙三页必须用官方那套类名
 *      （转盘 `.roller` / 登记卡 `.cert` / 顶栏 `.topbar` / 倍速 `.speed` /
 *       面板 `.panel` / 决策卡 `.dec` / 收起条 `.decpeek` …），
 *      且**不许**再出现自造的一整套视觉类。
 *   ③ **倍速档位**与官方 `life.js` 的 `SPEEDS` **同一个数组**。
 *   ④ **转盘帧数**与官方 `roll.js` 的 `FRAMES` **同一个数**。
 *   ⑤ **雕版公式**与官方 `idcard.js` 的 `guilloche()` **输出逐值一致**。
 *
 * ⚠ 为什么 ① 要「逐字节」而不是「差不多」：
 *   副本与源一旦分家，官方改了样式而修仙没跟上 ⇒ 界面上就会出现两套观感，
 *   而这正是 2026-11-03 被指出的问题。逐字节是唯一能自动发现分家的口径。
 */
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {APP_WXSS_NOTE, buildAppWxss, collectUsedClasses, splitTopLevel} from './build-xianxia-mp.mjs';

const require = createRequire(import.meta.url);
const acorn = require('acorn');

/** 本仓库根目录（门禁**只读本仓库**，不依赖任何相邻目录）。 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * 装载小程序里的 CommonJS 文件。
 * ⚠ 不能直接 require()：本仓库 package.json 是 `"type": "module"`，
 *   .js 会被当成 ESM ⇒ 文件里的 `module.exports` 直接炸。
 */
function loadCjs(file) {
  const code = fs.readFileSync(file, 'utf8');
  const mod = {exports: {}};
  const req = (id) => loadCjs(path.resolve(path.dirname(file), id));
  const fn = vm.runInThisContext(
    `(function (module, exports, require, console, globalThis) {\n${code}\n})`,
    {filename: file}
  );
  fn(mod, mod.exports, req, console, globalThis);
  return mod.exports;
}

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
};
const section = (t) => console.log(`\n▸ ${t}`);

const MP = path.join(ROOT, 'miniprogram');
/** 官方对照源（1in8b 官方小程序的那几份文件，进 git，任意机器都有）。 */
const OFFICIAL = path.join(ROOT, 'reference', 'official');
const ENGINE_STYLES = path.join(OFFICIAL, 'styles');
const OFFICIAL_SOURCES = path.join(OFFICIAL, 'sources');
const X_STYLES = path.join(MP, 'subpkg', 'xianxia', 'styles');

/* ══════════════════════════════════════════════ ① 样式副本逐字节一致 */

section('官方样式副本逐字节一致');
{
  const copies = ['life', 'roll', 'sheet', 'shelf'];
  for (const name of copies) {
    const src = path.join(ENGINE_STYLES, `${name}.wxss`);
    const copy = path.join(X_STYLES, `official-${name}.wxss`);
    if (!fs.existsSync(src)) { ok(false, `官方源样式存在：${name}.wxss`); continue; }
    if (!fs.existsSync(copy)) { ok(false, `修仙分包有样式副本：official-${name}.wxss`); continue; }
    const a = fs.readFileSync(src);
    const b = fs.readFileSync(copy);
    ok(a.equals(b), `official-${name}.wxss 与官方 ${name}.wxss 逐字节一致`);
  }
  /* 修仙自己新增的样式另放一个文件，且不许叫 official-* （那是副本的命名）。 */
  const extra = fs.readdirSync(X_STYLES).filter((f) => f.endsWith('.wxss') && !f.startsWith('official-'));
  ok(extra.length === 0, extra.length ? `修仙自造样式请并进页面 wxss：${extra.join('、')}` : '修仙没有另立一套全局样式');
}

/* ══════════════════════════════════════════════ ①b 全局样式 app.wxss */

section('全局样式 app.wxss：逐条取自官方，且每个类都有定义');
{
  const appPath = path.join(MP, 'app.wxss');
  ok(fs.existsSync(appPath), 'app.wxss 存在');

  /* ① app.wxss 是**生成物**：与从官方来源提取的结果逐字节一致。 */
  const expected = buildAppWxss();
  const actual = fs.readFileSync(appPath);
  ok(actual.equals(expected), `app.wxss 与提取结果逐字节一致（${actual.length} 字节）`);

  /* ② app.wxss 的每一段都来自官方那份（不许自造任何样式）。 */
  const officialText = fs.readFileSync(path.join(OFFICIAL, 'app.wxss'), 'utf8');
  const actualText = actual.toString('utf8');
  ok(actualText.startsWith(APP_WXSS_NOTE), 'app.wxss 顶部是「这是生成物」的说明');
  const body = actualText.slice(APP_WXSS_NOTE.length);   /* 去掉顶部说明 */
  let ptr = 0;
  let kept = 0;
  let isSubsequence = true;
  for (const chunk of splitTopLevel(officialText)) {
    if (body.startsWith(chunk.full, ptr)) { ptr += chunk.full.length; kept++; }
  }
  ok(isSubsequence && ptr === body.length && kept > 0,
    `app.wxss 的每一段都能在官方那份里逐字找到（保留 ${kept} 段，其余整条删掉）`);

  /* ③ 类覆盖：wxml 里用到的每个类，都得在 app.wxss 或页面层 wxss 里有定义。
   *    ⚠ 官方自己也没定义的那几个（`p-scene` / `statbars` 之类）列在白名单里 ——
   *      那是**官方现状**，不许我们偷偷「补」一套自造样式上去。 */
  const defined = new Set();
  const walkFiles = (dir, out) => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkFiles(p, out);
      else if (e.name.endsWith('.wxss')) out.push(p);
    }
    return out;
  };
  for (const file of walkFiles(MP, [])) {
    const code = fs.readFileSync(file, 'utf8');
    for (const m of code.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) defined.add(m[1]);
  }
  const used = collectUsedClasses(MP);
  const missing = [...used.names].filter((n) => !defined.has(n)).sort();
  /* 官方 1in8b 里同样没有定义的那几个（照抄官方现状，不是我们漏了）。 */
  const ALLOW_UNDEFINED = [
    'hd-t', 'p-breakthrough', 'p-ending', 'p-id', 'p-inv', 'p-passage', 'p-people',
    'p-practice', 'p-scene', 'p-sect', 'p-stats', 'p-wealth', 'starred', 'statbars',
  ];
  const unexpected = missing.filter((n) => !ALLOW_UNDEFINED.includes(n));
  ok(unexpected.length === 0, unexpected.length
    ? `这些类哪一层都没定义：${unexpected.join('、')}`
    : `每个用到的类都有定义（${used.names.size} 个类；官方本身也没定义的 ${missing.length} 个已列白名单）`);

  /* ④ app.wxss 里不许出现自造类（`x-` 前缀）。 */
  const selfMade = [...actual.toString('utf8').matchAll(/class="[^"]*\bx-[a-z-]+/g)];
  ok(selfMade.length === 0, 'app.wxss 里没有自造的视觉类');
}

/* ══════════════════════════════════════════════ ② 结构对齐 */

section('三页结构与官方类名一致');

const PAGES = path.join(MP, 'subpkg', 'xianxia', 'pages');
const XIANXIA = path.join(MP, 'subpkg', 'xianxia');

/** 每一页必须用到的官方类名（照官方 life.wxml / roll.wxml / past.wxml）。 */
const REQUIRED = {
  'roll/roll': ['roll-stage', 'roller', 'roller-name', 'roller-meta', 'cert', 'cert-band', 'cert-body',
    'cert-name', 'cert-story', 'cert-pace', 'fields', 'fcell', 'fval', 'certmap', 'certmap-cap',
    'odds-line', 'cert-foot', 'cert-after', 'ghost', 'cta'],
  'life/life': ['topbar', 'topbar-inner', 'brand', 'agebox', 'age-num', 'age-yr', 'prog',
    'speed', 'pause', 'sps', 'exitbtn', 'morebtn', 'more', 'ff',
    'panel', 'panel-h', 'minibar', 'mb-st', 'mb-i', 'mb-fo', 'mb-sh',
    'feed-item', 'fam', 'row', 'fk', 'fv', 'chips', 'chip', 'note', 'hint',
    'scrim', 'dec', 'hd', 'bd', 'ch', 'd-h2', 'd-p', 'fact', 'decmin', 'decpeek'],
  'past/past': ['dec', 'hd', 'hd-t', 'sheet-x', 'bd', 'sheet-bd', 'cm-sub', 'shf', 'shf-i', 'shf-f',
    'shf-cv', 'shf-n', 'shf-s', 'shf-card', 'shf-nm', 'shf-c1', 'shf-c2', 'kp-row', 'pl-hint'],
};

for (const [page, classes] of Object.entries(REQUIRED)) {
  const file = path.join(PAGES, `${page}.wxml`);
  if (!fs.existsSync(file)) { ok(false, `${page}.wxml 存在`); continue; }
  const wxml = fs.readFileSync(file, 'utf8');
  const missing = classes.filter((c) => !new RegExp(`class="[^"]*\\b${c}\\b`).test(wxml));
  ok(missing.length === 0, missing.length
    ? `${page} 缺官方类名：${missing.join('、')}`
    : `${page} 用上了 ${classes.length} 个官方类名`);
}

/* 不许再出现自造的一整套视觉类。 */
{
  const offenders = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.wxml') || e.name.endsWith('.wxss')) {
        const code = fs.readFileSync(p, 'utf8');
        const m = code.match(/class="[^"]*\bx-[a-z-]+/g) || [];
        for (const hit of m) offenders.push(`${path.relative(MP, p)}: ${hit}`);
      }
    }
  };
  walk(MP);
  ok(offenders.length === 0, offenders.length
    ? `还有自造视觉类：${offenders.slice(0, 5).join('；')}`
    : '小程序里没有自造的视觉类（全部用官方那套）');
}

/* ══════════════════════════════════════════════ ③ 倍速档位 */

section('倍速档位与官方一致');
{
  const official = path.join(OFFICIAL_SOURCES, 'life.js');
  const src = fs.readFileSync(official, 'utf8');
  const parsed = acorn.parse(src, {ecmaVersion: 2022, sourceType: 'script'});
  let officialSpeeds = null;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === 'VariableDeclarator' && node.id && node.id.name === 'SPEEDS' && node.init) {
      officialSpeeds = node.init.elements.map((e) => e.value);
    }
    for (const k of Object.keys(node)) {
      if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
      walk(node[k]);
    }
  };
  walk(parsed);
  ok(!!officialSpeeds, '官方 life.js 里读得到 SPEEDS');
  const ours = loadCjs(path.join(MP, 'subpkg', 'xianxia', 'bridge', 'page-model.js')).SPEEDS;
  ok(JSON.stringify(ours) === JSON.stringify(officialSpeeds),
    `倍速档位与官方一致（官方 ${JSON.stringify(officialSpeeds)}）`);
  const wxml = fs.readFileSync(path.join(PAGES, 'life', 'life.wxml'), 'utf8');
  ok(/class="sps"/.test(wxml), '倍速按钮在官方那个 .sps 分段控件里');
  ok(/class="sps-b/.test(wxml), '倍速按钮用官方那个 .sps-b 类');
}

/* ══════════════════════════════════════════════ ④ 转盘帧数 */

section('转盘与官方一致');
{
  const official = path.join(OFFICIAL_SOURCES, 'roll.js');
  const src = fs.readFileSync(official, 'utf8');
  const parsed = acorn.parse(src, {ecmaVersion: 2022, sourceType: 'script'});
  let officialFrames = null;
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node.type === 'VariableDeclarator' && node.id && node.id.name === 'FRAMES' && node.init) {
      officialFrames = node.init.value;
    }
    for (const k of Object.keys(node)) {
      if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
      walk(node[k]);
    }
  };
  walk(parsed);
  ok(!!officialFrames, '官方 roll.js 里读得到 FRAMES');
  const ours = loadCjs(path.join(MP, 'subpkg', 'xianxia', 'bridge', 'roller.js')).FRAMES;
  ok(ours === officialFrames, `转盘帧数与官方一致（${ours} 帧）`);

  /* 官方那份在主包里（修仙分包不能 require 它）⇒ 只比对数值，不比对代码。 */
  const rollerSrc = fs.readFileSync(path.join(MP, 'subpkg', 'xianxia', 'bridge', 'roller.js'), 'utf8');
  ok(/40 \+ Math\.pow\(i \/ FRAMES, 3\) \* 380/.test(rollerSrc), '转盘节奏公式与官方一致（越接近定格越慢）');
  ok(/setTimeout\(function \(\) \{ if \(!stopped\) onDone\(\); \}, 650\)/.test(rollerSrc),
    '定格后停 650 ms 再出登记卡（与官方一致）');
}

/* ══════════════════════════════════════════════ ⑤ 雕版公式 */

section('雕版底纹与官方逐值一致');
{
  const official = loadCjs(path.join(OFFICIAL_SOURCES, 'idcard.js'));
  const ours = loadCjs(path.join(MP, 'subpkg', 'xianxia', 'art', 'guilloche.js'));
  const a = official.guilloche(720, 420);
  const b = ours.guilloche(720, 420);
  ok(JSON.stringify(a) === JSON.stringify(b), 'guilloche(720,420) 输出与官方逐值一致');
  ok(a.length === 14 && a[0].length > 100, `确实画出了 14 条曲线（每条 ${a[0].length / 2} 个点）`);
}

/* ══════════════════════════════════════════════ ⑥ 字号口径 */

section('字号口径与官方一致');

{
  /* 官方小程序 life.wxss 的字号规则写的是 **标签选择器** `button b`，
   * 而小程序的 WXML 里没有 <b>（scripts/check.mjs 明令禁止 HTML 标签）⇒
   * 官方那条在小程序端**匹配不上** `<text class="b">`。
   * 官方 HTML 端则是 `.dec .ch button b { font-size:15px }`
   *   （apps/preview/.../base.css：1480 行）。
   * ⇒ 修仙页面必须自己补一条 `.dec .ch button .b { font-size:30rpx }`
   *    （30rpx = 15px），否则选项正文会落到父级 button 的字号上。 */
  const lifeWxss = fs.readFileSync(path.join(PAGES, 'life', 'life.wxss'), 'utf8');
  const officialLife = fs.readFileSync(path.join(ENGINE_STYLES, 'life.wxss'), 'utf8');
  const bRule = lifeWxss.match(/\.dec \.ch button \.b\s*\{([^}]*)\}/);
  ok(!!bRule, '修仙页面补了 `.dec .ch button .b` 的字号规则（官方那条在小程序端失效）');
  if (bRule) {
    ok(/font-size:\s*30rpx/.test(bRule[1]),
      `选项正文 .b 是 30rpx = 15px（与官方 HTML 端 15px 一致）：${bRule[1].trim()}`);
  }

  /* 副行必须用官方**已有**的 `.wx-small`（25rpx = 12.5px）；
   * `.s` 在 `.ch`（非 control）里**完全没有规则** ⇒ 用了会继承 30rpx。
   * ⚠ 例外：`.decpeek .dp-t .s` 是**官方自带规则**的（12.5px，life.wxss:467），
   *   那个位置用 `.s` 是对的 ⇒ 只查 `.ch` 按钮里有没有 `.s`。 */
  const lifeWxml = fs.readFileSync(path.join(PAGES, 'life', 'life.wxml'), 'utf8');
  const chButtons = lifeWxml.match(/<view class="ch">[\s\S]*?<\/view>/g) || [];
  const badS = [];
  for (const block of chButtons) {
    if (/class="s"/.test(block)) badS.push(block.slice(0, 60).replace(/\s+/g, ' '));
  }
  ok(badS.length === 0, badS.length
    ? `选项列表里还有无规则的 .s 类：${badS[0]}`
    : '选项列表（.ch）里没有用无规则的 `.s` 类');
  ok(/class="wx-small"/.test(lifeWxml), '选项副行用官方已有的 `.wx-small`（25rpx = 12.5px）');
  /* `.decpeek .dp-t .s` 是官方自带规则的，保留。 */
  ok(/\.decpeek \.dp-t \.s\s*\{[^}]*font-size:\s*12\.5px/.test(officialLife),
    '官方副本里 .decpeek .dp-t .s 是 12.5px（那个位置用 .s 是对的）');

  /* 上游网页端 `.sheet-note { font-size:11px }` */
  const noteRule = lifeWxss.match(/\.sheet-note\s*\{([^}]*)\}/);
  ok(!!noteRule && /font-size:\s*11px/.test(noteRule[1]),
    `决策卡底注 .sheet-note 是 11px（与网页端一致）：${noteRule ? noteRule[1].trim() : '无规则'}`);

  /* 官方样式副本里 .wx-small 的值必须仍是 25rpx（不许偷偷改副本）。 */
  const smallRule = officialLife.match(/\.dec \.ch button \.wx-small\s*\{([^}]*)\}/);
  ok(!!smallRule && /font-size:\s*25rpx/.test(smallRule[1]),
    '官方副本里 .wx-small 仍是 25rpx（12.5px）');
}

/* ══════════════════════════════════════════════ ⑦ 转盘来源 */

section('转盘的内容来自引擎的 birthFacts');

{
  /* 上游网页端（apps/preview/app.js:91,95）：
   *   roller-name ← f.name（角色名）
   *   roller-meta ← f.place.name + ' · ' + f.address + ' · ' + f.household.name
   * 中间帧：birthFacts(seed + ':轮转:' + turn++) */
  const model = loadCjs(path.join(MP, 'subpkg', 'xianxia', 'bridge', 'page-model.js'));
  ok(model.rollPlaces === undefined, '自造的大陆候选池 rollPlaces 已删掉（不能用 GEOGRAPHY 列表）');
  ok(typeof model.rollerFacts === 'function', 'rollerFacts 存在（按 turn 生成出生事实）');
  ok(typeof model.finalFacts === 'function', 'finalFacts 存在（定格那一帧）');

  const engine = loadCjs(path.join(MP, 'subpkg', 'xianxia', 'runtime', 'engine.js'));
  ok(typeof engine.birthFacts === 'function', '引擎导出了 birthFacts（转盘的事实来源）');

  const seed = '门禁-种子-' + Date.now();
  const f0 = model.rollerFacts(seed, 0);
  const f1 = model.rollerFacts(seed, 1);
  ok(!!f0.name, `转盘大字是角色名：${f0.name}`);
  ok(f0.meta.split(' · ').length === 3, `转盘小字是三段（大陆 · 住址 · 出身）：${f0.meta}`);
  ok(f0.name !== f1.name || f0.meta !== f1.meta, '每一帧换一整套出生事实');

  /* 定格那一帧必须与这段人生真正的事实一致。 */
  const run = engine.createRun({seed, id: 'life-gate'});
  const final = model.finalFacts(seed);
  ok(final.name === run.player.name, '定格帧的名字 === createRun(seed) 的名字（同源）');
  ok(final.meta.indexOf(run.birth.address) >= 0, '定格帧的小字含真正的出生地');

  /* 页面必须用这两个函数，不能自己拼。 */
  const rollSrc = fs.readFileSync(path.join(PAGES, 'roll', 'roll.js'), 'utf8');
  ok(/rollerFacts/.test(rollSrc) && /finalFacts/.test(rollSrc), '出生页用了 rollerFacts / finalFacts');
}

/* ══════════════════════════════════════════════ ⑦′ 第四轮：外壳复刻的硬规矩 */

section('2026-11-04 第四轮：外壳复刻的硬规矩');
{
  const lifeWxml = fs.readFileSync(path.join(PAGES, 'life', 'life.wxml'), 'utf8');

  /* ① 顶栏**不许**给整条 `.topbar-inner` 加胶囊让位。
   *   官方生命页没有这个 padding-right（倍速组本来就在第二行、落在胶囊下方）。
   *   之前修仙加了 ~102px ⇒ 内容宽从 373px 被压到 271px，
   *   而倍速组本身 298px 宽 ⇒ 倍速组自己折行，顶栏变成三行（用户真机反馈）。 */
  const innerLine = (lifeWxml.match(/<view class="topbar-inner"[^>]*>/) || [''])[0];
  ok(!/padding-right/.test(innerLine),
    `顶栏没有给 .topbar-inner 加 padding-right（官方没有，别自己加）：${innerLine.trim()}`);
  const lifeJs = fs.readFileSync(path.join(PAGES, 'life', 'life.js'), 'utf8');
  ok(!/topPadRight/.test(lifeJs), '人生页不再用 topPadRight 给顶栏让位');

  /* ② 官方外壳的类名必须齐备（壳照官方 1in8b 小程序）。
   * ⚠ 2026-11-05（第五轮，用户拍板）：删掉 4 个不再出现的类 ——
   *   `p-focus`（整张「今年的重心」卡片没了）、`status` / `status-b`
   *   （「人生已暂停 / 日子正在过去」状态行没了）、`baby-hint`
   *   （只在那张重心卡里用）。
   *   `chips` / `chip` 仍在用（随身行囊卡片）⇒ 保留。 */
  const officialClasses = [
    'topbar', 'topbar-inner', 'agebox', 'age-num', 'age-yr', 'speed', 'sps', 'sps-b',
    'exitbtn', 'morebtn', 'more', 'ff', 'minibar', 'mb-st', 'mb-i', 'mb-n', 'mb-v', 'mb-b',
    'mb-fo', 'mb-sh', 'panel', 'panel-h', 'foldbtn', 'folded', 'p-feed', 'feed-item', 'stb',
    'chips', 'chip', 'p-stats', 'statbars',
    'stat', 'hr', 'idcard', 'id-top', 'id-in', 'id-portrait', 'id-right', 'id-name', 'id-dl',
    'id-row', 'id-dt', 'id-dd', 'mrz', 'qdots', 'fam', 'row', 'fk', 'fv', 'prog', 'hint',
    'note', 'scrim', 'dec', 'hd', 'hd-r', 'bd', 'd-h2', 'd-p', 'fact', 'ch', 'k', 'b',
    'sheet-note', 'sheet-x', 'sheet-bd', 'decpeek', 'dp-t', 'cta', 'ghost', 'decs',
  ];
  const missing = officialClasses.filter((c) => !new RegExp(`class="[^"]*\\b${c}\\b`).test(lifeWxml)
    && !new RegExp(`class="[^"]*\\b${c}\\b`).test(fs.readFileSync(path.join(PAGES, 'life', 'life.wxml'), 'utf8')));
  ok(missing.length === 0, missing.length
    ? `页面里少了官方类名：${missing.join('、')}`
    : `官方外壳的类名齐备（${officialClasses.length} 个）`);

  /* ③ **`.ch button` 每个选项最多 3 个直接子元素**（官方那条隐含约定）。
   *   官方 `.dec .ch button` 是两列网格（标记列 1.6em + 内容列），
   *   标记占两行 ⇒ 标记右边只放得下**两行**内容。
   *   多放一个 ⇒ 那个元素被自动放到第 3 行第 1 列（1.6em 窄列）⇒ 文字竖排
   *   （用户 2026-11-04 真机反馈：「人生地图」那几行字竖着写）。 */
  const optionButtons = [];
  {
    const re = /<button[^>]*>[\s\S]*?<\/button>/g;
    let m;
    while ((m = re.exec(lifeWxml))) {
      /* 只查带官方那个标记 `.k` 的选项按钮。 */
      if (!/class="k"/.test(m[0])) continue;
      optionButtons.push(m[0]);
    }
  }
  ok(optionButtons.length > 0, `找到 ${optionButtons.length} 个选项按钮（官方 .ch 里的那些）`);
  const tooMany = [];
  for (const b of optionButtons) {
    const inner = b.replace(/^<button[^>]*>/, '').replace(/<\/button>$/, '');
    let depth = 0, count = 0;
    const tags = inner.match(/<\/?[a-zA-Z][^>]*>/g) || [];
    for (const tag of tags) {
      if (/^<\//.test(tag)) { depth--; continue; }
      const selfClose = /\/>$/.test(tag);
      if (depth === 0 && !selfClose) count++;
      if (!selfClose) depth++;
    }
    if (count > 3) tooMany.push(`${count} 个子元素：${b.slice(0, 70).replace(/\s+/g, ' ')}`);
  }
  ok(tooMany.length === 0, tooMany.length
    ? `选项按钮超过 3 个直接子元素（会掉进 1.6em 的标记列被压成竖排）：${tooMany[0]}`
    : '选项按钮的直接子元素都 ≤ 3（官方网格放得下）');

  /* ④ 雷达图的字号与字体：照上游**实际渲染值**（12.1px / 10.9px），
   *   且字体族必须与 app.wxss 的 --f-body / --f-mono 同源
   *   （canvas 拿不到 CSS 变量，只能写死 ⇒ 必须钉住）。 */
  const radarSrc = fs.readFileSync(path.join(XIANXIA, 'art', 'radar.js'), 'utf8');
  ok(/LABEL_CSS_PX\s*=\s*12\.1/.test(radarSrc), '雷达标签的目标字号是 12.1px（上游 SVG 的实际渲染值）');
  ok(/VALUE_CSS_PX\s*=\s*10\.9/.test(radarSrc), '雷达数值的目标字号是 10.9px（上游 SVG 的实际渲染值）');
  ok(/W\s*\/\s*displayWidth/.test(radarSrc) || /unit\s*=\s*W\s*\/\s*displayWidth/.test(radarSrc),
    '雷达字号按画布实际显示宽换算（不再写死 13px/11px）');
  /* 注释里会写「之前是 '13px sans-serif'」这类说明 ⇒ 先把注释去掉再查。 */
  const radarCode = radarSrc.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  ok(!/'\d+(\.\d+)?px\s+sans-serif'/.test(radarCode),
    '雷达图里没有写死的「Npx sans-serif」字号（按显示宽换算 + 全局字体族）');
  const appWxss = fs.readFileSync(path.join(MP, 'app.wxss'), 'utf8');
  const bodyFont = (appWxss.match(/--f-body:\s*([^;]+);/) || ['', ''])[1];
  const monoFont = (appWxss.match(/--f-mono:\s*([^;]+);/) || ['', ''])[1];
  const bodyStack = bodyFont.split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
  const monoStack = monoFont.split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
  const labelFont = (radarSrc.match(/FONT_LABEL\s*=\s*'([^']+)'/) || ['', ''])[1];
  const valueFont = (radarSrc.match(/FONT_VALUE\s*=\s*'([^']+)'/) || ['', ''])[1];
  ok(bodyStack.every((f) => labelFont.indexOf(f) >= 0),
    `雷达标签的字体族与 app.wxss 的 --f-body 同源：${labelFont}`);
  ok(monoStack.every((f) => valueFont.indexOf(f) >= 0),
    `雷达数值的字体族与 app.wxss 的 --f-mono 同源：${valueFont}`);

  /* ⑤ 官方样式副本仍逐字节一致（第四节已经查过，这里再钉一次做交叉保险）。 */
  for (const name of ['official-life.wxss', 'official-roll.wxss', 'official-sheet.wxss', 'official-shelf.wxss']) {
    const ours = fs.readFileSync(path.join(XIANXIA, 'styles', name));
    const officialName = name.replace('official-', '');
    const official = fs.readFileSync(path.join(ENGINE_STYLES, officialName));
    ok(Buffer.compare(ours, official) === 0, `官方样式副本仍逐字节一致：${name}`);
  }
}

/* ══════════════════════════════════════════════ ⑧ 隔离没破 */

section('修仙仍然与官方零耦合');{
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js')) files.push(p);
    }
  };
  walk(MP);
  const bad = [];
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    if (/require\([^)]*subpkg\/(engine|logic|logic2|logic3|data|data2|ldata)\//.test(code)) {
      bad.push(path.relative(MP, f));
    }
    if (/require\([^)]*\/idcard\.js/.test(code)) {
      bad.push(path.relative(MP, f) + '（官方主包模块）');
    }
  }
  ok(bad.length === 0, bad.length ? `引用了官方模块：${bad.join('、')}` : '修仙分包不引用官方任何模块');
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
