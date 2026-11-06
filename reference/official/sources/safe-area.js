/**
 * 微信胶囊避让。
 * ==================================================================
 *
 * 为什么需要
 * ----------
 * 2026-10-26 真机反馈：意见反馈弹层右上角的「关闭」按钮被微信右上角的
 * **胶囊**（小程序自己的那个 ••• ⊙ 按钮）盖住 ⇒ 点不到。
 *
 * 官方网页版没有胶囊，所以这不是「和官方对齐」的问题，是**平台差异**：
 * 弹层顶部必须让开胶囊那一块。
 *
 * 用法
 * ----
 *   const safe = require('../ui/safe-area.js');
 *   safe.sheetPadTop();   // 弹层顶部要留多少 px
 */

/** 胶囊的位置（拿不到就返回 null）。 */
function capsuleRect() {
  try {
    if (typeof wx !== 'undefined' && wx.getMenuButtonBoundingClientRect) {
      const r = wx.getMenuButtonBoundingClientRect();
      if (r && r.bottom) return r;
    }
  } catch (e) { /* 取不到就用兜底值 */ }
  return null;
}

/** 状态栏高度（刘海高度）。 */
function statusBarHeight() {
  try {
    if (typeof wx !== 'undefined' && wx.getWindowInfo) {
      const info = wx.getWindowInfo();
      if (info && info.statusBarHeight) return info.statusBarHeight;
    }
  } catch (e) { /* ignore */ }
  return 0;
}

/**
 * 弹层顶部要留的空白（px）。
 * 胶囊底边 + 8px 余量；取不到胶囊时按「状态栏 + 44px」兜底。
 */
function sheetPadTop() {
  const r = capsuleRect();
  if (r) return Math.round(r.bottom + 8);
  return Math.round(statusBarHeight() + 44);
}

module.exports = { capsuleRect, statusBarHeight, sheetPadTop };
