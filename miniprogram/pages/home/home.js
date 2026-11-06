/**
 * home.js — 归山记 · 首页
 * ============================================================================
 *
 * 这个页面是**整个小程序的主包入口**。
 *
 * 为什么首页在主包、玩法在分包
 * ----------------------------
 * 微信的规矩：**主包不能同步引用分包代码**（分包代码要先下载下来才能用），
 * 反过来「分包可以引用主包」是可以的。
 * ⇒ 首页要用的东西（存档清单、主题、胶囊位置）都放在**主包**的 `bridge/` 里；
 *   而规则引擎（1.7 MB）留在分包 `subpkg/xianxia/` ——
 *   放主包会把主包顶到 2 MB 上限。
 *
 * 首页只做三件事
 * --------------
 *   ① 进入命盘（抽一位出身）；
 *   ② 继续人生（接着上一段没走完的）；
 *   ③ 往期人生（这台手机上留下过的所有人生）。
 *
 * ⚠ 读存档失败时**不装没事**：说清原因 + 给一个「重试」，
 *   而不是把用户丢进一个空页面让人以为存档没了。
 */
'use strict';

var storageModule = require('../../bridge/storage.js');
var theme = require('../../bridge/theme.js');
var safeArea = require('../../bridge/safe-area.js');

Page({
  data: {
    theme: 'theme-light',
    themeIcon: '◐',
    /** 页面顶部要留的空白（px）：让开微信右上角的胶囊。 */
    topPad: 0,
    /** 主题按钮贴着胶囊左边的位置（px）。 */
    navTop: 0,
    navRight: 0,
    loading: true,
    error: '',
    /** 这台手机上留下过几段人生。 */
    count: 0,
    /** 最近动过的那一段（没有人生时是 null）。 */
    latest: null,
    latestId: '',
  },

  onShow: function () {
    /* 每次回到首页都重读一次：人生页可能刚存过档。 */
    this.readStorage();
  },

  /** 读存档清单。读不出来就如实说 + 给重试。 */
  readStorage: function () {
    this.applyTheme();
    var lives = [];
    try {
      lives = storageModule.createStorage().listLives();
    } catch (error) {
      var reason = error && error.message ? error.message : '未知原因';
      this.setData({
        loading: false,
        error: '这台手机上的存档读不出来（' + reason + '）。可以重试一次。',
        count: 0,
        latest: null,
        latestId: '',
      });
      return;
    }
    /* 取**最近动过**的那一段（清单里的顺序是按最后保存时间排的）。 */
    var latest = null;
    for (var i = 0; i < lives.length; i++) {
      if (!latest || (lives[i].updatedAt || 0) > (latest.updatedAt || 0)) latest = lives[i];
    }
    this.setData({
      loading: false,
      error: '',
      count: lives.length,
      latest: latest,
      latestId: latest ? latest.id : '',
    });
  },

  /** 主题与胶囊位置（照官方首页的算法，见 reference/official/sources/life.js 之外的 index 页）。 */
  applyTheme: function () {
    var mode = theme.read();
    var info = null;
    try {
      info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    } catch (error) {
      info = null;
    }
    var cap = safeArea.capsuleRect();
    var sb = (info && info.statusBarHeight) || 0;
    var topPad = sb + 44;
    var navTop = sb + 6;
    var navRight = 8;
    if (cap) {
      topPad = Math.round(cap.bottom + 4);
      navTop = Math.round(cap.top + (cap.height - 32) / 2);
      var winW = (info && info.windowWidth) || 375;
      navRight = Math.round(winW - cap.left + 8);
    }
    this.setData({
      theme: theme.current(),
      themeIcon: theme.icon(mode),
      topPad: topPad,
      navTop: navTop,
      navRight: navRight,
    });
  },

  /** 主题三态循环：跟随系统 → 日读 → 夜读 → 跟随系统。 */
  cycleTheme: function () {
    theme.cycle();
    this.applyTheme();
  },

  /** 重试读存档。 */
  retry: function () {
    this.readStorage();
  },

  /** 进入命盘：抽一位出身（出生页在分包里）。 */
  startNew: function () {
    wx.navigateTo({url: '/subpkg/xianxia/pages/roll/roll'});
  },

  /** 继续人生：把要接的那一段编号交给人生页。 */
  continueLife: function () {
    if (!this.data.latestId) {
      this.startNew();
      return;
    }
    wx.navigateTo({url: '/subpkg/xianxia/pages/life/life?resume=' + this.data.latestId});
  },

  /** 往期人生：这台手机上留下过的所有人生。 */
  openPast: function () {
    wx.navigateTo({url: '/subpkg/xianxia/pages/past/past'});
  },

  openAbout: function () {
    wx.navigateTo({url: '/pages/legal/about/about'});
  },

  openPrivacy: function () {
    wx.navigateTo({url: '/pages/legal/privacy/privacy'});
  },
});
