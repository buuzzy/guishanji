/**
 * prefs.js — 修仙玩法的「小偏好」（星标 / 面板折叠）
 * ============================================================================
 *
 * 官方那套写在 `app.globalData.prefs`（`prefs.fold` / `prefs.theme`），
 * 落到的是**官方的偏好键**。
 *
 * 修仙这边**一个官方键都不碰**（隔离要求：官方键一个都不许动），
 * 但**用同一套形状**（`{k: true}` 的折叠表 / 数组的星标表）
 * ⇒ 视觉与行为与官方一致，存储各归各的。
 *
 * 命名空间
 * --------
 *   xianxia.v1.stars.<lifeId>   这一段人生里被加了星的记录 id（数组）
 *   xianxia.v1.pref.fold         面板折叠状态（{ 'p-stats': true, … }）
 *
 * ⚠ 星标**按人生分开存**：官方那套星是「记录 id」，而每段人生的记录 id
 *   都从 1 开始 ⇒ 不分段就会串味（上一段人生加的星会跑到下一段）。
 */
'use strict';

var STARS_PREFIX = 'xianxia.v1.stars.';
var FOLD_KEY = 'xianxia.v1.pref.fold';

function starsKey(lifeId) {
  return STARS_PREFIX + (lifeId || 'current');
}

/** 某一段人生里被加星的记录 id（数组，没有就是空）。 */
function readStars(lifeId) {
  try {
    var value = wx.getStorageSync(starsKey(lifeId));
    if (Array.isArray(value)) return value.slice();
  } catch (error) {
    /* 读不出来就当没有星。 */
  }
  return [];
}

/** 写回星标（数组）。 */
function writeStars(lifeId, list) {
  try {
    wx.setStorageSync(starsKey(lifeId), Array.isArray(list) ? list : []);
  } catch (error) {
    /* 存不下不影响玩。 */
  }
}

/** 加/取消一颗星，返回新的列表。 */
function toggleStar(lifeId, id) {
  var list = readStars(lifeId);
  var key = String(id);
  for (var i = 0; i < list.length; i++) {
    if (String(list[i]) === key) {
      list.splice(i, 1);
      writeStars(lifeId, list);
      return list;
    }
  }
  list.push(id);
  writeStars(lifeId, list);
  return list;
}

/** 面板折叠表（{ 'p-stats': true }）。 */
function readFold() {
  try {
    var value = wx.getStorageSync(FOLD_KEY);
    if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  } catch (error) {
    /* 读不出来就当都不折叠。 */
  }
  return {};
}

/** 写回折叠表。 */
function writeFold(fold) {
  try {
    wx.setStorageSync(FOLD_KEY, fold || {});
  } catch (error) {
    /* 存不下不影响玩。 */
  }
}

module.exports = {
  STARS_PREFIX: STARS_PREFIX,
  FOLD_KEY: FOLD_KEY,
  starsKey: starsKey,
  readStars: readStars,
  writeStars: writeStars,
  toggleStar: toggleStar,
  readFold: readFold,
  writeFold: writeFold,
};
