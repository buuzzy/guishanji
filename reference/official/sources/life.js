

const app = getApp();
const { api, countryName, sexLabel, jobLabel, eduLabel, dispName, peerName } = require('../../view');
const O = require('../../official');
const music = require('../../../../adapter/music.js');

const idcard = require('../../../../idcard.js');
const cardArt = require('../../../../adapter/card.js');
const share = require('../../../../adapter/share.js');   // 转发给朋友（2026-10-26 打开）

const records = require('../../../../records.js');
const shelf = require('../../art/shelf.js');   // 陈列架像素小人（官方 recordLife 的 sk / pt）
const { beginLife: lifeBegin } = require('../../life-begin.js');   // 官方 beginLife() 的等价物
const engineReady = require('../../engine.js');   // 引擎就绪门控（引擎逻辑块在另一个分包）
/* 引擎就绪门控 + 失败提示（2026-10-31 白屏修复：原来 14 处 .then 全无 .catch） */
const gate = require('../../engine-gate.js');
const SPEEDS = [1, 2, 4, 8, 12, 16];

/**
 * 身份证那两张 canvas 的「节点还没挂上」重试次数（2026-11-01 性能优化）。
 * ------------------------------------------------------------------
 * canvas 节点要等渲染层把它挂上来才拿得到 ⇒ 第一次查必然拿不到。
 * 官方口径是「先渲染到页面上，等一帧再操作 canvas」
 * （终章页的结图/纪念卡用的是同一套重试，见 memorial.js 的 GRAIN_NODE_RETRY）。
 *
 * ⚠ 为什么要有上限：拿不到就意味着那块面板还没渲染（或者被折起来了）
 *   ⇒ 一直查下去只是白烧桥调用。超过上限就停，等下一次内容真的变了再说。
 */
const ID_NODE_RETRY = 12;

/* ⚠ 2026-11-01：fbView() 随意见反馈入口一起删除（只有 openFeedback/copyFeedback 用它）。 */

const CAT = {
  pause: () => api.L`잠시 멈춤`,
  small: () => api.L`작은 선택`,
  family: () => api.L`가족과 함께 정해요`,
  major: () => api.L`중대 결정`,
};

const NOTE_PH = () => '把想到的事写成一句话吧（选填）';

Page({
  data: {
    theme: '',
    statusBarHeight: 0,
    ready: false,
    dead: false,
    age: 0,
    year: 2026,
    prog: 0,
    paused: false,
    auto: false,
    speed: 1,
    speeds: SPEEDS,
    ff: false,
    name: '',
    country: '',
    born: '',
    eraYear: 0,
    sex: 'M',
    urban: true,
    rel: 'N',
    stats: [],
    money: 0,
    income: 0,
    edu: '',
    job: '',
    focusOpts: [],
    hasFocus: false,
    canShop: false,
    focus: '—',
    focusDesc: '',
    feed: [],

    feedTotal: 0,
    starOn: '',
    starOff: '',

    starSheet: null,
    comps: [],
    lifemap: [],
    path: [],
    pathIds: [],
    dec: null,
    /* 决策卡「先收起来」之后，底部那条常驻提示（官方 #decPeek） */
    decPeek: null,
    shop: null,
    shopMoreOpen: false,
    shopSetOpen: false,
    cardText: '',
    autoDecAt: 0,
    /**
     * 「先收起来」期间要**真正停掉自动决策**。
     * 官方 decPeek(true) 调 stopAuto() ⇒ UI.autoDec = null（当次倒计时作废）。
     * ⚠ 只把 autoDecAt 归零不够：小程序主循环下一帧看到 S.auto 仍为真，
     *   又会重新起表 ⇒ 1.2 秒后照样自动替你选。
     *   官方那边不会出现，是因为 stopAuto 之后 modal 被藏起来，
     *   主循环不再重新起表（官方只在自己那次调用里起表）。
     */
    autoDecStopped: false,
    lastTick: 0,
    ageSpan: '',

    moreOpen: false,
    musicOn: false,
    reflectOn: true,
    softOn: false,
    vol: 0.5,
    themeIcon: '◐',
    themeTxt: '',

    fullLog: null,
    logDec: -1,

    famRows: [],

    /* 场景里的人（官方 sceneModel：伴侣 / 子女 / 父母 + 主角） */
    people: [],
    /* 官方场景画布的模型（官方 sceneModel 的整张表） */
    sceneModel: null,

    /* 官方 UI.prefs.fold：人生页各面板的折叠状态 */
    fold: {},
    foldOpen: '',
    foldClose: '',
    idcard: null,

    /* ⚠ 2026-11-01（用户拍板）：fb / fbType / fbText / fbNick 随意见反馈入口一起删除。 */

  },

  onLoad() {
    if (engineReady.isReady()) this.init();
    else gate.whenReady(() => this.init());
  },

  init() {
    music.setTables(api.CHORDS, api.PENTA);
    const S = app.globalData.life;
    if (!S) { wx.redirectTo({ url: '/subpkg/engine/pages/index/index' }); return; }
    this.beginLife(S);
    this.labels = O.topBarLabels();
    this.setData({
      theme: app.globalData.dark ? 'theme-dark' : 'theme-light',
      statusBarHeight: app.globalData.statusBarHeight || 0,
      /* ⚠ 2026-10-26：弹层顶部要让开右上角胶囊（意见弹层的「关闭」原来被盖住） */
      sheetPadTop: app.globalData.sheetPadTop || 0,
      musicOn: !!app.globalData.prefs.music,
      reflectOn: app.globalData.prefs.reflect !== false,
      softOn: !!app.globalData.prefs.soft,
      /* 官方 foldInit()：把持久化的折叠状态套到各面板上 */
      fold: Object.assign({}, app.globalData.prefs.fold || {}),
      foldOpen: api.L`펼치기`,
      foldClose: api.L`접기`,
    });
    this.syncChrome();
    this.lastTick = Date.now();
    /* 「本页已经初始化过」的标记 —— onShow 靠它决定要不要把主循环重新起起来
     * （不能用 `this.timer`：onHide 已经把它清空了，见 onShow 的注释）。 */
    this.started = true;
    this.startLoop();
    this.sync(true);
  },

  /**
   * 官方 beginLife() 的小程序等价物
   * ======================================================================
   *
   * ⚠⚠ **这是整个项目最要命的一个坑**（2026-10-24 实测挖出）：
   *
   *   官方引擎 `newLife()` 造出来的人生，`phase` 是 **'birth'**，不是 'life'。
   *   Node 里直接验过：
   *     API.newLife('now', 60, null, null).phase === 'birth'
   *
   *   而把它翻成 'life' 的那一步在**官方网页的 UI 层**，叫 `beginLife()`
   *   （vendor/official/ui.zh-hans.0.8.15.js:7763）——
   *   **引擎没有导出 beginLife**（`API.beginLife === undefined`），
   *   它只是官方网页那个文件的函数，小程序这边拿不到。
   *
   *   ⇒ 后果：只 `newLife()` 然后跳到人生页的话，人生页主循环的守卫
   *     `S.phase === 'life'` 永远不成立 ⇒ `api.tick()` 从不被调用
   *     ⇒ **人生停在 0 岁不动**（年龄一直是 0，也永远等不到抉择卡）。
   *     模拟器的「16 页渲染门禁」查不出来 —— 页面确实渲染出来了，
   *     只是它是一张静止的画面。
   *
   * 实现放在 `../../life-begin.js`（独立模块 ⇒ Node 侧的
   * `scripts/test-life-begins.mjs` 能直接 require 它来守门）。
   */
  beginLife(S) {
    return lifeBegin(api, S, {
      speed: app.globalData.prefs.speed,
      save: (x) => app.saveCurrent(x),
    });
  },

  onShow() {
    // 引擎还没就绪时（本页被深链直接打开、没经过启动页屏障）先等一等，
    // 否则 onShow 会跑在 init 之前，看到半初始化的页面。
    if (!engineReady.isReady()) { gate.whenReady(() => this.onShow()); return; }

    this.setData({ theme: app.globalData.dark ? 'theme-dark' : 'theme-light' });
    this.lastTick = Date.now();
    /* ⚠⚠ **守卫必须用 `started`，不能写 `if (this.timer)`**（2026-10-25 真机挖到）：
     *   onHide 里 stopLoop() 把 timer 清成了 null ⇒ 「if (this.timer)」在息屏 /
     *   切后台再回来之后**永远不成立** ⇒ 主循环再也起不来
     *   ⇒ 人生不再往前推进、点了像没反应、「加速」也看不出来（全都只改偏好，
     *     真正生效要靠主循环去读）。
     *   官方网页版的等价语义：`visibilitychange` 切走时存档、回来时继续
     *   （官方 ui.zh-hans.0.8.32.js 的 document.addEventListener("visibilitychange", …)）。
     */
    if (this.started) this.startLoop();
  },

  onHide() {
    this.stopLoop();
    /* 官方切后台时存盘（官方 visibilitychange → hidden → save()）⇒ 这边照做，
     * 免得息屏前的最后一段没落盘。存盘失败不阻断（官方也是 try/catch）。 */
    try { const S = api.S; if (S) app.saveCurrent(S); } catch (e) { /* 忽略 */ }
  },
  onUnload() { this.stopLoop(); },

  /**
   * 「转发给朋友」（微信右上角「···」里的系统入口）。
   * ⚠ 官方文档：**只有定义了 onShareAppMessage，右上角菜单才会出现「转发」按钮**。
   * 2026-10-26 打开（之前 2026-10-25 拍板「不做分享能力」，把菜单关掉了）。
   */
  onShareAppMessage() {
    const S = api.S;
    return share.shareLife(S ? countryName(S.cur) : '', S ? S.age : 0);
  },

  /* ── 官方 foldToggle(k)：折叠/展开人生页的一个面板 ─────────────────────
   * 官方 ui.zh-hans.0.8.15.js:9884：
   *   const f = UI.prefs.fold || (UI.prefs.fold = {}); f[k] = !f[k];
   *   lsSet(PREF_KEY, UI.prefs); foldSet(k, f[k]);
   * 小程序这边没有 DOM class，用 wx:if 收起面板体（官方是 .panel.folded
   * 把 h3 以外的兄弟节点 display:none —— WXSS 不支持 :not()，所以改成条件渲染）。*/
  toggleFold(e) {
    const k = e.currentTarget.dataset.k;
    if (!k) return;
    const f = app.globalData.prefs.fold || (app.globalData.prefs.fold = {});
    f[k] = !f[k];
    app.setPref('fold', f);
    this.setData({ fold: Object.assign({}, f) });
  },

  /* ⚠⚠ 2026-11-01（单机版下线世界快照）：
   *   官方 #tgLine「此刻有多少人一起活在这个人生模拟里」来自**世界快照**
   *   （POST /api/e 带 ww:1）⇒ 单机版没有后端 ⇒ 这一行永远拿不到数据。
   * ⇒ 轮询的三个方法（startWorld / stopWorld / pollWorld）与 wxml 上那一行
   *   一并删掉（不是留着跑一个永远返回空壳的定时器）。
   *   官方移植（official.js 的 tgLine）仍在 —— 恢复后端时按原样接回即可。 */

  startLoop() {
    this.stopLoop();
    this.timer = setInterval(() => this.step(), 100);
  },

  stopLoop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  },

  step() {
    const S = api.S;
    if (!S) return;
    const now = Date.now();
    /* ⚠ **单次推进最多 0.25 秒** —— 照官方网页版逐字抄的口径
     *   （官方 ui.zh-hans.0.8.32.js 的 frame0()：`const t = Math.min(.25, (e-last)/1e3)`）。
     *   为什么要夹：息屏 / 切后台回来时，墙上时钟可能已经过去好几分钟；
     *   不夹的话 `tick(dt)` 一次就把几年跑完（人生瞬间结束、看着像「坏了」）。
     *   夹住之后，官方是「切走就暂停、回来继续」，小程序这边同一个口径。
     *   ⚠ 正常运行时两次 tick 之间只隔 100 ms ⇒ dt ≈ 0.1 ⇒ 不会被这个上限影响。 */
    const dt = Math.min(0.25, (now - this.lastTick) / 1000);
    this.lastTick = now;

    if (now - (this.lastSave || 0) > 2000) {
      this.lastSave = now;
      try { app.saveCurrent(S); } catch (e) {   }
    }

    if (S.phase === 'life' && !S.paused && !S.pending) {

      /* 官方主循环：tick(dt * (S.ff ? 24 : 1)) —— ff 是「快转到下一个抉择」 */
      api.tick(dt * (this.data.ff ? 24 : 1));
      if (S.phase !== 'life') { this.onDeath(); return; }

    } else if (S.pending) {

      /* 官方 stopAuto()：当次自动决定作废。
         ⚠ autoDecStopped ⇒ 「先收起来」期间不自动替你选。 */
      if (S.auto && !this.autoDecStopped) {
        if (!this.autoDecAt) this.autoDecAt = now;
        else if (now - this.autoDecAt > 1200) {
          const k = this.autoK(S.pending);
          this.onChoose({ currentTarget: { dataset: { k: k || 'skip' } } });
          return;
        }
      }
    }
    this.sync();
  },

  /** 自动抉择：故事卡用内容逻辑的自动选法（原版卡照旧走引擎） */
  autoK(pd) {

    return api.autoChoice(pd);
  },

  /**
   * 把页面数据刷新到当前人生的状态。
   * ======================================================================
   *
   * ⚠⚠ **为什么要拆成「快变 / 慢变」两组**（2026-11-01 性能优化）
   *
   * 主循环每 100 ms 跳一次（`startLoop()`），官方网页版那边是 rAF 逐帧刷新。
   * 原来这里**每次都整页 setData**：48 个顶层键、5,509 B 载荷，
   * 外加两次 `createSelectorQuery` + 两次 canvas 重绘（身份证花纹与像素头像）。
   *
   * 那两张画布**一年才变一次**（年龄 / 性别 / 城乡 / 关系），却每 100 ms 重画一遍。
   * 真机上这不是 JS 计算耗时，而是 **JS↔native 桥的序列化 + 视图层重建**：
   * 10 秒 = 200 次 setData、538 KB 载荷、20 次选择器查询、20 次画布重绘。
   *
   * ⇒ 现在的口径（**照抄同项目里 px-scene 组件的做法**，
   *   也就是官方 `renderScene` 的 `sceneKey` 同一个思路）：
   *   · **快变组**：每帧真的要变（年龄、进度、速度、状态行…）⇒ 每次都更。
   *   · **慢变组**：内容没变就**整块跳过**（统计、收支、家人、身份证、
   *     同伴、迁移路径、寿命图、场景…）。
   *   · **画布**：用指纹当门 ⇒ 指纹没变就不重画。
   *
   * ⚠ 慢变组用「**整块 JSON 签名**」判定，不是手挑字段：
   *   签名 = 这组值的 JSON.stringify ⇒ **值变了就一定会被更新**，
   *   不会漏掉「花钱之后金额变了」这类不靠年龄触发的变化。
   */
  sync(first) {
    const S = api.S;
    if (!S) return;

    /* ── 快变组：每帧都要更的那些 ── */
    const patch = {
      ready: true,
      dead: S.phase !== 'life',
      age: S.age,
      year: (S.by || 0) + S.age,
      prog: Math.round((S.t || 0) * 100),
      /* ⚠⚠ 2026-10-26 真机反馈：「默认 1x 但快得像 8x/12x」的**真正原因**。
       *   官方 beginLife() 会**沿用上次选的速度**（UI.prefs.speed），
       *   而原来这里 data.speed 永远是初始值 1 ⇒ 界面显示 1×、引擎真的在 8× 跑。
       *   官方网页版的按钮高亮用的是 S.speed（ui.zh-hans.0.8.32.js 的 renderTop：
       *   `+o.dataset.speed===S.speed`）⇒ 现在照官方把真实速度写回去。 */
      speed: S.speed || 1,
      /* 官方 #ageYear 的尾巴：1年≈{N}秒（N = round(S.yearSec / S.speed)） */
      yearSec: Math.round((S.yearSec || 60) / (S.speed || 1)),
      name: dispName(S),
      country: countryName(S.cur),
      focus: S.focus && api.FOCUS[S.focus] ? api.FOCUS[S.focus].n : '—',
      focusDesc: S.focus && api.FOCUS[S.focus] ? api.FOCUS[S.focus].d : '',
      /* 官方 #status（人生页「状态行」）：官方 statusLine() 的逐字移植 */
      statusParts: O.statusLine(S),
      ageSpan: S.age === 0 ? '0 岁' : `${S.age} 岁`,
    };

    /* ── 慢变组：内容没变就整块跳过 ── */
    const slow = this.slowPatch(S);
    const slowSig = JSON.stringify(slow);
    if (slowSig !== this._slowSig) {
      this._slowSig = slowSig;
      Object.assign(patch, slow);
    }

    /* ── 记录列表单独一组 ──
     * ⚠ 展开全部时最多 1500 条（官方 DOM 上限）⇒ 不能跟着慢变组每帧 stringify。
     *   官方 addFeed 是**插到最前面**的 ⇒ 长度变了就是有新记录。
     *   加星 / 展开某一行 / 切换「看全部」都由 syncFeed() 自己刷。 */
    const logLen = (S.log || []).length;
    if (logLen !== this._logLen) {
      this._logLen = logLen;
      Object.assign(patch, this.feedPatch(S));
    }

    /* ── 顶栏那排小控件（官方 renderTop）── */
    Object.assign(patch, this.chromePatch());

    this.setData(patch);
    /* 官方换编曲是按年龄分段的（stageOf）⇒ 慢变，但每帧算一次也就一次字符串比较 */
    if (api.S) music.setStage(music.stageOf(api.S.age, api.S.phase === 'life'));
    this.drawIdCard(S);

    this.applyDec();

    if (first) this.setData({ lastTick: Date.now() });
  },

  /**
   * 慢变组：那些「一年才变一次」的面板数据。
   * ------------------------------------------------------------------
   * 单独拆成一个方法，是为了 `sync()` 能拿它的 JSON 当签名
   * （内容没变 ⇒ 整块跳过 setData）。
   *
   * ⚠ 这里面**不含**记录列表（feed）：展开全部时 1500 条，
   *   每帧 stringify 一次太贵 ⇒ 记录列表单独一组（见 sync()）。
   */
  slowPatch(S) {
    const st = S.st;
    const stats = [
      { k: 'hl', n: '健康', v: Math.round(st.hl), c: 'var(--good)' },
      { k: 'h', n: '幸福', v: Math.round(st.h), c: 'var(--accent)' },
      { k: 'sm', n: '知识', v: Math.round(st.sm), c: 'var(--stamp)' },
      { k: 'so', n: '关系', v: Math.round(st.so), c: 'var(--gold)' },
    ];

    let focusOpts = [];
    try {
      focusOpts = (api.focusOptions() || []).map((k) => ({
        k,
        n: api.FOCUS[k] ? api.FOCUS[k].n : k,
        d: api.FOCUS[k] ? api.FOCUS[k].d : '',
        on: S.focus === k,
      }));
    } catch (e) {   }

    /* 官方 renderMini() / renderFocus() 的两处显示条件（照抄）：
     *   const o = focusOptions(), fo = $('#mbFo'); fo.hidden = !o.length;
     *   for (const id of ['mbShop','goShop']) { b.hidden = !shopCan(); }
     *   官方 shopCan = () => !!S && S.phase === 'life' && focusOptions().length > 0
     * ⇒ 还没到能选重心的年纪时，迷你条只剩状态条，重心按钮与花钱按钮都不出现；
     *   同时 .p-focus 的「随时可改」小标也隐藏（官方 focusLbl.hidden = !o.length）。 */
    const hasFocus = focusOpts.length > 0;
    const canShop = S.phase === 'life' && hasFocus;

    const lm = [];
    const years = S.years || [];
    for (let a = 0; a < 110; a++) {
      let cls = '';
      if (a < S.age) {
        const y = a === 0 ? null : years[a - 1];
        const h = y ? y.h : 50;
        cls = h >= 70 ? 'hi' : h >= 45 ? 'mid' : 'lo';
      } else if (a === S.age) cls = 'now';
      lm.push({ a, cls });
    }

    const path = [];
    let curSeg = null;
    for (let a = 0; a <= S.age; a++) {
      const y = a === 0 ? null : years[a - 1];
      const c = y ? y.cur : S.born;
      if (!curSeg || curSeg.id !== c) {
        if (curSeg) curSeg.to = a - 1;
        curSeg = { id: c, country: countryName(c), from: a, to: a, i: path.length };
        path.push(curSeg);
      } else {
        curSeg.to = a;
      }
    }

    const comps = (S.comps || []).map((c, i) => {
      const dAge = c.death && c.death.age != null ? c.death.age : null;
      const alive = dAge == null || dAge > S.age;
      return {
        /* ⚠ 2026-10-26 真机反馈：这里原来直接渲染 `c.name`，
         *   而引擎里同伴的名字是**对象**（{cl, g, full}）⇒ 页面上出现
         *   一片 `[object Object]`。官方是用 callName(g.name) 取显示名的
         *   （引擎已导出 callName，见 scripts/extract-engine.mjs 的 REQUIRED 清单）。
         *   名字为字符串时原样用。 */
        name: peerName(c.name),
        key: `${c.iso || ''}-${i}`,
        country: countryName(c.iso),
        age: alive ? `${S.age}` : `${dAge}`,
        alive,
      };
    });

    /* 官方场景画布（2026-10-26 残留项：把人生页背景换成官方那张画布）。
     * 官方 renderScene() 的口径是「内容没变就不重画」——
     *   `const s = sceneKey(t, a) + n; if (s === scKey) return;`
     * 这一侧的守卫由**慢变组的 JSON 签名**兜住：模型没变 ⇒ 签名没变
     * ⇒ 整块跳过 ⇒ px-scene 组件的 observer 也不会被触发
     * （组件内部自己还有一层 sceneKey 守卫，两层口径一致）。 */
    const scene = O.sceneModel(S);

    return {
      stats,
      focusOpts,
      hasFocus,
      canShop,
      born: countryName(S.born),
      eraYear: S.era && S.era !== 'now' ? (S.by || 0) : 0,
      sex: S.sex,
      urban: S.urban,
      rel: S.rel,
      /* ⚠ 2026-10-26 真机反馈：「面板币种写成美元」。
       * 这里交给引擎的 `wonStr` 出字符串（中文：元/万元/亿元），
       * wxml 里不要再自己拼「美元」。 */
      money: this.moneyText(S.money),
      income: this.moneyText(S.income),
      edu: eduLabel(),
      job: jobLabel(),
      starOn: records.starLabel({ star: 1 }),
      starOff: records.starLabel({ star: 0 }),
      comps,
      lifemap: lm,
      path,
      pathIds: path.map((x) => x.id),
      famRows: O.familyRows(),
      /* 收支一览（2026-10-26 真机反馈：看不到自己的收支） */
      money2: O.moneyRows(S),
      /* 场景里的人（官方 sceneModel 的那一份：伴侣 / 子女 / 父母 + 主角） */
      people: (scene && scene.people) || O.scenePeople(S),
      /* 官方场景画布的模型（官方 sceneModel 的整张表） */
      sceneModel: scene,

      idcard: idcard.idCard(S),
    };
  },

  /**
   * 记录列表这一组（官方 #feed）。
   * ------------------------------------------------------------------
   * 单独拆出来是因为「看全部」时最多 1500 条 ⇒ 不能每帧进慢变组的签名。
   */
  feedPatch(S) {
    const v = this.buildFeed(S);
    return {
      feed: v.items,
      feedTotal: v.total,
    };
  },

  /**
   * 官方 showDecision()：把 S.pending 渲染成决策卡。
   * 抽成独立方法，是因为「先收起来 → 重新展开」要能**重新渲染一次**
   * （官方 decPeek(false) 收起弹层，再 decBack() 重新展开）。
   *
   * @param {boolean} force  true = 强制重渲染（官方 decBack()：卡还在，
   *                         只是重新显示出来）⇒ **不能清掉用户已输入的字**。
   */
  applyDec(force) {
    const S = api.S;
    if (S.pending && S.pending.view) {
      /* 已经「先收起来」了 ⇒ 不要把卡再弹回来（官方靠 S.pending 不变，
         循环里不会再调 showDecision；小程序是每 tick 都 sync，所以要挡一下） */
      if (this.data.decPeek && !force) return;
      const cur = this.data.dec;
      const v = S.pending.view;
      const key = `${S.pending.id}|${S.age}`;
      if (force || !cur || cur.key !== key) {
        const patch = {
          dec: {
            key,
            id: S.pending.id,
            age: S.age,
            year: (S.by || 0) + S.age,
            view: {
              cat: this.categoryOf(S.pending.id, v),
              pause: !!v.q,
              title: v.q ? `${dispName(S)}，${S.age} 岁` : v.title,
              body: v.body || '',
              fact: v.fact || '',
              q: v.q || '',
              ph: v.q ? NOTE_PH() : '',
              name: v.name ? { ph: v.name.ph || '', max: v.name.max || 40 } : null,
              /* ⚠ 2026-10-26 第七轮：选项拆成「剧情」与「控制」两组渲染
               *   （控制项 = kind:'control'，是「暂停 / 结束」这类流程按钮，
               *    不是剧情 ⇒ 不编号、灰色小字、放在卡片底部）。
               *   ⇒ 这里顺带把**编号算好**：控制项混在数组里，
               *     若直接用 wx:for 的 index 会出现跳号（1、2、4）。 */
              choices: (() => {
                const out = [];
                let n = 0;
                for (const c of (v.choices || [])) {
                  if (c.kind === 'control') { out.push({ k: c.k, label: c.label, sub: c.sub || '', kind: 'control', no: 0 }); continue; }
                  n += 1;
                  out.push({ k: c.k, label: c.label, sub: c.sub || '', kind: '', no: n });
                }
                return out;
              })(),
            },
          },

          /* 官方 showDecision() 里 S.ff = false —— 出了抉择就停下快转 */
          ff: false,
        };
        /* 官方 decBack() 只是把 #modal 重新显示出来（DOM 没重建）
           ⇒ 用户已经写进 textarea 的字要留着；只有「新抉择」才清空。 */
        if (!force) patch.cardText = '';
        this.setData(patch);
        try { if (api.S) api.S.ff = false; } catch (e) { /* 忽略 */ }
        this.autoDecAt = 0;
        this.autoDecStopped = false;
      }
    } else if (this.data.dec || this.data.decPeek) {
      this.setData({ dec: null, decPeek: null, cardText: '' });
      this.autoDecAt = 0;
      this.autoDecStopped = false;
    }
  },

  /**
   * 官方 decPeek(true)：把决策卡收起来，底部留一条常驻提示。
   * 官方文案（vendor/official/ui.zh-hans.0.8.15.js:8458 / 8488）：
   *   按钮  「先收起来 ▾」（title：可以先看看后面的画面，再展开来选择）
   *   条文  「有一个抉择正在等你」+ 标题（暂停类是「暂停片刻 · N岁」）
   */
  decMin() {
    const S = api.S;
    if (!S || !S.pending || !S.pending.view) return;
    const v = S.pending.view;
    this.setData({
      dec: null,
      decPeek: { title: v.q ? api.L`잠시 멈춤 · ${S.age}세` : (v.title || '') },
    });
    /* 官方 decPeek(true) 里第一件事就是 stopAuto() */
    this.autoDecAt = 0;
    this.autoDecStopped = true;
  },

  /** 官方 decBack()：把收起来的决策卡重新展开 */
  decOpen() {
    this.setData({ decPeek: null });
    this.autoDecStopped = false;
    this.autoDecAt = 0;
    this.applyDec(true);
  },

  categoryOf(id, v) {
    if (v.q) return CAT.pause();
    if (String(id || '').startsWith('sm_')) return CAT.small();
    const S = api.S;
    if (S && S.dd && S.dd.lv === 2 && S.age >= 16) return CAT.family();
    return CAT.major();
  },

  /**
   * 身份证那两张画布（雕版花纹 + 像素头像）。
   * ======================================================================
   *
   * ⚠⚠ **原来这里是每次 sync 都画一遍**（2026-11-01 性能优化）：
   *   每 100 ms 两次 `createSelectorQuery` + 两次 canvas 重绘
   *   ⇒ 真机上 20 次选择器查询 + 20 次重绘/秒，全是白烧电。
   *
   * 而这两张图**一年才变一次**：
   *   · **花纹**：官方 guilloche 是固定公式（14 条正弦曲线），与内容无关
   *     ⇒ 画一次就够（官方网页版也是 SVG，一次挂上去就不再动）。
   *   · **头像**：`drawPortraitPx` 只用到「年龄 / 性别 / 城乡 / 关系 /
   *     出生年 / 当前国家」⇒ 指纹没变就不重画。
   *
   * ⇒ 口径与同项目 `px-scene` 组件的 `sceneKey` 一致（官方 `renderScene`
   *   的同一个思路）：**内容没变就不重画**。
   *
   * ⚠ 节点还没挂上时不记指纹 ⇒ 下一拍会重试（官方口径是「先渲染到页面上，
   *   等一帧再操作 canvas」，小程序这边就是靠这个重试）。
   */
  drawIdCard(S) {
    const dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 0) || 2;

    /* ① 雕版花纹：固定图案 ⇒ 画一次 */
    if (!this._idGuillocheDone && (this._idGuillocheTry || 0) < ID_NODE_RETRY) {
      this._idGuillocheTry = (this._idGuillocheTry || 0) + 1;
      wx.createSelectorQuery().in(this).select('#idGuilloche')
        .fields({ node: true, size: true })
        .exec((res) => {
          const r = res && res[0];
          if (!r || !r.node) return;    /* 节点还没挂上 ⇒ 下一拍再试 */
          this._idGuillocheDone = true;
          this._idGuillocheTry = 0;
          const canvas = r.node;
          const ctx = canvas.getContext('2d');
          canvas.width = Math.max(1, Math.round(r.width * dpr));
          canvas.height = Math.max(1, Math.round(r.height * dpr));
          try {
            idcard.drawGuilloche(ctx, 320, 220, 'rgba(15,110,104,.09)');
          } catch (e) {   }
        });
    }

    /* ② 像素头像：指纹没变就不重画 */
    const sig = `${S.age}|${S.sex}|${S.urban ? 1 : 0}|${S.rel}|${S.by}|${S.cur}`;
    if (sig === this._idPortraitSig) return;
    if ((this._idPortraitTry || 0) >= ID_NODE_RETRY) return;
    this._idPortraitTry = (this._idPortraitTry || 0) + 1;
    wx.createSelectorQuery().in(this).select('#idPortrait')
      .fields({ node: true, size: true })
      .exec((res) => {
        const r = res && res[0];
        if (!r || !r.node) return;    /* 节点还没挂上 ⇒ 不记指纹 ⇒ 下一拍再试 */
        this._idPortraitSig = sig;
        this._idPortraitTry = 0;
        const canvas = r.node;
        const ctx = canvas.getContext('2d');
        canvas.width = Math.max(1, Math.round(r.width * dpr));
        canvas.height = Math.max(1, Math.round(r.height * dpr));
        try {
          cardArt.drawPortraitPx(ctx, 0, 0, canvas.width, canvas.height, S.age, S);
        } catch (e) {   }
      });
  },

  /**
   * 顶栏那排小控件（官方 renderTop）。
   * ------------------------------------------------------------------
   * 单独拆出来是为了 `sync()` 能把它并进**同一次** setData
   * （原来 sync() 先 setData 一次、再 syncChrome() 又 setData 一次
   *   ⇒ 每帧两次桥往返，白白多一次）。
   */
  chromePatch() {
    const p = app.globalData.prefs;
    const th = O.themeLabel(p.theme);
    return {
      themeIcon: th.icon,
      themeTxt: th.text,
      reflectOn: p.reflect !== false,
      softOn: !!p.soft,
      musicOn: !!p.music,
      vol: typeof p.vol === 'number' ? p.vol : 0.5,
      auto: !!(api.S && api.S.auto),
    };
  },

  syncChrome() {
    const L = this.labels || O.topBarLabels();
    this.setData(this.chromePatch());

    if (api.S) music.setStage(music.stageOf(api.S.age, api.S.phase === 'life'));
    return L;
  },

  toggleMore() {
    this.setData({ moreOpen: !this.data.moreOpen });
  },

  toggleAuto() {
    const S = api.S;
    if (!S) return;
    S.auto = !S.auto;
    app.setPref('auto', S.auto);
    this.setData({ auto: S.auto });
    wx.showToast({ title: S.auto ? '自动模式：只看不选' : '已关闭自动模式', icon: 'none' });
  },

  toggleReflect() {
    const on = !this.data.reflectOn;
    app.setPref('reflect', on);
    this.setData({ reflectOn: on });
  },

  toggleSoft() {
    const on = !this.data.softOn;
    app.setPref('soft', on);

    try {
      api.SOFT_ON = on && !api.EDU_ON;
      if (api.ageSync) api.ageSync();
    } catch (e) {   }
    this.setData({ softOn: on });
  },

  cycleTheme() {
    const cur = app.globalData.prefs.theme;
    const next = O.themeNext(cur);
    app.setPref('theme', next);
    this.setData({ theme: app.globalData.dark ? 'theme-dark' : 'theme-light' });
    this.syncChrome();
  },

  toggleMusic() {
    const on = !this.data.musicOn;
    if (on) {
      const ok = music.setOn(true);
      app.setPref('music', ok);
      this.setData({ musicOn: ok });
      if (!ok) wx.showToast({ title: '这个环境放不出音乐', icon: 'none' });
    } else {
      music.stop();
      app.setPref('music', false);
      this.setData({ musicOn: false });
    }
  },

  setVolume(e) {
    const v = Number(e.detail.value) / 100;
    app.setPref('vol', v);
    music.setVolume(v);
  },

  /**
   * 滚到某个锚点，**并且避开吸顶的顶栏**。
   *
   * ⚠ 2026-10-26 真机反馈：点「重心」跳到「今年的重心」，结果那行**被吸顶的
   *   加速选项挡住**了（加速选项那一排是 fixed 在顶上的）。
   *   `wx.pageScrollTo({selector})` 会把目标滚到**视口最顶端** ⇒ 正好钻进顶栏底下。
   *
   * 用户的意见：**顶栏的加速选项不动**（它吸顶是对的），只处理「定位」。
   * ⇒ 这里改成：先量出目标在页面里的位置，再往上让出顶栏的高度。
   */
  scrollToAnchor(sel) {
    const self = this;
    /* 顶栏高度兜底：状态栏 + 一行按钮（顶栏量不到时用这个） */
    const fallbackBar = (self.data.statusBarHeight || 0) + 96;
    try {
      wx.createSelectorQuery().in(this)
        .select(sel).boundingClientRect()
        .select('.topbar').boundingClientRect()
        .selectViewport().scrollOffset()
        .exec((res) => {
          const r = res && res[0];
          const bar = res && res[1];
          const vp = res && res[2];
          if (!r || typeof r.top !== 'number') {
            /* 量不到就退回老办法（宁可被挡一次，也不要整页跳错） */
            wx.pageScrollTo({ selector: sel, duration: 220 });
            return;
          }
          const barH = bar && typeof bar.height === 'number' && bar.height > 0 ? bar.height : fallbackBar;
          const scrollTop = (vp && typeof vp.scrollTop === 'number' ? vp.scrollTop : 0);
          /* 目标在文档里的位置 = 视口里的位置 + 当前滚动量 */
          const docTop = scrollTop + r.top;
          /* 再往上让出顶栏 + 一点点缝隙（8px） */
          const to = Math.max(0, docTop - barH - 8);
          wx.pageScrollTo({ scrollTop: to, duration: 220 });
        });
    } catch (e) {
      try { wx.pageScrollTo({ selector: sel, duration: 220 }); } catch (e2) { /* 忽略 */ }
    }
  },

  goFam() {
    this.setData({ moreOpen: false });
    this.scrollToAnchor('#p-fam');
  },

  goFocus() {
    this.scrollToAnchor('#p-focus');
  },

  goShop() {
    this.setData({ moreOpen: false });
    this.openShop();
  },

  /* ⚠ 2026-11-01（用户拍板）：「⋯ 菜单 → 提供意见」入口删除 ⇒
   *   openFeedback / closeFeedback / setFbType / onFbText / onFbNick /
   *   copyFeedback / copyHelpMail 一族与 fb / fbType / fbText / fbNick 字段、
   *   fbView()、wxml 弹窗、.dec .fb 样式一并清掉。
   *   官方 O.feedback / feedbackContext 的对齐副本仍在 official.js（有测试盯着）；
   *   恢复入口时按 Git 历史接回。 */

  openFullLog() {
    const log = O.fullLog(api.S);
    this.setData({ fullLog: log, logDec: -1 });
  },

  closeFullLog() {
    this.setData({ fullLog: null, logDec: -1 });
  },

  syncFeed() {
    const S = api.S;
    if (!S) return;
    const v = this.buildFeed(S);
    this.setData({
      feed: v.items,
      feedTotal: v.total,
    });
  },

  buildFeed(S) {
    const v = records.feedItems(S, false);   /* ⚠ 2026-11-01：固定 6 条，看全部走 openFullLog */
    const open = this.openRows || (this.openRows = new Set());
    for (const it of v.items) it.op = open.has(it.li);
    return v;
  },

  toggleFeedRow(e) {
    const li = Number(e.currentTarget.dataset.li);
    const open = this.openRows || (this.openRows = new Set());
    if (open.has(li)) open.delete(li);
    else open.add(li);
    this.syncFeed();
  },

  toggleStar(e) {
    const S = api.S;
    if (!S) return;
    const li = Number(e.currentTarget.dataset.li);
    const entry = (S.log || [])[li];
    if (!entry) return;
    const r = records.starToggle(S, entry);
    if (r.over) {

      this.starNew = entry;
      this.setData({ starSheet: records.starSheet(S) });
      return;
    }
    try { app.saveCurrent(S); } catch (err) {   }
    this.syncFeed();
  },

  closeStarSheet() {
    this.setData({ starSheet: null });
    this.starNew = null;
  },

  noop() {},

  swapStar(e) {
    const S = api.S;
    if (!S || !this.starNew) { this.closeStarSheet(); return; }
    const i = Number(e.currentTarget.dataset.i);
    const r = records.starSwap(S, i, this.starNew);
    this.closeStarSheet();
    if (!r.ok) return;
    try { app.saveCurrent(S); } catch (err) {   }
    wx.showToast({ title: r.toast, icon: 'none' });
    this.syncFeed();
  },

  jumpDec(e) {
    const d = Number(e.currentTarget.dataset.d);
    this.setData({ logDec: d });
  },

  togglePause() {
    const S = api.S;
    if (!S) return;
    S.paused = !S.paused;
    this.setData({ paused: S.paused });
  },

  setSpeed(e) {
    const sp = Number(e.currentTarget.dataset.v);
    const S = api.S;
    if (!S) return;
    S.speed = sp;
    S.paused = false;
    app.setPref('speed', sp);

    this.setData({ speed: sp, paused: false, ff: false });
  },

  toggleFf() {
    const S = api.S;
    if (!S) return;
    const on = !this.data.ff;
    S.paused = false;
    /* 官方把「快转到下一个抉择」记在 S.ff 上（引擎里 S.ff 由官方 UI 读写） */
    S.ff = on;
    /* ⚠ 2026-11-01：按钮收进了 ⋯ 菜单 —— 它是动作不是开关 ⇒ 点完自动收起菜单 */
    this.setData({ ff: on, paused: false, moreOpen: false });
  },

  toggleAuto() {
    const S = api.S;
    if (!S) return;
    S.auto = !S.auto;
    this.setData({ auto: S.auto });
    wx.showToast({ title: S.auto ? '自动模式：只看不选' : '已关闭自动模式', icon: 'none' });
  },

  setFocus(e) {
    const k = e.currentTarget.dataset.k;
    const S = api.S;
    if (!S || S.focus === k) return;
    S.focus = k;
    if (S.fT) S.fT[k] = 0;
    this.sync();
  },

  onCardInput(e) {
    this.setData({ cardText: e.detail.value });
  },

  onChoose(e) {
    const k = e.currentTarget.dataset.k;
    const S = api.S;
    if (!S || !S.pending) return;
    api.choose(k, this.data.cardText);
    this.setData({ dec: null, decPeek: null, cardText: '' });
    this.autoDecAt = 0;
    this.autoDecStopped = false;
    this.lastTick = Date.now();
    this.sync();
  },

  shopView() {
    let items = [];
    try { items = api.shopItems() || []; } catch (e) { items = []; }
    let top = [];
    try { top = api.shopTop(items) || []; } catch (e) { top = []; }
    const topIds = new Set(top.map((x) => x.id));
    const rest = items.filter((x) => !topIds.has(x.id));

    /* ⚠ 2026-10-26 真机反馈：「面板币种写成美元」。
     * 官方有本地货币格式器 `wonStr`（中文分支：元/万元/亿元）——
     * 人生记录里那条「−76,364元」就是它写的 ⇒ 这里必须用同一个。 */
    const wonStrFn = O.mpFn('wonStr');
    const money = (n) => {
      if (n == null) return '';
      if (wonStrFn) {
        try { const s = wonStrFn(n); if (s) return String(s); } catch (e) { /* 走下面 */ }
      }
      return `${Math.round(n).toLocaleString('zh-CN')} 元`;
    };
    const S = api.S;
    const L = (tpl, ...vals) => api.L(tpl, ...vals);

    /* 官方 SHOP 表：判断某个条目是不是「只能付现金」（官方 payOK 用） */
    const rawShop = api.SHOP || [];
    const rawOf = (id) => rawShop.find((x) => x && x.id === id) || null;

    /* 官方 payOK / payWhy（取物口递出来的官方函数） */
    const canPay = O.mpFn('canPay');
    const payWhy = O.mpFn('payWhy');
    const cashV = O.mpFn('cashV');

    /**
     * 某个选项买不了时**到底为什么**。
     *
     * ⚠ 官方引擎只给**整条**条目一个 why（冷却 / 锁住 / 钱不够），
     *   **选项**那一层没有原因字段 ⇒ 以前这里只能弹一句「现在还不能买这一项」，
     *   玩家完全不知道差什么（2026-10-26 真机反馈）。
     *   现在按官方那套判定把原因补出来：
     *     ① 引擎自己给了原因（o.why）→ 直接用；
     *     ② 整条被冷却 / 锁住（it.why）→ 所有选项都受同一条约束；
     *     ③ 钱不够 → 官方 payWhy 的两句（「钱不够」/「超过可借贷的额度」）。
     */
    const whyOf = (it, o) => {
      if (o && o.why) return o.why;
      if (it && it.why) return it.why;
      const price = o && typeof o.price === 'number' ? o.price : (it && typeof it.price === 'number' ? it.price : 0);
      if (price > 0 && canPay && payWhy) {
        const raw = rawOf(it.id);
        const cashOnly = !!(raw && raw.cash);
        let ok = false;
        try {
          ok = cashOnly ? (cashV ? cashV() >= price : false) : !!canPay(price);
        } catch (e) { ok = false; }
        if (!ok) {
          try { return payWhy(price) || '钱不够'; } catch (e) { return '钱不够'; }
        }
      }
      return '现在还不能选这一项';
    };

    const view = (it) => ({
      id: it.id,
      n: it.n,
      d: it.d || '',
      avail: !!it.avail,
      why: it.avail ? '' : (it.why || whyOf(it, null)),
      /* 官方 shopgrp 的置灰条件：**一个选项都不能选**时才整组变灰
       *   （官方：`shopgrp${E.opts.some(N=>N.avail)?"":" off"}`） */
      anyOpt: (it.opts || []).some((o) => !!o.avail),
      price: it.price,
      priceText: money(it.price),
      spNote: it.credit ? '可以赊账' : '',
      opts: (it.opts || []).map((o) => ({
        k: o.id,
        n: o.n,
        avail: !!o.avail,
        why: o.avail ? '' : whyOf(it, o),
        price: o.price,
        priceText: money(o.price),
      })),
    });

    const groups = [];
    const sets = [];

    /* ── 投资方式（官方 openShop：`INV_KS.filter(invOK)`） ──────────────────
     * ⚠ 2026-10-26：原来这里是 `api.INV_KS.slice(0, 5)`
     *   ⇒ ① 少了「房产」「亲自挑股票买卖」两种；② 完全没按国家过滤
     *   （官方网页版会按国家把不能用的方式**整个藏起来**）。
     *   这就是上一轮留下的「投资门槛没对齐」。
     *   现在照官方：invOK 取不到时退回原来的前五种（不至于整组空掉）。
     */
    const invOK = O.mpFn('invOK');
    const worldFee = O.mpFn('worldFee');
    const invNm = {
      cash: L`예금 · 물가 빼고 연 1~1.5%`,
      bond: L`채권 · 평균 2% 안팎, 출렁임 작음`,
      mix: L`주식·채권 반반 펀드 · 평균 3.5%, 출렁임 중간`,
      stock: L`주식 (지수) · 평균 5%, 출렁임 큼`,
      world: L`해외 지수 (세계 주식) · 평균 5%, 환율 따라서도 출렁여요`,
      property: L`부동산 펀드 · 평균 3.5%`,
      trade: L`직접 종목 골라 사고팔기 · 대부분 지수보다 못 벌어요`,
    };
    const allInv = api.INV_KS || ['cash'];
    let invKeys = allInv.slice(0, 5);
    if (invOK) {
      try {
        invKeys = allInv.filter((k) => { try { return !!invOK(k); } catch (e) { return true; } });
      } catch (e) { /* 取不到就还用原来的 */ }
    }
    let fee = 0;
    try {
      const cur = api.C ? api.C() : null;
      if (cur && worldFee) fee = worldFee(cur) || 0;
    } catch (e) { fee = 0; }
    groups.push({
      key: 'inv',
      label: L`투자 방식`,
      cur: (S && S.invest) || 'cash',
      disabled: false,
      note: '存下的钱要怎么运用？',
      opts: invKeys.map((k) => ({
        k,
        n: (k === 'world' && fee)
          ? `${invNm[k] || k} · ${L`수수료가 해마다 ${(fee * 100).toFixed(1)}%쯤 더 들어요`}`
          : (invNm[k] || k),
      })),
    });
    if (S && S.age >= 18) {
      groups.push({
        key: 'gift',
        label: L`경조사비`,
        cur: (S.flags && S.flags.gift) || 'full',
        disabled: false,
        note: L`친구 결혼식과 친척 장례에 내는 돈이에요. 덜 내면 돈은 아끼지만, 사이가 조금 덜 가까워질 수 있어요.`,
        opts: [
          { k: 'full', n: L`정성껏 낸다` },
          { k: 'some', n: L`형편껏 절반만` },
          { k: 'none', n: L`마음만 전한다` },
        ],
      });
      groups.push({
        key: 'ins',
        label: L`보험`,
        cur: (S.flags && S.flags.ins) === 'more' ? 'more' : 'base',
        disabled: false,
        note: '保险保得完整，每年都要缴保费，但看病住院的自付额会大幅减少；如果在70岁前离世，家人可以领到保险金。通常缴出去的保费会比拿回来的钱多。',
        opts: [
          { k: 'base', n: L`기본 보장만` },
          { k: 'more', n: L`보험을 넉넉히 든다` },
        ],
      });
      groups.push({
        key: 'diet',
        label: L`식습관`,
        cur: (S.flags && S.flags.diet) || 'usual',
        disabled: false,
        note: '注重饮食的话，买菜会多花一点钱，但高血压、糖尿病之类的病会比较少发生。外食和外送很方便，但花费较多，这类病也会多一些。',
        opts: [
          { k: 'usual', n: L`주변 사람들처럼 먹기` },
          { k: 'good', n: L`싱겁게, 채소·잡곡 챙겨 먹기` },
          { k: 'out', n: L`외식·배달이 잦은 편` },
        ],
      });
    }
    groups.push({
      key: 'sur',
      label: L`아이 성`,
      cur: (S && S.flags && S.flags.surM && S.flags.surM === S.fam.marriages) ? 'm' : 'f',
      disabled: false,
      note: L`앞으로 태어날 아이가 어느 쪽 성을 따를지 고르는 곳이에요. 고르지 않으면 아버지 성을 따라요.`,
      opts: [
        { k: 'f', n: L`아버지 성을 따른다` },
        { k: 'm', n: L`어머니 성을 따른다` },
      ],
    });

    let autoSets = [];
    try { autoSets = api.shopSets ? (api.shopSets() || []) : []; } catch (e) { autoSets = []; }
    for (const x of autoSets) {
      sets.push({ id: x.id, n: x.n, on: !!x.on, ev: x.ev || '' });
    }

    const onW = sets.filter((x) => x.on).map((x) => x.n);
    /* ⚠ 2026-10-26 真机反馈：这行摘要原来是韩文 + 英文 key
     *   （「돈 맡기기: cash」）⇒ 玩家看到的是半韩半英文。
     *   现在改成中文，并把投资方式显示成中文名（不是 cash/stock 这种 key）。 */
    const invShort = {
      cash: '存款', bond: '债券', mix: '股票债券各半', stock: '股票',
      world: '海外指数', property: '房产', trade: '其他',
    };
    /* 官方 INV_NM() 给的是官方自己的中文名 ⇒ 优先用它，取不到才用上面的简写表 */
    let invName = invShort[(S && S.invest) || 'cash'] || '存款';
    const INV_NM = O.mpFn('INV_NM');
    if (INV_NM) {
      try {
        const map = INV_NM() || {};
        const n = map[(S && S.invest) || 'cash'];
        if (n) invName = n;
      } catch (e) { /* 取不到就用简写表 */ }
    }
    const summary = [
      (S && S.age >= 18) ? `闲钱理财：${invName}` : '',
      (S && S.flags && S.flags.ins) === 'more' ? '保险：保得较完整' : '',
      onW.length > 2 ? `自动进行：${onW.length} 项` : onW.length ? `自动进行：${onW.join('、')}` : '',
    ].filter(Boolean).join(' · ');

    return {
      h2: '消费 · 投资',
      inc: S ? ` · 年收入 ${money(S.income || 0)}` : '',
      note: '可以买到的东西，取决于你现在住在哪里、做什么工作。',
      topLabel: '现在可以做的事',
      top: top.map(view),
      rest: rest.map(view),
      groups,
      sets,
      setTitle: L`생활 방식`,
      setSummary: summary,
      setsLabel: L`알아서 하기`,
      setsNote: L`켜 두면 때가 될 때마다 알아서 해요. 돈이 드는 일은 모아 둔 돈이 비용의 세 배를 넘을 때만 해요. 다시 누르면 꺼져요.`,
    };
  },

  openShop() {
    const S = api.S;
    if (!S) return;

    this._shopPaused = !S.paused;
    S.paused = true;
    this.setData({ shop: this.shopView(), dec: null, paused: true, shopMoreOpen: false, shopSetOpen: false });
  },

  closeShop() {
    const S = api.S;
    if (S && this._shopPaused) S.paused = false;
    this._shopPaused = false;
    this.setData({ shop: null, paused: S ? !!S.paused : false });
  },

  /**
   * 某个条目买不了时的原因（官方把它写在条目的 why 上）。
   * ⚠ 2026-10-26 真机反馈：原来买不了的时候**一句话都没有** ⇒ 玩家以为没反应；
   *   补上原因之后又发现**弹一句通用话很没用**（原因就在那一项旁边写着）。
   *   ⇒ 现在：买不了的项**直接置灰**（disabled，点都点不到），
   *   原因直接写在那一项旁边；这一段只作为「读回原因」的入口。
   */
  shopWhy(target) {
    const [id, opt] = String(target).split('@');
    const shop = this.data.shop;
    if (!shop) return '现在还不能选这一项';
    const list = (shop.top || []).concat(shop.rest || []);
    for (const it of list) {
      if (it.id !== id) continue;
      if (!opt) return it.avail ? '' : (it.why || '现在还不能选这一项');
      for (const o of (it.opts || [])) {
        if (o.k === opt) return o.avail ? '' : (o.why || '现在还不能选这一项');
      }
    }
    return '现在还不能选这一项';
  },

  /**
   * 买一项东西。
   *
   * 官方网页版的做法（ui.zh-hans.0.8.40.js 的 dataset.buy 分支）：
   *   const r = buyShop(o.dataset.buy);
   *   r && (log(r,"big"), S.log[S.log.length-1].sh=1);
   *   —— **买不成就什么都不做**（买不成的那一项在官方是 disabled 的，点不到）。
   *
   * ⚠ 2026-10-26 真机反馈：这里原来在买不成时弹「现在还不能买这一项」
   *   ⇒ 玩家说「很多余」⇒ 现在跟着官方：置灰的项根本不响应点击。
   *
   * ⚠⚠ 2026-10-26 真机反馈（用户说「无法点击买房子选项」）：这里把引擎给的选项 id
   *   又拼了一次前缀 ⇒ **双前缀** ⇒ 引擎返回 null ⇒ 点了没反应。
   *   引擎的选项 id **自带条目前缀**（实测 v0.8.40：own_house@s / course@c /
   *   rental@s / moveplan@near / gear@lv / kidtalk@talk），
   *   官方网页版发的是**原样**（见 vendor/official/ui.zh-hans.0.8.40.js 的 SHOP_ASK 表：
   *   ["own_house@s","buy"] / ["course@c","buy"] / ["moveplan@near","move"]）。
   *   ⇒ 这里必须**原样传**，不能再拼。
   */
  buyShop(e) {
    const { id, opt } = e.currentTarget.dataset;
    const S = api.S;
    if (!S || !id) return;
    /* ⚠ 选项 id 自带前缀（own_house@s），**不能**再拼 id@opt ⇒ 直接用引擎给的。 */
    const target = opt || id;
    let r = null;
    try { r = api.buyShop(target); } catch (err) { r = null; }
    if (r && typeof r === 'string') {
      /* 官方：log(r,"big") + 标记 .sh=1（这条要单独高亮） */
      try {
        api.log(r, 'big');
        if (S.log && S.log[S.log.length - 1]) S.log[S.log.length - 1].sh = 1;
      } catch (e) {
        S.log.push({ a: S.age, text: r, kind: 'big' });
      }
      try { S.stats.buys = (S.stats.buys || 0) + 1; } catch (e) { /* 忽略 */ }
      wx.showToast({ title: r, icon: 'none', duration: 2400 });
    }
    /* ⚠ 买不成时**不弹提示**（官方口径：买不成的项是 disabled，点了根本不响应）。
     *   「为什么买不了」写在那个置灰项**旁边**（life.wxml 的 o.why），
     *   不靠弹窗 —— 上一轮真机反馈说这个提示「很多余」（＝很烦），已删过一次，不要加回来。 */
    this.setData({ shop: this.shopView() });
    this.sync();
  },

  /**
   * 金额 → 带本地货币单位的字符串。
   * 官方引擎的 `wonStr`（取物口递出来）就是干这个的：
   * 中文分支输出 元 / 万元 / 亿元，与人生记录里的写法一致。
   * 取不到时退回「元」（人民币），**不再写死美元**。
   */
  moneyText(n) {
    const f = O.mpFn('wonStr');
    if (f) {
      try { const s = f(n || 0); if (s) return String(s); } catch (e) { /* 走下面 */ }
    }
    return `${Math.round(n || 0).toLocaleString('zh-CN')} 元`;
  },

  toggleShopMore() {
    this.setData({ shopMoreOpen: !this.data.shopMoreOpen });
  },

  toggleShopSet() {
    this.setData({ shopSetOpen: !this.data.shopSetOpen });
  },

  setShopOpt(e) {
    const { key, val } = e.currentTarget.dataset;
    const S = api.S;
    if (!S || !key) return;
    S.flags = S.flags || {};
    switch (key) {
      case 'inv': {
        if (val === (S.invest || 'cash')) {
          /* ⚠ 2026-10-26 真机反馈：点已经选中的方式要说话（否则像没反应）。 */
          wx.showToast({ title: '已经是当前的投资方式', icon: 'none', duration: 1500 });
          return;
        }
        /* ⚠ 官方：换投资方式走的是引擎里的 invSwitch()（它会记账、写标记、
         *   顺带处理外汇之类的事）⇒ 这里改成调官方函数，不再自己改 S.invest。
         *   官方还有一道 invOK() 的门槛：这个国家用不了这种投资方式就不给换。 */
        const invOK = O.mpFn('invOK');
        if (invOK) {
          let ok = false;
          try { ok = !!invOK(val); } catch (e) { ok = true; }
          if (!ok) {
            wx.showToast({ title: '现在住的地方用不了这种投资方式', icon: 'none', duration: 2200 });
            return;
          }
        }
        const invSwitch = O.mpFn('invSwitch');
        if (invSwitch) {
          let msg = '';
          try { msg = invSwitch(val) || ''; } catch (e) { msg = ''; }
          try { S.stats.inv = (S.stats.inv || 0) + 1; } catch (e) { /* 忽略 */ }
          if (msg) {
            try { api.log(msg, 'note'); } catch (e) { /* 忽略 */ }
            wx.showToast({ title: msg, icon: 'none', duration: 2600 });
          }
        } else {
          S.invest = val;
        }
        break;
      }
      case 'gift':
        S.flags.gift = val === 'full' ? null : val;
        break;
      case 'ins':
        S.flags.ins = val === 'more' ? 'more' : null;
        break;
      case 'diet': {
        const was = S.flags.diet || 'usual';
        S.flags.diet = val === 'usual' ? null : val;
        if (was !== val) {
          const m = {
            usual: api.L`이제 주변 사람들처럼 먹기로 했습니다.`,
            good: api.L`싱겁게 먹고, 채소와 잡곡을 챙겨 먹기로 했습니다.`,
            out: '忙碌的日子多了，靠外食和外送解决三餐的日子也变多了。',
          }[val];
          if (m) api.log(m, 'note');
        }
        break;
      }
      case 'sur':
        S.flags.surM = val === 'm' ? (S.fam.marriages || 'm') : null;
        break;
      default:
        return;
    }
    this.setData({ shop: this.shopView() });
    this.sync();
  },

  toggleShop(e) {
    const { id } = e.currentTarget.dataset;
    const S = api.S;
    if (!S || !id) return;
    let r = null;
    try { r = api.buyShop(id); } catch (err) { r = null; }
    if (r && typeof r === 'string') api.log(r, 'note');
    this.setData({ shop: this.shopView() });
    this.sync();
  },

  onDeath() {
    const S = api.S;
    this.stopLoop();
    if (S) {

      let gk = '';
      try { const g = api.grainOf ? api.grainOf(S) : null; gk = g && g.k ? g.k : ''; } catch (e) { gk = ''; }
      // ── 字段与官方 recordLife()（ui.zh-hans.0.8.15.js:8826）逐项对应 ──
      //   name  = S.name.full（官方用全名，不是呼称）
      //   ko    = B().ko（**本地化国名**；官方 bundle L1782 会把 c.ko 覆写成当前语言）
      //   sex   = pubSex()（公开场合的性别，跨性别时走 S.trans.g）
      //   job   = lastWorkLabel() === '—' ? '' : lastWorkLabel()
      //   cause = d.cause === 'suic' ? L'세상을 떠남' : d.label
      //   y     = S.era === 'past' ? S.by : undefined（只有过去世界的人生标出生年）
      //   sk    = skinMe()（肤色索引）· pt = shelfPetOf(S)（宠物）
      let sk = null;
      try { sk = shelf.skinMe(S, api.CBY); } catch (e) { sk = null; }
      let sex = S.sex;
      try { if (api.pubSex) sex = api.pubSex(); } catch (e) { /* 用 S.sex */ }
      let job = '';
      try { const j = jobLabel(); job = (j && j !== '—') ? j : ''; } catch (e) { job = ''; }
      let cause = (S.deathAt && S.deathAt.label) || '';
      try {
        if (S.deathAt && S.deathAt.cause === 'suic') cause = api.L`세상을 떠남`;
      } catch (e) { /* 用原 label */ }
      app.saveLife({
        S,
        gk,
        name: (S.name && S.name.full) || dispName(S),
        ko: countryName(S.born),
        country: countryName(S.born),
        iso: S.born,
        sex,
        age: S.age,
        cause,
        job,
        year: (S.by || 0) + S.age,
        y: (S.era === 'past') ? S.by : undefined,
        sk,
        pt: shelf.shelfPetOf(S),
      });
    }
    wx.redirectTo({ url: '/subpkg/engine/pages/memorial/memorial' });
  },

  exitLife() {
    wx.showModal({
      title: '退出这一生？',
      content: '进度会保留在本机，可以从首页的「往期人生」回看。',
      confirmText: '退出',
      cancelText: '继续',
      success: (r) => {
        if (r.confirm) wx.redirectTo({ url: '/subpkg/engine/pages/index/index' });
      },
    });
  },
});
