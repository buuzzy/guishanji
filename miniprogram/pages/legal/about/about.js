/**
 * about.js — 归山记 · 说明页
 * ============================================================================
 *
 * ⚠⚠ **正式发布前必须按归山记这个新产品的实际情况改写本页文案。**
 *
 *   本页现在写的是**占位内容**：它只说明「这是什么、怎么玩、数据在哪」，
 *   没有照抄任何一个别的产品的说明文字，也没有引用 1in8b 的文案。
 *   发布前请逐条核对：
 *     · 玩法描述与当前版本（rulesVersion）一致；
 *     · 运营主体、联系方式、备案号等**按实际情况补齐**（现在一律留空并标注）；
 *     · 有没有需要披露的第三方 SDK（本产品完全单机，按现状应当没有）。
 *
 * 页面版式用官方那套类名（.panel / .hint / .note），样式在 app.wxss 里。
 */
'use strict';

var theme = require('../../../bridge/theme.js');
var safeArea = require('../../../bridge/safe-area.js');

Page({
  data: {
    theme: 'theme-light',
    topPad: 0,
  },

  onLoad: function () {
    this.applyTheme();
  },

  applyTheme: function () {
    var info = null;
    try {
      info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync();
    } catch (error) {
      info = null;
    }
    var cap = safeArea.capsuleRect();
    var sb = (info && info.statusBarHeight) || 0;
    this.setData({
      theme: theme.current(),
      topPad: cap ? Math.round(cap.bottom + 4) : sb + 44,
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
