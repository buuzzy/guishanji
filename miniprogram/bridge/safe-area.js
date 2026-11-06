/**
 * safe-area.js — 微信胶囊避让（修仙版）
 * ============================================================================
 *
 * 口径照官方 `miniprogram/ui/safe-area.js`（逐行照抄），
 * 但**另起一份**而不引用官方那个文件 ——
 * 修仙分包不许引用官方任何模块（隔离口径，见 scripts/test-xianxia-style.mjs）。
 *
 * 为什么需要
 *
 * ⚠ 这个文件在**主包** `miniprogram/bridge/`：主包的首页与分包里的人生页
 *   都要用它（微信规矩：主包不能同步引用分包代码，分包却可以引用主包）。
 * ----------
 * 2026-10-26 官方真机反馈：弹层右上角的「关闭」按钮被微信右上角的
 * **胶囊**（小程序自己的那个 ••• ⊙ 按钮）盖住 ⇒ 点不到。
 * 修仙页 2026-11-03 真机又踩到同一个坑：
 * 人生地图弹层的「关闭」按钮点不动，而且和右上角的悬浮按钮**重叠**。
 *
 * 官方网页版没有胶囊，所以这不是「和官方对齐」的问题，是**平台差异**：
 * 弹层顶部必须让开胶囊那一块。
 */
'use strict';

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
 * ⚠ **不是**裸的 statusBarHeight —— 少了那 44px，弹层的「关闭」按钮
 *   就会落在胶囊底下，点不到（用户 2026-11-03 真机反馈）。
 */
function sheetPadTop() {
  const r = capsuleRect();
  if (r) return Math.round(r.bottom + 8);
  return Math.round(statusBarHeight() + 44);
}

/**
 * 顶栏右侧要留的空白（px）—— 让顶栏右边的按钮落在**胶囊左边**。
 *
 * 官方 `subpkg/engine/pages/index/index.js` 的 `topMetrics()`：
 *   navRight = Math.round(winW - cap.left + 8);
 *   （拿不到胶囊时官方用 8）
 *
 * ⚠ 这已经是「到胶囊左边的距离 + 8px」，
 *   所以**直接**用作 .topbar-inner 的 padding-right 即可 ——
 *   别再额外加官方那 32rpx(=16px) 的基础留白，会多让一截。
 */
function capsuleGap() {
  const r = capsuleRect();
  if (r && r.left) {
    const info = (typeof wx !== 'undefined' && wx.getWindowInfo) ? wx.getWindowInfo() : null;
    const width = info && info.windowWidth ? info.windowWidth : 375;
    return Math.max(0, Math.round(width - r.left + 8));
  }
  /* 拿不到胶囊：退回官方 .topbar-inner 的基础右留白（32rpx = 16px）。 */
  return 16;
}

module.exports = {capsuleRect, statusBarHeight, sheetPadTop, capsuleGap};
