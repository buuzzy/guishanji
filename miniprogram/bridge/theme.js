/**
 * theme.js — 修仙玩法的「日读 / 夜读 / 跟随系统」
 * ============================================================================
 *
 * 官方那套是 `app.globalData.prefs.theme`（auto | light | dark）
 * + `app.globalData.dark`，改的时候写**官方的偏好键**。
 *
 * 修仙这边**不写官方的键**（隔离要求：官方键一个都不碰），
 * 但**用同一套三态与同一套类名**（`.theme-light` / `.theme-dark`）
 * ⇒ 视觉与官方完全一致，存储各归各的。
 *
 * 三态循环：跟随系统 → 日读 → 夜读 → 跟随系统（与官方 `O.themeNext` 同序）。
 *
 * ⚠ 这个文件在**主包** `miniprogram/bridge/`：主包的首页与分包里的人生页
 *   都要用它（微信规矩：主包不能同步引用分包代码，分包却可以引用主包）。
 */
'use strict';

var KEY = 'xianxia.v1.pref.theme';
var ORDER = ['auto', 'light', 'dark'];

function read() {
  try {
    var value = wx.getStorageSync(KEY);
    if (value === 'light' || value === 'dark' || value === 'auto') return value;
    if (value === '') return 'auto';
  } catch (error) {
    /* 读不出来就当跟随系统。 */
  }
  return 'auto';
}

function write(value) {
  try {
    wx.setStorageSync(KEY, value);
  } catch (error) {
    /* 存不下不影响玩。 */
  }
}

/** 系统是不是深色。 */
function systemDark() {
  try {
    var info = wx.getSystemInfoSync ? wx.getSystemInfoSync() : null;
    return !!(info && info.theme === 'dark');
  } catch (error) {
    return false;
  }
}

/** 当前该用哪个类（`theme-light` / `theme-dark`）。 */
function current() {
  var mode = read();
  if (mode === 'light') return 'theme-light';
  if (mode === 'dark') return 'theme-dark';
  return systemDark() ? 'theme-dark' : 'theme-light';
}

/** 三态循环，返回新的模式。 */
function cycle() {
  var mode = read();
  var next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  write(next);
  return next;
}

/** 模式的中文名（官方按钮上写的那几个字）。 */
function label(mode) {
  if (mode === 'light') return '日读';
  if (mode === 'dark') return '夜读';
  return '跟随系统';
}

/** 模式前的那个图标（官方是一个符号）。 */
function icon(mode) {
  if (mode === 'light') return '☀';
  if (mode === 'dark') return '☾';
  return '◐';
}

module.exports = {current: current, cycle: cycle, label: label, icon: icon, read: read};
