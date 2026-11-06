/**
 * privacy.js — 归山记 · 隐私说明页
 * ============================================================================
 *
 * ⚠⚠ **正式发布前必须按归山记这个新产品的实际情况改写本页文案。**
 *
 *   本页现在写的是**占位内容**，它如实描述了本产品**当前**的行为
 *   （完全单机、不联网、不收集、不上传），但：
 *     · 微信审核要求隐私说明与**实际声明的收集清单**一致 ——
 *       现在这里写的是「不收集」，一旦以后接入任何统计/客服/广告，
 *       必须先改这一页、再改代码；
 *     · 运营主体、联系方式、生效日期仍需按实际情况补齐。
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
