/**
 * 修仙 · 人生页
 * ============================================================================
 *
 * 版式照官方 1in8b 小程序的人生页（`subpkg/engine/pages/life/`）：
 *   · **通栏顶栏**（`.topbar` → `.topbar-inner`）：品牌 / `.agebox`（年龄 + 年·名 + 进度条）
 *     / `.speed`（暂停 + **官方那 6 档倍速** + 离开 + ⋯ 菜单）；
 *   · **场景面板**（`.panel.p-scene` + `.scene-cap`）；
 *   · **状态条**（`.minibar`：四格数值 + 重心 + 地图；十六岁前不显示「重心」）；
 *   · **人生纪录**（`.panel.p-feed` + `.feed-item`，可加星 + 「人生记录 全部」弹层）；
 *   · **可折叠面板**（`.panel-h` 里的 `.foldbtn` + `.folded`）；
 *   · **状态面板**（`.p-stats` + `.statbars` + `.stat`）；
 *   · **身份卡**（`.panel.idcard.p-id`，含像素肖像）；
 *   · **决策卡**（`.scrim` > `.dec` > `.hd` / `.bd` > `.ch`，收起后是 `.decpeek`）。
 *
 * 内容照上游修仙网页端（`apps/preview/app.js` + `apps/preview/life-panels.js`）：
 *   经历（含正文与变化）/ 当前处境 / 突破公告 / 修行本事 / 宗门 / 灵石与家产 /
 *   随身行囊 / 人物与牵挂 / 人生地图 / 授业与记录 / 终局回顾。
 *
 * 倍速档位照官方 `life.js`：`[1, 2, 4, 8, 12, 16]`。
 *
 * ⚠ 与官方人生**完全隔离**：不 require 官方引擎、不进官方引擎屏障、
 *   不读不写 `one8b.*` / `o8b.*`；连主题、星标、折叠偏好也走自己的 `xianxia.v1.*`。
 */
var session = require('../../bridge/session.js');
var clockMod = require('../../bridge/clock.js');
var pageModel = require('../../bridge/page-model.js');
var viewModel = require('../../bridge/view-model.js');
var theme = require('../../../../bridge/theme.js');
var safeArea = require('../../../../bridge/safe-area.js');
var prefs = require('../../bridge/prefs.js');
var portrait = require('../../bridge/portrait.js');

var AUTO_KEY = 'xianxia.v1.pref.auto';

/**
 * 人生纪录面板只显示最近 6 条（照官方人生页口径：完整记录走「人生记录 全部」弹层）。
 */
var FEED_LIMIT = 6;

Page({
  data: {
    theme: 'theme-light',
    statusBarHeight: 0,
    sheetPadTop: 0,

    top: null,
    stats: [],
    focus: '',
    /* ⚠ 2026-11-05：十六岁前不显示「重心」按钮（上游 cultivation.js:65 的门槛）。
       门禁见 pageModel.canFocus()。 */
    canFocus: false,
    feed: [],
    feedMeta: {label: '0段 · 0次抉择'},
    identity: null,
    practice: null,
    sect: null,
    wealth: null,
    inventory: null,
    people: [],
    axes: null,
    /* 大陆信息仍从引擎取（门禁与往期人生还要用），但主页不再渲染地图卡片。 */
    mapContinents: [],
    passage: null,
    breakthrough: null,
    statusPanel: null,
    details: null,
    ending: null,
    ended: false,
    review: null,

    dec: null,
    decLocked: [],
    decPeek: null,
    decMin: false,

    activities: [],
    places: [],
    grounds: [],

    sheet: '',
    fullLog: null,
    logYear: -1,
    fold: {},
    foldOpen: '展开',
    foldClose: '收起',
    starOn: '★',
    starOff: '☆',

    speeds: pageModel.SPEEDS,
    speed: 1,
    paused: false,
    ff: false,
    auto: false,
    moreOpen: false,
    themeIcon: '◐',
    themeTxt: '跟随系统',
    version: 0,
    saveNote: '',
  },

  onLoad: function (options) {
    if (!session.run) {
      /**
       * 接哪一段人生：
       *   · 首页「继续人生」会点名（`?resume=<编号>`）；
       *   · 没点名就接**最近动过**的那一段（清单里 updatedAt 最大的那个）。
       * ⚠ 清单里的顺序是「按最后保存时间排的」，末尾才是最近动过的 ——
       *   直接取第一个会接到最老的那一段（这正是老代码的毛病）。
       */
      var wanted = options && options.resume ? String(options.resume) : '';
      var lives = session.lives();
      var target = '';
      if (wanted) {
        for (var i = 0; i < lives.length; i++) {
          if (lives[i].id === wanted) { target = wanted; break; }
        }
      } else if (lives.length) {
        var newest = lives[0];
        for (var j = 1; j < lives.length; j++) {
          if ((lives[j].updatedAt || 0) > (newest.updatedAt || 0)) newest = lives[j];
        }
        target = newest.id;
      }
      if (!target) {
        wx.redirectTo({url: '/subpkg/xianxia/pages/roll/roll'});
        return;
      }
      session.resume(target);
    }
    if (!session.run) {
      wx.redirectTo({url: '/subpkg/xianxia/pages/roll/roll'});
      return;
    }

    var info = null;
    try {
      info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    } catch (error) {
      info = null;
    }
    var mode = theme.read();
    this.setData({
      theme: theme.current(),
      statusBarHeight: (info && info.statusBarHeight) || 0,
      /* ⚠ 弹层顶部必须让开微信右上角的**胶囊**：
       *   少了这 44px，弹层里的「关闭」按钮就落在胶囊底下，点不到
       *   （用户 2026-11-03 真机反馈）。口径照官方 ui/safe-area.js。 */
      sheetPadTop: safeArea.sheetPadTop(),
      auto: this.readAutoPref(),
      themeIcon: theme.icon(mode),
      themeTxt: theme.label(mode),
      fold: prefs.readFold(),
    });
    if (this.data.auto) this._clock = this.makeClock();

    this._lastSaveMonth = session.run.month;
    this._clock = this._clock || this.makeClock();
    if (this.data.auto) this._clock.enableAuto();

    this._openRows = {};
    this._stars = prefs.readStars(session.currentId());
    this.applyView(session.view, true);
    this._clock.start();
  },

  makeClock: function () {
    var self = this;
    return clockMod.createClock({
      session: session,
      onTick: function (view) { self.onTick(view); },
    });
  },

  onShow: function () {
    if (this._clock) {
      this._clock.setHidden(false);
      this._clock.start();
    }
  },

  onHide: function () {
    if (this._clock) this._clock.setHidden(true);
  },

  onUnload: function () {
    if (this._clock) this._clock.stop();
    this.persist();
  },

  /* ───────────────────────────── 时钟 ───────────────────────────── */

  onTick: function (view) {
    if (!view) return;
    this.applyView(view, false);
    if (session.run && session.run.month - this._lastSaveMonth >= 24) {
      this._lastSaveMonth = session.run.month;
      this.persist();
    }
  },

  /** 只有「看得见的部分变了」才刷新视图（省流量）。 */
  signature: function (view) {
    if (!view) return 'none';
    var top = view.topbar || {};
    var axes = view.axes || {};
    var dec = view.decision;
    return [
      top.year, top.month, top.realm, top.stones, top.place,
      view.pending ? 1 : 0, view.waiting ? 1 : 0, view.ended ? 1 : 0,
      dec ? dec.choices.map(function (c) { return c.id + (c.enabled ? '1' : '0'); }).join(',') : '',
      axes.insight, axes.courage, axes.empathy, axes.health, axes.mind,
      view.inventory ? view.inventory.count : 0,
      view.people ? view.people.length : 0,
      view.feed ? view.feed.length : 0,
      view.map ? view.map.current : '',
      /* ⚠ 满十六岁那一刻「重心」按钮要出现 ⇒ 签名必须跟着变 */
      session.run && pageModel.canFocus(session.run) ? 1 : 0,
      this.data.decMin ? 'min' : '',
    ].join('|');
  },

  applyView: function (view, force) {
    if (!view) return;
    var sig = this.signature(view);
    if (!force && sig === this._sig) return;
    this._sig = sig;

    var card = pageModel.decisionCard(session.run);
    var locked = [];
    if (card) {
      for (var i = 0; i < card.choices.length; i++) {
        if (!card.choices[i].enabled) locked.push(card.choices[i]);
      }
    }
    var activities = view.activities || [];
    var places = view.places || [];
    var grounds = view.grounds || [];

    /* 「先收起来」之后：决策卡**真的关掉**，而且下一帧也不会自己弹回来
     * （官方 applyDec() 的语义：已经收起 + 不是强制重绘 ⇒ 不重弹）。 */
    var minimized = this.data.decMin;

    this.setData({
      top: pageModel.topbar(session.run),
      stats: pageModel.stats(session.run),
      focus: pageModel.focusName(session.run),
      canFocus: pageModel.canFocus(session.run),
      feed: this.feedRows(pageModel.feedRows(session.run, FEED_LIMIT)),
      feedMeta: pageModel.feedMeta(session.run),
      identity: view.identityCard,
      practice: view.practice,
      sect: view.sect,
      wealth: view.wealth,
      inventory: view.inventory,
      people: view.people,
      axes: view.axes,
      mapContinents: (view.map && view.map.continents) || [],
      passage: viewModel.passage(session.run),
      breakthrough: view.breakthrough,
      statusPanel: view.statusPanel,
      details: view.details,
      ending: view.ending,
      ended: !!view.ended,
      review: view.review,

      dec: minimized ? null : card,
      decLocked: locked,
      decPeek: (minimized && card) ? {title: card.title} : null,

      /* ⚠ 面板里的选项**全部列出**（照 HTML 端 showFocus：不可选的置灰、写在原地），
       *   不拆成两块 —— 拆开就不是同一个列表了。 */
      activities: activities,
      places: places,
      grounds: grounds,

      version: this.data.version + 1,
    });
    this.drawPortrait();
  },

  /**
   * 身份卡上的像素肖像（官方 `.idcard` 的 `.id-portrait` 画布；
   * 内容照上游 `life-panels.js` 的 `portrait(s)` —— 同一套像素与配色）。
   */
  drawPortrait: function () {
    var run = session.run;
    if (!run || !this.data.identity) return;
    var self = this;
    var tries = this._portraitTry || 0;
    if (tries >= 8) return;
    this._portraitTry = tries + 1;
    var dpr = 2;
    try {
      dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 0) || 2;
    } catch (error) {
      dpr = 2;
    }
    var age = pageModel.ageOf(run);
    var sex = (run.player && run.player.sex) || 'M';
    var stage = portrait.stageOf(age);
    wx.createSelectorQuery().in(this).select('#idPortrait').fields({node: true, size: true}).exec(function (res) {
      var item = res && res[0];
      if (!item || !item.node) {
        /* 画布还没挂载 ⇒ 下一帧再试（官方也是这么做的）。 */
        self.drawPortrait();
        return;
      }
      self._portraitTry = 0;
      portrait.drawFigure(item.node, item.width, item.height, stage, sex, dpr, age);
    });
  },

  /**
   * 记录行：加上「点开这一行露出加星按钮」（官方 #feed 的行为）
   * 与「这一行有没有星」。
   */
  feedRows: function (rows) {
    var stars = this._stars || [];
    var open = this._openRows || {};
    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var li = String(row.li);
      var starred = false;
      for (var j = 0; j < stars.length; j++) {
        if (String(stars[j]) === li) { starred = true; break; }
      }
      out.push({
        li: row.li,
        a: row.a,
        ageText: row.ageText,
        ym: row.ym,
        t: row.t,
        f: row.f,
        chg: row.chg,
        k: row.k,
        op: !!open[li],
        star: starred,
      });
    }
    return out;
  },

  /* ───────────────────────────── 存档 ───────────────────────────── */

  persist: function () {
    var self = this;
    return session.save().then(function (result) {
      if (!result.ok) self.setData({saveNote: '没能存下档：' + result.message});
      else if (self.data.saveNote) self.setData({saveNote: ''});
      return result;
    });
  },

  manualSave: function () {
    var self = this;
    wx.showLoading({title: '正在落档…'});
    this.persist().then(function (result) {
      wx.hideLoading();
      wx.showToast({title: result.ok ? '已存下' : '没存成', icon: 'none'});
    });
  },

  /* ───────────────────────────── 节奏 ───────────────────────────── */

  togglePause: function () {
    var next = !this.data.paused;
    this._clock.setPaused(next);
    this.setData({paused: next});
    this.applyView(session.view, true);
  },

  /** 官方口径：切倍速 ⇒ 解除暂停与快进。 */
  setSpeed: function (event) {
    var value = Number(event.currentTarget.dataset.v);
    var speed = this._clock.setSpeed(value);
    this.setData({speed: speed, paused: false, ff: false});
    this._clock.setPaused(false);
  },

  toggleAuto: function () {
    var on = this._clock.toggleAuto();
    this.setData({auto: on});
    try {
      wx.setStorageSync(AUTO_KEY, on ? '1' : '0');
    } catch (error) {
      /* 存不下这个偏好不影响玩。 */
    }
    wx.showToast({title: on ? '自动抉择：开' : '自动抉择：关', icon: 'none'});
  },

  readAutoPref: function () {
    try {
      return wx.getStorageSync(AUTO_KEY) === '1';
    } catch (error) {
      return false;
    }
  },

  /** 官方「下一个 »」：快进到下一个抉择。 */
  toggleFf: function () {
    var on = !this.data.ff;
    if (on) {
      session.advanceToChoice();
      this.applyView(session.view, true);
    }
    this.setData({ff: on});
    wx.showToast({title: on ? '快进中' : '停下', icon: 'none'});
  },

  toggleMore: function () {
    this.setData({moreOpen: !this.data.moreOpen});
  },

  cycleTheme: function () {
    var mode = theme.cycle();
    this.setData({
      theme: theme.current(),
      themeIcon: theme.icon(mode),
      themeTxt: theme.label(mode),
      version: this.data.version + 1,
    });
  },

  /* ───────────────────────────── 决策卡 ───────────────────────────── */

  /**
   * 「先收起来 ▾」（官方 decPeek(true)）。
   * ⚠ 2026-11-04 真机反馈：之前这里只设了 decPeek，卡片本身还在 ⇒ 弹窗不关。
   *   官方 `decMin()` 是 `dec: null` + `decPeek: {...}` 一起设（引擎页 life.js:605）。
   */
  decMin: function () {
    var card = pageModel.decisionCard(session.run);
    if (!card) return;
    if (this._clock) this._clock.cancelAuto();
    this.setData({
      decMin: true,
      dec: null,
      decPeek: {title: card.title},
    });
  },

  /** 「重新展开」（官方 decPeek(false) + decBack()）。 */
  decOpen: function () {
    this.setData({decMin: false, decPeek: null});
    if (this._clock) this._clock.resumeAuto();
    this.applyView(session.view, true);
  },

  onChoose: function (event) {
    var id = event.currentTarget.dataset.k;
    if (!id || !session.run) return;
    var offered = session.options() || [];
    var target = null;
    for (var i = 0; i < offered.length; i++) if (offered[i].id === id) target = offered[i];
    if (!target || !target.enabled) {
      wx.showToast({title: '暂时无法这样做', icon: 'none'});
      return;
    }
    try {
      session.choose(id);
    } catch (error) {
      wx.showToast({title: '这一刻选不了：' + ((error && error.message) || error), icon: 'none'});
      return;
    }
    this.setData({decMin: false, decPeek: null});
    this.applyView(session.view, true);
    this.persist();
  },

  /* ───────────────────────────── 人生纪录 ───────────────────────────── */

  /** 点一行 ⇒ 露出加星按钮（官方 toggleFeedRow）。 */
  toggleFeedRow: function (event) {
    var li = String(event.currentTarget.dataset.li);
    if (!li) return;
    this._openRows = this._openRows || {};
    if (this._openRows[li]) delete this._openRows[li];
    else this._openRows[li] = true;
    this.setData({feed: this.feedRows(pageModel.feedRows(session.run, FEED_LIMIT))});
  },

  /** 加星 / 取消（官方 toggleStar；不搬官方的「换星」面板）。 */
  toggleStar: function (event) {
    var li = event.currentTarget.dataset.li;
    if (li === undefined || li === null || li === '') return;
    this._stars = prefs.toggleStar(session.currentId(), li);
    this.setData({feed: this.feedRows(pageModel.feedRows(session.run, FEED_LIMIT))});
    if (this.data.fullLog) this.openFullLog();
  },

  /** 「人生记录 全部」（官方 openFullLog）。 */
  openFullLog: function () {
    var groups = pageModel.feedGroups(session.run);
    var items = [];
    for (var i = 0; i < groups.length; i++) {
      items = items.concat(groups[i].items);
    }
    this.setData({
      fullLog: {
        title: '人生记录 全部',
        sub: pageModel.feedMeta(session.run).label,
        groups: groups,
        items: this.feedRows(items),
      },
      logYear: -1,
    });
  },

  closeFullLog: function () {
    this.setData({fullLog: null, logYear: -1});
  },

  /** 年代分组跳转（官方 jumpDec）。 */
  jumpDec: function (event) {
    var d = String(event.currentTarget.dataset.d);
    this.setData({logYear: d});
  },

  /* ───────────────────────────── 面板折叠 ───────────────────────────── */

  /** 官方 toggleFold：折叠状态存在**自己的**偏好键里。 */
  toggleFold: function (event) {
    var k = event.currentTarget.dataset.k;
    if (!k) return;
    var fold = prefs.readFold();
    fold[k] = !fold[k];
    prefs.writeFold(fold);
    this.setData({fold: fold});
  },

  /* ───────────────────────────── 面板 ───────────────────────────── */

  openSheet: function (event) {
    var name = event.currentTarget.dataset.sheet;
    this.setData({sheet: name});
  },

  closeSheet: function () {
    this.setData({sheet: ''});
  },

  setActivity: function (event) {
    var id = event.currentTarget.dataset.id;
    if (!id) return;
    try {
      session.setActivity(id);
    } catch (error) {
      wx.showToast({title: '这一刻换不了：' + ((error && error.message) || error), icon: 'none'});
      return;
    }
    this.applyView(session.view, true);
    if (this.data.sheet === 'focus') this.setData({sheet: ''});
    this.persist();
  },

  travel: function (event) {
    var id = event.currentTarget.dataset.id;
    if (!id) return;
    var places = this.data.places;
    var target = null;
    for (var i = 0; i < places.length; i++) if (places[i].id === id) target = places[i];
    if (!target || !target.enabled) {
      wx.showToast({title: (target && target.reason) || '暂时去不了', icon: 'none'});
      return;
    }
    try {
      session.travelTo(id);
    } catch (error) {
      wx.showToast({title: '这一刻走不了：' + ((error && error.message) || error), icon: 'none'});
      return;
    }
    this.applyView(session.view, true);
    this.setData({sheet: ''});
    this.persist();
  },

  seekTraining: function (event) {
    var id = event.currentTarget.dataset.id;
    if (!id) return;
    var grounds = this.data.grounds;
    var target = null;
    for (var i = 0; i < grounds.length; i++) if (grounds[i].id === id) target = grounds[i];
    if (!target || !target.enabled) {
      wx.showToast({title: (target && target.reasons) || '暂时去不了', icon: 'none'});
      return;
    }
    try {
      session.seekTraining(id);
    } catch (error) {
      wx.showToast({title: '这一刻去不了：' + ((error && error.message) || error), icon: 'none'});
      return;
    }
    this.applyView(session.view, true);
    this.setData({sheet: ''});
    this.persist();
  },

  /* ───────────────────────────── 杂项 ───────────────────────────── */

  goPast: function () {
    wx.navigateTo({url: '/subpkg/xianxia/pages/past/past'});
  },

  /** 终局页的「再走一条不同的路」⇒ 回到转盘页重抽。 */
  newLife: function () {
    wx.redirectTo({url: '/subpkg/xianxia/pages/roll/roll'});
  },

  /** 离开：先落档，再回本产品的首页。 */
  exitLife: function () {
    var self = this;
    this.persist().then(function () {
      wx.reLaunch({url: '/pages/home/home'});
    });
  },

  noop: function () {},
});
