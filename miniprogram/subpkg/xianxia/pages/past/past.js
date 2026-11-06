/**
 * 修仙 · 往期人生
 * ============================================================================
 *
 * 版式照官方 1in8b 小程序的往期人生页（`subpkg/engine/pages/past/`）：
 *   `.dec` 卡片（`.hd` 标题 + 关闭 / `.bd.sheet-bd` 正文）
 *   + `.cm-sub` 引导句 + `.shf` 陈列架格子（`.shf-i` / `.shf-f` / `.shf-cv` / `.shf-n` / `.shf-s`）
 *   + `.shf-card` 选中那格的详情卡 + `.pl-hint` 结尾说明。
 *
 * 格子里的像素小人用**上游修仙那套人物像素**（`runtime/pixel-style.js`）画，
 * 与官方往期人生页「每格一个小人」的观感一致。
 */
var session = require('../../bridge/session.js');
var pageModel = require('../../bridge/page-model.js');
var portrait = require('../../bridge/portrait.js');
var theme = require('../../../../bridge/theme.js');
var safeArea = require('../../../../bridge/safe-area.js');

Page({
  data: {
    theme: 'theme-light',
    statusBarHeight: 0,
    sheetPadTop: 0,
    title: '往期人生',
    closeLabel: '关闭',
    lives: [],
    empty: true,
    picked: null,
    version: 0,
  },

  onLoad: function () {
    var info = null;
    try {
      info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    } catch (error) {
      info = null;
    }
    this.setData({
      theme: theme.current(),
      statusBarHeight: (info && info.statusBarHeight) || 0,
      /* 顶部留白让开微信右上角的胶囊（口径照官方 ui/safe-area.js）。
       * ⚠ 这一页是**独立页面**（不是遮罩弹层），与官方 past 页一样，
       *   顶部用 statusBarHeight 就够 —— 「关闭」按钮在 .dec 卡片内，
       *   卡片左右有 32rpx 留白 ⇒ 落在胶囊左边，不会被盖住。
       *   sheetPadTop 备着：将来若在这一页加遮罩弹层，直接用它。 */
      sheetPadTop: safeArea.sheetPadTop(),
    });
  },

  onShow: function () {
    this.refresh();
  },

  refresh: function () {
    var list = session.lives() || [];
    var rows = [];
    var realms = (session.engine && session.engine.REALMS) || [];
    for (var i = 0; i < list.length; i++) {
      var life = list[i];
      /* ⚠ 清单摘要里的 realm 是**编号**（存档时存的是 run.player.realm），
       *   直接显示会得到一个数字（而且 0 会被当假值丢掉）⇒ 这里换成境界名。 */
      var realmInfo = realms[life.realm] || null;
      var realmName = realmInfo ? realmInfo.name : '';
      /* 上游 showHistory（app.js:218-222）那一行：
       *   「N岁 · 境界 · N次抉择 · 结局标题（或未完人生）」 */
      var full = session.readLife(life.id);
      var decisions = full && full.decisions ? full.decisions.length : 0;
      var endingTitle = full && full.ending && full.ending.title ? full.ending.title : '';
      var line = [
        (life.age || 0) + '岁',
        realmName,
        decisions + '次抉择',
        endingTitle || (life.phase === 'ended' ? '' : '未完人生'),
      ].filter(Boolean).join(' · ');
      rows.push({
        id: life.id,
        name: life.name || '无名',
        realm: realmName,
        age: life.age || 0,
        months: life.months || 0,
        ended: life.phase === 'ended',
        action: life.phase === 'ended' ? '回看' : '继续',
        line: line,
        stage: portrait.stageOf(life.age || 0),
        sex: 'M',
      });
    }
    this.setData({lives: rows, empty: rows.length === 0, picked: null});
    this.drawFigures();
  },

  /** 选中一格（官方 .shf-i 点击 ⇒ 下面出现 .shf-card）。 */
  pick: function (event) {
    var id = event.currentTarget.dataset.id;
    var lives = this.data.lives;
    for (var i = 0; i < lives.length; i++) {
      if (lives[i].id === id) {
        this.setData({picked: lives[i]});
        return;
      }
    }
  },

  /** 继续 / 回看。 */
  open: function (event) {
    var id = event.currentTarget.dataset.id;
    if (!id) return;
    var run = session.resume(id);
    if (!run) {
      wx.showModal({title: '读不出来', content: '这段人生可能已经损坏了。先看看别的。', showCancel: false});
      this.refresh();
      return;
    }
    wx.navigateTo({url: '/subpkg/xianxia/pages/life/life'});
  },

  /** 每一格的小人（官方往期人生页也是每格一个像素小人）。 */
  drawFigures: function () {
    var lives = this.data.lives;
    if (!lives.length) return;
    var dpr = (wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : 0) || 2;
    var self = this;
    var q = wx.createSelectorQuery().in(this);
    q.selectAll('.shf-cv').fields({node: true, size: true}).exec(function (res) {
      var nodes = (res && res[0]) || [];
      for (var i = 0; i < nodes.length && i < lives.length; i++) {
        var item = nodes[i];
        if (!item || !item.node) continue;
        var life = lives[i];
        portrait.drawFigure(item.node, item.width, item.height, life.stage, life.sex, dpr, life.age);
      }
    });
  },

  goBack: function () {
    wx.navigateBack({
      fail: function () {
        wx.reLaunch({url: '/pages/home/home'});
      },
    });
  },
});
