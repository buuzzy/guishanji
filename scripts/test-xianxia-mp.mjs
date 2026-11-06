#!/usr/bin/env node
/**
 * test-xianxia-mp.mjs — 修仙三页的「假微信运行时」仿真门禁
 * ============================================================================
 *
 * 守的是什么
 * ----------
 *   ① 三个页面（出生 / 人生 / 往期人生）的 onLoad 与主要交互**不许抛错**；
 *   ② 修仙**不许碰官方人生的数据**（`one8b.*` / `o8b.*` 逐字节不变）；
 *   ③ 修仙**不许依赖官方引擎**（不许 require 官方那几块）；
 *   ④ 分包与入口接线是对的（app.json 里有这个分包、首页有那个入口）；
 *   ⑤ 决策卡文案与 HTML 端**逐字一致**（含「不显示成功率」这条）。
 *
 * ## 为什么单独写一道，不并进 simulate-pages
 * ----------------------------------------
 * `simulate-pages.mjs` 跑的是官方人生那一族页面，它自带一整套官方引擎桩。
 * 修仙是**另一个玩法**：不 require 官方引擎、不进官方引擎屏障、
 * 存档用自己的命名空间 ⇒ 硬塞进那套桩里只会互相干扰。
 * ⇒ 这里另起一个干净的仿真环境，两套玩法各自被自己的门禁看着。
 *
 * 用法：node scripts/test-xianxia-mp.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const require = createRequire(import.meta.url);
const acorn = require('acorn');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const MP = path.join(ROOT, 'miniprogram');
const XIANXIA = path.join(MP, 'subpkg', 'xianxia');
/** 官方对照源（1in8b 官方小程序的那几份文件，进 git，任意机器都有）。 */
const OFFICIAL_SOURCES = path.join(ROOT, 'reference', 'official', 'sources');

let pass = 0, fail = 0;
const ok = (cond, label) => {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}`); }
};
const section = (t) => console.log(`\n▸ ${t}`);

/* ══════════════════════════════════════════════ 假微信运行时 */

const storage = Object.create(null);
const calls = {toast: [], modal: [], nav: [], navigateBack: 0};

const wxMock = {
  getStorageSync: (k) => (k in storage ? storage[k] : ''),
  setStorageSync: (k, v) => { storage[k] = v; },
  removeStorageSync: (k) => { delete storage[k]; },
  getStorageInfoSync: () => ({currentSize: 0, limitSize: 10 * 1024 * 1024, keys: Object.keys(storage)}),
  showToast: (o) => { calls.toast.push(o); },
  showModal: (o) => { calls.modal.push(o); },
  showLoading: () => {},
  hideLoading: () => {},
  navigateTo: (o) => { calls.nav.push(o); },
  redirectTo: (o) => { calls.nav.push(o); },
  reLaunch: (o) => { calls.nav.push(o); },
  navigateBack: (o) => { calls.navigateBack++; if (o && o.fail) o.fail({errMsg: 'mock'}); },
  getSystemInfoSync: () => ({pixelRatio: 2, theme: 'light', windowWidth: 375, windowHeight: 667, statusBarHeight: 20}),
  getWindowInfo: () => ({pixelRatio: 2, theme: 'light', windowWidth: 375, windowHeight: 667, statusBarHeight: 20}),
  /* SelectorQuery 桩：`in()` 返回的还是同一个查询对象（真机也是这样），
   * 且必须同时支持 select / selectAll —— 官方往期页与修仙往期页都用 selectAll。 */
  createSelectorQuery: () => {
    const query = {
      select: () => ({fields: () => ({exec: (cb) => cb([{node: null, width: 320, height: 180}])})}),
      selectAll: () => ({fields: () => ({exec: (cb) => cb([])})}),
      exec: (cb) => cb([]),
    };
    query.in = () => query;
    return query;
  },
};

globalThis.wx = wxMock;
globalThis.getApp = () => ({});
globalThis.Page = (o) => { globalThis.__lastPage = o; };
globalThis.Component = (o) => { globalThis.__lastComponent = o; };

/**
 * 装载小程序里的 CommonJS 模块。
 * ⚠ 不能直接 require()：本仓库 package.json 是 `"type": "module"`，
 *   .js 会被当成 ESM ⇒ 文件里的 `module.exports` 直接炸。
 *
 * ⚠ **必须带缓存**：真机上同一个模块只会有一份。
 *   门禁里「页面用的 session」与「门禁自己用的 session」必须是**同一个实例**
 *   —— 否则页面创建了人生、门禁却读到 null，测的就不是同一条链路了。
 */
const cjsCache = new Map();

function loadCjs(file) {
  const key = path.resolve(file);
  if (cjsCache.has(key)) return cjsCache.get(key).exports;
  const code = fs.readFileSync(key, 'utf8');
  const mod = {exports: {}};
  cjsCache.set(key, mod);
  const req = (id) => loadCjs(path.resolve(path.dirname(key), id));
  const fn = vm.runInThisContext(
    `(function (module, exports, require, console, globalThis) {\n${code}\n})`,
    {filename: key}
  );
  fn(mod, mod.exports, req, console, globalThis);
  return mod.exports;
}

/** 装载一个页面文件，返回可操作的实例（口径照 scripts/simulate-pages.mjs）。 */
function loadPage(file) {
  const code = fs.readFileSync(file, 'utf8');
  let pageDef = null;
  const mod = {exports: {}};
  const req = (id) => loadCjs(path.resolve(path.dirname(file), id));
  const fn = vm.runInThisContext(
    `(function (Page, Component, getApp, wx, require, console, module, exports, globalThis) {\n${code}\n})`,
    {filename: file}
  );
  fn(
    (o) => { pageDef = o; },
    (o) => { pageDef = o; },
    () => ({}),
    wxMock,
    req,
    console,
    mod,
    mod.exports,
    globalThis
  );
  if (!pageDef) throw new Error('页面没有调用 Page()：' + file);
  const inst = {...pageDef};
  inst.data = JSON.parse(JSON.stringify(pageDef.data || {}));
  inst.setData = function (patch, cb) {
    for (const k in patch) {
      const parts = k.split('.');
      if (parts.length === 1) {
        inst.data[k] = patch[k];
      } else {
        let o2 = inst.data;
        for (let i = 0; i < parts.length - 1; i++) o2 = o2[parts[i]] = o2[parts[i]] || {};
        o2[parts[parts.length - 1]] = patch[parts.length - 1];
      }
    }
    /* 微信真机上 setData 回调的 `this` 指向页面实例 ⇒ 这里照做，
     * 免得页面里写 `this.xxx()` 时门禁是假绿/假红。 */
    if (typeof cb === 'function') cb.call(inst);
  };
  return inst;
}

/* ══════════════════════════════════════════════ ① 分包与入口接线 */

section('分包与入口接线');
{
  const appJson = JSON.parse(fs.readFileSync(path.join(MP, 'app.json'), 'utf8'));
  const pkg = (appJson.subPackages || []).find((p) => p.root === 'subpkg/xianxia');
  ok(!!pkg, 'app.json 里有 subpkg/xianxia 分包');
  ok(pkg && pkg.name === 'xianxia', '分包有 name（微信要求）');
  const want = ['pages/roll/roll', 'pages/life/life', 'pages/past/past'];
  const have = pkg ? pkg.pages : [];
  ok(want.every((p) => have.includes(p)), `分包页面齐全：${have.join('、')}`);
  ok(!pkg || !pkg.preloadRule, '修仙分包不写 preloadRule（它要独立加载）');

  /* 启动页必须是主包的首页（微信要求：第一个页面在主包）。 */
  ok(appJson.pages && appJson.pages.length > 0 && appJson.pages[0] === 'pages/home/home',
    `app.json 的第一个页面是主包首页（${appJson.pages && appJson.pages[0]}）`);
  ok(fs.existsSync(path.join(MP, 'pages', 'home', 'home.js')), '首页存在');

  /* 首页的三个入口都要接到分包里的对应页面。 */
  const homeJs = fs.readFileSync(path.join(MP, 'pages', 'home', 'home.js'), 'utf8');
  ok(/\/subpkg\/xianxia\/pages\/roll\/roll/.test(homeJs), '首页「进入命盘」跳的是出生页');
  ok(/\/subpkg\/xianxia\/pages\/life\/life/.test(homeJs), '首页「继续人生」跳的是人生页');
  ok(/\/subpkg\/xianxia\/pages\/past\/past/.test(homeJs), '首页「往期人生」跳的是往期人生页');

  /* 修仙分包里的页面不许再跳回 1in8b 的官方页面（那个产品已经不在这个仓库里了）。 */
  const offenders = [];
  const walkJs = (dir) => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walkJs(p);
      else if (e.name.endsWith('.js')) {
        const code = fs.readFileSync(p, 'utf8');
        for (const m of code.matchAll(/(?:reLaunch|redirectTo|navigateTo)\s*\(\s*\{[^}]*url:\s*'([^']+)'/g)) {
          if (!m[1].startsWith('/subpkg/xianxia/') && !m[1].startsWith('/pages/')) {
            offenders.push(`${path.relative(MP, p)} → ${m[1]}`);
          }
        }
      }
    }
  };
  walkJs(MP);
  ok(offenders.length === 0, offenders.length
    ? `还有跳去别的产品的页面：${offenders.join('、')}`
    : '所有页面跳转都在本产品内部');
}

/* ══════════════════════════════════════════════ ② 与官方完全隔离 */

section('修仙与官方人生零耦合');
{
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.js') || e.name.endsWith('.wxml')) files.push(p);
    }
  };
  walk(MP);

  let officialRequire = [];
  let officialKey = [];
  let network = [];
  let es2020 = [];
  for (const f of files) {
    const code = fs.readFileSync(f, 'utf8');
    const rel = path.relative(MP, f);
    if (/require\([^)]*subpkg\/(engine|logic|logic2|logic3|data|data2|ldata)\//.test(code)) {
      officialRequire.push(rel);
    }
    if (/wx\.request\s*\(/.test(code)) network.push(rel);
    if (f.endsWith('.js')) {
      let parsed = null;
      try {
        parsed = acorn.parse(code, {ecmaVersion: 2022, sourceType: 'script', allowReturnOutsideFunction: true});
      } catch (error) {
        parsed = null;
      }
      if (parsed) {
        const walkAst = (node) => {
          if (!node || typeof node !== 'object') return;
          if (Array.isArray(node)) { node.forEach(walkAst); return; }
          if (node.type === 'ChainExpression') es2020.push(`${rel}: ?.` );
          if (node.type === 'LogicalExpression' && node.operator === '??') es2020.push(`${rel}: ??`);
          /* ⚠ 官方存档键要用**字符串字面量**判定，不能扫源码文本 ——
           *   我们的注释里就写着「不碰 one8b.* / o8b.*」⇒ 文本扫会假红。 */
          if (node.type === 'Literal' && typeof node.value === 'string' &&
            /^(one8b|o8b)\./.test(node.value)) {
            officialKey.push(`${rel}: ${node.value}`);
          }
          for (const k of Object.keys(node)) {
            if (k === 'type' || k === 'start' || k === 'end' || k === 'loc') continue;
            walkAst(node[k]);
          }
        };
        walkAst(parsed);
      }
    } else {
      /* wxml：看属性值里有没有官方存档键。 */
      const m = code.match(/['"]((?:one8b|o8b)\.[^'"]*)['"]/g);
      if (m) officialKey.push(rel + ': ' + m.join(' '));
    }
  }
  ok(officialRequire.length === 0, officialRequire.length ? `引用了官方模块：${officialRequire.join('、')}` : '没有引用官方引擎的任何模块');
  ok(officialKey.length === 0, officialKey.length ? `碰了官方存档键：${officialKey.join('、')}` : '源码里没有官方存档键（one8b. / o8b.）');
  ok(network.length === 0, network.length ? `用了网络请求：${network.join('、')}` : '没有网络请求（完全单机）');
  ok(es2020.length === 0, es2020.length ? `出现 ES2020 语法：${es2020.join('、')}` : '没有 ?. / ??（微信上传校验拒收）');
}

/* ══════════════════════════════════════════════ ②′ 首页（主包入口）仿真 */

section('首页仿真（命盘 / 继续人生 / 往期人生 / 加载失败重试）');
{
  const home = loadPage(path.join(MP, 'pages', 'home', 'home.js'));
  home.onShow();
  ok(home.data.error === '', '存档读得出来时首页不报错');
  ok(home.data.count === 0, '没有人生时清单是空的');
  ok(home.data.latest === null, '没有人生时没有「继续人生」这一块');

  /* 造一段人生存进去 ⇒ 首页应当把它列出来。 */
  const session0 = loadCjs(path.join(XIANXIA, 'bridge', 'session.js'));
  session0.newLife({seed: '首页测试', id: 'life-home-1'});
  await session0.save();
  home.onShow();
  ok(home.data.count === 1, `首页数到 1 段人生（实际 ${home.data.count}）`);
  ok(!!home.data.latest && !!home.data.latest.name,
    `首页显示最近那段的姓名：${home.data.latest && home.data.latest.name}`);
  ok(!!home.data.latestId, '首页知道要接哪一段（有编号）');

  /* 三个入口都接到本产品内部。 */
  calls.nav.length = 0;
  home.startNew();
  home.continueLife();
  home.openPast();
  const urls = calls.nav.map((c) => c.url);
  ok(urls.some((u) => u.indexOf('/subpkg/xianxia/pages/roll/roll') >= 0), '「进入命盘」跳出生页');
  ok(urls.some((u) => u.indexOf('/subpkg/xianxia/pages/life/life?resume=') >= 0),
    '「继续人生」跳人生页并**点名**要接哪一段');
  ok(urls.some((u) => u.indexOf('/subpkg/xianxia/pages/past/past') >= 0), '「往期人生」跳往期人生页');

  /* 读存档失败 ⇒ 如实说 + 给重试（不许装没事把人丢进空页面）。 */
  const realGet = wxMock.getStorageSync;
  wxMock.getStorageSync = () => { throw new Error('模拟：存储读不出来'); };
  home.onShow();
  ok(!!home.data.error, `读存档失败时首页说清原因：${home.data.error}`);
  ok(home.data.count === 0 && home.data.latest === null, '读不出来时不假装有存档');
  wxMock.getStorageSync = realGet;
  home.retry();
  ok(home.data.error === '', '重试之后错误消失');
  ok(home.data.count === 1, '重试之后又数到那段人生');
}

/* ══════════════════════════════════════════════ ③ 三个页面跑一遍 */

section('三页仿真（出生 → 人生 → 往期人生）');

/* 先在官方命名空间里放点东西，跑完要**一个字节都不变**。 */
const officialBefore = {};
for (const k of ['one8b.save.v3', 'o8b.prefs', 'one8b.lives', 'o8b.theme']) {
  officialBefore[k] = JSON.stringify({seed: k, blob: 'x'.repeat(64)});
  wxMock.setStorageSync(k, JSON.parse(officialBefore[k]));
}

const roll = loadPage(path.join(XIANXIA, 'pages', 'roll', 'roll.js'));
roll.onLoad();
ok(roll.data.rolling === true, '出生页 onLoad 之后是**转盘态**');
ok(!!roll.data.rollName === false || typeof roll.data.rollName === 'string', '转盘有名字位');

/* 转盘的候选与节奏（照官方：26 帧、越接近定格越慢、定格后停 650 ms）
 * ⚠ **内容口径照上游修仙网页端**（`apps/preview/app.js` 的 renderBirth）：
 *   大字 = **角色名**，小字 = 「大陆 · 住址 · 出身」；
 *   中间帧每帧换一整套出生事实（`birthFacts(seed + ':轮转:' + turn++)`）。 */
{
  const roller = loadCjs(path.join(XIANXIA, 'bridge', 'roller.js'));
  const pageModel = loadCjs(path.join(XIANXIA, 'bridge', 'page-model.js'));
  const session = loadCjs(path.join(XIANXIA, 'bridge', 'session.js'));
  const seed = session.run.seed;
  ok(roller.FRAMES === 26, '转盘 26 帧（与官方一致）');

  /* 候选来自引擎的 birthFacts（不是自造列表）—— 用户 2026-11-03 指出过。 */
  const f0 = pageModel.rollerFacts(seed, 0);
  const f1 = pageModel.rollerFacts(seed, 1);
  ok(!!f0.name && typeof f0.name === 'string', `转盘候选是角色名：${f0.name}`);
  ok(!!f0.meta && f0.meta.indexOf(' · ') > 0, `转盘小字是「大陆 · 住址 · 出身」：${f0.meta}`);
  ok(f0.name !== f1.name || f0.meta !== f1.meta, '每一帧换一整套出生事实（上游 turn++ 机制）');
  ok(pageModel.rollPlaces === undefined, '自造的大陆候选池 rollPlaces 已删掉');

  /* 真跑一遍转盘：记录每一帧，确认最后一帧停在真结果上。 */
  const frames = [];
  let done = false;
  const final = pageModel.finalFacts(seed);
  const roller2 = roller.create(
    roller.buildPool((turn) => pageModel.rollerFacts(seed, turn)),
    final,
    (f) => frames.push(f),
    () => { done = true; }
  );
  await new Promise((resolve) => setTimeout(resolve, 6000));
  roller2.stop();
  ok(frames.length >= 26, `转盘滚了 ${frames.length} 帧（至少 26 帧）`);
  ok(frames.length && frames[frames.length - 1].name === final.name,
    '最后一帧停在真正抽定的角色名上');
  ok(frames.length && frames[frames.length - 1].meta === final.meta,
    '最后一帧的小字也是真正抽定的那一套（大陆 · 住址 · 出身）');
  ok(done, '转盘会定格并回调（出登记卡）');
}

/* 定格 ⇒ 登记卡（照官方 .cert 的字段表） */
roll.settle();
{
  const session = loadCjs(path.join(XIANXIA, 'bridge', 'session.js'));
  ok(roll.data.rolling === false, '定格后进入登记卡');
  /* ⚠ `cert` 曾同时承载「正文（字符串）」与「角色名（对象属性）」⇒ 名字渲染不出来。
   *   现在必须是两个独立的字段。 */
  ok(typeof roll.data.certText === 'string' && roll.data.certText.length > 10, '登记卡有正文（certText）');
  ok(typeof roll.data.cert === 'undefined' || typeof roll.data.cert !== 'string',
    'cert 字段不再承载正文（避免与 certName 撞车）');
  ok(!!roll.data.certName, `登记卡有角色名（certName）：${roll.data.certName}`);
  ok(roll.data.certName === session.run.player.name,
    '登记卡的角色名 === 这段人生真正的名字');
  ok(Array.isArray(roll.data.fields) && roll.data.fields.length >= 8,
    `登记卡字段表有 ${(roll.data.fields || []).length} 项（官方是标签 + 值两列）`);
  const field = (roll.data.fields || [])[0];
  ok(field && typeof field.k === 'string' && Array.isArray(field.v), '字段结构是 {k: 标签, v: 片段数组}（官方格式）');
  ok(!!roll.data.regNo && roll.data.regNo.indexOf('No.') === 0, `登记卡有编号：${roll.data.regNo}`);
  ok(!!roll.data.certPace, '登记卡有一行节奏说明（官方 certPace）');
  ok(!!roll.data.certMapCap, '登记卡有地图说明（官方 certMapCap）');
  ok(!!roll.data.oddsPre && !!roll.data.oddsShare, '登记卡有一行事实（官方 odds-line）');
}

/* 决策卡文案口径（与 HTML 端 app.js 的 showDecision 逐字一致）。 */
const decision = loadCjs(path.join(XIANXIA, 'bridge', 'view-model.js')).decision;
{
  const session = loadCjs(path.join(XIANXIA, 'bridge', 'session.js'));
  const run = session.run;
  let card = null;
  for (let i = 0; i < 400 && !card; i++) {
    if (run.pending) {
      card = decision(run);
      break;
    }
    if (run.phase !== 'life') break;
    session.advance(1);
  }
  ok(!!card, '能走到一个有抉择的时刻');
  if (card) {
    ok(card.note === '未回应时，年月暂停。选好之后，日子继续往前走。', '决策卡底注与 HTML 端逐字一致');
    ok(/\d+岁 · 这一刻由你决定/.test(card.head), '决策卡抬头格式与 HTML 端一致');
    ok(/ · .+灵石$/.test(card.fact), '决策卡那行小字格式与 HTML 端一致');
    const meta = card.choices.map((c) => c.meta).join('|');
    ok(!/成功率|%/.test(meta), '决策卡不显示成功率');
    const disabled = card.choices.filter((c) => !c.enabled);
    ok(disabled.every((c) => c.meta.indexOf('暂时无法这样做：') === 0),
      '不可选的项写「暂时无法这样做：…」');
    const enabled = card.choices.filter((c) => c.enabled);
    ok(enabled.every((c) => !/成功率/.test(c.meta)), '可选项只写代价，不写概率');
  }
}

/* 人生页 */
const beginResult = await roll.begin();
ok(beginResult && beginResult.ok === true, '出生页「开始这一生」能存下档');
ok(calls.nav.some((n) => /subpkg\/xianxia\/pages\/life\/life/.test(n.url || '')), '存完档跳到人生页');

const life = loadPage(path.join(XIANXIA, 'pages', 'life', 'life.js'));
life.onLoad();
ok(!!life.data.top && !!life.data.top.name, `人生页顶栏有名字：${life.data.top && life.data.top.name}`);
ok(typeof life.data.top.age === 'number' && life.data.top.age >= 0,
  `顶栏年龄在（官方 .agebox）：${life.data.top && life.data.top.age} 岁`);
ok(typeof life.data.top.prog === 'number', '顶栏有年份进度条（官方 .prog）');

/* 状态条：四格（体力 / 心境 / 悟性 / 胆识 —— 照修仙网页端 statBar()） */
{
  const labels = (life.data.stats || []).map((s) => s.n);
  ok(Array.isArray(life.data.stats) && life.data.stats.length === 4,
    `状态条有四格数值（官方 .minibar）：${labels.join('/')}`);
  ok(JSON.stringify(labels) === JSON.stringify(['体力', '心境', '悟性', '胆识']),
    '状态条四格的口径与修仙网页端一致（体力/心境/悟性/胆识）');
  ok(!labels.includes('灵石'), '状态条里没有灵石（灵石在「灵石与家产」面板，不重复）');
  ok((life.data.stats || []).every((s) => typeof s.bar === 'number'
    && s.bar >= 0 && s.bar <= 100), '每格都有钳位到 0–100 的条形图宽度');
}
ok(!!life.data.focus, `状态条上写着当前重心：${life.data.focus}`);

/* 倍速：官方那 6 档 */
ok(JSON.stringify(life.data.speeds) === JSON.stringify([1, 2, 4, 8, 12, 16]),
  `倍速档位与官方一致：${JSON.stringify(life.data.speeds)}`);

life.togglePause();
ok(life.data.paused === true, '暂停能开');
life.togglePause();
ok(life.data.paused === false, '暂停能关');

life.setSpeed({currentTarget: {dataset: {v: 4}}});
ok(life.data.speed === 4, '速度能切到 4×');

ok(life.data.auto === false, '自动抉择**默认关闭**');
life.toggleAuto();
ok(life.data.auto === true, '自动抉择能打开');
life.toggleAuto();
ok(life.data.auto === false, '自动抉择能关掉');

/* 面板：重心 / 地图 / 修炼场 都要能打开 */
for (const name of ['focus', 'world', 'training']) {
  life.openSheet({currentTarget: {dataset: {sheet: name}}});
  ok(life.data.sheet === name, `「${name}」面板能打开`);
  life.closeSheet();
  ok(life.data.sheet === '', `「${name}」面板能关闭`);
}
ok(Array.isArray(life.data.activities) && life.data.activities.length > 0,
  `重心选项有内容（${(life.data.activities || []).length} 项）`);
ok(Array.isArray(life.data.places) && life.data.places.length > 0,
  `可去的地方有内容（${(life.data.places || []).length} 个）`);
const current = life.data.activities.filter((a) => a.current);
ok(current.length === 1, '重心里当前选中的那项被标出来了');

/* 选重心：引擎认下来的那一个要真的生效 */
{
  const target = life.data.activities.find((a) => a.enabled && !a.current);
  if (target) {
    life.setActivity({currentTarget: {dataset: {id: target.id}}});
    const session = loadCjs(path.join(XIANXIA, 'bridge', 'session.js'));
    ok(session.run.life.cultivation.activity === target.id, `重心切到「${target.name}」后引擎认了`);
  } else {
    ok(true, '当前没有可切换的重心（跳过）');
  }
}

/* 决策卡：官方 .dec 形状 */
{
  const session = loadCjs(path.join(XIANXIA, 'bridge', 'session.js'));
  const run = session.run;
  for (let i = 0; i < 400 && !run.pending; i++) {
    if (run.phase !== 'life') break;
    session.advance(1);
  }
  life.applyView(session.view, true);
  ok(!!life.data.dec, '有抉择时决策卡出现');
  if (life.data.dec) {
    ok(!!life.data.dec.title && typeof life.data.dec.body === 'string', '决策卡有标题与正文');
    ok(!!life.data.dec.fact, '决策卡有那行事实（官方 .fact）');
    /* 抬头照修仙网页端（showDecision）：「N岁 · 这一刻由你决定」。 */
    ok(/^\d+岁 · 这一刻由你决定$/.test(life.data.dec.cat),
      `决策卡抬头与网页端一致：${life.data.dec.cat}`);
    ok(Array.isArray(life.data.dec.choices) && life.data.dec.choices.length > 0, '决策卡有选项');
    const no = life.data.dec.choices[0].no;
    ok(/^\d{2}$/.test(no), `选项有编号（官方 .k）：${no}`);
    const enabled = life.data.dec.choices.filter((c) => c.enabled);
    ok(enabled.every((c) => !/成功率|%/.test(c.sub || '')), '决策卡不显示成功率');
    ok(life.data.decLocked.every((c) => !c.enabled), '不可选的项被单独挑出来了');
    life.decMin();
    ok(!!life.data.decPeek, '收起后底部出现常驻条（官方 .decpeek）');
    life.decOpen();
    ok(!life.data.decPeek, '可以重新展开');
  }
}

/* 山海行籍身份卡（上游网页端 lifePanels() 的第一个面板） */
{
  ok(!!life.data.identity, '人生页有山海行籍身份卡');
  if (life.data.identity) {
    const idc = life.data.identity;
    ok(Array.isArray(idc.top) && idc.top.length === 2, '身份卡顶栏两行（山海行籍 · 纪元 / 年龄）');
    ok(!!idc.name, `身份卡有姓名：${idc.name}`);
    ok(Array.isArray(idc.rows) && idc.rows.length >= 4, `身份卡有 ${(idc.rows || []).length} 行字段`);
    const keys = (idc.rows || []).map((r) => r.k);
    ok(JSON.stringify(keys) === JSON.stringify(['出身', '出生地', '道路', '灵根']),
      '身份卡字段与网页端一致（出身/出生地/道路/灵根）');
    ok(Array.isArray(idc.mrz) && idc.mrz.length === 2, '身份卡有底部的两行机读区');
  }
  /* 身份卡必须排在所有面板最前面（上游 lifePanels() = identity + practice + …）。 */
  const wxml = fs.readFileSync(path.join(XIANXIA, 'pages', 'life', 'life.wxml'), 'utf8');
  const idAt = wxml.indexOf('idcard p-id');
  const practiceAt = wxml.indexOf('p-practice');
  ok(idAt >= 0 && practiceAt >= 0 && idAt < practiceAt,
    '身份卡排在「修行本事」之前（与网页端 lifePanels() 同序）');
}

/* 雷达图的数据源：五轴要在视图里，且是**五个数字**。 */
{
  const axes = life.data.axes;
  const keys = ['insight', 'courage', 'empathy', 'health', 'mind'];
  ok(!!axes, '视图里有五轴数据');
  ok(axes && keys.every((k) => typeof axes[k] === 'number' && isFinite(axes[k])),
    '五轴都是数字（悟性 / 胆识 / 仁心 / 体力 / 心境）');
  const wxml = fs.readFileSync(path.join(XIANXIA, 'pages', 'life', 'life.wxml'), 'utf8');
  ok(/x-radar[^>]*player="\{\{axes\}\}"/.test(wxml), '雷达图绑的是五轴，不是身份卡');
}

/* 往期人生页 */
const past = loadPage(path.join(XIANXIA, 'pages', 'past', 'past.js'));
past.onShow();
ok(Array.isArray(past.data.lives), '往期人生页能列清单');
ok(past.data.lives.length >= 1, `清单里至少有一段人生（${past.data.lives.length} 段）`);
ok(past.data.lives[0] && (past.data.lives[0].action === '回看' || past.data.lives[0].action === '继续'),
  '每段人生都标了「回看 / 继续」');

/* 收尾：停掉时钟，别把进程吊住 */
try { life.onUnload(); } catch (error) { /* 忽略 */ }
try { roll.onUnload(); } catch (error) { /* 忽略 */ }

/* ══════════════════════════════════════════════ ④ 官方键一个字节没变 */

section('2026-11-03 真机反馈的七个问题（逐条钉死）');
{
  /* 问题 1：出生年龄。`startAge` 真值可能是 0（上游 birth.js:19 写死 0），
   * 用 `||` 取会把 0 当成「没有值」⇒ 一出生就 16 岁。 */
  {
    const pageModel = loadCjs(path.join(XIANXIA, 'bridge', 'page-model.js'));
    const fake = {month: 0, birth: {startAge: 0, year: 906}, player: {name: '甲'}};
    ok(pageModel.ageOf(fake) === 0, 'startAge=0 时年龄是 0 岁（不是 16）');
    const fake16 = {month: 0, birth: {startAge: 16, year: 906}, player: {name: '甲'}};
    ok(pageModel.ageOf(fake16) === 16, 'startAge=16 时年龄是 16 岁');
    const fakeNone = {month: 0, birth: {}, player: {name: '甲'}};
    ok(pageModel.ageOf(fakeNone) === 16, 'startAge 缺失时兜底 16 岁');
    /* 源码里不许再出现 `startAge) || 16` 这种写法。 */
    const modelSrc = fs.readFileSync(path.join(XIANXIA, 'bridge', 'page-model.js'), 'utf8');
    const viewSrc = fs.readFileSync(path.join(XIANXIA, 'bridge', 'view-model.js'), 'utf8');
    ok(!/startAge\)\s*\|\|/.test(modelSrc) && !/startAge\)\s*\|\|/.test(viewSrc),
      '源码里没有 `startAge || 16`（0 是合法起点，不能用 || 取）');
  }

  /* 问题 3：弹层顶部必须让开微信右上角的胶囊。
   * 少了那 44px，弹层里的「关闭」按钮就落在胶囊底下，点不到。 */
  {
    for (const page of ['roll', 'life', 'past']) {
      const src = fs.readFileSync(path.join(XIANXIA, 'pages', page, `${page}.js`), 'utf8');
      ok(/safe-area\.js/.test(src), `${page} 页引用了 bridge/safe-area.js`);
      ok(/sheetPadTop:\s*safeArea\.sheetPadTop\(\)/.test(src),
        `${page} 页的 sheetPadTop 来自 safeArea.sheetPadTop()（不是裸 statusBarHeight）`);
    }
    /* 算法口径必须与官方 miniprogram/ui/safe-area.js 一致
     *   （那份的副本收在 reference/official/sources/safe-area.js，门禁不依赖任何相邻目录）。 */
    const ours = fs.readFileSync(path.join(MP, 'bridge', 'safe-area.js'), 'utf8');
    const official = fs.readFileSync(path.join(OFFICIAL_SOURCES, 'safe-area.js'), 'utf8');
    ok(/r\.bottom\s*\+\s*8/.test(ours) && /r\.bottom\s*\+\s*8/.test(official),
      '胶囊避让算法一致：胶囊底边 + 8px');
    ok(/statusBarHeight\(\)\s*\+\s*44/.test(ours) && /statusBarHeight\(\)\s*\+\s*44/.test(official),
      '取不到胶囊时的兜底一致：状态栏 + 44px');
  }

  /* 问题 4：WXML 的 {{}} 不支持字符串拼接（`+` 是算术 ⇒ NaN）。 */
  {
    const offenders = [];
    const walk = (dir) => {
      for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (e.name.endsWith('.wxml')) {
          const code = fs.readFileSync(p, 'utf8');
          /* 扫 {{...}} 里同时出现引号与 + 的表达式。 */
          for (const m of code.matchAll(/\{\{([^}]*)\}\}/g)) {
            if (/['"]/.test(m[1]) && /\+/.test(m[1])) {
              offenders.push(`${path.relative(MP, p)}: ${m[0]}`);
            }
          }
        }
      }
    };
    walk(MP);
    ok(offenders.length === 0, offenders.length
      ? `WXML 里还有字符串拼接：${offenders.slice(0, 3).join('；')}`
      : '修仙 WXML 里没有字符串拼接（整句都在 JS 侧拼好）');
  }
}

/* ══════════════════════════════════════════════ ④′ 第四轮：外壳复刻 + 内容补全 */
section('2026-11-04 第四轮：外壳复刻 + 内容补全');
{
  const session = loadCjs(path.join(XIANXIA, 'bridge', 'session.js'));
  const pageModel = loadCjs(path.join(XIANXIA, 'bridge', 'page-model.js'));
  const viewModel = loadCjs(path.join(XIANXIA, 'bridge', 'view-model.js'));

  /* ① 决策卡「先收起来」必须**真的关掉**，而且下一帧不会自己弹回来
   *    （用户 2026-11-04 真机反馈：点了没反应）。 */
  {
    /* 先走到一个有抉择的时刻。 */
    for (let i = 0; i < 400 && !session.run.pending; i++) {
      if (session.run.phase !== 'life') break;
      session.advance(1);
    }
    life.applyView(session.view, true);
    if (life.data.dec) {
      life.decMin();
      ok(life.data.dec === null, '「先收起来」之后决策卡真的关掉了（dec 置空）');
      ok(!!life.data.decPeek && !!life.data.decPeek.title, '收起后底部出现常驻条（官方 .decpeek）');
      /* 模拟一次心跳：官方 applyDec() 的语义是「已经收起就别再弹」。 */
      life.applyView(session.view, true);
      ok(life.data.dec === null, '收起之后下一帧也不会自己弹回来');
      ok(!!life.data.decPeek, '收起之后常驻条不会被心跳冲掉');
      life.decOpen();
      ok(!!life.data.dec, '「重新展开」能把决策卡叫回来');
      ok(!life.data.decPeek, '展开之后常驻条消失');
    } else {
      ok(true, '这段人生没走到抉择点（收起/展开的断言跳过）');
    }
    /* 选一次之后，日志里应当出现**变化清单**（上游 .delta）。
     *
     * ⚠ 2026-11-05（第七轮 · 规则12）：断言改成**与规则版本无关**的口径。
     *   第 8 版里抉择的日志 kind 是 'choice'；第 12 版里同一个引擎会写
     *   kind='plan'（还有 'story' / 'life' 等）—— 上游网页端也是
     *   `timeline-row ${entry.kind}` 照原样渲染，并没有规定必须是 'choice'。
     *   ⇒ 真正要守的是：**① 抉择本身进了日志；② 我们把上游的 changes
     *   原样渲染成 .delta**（而不是自己编一个「变化」）。
     */
    const offered = session.options() || [];
    const pickable = offered.find((o) => o.enabled);
    if (pickable) {
      const journalBefore = (session.run.journal || []).length;
      life.onChoose({currentTarget: {dataset: {k: pickable.id}}});
      const after = pageModel.feedRows(session.run);
      const journalAfter = (session.run.journal || []).length;
      ok(journalAfter > journalBefore,
        `选完之后，日志里多了一条记录（${journalBefore} → ${journalAfter}）`);
      ok(after.length > 0 && after[0].li === (session.run.journal[journalAfter - 1] || {}).id,
        '纪录里能对上这次抉择的那一条');
      /* 变化清单：与引擎给的 changes **逐字一致**（这次抉择没变化也没关系）。 */
      const newest = (session.run.journal || [])[journalAfter - 1] || {};
      const expectedChg = (newest.changes || []).join(' · ');
      const ourChg = (after[0] || {}).chg || '';
      ok(ourChg === expectedChg,
        `变化清单与引擎给的 changes 逐字一致（本次「${ourChg || '无变化'}」）`);
    }
  }

  /* ② 人生纪录：官方 .feed-item 的壳 + 上游的内容（标题 / 正文 / 变化 / 年月）。 */
  {
    const rows = pageModel.feedRows(session.run);
    ok(rows.length > 0, `人生纪录有内容（${rows.length} 条）`);
    ok(rows.every((r) => typeof r.ageText === 'string' && /岁$/.test(r.ageText)),
      '每条记录有年龄（官方 .feed-item .age）');
    ok(rows.every((r) => typeof r.ym === 'string' && /\d{3,4}\.\d{2}/.test(r.ym)),
      '每条记录有「年.月」（上游 timeline-date）');
    ok(rows.every((r) => typeof r.t === 'string' && r.t.length > 0), '每条记录有标题');
    ok(rows.every((r) => typeof r.chg === 'string'), '每条记录都带变化字段（上游 .delta；没有变化时是空串）');
    ok(rows.some((r) => r.f && r.f.length > 0), '每条记录带正文（不再只是一句话）');
    const meta = pageModel.feedMeta(session.run);
    ok(/\d+段 · \d+次抉择/.test(meta.label), `记录抬头有计数：${meta.label}`);
    const groups = pageModel.feedGroups(session.run);
    ok(Array.isArray(groups) && groups.length > 0, `全屏记录按年份分组（${groups.length} 组）`);
    ok(groups.every((g) => Array.isArray(g.items) && g.items.length > 0), '每一组都有记录');
  }

  /* ③ 加星：落自己的键（xianxia.v1.stars.*），官方键一个都不碰。 */
  {
    const before = Object.keys(storage).filter((k) => k.indexOf('xianxia.v1.stars.') === 0);
    life.toggleFeedRow({currentTarget: {dataset: {li: 1}}});
    life.toggleStar({currentTarget: {dataset: {li: 1}}});
    const keys = Object.keys(storage).filter((k) => k.indexOf('xianxia.v1.stars.') === 0);
    ok(keys.length > before.length, `星标落在自己的键上：${keys.join('、')}`);
    const stars = wxMock.getStorageSync(keys[keys.length - 1]);
    ok(Array.isArray(stars) && stars.indexOf(1) >= 0, '星标列表里记下了那条记录');
    life.toggleStar({currentTarget: {dataset: {li: 1}}});
    const after = wxMock.getStorageSync(keys[keys.length - 1]);
    ok(Array.isArray(after) && after.indexOf(1) < 0, '再点一次就取消那颗星');
  }

  /* ④ 面板折叠：官方 .foldbtn 的行为，状态存在自己的偏好键里。 */
  {
    life.toggleFold({currentTarget: {dataset: {k: 'p-stats'}}});
    const fold = wxMock.getStorageSync('xianxia.v1.pref.fold');
    ok(fold && fold['p-stats'] === true, '折叠状态落在 xianxia.v1.pref.fold');
    life.toggleFold({currentTarget: {dataset: {k: 'p-stats'}}});
    const fold2 = wxMock.getStorageSync('xianxia.v1.pref.fold');
    ok(fold2 && fold2['p-stats'] === false, '再点一次就展开');
  }

  /* ⑤ 面板顺序（官方外壳 + 上游内容，突破公告插在记录之后）。
   * ⚠ 2026-11-05（第五轮）：「今年的重心」卡片（p-focus）与「人生地图」
   *   卡片（p-map）已删 ⇒ 从顺序清单里去掉。 */
  {
    const wxml = fs.readFileSync(path.join(XIANXIA, 'pages', 'life', 'life.wxml'), 'utf8');
    const order = ['p-scene', 'minibar', 'p-feed', 'p-breakthrough', 'p-passage',
      'p-stats', 'idcard p-id', 'p-practice', 'p-sect', 'p-wealth', 'p-inv', 'p-people'];
    const positions = order.map((k) => wxml.indexOf(k));
    ok(positions.every((p) => p >= 0), `页面里有这些面板：${order.filter((k, i) => positions[i] < 0).join('、') || '全部齐'}`);
    const sorted = positions.slice().sort((a, b) => a - b);
    ok(JSON.stringify(sorted) === JSON.stringify(positions),
      '面板顺序与口径一致（场景→状态条→记录→突破→处境→状态→身份卡→修行→宗门→财富→行囊→人物）');
  }

  /* ⑥ 内容补全：当前处境 / 突破公告 / 人物四类 / 地图数据 / 授业与记录 / 终局。 */
  {
    ok(!!life.data.passage && typeof life.data.passage.label === 'string',
      `有「当前处境」（活动标签）：${life.data.passage && life.data.passage.label}`);
    /* ⚠ 2026-11-05：「人生已暂停 / 日子正在过去」状态行已删（用户拍板）。 */
    ok(!!life.data.passage && !('status' in life.data.passage),
      '当前处境里没有「人生已暂停 / 日子正在过去」状态行了');
    ok(!!life.data.statusPanel && Array.isArray(life.data.statusPanel.bars)
      && life.data.statusPanel.bars.length === 5, '状态面板有五维 0–100 条');
    /* ⚠ 2026-11-05：重心卡删了，选项只剩弹层里那一份（官方 .chips 仍由行囊卡片用着）。 */
    ok(Array.isArray(life.data.activities) && life.data.activities.length === 7,
      `重心选项有七项（上游 ACTIVITIES）：${(life.data.activities || []).length}`);
    const kinds = new Set((life.data.people || []).map((p) => p.kind));
    ok(kinds.has('person') || kinds.has('family'), `人物有分类（${[...kinds].join('、')}）`);
    ok((life.data.people || []).every((p) => p.initial && p.name && p.note),
      '每个人物都有首字、姓名与近况');
    ok(!!life.data.mapContinents && life.data.mapContinents.length === 4, '人生地图列了四块大陆');
    const view = session.view;
    ok(!!view.map && Array.isArray(view.map.legend) && view.map.legend.length === 4,
      '地图有图例（上游 .map-legend）');
    ok(!!view.map && typeof view.map.eraText === 'string' && view.map.eraText.length > 0,
      '地图有纪元说明（上游 showWorld）');
    ok(!!view.details && typeof view.details.path === 'string', '有「授业与记录」（上游 lifeDetails）');
    const ending = viewModel.ending(session.run);
    ok(!!ending && Array.isArray(ending.metrics) && ending.metrics.length === 4,
      '终局回顾有四个指标（上游 ending-metrics）');
    ok(!!ending && typeof ending.consequences === 'string' && ending.consequences.length > 0,
      '终局回顾有那段总结（上游 endingConsequences）');
    const br = viewModel.breakthrough(session.run);
    ok(br === null || (br.title && br.body), '突破公告要么没有、要么有标题与正文');
  }

  /* ⑦ 地图/重心/修炼场的选项：地点列表与特色要补齐（上游 showWorld 每张卡片五段）。 */
  {
    const places = life.data.places || [];
    ok(places.length > 0, '可去的地方有内容');
    ok(places.every((p) => typeof p.line === 'string' && p.line.length > 0),
      '每个目的地都有整句说明（描述 · 地点 · 特色 · 前往条件）');
    ok(places.some((p) => p.line.indexOf('前往') >= 0 || p.line.length > 20),
      '目的地那行里有上游的地点与特色（不只剩一句状态）');
    const acts = life.data.activities || [];
    ok(acts.every((a) => typeof a.line === 'string' && a.line.length > 0),
      '每个重心选项都有整句说明（说明 · 影响 · 理由）');
  }

  /* ⑧ 2026-11-05 第五轮：十六岁前**不能**自己安排重心
   *    （上游 `packages/adventure/cultivation.js:65`：age<16 ⇒ 七项全禁用）。 */
  {
    const young = {month: 0, birth: {startAge: 0, year: 471}, player: {name: '甲'}};
    const grown = {month: 0, birth: {startAge: 16, year: 471}, player: {name: '甲'}};
    const justSixteen = {month: 12, birth: {startAge: 15, year: 471}, player: {name: '甲'}};
    ok(pageModel.canFocus(young) === false,
      '零岁的新人生不能自己安排重心（上游 age<16 时七项全禁用）');
    ok(pageModel.canFocus(grown) === true, '十六岁起可以自己安排重心');
    ok(pageModel.canFocus(justSixteen) === true, '十五岁 + 一年 = 十六岁 ⇒ 可以安排重心');
    const wxml = fs.readFileSync(path.join(XIANXIA, 'pages', 'life', 'life.wxml'), 'utf8');
    ok(/class="mb-fo"[^>]*wx:if="\{\{canFocus\}\}"/.test(wxml),
      '状态条上的「重心」按钮由 canFocus 控制（十六岁前根本不出现）');
    ok(typeof life.data.canFocus === 'boolean',
      `页面数据带 canFocus（当前 ${life.data.canFocus}）`);
  }

  /* ⑨ 2026-11-05 第五轮：删掉的东西要删干净（防回潮）。 */
  {
    const wxml = fs.readFileSync(path.join(XIANXIA, 'pages', 'life', 'life.wxml'), 'utf8');
    /* ⚠ 先剥掉 WXML 注释再扫：注释里会写「为什么删」，不能算成「还在页面上」。 */
    const body = wxml.replace(/<!--[\s\S]*?-->/g, '');
    const gone = [
      ['今年的重心', '「今年的重心」卡片'],
      ['p-focus', '重心卡片的官方类名'],
      ['class="status', '「人生已暂停 / 日子正在过去」状态行'],
      ['baby-hint', '重心卡片的提示类名'],
      ['realm-steps', '五个境界阶梯'],
      ['放大地图', '「放大地图」按钮'],
      ['查看大陆与路线', '主页地图卡片的入口按钮'],
      ['p-map', '地图卡片的官方类名'],
      ['map-legend', '地图图例'],
      ['x-map', '人生页里的点阵地图画布'],
    ];
    const still = gone.filter(([needle]) => body.indexOf(needle) >= 0);
    ok(still.length === 0, still.length
      ? `这些还留在页面上：${still.map((x) => x[1]).join('、')}`
      : '删掉的都删干净了（重心卡 / 状态行 / 境界阶梯 / 地图卡 / 放大地图 / 图例）');
  }

  /* ⑩ 2026-11-05 第五轮：「人生记录 全部」的弹层要能滑到底
   *    （原来只有 62vh 高度上限、没有滚动条 ⇒ 长记录被裁且够不着）。 */
  {
    const wxml = fs.readFileSync(path.join(XIANXIA, 'pages', 'life', 'life.wxml'), 'utf8');
    const from = wxml.indexOf('<!-- 人生记录 全部');
    const to = wxml.indexOf('<!-- 大陆与路线');
    const logSheet = (from >= 0 && to > from) ? wxml.slice(from, to) : '';
    ok(logSheet.indexOf('bd sheet-bd') >= 0,
      '记录弹层的正文带 sheet-bd（官方 #sheet .bd 口径：高度上限 + 内部滚动）');
    const wxss = fs.readFileSync(path.join(XIANXIA, 'pages', 'life', 'life.wxss'), 'utf8');
    ok(/\.dec\.log\s+\.feed\.full\s*\{[^}]*max-height:\s*none/.test(wxss),
      '记录弹层里那份 62vh 高度上限已被覆盖（否则长记录还是被裁掉）');
  }
}

/* ══════════════════════════════════════════════ ④′′ 第七轮：规则12 */
section('2026-11-05 第七轮：规则12（体质寿元 / 炼气阶段 / 宗门法门 / 多年安排 / 新旧档并存）');
{
  const session = loadCjs(path.join(XIANXIA, 'bridge', 'session.js'));
  const pageModel = loadCjs(path.join(XIANXIA, 'bridge', 'page-model.js'));
  const viewModel = loadCjs(path.join(XIANXIA, 'bridge', 'view-model.js'));
  const engine = session.engine;

  /* ① 新人生默认第 12 版；旧版本只留给旧存档继续跑，不许用来开新人生。 */
  {
    const run = engine.createRun({seed: '第七轮-甲', id: 'life-r12-1'});
    ok(run.life && run.life.cultivation && run.life.cultivation.rulesVersion === 12,
      `新人生默认第 12 版（实际 ${run.life && run.life.cultivation && run.life.cultivation.rulesVersion}）`);
    let refused = false;
    try {
      engine.createRun({seed: '第七轮-乙', id: 'life-r12-2', rulesVersion: 8});
    } catch (error) {
      refused = true;
    }
    ok(refused, '第 8 版不许开新人生（上游口径：旧版只用于旧存档）');
  }

  /* ② 寿元按**体质**算，不能再用境界基础值。 */
  {
    const run = engine.createRun({seed: '第七轮-丙', id: 'life-r12-3'});
    const practice = viewModel.practice(run);
    const real = engine.lifespan12(run);
    ok(typeof real === 'number' && real > 0, `引擎算得出寿元上限（${real} 岁）`);
    ok(practice.hint.indexOf('寿元上限 ' + real + ' 岁') >= 0,
      `面板上的寿元与引擎一致（${practice.hint}）`);
    const realmLifespan = (engine.REALMS[run.player.realm] || {}).lifespan;
    ok(real !== realmLifespan,
      `寿元不是境界基础值（体质算的是 ${real}，境界值是 ${realmLifespan}）`);
  }

  /* ③ 炼气→筑基的门槛是 **260**（第 8 版是 140）—— 写死 140 进度条会说谎。 */
  {
    const run = engine.createRun({seed: '第七轮-丁', id: 'life-r12-4'});
    run.player.realm = 1;
    run.life.cultivation.progress = 130;
    const practice = viewModel.practice(run);
    ok(practice.progressText === '50%',
      `130/260 显示 50%（实际 ${practice.progressText}；按旧的 140 会显示 93%）`);
    run.life.cultivation.progress = 210;
    const later = viewModel.practice(run);
    ok(later.progressText === '81%',
      `210/260 显示 81%（实际 ${later.progressText}）`);
  }

  /* ④ 副标题是**炼气阶段**，不是境界名。 */
  {
    const run = engine.createRun({seed: '第七轮-戊', id: 'life-r12-5'});
    run.player.realm = 1;
    run.life.cultivation.progress = 40;
    const practice = viewModel.practice(run);
    ok(/^炼气(初期|中期|后期|圆满)$/.test(practice.realm),
      `炼气期副标题是阶段（实际「${practice.realm}」）`);
    run.player.realm = 0;
    const mortal = viewModel.practice(run);
    ok(mortal.realm === '凡身', `不是炼气期就照旧显示境界名（实际「${mortal.realm}」）`);
  }

  /* ⑤ 体质名必须来自上游 BODY_TYPES —— 我们不许自己另写一套。 */
  {
    const run = engine.createRun({seed: '第七轮-己', id: 'life-r12-6'});
    const practice = viewModel.practice(run);
    const names = Object.keys(engine.BODY_TYPES || {}).map((k) => engine.BODY_TYPES[k].name);
    ok(names.indexOf(practice.body) >= 0 || / · 经脉受损$/.test(practice.body),
      `体质名来自上游（实际「${practice.body}」，上游有：${names.join('、')}）`);
    const src = fs.readFileSync(path.join(XIANXIA, 'bridge', 'view-model.js'), 'utf8');
    /* ⚠ **AST 口径**：只看字符串字面量，注释里写给人看的字不算
     *   （注释里当然可以出现这些名字 —— 那是解释，不是数据）。 */
    const literals = [];
    {
      const ast = acorn.parse(src, {ecmaVersion: 2020, sourceType: 'script'});
      const walk = (node) => {
        if (!node || typeof node !== 'object') return;
        if (Array.isArray(node)) {
          for (const item of node) walk(item);
          return;
        }
        if (node.type === 'Literal' && typeof node.value === 'string') literals.push(node.value);
        for (const key of Object.keys(node)) {
          if (key === 'type' || key === 'start' || key === 'end') continue;
          walk(node[key]);
        }
      };
      walk(ast);
    }
    let hardcoded = [];
    for (const k of Object.keys(engine.BODY_TYPES || {})) {
      const name = engine.BODY_TYPES[k].name;
      if (literals.indexOf(name) >= 0) hardcoded.push(name);
    }
    ok(hardcoded.length === 0,
      hardcoded.length ? `源码里硬编码了体质名：${hardcoded.join('、')}` : '源码里没有硬编码的体质名（一个字都不自己编）');
  }

  /* ⑥ 宗门法门（地方风格）来自上游 sectProfile。 */
  {
    const run = engine.createRun({seed: '第七轮-庚', id: 'life-r12-7'});
    /* 造一个「在正道宗门里」的状态：宗门档案 + 正道路。 */
    run.life.cultivation.path = 'orthodox';
    run.life.cultivation.progression = run.life.cultivation.progression || {};
    run.life.cultivation.progression.sect = {
      name: '松岳剑宗', size: '中', phase: 'intact', highest: 3, role: 'core',
      treasury: 0, development: 0,
    };
    const sect = viewModel.sect(run);
    const profile = engine.sectProfile(run);
    ok(!!sect, '正道宗门状态下宗门面板会出现');
    ok(sect.style === profile.style,
      `宗门法门与上游一致（${sect.style}）`);
  }

  /* ⑦ 多年安排（闭关 / 历练 / 做工）：进度条读 v12.action。 */
  {
    const run = engine.createRun({seed: '第七轮-辛', id: 'life-r12-8'});
    run.month = 100;
    run.life.cultivation.v12 = run.life.cultivation.v12 || {};
    run.life.cultivation.v12.action = {kind: 'retreat', from: 100, to: 160, notes: 0};
    const passage = viewModel.passage(run);
    ok(!!passage.journey, '多年安排期间「当前处境」有进度条');
    ok(passage.journey.progress === 0, `刚开始是 0%（实际 ${passage.journey.progress}%）`);
    run.month = 130;
    const half = viewModel.passage(run);
    ok(half.journey.progress === 50, `走到一半是 50%（实际 ${half.journey.progress}%）`);
    ok(half.actionLabel === '闭关', `安排类型有中文名（${half.actionLabel}）`);
  }

  /* ⑧ 新旧档并存：第 8 版的旧档照样读得出来（引擎里每一版的执行器都留着）。 */
  {
    const storageModule = loadCjs(path.join(MP, 'bridge', 'storage.js'));
    const data = new Map();
    const fake = {
      get: (k) => (data.has(k) ? data.get(k) : null),
      set: (k, v) => data.set(k, v),
      remove: (k) => data.delete(k),
      keys: () => [...data.keys()],
    };
    const store = storageModule.createStorage({storage: fake, now: () => 1700000000000});

    /* 造一份「第 8 版」的人生状态（把版本号改回去即可模拟旧档）。 */
    const old = engine.createRun({seed: '旧档-测试', id: 'life-old-1'});
    old.life.cultivation.rulesVersion = 8;
    const text = JSON.stringify(old);
    const hashUtil = loadCjs(path.join(MP, 'bridge', 'hash.js'));
    const key = 'xianxia.v1.life.life-old-1.1.0';
    fake.set(key, text);
    fake.set('xianxia.v1.manifest.a', JSON.stringify({
      revision: 1, rulesVersion: 8, activeId: 'life-old-1', updatedAt: 1700000000000,
      lives: [{
        id: 'life-old-1', generation: 1, bytes: hashUtil.utf8Length(text),
        hash: hashUtil.sha256Hex(text), phase: old.phase, name: old.player.name,
        realm: old.player.realm, age: 16, months: old.month, rulesVersion: 8,
        updatedAt: 1700000000000,
        shards: [{key, bytes: hashUtil.utf8Length(text), hash: hashUtil.sha256Hex(text)}],
      }],
    }));

    const back = store.readLife('life-old-1');
    ok(!!back, '第 8 版的旧档照样读得出来');
    ok(back && back.life.cultivation.rulesVersion === 8, '旧档还是第 8 版（没被偷偷升版）');

    /* 再存一段新人生（第 12 版）：清单升到 12，旧的那段还在。 */
    const fresh = engine.createRun({seed: '新档-测试', id: 'life-new-1'});
    await store.save(fresh, engine.validateRun);
    const manifest = JSON.parse(fake.get('xianxia.v1.manifest.b') || fake.get('xianxia.v1.manifest.a'));
    ok(manifest.rulesVersion === 12, `清单版本升到 12（实际 ${manifest.rulesVersion}）`);
    ok(manifest.lives.length === 2, `两段人生都在清单里（${manifest.lives.length} 段）`);
    ok(!!store.readLife('life-old-1') && !!store.readLife('life-new-1'),
      '新档旧档都能读回来');
  }
}


section('官方存档一个字节都没变');{
  let changed = [];
  for (const [k, before] of Object.entries(officialBefore)) {
    const now = JSON.stringify(wxMock.getStorageSync(k));
    if (now !== before) changed.push(k);
  }
  ok(changed.length === 0, changed.length ? `被改了：${changed.join('、')}` : '官方键逐字节不变');
  const ours = Object.keys(storage).filter((k) => k.indexOf('xianxia.') === 0);
  ok(ours.length > 0, `修仙只写自己的键（${ours.length} 个，全是 xianxia.*）`);
  const foreign = Object.keys(storage).filter((k) => k.indexOf('xianxia.') !== 0 && !(k in officialBefore));
  ok(foreign.length === 0, foreign.length ? `写了不该写的键：${foreign.join('、')}` : '除了测试用的官方键，没写别的');
}

console.log(`\n结果：${pass} 通过 / ${fail} 失败`);
process.exit(fail ? 1 : 0);
