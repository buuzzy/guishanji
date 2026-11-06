/**
 * clock.js — 修仙的「日子在往前走」
 * ============================================================================
 *
 * 口径照 HTML 试玩页的主循环（apps/preview/app.js:371-399）：
 *   · 每 250 ms 醒一次；
 *   · dt = min(现在 - 上次, 250) —— 切后台回来时间跳了，不能一次补齐；
 *   · 月份是**攒**出来的：bank += dt/1000 / 每月多少秒 × 倍速；
 *   · 一次最多推进 1 个月（长行动时 24 个月），逐月 advance；
 *   · 有抉择 / 有结果没读 / 没有行程 / 页面隐藏 / 在读旧记录 ⇒ **不推进**。
 *
 * 自动抉择（E 步）
 * ----------------
 * · **默认关闭**；
 * · 只在「当前可选项」里挑，**不读**后台成功率、不读未来收益、不读死亡结果；
 * · 用**自己的**随机流（不碰引擎的随机流 ⇒ 玩家的自动选择不会改变人生本身）；
 * · 手动抢先选择、收起决策卡、页面隐藏 ⇒ 立刻作废这次计时。
 *
 * ⚠ 官方人生页那个 `toggleAuto` 有两个同名定义（后者覆盖前者、且不落盘）——
 *   本文件只允许**一个** start/stop 入口，避免同样的坑。
 */
'use strict';

var DEFAULT_INTERVAL = 250;
/** 自动抉择的等待时长（与官方人生页一致：1200 ms）。 */
var AUTO_DELAY = 1200;
/** 长行动时一次可以推进的月数上限。 */
var LONG_ACTION_MONTHS = 24;

function createClock(opts) {
  opts = opts || {};
  var session = opts.session;
  var engine = opts.engine || session.engine;
  var onTick = opts.onTick || function () {};
  var interval = opts.interval || DEFAULT_INTERVAL;

  var timer = null;
  var last = 0;
  var bank = 0;
  var speed = 1;
  var paused = false;
  var readingHistory = false;
  var hidden = false;

  var autoEnabled = false;
  var autoAt = 0;
  var autoStopped = false;
  var autoRandom = 1;
  var autoPrefs = opts.prefs || null;

  /* ───────────────────────── 自动抉择的随机流 ───────────────────────── */

  function loadAutoRandom() {
    if (!autoPrefs) return;
    var value = autoPrefs.getAutoRandom ? autoPrefs.getAutoRandom() : null;
    if (typeof value === 'number' && isFinite(value) && value > 0) autoRandom = value;
  }
  function saveAutoRandom() {
    if (autoPrefs && autoPrefs.setAutoRandom) autoPrefs.setAutoRandom(autoRandom);
  }
  /** 自己的一条随机流：与引擎的随机流完全无关。 */
  function nextAutoRandom() {
    autoRandom = (autoRandom * 48271) % 2147483647;
    if (autoRandom <= 0) autoRandom += 2147483646;
    saveAutoRandom();
    return autoRandom / 2147483647;
  }

  /* ───────────────────────────── 主循环 ───────────────────────────── */

  function monthSeconds() {
    if (!session.run) return 12;
    if (engine.monthSeconds) {
      try {
        return engine.monthSeconds(session.run);
      } catch (error) {
        return 12;
      }
    }
    return 12;
  }

  function longAction() {
    if (!session.run || !engine.longAction) return null;
    try {
      return engine.longAction(session.run);
    } catch (error) {
      return null;
    }
  }

  /** 现在能不能推进年月。 */
  function canAdvance() {
    var run = session.run;
    if (!run) return false;
    if (paused || hidden || readingHistory) return false;
    if (run.phase !== 'life') return false;
    if (run.pending) return false;
    if (run.waiting) return false;
    if (!run.journey) return false;
    return true;
  }

  function step() {
    var now = Date.now();
    var dt = Math.min(now - last, interval);
    last = now;

    if (canAdvance()) {
      bank += (dt / 1000 / monthSeconds()) * speed;
      var limit = longAction() ? LONG_ACTION_MONTHS : 1;
      var months = Math.min(limit, Math.floor(bank));
      if (months > 0) {
        var moved = 0;
        while (moved < months && session.run && !session.run.pending && session.run.phase === 'life') {
          var spent = session.advance(1);
          if (!spent) break;
          moved += spent;
          if (!session.run) break;
        }
        bank = Math.max(0, bank - moved);
      }
    } else {
      bank = 0;
    }

    /* 自动抉择：只在有抉择、且没被叫停时计时。 */
    if (autoEnabled && session.run && session.run.pending && !autoStopped) {
      if (!autoAt) autoAt = now;
      else if (now - autoAt >= AUTO_DELAY) {
        autoAt = 0;
        autoPick();
      }
    } else {
      autoAt = 0;
    }

    onTick(session.view);
  }

  /** 自动挑一个**当前可选**的选项。 */
  function autoPick() {
    var offered = session.options() || [];
    var enabled = [];
    for (var i = 0; i < offered.length; i++) if (offered[i].enabled) enabled.push(offered[i]);
    if (!enabled.length) return null;
    var pick = enabled[Math.floor(nextAutoRandom() * enabled.length) % enabled.length];
    try {
      session.choose(pick.id);
    } catch (error) {
      /* 选不了就放弃这一轮，不弹错。 */
    }
    return pick.id;
  }

  /* ───────────────────────────── 开关 ───────────────────────────── */

  function start() {
    if (timer) return;
    last = Date.now();
    bank = 0;
    timer = setInterval(step, interval);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    bank = 0;
    autoAt = 0;
  }

  function setSpeed(value) {
    var n = Number(value);
    speed = n > 0 ? n : 1;
    return speed;
  }

  function setPaused(value) {
    paused = !!value;
    if (paused) bank = 0;
  }

  function setReadingHistory(value) {
    readingHistory = !!value;
    if (readingHistory) bank = 0;
  }

  function setHidden(value) {
    hidden = !!value;
    if (hidden) bank = 0;
  }

  /* 自动抉择开关。 */
  function enableAuto() {
    autoEnabled = true;
    autoStopped = false;
    autoAt = 0;
  }
  function disableAuto() {
    autoEnabled = false;
    autoStopped = false;
    autoAt = 0;
  }
  function toggleAuto() {
    if (autoEnabled) disableAuto();
    else enableAuto();
    return autoEnabled;
  }
  /** 收起决策卡 / 手动抢先 ⇒ 作废这一次自动计时。 */
  function cancelAuto() {
    autoAt = 0;
    autoStopped = true;
  }
  /** 重新展开决策卡 ⇒ 允许重新计时。 */
  function resumeAuto() {
    autoAt = 0;
    autoStopped = false;
  }

  loadAutoRandom();

  return {
    start: start,
    stop: stop,
    step: step,
    get running() { return !!timer; },
    get speed() { return speed; },
    setSpeed: setSpeed,
    setPaused: setPaused,
    setReadingHistory: setReadingHistory,
    setHidden: setHidden,
    get paused() { return paused; },
    get readingHistory() { return readingHistory; },
    enableAuto: enableAuto,
    disableAuto: disableAuto,
    toggleAuto: toggleAuto,
    cancelAuto: cancelAuto,
    resumeAuto: resumeAuto,
    get autoEnabled() { return autoEnabled; },
    get autoArmed() { return !autoStopped; },
    AUTO_DELAY: AUTO_DELAY,
  };
}

module.exports = {createClock: createClock, AUTO_DELAY: AUTO_DELAY, DEFAULT_INTERVAL: DEFAULT_INTERVAL};
