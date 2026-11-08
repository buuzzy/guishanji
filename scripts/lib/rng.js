/**
 * rng.js —— 确定性随机数（同一串种子 ⇒ 同一串数）
 * ============================================================================
 *
 * ## 它从哪来
 * ------------------
 * 原先是开发者面板里那份 `batch.js` 的同一份函数。
 * 2026-11-08 面板整体删除 ⇒ 这份纯函数搬到这里，给 Node 侧的门禁脚本用
 * （`scripts/audit-reach.mjs` 的「随机探索」策略就靠它）。
 *
 * ## ⚠ 这个文件不许 import `node:*`
 * --------------------------
 * 它是**纯函数**：谁都能 import 同一份（不碰文件系统、不读环境变量）。
 */

/**
 * 确定性随机数（同一串种子 ⇒ 同一串数）。
 *
 * ⚠ 为什么不用 `Math.random()`：浏览器与 Node 必须跑出**完全一样**的结果，
 *   否则门禁没法交叉比对（Node 侧算一遍、浏览器侧算一遍，两边对不上就不知道是谁错了）。
 */
export function makeRng(seed) {
  let hash = 2166136261 >>> 0;
  const text = String(seed);
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  let a = hash >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
