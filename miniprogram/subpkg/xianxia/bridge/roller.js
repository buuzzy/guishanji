/**
 * roller.js — 出生转盘（修仙版）
 * ============================================================================
 *
 * 官方那份是 `miniprogram/roll.js`（主包，转的是**国家**）。
 * 修仙版转的是**出生事实**（角色名 / 大陆 · 住址 · 出身），
 * 内容口径照上游修仙网页端（`apps/preview/app.js` 的 `renderBirth()`），
 * **节奏逐字照官方**：
 *
 *   官方 roll.js:
 *     const FRAMES = 26;
 *     i++;
 *     const c = i >= frames ? target : EL[wpick(w)];
 *     if (i < frames) setTimeout(step, 40 + Math.pow(i / frames, 3) * 380);
 *     else setTimeout(showCert, 650);
 *
 *   上游修仙网页端:
 *     const f = birthFacts(seed + ':轮转:' + turn++);
 *     roller-name ← f.name
 *     roller-meta ← f.place.name + ' · ' + f.address + ' · ' + f.household.name
 *
 * 四处口径一个字不改：
 *   ① **帧数 26**；
 *   ② **越接近定格越慢**（40 + (i/26)³ × 380 毫秒）；
 *   ③ **中间帧每帧换一整套出生事实**（上游的 `turn++` 机制）；
 *   ④ **最后一帧强制停在这段人生真正抽定的地方**，停 650 ms 后才出登记卡。
 *
 * ⚠ 为什么「最后一帧强制停在真结果」：
 *   人生在开跑前就已经抽定了 ⇒ 转盘只是把结果**演**出来。
 *   中间帧按真实分布随机滚，所以看起来和官方一样是「转出来的」。
 */
'use strict';

/** 帧数（官方转盘的滚动帧数）。 */
var FRAMES = 26;

/**
 * 建池：按 turn 生成出生事实的来源。
 * @param {function} factsOf (turn) => {name, meta}
 */
function buildPool(factsOf) {
  return {factsOf: factsOf};
}

/**
 * 开跑转盘。
 * @param {object} pool buildPool 的结果
 * @param {object} final 定格那一帧的事实 {name, meta}
 * @param {function} onFrame 每帧回调 {name, meta, i, last}
 * @param {function} onDone 定格回调
 */
function create(pool, final, onFrame, onDone) {
  var i = 0;
  var timer = null;
  var stopped = false;

  function step() {
    if (stopped) return;
    i++;
    var last = i >= FRAMES;
    /* 最后一帧用真结果；中间帧每帧换一套事实（上游 turn++ 的机制）。 */
    var it = last ? final : pool.factsOf(i);
    if (!it) {
      if (!stopped) onDone();
      return;
    }
    onFrame({name: it.name, meta: it.meta, i: i, last: last});
    if (!last) {
      /* 官方：40 + (i / frames) ^ 3 * 380 —— 越接近定格越慢 */
      timer = setTimeout(step, 40 + Math.pow(i / FRAMES, 3) * 380);
      return;
    }
    /* 官方：最后一帧之后等 650ms 再出登记卡 */
    timer = setTimeout(function () { if (!stopped) onDone(); }, 650);
  }

  step();   /* 官方：第一次立刻走，没有额外延时 */

  return {
    stop: function () {
      stopped = true;
      if (timer) { clearTimeout(timer); timer = null; }
    },
  };
}

module.exports = {FRAMES: FRAMES, buildPool: buildPool, create: create};
