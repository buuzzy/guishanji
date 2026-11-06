#!/usr/bin/env node
/**
 * test-xianxia-art.mjs — 修仙画面「与上游逐笔一致」门禁
 * ============================================================================
 *
 * 守的是什么
 * ----------
 * 小程序里的修仙画面是**移植**来的（浏览器 canvas → 小程序 canvas）。
 * 移植最容易出的问题是「看着差不多，其实少画了几笔」——
 * 而「差不多」在像素画里就是**不一样**。
 *
 * 怎么证明
 * --------
 * 把那份**原封不动**的参考实现（`apps/preview/`，= 本仓库自己的源码；
 * `vendor/xianxia-r12-art/` 锁着同一批字节，见最后那道断言）
 * 用我们的打包器装进 Node，给它四层**假画布**（每次 fillRect 都记下来），
 * 再把我们移植的那份（`miniprogram/subpkg/xianxia/art/scene.js`）
 * 用**同一份人生状态**画一遍，
 * 然后把两边的「每一笔（颜色 + 坐标 + 尺寸）」逐条比。
 *
 * ⚠ 比的是**行为**，不是源码长得像不像：
 *   上游那份是压缩过的 ESM，我们那份是重写过的 ES5 风格 ——
 *   源码当然不一样，但画出来的每一个色块必须一模一样。
 *
 * 比三样东西
 * ----------
 *   ① 像素场景（cultivation-pixel.js）：多个场景 × 明暗两套主题；
 *   ② 点阵大陆地图（continent-atlas.js）：点阵、路线、标注；
 *   ③ 调色板（pixel-style.js）：我们的产物 = 上游原文（逐字节）。
 *
 * ⚠ 为什么必须用「同一份人生状态」：
 *   画面跟着状态变（在哪、在做什么、有谁同行）⇒ 两边喂不同状态就没法比。
 *   所以这里造几段**确定的**人生（固定种子），两边都用同一段。
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import {bundle} from './lib/xianxia-bundle.mjs';

const require = createRequire(import.meta.url);

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

/* ══════════════════════════════════════════════ 位置 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** 参考实现 = **本仓库自己的** `apps/preview/`（与 vendor 快照逐字节相同，见下面那道断言）。 */
const RULES = ROOT;
const ART = ROOT;
/** vendor 里的画面快照（历史证据：当年锁下的字节，不再是参考实现的来源）。 */
const ART_VENDOR = path.join(ROOT, 'vendor', 'xianxia-r12-art');
const MP = path.join(ROOT, 'miniprogram');

/* ══════════════════════════════════════════════ 假画布 */

/**
 * 一个会**记账**的画布上下文。
 * 记的是「玩家最终看到的每一个色块」。
 */
function makeRecorder() {
  const ops = [];
  const state = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    globalAlpha: 1,
    lineWidth: 1,
    font: '10px sans-serif',
    textAlign: 'start',
  };
  const ctx = {
    set fillStyle(v) { state.fillStyle = String(v); },
    get fillStyle() { return state.fillStyle; },
    set strokeStyle(v) { state.strokeStyle = String(v); },
    get strokeStyle() { return state.strokeStyle; },
    set globalAlpha(v) { state.globalAlpha = v; },
    get globalAlpha() { return state.globalAlpha; },
    set lineWidth(v) { state.lineWidth = v; },
    get lineWidth() { return state.lineWidth; },
    set font(v) { state.font = String(v); },
    get font() { return state.font; },
    set textAlign(v) { state.textAlign = String(v); },
    get textAlign() { return state.textAlign; },
    clearRect(x, y, w, h) { ops.push(['clear', x, y, w, h]); },
    fillRect(x, y, w, h) { ops.push(['fill', state.fillStyle, x, y, w, h]); },
    beginPath() { ops.push(['begin']); },
    closePath() { ops.push(['close']); },
    moveTo(x, y) { ops.push(['move', x, y]); },
    lineTo(x, y) { ops.push(['line', x, y]); },
    arc(x, y, r, a1, a2) { ops.push(['arc', x, y, r, a1, a2]); },
    fill() { ops.push(['fillop', state.fillStyle, state.globalAlpha]); },
    stroke() { ops.push(['strokeop', state.strokeStyle, state.globalAlpha, state.lineWidth]); },
    setLineDash(d) { ops.push(['dash', (d || []).join(',')]); },
    fillText(t, x, y) { ops.push(['text', String(t), x, y, state.fillStyle, state.font, state.textAlign]); },
    measureText(t) { return {width: String(t).length * 6}; },
  };
  return {ctx, ops};
}

/** 把上游那份的「四层画布」假出来。 */
function fakeRoot(layers) {
  const canvases = {
    sky: {className: 'sky'},
    back: {className: 'back'},
    mid: {className: 'mid'},
    front: {className: 'front'},
  };
  for (const [name, holder] of Object.entries(canvases)) {
    holder.width = 0;
    holder.height = 0;
    holder.getContext = () => layers[name].ctx;
  }
  const list = [canvases.sky, canvases.back, canvases.mid, canvases.front];
  return {
    dataset: {},
    clientWidth: 320,
    setAttribute() {},
    querySelectorAll() { return list; },
    querySelector(sel) {
      const key = String(sel).replace(/^\./, '');
      return canvases[key] || null;
    },
  };
}

/* ══════════════════════════════════════════════ 装上游那份 */

section('装载上游参考实现');

const artLockPath = path.join(ART_VENDOR, 'baseline.lock.json');
ok(fs.existsSync(artLockPath), '画面锁定快照存在（vendor/xianxia-r12-art）');
const artLock = JSON.parse(fs.readFileSync(artLockPath, 'utf8'));

/* 规则 + 画面 合成一张模块表（画面文件要 import 规则模块）。 */
function readModule(id) {
  return fs.readFileSync(path.join(RULES, id), 'utf8');
}

function closureOf(entry) {
  const modules = new Map();
  const queue = [entry];
  while (queue.length) {
    const id = queue.shift();
    if (modules.has(id)) continue;
    const src = readModule(id);
    modules.set(id, {src});
    const re = /(?:^|\n)\s*(?:import|export)[^;'"]*from\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src))) {
      const spec = m[1];
      const base = spec.startsWith('./') ? spec.slice(2) : spec;
      const dir = id.includes('/') ? id.slice(0, id.lastIndexOf('/')) : '';
      const joined = dir ? `${dir}/${base}` : base;
      const dep = joined.split('/').reduce((acc, part) => {
        if (part === '.' || part === '') return acc;
        if (part === '..') return acc.includes('/') ? acc.slice(0, acc.lastIndexOf('/')) : '';
        return acc ? `${acc}/${part}` : part;
      }, '');
      queue.push(dep);
    }
  }
  return modules;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xianxia-art-'));

function loadUpstream(entry, exportsMap) {
  const code = bundle(closureOf(entry), [entry], {exportsMap});
  const file = path.join(tmp, entry.replace(/[\\/]/g, '_') + '.cjs');
  fs.writeFileSync(file, code);
  return require(file);
}

const upstreamScene = loadUpstream('apps/preview/cultivation-pixel.js', {
  'apps/preview/cultivation-pixel.js': ['registerScene', 'drawScene'],
});
ok(typeof upstreamScene.registerScene === 'function', '上游像素场景装得进 Node');

const upstreamAtlas = loadUpstream('apps/preview/continent-atlas.js', {
  'apps/preview/continent-atlas.js': ['drawMap'],
});
ok(typeof upstreamAtlas.drawMap === 'function', '上游点阵地图装得进 Node');

/* ══════════════════════════════════════════════ 我们那份 */

const ourScene = loadCjs(path.join(MP, 'subpkg', 'xianxia', 'art', 'scene.js'));
const ourAtlas = loadCjs(path.join(MP, 'subpkg', 'xianxia', 'art', 'atlas.js'));
const engine = loadCjs(path.join(MP, 'subpkg', 'xianxia', 'runtime', 'engine.js'));
ok(typeof ourScene.drawScene === 'function', '我们的像素场景能加载');
ok(typeof ourAtlas.drawMap === 'function', '我们的点阵地图能加载');

/* ══════════════════════════════════════════════ ③ 调色板逐字节 */

section('调色板与人物像素');
{
  const upstreamStyle = fs.readFileSync(path.join(ART, 'apps', 'preview', 'pixel-style.js'), 'utf8');
  /* 我们的产物是**生成物**（babel 紧凑输出），不比字节 ⇒ 比**值**。 */
  const ourStyle = loadCjs(path.join(MP, 'subpkg', 'xianxia', 'runtime', 'pixel-style.js')).PIXEL_STYLE;
  const upstreamValue = JSON.parse(
    upstreamStyle
      .replace(/^\s*\/\/[^\n]*\n/gm, '')
      .replace('export const PIXEL_STYLE =', '')
      .trim()
      .replace(/;$/, '')
  );
  ok(JSON.stringify(ourStyle) === JSON.stringify(upstreamValue), '调色板与人物像素与上游逐值一致');
}

/* ══════════════════════════════════════════════ ① 像素场景逐笔比对 */

section('像素场景：与上游逐笔比对');

/** 造几段**确定**的人生，覆盖不同的场景。 */
function makeLives() {
  const lives = [];
  const seeds = ['松风有信', '山海-001', '云深不知处', '一剑霜寒'];
  for (let i = 0; i < seeds.length; i++) {
    const run = engine.createRun({seed: seeds[i], id: 'art-life-' + i});
    lives.push(run);
  }
  /* 再造一段「走了很久」的：场景（家 / 山门 / 战斗）会不一样。 */
  const late = engine.createRun({seed: '故纸残雪', id: 'art-life-late'});
  for (let i = 0; i < 260; i++) {
    if (late.phase !== 'life') break;
    if (late.pending) {
      const offered = engine.options(late) || [];
      const pick = offered.find((o) => o.enabled) || offered[0];
      if (!pick) break;
      engine.choose(late, pick.id);
      continue;
    }
    engine.advance(late, 1);
  }
  lives.push(late);
  /**
   * 「地火矿」场景（规则12 起会出现）。
   * ⚠ 随机模拟几乎走不到那条分支 ⇒ 这里**直接摆**出那个状态，
   *   保证画面门禁每次都比到它（否则我们漏画了也没人知道）。
   */
  const mine = engine.createRun({seed: '地火矿夜', id: 'art-life-mine'});
  mine.life.cultivation.revision9 = Object.assign({}, mine.life.cultivation.revision9, {arc: 'mine'});
  lives.push(mine);
  return lives;
}

const FIXED_NOW = 1000000;

/* ⚠ 上游用 `performance.now()` 取时间（决定动画帧 t = floor(now/180)）。
 *   不固定住它 ⇒ 两边画的不是同一帧 ⇒ 比出来的差异全是噪音。
 *   这里把它钉死，比完再还原。 */
const realPerformance = globalThis.performance;
globalThis.performance = {now: () => FIXED_NOW};

function compareOps(a, b) {
  if (a.length !== b.length) {
    return `笔数不同：上游 ${a.length} 笔 vs 我们 ${b.length} 笔`;
  }
  for (let i = 0; i < a.length; i++) {
    const x = JSON.stringify(a[i]);
    const y = JSON.stringify(b[i]);
    if (x !== y) {
      return `第 ${i + 1} 笔不同：上游 ${x} vs 我们 ${y}`;
    }
  }
  return '';
}

const lives = makeLives();
ok(lives.length >= 5, `造出 ${lives.length} 段人生用于比对`);

let sceneMismatch = '';
let sceneCompared = 0;
let sceneOps = 0;
/** 这次比到了哪些场景（用来断言「矿洞」这条分支真的被比过）。 */
const scenesSeen = new Set();

for (const run of lives) {
  try {
    const s = engine.sceneFor ? engine.sceneFor(run) : null;
    if (s) scenesSeen.add(s);
  } catch (error) {
    /* 取不到场景就跳过记录，不影响逐笔比对 */
  }
  for (const theme of ['light', 'dark']) {
    /* 上游 */
    const upLayers = {sky: makeRecorder(), back: makeRecorder(), mid: makeRecorder(), front: makeRecorder()};
    const upRoot = fakeRoot(upLayers);
    upstreamScene.registerScene(upRoot, run, theme);
    /* registerScene 内部用 performance.now() ⇒ 固定住它。 */
    /* 上游画完之后我们用同一个 now 重画一次（registerScene 已经画过一帧）。 */

    /* 我们那份 */
    const ourLayers = {sky: makeRecorder(), back: makeRecorder(), mid: makeRecorder(), front: makeRecorder()};
    const model = ourScene.buildModel(run, theme);
    ourScene.drawScene({sky: ourLayers.sky.ctx, back: ourLayers.back.ctx, mid: ourLayers.mid.ctx, front: ourLayers.front.ctx},
      model, FIXED_NOW, false);

    for (const name of ['sky', 'back', 'mid', 'front']) {
      const diff = compareOps(upLayers[name].ops, ourLayers[name].ops);
      if (diff && !sceneMismatch) {
        sceneMismatch = `${run.id} / ${theme} / ${name} 层：${diff}`;
      }
      sceneOps += ourLayers[name].ops.length;
      sceneCompared++;
    }
  }
}
ok(!sceneMismatch, sceneMismatch || `像素场景四层逐笔一致（比对 ${sceneCompared} 层）`);
/* ⚠ 反向验证：两边都空 ⇒ 「一致」是假的。
 *   门禁必须能抓住「什么都没画」这种最阴险的退化。 */
ok(sceneOps > 5000, `画面确实画出了东西（共 ${sceneOps} 笔，不是空跑）`);
/* ⚠ 覆盖度：规则12 的「地火矿」分支必须真的被比过，
 *   否则我们把它画漏了（或上游改了）门禁也不会红。 */
ok(scenesSeen.has('mine'), `比到了「地火矿」场景（本次覆盖：${[...scenesSeen].join('、') || '无'}）`);

/* ══════════════════════════════════════════════ ② 点阵地图逐笔比对 */

section('点阵大陆地图：与上游逐笔比对');

let mapMismatch = '';
let mapCompared = 0;
let mapOps = 0;
/* ⚠ S8：地图从「画四块大陆」改成「只画当前所在 + 走过的大陆」，
 *   于是「笔数 > 5000」这个判据（按画四块时的实测值定的）不再成立。
 *   ⇒ 换成**更严的等值判据**：画出的点阵必须**一个不多一个不少**，
 *     正好等于「本次该画的那几块大陆的点数之和」。
 *   这比「> 5000」严得多：漏画一块、多画一块、把半径改一下，都会报红。 */
let mapDots = 0;
let mapDotsExpected = 0;

for (const run of lives) {
  for (const theme of ['light', 'dark']) {
    const up = makeRecorder();
    const root = {
      dataset: {},
      clientWidth: 320,
      getContext: () => up.ctx,
    };
    upstreamAtlas.drawMap(root, run, theme);

    const our = makeRecorder();
    ourAtlas.drawMap(our.ctx, run, theme, 320);

    const diff = compareOps(up.ops, our.ops);
    if (diff && !mapMismatch) mapMismatch = `${run.id} / ${theme}：${diff}`;
    mapOps += our.ops.length;
    /* 点阵的圆点半径固定是 1.55（标记用的圆圈是 16 / 5 / 4）⇒ 按半径分出来。 */
    mapDots += our.ops.filter(op => op[0] === 'arc' && op[3] === 1.55).length;
    const view = engine.mapView ? engine.mapView(run) : {unlocked: []};
    let expect = 0;
    for (const g of ourAtlas.dots()) {
      if (view.unlocked.indexOf(g.id) >= 0) expect += g.points.length;
    }
    mapDotsExpected += expect;
    mapCompared++;
  }
}
ok(!mapMismatch, mapMismatch || `点阵地图逐笔一致（比对 ${mapCompared} 次）`);
ok(mapDots === mapDotsExpected,
  `地图画出的点阵一个不多一个不少（${mapDots} / 期望 ${mapDotsExpected}）`);
ok(mapDotsExpected > 0,
  `地图确实画出了东西（本次该画 ${mapDotsExpected} 个点，不是空跑）`);

/* ══════════════════════════════════════════════ ③ 像素肖像逐笔比对 */

/**
 * 2026-11-05 新增。
 *
 * 背景：用户真机反馈「角色卡片里的头像被过度缩小」。
 * 根因：`bridge/portrait.js` 把坐标空间按 `scale = 4` 放大成 96×120，
 * **却仍按 1 单位画像素** ⇒ 小人只有应有尺寸的 1/4，挤在画布左上角。
 * 修法：坐标空间改成与上游 SVG 同构（viewBox 0 0 24 30，每像素 1 单位）。
 *
 * ⚠ 这道断言**必须把 setTransform 也记下来**：
 *   画出来的矩形坐标两种写法完全一样（都是 1 单位），
 *   差别只在**缩放系数**（旧的 k = min(w/96, h/120)，新的 k = min(w/24, h/30)）
 *   ⇒ 只比 fillRect 的话，这个 bug 抓不住。
 */
section('像素肖像：与上游 SVG 逐笔等价');

{
  const ourPortrait = loadCjs(path.join(MP, 'subpkg', 'xianxia', 'bridge', 'portrait.js'));
  const PIXEL = loadCjs(path.join(MP, 'subpkg', 'xianxia', 'runtime', 'pixel-style.js')).PIXEL_STYLE;

  /** 记 setTransform 的假画布（上游那套 makeRecorder 不记变换，这里单独一个）。 */
  function makePortraitCtx() {
    const ops = [];
    const state = {fillStyle: '#000000'};
    const ctx = {
      set fillStyle(v) { state.fillStyle = String(v); },
      get fillStyle() { return state.fillStyle; },
      setTransform(a, b, c, d, e, f) { ops.push(['transform', a, b, c, d, e, f]); },
      clearRect(x, y, w, h) { ops.push(['clear', x, y, w, h]); },
      fillRect(x, y, w, h) { ops.push(['fill', state.fillStyle, x, y, w, h]); },
    };
    return {ctx, ops};
  }

  const EPS = 1e-9;
  const same = (a, b) => {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) if (!same(a[i], b[i])) return false;
      return true;
    }
    if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) < EPS;
    return a === b;
  };
  const cmpOps = (x, y) => {
    if (x.length !== y.length) return `笔数不同：${x.length} vs ${y.length}`;
    for (let i = 0; i < x.length; i++) {
      if (!same(x[i], y[i])) return `第 ${i + 1} 笔不同：${JSON.stringify(x[i])} vs ${JSON.stringify(y[i])}`;
    }
    return '';
  };

  /** 上游 SVG 的期望笔迹（`apps/preview/life-panels.js` 的 portrait()）。 */
  function expectedOps(width, height, dpr, sprite, colors, ground) {
    const ops = [];
    ops.push(['transform', dpr, 0, 0, dpr, 0, 0]);
    ops.push(['clear', 0, 0, width, height]);
    const k = Math.min(width / 24, height / 30);
    const ox = (width - 24 * k) / 2;
    const oy = (height - 30 * k) / 2;
    ops.push(['transform', dpr * k, 0, 0, dpr * k, dpr * ox, dpr * oy]);
    ops.push(['fill', ground, 0, 22, 24, 8]);
    for (let r = 0; r < sprite.length; r++) {
      for (let z = 0; z < sprite[r].length; z++) {
        const color = colors[sprite[r][z]];
        if (!color) continue;
        ops.push(['fill', color, z + 7, 25 - sprite.length + r, 1, 1]);
      }
    }
    return ops;
  }

  let mismatch = '';
  let compared = 0;
  /* 三种画布尺寸都测：身份卡 64×80（CSS px）、往期人生 48×60、宽幅 96×120。 */
  for (const size of [[64, 80], [48, 60], [96, 120]]) {
    for (const sex of ['M', 'F']) {
      for (const stage of ['adult', 'teen', 'child', 'baby']) {
        const dpr = 2;
        const rec = makePortraitCtx();
        const canvas = {width: 0, height: 0, getContext: () => rec.ctx};
        ourPortrait.drawFigure(canvas, size[0], size[1], stage, sex, dpr, 30);
        const sprite = PIXEL.PEOPLE[sex][stage];
        const want = expectedOps(size[0], size[1], dpr, sprite,
          ourPortrait.PORTRAIT_COLORS, ourPortrait.GROUND_COLOR);
        const diff = cmpOps(want, rec.ops);
        if (diff && !mismatch) mismatch = `${size.join('×')} / ${sex} / ${stage}：${diff}`;
        compared++;
      }
    }
  }
  ok(!mismatch, mismatch || `像素肖像与上游 SVG 逐笔等价（比对 ${compared} 次）`);

  /* 「不是空跑」+「不再被缩小」：小人覆盖宽度应当是画布的 9/24 ≈ 37.5%
   * （上游 SVG 的比例）。修之前是 9/96 ≈ 9.4% ⇒ 缩成一小点。 */
  {
    const rec = makePortraitCtx();
    const canvas = {width: 0, height: 0, getContext: () => rec.ctx};
    ourPortrait.drawFigure(canvas, 64, 80, 'adult', 'M', 2, 30);
    const fills = rec.ops.filter((o) => o[0] === 'fill');
    const pixels = fills.filter((o) => o[2] !== 0 || o[3] !== 22);
    let minX = Infinity;
    let maxX = -Infinity;
    for (const p of pixels) {
      minX = Math.min(minX, p[2]);
      maxX = Math.max(maxX, p[2] + p[4]);
    }
    const coverage = (maxX - minX) / 24;
    const ground = fills.find((o) => o[2] === 0 && o[3] === 22);
    ok(pixels.length > 50, `小人确实画出了像素（${pixels.length} 笔）`);
    ok(coverage > 0.3, `小人覆盖宽度占画布 ${(coverage * 100).toFixed(1)}%（上游约 37.5%，缩到 1/4 时只有 9.4%）`);
    ok(!!ground && ground[4] === 24, '底座铺满整个画布宽度（不再只有 1/4）');
  }
}

/* ══════════════════════════════════════════════ 快照没被手改 */

section('画面快照与锁定清单对得上');
{
  let allMatch = true;
  for (const file of artLock.files) {
    const target = path.join(ART_VENDOR, file.id);
    if (!fs.existsSync(target)) { allMatch = false; console.log(`    ✗ 缺文件 ${file.id}`); continue; }
    const bytes = fs.readFileSync(target);
    const sha = require('node:crypto').createHash('sha256').update(bytes).digest('hex');
    if (sha !== file.sha256 || bytes.length !== file.bytes) {
      allMatch = false;
      console.log(`    ✗ 被改过：${file.id}`);
    }
  }
  ok(allMatch, `画面快照的 ${artLock.files.length} 个文件与清单逐字节一致`);

  /* 快照与**本仓库的副本**是不是同一批字节（参考实现取自本仓库，得证明两者一样）。
   *
   * ⚠ S8 起：地图被**有意**改过（只画当前所在 + 走过的大洲）⇒ 本仓库的副本
   *   不再与迁移时那份逐字节一致。但那不是「偷偷改」——
   *   ⇒ 改成「要么一致，要么差异登记在 `docs/art-divergence.json` 里（写清为什么）」。
   *   没登记的差异照样报红：偷偷改参考实现会让「逐笔比对」变成自己跟自己比。 */
  const artDivergenceFile = path.join(ROOT, 'docs', 'art-divergence.json');
  const artDivergences = new Map();
  if (fs.existsSync(artDivergenceFile)) {
    const doc = JSON.parse(fs.readFileSync(artDivergenceFile, 'utf8'));
    for (const d of (doc.changes || [])) {
      if (!d.file || !d.why) {
        fail++;
        console.log(`    ✗ 画面差异台账里有条目没写清「哪个文件 / 为什么」`);
        continue;
      }
      artDivergences.set(d.file, d);
    }
  } else {
    fail++;
    console.log('    ✗ 缺少画面差异台账：docs/art-divergence.json');
  }

  let sameAsRepo = true;
  let divergedCount = 0;
  const usedDivergences = new Set();
  for (const file of artLock.files) {
    const inVendor = path.join(ART_VENDOR, file.id);
    const inRepo = path.join(ROOT, file.id);
    if (!fs.existsSync(inRepo) || !fs.existsSync(inVendor)
        || !fs.readFileSync(inRepo).equals(fs.readFileSync(inVendor))) {
      const note = artDivergences.get(file.id);
      if (note) {
        divergedCount++;
        usedDivergences.add(file.id);
        console.log(`    · 有意改动（已登记）：${file.id} —— ${note.why}`);
        continue;
      }
      sameAsRepo = false;
      console.log(`    ✗ 与本仓库副本不同：${file.id}`);
    }
  }
  ok(sameAsRepo,
    divergedCount
      ? `vendor 画面快照与本仓库副本的差异全部登记在案（${divergedCount} 处有登记，其余逐字节一致）`
      : 'vendor 画面快照与本仓库 apps/preview/ 的副本逐字节一致');

  /* 台账发霉：登记了、但实际没改 ⇒ 报红（防止有人偷偷把登记删掉）。 */
  const staleArt = [...artDivergences.keys()].filter(f => !usedDivergences.has(f));
  ok(staleArt.length === 0,
    '画面差异台账没有发霉（登记了、但实际没改的：' + (staleArt.join('、') || '无') + '）');
}

fs.rmSync(tmp, {recursive: true, force: true});
if (realPerformance) globalThis.performance = realPerformance;

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
